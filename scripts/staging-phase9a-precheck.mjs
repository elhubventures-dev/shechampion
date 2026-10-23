#!/usr/bin/env node
/**
 * Phase 9A pre-migration inspection. Never prints secrets/URLs/PII.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';

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

const sql = neon(url);
const migrations = await sql`SELECT id FROM schema_migrations ORDER BY id`;
const cols = await sql`
  SELECT column_name
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'registrations'
`;
const has003Cols = cols.some((c) => c.column_name === 'challenge_selected');
const counts = await sql`
  SELECT
    COUNT(*)::int AS total,
    COUNT(*) FILTER (WHERE payment_status = 'SUCCESS')::int AS success,
    COUNT(*) FILTER (WHERE payment_status = 'PENDING')::int AS pending,
    COUNT(*) FILTER (WHERE application_status = 'PENDING_PAYMENT')::int AS pending_payment_app,
    COUNT(*) FILTER (WHERE application_status = 'REGISTERED')::int AS registered_app
  FROM registrations
`;

console.log(
  JSON.stringify(
    {
      urlsMatch:
        Boolean(stagingUrl) && Boolean(databaseUrl) && stagingUrl === databaseUrl,
      allowProductionMigrate: process.env.ALLOW_PRODUCTION_MIGRATE === 'true',
      registrationEnabled: process.env.EVENT_REGISTRATION_ENABLED === 'true',
      migrationsBefore: migrations.map((m) => m.id),
      participationColumnsPresentBefore: has003Cols,
      registrationCountsBefore: counts[0],
      safeToMigrate:
        appEnv === 'staging' &&
        allow &&
        process.env.ALLOW_PRODUCTION_MIGRATE !== 'true',
    },
    null,
    2
  )
);
