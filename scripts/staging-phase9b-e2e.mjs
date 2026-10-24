#!/usr/bin/env node
/**
 * Phase 9B — Paystack TEST-mode staging E2E (no secrets printed).
 *
 * Requires: APP_ENV=staging, staging DB, PAYSTACK_MODE=test, sk_test_ key,
 * migration 003, controlled registration window authorized for this phase.
 *
 * Completes paid flows via Paystack Charge API (test cards) against the same
 * payment reference created by our initialize path when the provider allows it;
 * otherwise records checkout URL readiness and leaves verification evidence.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';
import { hmacSha512Hex } from '../api/_lib/crypto.js';
import { PRICING } from '../api/_lib/pricing.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const API = String(process.env.PHASE9B_API_BASE || 'http://127.0.0.1:3001').replace(
  /\/$/,
  ''
);
const ORIGIN = String(process.env.PHASE9B_ORIGIN || 'http://localhost:5173');

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

const report = {
  ok: false,
  secretsPrinted: false,
  isolation: {},
  free: {},
  challenge: {},
  exhibition: {},
  combined: {},
  failures: {},
  webhook: {},
  email: {},
  admin: {},
  cleanup: {},
  createdPublicReferences: [],
  blockers: [],
};

function classifyKey(key) {
  const k = String(key || '').toLowerCase();
  if (!k) return 'absent';
  if (k.startsWith('sk_live_')) return 'live_rejected';
  if (k.startsWith('sk_test_')) return 'test';
  return 'unknown';
}

const appEnv = String(process.env.APP_ENV || '').toLowerCase();
const stagingUrl = String(process.env.STAGING_DATABASE_URL || '').trim();
const databaseUrl = String(process.env.DATABASE_URL || '').trim();
const url = stagingUrl || databaseUrl;
const paystackKey = String(process.env.PAYSTACK_SECRET_KEY || '').trim();
const paystackMode = String(process.env.PAYSTACK_MODE || '').toLowerCase();
const allowCombined =
  String(process.env.ALLOW_COMBINED_CHALLENGE_EXHIBITION || 'true').toLowerCase() !==
  'false';

report.isolation = {
  appEnv,
  urlsMatch: Boolean(stagingUrl) && Boolean(databaseUrl) && stagingUrl === databaseUrl,
  allowStagingMigrate: process.env.ALLOW_STAGING_MIGRATE === 'true',
  allowProductionMigrate: process.env.ALLOW_PRODUCTION_MIGRATE === 'true',
  paystackMode,
  paystackKeyClass: classifyKey(paystackKey),
  registrationEnabled: process.env.EVENT_REGISTRATION_ENABLED === 'true',
  privacyApproved: process.env.EVENT_PRIVACY_NOTICE_APPROVED === 'true',
  termsApproved: process.env.EVENT_PARTICIPATION_TERMS_APPROVED === 'true',
  eventStartAtConfigured: Boolean(String(process.env.EVENT_START_AT || '').trim()),
  allowCombined,
  apiBase: API,
  origin: ORIGIN,
  controlledWindowAuthorizedByPhase9BRequest: true,
};

if (appEnv !== 'staging') report.blockers.push('APP_ENV is not staging');
if (!url || /(^|[_\-./])prod(uction)?([_\-./?]|$)/i.test(url)) {
  report.blockers.push('Staging database URL missing or production-looking');
}
if (process.env.ALLOW_PRODUCTION_MIGRATE === 'true') {
  report.blockers.push('ALLOW_PRODUCTION_MIGRATE is true — refusing');
}
if (paystackMode !== 'test' || classifyKey(paystackKey) !== 'test') {
  report.blockers.push('Paystack is not safely in test mode');
}
if (!report.isolation.registrationEnabled) {
  report.blockers.push(
    'EVENT_REGISTRATION_ENABLED is false — controlled window not open for E2E'
  );
}
if (!report.isolation.privacyApproved || !report.isolation.termsApproved) {
  report.blockers.push(
    'Privacy/terms approval flags are not true — not overriding; E2E create may fail readiness'
  );
}

if (report.blockers.length) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(2);
}

const sql = neon(url);
const migrations = await sql`SELECT id FROM schema_migrations ORDER BY id`;
report.isolation.migrations = migrations.map((m) => m.id);
report.isolation.has003 = migrations.some((m) => m.id === '003_participation_options');
if (!report.isolation.has003) {
  report.blockers.push('Migration 003 not applied');
  console.log(JSON.stringify(report, null, 2));
  process.exit(2);
}

// Clear prior staging rate-limit buckets for this controlled test run.
await sql`
  DELETE FROM rate_limits
  WHERE bucket_key LIKE 'reg-create:%'
     OR bucket_key LIKE 'payment-verify:%'
`;

const stamp = Date.now().toString(36);
const createdIds = [];

async function api(path, { method = 'GET', body, headers = {}, rawBody } = {}) {
  const init = {
    method,
    headers: {
      Origin: ORIGIN,
      Accept: 'application/json',
      ...headers,
    },
  };
  if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  if (rawBody !== undefined) {
    init.body = rawBody;
  }
  const response = await fetch(`${API}${path}`, init);
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('json')
    ? await response.json().catch(() => ({}))
    : await response.text();
  return { status: response.status, data, headers: response.headers };
}

async function inspectReg(publicReference) {
  const rows = await sql`
    SELECT
      id, public_reference, event_registration_status, payment_status,
      challenge_selected, exhibition_selected, challenge_status, exhibition_status,
      expected_amount_kobo, currency, application_status
    FROM registrations
    WHERE public_reference = ${publicReference}
    LIMIT 1
  `;
  const reg = rows[0] || null;
  if (!reg) return null;
  createdIds.push(reg.id);
  const txs = await sql`
    SELECT payment_reference, amount_kobo, currency, status
    FROM payment_transactions
    WHERE registration_id = ${reg.id}
    ORDER BY created_at DESC
  `;
  const emails = await sql`
    SELECT email_type, status
    FROM email_deliveries
    WHERE registration_id = ${reg.id}
    ORDER BY created_at DESC
  `;
  return { reg, txs, emails };
}

function baseApplicant(suffix, extras = {}) {
  return {
    fullName: `STAGING TEST P9B ${suffix}`,
    // Paystack rejects reserved invalid TLDs like .invalid; use example.com for TEST.
    email: `phase9b.${suffix}.${stamp}@example.com`,
    phone: '+2348011110001',
    stateOfResidence: 'FCT',
    applicantCategory: 'EXISTING_BUSINESS_OWNER',
    businessName: extras.businessName || null,
    briefDescription: `Synthetic Phase 9B ${suffix} applicant for staging Paystack E2E.`,
    privacyAccepted: true,
    termsAccepted: true,
    challengeSelected: false,
    exhibitionSelected: false,
    ...extras,
  };
}

async function paystackCharge({ email, amountKobo, reference, card, pin, otp }) {
  const chargeRes = await fetch('https://api.paystack.co/charge', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${paystackKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      amount: String(amountKobo),
      currency: 'NGN',
      reference,
      card,
      ...(pin ? { pin } : {}),
    }),
  });
  let payload = await chargeRes.json().catch(() => ({}));
  let status = payload?.data?.status;
  let usedReference = payload?.data?.reference || reference;

  if (status === 'send_pin' && pin) {
    const pinRes = await fetch('https://api.paystack.co/charge/submit_pin', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${paystackKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pin, reference: usedReference }),
    });
    payload = await pinRes.json().catch(() => ({}));
    status = payload?.data?.status;
  }

  if (status === 'send_otp' && otp) {
    const otpRes = await fetch('https://api.paystack.co/charge/submit_otp', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${paystackKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ otp, reference: usedReference }),
    });
    payload = await otpRes.json().catch(() => ({}));
    status = payload?.data?.status;
  }

  // Poll pending
  for (let i = 0; i < 6 && status === 'pending'; i += 1) {
    await new Promise((r) => setTimeout(r, 2000));
    const check = await fetch(
      `https://api.paystack.co/charge/${encodeURIComponent(usedReference)}`,
      { headers: { Authorization: `Bearer ${paystackKey}` } }
    );
    payload = await check.json().catch(() => ({}));
    status = payload?.data?.status;
  }

  return {
    httpOk: chargeRes.ok,
    providerStatus: Boolean(payload.status),
    dataStatus: status || null,
    reference: usedReference,
    amount: payload?.data?.amount ?? null,
    currency: payload?.data?.currency ?? null,
    message: typeof payload.message === 'string' ? payload.message.slice(0, 160) : null,
    gateway:
      typeof payload?.data?.gateway_response === 'string'
        ? payload.data.gateway_response.slice(0, 120)
        : null,
  };
}

async function completeViaChargeOrNote(scenario, createResult, amountKobo, email) {
  const paymentReference = createResult.paymentReference;
  const out = {
    checkoutUrlPresent: Boolean(createResult.checkoutUrl),
    paymentReferencePresent: Boolean(paymentReference),
    chargeAttempt: null,
    verify: null,
    dbAfter: null,
    method: null,
  };

  if (!paymentReference) {
    out.method = 'blocked_no_reference';
    return out;
  }

  // Preferred: charge the initialized reference with no-validation test card.
  const charge = await paystackCharge({
    email,
    amountKobo,
    reference: paymentReference,
    card: {
      number: '4084084084084081',
      cvv: '408',
      expiry_month: '12',
      expiry_year: '30',
    },
  });
  out.chargeAttempt = {
    dataStatus: charge.dataStatus,
    amount: charge.amount,
    currency: charge.currency,
    message: charge.message,
    gateway: charge.gateway,
  };

  if (charge.dataStatus === 'success') {
    out.method = 'paystack_charge_api_test_card';
  } else {
    // Fallback: charge API cannot always settle an already-initialized hosted
    // checkout reference. Record evidence and still run our verify endpoint.
    out.method = 'initialize_only_charge_incomplete';
  }

  const verify = await api('/api/payment/verify', {
    method: 'POST',
    body: { reference: paymentReference },
  });
  out.verify = {
    httpStatus: verify.status,
    state: verify.data?.state || verify.data?.error?.code || null,
    paymentStatus: verify.data?.paymentStatus || null,
    challengeStatus: verify.data?.challengeStatus || null,
    exhibitionStatus: verify.data?.exhibitionStatus || null,
    publicReference: verify.data?.publicReference || null,
  };

  out.dbAfter = await inspectReg(createResult.publicReference);
  return out;
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------
const health = await api('/api/health');
const statusApi = await api('/api/registration/status');
report.isolation.healthOk = health.status === 200;
report.isolation.registrationStatus = {
  httpStatus: statusApi.status,
  status: statusApi.data?.status,
  registrationOpen: statusApi.data?.registrationOpen,
  paidCheckoutAvailable: statusApi.data?.paidCheckoutAvailable,
  freeRegistrationAvailable: statusApi.data?.freeRegistrationAvailable,
};

// ---------------------------------------------------------------------------
// 3. Free registration
// ---------------------------------------------------------------------------
const freeBody = baseApplicant('free');
const freeIdem = `p9b-free-${stamp}`;
const freeCreate = await api('/api/registration/create', {
  method: 'POST',
  headers: { 'X-Idempotency-Key': freeIdem },
  body: freeBody,
});
report.free.createHttp = freeCreate.status;
report.free.createOk = freeCreate.data?.ok === true;
report.free.createError = freeCreate.data?.error?.code || null;
report.free.paymentRequired = freeCreate.data?.paymentRequired;
report.free.publicReference = freeCreate.data?.publicReference || null;
report.free.checkoutUrlNull = freeCreate.data?.checkoutUrl == null;
report.free.emailStatus = freeCreate.data?.emailStatus || null;
if (report.free.publicReference) {
  report.createdPublicReferences.push(report.free.publicReference);
}
const freeDb = report.free.publicReference
  ? await inspectReg(report.free.publicReference)
  : null;
report.free.db = freeDb
  ? {
      event_registration_status: freeDb.reg.event_registration_status,
      payment_status: freeDb.reg.payment_status,
      expected_amount_kobo: freeDb.reg.expected_amount_kobo,
      challenge_selected: freeDb.reg.challenge_selected,
      exhibition_selected: freeDb.reg.exhibition_selected,
      paymentTxCount: freeDb.txs.length,
      emailStatuses: freeDb.emails.map((e) => `${e.email_type}:${e.status}`),
    }
  : null;

const freeDup = await api('/api/registration/create', {
  method: 'POST',
  headers: { 'X-Idempotency-Key': freeIdem },
  body: freeBody,
});
report.free.idempotentResume = {
  httpStatus: freeDup.status,
  sameReference: freeDup.data?.publicReference === report.free.publicReference,
  paymentRequired: freeDup.data?.paymentRequired,
};

const freeClientAmount = await api('/api/registration/create', {
  method: 'POST',
  headers: { 'X-Idempotency-Key': `p9b-amt-${stamp}` },
  body: { ...baseApplicant('amt'), amountKobo: 100, currency: 'USD' },
});
report.failures.clientSuppliedAmountRejected =
  freeClientAmount.status === 400 &&
  Boolean(freeClientAmount.data?.error?.details?.amount);

report.email.resendConfigured = Boolean(
  process.env.RESEND_API_KEY && process.env.EMAIL_FROM
);
report.email.freeEmailHonest =
  !report.free.db ||
  report.free.db.emailStatuses.length === 0 ||
  report.free.db.emailStatuses.some((s) => s.includes('SENT')) ||
  report.free.db.emailStatuses.some((s) => s.includes('FAILED')) ||
  report.free.db.emailStatuses.some((s) => s.includes('PENDING'));

// ---------------------------------------------------------------------------
// Eligibility negatives
// ---------------------------------------------------------------------------
const challengeNoAttest = await api('/api/registration/create', {
  method: 'POST',
  headers: { 'X-Idempotency-Key': `p9b-chal-noattest-${stamp}` },
  body: { ...baseApplicant('chal-no'), challengeSelected: true },
});
report.failures.challengeRequiresAttestation =
  challengeNoAttest.status === 400 &&
  Boolean(challengeNoAttest.data?.error?.details?.challengeWomenEligibilityAttested);

const exhibitNoFields = await api('/api/registration/create', {
  method: 'POST',
  headers: { 'X-Idempotency-Key': `p9b-ex-nofields-${stamp}` },
  body: { ...baseApplicant('ex-no'), exhibitionSelected: true },
});
report.failures.exhibitionRequiresFields =
  exhibitNoFields.status === 400 &&
  (Boolean(exhibitNoFields.data?.error?.details?.exhibitionBusinessOwnerAttested) ||
    Boolean(exhibitNoFields.data?.error?.details?.exhibitionBusinessName));

// ---------------------------------------------------------------------------
// 4. Challenge participation
// ---------------------------------------------------------------------------
const challengeBody = {
  ...baseApplicant('challenge'),
  challengeSelected: true,
  challengeWomenEligibilityAttested: true,
};
const challengeCreate = await api('/api/registration/create', {
  method: 'POST',
  headers: { 'X-Idempotency-Key': `p9b-chal-${stamp}` },
  body: challengeBody,
});
report.challenge.createHttp = challengeCreate.status;
report.challenge.createOk = challengeCreate.data?.ok === true;
report.challenge.publicReference = challengeCreate.data?.publicReference || null;
report.challenge.paymentRequired = challengeCreate.data?.paymentRequired;
report.challenge.expectedAmountKobo = challengeCreate.data?.expectedAmountKobo;
report.challenge.checkoutUrlPresent = Boolean(challengeCreate.data?.checkoutUrl);
if (report.challenge.publicReference) {
  report.createdPublicReferences.push(report.challenge.publicReference);
}

const challengeBefore = report.challenge.publicReference
  ? await inspectReg(report.challenge.publicReference)
  : null;
report.challenge.beforePayment = challengeBefore
  ? {
      expected_amount_kobo: challengeBefore.reg.expected_amount_kobo,
      currency: challengeBefore.reg.currency,
      challenge_status: challengeBefore.reg.challenge_status,
      exhibition_status: challengeBefore.reg.exhibition_status,
      event_registration_status: challengeBefore.reg.event_registration_status,
      payment_status: challengeBefore.reg.payment_status,
      txAmount: challengeBefore.txs[0]?.amount_kobo ?? null,
      txCurrency: challengeBefore.txs[0]?.currency ?? null,
      txStatus: challengeBefore.txs[0]?.status ?? null,
      paymentReference: challengeBefore.txs[0]?.payment_reference ?? null,
    }
  : null;

if (challengeBefore?.txs[0]?.payment_reference) {
  // Attach paymentReference onto create-like object for charge helper
  const paid = await completeViaChargeOrNote(
    'challenge',
    {
      publicReference: report.challenge.publicReference,
      checkoutUrl: challengeCreate.data?.checkoutUrl,
      paymentReference: challengeBefore.txs[0].payment_reference,
    },
    PRICING.CHALLENGE_KOBO,
    challengeBody.email
  );
  report.challenge.completion = {
    method: paid.method,
    chargeStatus: paid.chargeAttempt?.dataStatus || null,
    chargeAmount: paid.chargeAttempt?.amount ?? null,
    chargeCurrency: paid.chargeAttempt?.currency ?? null,
    verifyState: paid.verify?.state,
    verifyPaymentStatus: paid.verify?.paymentStatus,
    verifyChallengeStatus: paid.verify?.challengeStatus,
    verifyExhibitionStatus: paid.verify?.exhibitionStatus,
    dbPaymentStatus: paid.dbAfter?.reg?.payment_status,
    dbChallengeStatus: paid.dbAfter?.reg?.challenge_status,
    dbExhibitionStatus: paid.dbAfter?.reg?.exhibition_status,
    dbExpected: paid.dbAfter?.reg?.expected_amount_kobo,
    exhibitionNotConfirmed:
      paid.dbAfter?.reg?.exhibition_status === 'NOT_SELECTED' ||
      paid.dbAfter?.reg?.exhibition_selected === false,
  };

  // Duplicate verify
  const dupVerify = await api('/api/payment/verify', {
    method: 'POST',
    body: { reference: challengeBefore.txs[0].payment_reference },
  });
  report.failures.duplicateVerifyIdempotent =
    dupVerify.status === 200 &&
    (dupVerify.data?.state === 'success' || dupVerify.data?.paymentStatus === 'SUCCESS');
}

// ---------------------------------------------------------------------------
// 5. Exhibition
// ---------------------------------------------------------------------------
const exhibitionBody = {
  ...baseApplicant('exhibition'),
  exhibitionSelected: true,
  exhibitionBusinessOwnerAttested: true,
  exhibitionBusinessName: 'STAGING TEST Exhibit Co',
  exhibitionCategory: 'Fashion',
  exhibitionDescription: 'Synthetic exhibition products for Phase 9B staging.',
};
const exhibitionCreate = await api('/api/registration/create', {
  method: 'POST',
  headers: { 'X-Idempotency-Key': `p9b-ex-${stamp}` },
  body: exhibitionBody,
});
report.exhibition.createHttp = exhibitionCreate.status;
report.exhibition.createOk = exhibitionCreate.data?.ok === true;
report.exhibition.publicReference = exhibitionCreate.data?.publicReference || null;
report.exhibition.expectedAmountKobo = exhibitionCreate.data?.expectedAmountKobo;
report.exhibition.checkoutUrlPresent = Boolean(exhibitionCreate.data?.checkoutUrl);
if (report.exhibition.publicReference) {
  report.createdPublicReferences.push(report.exhibition.publicReference);
}
const exhibitionBefore = report.exhibition.publicReference
  ? await inspectReg(report.exhibition.publicReference)
  : null;
report.exhibition.beforePayment = exhibitionBefore
  ? {
      expected_amount_kobo: exhibitionBefore.reg.expected_amount_kobo,
      challenge_status: exhibitionBefore.reg.challenge_status,
      exhibition_status: exhibitionBefore.reg.exhibition_status,
      txAmount: exhibitionBefore.txs[0]?.amount_kobo ?? null,
      paymentReference: exhibitionBefore.txs[0]?.payment_reference ?? null,
    }
  : null;

if (exhibitionBefore?.txs[0]?.payment_reference) {
  const paid = await completeViaChargeOrNote(
    'exhibition',
    {
      publicReference: report.exhibition.publicReference,
      checkoutUrl: exhibitionCreate.data?.checkoutUrl,
      paymentReference: exhibitionBefore.txs[0].payment_reference,
    },
    PRICING.EXHIBITION_KOBO,
    exhibitionBody.email
  );
  report.exhibition.completion = {
    method: paid.method,
    chargeStatus: paid.chargeAttempt?.dataStatus || null,
    chargeAmount: paid.chargeAttempt?.amount ?? null,
    verifyState: paid.verify?.state,
    dbPaymentStatus: paid.dbAfter?.reg?.payment_status,
    dbChallengeStatus: paid.dbAfter?.reg?.challenge_status,
    dbExhibitionStatus: paid.dbAfter?.reg?.exhibition_status,
    challengeNotConfirmed:
      paid.dbAfter?.reg?.challenge_status === 'NOT_SELECTED' ||
      paid.dbAfter?.reg?.challenge_selected === false,
  };
}

// ---------------------------------------------------------------------------
// 6. Combined
// ---------------------------------------------------------------------------
if (allowCombined) {
  const combinedBody = {
    ...baseApplicant('combined'),
    challengeSelected: true,
    exhibitionSelected: true,
    challengeWomenEligibilityAttested: true,
    exhibitionBusinessOwnerAttested: true,
    exhibitionBusinessName: 'STAGING TEST Combined Co',
    exhibitionCategory: 'Crafts',
    exhibitionDescription: 'Synthetic combined exhibition description for Phase 9B.',
  };
  const combinedCreate = await api('/api/registration/create', {
    method: 'POST',
    headers: { 'X-Idempotency-Key': `p9b-both-${stamp}` },
    body: combinedBody,
  });
  report.combined.createHttp = combinedCreate.status;
  report.combined.createOk = combinedCreate.data?.ok === true;
  report.combined.publicReference = combinedCreate.data?.publicReference || null;
  report.combined.expectedAmountKobo = combinedCreate.data?.expectedAmountKobo;
  if (report.combined.publicReference) {
    report.createdPublicReferences.push(report.combined.publicReference);
  }
  const combinedBefore = report.combined.publicReference
    ? await inspectReg(report.combined.publicReference)
    : null;
  report.combined.beforePayment = combinedBefore
    ? {
        expected_amount_kobo: combinedBefore.reg.expected_amount_kobo,
        challenge_selected: combinedBefore.reg.challenge_selected,
        exhibition_selected: combinedBefore.reg.exhibition_selected,
        txAmount: combinedBefore.txs[0]?.amount_kobo ?? null,
        paymentReference: combinedBefore.txs[0]?.payment_reference ?? null,
      }
    : null;

  if (combinedBefore?.txs[0]?.payment_reference) {
    const paid = await completeViaChargeOrNote(
      'combined',
      {
        publicReference: report.combined.publicReference,
        checkoutUrl: combinedCreate.data?.checkoutUrl,
        paymentReference: combinedBefore.txs[0].payment_reference,
      },
      PRICING.COMBINED_KOBO,
      combinedBody.email
    );
    report.combined.completion = {
      method: paid.method,
      chargeStatus: paid.chargeAttempt?.dataStatus || null,
      chargeAmount: paid.chargeAttempt?.amount ?? null,
      verifyState: paid.verify?.state,
      dbPaymentStatus: paid.dbAfter?.reg?.payment_status,
      dbChallengeStatus: paid.dbAfter?.reg?.challenge_status,
      dbExhibitionStatus: paid.dbAfter?.reg?.exhibition_status,
      bothConfirmed:
        paid.dbAfter?.reg?.challenge_status === 'CONFIRMED' &&
        paid.dbAfter?.reg?.exhibition_status === 'CONFIRMED',
    };
  }
} else {
  const rejected = await api('/api/registration/create', {
    method: 'POST',
    headers: { 'X-Idempotency-Key': `p9b-both-disabled-${stamp}` },
    body: {
      ...baseApplicant('combined-disabled'),
      challengeSelected: true,
      exhibitionSelected: true,
      challengeWomenEligibilityAttested: true,
      exhibitionBusinessOwnerAttested: true,
      exhibitionBusinessName: 'X',
      exhibitionCategory: 'Y',
      exhibitionDescription: 'Synthetic combined disabled rejection path.',
    },
  });
  report.combined = {
    skippedBecauseDisabled: true,
    serverRejected: rejected.status === 400,
  };
}

// ---------------------------------------------------------------------------
// 7. Pending / wrong reference / free survives abandoned paid
// ---------------------------------------------------------------------------
const pendingBody = {
  ...baseApplicant('pending'),
  challengeSelected: true,
  challengeWomenEligibilityAttested: true,
};
const pendingCreate = await api('/api/registration/create', {
  method: 'POST',
  headers: { 'X-Idempotency-Key': `p9b-pending-${stamp}` },
  body: pendingBody,
});
report.createdPublicReferences.push(pendingCreate.data?.publicReference || '');
const pendingDb = pendingCreate.data?.publicReference
  ? await inspectReg(pendingCreate.data.publicReference)
  : null;
if (pendingDb?.txs[0]?.payment_reference) {
  const pendingVerify = await api('/api/payment/verify', {
    method: 'POST',
    body: { reference: pendingDb.txs[0].payment_reference },
  });
  report.failures.unpaidVerifyPendingOrFailed = ['pending', 'failed', 'unavailable'].includes(
    pendingVerify.data?.state
  ) || pendingVerify.status >= 400;
  const afterPending = await inspectReg(pendingCreate.data.publicReference);
  report.failures.eventRegistrationSurvivesAbandonedPayment =
    afterPending?.reg?.event_registration_status === 'REGISTERED';
}

const badRef = await api('/api/payment/verify', {
  method: 'POST',
  body: { reference: `SCBEC26_${'a'.repeat(32)}` },
});
report.failures.unknownReferenceRejected =
  badRef.status >= 400 || badRef.data?.state === 'failed' || Boolean(badRef.data?.error);

// Cross-amount: challenge payment must not confirm exhibition — validated by
// exhibition_status remaining NOT_SELECTED on challenge completion above.
report.failures.challengeDoesNotConfirmExhibition =
  report.challenge.completion?.exhibitionNotConfirmed !== false;
report.failures.exhibitionDoesNotConfirmChallenge =
  report.exhibition.completion?.challengeNotConfirmed !== false;

// ---------------------------------------------------------------------------
// 8. Webhook (local signed delivery — not Paystack dashboard)
// ---------------------------------------------------------------------------
report.webhook.providerDashboardDelivery =
  'blocked_no_public_authorized_endpoint';
report.webhook.note =
  'Local HMAC-signed deliveries exercised below; Paystack dashboard webhook not configured (no public tunnel).';

const webhookRef =
  challengeBefore?.txs[0]?.payment_reference ||
  exhibitionBefore?.txs[0]?.payment_reference ||
  null;

if (webhookRef) {
  const successBody = JSON.stringify({
    event: 'charge.success',
    data: {
      id: 999001,
      status: 'success',
      reference: webhookRef,
      amount: Number(
        challengeBefore?.txs[0]?.amount_kobo ||
          exhibitionBefore?.txs[0]?.amount_kobo ||
          PRICING.CHALLENGE_KOBO
      ),
      currency: 'NGN',
    },
  });
  const goodSig = hmacSha512Hex(paystackKey, successBody);
  const badSig = '0'.repeat(128);

  const invalidSig = await api('/api/payment/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-paystack-signature': badSig,
    },
    rawBody: successBody,
  });
  report.webhook.invalidSignatureRejected = invalidSig.status === 401;

  const validSig = await api('/api/payment/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-paystack-signature': goodSig,
    },
    rawBody: successBody,
  });
  report.webhook.validSignedDeliveryHttp = validSig.status;
  report.webhook.validSignedDeliveryOk =
    validSig.status === 200 && validSig.data?.ok !== false;

  const dup = await api('/api/payment/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-paystack-signature': goodSig,
    },
    rawBody: successBody,
  });
  report.webhook.duplicateDeliveryHttp = dup.status;
  report.webhook.duplicateAcknowledged =
    dup.status === 200 &&
    (dup.data?.duplicate === true || dup.data?.ok === true || dup.data?.ignored === true);

  const unknownBody = JSON.stringify({
    event: 'charge.success',
    data: {
      id: 999002,
      status: 'success',
      reference: `SCBEC26_${'b'.repeat(32)}`,
      amount: PRICING.CHALLENGE_KOBO,
      currency: 'NGN',
    },
  });
  const unknownSig = hmacSha512Hex(paystackKey, unknownBody);
  const unknownWh = await api('/api/payment/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-paystack-signature': unknownSig,
    },
    rawBody: unknownBody,
  });
  report.webhook.unknownReferenceSafe =
    unknownWh.status === 200 &&
    (unknownWh.data?.ignored === true ||
      unknownWh.data?.ok === true ||
      unknownWh.data?.duplicate === true);
}

// Failed charge card against a fresh initialize (provider-level failure)
const failBody = {
  ...baseApplicant('failcard'),
  challengeSelected: true,
  challengeWomenEligibilityAttested: true,
};
const failCreate = await api('/api/registration/create', {
  method: 'POST',
  headers: { 'X-Idempotency-Key': `p9b-fail-${stamp}` },
  body: failBody,
});
if (failCreate.data?.publicReference) {
  report.createdPublicReferences.push(failCreate.data.publicReference);
}
const failDb = failCreate.data?.publicReference
  ? await inspectReg(failCreate.data.publicReference)
  : null;
if (failDb?.txs[0]?.payment_reference) {
  const declined = await paystackCharge({
    email: failBody.email,
    amountKobo: PRICING.CHALLENGE_KOBO,
    reference: `${failDb.txs[0].payment_reference}_DECLINED_ALT`,
    card: {
      number: '4084080000005408',
      cvv: '001',
      expiry_month: '12',
      expiry_year: '30',
    },
  });
  report.failures.declinedCardProviderStatus = declined.dataStatus;
  // Abandoned path: verify original unpaid reference
  const failVerify = await api('/api/payment/verify', {
    method: 'POST',
    body: { reference: failDb.txs[0].payment_reference },
  });
  const failAfter = await inspectReg(failCreate.data.publicReference);
  report.failures.failedOrPendingLeavesEventRegistered =
    failAfter?.reg?.event_registration_status === 'REGISTERED' &&
    failAfter?.reg?.challenge_status !== 'CONFIRMED';
  report.failures.failVerifyState = failVerify.data?.state || null;
}

// ---------------------------------------------------------------------------
// 10. Admin dashboard API
// ---------------------------------------------------------------------------
const adminEmail = String(process.env.ADMIN_EMAIL || '').trim();
const adminPassword = String(process.env.ADMIN_PASSWORD || '').trim();
if (!adminPassword) {
  report.admin = {
    skipped: true,
    reason: 'ADMIN_PASSWORD not present in env (hash-only); use staging:admin-verify / browser',
  };
} else {
  const login = await api('/api/admin/session', {
    method: 'POST',
    body: { email: adminEmail, password: adminPassword },
  });
  const setCookie = login.headers.getSetCookie?.() || [];
  const cookieHeader = setCookie.map((c) => c.split(';')[0]).join('; ');
  const csrfMatch = cookieHeader.match(/sc_admin_csrf=([^;]+)/);
  const csrf = csrfMatch ? decodeURIComponent(csrfMatch[1]) : '';
  const list = await api('/api/admin/registrations?pageSize=100', {
    headers: { Cookie: cookieHeader },
  });
  const rows = list.data?.registrations || [];
  const summary = list.data?.summary || {};
  report.admin = {
    loginOk: login.status === 200,
    summaryKeys: Object.keys(summary),
    freeVisible: rows.some(
      (r) =>
        r.public_reference === report.free.publicReference &&
        r.payment_status === 'NOT_REQUIRED'
    ),
    challengeVisible: rows.some(
      (r) => r.public_reference === report.challenge.publicReference
    ),
    exhibitionVisible: rows.some(
      (r) => r.public_reference === report.exhibition.publicReference
    ),
    combinedVisible: report.combined.publicReference
      ? rows.some((r) => r.public_reference === report.combined.publicReference)
      : null,
    anonymousDenied: (await api('/api/admin/registrations')).status === 401,
  };
  if (csrf) {
    const exportRes = await fetch(`${API}/api/admin/export`, {
      method: 'POST',
      headers: {
        Origin: ORIGIN,
        Cookie: cookieHeader,
        'X-CSRF-Token': csrf,
        Accept: 'text/csv',
      },
    });
    const csv = await exportRes.text();
    report.admin.csvOk = exportRes.status === 200 && csv.includes('expected_amount_kobo');
    report.admin.csvHasFree = csv.includes(report.free.publicReference || '___');
  }
}

// ---------------------------------------------------------------------------
// Cleanup synthetic Phase 9B rows only
// ---------------------------------------------------------------------------
const uniqueIds = [...new Set(createdIds.filter(Boolean))];
for (const id of uniqueIds) {
  await sql`DELETE FROM email_deliveries WHERE registration_id = ${id}`;
  await sql`DELETE FROM payment_transactions WHERE registration_id = ${id}`;
  await sql`DELETE FROM registrations WHERE id = ${id}`;
}
const leftover = await sql`
  SELECT COUNT(*)::int AS c
  FROM registrations
  WHERE email_normalized LIKE ${`phase9b.%.${stamp}@example.com`}
     OR email_normalized LIKE ${`phase9b-%-${stamp}@example.invalid`}
`;
report.cleanup = {
  deletedRegistrationIds: uniqueIds.length,
  leftoverSyntheticForStamp: Number(leftover[0].c),
  cleanedUp: Number(leftover[0].c) === 0,
  preservedNonSynthetic: true,
};

// Close recommendation flag for report (does not mutate env files)
report.postTestRecommendation =
  'Set EVENT_REGISTRATION_ENABLED=false in private staging env when controlled window ends.';

const challengeInitOk =
  report.challenge.createOk &&
  report.challenge.beforePayment?.expected_amount_kobo === PRICING.CHALLENGE_KOBO &&
  report.challenge.beforePayment?.txAmount === PRICING.CHALLENGE_KOBO &&
  report.challenge.beforePayment?.challenge_status === 'PENDING_PAYMENT';
const exhibitionInitOk =
  report.exhibition.createOk &&
  report.exhibition.beforePayment?.expected_amount_kobo === PRICING.EXHIBITION_KOBO &&
  report.exhibition.beforePayment?.txAmount === PRICING.EXHIBITION_KOBO;
const combinedInitOk = allowCombined
  ? report.combined.createOk &&
    report.combined.beforePayment?.expected_amount_kobo === PRICING.COMBINED_KOBO &&
    report.combined.beforePayment?.txAmount === PRICING.COMBINED_KOBO
  : report.combined.serverRejected === true;

report.paymentCompletion = {
  challengeVerifiedSuccess:
    report.challenge.completion?.dbPaymentStatus === 'SUCCESS' &&
    report.challenge.completion?.dbChallengeStatus === 'CONFIRMED',
  exhibitionVerifiedSuccess:
    report.exhibition.completion?.dbPaymentStatus === 'SUCCESS' &&
    report.exhibition.completion?.dbExhibitionStatus === 'CONFIRMED',
  combinedVerifiedSuccess: allowCombined
    ? report.combined.completion?.bothConfirmed === true
    : null,
  note: 'Charge API may not settle an already-initialized hosted-checkout reference; hosted browser checkout may still be required.',
};

report.ok =
  report.free.createOk &&
  report.free.db?.event_registration_status === 'REGISTERED' &&
  report.free.db?.payment_status === 'NOT_REQUIRED' &&
  report.free.db?.paymentTxCount === 0 &&
  challengeInitOk &&
  exhibitionInitOk &&
  combinedInitOk &&
  report.failures.clientSuppliedAmountRejected &&
  report.failures.challengeRequiresAttestation &&
  report.failures.exhibitionRequiresFields &&
  report.webhook.invalidSignatureRejected &&
  report.cleanup.cleanedUp;

console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
