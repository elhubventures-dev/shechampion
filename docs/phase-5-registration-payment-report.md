# Phase 5 — Registration and payment system report

**Organisation:** SHE CHAMPIONS  
**Event:** SHE CHAMPIONS BUSINESS EMPOWERMENT CHALLENGE 2026  
**Date of report:** 21 October 2026  
**Hosting target:** Vercel (Vite SPA + `/api` serverless functions)

## 1. Architecture implemented

- Frontend remains Vite 7 + React 19 + React Router 7 (no Next.js / Laravel migration).
- Backend: Vercel Node.js functions under `api/`.
- Database: PostgreSQL via `@neondatabase/serverless` (Neon-compatible).
- Payments: Paystack hosted checkout; amount fixed server-side at **500000** kobo.
- Email: Resend adapter behind a small provider abstraction.
- Admin: `/admin/event-registrations` with server-validated cookie sessions.
- Public registration is **closed by default** (`EVENT_REGISTRATION_ENABLED` unset/`false`).

`vercel.json` SPA rewrites exclude `api/` so API responses are not replaced by `index.html`.

## 2. Database schema and migrations

Migration: `migrations/001_init.sql`  
Apply via `npm run migrate` (see `docs/backend-setup.md`). Not auto-applied; production requires `ALLOW_PRODUCTION_MIGRATE=true`.

Tables:

- `registrations` — applicant data, application + payment status, hashed access/idempotency keys
- `payment_transactions` — Paystack references, amount/currency, modes, verification timestamps, sanitized provider payloads
- `webhook_events` — webhook idempotency
- `email_deliveries` — confirmation email attempts/status (separate from payment)
- `rate_limits` — persistent rate limiting for serverless
- `admin_sessions` — hashed session tokens
- `admin_audit_events` — significant admin actions
- `schema_migrations` — applied migration ids

No card numbers/CVVs stored. No plaintext applicant access tokens stored.

## 3. Public registration workflow

- Status: `GET /api/registration/status`
- Form on `/business-empowerment-challenge-2026` `#participation` when readiness reports open
- Create + Paystack init: `POST /api/registration/create` with `X-Idempotency-Key`
- Draft privacy/terms pages at `/legal/event-privacy-notice` and `/legal/event-participation-terms` (flagged as drafts)
- Payment result: `/payment/result` verifies via backend (redirect alone is not proof of payment)

Application statuses: `PENDING_PAYMENT`, `REGISTERED`, `UNDER_REVIEW`, `SHORTLISTED`, `NOT_SHORTLISTED`, `WITHDRAWN`  
Payment statuses: `PENDING`, `INITIALIZATION_FAILED`, `SUCCESS`, `FAILED`, `REVERSED`

## 4. Paystack initialization and verification

Initialization (server only):

1. Readiness gate
2. Validate/normalize fields
3. Create or reuse pending registration (email unique per event; paid emails rejected)
4. Create `payment_transactions` row with unpredictable `SCBEC26_…` reference **before** relying on provider success
5. Call Paystack initialize with amount `500000`, currency `NGN`, callback derived from `PUBLIC_SITE_URL`
6. Return checkout URL + public registration reference

Verification: `GET/POST /api/payment/verify` calls Paystack verify API and checks status `success`, reference, amount `500000`, currency `NGN`, and stored transaction ownership. Idempotent if already `SUCCESS`.

## 5. Webhook security and idempotency

- Endpoint: `POST /api/payment/webhook`
- Validates `x-paystack-signature` with HMAC-SHA512 over the raw body (constant-time compare)
- Records event key in `webhook_events` (duplicate deliveries short-circuit)
- Applies success/failure/reversal updates idempotently
- Email send happens after payment persistence; email failure does not fail payment ack

Documented webhook URL pattern: `https://<domain>/api/payment/webhook` (manual Paystack dashboard configuration; not automated here).

## 6. Email functionality

- Resend adapter in `api/_lib/email.js`
- Confirmation subject pattern: `SHE CHAMPIONS Business Empowerment Challenge 2026 — Registration Confirmed`
- Includes registration reference, event name, date, location, next steps (no invented venue/grant promises)
- Admin retry: `POST /api/admin/retry-email`
- `SENT` only when provider returns a message id

## 7. Admin authentication and dashboard

- Login `/admin/login`, dashboard `/admin/event-registrations` (not in public nav/sitemap)
- scrypt password hashes (`npm run hash-admin-password`)
- HttpOnly cookie sessions, Secure on HTTPS/production, SameSite=Lax, 8h TTL, DB-backed revocation
- Rate-limited login
- Dashboard: summary counts, search, filters, pagination, detail, application-status updates, admin notes, CSV export (formula-injection safe), email status + retry
- Payment amounts are read-only (no unprotected “mark as paid”)
- Audit log for login/logout, status updates, export, email retry

## 8. Privacy notice and outstanding approval requirements

Drafts exist on-site and under `docs/legal/`.  
`EVENT_PRIVACY_NOTICE_APPROVED` and `EVENT_PARTICIPATION_TERMS_APPROVED` remain false until owner review.

Outstanding for owner:

- Legal entity / controller wording
- Retention period
- Refund/cancellation policy
- Confirmed start time / venue
- Final approval before opening registration

## 9. Rate limiting and security controls

Persistent DB rate limits for:

- Registration create
- Payment verify
- Admin login
- Admin email retry

Also: body size limits, server-side validation, no-store on admin responses, sanitized Paystack payloads, production test-mode readiness block.

Protection that still depends on deployment: Vercel/WAF, Paystack dashboard webhook URL, secret rotation in Vercel env.

## 10. Test results

Commands run in this phase:

| Command | Result |
| --- | --- |
| `npm run test` | **Passed** — 3 files, 19 tests |
| `npm run lint` | **Passed** |
| `npm run build` | **Passed** (Vite production build) |

Unit tests (Vitest) cover validation, readiness/cutoff, fixed fee, Paystack success rules, invalid amount/currency/reference, webhook signature accept/reject, CSV formula injection, and password hash verification. External Paystack/DB/email calls are not required for these unit tests.

`npm audit` still reports pre-existing dependency advisories in the wider tree; no live customer data or real-money tests were executed.

**Not run against live Paystack, Neon, or Resend** — no credentials were provisioned in this phase.

## 11. Environment variables still required

All secrets in `.env.example` remain empty placeholders. Operators must supply:

`DATABASE_URL`, `PAYSTACK_SECRET_KEY`, `PAYSTACK_MODE`, `PUBLIC_SITE_URL`, registration window/approval flags, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, optional `ADMIN_NOTIFICATION_EMAIL`.

## 12. Steps to test with Paystack test credentials

1. Create Neon DB; `DATABASE_URL=… npm run migrate`
2. Fill `.env.local` with test Paystack secret, `PAYSTACK_MODE=test`, Resend test sender, admin hash, `SESSION_SECRET`, `PUBLIC_SITE_URL=http://localhost:3000`
3. Keep registration closed until ready; then set approvals + open/start timestamps + `EVENT_REGISTRATION_ENABLED=true` for a controlled window
4. `npm run dev:full` (Vercel CLI)
5. Submit form → Paystack test checkout → land on `/payment/result` → confirm server verification
6. Configure test webhook to a tunnel URL pointing at `/api/payment/webhook` if testing webhooks locally
7. Sign in at `/admin/login` and confirm paid row + email status

## 13. Exact remaining blockers before production

1. Provision Neon (or approved Postgres) and apply migrations intentionally
2. Owner legal approval of privacy notice + participation terms
3. Confirm `EVENT_START_AT` (cutoff depends on it); venue still TBA
4. Configure Resend verified domain/sender
5. Configure Paystack live keys + dashboard webhook after domain deploy
6. Set Production env vars (separate from Preview)
7. Generate production admin password hash offline
8. Intentionally set `EVENT_REGISTRATION_ENABLED=true` only when the organisation is ready
9. Deploy to Vercel (not performed in this phase)

## 14. Confirmation — no activation performed

- No real payments enabled
- No cloud resources provisioned by this work
- No production deployments performed
- No Paystack webhook configured in a live dashboard
- No credentials added to source control
- Public registration remains closed by default

## Key paths

| Area | Path |
| --- | --- |
| API libs | `api/_lib/` |
| API routes | `api/**/*.js` |
| Migrations | `migrations/001_init.sql` |
| Form | `src/components/RegistrationForm.jsx` |
| Admin UI | `src/pages/admin/` |
| Env template | `.env.example` |
| Setup docs | `docs/backend-setup.md`, `docs/paystack-setup.md`, `docs/admin-auth-setup.md`, `docs/email-setup.md`, `docs/deployment-checklist.md` |
