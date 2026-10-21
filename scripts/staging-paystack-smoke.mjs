#!/usr/bin/env node
/**
 * Smoke-check Paystack TEST credentials without opening registration
 * or creating applicant/payment records. Never prints the secret key.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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

const report = {
  ok: false,
  secretsPrinted: false,
  mode: String(process.env.PAYSTACK_MODE || '').toLowerCase() || null,
  keyClass: null,
  registrationEnabled: process.env.EVENT_REGISTRATION_ENABLED === 'true',
  paystackApi: null,
  blockers: [],
};

const key = String(process.env.PAYSTACK_SECRET_KEY || '').trim();
if (!key) {
  report.blockers.push('PAYSTACK_SECRET_KEY absent');
} else if (key.toLowerCase().startsWith('sk_live_')) {
  report.keyClass = 'live_rejected';
  report.blockers.push('Live Paystack key refused in staging smoke');
} else if (key.toLowerCase().startsWith('sk_test_')) {
  report.keyClass = 'test';
} else {
  report.keyClass = 'unknown_prefix';
  report.blockers.push('PAYSTACK_SECRET_KEY is not sk_test_');
}

if (report.mode !== 'test') {
  report.blockers.push('PAYSTACK_MODE must be test');
}

if (report.registrationEnabled) {
  report.blockers.push(
    'EVENT_REGISTRATION_ENABLED is true — refuse smoke while public registration is open unexpectedly'
  );
}

if (report.blockers.length) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(2);
}

const response = await fetch('https://api.paystack.co/bank?country=nigeria&perPage=1', {
  headers: {
    Authorization: `Bearer ${key}`,
    Accept: 'application/json',
  },
});
const payload = await response.json().catch(() => ({}));

report.paystackApi = {
  httpStatus: response.status,
  providerStatus: Boolean(payload.status),
  message: typeof payload.message === 'string' ? payload.message.slice(0, 120) : null,
};

report.ok = response.ok && payload.status === true;
if (!report.ok) {
  report.blockers.push('Paystack TEST API did not accept the key');
}

console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
