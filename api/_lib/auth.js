import { getEventConfig } from './config.js';
import { randomToken, sha256Hex, verifyPassword } from './crypto.js';
import { getSql } from './db.js';
import {
  clearCookie,
  getCookie,
  setCookie,
} from './http.js';
import {
  SESSION_COOKIE,
  SESSION_TTL_MS,
} from './constants.js';
import { CSRF_COOKIE } from './security.js';

function cookieSecure(config) {
  return (
    config.isVercelProduction ||
    (config.publicSiteUrl || '').startsWith('https://')
  );
}

export async function authenticateAdmin(email, password, config = getEventConfig()) {
  const normalized = String(email || '')
    .trim()
    .toLowerCase();
  if (
    !config.adminEmail ||
    !config.adminPasswordHash ||
    !config.sessionSecret ||
    normalized !== config.adminEmail
  ) {
    return { ok: false };
  }
  const valid = verifyPassword(password, config.adminPasswordHash);
  if (!valid) return { ok: false };
  return { ok: true, email: config.adminEmail };
}

export async function createAdminSession(adminEmail, res, config = getEventConfig()) {
  const sql = getSql(config.databaseUrl);
  const token = randomToken(32);
  const csrfToken = randomToken(32);
  const tokenHash = sha256Hex(`${config.sessionSecret}:${token}`);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const secure = cookieSecure(config);

  // Rotate: revoke any prior sessions for this admin (session fixation / steal mitigation).
  await sql`
    UPDATE admin_sessions
    SET revoked_at = now()
    WHERE admin_email = ${adminEmail}
      AND revoked_at IS NULL
  `;

  await sql`
    INSERT INTO admin_sessions (session_token_hash, admin_email, expires_at)
    VALUES (${tokenHash}, ${adminEmail}, ${expiresAt.toISOString()}::timestamptz)
  `;

  setCookie(res, SESSION_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: 'Lax',
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
    expires: expiresAt,
  });

  // Readable by SPA for double-submit CSRF; not a session credential.
  setCookie(res, CSRF_COOKIE, csrfToken, {
    httpOnly: false,
    secure,
    sameSite: 'Strict',
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
    expires: expiresAt,
  });

  return { email: adminEmail, expiresAt, csrfToken };
}

export async function destroyAdminSession(req, res, config = getEventConfig()) {
  const token = getCookie(req, SESSION_COOKIE);
  if (token && config.databaseUrl && config.sessionSecret) {
    const sql = getSql(config.databaseUrl);
    const tokenHash = sha256Hex(`${config.sessionSecret}:${token}`);
    await sql`
      UPDATE admin_sessions
      SET revoked_at = now()
      WHERE session_token_hash = ${tokenHash}
        AND revoked_at IS NULL
    `;
  }
  const secure = cookieSecure(config);
  clearCookie(res, SESSION_COOKIE, { secure, sameSite: 'Lax', path: '/' });
  clearCookie(res, CSRF_COOKIE, { secure, sameSite: 'Strict', path: '/', httpOnly: false });
}

export async function requireAdmin(req, config = getEventConfig()) {
  const token = getCookie(req, SESSION_COOKIE);
  if (!token || !config.sessionSecret || !config.databaseUrl) {
    const err = new Error('Authentication required.');
    err.code = 'UNAUTHORIZED';
    throw err;
  }
  const sql = getSql(config.databaseUrl);
  const tokenHash = sha256Hex(`${config.sessionSecret}:${token}`);
  const rows = await sql`
    SELECT id, admin_email, expires_at, revoked_at
    FROM admin_sessions
    WHERE session_token_hash = ${tokenHash}
    LIMIT 1
  `;
  const session = rows[0];
  if (!session || session.revoked_at) {
    const err = new Error('Authentication required.');
    err.code = 'UNAUTHORIZED';
    throw err;
  }
  if (new Date(session.expires_at).getTime() <= Date.now()) {
    await sql`
      UPDATE admin_sessions
      SET revoked_at = COALESCE(revoked_at, now())
      WHERE id = ${session.id}
    `;
    const err = new Error('Session expired.');
    err.code = 'SESSION_EXPIRED';
    throw err;
  }
  if (
    config.adminEmail &&
    String(session.admin_email).toLowerCase() !== config.adminEmail
  ) {
    const err = new Error('Authentication required.');
    err.code = 'UNAUTHORIZED';
    throw err;
  }
  return {
    email: session.admin_email,
    sessionId: session.id,
  };
}

export async function writeAuditEvent({
  actorEmail,
  action,
  entityType,
  entityId,
  detail,
  databaseUrl,
}) {
  const sql = getSql(databaseUrl);
  await sql`
    INSERT INTO admin_audit_events (actor_email, action, entity_type, entity_id, detail)
    VALUES (
      ${actorEmail},
      ${action},
      ${entityType || null},
      ${entityId || null},
      ${detail ? JSON.stringify(detail) : null}::jsonb
    )
  `;
}
