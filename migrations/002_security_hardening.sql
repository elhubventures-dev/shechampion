-- Phase 6: concurrency / idempotency helpers.
-- Apply manually. Do not auto-apply to production.

CREATE UNIQUE INDEX IF NOT EXISTS idx_registrations_event_idempotency
  ON registrations (event_id, idempotency_key_hash)
  WHERE idempotency_key_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_transactions_status
  ON payment_transactions (status);

CREATE INDEX IF NOT EXISTS idx_webhook_events_reference
  ON webhook_events (payment_reference);

INSERT INTO schema_migrations (id)
VALUES ('002_security_hardening')
ON CONFLICT (id) DO NOTHING;
