import { requireAdmin, writeAuditEvent } from '../_lib/auth.js';
import { getEventConfig } from '../_lib/config.js';
import { getSql } from '../_lib/db.js';
import {
  broadcastAnnouncement,
  EMAIL_TYPES,
  sendChallengeMaterialsEmailSafe,
  sendExhibitionInstructionsEmailSafe,
} from '../_lib/emailDelivery.js';
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
  assertTrustedBrowserOrigin,
  isUuid,
} from '../_lib/security.js';

const SEND_ALLOWED = new Set([EMAIL_TYPES.MATERIALS, EMAIL_TYPES.EXHIBITION]);
const ANNOUNCE_ALLOWED = new Set([
  EMAIL_TYPES.OPEN,
  EMAIL_TYPES.CUTOFF,
  EMAIL_TYPES.DETAILS,
]);

async function handleRetry(req, res, config, admin, data) {
  await enforceRateLimit({
    key: `admin-retry-email:${clientIp(req)}`,
    limit: 20,
    windowMs: 15 * 60 * 1000,
    databaseUrl: config.databaseUrl,
  });

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
  if (
    rows[0].payment_status !== 'SUCCESS' &&
    rows[0].payment_status !== 'NOT_REQUIRED'
  ) {
    sendError(
      res,
      400,
      'NOT_ELIGIBLE',
      'Confirmation email can only be sent for free registrations or after verified payment.'
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
}

async function handleSend(req, res, config, admin, data) {
  const registrationId = String(data.registrationId || '');
  const emailType = String(data.emailType || '');
  const message = data.message != null ? String(data.message).slice(0, 4000) : '';

  if (!isUuid(registrationId)) {
    sendError(res, 400, 'MISSING_ID', 'A valid registration id is required.');
    return;
  }
  if (!SEND_ALLOWED.has(emailType)) {
    sendError(res, 400, 'INVALID_EMAIL_TYPE', 'Unsupported email type.');
    return;
  }

  let result;
  if (emailType === EMAIL_TYPES.MATERIALS) {
    result = await sendChallengeMaterialsEmailSafe(registrationId, message, config);
  } else {
    result = await sendExhibitionInstructionsEmailSafe(
      registrationId,
      message,
      config
    );
  }

  await writeAuditEvent({
    actorEmail: admin.email,
    action: 'registration.send_email',
    entityType: 'registration',
    entityId: registrationId,
    detail: { emailType, sent: Boolean(result.sent), reason: result.reason || null },
    databaseUrl: config.databaseUrl,
  });

  sendJson(res, 200, { ok: true, ...result });
}

async function handleAnnounce(req, res, config, admin, data) {
  const announceType = String(data.announceType || '');
  const message = data.message != null ? String(data.message).slice(0, 6000) : '';

  if (!ANNOUNCE_ALLOWED.has(announceType)) {
    sendError(res, 400, 'INVALID_ANNOUNCE_TYPE', 'Unsupported announcement type.');
    return;
  }
  if (announceType === EMAIL_TYPES.DETAILS && message.trim().length < 10) {
    sendError(
      res,
      400,
      'MESSAGE_REQUIRED',
      'Event details updates require a message of at least 10 characters.'
    );
    return;
  }

  const result = await broadcastAnnouncement({
    announceType,
    message,
    config,
  });

  await writeAuditEvent({
    actorEmail: admin.email,
    action: 'registrations.announce',
    entityType: 'registration',
    entityId: null,
    detail: {
      announceType,
      total: result.total || 0,
      sent: result.sent || 0,
      failed: result.failed || 0,
    },
    databaseUrl: config.databaseUrl,
  });

  sendJson(res, 200, { ok: true, ...result });
}

export default async function handler(req, res) {
  setNoStore(res);
  if (req.method !== 'POST') {
    methodNotAllowed(res, ['POST']);
    return;
  }

  const config = getEventConfig();
  try {
    assertTrustedBrowserOrigin(req, config);
    assertAdminMutation(req, config);
    assertJsonContentType(req);
    const admin = await requireAdmin(req, config);
    const { data } = await readJsonBody(req);
    const action = String(data.action || '').trim().toLowerCase();

    if (action === 'retry') {
      await handleRetry(req, res, config, admin, data);
      return;
    }
    if (action === 'send') {
      await handleSend(req, res, config, admin, data);
      return;
    }
    if (action === 'announce') {
      await handleAnnounce(req, res, config, admin, data);
      return;
    }

    sendError(
      res,
      400,
      'INVALID_ACTION',
      'Request must include action: "retry", "send", or "announce".'
    );
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
    sendError(res, 500, 'ADMIN_EMAIL_FAILED', 'Unable to process email request.');
  }
}
