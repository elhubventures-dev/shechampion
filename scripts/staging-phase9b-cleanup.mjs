#!/usr/bin/env node
/** Cleanup synthetic Phase 9B leftovers only. No secrets/PII printed. */
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

const appEnv = String(process.env.APP_ENV || '').toLowerCase();
const allow = process.env.ALLOW_STAGING_MIGRATE === 'true';
const url = String(process.env.STAGING_DATABASE_URL || process.env.DATABASE_URL || '').trim();
if (appEnv !== 'staging' || !allow || !url) {
  console.error('Staging safeguards required.');
  process.exit(1);
}

const sql = neon(url);
const rows = await sql`
  SELECT id FROM registrations
  WHERE email_normalized LIKE 'phase9b-%@example.invalid'
     OR email_normalized LIKE 'phase9b.%@example.com'
     OR email_normalized LIKE '%+p9c.%'
     OR full_name LIKE 'STAGING TEST P9B%'
     OR full_name LIKE 'STAGING TEST P9C%'
`;
let deleted = 0;
for (const row of rows) {
  await sql`DELETE FROM email_deliveries WHERE registration_id = ${row.id}`;
  await sql`DELETE FROM payment_transactions WHERE registration_id = ${row.id}`;
  await sql`DELETE FROM registrations WHERE id = ${row.id}`;
  deleted += 1;
}
const leftover = await sql`
  SELECT COUNT(*)::int AS c FROM registrations
  WHERE email_normalized LIKE 'phase9b-%@example.invalid'
     OR email_normalized LIKE 'phase9b.%@example.com'
     OR email_normalized LIKE '%+p9c.%'
     OR full_name LIKE 'STAGING TEST P9B%'
     OR full_name LIKE 'STAGING TEST P9C%'
`;
const rate = await sql`
  DELETE FROM rate_limits
  WHERE bucket_key LIKE 'reg-create:%'
     OR bucket_key LIKE 'payment-verify:%'
  RETURNING bucket_key
`;

console.log(
  JSON.stringify(
    {
      deleted,
      leftover: Number(leftover[0].c),
      rateLimitBucketsCleared: rate.length,
      ok: Number(leftover[0].c) === 0,
    },
    null,
    2
  )
);
