#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';
import { getEventConfig } from '../api/_lib/config.js';
import { applySuccessfulPayment } from '../api/_lib/registrationService.js';

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

const config = getEventConfig();
const sql = neon(config.databaseUrl);
const tx = await sql`
  SELECT pt.payment_reference, pt.amount_kobo
  FROM payment_transactions pt
  JOIN registrations r ON r.id = pt.registration_id
  WHERE r.full_name LIKE 'STAGING TEST P9B%'
    AND pt.status = 'PENDING'
  ORDER BY pt.created_at DESC
  LIMIT 1
`;
if (!tx[0]) {
  console.log(JSON.stringify({ ok: false, reason: 'no_pending' }));
  process.exit(1);
}

try {
  const result = await applySuccessfulPayment({
    paymentReference: tx[0].payment_reference,
    providerData: {
      id: 910002,
      status: 'success',
      reference: tx[0].payment_reference,
      amount: Number(tx[0].amount_kobo),
      currency: 'NGN',
    },
    providerRaw: { event: 'charge.success' },
    source: 'webhook',
    config,
  });
  console.log(
    JSON.stringify(
      {
        ok: true,
        paymentStatus: result.paymentStatus,
        challengeStatus: result.challengeStatus,
        exhibitionStatus: result.exhibitionStatus,
        alreadyProcessed: result.alreadyProcessed,
      },
      null,
      2
    )
  );
} catch (error) {
  console.log(
    JSON.stringify(
      {
        ok: false,
        code: error.code || null,
        message: String(error.message || error).slice(0, 300),
      },
      null,
      2
    )
  );
}
