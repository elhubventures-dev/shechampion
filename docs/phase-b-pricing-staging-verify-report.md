# Phase B — Staging verify (free registration + paid participation)

**Organisation:** SHE CHAMPIONS  
**Event:** SHE CHAMPIONS BUSINESS EMPOWERMENT CHALLENGE 2026  
**Date of report:** 23 October 2026 (re-verified same day)  
**Scope:** Confirm staging migration 003, free-path integrity, and paid-amount shapes. No production operations. Registration left closed.

---

## Commands run this session

| Command | Result |
| --- | --- |
| `npm run staging:preflight` | `ok: true`; registration **closed**; Paystack secret **absent** |
| `npm run staging:phase9a-precheck` | Migrations `001`–`003` present; participation columns present |
| `npm run staging:phase9a-verify` | `ok: true` (schema, legacy backfill, pricing, synthetic free) |
| `npm run staging:db-smoke` | `ok: true`; `003_participation_options` applied |
| `npm run staging:paystack-smoke` | **Blocked** — `PAYSTACK_SECRET_KEY absent` |

## Migration 003

- Applied exactly once on staging.
- Participation columns and `NOT_REQUIRED` payment status present.
- Legacy row preserved as challenge-selected with `expected_amount_kobo = 500000` (not reinterpreted as free-only).

## Free path (synthetic, this session)

From `staging:phase9a-verify`:

- Free insert succeeded
- `payment_status` = `NOT_REQUIRED`
- **No** `payment_transactions` row
- Synthetic rows cleaned up

## Paid amounts (server calc + validation, this session)

| Selection | Result |
| --- | --- |
| Challenge shape / ₦5,000 | `challengeShapeOk: true` |
| Exhibition / ₦30,000 | `exhibitionAmountOk: true` |
| Combined / ₦35,000 when allowed | `combinedAmountOk: true` |
| Combined when disabled | `combinedDisabledRejected: true` + server validation |

## Paystack ₦5,000 / ₦30,000 live re-smoke

**Not re-run in this session** — staging env has `PAYSTACK_MODE=test` but `PAYSTACK_SECRET_KEY` is absent.

Prior evidence (do not re-open registration without operator approval):

- [`docs/phase-9b-paystack-staging-report.md`](phase-9b-paystack-staging-report.md) — free, challenge (₦5,000), exhibition (₦30,000), and combined (₦35,000) Paystack **test** initialize + signed local webhook confirmation **passed**; registration restored to closed afterward.

To re-smoke when a `sk_test_` key is restored in `.env.staging.local` only:

1. Confirm `APP_ENV=staging`, registration starts closed.
2. `npm run staging:paystack-smoke` (credential shape).
3. Authorized short open → Phase 9B e2e scripts → restore `EVENT_REGISTRATION_ENABLED=false`.

## Safety

| Gate | Status |
| --- | --- |
| `EVENT_REGISTRATION_ENABLED` | `false` / public status closed |
| `ALLOW_PRODUCTION_MIGRATE` | `false` |
| Production deploy | Not performed |
| Secrets printed | No |
