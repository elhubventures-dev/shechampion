#!/usr/bin/env node
/**
 * Phase 10 — print required Vercel Production env var checklist (no values).
 * Does not read or print secrets.
 */
const required = [
  { name: 'APP_ENV', expect: 'production (or unset; do not use staging)' },
  { name: 'DATABASE_URL', expect: 'dedicated production Postgres URL (not staging)' },
  { name: 'ALLOW_PRODUCTION_MIGRATE', expect: 'false in Vercel runtime; true only for one-shot local migrate' },
  { name: 'ALLOW_STAGING_MIGRATE', expect: 'false / absent on Production' },
  { name: 'STAGING_DATABASE_URL', expect: 'absent on Production' },
  { name: 'PUBLIC_SITE_URL', expect: 'https://www.shechampion-bbf.org (no trailing slash)' },
  { name: 'PAYSTACK_SECRET_KEY', expect: 'sk_live_… (Production env only)' },
  { name: 'PAYSTACK_MODE', expect: 'live' },
  { name: 'RESEND_API_KEY', expect: 'present' },
  { name: 'EMAIL_FROM', expect: 'verified sender on organisational domain' },
  { name: 'ADMIN_NOTIFICATION_EMAIL', expect: 'present' },
  { name: 'ADMIN_EMAIL', expect: 'present' },
  { name: 'ADMIN_PASSWORD_HASH', expect: 'scrypt hash present' },
  { name: 'SESSION_SECRET', expect: '≥32 chars, unique to production' },
  { name: 'EVENT_REGISTRATION_ENABLED', expect: 'false until intentional open' },
  { name: 'EVENT_REGISTRATION_OPEN_AT', expect: 'set only when opening window is confirmed' },
  { name: 'EVENT_START_AT', expect: 'set only when exact start time confirmed (12 Dec 2026 day; time TBD)' },
  { name: 'EVENT_PRIVACY_NOTICE_APPROVED', expect: 'true only after genuine legal approval' },
  { name: 'EVENT_PARTICIPATION_TERMS_APPROVED', expect: 'true only after genuine legal approval' },
  {
    name: 'ALLOW_COMBINED_CHALLENGE_EXHIBITION',
    expect: 'false until organisation explicitly enables combined',
  },
];

console.log(
  JSON.stringify(
    {
      productionDomain: 'https://www.shechampion-bbf.org',
      callbackUrl: 'https://www.shechampion-bbf.org/payment/result',
      webhookUrl: 'https://www.shechampion-bbf.org/api/payment/webhook',
      registrationMustRemain: 'EVENT_REGISTRATION_ENABLED=false',
      requiredEnvVars: required,
      operatorDeployCommands: [
        'vercel login',
        'vercel link  # select shechampion production project',
        'vercel env pull .env.production.local --environment=production  # inspect names only; do not commit',
        'Confirm DATABASE_URL host differs from staging Neon',
        'ALLOW_PRODUCTION_MIGRATE=true DATABASE_URL=<prod> APP_ENV=production npm run migrate',
        'Unset ALLOW_PRODUCTION_MIGRATE after migrate',
        'vercel --prod',
        'In Paystack LIVE dashboard: set webhook to https://www.shechampion-bbf.org/api/payment/webhook',
      ],
      doNot: [
        'Do not put sk_live_ in .env.local or .env.staging.local',
        'Do not migrate using STAGING_DATABASE_URL',
        'Do not set EVENT_REGISTRATION_ENABLED=true in this phase',
        'Do not invent EVENT_START_AT time',
        'Do not run live payment test charges in this phase',
      ],
    },
    null,
    2
  )
);
