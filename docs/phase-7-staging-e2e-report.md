# Phase 7 — Controlled staging setup and end-to-end testing

**Organisation:** SHE CHAMPIONS  
**Event:** SHE CHAMPIONS BUSINESS EMPOWERMENT CHALLENGE 2026  
**Date of report:** 21 October 2026  

## Staging readiness decision

**Staging end-to-end integration is NOT complete and NOT verified against external services.**

**Decision:** Blocked pending designated non-production resources. Automated code-level and safeguard tests pass. No Paystack, Neon, Resend, webhook, admin UI, or browser registration flow was executed against a live staging stack in this phase because required credentials and environment files were absent.

Public registration was **not** enabled. No production deploy, live Paystack keys, real-money charges, or cloud provisioning occurred.

---

## 1. Staging environment identification and isolation evidence

| Check | Result |
| --- | --- |
| Local `.env` / `.env.local` / `.env.staging*` files | **Absent** (only `.env.example` present) |
| Process environment secrets | **All absent** (see §2) |
| Vercel CLI | **Absent** (`vercel` not on PATH) |
| Gitignore covers secret files | **Yes** — `.env`, `.env.local`, `.env.staging`, `.env.staging.local`, `.env.*.local` |
| Staging vs production migrate separation | **Implemented** in `scripts/migrate.mjs` (requires `APP_ENV=staging` + `ALLOW_STAGING_MIGRATE=true` + non-production-looking URL; refuses live Paystack in staging migrate env) |
| Registration default | Remains closed (`EVENT_REGISTRATION_ENABLED` unset/false) |

Isolation evidence for an *active* staging stack: **not available** — no designated staging database or provider credentials were supplied to this workstation.

## 2. Resource and environment-variable readiness (no secret values)

From `npm run staging:preflight` (exit code 2 — blockers present):

| Variable | Status |
| --- | --- |
| `APP_ENV` | absent |
| `STAGING_DATABASE_URL` | absent |
| `DATABASE_URL` | absent |
| `ALLOW_STAGING_MIGRATE` | absent |
| `ALLOW_PRODUCTION_MIGRATE` | absent |
| `PAYSTACK_SECRET_KEY` | absent |
| `PAYSTACK_MODE` | absent |
| `PUBLIC_SITE_URL` | absent |
| `RESEND_API_KEY` | absent |
| `EMAIL_FROM` | absent |
| `ADMIN_EMAIL` | absent |
| `ADMIN_PASSWORD_HASH` | absent |
| `SESSION_SECRET` | absent |
| `EVENT_REGISTRATION_ENABLED` | absent (treated as closed) |
| `EVENT_REGISTRATION_OPEN_AT` | absent |
| `EVENT_START_AT` | absent |
| `EVENT_PRIVACY_NOTICE_APPROVED` | absent |
| `EVENT_PARTICIPATION_TERMS_APPROVED` | absent |
| `ADMIN_NOTIFICATION_EMAIL` | absent |
| `VERCEL_ENV` | absent |

**Summary flags:** staging DB designated = false; migrate safeguard ready = false; Paystack test-safe = false; legal approvals present = false; external E2E ready = false.

Privacy/terms approval flags were **not** set to `true`. No synthetic public event start time was published into a running environment.

## 3. Database connection, migration, and query results

| Activity | Classification | Result |
| --- | --- | --- |
| Review `001_init.sql` / `002_security_hardening.sql` | Code review | Present and unchanged in intent |
| Connect to staging DB | External staging | **Blocked** — no `STAGING_DATABASE_URL` |
| Apply migrations | External staging | **Blocked** — safeguards correctly refuse without `APP_ENV=staging` + `ALLOW_STAGING_MIGRATE=true` + URL |
| `npm run staging:db-smoke` | External staging | **Not run** (same blockers) |
| Duplicate reference constraints | Automated test / schema review | Schema defines unique payment_reference and (event_id, email); migrate safeguard unit tests added |
| Transactional payment updates | Prior Phase 6 code + unit tests | Passed by automated test (not DB-backed integration) |

## 4. Registration workflow results

| Step | Classification | Result |
| --- | --- | --- |
| Open event landing in staging | External staging | **Not tested** — no staging host / `dev:full` credentials |
| Server registration status | External staging | **Not tested** |
| Submit synthetic form via UI | External staging | **Not tested** |
| Pending registration persistence | External staging | **Not tested** |
| Checkout URL return | External staging | **Not tested** |
| Duplicate submission handling | Automated test (logic) / external | Logic covered in unit tests; live duplicate path **not tested** |

**Reason complete UI scenario cannot run:** readiness requires DB, Paystack test mode, email config, admin session config, approved privacy/terms (for open registration), and a confirmed or safely isolated `EVENT_START_AT`. All were absent; gates were not overridden.

## 5. Paystack test-checkout and verification results

| Step | Classification | Result |
| --- | --- | --- |
| Confirm test mode / sk_test prefix | Preflight | **Absent** |
| Initialize test checkout | External staging | **Not tested** |
| Complete test payment | External staging | **Not tested** |
| Callback + backend verify | External staging | **Not tested** |
| Cancel / fail / pending paths | External staging | **Not tested** |
| Invalid reference / amount rules | Automated test | **Passed by automated test** |

No payment was initialized. No live keys were used.

## 6. Webhook signature and idempotency results

| Step | Classification | Result |
| --- | --- | --- |
| Configure Paystack test webhook | External staging | **Blocked** — no credentials; dashboard not modified |
| Valid / invalid signature | Automated test | **Passed by automated test** |
| Duplicate delivery / process-before-record | Code review + Phase 6 tests | **Passed by automated test** (handler-level) |
| Unknown reference | Automated test (mocked) | **Passed by automated test** |
| Failure after success / reversal | Automated rules + code | Partial unit coverage; provider-driven scenario **not tested** |

## 7. Email provider and delivery results

| Step | Classification | Result |
| --- | --- | --- |
| Resend test sender configured | Preflight | **Absent** |
| Confirmation after verified payment | External staging | **Not tested** |
| Honest SENT only with message id | Automated test | **Passed by automated test** |
| Retry failed email via admin | External staging | **Not tested** |

## 8. Admin authentication and authorization results

| Step | Classification | Result |
| --- | --- | --- |
| Staging admin login UI | External staging | **Not tested** |
| View paid registration / export / retry | External staging | **Not tested** |
| Anonymous protected endpoints | Automated test | **Passed by automated test** |
| CSRF / origin rejection | Automated test | **Passed by automated test** |
| Logout CSRF requirement | Automated test | **Passed by automated test** |

## 9. Registration cutoff and readiness-gate results

| Case | Classification | Result |
| --- | --- | --- |
| Disabled / not open / open / cutoff ± / missing start / missing approvals / missing Paystack / prod+test mode | Automated test | **Passed by automated test** (`tests/config.test.js`, `tests/payment-rules.test.js`) |
| Browser cannot override open state | Code review | Server `evaluateReadiness` / `/api/registration/status` decide openness |
| Live boundary against staging clock | External staging | **Not tested** |

Cutoff remains **exactly 48 hours** before configured `EVENT_START_AT` (use `+01:00` Africa/Lagos when setting a confirmed start). No unconfirmed start time was written into a live env.

## 10. Synthetic test-data cleanup status

No synthetic registrations were created. **Cleanup not required.**

When staging E2E later runs, use the procedure in `docs/staging-e2e-checklist.md` (synthetic name/email markers; staging DB only).

## 11. Automated test, lint, build, and dependency-audit results

| Command | Result |
| --- | --- |
| `npm run staging:preflight` | Exit **2** — blockers listed (expected) |
| `npm run test` | **Passed** — 8 files, **47** tests (includes new staging safeguard tests) |
| `npm run lint` | **Passed** |
| `npm run build` | **Passed** |
| `npm audit` | **0** vulnerabilities |

## 12. Defects discovered and fixes applied

No new runtime payment defects were observed (external path not reachable).

**Preparatory hardening applied in this phase:**

1. Explicit staging migration gate: `APP_ENV=staging` + `ALLOW_STAGING_MIGRATE=true` + preferred `STAGING_DATABASE_URL`
2. Refuse staging migrate if URL name suggests production or live Paystack is loaded
3. `npm run staging:preflight` — presence/classification report without secret values
4. `npm run staging:db-smoke` — optional post-migrate table/migration checks (redacted)
5. `.env.example` / `.gitignore` / checklist / backend docs updated for isolation
6. Automated tests for migrate safeguard refusals

## 13. End-to-end checks that remain unverified

All of the following remain **Blocked** until a designated staging stack exists:

1. Neon (or equivalent) connect + migrate `001`/`002` + smoke
2. `vercel dev` / Preview host with server env
3. UI registration → Paystack **test** checkout → callback → verify
4. Paystack **test** webhook delivery and retries
5. Resend confirmation + admin retry
6. Admin login session lifecycle on a real HTTPS/staging origin
7. CSV export against real synthetic rows
8. Cancelled/failed/pending provider checkouts
9. Staging data cleanup of synthetic rows

## 14. Exact remaining blockers for launch (and for staging E2E)

### Blockers to re-run Phase 7 E2E (operator actions)

1. Provision a **disposable staging** Postgres/Neon database (not production).
2. Create gitignored `.env.staging.local` with:
   - `APP_ENV=staging`
   - `ALLOW_STAGING_MIGRATE=true`
   - `STAGING_DATABASE_URL=...`
   - `DATABASE_URL` pointing at the same staging DB for the app runtime (or load staging URL into the app env safely)
   - `PUBLIC_SITE_URL` matching the staging origin
   - `PAYSTACK_SECRET_KEY` (`sk_test_...` only) and `PAYSTACK_MODE=test`
   - `RESEND_API_KEY` + verified/test `EMAIL_FROM`
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET` (≥32 chars)
3. Install Vercel CLI; run `npm run migrate:staging`, `npm run staging:db-smoke`, `npm run staging:preflight`, then `npm run dev:full`.
4. Organisation approval of privacy notice + participation terms before setting `*_APPROVED=true`.
5. Confirmed `EVENT_START_AT` (Africa/Lagos offset) before treating the real event window as open; keep registration closed until then.
6. Manually configure Paystack **test** webhook to the staging `/api/payment/webhook` URL when authorized.
7. Execute `docs/staging-e2e-checklist.md` and update this report with observed results.

### Additional production launch blockers (unchanged)

- Separate production DB, live Paystack, production env isolation
- Legal approvals and confirmed start time/venue
- Explicit enablement of `EVENT_REGISTRATION_ENABLED` only when ready
- Production deploy and live webhook (not performed here)

## 15. Classification legend used above

- **Passed by automated test** — Vitest/unit/handler tests in CI-local run
- **Passed in local integration** — would require local DB/API with staging env (not achieved)
- **Passed against an external staging service** — Paystack/Neon/Resend/Vercel (not achieved)
- **Not tested** — scenario not executed
- **Blocked** — missing prerequisite prevented execution

---

## Precise setup checklist (copy for operators)

```text
[ ] Create disposable Neon staging database
[ ] Fill .env.staging.local from .env.example (gitignored)
[ ] APP_ENV=staging
[ ] ALLOW_STAGING_MIGRATE=true
[ ] STAGING_DATABASE_URL set (non-production name)
[ ] PAYSTACK_MODE=test and sk_test_ secret only
[ ] RESEND_API_KEY + EMAIL_FROM (test/verified sender)
[ ] ADMIN_EMAIL + ADMIN_PASSWORD_HASH + SESSION_SECRET
[ ] PUBLIC_SITE_URL matches staging origin
[ ] EVENT_REGISTRATION_ENABLED=false initially
[ ] npm run migrate:staging
[ ] npm run staging:db-smoke
[ ] npm run staging:preflight  (expect externalE2EReady true only when complete)
[ ] Install Vercel CLI; npm run dev:full
[ ] Legal approvals before *_APPROVED=true
[ ] Confirmed EVENT_START_AT before real open window
[ ] Controlled open only for test window
[ ] Run staging-e2e-checklist.md scenarios
[ ] Configure Paystack TEST webhook only when authorized
[ ] Close registration (ENABLED=false) after tests
[ ] Cleanup synthetic staging rows only
```

## Confirmation of non-actions

- No production deploy
- Public registration not activated
- No live Paystack credentials used
- No real-money transactions
- No automatic cloud provisioning
- No production data/env changes
- No fabricated successful external integrations
- No secret values printed
- Security gates (privacy approval, terms, payment verify, auth, CSRF, webhook signatures) were not bypassed
