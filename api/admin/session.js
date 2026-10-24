import {
  authenticateAdmin,
  createAdminSession,
  destroyAdminSession,
  requireAdmin,
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
  assertAdminMutation,
  assertJsonContentType,
  assertTrustedBrowserOrigin,
} from '../_lib/security.js';

async function handleMe(req, res, config) {
  assertTrustedBrowserOrigin(req, config);
  const admin = await requireAdmin(req, config);
  sendJson(res, 200, { ok: true, email: admin.email });
}

async function handleLogin(req, res, config) {
  if (
    !config.databaseUrl ||
    !config.adminEmail ||
    !config.adminPasswordHash ||
    !config.sessionSecret
  ) {
    sendError(res, 503, 'ADMIN_NOT_CONFIGURED', 'Administrator access is not configured.');
    return;
  }

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
}

async function handleLogout(req, res, config) {
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
}

export default async function handler(req, res) {
  setNoStore(res);
  const config = getEventConfig();
  const url = new URL(req.url, 'http://localhost');
  const action = String(url.searchParams.get('action') || '').toLowerCase();

  try {
    if (req.method === 'GET') {
      await handleMe(req, res, config);
      return;
    }

    if (req.method === 'DELETE' || (req.method === 'POST' && action === 'logout')) {
      await handleLogout(req, res, config);
      return;
    }

    if (req.method === 'POST') {
      await handleLogin(req, res, config);
      return;
    }

    methodNotAllowed(res, ['GET', 'POST', 'DELETE']);
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
      error.code === 'ORIGIN_NOT_CONFIGURED'
    ) {
      sendError(res, 403, error.code, error.message);
      return;
    }
    if (error.code === 'UNSUPPORTED_MEDIA_TYPE') {
      sendError(res, 415, error.code, error.message);
      return;
    }
    const fallback =
      req.method === 'GET'
        ? 'AUTH_CHECK_FAILED'
        : action === 'logout' || req.method === 'DELETE'
          ? 'LOGOUT_FAILED'
          : 'LOGIN_FAILED';
    sendError(
      res,
      500,
      fallback,
      fallback === 'AUTH_CHECK_FAILED'
        ? 'Unable to verify session.'
        : fallback === 'LOGOUT_FAILED'
          ? 'Unable to sign out.'
          : 'Unable to sign in.'
    );
  }
}
