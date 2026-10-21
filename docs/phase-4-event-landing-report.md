# SHE CHAMPIONS — Phase 4 Event Landing Report

**Programme:** SHE CHAMPIONS BUSINESS EMPOWERMENT CHALLENGE 2026  
**Route:** `/business-empowerment-challenge-2026`  
**Date:** 21 October 2026  
**Prior phases:** Phase 1–3 reports in `docs/`

---

## 1. New route and page structure

| Item | Detail |
|------|--------|
| URL path | `/business-empowerment-challenge-2026` |
| Component | `src/pages/EventChallenge2026.jsx` |
| Styles | `src/pages/EventChallenge2026.css` |
| Router | Added in `src/App.jsx` (existing `/challenge` unchanged) |
| Discovery | Header CTA “Challenge 2026”, Footer quick link, `public/sitemap.xml` |

### Section order

1. Event hero (name, tagline, facts, CTAs)  
2. About the challenge  
3. Who can participate  
4. Programme experience  
5. Grant opportunity  
6. Selection process  
7. Ambassador recognition  
8. Event details (+ venue note)  
9. Registration / participation information (`#participation`)  
10. FAQ (`<details>` / `<summary>`)  
11. Final CTA  

Configurable facts live in the `EVENT_2026` constant (including cutoff date and time note) so registration can be wired later without rewriting the presentation.

---

## 2. Main UI/UX decisions

- Flagship custom hero (not the generic `Hero` alone) for long programme name + fact chips + dual CTAs.
- Reused Phase 2B tokens: navy, gold accents, Source Serif 4 / Source Sans 3, shared section patterns.
- Existing `challenge_hero.webp` (+ PNG fallback) — organisational asset, not fabricated photography.
- Editorial grids instead of heavy decorative cards.
- Honest status banner: **official online registration is not yet open**.
- Tagline labelled as proposed campaign copy pending approval.
- In-page “Explore Participation” scrolls to `#participation` with reduced-motion respect.
- Header primary CTA retargeted from Membership → Challenge 2026 for conversion focus (Network remains in main nav).

---

## 3. Event information displayed

| Fact | Shown as |
|------|----------|
| Official name | SHE CHAMPIONS BUSINESS EMPOWERMENT CHALLENGE 2026 |
| Date | 12 December 2026 |
| Location | Abuja, Nigeria |
| Format | Physical event |
| Fee | ₦5,000 |
| Grant range | ₦1 million – ₦5 million (competitive / conditional) |
| Cutoff | 48 hours before event; expected date 10 December 2026 |
| Cutoff time | Explicitly pending confirmation of event start time |
| Venue | “Venue details will be announced by SHE CHAMPIONS.” |
| Categories | Business owners; vocational/professional skills; business ideas |
| Activities | Six planned activity types (overview, not a timetable) |
| Ambassador | Winner becomes first Ambassador; three confirmed responsibilities |

---

## 4. Grant and ambassador communication

**Grants**

- Dedicated navy section with transparent language.
- States registration ≠ grant award.
- States not every participant receives funding; maximum not guaranteed.
- Awards depend on eligibility, assessment, final structure, and available funding.

**Ambassador**

- Winner becomes the first SHE CHAMPIONS Ambassador.
- Responsibilities limited to: represent, promote initiatives, participate in outreach.
- No invented contract terms, compensation, or travel commitments.

---

## 5. Calls to action and navigation

| CTA | Behaviour |
|-----|-----------|
| Explore Participation | Scrolls to `#participation` (smooth unless reduced-motion) |
| Contact SHE CHAMPIONS | React Router `Link` → `/contact` |
| Review event details | Scrolls to `#event-details` |
| Header / Footer Challenge 2026 | Navigates to this landing page |
| FAQ | Native `<details>` disclosure (keyboard accessible) |

No payment buttons, fake registration forms, or success simulations.

---

## 6. SEO metadata and sitemap

**PageMeta**

- Title: `SHE CHAMPIONS Business Empowerment Challenge 2026`
- Description covers Abuja, 12 December 2026, fee context, and competitive grant range without guaranteeing funding.

**Sitemap**

- Added `https://www.shechampion-bbf.org/business-empowerment-challenge-2026` (priority 0.95, weekly).
- Local XML validated as well-formed via PowerShell `[xml]` parse.
- **Live deployed sitemap not verified** in this phase (no production deploy).

No Event structured data added (venue/start time unconfirmed).

---

## 7. Responsive checks performed

Local Vite (`localhost:5173`) via Cursor browser:

| Check | Result |
|-------|--------|
| Route loads | Yes |
| Document title | Correct |
| Mobile hero screenshot | Readable hierarchy; facts stack |
| Overflow metric | `scrollWidth` not greater than viewport (checked) |
| FAQ exposed as buttons in a11y tree | Yes (`summary` elements) |
| Existing `/challenge` | Still loads after adding new route |

Full formal matrix (320 / 768 / 1024 / 1440 on every section) not exhaustively recorded; CSS uses the same breakpoints as Phase 3 patterns.

---

## 8. Accessibility checks performed

- Semantic regions + heading hierarchy (h1 programme name, then section h2s).
- Skip link remains global.
- Focusable `#participation` for scroll target.
- FAQ via native disclosure controls.
- Focus-visible / reduced-motion inherited from design system.
- Contrast approach: white/gold-soft on navy; navy text on light surfaces.

**Not claimed:** axe/Lighthouse full AA certification.

---

## 9. Lint and build results

```text
npm run lint  → Pass (exit 0)
npm run build → Pass (exit 0)
  CSS ~46.80 kB (gzip ~7.99 kB)
  JS  ~305.44 kB (gzip ~93.19 kB)
```

Sitemap XML: well-formed locally.

---

## 10. Remaining owner confirmations

1. Approve or revise the campaign tagline.  
2. Confirm event start time → lock exact cutoff time on 10 December 2026.  
3. Announce venue (hall/address).  
4. Confirm registration opening date.  
5. Confirm final grant award structure / funding availability language if it changes.  
6. Approve Paystack go-live and any registration field list for Phase 5.  
7. Confirm whether Header CTA should remain “Challenge 2026” vs restoring “Membership”.

---

## 11. Outstanding issues before registration can go live

1. **Backend / serverless API** for registration persistence (Vite SPA cannot safely hold Paystack secrets).  
2. **Paystack** initialize + verify + webhook flow.  
3. **Short registration form** (no proposal upload at step 1).  
4. **Shortlist workflow** and later proposal request process.  
5. **Admin** view of payments/registrations.  
6. **Email** confirmations.  
7. **Cutoff enforcement** using confirmed start time.  
8. **Deploy** sitemap + page to production and verify live URL/SEO.  
9. Optional: homepage promo band linking to this route.

---

## Acceptance criteria checklist

| Criterion | Status |
|-----------|--------|
| Dedicated route exists | Met |
| `/challenge` intact | Met |
| Facts match approved brief | Met |
| Grants described transparently | Met |
| Venue / cutoff time not fabricated | Met |
| No fake registration / payment | Met |
| Design system used | Met |
| Mobile/desktop checked locally | Met (partial) |
| Existing routes operational | Met |
| Lint + build pass | Met |
| Sitemap valid (local) | Met |
| Report complete | Met |

---

*End of Phase 4. Awaiting review before registration/Paystack implementation.*
