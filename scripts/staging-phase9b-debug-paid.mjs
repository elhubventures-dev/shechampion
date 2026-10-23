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
  fullName: 'STAGING TEST P9B PaidDebug',
  email: `phase9b.paiddebug.${Date.now()}@example.com`,
  phone: '+2348011110001',
  stateOfResidence: 'FCT',
  applicantCategory: 'EXISTING_BUSINESS_OWNER',
  briefDescription: 'Synthetic Phase 9B paid init debug.',
  privacyAccepted: true,
  termsAccepted: true,
  challengeSelected: true,
  challengeWomenEligibilityAttested: true,
};

const r = await fetch('http://127.0.0.1:3001/api/registration/create', {
  method: 'POST',
  headers: {
    Origin: 'http://localhost:5173',
    'Content-Type': 'application/json',
    'X-Idempotency-Key': `p9b-paiddebug-${Date.now()}`,
  },
  body: JSON.stringify(body),
});
const j = await r.json();
console.log(
  JSON.stringify(
    {
      status: r.status,
      code: j?.error?.code || null,
      message: j?.error?.message || null,
      details: j?.error?.details || null,
      ok: j?.ok,
      publicReference: j?.publicReference || j?.error?.details?.publicReference || null,
      checkoutUrlPresent: Boolean(j?.checkoutUrl),
      expectedAmountKobo: j?.expectedAmountKobo ?? null,
      publicSiteUrlClass: (() => {
        const u = String(process.env.PUBLIC_SITE_URL || '');
        try {
          const host = new URL(u).hostname;
          return host.includes('localhost') || host === '127.0.0.1'
            ? 'localhost'
            : 'remote_host';
        } catch {
          return 'invalid';
        }
      })(),
      paystackMode: process.env.PAYSTACK_MODE,
      keyClass: String(process.env.PAYSTACK_SECRET_KEY || '').startsWith('sk_test_')
        ? 'test'
        : 'other',
    },
    null,
    2
  )
);

const url = process.env.STAGING_DATABASE_URL || process.env.DATABASE_URL;
const sql = neon(url);
const ref = j?.publicReference || j?.error?.details?.publicReference;
if (ref) {
  const rows = await sql`
    SELECT payment_status, expected_amount_kobo, challenge_status
    FROM registrations WHERE public_reference = ${ref} LIMIT 1
  `;
  const txs = await sql`
    SELECT pt.status, pt.amount_kobo, pt.currency,
           left(coalesce(pt.provider_init_response::text, ''), 500) AS init_snip
    FROM payment_transactions pt
    JOIN registrations r ON r.id = pt.registration_id
    WHERE r.public_reference = ${ref}
    ORDER BY pt.created_at DESC LIMIT 1
  `;
  console.log(JSON.stringify({ reg: rows[0] || null, tx: txs[0] || null }, null, 2));
}

// Direct Paystack initialize smoke (no secrets printed)
const direct = await fetch('https://api.paystack.co/transaction/initialize', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'phase9b.direct@example.com',
    amount: 500000,
    currency: 'NGN',
    reference: `SCBEC26_${Date.now().toString(16).padStart(32, '0').slice(-32)}`,
    callback_url: `${String(process.env.PUBLIC_SITE_URL || '').replace(/\/$/, '')}/payment/result`,
  }),
});
const directPayload = await direct.json().catch(() => ({}));
console.log(
  JSON.stringify(
    {
      directInitHttp: direct.status,
      directOk: Boolean(directPayload.status),
      directMessage:
        typeof directPayload.message === 'string'
          ? directPayload.message.slice(0, 200)
          : null,
      hasAuthUrl: Boolean(directPayload?.data?.authorization_url),
    },
    null,
    2
  )
);
