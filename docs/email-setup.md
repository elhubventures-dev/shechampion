# Transactional email setup (Resend)

## Variables

- `RESEND_API_KEY` — Resend API key
- `EMAIL_FROM` — verified sender (e.g. `SHE CHAMPIONS <registrations@your-domain>`)
- `ADMIN_NOTIFICATION_EMAIL` — optional staff notify address

## Behaviour

- Confirmation emails are sent **only after** a payment is verified as successful.
- Delivery status is stored in `email_deliveries` separately from payment status.
- A send is marked `SENT` only when Resend returns a message id.
- Failures mark the row `FAILED` and never reverse a successful payment.
- Admins can retry failed confirmation emails from the dashboard.

## Local / Preview

Use Resend test/sandbox practices recommended by Resend. Do not claim production delivery until the sending domain is verified.
