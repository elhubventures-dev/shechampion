# Phase 10 — Production deployment and controlled launch

**Organisation:** SHE CHAMPIONS  
**Event:** SHE CHAMPIONS BUSINESS EMPOWERMENT CHALLENGE 2026  
**Date of report:** 23 October 2026  
**Scope:** Production configuration audit, staging/production credential separation, database preparation gates, deployment readiness, and an honest launch decision. Owner-confirmed manual testing is accepted — full automated/staging checkout suites were **not** re-run. No live payment charges. Registration kept closed.

---

## Explicit final state

### **BLOCKED — AWAITING OPERATOR PRODUCTION DEPLOY & DATABASE CONFIRMATION**

Local codebase and workstation safeguards were advanced for production. The live site at `https://www.shechampion-bbf.org` continues to serve an **older** API contract. This session could **not** authenticate to Vercel CLI (no `VERCEL_TOKEN` / no linked `.vercel` project) and could **not** positively identify a dedicated production database URL separate from staging Neon. Therefore: **no production migration applied**, **no production deploy executed from this agent**, **registration remains closed**.

---

## 1. Deployment status and version / URL

| Item | Status |
| --- | --- |
| Public production URL | `https://www.shechampion-bbf.org` — responds |
| Local HEAD (working tree) | `5ceda3f` plus substantial uncommitted Phase 8–10 work |
| Vercel CLI | Not linked (`no .vercel`); `VERCEL_TOKEN` absent; interactive login not available |
| Deploy from this phase | **Not performed** |
| Production build (`npm run build`) | **Passed** locally |

### Live site probe (non-destructive)

| Path | HTTP |
| --- | --- |
| `/`, `/challenge`, `/programs`, `/network`, `/seminars`, `/contact` | 200 |
| `/business-empowerment-challenge-2026` | 200 (copy shows **12 December 2026**; registration closed messaging) |
| `/legal/event-privacy-notice`, `/legal/event-participation-terms` | 200 |
| `/admin/login` | 200 |
| `/api/admin/registrations` | **403** (protected) |
| `/api/health` | 200 — `publicStatus: "closed"` |
| `/api/registration/status` | 200 — `registrationOpen: false`; **legacy fee fields** (`feeKobo` / `feeDisplay`) without Phase 8 pricing object |
| `/robots.txt`, `/favicon.png` | 200 |
| `/sitemap.xml` | 200 via direct request (WebFetch once reported 500 — treat as monitor) |

**Interpretation:** Production hosting is up and registration is closed, but the deployed API shape does **not** yet match the Phase 8+ local participation-pricing implementation. A production deploy of the current approved tree is still required after env/DB gates pass.

**Operator deploy (when ready):**

```text
vercel login
vercel link
# Confirm Production env vars (names only) via dashboard or:
#   vercel env pull .env.production.local --environment=production
# Do not commit .env.production.local
vercel --prod
```

Or use the Vercel GitHub integration to deploy the committed production branch after secrets and migrations are correct.

---

## 2. Production database status and migration results

| Check | Result |
| --- | --- |
| Local `DATABASE_URL` / `STAGING_DATABASE_URL` | Present; host class **staging_like** (`neon.tech`); URLs match each other |
| Dedicated production DB URL in local files | **Absent** (no `.env.production.local`) |
| Positive production target identification | **Failed** — cannot distinguish a production Neon/Postgres from staging without Vercel Production env access |
| Migrations applied this phase | **None** |
| Staging migrate used against production | **No** |
| Truncate / reset / delete legacy staging row | **Not performed** |

**Additive migration plan (when production DB is confirmed):**

1. Confirm Production `DATABASE_URL` host/database name differs from staging.
2. Ensure `APP_ENV` is not `staging`; set `ALLOW_PRODUCTION_MIGRATE=true` only for the one-shot migrate process.
3. Run `npm run migrate` (applies only missing files among `001_init`, `002_security_hardening`, `003_participation_options`).
4. Immediately unset `ALLOW_PRODUCTION_MIGRATE`.
5. Do **not** point migrate at `STAGING_DATABASE_URL`.

**Blocker:** Production database not provisioned or not positively identifiable in this environment → **no migrate**.

---

## 3. Environment separation status (secrets redacted)

### Problem found (from Phase 9C) and resolved locally

| File | Before Phase 10 | After scrub script |
| --- | --- | --- |
| `.env.local` | Live Paystack secret + public key; `PAYSTACK_MODE=live`; unconfirmed `EVENT_START_AT=2026-12-15…` | Live keys **cleared**; `PAYSTACK_MODE=test`; `EVENT_START_AT` cleared; registration still `false` |
| `.env.staging.local` | Mode `test`; empty Paystack secret; Dec 15 start | Dec 15 start **cleared**; mode remains `test` |

Script: `scripts/phase10-scrub-local-live-paystack.mjs` (does not print values).

### Ongoing safeguards

| Control | Status |
| --- | --- |
| `.gitignore` excludes `.env.local`, `.env.staging.local`, `.env.*.local`, `.admin-password.local.txt` | Confirmed |
| Local API refuses live Paystack under `APP_ENV=staging|development` | Present (`scripts/local-api-server.mjs`) |
| Paid readiness rejects live key / live mode under staging | Present (`api/_lib/config.js`) |
| Staging migrate refuses live Paystack | Present (`scripts/migrate.mjs`) |
| Live credentials stored only in Vercel Production | **Operator must ensure** — not verifiable without Vercel access |
| Combined option default when unset | Changed to **`false`** (safer production default) |

**Corrective action if live keys reappear in local files:** re-run the scrub script; place `sk_live_` **only** in Vercel Production Environment Variables; keep `sk_test_` only in staging/local test env if needed.

---

## 4. Paystack live configuration and webhook status

| Item | Evidence class | Status |
| --- | --- | --- |
| Code: callback from `PUBLIC_SITE_URL` | Configuration in code | `{PUBLIC_SITE_URL}/payment/result` |
| Expected production callback | Documented | `https://www.shechampion-bbf.org/payment/result` |
| Expected production webhook | Documented | `https://www.shechampion-bbf.org/api/payment/webhook` |
| Live secret in Vercel Production | Provider/dashboard | **Unknown** (CLI/env pull unavailable) |
| Paystack LIVE webhook configured | Provider dashboard | **Not confirmed** this phase |
| Server amount/currency verification | Code present | Present (not re-verified with live charge) |
| Idempotent webhook + no email rollback of payment | Code present | Present (Phase 9B/9C evidence on staging patterns only) |
| Live transaction this phase | — | **Not performed** (forbidden) |

Operator action: In Paystack **Live** settings, set webhook URL to `https://www.shechampion-bbf.org/api/payment/webhook` after the Phase 8+ API is deployed. Do not paste secrets into chat.

---

## 5. Email provider / sender status

| Item | Status |
| --- | --- |
| Local Resend key / `EMAIL_FROM` | Present on workstation (org domain sender shape) after Phase 9C |
| Production Resend on Vercel | **Unknown** without Production env access |
| Domain authentication | Assumed organisational domain for `EMAIL_FROM`; not re-probed this phase |
| SENT = provider message id | Unchanged implementation |
| Synthetic `@example.com` restriction | Documented in Phase 9C / `docs/email-setup.md` |

No claim that production inbox delivery was verified in Phase 10.

---

## 6. Public website, admin, and API deployment status

| Surface | Live today | Phase 8–10 local readiness |
| --- | --- | --- |
| Marketing SPA routes | Up | Build OK |
| 2026 challenge page | Up; date **12 December 2026**; venue TBD messaging | Present |
| Legal notice / terms routes | Up | Present |
| Admin login | Up | Protected |
| Admin data API | 403 without auth | Expected |
| Registration API | Closed | Must stay closed |
| Pricing API contract | **Legacy** single-fee fields on live | Local has free + challenge/exhibition/combined pricing |

Production must not depend on `.env.local` / `.env.staging.local` (Vercel injects env). Confirmed by architecture; not re-validated via a new deploy.

---

## 7. Outstanding event details and genuine approval requirements

| Topic | Project truth |
| --- | --- |
| Event **day** | **12 December 2026** (public copy / constants) |
| Exact **start time** | **Unconfirmed** — do not invent; do not use former staging `2026-12-15T09:00:00+01:00` |
| Registration cutoff | 48 hours before confirmed start — cannot compute until start time exists |
| Venue | **Not confirmed** — page states venue will be announced |
| Privacy / terms flags | Env flags are **not** proof of legal approval; keep production approvals false until genuine sign-off |
| Combined challenge + exhibition | Default **disabled** until explicit commercial decision (`ALLOW_COMBINED_CHALLENGE_EXHIBITION=true`) |
| Cancellation / refund policy | Must be present and approved before recommending public activation (not asserted as complete here) |

---

## 8. Operator actions still required

1. **Vercel:** `vercel login` → `vercel link` → inspect Production env var **names** (never commit pulled secrets).
2. **Neon / Postgres:** Provision or confirm a **production** database distinct from staging; record host class privately.
3. **Migrate:** One-shot `ALLOW_PRODUCTION_MIGRATE=true` + production `DATABASE_URL` → `npm run migrate` → unset flag. Apply only missing `001`/`002`/`003`.
4. **Production env (closed launch):**  
   `EVENT_REGISTRATION_ENABLED=false`  
   `PAYSTACK_MODE=live` + live secret **only** in Production  
   `PUBLIC_SITE_URL=https://www.shechampion-bbf.org`  
   `ALLOW_COMBINED_CHALLENGE_EXHIBITION=false`  
   Leave `EVENT_START_AT` empty until time confirmed  
   Leave approval flags false until genuine legal approval  
5. **Deploy** current approved application (`vercel --prod` or Git integration) after committing/pushing the intended revision through the team’s normal process.
6. **Paystack Live dashboard:** webhook → `https://www.shechampion-bbf.org/api/payment/webhook`.
7. **Resend:** confirm production sender/domain for `EMAIL_FROM`.
8. **Post-deploy smoke (operator):** health closed; registration status closed; admin still 401/403 anonymous; sitemap/robots OK. Still **no** live charge.
9. **Commit/push** Phase 8–10 code when the organisation is ready (large uncommitted tree remains on the workstation).

Helper: `node scripts/phase10-prod-env-checklist.mjs`

---

## 9. Safeguards applied in this phase (code / local)

- Scrubbed live Paystack credentials from local staging env files.
- Cleared unconfirmed 15 December `EVENT_START_AT` from local env files.
- Combined participation defaults to **disabled** when the env var is unset (`config`, `validation`, `pricing` helpers + `.env.example`).
- Production env checklist script and Paystack docs updated with the concrete production webhook URL.
- Production build verified locally.

Registration was **not** enabled. No real-money transaction was attempted. Staging database was not migrated as production.

---

## 10. Recommendation

**Do not announce a full launch.** Treat the current public site as **deployed marketing + closed registration**, pending:

1. Dedicated production DB + migrations  
2. Authenticated production deploy of Phase 8–10 code  
3. Confirmed live Paystack webhook + Production-only live secrets  
4. Confirmed event start time, venue, and legal approvals before any open window  

**Next phase (when operators complete the actions above):** verify Production env shapes (no secrets in chat), deploy, confirm `/api/registration/status` returns the Phase 8 pricing payload while still `closed`, then schedule a deliberate registration-open decision as a separate controlled launch phase.
