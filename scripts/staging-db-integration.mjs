#!/usr/bin/env node
/**
 * Staging DB integration checks (no Paystack, no registration open).
 * Uses gitignored env files. Never prints secrets or PII payloads.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';
import { evaluateReadiness } from '../api/_lib/config.js';
import { EVENT_FEE_KOBO, EVENT_ID } from '../api/_lib/constants.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const text = readFileSync(filePath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
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

const appEnv = String(process.env.APP_ENV || '').toLowerCase();
const allow = process.env.ALLOW_STAGING_MIGRATE === 'true';
const url = String(
  process.env.STAGING_DATABASE_URL || process.env.DATABASE_URL || ''
).trim();

if (appEnv !== 'staging' || !allow || !url) {
  console.error('Requires APP_ENV=staging, ALLOW_STAGING_MIGRATE=true, staging DB URL.');
  process.exit(1);
}
if (/(^|[_\-./])prod(uction)?([_\-./?]|$)/i.test(url)) {
  console.error('Refusing production-looking database URL.');
  process.exit(1);
}

const sql = neon(url);
const marker = `staging-test-${Date.now()}@example.invalid`;
const publicRef = `SC-STG-${Date.now().toString(36).toUpperCase()}`;
const results = {
  ok: true,
  feeKobo: EVENT_FEE_KOBO,
  readinessReady: null,
  registrationEnabled: process.env.EVENT_REGISTRATION_ENABLED === 'true',
  insertedSynthetic: false,
  duplicateEmailRejected: false,
  paymentRefUnique: false,
  cleanedUp: false,
};

const readiness = evaluateReadiness();
results.readinessReady = readiness.ready;
if (readiness.ready) {
  console.error('Unexpected: readiness is open; aborting to avoid accidental open-window writes.');
  process.exit(1);
}

const now = new Date().toISOString();
await sql`
  INSERT INTO registrations (
    public_reference, event_id, full_name, email_normalized, phone,
    state_of_residence, applicant_category, business_name, brief_description,
    privacy_accepted_at, terms_accepted_at, application_status, payment_status
  ) VALUES (
    ${publicRef},
    ${EVENT_ID},
    ${'STAGING TEST Applicant'},
    ${marker},
    ${'+2348000000000'},
    ${'FCT'},
    ${'BUSINESS_IDEA'},
    ${null},
    ${'Synthetic staging integration row for Phase 7B.'},
    ${now}::timestamptz,
    ${now}::timestamptz,
    ${'PENDING_PAYMENT'},
    ${'PENDING'}
  )
`;
results.insertedSynthetic = true;

const reg = await sql`
  SELECT id FROM registrations WHERE email_normalized = ${marker} LIMIT 1
`;
const regId = reg[0].id;
const payRef = `SCBEC26_${'f'.repeat(32)}`;

await sql`
  INSERT INTO payment_transactions (
    registration_id, payment_reference, amount_kobo, currency, provider,
    payment_mode, status
  ) VALUES (
    ${regId}, ${payRef}, ${EVENT_FEE_KOBO}, ${'NGN'}, ${'paystack'},
    ${'test'}, ${'PENDING'}
  )
`;

try {
  await sql`
    INSERT INTO registrations (
      public_reference, event_id, full_name, email_normalized, phone,
      state_of_residence, applicant_category, brief_description,
      privacy_accepted_at, terms_accepted_at
    ) VALUES (
      ${publicRef + 'X'},
      ${EVENT_ID},
      ${'STAGING TEST Dup'},
      ${marker},
      ${'+2348000000001'},
      ${'Lagos'},
      ${'BUSINESS_IDEA'},
      ${'Duplicate email should fail.'},
      ${now}::timestamptz,
      ${now}::timestamptz
    )
  `;
} catch (error) {
  const msg = String(error.message || '').toLowerCase();
  if (error.code === '23505' || msg.includes('unique') || msg.includes('duplicate')) {
    results.duplicateEmailRejected = true;
  } else {
    throw error;
  }
}

try {
  await sql`
    INSERT INTO payment_transactions (
      registration_id, payment_reference, amount_kobo, currency, provider,
      payment_mode, status
    ) VALUES (
      ${regId}, ${payRef}, ${EVENT_FEE_KOBO}, ${'NGN'}, ${'paystack'},
      ${'test'}, ${'PENDING'}
    )
  `;
} catch (error) {
  const msg = String(error.message || '').toLowerCase();
  if (error.code === '23505' || msg.includes('unique') || msg.includes('duplicate')) {
    results.paymentRefUnique = true;
  } else {
    throw error;
  }
}

await sql`DELETE FROM payment_transactions WHERE registration_id = ${regId}`;
await sql`DELETE FROM registrations WHERE id = ${regId}`;
const leftover = await sql`
  SELECT COUNT(*)::int AS c FROM registrations WHERE email_normalized = ${marker}
`;
results.cleanedUp = Number(leftover[0].c) === 0;

const failed = Object.entries(results).filter(
  ([k, v]) => k !== 'ok' && k !== 'feeKobo' && k !== 'readinessReady' && k !== 'registrationEnabled' && v !== true
);
results.ok = failed.length === 0 && results.readinessReady === false;

console.log(JSON.stringify(results, null, 2));
process.exit(results.ok ? 0 : 1);
