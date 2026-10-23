#!/usr/bin/env node
/** Free registration + security negatives for Phase 9B. No secrets printed. */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';
import { hmacSha512Hex } from '../api/_lib/crypto.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const API = 'http://127.0.0.1:3001';
const ORIGIN = 'http://localhost:5173';

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
const stamp = Date.now().toString(36);
const report = { ok: false };

await sql`DELETE FROM rate_limits WHERE bucket_key LIKE 'reg-create:%'`;

async function create(suffix, body, idem) {
  const r = await fetch(`${API}/api/registration/create`, {
    method: 'POST',
    headers: {
      Origin: ORIGIN,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': idem || `p9b-free-${suffix}-${stamp}`,
    },
    body: JSON.stringify(body),
  });
  return { status: r.status, ...(await r.json()) };
}

const freeBody = {
  fullName: 'STAGING TEST P9B Free Only',
  email: `phase9b.free.${stamp}@example.com`,
  phone: '+2348011110002',
  stateOfResidence: 'Lagos',
  applicantCategory: 'ASPIRING_ENTREPRENEUR',
  briefDescription: 'Synthetic Phase 9B free registration only.',
  privacyAccepted: true,
  termsAccepted: true,
  challengeSelected: false,
  exhibitionSelected: false,
};

const free1 = await create('1', freeBody);
const freeDup = await create('1', freeBody, `p9b-free-1-${stamp}`);
const freeDupEmail = await create('dupemail', {
  ...freeBody,
  fullName: 'STAGING TEST P9B Free Dup Email',
});

const freeIns = free1.publicReference
  ? await sql`
      SELECT public_reference, event_registration_status, payment_status,
             expected_amount_kobo, challenge_selected, exhibition_selected
      FROM registrations WHERE public_reference = ${free1.publicReference}
    `
  : [];
const freeTxs = free1.publicReference
  ? await sql`
      SELECT COUNT(*)::int AS c FROM payment_transactions t
      JOIN registrations r ON r.id = t.registration_id
      WHERE r.public_reference = ${free1.publicReference}
    `
  : [{ c: 0 }];

report.free = {
  createStatus: free1.status,
  ok: free1.ok === true,
  publicReference: free1.publicReference || null,
  expectedAmountKobo: free1.expectedAmountKobo ?? null,
  checkoutUrlPresent: Boolean(free1.authorizationUrl || free1.checkoutUrl),
  db: freeIns[0] || null,
  paymentTxCount: freeTxs[0].c,
  idempotentReplay: {
    status: freeDup.status,
    sameRef: freeDup.publicReference === free1.publicReference,
    ok: freeDup.ok === true,
  },
  duplicateEmail: {
    status: freeDupEmail.status,
    code: freeDupEmail.error?.code || null,
  },
};

const clientAmount = await create('clientamt', {
  ...freeBody,
  email: `phase9b.clientamt.${stamp}@example.com`,
  fullName: 'STAGING TEST P9B Client Amount',
  challengeSelected: true,
  challengeWomenEligibilityAttested: true,
  amount: 100,
  amountKobo: 100,
  expectedAmountKobo: 100,
});
report.clientSuppliedAmount = {
  status: clientAmount.status,
  ok: clientAmount.ok === true,
  serverExpected: clientAmount.expectedAmountKobo ?? null,
  ignoredClient: clientAmount.expectedAmountKobo === 500000 || clientAmount.ok !== true,
  code: clientAmount.error?.code || null,
};

const combinedAttempt = await create('combodis', {
  fullName: 'STAGING TEST P9B Combined Probe',
  email: `phase9b.combodis.${stamp}@example.com`,
  phone: '+2348011110003',
  stateOfResidence: 'FCT',
  applicantCategory: 'EXISTING_BUSINESS_OWNER',
  briefDescription: 'Probe combined when flag unset/false.',
  privacyAccepted: true,
  termsAccepted: true,
  challengeSelected: true,
  exhibitionSelected: true,
  challengeWomenEligibilityAttested: true,
  exhibitionBusinessOwnerAttested: true,
  exhibitionBusinessName: 'STAGING TEST Combined Probe',
  exhibitionCategory: 'Food',
  exhibitionDescription: 'Synthetic combined probe.',
});
report.combinedProbe = {
  allowCombinedEnv: process.env.ALLOW_COMBINED_CHALLENGE_EXHIBITION ?? null,
  status: combinedAttempt.status,
  ok: combinedAttempt.ok === true,
  expectedAmountKobo: combinedAttempt.expectedAmountKobo ?? null,
  code: combinedAttempt.error?.code || null,
  publicReference: combinedAttempt.publicReference || null,
};

const badSigBody = JSON.stringify({
  event: 'charge.success',
  data: {
    id: 1,
    status: 'success',
    reference: 'SC-FAKE-REF',
    amount: 500000,
    currency: 'NGN',
  },
});
const badSig = await fetch(`${API}/api/payment/webhook`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-paystack-signature': '0'.repeat(128),
  },
  body: badSigBody,
});
report.invalidWebhookSignature = {
  status: badSig.status,
  body: await badSig.json().catch(() => ({})),
};

const unknownRefRaw = JSON.stringify({
  event: 'charge.success',
  data: {
    id: 2,
    status: 'success',
    reference: `SC-UNKNOWN-${stamp}`,
    amount: 500000,
    currency: 'NGN',
  },
});
const unknownSig = hmacSha512Hex(process.env.PAYSTACK_SECRET_KEY, unknownRefRaw);
const unknownWh = await fetch(`${API}/api/payment/webhook`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-paystack-signature': unknownSig,
  },
  body: unknownRefRaw,
});
report.unknownReferenceWebhook = {
  status: unknownWh.status,
  body: await unknownWh.json().catch(() => ({})),
};

const wrongRefVerify = await fetch(
  `${API}/api/payment/verify?reference=SC-NOT-A-REAL-REF-${stamp}`,
  { headers: { Origin: ORIGIN } }
);
report.incorrectPaymentReference = {
  status: wrongRefVerify.status,
  body: await wrongRefVerify.json().catch(() => ({})),
};

report.ok =
  report.free.ok &&
  report.free.db?.event_registration_status === 'REGISTERED' &&
  report.free.db?.payment_status === 'NOT_REQUIRED' &&
  report.free.paymentTxCount === 0 &&
  report.free.checkoutUrlPresent === false &&
  report.invalidWebhookSignature.status === 401;

console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
