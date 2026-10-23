import { requireAdmin, writeAuditEvent } from '../_lib/auth.js';
import { getEventConfig } from '../_lib/config.js';
import { broadcastAnnouncement, EMAIL_TYPES } from '../_lib/emailDelivery.js';
import {
  methodNotAllowed,
  readJsonBody,
  sendError,
  sendJson,
  setNoStore,
} from '../_lib/http.js';
import {
  assertAdminMutation,
  assertJsonContentType,
  assertTrustedBrowserOrigin,
} from '../_lib/security.js';

const ALLOWED = new Set([
  EMAIL_TYPES.OPEN,
  EMAIL_TYPES.CUTOFF,
  EMAIL_TYPES.DETAILS,
]);

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
    const announceType = String(data.announceType || '');
    const message = data.message != null ? String(data.message).slice(0, 6000) : '';

    if (!ALLOWED.has(announceType)) {
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
  } catch (error) {
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
    sendError(res, 500, 'ANNOUNCE_FAILED', 'Unable to send announcement emails.');
  }
}
