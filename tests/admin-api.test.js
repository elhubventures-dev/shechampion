import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import sessionHandler from '../api/admin/session.js';
import registrationsHandler from '../api/admin/registrations.js';
import registrationHandler from '../api/admin/registration.js';
import exportHandler from '../api/admin/export.js';
import emailHandler from '../api/admin/email.js';

function createRes() {
  return {
    statusCode: 200,
    _headers: {},
    setHeader(key, value) {
      this._headers[String(key).toLowerCase()] = value;
    },
    getHeader(key) {
      return this._headers[String(key).toLowerCase()];
    },
    end(body) {
      this.body = body;
      try {
        this.parsed = body ? JSON.parse(body) : null;
      } catch {
        this.parsed = null;
      }
    },
  };
}

async function invoke(handler, { method = 'GET', url = '/', headers = {}, body } = {}) {
  const req = {
    method,
    url,
    headers,
    async *[Symbol.asyncIterator]() {
      if (body) yield Buffer.from(body);
    },
  };
  const res = createRes();
  await handler(req, res);
  return res;
}

describe('anonymous admin API access', () => {
  const prev = { ...process.env };

  beforeEach(() => {
    process.env.PUBLIC_SITE_URL = 'https://shechampion-bbf.org';
    process.env.DATABASE_URL = 'postgres://example';
    process.env.SESSION_SECRET = 's'.repeat(32);
    process.env.ADMIN_EMAIL = 'admin@example.com';
    process.env.ADMIN_PASSWORD_HASH = 'scrypt$1$1$1$ab$cd';
    process.env.VERCEL_ENV = 'production';
  });

  afterEach(() => {
    process.env = { ...prev };
  });

  const trusted = { origin: 'https://shechampion-bbf.org' };

  it('rejects /api/admin/session without session', async () => {
    const res = await invoke(sessionHandler, {
      url: '/api/admin/session',
      headers: trusted,
    });
    expect(res.statusCode).toBe(401);
    expect(res.parsed?.error?.code).toMatch(/UNAUTHORIZED|SESSION/);
  });

  it('rejects /api/admin/registrations without session', async () => {
    const res = await invoke(registrationsHandler, { headers: trusted });
    expect(res.statusCode).toBe(401);
  });

  it('rejects /api/admin/registration detail without session', async () => {
    const res = await invoke(registrationHandler, {
      url: '/api/admin/registration?id=550e8400-e29b-41d4-a716-446655440000',
      headers: trusted,
    });
    expect(res.statusCode).toBe(401);
  });

  it('rejects unauthorized PATCH state changes (CSRF/session)', async () => {
    const res = await invoke(registrationHandler, {
      method: 'PATCH',
      url: '/api/admin/registration?id=550e8400-e29b-41d4-a716-446655440000',
      headers: {
        ...trusted,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ applicationStatus: 'SHORTLISTED' }),
    });
    expect([401, 403]).toContain(res.statusCode);
  });

  it('rejects CSV export without auth/CSRF', async () => {
    const res = await invoke(exportHandler, {
      method: 'POST',
      headers: trusted,
    });
    expect([401, 403]).toContain(res.statusCode);
  });

  it('rejects email retry without auth/CSRF', async () => {
    const res = await invoke(emailHandler, {
      method: 'POST',
      url: '/api/admin/email',
      headers: {
        ...trusted,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        action: 'retry',
        registrationId: '550e8400-e29b-41d4-a716-446655440000',
      }),
    });
    expect([401, 403]).toContain(res.statusCode);
  });

  it('rejects custom notify without auth/CSRF', async () => {
    const res = await invoke(emailHandler, {
      method: 'POST',
      url: '/api/admin/email',
      headers: {
        ...trusted,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        action: 'notify',
        registrationId: '550e8400-e29b-41d4-a716-446655440000',
        subject: 'Hello',
        message: 'Please bring your booth materials tomorrow.',
      }),
    });
    expect([401, 403]).toContain(res.statusCode);
  });

  it('rejects registration field PATCH without auth/CSRF', async () => {
    const res = await invoke(registrationHandler, {
      method: 'PATCH',
      url: '/api/admin/registration?id=550e8400-e29b-41d4-a716-446655440000',
      headers: {
        ...trusted,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        fullName: 'Ada Lovelace',
        applicationStatus: 'UNDER_REVIEW',
      }),
    });
    expect([401, 403]).toContain(res.statusCode);
  });

  it('rejects cross-origin admin reads', async () => {
    const res = await invoke(sessionHandler, {
      url: '/api/admin/session',
      headers: { origin: 'https://evil.example' },
    });
    expect(res.statusCode).toBe(403);
    expect(res.parsed?.error?.code).toBe('FORBIDDEN_ORIGIN');
  });

  it('rejects logout CSRF failures', async () => {
    const res = await invoke(sessionHandler, {
      method: 'POST',
      url: '/api/admin/session?action=logout',
      headers: trusted,
    });
    expect(res.statusCode).toBe(403);
    expect(res.parsed?.error?.code).toBe('CSRF_FAILED');
  });
});
