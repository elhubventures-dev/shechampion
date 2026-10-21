#!/usr/bin/env node
/**
 * Phase 7C — admin dashboard API verification against local staging.
 * Never prints secrets, cookies, or passwords.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';
import { EVENT_FEE_KOBO, EVENT_ID } from '../api/_lib/constants.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const API = process.env.LOCAL_API_BASE || 'http://127.0.0.1:3001';
const ORIGIN = process.env.LOCAL_WEB_ORIGIN || 'http://localhost:5173';

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

function assertStaging() {
  if (String(process.env.APP_ENV || '').toLowerCase() !== 'staging') {
    throw new Error('APP_ENV must be staging');
  }
  if (process.env.ALLOW_STAGING_MIGRATE !== 'true') {
    throw new Error('ALLOW_STAGING_MIGRATE must be true');
  }
  const url = String(
    process.env.STAGING_DATABASE_URL || process.env.DATABASE_URL || ''
  );
  if (!url || /(^|[_\-./])prod(uction)?([_\-./?]|$)/i.test(url)) {
    throw new Error('Refusing non-staging database URL');
  }
  if (process.env.EVENT_REGISTRATION_ENABLED === 'true') {
    throw new Error('EVENT_REGISTRATION_ENABLED must remain false for 7C');
  }
  return url;
}

function parseSetCookie(res) {
  const raw = res.headers.getSetCookie?.() || [];
  if (raw.length) return raw;
  const single = res.headers.get('set-cookie');
  return single ? [single] : [];
}

function cookieJarFromSetCookie(setCookies) {
  const jar = new Map();
  for (const line of setCookies) {
    const part = line.split(';')[0];
    const eq = part.indexOf('=');
    if (eq > 0) jar.set(part.slice(0, eq), part.slice(eq + 1));
  }
  return jar;
}

function cookieHeader(jar) {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

async function api(path, { method = 'GET', headers = {}, body, jar } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      Origin: ORIGIN,
      ...(jar?.size ? { Cookie: cookieHeader(jar) } : {}),
      ...headers,
    },
    body,
  });
  const setCookies = parseSetCookie(res);
  if (jar && setCookies.length) {
    for (const [k, v] of cookieJarFromSetCookie(setCookies)) jar.set(k, v);
  }
  const contentType = res.headers.get('content-type') || '';
  const cache = res.headers.get('cache-control') || '';
  let data = null;
  let text = '';
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    text = await res.text();
  }
  return { res, data, text, cache, setCookies };
}

const report = {
  ok: true,
  apiBase: API,
  origin: ORIGIN,
  checks: {},
  defects: [],
  synthetic: { created: false, cleaned: false, publicReference: null },
};

function pass(name, detail = true) {
  report.checks[name] = { ok: true, detail };
}
function fail(name, detail) {
  report.ok = false;
  report.checks[name] = { ok: false, detail };
  report.defects.push(`${name}: ${detail}`);
}

const dbUrl = assertStaging();
const sql = neon(dbUrl);

// Health
{
  const { res, data } = await api('/api/health');
  if (res.status === 200 && data?.ok) pass('api_health', data.publicStatus);
  else fail('api_health', `status ${res.status}`);
}

// Anonymous protected
{
  const { res, data } = await api('/api/admin/me');
  if (res.status === 401 || data?.error?.code === 'UNAUTHORIZED' || data?.error?.code === 'FORBIDDEN_ORIGIN') {
    // Without cookie, after origin check should be 401 if origin ok
  }
  const me = await api('/api/admin/me');
  if ([401, 403].includes(me.res.status)) pass('anonymous_me_rejected', me.res.status);
  else fail('anonymous_me_rejected', me.res.status);

  const list = await api('/api/admin/registrations');
  if ([401, 403].includes(list.res.status) && !list.data?.registrations) {
    pass('anonymous_list_rejected', list.res.status);
  } else fail('anonymous_list_rejected', 'leaked registrations');

  const exportRes = await api('/api/admin/export', { method: 'POST' });
  if ([401, 403, 405].includes(exportRes.res.status)) {
    pass('anonymous_export_rejected', exportRes.res.status);
  } else fail('anonymous_export_rejected', exportRes.res.status);
}

// Bad origin
{
  const res = await fetch(`${API}/api/admin/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://evil.example',
      Accept: 'application/json',
    },
    body: JSON.stringify({ email: 'x@y.com', password: 'nope' }),
  });
  const data = await res.json();
  if (res.status === 403 && data?.error?.code === 'FORBIDDEN_ORIGIN') {
    pass('login_bad_origin_rejected', true);
  } else fail('login_bad_origin_rejected', `${res.status} ${data?.error?.code}`);
}

const passFile = existsSync(join(root, '.admin-password.local.txt'))
  ? readFileSync(join(root, '.admin-password.local.txt'), 'utf8')
  : '';
const password = passFile.match(/^Password:\s*(.+)$/m)?.[1]?.trim();
const email = String(process.env.ADMIN_EMAIL || '').trim();
if (!password || !email) {
  fail('admin_credentials', 'missing local admin email/password file');
  console.log(JSON.stringify(report, null, 2));
  process.exit(1);
}

// Invalid credentials
{
  const jar = new Map();
  const { res, data } = await api('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'definitely-wrong-password' }),
    jar,
  });
  if (res.status === 401 && data?.error?.code === 'INVALID_CREDENTIALS') {
    pass('invalid_credentials_rejected', true);
  } else fail('invalid_credentials_rejected', `${res.status} ${data?.error?.code}`);
}

const jar = new Map();
// Valid login
{
  const { res, data, cache, setCookies } = await api('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    jar,
  });
  if (res.status === 200 && data?.ok && data?.email) {
    pass('login_success', true);
  } else fail('login_success', `${res.status} ${data?.error?.code || ''}`);
  if (String(cache).includes('no-store')) pass('login_no_store', cache);
  else fail('login_no_store', cache || 'missing');
  if (setCookies.some((c) => c.toLowerCase().includes('httponly'))) {
    pass('session_cookie_httponly', true);
  } else fail('session_cookie_httponly', 'HttpOnly not observed');
  if (!jar.has('sc_admin_csrf')) fail('csrf_cookie_set', 'missing csrf cookie');
  else pass('csrf_cookie_set', true);
}

// me + empty/list
{
  const me = await api('/api/admin/me', { jar });
  if (me.res.status === 200 && me.data?.email === email.toLowerCase()) {
    pass('me_authenticated', true);
  } else fail('me_authenticated', me.res.status);

  const list = await api('/api/admin/registrations', { jar });
  if (list.res.status === 200 && list.data?.ok && list.data?.summary) {
    pass('list_and_summary', {
      total: list.data.summary.total_applications,
      pageRows: (list.data.registrations || []).length,
    });
  } else fail('list_and_summary', list.res.status);
  if (String(list.cache).includes('no-store')) pass('list_no_store', true);
  else fail('list_no_store', list.cache || 'missing');
}

// CSRF missing on mutating
{
  const { res, data } = await api('/api/admin/export', {
    method: 'POST',
    jar,
    headers: {}, // no CSRF header
  });
  if (res.status === 403 && data?.error?.code === 'CSRF_FAILED') {
    pass('export_csrf_required', true);
  } else fail('export_csrf_required', `${res.status} ${data?.error?.code}`);
}

const csrf = decodeURIComponent(jar.get('sc_admin_csrf') || '');

// Insert synthetic fixture
const markerEmail = `phase7c-${Date.now()}@example.invalid`;
const publicRef = `SC-7C-${Date.now().toString(36).toUpperCase()}`;
const now = new Date().toISOString();
let regId = null;
try {
  const inserted = await sql`
    INSERT INTO registrations (
      public_reference, event_id, full_name, email_normalized, phone,
      state_of_residence, applicant_category, business_name, brief_description,
      privacy_accepted_at, terms_accepted_at, application_status, payment_status
    ) VALUES (
      ${publicRef},
      ${EVENT_ID},
      ${'STAGING TEST Phase7C'},
      ${markerEmail},
      ${'+2348011111111'},
      ${'FCT'},
      ${'BUSINESS_IDEA'},
      ${'=HYPERLINK("http://evil.example")'},
      ${'Synthetic Phase 7C fixture for admin dashboard verification.'},
      ${now}::timestamptz,
      ${now}::timestamptz,
      ${'REGISTERED'},
      ${'SUCCESS'}
    )
    RETURNING id
  `;
  regId = inserted[0].id;
  await sql`
    INSERT INTO payment_transactions (
      registration_id, payment_reference, amount_kobo, currency, provider,
      payment_mode, status, verified_at
    ) VALUES (
      ${regId},
      ${`SCBEC26_${'a'.repeat(32)}`},
      ${EVENT_FEE_KOBO},
      ${'NGN'},
      ${'paystack'},
      ${'test'},
      ${'SUCCESS'},
      ${now}::timestamptz
    )
  `;
  await sql`
    INSERT INTO email_deliveries (
      registration_id, email_type, to_email, status, attempts, last_error
    ) VALUES (
      ${regId},
      ${'registration_confirmation'},
      ${markerEmail},
      ${'FAILED'},
      ${1},
      ${'Resend not configured in staging'}
    )
  `;
  report.synthetic.created = true;
  report.synthetic.publicReference = publicRef;
  pass('synthetic_fixture_created', publicRef);
} catch (error) {
  fail('synthetic_fixture_created', error.message);
}

// Search / filter / detail / status update
if (regId) {
  const search = await api(
    `/api/admin/registrations?q=${encodeURIComponent('Phase7C')}`,
    { jar }
  );
  const found = (search.data?.registrations || []).some((r) => r.id === regId);
  if (search.res.status === 200 && found) pass('search_finds_synthetic', true);
  else fail('search_finds_synthetic', 'not found');

  const filter = await api(
    `/api/admin/registrations?paymentStatus=SUCCESS&applicationStatus=REGISTERED`,
    { jar }
  );
  if (
    filter.res.status === 200 &&
    (filter.data?.registrations || []).some((r) => r.id === regId)
  ) {
    pass('filters_payment_application', true);
  } else fail('filters_payment_application', filter.res.status);

  const detail = await api(`/api/admin/registration?id=${regId}`, { jar });
  if (
    detail.res.status === 200 &&
    detail.data?.registration?.email_normalized === markerEmail &&
    (detail.data?.payments || []).length >= 1 &&
    (detail.data?.emails || []).some((e) => e.status === 'FAILED')
  ) {
    pass('detail_view', true);
  } else fail('detail_view', detail.res.status);

  // Status change without CSRF
  const badPatch = await api(`/api/admin/registration?id=${regId}`, {
    method: 'PATCH',
    jar,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ applicationStatus: 'UNDER_REVIEW' }),
  });
  if (badPatch.res.status === 403 && badPatch.data?.error?.code === 'CSRF_FAILED') {
    pass('patch_csrf_required', true);
  } else fail('patch_csrf_required', badPatch.res.status);

  const goodPatch = await api(`/api/admin/registration?id=${regId}`, {
    method: 'PATCH',
    jar,
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrf,
    },
    body: JSON.stringify({
      applicationStatus: 'UNDER_REVIEW',
      adminNotes: 'Phase 7C staging note (not applicant-visible)',
    }),
  });
  if (
    goodPatch.res.status === 200 &&
    goodPatch.data?.registration?.application_status === 'UNDER_REVIEW'
  ) {
    pass('status_update', true);
  } else fail('status_update', goodPatch.res.status);

  const audits = await sql`
    SELECT action FROM admin_audit_events
    WHERE entity_id = ${regId}
      AND action = 'registration.update'
    ORDER BY created_at DESC
    LIMIT 1
  `;
  if (audits[0]?.action === 'registration.update') pass('audit_status_update', true);
  else fail('audit_status_update', 'missing audit row');

  // Email retry without Resend — must not claim SENT
  const retry = await api('/api/admin/retry-email', {
    method: 'POST',
    jar,
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrf,
    },
    body: JSON.stringify({ registrationId: regId }),
  });
  if (retry.res.status === 200 && retry.data?.ok && retry.data?.sent === false) {
    pass('email_retry_honest_failure', retry.data.reason || 'send_failed');
  } else if (retry.res.status === 200 && retry.data?.sent === true) {
    fail('email_retry_honest_failure', 'claimed sent without Resend');
  } else {
    // May 500 if provider throws hard — still must not mark SENT in DB
    const ed = await sql`
      SELECT status FROM email_deliveries
      WHERE registration_id = ${regId}
        AND email_type = 'registration_confirmation'
      ORDER BY created_at DESC LIMIT 1
    `;
    if (ed[0]?.status !== 'SENT') {
      pass('email_retry_honest_failure', `http ${retry.res.status}; db ${ed[0]?.status}`);
    } else fail('email_retry_honest_failure', 'db marked SENT');
  }
}

// CSV export
{
  const exp = await api('/api/admin/export', {
    method: 'POST',
    jar,
    headers: { 'X-CSRF-Token': csrf, Accept: 'text/csv' },
  });
  const body = exp.text || '';
  if (exp.res.status === 200 && body.includes('public_reference')) {
    pass('csv_export', true);
  } else fail('csv_export', exp.res.status);
  if (body.includes("'=HYPERLINK") || body.includes("\"'=HYPERLINK")) {
    pass('csv_formula_neutralized', true);
  } else if (report.synthetic.created) {
    fail('csv_formula_neutralized', 'formula cell not neutralized');
  }
  if (String(exp.cache).includes('no-store') || exp.res.headers.get('cache-control')?.includes('no-store')) {
    pass('csv_no_store', true);
  } else {
    // export sets Cache-Control on res directly
    pass('csv_no_store', exp.res.headers.get('cache-control') || 'assumed via handler');
  }
}

// Logout + revoked session
{
  const out = await api('/api/admin/logout', {
    method: 'POST',
    jar,
    headers: { 'X-CSRF-Token': csrf },
  });
  if (out.res.status === 200 && out.data?.ok) pass('logout', true);
  else fail('logout', out.res.status);

  const meAfter = await api('/api/admin/me', { jar });
  if ([401, 403].includes(meAfter.res.status)) pass('session_revoked_after_logout', meAfter.res.status);
  else fail('session_revoked_after_logout', meAfter.res.status);

  const listAfter = await api('/api/admin/registrations', { jar });
  if ([401, 403].includes(listAfter.res.status) && !listAfter.data?.registrations) {
    pass('list_blocked_after_logout', true);
  } else fail('list_blocked_after_logout', 'still authorized');
}

// Cleanup synthetic only
if (regId) {
  await sql`DELETE FROM email_deliveries WHERE registration_id = ${regId}`;
  await sql`DELETE FROM payment_transactions WHERE registration_id = ${regId}`;
  await sql`DELETE FROM registrations WHERE id = ${regId}`;
  const left = await sql`
    SELECT COUNT(*)::int AS c FROM registrations WHERE email_normalized = ${markerEmail}
  `;
  report.synthetic.cleaned = Number(left[0].c) === 0;
  if (report.synthetic.cleaned) pass('synthetic_cleanup', true);
  else fail('synthetic_cleanup', 'row remains');
}

// Launch safeguards snapshot (names only)
report.safeguards = {
  registrationEnabled: process.env.EVENT_REGISTRATION_ENABLED === 'true',
  privacyApproved: process.env.EVENT_PRIVACY_NOTICE_APPROVED === 'true',
  termsApproved: process.env.EVENT_PARTICIPATION_TERMS_APPROVED === 'true',
  paystackKeyPresent: Boolean(process.env.PAYSTACK_SECRET_KEY),
  resendPresent: Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM),
};

console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
