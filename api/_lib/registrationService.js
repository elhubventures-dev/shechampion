import { evaluateReadiness, buildCallbackUrl, getEventConfig } from './config.js';
import {
  EVENT_CURRENCY,
  EVENT_FEE_KOBO,
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
  buildConfirmationEmail,
  createEmailProvider,
} from './email.js';
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
        readiness.publicStatus = 'unavailable';
        readiness.reasons.push('Database connection failed.');
      }
    }
  }

  return {
    ok: true,
    status: readiness.publicStatus,
    registrationOpen: readiness.ready && databaseOk,
    registrationOpenAt: readiness.registrationOpenAt,
    registrationCutoffAt: readiness.registrationCutoffAt,
    eventStartAt: readiness.eventStartAt,
    feeDisplay: '₦5,000',
    feeKobo: EVENT_FEE_KOBO,
    currency: EVENT_CURRENCY,
    eventName: EVENT_NAME,
    eventId: config.eventId || EVENT_ID,
    // Do not expose internal reason strings that leak config details publicly.
    message: publicStatusMessage(readiness.publicStatus, databaseOk, readiness),
  };
}

function publicStatusMessage(status, databaseOk, readiness) {
  if (!databaseOk && readiness.registrationEnabled) {
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

export async function assertReadyForPayment(config = getEventConfig()) {
  const readiness = evaluateReadiness(config);
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
  if (!readiness.ready) {
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

export async function createRegistrationAndInitializePayment({
  input,
  idempotencyKey,
  config = getEventConfig(),
}) {
  await assertReadyForPayment(config);
  const sql = getSql(config.databaseUrl);
  const nowIso = new Date().toISOString();
  const idemHash = idempotencyKey
    ? sha256Hex(idempotencyKey)
    : sha256Hex(`auto:${input.email}:${Date.now()}:${randomToken(8)}`);

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
    return resumePendingPayment(existingByIdem[0], config);
  }

  const existingByEmail = await sql`
    SELECT *
    FROM registrations
    WHERE event_id = ${config.eventId || EVENT_ID}
      AND email_normalized = ${input.email}
    LIMIT 1
  `;

  let registration = existingByEmail[0];

  if (registration && registration.payment_status === 'SUCCESS') {
    const err = new Error(
      'An application with this email is already registered and paid.'
    );
    err.code = 'ALREADY_REGISTERED';
    throw err;
  }

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
          'PENDING_PAYMENT',
          'PENDING',
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
        if (raced[0]?.payment_status === 'SUCCESS') {
          const err = new Error(
            'An application with this email is already registered and paid.'
          );
          err.code = 'ALREADY_REGISTERED';
          throw err;
        }
        if (raced[0]) {
          return resumePendingPayment(raced[0], config);
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
        application_status = 'PENDING_PAYMENT',
        payment_status = 'PENDING',
        access_token_hash = ${accessTokenHash},
        idempotency_key_hash = COALESCE(${idemHash}, idempotency_key_hash),
        updated_at = now()
      WHERE id = ${registration.id}
        AND payment_status <> 'SUCCESS'
      RETURNING *
    `;
    if (!updated[0]) {
      const err = new Error(
        'An application with this email is already registered and paid.'
      );
      err.code = 'ALREADY_REGISTERED';
      throw err;
    }
    registration = updated[0];
  }

  return initializePaymentForRegistration(registration, config);
}

async function resumePendingPayment(registration, config) {
  if (registration.payment_status === 'SUCCESS') {
    return {
      publicReference: registration.public_reference,
      checkoutUrl: null,
      alreadyPaid: true,
    };
  }
  const sql = getSql(config.databaseUrl);
  const pendingTx = await sql`
    SELECT *
    FROM payment_transactions
    WHERE registration_id = ${registration.id}
      AND status IN ('PENDING', 'INITIALIZATION_FAILED')
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
      };
    }
  }
  return initializePaymentForRegistration(registration, config);
}

async function initializePaymentForRegistration(registration, config) {
  const sql = getSql(config.databaseUrl);
  const paymentReference = randomPaymentReference();
  const callbackUrl = buildCallbackUrl(config);

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
      ${EVENT_FEE_KOBO},
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
      amountKobo: EVENT_FEE_KOBO,
      reference: paymentReference,
      callbackUrl,
      metadata: {
        event_id: config.eventId || EVENT_ID,
        public_reference: registration.public_reference,
        registration_id: registration.id,
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
      SET payment_status = 'PENDING', updated_at = now()
      WHERE id = ${registration.id}
    `;

    return {
      publicReference: registration.public_reference,
      checkoutUrl: init.authorizationUrl,
      paymentReference,
      alreadyPaid: false,
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
      SET payment_status = 'INITIALIZATION_FAILED', updated_at = now()
      WHERE id = ${registration.id}
    `;
    const err = new Error(
      'Payment could not be started. Your application was saved — please try again.'
    );
    err.code = 'PAYMENT_INIT_FAILED';
    err.publicReference = registration.public_reference;
    throw err;
  }
}

/**
 * Apply a verified successful Paystack charge to registration + transaction.
 * Idempotent when already SUCCESS with matching reference.
 */
export async function applySuccessfulPayment({
  paymentReference,
  providerData,
  providerRaw,
  source,
  config = getEventConfig(),
}) {
  const sql = getSql(config.databaseUrl);
  const validation = validatePaystackSuccess({
    data: providerData,
    expectedReference: paymentReference,
    expectedAmountKobo: EVENT_FEE_KOBO,
    expectedCurrency: EVENT_CURRENCY,
  });
  if (!validation.ok) {
    const err = new Error(validation.reason);
    err.code = 'PAYMENT_VALIDATION_FAILED';
    throw err;
  }

  const txRows = await sql`
    SELECT pt.*, r.payment_status AS reg_payment_status, r.application_status,
           r.public_reference, r.full_name, r.email_normalized, r.id AS reg_id
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

  if (Number(row.amount_kobo) !== EVENT_FEE_KOBO || row.currency !== EVENT_CURRENCY) {
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

  // Atomic payment + registration update (webhook and callback may race).
  const refreshed = await sql.transaction(async (tx) => {
    const paymentUpdate = await tx`
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

    if (!paymentUpdate[0] && row.status !== 'SUCCESS') {
      const err = new Error('Payment could not be updated.');
      err.code = 'PAYMENT_UPDATE_CONFLICT';
      throw err;
    }

    await tx`
      UPDATE registrations
      SET
        payment_status = 'SUCCESS',
        application_status = CASE
          WHEN application_status = 'PENDING_PAYMENT' THEN 'REGISTERED'
          ELSE application_status
        END,
        updated_at = now()
      WHERE id = ${row.registration_id}
        AND payment_status NOT IN ('SUCCESS', 'REVERSED')
    `;

    return tx`
      SELECT public_reference, application_status, payment_status, full_name,
             email_normalized, id
      FROM registrations
      WHERE id = ${row.registration_id}
      LIMIT 1
    `;
  });

  return {
    alreadyProcessed: false,
    publicReference: refreshed[0].public_reference,
    paymentStatus: refreshed[0].payment_status,
    applicationStatus: refreshed[0].application_status,
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

  // FAILED/PENDING must not demote a verified SUCCESS (stale/racing provider events).
  // REVERSED may supersede SUCCESS when the provider reports a reversal/refund.
  await sql.transaction(async (tx) => {
    if (mapped === 'REVERSED') {
      await tx`
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
      await tx`
        UPDATE registrations r
        SET
          payment_status = 'REVERSED',
          updated_at = now()
        FROM payment_transactions pt
        WHERE pt.payment_reference = ${paymentReference}
          AND pt.registration_id = r.id
          AND r.payment_status <> 'REVERSED'
      `;
      return;
    }

    await tx`
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

    if (mapped === 'FAILED') {
      await tx`
        UPDATE registrations r
        SET
          payment_status = 'FAILED',
          updated_at = now()
        FROM payment_transactions pt
        WHERE pt.payment_reference = ${paymentReference}
          AND pt.registration_id = r.id
          AND r.payment_status NOT IN ('SUCCESS', 'REVERSED')
      `;
    }
  });

  return { paymentStatus: mapped };
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
    SELECT pt.*, r.public_reference, r.application_status, r.payment_status AS reg_payment
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
    await sendConfirmationEmailSafe(result.registrationId, config);
    return {
      state: 'success',
      publicReference: result.publicReference,
      paymentStatus: 'SUCCESS',
      applicationStatus: result.applicationStatus,
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
    };
  }

  if (data.status === 'reversed') {
    await markPaymentNonSuccess({
      paymentReference,
      status: 'REVERSED',
      providerRaw: raw,
      source: 'verify',
      config,
    });
    return {
      state: 'reversed',
      publicReference: tx.public_reference,
      paymentStatus: 'REVERSED',
      applicationStatus: tx.application_status,
    };
  }

  await markPaymentNonSuccess({
    paymentReference,
    status: 'FAILED',
    providerRaw: raw,
    source: 'verify',
    config,
  });
  return {
    state: 'failed',
    publicReference: tx.public_reference,
    paymentStatus: 'FAILED',
    applicationStatus: tx.application_status,
  };
}

export async function sendConfirmationEmailSafe(
  registrationId,
  config = getEventConfig()
) {
  const sql = getSql(config.databaseUrl);
  const rows = await sql`
    SELECT id, public_reference, full_name, email_normalized, payment_status
    FROM registrations
    WHERE id = ${registrationId}
    LIMIT 1
  `;
  const reg = rows[0];
  if (!reg || reg.payment_status !== 'SUCCESS') {
    return { sent: false, reason: 'not_paid' };
  }

  const existing = await sql`
    SELECT id, status, attempts
    FROM email_deliveries
    WHERE registration_id = ${registrationId}
      AND email_type = 'registration_confirmation'
    ORDER BY created_at DESC
    LIMIT 1
  `;
  if (existing[0]?.status === 'SENT') {
    return { sent: true, alreadySent: true };
  }

  let deliveryId = existing[0]?.id;
  if (!deliveryId) {
    const created = await sql`
      INSERT INTO email_deliveries (
        registration_id, email_type, to_email, status, attempts
      ) VALUES (
        ${registrationId},
        'registration_confirmation',
        ${reg.email_normalized},
        'PENDING',
        0
      )
      RETURNING id
    `;
    deliveryId = created[0].id;
  }

  const provider = createEmailProvider(config);
  const content = buildConfirmationEmail({
    publicReference: reg.public_reference,
    fullName: reg.full_name,
  });

  try {
    const result = await provider.send({
      to: reg.email_normalized,
      ...content,
    });
    await sql`
      UPDATE email_deliveries
      SET
        status = 'SENT',
        provider_message_id = ${result.messageId},
        last_error = NULL,
        attempts = attempts + 1,
        updated_at = now()
      WHERE id = ${deliveryId}
    `;

    if (config.adminNotificationEmail) {
      try {
        await provider.send({
          to: config.adminNotificationEmail,
          subject: `New paid registration: ${reg.public_reference}`,
          text: `Paid registration ${reg.public_reference} for ${EVENT_NAME}.`,
          html: `<p>Paid registration <strong>${reg.public_reference}</strong> for ${EVENT_NAME}.</p>`,
        });
      } catch {
        // Admin notification failure must not affect applicant confirmation status.
      }
    }

    return { sent: true, messageId: result.messageId };
  } catch (error) {
    await sql`
      UPDATE email_deliveries
      SET
        status = 'FAILED',
        last_error = ${String(error.message || 'send failed').slice(0, 500)},
        attempts = attempts + 1,
        updated_at = now()
      WHERE id = ${deliveryId}
    `;
    return { sent: false, reason: 'send_failed' };
  }
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
    if (error.code === '23505' || message.includes('duplicate') || message.includes('unique')) {
      return { duplicate: true };
    }
    throw error;
  }
}
