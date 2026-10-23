#!/usr/bin/env node
/** Phase 9C env audit — prefixes/shapes only; never prints secret values. */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function parseEnvFile(filePath) {
  const map = {};
  if (!existsSync(filePath)) return null;
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
    map[key] = value;
  }
  return map;
}

function classifyPaystack(key) {
  const k = String(key || '');
  if (!k) return 'absent';
  if (k.startsWith('sk_live_')) return 'LIVE_BLOCKED';
  if (k.startsWith('sk_test_')) return 'test';
  if (k.startsWith('pk_')) return 'public_key_not_secret';
  return `unknown_prefix_len_${k.length}`;
}

function classifyResend(key) {
  const k = String(key || '');
  if (!k) return 'absent';
  if (k.startsWith('re_')) return 'present_re_prefix';
  return `present_other_prefix_len_${k.length}`;
}

function emailFromShape(from) {
  const v = String(from || '').trim();
  if (!v) return { present: false };
  const angle = v.match(/^(.+?)\s*<([^>]+)>$/);
  const addr = angle ? angle[2] : v;
  const at = addr.includes('@');
  const domain = at ? addr.split('@')[1] : null;
  return {
    present: true,
    hasDisplayName: Boolean(angle),
    addressLooksValid: at && !addr.includes(' '),
    domainPresent: Boolean(domain),
    domainHint: domain
      ? domain.replace(/^[^.]+/, (p) => `${p[0]}***`)
      : null,
  };
}

function redactUrl(url) {
  if (!url) return 'absent';
  try {
    const u = new URL(url);
    const host = u.hostname;
    const stagingLike =
      /staging|stg|preview|neon\.tech|localhost/i.test(host) ||
      host.includes('ep-');
    return {
      present: true,
      protocol: u.protocol.replace(':', ''),
      hostClass: stagingLike ? 'staging_like' : 'other',
      hostTail: host.split('.').slice(-2).join('.'),
    };
  } catch {
    return { present: true, parseError: true };
  }
}

const files = [
  '.env.staging.local',
  '.env.local',
  '.env',
  '.env.staging',
];
const report = { processEnv: {}, files: {}, mergeOrderNote: 'scripts load .env.staging.local then .env.local (first wins if empty)' };

for (const f of files) {
  const map = parseEnvFile(join(root, f));
  if (!map) {
    report.files[f] = { exists: false };
    continue;
  }
  report.files[f] = {
    exists: true,
    APP_ENV: map.APP_ENV || null,
    PAYSTACK_MODE: map.PAYSTACK_MODE || null,
    PAYSTACK_SECRET_KEY: classifyPaystack(map.PAYSTACK_SECRET_KEY),
    EVENT_REGISTRATION_ENABLED: map.EVENT_REGISTRATION_ENABLED || null,
    EVENT_START_AT: map.EVENT_START_AT || null,
    EVENT_PRIVACY_NOTICE_APPROVED: map.EVENT_PRIVACY_NOTICE_APPROVED || null,
    EVENT_PARTICIPATION_TERMS_APPROVED:
      map.EVENT_PARTICIPATION_TERMS_APPROVED || null,
    ALLOW_PRODUCTION_MIGRATE: map.ALLOW_PRODUCTION_MIGRATE || null,
    RESEND_API_KEY: classifyResend(map.RESEND_API_KEY),
    EMAIL_FROM: emailFromShape(map.EMAIL_FROM),
    STAGING_DATABASE_URL: redactUrl(map.STAGING_DATABASE_URL),
    DATABASE_URL: redactUrl(map.DATABASE_URL),
    urlsMatch:
      Boolean(map.STAGING_DATABASE_URL) &&
      map.STAGING_DATABASE_URL === map.DATABASE_URL,
  };
}

report.processEnv = {
  APP_ENV: process.env.APP_ENV || null,
  PAYSTACK_MODE: process.env.PAYSTACK_MODE || null,
  PAYSTACK_SECRET_KEY: classifyPaystack(process.env.PAYSTACK_SECRET_KEY),
  EVENT_REGISTRATION_ENABLED: process.env.EVENT_REGISTRATION_ENABLED || null,
  VERCEL_ENV: process.env.VERCEL_ENV || null,
};

// Effective merge as used by staging scripts
function loadEffective() {
  const env = {};
  for (const f of ['.env.staging.local', '.env.local']) {
    const map = parseEnvFile(join(root, f));
    if (!map) continue;
    for (const [k, v] of Object.entries(map)) {
      if (env[k] === undefined || env[k] === '') env[k] = v;
    }
  }
  return env;
}
const eff = loadEffective();
report.effectiveForScripts = {
  APP_ENV: eff.APP_ENV || null,
  PAYSTACK_MODE: eff.PAYSTACK_MODE || null,
  PAYSTACK_SECRET_KEY: classifyPaystack(eff.PAYSTACK_SECRET_KEY),
  EVENT_REGISTRATION_ENABLED: eff.EVENT_REGISTRATION_ENABLED || null,
  EVENT_START_AT: eff.EVENT_START_AT || null,
  EVENT_PRIVACY_NOTICE_APPROVED: eff.EVENT_PRIVACY_NOTICE_APPROVED || null,
  EVENT_PARTICIPATION_TERMS_APPROVED: eff.EVENT_PARTICIPATION_TERMS_APPROVED || null,
  RESEND_API_KEY: classifyResend(eff.RESEND_API_KEY),
  EMAIL_FROM: emailFromShape(eff.EMAIL_FROM),
  paystackTestSafe:
    String(eff.PAYSTACK_MODE || '').toLowerCase() === 'test' &&
    classifyPaystack(eff.PAYSTACK_SECRET_KEY) === 'test',
  registrationClosed: eff.EVENT_REGISTRATION_ENABLED !== 'true',
  eventStartNote:
    'Display copy uses 12 December 2026; EVENT_START_AT in env may differ — do not treat env as official schedule.',
};

console.log(JSON.stringify(report, null, 2));
process.exit(report.effectiveForScripts.paystackTestSafe ? 0 : 2);
