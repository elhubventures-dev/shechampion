# Deployment checklist — Event registration (Phase 5)

Do **not** open public registration or enable live payments merely because the code is deployed.

## Before any Preview deploy

- [ ] Migrations applied to a **non-production** database
- [ ] Preview env vars set from `.env.example` (empty secrets filled with **test** values only)
- [ ] `EVENT_REGISTRATION_ENABLED=false`
- [ ] `PAYSTACK_MODE=test`
- [ ] Privacy notice + participation terms still marked unapproved unless legally reviewed
- [ ] `vercel.json` excludes `/api/` from SPA rewrites (already in repo)
- [ ] `npm run lint`, `npm run test`, `npm run build` pass locally

## Before Production deploy (code only)

- [ ] Separate Production `DATABASE_URL`
- [ ] Separate live Paystack secret (not committed)
- [ ] `SESSION_SECRET` unique and long
- [ ] Admin hash generated privately
- [ ] Resend domain verified for `EMAIL_FROM`
- [ ] Webhook URL documented for manual Paystack configuration after DNS/domain is live

## Before opening registration

All readiness gates must be true:

1. `EVENT_REGISTRATION_ENABLED=true`
2. Valid `EVENT_REGISTRATION_OPEN_AT`
3. Valid `EVENT_START_AT`
4. Cutoff = start − 48 hours still in the future when opening
5. `EVENT_PRIVACY_NOTICE_APPROVED=true` (after owner legal review)
6. `EVENT_PARTICIPATION_TERMS_APPROVED=true`
7. Database reachable
8. Paystack credentials + mode correct (`live` on Vercel Production)
9. Admin auth configured
10. Email configuration working

## After Production domain is live

- [ ] Configure Paystack webhook: `https://<domain>/api/payment/webhook`
- [ ] Smoke-test with **test** keys on Preview first
- [ ] Only then switch Production to live keys and enable registration intentionally

## Explicit non-actions for implementers

- Do not create cloud accounts from this repository
- Do not deploy automatically as part of coding tasks unless requested
- Do not process real money until the organisation enables live mode
