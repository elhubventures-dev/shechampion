# SHE CHAMPIONS Website — Phase 2B Design System Report

**Project:** SHE CHAMPIONS official website  
**Reference:** https://www.shechampion-bbf.org/  
**Phase:** 2B — Premium corporate design system  
**Date:** 21 October 2026  
**Prior phases:** `docs/phase-1-audit-report.md`, `docs/phase-2a-stabilization-report.md`

---

## 1. Design principles and visual decisions

**Direction:** Premium corporate — modern, trustworthy, elegant, internationally credible.

**Decisions after inspecting the logo asset (`src/assets/logo.png`):**

| Principle | Implementation |
|-----------|----------------|
| Preserve SHE CHAMPIONS mark | Logo files unchanged (no redraw, recolor, or replacement) |
| Move UI away from generic purple SaaS | Interface chrome uses **deep navy + white + warm neutrals** |
| Logo purple remains brand-mark only | Documented as `--color-brand-mark` / `--color-brand-mark-soft`; not used for body UI |
| Restrained gold | Accents for CTAs, underlines, footer labels — not body text on white |
| Serif authority | Display type echoes the logo’s serif wordmark without altering the logo |
| Restraint | Reduced card elevation, removed decorative hover washes, limited radii |

Audience fit: women entrepreneurs, sponsors, development partners, government, and donors — calm institutional tone rather than nonprofit-template or flashy campaign styling.

---

## 2. Final color tokens and usage

Defined in `src/index.css` `:root`.

| Token | Value | Primary usage |
|-------|-------|----------------|
| `--color-navy` | `#0b1f3a` | Primary UI, buttons, headings |
| `--color-navy-dark` | `#061525` | Footer, hover depth, overlays |
| `--color-navy-mid` | `#16355c` | Hover/active |
| `--color-navy-soft` | `#243f66` | Soft borders on hover |
| `--color-surface` | `#ffffff` | Cards, forms, scrolled header |
| `--color-surface-warm` | `#f7f5f1` | Page background |
| `--color-surface-muted` | `#eef1f5` | Secondary sections |
| `--color-gold` | `#c4a35a` | Accent (rules, icons, Membership outline) |
| `--color-gold-dark` | `#a8863d` | Accent hover |
| `--color-gold-soft` | `#e8d9b0` | Accent on dark surfaces |
| `--color-brand-mark` | `#8b3db8` | Logo reference only |
| `--color-text` | `#1a2332` | Body text |
| `--color-text-muted` | `#5c6675` | Supporting copy |
| `--color-text-on-dark` | `#f5f7fa` | Text on navy |
| `--color-border` / `--color-divider` | `#d8dee6` / `#e4e8ee` | Borders |
| `--color-focus` | `#c4a35a` | Focus-visible outline |
| `--color-success` / `--warning` / `--error` | greens/ambers/reds | Status messaging |

**Compatibility aliases** map legacy names (`--primary-color`, `--bg-secondary`, etc.) onto the navy system so existing page CSS continues to resolve coherently without a full page redesign.

Gold is **not** used for small body text on white (contrast risk). On dark navy, gold is used for labels and accents at larger/uppercase sizes.

---

## 3. Typography choices and loading method

| Role | Family | Weights |
|------|--------|---------|
| Display / headings | **Source Serif 4** | 400, 600, 700 |
| Body / UI / buttons | **Source Sans 3** | 400, 500, 600, 700 |

**Why these fonts**

- Serif display complements the logo’s serif wordmark.
- Sans UI remains highly readable for navigation and forms.
- Both are SIL Open Font License fonts, loaded from Google Fonts (no illegal redistribution of proprietary faces).
- Replaces the prior unused Outfit/Inter declarations.

**Loading** (`index.html`):

- `preconnect` to `fonts.googleapis.com` and `fonts.gstatic.com`
- Stylesheet with `display=swap`
- CSS fallbacks: Georgia / Times New Roman (display); Segoe UI / system-ui (body)

**Type scale tokens:** `--text-display` through `--text-caption`, with responsive `clamp()` for display and heading sizes.

---

## 4. Reusable CSS tokens and component styles

Also in `src/index.css`:

- Layout: `--container-max`, `--gutter`, `--section-space`, `--card-padding`, `--grid-gap`, radii, shadows, header heights
- Motion: `--duration-*`, `--ease-standard`, reduced-motion overrides
- Global: buttons (primary / secondary / outline / light / accent), form controls, labels, focus-visible, section title/lead helpers
- Cards (`Card.css`): border-led, restrained; navy icon wells; no heavy purple hover gradient

Shared components consume tokens exclusively for color/type/spacing.

---

## 5. Header improvements

**Files:** `Header.jsx`, `Header.css`

- Existing logo retained (`logo-horizontal.png`)
- Transparent over heroes; solid white + bottom border when scrolled or when mobile menu is open
- Gold underline active/hover on dark; navy links + gold underline when scrolled
- Membership is a real link to `/network` (existing route) — rectangular gold/navy treatment (not a decorative dead control)
- Mobile breakpoint raised to 960px to avoid cramped desktop nav
- 44px minimum touch targets; Escape closes menu; `aria-expanded` / `aria-controls` preserved
- Menu still closes on route change (render-time path sync from Phase 2A)

---

## 6. Footer improvements

**Files:** `Footer.jsx`, `Footer.css`

- Deep navy background; gold section labels
- White logo retained
- Verified contact block preserved: phone `tel:+2347036316083`, email `mailto:info@shechampion-bbf.org`, existing Abuja address
- Quick links cover all six public routes
- No social/WhatsApp placeholders restored
- Responsive 3 → 2 → 1 column grid

---

## 7. Hero improvements

**Files:** `Hero.jsx`, `Hero.css`

- WebP + PNG `image-set` fallback **preserved**
- Brown overlay replaced with **navy directional gradient** for readable type
- Display serif for `h1`; restrained subtitle; token-based spacing tied to header height
- Primary vs secondary height variants retained
- No new statistics or 2026 event content

---

## 8. Accessibility and responsive checks performed

| Check | Result |
|-------|--------|
| Semantic header/nav/main/footer | Preserved |
| Logo `alt="SHE CHAMPIONS"` | Preserved |
| Focus-visible (gold outline) | Global + component |
| Keyboard: Escape closes mobile menu | Implemented |
| `aria-expanded` / `aria-controls` | Preserved |
| Reduced-motion | Global + header menu animation gated |
| Touch targets ≥ 44px (nav/menu) | CSS min sizes |
| Lint | **Pass** |
| Production build | **Pass** |

**Not performed in this phase (honest):** automated axe/Lighthouse audit; interactive browser walkthrough across device widths; contrast meter lab tests. Contrast choices used known navy/white and gold-as-accent patterns; recommend a formal AA pass in Phase 3.

---

## 9. Files changed

| Path | Change |
|------|--------|
| `index.html` | Google Fonts preconnect + Source Serif 4 / Source Sans 3 |
| `src/index.css` | Full token system, typography, buttons, forms, utilities |
| `src/components/Header.jsx` / `Header.css` | Premium nav chrome |
| `src/components/Footer.jsx` / `Footer.css` | Premium footer |
| `src/components/Hero.jsx` / `Hero.css` | Overlay + type + spacing |
| `src/components/Card.css` | Token-aligned restrained cards |
| `src/pages/Home.css` | Light token alignment (not full redesign) |
| `src/pages/Contact.css` | Focus/accent colors |
| `src/pages/Challenge.css` | Objective numeral tint |
| `src/components/MembershipPopup.css` | Overlay/type/focus tokens |
| `docs/phase-2b-design-system-report.md` | This report |

Logo binary assets: **unchanged**. Forms behavior from Phase 2A: **unchanged**.

---

## 10. Lint and build results

Compared to Phase 2A baseline (both already green):

```text
npm run lint
→ Pass (exit 0)

npm run build
→ Pass (exit 0)
  index.html   2.96 kB │ gzip 1.10 kB
  CSS         30.96 kB │ gzip 6.47 kB
  JS         280.43 kB │ gzip 87.89 kB
```

No new dependencies added.

---

## 11. Known limitations

1. **Page interiors** (Programs tables, Network ambassadors blocks, etc.) still use older layout patterns; they inherit navy aliases but are not fully redesigned.
2. **Logo horizontal asset** may include a dark plate; not altered in this phase (preserve-logo constraint).
3. **Fonts load from Google** — offline/privacy-sensitive environments may fall back to system stacks until self-hosting is approved.
4. **AdSense strip** above `<main>` is unchanged; visual hierarchy vs header remains a Phase 3 concern.
5. **No formal device lab / Lighthouse** run in this phase.
6. **2026 event page** and payments intentionally not started.

---

## 12. Recommendations for Phase 3

1. Redesign Homepage and remaining content pages using this token system (brand-led hero, less card clutter, consistent section rhythm).
2. Optional: self-host Source Serif 4 / Source Sans 3 for CSP/performance control.
3. Export/clean logo variants with transparent backgrounds if the horizontal mark includes a baked plate.
4. Formal WCAG contrast + keyboard pass on all redesigned pages.
5. Relocate or reduce site-wide ad placement relative to the first viewport.
6. Only after Phase 3 UI: event landing → registration → Paystack (server-side secrets).

---

## Acceptance criteria checklist

| Criterion | Status |
|-----------|--------|
| Logo intact | Met |
| Coherent premium corporate system | Met |
| Consistent color on shared components | Met |
| Typography loads with fallbacks | Met |
| Header / Footer / Hero use tokens | Met |
| Navigation, contact, form honesty preserved | Met |
| Mobile nav usable | Met (code-level; lab testing deferred) |
| A11y affordances preserved/improved | Met |
| Lint + build pass | Met |
| No event/payment work | Met |
| Report completed | Met |

---

*End of Phase 2B. Awaiting review before Phase 3 (homepage and existing-page redesign).*
