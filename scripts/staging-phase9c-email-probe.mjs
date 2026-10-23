#!/usr/bin/env node
/**
 * Probe Resend with free + participation templates.
 * Never prints API keys, full recipient addresses, or message bodies.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildFreeRegistrationEmail,
  buildParticipationConfirmationEmail,
  createEmailProvider,
} from '../api/_lib/email.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const eq = trimmed.indexOf('=');
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined || process.env[key] === '') {
      process.env[key] = value;
    }
  }
}
loadEnvFile(join(root, '.env.staging.local'));
loadEnvFile(join(root, '.env.local'));

function classifyProviderError(error) {
  const message = String(error?.message || '').toLowerCase();
  const provider = error?.provider || {};
  const statusCode = provider.statusCode || provider.status || null;
  const providerMsg = String(provider.message || error?.message || '').toLowerCase();

  let category = 'unknown';
  if (error?.code === 'EMAIL_NOT_CONFIGURED') category = 'not_configured';
  else if (/unauthorized|invalid.?api.?key|401/.test(providerMsg + message) || statusCode === 401)
    category = 'authentication_failure';
  else if (
    /testing email address|domains like `example|example\.com|example\.invalid|invalid `to` field/.test(
      providerMsg + message
    )
  )
    category = 'recipient_restriction';
  else if (
    /domain is not verified|from address|sender.*not verified/.test(providerMsg + message)
  )
    category = 'sender_or_domain_verification';
  else if (/422|invalid|validation/.test(providerMsg + message) || statusCode === 422)
    category = 'request_rejection_or_invalid_data';
  else if (/timeout|network|econn|fetch failed/.test(providerMsg + message))
    category = 'network_or_timeout';
  else if (error?.code === 'EMAIL_SEND_FAILED') category = 'provider_request_rejection';
  else if (error?.code === 'EMAIL_UNCONFIRMED') category = 'missing_message_id';

  return {
    category,
    code: error?.code || null,
    httpHint: statusCode,
    messageSanitized: String(error?.message || 'unknown')
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
      .replace(/re_[A-Za-z0-9]+/g, '[resend_key]')
      .slice(0, 240),
    providerName: provider.name || null,
  };
}

function maskEmail(email) {
  const e = String(email || '');
  const at = e.indexOf('@');
  if (at < 1) return '[invalid]';
  return `${e[0]}***@${e.slice(at + 1).replace(/^[^.]*/, (p) => `${p[0]}***`)}`;
}

const config = {
  resendApiKey: process.env.RESEND_API_KEY,
  emailFrom: process.env.EMAIL_FROM,
};

const report = {
  ok: false,
  configured: Boolean(config.resendApiKey && config.emailFrom),
  fromShape: {
    hasDisplayName: /<.+>/.test(String(config.emailFrom || '')),
    domainHint: (() => {
      const m = String(config.emailFrom || '').match(/@([^>\s]+)/);
      return m ? m[1].replace(/^[^.]+/, (p) => `${p[0]}***`) : null;
    })(),
  },
  probes: {},
};

if (!report.configured) {
  console.log(JSON.stringify({ ...report, blocker: 'email_not_configured' }, null, 2));
  process.exit(1);
}

const provider = createEmailProvider(config);
const stamp = Date.now().toString(36);
// Prefer Resend-allowed destinations: ADMIN_NOTIFICATION_EMAIL or same domain probe.
const adminTo = String(process.env.ADMIN_NOTIFICATION_EMAIL || '').trim().toLowerCase();
const syntheticTo = `phase9c.probe.${stamp}@example.com`;

async function probe(name, to, content) {
  try {
    const result = await provider.send({
      to,
      subject: `[STAGING PROBE ${name}] ${content.subject}`,
      html: content.html,
      text: content.text,
    });
    return {
      ok: true,
      toMasked: maskEmail(to),
      messageIdPresent: Boolean(result.messageId),
      messageIdPrefix: result.messageId
        ? String(result.messageId).slice(0, 4) + '…'
        : null,
    };
  } catch (error) {
    return {
      ok: false,
      toMasked: maskEmail(to),
      ...classifyProviderError(error),
    };
  }
}

const freeContent = buildFreeRegistrationEmail({
  publicReference: `SC-2026-PROBE-FREE-${stamp}`,
  fullName: 'STAGING TEST P9C Probe',
});
const paidContent = buildParticipationConfirmationEmail({
  publicReference: `SC-2026-PROBE-PAID-${stamp}`,
  fullName: 'STAGING TEST P9C Probe',
  challengeSelected: true,
  exhibitionSelected: false,
  challengeStatus: 'CONFIRMED',
  exhibitionStatus: 'NOT_SELECTED',
  expectedAmountKobo: 500000,
});

report.probes.freeToSynthetic = await probe('free-synthetic', syntheticTo, freeContent);
report.probes.paidToSynthetic = await probe('paid-synthetic', syntheticTo, paidContent);

if (adminTo && adminTo.includes('@')) {
  report.probes.freeToAdminNotify = await probe('free-admin', adminTo, freeContent);
  report.probes.paidToAdminNotify = await probe('paid-admin', adminTo, paidContent);
} else {
  report.probes.adminNotifySkipped = 'ADMIN_NOTIFICATION_EMAIL absent';
}

report.ok =
  report.probes.freeToSynthetic.ok === true ||
  report.probes.freeToAdminNotify?.ok === true ||
  report.probes.paidToSynthetic.ok === true ||
  report.probes.paidToAdminNotify?.ok === true;

report.diagnosisHint = (() => {
  const fails = Object.values(report.probes).filter((p) => p && p.ok === false);
  const cats = [...new Set(fails.map((f) => f.category).filter(Boolean))];
  if (!fails.length) return 'all_probes_accepted_by_provider';
  if (cats.includes('authentication_failure')) return 'fix_resend_api_key';
  if (
    report.probes.freeToSynthetic?.ok === false &&
    report.probes.paidToSynthetic?.ok === false &&
    (report.probes.freeToAdminNotify?.ok === true ||
      report.probes.paidToAdminNotify?.ok === true)
  )
    return 'recipient_restriction_example_com_blocked_not_template_defect';
  if (cats.includes('sender_or_domain_verification'))
    return 'verify_EMAIL_FROM_domain_in_resend';
  if (
    report.probes.paidToSynthetic?.ok === false &&
    report.probes.freeToSynthetic?.ok === true
  )
    return 'template_or_content_specific_rejection';
  return `categories:${cats.join(',') || 'unknown'}`;
})();

console.log(JSON.stringify(report, null, 2));
process.exit(0);
