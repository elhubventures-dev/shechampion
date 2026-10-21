import {
  EVENT_CURRENCY,
  EVENT_FEE_KOBO,
  EVENT_ID,
  REGISTRATION_CUTOFF_HOURS,
} from './constants.js';

function env(name, fallback = '') {
  const value = process.env[name];
  if (value === undefined || value === null) return fallback;
  return String(value).trim();
}

function isTrue(name) {
  return env(name).toLowerCase() === 'true';
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
  const feeKobo = Number(env('EVENT_FEE_KOBO', String(EVENT_FEE_KOBO)));
  const currency = env('EVENT_CURRENCY', EVENT_CURRENCY).toUpperCase();
  return {
    eventId: env('EVENT_ID', EVENT_ID),
    feeKobo: Number.isFinite(feeKobo) ? feeKobo : EVENT_FEE_KOBO,
    currency: currency || EVENT_CURRENCY,
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
  };
}

/**
 * Central readiness gate. Public registration/payment init must not proceed
 * unless every required condition is met.
 */
export function evaluateReadiness(config = getEventConfig(), options = {}) {
  const now = options.now || new Date();
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
  if (!config.paystackSecretKey) {
    reasons.push('PAYSTACK_SECRET_KEY is missing.');
  }
  if (!['test', 'live'].includes(config.paystackMode)) {
    reasons.push('PAYSTACK_MODE must be "test" or "live".');
  }
  if (config.isVercelProduction && config.paystackMode !== 'live') {
    reasons.push(
      'Production deployment requires PAYSTACK_MODE=live for completed live registrations.'
    );
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
  if (!config.resendApiKey || !config.emailFrom) {
    reasons.push('Confirmation email configuration is incomplete.');
  }
  if (config.feeKobo !== EVENT_FEE_KOBO) {
    reasons.push(`EVENT_FEE_KOBO must be exactly ${EVENT_FEE_KOBO}.`);
  }
  if (config.currency !== EVENT_CURRENCY) {
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

  const ready = reasons.length === 0 && publicStatus === 'open';

  return {
    ready,
    publicStatus: ready ? 'open' : publicStatus === 'open' ? 'unavailable' : publicStatus,
    reasons,
    registrationOpenAt: openAt.ok ? openAt.date.toISOString() : null,
    eventStartAt: startAt.ok ? startAt.date.toISOString() : null,
    registrationCutoffAt: cutoffAt ? cutoffAt.toISOString() : null,
    feeKobo: config.feeKobo,
    currency: config.currency,
    paystackMode: config.paystackMode,
  };
}

export function buildCallbackUrl(config = getEventConfig()) {
  return `${config.publicSiteUrl}/payment/result`;
}
