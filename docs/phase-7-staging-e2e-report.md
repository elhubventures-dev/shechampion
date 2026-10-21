# Phase 7 / 7B — Controlled staging setup and end-to-end testing

**Organisation:** SHE CHAMPIONS  
**Event:** SHE CHAMPIONS BUSINESS EMPOWERMENT CHALLENGE 2026  
**Report updated:** 21 October 2026 (Phase 7B — Neon DB + local admin login verified; Paystack/Resend deferred)

## Staging readiness decision

**Partial staging progress. Admin staging login works locally. Full payment/email end-to-end workflow is still NOT verified.**

| Layer | Decision |
| --- | --- |
| Staging database migrate + constraints | **Passed against external staging DB (Neon)** |
| Staging administrator login (browser) | **Passed in local integration** — `info@shechampion-bbf.org` signed in successfully via Vite (`localhost:5173`) + local API (`127.0.0.1:3001`). Live production admin remains unconfigured in Vercel. |
| Paystack test checkout / webhook / verify | **Partial** — `sk_test_` present; API smoke passed (`npm run staging:paystack-smoke`). Hosted checkout / webhook not run (registration remains closed). |
| Resend confirmation email | **Deferred / skipped for now** — operator chose to proceed without Resend |
| Browser registration open window | **Blocked** — registration closed; approvals/`EVENT_START_AT` not set (intentionally not overridden) |
| Production payments / public registration | **Not activated** |

Public registration remains **closed**. No production deploy. No live Paystack credentials. Privacy/terms flags were **not** force-set to `true`. No real event start time was invented. Admin password is **not** recorded in this report (stored only in gitignored local files).

---

## Step 1 — Preflight (latest)

Command: `npm run staging:preflight` → exit **2** (Paystack/Resend still absent by design)

| Check | Result |
| --- | --- |
| `APP_ENV=staging` | present |
| `STAGING_DATABASE_URL` | present (designated Neon staging) |
| `DATABASE_URL` | present (same staging DB) |
| `ALLOW_STAGING_MIGRATE=true` | present |
| `ALLOW_PRODUCTION_MIGRATE` | false |
| `PAYSTACK_MODE=test` | present |
| `PAYSTACK_SECRET_KEY` | **absent** (skipped for now) |
| `PUBLIC_SITE_URL` | present |
| Resend (`RESEND_API_KEY` / `EMAIL_FROM`) | **absent** (skipped for now) |
| Admin (`ADMIN_EMAIL` / `ADMIN_PASSWORD_HASH`) | **present** (`info@shechampion-bbf.org` + scrypt hash) |
| `SESSION_SECRET` | present |
| `EVENT_REGISTRATION_ENABLED` | false |
| `EVENT_PRIVACY_NOTICE_APPROVED` / terms | false (not overridden) |
| `EVENT_START_AT` | absent |
| Live Paystack / production migrate flags | not loaded |

Env files used: gitignored `.env.local` / `.env.staging.local` (never printed). One-time password note: `.admin-password.local.txt` (gitignored; delete after saving offline).

## Step 2 — Database validation

| Command | Result | Classification |
| --- | --- | --- |
| `npm run migrate:staging` | Migrations applied / skipped when current (`001`, `002`) | Passed against external staging service |
| `npm run staging:db-smoke` | connected; tables present; migrations recorded | Passed against external staging service |
| `npm run staging:db-integration` | synthetic insert; duplicate email rejected; duplicate payment ref rejected; cleanup OK; readiness remains closed; fee 500000 | Passed against external staging service |
| `npm run staging:preflight` (after) | DB + admin OK; Paystack/Resend still blockers | — |

No database reset/drop. No production DB used. Connection strings redacted in logs.

## Step 3 — Local application and provider verification

| Scenario | Classification | Result |
| --- | --- | --- |
| `vercel dev` / project link | Local tooling | **Failed** — CLI project-name/link error; not used for successful login |
| Local API server (`npm run dev:api`) | Local integration | **Passed** — listens on `127.0.0.1:3001`; Vite proxies `/api` |
| Admin API login smoke (`scripts/smoke-admin-login.mjs`) | Local integration | **Passed** — HTTP 200, session created |
| Admin browser login (`/admin/login`) | Local integration | **Passed** — operator confirmed login works on local staging stack |
| Live site admin (`shechampion-bbf.org`) | External production | **Blocked** — `ADMIN_NOT_CONFIGURED` (Vercel env missing admin vars) |
| Registration → Paystack checkout | External staging | **Blocked / deferred** — no Paystack test secret |
| Payment verify / webhook live | External staging | **Blocked / deferred** |
| Confirmation email | External staging | **Blocked / deferred** — no Resend |
| Anonymous admin API / CSRF rejection | Automated test | **Passed by automated test** |
| Cutoff / readiness gates | Automated test | **Passed by automated test** |
| Duplicate email / payment ref in DB | Staging DB integration | **Passed against external staging service** |

Paystack TEST webhook was **not** configured in any provider dashboard.

### Local staging runbook (working)

```bash
npm run dev:api          # terminal 1 — API on :3001
npm run dev              # terminal 2 — Vite on :5173 with /api proxy
# open http://localhost:5173/admin/login
```

Or: `npm run dev:staging` (API + Vite together).

## Step 4 — Launch controls (enforced)

- Registration left `EVENT_REGISTRATION_ENABLED=false`
- Privacy/terms left `false` (no organisational approval asserted)
- No invented production event start time written for a public open window
- No production deploy
- Readiness remained `ready: false` during DB integration (script aborts if unexpectedly open)
- Paystack/Resend intentionally left empty per operator request

## Step 5 — Final validation (last full automated run)

| Command | Result |
| --- | --- |
| `npm run test` | **Passed** — 8 files, 47 tests |
| `npm run lint` | **Passed** |
| `npm run build` | **Passed** |
| `npm audit` | **0** vulnerabilities |

---

## Classification matrix

| Integration | Status |
| --- | --- |
| Staging Neon connect | Passed against an external staging service |
| Migrations 001 + 002 | Passed against an external staging service |
| Unique constraints (email / payment ref) | Passed against an external staging service |
| Synthetic row cleanup | Passed against an external staging service |
| Readiness closed by default | Passed in local integration (+ automated) |
| Admin env configuration | Passed in local integration |
| Admin login API + browser (local) | Passed in local integration |
| Admin on production host | Blocked (Vercel env not set) |
| Paystack test checkout | Blocked (deferred) |
| Paystack verify / webhook (live) | Blocked / Not tested (deferred) |
| Resend email | Blocked (deferred) |
| Browser registration open + pay | Blocked |
| Unit/security suite | Passed by automated test |

## Remaining blockers for full Phase 7B E2E

**Update (21 Oct 2026):** Operator skipped Resend + legal/start-time gates for now and proceeded. Paystack TEST key is configured; `npm run staging:paystack-smoke` returned provider OK. Public registration stays **closed**.

Deferred / skipped for now:

1. `RESEND_API_KEY` + `EMAIL_FROM` (email delivery not required to proceed past admin/Paystack smoke)

Still required before a controlled open / hosted checkout window (when ready — do not invent):

2. Org approval before `EVENT_PRIVACY_NOTICE_APPROVED` / `EVENT_PARTICIPATION_TERMS_APPROVED=true`
3. Confirmed `EVENT_START_AT` / `EVENT_REGISTRATION_OPEN_AT` (`+01:00`)
4. Temporary `EVENT_REGISTRATION_ENABLED=true` for the test window only
5. Paystack hosted checkout + verify + optional TEST webhook
6. Optional: add admin env vars to Vercel if production admin access is required

**Security notes:**
- Neon DB password was previously pasted into chat — rotate in Neon and update local env.
- Staging admin password was generated into gitignored files only — do not commit; rotate if exposed.

## Defects discovered and remediations

| Issue | Resolution |
| --- | --- |
| Live admin login showed generic failure / API unavailable | Production lacks admin env; local needs API server, not Vite alone |
| `vercel dev` could not start (project name/link) | Added `npm run dev:api` + Vite `/api` proxy for staging without Vercel link |
| Login error messaging unclear | Frontend now surfaces API/host guidance |

## Non-actions confirmed

- No production deploy  
- Public registration not activated  
- No live Paystack  
- No real-money transactions  
- No cloud resources provisioned by the agent  
- No fabricated successful Paystack/Resend checkout results  
- No secret values or admin passwords printed in this report  
