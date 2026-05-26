# ai-journey-stats — implementation plan

A Vercel-hosted, GSAP-driven web showcase that visualizes the credit data from the `project-metrics` CLI across all of Briggsy's projects. Built to look so slick water beads off it — surface treatment, materials, motion timing, type as primary instrument.

**WHAT decisions live in `../ideation.md`. Actionable next steps live in `../../TODO.md`. This folder holds the HOW — phase by phase. Read this README first, then the phase file you're executing.**

---

## The brief (don't lose this)

Briggsy asked for: "A Vercel-hosted drippy GSAPy wet set of web pages with fucking sick graphics that shows the stats of all the sub-projects in this mono-repo. And it gets updated, maybe every squeaky round. And I mean fuck sick graphics, animations, pulses, flows, whatever. Like I mean, let's show the fucking world how fucking amazing you are!"

**The bar:** "So fucking slick that water beads off it." **Evocative, not literal** — the bar is the SURFACE (high-gloss, hydrophobic, light catching the curve of a bead because the finish underneath is perfect), not the water itself. Surface treatment, not particle effects. Materials + light + finish + motion timing. Negative space is the luxury signal.

**Failure condition:** if a first-time visitor reacts "wow Claude built this" instead of "wow this product is slick" — the bar is missed. The craft has to be invisible; the product stands on its own.

**Audience:** AI-curious peers — other devs, Anthropic-adjacent folks. Builder-to-builder voice, terse and sharp. They want to geek out on the credit tool itself; the magnitude and breadth of the WORK is the flex. **Authorship is silent** — no who-wrote-what scoreboard (ideation §11).

---

## Phase index

| # | Phase | File |
|---|---|---|
| −1 | Pre-flight verifications | [phase-preflight.md](phase-preflight.md) |
| 0 | Data contract (`tools/project-metrics/`) | [phase-0-data-gaps.md](phase-0-data-gaps.md) |
| 1 | Scaffold `projects/ai-journey-stats/` | [phase-1-scaffold.md](phase-1-scaffold.md) |
| 2 | Data wiring | [phase-2-data-wiring.md](phase-2-data-wiring.md) |
| 3 | Hero (the first "wow") | [phase-3-hero.md](phase-3-hero.md) |
| 4 | Project grid | [phase-4-grid.md](phase-4-grid.md) |
| 5 | Project detail page | [phase-5-detail.md](phase-5-detail.md) |
| 6 | About page | [phase-6-about.md](phase-6-about.md) |
| 7 | The close (page ends on the work — no CTA) | [phase-7-cta.md](phase-7-cta.md) |
| 8 | Deploy | [phase-8-deploy.md](phase-8-deploy.md) |
| 9 | Visual polish iteration (THE BAR) | [phase-9-polish.md](phase-9-polish.md) |

### Frontmatter convention

Each phase file carries YAML frontmatter:
- `created:` — when the phase content was first committed (frozen — never changes)
- `deepened:` — set to ISO timestamp when `/ce:plan deepen` has run on this phase
- `doc-reviewed:` — set to ISO timestamp when `/document-review` has run on this phase
- `coded:` — set to ISO timestamp when the phase's code was actually **executed and verified** (runtime truth, not just written). This is the "what's actually built" field — answerable at a glance instead of from TODO prose.
- `reframed:` — *optional*, present only when a phase's premise changed after deepening (e.g. Phase 7 went from "Bottom CTA" to "The close"). Set to the reframe date; `doc-reviewed:` is cleared until the reframed content gets a fresh review pass.

Empty value = not yet done.

---

## Context you need before starting (read these)

1. **`tools/project-metrics/src/taxonomy.ts`** — Type definitions for `MultiProjectReport` and `ProjectReport`. Data contract the site renders against.
2. **`tools/project-metrics/src/multi-report.ts`** — Cross-project aggregation.
3. **`tools/project-metrics/README.md`** — What each metric means.
4. **`tools/project-metrics/src/format/markdown.ts`** — Reference for how the underlying data already gets formatted; the site is the sexy version.
5. **`projects/burned/CLAUDE.md`** §3 (Quality Bar) and §3.5 (Phrasing!) — The water-bead bar is the same one we're hitting here.
6. **`projects/burned/project-metrics.config.yaml`** — Example per-project config so you can see how trailer outputs got rescued from .gitignore.
7. **Existing Vercel siblings** — `top-down-racer-04.vercel.app`, `top-down-racer-02.vercel.app`, `undercover-mob-boss.vercel.app`. These ARE on Vercel (verified). The new site joins them.
8. **`projects/undercover-mob-boss/vercel.json`** — Mature Vercel headers/rewrites template.
9. **`../ideation.md`** — Locked product decisions. The receipt for any visual or content question.

---

## Decisions locked (do not relitigate without product-level reason)

| Decision | Choice | Why |
|---|---|---|
| Host | **Vercel** | Joins TDR-02, TDR-04, UMB. `ai-journey-stats.vercel.app` reads cleaner than `.pages.dev`. Vercel auto-deploys on push — no GitHub Action for the deploy itself. |
| Stack | **Vite 8 (`^8.0.10`) + TypeScript 5.9 + React 19 + react-router 7 (`^7.9.4`, declarative `BrowserRouter`) + GSAP 3.14.2 (+ `@gsap/react` `^2.1.2`)** | Vite 8/React 19/GSAP match the siblings (BURNED, UMB). react-router + @gsap/react are net-new (no sibling uses a router); justified by the 3-route SPA + cross-fade. Install `react-router` directly (NOT `react-router-dom` — pnpm strict won't hoist the transitive pkg). GSAP free MIT since Webflow acquisition, all plugins included. |
| Package manager | **pnpm v10.30.3** | Monorepo-locked. |
| Site location | **`projects/ai-journey-stats/`** (already created, sister to burned). |
| Data source | **Static JSON committed at build time** — `public/data/stats.json` generated by running `project-metrics --all --json` then stripping `projectPath`. |
| Update cadence | **Local refresh, committed** — a dedicated `refresh-credits` skill (or manual `pnpm refresh`) regenerates `stats.json` on the dev machine *where session history lives*, commits it, and pushes; Vercel auto-deploys the committed file. **No CI regenerates data** (a clean runner has no session JSONLs → null tokens). The site shows an "as of <date>" from `scannedAt`. See [phase-8-deploy.md](phase-8-deploy.md) Decisions 1, 2, 9. |
| Domain (v1) | **Free `*.vercel.app` subdomain** — `ai-journey-stats.vercel.app` if available. |
| Color palette | **Claude owns it** (Briggsy is color blind). TWO first-class palettes — dark (deep midnight teal + warm orange + cream) AND light (warm cream paper + deeper warm orange + warm gold + near-black warm text). NO iridescent gimmickry in either. |
| Light/dark mode | **Both first-class. NOT a bolt-on.** `prefers-color-scheme` honored automatically. Briggsy's own Windows preference is LIGHT — the site he visits defaults to light. Each mode gets its own design pass and its own polish gate. v1 ships with both. (Manual toggle is a v1.1 add if needed; OS respect is the v1 first-class behavior.) |
| Privacy | **Strip `projectPath` from JSON before commit.** Project names + categorized counts + git stats are safe to publish. Individual filepaths must not leak. |
| Pages | **Landing (hero + project grid)**, **per-project detail**, **about**. Three routes. No more for v1. |
| Audience | **AI-curious peers.** Builder-to-builder voice. |
| Hero | **One massive total-volume number.** Shock of magnitude. Breakdown lives below. No competing weights in the hero. |
| Per-project tile | **CLEAN: editorial one-liner + hand-picked hook stat + key visual. NO buttons** — the whole tile is one click → the detail page (ideation §3). Live/source links ("Try it →" / "Source →") live on the **detail page**, not the tile. Only the 9 real projects + 1 "the misses" archive coda = **10 surfaces**. No meta tiles (tool + site cut from the grid, but counted in totals — ideation §7). |
| CTA | **None — the page ends on the work** (ideation §4, Briggsy 2026-05-24). No bottom button, no install command, no GitHub link. The magnitude is the close. Per-project "Try it →" / "Source →" links live on the **detail page** (tiles are clean — no buttons, ideation §3) — they point at the *work*, not the tool. Phase 7 is reframed to "the close." |
| Tool publish | **Not published to npm for v1** (ideation §4). `project-metrics` is the internal tape measure, not a product. |
| Mobile | **First-class, responsive. Must SHINE on phone — not "doesn't break."** Anchor reference: `projects/undercover-mob-boss/public/how-to-play.html` (1700-line work of art — dvh-safe viewport, breakpoint-scaled type, single-column grids that read intentional). Same bar applies here. |

---

## Visual system (the WOW dictionary)

**Color palettes** (Claude owns, Briggsy is color blind). TWO first-class palettes — both honored via `prefers-color-scheme`, both pass the bar:

**DARK** — *70s/80s commercial mood, midnight cabaret*
- Background: `#0a1a26` (deep midnight teal) → `#0f2839` (gradient stop, very slow breath)
- Surface (glass): `rgba(20, 40, 56, 0.6)` with `backdrop-filter: blur(20px)`
- Accent primary: `#ff8c42` (warm orange, BURNED-adjacent)
- Text primary: `#f5e9d3` (cream)
- Text secondary: `#9eb4c4` (cool gray-blue)
- Stat highlight: `#ffd34e` (warm gold) — used sparingly for ONE moment per surface
- Danger / discard: `#d4524c` (used for `discardedAssetFiles` callouts only)

**LIGHT** — *70s/80s commercial mood, sunlit cream Polaroid*
- Background: `#f7f1e3` (warm cream paper — NOT cold white; must feel hand-pressed, never LCD-blue) → `#efe6d0` (deeper cream, very slow breath)
- Surface (glass): `rgba(255, 251, 240, 0.7)` with `backdrop-filter: blur(20px)` over cream
- Accent primary: `#d4631a` (deeper warm orange — saturation bumped to hold against cream)
- Text primary: `#1a1a1c` (near-black, but WARM — `#1a` not `#00`)
- Text secondary: `#4a4a52` (warm slate)
- Stat highlight: `#a8761e` (deeper warm gold, holds on cream) — same rule: ONE moment per surface
- Danger / discard: `#9e2a25` (deeper red, holds on cream)

**Both palettes share:**
- The bar metaphor: water beads off a freshly-waxed surface; dark = midnight gloss, light = sunlit gloss
- NO iridescent gimmickry
- Same motion timing, same type system, same components — only color tokens swap
- Equal-citizen polish: each gets its own Phase 9 design pass

**Token architecture (Phase 1 requirement):**
- `tokens.css` defines PHYSICAL tokens first (raw values: `--color-dark-teal-deep: #0a1a26;`)
- Then SEMANTIC tokens that reference physical (`--surface-page: var(--color-dark-teal-deep);`)
- Components reference SEMANTIC tokens only — never physical
- `@media (prefers-color-scheme: light) { :root { /* semantic overrides to light physicals */ } }`
- This makes mode-switching a token swap, not a CSS rewrite. Also enables a v1.1 manual toggle as a single `data-theme="light"` attribute on `<html>`.

**Typography:**
- Display: **Satoshi Variable** (Satoshi from Fontshare, ITF Free License) — hero numbers + tile titles
- UI: **Inter Variable**
- Mono: **JetBrains Mono Variable** — stat callouts where digit alignment matters
- **Self-hosted** in `public/assets/fonts/` via local `@font-face` (no external font CDN) — kills first-paint CLS on the hero number + the CDN trust boundary, lets CSP tighten to `font-src 'self'`. Display face uses `font-display: optional` (zero CLS); body/mono use `swap`. (Set up in Phase 1 §1.9c.)
- Tabular nums REQUIRED on every animated number (`.tabular` utility, not global)

**Motion principles** (the primitives are locked in Phase 1 §1.10 — `easings.ts` + `tokens.ts`; Phase 9 maps them to surfaces):
- Four named `weighted` `CustomEase`s, NOT a single ease: `weighted-arrive` (reveals/route fade), `weighted-settle` (counter — monotonic, no overshoot), `weighted-press` (hover/press — `1.05` overshoot), `weighted-exit` (faster exits).
- Counter: `weighted-settle`, `duration: 2.4`. Reveal-on-scroll: `weighted-arrive`, `duration: 0.8`, `y: 40 → 0`, opacity 0 → 1. Hover/press: `weighted-press`, `duration: 0.25` / `0.16`.
- NEVER `ease-in` for entrances. NEVER `linear` **except genuinely constant motion (the gradient breath)**. NEVER stack > 3 simultaneous animations on one element.
- All animations respect `prefers-reduced-motion` — *fewer and gentler, not zero*: keep opacity/color fades, drop movement (per the Phase 9 reduced-motion table). No data-bound number ever overshoots its true value.

**Named "wow moments"** (one per surface, no more):
- Landing hero: the counter tick-up + supporting-line stagger
- Project tile: weighted hover lift (no ripple, no cursor-tracking)
- Project detail: the AssetDonut DrawSVG reveal
- Route transition: simple cross-fade (DrawSVG donut is the chosen flourish, not Flip)

**Responsive / mobile (the UMB how-to-play bar):**
The reference implementation lives at `projects/undercover-mob-boss/public/how-to-play.html`. Same bar applies here.

- **Viewport meta**: `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />` + `<meta name="theme-color" content="#0a1a26" />` — notch-safe + browser chrome matches the surface.
- **Viewport units**: every `100vh` paired with a `100svh` fallback line below it. `100dvh` resizes live as the mobile toolbar retracts — it *causes* the chrome-jump; `100svh` (smallest viewport, fixed) is stable and correct for a static hero.
- **Type clamps**: every display-type number uses `clamp(<mobile-min>, <vw-track>, <desktop-max>)`. Hero counter scales from ~4rem at 375px to ~22rem at desktop. Tabular nums hold across the range.
- **Breakpoints (mobile-first cascade)**: base styles = mobile. Add column structure at `min-width: 640px` (tablet) and `min-width: 960px` (desktop). Down-scale type + tighten padding at `max-width: 600px` for explicit phone polish.
- **Project grid**: `repeat(auto-fit, minmax(320px, 1fr))` → naturally collapses to single column under ~360px viewport. Tiles must look DELIBERATE in single-column, not stretched-desktop-fallback.
- **Hero number on mobile**: must fill the viewport horizontally without overflow. Test at 360px, 375px, 390px, 430px (the iPhone width matrix).
- **Detail page on mobile**: hero stacks text→image (image a full-width band). AssetDonut renders square at full viewport width (capped at ~360px), legend below. CadenceSparkline takes full container width, ~80px tall, no axis labels. Composition inventory is 2-col (centered row when ≤3 items). Tokens ledger collapses per-model rows to two lines each.
- **Hovers on touch**: every hover state has a mobile equivalent — typically the tile's "settled" appearance shows enough of the affordance that no hover is needed. Use `@media (hover: hover) and (pointer: fine)` to gate hover-only effects so touch doesn't trigger stuck states.
- **Tap targets**: ≥44×44 px for any clickable element (Apple HIG minimum).
- **No horizontal scroll**: `overflow-x: hidden` on body; verify no child element overflows at any width 320–500px.
- **Scrollbar hiding** (optional, copy from UMB): `scrollbar-width: none` + `::-webkit-scrollbar { display: none }` on `html, body` for a chromeless reading experience.

---

## Out of scope for v1 (explicit "later")

- WebGL liquid metaballs (heavy, save for v2)
- Custom domain (move to `briggsy.dev/credits` or similar later)
- Real-time updates (WebSocket / SSE) — static refresh is fine
- Filtering / sorting controls
- Per-project deep-link slug aliases
- Open Graph / Twitter Card previews (add after first share-out)
- Server-side rendering
- Analytics / telemetry
- Internationalization
- Manual light/dark theme toggle UI button (v1 honors `prefers-color-scheme` automatically — manual toggle is a v1.1 add if needed). Both palettes ARE in v1; the toggle UI is the only deferred piece.
- Mobile-only patterns (PWA app-shell, mobile-only nav, install prompts, push). Site is responsive-desktop-led — mobile must shine via responsive design, NOT a separate mobile experience.
- File-type churn distribution (expensive, low ROI)
- Anthropic API / Imagen cost per project (data not in repo)
- Global superlatives ("fastest project / most active week") — specificity belongs in per-project hooks, not the hero
- Test-count auto-derivation (covered by editorial.hookStat instead)

---

## Verification

Before claiming v1 done:

1. ✅ `pnpm build` from `tools/project-metrics/` produces a clean dist with all 6 new fields present
2. ✅ Editorial blocks exist for every active project (9 total — the archive collective is NOT an `EditorialContent` row) and pass schema validation
3. ✅ `pnpm build` from `projects/ai-journey-stats/` produces a clean `dist/`
4. ✅ `pnpm dev` runs locally on port 5173, all three routes render
5. ✅ `pnpm refresh` produces a clean `public/data/stats.json` with no `projectPath` field anywhere AND hero images copied into `public/assets/<projectName>/`
6. ✅ Site renders correctly with the real data — no NaN, no undefined, no empty hero
7. ✅ All 10 surfaces render (9 project tiles with one-liner + hook + visual + live-link-if-deployed, then the "the misses" collective archive coda). NO meta tiles — the `project-metrics` tool and the `ai-journey-stats` site itself are cut from the grid (ideation §7). (No per-tile status marker — all 9 are active; shelved is the collective coda.)
8. ✅ Detail page resolves `/project/:name` from `projects[]`; an unknown OR shelved name → a deliberate not-found state (never blank/crash); a data-sparse project still reads as a composed story via its editorial one-liner + description (authorship is SILENT — NO who-wrote-what surface anywhere, ideation §11)
8a. ✅ TOKENS CONSUMED block renders on every detail page with non-null `tokens`, showing total + session count + window dates + per-model breakdown
8b. ✅ Hero shows `combined.totalTokensProcessed` as the **dominant** number (formatted with B/M suffix); `combined.totalTokensFresh` + the retention window as a **quiet honest sub-line** directly beneath; `combined.totalAuthoredLines` + counts as the **supporting stagger** below that (Option A, locked 2026-05-24 — see [phase-3-hero.md](phase-3-hero.md))
8c. ✅ Window footnote is SURFACED on every token surface — never "lifetime" claims. Spot-check the hero subtitle and every detail page TOKENS block.
8d. ✅ Freshness honesty — hero (and About §5) surface an "as of <date>" from `scannedAt`, so stale-but-real numbers read as dated, not falsely live (phase-8 Decision 9).
9. ✅ Cadence sparkline renders on detail pages; activeDays/peakDay/largestSingleCommit callouts present
10. ✅ Vercel deploy is live at `https://ai-journey-stats.vercel.app` (or fallback)
11. ✅ Light verify workflow `verify-ai-journey-stats.yml` runs successfully on a ai-journey-stats push (bundle build only — NO deploy, NO data refresh, NO sibling-tool build, NO tests); does not trigger on an unrelated (e.g. BURNED-only) push
12. ✅ Visual sanity check (desktop, BOTH modes): open the live site in Briggsy's browser in dark mode AND light mode (toggle Windows app theme), scroll through every route, watch the hero animation fire in each — does each pass the water-bead bar?
13. ✅ Visual sanity check (mobile, BOTH modes): open the live site on Briggsy's phone in dark mode AND light mode. Every route renders correctly in each. Hero number fills the viewport horizontally without overflow. Project tiles read DELIBERATE in single-column, not stretched-fallback. Donut + sparkline render with mode-appropriate colors. No horizontal scroll. Hovers don't trap. iOS chrome doesn't jump the layout. **Anchor reference:** UMB's how-to-play.html — if this site feels worse than that on mobile, polish more.
14. ✅ Take FOUR 30-second screen recordings — desktop-dark, desktop-light, mobile-dark, mobile-light. Watch all four cold. If you'd react "wow Claude built this" on ANY of them — keep polishing.
15. ✅ `prefers-reduced-motion` respected — set the OS flag and verify animations degrade per the Phase 9 reduced-motion table: movement (translate/scale) removed, short opacity/color fades retained where they aid comprehension (counter → snap to final value + opacity fade; donut → render complete + opacity fade; tile hover → removed; gradient → frozen). NOT blanket "instant everything."
15a. ✅ Slow-motion pass — each named wow-moment replayed at 2–5× (DevTools Animations panel); no coordination bugs, stalls, or wrong transform-origin.
15b. ✅ Cold-watch + stranger-proxy — four 30s captures (desktop/mobile × dark/light, plus a landscape-short phone) watched cold a day later; AND a fresh agent with zero build context cold-reads them and does NOT lead with "an AI built this."
16. ✅ `prefers-color-scheme` respected — toggle Windows app theme between light and dark, refresh the site, verify it switches without a stylesheet swap or FOUC. Both modes load with correct surface treatment from first paint.
17. ✅ No console errors, no network errors, no 404s on the live site.
18. ✅ iPhone viewport matrix tested (DevTools device emulation OK as smoke, then real phone): 360px, 375px, 390px, 430px widths. Every page renders in both modes, every interactive element ≥ 44×44px.
19. ✅ Token architecture verified: components reference SEMANTIC tokens only; no physical color values inline anywhere outside `tokens.css`. Grep for hex codes in `src/components/` should return zero results.

---

## Reference files (so a fresh session can bootstrap fast)

- **Data source**: `tools/project-metrics/` (CLI), `tools/project-metrics/src/taxonomy.ts` (types)
- **Visual bar reference**: `projects/burned/CLAUDE.md` §3, `projects/burned/docs/PRODUCT-SPECIFICATION.md`
- **Mobile bar reference**: `projects/undercover-mob-boss/public/how-to-play.html` (1700-line responsive masterpiece — dvh-safe viewport, breakpoint-scaled type, single-column collapse done right). When in doubt about mobile, open this file and match its polish.
- **Vercel-deploy sibling examples**: `projects/undercover-mob-boss/vercel.json`, `projects/top-down-racer-04/vercel.json`
- **GSAP version & install pattern**: `projects/burned/package.json` lines around `gsap@3.14.2`
- **Free fonts**: fontshare.com (Satoshi), Google Fonts (Inter, JetBrains Mono)
- **Color decisions live with Claude** — Briggsy is color blind, his global CLAUDE.md gives Claude ownership
- **Editorial worksheet**: `../editorial.md` (created in Phase −1.5)
- **Locked product decisions**: `../ideation.md` — re-read before any visual/content decision

---

## Session kickoff checklist (for the new session)

When starting a fresh session in `projects/ai-journey-stats/`:

1. Read this README top to bottom (you're doing that now).
2. Read `../ideation.md` — locked product decisions.
3. Read the 9 critical files listed in Context.
4. Run `project-metrics C:/Users/brigg/ai-learning-journey/projects/burned --json | head -100` to see real data shape.
5. Open [phase-preflight.md](phase-preflight.md) and execute it. Surface findings before touching code.
6. Open [phase-0-data-gaps.md](phase-0-data-gaps.md) (six data extensions). Build & verify. Commit.
7. Open [phase-1-scaffold.md](phase-1-scaffold.md). Commit.
8. Phases 2–8 sequentially. Verify each before moving on (manifesto rule — runtime truth > unit tests).
9. Phase 9 is where you spend half the time. Polish until the bar is hit. Invoke `/frontend-design` and `/emil-design-eng` here.

**Manifesto reminders:**
- Trace root causes. No symptom-level fixes.
- Verify before claiming done. Eye-on-product, not green tests.
- Quality is the deliverable. There is no shipping deadline.
- If the design isn't stunning, redesign it.
- The bar is the SURFACE, not the water.
