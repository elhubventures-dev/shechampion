# Phase C — Owner launch gates (pricing model)

**Organisation:** SHE CHAMPIONS  
**Event:** SHE CHAMPIONS BUSINESS EMPOWERMENT CHALLENGE 2026  
**Date of report:** 23 October 2026 (re-verified same day)  
**Scope:** Document production launch blockers for free registration + paid participation. **No** registration open. **No** live Paystack charges. **No** production deploy from this phase.

**Live API check:** `GET https://www.shechampion-bbf.org/api/registration/status` already returns Phase 8 pricing (`generalRegistrationKobo: 0`, `challengeKobo: 500000`, `exhibitionKobo: 3000000`, `allowCombinedChallengeExhibition: false`) with `registrationOpen: false`.

Pricing remains locked:

- Free general registration
- Challenge ₦5,000 (women only)
- Exhibition ₦30,000 (business owners)
- Combined **disabled** until explicit enable (`ALLOW_COMBINED_CHALLENGE_EXHIBITION=false`)

---

## Owner decisions (must be explicit)

| Decision | Current safe default | Owner action required |
| --- | --- | --- |
| Privacy notice approved | Do not invent; staging may already have `true` for testing only | Confirm final legal text, then set Production `EVENT_PRIVACY_NOTICE_APPROVED=true` |
| Participation terms approved | Same | Confirm final legal text, then set Production `EVENT_PARTICIPATION_TERMS_APPROVED=true` |
| Exact event start time | `EVENT_START_AT` **unset** locally/staging after Phase 10 scrub | Confirm Africa/Lagos ISO timestamp (day currently marketed as 12 December 2026; time TBD) |
| Combined Challenge + Exhibition | **Disabled** | Set `ALLOW_COMBINED_CHALLENGE_EXHIBITION=true` only if ₦35,000 dual selection is intentional |
| Open public registration | `EVENT_REGISTRATION_ENABLED=false` | Set `true` only after deploy + migrate + Paystack live webhook + owner OK |
| Live Paystack | Not used in local/staging | Production only: `sk_live_` + `PAYSTACK_MODE=live` after staging paid paths re-verified with `sk_test_` |

---

## Production env checklist (names only)

Generated via `node scripts/phase10-prod-env-checklist.mjs`:

- Domain: `https://www.shechampion-bbf.org`
- Callback: `/payment/result`
- Webhook: `/api/payment/webhook`
- Keep `EVENT_REGISTRATION_ENABLED=false` until intentional open
- Keep `ALLOW_COMBINED_CHALLENGE_EXHIBITION=false` until commercial decision
- Dedicate Production `DATABASE_URL` (not staging Neon)
- Never place `sk_live_` in `.env.local` or `.env.staging.local`

Full command list and `doNot` list: see script output / [`phase-10-production-deployment-report.md`](phase-10-production-deployment-report.md).

---

## Ordered go-live sequence (operator only)

1. Commit and deploy the Phase 8+ tree to Production (Vercel) when owner approves.
2. Confirm Production DB ≠ staging; apply migrations `001`–`003` with one-shot `ALLOW_PRODUCTION_MIGRATE=true`, then unset.
3. Configure Paystack **live** webhook to Production URL; credentials only in Vercel Production env.
4. Owner sets legal approval flags + confirmed `EVENT_START_AT` + `EVENT_REGISTRATION_OPEN_AT`.
5. Smoke free + ₦5k + ₦30k on Production with registration briefly enabled under observation (or staging-equivalent first).
6. Leave combined off unless owner enables it.
7. Only then keep `EVENT_REGISTRATION_ENABLED=true` for the public window.

## Explicitly not done in Phase C

- Production migrate
- Production deploy
- Setting `EVENT_REGISTRATION_ENABLED=true`
- Enabling combined selection
- Inventing `EVENT_START_AT`
- Live payment charges
