import { describe, expect, it } from 'vitest';
import { evaluateReadiness } from '../api/_lib/config.js';

function baseConfig(overrides = {}) {
  return {
    eventId: 'bec-2026',
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
    allowCombinedChallengeExhibition: true,
    ...overrides,
  };
}

describe('evaluateReadiness', () => {
  it('is ready when all gates pass inside the window', () => {
    const result = evaluateReadiness(baseConfig(), {
      now: new Date('2026-06-01T00:00:00Z'),
    });
    expect(result.ready).toBe(true);
    expect(result.freeRegistrationAvailable).toBe(true);
    expect(result.paidCheckoutAvailable).toBe(true);
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

  it('rejects invalid event configuration without requiring fee kobo', () => {
    const result = evaluateReadiness(
      baseConfig({
        eventStartAtRaw: 'not-a-date',
        privacyApproved: false,
      }),
      { now: new Date('2026-06-01T00:00:00Z') }
    );
    expect(result.ready).toBe(false);
    expect(result.reasons.some((r) => r.includes('EVENT_START_AT'))).toBe(true);
    expect(result.reasons.some((r) => r.includes('PRIVACY'))).toBe(true);
  });

  it('keeps free registration available when Paystack is missing', () => {
    const result = evaluateReadiness(
      baseConfig({ paystackSecretKey: '' }),
      { now: new Date('2026-06-01T00:00:00Z') }
    );
    expect(result.ready).toBe(true);
    expect(result.paidCheckoutAvailable).toBe(false);
  });

  it('blocks paid checkout in Vercel production with test mode', () => {
    const result = evaluateReadiness(
      baseConfig({
        isVercelProduction: true,
        paystackMode: 'test',
      }),
      { now: new Date('2026-06-01T00:00:00Z') }
    );
    expect(result.ready).toBe(true);
    expect(result.paidCheckoutAvailable).toBe(false);
  });

  it('blocks paid checkout when a live secret is loaded with test mode', () => {
    const result = evaluateReadiness(
      baseConfig({
        paystackMode: 'test',
        paystackSecretKey: 'sk_live_blocked',
        appEnv: 'staging',
      }),
      { now: new Date('2026-06-01T00:00:00Z') }
    );
    expect(result.ready).toBe(true);
    expect(result.paidCheckoutAvailable).toBe(false);
    expect(
      result.reasons.some((r) => r.includes('sk_test_') || r.includes('Live Paystack'))
    ).toBe(true);
  });

  it('blocks paid checkout when PAYSTACK_MODE=live under staging APP_ENV', () => {
    const result = evaluateReadiness(
      baseConfig({
        paystackMode: 'live',
        paystackSecretKey: 'sk_live_blocked',
        appEnv: 'staging',
      }),
      { now: new Date('2026-06-01T00:00:00Z') }
    );
    expect(result.paidCheckoutAvailable).toBe(false);
  });
});
