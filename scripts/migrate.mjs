#!/usr/bin/env node
/**
 * Apply SQL migrations from ./migrations.
 *
 * Staging (required for non-production work):
 *   APP_ENV=staging
 *   ALLOW_STAGING_MIGRATE=true
 *   STAGING_DATABASE_URL=postgres://...   (preferred)
 *   # or DATABASE_URL only when APP_ENV=staging and ALLOW_STAGING_MIGRATE=true
 *   npm run migrate:staging
 *
 * Production (explicit only — never use for Phase 7 staging):
 *   ALLOW_PRODUCTION_MIGRATE=true
 *   DATABASE_URL=...
 *   npm run migrate
 *
 * Never prints connection strings.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

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

const appEnv = String(process.env.APP_ENV || '').trim().toLowerCase();
const vercelEnv = String(process.env.VERCEL_ENV || '').trim().toLowerCase();
const allowStaging = process.env.ALLOW_STAGING_MIGRATE === 'true';
const allowProduction = process.env.ALLOW_PRODUCTION_MIGRATE === 'true';
const stagingUrl = String(process.env.STAGING_DATABASE_URL || '').trim();
const databaseUrl = String(process.env.DATABASE_URL || '').trim();
const paystackMode = String(process.env.PAYSTACK_MODE || '').trim().toLowerCase();
const paystackKey = String(process.env.PAYSTACK_SECRET_KEY || '').trim();

function looksProductionNamed(url) {
  return /(^|[_\-./])prod(uction)?([_\-./?]|$)/i.test(url);
}

function resolveTarget() {
  if (allowProduction) {
    if (!databaseUrl) {
      console.error('ALLOW_PRODUCTION_MIGRATE=true requires DATABASE_URL.');
      process.exit(1);
    }
    if (appEnv === 'staging') {
      console.error('Refusing production migrate while APP_ENV=staging.');
      process.exit(1);
    }
    return { kind: 'production', url: databaseUrl };
  }

  if (vercelEnv === 'production' && !allowProduction) {
    console.error(
      'Refusing to migrate while VERCEL_ENV=production without ALLOW_PRODUCTION_MIGRATE=true.'
    );
    process.exit(1);
  }

  if (!allowStaging || appEnv !== 'staging') {
    console.error(
      [
        'Staging migrations require all of:',
        '  APP_ENV=staging',
        '  ALLOW_STAGING_MIGRATE=true',
        '  STAGING_DATABASE_URL (preferred) or DATABASE_URL',
        'For production only: ALLOW_PRODUCTION_MIGRATE=true DATABASE_URL=... npm run migrate',
      ].join('\n')
    );
    process.exit(1);
  }

  const url = stagingUrl || databaseUrl;
  if (!url) {
    console.error('STAGING_DATABASE_URL (or DATABASE_URL) is required for staging migrate.');
    process.exit(1);
  }
  if (!/^postgres(ql)?:\/\//i.test(url)) {
    console.error('Database URL must use a postgres scheme.');
    process.exit(1);
  }
  if (looksProductionNamed(url)) {
    console.error(
      'Refusing staging migrate: database URL name suggests production. Use an explicitly designated staging database.'
    );
    process.exit(1);
  }
  if (paystackMode === 'live' || paystackKey.toLowerCase().startsWith('sk_live_')) {
    console.error(
      'Refusing staging migrate while live Paystack credentials/mode are loaded in this environment.'
    );
    process.exit(1);
  }

  return { kind: 'staging', url };
}

function splitSqlStatements(sqlText) {
  const withoutBlockComments = sqlText.replace(/\/\*[\s\S]*?\*\//g, '');
  const lines = withoutBlockComments.split('\n').map((line) => {
    const idx = line.indexOf('--');
    if (idx === -1) return line;
    return line.slice(0, idx);
  });
  const cleaned = lines.join('\n');
  return cleaned
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
}

const target = resolveTarget();
console.log(`Migration target kind: ${target.kind}`);
console.log('Connection string: [redacted]');

const sql = neon(target.url);
const dir = join(root, 'migrations');
const files = readdirSync(dir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

await sql`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;

for (const file of files) {
  const id = file.replace(/\.sql$/, '');
  const applied = await sql`SELECT id FROM schema_migrations WHERE id = ${id}`;
  if (applied.length) {
    console.log(`skip ${file}`);
    continue;
  }

  const body = readFileSync(join(dir, file), 'utf8');
  const statements = splitSqlStatements(body);
  for (const statement of statements) {
    if (/INSERT\s+INTO\s+schema_migrations/i.test(statement)) continue;
    await sql.query(statement);
  }

  await sql`INSERT INTO schema_migrations (id) VALUES (${id}) ON CONFLICT (id) DO NOTHING`;
  console.log(`applied ${file}`);
}

console.log('Migrations complete.');
