# SHE CHAMPIONS Website — Phase 2A Stabilization Report

**Project:** SHE CHAMPIONS official website  
**Reference:** https://www.shechampion-bbf.org/  
**Phase:** 2A — Technical stabilization and UI foundation  
**Date:** 21 October 2026  
**Baseline:** `docs/phase-1-audit-report.md`  

---

## 1. Changes made

| Area | Change |
|------|--------|
| Dependencies | Upgraded `react-router-dom` from `7.13.1` → **`7.18.4`** (pulls `react-router@7.18.4`) |
| Lint | Fixed `Header.jsx` route-change menu close; fixed unused variable in contact flow |
| SEO | Added static `public/sitemap.xml`; updated `public/robots.txt` to www sitemap URL |
| Hosting | Narrowed `vercel.json` SPA rewrite so static SEO files are not rewritten to `index.html` |
| Forms | Shared Apps Script helper; honest “submitted / unverified delivery” messaging; validation; duplicate-submit guard; accessible status regions |
| Foundation UI | Missing CSS utilities; `:focus-visible`; reduced-motion; removed dead social `#` links; tel/mailto links; logo alt text |
| Assets | WebP heroes (~88–93% smaller); original PNGs restored and retained under `public/assets/originals/` |
| Cleanup | Removed unused Vite template `src/App.css` |
| Meta | Absolute OG/Twitter image URLs + homepage canonical in `index.html` |

No Next.js migration, no Paystack, no database, no auth, no production deploy, no Google Apps Script redeploy.

---

## 2. Files changed and why

| Path | Why |
|------|-----|
| `package.json` / `package-lock.json` | Pin patched React Router |
| `src/components/Header.jsx` | Lint-safe menu close; `aria-expanded` / clearer labels |
| `src/pages/Contact.jsx` | Honest form states; validation; a11y live region |
| `src/components/MembershipPopup.jsx` | Same form honesty; labeled email; dialog semantics |
| `src/lib/submitToAppsScript.js` | Single Apps Script submit helper documenting `no-cors` limits |
| `src/components/Footer.jsx` / `Footer.css` | Remove unverified social links; add contact link affordances |
| `src/components/Hero.jsx` | WebP + PNG `image-set` fallback |
| `src/pages/{Home,Challenge,Programs,Network,Seminars}.jsx` | Point heroes at `.webp` |
| `src/index.css` | Missing utilities, focus, reduced motion |
| `src/pages/Contact.css` / `MembershipPopup.css` | Focus rings; contact link styles |
| `public/sitemap.xml` | Canonical public routes |
| `public/robots.txt` | Point to www sitemap |
| `vercel.json` | Protect static files from catch-all rewrite |
| `index.html` | Absolute social image + canonical |
| `public/assets/*.webp` | Optimized heroes |
| `public/assets/*.png` | Restored originals for fallback / OG |
| `public/assets/originals/*` | Preserved pre-optimization PNGs |
| `src/App.css` | **Deleted** (unused template) |
| `docs/phase-2a-stabilization-report.md` | This report |

Unrelated user work: git status at start showed only untracked `docs/` from Phase 1; no other dirty tracked files were overwritten.

---

## 3. Dependency advisories addressed

### Production (verified)

**Before (Phase 1 / re-verified at start of 2A):**

- `react-router` 6.0.0 – 7.18.1 — high (multiple GHSA advisories)
- `react-router-dom` 7.0.0-pre.0 – 7.14.1 — depends on vulnerable `react-router`
- Installed: `react-router-dom@7.13.1`

**Action:** `npm install react-router-dom@7.18.4 --save-exact` (no `--force`).

**After:**

```text
npm ls react-router react-router-dom
→ react-router-dom@7.18.4 → react-router@7.18.4

npm audit --omit=dev
→ found 0 vulnerabilities
```

Routing architecture unchanged (`BrowserRouter` + `Routes` in `App.jsx`).

---

## 4. Remaining security findings

### Production

**None reported** by `npm audit --omit=dev` after the upgrade.

### Development / tooling (full `npm audit`)

Still reports **13 vulnerabilities (2 low, 2 moderate, 9 high)** in the full tree, primarily:

- `vite` (dev server path traversal / local tooling issues)
- `postcss`, `source-map-js`, and other build-toolchain packages

These affect **local development/build tooling**, not the production client dependency set. Remediation options:

1. Cautious `npm audit fix` (non-force) on a branch after reviewing the lockfile diff.
2. Upgrade Vite when a patched 7.x release is confirmed compatible with `@vitejs/plugin-react`.
3. Accept residual **dev-only** risk until the next toolchain upgrade.

**Not suppressed.** No advisories were hidden.

### Application / integration residual risk

| Risk | Status |
|------|--------|
| Google Apps Script URL in client | Unchanged; public by design for this integration |
| `no-cors` opaque responses | Documented; UI no longer claims confirmed delivery |
| Spam / lack of CAPTCHA on forms | Still open — needs owner-approved hardening or GAS changes |
| Reliable delivery confirmation | Requires authorized GAS CORS/response changes or a new backend |

---

## 5. Lint and build results

| Check | Phase 1 baseline | Phase 2A result |
|-------|------------------|-----------------|
| `npm run lint` | Fail (2 errors) | **Pass** (exit 0) |
| `npm run build` | Pass | **Pass** (exit 0) |
| Typecheck | N/A | N/A (JS project) |
| Unit/e2e tests | None | None available |
| `npm audit --omit=dev` | 2 high | **0 vulnerabilities** |
| `npm audit` (full) | 15 vulns | **13 vulns** (dev/toolchain) |

Build output (this run):

- `index.html` 2.50 kB (gzip 0.91 kB)
- CSS 22.31 kB (gzip 4.93 kB)
- JS 280.07 kB (gzip 87.75 kB)

---

## 6. Sitemap implementation and validation

### Implementation

- Static file: `public/sitemap.xml`
- Canonical host: `https://www.shechampion-bbf.org`
- Routes included (from `App.jsx` only):
  - `/`
  - `/challenge`
  - `/programs`
  - `/network`
  - `/seminars`
  - `/contact`
- `robots.txt` Sitemap directive: `https://www.shechampion-bbf.org/sitemap.xml`
- `vercel.json` rewrite excludes `sitemap.xml`, `robots.txt`, `ads.txt`, favicon, and `/assets/*`

### Local validation

- XML parsed successfully with PowerShell `[xml]` loader (well-formed).
- Vite build copies `sitemap.xml` and `robots.txt` into `dist/`.

### Deployed environment

**Not verified.** Production was not redeployed in this phase. After the next deploy, confirm:

1. `https://www.shechampion-bbf.org/sitemap.xml` returns **200** with this XML (not HTML SPA shell, not 500).
2. `https://www.shechampion-bbf.org/robots.txt` references the www sitemap URL.

---

## 7. Contact and membership form behavior

### Integration (unchanged endpoint)

Both forms still POST JSON to the existing Google Apps Script web app via `src/lib/submitToAppsScript.js` using `mode: "no-cors"`.

### Behavior now

| State | Meaning | User messaging |
|-------|---------|----------------|
| `loading` | Submit in flight; button disabled | “Sending…” / “Submitting…” |
| `sent` | Browser accepted the opaque request | “Message/request **submitted**” + explicit note that delivery **cannot be confirmed** here + mailto fallback |
| `error` | Network/throw failure, or client validation failure | Specific validation or retry/email guidance; button re-enabled |
| Duplicate submit | Blocked while `loading` | — |

### Accessibility

- `role="status"` + `aria-live="polite"` for feedback
- Membership email has a visible-for-AT label (`visually-hidden`)
- Membership dialog uses `role="dialog"`, `aria-modal`, labelled by title

### Limitation (documented, not “fixed away”)

Delivery success **cannot** be proven without readable CORS responses from Apps Script. Confirming inbox delivery requires authorized changes to that Google Apps Script deployment (or a replacement backend). Personal data is not logged to the console.

---

## 8. Image optimizations performed

| Asset | Original PNG | WebP (quality 82) | Reduction |
|-------|--------------|-------------------|------------|
| `home_hero` | 603,772 B | 41,678 B | ~93% |
| `challenge_hero` | 680,757 B | 65,986 B | ~90% |
| `network_hero` | 780,296 B | 93,194 B | ~88% |
| `programs_hero` | 716,659 B | 67,576 B | ~91% |
| `seminars_hero` | 712,054 B | 78,430 B | ~89% |

Notes:

- Source dimensions are **640×640** (already small for full-bleed heroes; further resize was not useful).
- PNGs restored from `public/assets/originals/` and kept as `image-set` / OG fallbacks.
- `sharp` was used temporarily (`npm install --no-save`) and **not** added to `package.json`.
- Visual crop/aspect unchanged; format change only for page backgrounds.

---

## 9. Outstanding limitations

1. **Production sitemap/robots** not verified live until deploy.
2. **Apps Script delivery** still unverified from the browser (`no-cors`).
3. **Dev-dependency advisories** remain (Vite toolchain).
4. **No test suite** yet.
5. **Social profile URLs** still unknown — icons removed until owner provides verified URLs.
6. **SPA SEO** still uses one global title/description (per-route titles deferred).
7. **Font loading** (Outfit/Inter) not introduced in 2A (redesign/design-system phase).
8. **Full visual redesign** intentionally not started.
9. **Paystack / 2026 event** not started.

---

## 10. Recommended next steps

1. Deploy this branch/commit set and verify live `sitemap.xml` + `robots.txt`.
2. Owner confirmation: social URLs, WhatsApp, whether GAS should be updated for CORS + JSON success responses.
3. Optional: non-force Vite/`npm audit fix` on a branch for remaining **dev** advisories.
4. Begin **Phase 2B** design system (palette refinement, typography loading, Header/Footer/Hero polish) after review of this phase.
5. Later: per-route meta, 2026 event landing, then server-backed Paystack (not Vite client secrets).

---

## Acceptance criteria checklist

| Criterion | Status |
|-----------|--------|
| No unrelated user changes overwritten | Met |
| No production deploy / external service changes | Met |
| Vite + React architecture preserved | Met |
| Logo and core content intact | Met |
| Lint errors resolved | Met (`npm run lint` pass) |
| Sitemap valid; deploy status reported honestly | Met (local valid; **live not verified**) |
| Form feedback does not claim unverified success | Met |
| Dependency remediation evidence-based | Met (prod audit 0) |
| Production build succeeds | Met |
| Phase 2A report written | Met |

---

*End of Phase 2A. Awaiting review before full visual redesign.*
