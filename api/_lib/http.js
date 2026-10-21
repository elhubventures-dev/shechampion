import { MAX_BODY_BYTES } from './constants.js';

export function safeHeader(req, name) {
  const value = req.headers[name.toLowerCase()];
  if (Array.isArray(value)) return value[0] || '';
  return typeof value === 'string' ? value : '';
}

export function setCors(res, origin) {
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, X-Idempotency-Key, X-CSRF-Token'
  );
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PATCH, OPTIONS'
  );
}

export function setNoStore(res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
}

export function sendJson(res, status, body) {
  setNoStore(res);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

export function sendError(res, status, code, message, details) {
  const payload = { ok: false, error: { code, message } };
  if (details) payload.error.details = details;
  sendJson(res, status, payload);
}

export function methodNotAllowed(res, allowed) {
  res.setHeader('Allow', allowed.join(', '));
  sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Method not allowed.');
}

export async function readJsonBody(req, limit = MAX_BODY_BYTES) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) {
      const err = new Error('Request body too large.');
      err.code = 'PAYLOAD_TOO_LARGE';
      throw err;
    }
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks);
  if (!raw.length) return { raw, data: {} };
  try {
    return { raw, data: JSON.parse(raw.toString('utf8')) };
  } catch {
    const err = new Error('Invalid JSON body.');
    err.code = 'INVALID_JSON';
    throw err;
  }
}

export async function readRawBody(req, limit = MAX_BODY_BYTES) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) {
      const err = new Error('Request body too large.');
      err.code = 'PAYLOAD_TOO_LARGE';
      throw err;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

export function getCookie(req, name) {
  const header = req.headers.cookie;
  if (!header) return null;
  const parts = header.split(';');
  for (const part of parts) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

export function setCookie(res, name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${options.path || '/'}`);
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (options.httpOnly !== false) parts.push('HttpOnly');
  if (options.secure) parts.push('Secure');
  parts.push(`SameSite=${options.sameSite || 'Lax'}`);
  if (options.expires) parts.push(`Expires=${options.expires.toUTCString()}`);
  const existing = res.getHeader('Set-Cookie');
  if (!existing) {
    res.setHeader('Set-Cookie', parts.join('; '));
  } else if (Array.isArray(existing)) {
    res.setHeader('Set-Cookie', [...existing, parts.join('; ')]);
  } else {
    res.setHeader('Set-Cookie', [existing, parts.join('; ')]);
  }
}

export function clearCookie(res, name, options = {}) {
  setCookie(res, name, '', {
    ...options,
    maxAge: 0,
    expires: new Date(0),
  });
}
