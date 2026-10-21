# SHE CHAMPIONS Website — Phase 3 Page Redesign Report

**Project:** SHE CHAMPIONS official website  
**Reference:** https://www.shechampion-bbf.org/  
**Phase:** 3 — Homepage and existing-page redesign  
**Date:** 21 October 2026  
**Prior phases:** `docs/phase-1-audit-report.md`, `docs/phase-2a-stabilization-report.md`, `docs/phase-2b-design-system-report.md`

---

## 1. Summary of the redesign

All six public routes were redesigned to use the Phase 2B premium corporate system (navy / white / gold, Source Serif 4 + Source Sans 3) with clearer hierarchy, editorial layouts instead of heavy card grids, and honest content treatment.

**In scope (confirmed in `App.jsx`):** `/`, `/challenge`, `/programs`, `/network`, `/seminars`, `/contact`.

**Out of scope (preserved for later):** SHE CHAMPIONS BUSINESS EMPOWERMENT CHALLENGE 2026 landing page, Paystack, registration, admin, framework migrations.

**Key outcomes**

- Homepage journey: hero → who we are → programme pathways → challenge overview → seminars → services → network → CTA.
- Ads moved out of the first viewport (no longer above the hero).
- Network page keeps **Proposed composition** language and adds an explicit disclaimer.
- Contact form retains Phase 2A honest submission behaviour.
- Client-side per-route titles and meta descriptions via `PageMeta`.
- Skip-to-content link added for keyboard users.

---

## 2. Pages and components changed

| Path | Role |
|------|------|
| `src/App.jsx` | Removed top AdSense strip; footer ad aside; skip link; `main#main-content` |
| `src/main.jsx` | Imports `page-shared.css` |
| `src/pages/page-shared.css` | Shared section/pathway/table/CTA patterns |
| `src/components/PageMeta.jsx` | **New** — SPA document title + description updates |
| `src/components/AdUnit.css` | Footer ad slot styles |
| `src/index.css` | Skip-link styles |
| `src/pages/Home.jsx` / `Home.css` | Full homepage redesign |
| `src/pages/Challenge.jsx` / `Challenge.css` | Existing challenge page redesign |
| `src/pages/Programs.jsx` / `Programs.css` | Programmes redesign |
| `src/pages/Network.jsx` / `Network.css` | Network redesign (proposed list clarified) |
| `src/pages/Seminars.jsx` / `Seminars.css` | Seminars redesign; typo “wih” → “with” |
| `src/pages/Contact.jsx` / `Contact.css` | Visual redesign; form logic unchanged |
| `docs/phase-3-page-redesign-report.md` | This report |

Logo assets and Google Apps Script integration: **unchanged**.

---

## 3. Key UI/UX decisions by page

### `/` Home
- Brand-led hero with existing mission copy and `/challenge` + `/programs` CTAs.
- Editorial split for “Why SHE CHAMPIONS?” + commitment callout (not dual competing cards).
- Numbered pathway list to real routes (Challenge, Programmes, Seminars, Network).
- Pillars as a light editorial grid (icons retained, less card chrome).
- Network CTA softened to “Explore the Network” (does not claim confirmed ambassadors).
- Single mid-page ad; site-wide ad sits below main content.

### `/challenge`
- Existing Challenge purpose retained (not 2026 event).
- Rationale + goal callout; numbered objectives; beneficiaries + CTAs to programmes/contact.

### `/programs`
- Intro + exposure blocks as bordered editorial panels.
- Annual schedule table with caption; note that named competitions are examples, not implied sponsorships.
- Ambassador roles / KPIs as two-column lists; links to Network and Seminars.

### `/network`
- Purpose and roles redesigned as editorial grids/lists.
- Ambassador names remain under **Proposed composition** with banner disclaimer.
- CTA to contact / challenge — not “meet confirmed ambassadors.”

### `/seminars`
- Overview + structure + monthly table + quarterly masterclasses + expected outputs.
- Note that specific dates/registration need organisational confirmation.
- Typo fix only in existing sentence (“with buyers”).

### `/contact`
- Navy info panel + form panel; verified phone/email/address.
- Labels, required markers, help text, error/success styling.
- Honest “Message submitted” / non-confirmable delivery copy preserved.

---

## 4. Content retained vs owner confirmation

### Retained (from existing source)
- Mission/positioning language and Challenge objectives/rationale/beneficiaries.
- Programme schedules, exposure support lists, KPIs.
- Seminar monthly topics, masterclasses, structure, outputs.
- Proposed ambassador names and roles.
- Contact: `info@shechampion-bbf.org`, `(+234) 703 631 6083`, Abuja Kado address.
- Beyond Borders Foundation as lead implementer (footer).

### Needs owner confirmation
- Whether any ambassadors are now confirmed (list still proposed).
- Official social / WhatsApp URLs (still omitted).
- Whether seminar months map to a specific calendar year with public registration dates.
- Exact official naming (SHE CHAMPIONS / SheChampion / SheChampions Network consistency).
- Partner/sponsor logos (none invented; no partner grid added).
- Impact statistics / testimonials (none available — not fabricated).
- Whether named external competitions may be listed without partnership disclaimers beyond the note added.

---

## 5. Responsive checks performed

Environment: local Vite at `http://localhost:5173/` via Cursor browser tools.

| Viewport | Method | Result |
|----------|--------|--------|
| ~mobile (default / hamburger visible) | Navigate + snapshot + screenshot | Hero readable; stacked CTAs; navy/gold system applied; no obvious clip |
| 390×844 | CDP `Emulation.setDeviceMetricsOverride` on `/contact` | `scrollWidth === 390`, **no horizontal overflow** |
| 1440×900 | CDP desktop metrics on `/` | `scrollWidth === clientWidth` (1425), **no overflow**; title correct |
| Route smoke | `/`, `/network`, `/contact` | Titles update; headings/landmarks present |

**Not a full lab pass** across 320 / 768 / 1024 / all six routes with visual QA of every section. Tables remain horizontally scrollable by design (`overflow-x: auto`).

---

## 6. Accessibility findings and tests

### Improvements
- Skip link to `#main-content`.
- Region labels via `aria-labelledby` on major sections.
- Table captions (visually hidden) on schedule tables.
- Form labels, required indicators, `aria-live` status (retained).
- Focus-visible and reduced-motion tokens from Phase 2B retained.
- Mobile menu still exposes `aria-expanded` / Escape close from Phase 2B.

### Checks run
- Manual accessibility tree review via browser snapshots (headings, form fields, links).
- Keyboard skip link present in tree.

### Not run / not claimed
- axe DevTools automated scan.
- Full Lighthouse accessibility score.
- Complete WCAG 2.2 AA certification.

### Residual risks
- Logo horizontal mark contrast on transparent hero depends on asset plate.
- Dense tables need horizontal scroll on small screens (acceptable, not ideal).
- Membership popup focus trap still limited (Phase 2A baseline).

---

## 7. SEO and metadata updates

| Route | Document title (client) |
|-------|-------------------------|
| `/` | Elevating Women Entrepreneurs \| SHE CHAMPIONS |
| `/challenge` | The SheChampions Challenge \| SHE CHAMPIONS |
| `/programs` | Programmes \| SHE CHAMPIONS |
| `/network` | Women Network \| SHE CHAMPIONS |
| `/seminars` | Access-to-Market Seminars \| SHE CHAMPIONS |
| `/contact` | Contact \| SHE CHAMPIONS |

Implemented with `PageMeta` (updates `document.title`, `meta[name=description]`, and matching OG/Twitter tags when present).

**Limitations (honest):** Still a Vite SPA — no SSR. Initial HTML shell title remains the homepage default until JS runs. Sitemap/robots from Phase 2A unchanged; production sitemap still needs post-deploy verification.

---

## 8. Advertising placement decision

| Before | After | Rationale |
|--------|-------|-----------|
| Horizontal AdSense strip **above** `<main>` (between header and hero) | Removed from first viewport | Protects brand-led first impression |
| Multiple mid-home ads | One mid-home horizontal unit | Reduces narrative interruption |
| — | Horizontal unit in `aside.ad-slot--footer` below main, above footer | Preserves monetisation without crowding nav/hero |

AdSense client/script and `AdUnit` component retained. No ad content invented.

---

## 9. Lint and build results

```text
npm run lint
→ Pass (exit 0)

npm run build
→ Pass (exit 0)
  CSS  ~40.24 kB (gzip ~7.35 kB)
  JS   ~286.68 kB (gzip ~88.94 kB)
```

Compared to Phase 2B: lint/build remain green; CSS grew with shared page styles (expected).

---

## 10. Known issues and limitations

1. Full visual redesign of every decorative micro-detail on legacy page CSS leftovers may still show minor inconsistencies until unused rules are pruned.
2. SPA SEO without SSR remains a structural limit.
3. No verified impact metrics or partner logos — credibility relies on programme clarity.
4. Proposed ambassadors still listed; owner must confirm before stronger claims.
5. AdSense inventory may be sparse in local/dev — empty ad regions can leave whitespace.
6. 2026 event not implemented (by design).
7. Screenshots from the browser tool were captured; desktop captures were sometimes oddly cropped by the tooling even when layout metrics showed no overflow — treat metrics + a11y tree as primary evidence.

---

## 11. Screenshots / visual evidence

- Interactive browser verification performed on local `localhost:5173`.
- Homepage mobile hero and desktop overflow metrics recorded during the session.
- Screenshot artifacts were saved via the Cursor browser tool (e.g. `phase3-home-desktop.png` in the tool temp screenshots directory). Copy into `docs/phase-3-screenshots/` as needed for archival.

---

## 12. Recommended next phase

1. **Phase 4 — Event landing:** SHE CHAMPIONS BUSINESS EMPOWERMENT CHALLENGE 2026 (dedicated route; no Paystack yet or with server-backed payments once credentials exist).
2. Owner content pack: confirmed ambassadors, social URLs, impact figures, partner permissions.
3. Optional SSR/meta hardening (e.g. prerender) if SEO priority rises.
4. Formal axe + Lighthouse + multi-breakpoint QA checklist.
5. Consider relocating or lazy-loading ads further based on production CLS data.

---

## Acceptance criteria checklist

| Criterion | Status |
|-----------|--------|
| Pages use Phase 2B system coherently | Met |
| Homepage hierarchy improved | Met |
| Routes/purposes preserved | Met |
| Logo intact | Met |
| Forms operational / honest messaging | Met |
| No fabricated impact/partners/testimonials | Met |
| Mobile/desktop usable (checked locally) | Met (partial formal matrix) |
| A11y documented honestly | Met |
| Differentiated titles/descriptions | Met (client-side) |
| Lint + build pass | Met |
| Vercel-compatible SPA | Met |
| Report complete | Met |
| No 2026 event / Paystack | Met |

---

*End of Phase 3. Awaiting review before the event landing page or payment implementation.*
