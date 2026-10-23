#!/usr/bin/env node
/** Safe Phase 9B status dump — no secrets/PII. */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';

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

const keys = [
  'APP_ENV',
  'PAYSTACK_MODE',
  'EVENT_REGISTRATION_ENABLED',
  'ALLOW_COMBINED_CHALLENGE_EXHIBITION',
  'EVENT_PRIVACY_NOTICE_APPROVED',
  'EVENT_PARTICIPATION_TERMS_APPROVED',
  'EVENT_START_AT',
  'EVENT_REGISTRATION_OPEN_AT',
  'ALLOW_STAGING_MIGRATE',
  'ALLOW_PRODUCTION_MIGRATE',
];
const config = {};
for (const k of keys) config[k] = process.env[k] ?? null;
config.PAYSTACK_SECRET_PREFIX = String(process.env.PAYSTACK_SECRET_KEY || '').startsWith(
  'sk_test_'
)
  ? 'sk_test_'
  : 'other_or_absent';
config.RESEND_API_KEY = process.env.RESEND_API_KEY ? 'present' : 'absent';
config.EMAIL_FROM = process.env.EMAIL_FROM ? 'present' : 'absent';
config.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ? 'present' : 'absent';
config.ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH ? 'present' : 'absent';
config.urlsMatch =
  String(process.env.STAGING_DATABASE_URL || '') === String(process.env.DATABASE_URL || '');

const sql = neon(process.env.STAGING_DATABASE_URL || process.env.DATABASE_URL);
const synthetics = await sql`
  SELECT public_reference, event_registration_status, payment_status,
         challenge_selected, exhibition_selected, challenge_status, exhibition_status,
         expected_amount_kobo, currency
  FROM registrations
  WHERE email_normalized LIKE 'phase9b-%@example.invalid'
     OR email_normalized LIKE 'phase9b.%@example.com'
     OR full_name LIKE 'STAGING TEST P9B%'
  ORDER BY created_at ASC
`;
const txs = await sql`
  SELECT r.public_reference, t.amount_kobo, t.currency, t.status,
         right(t.payment_reference, 8) AS payment_reference_tail
  FROM payment_transactions t
  JOIN registrations r ON r.id = t.registration_id
  WHERE r.email_normalized LIKE 'phase9b-%@example.invalid'
     OR r.email_normalized LIKE 'phase9b.%@example.com'
     OR r.full_name LIKE 'STAGING TEST P9B%'
  ORDER BY t.created_at ASC
`;
const emails = await sql`
  SELECT r.public_reference, e.status, e.email_type
  FROM email_deliveries e
  JOIN registrations r ON r.id = e.registration_id
  WHERE r.email_normalized LIKE 'phase9b-%@example.invalid'
     OR r.email_normalized LIKE 'phase9b.%@example.com'
     OR r.full_name LIKE 'STAGING TEST P9B%'
  ORDER BY e.created_at ASC
`;
const totals = await sql`SELECT COUNT(*)::int AS c FROM registrations`;

let apiHealth = { ok: false };
try {
  const r = await fetch('http://127.0.0.1:3001/api/health');
  apiHealth = { ok: r.ok, status: r.status, body: await r.json().catch(() => ({})) };
} catch (e) {
  apiHealth = { ok: false, error: e.message };
}

console.log(
  JSON.stringify(
    {
      config,
      apiHealth,
      totalRegistrations: totals[0].c,
      synthetics,
      syntheticTransactions: txs,
      syntheticEmails: emails,
    },
    null,
    2
  )
);
