import { describe, expect, it } from 'vitest';
import {
  assertAdminCsrf,
  assertJsonContentType,
  assertTrustedBrowserOrigin,
  getTrustedOrigins,
  isUuid,
} from '../api/_lib/security.js';
import { CSRF_COOKIE, CSRF_HEADER } from '../api/_lib/security.js';

function req(headers = {}) {
  return { headers };
}

describe('trusted origins and CSRF', () => {
  const config = {
    publicSiteUrl: 'https://shechampion-bbf.org',
    isVercelProduction: true,
  };

  it('includes PUBLIC_SITE_URL origin', () => {
    expect(getTrustedOrigins(config).has('https://shechampion-bbf.org')).toBe(
      true
    );
  });

  it('rejects untrusted origins for browser mutations', () => {
    expect(() =>
      assertTrustedBrowserOrigin(
        req({ origin: 'https://evil.example' }),
        config
      )
    ).toThrowError(/not allowed/);
  });

  it('accepts trusted origins', () => {
    expect(() =>
      assertTrustedBrowserOrigin(
        req({ origin: 'https://shechampion-bbf.org' }),
        config
      )
    ).not.toThrow();
  });

  it('requires matching CSRF cookie and header', () => {
    const token = 'a'.repeat(32);
    expect(() =>
      assertAdminCsrf(
        req({
          cookie: `${CSRF_COOKIE}=${token}`,
          [CSRF_HEADER]: token,
        })
      )
    ).not.toThrow();

    expect(() =>
      assertAdminCsrf(
        req({
          cookie: `${CSRF_COOKIE}=${token}`,
          [CSRF_HEADER]: 'b'.repeat(32),
        })
      )
    ).toThrowError(/CSRF/);
  });

  it('requires JSON content type for JSON bodies', () => {
    expect(() =>
      assertJsonContentType(req({ 'content-type': 'text/plain' }))
    ).toThrowError(/Content-Type/);
    expect(() =>
      assertJsonContentType(req({ 'content-type': 'application/json' }))
    ).not.toThrow();
  });

  it('validates UUID shape for admin ids', () => {
    expect(isUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isUuid('not-a-uuid')).toBe(false);
    expect(isUuid('1')).toBe(false);
  });
});
