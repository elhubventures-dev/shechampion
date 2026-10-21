import { describe, expect, it, vi } from 'vitest';
import {
  validatePaystackSuccess,
  verifyPaystackSignature,
} from '../api/_lib/paystack.js';
import { hmacSha512Hex } from '../api/_lib/crypto.js';
import { EVENT_FEE_KOBO } from '../api/_lib/constants.js';
import { evaluateReadiness } from '../api/_lib/config.js';
import { escapeCsvCell } from '../api/_lib/validation.js';

describe('payment reference ownership rules', () => {
  const reference = `SCBEC26_${'d'.repeat(32)}`;

  it('never accepts a mismatched reference as success', () => {
    const result = validatePaystackSuccess({
      data: {
        status: 'success',
        reference: `SCBEC26_${'e'.repeat(32)}`,
        amount: EVENT_FEE_KOBO,
        currency: 'NGN',
      },
      expectedReference: reference,
    });
    expect(result.ok).toBe(false);
  });

  it('rejects wrong amount/currency even when status is success', () => {
    expect(
      validatePaystackSuccess({
        data: {
          status: 'success',
          reference,
          amount: 5000,
          currency: 'NGN',
        },
        expectedReference: reference,
      }).ok
    ).toBe(false);
    expect(
      validatePaystackSuccess({
        data: {
          status: 'success',
          reference,
          amount: EVENT_FEE_KOBO,
          currency: 'USD',
        },
        expectedReference: reference,
      }).ok
    ).toBe(false);
  });

  it('rejects non-success provider statuses', () => {
    for (const status of ['failed', 'abandoned', 'pending', 'reversed']) {
      expect(
        validatePaystackSuccess({
          data: {
            status,
            reference,
            amount: EVENT_FEE_KOBO,
            currency: 'NGN',
          },
          expectedReference: reference,
        }).ok
      ).toBe(false);
    }
  });
});

describe('launch readiness gates', () => {
  const readyBase = {
    eventId: 'bec-2026',
    feeKobo: EVENT_FEE_KOBO,
    currency: 'NGN',
    registrationEnabled: true,
    registrationOpenAtRaw: '2026-01-01T00:00:00+01:00',
    eventStartAtRaw: '2026-12-12T10:00:00+01:00',
    privacyApproved: true,
    termsApproved: true,
    publicSiteUrl: 'https://example.com',
    paystackSecretKey: 'sk_test_x',
    paystackMode: 'test',
    databaseUrl: 'postgres://example',
    adminEmail: 'admin@example.com',
    adminPasswordHash: 'scrypt$1$1$1$ab$cd',
    sessionSecret: 'x'.repeat(32),
    resendApiKey: 're_test',
    emailFrom: 'noreply@example.com',
    adminNotificationEmail: '',
    isVercelProduction: false,
  };

  it('uses a 48-hour cutoff before EVENT_START_AT (Lagos offset preserved)', () => {
    const result = evaluateReadiness(readyBase, {
      now: new Date('2026-06-01T00:00:00+01:00'),
    });
    expect(result.registrationCutoffAt).toBe(
      new Date('2026-12-10T10:00:00+01:00').toISOString()
    );
    expect(result.ready).toBe(true);
  });

  it('blocks when privacy or terms approvals are missing', () => {
    expect(
      evaluateReadiness(
        { ...readyBase, privacyApproved: false },
        { now: new Date('2026-06-01T00:00:00+01:00') }
      ).ready
    ).toBe(false);
    expect(
      evaluateReadiness(
        { ...readyBase, termsApproved: false },
        { now: new Date('2026-06-01T00:00:00+01:00') }
      ).ready
    ).toBe(false);
  });

  it('blocks missing payment credentials and production test mode', () => {
    expect(
      evaluateReadiness(
        { ...readyBase, paystackSecretKey: '' },
        { now: new Date('2026-06-01T00:00:00+01:00') }
      ).ready
    ).toBe(false);
    expect(
      evaluateReadiness(
        { ...readyBase, isVercelProduction: true, paystackMode: 'test' },
        { now: new Date('2026-06-01T00:00:00+01:00') }
      ).ready
    ).toBe(false);
  });
});

describe('webhook signature replay safety helpers', () => {
  it('treats altered bodies as invalid even with a prior signature', () => {
    const secret = 'sk_test_secret';
    const body = Buffer.from('{"event":"charge.success","data":{"reference":"x"}}');
    const signature = hmacSha512Hex(secret, body);
    const altered = Buffer.from('{"event":"charge.success","data":{"reference":"y"}}');
    expect(verifyPaystackSignature(secret, altered, signature)).toBe(false);
  });
});

describe('CSV export hardening', () => {
  it('neutralizes spreadsheet formula injection prefixes', () => {
    const formula = escapeCsvCell('=HYPERLINK("http://x")');
    expect(formula.startsWith("'") || formula.startsWith("\"'")).toBe(true);
    expect(formula.includes('=HYPERLINK')).toBe(true);
    expect(escapeCsvCell('@SUM(A1)')).toBe("'@SUM(A1)");
  });
});

describe('email failure does not invent delivery', () => {
  it('createEmailProvider requires message id for SENT semantics', async () => {
    vi.resetModules();
    const { createEmailProvider } = await import('../api/_lib/email.js');
    const provider = createEmailProvider({
      resendApiKey: 're_test',
      emailFrom: 'from@example.com',
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({}), // no id
    }));
    await expect(
      provider.send({
        to: 'a@example.com',
        subject: 't',
        html: '<p>x</p>',
        text: 'x',
      })
    ).rejects.toMatchObject({ code: 'EMAIL_UNCONFIRMED' });
    globalThis.fetch = originalFetch;
  });
});
