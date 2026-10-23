-- Allow email_deliveries without a registration (contact, membership, broadcasts).
ALTER TABLE email_deliveries
  ALTER COLUMN registration_id DROP NOT NULL;
