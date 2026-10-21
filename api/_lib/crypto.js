import {
  createHash,
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEYLEN = 64;

export function sha256Hex(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString('base64url');
}

export function randomPaymentReference() {
  return `SCBEC26_${randomBytes(16).toString('hex')}`;
}

export function randomPublicReference() {
  return `SC-2026-${randomBytes(5).toString('hex').toUpperCase()}`;
}

/** Format: scrypt$N$r$p$saltHex$hashHex */
export function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEYLEN, SCRYPT_PARAMS);
  return `scrypt$${SCRYPT_PARAMS.N}$${SCRYPT_PARAMS.r}$${SCRYPT_PARAMS.p}$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPassword(password, encoded) {
  if (!encoded || typeof encoded !== 'string') return false;
  const parts = encoded.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  const salt = Buffer.from(parts[4], 'hex');
  const expected = Buffer.from(parts[5], 'hex');
  if (!salt.length || !expected.length) return false;
  let actual;
  try {
    actual = scryptSync(password, salt, expected.length, {
      N,
      r,
      p,
      maxmem: SCRYPT_PARAMS.maxmem,
    });
  } catch {
    return false;
  }
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export function hmacSha512Hex(secret, payload) {
  return createHmac('sha512', secret).update(payload).digest('hex');
}

export function safeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}
