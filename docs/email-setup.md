# Transactional email setup (Resend)

## Variables

- `RESEND_API_KEY` — Resend API key
- `EMAIL_FROM` — verified sender (e.g. `SHE CHAMPIONS <registrations@your-domain>`)
- `ADMIN_NOTIFICATION_EMAIL` — optional staff notify address

## Behaviour

- Free registration confirmation is sent after a successful free registration save.
- Paid participation confirmation is sent **only after** payment is verified as successful.
- Delivery status is stored in `email_deliveries` separately from payment status.
- A send is marked `SENT` only when Resend returns a message id.
- Failures mark the row `FAILED` and never reverse a successful payment or registration.
- Admins can retry failed confirmation emails from the dashboard.

## Local / Preview / staging synthetics

Use Resend practices recommended for your account (verified sending domain, or Resend’s documented testing recipient rules).

**Important (Phase 9C finding):** when the Resend account is in testing / restricted recipient mode, addresses on domains such as `example.com` / `example.invalid` are rejected with a validation error on the `to` field. That failure is recorded honestly as `FAILED` and is **not** a template defect.

For staging synthetic applicants:

1. Prefer a recipient on your verified organisational domain (for example a plus-address under the same domain as `ADMIN_NOTIFICATION_EMAIL`), **or**
2. Use the testing recipient address Resend documents for your account mode.

Do not claim production inbox delivery until the sending domain is verified and unrestricted sending is enabled. Do not mark a send as `SENT` without a provider message id.
