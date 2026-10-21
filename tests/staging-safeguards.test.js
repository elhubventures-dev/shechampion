import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function runMigrate(env) {
  return spawnSync(process.execPath, ['scripts/migrate.mjs'], {
    cwd: root,
    env: { ...process.env, ...env },
    encoding: 'utf8',
  });
}

describe('staging migration safeguards', () => {
  it('refuses migrate without staging or production authorization', () => {
    const result = runMigrate({
      APP_ENV: '',
      ALLOW_STAGING_MIGRATE: 'false',
      ALLOW_PRODUCTION_MIGRATE: 'false',
      STAGING_DATABASE_URL: '',
      DATABASE_URL: 'postgres://example/db',
      VERCEL_ENV: '',
    });
    expect(result.status).not.toBe(0);
    expect(result.stderr + result.stdout).toMatch(/ALLOW_STAGING_MIGRATE|Staging migrations require/i);
  });

  it('refuses staging migrate against a production-looking URL name', () => {
    const result = runMigrate({
      APP_ENV: 'staging',
      ALLOW_STAGING_MIGRATE: 'true',
      ALLOW_PRODUCTION_MIGRATE: 'false',
      STAGING_DATABASE_URL: 'postgres://u:p@host/shechampions_production',
      DATABASE_URL: '',
      PAYSTACK_MODE: 'test',
      PAYSTACK_SECRET_KEY: 'sk_test_x',
      VERCEL_ENV: '',
    });
    expect(result.status).not.toBe(0);
    expect(result.stderr + result.stdout).toMatch(/production/i);
  });

  it('refuses staging migrate when live Paystack mode is loaded', () => {
    const result = runMigrate({
      APP_ENV: 'staging',
      ALLOW_STAGING_MIGRATE: 'true',
      ALLOW_PRODUCTION_MIGRATE: 'false',
      STAGING_DATABASE_URL: 'postgres://u:p@host/shechampions_staging',
      DATABASE_URL: '',
      PAYSTACK_MODE: 'live',
      PAYSTACK_SECRET_KEY: 'sk_test_x',
      VERCEL_ENV: '',
    });
    expect(result.status).not.toBe(0);
    expect(result.stderr + result.stdout).toMatch(/live Paystack/i);
  });
});
