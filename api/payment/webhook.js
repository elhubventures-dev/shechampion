import { createHash } from 'node:crypto';
import { getEventConfig } from '../_lib/config.js';
import { sha256Hex } from '../_lib/crypto.js';
import { methodNotAllowed, readRawBody, sendError, sendJson } from '../_lib/http.js';
import { verifyPaystackSignature } from '../_lib/paystack.js';
import {
  applySuccessfulPayment,
  markPaymentNonSuccess,
  recordWebhookEvent,
  sendConfirmationEmailSafe,
  sendPaymentFailedEmailSafe,
  sendPaymentReversedEmailSafe,
} from '../_lib/registrationService.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    methodNotAllowed(res, ['POST']);
    return;
  }

  const config = getEventConfig();
  if (!config.paystackSecretKey || !config.databaseUrl) {
    sendError(res, 503, 'WEBHOOK_UNAVAILABLE', 'Webhook handler unavailable.');
    return;
  }

  try {
    const raw = await readRawBody(req, 256_000);
    const signature = req.headers['x-paystack-signature'];
    if (!verifyPaystackSignature(config.paystackSecretKey, raw, signature)) {
      sendError(res, 401, 'INVALID_SIGNATURE', 'Invalid webhook signature.');
      return;
    }

    let payload;
    try {
      payload = JSON.parse(raw.toString('utf8'));
    } catch {
      sendError(res, 400, 'INVALID_JSON', 'Invalid webhook body.');
      return;
    }

    const eventType = String(payload.event || '');
    const data = payload.data || {};
    const paymentReference = data.reference ? String(data.reference) : null;
    const eventKey = sha256Hex(
      `${signature}:${createHash('sha256').update(raw).digest('hex')}`
    );

    // Process payment state first (idempotent). Record delivery afterward so a
    // crash mid-handler cannot permanently skip application on Paystack retry.
    const isSuccess =
      eventType === 'charge.success' || String(data.status || '') === 'success';
    const isFailed =
      eventType === 'charge.failed' || String(data.status || '') === 'failed';
    const isReversed =
      String(data.status || '') === 'reversed' ||
      eventType === 'refund.processed' ||
      eventType === 'charge.reversed';

    if (paymentReference && isSuccess) {
      try {
        const result = await applySuccessfulPayment({
          paymentReference,
          providerData: data,
          providerRaw: payload,
          source: 'webhook',
          config,
        });
        // Email must never fail the webhook ack after payment is persisted.
        try {
          await sendConfirmationEmailSafe(result.registrationId, config);
        } catch {
          // Intentionally ignored — delivery status is tracked separately.
        }
      } catch (error) {
        if (
          error.code === 'UNKNOWN_REFERENCE' ||
          error.code === 'PAYMENT_VALIDATION_FAILED' ||
          error.code === 'TEST_MODE_BLOCKED' ||
          error.code === 'PAYMENT_REVERSED' ||
          error.code === 'STORED_AMOUNT_MISMATCH' ||
          error.code === 'PAYMENT_UPDATE_CONFLICT'
        ) {
          try {
            await recordWebhookEvent({
              eventKey,
              eventType,
              paymentReference,
              config,
            });
          } catch {
            // still acknowledge ignored validation outcomes
          }
          sendJson(res, 200, { ok: true, ignored: true, reason: error.code });
          return;
        }
        throw error;
      }
    } else if (paymentReference && isReversed) {
      const reversed = await markPaymentNonSuccess({
        paymentReference,
        status: 'REVERSED',
        providerRaw: payload,
        source: 'webhook',
        config,
      });
      if (reversed.registrationId) {
        try {
          await sendPaymentReversedEmailSafe(reversed.registrationId, config);
        } catch {
          // ignore
        }
      }
    } else if (paymentReference && isFailed) {
      const failed = await markPaymentNonSuccess({
        paymentReference,
        status: 'FAILED',
        providerRaw: payload,
        source: 'webhook',
        config,
      });
      if (failed.registrationId) {
        try {
          await sendPaymentFailedEmailSafe(failed.registrationId, config, {
            paymentReference,
            statusLabel: 'FAILED',
          });
        } catch {
          // ignore
        }
      }
    }

    let recorded = { duplicate: false };
    try {
      recorded = await recordWebhookEvent({
        eventKey,
        eventType,
        paymentReference,
        config,
      });
    } catch {
      // Payment state already applied when relevant; still ack to avoid poison retries.
    }

    sendJson(res, 200, {
      ok: true,
      duplicate: Boolean(recorded.duplicate),
      ignored: !paymentReference || (!isSuccess && !isFailed && !isReversed),
    });
  } catch {
    // Non-2xx lets Paystack retry; safe because payment updates are idempotent.
    sendError(res, 500, 'WEBHOOK_ERROR', 'Unable to process webhook.');
  }
}
