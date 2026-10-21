-- SHE CHAMPIONS Business Empowerment Challenge 2026
-- Registration, payments, rate limits, email delivery, admin audit.
-- Apply manually (see docs/backend-setup.md). Do not auto-apply to production.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_reference TEXT NOT NULL UNIQUE,
  event_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email_normalized TEXT NOT NULL,
  phone TEXT NOT NULL,
  state_of_residence TEXT NOT NULL,
  applicant_category TEXT NOT NULL
    CHECK (applicant_category IN (
      'EXISTING_BUSINESS_OWNER',
      'VOCATIONAL_OR_PROFESSIONAL_SKILL',
      'BUSINESS_IDEA'
    )),
  business_name TEXT,
  brief_description TEXT NOT NULL,
  privacy_accepted_at TIMESTAMPTZ NOT NULL,
  terms_accepted_at TIMESTAMPTZ NOT NULL,
  application_status TEXT NOT NULL DEFAULT 'PENDING_PAYMENT'
    CHECK (application_status IN (
      'PENDING_PAYMENT',
      'REGISTERED',
      'UNDER_REVIEW',
      'SHORTLISTED',
      'NOT_SHORTLISTED',
      'WITHDRAWN'
    )),
  payment_status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (payment_status IN (
      'PENDING',
      'INITIALIZATION_FAILED',
      'SUCCESS',
      'FAILED',
      'REVERSED'
    )),
  access_token_hash TEXT,
  idempotency_key_hash TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, email_normalized)
);

CREATE INDEX IF NOT EXISTS idx_registrations_event_created
  ON registrations (event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_registrations_payment_status
  ON registrations (payment_status);
CREATE INDEX IF NOT EXISTS idx_registrations_application_status
  ON registrations (application_status);
CREATE INDEX IF NOT EXISTS idx_registrations_full_name
  ON registrations (full_name);

CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES registrations (id) ON DELETE RESTRICT,
  payment_reference TEXT NOT NULL UNIQUE,
  provider_transaction_id TEXT,
  amount_kobo INTEGER NOT NULL,
  currency TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'paystack',
  payment_mode TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN (
      'PENDING',
      'INITIALIZATION_FAILED',
      'SUCCESS',
      'FAILED',
      'REVERSED'
    )),
  verified_at TIMESTAMPTZ,
  provider_init_response JSONB,
  provider_verify_response JSONB,
  provider_webhook_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_registration
  ON payment_transactions (registration_id, created_at DESC);

CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  event_key TEXT NOT NULL,
  event_type TEXT,
  payment_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, event_key)
);

CREATE TABLE IF NOT EXISTS email_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES registrations (id) ON DELETE RESTRICT,
  email_type TEXT NOT NULL,
  to_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'SENT', 'FAILED')),
  provider_message_id TEXT,
  last_error TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_deliveries_registration
  ON email_deliveries (registration_id, email_type);

CREATE TABLE IF NOT EXISTS rate_limits (
  bucket_key TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL,
  hit_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token_hash TEXT NOT NULL UNIQUE,
  admin_email TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires
  ON admin_sessions (expires_at);

CREATE TABLE IF NOT EXISTS admin_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_email TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  detail JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_created
  ON admin_audit_events (created_at DESC);

INSERT INTO schema_migrations (id)
VALUES ('001_init')
ON CONFLICT (id) DO NOTHING;
