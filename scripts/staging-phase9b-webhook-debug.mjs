#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';
import { hmacSha512Hex } from '../api/_lib/crypto.js';

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

const sql = neon(process.env.STAGING_DATABASE_URL || process.env.DATABASE_URL);
const tx = await sql`
  SELECT pt.payment_reference, pt.amount_kobo, pt.status, r.public_reference
  FROM payment_transactions pt
  JOIN registrations r ON r.id = pt.registration_id
  WHERE r.full_name LIKE 'STAGING TEST P9B%'
    AND pt.status = 'PENDING'
  ORDER BY pt.created_at DESC
  LIMIT 1
`;
if (!tx[0]) {
  console.log(JSON.stringify({ ok: false, reason: 'no_pending_tx' }));
  process.exit(1);
}

const bodyObj = {
  event: 'charge.success',
  data: {
    id: 910001,
    status: 'success',
    reference: tx[0].payment_reference,
    amount: Number(tx[0].amount_kobo),
    currency: 'NGN',
  },
};
const raw = JSON.stringify(bodyObj);
const sig = hmacSha512Hex(process.env.PAYSTACK_SECRET_KEY, raw);

const invalid = await fetch('http://127.0.0.1:3001/api/payment/webhook', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-paystack-signature': '0'.repeat(128),
  },
  body: raw,
});
const invalidJson = await invalid.json().catch(() => ({}));

const valid = await fetch('http://127.0.0.1:3001/api/payment/webhook', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-paystack-signature': sig,
  },
  body: raw,
});
const validText = await valid.text();
let validJson = {};
try {
  validJson = JSON.parse(validText);
} catch {
  validJson = { raw: validText.slice(0, 200) };
}

const after = await sql`
  SELECT payment_status, challenge_status, exhibition_status
  FROM registrations WHERE public_reference = ${tx[0].public_reference}
  LIMIT 1
`;

console.log(
  JSON.stringify(
    {
      referenceTail: String(tx[0].payment_reference).slice(-8),
      amount: tx[0].amount_kobo,
      invalidStatus: invalid.status,
      invalidCode: invalidJson?.error?.code || null,
      validStatus: valid.status,
      validBody: validJson,
      after: after[0] || null,
    },
    null,
    2
  )
);
