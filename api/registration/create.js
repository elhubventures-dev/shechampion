import { getEventConfig } from '../_lib/config.js';
import {
  clientIp,
  methodNotAllowed,
  readJsonBody,
  sendError,
  sendJson,
} from '../_lib/http.js';
import { enforceRateLimit } from '../_lib/rateLimit.js';
import { createRegistrationAndInitializePayment } from '../_lib/registrationService.js';
import {
  assertJsonContentType,
  assertTrustedBrowserOrigin,
} from '../_lib/security.js';
import { validateRegistrationInput } from '../_lib/validation.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    methodNotAllowed(res, ['POST']);
    return;
  }

  const config = getEventConfig();

  try {
    assertTrustedBrowserOrigin(req, config);
    assertJsonContentType(req);

    if (config.databaseUrl) {
      await enforceRateLimit({
        key: `reg-create:${clientIp(req)}`,
        limit: 10,
        windowMs: 15 * 60 * 1000,
        databaseUrl: config.databaseUrl,
      });
    }

    const { data } = await readJsonBody(req);
    const validated = validateRegistrationInput(data);
    if (!validated.ok) {
      sendError(res, 400, 'VALIDATION_ERROR', 'Invalid registration input.', validated.errors);
      return;
    }

    const idempotencyKey =
      (typeof req.headers['x-idempotency-key'] === 'string' &&
        req.headers['x-idempotency-key']) ||
      (typeof data.idempotencyKey === 'string' && data.idempotencyKey) ||
      null;

    if (idempotencyKey && idempotencyKey.length > 128) {
      sendError(res, 400, 'INVALID_IDEMPOTENCY_KEY', 'Idempotency key is too long.');
      return;
    }

    const result = await createRegistrationAndInitializePayment({
      input: validated.value,
      idempotencyKey,
      config,
    });

    sendJson(res, 200, {
      ok: true,
      publicReference: result.publicReference,
      checkoutUrl: result.checkoutUrl,
      alreadyPaid: Boolean(result.alreadyPaid),
      resumed: Boolean(result.resumed),
    });
  } catch (error) {
    if (error.code === 'RATE_LIMITED') {
      res.setHeader('Retry-After', String(error.retryAfter || 60));
      sendError(res, 429, 'RATE_LIMITED', error.message);
      return;
    }
    if (error.code === 'PAYLOAD_TOO_LARGE') {
      sendError(res, 413, 'PAYLOAD_TOO_LARGE', error.message);
      return;
    }
    if (error.code === 'INVALID_JSON') {
      sendError(res, 400, 'INVALID_JSON', error.message);
      return;
    }
    if (
      error.code === 'FORBIDDEN_ORIGIN' ||
      error.code === 'ORIGIN_NOT_CONFIGURED' ||
      error.code === 'UNSUPPORTED_MEDIA_TYPE'
    ) {
      sendError(
        res,
        error.code === 'UNSUPPORTED_MEDIA_TYPE' ? 415 : 403,
        error.code,
        error.message
      );
      return;
    }
    if (error.code === 'NOT_READY' || error.code === 'DB_UNAVAILABLE') {
      sendError(res, 403, error.code, error.message, {
        status: error.publicStatus || 'unavailable',
      });
      return;
    }
    if (error.code === 'ALREADY_REGISTERED') {
      sendError(res, 409, error.code, error.message);
      return;
    }
    if (error.code === 'PAYMENT_INIT_FAILED') {
      sendError(res, 502, error.code, error.message, {
        publicReference: error.publicReference,
      });
      return;
    }
    sendError(res, 500, 'SERVER_ERROR', 'Unable to start registration.');
  }
}
