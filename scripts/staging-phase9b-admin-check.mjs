#!/usr/bin/env node
/**
 * Phase 9B admin list/detail/CSV checks. Requires ADMIN_PASSWORD in env.
 * Never prints secrets or cookies.
 */
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

const report = { ok: false, secretsPrinted: false };
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
if (!password) {
  console.log(
    JSON.stringify({
      ok: false,
      skipped: true,
      reason: 'ADMIN_PASSWORD absent from env (hash-only setup)',
    })
  );
  process.exit(0);
}

const login = await fetch(`${API}/api/admin/session`, {
  method: 'POST',
  headers: { Origin: ORIGIN, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
const setCookie = login.headers.getSetCookie?.() || [];
const cookie = setCookie.map((c) => c.split(';')[0]).join('; ');
const csrf = decodeURIComponent(
  (cookie.match(/sc_admin_csrf=([^;]+)/) || [])[1] || ''
);
report.loginOk = login.status === 200 && Boolean(cookie);

const anon = await fetch(`${API}/api/admin/registrations`, {
  headers: { Origin: ORIGIN },
});
report.anonymousDenied = anon.status === 401 || anon.status === 403;

const list = await fetch(`${API}/api/admin/registrations?pageSize=100`, {
  headers: { Origin: ORIGIN, Cookie: cookie },
});
const listJson = await list.json();
const rows = listJson.registrations || [];
const summary = listJson.summary || {};
report.summary = {
  free_event_registrations: summary.free_event_registrations,
  challenge_applicants: summary.challenge_applicants,
  confirmed_challenge_participants: summary.confirmed_challenge_participants,
  exhibition_applicants: summary.exhibition_applicants,
  confirmed_exhibitors: summary.confirmed_exhibitors,
  both_activities: summary.both_activities,
  verified_payments: summary.verified_payments ?? summary.paid_registrations,
};
report.syntheticVisible = {
  challenge: rows.some((r) => r.public_reference === 'SC-2026-78BAEE64F7'),
  exhibition: rows.some((r) => r.public_reference === 'SC-2026-E2C0D3145D'),
  combined: rows.some((r) => r.public_reference === 'SC-2026-8E1C959CEF'),
};
report.participationFilterChallenge = (
  await (
    await fetch(`${API}/api/admin/registrations?participation=challenge`, {
      headers: { Origin: ORIGIN, Cookie: cookie },
    })
  ).json()
).registrations?.some((r) => r.challenge_selected && !r.exhibition_selected);

const exportRes = await fetch(`${API}/api/admin/export`, {
  method: 'POST',
  headers: {
    Origin: ORIGIN,
    Cookie: cookie,
    'X-CSRF-Token': csrf,
    Accept: 'text/csv',
  },
});
const csv = await exportRes.text();
report.csv = {
  httpStatus: exportRes.status,
  hasExpectedAmountColumn: csv.includes('expected_amount_kobo'),
  hasChallengeRef: csv.includes('SC-2026-78BAEE64F7'),
  hasExhibitionRef: csv.includes('SC-2026-E2C0D3145D'),
  hasCombinedRef: csv.includes('SC-2026-8E1C959CEF'),
};

const csrfFail = await fetch(`${API}/api/admin/export`, {
  method: 'POST',
  headers: { Origin: ORIGIN, Cookie: cookie, Accept: 'text/csv' },
});
report.csrfWithoutTokenRejected = csrfFail.status === 403;

report.ok =
  report.loginOk &&
  report.anonymousDenied &&
  report.csv.httpStatus === 200 &&
  report.csv.hasExpectedAmountColumn &&
  report.csrfWithoutTokenRejected;

console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
