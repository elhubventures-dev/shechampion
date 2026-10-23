#!/usr/bin/env node
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
const ref = process.argv[2] || 'SC-2026-1E9C97E1D1';
const sql = neon(process.env.STAGING_DATABASE_URL || process.env.DATABASE_URL);
const reg = await sql`
  SELECT public_reference, payment_status, challenge_status, expected_amount_kobo, full_name
  FROM registrations WHERE public_reference = ${ref} LIMIT 1
`;
const txs = await sql`
  SELECT payment_reference, amount_kobo, status
  FROM payment_transactions pt
  JOIN registrations r ON r.id = pt.registration_id
  WHERE r.public_reference = ${ref}
`;
console.log(JSON.stringify({ reg: reg[0] || null, txs }, null, 2));
