# Phase 6 — Security hardening and staging readiness

**Organisation:** SHE CHAMPIONS  
**Event:** SHE CHAMPIONS BUSINESS EMPOWERMENT CHALLENGE 2026  
**Date of report:** 21 October 2026  

## Production-readiness decision

**Not production-ready for public registration or live payments.**

Evidence:

- Code-level security defects found in Phase 5 were remediated and covered by expanded automated tests (44 passing).
- Lint and production frontend build pass; `npm audit` reports **0** vulnerabilities after compatible dependency updates.
- **No** provisioned Neon database was migrated in this phase.
- **No** Paystack, Resend, or Vercel production integration was executed.
- Public registration remains closed by default; readiness gates were re-verified in unit tests.
- Legal drafts remain unapproved; event start time remains unconfirmed.

Staging may proceed only with explicit non-production credentials using `docs/staging-e2e-checklist.md`.

---

## 1. Files and security-sensitive components reviewed

Reviewed in detail:

- All `api/**/*.js` handlers and `api/_lib/*` helpers
- `migrations/001_init.sql`, new `migrations/002_security_hardening.sql`
- `src/components/RegistrationForm.jsx`, `src/pages/PaymentResult.jsx`, `src/lib/eventApi.js`
- Admin UI: `src/pages/admin/*`
- `.env.example`, `vercel.json`, `package.json` / lockfile
- Existing tests and Phase 5 docs/report
- Client bundle scan: no `PAYSTACK_SECRET`, `DATABASE_URL`, `SESSION_SECRET`, or key-like strings in `dist/`

## 2. Confirmed vulnerabilities and defects

| ID | Severity | Finding |
| --- | --- | --- |
| P6-01 | High | Webhook idempotency recorded **before** payment processing. A crash after insert caused Paystack retries to short-circuit as duplicates without applying payment. |
| P6-02 | High | Cookie-authenticated admin mutations lacked CSRF / trusted-origin checks. CSV export via GET + cookie was CSRF-prone via top-level navigation. |
| P6-03 | Medium | Payment success updates used separate SQL statements without a transaction (webhook vs callback race). |
| P6-04 | Medium | Provider reversals could not supersede SUCCESS (`status <> 'SUCCESS'` blocked REVERSED). |
| P6-05 | Medium | Concurrent registration inserts on the same email could surface as unhandled unique violations. |
| P6-06 | Low | Applicant `accessToken` was generated/returned internally (not in HTTP response, but unnecessary exposure risk). |
| P6-07 | Low | `/api/health` exposed database configuration booleans beyond coarse status. |
| P6-08 | Low | Session login did not revoke prior sessions; expired sessions were not marked revoked. |
| P6-09 | Info | GET `/api/payment/verify` performs state changes (required for Paystack return URL). Documented; SPA retries now prefer POST. |
| P6-10 | Info | Dependency advisories in Vite/PostCSS/nanoid toolchain (dev-time); addressed via `npm audit fix`. |

No evidence of client-controlled payment amount/currency, plaintext secrets in the SPA bundle, or disabled webhook signature verification.

## 3. Remediation performed

- **Webhook order:** verify signature → apply payment/email safely → record `webhook_events` (duplicates no longer skip unapplied work).
- **CSRF + origin:** `api/_lib/security.js`; enforced on admin mutations; registration create requires trusted origin + JSON content-type.
- **Admin session hardening:** revoke prior sessions on login; revoke expired sessions on use; CSRF cookie `sc_admin_csrf` + `X-CSRF-Token`.
- **Export:** POST-only with CSRF; dashboard downloads via `fetch` blob.
- **Payments:** `sql.transaction` for success and non-success updates; REVERSED may supersede SUCCESS; FAILED cannot demote SUCCESS.
- **Registration races:** catch unique violations and resume pending payment.
- **Remove** access token from payment init return payload.
- **Health:** coarse `publicStatus` only.
- **Migration 002:** unique partial index on `(event_id, idempotency_key_hash)` plus supporting indexes.
- Frontend admin client sends CSRF headers; payment verify uses POST.
- Docs: staging checklist, admin CSRF notes, env timezone guidance (`+01:00` / Africa/Lagos).

## 4. Authentication and authorization test results

Automated (`tests/admin-api.test.js`, `tests/security.test.js`):

- Anonymous `/api/admin/me`, list, detail → **401**
- Unauthorized PATCH / export / email retry → **401/403**
- Cross-origin admin read → **403 FORBIDDEN_ORIGIN**
- Logout without CSRF → **403 CSRF_FAILED**
- CSRF cookie/header mismatch rejected
- Trusted origin accept/reject verified

**Not executed (needs DB):** live login, revoked-session DB row checks against Neon, end-to-end cookie Secure flag on HTTPS hosting.

## 5. Database and payment concurrency test results

- Unit coverage for amount/currency/reference validation, readiness/cutoff (48h), production test-mode block, CSV formula neutralization.
- Transactional update paths implemented in code; **not** exercised against a real Postgres instance in this phase.
- Migration 002 prepared but **not applied** to any remote database.

## 6. Webhook security results

- Invalid signature → **401** (automated).
- Valid signature with unknown reference acknowledged without leaking internals (mocked processing).
- Duplicate delivery no longer prevents first-time application after a mid-handler failure (code fix).
- Signature verification remains mandatory (not disabled for local convenience).

## 7. Dependency audit results

Before fix: 12 advisories (vite/postcss/nanoid/source-map-js — primarily **development tooling**, transitive via Vite).

Action: `npm audit fix` (no `--force`), lockfile synchronized.

After fix:

| Package | Notes | Runtime impact |
| --- | --- | --- |
| `vite` 7.3.7 | Direct devDependency upgraded from vulnerable 7.3.x range | Dev server / build only; not shipped as serverless runtime logic |
| `postcss` / `nanoid` / `source-map-js` | Transitive via Vite toolchain | Build/dev tooling |

**Current `npm audit`: 0 vulnerabilities.**

## 8. Lint, build, and test results

| Check | Result |
| --- | --- |
| `npm run test` | **Passed** — 7 files, **44** tests |
| `npm run lint` | **Passed** |
| `npm run build` | **Passed** (Vite 7.3.7) |
| `npm audit` | **0** vulnerabilities |

## 9. Available versus unavailable external integration checks

| Check | Status |
| --- | --- |
| Code review of API/auth/webhook/payment | Done |
| Automated unit/handler tests | Done |
| Client bundle secret scan | Done |
| Neon migrate + query integration | **Unavailable** (no designated DB in this phase) |
| Paystack test checkout + webhook | **Unavailable** (no test credentials used) |
| Resend delivery | **Unavailable** |
| Vercel Preview/Production deploy | **Not performed** |

## 10. Environment variables still required (names only)

`DATABASE_URL`, `PUBLIC_SITE_URL`, `EVENT_REGISTRATION_ENABLED`, `EVENT_REGISTRATION_OPEN_AT`, `EVENT_START_AT`, `EVENT_PRIVACY_NOTICE_APPROVED`, `EVENT_PARTICIPATION_TERMS_APPROVED`, `PAYSTACK_SECRET_KEY`, `PAYSTACK_MODE`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, optional `ADMIN_NOTIFICATION_EMAIL`.

Values were not printed or committed.

## 11. Staging setup instructions

See **`docs/staging-e2e-checklist.md`** for the full controlled procedure covering open → apply → Paystack test → verify → webhook → email → admin → negative cases → close.

## 12. Remaining privacy, legal, event, and deployment blockers

1. Owner approval of privacy notice and participation terms (`*_APPROVED` must stay false until then).
2. Confirmed `EVENT_START_AT` (cutoff = start − 48 hours, Africa/Lagos offset); venue still TBA.
3. Provision Neon (or approved Postgres); apply migrations `001` + `002` intentionally.
4. Configure Paystack **test** then later **live** keys/webhooks in provider dashboards (manual).
5. Verify Resend sender domain.
6. Separate Preview vs Production env vars on Vercel.
7. Explicit decision to set `EVENT_REGISTRATION_ENABLED=true` only when ready.
8. Production deploy not performed in this phase.

## 13. Explicit non-actions (confirmed)

- No production deploy
- Public registration not enabled
- No live Paystack credentials configured
- No real-money transactions
- No cloud resources provisioned
- No migrations applied to unknown/remote production databases
- No third-party dashboard changes
- Signature verification, session checks, and readiness gates were not bypassed

---

## GET verification note (P6-09)

Paystack redirects applicants to `{PUBLIC_SITE_URL}/payment/result?reference=...`. The SPA must verify that reference. **GET** `/api/payment/verify` therefore remains supported and may update payment state after calling Paystack’s verify API. Manual retries from the SPA use **POST**. Responses expose only public registration reference and coarse statuses—not secrets or full provider payloads.
