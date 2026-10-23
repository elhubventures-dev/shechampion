#!/usr/bin/env node
/** Admin view of Phase 9C email-remediation synthetics. No secrets/PII. */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const API = 'http://127.0.0.1:3001';
const ORIGIN = 'http://localhost:5173';

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

const password = process.env.ADMIN_PASSWORD;
if (!password) {
  console.log(JSON.stringify({ ok: false, skipped: true, reason: 'ADMIN_PASSWORD absent' }));
  process.exit(0);
}

const login = await fetch(`${API}/api/admin/login`, {
  method: 'POST',
  headers: { Origin: ORIGIN, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: process.env.ADMIN_EMAIL, password }),
});
const setCookie = login.headers.getSetCookie?.() || [];
const cookie = setCookie.map((c) => c.split(';')[0]).join('; ');
const list = await fetch(`${API}/api/admin/registrations?pageSize=100&q=P9C`, {
  headers: { Origin: ORIGIN, Cookie: cookie },
});
const json = await list.json();
const rows = (json.registrations || []).filter((r) =>
  String(r.full_name || '').includes('STAGING TEST P9C')
);
console.log(
  JSON.stringify(
    {
      ok: login.status === 200 && rows.length > 0,
      loginOk: login.status === 200,
      rows: rows.map((r) => ({
        publicReference: r.public_reference,
        eventRegistrationStatus: r.event_registration_status,
        paymentStatus: r.payment_status,
        challengeSelected: r.challenge_selected,
        exhibitionSelected: r.exhibition_selected,
        challengeStatus: r.challenge_status,
        exhibitionStatus: r.exhibition_status,
        expectedAmountKobo: r.expected_amount_kobo,
        emailStatus: r.email_status || r.confirmation_email_status || null,
      })),
    },
    null,
    2
  )
);
