/**
 * Server-authoritative participation pricing (kobo / NGN minor units).
 * Shared by registration, Paystack init/verify, and public display config.
 * Client-supplied amounts are never trusted.
 */

export const PRICING = Object.freeze({
  GENERAL_REGISTRATION_KOBO: 0,
  CHALLENGE_KOBO: 500_000,
  EXHIBITION_KOBO: 3_000_000,
  COMBINED_KOBO: 3_500_000,
  CURRENCY: 'NGN',
});

export const PRICING_DISPLAY = Object.freeze({
  general: 'Free',
  challenge: '₦5,000',
  exhibition: '₦30,000',
  combined: '₦35,000',
});

/**
 * Calculate the expected participation fee from selected activities.
 * @param {{ challengeSelected: boolean, exhibitionSelected: boolean, allowCombined?: boolean }} options
 */
export function calculateParticipationAmount({
  challengeSelected,
  exhibitionSelected,
  allowCombined = false,
}) {
  const challenge = Boolean(challengeSelected);
  const exhibition = Boolean(exhibitionSelected);

  if (challenge && exhibition && !allowCombined) {
    return {
      ok: false,
      code: 'COMBINED_DISABLED',
      error:
        'Combined challenge and exhibition selection is not available. Choose one paid activity.',
      amountKobo: null,
      currency: PRICING.CURRENCY,
    };
  }

  let amountKobo = PRICING.GENERAL_REGISTRATION_KOBO;
  if (challenge) amountKobo += PRICING.CHALLENGE_KOBO;
  if (exhibition) amountKobo += PRICING.EXHIBITION_KOBO;

  return {
    ok: true,
    amountKobo,
    currency: PRICING.CURRENCY,
    challengeSelected: challenge,
    exhibitionSelected: exhibition,
    paymentRequired: amountKobo > 0,
  };
}

/** Safe public pricing config for the registration UI (no secrets). */
export function getPublicPricingConfig(allowCombined = false) {
  return {
    currency: PRICING.CURRENCY,
    generalRegistrationKobo: PRICING.GENERAL_REGISTRATION_KOBO,
    challengeKobo: PRICING.CHALLENGE_KOBO,
    exhibitionKobo: PRICING.EXHIBITION_KOBO,
    combinedKobo: PRICING.COMBINED_KOBO,
    generalDisplay: PRICING_DISPLAY.general,
    challengeDisplay: PRICING_DISPLAY.challenge,
    exhibitionDisplay: PRICING_DISPLAY.exhibition,
    combinedDisplay: PRICING_DISPLAY.combined,
    allowCombinedChallengeExhibition: Boolean(allowCombined),
  };
}

export function formatNgnFromKobo(amountKobo) {
  const naira = Number(amountKobo) / 100;
  if (!Number.isFinite(naira) || naira === 0) return 'Free';
  return `₦${naira.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
}
