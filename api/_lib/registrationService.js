import { evaluateReadiness, buildCallbackUrl, getEventConfig } from './config.js';
import {
  EVENT_CURRENCY,
  EVENT_ID,
  EVENT_NAME,
  PAYSTACK_PROVIDER,
} from './constants.js';
import {
  randomPaymentReference,
  randomPublicReference,
  randomToken,
  sha256Hex,
} from './crypto.js';
import { getSql, pingDatabase } from './db.js';
import {
  sendConfirmationEmailSafe,
  sendFreeRegistrationEmailSafe,
  sendParticipationEmailSafe,
  sendPaymentFailedEmailSafe,
  sendPaymentPendingEmailSafe,
  sendPaymentReversedEmailSafe,
} from './emailDelivery.js';
import { getPublicPricingConfig } from './pricing.js';

export {
  sendConfirmationEmailSafe,
  sendFreeRegistrationEmailSafe,
  sendParticipationEmailSafe,
  sendPaymentFailedEmailSafe,
  sendPaymentPendingEmailSafe,
  sendPaymentReversedEmailSafe,
};
import {
  initializePaystackTransaction,
  mapPaystackStatus,
  sanitizeProviderPayload,
  validatePaystackSuccess,
  verifyPaystackTransaction,
} from './paystack.js';

export async function getPublicRegistrationStatus(config = getEventConfig()) {
  const readiness = evaluateReadiness(config);
  let databaseOk = false;
  if (config.databaseUrl) {
    try {
      await pingDatabase(config.databaseUrl);
      databaseOk = true;
    } catch {
      databaseOk = false;
      if (readiness.ready) {
        readiness.ready = false;
        readiness.freeRegistrationAvailable = false;
        readiness.paidCheckoutAvailable = false;
        readiness.publicStatus = 'unavailable';
        readiness.reasons.push('Database connection failed.');
      }
    }
  }

  const freeOpen = readiness.freeRegistrationAvailable && databaseOk;
  const paidOpen = readiness.paidCheckoutAvailable && databaseOk;

  return {
    ok: true,
    status: readiness.publicStatus,
    registrationOpen: freeOpen,
    freeRegistrationAvailable: freeOpen,
    paidCheckoutAvailable: paidOpen,
    registrationOpenAt: readiness.registrationOpenAt,
    registrationCutoffAt: readiness.registrationCutoffAt,
    eventStartAt: readiness.eventStartAt,
    currency: EVENT_CURRENCY,
    eventName: EVENT_NAME,
    eventId: config.eventId || EVENT_ID,
    pricing: getPublicPricingConfig(config.allowCombinedChallengeExhibition),
    message: publicStatusMessage(readiness.publicStatus, databaseOk, readiness),
  };
}

function publicStatusMessage(status, databaseOk, readiness) {
  if (!databaseOk && readiness.registrationEnabled !== false && status !== 'closed') {
    return 'Registration is temporarily unavailable. Please try again later.';
  }
  switch (status) {
    case 'open':
      return 'Registration is open.';
    case 'not_open':
      return 'Registration is not open yet.';
    case 'closed':
      return 'Registration is closed.';
    default:
      return 'Registration is currently unavailable.';
  }
}

async function assertDatabase(config) {
  if (!config.databaseUrl) {
    const err = new Error('Registration is unavailable.');
    err.code = 'NOT_READY';
    err.publicStatus = 'unavailable';
    throw err;
  }
  try {
    await pingDatabase(config.databaseUrl);
  } catch {
    const err = new Error('Registration is temporarily unavailable.');
    err.code = 'DB_UNAVAILABLE';
    err.publicStatus = 'unavailable';
    throw err;
  }
}

export async function assertReadyForRegistration(config = getEventConfig()) {
  await assertDatabase(config);
  const readiness = evaluateReadiness(config);
  if (!readiness.freeRegistrationAvailable) {
    const err = new Error(
      publicStatusMessage(readiness.publicStatus, true, readiness)
    );
    err.code = 'NOT_READY';
    err.publicStatus = readiness.publicStatus;
    err.reasons = readiness.reasons;
    throw err;
  }
  return readiness;
}

/** @deprecated Use assertReadyForRegistration / paid checkout checks. */
export async function assertReadyForPayment(config = getEventConfig()) {
  const readiness = await assertReadyForRegistration(config);
  if (!readiness.paidCheckoutAvailable) {
    const err = new Error(
      'Paid participation checkout is currently unavailable. Free event registration may still be available without paid activities.'
    );
    err.code = 'PAID_CHECKOUT_UNAVAILABLE';
    err.publicStatus = readiness.publicStatus;
    err.reasons = readiness.reasons;
    throw err;
  }
  return readiness;
}

function participationColumns(input, nowIso) {
  const challengeSelected = Boolean(input.challengeSelected);
  const exhibitionSelected = Boolean(input.exhibitionSelected);
  const expectedAmountKobo = Number(input.expectedAmountKobo) || 0;
  const paymentRequired = expectedAmountKobo > 0;

  return {
    challengeSelected,
    exhibitionSelected,
    challengeStatus: challengeSelected ? 'PENDING_PAYMENT' : 'NOT_SELECTED',
    exhibitionStatus: exhibitionSelected ? 'PENDING_PAYMENT' : 'NOT_SELECTED',
    expectedAmountKobo,
    currency: EVENT_CURRENCY,
    challengeWomenEligibilityAttested: Boolean(
      input.challengeWomenEligibilityAttested
    ),
    challengeEligibilityAttestedAt:
      challengeSelected && input.challengeWomenEligibilityAttested
        ? nowIso
        : null,
    exhibitionBusinessOwnerAttested: Boolean(
      input.exhibitionBusinessOwnerAttested
    ),
    exhibitionOwnerAttestedAt:
      exhibitionSelected && input.exhibitionBusinessOwnerAttested
        ? nowIso
        : null,
    exhibitionBusinessName: exhibitionSelected
      ? input.exhibitionBusinessName
      : null,
    exhibitionCategory: exhibitionSelected ? input.exhibitionCategory : null,
    exhibitionDescription: exhibitionSelected
      ? input.exhibitionDescription
      : null,
    paymentStatus: paymentRequired ? 'PENDING' : 'NOT_REQUIRED',
    applicationStatus: paymentRequired ? 'PENDING_PAYMENT' : 'REGISTERED',
    eventRegistrationStatus: 'REGISTERED',
  };
}

function isFullySettled(registration) {
  if (registration.payment_status === 'SUCCESS') return true;
  if (
    registration.payment_status === 'NOT_REQUIRED' &&
    registration.event_registration_status === 'REGISTERED' &&
    !registration.challenge_selected &&
    !registration.exhibition_selected
  ) {
    return true;
  }
  return false;
}

/**
 * Create free event registration and/or initialize paid participation checkout.
 */
export async function createRegistrationAndInitializePayment({
  input,
  idempotencyKey,
  config = getEventConfig(),
}) {
  const readiness = await assertReadyForRegistration(config);
  const sql = getSql(config.databaseUrl);
  const nowIso = new Date().toISOString();
  const idemHash = idempotencyKey
    ? sha256Hex(idempotencyKey)
    : sha256Hex(`auto:${input.email}:${Date.now()}:${randomToken(8)}`);

  const paymentRequired = Boolean(input.paymentRequired);
  if (paymentRequired && !readiness.paidCheckoutAvailable) {
    const err = new Error(
      'Paid participation checkout is currently unavailable. You may register for the free event without selecting paid activities, or try paid checkout again later.'
    );
    err.code = 'PAID_CHECKOUT_UNAVAILABLE';
    throw err;
  }

  const existingByIdem = idempotencyKey
    ? await sql`
        SELECT *
        FROM registrations
        WHERE event_id = ${config.eventId || EVENT_ID}
          AND idempotency_key_hash = ${idemHash}
        LIMIT 1
      `
    : [];

  if (existingByIdem[0]) {
    return resumeRegistration(existingByIdem[0], config);
  }

  const existingByEmail = await sql`
    SELECT *
    FROM registrations
    WHERE event_id = ${config.eventId || EVENT_ID}
      AND email_normalized = ${input.email}
    LIMIT 1
  `;

  let registration = existingByEmail[0];

  if (registration && isFullySettled(registration)) {
    const err = new Error(
      'An application with this email is already registered.'
    );
    err.code = 'ALREADY_REGISTERED';
    err.publicReference = registration.public_reference;
    throw err;
  }

  const cols = participationColumns(input, nowIso);
  const accessTokenHash = sha256Hex(randomToken(24));

  if (!registration) {
    const publicReference = randomPublicReference();
    try {
      const inserted = await sql`
        INSERT INTO registrations (
          public_reference,
          event_id,
          full_name,
          email_normalized,
          phone,
          state_of_residence,
          applicant_category,
          business_name,
          brief_description,
          privacy_accepted_at,
          terms_accepted_at,
          application_status,
          payment_status,
          event_registration_status,
          challenge_selected,
          exhibition_selected,
          challenge_status,
          exhibition_status,
          expected_amount_kobo,
          currency,
          challenge_women_eligibility_attested,
          challenge_eligibility_attested_at,
          exhibition_business_owner_attested,
          exhibition_owner_attested_at,
          exhibition_business_name,
          exhibition_category,
          exhibition_description,
          access_token_hash,
          idempotency_key_hash
        ) VALUES (
          ${publicReference},
          ${config.eventId || EVENT_ID},
          ${input.fullName},
          ${input.email},
          ${input.phone},
          ${input.stateOfResidence},
          ${input.applicantCategory},
          ${input.businessName},
          ${input.briefDescription},
          ${nowIso}::timestamptz,
          ${nowIso}::timestamptz,
          ${cols.applicationStatus},
          ${cols.paymentStatus},
          ${cols.eventRegistrationStatus},
          ${cols.challengeSelected},
          ${cols.exhibitionSelected},
          ${cols.challengeStatus},
          ${cols.exhibitionStatus},
          ${cols.expectedAmountKobo},
          ${cols.currency},
          ${cols.challengeWomenEligibilityAttested},
          ${cols.challengeEligibilityAttestedAt}::timestamptz,
          ${cols.exhibitionBusinessOwnerAttested},
          ${cols.exhibitionOwnerAttestedAt}::timestamptz,
          ${cols.exhibitionBusinessName},
          ${cols.exhibitionCategory},
          ${cols.exhibitionDescription},
          ${accessTokenHash},
          ${idemHash}
        )
        RETURNING *
      `;
      registration = inserted[0];
    } catch (error) {
      const message = String(error.message || '').toLowerCase();
      if (error.code === '23505' || message.includes('unique')) {
        const raced = await sql`
          SELECT *
          FROM registrations
          WHERE event_id = ${config.eventId || EVENT_ID}
            AND email_normalized = ${input.email}
          LIMIT 1
        `;
        if (raced[0] && isFullySettled(raced[0])) {
          const err = new Error(
            'An application with this email is already registered.'
          );
          err.code = 'ALREADY_REGISTERED';
          err.publicReference = raced[0].public_reference;
          throw err;
        }
        if (raced[0]) {
          return resumeRegistration(raced[0], config);
        }
      }
      throw error;
    }
  } else {
    const updated = await sql`
      UPDATE registrations
      SET
        full_name = ${input.fullName},
        phone = ${input.phone},
        state_of_residence = ${input.stateOfResidence},
        applicant_category = ${input.applicantCategory},
        business_name = ${input.businessName},
        brief_description = ${input.briefDescription},
        privacy_accepted_at = ${nowIso}::timestamptz,
        terms_accepted_at = ${nowIso}::timestamptz,
        application_status = ${cols.applicationStatus},
        payment_status = ${cols.paymentStatus},
        event_registration_status = ${cols.eventRegistrationStatus},
        challenge_selected = ${cols.challengeSelected},
        exhibition_selected = ${cols.exhibitionSelected},
        challenge_status = ${cols.challengeStatus},
        exhibition_status = ${cols.exhibitionStatus},
        expected_amount_kobo = ${cols.expectedAmountKobo},
        currency = ${cols.currency},
        challenge_women_eligibility_attested = ${cols.challengeWomenEligibilityAttested},
        challenge_eligibility_attested_at = ${cols.challengeEligibilityAttestedAt}::timestamptz,
        exhibition_business_owner_attested = ${cols.exhibitionBusinessOwnerAttested},
        exhibition_owner_attested_at = ${cols.exhibitionOwnerAttestedAt}::timestamptz,
        exhibition_business_name = ${cols.exhibitionBusinessName},
        exhibition_category = ${cols.exhibitionCategory},
        exhibition_description = ${cols.exhibitionDescription},
        access_token_hash = ${accessTokenHash},
        idempotency_key_hash = COALESCE(${idemHash}, idempotency_key_hash),
        updated_at = now()
      WHERE id = ${registration.id}
        AND payment_status <> 'SUCCESS'
      RETURNING *
    `;
    if (!updated[0]) {
      const err = new Error(
        'An application with this email is already registered.'
      );
      err.code = 'ALREADY_REGISTERED';
      throw err;
    }
    registration = updated[0];
  }

  if (!paymentRequired) {
    const emailResult = await sendFreeRegistrationEmailSafe(
      registration.id,
      config
    );
    return {
      publicReference: registration.public_reference,
      checkoutUrl: null,
      alreadyPaid: false,
      paymentRequired: false,
      eventRegistrationStatus: 'REGISTERED',
      paymentStatus: 'NOT_REQUIRED',
      challengeStatus: registration.challenge_status,
      exhibitionStatus: registration.exhibition_status,
      expectedAmountKobo: 0,
      emailStatus: emailResult.sent
        ? 'SENT'
        : emailResult.alreadySent
          ? 'SENT'
          : emailResult.reason || 'FAILED',
    };
  }

  return initializePaymentForRegistration(registration, config);
}

async function resumeRegistration(registration, config) {
  if (isFullySettled(registration)) {
    return {
      publicReference: registration.public_reference,
      checkoutUrl: null,
      alreadyPaid: true,
      paymentRequired: registration.payment_status !== 'NOT_REQUIRED',
      eventRegistrationStatus: registration.event_registration_status,
      paymentStatus: registration.payment_status,
    };
  }

  if (
    registration.payment_status === 'NOT_REQUIRED' ||
    Number(registration.expected_amount_kobo || 0) === 0
  ) {
    return {
      publicReference: registration.public_reference,
      checkoutUrl: null,
      alreadyPaid: false,
      resumed: true,
      paymentRequired: false,
      eventRegistrationStatus: registration.event_registration_status,
      paymentStatus: 'NOT_REQUIRED',
      expectedAmountKobo: 0,
    };
  }

  return resumePendingPayment(registration, config);
}

async function resumePendingPayment(registration, config) {
  if (registration.payment_status === 'SUCCESS') {
    return {
      publicReference: registration.public_reference,
      checkoutUrl: null,
      alreadyPaid: true,
      paymentRequired: true,
    };
  }
  const sql = getSql(config.databaseUrl);
  const pendingTx = await sql`
    SELECT *
    FROM payment_transactions
    WHERE registration_id = ${registration.id}
      AND status IN ('PENDING', 'INITIALIZATION_FAILED')
      AND amount_kobo = ${registration.expected_amount_kobo}
    ORDER BY created_at DESC
    LIMIT 1
  `;
  if (pendingTx[0]?.status === 'PENDING' && pendingTx[0].provider_init_response) {
    const authUrl =
      pendingTx[0].provider_init_response?.data?.authorization_url ||
      pendingTx[0].provider_init_response?.authorizationUrl;
    if (authUrl) {
      return {
        publicReference: registration.public_reference,
        checkoutUrl: authUrl,
        paymentReference: pendingTx[0].payment_reference,
        alreadyPaid: false,
        resumed: true,
        paymentRequired: true,
        expectedAmountKobo: Number(registration.expected_amount_kobo),
        eventRegistrationStatus: registration.event_registration_status,
      };
    }
  }
  return initializePaymentForRegistration(registration, config);
}

async function initializePaymentForRegistration(registration, config) {
  const sql = getSql(config.databaseUrl);
  const paymentReference = randomPaymentReference();
  const callbackUrl = buildCallbackUrl(config);
  const amountKobo = Number(registration.expected_amount_kobo);

  if (!Number.isFinite(amountKobo) || amountKobo <= 0) {
    const err = new Error('Invalid expected participation amount.');
    err.code = 'INVALID_AMOUNT';
    throw err;
  }

  if (!config.paystackSecretKey) {
    await sql`
      UPDATE registrations
      SET
        payment_status = 'INITIALIZATION_FAILED',
        updated_at = now()
      WHERE id = ${registration.id}
    `;
    const err = new Error(
      'Payment could not be started. Your free event registration was saved — paid participation remains unconfirmed. Please try again later.'
    );
    err.code = 'PAYMENT_INIT_FAILED';
    err.publicReference = registration.public_reference;
    throw err;
  }

  const txRows = await sql`
    INSERT INTO payment_transactions (
      registration_id,
      payment_reference,
      amount_kobo,
      currency,
      provider,
      payment_mode,
      status
    ) VALUES (
      ${registration.id},
      ${paymentReference},
      ${amountKobo},
      ${EVENT_CURRENCY},
      ${PAYSTACK_PROVIDER},
      ${config.paystackMode},
      'PENDING'
    )
    RETURNING *
  `;
  const transaction = txRows[0];

  try {
    const init = await initializePaystackTransaction({
      secretKey: config.paystackSecretKey,
      email: registration.email_normalized,
      amountKobo,
      reference: paymentReference,
      callbackUrl,
      metadata: {
        event_id: config.eventId || EVENT_ID,
        public_reference: registration.public_reference,
        registration_id: registration.id,
        challenge_selected: registration.challenge_selected,
        exhibition_selected: registration.exhibition_selected,
        expected_amount_kobo: amountKobo,
      },
    });

    await sql`
      UPDATE payment_transactions
      SET
        provider_init_response = ${JSON.stringify(init.raw)}::jsonb,
        updated_at = now()
      WHERE id = ${transaction.id}
    `;

    await sql`
      UPDATE registrations
      SET
        payment_status = 'PENDING',
        event_registration_status = 'REGISTERED',
        updated_at = now()
      WHERE id = ${registration.id}
    `;

    try {
      await sendPaymentPendingEmailSafe(registration.id, config, {
        checkoutUrl: init.authorizationUrl,
        paymentReference,
      });
    } catch {
      // Email failure must not block checkout URL return.
    }

    return {
      publicReference: registration.public_reference,
      checkoutUrl: init.authorizationUrl,
      paymentReference,
      alreadyPaid: false,
      paymentRequired: true,
      expectedAmountKobo: amountKobo,
      eventRegistrationStatus: 'REGISTERED',
      paymentStatus: 'PENDING',
      challengeStatus: registration.challenge_status,
      exhibitionStatus: registration.exhibition_status,
    };
  } catch (error) {
    await sql`
      UPDATE payment_transactions
      SET
        status = 'INITIALIZATION_FAILED',
        provider_init_response = ${JSON.stringify(
          sanitizeProviderPayload(error.provider || { message: error.message })
        )}::jsonb,
        updated_at = now()
      WHERE id = ${transaction.id}
    `;
    await sql`
      UPDATE registrations
      SET
        payment_status = 'INITIALIZATION_FAILED',
        event_registration_status = 'REGISTERED',
        updated_at = now()
      WHERE id = ${registration.id}
    `;
    try {
      await sendPaymentFailedEmailSafe(registration.id, config, {
        paymentReference,
        statusLabel: 'INITIALIZATION_FAILED',
      });
    } catch {
      // ignore
    }
    const err = new Error(
      'Payment could not be started. Your free event registration was saved — paid participation remains unconfirmed. Please try again.'
    );
    err.code = 'PAYMENT_INIT_FAILED';
    err.publicReference = registration.public_reference;
    throw err;
  }
}

/**
 * Apply a verified successful Paystack charge.
 * Confirms only the paid activities matching the stored expected amount.
 */
export async function applySuccessfulPayment({
  paymentReference,
  providerData,
  providerRaw,
  source,
  config = getEventConfig(),
}) {
  const sql = getSql(config.databaseUrl);

  const txRows = await sql`
    SELECT pt.*, r.payment_status AS reg_payment_status, r.application_status,
           r.public_reference, r.full_name, r.email_normalized, r.id AS reg_id,
           r.challenge_selected, r.exhibition_selected,
           r.challenge_status, r.exhibition_status,
           r.expected_amount_kobo, r.currency AS reg_currency,
           r.event_registration_status
    FROM payment_transactions pt
    JOIN registrations r ON r.id = pt.registration_id
    WHERE pt.payment_reference = ${paymentReference}
    LIMIT 1
  `;
  const row = txRows[0];
  if (!row) {
    const err = new Error('Unknown payment reference.');
    err.code = 'UNKNOWN_REFERENCE';
    throw err;
  }

  const expectedAmount = Number(row.expected_amount_kobo);
  const validation = validatePaystackSuccess({
    data: providerData,
    expectedReference: paymentReference,
    expectedAmountKobo: expectedAmount,
    expectedCurrency: EVENT_CURRENCY,
  });
  if (!validation.ok) {
    const err = new Error(validation.reason);
    err.code = 'PAYMENT_VALIDATION_FAILED';
    throw err;
  }

  if (
    Number(row.amount_kobo) !== expectedAmount ||
    row.currency !== EVENT_CURRENCY ||
    row.reg_currency !== EVENT_CURRENCY
  ) {
    const err = new Error('Stored transaction amount/currency mismatch.');
    err.code = 'STORED_AMOUNT_MISMATCH';
    throw err;
  }

  if (row.status === 'SUCCESS' && row.reg_payment_status === 'SUCCESS') {
    return {
      alreadyProcessed: true,
      publicReference: row.public_reference,
      paymentStatus: 'SUCCESS',
      applicationStatus: row.application_status,
      challengeStatus: row.challenge_status,
      exhibitionStatus: row.exhibition_status,
      registrationId: row.reg_id,
      fullName: row.full_name,
      email: row.email_normalized,
    };
  }

  if (config.isVercelProduction && row.payment_mode !== 'live') {
    const err = new Error(
      'Test-mode payments cannot complete live registrations in production.'
    );
    err.code = 'TEST_MODE_BLOCKED';
    throw err;
  }

  if (row.status === 'REVERSED' || row.reg_payment_status === 'REVERSED') {
    const err = new Error('Transaction was reversed and cannot be marked paid.');
    err.code = 'PAYMENT_REVERSED';
    throw err;
  }

  const providerTxnId = providerData.id != null ? String(providerData.id) : null;
  const sanitized = sanitizeProviderPayload(providerRaw);
  const nextChallenge = row.challenge_selected ? 'CONFIRMED' : 'NOT_SELECTED';
  const nextExhibition = row.exhibition_selected ? 'CONFIRMED' : 'NOT_SELECTED';

  // Neon HTTP driver: use optimistic sequential updates (WHERE status guards)
  // instead of interactive sql.transaction callbacks, which can crash the process.
  const paymentUpdate = await sql`
    UPDATE payment_transactions
    SET
      status = 'SUCCESS',
      provider_transaction_id = COALESCE(${providerTxnId}, provider_transaction_id),
      verified_at = COALESCE(verified_at, now()),
      provider_verify_response = CASE
        WHEN ${source} = 'verify' THEN ${JSON.stringify(sanitized)}::jsonb
        ELSE provider_verify_response
      END,
      provider_webhook_payload = CASE
        WHEN ${source} = 'webhook' THEN ${JSON.stringify(sanitized)}::jsonb
        ELSE provider_webhook_payload
      END,
      updated_at = now()
    WHERE id = ${row.id}
      AND status NOT IN ('SUCCESS', 'REVERSED')
    RETURNING id
  `;

  if (!paymentUpdate[0]) {
    const latest = await sql`
      SELECT status FROM payment_transactions WHERE id = ${row.id} LIMIT 1
    `;
    if (latest[0]?.status === 'SUCCESS') {
      const existing = await sql`
        SELECT public_reference, application_status, payment_status, full_name,
               email_normalized, id, challenge_selected, exhibition_selected,
               challenge_status, exhibition_status, expected_amount_kobo,
               event_registration_status
        FROM registrations
        WHERE id = ${row.registration_id}
        LIMIT 1
      `;
      return {
        alreadyProcessed: true,
        publicReference: existing[0].public_reference,
        paymentStatus: existing[0].payment_status,
        applicationStatus: existing[0].application_status,
        challengeStatus: existing[0].challenge_status,
        exhibitionStatus: existing[0].exhibition_status,
        challengeSelected: existing[0].challenge_selected,
        exhibitionSelected: existing[0].exhibition_selected,
        expectedAmountKobo: existing[0].expected_amount_kobo,
        registrationId: existing[0].id,
        fullName: existing[0].full_name,
        email: existing[0].email_normalized,
      };
    }
    const err = new Error('Payment could not be updated.');
    err.code = 'PAYMENT_UPDATE_CONFLICT';
    throw err;
  }

  await sql`
    UPDATE registrations
    SET
      payment_status = 'SUCCESS',
      event_registration_status = 'REGISTERED',
      application_status = CASE
        WHEN application_status = 'PENDING_PAYMENT' THEN 'REGISTERED'
        ELSE application_status
      END,
      challenge_status = CASE
        WHEN challenge_selected THEN
          CASE
            WHEN challenge_status IN ('UNDER_REVIEW', 'SHORTLISTED', 'NOT_SHORTLISTED')
              THEN challenge_status
            ELSE ${nextChallenge}
          END
        ELSE 'NOT_SELECTED'
      END,
      exhibition_status = CASE
        WHEN exhibition_selected THEN ${nextExhibition}
        ELSE 'NOT_SELECTED'
      END,
      updated_at = now()
    WHERE id = ${row.registration_id}
      AND payment_status NOT IN ('SUCCESS', 'REVERSED')
  `;

  const refreshed = await sql`
    SELECT public_reference, application_status, payment_status, full_name,
           email_normalized, id, challenge_selected, exhibition_selected,
           challenge_status, exhibition_status, expected_amount_kobo,
           event_registration_status
    FROM registrations
    WHERE id = ${row.registration_id}
    LIMIT 1
  `;

  return {
    alreadyProcessed: false,
    publicReference: refreshed[0].public_reference,
    paymentStatus: refreshed[0].payment_status,
    applicationStatus: refreshed[0].application_status,
    challengeStatus: refreshed[0].challenge_status,
    exhibitionStatus: refreshed[0].exhibition_status,
    challengeSelected: refreshed[0].challenge_selected,
    exhibitionSelected: refreshed[0].exhibition_selected,
    expectedAmountKobo: refreshed[0].expected_amount_kobo,
    registrationId: refreshed[0].id,
    fullName: refreshed[0].full_name,
    email: refreshed[0].email_normalized,
  };
}

export async function markPaymentNonSuccess({
  paymentReference,
  status,
  providerRaw,
  source,
  config = getEventConfig(),
}) {
  const sql = getSql(config.databaseUrl);
  const mapped = ['FAILED', 'REVERSED', 'PENDING'].includes(status)
    ? status
    : mapPaystackStatus(status);
  const sanitized = sanitizeProviderPayload(providerRaw);

  if (mapped === 'REVERSED') {
    await sql`
      UPDATE payment_transactions
      SET
        status = 'REVERSED',
        provider_verify_response = CASE
          WHEN ${source} = 'verify' THEN ${JSON.stringify(sanitized)}::jsonb
          ELSE provider_verify_response
        END,
        provider_webhook_payload = CASE
          WHEN ${source} = 'webhook' THEN ${JSON.stringify(sanitized)}::jsonb
          ELSE provider_webhook_payload
        END,
        updated_at = now()
      WHERE payment_reference = ${paymentReference}
        AND status <> 'REVERSED'
    `;
    const reversedRegs = await sql`
      UPDATE registrations r
      SET
        payment_status = 'REVERSED',
        challenge_status = CASE
          WHEN r.challenge_selected THEN 'REVERSED'
          ELSE r.challenge_status
        END,
        exhibition_status = CASE
          WHEN r.exhibition_selected THEN 'REVERSED'
          ELSE r.exhibition_status
        END,
        updated_at = now()
      FROM payment_transactions pt
      WHERE pt.payment_reference = ${paymentReference}
        AND pt.registration_id = r.id
        AND r.payment_status <> 'REVERSED'
      RETURNING r.id
    `;
    return {
      paymentStatus: mapped,
      registrationId: reversedRegs[0]?.id || null,
    };
  }

  await sql`
    UPDATE payment_transactions
    SET
      status = ${mapped},
      provider_verify_response = CASE
        WHEN ${source} = 'verify' THEN ${JSON.stringify(sanitized)}::jsonb
        ELSE provider_verify_response
      END,
      provider_webhook_payload = CASE
        WHEN ${source} = 'webhook' THEN ${JSON.stringify(sanitized)}::jsonb
        ELSE provider_webhook_payload
      END,
      updated_at = now()
    WHERE payment_reference = ${paymentReference}
      AND status NOT IN ('SUCCESS', 'REVERSED')
  `;

  let failedRegistrationId = null;
  if (mapped === 'FAILED') {
    const failedRegs = await sql`
      UPDATE registrations r
      SET
        payment_status = 'FAILED',
        challenge_status = CASE
          WHEN r.challenge_selected AND r.challenge_status = 'PENDING_PAYMENT'
            THEN 'PENDING_PAYMENT'
          ELSE r.challenge_status
        END,
        exhibition_status = CASE
          WHEN r.exhibition_selected AND r.exhibition_status = 'PENDING_PAYMENT'
            THEN 'PENDING_PAYMENT'
          ELSE r.exhibition_status
        END,
        updated_at = now()
      FROM payment_transactions pt
      WHERE pt.payment_reference = ${paymentReference}
        AND pt.registration_id = r.id
        AND r.payment_status NOT IN ('SUCCESS', 'REVERSED', 'NOT_REQUIRED')
      RETURNING r.id
    `;
    failedRegistrationId = failedRegs[0]?.id || null;
  }

  return { paymentStatus: mapped, registrationId: failedRegistrationId };
}

export async function verifyPaymentReference(
  paymentReference,
  config = getEventConfig()
) {
  if (!config.databaseUrl || !config.paystackSecretKey) {
    const err = new Error('Verification is unavailable.');
    err.code = 'VERIFY_UNAVAILABLE';
    throw err;
  }

  const sql = getSql(config.databaseUrl);
  const txRows = await sql`
    SELECT pt.*, r.public_reference, r.application_status, r.payment_status AS reg_payment,
           r.challenge_status, r.exhibition_status, r.event_registration_status
    FROM payment_transactions pt
    JOIN registrations r ON r.id = pt.registration_id
    WHERE pt.payment_reference = ${paymentReference}
    LIMIT 1
  `;
  const tx = txRows[0];
  if (!tx) {
    const err = new Error('Payment reference not found.');
    err.code = 'UNKNOWN_REFERENCE';
    throw err;
  }

  if (tx.status === 'SUCCESS' && tx.reg_payment === 'SUCCESS') {
    return {
      state: 'success',
      publicReference: tx.public_reference,
      paymentStatus: 'SUCCESS',
      applicationStatus: tx.application_status,
      challengeStatus: tx.challenge_status,
      exhibitionStatus: tx.exhibition_status,
      eventRegistrationStatus: tx.event_registration_status,
    };
  }

  const { data, raw } = await verifyPaystackTransaction({
    secretKey: config.paystackSecretKey,
    reference: paymentReference,
  });

  if (data.status === 'success') {
    const result = await applySuccessfulPayment({
      paymentReference,
      providerData: data,
      providerRaw: raw,
      source: 'verify',
      config,
    });
    await sendParticipationEmailSafe(result.registrationId, config, {
      paymentReference,
    });
    return {
      state: 'success',
      publicReference: result.publicReference,
      paymentStatus: 'SUCCESS',
      applicationStatus: result.applicationStatus,
      challengeStatus: result.challengeStatus,
      exhibitionStatus: result.exhibitionStatus,
    };
  }

  if (
    data.status === 'abandoned' ||
    data.status === 'ongoing' ||
    data.status === 'pending'
  ) {
    await markPaymentNonSuccess({
      paymentReference,
      status: 'PENDING',
      providerRaw: raw,
      source: 'verify',
      config,
    });
    return {
      state: 'pending',
      publicReference: tx.public_reference,
      paymentStatus: 'PENDING',
      applicationStatus: tx.application_status,
      eventRegistrationStatus: tx.event_registration_status,
      message:
        'Event registration may already be saved. Paid participation remains unconfirmed until payment succeeds.',
    };
  }

  if (data.status === 'reversed') {
    const reversed = await markPaymentNonSuccess({
      paymentReference,
      status: 'REVERSED',
      providerRaw: raw,
      source: 'verify',
      config,
    });
    if (reversed.registrationId || tx.registration_id) {
      try {
        await sendPaymentReversedEmailSafe(
          reversed.registrationId || tx.registration_id,
          config
        );
      } catch {
        // ignore
      }
    }
    return {
      state: 'reversed',
      publicReference: tx.public_reference,
      paymentStatus: 'REVERSED',
      applicationStatus: tx.application_status,
      eventRegistrationStatus: tx.event_registration_status,
      message:
        'This payment was reversed. Paid participation is no longer confirmed.',
    };
  }

  const failed = await markPaymentNonSuccess({
    paymentReference,
    status: 'FAILED',
    providerRaw: raw,
    source: 'verify',
    config,
  });
  if (failed.registrationId || tx.registration_id) {
    try {
      await sendPaymentFailedEmailSafe(
        failed.registrationId || tx.registration_id,
        config,
        { paymentReference, statusLabel: 'FAILED' }
      );
    } catch {
      // ignore
    }
  }
  return {
    state: 'failed',
    publicReference: tx.public_reference,
    paymentStatus: 'FAILED',
    applicationStatus: tx.application_status,
    eventRegistrationStatus: tx.event_registration_status,
    message:
      'Payment was not successful. Your free event registration remains if it was saved; paid participation is not confirmed.',
  };
}

export async function recordWebhookEvent({
  eventKey,
  eventType,
  paymentReference,
  config = getEventConfig(),
}) {
  const sql = getSql(config.databaseUrl);
  try {
    await sql`
      INSERT INTO webhook_events (provider, event_key, event_type, payment_reference)
      VALUES (${PAYSTACK_PROVIDER}, ${eventKey}, ${eventType}, ${paymentReference || null})
    `;
    return { duplicate: false };
  } catch (error) {
    const message = String(error.message || '').toLowerCase();
    if (
      error.code === '23505' ||
      message.includes('duplicate') ||
      message.includes('unique')
    ) {
      return { duplicate: true };
    }
    throw error;
  }
}
