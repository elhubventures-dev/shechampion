#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyPassword } from '../api/_lib/crypto.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const eq = trimmed.indexOf('=');
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

const email = String(process.env.ADMIN_EMAIL || '')
  .trim()
  .toLowerCase();
const hash = String(process.env.ADMIN_PASSWORD_HASH || '');
const passPath = join(root, '.admin-password.local.txt');
const passFile = existsSync(passPath) ? readFileSync(passPath, 'utf8') : '';
const match = passFile.match(/^Password:\s*(.+)$/m);
const password = match ? match[1].trim() : '';

console.log(
  JSON.stringify(
    {
      adminEmailConfigured: Boolean(email),
      adminEmailIsExpected: email === 'info@shechampion-bbf.org',
      hashPresent: Boolean(hash),
      hashLooksScrypt: hash.startsWith('scrypt$'),
      passwordFilePresent: Boolean(password),
      passwordVerifiesAgainstHash: password ? verifyPassword(password, hash) : false,
      databaseUrlPresent: Boolean(
        process.env.DATABASE_URL || process.env.STAGING_DATABASE_URL
      ),
      sessionSecretLength: String(process.env.SESSION_SECRET || '').length,
      publicSiteUrlSet: Boolean(process.env.PUBLIC_SITE_URL),
      appEnv: process.env.APP_ENV || null,
    },
    null,
    2
  )
);
