import { destroyAdminSession, requireAdmin, writeAuditEvent } from '../_lib/auth.js';
import { getEventConfig } from '../_lib/config.js';
import { methodNotAllowed, sendError, sendJson, setNoStore } from '../_lib/http.js';
import { assertAdminMutation } from '../_lib/security.js';

export default async function handler(req, res) {
  setNoStore(res);
  if (req.method !== 'POST') {
    methodNotAllowed(res, ['POST']);
    return;
  }

  const config = getEventConfig();
  try {
    assertAdminMutation(req, config);
    let email = 'unknown';
    try {
      const admin = await requireAdmin(req, config);
      email = admin.email;
    } catch {
      // Still clear cookies if present.
    }
    await destroyAdminSession(req, res, config);
    if (config.databaseUrl && email !== 'unknown') {
      await writeAuditEvent({
        actorEmail: email,
        action: 'admin.logout',
        entityType: 'session',
        databaseUrl: config.databaseUrl,
      });
    }
    sendJson(res, 200, { ok: true });
  } catch (error) {
    if (
      error.code === 'FORBIDDEN_ORIGIN' ||
      error.code === 'CSRF_FAILED' ||
      error.code === 'ORIGIN_NOT_CONFIGURED'
    ) {
      sendError(res, 403, error.code, error.message);
      return;
    }
    sendError(res, 500, 'LOGOUT_FAILED', 'Unable to sign out.');
  }
}
