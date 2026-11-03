/** Shared facts for SHE CHAMPIONS Business Empowerment Challenge 2026. */
export const EVENT_2026 = {
  officialName: 'SHE CHAMPIONS BUSINESS EMPOWERMENT CHALLENGE 2026',
  shortName: 'Business Empowerment Challenge 2026',
  presentsLabel: 'SHE CHAMPIONS PRESENTS',
  promoTagline:
    "Empowering women's skills, showcasing businesses, and creating opportunities for growth.",
  tagline: 'Empowering Her Skills. Elevating Her Business. Unlocking Her Potential.',
  dateDisplay: '12 December 2026',
  timeDisplay: '10:00 AM',
  /** Countdown target: programme start in Africa/Lagos (+01:00). */
  countdownAt: '2026-12-12T10:00:00+01:00',
  countdownNote: 'Countdown to programme start · 10:00 AM',
  locationDisplay:
    'Maryam Babangida National Centre for Women Development, Abuja',
  format: 'Physical event',
  /** General event registration is free; paid options are optional. */
  feeDisplay: 'Free registration',
  challengeFeeDisplay: '₦10,000',
  exhibitionFeeDisplay: '₦30,000',
  combinedFeeDisplay: '₦40,000',
  pricingSummary:
    'Free event registration; optional Challenge ₦10,000; optional Exhibition ₦30,000',
  /** Structured pricing for scannable UI (hero / details). */
  pricingLines: [
    { label: 'Event registration', value: 'Free' },
    { label: 'Challenge', value: '₦10,000', optional: true },
    { label: 'Exhibition', value: '₦30,000', optional: true },
  ],
  grantTeaser: 'Opportunity to compete for business grants',
  grantRangeDisplay: '₦1 million – ₦5 million',
  cutoffDateDisplay: '10 December 2026',
  cutoffRule: '48 hours before the event',
  cutoffTimeNote:
    'Registration closes at 10:00 AM on 10 December 2026 (48 hours before the event).',
  venueNote:
    'Venue: Maryam Babangida National Centre for Women Development, Abuja.',
  heroImage: '/assets/challenge_hero.webp',
  path: '/business-empowerment-challenge-2026',
};
