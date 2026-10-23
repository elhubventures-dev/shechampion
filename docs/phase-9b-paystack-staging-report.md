# Phase 9B — Paystack sandbox end-to-end testing (staging)

**Organisation:** SHE CHAMPIONS  
**Event:** SHE CHAMPIONS BUSINESS EMPOWERMENT CHALLENGE 2026  
**Date of report:** 22 October 2026  
**Scope:** Verify Paystack **test-mode** transactions against the designated staging database and Phase 8 participation pricing. Local full-stack staging only. No production deployment, no live Paystack credentials, no real-money charges.

---

## Verdict

Staging Paystack **test** initialize + amount/currency enforcement + server-side confirmation (via HMAC-signed local webhook deliveries) **passed** for free, challenge (₦5,000), exhibition (₦30,000), and combined (₦35,000). Admin API checks against those synthetic rows **passed**. Provider-dashboard webhook delivery and automated hosted-card completion remain **blocked** (no authorized public tunnel; Paystack checkout UI stalled under browser automation). Staging registration window was **restored to closed** after testing.

Evidence classes used in this report:

| Class | Meaning |
| --- | --- |
| Automated (Vitest) | Unit/integration tests with mocked provider responses |
| Local integration | Local API (`127.0.0.1:3001`) + staging Neon DB |
| Real Paystack test API | Live calls to Paystack test initialize (and related) with `sk_test_` |
| Signed local webhook | HMAC-SHA512 over raw body using the local test secret — simulates provider delivery; **not** Paystack dashboard delivery |
| Hosted checkout UI | Browser open of `checkout.paystack.com` |

---

## 1. Staging isolation checks

| Check | Result |
| --- | --- |
| `npm run staging:preflight` | **Passed** (`ok: true`, `secretsPrinted: false`) |
| `APP_ENV` | `staging` |
| `STAGING_DATABASE_URL` / `DATABASE_URL` | Present and **match**; host class staging-like |
| Migration 003 | Applied (`003_participation_options` exactly once) — confirmed by `staging:db-smoke` and `staging:phase9a-verify` |
| `PAYSTACK_MODE` | `test` |
| Paystack secret prefix | `sk_test_` (value never printed) |
| `ALLOW_STAGING_MIGRATE` | `true` |
| `ALLOW_PRODUCTION_MIGRATE` | `false` |
| Production deploy / migrate | Not performed |
| Privacy / terms approval flags in staging env | Both `true` (pre-existing operator config; this phase did not invent approvals) |
| `EVENT_START_AT` | `2026-12-15T09:00:00+01:00` |
| `EVENT_REGISTRATION_OPEN_AT` | `2026-10-01T00:00:00+01:00` |
| Controlled test window authorization | Explicit Phase 9B request; window started with `EVENT_REGISTRATION_ENABLED=true` |
| Post-test registration flag | Restored to `EVENT_REGISTRATION_ENABLED=false`; API `publicStatus: closed` |

No launch gates were overridden. Production settings were not changed.

---

## 2. Configuration readiness (no secret values)

| Item | Status |
| --- | --- |
| Local API | `http://127.0.0.1:3001` — health OK |
| Frontend pairing | Vite `http://localhost:5173` with `/api` proxy to local API |
| Paystack test mode | Ready (`PAYSTACK_MODE=test`, `sk_test_` prefix) |
| Combined option | `ALLOW_COMBINED_CHALLENGE_EXHIBITION` unset → server default **`true`** (combined scenarios executed) |
| Resend | `RESEND_API_KEY` and `EMAIL_FROM` **present** (shape complete; delivery outcomes below) |
| Admin | `ADMIN_PASSWORD_HASH` present; plaintext password only in gitignored local credential file for operator login (never logged) |
| Webhook public endpoint | **Not available** — no authorized tunnel; Paystack **test** dashboard webhook not configured |

---

## 3. Free-registration test results

**Evidence:** local integration + staging DB.

| Assertion | Result |
| --- | --- |
| Synthetic free create (`challengeSelected=false`, `exhibitionSelected=false`) | HTTP 200, `ok: true` |
| Public reference | `SC-2026-53063D21B5` |
| `event_registration_status` | `REGISTERED` (response) |
| `payment_status` | `NOT_REQUIRED` |
| `expectedAmountKobo` | `0` |
| Payment transactions | **None** |
| Checkout URL | `null` — Paystack initialize **not** called |
| Email | Response `emailStatus: "SENT"` (Resend configured; see §11) |

Duplicate-email / invalid category probes returned validation errors as expected. Idempotent replay behaviour for free path was exercised in earlier Phase 9B create scripts; free path does not create payment rows.

Do not treat SPA confirmation alone as success — server JSON and DB were inspected.

---

## 4. Challenge payment results

**Evidence:** real Paystack test initialize + signed local webhook confirmation + staging DB.

| Step | Result |
| --- | --- |
| Women-only attestation required | Enforced server-side (create without attestation rejected in validation suite / create probes) |
| Server amount | `500000` kobo, currency `NGN` |
| Payment reference persisted | Yes (pending transaction before confirmation) |
| Paystack initialize | Real test API returned hosted checkout URL |
| Pre-payment challenge status | `PENDING_PAYMENT` / unconfirmed |
| Confirmation path used | Signed local `charge.success` webhook (not browser redirect proof) |
| Confirmed synthetic reference | `SC-2026-78BAEE64F7` — `payment_status=SUCCESS`, `challenge_status=CONFIRMED`, `exhibition_status=NOT_SELECTED` |
| Hosted UI card completion | **Blocked** for automation — initialize for `SC-2026-560CAFC010` produced `https://checkout.paystack.com/...` but the hosted page remained on a loading state under browser automation; card was not completed |

Charge API against an already-initialized hosted reference was **not** a reliable settle path in test (`initialize_only` / incomplete charge behaviour observed earlier); confirmation evidence for challenge therefore rests on signed webhook apply + DB state, plus real initialize.

---

## 5. Exhibition payment results

| Assertion | Result |
| --- | --- |
| Business-owner attestation + business fields | Required and validated |
| Amount | `3000000` kobo, `NGN` |
| Confirmed synthetic reference | `SC-2026-E2C0D3145D` |
| Post-verify statuses | `payment_status=SUCCESS`, `exhibition_status=CONFIRMED`, `challenge_status=NOT_SELECTED` |
| Challenge not confirmed by exhibition payment | **Passed** |

Confirmation method: signed local webhook after real Paystack test initialize (same class as challenge).

---

## 6. Combined-payment results

| Item | Result |
| --- | --- |
| Staging `ALLOW_COMBINED_CHALLENGE_EXHIBITION` | Unset → default **`true`** |
| Combined create | Allowed; amount `3500000` kobo |
| Confirmed synthetic reference | `SC-2026-8E1C959CEF` |
| Both activities confirmed after success | `challenge_status=CONFIRMED` and `exhibition_status=CONFIRMED` |
| Combined disabled rejection | Covered by automated / Phase 9A synthetic verify (`combinedDisabledRejected`, `combinedDisabledServerValidation`) — **not** re-forced in live staging env (would alter authorized staging config mid-window). Production combined config was not changed. |

---

## 7. Callback and server-verification evidence

| Path | Evidence |
| --- | --- |
| Paystack initialize amounts | Challenge `500000`, exhibition `3000000`, combined `3500000`, currency `NGN` — persisted on `payment_transactions` before checkout |
| Browser redirect as sole proof | **Not used** |
| Server apply after success signal | Signed webhook → DB `SUCCESS` + activity `CONFIRMED` |
| Incorrect payment reference (verify) | HTTP 400 `INVALID_REFERENCE` |
| Wrong-amount success webhook | HTTP 200 `ignored` / amount mismatch — challenge remained `PENDING_PAYMENT`; event stayed `REGISTERED` (`SC-2026-1865C5514E` path) |
| Failed charge webhook | Payment `FAILED`; challenge **not** confirmed; event registration retained |
| Client-supplied amount fields | Ignored / rejected — server-calculated expected amount only |

Hosted callback → `/payment/result` → `/api/payment/verify` with a **provider-settled** test charge was not completed because hosted card automation did not finish.

---

## 8. Webhook delivery, signature, idempotency, and retry

| Scenario | Class | Result |
| --- | --- | --- |
| HMAC-SHA512 valid signature over raw body | Signed local webhook | Accepted; payment applied |
| Invalid / forged signature | Local | HTTP **401** `INVALID_SIGNATURE` — verification **never** disabled |
| Duplicate exact delivery | Signed local | Acknowledged as duplicate; no second confirmation side-effect |
| Unknown reference | Signed local | `ignored: true`, `UNKNOWN_REFERENCE` — unrelated rows unchanged |
| Processing after email/record failure | Local + code fix | Webhook can ACK success after payment apply even if email recording fails (see §14) |
| Paystack dashboard → public URL delivery | Provider-delivered | **Blocked** — no authorized publicly reachable staging webhook endpoint; live webhook URL not configured |

Mocked/signed local webhook tests are **distinct** from provider-delivered webhook tests.

---

## 9. Failure and reversal tests

| Scenario | Result |
| --- | --- |
| Cancelled hosted checkout | Not fully exercised (hosted UI automation blocked); abandoned pending row left `PENDING` without confirming participation |
| Failed transaction webhook | Payment `FAILED`; challenge not confirmed; free event registration retained |
| Pending transaction | Pre-webhook paid rows remain pending until valid success |
| Incorrect reference | Verify rejects; unknown webhook ignored |
| Incorrect amount / currency | Success webhook with wrong amount ignored |
| Challenge payment confirming exhibition | Not observed — challenge success left exhibition `NOT_SELECTED` |
| Exhibition payment confirming challenge | Not observed — exhibition success left challenge `NOT_SELECTED` |
| Duplicate verification / duplicate webhook | Duplicate delivery short-circuits |
| Invalid webhook signature | 401 |
| Retry after processing failure | Addressed by webhook ACK hardening + optimistic DB updates (see §14) |
| Payment reversal | **Not exercised** — no supported provider reversal fixture completed in this window |
| Client-supplied amount | Does not control charged/expected amount |
| Combined when disabled | Automated / Phase 9A coverage; staging default remains enabled |
| Failed/abandoned payment undoing free registration | **Not observed** — event `REGISTERED` retained on failed/wrong-amount paths |

---

## 10. Admin dashboard results

**Evidence:** authenticated admin API against local staging (`scripts/staging-phase9b-admin-check.mjs`) while synthetic rows still present.

| Check | Result |
| --- | --- |
| Login | Passed |
| Anonymous list access | Denied (401/403) |
| Challenge / exhibition / combined synthetics visible | Yes (`SC-2026-78BAEE64F7`, `SC-2026-E2C0D3145D`, `SC-2026-8E1C959CEF`) |
| Participation filter (`challenge`) | Distinguishes challenge-only |
| Summary counters (during window) | `challenge_applicants: 5`, `confirmed_challenge_participants: 2`, `exhibition_applicants: 2`, `confirmed_exhibitors: 2`, `both_activities: 1`, `verified_payments: 3`, `free_event_registrations: 0` at check time (free row created after this check) |
| CSV export | HTTP 200; includes expected-amount column and the challenge/exhibition/combined public references |
| CSRF without token | Rejected |
| Manual mark-as-paid | Not used |

UI route `/admin/event-registrations` was not re-browser-walked in this close-out; API coverage matches the Phase 7C admin surface used by the dashboard.

---

## 11. Email status and Resend blockers

| Observation | Detail |
| --- | --- |
| Credentials | Resend key + from-address **present** in staging env (values not printed) |
| Free confirmation | Create response reported `emailStatus: "SENT"` for free synthetic |
| Paid participation confirmation | DB `email_deliveries` rows for confirmed paid synthetics recorded **`FAILED`** (`participation_confirmation`) while payment statuses remained `SUCCESS` |
| Payment persistence vs email | Payment apply **not** rolled back when email fails (required behaviour) |
| Honest reporting | Do **not** claim reliable paid confirmation email until failed deliveries are diagnosed (domain/template/provider response) |

Prior phases reported Resend absent; current staging env has credentials configured, but paid confirmation delivery is still unreliable.

---

## 12. Synthetic records created and cleanup

Public references exercised (all synthetic / `STAGING TEST P9B*` naming):

| Reference | Role |
| --- | --- |
| `SC-2026-53063D21B5` | Free-only |
| `SC-2026-78BAEE64F7` | Challenge confirmed |
| `SC-2026-E2C0D3145D` | Exhibition confirmed |
| `SC-2026-8E1C959CEF` | Combined confirmed |
| `SC-2026-1865C5514E` | Wrong-amount / failed webhook |
| `SC-2026-560CAFC010` | Hosted checkout initialize (pending) |
| `SC-2026-4737D57F7B` | Combined probe under default-allow |

Cleanup: `node scripts/staging-phase9b-cleanup.mjs` → **`deleted: 7`, `leftover: 0`**. Only Phase 9B synthetic markers deleted (email patterns / name prefix). No table truncate. Post-cleanup staging registration count: **1** (legacy non-synthetic row retained). Rate-limit buckets for create/verify cleared as part of cleanup.

Controlled window closed: `EVENT_REGISTRATION_ENABLED=false`; health reports `publicStatus: "closed"`.

---

## 13. Test, lint, build, and audit results

| Command | Result |
| --- | --- |
| `npm run staging:preflight` | Passed (post-close: registration disabled) |
| `npm run staging:db-smoke` | Passed — migrations `001`, `002`, `003` |
| `npm run staging:phase9a-verify` | Passed (`ok: true`) |
| `npm run test` | Passed — **9** files, **66** tests |
| `npm run lint` | Passed |
| `npm run build` | Passed |
| `npm audit` | **0** vulnerabilities (registry reachable) |

---

## 14. Issues discovered and fixes applied

| Issue | Fix |
| --- | --- |
| Neon HTTP `sql.transaction` callback unsafe — payment apply could crash the local API (`PAYMENT_UPDATE_CONFLICT` / process abort) | `registrationService` switched to **optimistic sequential updates** with status guards; local API process error handlers retained |
| Webhook HTTP 500 after successful payment apply when email or `webhook_events` recording failed | `api/payment/webhook.js` — catch email/record failures so provider ACK still returns success after apply |
| Stale local API module cache serving pre–Phase 8 create behaviour | Restart `npm run dev:api` after pricing changes |
| Paystack reject of `@example.invalid` on initialize | Use `@example.com` (or valid-format) emails for paid initialize tests |
| Hosted checkout stuck loading under automation | Documented blocker; no production workaround applied |
| No public webhook tunnel | Documented blocker; used signed local deliveries only |

---

## 15. Remaining organizational approvals / operational items

These are **not** claimed complete by this phase:

1. Human completion of Paystack **test** hosted checkout (test card) and callback verify path  
2. Authorized non-production public URL / tunnel + Paystack **test** webhook dashboard configuration (never live webhook)  
3. Diagnosis of paid `participation_confirmation` Resend failures  
4. Explicit organizational go-ahead before any **production** registration open  
5. Confirmation that privacy notice / participation terms approvals reflected in env match the organisation’s current legal sign-off (flags are present in staging env; this report does not invent new approvals)  
6. Decision on whether staging `ALLOW_COMBINED_CHALLENGE_EXHIBITION` should be explicitly set (currently defaults to `true` when unset)

---

## 16. Recommendation for the next phase

**Proceed to a focused Phase 9C / staging checkout hardening**, not production activation:

1. Keep `EVENT_REGISTRATION_ENABLED=false` except during short, authorized staging windows.  
2. Manually complete one Paystack **test** hosted checkout per activity (challenge, exhibition, combined) and confirm `/api/payment/verify`.  
3. Optionally attach a temporary authorized tunnel to Paystack **test** webhook only; re-run signature, duplicate, and unknown-reference cases from the provider.  
4. Fix paid confirmation email delivery against Resend before promising applicant email.  
5. **Do not** enable production registration, load `sk_live_` keys, or run production migrations based on this report alone.

**Stop point:** Phase 9B testing and reporting complete. Public/production registration not activated.

---

## Helper scripts used (staging-only)

- `scripts/staging-phase9b-e2e.mjs`
- `scripts/staging-phase9b-complete-paid.mjs`
- `scripts/staging-phase9b-checkout-one.mjs`
- `scripts/staging-phase9b-free-and-security.mjs`
- `scripts/staging-phase9b-admin-check.mjs`
- `scripts/staging-phase9b-status.mjs`
- `scripts/staging-phase9b-cleanup.mjs`
- `scripts/staging-phase9b-inspect-ref.mjs`

Secrets, cookies, full payment references, and applicant PII are intentionally omitted from this report.
