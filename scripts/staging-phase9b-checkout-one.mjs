#!/usr/bin/env node
/**
 * Create one challenge registration for browser Paystack TEST checkout.
 * Prints only non-secret fields (reference + checkout URL host).
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

const stamp = Date.now().toString(36);
const body = {
  fullName: 'STAGING TEST P9B BrowserCheckout',
  email: `phase9b.browser.${stamp}@example.com`,
  phone: '+2348011110001',
  stateOfResidence: 'FCT',
  applicantCategory: 'EXISTING_BUSINESS_OWNER',
  briefDescription: 'Synthetic Phase 9B browser checkout for challenge participation.',
  privacyAccepted: true,
  termsAccepted: true,
  challengeSelected: true,
  challengeWomenEligibilityAttested: true,
};

const r = await fetch('http://127.0.0.1:3001/api/registration/create', {
  method: 'POST',
  headers: {
    Origin: 'http://localhost:5173',
    'Content-Type': 'application/json',
    'X-Idempotency-Key': `p9b-browser-${stamp}`,
  },
  body: JSON.stringify(body),
});
const j = await r.json();
let checkoutHost = null;
try {
  checkoutHost = j.checkoutUrl ? new URL(j.checkoutUrl).host : null;
} catch {
  checkoutHost = null;
}
console.log(
  JSON.stringify(
    {
      status: r.status,
      ok: j.ok,
      publicReference: j.publicReference,
      expectedAmountKobo: j.expectedAmountKobo,
      checkoutHost,
      checkoutUrl: j.checkoutUrl || null,
      email: body.email,
    },
    null,
    2
  )
);
