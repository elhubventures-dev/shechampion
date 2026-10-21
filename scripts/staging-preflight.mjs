#!/usr/bin/env node
/**
 * Report staging resource readiness without printing secret values.
 *
 * Usage:
 *   node scripts/staging-preflight.mjs
 *   # or with dotenv-style files already loaded into the process env
 */
const KEYS = [
  'APP_ENV',
  'STAGING_DATABASE_URL',
  'DATABASE_URL',
  'ALLOW_STAGING_MIGRATE',
  'ALLOW_PRODUCTION_MIGRATE',
  'PAYSTACK_SECRET_KEY',
  'PAYSTACK_MODE',
  'PUBLIC_SITE_URL',
  'RESEND_API_KEY',
  'EMAIL_FROM',
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD_HASH',
  'SESSION_SECRET',
  'EVENT_REGISTRATION_ENABLED',
  'EVENT_REGISTRATION_OPEN_AT',
  'EVENT_START_AT',
  'EVENT_PRIVACY_NOTICE_APPROVED',
  'EVENT_PARTICIPATION_TERMS_APPROVED',
  'ADMIN_NOTIFICATION_EMAIL',
  'VERCEL_ENV',
];

function classify(key, raw) {
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return 'absent';
  }
  const value = String(raw).trim();
  const lower = value.toLowerCase();

  if (key === 'PAYSTACK_SECRET_KEY') {
    if (lower.startsWith('sk_live_')) return 'invalid_live_key_in_env';
    if (lower.startsWith('sk_test_')) return 'present_test_prefix';
    return 'present_unknown_prefix';
  }
  if (key === 'PAYSTACK_MODE') {
    if (lower === 'test') return 'present_test';
    if (lower === 'live') return 'invalid_live_mode';
    return 'present_invalid';
  }
  if (key === 'APP_ENV') {
    if (lower === 'staging') return 'present_staging';
    if (lower === 'production') return 'present_production';
    return `present_${lower}`;
  }
  if (
    key === 'EVENT_REGISTRATION_ENABLED' ||
    key === 'EVENT_PRIVACY_NOTICE_APPROVED' ||
    key === 'EVENT_PARTICIPATION_TERMS_APPROVED' ||
    key === 'ALLOW_STAGING_MIGRATE' ||
    key === 'ALLOW_PRODUCTION_MIGRATE'
  ) {
    if (lower === 'true' || lower === 'false') return `present_${lower}`;
    return 'present_invalid';
  }
  if (key === 'STAGING_DATABASE_URL' || key === 'DATABASE_URL') {
    if (!/^postgres(ql)?:\/\//i.test(value)) return 'invalid_scheme';
    if (/(^|[_\-.])prod(uction)?([_\-.]|$)/i.test(value)) {
      return 'present_name_suggests_production';
    }
    return 'present';
  }
  if (key === 'PUBLIC_SITE_URL') {
    if (!/^https?:\/\//i.test(value)) return 'invalid_url';
    return 'present';
  }
  if (key === 'SESSION_SECRET') {
    return value.length >= 32 ? 'present' : 'present_too_short';
  }
  if (key === 'ADMIN_PASSWORD_HASH') {
    return value.startsWith('scrypt$') ? 'present_scrypt' : 'present_unexpected_format';
  }
  return 'present';
}

const report = {};
for (const key of KEYS) {
  report[key] = classify(key, process.env[key]);
}

const stagingDb =
  report.STAGING_DATABASE_URL === 'present' ||
  report.STAGING_DATABASE_URL === 'present_name_suggests_production';
const allowMigrate = report.ALLOW_STAGING_MIGRATE === 'present_true';
const appEnvStaging = report.APP_ENV === 'present_staging';
const paystackSafe =
  report.PAYSTACK_SECRET_KEY === 'present_test_prefix' &&
  report.PAYSTACK_MODE === 'present_test';
const legalApproved =
  report.EVENT_PRIVACY_NOTICE_APPROVED === 'present_true' &&
  report.EVENT_PARTICIPATION_TERMS_APPROVED === 'present_true';
const registrationOpenFlag =
  report.EVENT_REGISTRATION_ENABLED === 'present_true';

const blockers = [];
if (!stagingDb) blockers.push('Designated STAGING_DATABASE_URL is absent or invalid.');
if (!allowMigrate || !appEnvStaging) {
  blockers.push(
    'Staging migration safeguard incomplete (need APP_ENV=staging and ALLOW_STAGING_MIGRATE=true).'
  );
}
if (!paystackSafe) {
  blockers.push('Paystack test credentials/mode are absent or not safely test-only.');
}
if (report.PUBLIC_SITE_URL === 'absent' || report.PUBLIC_SITE_URL === 'invalid_url') {
  blockers.push('PUBLIC_SITE_URL absent or invalid.');
}
if (report.RESEND_API_KEY === 'absent' || report.EMAIL_FROM === 'absent') {
  blockers.push('Resend test sender configuration incomplete.');
}
if (
  report.ADMIN_EMAIL === 'absent' ||
  report.ADMIN_PASSWORD_HASH === 'absent' ||
  report.ADMIN_PASSWORD_HASH === 'present_unexpected_format' ||
  report.SESSION_SECRET !== 'present'
) {
  blockers.push('Staging administrator / session configuration incomplete.');
}
if (report.EVENT_START_AT === 'absent') {
  blockers.push('EVENT_START_AT absent (confirmed start time still required for real event gates).');
}
if (!legalApproved) {
  blockers.push(
    'Privacy/terms approval flags are not true (do not set true unless organization approved).'
  );
}

console.log(
  JSON.stringify(
    {
      ok: true,
      secretsPrinted: false,
      variables: report,
      summary: {
        stagingDatabaseDesignated: stagingDb && report.STAGING_DATABASE_URL === 'present',
        stagingMigrateSafeguardReady: allowMigrate && appEnvStaging,
        paystackTestSafe: paystackSafe,
        legalApprovalsPresent: legalApproved,
        registrationCurrentlyEnabled: registrationOpenFlag,
        externalE2EReady: blockers.length === 0,
      },
      blockers,
      note:
        'Values are never printed. externalE2EReady means configuration shape looks complete; it does not prove provider connectivity.',
      readyForControlledOpenHint:
        'Keep EVENT_REGISTRATION_ENABLED=false until staging DB migrated and test providers verified.',
    },
    null,
    2
  )
);

process.exit(blockers.length ? 2 : 0);
