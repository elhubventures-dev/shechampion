#!/usr/bin/env node
/**
 * Prove paid participation_confirmation delivery to an allowed recipient
 * without Paystack checkout. Uses staging DB + Resend only.
 * Never prints secrets or full applicant emails.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';
import { getEventConfig } from '../api/_lib/config.js';
import {
  sendFreeRegistrationEmailSafe,
  sendParticipationEmailSafe,
} from '../api/_lib/registrationService.js';
import { EVENT_ID } from '../api/_lib/constants.js';

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

if (String(process.env.APP_ENV || '').toLowerCase() !== 'staging') {
  console.error('APP_ENV=staging required.');
  process.exit(1);
}
if (process.env.ALLOW_STAGING_MIGRATE !== 'true') {
  console.error('ALLOW_STAGING_MIGRATE=true required.');
  process.exit(1);
}

const config = getEventConfig();
const sql = neon(config.databaseUrl);
const stamp = Date.now().toString(36);
const admin = String(process.env.ADMIN_NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL || '')
  .trim()
  .toLowerCase();
if (!admin.includes('@')) {
  console.log(JSON.stringify({ ok: false, reason: 'no_allowed_recipient' }, null, 2));
  process.exit(1);
}
const [local, domain] = admin.split('@');
const allowedEmail = `${local}+p9c.${stamp}@${domain}`;
const publicRef = `SC-2026-P9C${stamp.slice(-8).toUpperCase()}`;

const report = { ok: false, publicReference: publicRef, recipientClass: 'org_plus_address' };

const inserted = await sql`
  INSERT INTO registrations (
    event_id, public_reference, full_name, email_normalized, phone,
    state_of_residence, applicant_category, brief_description,
    privacy_accepted_at, terms_accepted_at,
    event_registration_status, application_status, payment_status,
    challenge_selected, exhibition_selected,
    challenge_status, exhibition_status,
    expected_amount_kobo, currency,
    challenge_women_eligibility_attested, challenge_eligibility_attested_at
  ) VALUES (
    ${EVENT_ID},
    ${publicRef},
    ${'STAGING TEST P9C EmailRemediate'},
    ${allowedEmail},
    ${'+2348011110099'},
    ${'FCT'},
    ${'EXISTING_BUSINESS_OWNER'},
    ${'Synthetic Phase 9C email remediation — not a real applicant.'},
    now(), now(),
    ${'REGISTERED'}, ${'REGISTERED'}, ${'SUCCESS'},
    ${true}, ${false},
    ${'CONFIRMED'}, ${'NOT_SELECTED'},
    ${500000}, ${'NGN'},
    ${true}, now()
  )
  RETURNING id
`;
const id = inserted[0].id;

const paidSend = await sendParticipationEmailSafe(id, config);
const paidRow = await sql`
  SELECT status, provider_message_id IS NOT NULL AS has_message_id,
         left(coalesce(last_error, ''), 160) AS last_error_prefix
  FROM email_deliveries
  WHERE registration_id = ${id} AND email_type = 'participation_confirmation'
  ORDER BY created_at DESC LIMIT 1
`;

// Also prove free path on allowed recipient
const freeRef = `SC-2026-P9CF${stamp.slice(-7).toUpperCase()}`;
const freeIns = await sql`
  INSERT INTO registrations (
    event_id, public_reference, full_name, email_normalized, phone,
    state_of_residence, applicant_category, brief_description,
    privacy_accepted_at, terms_accepted_at,
    event_registration_status, application_status, payment_status,
    challenge_selected, exhibition_selected,
    challenge_status, exhibition_status,
    expected_amount_kobo, currency
  ) VALUES (
    ${EVENT_ID},
    ${freeRef},
    ${'STAGING TEST P9C FreeEmail'},
    ${`${local}+p9c.free.${stamp}@${domain}`},
    ${'+2348011110098'},
    ${'Lagos'},
    ${'BUSINESS_IDEA'},
    ${'Synthetic Phase 9C free email — not a real applicant.'},
    now(), now(),
    ${'REGISTERED'}, ${'REGISTERED'}, ${'NOT_REQUIRED'},
    ${false}, ${false},
    ${'NOT_SELECTED'}, ${'NOT_SELECTED'},
    ${0}, ${'NGN'}
  )
  RETURNING id
`;
const freeSend = await sendFreeRegistrationEmailSafe(freeIns[0].id, config);
const freeRow = await sql`
  SELECT status, provider_message_id IS NOT NULL AS has_message_id
  FROM email_deliveries
  WHERE registration_id = ${freeIns[0].id}
    AND email_type = 'free_registration_confirmation'
  ORDER BY created_at DESC LIMIT 1
`;

report.paid = {
  sent: paidSend.sent === true,
  alreadySent: Boolean(paidSend.alreadySent),
  reason: paidSend.reason || null,
  deliveryStatus: paidRow[0]?.status || null,
  hasMessageId: paidRow[0]?.has_message_id === true,
  lastErrorPrefix: paidRow[0]?.last_error_prefix || null,
};
report.free = {
  publicReference: freeRef,
  sent: freeSend.sent === true,
  deliveryStatus: freeRow[0]?.status || null,
  hasMessageId: freeRow[0]?.has_message_id === true,
};

report.ok =
  report.paid.deliveryStatus === 'SENT' &&
  report.paid.hasMessageId &&
  report.free.deliveryStatus === 'SENT' &&
  report.free.hasMessageId;

console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
