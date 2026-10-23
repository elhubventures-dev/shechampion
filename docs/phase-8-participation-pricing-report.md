# Phase 8 — Free event registration and paid participation options

**Organisation:** SHE CHAMPIONS  
**Event:** SHE CHAMPIONS BUSINESS EMPOWERMENT CHALLENGE 2026  
**Date of report:** 22 October 2026  
**Scope:** Adapt the existing registration/payment system to free general registration plus optional paid challenge and exhibition participation. No production deployment. Public registration not opened.

---

## 1. New pricing rules

| Selection | Registration fee | Participation fee | Paystack |
|---|---:|---:|---|
| General event registration only | ₦0 | ₦0 | Not called |
| Challenge only | ₦0 | ₦5,000 (`500000` kobo) | Required |
| Exhibition only | ₦0 | ₦30,000 (`3000000` kobo) | Required |
| Challenge + exhibition | ₦0 | ₦35,000 (`3500000` kobo) | Required when combined enabled |

Authoritative configuration: `api/_lib/pricing.js`  
Combined selection controlled by `ALLOW_COMBINED_CHALLENGE_EXHIBITION` (default was `true` at Phase 8; **Phase 10 changed the unset default to `false`** for safer production launch). Server rejects combined selection when `false`; UI alone is not enforcement.

Currency remains `NGN`. Client-supplied amount, currency, or discount fields are rejected.

## 2. Registration flow and participation choices

Public form on `/business-empowerment-challenge-2026` (`RegistrationForm.jsx`):

1. **Step 1** — existing basic fields (name, email, phone, state, category, description, optional business name) plus privacy/terms acknowledgements.
2. **Step 2** — optional paid activities:
   - General event registration (free, always included)
   - Challenge (₦5,000, women only)
   - Exhibition (₦30,000, business owners)
   - Combined allowed via independent checkboxes when enabled

Totals show free amount, each selected fee, and combined total. Copy clarifies that free registration does not purchase paid participation.

API: `POST /api/registration/create` (same endpoint) validates participation options, persists registration, and either completes free registration or initializes Paystack.

## 3. Eligibility enforcement

Server-side in `validateRegistrationInput` (`api/_lib/validation.js`):

- General registration is **not** restricted by the women-only rule.
- Challenge selection requires `challengeWomenEligibilityAttested === true`.
- Exhibition selection requires business-owner attestation plus business name, category, and exhibition description.
- Combined selection requires both attestation sets and allowed combined config.

No invented age, residency, documentation, booth, venue, or grant promises were added.

## 4. Database migration and existing-data preservation

New additive migration: `migrations/003_participation_options.sql`

Adds (among others):

- `event_registration_status`
- `challenge_selected` / `exhibition_selected`
- `challenge_status` / `exhibition_status`
- `expected_amount_kobo` / `currency`
- eligibility attestation flags + timestamps
- exhibition detail fields
- expands `payment_status` to include `NOT_REQUIRED`

**Historical backfill:** existing rows that represent the prior single ₦5,000 paid challenge model are **not** reinterpreted as free-only. They are backfilled as challenge-selected with `expected_amount_kobo = 500000` and participation status derived from prior payment/application status.

**Staging procedure (manual):**

1. Confirm `APP_ENV=staging` and staging DB URL (prefer `STAGING_DATABASE_URL`).
2. Confirm migrate safeguards (`ALLOW_STAGING_MIGRATE=true`).
3. Apply migrations including `003_participation_options` via `npm run migrate` (or project staging migrate script).
4. Spot-check: legacy paid rows retain challenge selection and 500000 expected amount; no zero-value Paystack rows invented for free regs.
5. Do **not** apply automatically to production.

Migration was **not** applied to production in this phase.

## 5. Server-side amount calculation

`calculateParticipationAmount` sums selected activity fees. Registration create persists `expected_amount_kobo` before Paystack init. Paystack initialize/verify/webhook use the **stored expected amount**, not a client value and not a hardcoded single fee.

## 6. Paystack integration changes

- Free path: no `payment_transactions` row, no Paystack call, `payment_status = NOT_REQUIRED`.
- Paid path: create transaction with server amount → initialize checkout → return checkout URL.
- If Paystack is unavailable: free event registration remains saved (`event_registration_status = REGISTERED`); paid activities stay unconfirmed (`PENDING_PAYMENT` / `INITIALIZATION_FAILED`); helpful retry messaging returned.
- Browser redirect remains insufficient proof of payment.

## 7. Webhook and payment-state behavior

Phase 6 protections retained:

- HMAC-SHA512 over raw body, constant-time compare
- Process then record webhook idempotency
- Transactional success/failure/reversal updates
- Amount + currency + reference ownership checks against stored expected amount
- Challenge payment cannot confirm exhibition (and vice versa); combined amount confirms both only when expected amount is the combined total
- Reversal sets payment + relevant participation statuses to `REVERSED`
- Failed/abandoned payment does **not** undo free event registration

## 8. Free-registration behavior

When neither paid option is selected:

1. Validate application + legal acknowledgements under readiness gates  
2. Save registration with public reference  
3. `event_registration_status = REGISTERED`, `payment_status = NOT_REQUIRED`  
4. No payment transaction / no Paystack  
5. Send free-registration email if Resend configured; otherwise report honestly without inventing delivery  
6. Idempotency / unique email constraints preserved  

Readiness split:

- Free registration does **not** require Paystack or Resend.
- Paid checkout requires Paystack credentials/mode rules.
- Global gates (enabled flag, open/cutoff window, legal approvals, DB, admin config) still close **all** public registration types.

## 9. Admin dashboard updates

`/admin/event-registrations` and admin APIs now expose:

**Summary counts:** free-only, challenge applicants, confirmed challenge, exhibition applicants, confirmed exhibitors, both activities, pending payments, verified payments, failed/reversed.

**Filters:** participation selection, challenge eligibility attestation, exhibition category, payment status, application status, date range.

**Detail:** public reference, event registration status, selected activities, expected amount, payment txs (verified amount/reference), challenge/exhibition statuses, eligibility/exhibition fields, emails, audit history.

**CSV:** participation selections, per-activity statuses, expected amount, verified payment fields, eligibility flags — formula-injection safe via `escapeCsvCell`.

No unrestricted “mark paid” control was added.

## 10. Email behavior

`api/_lib/email.js`:

- Free: subject `… — Event Registration Confirmed` (no paid-participation claim)
- Paid: subjects for challenge / exhibition / both after verified payment
- Email failure never undoes registration or verified payment
- Admin retry allowed for `NOT_REQUIRED` and `SUCCESS`

## 11. Tests, lint, build, and dependency-audit results

Commands executed in Phase 8:

| Command | Result |
| --- | --- |
| `npm run test` | **Passed** — 9 files, 66 tests |
| `npm run lint` | **Passed** |
| `npm run build` | **Passed** (Vite production build) |
| `npm audit` | **0 vulnerabilities** (registry reachable) |

New/updated automated coverage includes pricing amounts, combined disablement, client amount rejection, eligibility rules, free-vs-paid readiness split, Paystack amount matching for 5k/30k/35k, and retained webhook/CSRF/admin access tests.

External Paystack/Resend/Neon end-to-end writes were **not** claimed as passing from mocks alone. Staging migration `003` was not applied in this phase.

## 12. Remaining external integration gaps

- Staging migration `003` must be applied intentionally by an operator.
- Paystack test credentials presence must be verified without printing secrets before paid staging smoke.
- Resend staging sender must be configured for real email delivery checks.
- Webhook tunnel / dashboard URL still requires manual Paystack configuration for local/staging webhook tests.

## 13. Outstanding organizational approvals

Unchanged blockers from prior phases:

- Final privacy notice approval (`EVENT_PRIVACY_NOTICE_APPROVED`)
- Final participation terms approval (`EVENT_PARTICIPATION_TERMS_APPROVED`)
- Confirmed event start timestamp (`EVENT_START_AT`) for exact 48-hour cutoff
- Venue announcement (not invented here)
- Owner decision if combined challenge+exhibition should remain enabled in production
- Any refund/cancellation policy wording for paid activities

## 14. Exact production launch blockers

1. Do not set `EVENT_REGISTRATION_ENABLED=true` until approvals and staging E2E are complete.  
2. Do not use live Paystack credentials until staging paid paths are verified.  
3. Apply migrations `001`–`003` deliberately; do not auto-migrate production.  
4. Confirm production `PAYSTACK_MODE=live` only when ready for real money.  
5. Confirm legal approval flags only after owner review of draft notices.  
6. Confirm `EVENT_START_AT` so cutoff is exactly 48 hours before start in Africa/Lagos offset.  
7. No production deployment was performed in Phase 8.

---

## Acceptance criteria checklist

- [x] General event registration is free  
- [x] Challenge ₦5,000 with women-only attestation  
- [x] Exhibition ₦30,000 with business-owner confirmation + fields  
- [x] Combined ₦35,000 when enabled; server-enforced disable path  
- [x] Free registrations create no artificial Paystack transactions  
- [x] Paid participation confirmed only after server-side verification  
- [x] Client cannot alter payment amount  
- [x] Webhook/auth/CSRF/idempotency/audit protections retained  
- [x] Admin distinguishes free vs paid participation  
- [x] Existing registration semantics preserved via backfill (not silent free reinterpretation)  
- [x] Registration window not opened automatically  
- [x] No production deployment  
- [x] Phase 8 report completed  

## Staging safety note

Before any staging writes: confirm staging DB, `APP_ENV=staging`, migrate safeguards, test-mode Paystack, keep public registration disabled unless a narrowly authorized test is approved. Never print or commit secrets.
