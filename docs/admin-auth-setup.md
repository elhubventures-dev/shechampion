# Admin authentication setup

Admin UI route (not linked in public navigation or sitemap):

- Login: `/admin/login`
- Dashboard: `/admin/event-registrations`

## Configuration

Set on the server only:

- `ADMIN_EMAIL` — exact login email (normalized to lowercase)
- `ADMIN_PASSWORD_HASH` — scrypt hash (see below)
- `SESSION_SECRET` — long random value (≥ 32 characters)

Generate a hash without committing the password:

```bash
$env:ADMIN_PASSWORD="your-long-password"
npm run hash-admin-password
```

Paste the hash into the environment store (Vercel / `.env.local`). There is **no** default admin password in code.

## Session behaviour

- Sessions are stored in PostgreSQL (`admin_sessions`) with only a hash of the cookie token.
- Cookie name: `sc_admin_session`
- HttpOnly, `SameSite=Lax`, `Secure` on HTTPS / production
- TTL: 8 hours
- Login rotates sessions (prior sessions for that admin are revoked)
- Login attempts are rate-limited in the database
- Every admin API checks the session server-side; hiding the React route is not access control

## CSRF and origin protection

Cookie-authenticated admin mutations also require:

1. Request `Origin`/`Referer` matching a trusted origin (`PUBLIC_SITE_URL`, `VERCEL_URL`, and localhost in non-production)
2. Double-submit CSRF: cookie `sc_admin_csrf` (readable by the SPA) plus matching `X-CSRF-Token` header

CSV export is **POST** `/api/admin/export` (not a GET link) so top-level navigation cannot trigger it.

Paystack webhooks do **not** use cookie CSRF checks; they require HMAC signature verification only.

## First login checklist

1. Migrations applied
2. Env vars set
3. Open `/admin/login`
4. Confirm `/api/admin/me` returns 401 when logged out and 200 when logged in
