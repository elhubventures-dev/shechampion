import { getCookie, safeHeader } from './http.js';
import { safeEqualHex, sha256Hex } from './crypto.js';

export const CSRF_COOKIE = 'sc_admin_csrf';
export const CSRF_HEADER = 'x-csrf-token';

/**
 * Origins allowed for cookie-authenticated browser calls.
 * Paystack webhooks must not use this check.
 */
export function getTrustedOrigins(config) {
  const origins = new Set();
  if (config.publicSiteUrl) {
    try {
      origins.add(new URL(config.publicSiteUrl).origin);
    } catch {
      // ignore invalid
    }
  }
  const vercelUrl = String(process.env.VERCEL_URL || '').trim();
  if (vercelUrl) {
    origins.add(
      vercelUrl.startsWith('http') ? new URL(vercelUrl).origin : `https://${vercelUrl}`
    );
  }
  if (!config.isVercelProduction) {
    origins.add('http://localhost:3000');
    origins.add('http://localhost:5173');
    origins.add('http://127.0.0.1:3000');
    origins.add('http://127.0.0.1:5173');
  }
  return origins;
}

export function requestOrigin(req) {
  const origin = safeHeader(req, 'origin');
  if (origin) return origin;
  const referer = safeHeader(req, 'referer');
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

/**
 * Reject cross-site cookie-authenticated mutations.
 * Simple HTML form CSRF cannot set custom headers; Origin is still enforced.
 */
export function assertTrustedBrowserOrigin(req, config) {
  const trusted = getTrustedOrigins(config);
  if (!trusted.size) {
    const err = new Error('Trusted origin is not configured.');
    err.code = 'ORIGIN_NOT_CONFIGURED';
    throw err;
  }
  const origin = requestOrigin(req);
  if (!origin || !trusted.has(origin)) {
    const err = new Error('Request origin is not allowed.');
    err.code = 'FORBIDDEN_ORIGIN';
    throw err;
  }
}

export function assertJsonContentType(req) {
  const contentType = String(safeHeader(req, 'content-type') || '').toLowerCase();
  if (!contentType.includes('application/json')) {
    const err = new Error('Content-Type must be application/json.');
    err.code = 'UNSUPPORTED_MEDIA_TYPE';
    throw err;
  }
}

/**
 * Double-submit CSRF for admin cookie sessions.
 * Cookie is readable by the SPA; attackers on other origins cannot read it.
 */
export function assertAdminCsrf(req) {
  const cookieToken = getCookie(req, CSRF_COOKIE);
  const headerToken = safeHeader(req, CSRF_HEADER);
  if (
    !cookieToken ||
    !headerToken ||
    cookieToken.length < 24 ||
    !safeEqualHex(sha256Hex(cookieToken), sha256Hex(headerToken))
  ) {
    const err = new Error('CSRF validation failed.');
    err.code = 'CSRF_FAILED';
    throw err;
  }
}

export function assertAdminMutation(req, config) {
  assertTrustedBrowserOrigin(req, config);
  assertAdminCsrf(req);
}

export function isUuid(value) {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  );
}
