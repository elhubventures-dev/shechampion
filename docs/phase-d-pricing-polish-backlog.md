# Phase D — Optional polish backlog (not in scope now)

**Organisation:** SHE CHAMPIONS  
**Event:** SHE CHAMPIONS BUSINESS EMPOWERMENT CHALLENGE 2026  
**Date of report:** 23 October 2026  
**Status:** Deferred — implement only when the owner opens a dedicated Cursor phase and pastes the locked pricing rules.

The free + ₦5,000 challenge + ₦30,000 exhibition model is **complete** without these items.

---

## Deferred ideas (one Cursor phase each)

| Idea | Why separate | Acceptance hint |
| --- | --- | --- |
| Stronger ladies-only challenge messaging | Copy/UX only; must not block free registration for others | Challenge checkbox + attestation remain; free path unchanged |
| Exhibition category taxonomy (controlled list) | Product taxonomy decision | Server still validates; amounts unchanged |
| “Upgrade later” for free registrants who later pay | New flow + auth/idempotency design | Free row stays; paid confirm only after Paystack verify |
| Refund / cancellation policy text | Legal owner decision | Do not invent policy; link only after approval |
| Enable combined ₦35,000 | Commercial decision | `ALLOW_COMBINED_CHALLENGE_EXHIBITION=true` + UI + tests |

## Prompt template for a polish phase

```text
SHE CHAMPIONS Business Empowerment Challenge 2026 pricing:
- General event registration: FREE for all applicants. No Paystack call.
- Optional Challenge participation: ₦5,000 (500000 kobo). Women-only via required attestation. Server sets amount.
- Optional Exhibition: ₦30,000 (3000000 kobo). Business-owner attestation + business name, category, description required.
- Combined Challenge+Exhibition: DISABLED unless ALLOW_COMBINED_CHALLENGE_EXHIBITION=true (then ₦35,000).
- Never trust client-supplied amount/currency/discounts.
- Free registration must not be undone if paid checkout fails or is abandoned.
- Paid participation confirmed only after server-side Paystack verify/webhook against stored expected_amount_kobo.
- Do not open public registration or deploy to production unless I explicitly ask.

Polish only: [ONE item from the backlog]. Do not rebuild pricing core.
```

## Locked agent rule

See [`.cursor/rules/event-2026-pricing.mdc`](../.cursor/rules/event-2026-pricing.mdc).
