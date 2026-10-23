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

const body = {
  fullName: 'STAGING TEST P9B Debug',
  email: `phase9b-debug-${Date.now()}@example.invalid`,
  phone: '+2348011110001',
  stateOfResidence: 'FCT',
  applicantCategory: 'EXISTING_BUSINESS_OWNER',
  briefDescription: 'Synthetic Phase 9B debug free registration path.',
  privacyAccepted: true,
  termsAccepted: true,
  challengeSelected: false,
  exhibitionSelected: false,
};

const r = await fetch('http://127.0.0.1:3001/api/registration/create', {
  method: 'POST',
  headers: {
    Origin: 'http://localhost:5173',
    'Content-Type': 'application/json',
    'X-Idempotency-Key': `p9b-debug-${Date.now()}`,
  },
  body: JSON.stringify(body),
});
const j = await r.json();
console.log(JSON.stringify({ status: r.status, body: j }, null, 2));

const url = process.env.STAGING_DATABASE_URL || process.env.DATABASE_URL;
const sql = neon(url);
const left = await sql`
  SELECT public_reference, payment_status, expected_amount_kobo, challenge_selected,
         exhibition_selected
  FROM registrations
  WHERE email_normalized LIKE 'phase9b-%@example.invalid'
  ORDER BY created_at DESC
  LIMIT 20
`;
console.log(
  JSON.stringify(
    {
      leftover: left.length,
      rows: left.map((x) => ({
        ref: x.public_reference,
        pay: x.payment_status,
        amt: x.expected_amount_kobo,
        chal: x.challenge_selected,
        exh: x.exhibition_selected,
      })),
    },
    null,
    2
  )
);
