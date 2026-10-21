import {
  authenticateAdmin,
  createAdminSession,
  writeAuditEvent,
} from '../_lib/auth.js';
import { getEventConfig } from '../_lib/config.js';
import {
  clientIp,
  methodNotAllowed,
  readJsonBody,
  sendError,
  sendJson,
  setNoStore,
} from '../_lib/http.js';
import { enforceRateLimit } from '../_lib/rateLimit.js';
import {
  assertJsonContentType,
  assertTrustedBrowserOrigin,
} from '../_lib/security.js';

export default async function handler(req, res) {
  setNoStore(res);
  if (req.method !== 'POST') {
    methodNotAllowed(res, ['POST']);
    return;
  }

  const config = getEventConfig();
  if (!config.databaseUrl || !config.adminEmail || !config.adminPasswordHash || !config.sessionSecret) {
    sendError(res, 503, 'ADMIN_NOT_CONFIGURED', 'Administrator access is not configured.');
    return;
  }

  try {
    assertTrustedBrowserOrigin(req, config);
    assertJsonContentType(req);

    await enforceRateLimit({
      key: `admin-login:${clientIp(req)}`,
      limit: 8,
      windowMs: 15 * 60 * 1000,
      databaseUrl: config.databaseUrl,
    });

    const { data } = await readJsonBody(req);
    const email = String(data.email || '').trim();
    const password = String(data.password || '');
    if (!email || !password) {
      sendError(res, 400, 'VALIDATION_ERROR', 'Email and password are required.');
      return;
    }

    const auth = await authenticateAdmin(email, password, config);
    if (!auth.ok) {
      sendError(res, 401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
      return;
    }

    const session = await createAdminSession(auth.email, res, config);
    await writeAuditEvent({
      actorEmail: auth.email,
      action: 'admin.login',
      entityType: 'session',
      databaseUrl: config.databaseUrl,
    });

    sendJson(res, 200, {
      ok: true,
      email: auth.email,
      expiresAt: session.expiresAt.toISOString(),
      csrfToken: session.csrfToken,
    });
  } catch (error) {
    if (error.code === 'RATE_LIMITED') {
      res.setHeader('Retry-After', String(error.retryAfter || 60));
      sendError(res, 429, 'RATE_LIMITED', error.message);
      return;
    }
    if (error.code === 'FORBIDDEN_ORIGIN' || error.code === 'ORIGIN_NOT_CONFIGURED') {
      sendError(res, 403, error.code, error.message);
      return;
    }
    if (error.code === 'UNSUPPORTED_MEDIA_TYPE') {
      sendError(res, 415, error.code, error.message);
      return;
    }
    sendError(res, 500, 'LOGIN_FAILED', 'Unable to sign in.');
  }
}
