import { describe, expect, it } from 'vitest';
import {
  calculateParticipationAmount,
  getPublicPricingConfig,
  PRICING,
} from '../api/_lib/pricing.js';
import { validateRegistrationInput } from '../api/_lib/validation.js';
import { evaluateReadiness } from '../api/_lib/config.js';

const baseApplicant = {
  fullName: 'Ada Okafor',
  email: 'ada@example.com',
  phone: '+2348012345678',
  stateOfResidence: 'Lagos',
  applicantCategory: 'EXISTING_BUSINESS_OWNER',
  briefDescription: 'An existing fashion retail business in Lagos.',
  privacyAccepted: true,
  termsAccepted: true,
};

describe('authoritative pricing', () => {
  it('calculates free registration as 0 kobo', () => {
    const result = calculateParticipationAmount({
      challengeSelected: false,
      exhibitionSelected: false,
    });
    expect(result.ok).toBe(true);
    expect(result.amountKobo).toBe(0);
    expect(result.paymentRequired).toBe(false);
  });

  it('calculates challenge as 500000 kobo', () => {
    expect(
      calculateParticipationAmount({
        challengeSelected: true,
        exhibitionSelected: false,
      }).amountKobo
    ).toBe(PRICING.CHALLENGE_KOBO);
    expect(PRICING.CHALLENGE_KOBO).toBe(500000);
  });

  it('calculates exhibition as 3000000 kobo', () => {
    expect(
      calculateParticipationAmount({
        challengeSelected: false,
        exhibitionSelected: true,
      }).amountKobo
    ).toBe(PRICING.EXHIBITION_KOBO);
    expect(PRICING.EXHIBITION_KOBO).toBe(3000000);
  });

  it('calculates combined selection as 3500000 kobo', () => {
    expect(
      calculateParticipationAmount({
        challengeSelected: true,
        exhibitionSelected: true,
        allowCombined: true,
      }).amountKobo
    ).toBe(PRICING.COMBINED_KOBO);
    expect(PRICING.COMBINED_KOBO).toBe(3500000);
  });

  it('rejects combined selection when disabled', () => {
    const result = calculateParticipationAmount({
      challengeSelected: true,
      exhibitionSelected: true,
      allowCombined: false,
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe('COMBINED_DISABLED');
  });

  it('exposes a safe public pricing config', () => {
    const publicConfig = getPublicPricingConfig(true);
    expect(publicConfig.challengeKobo).toBe(500000);
    expect(publicConfig.exhibitionKobo).toBe(3000000);
    expect(publicConfig.allowCombinedChallengeExhibition).toBe(true);
  });
});

describe('participation eligibility validation', () => {
  it('allows general registration without women-only attestation', () => {
    const result = validateRegistrationInput(baseApplicant);
    expect(result.ok).toBe(true);
    expect(result.value.expectedAmountKobo).toBe(0);
    expect(result.value.paymentRequired).toBe(false);
  });

  it('requires challenge eligibility attestation for challenge selection', () => {
    const result = validateRegistrationInput({
      ...baseApplicant,
      challengeSelected: true,
    });
    expect(result.ok).toBe(false);
    expect(result.errors.challengeWomenEligibilityAttested).toBeTruthy();
  });

  it('accepts challenge selection with attestation', () => {
    const result = validateRegistrationInput({
      ...baseApplicant,
      challengeSelected: true,
      challengeWomenEligibilityAttested: true,
    });
    expect(result.ok).toBe(true);
    expect(result.value.expectedAmountKobo).toBe(500000);
  });

  it('requires business-owner confirmation and exhibition fields', () => {
    const missing = validateRegistrationInput({
      ...baseApplicant,
      exhibitionSelected: true,
    });
    expect(missing.ok).toBe(false);
    expect(missing.errors.exhibitionBusinessOwnerAttested).toBeTruthy();
    expect(missing.errors.exhibitionBusinessName).toBeTruthy();

    const ok = validateRegistrationInput({
      ...baseApplicant,
      exhibitionSelected: true,
      exhibitionBusinessOwnerAttested: true,
      exhibitionBusinessName: 'Ada Crafts',
      exhibitionCategory: 'Fashion',
      exhibitionDescription: 'Handmade garments and accessories for retail.',
    });
    expect(ok.ok).toBe(true);
    expect(ok.value.expectedAmountKobo).toBe(3000000);
  });

  it('requires both attestations for combined selection when enabled', () => {
    const result = validateRegistrationInput(
      {
        ...baseApplicant,
        challengeSelected: true,
        exhibitionSelected: true,
        challengeWomenEligibilityAttested: true,
        exhibitionBusinessOwnerAttested: true,
        exhibitionBusinessName: 'Ada Crafts',
        exhibitionCategory: 'Fashion',
        exhibitionDescription: 'Handmade garments and accessories for retail.',
      },
      { allowCombinedChallengeExhibition: true }
    );
    expect(result.ok).toBe(true);
    expect(result.value.expectedAmountKobo).toBe(3500000);
  });

  it('rejects combined selection by default when allowCombined is unset', () => {
    const result = validateRegistrationInput({
      ...baseApplicant,
      challengeSelected: true,
      exhibitionSelected: true,
      challengeWomenEligibilityAttested: true,
      exhibitionBusinessOwnerAttested: true,
      exhibitionBusinessName: 'Ada Crafts',
      exhibitionCategory: 'Fashion',
      exhibitionDescription: 'Handmade garments and accessories for retail.',
    });
    expect(result.ok).toBe(false);
    expect(result.errors.participationSelection).toBeTruthy();
  });

  it('rejects client-supplied amounts', () => {
    const result = validateRegistrationInput({
      ...baseApplicant,
      amountKobo: 100,
      currency: 'USD',
      discount: 50,
    });
    expect(result.ok).toBe(false);
    expect(result.errors.amount).toBeTruthy();
  });

  it('rejects combined selection when server config disables it', () => {
    const result = validateRegistrationInput(
      {
        ...baseApplicant,
        challengeSelected: true,
        exhibitionSelected: true,
        challengeWomenEligibilityAttested: true,
        exhibitionBusinessOwnerAttested: true,
        exhibitionBusinessName: 'Ada Crafts',
        exhibitionCategory: 'Fashion',
        exhibitionDescription: 'Handmade garments and accessories for retail.',
      },
      { allowCombinedChallengeExhibition: false }
    );
    expect(result.ok).toBe(false);
    expect(result.errors.participationSelection).toBeTruthy();
  });
});

describe('readiness free vs paid checkout', () => {
  const readyBase = {
    eventId: 'bec-2026',
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
    resendApiKey: '',
    emailFrom: '',
    adminNotificationEmail: '',
    isVercelProduction: false,
    allowCombinedChallengeExhibition: true,
  };

  it('allows free registration without Paystack or Resend', () => {
    const result = evaluateReadiness(
      { ...readyBase, paystackSecretKey: '' },
      { now: new Date('2026-06-01T00:00:00+01:00') }
    );
    expect(result.ready).toBe(true);
    expect(result.freeRegistrationAvailable).toBe(true);
    expect(result.paidCheckoutAvailable).toBe(false);
  });

  it('requires Paystack for paid checkout availability', () => {
    const result = evaluateReadiness(readyBase, {
      now: new Date('2026-06-01T00:00:00+01:00'),
    });
    expect(result.paidCheckoutAvailable).toBe(true);
  });

  it('keeps both closed when global registration gates are closed', () => {
    const result = evaluateReadiness(
      { ...readyBase, registrationEnabled: false },
      { now: new Date('2026-06-01T00:00:00+01:00') }
    );
    expect(result.ready).toBe(false);
    expect(result.paidCheckoutAvailable).toBe(false);
  });
});
