import {
  EVENT_CURRENCY,
  EVENT_ID,
  REGISTRATION_CUTOFF_HOURS,
} from './constants.js';
import { PRICING } from './pricing.js';

function env(name, fallback = '') {
  const value = process.env[name];
  if (value === undefined || value === null) return fallback;
  return String(value).trim();
}

function isTrue(name) {
  return env(name).toLowerCase() === 'true';
}

/**
 * ALLOW_COMBINED_CHALLENGE_EXHIBITION defaults to false when unset
 * (safer for production until the organisation explicitly enables combined).
 * Explicit "true" enables combined selection server-side.
 */
function allowCombinedFromEnv() {
  const raw = env('ALLOW_COMBINED_CHALLENGE_EXHIBITION', 'false').toLowerCase();
  return raw === 'true' || raw === '1' || raw === 'yes';
}

function parseIsoDate(value, label) {
  if (!value) return { ok: false, error: `${label} is missing.` };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { ok: false, error: `${label} is not a valid ISO-8601 timestamp.` };
  }
  return { ok: true, date };
}

export function getEventConfig() {
  const currency = env('EVENT_CURRENCY', EVENT_CURRENCY).toUpperCase();
  const appEnv = env('APP_ENV', env('NODE_ENV', '')).toLowerCase();
  return {
    eventId: env('EVENT_ID', EVENT_ID),
    currency: currency || EVENT_CURRENCY,
    appEnv,
    registrationEnabled: isTrue('EVENT_REGISTRATION_ENABLED'),
    registrationOpenAtRaw: env('EVENT_REGISTRATION_OPEN_AT'),
    eventStartAtRaw: env('EVENT_START_AT'),
    privacyApproved: isTrue('EVENT_PRIVACY_NOTICE_APPROVED'),
    termsApproved: isTrue('EVENT_PARTICIPATION_TERMS_APPROVED'),
    publicSiteUrl: env('PUBLIC_SITE_URL').replace(/\/$/, ''),
    paystackSecretKey: env('PAYSTACK_SECRET_KEY'),
    paystackMode: env('PAYSTACK_MODE', 'test').toLowerCase(),
    databaseUrl: env('DATABASE_URL'),
    adminEmail: env('ADMIN_EMAIL').toLowerCase(),
    adminPasswordHash: env('ADMIN_PASSWORD_HASH'),
    sessionSecret: env('SESSION_SECRET'),
    resendApiKey: env('RESEND_API_KEY'),
    emailFrom: env('EMAIL_FROM'),
    adminNotificationEmail: env('ADMIN_NOTIFICATION_EMAIL').toLowerCase(),
    isVercelProduction: env('VERCEL_ENV') === 'production',
    allowCombinedChallengeExhibition: allowCombinedFromEnv(),
  };
}

function collectBaseGateReasons(config, now) {
  const reasons = [];
  let publicStatus = 'unavailable';

  if (!config.registrationEnabled) {
    reasons.push('EVENT_REGISTRATION_ENABLED is not true.');
    publicStatus = 'closed';
  }

  const openAt = parseIsoDate(
    config.registrationOpenAtRaw,
    'EVENT_REGISTRATION_OPEN_AT'
  );
  if (!openAt.ok) {
    reasons.push(openAt.error);
  }

  const startAt = parseIsoDate(config.eventStartAtRaw, 'EVENT_START_AT');
  if (!startAt.ok) {
    reasons.push(startAt.error);
  }

  let cutoffAt = null;
  if (startAt.ok) {
    cutoffAt = new Date(
      startAt.date.getTime() - REGISTRATION_CUTOFF_HOURS * 60 * 60 * 1000
    );
  }

  if (!config.privacyApproved) {
    reasons.push('EVENT_PRIVACY_NOTICE_APPROVED is not true.');
  }
  if (!config.termsApproved) {
    reasons.push('EVENT_PARTICIPATION_TERMS_APPROVED is not true.');
  }
  if (!config.databaseUrl) {
    reasons.push('DATABASE_URL is missing.');
  }
  if (!config.publicSiteUrl || !/^https?:\/\//i.test(config.publicSiteUrl)) {
    reasons.push('PUBLIC_SITE_URL must be an absolute http(s) URL.');
  }
  if (!config.adminEmail || !config.adminPasswordHash || !config.sessionSecret) {
    reasons.push('Secure administrator access is not fully configured.');
  }
  if (config.sessionSecret && config.sessionSecret.length < 32) {
    reasons.push('SESSION_SECRET must be at least 32 characters.');
  }
  if (config.currency !== EVENT_CURRENCY && config.currency !== PRICING.CURRENCY) {
    reasons.push(`EVENT_CURRENCY must be ${EVENT_CURRENCY}.`);
  }

  if (openAt.ok && startAt.ok && config.registrationEnabled) {
    if (now < openAt.date) {
      reasons.push('Registration opening time has not been reached.');
      publicStatus = 'not_open';
    } else if (now >= cutoffAt) {
      reasons.push('Registration cutoff (event start minus 48 hours) has passed.');
      publicStatus = 'closed';
    } else if (reasons.length === 0) {
      publicStatus = 'open';
    }
  }

  return {
    reasons,
    publicStatus,
    openAt,
    startAt,
    cutoffAt,
  };
}

function collectPaidCheckoutReasons(config) {
  const reasons = [];
  const key = String(config.paystackSecretKey || '');
  const mode = String(config.paystackMode || '').toLowerCase();
  const appEnv = String(config.appEnv || '').toLowerCase();
  const keyIsLive = key.toLowerCase().startsWith('sk_live_');
  const keyIsTest = key.toLowerCase().startsWith('sk_test_');

  if (!key) {
    reasons.push('PAYSTACK_SECRET_KEY is missing.');
  }
  if (!['test', 'live'].includes(mode)) {
    reasons.push('PAYSTACK_MODE must be "test" or "live".');
  }
  if (mode === 'test' && keyIsLive) {
    reasons.push(
      'PAYSTACK_SECRET_KEY must be a test key (sk_test_) when PAYSTACK_MODE=test.'
    );
  }
  if (mode === 'live' && key && !keyIsLive) {
    reasons.push(
      'PAYSTACK_SECRET_KEY must be a live key (sk_live_) when PAYSTACK_MODE=live.'
    );
  }
  if ((appEnv === 'staging' || appEnv === 'development') && keyIsLive) {
    reasons.push(
      'Live Paystack secret keys are not allowed when APP_ENV is staging or development.'
    );
  }
  if ((appEnv === 'staging' || appEnv === 'development') && mode === 'live') {
    reasons.push(
      'PAYSTACK_MODE=live is not allowed when APP_ENV is staging or development.'
    );
  }
  if (key && !keyIsLive && !keyIsTest) {
    reasons.push('PAYSTACK_SECRET_KEY must start with sk_test_ or sk_live_.');
  }
  if (config.isVercelProduction && mode !== 'live') {
    reasons.push(
      'Production deployment requires PAYSTACK_MODE=live for completed live paid participation.'
    );
  }
  return reasons;
}

/**
 * Central readiness gate.
 *
 * - `ready` / free registration: does not require Paystack or Resend.
 * - `paidCheckoutAvailable`: requires Paystack credentials and mode rules.
 * Global event gates (enabled, window, legal approvals, DB, admin) still apply
 * to both paths — neither opens while those remain closed.
 */
export function evaluateReadiness(config = getEventConfig(), options = {}) {
  const now = options.now || new Date();
  const base = collectBaseGateReasons(config, now);
  const paidReasons = collectPaidCheckoutReasons(config);

  const freeReady =
    base.reasons.length === 0 && base.publicStatus === 'open';
  const paidCheckoutAvailable = freeReady && paidReasons.length === 0;

  const allReasons = [...base.reasons];
  // Surface paid-only gaps for operators without blocking free registration.
  for (const reason of paidReasons) {
    if (!allReasons.includes(reason)) {
      allReasons.push(`[paid] ${reason}`);
    }
  }

  return {
    ready: freeReady,
    freeRegistrationAvailable: freeReady,
    paidCheckoutAvailable,
    publicStatus: freeReady
      ? 'open'
      : base.publicStatus === 'open'
        ? 'unavailable'
        : base.publicStatus,
    reasons: allReasons,
    registrationOpenAt: base.openAt.ok ? base.openAt.date.toISOString() : null,
    eventStartAt: base.startAt.ok ? base.startAt.date.toISOString() : null,
    registrationCutoffAt: base.cutoffAt ? base.cutoffAt.toISOString() : null,
    currency: config.currency || PRICING.CURRENCY,
    paystackMode: config.paystackMode,
    allowCombinedChallengeExhibition: Boolean(
      config.allowCombinedChallengeExhibition
    ),
    emailConfigured: Boolean(config.resendApiKey && config.emailFrom),
  };
}

export function buildCallbackUrl(config = getEventConfig()) {
  return `${config.publicSiteUrl}/payment/result`;
}
