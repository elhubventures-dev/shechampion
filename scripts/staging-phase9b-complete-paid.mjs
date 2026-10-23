#!/usr/bin/env node
/**
 * Complete exhibition + combined via HMAC-signed local webhook delivery
 * (simulates provider webhook; not Paystack dashboard). Plus verify paths.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';
import { hmacSha512Hex } from '../api/_lib/crypto.js';
import { PRICING } from '../api/_lib/pricing.js';

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
const key = process.env.PAYSTACK_SECRET_KEY;
const report = { ok: false, scenarios: {}, webhook: {}, browserChallenge: {} };

async function create(suffix, body) {
  const r = await fetch(`${API}/api/registration/create`, {
    method: 'POST',
    headers: {
      Origin: ORIGIN,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': `p9b-complete-${suffix}-${stamp}`,
    },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  return { status: r.status, ...j };
}

async function inspect(publicReference) {
  if (!publicReference) return { reg: null, txs: [] };
  const reg = await sql`
    SELECT id, public_reference, payment_status, challenge_status, exhibition_status,
           challenge_selected, exhibition_selected, expected_amount_kobo,
           event_registration_status
    FROM registrations WHERE public_reference = ${publicReference} LIMIT 1
  `;
  if (!reg[0]) return { reg: null, txs: [] };
  const txs = await sql`
    SELECT payment_reference, amount_kobo, status
    FROM payment_transactions WHERE registration_id = ${reg[0].id}
    ORDER BY created_at DESC
  `;
  return { reg: reg[0], txs };
}

async function signedWebhook({ reference, amount, event = 'charge.success', status = 'success' }) {
  const raw = JSON.stringify({
    event,
    data: {
      id: Math.floor(Math.random() * 1e9),
      status,
      reference,
      amount,
      currency: 'NGN',
    },
  });
  const sig = hmacSha512Hex(key, raw);
  const r = await fetch(`${API}/api/payment/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-paystack-signature': sig,
    },
    body: raw,
  });
  const j = await r.json().catch(() => ({}));
  return { httpStatus: r.status, body: j, raw, sig };
}

const base = (suffix) => ({
  fullName: `STAGING TEST P9B Complete ${suffix}`,
  email: `phase9b.complete.${suffix}.${stamp}@example.com`,
  phone: '+2348011110001',
  stateOfResidence: 'FCT',
  applicantCategory: 'EXISTING_BUSINESS_OWNER',
  briefDescription: `Synthetic Phase 9B complete ${suffix}.`,
  privacyAccepted: true,
  termsAccepted: true,
});

async function runPaidScenario(name, createBody, amount) {
  const created = await create(name, createBody);
  if (!created.ok || !created.publicReference) {
    return {
      initOk: false,
      createStatus: created.status,
      createCode: created.error?.code || null,
      createMessage: created.error?.message || null,
    };
  }
  const before = await inspect(created.publicReference);
  if (!before.txs[0]) {
    return {
      initOk: false,
      publicReference: created.publicReference,
      reason: 'no_payment_transaction',
      paymentStatus: before.reg?.payment_status,
    };
  }
  const wh = await signedWebhook({
    reference: before.txs[0].payment_reference,
    amount,
  });
  const after = await inspect(created.publicReference);
  return {
    initOk: true,
    publicReference: created.publicReference,
    expectedAmountKobo: created.expectedAmountKobo,
    txAmount: before.txs[0].amount_kobo,
    webhookHttp: wh.httpStatus,
    webhookBody: wh.body,
    paymentStatus: after.reg.payment_status,
    challengeStatus: after.reg.challenge_status,
    exhibitionStatus: after.reg.exhibition_status,
    eventRegistrationStatus: after.reg.event_registration_status,
    paymentReference: before.txs[0].payment_reference,
    wh,
  };
}

await sql`
  DELETE FROM rate_limits
  WHERE bucket_key LIKE 'reg-create:%' OR bucket_key LIKE 'payment-verify:%'
`;

const challenge = await runPaidScenario(
  'chal',
  {
    ...base('chal'),
    challengeSelected: true,
    challengeWomenEligibilityAttested: true,
  },
  PRICING.CHALLENGE_KOBO
);
let challengeDupExact = { status: null, body: {} };
if (challenge.wh) {
  const dupRes = await fetch(`${API}/api/payment/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-paystack-signature': challenge.wh.sig,
    },
    body: challenge.wh.raw,
  });
  challengeDupExact = {
    status: dupRes.status,
    body: await dupRes.json().catch(() => ({})),
  };
}
report.scenarios.challenge = {
  ...challenge,
  duplicateHttp: challengeDupExact.status,
  duplicateFlag: challengeDupExact.body?.duplicate === true,
  exhibitionNotConfirmed: challenge.exhibitionStatus === 'NOT_SELECTED',
  confirmed:
    challenge.paymentStatus === 'SUCCESS' && challenge.challengeStatus === 'CONFIRMED',
};

const exhibition = await runPaidScenario(
  'ex',
  {
    ...base('ex'),
    exhibitionSelected: true,
    exhibitionBusinessOwnerAttested: true,
    exhibitionBusinessName: 'STAGING TEST Exhibit Complete',
    exhibitionCategory: 'Fashion',
    exhibitionDescription: 'Synthetic exhibition for Phase 9B complete script.',
  },
  PRICING.EXHIBITION_KOBO
);
report.scenarios.exhibition = {
  ...exhibition,
  challengeNotConfirmed: exhibition.challengeStatus === 'NOT_SELECTED',
  confirmed:
    exhibition.paymentStatus === 'SUCCESS' &&
    exhibition.exhibitionStatus === 'CONFIRMED',
};

const combined = await runPaidScenario(
  'both',
  {
    ...base('both'),
    challengeSelected: true,
    exhibitionSelected: true,
    challengeWomenEligibilityAttested: true,
    exhibitionBusinessOwnerAttested: true,
    exhibitionBusinessName: 'STAGING TEST Combined Complete',
    exhibitionCategory: 'Crafts',
    exhibitionDescription: 'Synthetic combined exhibition for Phase 9B complete script.',
  },
  PRICING.COMBINED_KOBO
);
report.scenarios.combined = {
  ...combined,
  bothConfirmed:
    combined.challengeStatus === 'CONFIRMED' &&
    combined.exhibitionStatus === 'CONFIRMED',
};

const pendingCreated = await create('wrongamt', {
  ...base('wrongamt'),
  challengeSelected: true,
  challengeWomenEligibilityAttested: true,
});
const pendingIns = await inspect(pendingCreated.publicReference);
let wrongAmt = { httpStatus: null, body: {} };
let failedWh = { httpStatus: null, body: {} };
let pendingAfter = { reg: null };
let failedAfter = { reg: null };
if (pendingIns.txs[0]) {
  wrongAmt = await signedWebhook({
    reference: pendingIns.txs[0].payment_reference,
    amount: PRICING.EXHIBITION_KOBO,
  });
  pendingAfter = await inspect(pendingCreated.publicReference);
  failedWh = await signedWebhook({
    reference: pendingIns.txs[0].payment_reference,
    amount: PRICING.CHALLENGE_KOBO,
    event: 'charge.failed',
    status: 'failed',
  });
  failedAfter = await inspect(pendingCreated.publicReference);
}
report.scenarios.wrongAmountWebhook = {
  createOk: pendingCreated.ok === true,
  httpStatus: wrongAmt.httpStatus,
  ignored: wrongAmt.body?.ignored === true,
  reason: wrongAmt.body?.reason || null,
  stillPending: pendingAfter.reg?.challenge_status === 'PENDING_PAYMENT',
  eventStillRegistered: pendingAfter.reg?.event_registration_status === 'REGISTERED',
};
report.scenarios.failedWebhook = {
  httpStatus: failedWh.httpStatus,
  paymentStatus: failedAfter.reg?.payment_status,
  challengeNotConfirmed: failedAfter.reg?.challenge_status !== 'CONFIRMED',
  eventRegistered: failedAfter.reg?.event_registration_status === 'REGISTERED',
};

// Keep browser challenge row from earlier if present
const browserRow = await sql`
  SELECT public_reference, payment_status, challenge_status, expected_amount_kobo
  FROM registrations
  WHERE full_name = 'STAGING TEST P9B BrowserCheckout'
  ORDER BY created_at DESC LIMIT 1
`;
report.browserChallenge = browserRow[0] || null;

report.refs = {
  challenge: challenge.publicReference || null,
  exhibition: exhibition.publicReference || null,
  combined: combined.publicReference || null,
  pending: pendingCreated.publicReference || null,
};

report.ok =
  report.scenarios.challenge.confirmed === true &&
  report.scenarios.challenge.exhibitionNotConfirmed === true &&
  report.scenarios.exhibition.confirmed === true &&
  report.scenarios.exhibition.challengeNotConfirmed === true &&
  report.scenarios.combined.bothConfirmed === true &&
  report.scenarios.wrongAmountWebhook.stillPending === true &&
  report.scenarios.failedWebhook.eventRegistered === true &&
  report.scenarios.challenge.webhookHttp === 200 &&
  report.scenarios.exhibition.webhookHttp === 200 &&
  report.scenarios.combined.webhookHttp === 200;

// Never print signatures/raw bodies.
for (const key of Object.keys(report.scenarios)) {
  if (report.scenarios[key]?.wh) delete report.scenarios[key].wh;
  if (report.scenarios[key]?.paymentReference) {
    const ref = report.scenarios[key].paymentReference;
    report.scenarios[key].paymentReferenceTail = String(ref).slice(-8);
    delete report.scenarios[key].paymentReference;
  }
}

console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
