import { requireAdmin, writeAuditEvent } from '../_lib/auth.js';
import { getEventConfig } from '../_lib/config.js';
import { getSql } from '../_lib/db.js';
import {
  clientIp,
  methodNotAllowed,
  readJsonBody,
  sendError,
  sendJson,
  setNoStore,
} from '../_lib/http.js';
import { enforceRateLimit } from '../_lib/rateLimit.js';
import { sendConfirmationEmailSafe } from '../_lib/registrationService.js';
import {
  assertAdminMutation,
  assertJsonContentType,
  isUuid,
} from '../_lib/security.js';

export default async function handler(req, res) {
  setNoStore(res);
  if (req.method !== 'POST') {
    methodNotAllowed(res, ['POST']);
    return;
  }

  const config = getEventConfig();
  try {
    assertAdminMutation(req, config);
    assertJsonContentType(req);
    const admin = await requireAdmin(req, config);
    await enforceRateLimit({
      key: `admin-retry-email:${clientIp(req)}`,
      limit: 20,
      windowMs: 15 * 60 * 1000,
      databaseUrl: config.databaseUrl,
    });

    const { data } = await readJsonBody(req);
    const registrationId = String(data.registrationId || '');
    if (!isUuid(registrationId)) {
      sendError(res, 400, 'MISSING_ID', 'registrationId is required.');
      return;
    }

    const sql = getSql(config.databaseUrl);
    const rows = await sql`
      SELECT id, payment_status, public_reference
      FROM registrations
      WHERE id = ${registrationId}
      LIMIT 1
    `;
    if (!rows[0]) {
      sendError(res, 404, 'NOT_FOUND', 'Registration not found.');
      return;
    }
    if (rows[0].payment_status !== 'SUCCESS') {
      sendError(
        res,
        400,
        'NOT_PAID',
        'Confirmation email can only be sent after verified payment.'
      );
      return;
    }

    const result = await sendConfirmationEmailSafe(registrationId, config);

    await writeAuditEvent({
      actorEmail: admin.email,
      action: 'email.retry_confirmation',
      entityType: 'registration',
      entityId: registrationId,
      detail: { sent: Boolean(result.sent), reason: result.reason || null },
      databaseUrl: config.databaseUrl,
    });

    if (result.sent) {
      sendJson(res, 200, {
        ok: true,
        sent: true,
        alreadySent: Boolean(result.alreadySent),
        messageId: result.messageId || null,
      });
      return;
    }

    sendJson(res, 200, {
      ok: true,
      sent: false,
      reason: result.reason || 'send_failed',
    });
  } catch (error) {
    if (error.code === 'RATE_LIMITED') {
      res.setHeader('Retry-After', String(error.retryAfter || 60));
      sendError(res, 429, 'RATE_LIMITED', error.message);
      return;
    }
    if (error.code === 'UNAUTHORIZED' || error.code === 'SESSION_EXPIRED') {
      sendError(res, 401, error.code, error.message);
      return;
    }
    if (
      error.code === 'FORBIDDEN_ORIGIN' ||
      error.code === 'CSRF_FAILED' ||
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
    sendError(res, 500, 'RETRY_EMAIL_FAILED', 'Unable to retry confirmation email.');
  }
}
