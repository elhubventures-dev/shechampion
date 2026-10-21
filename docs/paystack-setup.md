# Paystack setup

## Test mode (required before live)

1. Create or open a Paystack account.
2. Copy the **test** secret key into Preview / local `PAYSTACK_SECRET_KEY`.
3. Set `PAYSTACK_MODE=test`.
4. Keep `EVENT_REGISTRATION_ENABLED=false` until privacy/terms, database, email, and admin auth are ready.
5. Use Paystack test cards only. Do not process real customer money in test mode.

## Callback URL

The API builds the callback from `PUBLIC_SITE_URL`:

`{PUBLIC_SITE_URL}/payment/result`

Clients cannot supply a callback URL. Configure `PUBLIC_SITE_URL` to the deployed origin (no trailing slash), e.g. `https://shechampion-bbf.org`.

## Webhook URL (configure after deployment)

In the Paystack dashboard, add:

`https://<your-production-domain>/api/payment/webhook`

Notes:

- Signature verification uses `x-paystack-signature` (HMAC-SHA512 of the **raw** body with the secret key).
- Duplicate deliveries are ignored via `webhook_events` idempotency.
- Valid events are acknowledged quickly; confirmation email failures do not undo a verified payment.
- This repository does **not** configure the webhook for you (no credentials are available in source control).

## Live mode

1. Complete Paystack go-live requirements.
2. Use a separate Production `DATABASE_URL`.
3. Set Production `PAYSTACK_SECRET_KEY` to the **live** secret.
4. Set `PAYSTACK_MODE=live`.
5. Only then consider enabling registration after all readiness gates pass.

On Vercel Production, test-mode payments cannot complete as live paid registrations.
