import { getEventConfig } from '../_lib/config.js';
import {
  clientIp,
  methodNotAllowed,
  readJsonBody,
  sendError,
  sendJson,
} from '../_lib/http.js';
import { enforceRateLimit } from '../_lib/rateLimit.js';
import { verifyPaymentReference } from '../_lib/registrationService.js';
import { assertJsonContentType } from '../_lib/security.js';
import { isValidPaymentReference } from '../_lib/validation.js';

/**
 * GET remains supported because Paystack hosted checkout returns users to
 * /payment/result?reference=... and the SPA must verify without a prior POST.
 * Side effects are limited to the referenced transaction after Paystack verify.
 * Prefer POST for manual retries from the SPA.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    methodNotAllowed(res, ['GET', 'POST']);
    return;
  }

  const config = getEventConfig();

  try {
    if (config.databaseUrl) {
      await enforceRateLimit({
        key: `pay-verify:${clientIp(req)}`,
        limit: 30,
        windowMs: 15 * 60 * 1000,
        databaseUrl: config.databaseUrl,
      });
    }

    let reference = null;
    if (req.method === 'GET') {
      const url = new URL(req.url, 'http://localhost');
      reference = url.searchParams.get('reference');
    } else {
      assertJsonContentType(req);
      const { data } = await readJsonBody(req);
      reference = data.reference;
    }

    if (!isValidPaymentReference(reference)) {
      sendError(res, 400, 'INVALID_REFERENCE', 'Invalid payment reference.');
      return;
    }

    const result = await verifyPaymentReference(reference, config);
    sendJson(res, 200, {
      ok: true,
      state: result.state,
      publicReference: result.publicReference,
      paymentStatus: result.paymentStatus,
      applicationStatus: result.applicationStatus,
    });
  } catch (error) {
    if (error.code === 'RATE_LIMITED') {
      res.setHeader('Retry-After', String(error.retryAfter || 60));
      sendError(res, 429, 'RATE_LIMITED', error.message);
      return;
    }
    if (error.code === 'UNSUPPORTED_MEDIA_TYPE') {
      sendError(res, 415, error.code, error.message);
      return;
    }
    if (error.code === 'UNKNOWN_REFERENCE') {
      sendError(res, 404, error.code, error.message);
      return;
    }
    if (
      error.code === 'VERIFY_UNAVAILABLE' ||
      error.code === 'TEST_MODE_BLOCKED' ||
      error.code === 'PAYMENT_REVERSED'
    ) {
      sendError(res, 503, error.code, error.message);
      return;
    }
    if (error.code === 'PAYMENT_VALIDATION_FAILED') {
      sendError(res, 400, error.code, error.message);
      return;
    }
    sendError(res, 500, 'VERIFY_FAILED', 'Payment verification failed.');
  }
}
