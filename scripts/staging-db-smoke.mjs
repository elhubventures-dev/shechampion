#!/usr/bin/env node
/**
 * Optional staging DB smoke checks. Requires the same safeguards as migrate:staging.
 * Never prints connection strings or row PII.
 */
import { neon } from '@neondatabase/serverless';

const appEnv = String(process.env.APP_ENV || '').trim().toLowerCase();
const allowStaging = process.env.ALLOW_STAGING_MIGRATE === 'true';
const url = String(
  process.env.STAGING_DATABASE_URL || process.env.DATABASE_URL || ''
).trim();

if (appEnv !== 'staging' || !allowStaging || !url) {
  console.error(
    'staging-db-smoke requires APP_ENV=staging, ALLOW_STAGING_MIGRATE=true, and STAGING_DATABASE_URL.'
  );
  process.exit(1);
}
if (/(^|[_\-./])prod(uction)?([_\-./?]|$)/i.test(url)) {
  console.error('Refusing smoke check against a production-looking database URL.');
  process.exit(1);
}

const sql = neon(url);
await sql`SELECT 1 AS ok`;

const required = [
  'registrations',
  'payment_transactions',
  'webhook_events',
  'email_deliveries',
  'rate_limits',
  'admin_sessions',
  'admin_audit_events',
  'schema_migrations',
];

const tables = await sql`
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
`;
const names = new Set(tables.map((r) => r.table_name));
const missing = required.filter((t) => !names.has(t));
if (missing.length) {
  console.error(`Missing tables: ${missing.join(', ')}`);
  process.exit(1);
}

const migrations = await sql`SELECT id FROM schema_migrations ORDER BY id`;
const ids = migrations.map((r) => r.id);

const indexes = await sql`
  SELECT indexname
  FROM pg_indexes
  WHERE schemaname = 'public'
`;
const indexNames = indexes.map((r) => r.indexname);
const expectIndexHints = [
  'registrations_event_id_email_normalized',
  'payment_transactions_payment_reference',
  'idx_registrations_event_idempotency',
];
const indexPresence = Object.fromEntries(
  expectIndexHints.map((hint) => [
    hint,
    indexNames.some((n) => n.includes(hint.replace(/_/g, '')) || n.includes(hint)),
  ])
);

console.log(
  JSON.stringify(
    {
      ok: true,
      connected: true,
      migrationsApplied: ids,
      requiredTablesPresent: missing.length === 0,
      indexHints: indexPresence,
    },
    null,
    2
  )
);
