import { requireAdmin, writeAuditEvent } from '../_lib/auth.js';
import { getEventConfig } from '../_lib/config.js';
import {
  EMAIL_TYPES,
  sendChallengeMaterialsEmailSafe,
  sendExhibitionInstructionsEmailSafe,
} from '../_lib/emailDelivery.js';
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
  isUuid,
} from '../_lib/security.js';

const ALLOWED = new Set([EMAIL_TYPES.MATERIALS, EMAIL_TYPES.EXHIBITION]);

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
    const registrationId = String(data.registrationId || '');
    const emailType = String(data.emailType || '');
    const message = data.message != null ? String(data.message).slice(0, 4000) : '';

    if (!isUuid(registrationId)) {
      sendError(res, 400, 'MISSING_ID', 'A valid registration id is required.');
      return;
    }
    if (!ALLOWED.has(emailType)) {
      sendError(res, 400, 'INVALID_EMAIL_TYPE', 'Unsupported email type.');
      return;
    }

    let result;
    if (emailType === EMAIL_TYPES.MATERIALS) {
      result = await sendChallengeMaterialsEmailSafe(
        registrationId,
        message,
        config
      );
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
    sendError(res, 500, 'SEND_EMAIL_FAILED', 'Unable to send email.');
  }
}
