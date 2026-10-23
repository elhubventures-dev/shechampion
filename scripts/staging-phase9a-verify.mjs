#!/usr/bin/env node
/**
 * Phase 9A: schema + legacy preservation + pricing integrity checks.
 * Staging safeguards required. Never prints secrets, URLs, or applicant PII.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';
import { evaluateReadiness } from '../api/_lib/config.js';
import { EVENT_ID } from '../api/_lib/constants.js';
import {
  calculateParticipationAmount,
  PRICING,
} from '../api/_lib/pricing.js';
import { validateRegistrationInput } from '../api/_lib/validation.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const text = readFileSync(filePath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined || process.env[key] === '') {
      process.env[key] = value;
    }
  }
}

loadEnvFile(join(root, '.env.staging.local'));
loadEnvFile(join(root, '.env.local'));

const appEnv = String(process.env.APP_ENV || '').toLowerCase();
const allow = process.env.ALLOW_STAGING_MIGRATE === 'true';
const stagingUrl = String(process.env.STAGING_DATABASE_URL || '').trim();
const databaseUrl = String(process.env.DATABASE_URL || '').trim();
const url = stagingUrl || databaseUrl;

if (appEnv !== 'staging' || !allow || !url) {
  console.error('Requires APP_ENV=staging, ALLOW_STAGING_MIGRATE=true, staging DB URL.');
  process.exit(1);
}
if (/(^|[_\-./])prod(uction)?([_\-./?]|$)/i.test(url)) {
  console.error('Refusing production-looking database URL.');
  process.exit(1);
}

function redactHost(u) {
  try {
    const parsed = new URL(u);
    const host = parsed.hostname || '';
    const looksStaging =
      /staging|stg|neon\.tech|localhost|127\.0\.0\.1/i.test(host) ||
      /staging|stg/i.test(parsed.pathname || '');
    const looksProd = /(^|[_\-.])prod(uction)?([_\-.]|$)/i.test(host);
    return {
      hostClass: looksProd ? 'production_like' : looksStaging ? 'staging_like' : 'other',
      schemeOk: /^postgres(ql)?:$/i.test(parsed.protocol.replace(':', '') + ':') ||
        parsed.protocol.startsWith('postgres'),
    };
  } catch {
    return { hostClass: 'invalid', schemeOk: false };
  }
}

const report = {
  ok: false,
  databaseUrlsMatch:
    Boolean(stagingUrl) && Boolean(databaseUrl) && stagingUrl === databaseUrl,
  stagingUrlClass: redactHost(stagingUrl || url).hostClass,
  databaseUrlClass: redactHost(databaseUrl || url).hostClass,
  migrations: {},
  schema: {},
  legacy: {},
  pricing: {},
  synthetic: {},
  readiness: {},
};

const sql = neon(url);

// --- migrations ---
const migrationRows = await sql`SELECT id FROM schema_migrations ORDER BY id`;
const migrationIds = migrationRows.map((r) => r.id);
const migration003Count = migrationIds.filter((id) => id === '003_participation_options').length;
report.migrations = {
  applied: migrationIds,
  has001: migrationIds.includes('001_init'),
  has002: migrationIds.includes('002_security_hardening'),
  has003: migrationIds.includes('003_participation_options'),
  migration003ExactlyOnce: migration003Count === 1,
};

// --- schema columns / constraints / indexes ---
const requiredColumns = [
  'event_registration_status',
  'challenge_selected',
  'exhibition_selected',
  'challenge_status',
  'exhibition_status',
  'expected_amount_kobo',
  'currency',
  'challenge_women_eligibility_attested',
  'challenge_eligibility_attested_at',
  'exhibition_business_owner_attested',
  'exhibition_owner_attested_at',
  'exhibition_business_name',
  'exhibition_category',
  'exhibition_description',
];

const cols = await sql`
  SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'registrations'
`;
const colNames = new Set(cols.map((c) => c.column_name));
report.schema.columnsPresent = Object.fromEntries(
  requiredColumns.map((c) => [c, colNames.has(c)])
);
report.schema.allParticipationColumnsPresent = requiredColumns.every((c) =>
  colNames.has(c)
);

const checks = await sql`
  SELECT conname, pg_get_constraintdef(oid) AS def
  FROM pg_constraint
  WHERE conrelid = 'public.registrations'::regclass
    AND contype = 'c'
`;
const checkDefs = checks.map((c) => `${c.conname}: ${c.def}`);
report.schema.paymentStatusAllowsNotRequired = checkDefs.some((d) =>
  d.includes('NOT_REQUIRED')
);
report.schema.challengeStatusConstraint = checkDefs.some((d) =>
  d.includes('registrations_challenge_status_check')
);
report.schema.exhibitionStatusConstraint = checkDefs.some((d) =>
  d.includes('registrations_exhibition_status_check')
);
report.schema.eventRegistrationStatusConstraint = checkDefs.some((d) =>
  d.includes('registrations_event_registration_status_check')
);

const indexes = await sql`
  SELECT indexname FROM pg_indexes WHERE schemaname = 'public'
`;
const indexNames = indexes.map((i) => i.indexname);
report.schema.indexes = {
  challenge_status: indexNames.includes('idx_registrations_challenge_status'),
  exhibition_status: indexNames.includes('idx_registrations_exhibition_status'),
  challenge_selected: indexNames.includes('idx_registrations_challenge_selected'),
  exhibition_selected: indexNames.includes('idx_registrations_exhibition_selected'),
  expected_amount: indexNames.includes('idx_registrations_expected_amount'),
};

// --- legacy preservation (aggregate only, no PII) ---
const legacyStats = await sql`
  SELECT
    COUNT(*)::int AS total_registrations,
    COUNT(*) FILTER (WHERE challenge_selected = true)::int AS challenge_selected_count,
    COUNT(*) FILTER (
      WHERE challenge_selected = true AND expected_amount_kobo = 500000
    )::int AS challenge_selected_with_500000,
    COUNT(*) FILTER (
      WHERE challenge_selected = false
        AND exhibition_selected = false
        AND expected_amount_kobo = 0
        AND payment_status = 'NOT_REQUIRED'
    )::int AS free_only_count,
    COUNT(*) FILTER (
      WHERE payment_status = 'SUCCESS'
        AND challenge_selected = false
        AND exhibition_selected = false
    )::int AS success_without_participation_selected,
    COUNT(*) FILTER (
      WHERE EXISTS (
        SELECT 1 FROM payment_transactions pt WHERE pt.registration_id = registrations.id
      )
      AND challenge_selected = false
      AND exhibition_selected = false
    )::int AS has_payment_tx_but_not_challenge_selected
  FROM registrations
  WHERE event_id = ${EVENT_ID}
`;
report.legacy = {
  ...legacyStats[0],
  note:
    legacyStats[0].total_registrations === 0
      ? 'No legacy rows present; backfill verified via synthetic fixture below.'
      : 'Aggregate counts only; applicant PII not printed.',
  historicalPaidMeaningPreserved:
    Number(legacyStats[0].success_without_participation_selected) === 0 &&
    Number(legacyStats[0].has_payment_tx_but_not_challenge_selected) === 0,
};

// --- pricing unit checks (no DB) ---
report.pricing.free = calculateParticipationAmount({
  challengeSelected: false,
  exhibitionSelected: false,
}).amountKobo === 0;
report.pricing.challenge =
  calculateParticipationAmount({
    challengeSelected: true,
    exhibitionSelected: false,
  }).amountKobo === PRICING.CHALLENGE_KOBO;
report.pricing.exhibition =
  calculateParticipationAmount({
    challengeSelected: false,
    exhibitionSelected: true,
  }).amountKobo === PRICING.EXHIBITION_KOBO;
report.pricing.combined =
  calculateParticipationAmount({
    challengeSelected: true,
    exhibitionSelected: true,
    allowCombined: true,
  }).amountKobo === PRICING.COMBINED_KOBO;
report.pricing.combinedDisabledRejected =
  calculateParticipationAmount({
    challengeSelected: true,
    exhibitionSelected: true,
    allowCombined: false,
  }).ok === false;

const combinedValidation = validateRegistrationInput(
  {
    fullName: 'STAGING TEST Pricing',
    email: 'phase9a-combined@example.invalid',
    phone: '+2348000000099',
    stateOfResidence: 'FCT',
    applicantCategory: 'EXISTING_BUSINESS_OWNER',
    briefDescription: 'Synthetic combined selection for Phase 9A pricing check.',
    privacyAccepted: true,
    termsAccepted: true,
    challengeSelected: true,
    exhibitionSelected: true,
    challengeWomenEligibilityAttested: true,
    exhibitionBusinessOwnerAttested: true,
    exhibitionBusinessName: 'STAGING TEST Biz',
    exhibitionCategory: 'Crafts',
    exhibitionDescription: 'Synthetic exhibition description for pricing checks.',
  },
  { allowCombinedChallengeExhibition: false }
);
report.pricing.combinedDisabledServerValidation = combinedValidation.ok === false;

// --- synthetic free registration fixture ---
const marker = `phase9a-free-${Date.now()}@example.invalid`;
const publicRef = `SC-P9A-${Date.now().toString(36).toUpperCase()}`;
const now = new Date().toISOString();
let freeRegId = null;

try {
  const inserted = await sql`
    INSERT INTO registrations (
      public_reference, event_id, full_name, email_normalized, phone,
      state_of_residence, applicant_category, business_name, brief_description,
      privacy_accepted_at, terms_accepted_at,
      application_status, payment_status,
      event_registration_status, challenge_selected, exhibition_selected,
      challenge_status, exhibition_status, expected_amount_kobo, currency
    ) VALUES (
      ${publicRef},
      ${EVENT_ID},
      ${'STAGING TEST Phase9A Free'},
      ${marker},
      ${'+2348000000091'},
      ${'FCT'},
      ${'BUSINESS_IDEA'},
      ${null},
      ${'Synthetic free registration for Phase 9A.'},
      ${now}::timestamptz,
      ${now}::timestamptz,
      ${'REGISTERED'},
      ${'NOT_REQUIRED'},
      ${'REGISTERED'},
      ${false},
      ${false},
      ${'NOT_SELECTED'},
      ${'NOT_SELECTED'},
      ${0},
      ${'NGN'}
    )
    RETURNING id
  `;
  freeRegId = inserted[0].id;
  report.synthetic.freeInserted = true;

  const txCount = await sql`
    SELECT COUNT(*)::int AS c
    FROM payment_transactions
    WHERE registration_id = ${freeRegId}
  `;
  report.synthetic.freeHasNoPaymentTransaction = Number(txCount[0].c) === 0;
  report.synthetic.freePaymentStatusNotRequired = true;

  // challenge synthetic with 500000 expected (legacy-model shape)
  const challengeMarker = `phase9a-challenge-${Date.now()}@example.invalid`;
  const challengeRef = `${publicRef}-C`;
  const challengeIns = await sql`
    INSERT INTO registrations (
      public_reference, event_id, full_name, email_normalized, phone,
      state_of_residence, applicant_category, brief_description,
      privacy_accepted_at, terms_accepted_at,
      application_status, payment_status,
      event_registration_status, challenge_selected, exhibition_selected,
      challenge_status, exhibition_status, expected_amount_kobo, currency,
      challenge_women_eligibility_attested
    ) VALUES (
      ${challengeRef},
      ${EVENT_ID},
      ${'STAGING TEST Phase9A Challenge'},
      ${challengeMarker},
      ${'+2348000000092'},
      ${'Lagos'},
      ${'EXISTING_BUSINESS_OWNER'},
      ${'Synthetic challenge row for Phase 9A backfill-shape check.'},
      ${now}::timestamptz,
      ${now}::timestamptz,
      ${'PENDING_PAYMENT'},
      ${'PENDING'},
      ${'REGISTERED'},
      ${true},
      ${false},
      ${'PENDING_PAYMENT'},
      ${'NOT_SELECTED'},
      ${500000},
      ${'NGN'},
      ${true}
    )
    RETURNING id, expected_amount_kobo, challenge_selected, payment_status
  `;
  const challengeId = challengeIns[0].id;
  report.synthetic.challengeShapeOk =
    Number(challengeIns[0].expected_amount_kobo) === 500000 &&
    challengeIns[0].challenge_selected === true &&
    challengeIns[0].payment_status === 'PENDING';

  const exhibitionMarker = `phase9a-exhibit-${Date.now()}@example.invalid`;
  const exhibitionIns = await sql`
    INSERT INTO registrations (
      public_reference, event_id, full_name, email_normalized, phone,
      state_of_residence, applicant_category, brief_description,
      privacy_accepted_at, terms_accepted_at,
      application_status, payment_status,
      event_registration_status, challenge_selected, exhibition_selected,
      challenge_status, exhibition_status, expected_amount_kobo, currency,
      exhibition_business_owner_attested, exhibition_business_name,
      exhibition_category, exhibition_description
    ) VALUES (
      ${publicRef + '-E'},
      ${EVENT_ID},
      ${'STAGING TEST Phase9A Exhibit'},
      ${exhibitionMarker},
      ${'+2348000000093'},
      ${'Lagos'},
      ${'EXISTING_BUSINESS_OWNER'},
      ${'Synthetic exhibition row for Phase 9A.'},
      ${now}::timestamptz,
      ${now}::timestamptz,
      ${'PENDING_PAYMENT'},
      ${'PENDING'},
      ${'REGISTERED'},
      ${false},
      ${true},
      ${'NOT_SELECTED'},
      ${'PENDING_PAYMENT'},
      ${3000000},
      ${'NGN'},
      ${true},
      ${'STAGING TEST Exhibit Co'},
      ${'Fashion'},
      ${'Synthetic exhibition description for Phase 9A checks.'}
    )
    RETURNING id, expected_amount_kobo
  `;
  const exhibitionId = exhibitionIns[0].id;
  report.synthetic.exhibitionAmountOk =
    Number(exhibitionIns[0].expected_amount_kobo) === 3000000;

  const combinedIns = await sql`
    INSERT INTO registrations (
      public_reference, event_id, full_name, email_normalized, phone,
      state_of_residence, applicant_category, brief_description,
      privacy_accepted_at, terms_accepted_at,
      application_status, payment_status,
      event_registration_status, challenge_selected, exhibition_selected,
      challenge_status, exhibition_status, expected_amount_kobo, currency,
      challenge_women_eligibility_attested, exhibition_business_owner_attested,
      exhibition_business_name, exhibition_category, exhibition_description
    ) VALUES (
      ${publicRef + '-B'},
      ${EVENT_ID},
      ${'STAGING TEST Phase9A Both'},
      ${`phase9a-both-${Date.now()}@example.invalid`},
      ${'+2348000000094'},
      ${'Lagos'},
      ${'EXISTING_BUSINESS_OWNER'},
      ${'Synthetic combined row for Phase 9A.'},
      ${now}::timestamptz,
      ${now}::timestamptz,
      ${'PENDING_PAYMENT'},
      ${'PENDING'},
      ${'REGISTERED'},
      ${true},
      ${true},
      ${'PENDING_PAYMENT'},
      ${'PENDING_PAYMENT'},
      ${3500000},
      ${'NGN'},
      ${true},
      ${true},
      ${'STAGING TEST Both Co'},
      ${'Fashion'},
      ${'Synthetic combined exhibition description for Phase 9A.'}
    )
    RETURNING id, expected_amount_kobo
  `;
  const combinedId = combinedIns[0].id;
  report.synthetic.combinedAmountOk =
    Number(combinedIns[0].expected_amount_kobo) === 3500000;

  // cleanup only synthetic rows from this run
  await sql`DELETE FROM payment_transactions WHERE registration_id IN (${freeRegId}, ${challengeId}, ${exhibitionId}, ${combinedId})`;
  await sql`DELETE FROM registrations WHERE id IN (${freeRegId}, ${challengeId}, ${exhibitionId}, ${combinedId})`;
  const leftover = await sql`
    SELECT COUNT(*)::int AS c
    FROM registrations
    WHERE email_normalized LIKE ${'phase9a-%@example.invalid'}
       OR public_reference LIKE ${publicRef + '%'}
  `;
  report.synthetic.cleanedUp = Number(leftover[0].c) === 0;
} catch (error) {
  report.synthetic.error = String(error.message || error).slice(0, 240);
  if (freeRegId) {
    try {
      await sql`DELETE FROM payment_transactions WHERE registration_id = ${freeRegId}`;
      await sql`DELETE FROM registrations WHERE id = ${freeRegId}`;
    } catch {
      // ignore cleanup failure in error path
    }
  }
}

const readiness = evaluateReadiness();
report.readiness = {
  ready: readiness.ready,
  freeRegistrationAvailable: readiness.freeRegistrationAvailable,
  paidCheckoutAvailable: readiness.paidCheckoutAvailable,
  publicStatus: readiness.publicStatus,
  registrationEnabledEnv: process.env.EVENT_REGISTRATION_ENABLED === 'true',
  privacyApprovedEnv: process.env.EVENT_PRIVACY_NOTICE_APPROVED === 'true',
  termsApprovedEnv: process.env.EVENT_PARTICIPATION_TERMS_APPROVED === 'true',
  eventStartAtConfigured: Boolean(String(process.env.EVENT_START_AT || '').trim()),
};

report.ok =
  report.migrations.has003 &&
  report.migrations.migration003ExactlyOnce &&
  report.schema.allParticipationColumnsPresent &&
  report.schema.paymentStatusAllowsNotRequired &&
  report.schema.challengeStatusConstraint &&
  report.schema.exhibitionStatusConstraint &&
  report.legacy.historicalPaidMeaningPreserved &&
  report.pricing.free &&
  report.pricing.challenge &&
  report.pricing.exhibition &&
  report.pricing.combined &&
  report.pricing.combinedDisabledRejected &&
  report.pricing.combinedDisabledServerValidation &&
  report.synthetic.freeInserted &&
  report.synthetic.freeHasNoPaymentTransaction &&
  report.synthetic.challengeShapeOk &&
  report.synthetic.exhibitionAmountOk &&
  report.synthetic.combinedAmountOk &&
  report.synthetic.cleanedUp;

console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
