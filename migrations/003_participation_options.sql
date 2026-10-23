-- Phase 8: free event registration + optional paid participation options.
-- Additive only. Apply manually (see docs/backend-setup.md / Phase 8 report).
-- Do not auto-apply to production.
--
-- Existing rows are preserved. Historical SUCCESS / pending paid records are
-- backfilled as challenge participation at ₦5,000 (500000 kobo), not as free
-- general-only registrations.

-- ---------------------------------------------------------------------------
-- New columns on registrations
-- ---------------------------------------------------------------------------

ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS event_registration_status TEXT,
  ADD COLUMN IF NOT EXISTS challenge_selected BOOLEAN,
  ADD COLUMN IF NOT EXISTS exhibition_selected BOOLEAN,
  ADD COLUMN IF NOT EXISTS challenge_status TEXT,
  ADD COLUMN IF NOT EXISTS exhibition_status TEXT,
  ADD COLUMN IF NOT EXISTS expected_amount_kobo INTEGER,
  ADD COLUMN IF NOT EXISTS currency TEXT,
  ADD COLUMN IF NOT EXISTS challenge_women_eligibility_attested BOOLEAN,
  ADD COLUMN IF NOT EXISTS challenge_eligibility_attested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS exhibition_business_owner_attested BOOLEAN,
  ADD COLUMN IF NOT EXISTS exhibition_owner_attested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS exhibition_business_name TEXT,
  ADD COLUMN IF NOT EXISTS exhibition_category TEXT,
  ADD COLUMN IF NOT EXISTS exhibition_description TEXT;

-- Defaults for any nulls before constraints (new installs + legacy rows)
UPDATE registrations
SET
  event_registration_status = COALESCE(event_registration_status, 'REGISTERED'),
  challenge_selected = COALESCE(challenge_selected, false),
  exhibition_selected = COALESCE(exhibition_selected, false),
  challenge_status = COALESCE(challenge_status, 'NOT_SELECTED'),
  exhibition_status = COALESCE(exhibition_status, 'NOT_SELECTED'),
  expected_amount_kobo = COALESCE(expected_amount_kobo, 0),
  currency = COALESCE(currency, 'NGN'),
  challenge_women_eligibility_attested = COALESCE(
    challenge_women_eligibility_attested,
    false
  ),
  exhibition_business_owner_attested = COALESCE(
    exhibition_business_owner_attested,
    false
  )
WHERE
  event_registration_status IS NULL
  OR challenge_selected IS NULL
  OR exhibition_selected IS NULL
  OR challenge_status IS NULL
  OR exhibition_status IS NULL
  OR expected_amount_kobo IS NULL
  OR currency IS NULL
  OR challenge_women_eligibility_attested IS NULL
  OR exhibition_business_owner_attested IS NULL;

-- ---------------------------------------------------------------------------
-- Historical backfill: prior model was a single ₦5,000 challenge fee.
-- Do NOT treat legacy unpaid/paid rows as free-only registrations.
-- ---------------------------------------------------------------------------

UPDATE registrations
SET
  challenge_selected = true,
  challenge_women_eligibility_attested = true,
  challenge_eligibility_attested_at = COALESCE(
    challenge_eligibility_attested_at,
    privacy_accepted_at,
    created_at
  ),
  expected_amount_kobo = 500000,
  currency = 'NGN',
  event_registration_status = CASE
    WHEN application_status = 'WITHDRAWN' THEN 'WITHDRAWN'
    ELSE 'REGISTERED'
  END,
  challenge_status = CASE
    WHEN payment_status = 'SUCCESS' AND application_status = 'UNDER_REVIEW' THEN 'UNDER_REVIEW'
    WHEN payment_status = 'SUCCESS' AND application_status = 'SHORTLISTED' THEN 'SHORTLISTED'
    WHEN payment_status = 'SUCCESS' AND application_status = 'NOT_SHORTLISTED' THEN 'NOT_SHORTLISTED'
    WHEN payment_status = 'SUCCESS' THEN 'CONFIRMED'
    WHEN payment_status = 'REVERSED' THEN 'REVERSED'
    WHEN application_status = 'WITHDRAWN' THEN 'CANCELLED'
    ELSE 'PENDING_PAYMENT'
  END
WHERE
  challenge_selected = false
  AND exhibition_selected = false
  AND (
    payment_status IN ('SUCCESS', 'PENDING', 'FAILED', 'INITIALIZATION_FAILED', 'REVERSED')
    OR application_status = 'PENDING_PAYMENT'
    OR EXISTS (
      SELECT 1
      FROM payment_transactions pt
      WHERE pt.registration_id = registrations.id
    )
  );

-- Expand payment_status to include NOT_REQUIRED (free registrations).
ALTER TABLE registrations
  DROP CONSTRAINT IF EXISTS registrations_payment_status_check;

ALTER TABLE registrations
  ADD CONSTRAINT registrations_payment_status_check
  CHECK (
    payment_status IN (
      'NOT_REQUIRED',
      'PENDING',
      'INITIALIZATION_FAILED',
      'SUCCESS',
      'FAILED',
      'REVERSED'
    )
  );

-- application_status: allow REGISTERED without requiring PENDING_PAYMENT first.
-- Existing values retained; free registrations use REGISTERED with payment NOT_REQUIRED.

ALTER TABLE registrations
  ALTER COLUMN event_registration_status SET DEFAULT 'REGISTERED',
  ALTER COLUMN challenge_selected SET DEFAULT false,
  ALTER COLUMN exhibition_selected SET DEFAULT false,
  ALTER COLUMN challenge_status SET DEFAULT 'NOT_SELECTED',
  ALTER COLUMN exhibition_status SET DEFAULT 'NOT_SELECTED',
  ALTER COLUMN expected_amount_kobo SET DEFAULT 0,
  ALTER COLUMN currency SET DEFAULT 'NGN',
  ALTER COLUMN challenge_women_eligibility_attested SET DEFAULT false,
  ALTER COLUMN exhibition_business_owner_attested SET DEFAULT false;

ALTER TABLE registrations
  ALTER COLUMN event_registration_status SET NOT NULL,
  ALTER COLUMN challenge_selected SET NOT NULL,
  ALTER COLUMN exhibition_selected SET NOT NULL,
  ALTER COLUMN challenge_status SET NOT NULL,
  ALTER COLUMN exhibition_status SET NOT NULL,
  ALTER COLUMN expected_amount_kobo SET NOT NULL,
  ALTER COLUMN currency SET NOT NULL,
  ALTER COLUMN challenge_women_eligibility_attested SET NOT NULL,
  ALTER COLUMN exhibition_business_owner_attested SET NOT NULL;

ALTER TABLE registrations
  DROP CONSTRAINT IF EXISTS registrations_event_registration_status_check;

ALTER TABLE registrations
  ADD CONSTRAINT registrations_event_registration_status_check
  CHECK (
    event_registration_status IN ('REGISTERED', 'INVALID', 'WITHDRAWN')
  );

ALTER TABLE registrations
  DROP CONSTRAINT IF EXISTS registrations_challenge_status_check;

ALTER TABLE registrations
  ADD CONSTRAINT registrations_challenge_status_check
  CHECK (
    challenge_status IN (
      'NOT_SELECTED',
      'PENDING_PAYMENT',
      'CONFIRMED',
      'UNDER_REVIEW',
      'SHORTLISTED',
      'NOT_SHORTLISTED',
      'CANCELLED',
      'REVERSED'
    )
  );

ALTER TABLE registrations
  DROP CONSTRAINT IF EXISTS registrations_exhibition_status_check;

ALTER TABLE registrations
  ADD CONSTRAINT registrations_exhibition_status_check
  CHECK (
    exhibition_status IN (
      'NOT_SELECTED',
      'PENDING_PAYMENT',
      'CONFIRMED',
      'CANCELLED',
      'REVERSED'
    )
  );

ALTER TABLE registrations
  DROP CONSTRAINT IF EXISTS registrations_currency_check;

ALTER TABLE registrations
  ADD CONSTRAINT registrations_currency_check
  CHECK (currency = 'NGN');

ALTER TABLE registrations
  DROP CONSTRAINT IF EXISTS registrations_expected_amount_nonneg;

ALTER TABLE registrations
  ADD CONSTRAINT registrations_expected_amount_nonneg
  CHECK (expected_amount_kobo >= 0);

CREATE INDEX IF NOT EXISTS idx_registrations_challenge_status
  ON registrations (challenge_status);

CREATE INDEX IF NOT EXISTS idx_registrations_exhibition_status
  ON registrations (exhibition_status);

CREATE INDEX IF NOT EXISTS idx_registrations_challenge_selected
  ON registrations (challenge_selected)
  WHERE challenge_selected = true;

CREATE INDEX IF NOT EXISTS idx_registrations_exhibition_selected
  ON registrations (exhibition_selected)
  WHERE exhibition_selected = true;

CREATE INDEX IF NOT EXISTS idx_registrations_expected_amount
  ON registrations (expected_amount_kobo);

INSERT INTO schema_migrations (id)
VALUES ('003_participation_options')
ON CONFLICT (id) DO NOTHING;
