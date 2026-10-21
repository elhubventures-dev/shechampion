import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hmacSha512Hex } from '../api/_lib/crypto.js';

describe('webhook handler security', () => {
  const prev = { ...process.env };

  beforeEach(() => {
    process.env.PAYSTACK_SECRET_KEY = 'sk_test_webhook';
    process.env.DATABASE_URL = 'postgres://example';
    process.env.PUBLIC_SITE_URL = 'https://example.com';
    process.env.PAYSTACK_MODE = 'test';
  });

  afterEach(() => {
    process.env = { ...prev };
    vi.resetModules();
    vi.restoreAllMocks();
  });

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
        this.parsed = body ? JSON.parse(body) : null;
      },
    };
  }

  it('rejects invalid signatures without processing', async () => {
    const { default: handler } = await import('../api/payment/webhook.js');
    const body = Buffer.from(
      JSON.stringify({
        event: 'charge.success',
        data: {
          status: 'success',
          reference: `SCBEC26_${'a'.repeat(32)}`,
          amount: 500000,
          currency: 'NGN',
        },
      })
    );
    const req = {
      method: 'POST',
      headers: { 'x-paystack-signature': 'invalid' },
      async *[Symbol.asyncIterator]() {
        yield body;
      },
    };
    const res = createRes();
    await handler(req, res);
    expect(res.statusCode).toBe(401);
    expect(res.parsed?.error?.code).toBe('INVALID_SIGNATURE');
  });

  it('accepts a valid signature envelope (processing may ignore unknown refs)', async () => {
    vi.doMock('../api/_lib/registrationService.js', () => ({
      applySuccessfulPayment: vi.fn(async () => {
        const err = new Error('Unknown payment reference.');
        err.code = 'UNKNOWN_REFERENCE';
        throw err;
      }),
      markPaymentNonSuccess: vi.fn(),
      recordWebhookEvent: vi.fn(async () => ({ duplicate: false })),
      sendConfirmationEmailSafe: vi.fn(),
    }));

    const { default: handler } = await import('../api/payment/webhook.js');
    const payload = {
      event: 'charge.success',
      data: {
        status: 'success',
        reference: `SCBEC26_${'a'.repeat(32)}`,
        amount: 500000,
        currency: 'NGN',
        id: 123,
      },
    };
    const body = Buffer.from(JSON.stringify(payload));
    const signature = hmacSha512Hex('sk_test_webhook', body);
    const req = {
      method: 'POST',
      headers: { 'x-paystack-signature': signature },
      async *[Symbol.asyncIterator]() {
        yield body;
      },
    };
    const res = createRes();
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.parsed?.ok).toBe(true);
  });
});
