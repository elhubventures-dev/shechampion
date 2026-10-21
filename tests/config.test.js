import { describe, expect, it } from 'vitest';
import { evaluateReadiness } from '../api/_lib/config.js';
import { EVENT_FEE_KOBO } from '../api/_lib/constants.js';

function baseConfig(overrides = {}) {
  return {
    eventId: 'bec-2026',
    feeKobo: EVENT_FEE_KOBO,
    currency: 'NGN',
    registrationEnabled: true,
    registrationOpenAtRaw: '2026-01-01T00:00:00Z',
    eventStartAtRaw: '2026-12-12T10:00:00Z',
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
    ...overrides,
  };
}

describe('evaluateReadiness', () => {
  it('is ready when all gates pass inside the window', () => {
    const result = evaluateReadiness(baseConfig(), {
      now: new Date('2026-06-01T00:00:00Z'),
    });
    expect(result.ready).toBe(true);
    expect(result.publicStatus).toBe('open');
    expect(result.registrationCutoffAt).toBe(
      new Date('2026-12-10T10:00:00Z').toISOString()
    );
  });

  it('blocks when registration is not explicitly enabled', () => {
    const result = evaluateReadiness(
      baseConfig({ registrationEnabled: false }),
      { now: new Date('2026-06-01T00:00:00Z') }
    );
    expect(result.ready).toBe(false);
    expect(result.publicStatus).toBe('closed');
  });

  it('reports not_open before opening timestamp', () => {
    const result = evaluateReadiness(baseConfig(), {
      now: new Date('2025-12-01T00:00:00Z'),
    });
    expect(result.ready).toBe(false);
    expect(result.publicStatus).toBe('not_open');
  });

  it('closes after cutoff (start minus 48 hours)', () => {
    const result = evaluateReadiness(baseConfig(), {
      now: new Date('2026-12-11T00:00:00Z'),
    });
    expect(result.ready).toBe(false);
    expect(result.publicStatus).toBe('closed');
  });

  it('rejects invalid event configuration', () => {
    const result = evaluateReadiness(
      baseConfig({
        eventStartAtRaw: 'not-a-date',
        privacyApproved: false,
        feeKobo: 100,
      }),
      { now: new Date('2026-06-01T00:00:00Z') }
    );
    expect(result.ready).toBe(false);
    expect(result.reasons.some((r) => r.includes('EVENT_START_AT'))).toBe(true);
    expect(result.reasons.some((r) => r.includes('PRIVACY'))).toBe(true);
    expect(result.reasons.some((r) => r.includes('EVENT_FEE_KOBO'))).toBe(true);
  });

  it('blocks test-mode completed live registrations on Vercel production', () => {
    const result = evaluateReadiness(
      baseConfig({
        isVercelProduction: true,
        paystackMode: 'test',
      }),
      { now: new Date('2026-06-01T00:00:00Z') }
    );
    expect(result.ready).toBe(false);
    expect(
      result.reasons.some((r) => r.toLowerCase().includes('production'))
    ).toBe(true);
  });
});
