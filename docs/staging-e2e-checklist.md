# Staging / non-production end-to-end checklist

Use only **explicitly designated non-production** credentials (Paystack test keys, Preview or local Neon database, Resend test/sandbox sender).

Never use live Paystack keys, real-money cards, production applicant data, or guessed secrets.

## Isolation gates (mandatory)

Before any migration or payment init:

1. `APP_ENV=staging`
2. `ALLOW_STAGING_MIGRATE=true` (migrations / DB smoke only)
3. `STAGING_DATABASE_URL` points at a disposable staging DB (not production-named)
4. `PAYSTACK_MODE=test` and `PAYSTACK_SECRET_KEY` begins with `sk_test_`
5. `EVENT_REGISTRATION_ENABLED=false` until the controlled-open step
6. Do **not** set privacy/terms approvals to `true` unless the organisation has approved those documents
7. Do **not** invent a public event start time; only set `EVENT_START_AT` when confirmed, or keep registration closed

Run readiness without printing secrets:

```bash
npm run staging:preflight
```

## Preconditions

1. Create `.env.staging.local` from `.env.example` (gitignored). Prefer `STAGING_DATABASE_URL`.
2. Apply migrations under staging safeguards only:
   ```bash
   # PowerShell example — values come from your private env file / shell, not the repo
   $env:APP_ENV="staging"
   $env:ALLOW_STAGING_MIGRATE="true"
   # $env:STAGING_DATABASE_URL="..."   # set privately
   npm run migrate:staging
   npm run staging:db-smoke
   ```
3. Install Vercel CLI if running APIs locally: `npm i -g vercel`
4. `PUBLIC_SITE_URL` must match the origin you browse (e.g. `http://localhost:3000`)
5. Generate admin hash: `npm run hash-admin-password`
6. Run full stack: `npm run dev:full` (Vite alone does not serve `/api`)

## Controlled open (test window only)

Only after staging DB smoke passes and Paystack/Resend test config is confirmed:

1. Organisation has approved privacy notice + participation terms **or** you accept that full public registration E2E remains blocked
2. Set staging-only (private env), never production:
   - `EVENT_PRIVACY_NOTICE_APPROVED=true` — only if actually approved
   - `EVENT_PARTICIPATION_TERMS_APPROVED=true` — only if actually approved
   - Confirmed `EVENT_START_AT` with `+01:00` (Africa/Lagos), or keep registration closed
   - `EVENT_REGISTRATION_OPEN_AT` in the past for the test window
   - `EVENT_REGISTRATION_ENABLED=true`
   - `PAYSTACK_MODE=test`
3. Restart `vercel dev`
4. `GET /api/registration/status` should report open only inside the window

## Exercise the payment path

1. Open `/business-empowerment-challenge-2026#participation`
2. Submit a valid short application using synthetic data only (e.g. name prefix `STAGING TEST`)
3. Confirm redirect to Paystack hosted checkout (test mode)
4. Complete a Paystack **test** charge
5. Land on `/payment/result` and confirm server verification (SPA uses POST `/api/payment/verify`)
6. Confirm registration reference appears only after verification succeeds
7. Confirm confirmation email attempt is recorded (`SENT` only with provider message id)

## Webhook (test)

1. After a non-production URL/tunnel exists, configure Paystack **test** webhook to  
   `https://<staging-host>/api/payment/webhook` (manual dashboard action; authorize first)
2. Re-deliver a `charge.success` event
3. Confirm payment remains a single SUCCESS (idempotent)
4. Optionally deliver failure/reversal fixtures

## Admin path

1. Sign in at `/admin/login`
2. Open `/admin/event-registrations`
3. Locate the synthetic paid registration and payment reference
4. Retry confirmation email if FAILED
5. Export CSV via the dashboard button (POST + CSRF)
6. Sign out; confirm `/api/admin/me` returns 401

## Negative cases

1. `EVENT_REGISTRATION_ENABLED=false` → create refuses payment init
2. Past cutoff → closed
3. Invalid fields → 400
4. Admin APIs without cookies → 401/403
5. Forged webhook signature → 401
6. Payment init failure → recoverable pending/init-failed, no false SUCCESS

## Cleanup (staging only)

1. Identify rows with synthetic markers (e.g. email domain or name prefix used in the test)
2. Delete only those rows in the staging DB via a deliberate SQL session
3. Preserve audit rows if needed for evidence
4. Never run cleanup against production

## Close the window

1. Set `EVENT_REGISTRATION_ENABLED=false`
2. Confirm public status is closed/unavailable
3. Do **not** promote staging env values to production unchanged

## Unavailable without credentials

If Neon, Paystack test keys, Resend, or Vercel CLI are missing, skip provider steps and rely on automated unit tests + `npm run staging:preflight`. Do not fabricate credentials.
