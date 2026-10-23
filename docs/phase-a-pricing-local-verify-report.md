# Phase A — Local verify (free registration + paid participation)

**Organisation:** SHE CHAMPIONS  
**Event:** SHE CHAMPIONS BUSINESS EMPOWERMENT CHALLENGE 2026  
**Date of report:** 23 October 2026 (re-verified same day)  
**Scope:** Confirm Phase 8 pricing model locally. No code rebuild of pricing core. No production deploy. Registration not opened.

**Note for operators:** The free / ₦5k / ₦30k product code shipped in git commit `18dcc28`. This plan does not rewrite that feature; it verifies it and locks Cursor rules. Live site API already returns the Phase 8 `pricing` object; registration remains closed so the form is not interactive for applicants yet.

---

## Commands

| Command | Result |
| --- | --- |
| `npm run test` | **Passed** — 9 files, 69 tests |
| `npm run lint` | **Passed** |
| `npm run build` | **Passed** |

## Pricing / path audit (code + tests)

| Path | Expected | Evidence |
| --- | --- | --- |
| Free-only | `0` kobo, no payment required | `tests/pricing.test.js`; `PRICING.GENERAL_REGISTRATION_KOBO = 0` |
| Challenge | `500000` kobo + women attestation | pricing + validation tests; `RegistrationForm.jsx` attestation gate |
| Exhibition | `3000000` kobo + owner fields | pricing + validation tests; form exhibition fields |
| Combined | Rejected when flag false | `COMBINED_DISABLED` in pricing tests; `.env.example` default `false` |
| Client amount | Rejected | validation tests (amount/currency not accepted) |

## Public / legal copy

- [`src/lib/event2026.js`](../src/lib/event2026.js): free registration; Challenge ₦5,000; Exhibition ₦30,000
- Event landing FAQ and participation section state free + optional paid; combined only when enabled
- Participation terms draft matches the same model

## Locked agent rule

Added [`.cursor/rules/event-2026-pricing.mdc`](../.cursor/rules/event-2026-pricing.mdc) so Cursor sessions stay aligned with the locked product rules.

## Not done in Phase A

- Staging DB / Paystack smoke (Phase B)
- Owner legal / open-registration decisions (Phase C)
- Optional polish (Phase D)
