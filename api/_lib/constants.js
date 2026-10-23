export const EVENT_ID = 'bec-2026';
export const EVENT_NAME =
  'SHE CHAMPIONS BUSINESS EMPOWERMENT CHALLENGE 2026';
export const EVENT_DATE_DISPLAY = '12 December 2026';
export const EVENT_LOCATION_DISPLAY = 'Abuja, Nigeria';

/** @deprecated Use PRICING.CHALLENGE_KOBO — kept for transitional imports. */
export const EVENT_FEE_KOBO = 500000;
export const EVENT_CURRENCY = 'NGN';
/** @deprecated Prefer PRICING_DISPLAY / getPublicPricingConfig. */
export const EVENT_FEE_DISPLAY = '₦5,000';

export const REGISTRATION_CUTOFF_HOURS = 48;
export const PAYSTACK_PROVIDER = 'paystack';

export const APPLICANT_CATEGORIES = [
  'EXISTING_BUSINESS_OWNER',
  'VOCATIONAL_OR_PROFESSIONAL_SKILL',
  'BUSINESS_IDEA',
];

/** Legacy / admin assessment statuses retained for compatibility. */
export const APPLICATION_STATUSES = [
  'PENDING_PAYMENT',
  'REGISTERED',
  'UNDER_REVIEW',
  'SHORTLISTED',
  'NOT_SHORTLISTED',
  'WITHDRAWN',
];

export const EVENT_REGISTRATION_STATUSES = [
  'REGISTERED',
  'INVALID',
  'WITHDRAWN',
];

export const CHALLENGE_STATUSES = [
  'NOT_SELECTED',
  'PENDING_PAYMENT',
  'CONFIRMED',
  'UNDER_REVIEW',
  'SHORTLISTED',
  'NOT_SHORTLISTED',
  'CANCELLED',
  'REVERSED',
];

export const EXHIBITION_STATUSES = [
  'NOT_SELECTED',
  'PENDING_PAYMENT',
  'CONFIRMED',
  'CANCELLED',
  'REVERSED',
];

export const PAYMENT_STATUSES = [
  'NOT_REQUIRED',
  'PENDING',
  'INITIALIZATION_FAILED',
  'SUCCESS',
  'FAILED',
  'REVERSED',
];

/** Admin may set these challenge assessment values after payment confirmation. */
export const CHALLENGE_ADMIN_STATUSES = [
  'CONFIRMED',
  'UNDER_REVIEW',
  'SHORTLISTED',
  'NOT_SHORTLISTED',
  'CANCELLED',
];

export const NIGERIA_STATES = [
  'Abia',
  'Adamawa',
  'Akwa Ibom',
  'Anambra',
  'Bauchi',
  'Bayelsa',
  'Benue',
  'Borno',
  'Cross River',
  'Delta',
  'Ebonyi',
  'Edo',
  'Ekiti',
  'Enugu',
  'FCT',
  'Gombe',
  'Imo',
  'Jigawa',
  'Kaduna',
  'Kano',
  'Katsina',
  'Kebbi',
  'Kogi',
  'Kwara',
  'Lagos',
  'Nasarawa',
  'Niger',
  'Ogun',
  'Ondo',
  'Osun',
  'Oyo',
  'Plateau',
  'Rivers',
  'Sokoto',
  'Taraba',
  'Yobe',
  'Zamfara',
];

export const SESSION_COOKIE = 'sc_admin_session';
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
export const MAX_BODY_BYTES = 32_768;
