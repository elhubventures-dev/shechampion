# Backend setup — Event registration & payment (Phase 5)

This project remains a Vite SPA on Vercel. Backend endpoints live in `/api` as Vercel Node.js serverless functions. PostgreSQL (Neon-compatible) stores registrations and payments. The browser never receives `DATABASE_URL` or Paystack secrets.

## Prerequisites

- Node.js 20+
- A Neon (or compatible) PostgreSQL database
- Paystack account (test keys first)
- Resend account with a verified sender
- Vercel CLI for local API development (`npm i -g vercel`)

## Environment variables

Copy `.env.example` to `.env.local` (local) or configure the same keys in the Vercel project settings (Preview / Production separately).

Required to **open** public registration (all must be satisfied by the readiness check):

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `PUBLIC_SITE_URL` | Absolute site origin for Paystack callback |
| `EVENT_REGISTRATION_ENABLED` | Must be `true` |
| `EVENT_REGISTRATION_OPEN_AT` | ISO-8601 open timestamp |
| `EVENT_START_AT` | ISO-8601 event start (cutoff = start − 48h) |
| `EVENT_PRIVACY_NOTICE_APPROVED` | Must be `true` after legal review |
| `EVENT_PARTICIPATION_TERMS_APPROVED` | Must be `true` after legal review |
| `PAYSTACK_SECRET_KEY` | Server-side Paystack secret |
| `PAYSTACK_MODE` | `test` or `live` |
| `ADMIN_EMAIL` | Admin login email |
| `ADMIN_PASSWORD_HASH` | scrypt hash from `npm run hash-admin-password` |
| `SESSION_SECRET` | ≥32 character random secret |
| `RESEND_API_KEY` | Resend API key |
| `EMAIL_FROM` | Verified sender address |

Optional: `ADMIN_NOTIFICATION_EMAIL`.

**Defaults keep registration closed.** Leaving `EVENT_REGISTRATION_ENABLED=false` (or unset) prevents payment initialization.

Production on Vercel (`VERCEL_ENV=production`) will not treat readiness as open while `PAYSTACK_MODE=test`.

## Database migrations

Migrations live in `migrations/`. They are **not** applied automatically on deploy.

Staging (required for Phase 7 and all non-production schema work):

```bash
# PowerShell — set private values in the shell; never commit them
$env:APP_ENV="staging"
$env:ALLOW_STAGING_MIGRATE="true"
$env:STAGING_DATABASE_URL="postgres://..."   # disposable staging DB only
npm run migrate:staging
npm run staging:db-smoke
npm run staging:preflight
```

Production requires a separate explicit override (never use for staging tests):

```bash
$env:ALLOW_PRODUCTION_MIGRATE="true"
$env:DATABASE_URL="..."
npm run migrate
```

The migrate script refuses staging runs when the URL name suggests production, when live Paystack mode/keys are loaded, or when `ALLOW_STAGING_MIGRATE` / `APP_ENV=staging` are missing.

Do not drop or reset an existing production database.

## Local development

1. Configure `.env.local` with safe test values (registration still closed by default).
2. Apply migrations to a **non-production** database.
3. Run API + SPA together:

```bash
npm run dev:full
```

`vite` alone (`npm run dev`) does **not** serve `/api` functions. Use `vercel dev` for end-to-end registration/payment testing.

Frontend-only UI work can still use `npm run dev`; the event page will report registration unavailable/closed when the API is absent.

## Admin password hash

```bash
# PowerShell
$env:ADMIN_PASSWORD="choose-a-long-password"
npm run hash-admin-password
```

Copy the printed hash into `ADMIN_PASSWORD_HASH`. Never commit plaintext passwords or hashes tied to production credentials in the repository.

## API routes

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Coarse health / readiness snapshot |
| GET | `/api/registration/status` | Public registration window status |
| POST | `/api/registration/create` | Create/reuse pending registration + Paystack init |
| GET/POST | `/api/payment/verify` | Server-side Paystack verification |
| POST | `/api/payment/webhook` | Paystack webhooks (signature required) |
| POST | `/api/admin/session` | Admin session login |
| POST | `/api/admin/session?action=logout` | Admin logout |
| GET | `/api/admin/session` | Current admin session |
| GET | `/api/admin/registrations` | List + summary |
| GET/PATCH | `/api/admin/registration?id=` | Detail / application status |
| POST | `/api/admin/export` | CSV export (CSRF + session required) |
| POST | `/api/admin/email` | Retry / send materials / announce (`action`) |
| POST | `/api/forms` | Contact + membership (`form: "contact" \| "membership"`) |

SPA rewrites in `vercel.json` exclude `/api/` so functions are not replaced by `index.html`.

## Fee amount

The server calculates Paystack amounts from selected participation options in `api/_lib/pricing.js` (challenge ₦5,000 / exhibition ₦30,000 / combined ₦35,000). Free event registration uses amount `0` and does not create a Paystack transaction. Clients cannot supply the amount.
