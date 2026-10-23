# Phase 9C — Checkout completion, webhook delivery, and email remediation

**Organisation:** SHE CHAMPIONS  
**Event:** SHE CHAMPIONS BUSINESS EMPOWERMENT CHALLENGE 2026  
**Date of report:** 22 October 2026  
**Scope:** Complete remaining staging-only integration checks from Phase 9B gaps. Diagnose defects. No production deployment. Public registration left closed.

---

## Verdict

| Area | Outcome |
| --- | --- |
| Staging isolation / registration closed | **Passed** — `EVENT_REGISTRATION_ENABLED=false`; API reports closed |
| Paid confirmation email diagnosis | **Root cause found** — Resend recipient restriction on `example.com` / `example.invalid`, not a template defect |
| Paid + free confirmation to allowed recipient | **Passed** — provider accepted; `email_deliveries.status=SENT` with message id |
| Hosted Paystack test checkout + callback | **Blocked** — live Paystack credentials present in local env; test secret absent |
| Provider-delivered webhook | **Blocked** — no authorized public staging endpoint; test Paystack key unavailable |
| Admin reconciliation (email synthetics) | **Passed** for Phase 9C email rows |
| Production readiness | **Not ready** — restore `sk_test_`, complete hosted checkout + webhook, confirm legal/event-start inputs |

Evidence classes are labelled explicitly below. No fabricated checkout or webhook successes.

---

## 1. Staging isolation and readiness

### Preflight

`npm run staging:preflight` → `ok: true` with blocker:

- `Paystack test credentials/mode are absent or not safely test-only.`
- `PAYSTACK_SECRET_KEY` classified as **`invalid_live_key_in_env`**
- `PAYSTACK_MODE` effective value from `.env.staging.local` remains `test`, but the merged secret from `.env.local` is a **live** key
- `EVENT_REGISTRATION_ENABLED=false`
- `APP_ENV=staging`; staging DB URLs present and matching; `ALLOW_PRODUCTION_MIGRATE=false`
- Migrations include `001_init`, `002_security_hardening`, `003_participation_options` (`staging:db-smoke` passed)

Secrets, connection strings, and passwords were not printed.

### Env audit (prefixes only)

| File | Paystack secret | Paystack mode | Notes |
| --- | --- | --- | --- |
| `.env.staging.local` | absent | `test` | Comment requires `sk_test_`; key empty |
| `.env.local` | **LIVE** (`sk_live_…`) | `live` | Also contains live public key material — not used by this phase |
| Effective merge for scripts | **LIVE** (filled from `.env.local`) | `test` (from staging.local first) | Unsafe mismatch |

**Hardening applied this phase:**

1. `evaluateReadiness` / paid checkout gates reject live secrets under `APP_ENV=staging|development`, reject `sk_live_` when `PAYSTACK_MODE=test`, and reject `PAYSTACK_MODE=live` under staging/development (`api/_lib/config.js` + tests).
2. `scripts/local-api-server.mjs` refuses to keep live Paystack credentials in-process when `APP_ENV=staging|development` (clears secret; forces mode `test`).
3. `.env.example` documents not mixing live keys into staging local env; prefer `sk_test_` in `.env.staging.local`.

### `EVENT_START_AT` investigation

| Source | Value |
| --- | --- |
| Public / code display (`EVENT_DATE_DISPLAY`, `event2026.js`) | **12 December 2026** |
| Staging env `EVENT_START_AT` | **`2026-12-15T09:00:00+01:00`** (cutoff derived 13 December) |
| Operator note in this phase brief | Actual event day is **12 December 2026**; exact start time **unconfirmed** |

**Conclusion:** The 15 December timestamp is a **staging configuration inconsistency**, not an official schedule. It was **not** copied into production, **not** treated as confirmed start time, and **not** replaced with an invented clock time. Before any public open, the organisation must set a confirmed `EVENT_START_AT` (with `+01:00`) aligned to the real event day/time.

### Privacy / participation-terms approval flags

Staging env currently has both approval flags `true`. Phase 7 reports recorded them as false / not asserted. This phase **did not** set them to `true` to pass gates and **cannot** independently certify organisational legal sign-off from the repository. Remaining blocker: confirm flags match genuine approval before any controlled public window.

Registration was **not** opened for Phase 9C checkout (Paystack test key unavailable).

---

## 2. Hosted checkout investigation and outcome

### Phase 9B failure class

Prior automation stuck on Paystack hosted checkout loading. Likely causes considered:

| Hypothesis | Assessment |
| --- | --- |
| Browser automation limitation | **Most likely** for Phase 9B — checkout.paystack.com often does not complete under automated browsers |
| Incorrect redirect / URL handling | Initialize returned a normal `checkout.paystack.com` authorization URL; no app redirect defect proven |
| Expired pending transaction | Possible for abandoned rows; not proven as root cause of spinner |
| Paystack test configuration | Was working for initialize in Phase 9B with `sk_test_` |
| Unsupported direct charge settle | Correctly avoided (Phase 9B noted Charge API cannot settle initialized hosted refs) |

### Phase 9C attempt

**Not executed.** Preconditions failed:

1. No `sk_test_` secret in `.env.staging.local`
2. `.env.local` contains live Paystack mode/keys — must not be used for staging payments
3. Preflight `paystackTestSafe: false`
4. Paid checkout readiness blocked by new live-key safeguards

No hosted checkout URL was opened for user-operated payment in this phase. Scenario marked **blocked**, not passed.

**Operator action required:** Place a Paystack **test** secret (`sk_test_…`) and `PAYSTACK_MODE=test` in `.env.staging.local` (loaded first). Keep live keys out of the staging process environment. Then re-run a short controlled window for human test-card checkout.

---

## 3. Callback and server-verification results

| Scenario | Result |
| --- | --- |
| Fresh synthetic initialize → hosted pay → `/payment/result` → `/api/payment/verify` | **Blocked** (no test key / no checkout) |
| Challenge `500000` / exhibition `3000000` / combined `3500000` live verify | **Not re-run** this phase |
| Phase 9B prior evidence | Still valid for initialize + signed-local-webhook confirmation paths; not repeated here |

No browser redirect was treated as payment proof.

---

## 4. Webhook dashboard delivery evidence

| Requirement | Status |
| --- | --- |
| Authorized publicly reachable non-production HTTPS endpoint | **Not available / not authorized in this session** |
| Paystack **TEST** dashboard webhook configured to staging `/api/payment/webhook` | **Not configured** (live dashboard not touched) |
| Provider-delivered event in Paystack test webhook history | **Not observed** |
| Invalid signature rejection / duplicate idempotency | Covered previously by **signed local** simulations and unit tests — **not** the same as provider delivery |

**Blocked.** Missing: operator-authorized staging HTTPS URL or approved temporary tunnel **and** a test secret so only the Paystack **test** webhook can be pointed at it.

---

## 5. Resend failure diagnosis and remediation

### Diagnosis

Probes (`scripts/staging-phase9c-email-probe.mjs`) against live Resend (staging credentials):

| Probe | Result |
| --- | --- |
| Free template → `@example.com` | **Failed** — HTTP 422 validation: use testing email / do not use domains like `example.com` |
| Paid `participation_confirmation` → `@example.com` | **Same failure** |
| Free template → organisational notify address | **Accepted** — message id returned |
| Paid template → organisational notify address | **Accepted** — message id returned |

**Category:** recipient restriction / provider request rejection on `to` (Resend testing rules), **not**:

- API authentication failure
- Sender-domain unverified for the configured `EMAIL_FROM` (org-domain sends succeeded)
- Application template/mapping defect specific to paid vs free
- Network timeout

Phase 9B paid `FAILED` rows with synthetic `example.com` / `example.invalid` recipients are explained by this restriction. Free `SENT` reports from that phase for `example.*` addresses are **not** reproducible under current Resend rules (both free and paid fail to those domains now).

### Remediation

| Change | Detail |
| --- | --- |
| Application send path | **No defect requiring a code change** — failures already stored as `FAILED` with provider message; payment not reversed |
| Docs | `docs/email-setup.md` updated with staging synthetic recipient rules |
| Proof | `scripts/staging-phase9c-email-remediate.mjs` inserted synthetic SUCCESS / free rows with org **plus-address** recipients and called send helpers |

Proof results (provider submission, not inbox guarantee):

| Reference | Type | `email_deliveries.status` | Message id |
| --- | --- | --- | --- |
| `SC-2026-P9CMVJQ89YG` | Paid participation confirmation | `SENT` | present |
| `SC-2026-P9CFVJQ89YG` | Free registration confirmation | `SENT` | present |

`SENT` means Resend accepted the API request and returned an id — not confirmed mailbox delivery.

---

## 6. Admin reconciliation results

Authenticated admin API (`/api/admin/registrations?q=P9C`) while synthetics present:

| Reference | Event reg | Payment | Participation | Expected kobo | Email |
| --- | --- | --- | --- | --- | --- |
| `SC-2026-P9CFVJQ89YG` | `REGISTERED` | `NOT_REQUIRED` | none selected | `0` | `SENT` |
| `SC-2026-P9CMVJQ89YG` | `REGISTERED` | `SUCCESS` | challenge `CONFIRMED` | `500000` | `SENT` |

Also confirmed: anonymous admin denied; CSRF without token rejected (existing admin check script). Email failure would show as `FAILED` without forcing payment failed — demonstrated historically in Phase 9B; this phase’s paid proof used successful email.

Email retry after failure was not required for these rows (already `SENT`). No applicant PII exposed anonymously.

---

## 7. Synthetic test references and cleanup

| Reference | Purpose |
| --- | --- |
| `SC-2026-P9CMVJQ89YG` | Paid email remediation proof |
| `SC-2026-P9CFVJQ89YG` | Free email remediation proof |

Cleanup: `scripts/staging-phase9b-cleanup.mjs` extended for `STAGING TEST P9C%` / `+p9c.` markers → **`deleted: 2`, `leftover: 0`**. Legacy non-synthetic registration retained. No truncate. Registration remained closed (`registrationOpen: false`).

---

## 8. Test, lint, build, and audit results

| Command | Result |
| --- | --- |
| `npm run staging:preflight` | Passed shape checks; **Paystack test-safe blocker present** |
| `npm run staging:db-smoke` | Passed |
| `npm run test` | Passed — **9** files, **68** tests (includes new live-key readiness cases) |
| `npm run lint` | Passed |
| `npm run build` | Passed |
| `npm audit` | **0** vulnerabilities |

---

## 9. Remaining operational and organizational blockers

1. **Restore Paystack test secret** into `.env.staging.local` (`sk_test_…`, `PAYSTACK_MODE=test`). Remove or isolate live keys from the staging process environment.
2. **Human hosted test checkout** for challenge / exhibition / combined with callback verify (no automation assumption).
3. **Authorized staging HTTPS webhook endpoint** + Paystack **TEST** dashboard webhook only.
4. Confirm **privacy / terms** flags match real organisational approval.
5. Replace staging `EVENT_START_AT` only after a **confirmed** 12 December 2026 start time (do not invent).
6. Resend: for synthetics use verified-domain plus-addresses (or Resend’s documented testing recipient); optionally enable unrestricted sending when domain verification allows.
7. Do not open production registration or load live payments until the above are cleared.

---

## 10. Production-readiness recommendation

**Not ready for production registration or live payments.**

Ready to proceed once operators:

1. Fix local Paystack test credentials isolation  
2. Complete user-operated Paystack **test** hosted checkout + server verify for each amount  
3. Optionally prove provider-delivered test webhooks  
4. Confirm legal approvals and event start timestamp  

**Stop point:** Phase 9C diagnosis, email remediation proof, and readiness hardening complete. Registration closed. Production untouched. No live Paystack charges performed.

---

## Helper scripts added

- `scripts/staging-phase9c-env-audit.mjs`
- `scripts/staging-phase9c-email-probe.mjs`
- `scripts/staging-phase9c-email-remediate.mjs`
- `scripts/staging-phase9c-admin-email-check.mjs`
