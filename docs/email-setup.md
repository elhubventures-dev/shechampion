# Transactional email setup (Resend)

## Variables

- `RESEND_API_KEY` — Resend API key
- `EMAIL_FROM` — verified sender (e.g. `SHE CHAMPIONS <registrations@your-domain>`)
- `ADMIN_NOTIFICATION_EMAIL` — optional staff notify address
- `PUBLIC_SITE_URL` — absolute site origin used for logo + CTAs (no trailing slash)

Logo in HTML emails: `${PUBLIC_SITE_URL}/assets/logo-horizontal.png` (file at `public/assets/logo-horizontal.png`). Alt text: `SHE CHAMPIONS`.

## Design

Shared table-based layout in `api/_lib/emailLayout.js` (Outlook-safe): navy `#0b1f3a`, brand purple `#8b3db8`, warm surface, Georgia-friendly headings. Every builder returns `{ subject, text, html, emailType }` with multipart `html` + `text`.

## Catalogue (`email_type`)

### Applicant / registrant

| `email_type` | Trigger |
|---|---|
| `free_registration_confirmation` | Free registration saved |
| `participation_confirmation` | Payment SUCCESS (challenge / exhibition / both) |
| `payment_pending` | Paid path created + Paystack init OK |
| `payment_failed` | Verify/webhook FAILED or INITIALIZATION_FAILED |
| `payment_reversed` | Verify/webhook REVERSED |
| `challenge_under_review` | Admin sets UNDER_REVIEW |
| `challenge_shortlisted` | Admin sets SHORTLISTED |
| `challenge_not_shortlisted` | Admin sets NOT_SHORTLISTED |
| `registration_withdrawn` | Admin sets WITHDRAWN / challenge CANCELLED |
| `challenge_materials_request` | Admin “Send challenge materials” |
| `exhibition_instructions` | Admin “Send exhibitor instructions” |
| `registration_open_announcement` | Admin broadcast |
| `registration_cutoff_reminder` | Admin broadcast (unpaid pending + free) |
| `event_details_update` | Admin broadcast (message from admin body) |

### Staff

| `email_type` | Trigger |
|---|---|
| `admin_new_free_registration` | After free confirm send |
| `admin_new_paid_participation` | After paid confirm send |
| `admin_payment_failed` | Payment fails or reverses |
| `admin_contact_message` | Contact form |
| `admin_membership_signup` | Membership popup |

### Public forms

| `email_type` | Trigger |
|---|---|
| `contact_acknowledgement` | `POST /api/contact` accepted |
| `membership_acknowledgement` | `POST /api/membership` accepted |

Contact and membership no longer use Google Apps Script.

## Behaviour

- Delivery status is stored in `email_deliveries` separately from payment status.
- Migration `004_email_deliveries_nullable_registration.sql` allows `registration_id` NULL for contact/membership rows.
- A send is marked `SENT` only when Resend returns a message id.
- Failures mark the row `FAILED` and never reverse a successful payment or registration.
- Assessment emails fire only on status transitions (idempotent via existing `SENT` row for that type).
- Admins can retry free/paid confirmation emails; materials/exhibitor/announce sends are explicit admin actions.
- Broadcast “event details update” body is plain text escaped into HTML — do not invent venue, grants, or refund policy in templates.

## Content guardrails

- Paid emails must not claim grants.
- Free emails must not claim challenge/exhibition confirmation.
- Shortlisted / not shortlisted copy stays factual and respectful.

## Local / Preview / staging synthetics

Use Resend practices recommended for your account (verified sending domain, or Resend’s documented testing recipient rules).

**Important:** when the Resend account is in testing / restricted recipient mode, addresses on domains such as `example.com` / `example.invalid` are rejected with a validation error on the `to` field. That failure is recorded honestly as `FAILED` and is **not** a template defect.

For staging synthetic applicants:

1. Prefer a recipient on your verified organisational domain (for example a plus-address under the same domain as `ADMIN_NOTIFICATION_EMAIL`), **or**
2. Use the testing recipient address Resend documents for your account mode.

Do not claim production inbox delivery until the sending domain is verified and unrestricted sending is enabled. Do not mark a send as `SENT` without a provider message id.

## Staging smoke (branded emails)

1. Apply migration `004` on the staging database.
2. Confirm `PUBLIC_SITE_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, and `ADMIN_NOTIFICATION_EMAIL` on the staging host.
3. Free register with an allowed recipient → expect `free_registration_confirmation` (+ optional admin notify).
4. Start a paid checkout → expect `payment_pending`; complete payment → `participation_confirmation`.
5. Force a failed/abandoned payment path if available → `payment_failed` (+ admin notify).
6. Admin PATCH assessment statuses → matching under_review / shortlisted / not_shortlisted / withdrawn emails.
7. Admin detail: Send challenge materials / Send exhibitor instructions.
8. Admin broadcast: registration open / cutoff / details update (details needs ≥10 chars).
9. Submit Contact + Membership forms → user ack + admin notify rows with `registration_id` NULL.
10. Open a received HTML email and confirm the logo loads from `${PUBLIC_SITE_URL}/assets/logo-horizontal.png`.
