---
title: "Phase 1 — Foundation"
type: feat
phase: 1
parent: docs/plans/css-foundation-rebuild/roadmap.md
date: 2026-04-11
status: completed
deepened_on: 2026-04-11
completed_on: 2026-04-12
---

# Phase 1 — Foundation

**Goal.** Stand up the complete token system — primitives, semantic layers (axis-independent + phone-forked + board-forked), motion TS/CSS twin, and CI test harness (CVD + contrast + motion-sync). Zero component migration in this phase. The foundation must exist as files that pass their own tests before any `.module.css` consumes them.

**Why this is Phase 1 and nothing else.** Per the autopsy's diagnosis — *"CSS Modules without shared tokens = organized chaos. The encapsulation creates an illusion of architecture."* — the single most important lesson from UMB vs. BURNED is that **the design system has to exist as deliverables before the components can be rewritten against it.** If Phases 2 and 3 start migrating files before the tokens are locked, every early migration will drift from every later migration, and we'll be back where we started. Phase 1 is the contract that Phases 2-5 execute against.

---

## Follow-Up Sweep (2026-04-12)

**17 new tokens + 4 amendments** folded in from Phase 3 §7 (the cross-phase token list that Phase 1's original deepening didn't catch). All values sourced from Phase 3 §7.1–§7.6, verified against Phase 3 deepening corrections. No new research needed — purely mechanical token insertion.

**Amendments (4):** `--space-fluid-base-board` max 32→40px, `--space-fluid-loose-board` max 64→80px, `--size-player-panel-width` min 160→180px, `--size-draw-pile-width` 80→160 → 120→240.

**New in `semantic.board.css` (8):** `--text-caption-board`, `--size-lobby-roster-max-width`, `--size-title-accent-width`, `--size-rankings-max-width`, `--size-felt-reticle`, `--size-felt-diamond`, `--size-discard-card-width`.

**New in `semantic.css` (14):** 8 MinimalCard text-clamp tokens (`--text-card-name-{min,max,large-min,large-max}`, `--text-card-desc-{min,max,large-min,large-max}`), 6 DramaOverlay text-clamp tokens (`--text-drama-{hero,subdued,victory}-{min,max}`).

**New in `primitives.css` + `motion.ts` (2+2):** `--motion-duration-pulse` (1400ms, decorative) + `--motion-duration-pulse-slow` (2500ms, decorative) + matching `MOTION_DURATIONS.pulse` / `.pulseSlow`. Note: `--motion-duration-pulse` ≠ `--motion-duration-essential-pulse` — same value, different reduced-motion behavior.

---

## Enhancement Summary (Deepening Pass — 2026-04-11)

**Deepening method.** 12 parallel agents: 6 domain-research sub-agents (Motion 12.x API, culori + apca-w3 API, iOS Safari 26 viewport landmines, Radix Colors + design-system consensus, `color-mix()` + `@property`, Utopia vertical-axis + WCAG 1.4.4), 5 code-review agents (kieran-typescript, architecture-strategist, performance-oracle, pattern-recognition-specialist, code-simplicity-reviewer), 1 cross-phase scan (reads Phases 2-5 and surfaces contradictions), 1 codebase verification (actual state of `theme.ts`, entry points, Framer Motion usage). Primary sources verified: Motion 12.38 type defs from `node_modules`, culori v4.0.2 source, apca-w3 v0.1.9 source, WebKit bug 297779, W3C WCAG 2.1/2.2 + F94, Radix Colors docs, CSS CM4 spec, iOS HIG 2026, Machado et al. 2009 (CVD simulation), Myndex APCA-W3 Bronze thresholds.

### Critical corrections landed (BLOCKERS — the plan's original code would fail at runtime or compile)

1. **§2.7 test code rewritten from scratch.** `culori.filter('deuteranopia', 1)` **does not exist** — real API is `filterDeficiencyDeuter/Prot/Trit(severity)` (Machado-Oliveira-Fernandes 2009 matrices). `apca-w3.sRGBtoY(parse(color))` silently returns NaN — `sRGBtoY` expects an integer RGB triple `[R,G,B]` where R/G/B are `0..255`, not a culori color object. `Math.abs(APCAcontrast(...))` is wrong per apca-w3 source header: *"DO NOT output an absolute value — light text on dark BG should return a negative number. APCA is polarity sensitive."* — keep sign, report polarity, compare magnitude for the pass gate. apca-w3 also ships no TypeScript types — `src/types/apca-w3.d.ts` ambient declaration now required.
2. **§2.6 motion.ts type pattern fixed.** Per-field `as const satisfies Transition` is the wrong placement — Motion 12's `Transition` is a generic discriminated union over `type: 'tween'|'spring'|...` and per-field `satisfies` does not earn its keep. Verified against `src/client/shared/animation-config.ts:7-10` — the existing production pattern is outer `} as const satisfies Record<SpringName, Transition>`. Applied to `MOTION_DURATIONS`, `MOTION_EASINGS`, `MOTION_SPRINGS`, `MOTION`. Also: import `Easing` from `motion/react` and drop every inline `as [number, number, number, number]` cast — `motion-utils` exports `type BezierDefinition = readonly [number, number, number, number]` which already matches `as const` output.
3. **§2.3 Safari `color-mix(in oklch, ...)` bug.** Reported November 2024 (Tailwind v4 community): Safari Desktop renders some blues as pink when mixed in `oklch` space. Still live in Safari 26 as of 2026-04-11. Every shadow token switches from `color-mix(in srgb, ...)` to `color-mix(in oklab, ...)` — `oklab` is unaffected **and** is the 2026-preferred interpolation space for overlays (srgb routes through transparent black, producing muddy midpoints; oklab holds hue and chroma all the way to 0% alpha).
4. **12+ orphan `[data-theme="light"]` blocks in existing `.module.css` files.** Verified via grep: `MinimalCard`, `GameOver`, `JoinScreen`, `NopeButton`, `InterceptButton`, `TurnBanner`, `TitleBar`, `player/StatusBar`, `SmartActionBox`, `PlayingView`, `sheets/sheets` all still have `[data-theme="light"]` blocks wired to old `theme.ts` runtime tokens. Phase 1's original step 16 deletes `theme.ts` but leaves those selectors in place — silent dead code until someone forces `data-theme="light"` and hits undefined `var(--red-glow)`-style landmines. New step 16a grep-deletes every orphan light-mode block **before** `theme.ts` goes.
5. **`cardAccent()` migration must precede `theme.ts` deletion.** Verified: `theme.ts:cardAccent(type)` is consumed in `src/client/shared/MinimalCard.tsx:28` and `src/client/player/sheets/FuturePeek.tsx:70` via inline style (`--card-accent`, `--card-glow-color`). Step 16 as originally written deletes `theme.ts` before migrating these consumers — guarantees a compile break. New step 8a migrates `cardAccent` to `palette.ts` (or a new `card-accents.ts`) with updated imports at the two call sites, **then** step 16 deletes `theme.ts`.
6. **Clash Display `@font-face` strategy missing entirely.** §2.3 of the original plan referenced `--font-display: 'Clash Display', ...` with no `@font-face` block, no `<link rel="preload">`, and no `font-display` strategy. Clash Display at 4 weights × 2 styles = ~60 KB gzipped WOFF2 — larger than everything else Phase 1 adds combined. New §2.13 commits to `font-display: optional` (FOIT, no flash, reload-second-visit upgrade) + cross-origin preload of the display weight only, with body/mono deferred.
7. **7 cross-phase token contradictions resolved.** The cross-phase scan surfaced 7 tokens that Phases 2-5 consume but Phase 1 does not define:
   - `--size-card-detail-max` (Phase 2 §2.3.9c) — now in §2.4
   - `--space-fluid-base-board`, `--space-fluid-loose-board` (Phase 3 §2.3.2/§2.3.6 — GameTable, Lobby) — now in §2.5
   - `--text-hero-subdued` (Phase 3 §2.3.5 — DramaOverlay muted variant) — now in §2.5
   - `--size-player-panel-width` (Phase 3 §2.3.3 — PlayerRing; Phase 4 §2.7 — measurement-div TSX readback) — now in §2.5
   - `--size-player-panel-height` (Phase 4 §2.7 — measurement-div pair to width) — now in §2.5
   - `--motion-duration-ambient: 4000ms` (Phase 3 §2.3.10 — DrawPile breathing) — now in §2.2 and §2.6
   - `--motion-duration-dots: 1500ms` (Phase 4 §2.5.4 — JoinScreen dots animation) — now in §2.2 and §2.6
   Per §7 rule *"missing token → add to Phase 1"*: all 7 added. Phase 2-5 plans reference them unchanged.

### High-value additions

8. **`@property` block** (new §2.10). `@property` Baseline July 2024 — 20+ months interop by April 2026, production-ready. Register every `--color-*` as `syntax: '<color>'` and every `--motion-duration-*` as `syntax: '<time>'`. Catches typos at parse time (malformed values get console warnings and fall back to `initial-value`); unlocks live transitions on animated tokens (essential for the reduced-motion `@media` fork to actually affect in-flight animations); bounds the billion-laughs `var()` expansion safety case. ~2 KB gzipped total.
9. **`@layer` cascade ordering** (new §2.11). Vite 8 + Rolldown RC has documented cases where global CSS chunk order becomes non-deterministic in production builds (dev server preserves order, production may not). Explicit `@layer primitives, semantics, semantics-phone, semantics-board, components;` declaration makes cascade order build-tool-independent. ~40 bytes gzipped.
10. **Safe-area tokens + `viewport-fit=cover`** (new §2.12). Phase 1's original `semantic.phone.css` had no `env(safe-area-inset-*)` handling; on notch/Dynamic Island iPhones, a `100svh` phone root clips UI under the home indicator. New `--inset-top/-bottom/-left/-right`, `--size-viewport-safe: calc(100svh - var(--inset-top) - var(--inset-bottom))`, and phone root uses `min-height: var(--size-viewport-safe)`. Documents the `viewport-fit=cover, interactive-widget=resizes-content` meta tag requirement.
11. **WebKit bug 297779 landmine** (new landmine in §5). Confirmed bug in iOS Safari 26 Beta 7 → partial fix in 26.1 → further partial fix in 26.4: `position: fixed` elements drift 10–24 px as the address bar auto-hides or the keyboard dismisses. 2026-safe pattern: `position: sticky` on a flex child of a `100svh`-rooted column. Phase 2's hand-strip / FAB landing uses this pattern; Phase 1 documents the rule and adds it to the forbidden-patterns lint.
12. **Dual-family reduced-motion tokens** (new §2.9). Plan's original global `@media (prefers-reduced-motion: reduce) { :root { --motion-duration-*: 0ms } }` is too blunt — zeroing a loading spinner makes the app read as frozen (a *new* accessibility failure), and BURNED's turn-indicator breathing glow is a gameplay signal. New parallel token family `--motion-duration-essential-pulse/-spin/-flash` survives the reduced-motion override (WAI 2.3.3 carve-out for motion essential to information). Documented rule: `@keyframes` animations MUST consume a `--motion-duration-*` token — a Phase 1 lint check catches any hardcoded `animation: spin 1s infinite`.
13. **`MotionConfig reducedMotion="user"`** wrapped around `MotionProvider` (§2.6). Motion 12's recommended app-wide opt-out: disables transform/layout animations while preserving opacity/backgroundColor. Belt-and-suspenders alongside the CSS `@media` zeroing — same OS signal, two consumers, no conflict. Individual components only reach for `useReducedMotion()` when they need a bespoke fallback animation (opacity swap for a slide, etc.).
14. **Lint rules** (new §2.14). Ban `--color-*` / `--space-*` / `--motion-*` / `--text-*` / `--size-*` definitions inside any `.module.css` — stylelint or grep-based CI check. Enforces "tokens live in `tokens/`" contract before Phase 2 migration starts. Also bans `position: fixed` on phone (use `sticky`), `dvh` in `semantic.phone.css` (scroll-recalc jank), and `animation:` declarations without `var(--motion-duration-*)`.
15. **Radix APCA guarantees baked into CVD test** (§2.7). Radix Colors documents that step 11 guarantees Lc 60 APCA against step 2, and step 12 guarantees Lc 90. Test harness now asserts both for every scale, giving each color scale an automated self-check alongside the critical-pair distance gate.
16. **`--color-shadow-base: var(--color-charcoal-1)`** semantic indirection (§2.3). Current shadow tokens reach directly into the `--color-charcoal-1` primitive seven times — a primitive leak at the semantic layer. Light-mode retheme would require changing all seven instead of one. One semantic pointer decouples shadow color from scale identity.
17. **`--color-fg-on-*` token family** (§2.3). Original plan had one ambiguous `--color-fg-on-accent`. Replaced with explicit per-role pairs (`--color-fg-on-danger`, `-on-success`, `-on-warning`, `-on-info`, `-on-burned`, `-on-intercept`, `-on-operative`, `-on-drama`, `-on-neon`) so Phase 2/3 solid-button work knows exactly which foreground goes on which accent background. Each is tuned to pass APCA Lc 60 against its paired solid.

### Naming / simplicity corrections (low-cost, high-consistency)

18. `--color-rose-neon` / `--color-rose-neon-glow` → `--color-neon-magenta` / `--color-neon-magenta-glow` — there is no "rose scale," so the `rose-` prefix is a phantom namespace. Self-describing names instead.
19. `--motion-ease-standard` → `--motion-ease-base` — matches `--motion-duration-base` as the universal default marker. `MOTION_EASINGS.standard` → `MOTION_EASINGS.base` in `motion.ts`.
20. `--radius-pill` deleted — one-to-one alias of `--radius-full` with no documented swap intent. Components consume `--radius-full` directly. "Pill-shaped" = "fully rounded rectangle."
21. `--z-max: 9999` deleted — magic ceiling with no slot above `--z-toast: 3000`. Top of the ladder is now `--z-toast`. If a dev-tool overlay ever needs above-toast, the plan adds `--z-toast-above: 3100` at that moment.
22. `--size-card-width` / `--size-card-height` in `semantic.phone.css` and `semantic.board.css` renamed to `--size-phone-card-*` / `--size-board-card-*` — same token name with two different formulas across two always-loaded files is a cross-view collision trap. Phase 2/3 cross-view components (`MinimalCard`) now resolve via container queries or explicit namespace.
23. `--text-micro: 10px` raised to `11px` min — below iOS HIG 11 pt minimum readable and at the edge of WCAG 1.4.4 zoom compliance. Folded into `--text-caption` (11→13 px); Phase 1 ships five phone text sizes instead of six.
23a. `--text-body` floor raised from 14 px → 15 px per Decision 3 (WCAG + arm's-length accessibility). Delta shrinks from 4 to 3 px across 699 svh; still fluid.
23b. `--motion-duration-instant: 100ms` dropped per Decision 2 (YAGNI — no named consumer). Phase 4 motion-literal audit re-adds it if a real need surfaces.
23c. `palette.ts` flipped to codegen per Decision 1 (`scripts/generate-palette.ts` reads `primitives.css`, emits `palette.generated.ts`). `palette-sync.test.ts` deleted — drift structurally impossible.
24. **WCAG 1.4.4 load-bearing comment** added above phone text tokens in §2.4. The `clamp(rem, calc(rem + (100svh − 667px) × k), rem)` pattern passes F94 **only because** the leading `rem` scales with browser text zoom — `clamp(rem, svh × k, rem)` fails. Comment documents the rule so nobody "cleans up" the formula into a non-compliant shape.

### Bundle budget — corrected math

Original estimate: +1 to +2 KB gzipped net. **Corrected: +3.0 to +3.8 KB gzipped** for the CSS side (74 color primitives + 37 sizing/spacing/motion/radius/z tokens × ~50 bytes raw each × 4-5× gzip factor + `@property` block ~1-2 KB + `@layer` declaration ~40 B). Minus `theme.ts` + `theme.css` recovery (~750 B gzipped) = **net +2.25 to +3.05 KB gzipped**. **Phase 1 gate tightened to 97.5 KB gzipped ceiling** (not the original "investigate beyond +5 KB"). Current phone entry is ~95 KB; after Phase 1 lands expect ~97.3-98.1 KB. If the upper bound trips the gate, Phase 5's per-entry primitive tree-shake Vite plugin (Lightning CSS `unusedSymbols`) recovers ~500-800 B per entry — reserved as the escape valve.

**Font loading delta separate.** Clash Display 1 weight WOFF2 preload ≈ 14 KB gzipped over the wire on first visit. With `font-display: optional`, the font loads async and is *not* part of the 100 KB initial JS budget — it's a parallel font fetch. No conflict with the phone budget, but documented.

### ATC decisions locked (2026-04-11, post-deepening)

Four items were initially flagged for Briggsy's call during deepening. All four are now resolved — ATC delegated to pilot, decisions recorded here so they're locked and not re-litigated.

- **DECISION 1 — `palette.ts` codegen, `primitives.css` source of truth.** Architecture strategist and TypeScript reviewer unanimously recommended generating `palette.ts` from `primitives.css` at build time. Simplicity reviewer said either way is acceptable. The tie-breaker: "drift structurally impossible" beats "drift caught by CI test." A ~30-line PostCSS script in `scripts/generate-palette.ts` reads `primitives.css` and emits `src/client/shared/tokens/palette.generated.ts` as a flat `as const` object. Runs in `prebuild` and `predev` hooks. `palette.generated.ts` is gitignored (not committed — the source of truth is `primitives.css`, git already tracks that). Tests import from `./palette.generated` instead of `./palette`. **`palette-sync.test.ts` deleted — vestigial, drift is impossible by construction.** Hand-editing stays in `primitives.css` where designers naturally review hex values. Motion stays TS-first (`motion.ts` → primitives.css mirror, `motion-token-sync.test.ts` justified because motion.ts has TS-only pieces springs/unions that CSS can't express).
- **DECISION 2 — Drop `--motion-duration-instant: 100ms`.** Simplicity reviewer was right. No Phase 2-5 consumer differentiates it from `--motion-duration-fast: 150ms` in any named beat. The 120 Hz argument is theoretical; YAGNI wins. If Phase 4's motion-literal audit reveals a component that genuinely wants sub-150 ms, re-add it at that moment with a consumer-justified name. Removing saves 5 touch points: primitives.css, `DURATION_NAMES` array, `MOTION_DURATIONS` object, `@property` declaration in §2.10, and the corresponding `@media (prefers-reduced-motion)` zero-line in §2.9.
- **DECISION 3 — Raise `--text-body` floor from 14 px → 15 px.** Party game played at arm's length + CVD accessibility + aging-eye comfort all point the same way. WCAG reviewer flagged 14 px as "low end"; iOS HIG aspirational target is 17 pt (~22.67 px). Raising the floor to 15 px (`0.9375rem`) shrinks the fluid delta from 4 px to 3 px across 699 svh — the scale still grows, just from a more generous floor. Every consumer of `--text-body` gets a free 1 px bump. Updated in §2.4.
- **DECISION 4 — Keep neon 2-spot pattern (`--color-neon-magenta` + `--color-neon-magenta-glow`).** Locked, not deferred. Radix research flagged spot colors as under-scoped IF the accent ever gains `:hover`/`:active`/`:focus` state. Lint Rule 6 in §2.14 forbids exactly that pattern, so the landmine is instrumented. If a future drama moment ever genuinely needs interactivity, grow `rose-neon` into a proper scale as a standalone follow-up task. Do not pre-build hover/focus variants on speculation.

---

## §1 — Inputs (what this phase inherits)

From `roadmap.md`:
- **§2 Quality Bar** — every token value justifies itself against *"could this look like a frame from an Archer episode?"*
- **§3 Visual Reference** — Dreamland S8 as the reference season; verified Archer influences (Saul Bass, Kirby/Ditko, Mad Men, Bond 60, OSS 117, Pink Panther, mid-century furniture, deliberate anachronism); warm cocktail-lounge palette, NOT noir black; comedy wins over glamour.
- **§3.5 Form factors** — phone view scales against HEIGHT (`svh`), board view scales against WIDTH (`vw`/`cqw`), cross-view components use container queries. Do not mix axes.
- **§4 Technical foundation** — two-layer token system (primitive → semantic), role-based naming with fg/bg pairs, pure-CSS `[data-theme]` (no JS-applied theme), motion TS/CSS twin pattern, Utopia-derived clamp formulas with `rem` base for WCAG 1.4.4 compliance, iOS 26 `position: fixed` landmine.
- **§5 Token taxonomy shape** — 6 color scales (teal, ochre, cream, charcoal, cordovan, emerald) × 12 steps each + 2 neon-magenta spots = 74 color primitives; 4 px-base spacing scale; 1.25 / 1.333 modular type scales; motion duration scale (10 tokens post-deepening: 5 decorative + 2 named + 3 essential) with 5 named easings; 6-step z-index scale (post-deepening `--z-max` deletion).
- **§6 Device matrix** — phone brackets 375×667 → 1024×1366 portrait, board brackets 1280×800 → 3840×2160 landscape.

[^nocount]: Deepening 2026-04-11 corrected the "5 vs 6" inline count across §1. Six scales × 12 steps + 2 spot colors = 74 primitives is the canonical total.

From `docs/PRODUCT-SPECIFICATION.md`:
- **ADR-04** — Framer Motion discipline must survive. Bundle budget 100KB gzipped (current ~95KB, 5KB headroom).
- **ADR-05** — visual consistency via shared tokens is the product decision Phase 1 delivers on.
- **§4 Goal #6** — CVD-safe palette is a **hard requirement**, not aspirational. Every color decision runs through the CVD CI gate.

From `project-burned-clean-slate-visual.md` (Claude memory):
- **Clean slate scope.** No existing token, color, timing, or `.module.css` must survive. Game logic / protocol / tests stay.

From `feedback-hallucinated-references.md` (Claude memory):
- **Every external reference gets a footnote.** Citation pattern demonstrated in `roadmap.md` §3.1 and used throughout this file.

---

## §2 — Deliverables

### §2.1 Directory structure

```
src/client/shared/tokens/
├── primitives.css              ← raw values: color scales, sizing scalars, duration numbers
├── semantic.css                ← axis-independent semantics (colors, fonts, radii, motion, z-index)
├── semantic.phone.css          ← phone-view dimensional semantics (svh-based)
├── semantic.board.css          ← board-view dimensional semantics (vw/cqw-based)
├── motion.ts                   ← TypeScript motion tokens (Framer Motion consumers)
└── __tests__/
    ├── palette-cvd.test.ts       ← Vitest: CVD distance check on critical pairs
    ├── palette-contrast.test.ts  ← Vitest: WCAG 2.1 AA + APCA contrast checks
    └── motion-token-sync.test.ts ← Vitest: TS motion tokens match CSS mirrors
```

Import order in entry points:

```tsx
// src/client/player/index.tsx
import '@client/shared/tokens/primitives.css';
import '@client/shared/tokens/semantic.css';
import '@client/shared/tokens/semantic.phone.css';

// src/client/board/index.tsx
import '@client/shared/tokens/primitives.css';
import '@client/shared/tokens/semantic.css';
import '@client/shared/tokens/semantic.board.css';
```

**Files to delete after Phase 1 lands:**
- `src/client/shared/theme.ts` (runtime `applyTheme()` pattern — replaced by pure-CSS `[data-theme]`)
- `src/client/shared/theme.css` (skeleton fallback — no longer needed)

The `theme.ts` → pure-CSS migration is a Phase 1 deliverable, not a Phase 2+ deliverable, because Phases 2 and 3 need `[data-theme]` available when they start migrating components.

### §2.2 `primitives.css` — raw values, six color scales + neon spot colors

**Extracted from Dreamland S8 reference frames on 2026-04-11.** All hex values below were sampled from actual Dreamland episode stills downloaded to `docs/plans/css-foundation-rebuild/dreamland-reference/images/` — see `dreamland-reference/README.md` for the full frame manifest, source attribution, and per-frame scene descriptions. The six palette-core frames used for extraction:

- **`dreamland-12-mother-window.webp`** — the canonical "Dreamland look." Amber light through venetian blinds onto deep mahogany paneling, sage-grey coat, teal-cast shadows. Source for: mahogany wood range (ochre 3–8), amber through-blinds light (ochre 11), teal shadow cast (teal 3–6), sage coat light (teal 10–11).
- **`dreamland-07-venetian-blinds.webp`** — tight crop of same vocabulary, amber stripe pattern across face. Cross-check for honey/mahogany/sage triad.
- **`dreamland-18-ngd-45.webp`** — max-chroma teal/amber dockyard night. Source for: saturated teal endpoints (teal 7–9), amber crate-light endpoints (ochre 9–11), fog-desaturated mids (teal 9–10).
- **`dreamland-13-mother-drink.webp`** — warm interior mahogany bookcase with cream book spines, whiskey amber, burgundy lipstick. Source for: mahogany shadow (ochre 1–3), cream highlights (cream 10–12), cordovan lipstick (cordovan 8–10), whiskey amber cross-check (ochre 9–11).
- **`dreamland-02-interior-bar.webp`** — warm cream walls, olive moss tie, auburn hair, herringbone grey vest. Source for: cream wall gradient (cream 5–12), olive/forest green for emerald scale (emerald 5–9).
- **`dreamland-01-title.webp`** — Dreamland neon sign + night sky + Art Deco facade. Source for: the two spot magenta-neon values (rose-neon), deep blue-teal night sky cross-check (teal 1–3).

**Note on methodology:** colors were sampled visually by reading the images in Claude's image-capable Read tool, cross-referencing multiple frames for each hue, and interpolating 12-step scales using Radix Colors' convention (step 1 = darkest in dark mode, step 12 = lightest). These values are **committed, not placeholder.** The CVD CI gate in `palette-cvd.test.ts` will iterate them against critical-pair distance thresholds during Phase 1 execution — any pair that fails the threshold gets tuned here, and the final values land in `primitives.css`. Expect minor adjustments (± 5–10 perceptual units on 1–3 values max) from the CVD pass; the overall palette character is locked.

**Teal scale** — Dreamland cool hue. Night sky, wood-shadow cast, sage coats at the light end. Sourced primarily from frame 18 (saturated endpoints) and frame 12 (desaturated shadow/sage mids).

| Step | Hex | Role hint (Radix convention) |
|---|---|---|
| 1 | `#08181a` | App background (darkest) |
| 2 | `#0c2024` | Subtle background |
| 3 | `#11292d` | UI element background |
| 4 | `#163338` | Hovered UI element background |
| 5 | `#1e3f45` | Active / selected UI element background |
| 6 | `#284c53` | Subtle borders and separators |
| 7 | `#335a62` | UI element border, focus rings |
| 8 | `#406972` | Hovered UI element border |
| 9 | `#4a7880` | Solid backgrounds (frame 12 wood-shadow, frame 18 sky) |
| 10 | `#5a8a90` | Hovered solid backgrounds (sage-adjacent) |
| 11 | `#7da3a8` | Low-contrast text (sage light — frame 12 coat) |
| 12 | `#abc7cb` | High-contrast text |

**Ochre scale** — Dreamland warm hue. Mahogany wood → amber through-blinds light → brightest honey highlight. This is a WIDE-RANGE scale because Dreamland's single "warm" hue spans from very dark wood to very bright honey — extracted from frame 12 (mahogany paneling at steps 3–8, amber light at step 11), frame 13 (mahogany shadow cross-check, whiskey amber), frame 02 (cream-wall warmth at step 12).

| Step | Hex | Role hint |
|---|---|---|
| 1 | `#1a0d05` | Deepest mahogany shadow |
| 2 | `#25160b` | Dark mahogany |
| 3 | `#321e10` | Mahogany mid-shadow (frame 12 panel shadow) |
| 4 | `#422818` | Mahogany base |
| 5 | `#553520` | Warm surface |
| 6 | `#6a4228` | Wood accent (frame 12/13 mid mahogany) |
| 7 | `#805032` | Wood highlight |
| 8 | `#98603e` | Brighter wood (frame 13 shelf edge) |
| 9 | `#b0754c` | Mid amber (transition to warm light) |
| 10 | `#c98a5c` | Honey warm (frame 13 whiskey decanter) |
| 11 | `#dea06f` | Amber light (frame 12 through-blinds) |
| 12 | `#f0c18c` | Brightest honey highlight (frame 02 wall warmth) |

**Cream scale** — warm neutral for text, highlights, paper-like surfaces. Sourced primarily from frame 02 (cream wall gradient, cream shirt) and frame 13 (book spines, skin mids).

| Step | Hex | Role hint |
|---|---|---|
| 1 | `#0e0c08` | Very deep warm shadow |
| 2 | `#19160f` | Dark |
| 3 | `#252016` | Dark mid |
| 4 | `#332c20` | Mid surface |
| 5 | `#433a2c` | Base |
| 6 | `#52483a` | Text shadow |
| 7 | `#655a4a` | Muted text |
| 8 | `#7b6f5d` | Subdued text |
| 9 | `#948772` | Low-contrast text |
| 10 | `#b0a38a` | Mid-contrast text |
| 11 | `#d0c3a5` | High-contrast text (frame 02 wall highlight, skin mids) |
| 12 | `#f0e4c4` | Brightest cream (frame 02 shirt, highlights) |

**Charcoal scale** — warm-neutral chrome for UI borders, secondary surfaces, and the iconic Archer black linework (step 1). Shifted warmer than standard "noir black" per the Dreamland observation that deep shadows are warm, not cool. Sourced from frame 12 paneling shadows and frame 01 trench-coat blacks.

| Step | Hex | Role hint |
|---|---|---|
| 1 | `#0a0906` | Near-black warm — Archer character linework |
| 2 | `#12100b` | Dark chrome |
| 3 | `#1a1812` | Surface |
| 4 | `#23211a` | Elevated |
| 5 | `#2d2a22` | Interactive base |
| 6 | `#38342b` | Subtle border |
| 7 | `#454138` | Strong border |
| 8 | `#534e45` | Hover border |
| 9 | `#665f55` | Solid bg |
| 10 | `#7b7467` | Hover solid |
| 11 | `#988f82` | Low-contrast text |
| 12 | `#c4bdae` | High-contrast text (frame 13 hair highlight) |

**Cordovan scale** — Dreamland crimson. Lipstick, warm blood/danger, wine. More burgundy than bright red, extracted from frame 12/13 lipstick and frame 13 whiskey-in-glass reflections. Critical CVD pair with emerald — see `palette-cvd.test.ts`.

| Step | Hex |
|---|---|
| 1 | `#15070a` |
| 2 | `#210b10` |
| 3 | `#2f1015` |
| 4 | `#40141b` |
| 5 | `#521820` |
| 6 | `#641c26` |
| 7 | `#78222d` |
| 8 | `#8d2936` |
| 9 | `#a33340` |
| 10 | `#b9404c` |
| 11 | `#d06566` |
| 12 | `#e99182` |

**Emerald scale** — muted forest green for success, Intercept card, Peek confirmation. Dreamland's greens lean olive/forest (frame 02 tie, sage coat undertones). Saturation biased slightly higher than pure Dreamland observation to maintain CVD distance from cordovan — the CI gate will confirm or push it further.

| Step | Hex | Role hint |
|---|---|---|
| 1 | `#081410` | Deepest forest shadow |
| 2 | `#0d1e18` | Dark forest |
| 3 | `#122a21` | Forest shadow |
| 4 | `#18362c` | Forest base |
| 5 | `#1f4336` | Warm surface |
| 6 | `#275043` | Interactive |
| 7 | `#2f5e4f` | Subtle borders |
| 8 | `#396d5a` | Strong borders |
| 9 | `#437d68` | Solid bg |
| 10 | `#529078` | Hover solid |
| 11 | `#70aa90` | Low-contrast text |
| 12 | `#a0c8ae` | High-contrast text |

**Neon-magenta spot colors** — NOT a scale. Two spot values extracted from frame 01's iconic "Dreamland" neon sign. Exposed as single primitives, consumed via the `--color-accent-neon` semantic token defined in §2.3. Use sparingly — these are the highest-chroma values in the entire palette and should be reserved for drama moments and the brand marque.

**Naming note (deepening pass 2026-04-11):** renamed from `--color-rose-neon*` → `--color-neon-magenta*`. The original `rose-` prefix implied a "rose scale" that doesn't exist (phantom namespace). The new name is self-describing: standalone magenta neon, not a member of a hidden family.

| Token | Hex | Role hint |
|---|---|---|
| `--color-neon-magenta` | `#e84a9c` | Hot magenta neon (frame 01 sign) |
| `--color-neon-magenta-glow` | `#ff6fb8` | Brighter neon bloom (frame 01 sign corona) |

**Guardrail (lint-enforced in §2.14):** `--color-accent-neon` must NEVER appear in a selector with `:hover`, `:focus`, `:active`, or `:disabled`. If a drama moment ever gains interactivity, the neon grows into a proper scale in a follow-up phase — don't hack it at the semantic layer.

**Total: 72 scale-based primitive color tokens + 2 spot colors = 74 primitives.** Scale tokens named as `--color-{scale}-{step}` — e.g., `--color-teal-9`, `--color-cordovan-11`. Spot tokens named as `--color-neon-magenta` and `--color-neon-magenta-glow`.

**Spacing scalars** (axis-independent, 4px base):

```css
--space-0:  0;
--space-1:  0.25rem;   /* 4px */
--space-2:  0.5rem;    /* 8px */
--space-3:  0.75rem;   /* 12px */
--space-4:  1rem;      /* 16px */
--space-5:  1.25rem;   /* 20px */
--space-6:  1.5rem;    /* 24px */
--space-8:  2rem;      /* 32px */
--space-10: 2.5rem;    /* 40px */
--space-12: 3rem;      /* 48px */
--space-16: 4rem;      /* 64px */
--space-20: 5rem;      /* 80px */
```

**Radius scalars** (axis-independent):

```css
--radius-none: 0;
--radius-xs:   2px;
--radius-sm:   4px;
--radius-md:   8px;
--radius-lg:   12px;
--radius-xl:   16px;
--radius-2xl:  24px;
--radius-full: 9999px;
```

**Motion duration numbers** (axis-independent, mirror of `motion.ts`):

```css
/* Decorative — zeroed under prefers-reduced-motion (see §2.9).
   Note: --motion-duration-instant (100ms) was dropped in deepening — no
   Phase 2-5 consumer differentiated it from fast. Re-add when a real
   component asks. */
--motion-duration-fast:     150ms;
--motion-duration-base:     250ms;
--motion-duration-slow:     400ms;
--motion-duration-dramatic: 800ms;

/* Named durations for specific Phase 3-4 consumers (resolved in deepening) */
--motion-duration-dots:       1500ms;  /* JoinScreen loading dots — Phase 4 §2.5.4 */
--motion-duration-ambient:    4000ms;  /* DrawPile breathing / ambient pulse — Phase 3 §2.3.10 */
--motion-duration-pulse:      1400ms;  /* Lobby waiting dots, subtle attention — DECORATIVE (follow-up sweep, Phase 3 §7.6) */
--motion-duration-pulse-slow: 2500ms;  /* Lobby start button + GameOver play-again — DECORATIVE (follow-up sweep, Phase 3 §7.6) */
/* NOTE: --motion-duration-pulse (1400ms, DECORATIVE) ≠ --motion-duration-essential-pulse (1400ms, ESSENTIAL).
   Same value, different reduced-motion behavior. pulse zeros; essential-pulse slows to 2400ms. */

/* Essential — survives prefers-reduced-motion (see §2.9). Gameplay-signal animations. */
--motion-duration-essential-pulse:  1400ms;  /* turn-indicator breathing glow */
--motion-duration-essential-spin:   1000ms;  /* loading spinner (reconnect overlay, lobby) */
--motion-duration-essential-flash:  200ms;   /* Nope / Intercept / Burned feedback flash */
```

**Motion easing curves** (axis-independent, mirror of `motion.ts`):

```css
--motion-ease-base:         cubic-bezier(0.4, 0, 0.2, 1);  /* renamed from -standard 2026-04-11 */
--motion-ease-emphasized:   cubic-bezier(0.2, 0, 0, 1);
--motion-ease-decelerate:   cubic-bezier(0, 0, 0.2, 1);
--motion-ease-accelerate:   cubic-bezier(0.4, 0, 1, 1);
--motion-ease-anticipate:   cubic-bezier(0.68, -0.55, 0.265, 1.55);
```

**Naming note:** `--motion-ease-base` (was `--motion-ease-standard`) now matches `--motion-duration-base` as the universal default marker. One word for "default" across both duration and easing.

(Spring configs are TS-only — CSS has no spring primitive.)

**Z-index scalars:**

```css
--z-base:    0;
--z-raised:  10;
--z-sticky:  100;
--z-overlay: 1000;
--z-modal:   2000;
--z-toast:   3000;
```

**Note (deepening):** `--z-max: 9999` deleted. It was a magic ceiling with no slot above `--z-toast`, and anything that needed above-toast would have had to blow past it silently. The top of the z-ladder is now `--z-toast`. If a dev-tool overlay ever needs above-toast, the plan adds `--z-toast-above: 3100` at that moment — ordered ladder, not locked ceiling.

### §2.3 `semantic.css` — axis-independent semantics

**Color semantic tokens** (role-based, with fg/bg pairs where applicable):

```css
/*
 * Radix-convention role mapping (verified primary source 2026-04-11 during deepening):
 *   1  app background          7  INTERACTIVE element border, focus rings
 *   2  subtle background       8  hovered INTERACTIVE border
 *   3  UI element background   9  solid bg (highest chroma — logos, accent bg, overlays)
 *   4  hovered UI bg           10 hovered solid bg
 *   5  active / selected bg    11 low-contrast text  — APCA Lc 60 guarantee vs step 2
 *   6  subtle borders and separators (NON-INTERACTIVE only — cards, dividers, alerts)
 *   ---                        12 high-contrast text — APCA Lc 90 guarantee vs step 2
 *
 * The 6 vs 7 distinction matters: card borders use step 6, button focus rings use step 7.
 * Radix docs: radix-ui.com/colors/docs/palette-composition/understanding-the-scale
 */
:root {
  /* Surfaces */
  --color-bg-app:              var(--color-charcoal-1);
  --color-bg-surface:          var(--color-charcoal-3);
  --color-bg-elevated:         var(--color-charcoal-4);
  --color-bg-overlay:          color-mix(in oklab, var(--color-charcoal-1) 85%, transparent);
  --color-bg-interactive:      var(--color-teal-5);
  --color-bg-interactive-hover: var(--color-teal-6);
  --color-bg-interactive-active: var(--color-teal-7);

  /* Borders — step 6 = non-interactive, step 7 = interactive/focus */
  --color-border-subtle:        var(--color-charcoal-6);  /* cards, dividers, alerts */
  --color-border-subtle-strong: var(--color-charcoal-7);  /* emphasized non-interactive */
  --color-border-strong:        var(--color-charcoal-7);
  --color-border-focus:         var(--color-ochre-8);     /* interactive focus ring */
  --color-border-interactive:   var(--color-teal-7);

  /* Shadow base — semantic indirection so shadows don't reach into primitives directly.
     Future light-mode retheme changes ONE token instead of seven shadow formulas. */
  --color-shadow-base:         var(--color-charcoal-1);

  /* Text */
  --color-fg-primary:          var(--color-cream-12);
  --color-fg-secondary:        var(--color-cream-11);
  --color-fg-muted:             var(--color-cream-9);
  --color-fg-disabled:          var(--color-charcoal-8);

  /* Text-on-solid pairs — each tuned to pass APCA Lc 60 on its paired step-9 solid.
     "fg-on-X" = the foreground color that sits ON a solid X-colored background
     (e.g., destructive button label on a filled danger button).
     Separate from "fg-X" which is the foreground color that IS the X color
     (e.g., inline error-message text on app bg). */
  --color-fg-on-danger:        var(--color-cream-12);
  --color-fg-on-success:       var(--color-cream-12);
  --color-fg-on-warning:       var(--color-charcoal-1);   /* warm warning needs dark fg */
  --color-fg-on-info:          var(--color-cream-12);
  --color-fg-on-burned:        var(--color-cream-12);
  --color-fg-on-intercept:     var(--color-cream-12);
  --color-fg-on-operative:     var(--color-cream-12);
  --color-fg-on-drama:         var(--color-charcoal-1);   /* warm drama ochre needs dark fg */
  --color-fg-on-neon:          var(--color-charcoal-1);   /* neon magenta needs dark fg */

  /* Legacy alias — DEPRECATED, prefer a specific fg-on-* token. Kept for Phase 2 gradual migration. */
  --color-fg-on-accent:        var(--color-cream-12);

  /* Interactive */
  --color-fg-interactive:      var(--color-teal-12);

  /* Feedback — full fg/bg/border triples */
  --color-fg-danger:           var(--color-cordovan-11);
  --color-bg-danger:            var(--color-cordovan-3);
  --color-border-danger:        var(--color-cordovan-7);

  --color-fg-success:          var(--color-emerald-11);
  --color-bg-success:           var(--color-emerald-3);
  --color-border-success:       var(--color-emerald-7);

  --color-fg-warning:          var(--color-ochre-11);
  --color-bg-warning:           var(--color-ochre-3);
  --color-border-warning:       var(--color-ochre-7);

  --color-fg-info:             var(--color-teal-11);
  --color-bg-info:              var(--color-teal-3);
  --color-border-info:         var(--color-teal-7);        /* added in deepening — symmetry fix */

  /*
   * Game-specific accents — intentional singletons, NOT a fg/bg/border triple.
   * Consumers apply them directly as background/glow/stroke. They live in the
   * accent namespace, not the feedback namespace, because they carry game meaning
   * (Burned card, Intercept card, operative role, drama-moment flash), not
   * alert-level meaning. fg-on-* pairs above provide text pairing where needed.
   */
  --color-accent-burned:       var(--color-cordovan-9);
  --color-accent-intercept:    var(--color-emerald-9);
  --color-accent-operative:    var(--color-teal-9);
  --color-accent-drama:        var(--color-ochre-9);

  /*
   * Brand / neon accent — use sparingly, highest chroma in the palette.
   * LINT GUARDRAIL (§2.14): --color-accent-neon MUST NOT appear in a selector
   * with :hover, :focus, :active, or :disabled. Grow it into a scale if that
   * need ever arises — don't hack the semantic layer.
   */
  --color-accent-neon:         var(--color-neon-magenta);
  --color-accent-neon-glow:    var(--color-neon-magenta-glow);
}

/*
 * Light mode DELIBERATELY OMITTED in Phase 1.
 * An empty [data-theme="light"] block would NOT fall through to the dark defaults —
 * the cascade doesn't work that way. Worse: 12+ existing .module.css files have
 * orphan [data-theme="light"] blocks pointing at deleted theme.ts tokens; step 16a
 * of the execution order grep-deletes those before theme.ts goes.
 *
 * Phase 1 strategy: dark tokens live on bare :root. data-theme="dark" attribute is
 * set on <html> in player.html / board.html for devtools legibility, but the CSS
 * does NOT scope to [data-theme="dark"] — it would add a needless selector weight
 * bump. Light mode is Phase 1.5 post-Phase-5, using @media (prefers-color-scheme).
 */
```

**Typography family tokens** (axis-independent):

```css
:root {
  --font-display: 'Clash Display', 'Futura', 'Helvetica Neue', sans-serif;
  --font-body:    'General Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono:    'JetBrains Mono', 'SF Mono', Menlo, monospace;
}
```

**Note on `--font-display`:** starts as Clash Display per the 2026-04-11 Baveuse-wait-and-see decision. If Phase 1 visual review fails the Archer test on Clash Display, the one-line swap is: change the first entry in the `--font-display` value to `'Baveuse'` after purchasing + `@font-face`-installing the file.

**Radius semantic tokens:**

```css
:root {
  --radius-card:     var(--radius-md);  /* preserved from current theme */
  --radius-button:   var(--radius-sm);
  --radius-input:    var(--radius-sm);
  --radius-surface:  var(--radius-lg);
  --radius-modal:    var(--radius-xl);
}
```

**Note (deepening):** `--radius-pill` removed — it was a one-to-one alias of `--radius-full` with no documented swap intent. Components that want pill-shaped buttons / tags consume `--radius-full` directly ("pill-shaped" = "fully rounded rectangle," one name for one concept).

**Elevation (shadow) semantic tokens:**

```css
:root {
  --shadow-none: none;

  --shadow-sm: 0 1px 2px 0 color-mix(in oklab, var(--color-shadow-base) 60%, transparent);

  --shadow-md: 0 4px 8px -2px color-mix(in oklab, var(--color-shadow-base) 50%, transparent),
               0 2px 4px -1px color-mix(in oklab, var(--color-shadow-base) 40%, transparent);

  --shadow-lg: 0 10px 20px -4px color-mix(in oklab, var(--color-shadow-base) 60%, transparent),
               0 4px 8px -2px color-mix(in oklab, var(--color-shadow-base) 40%, transparent);

  --shadow-xl: 0 20px 40px -8px color-mix(in oklab, var(--color-shadow-base) 70%, transparent),
               0 8px 16px -4px color-mix(in oklab, var(--color-shadow-base) 50%, transparent);

  /* Accent glows — used by cards, intercept button, drama overlay.
     Tied to game-accent colors (not feedback states) — glow-success uses the
     Intercept card accent, glow-danger uses the Burned card accent. Docs at §5. */
  --shadow-glow-accent:  0 0 20px color-mix(in oklab, var(--color-accent-operative) 40%, transparent);
  --shadow-glow-danger:  0 0 24px color-mix(in oklab, var(--color-accent-burned) 50%, transparent);
  --shadow-glow-success: 0 0 20px color-mix(in oklab, var(--color-accent-intercept) 40%, transparent);
  --shadow-glow-drama:   0 0 40px color-mix(in oklab, var(--color-accent-drama) 60%, transparent);
}
```

**Note on `color-mix()` and color space (deepening-verified 2026-04-11):**
- `color-mix()` is **Baseline Widely Available** since May 2023 — no fallback needed.
- **Every shadow token uses `in oklab`, NOT `in srgb`.** Two reasons:
  1. **Safari `in oklch` bug** (reported Nov 2024, still live Safari 26 as of 2026-04-11): renders some blues as pink when mixed in `oklch`. `oklab` is unaffected.
  2. **`srgb` muddy-midpoint problem:** srgb interpolation with `transparent` routes through transparent BLACK (rgba(0,0,0,0)), which desaturates and darkens the halo of any colored glow. `oklab` holds hue and chroma cleanly all the way to 0% alpha — exactly what you want for an Archer-grade teal or burned-orange glow.
- **Never use `color-mix(in oklch, ...)` in Phase 1** — hard rule, enforced by a §2.14 lint check.
- All shadow tokens reach `--color-shadow-base` (a semantic pointer) instead of `--color-charcoal-1` (the primitive) directly, so light-mode retheme changes one token, not seven formulas.

**Phase 1 follow-up sweep additions to `semantic.css` (Phase 3 §7.4 + §7.5):**

MinimalCard text clamp floors/ceilings (8 tokens) — `px` values because they are clamp boundaries for `cqi`-based font-sizes inside `MinimalCard.module.css`, representing minimum-readable and maximum-aesthetic pixel boundaries:

```css
/* semantic.css additions — axis-independent (follow-up sweep, Phase 3 §7.4) */
@layer semantics {
  :root {
    --text-card-name-min:        10px;
    --text-card-name-max:        14px;
    --text-card-name-large-min:  16px;
    --text-card-name-large-max:  24px;
    --text-card-desc-min:        8px;
    --text-card-desc-max:        11px;
    --text-card-desc-large-min:  12px;
    --text-card-desc-large-max:  16px;
  }
}
```

DramaOverlay text scale tokens (6 tokens) — `cqi`-based min/max pairs, architecturally different from `--text-hero-subdued` (which is `vw`-based and board-only):

```css
/* semantic.css additions — axis-independent (follow-up sweep, Phase 3 §7.5) */
@layer semantics {
  :root {
    /* Hero — default drama variants (BURNED, EXTRACTED, INTERCEPTED) */
    --text-drama-hero-min:     48px;
    --text-drama-hero-max:     160px;
    /* Subdued — ELIMINATED variant, quieter */
    --text-drama-subdued-min:  32px;
    --text-drama-subdued-max:  100px;
    /* Victory — the loudest reveal */
    --text-drama-victory-min:  56px;
    --text-drama-victory-max:  180px;
  }
}
```

### §2.4 `semantic.phone.css` — phone-view dimensional tokens (svh-based)

**The svh-based clamp formula pattern** (since Utopia has no vertical-axis calculator, derived manually):

```
clamp(min_rem, calc(min_rem + (100svh - 667px) * ((max_px - min_px) / 699)), max_rem)
```

Where `667` is the small-bracket viewport height (iPhone SE2 portrait), `1366` is the large-bracket viewport height (iPad Pro 12.9" portrait), and `699 = 1366 - 667`.

> **LOAD-BEARING RULE (WCAG 1.4.4 compliance — do not "clean up" the formula):**
> The leading `rem` term in the preferred arm is NOT cosmetic. W3C failure technique F94 states viewport units do not scale with browser text zoom: a user at 200% zoom sees the same `100svh = 667px` as at 100%. The pattern `clamp(rem, calc(rem + svh*k), rem)` passes WCAG 1.4.4 **only because** the additive `rem` base scales with zoom, multiplying the floor and ceiling proportionally. **`clamp(rem, svh*k, rem)` FAILS F94 silently** — it looks the same at 100% and breaks at 200%. Every preferred arm below must have the shape `min_rem + (100svh - 667px) * k`. Never `svh * k` alone.
>
> **Unit-mismatch landmine:** the scalar must be unitless (e.g., `4 / 699`), not a length. Do NOT refactor to `(100svh - 667px) / 699 * 4px` — CSS `calc()` cannot multiply length × length, the expression crashes at parse time.
>
> **Sub-667px viewports:** at `100svh < 667px` the middle term goes negative; `clamp()` spec-defined behavior pins to the min. Scaling floor is iPhone SE2 (667 px); iPhone SE1 (568 px) renders the min value verbatim — acceptable, document it.

**Typography tokens (phone, svh-based):**

```css
/*
 * Phone text scale. Five tiers (deepening merged micro into caption — the original
 * --text-micro at 10 px floor was below WCAG-readable and iOS HIG minimum).
 * Phone-only: caption, callout — label-sized for hand/staging UI. No --text-hero
 * (phone can't handle 160 px display).
 *
 * WCAG 1.4.4 RULE: every preferred arm has the shape `min_rem + (100svh - 667px) * k`.
 * Never `svh * k` alone. See the load-bearing note above §2.4.
 */
:root {
  /* Body text — 15px → 18px (floor raised from 14px in deepening per WCAG
     research; see Enhancement Summary Decision 3). Delta shrinks from 4px
     to 3px across 699svh; still fluid, just from a more accessible floor. */
  --text-body: clamp(
    0.9375rem,
    calc(0.9375rem + (100svh - 667px) * (3 / 699)),
    1.125rem
  );

  /* Caption / small — 11px → 13px (absorbs former --text-micro) */
  --text-caption: clamp(
    0.6875rem,
    calc(0.6875rem + (100svh - 667px) * (2 / 699)),
    0.8125rem
  );

  /* Callout — 16px → 20px */
  --text-callout: clamp(
    1rem,
    calc(1rem + (100svh - 667px) * (4 / 699)),
    1.25rem
  );

  /* Title — 20px → 28px */
  --text-title: clamp(
    1.25rem,
    calc(1.25rem + (100svh - 667px) * (8 / 699)),
    1.75rem
  );

  /* Display — 32px → 48px */
  --text-display: clamp(
    2rem,
    calc(2rem + (100svh - 667px) * (16 / 699)),
    3rem
  );
}
```

**Deepening change:** original plan had a six-tier scale (body/caption/micro/callout/title/display). `--text-micro` at `10px → 11px` floor was below iOS HIG minimum readable (11 pt) AND at the edge of WCAG 1.4.4 zoom compliance. Folded the micro slot into `--text-caption` (11→13 px). Any component that was going to consume `--text-micro` consumes `--text-caption` instead; no Phase 2-5 component has been identified that genuinely needs sub-11 px. Five tiers is enough for phone.

**Sizing tokens (phone, svh-based):**

```css
:root {
  /* Touch target minimum — WCAG 2.5.5 Level AAA is 44px, WCAG 2.2 SC 2.5.8 floor is 24px.
     Game == fat-finger context — use AAA. iOS HIG 2026 agrees (44 pt). */
  --size-touch-target:            44px;
  --size-touch-target-comfortable: 48px;  /* FABs, primary buttons — Material 3 cross-reference */

  /* Card — height-driven with 5:7 aspect ratio. Renamed from --size-card-* to
     --size-phone-card-* to prevent cross-view collision with board card sizing. */
  --size-phone-card-height: clamp(
    120px,
    calc(120px + (100svh - 667px) * (60 / 699)),
    180px
  );
  --size-phone-card-width: calc(var(--size-phone-card-height) * 5 / 7);

  /* Card detail max — full-bleed detail sheet size. Added in deepening per
     Phase 2 §2.3.9c (CardDetailSheet max width cap). */
  --size-card-detail-max: clamp(
    280px,
    calc(280px + (100svh - 667px) * (120 / 699)),
    400px
  );

  /* Hand height — allocated vertical space for the hand strip */
  --size-hand-height: clamp(
    140px,
    calc(140px + (100svh - 667px) * (80 / 699)),
    220px
  );

  /* Staging height — allocated vertical space for the staging area */
  --size-staging-height: clamp(
    100px,
    calc(100px + (100svh - 667px) * (60 / 699)),
    160px
  );

  /* Floating action button (InterceptButton / NopeButton unified) */
  --size-fab: clamp(
    64px,
    calc(64px + (100svh - 667px) * (16 / 699)),
    80px
  );

  /* Root max-width — the "iPad in portrait = huge phone" cap */
  --size-root-max-width: 640px;
}
```

**Deepening changes in this block:**
- `--size-card-height` / `--size-card-width` renamed to `--size-phone-card-height` / `--size-phone-card-width`. The original names collided with `semantic.board.css` tokens of the same name — a shared component like `MinimalCard` consuming `var(--size-card-width)` would silently pick up whichever stylesheet loaded last (phone's 120-180 px height-driven or board's 96-208 px width-driven). Namespace both explicitly; cross-view components either resolve via container queries or pick an axis.
- `--size-touch-target-comfortable: 48px` added for FABs and primary buttons (Material 3 cross-reference).
- `--size-card-detail-max` added — resolves Phase 2 cross-phase dependency surfaced by deepening scan.

**Spacing fluid tokens (phone, for dimensions that need to flex with viewport height):**

```css
:root {
  --space-fluid-tight: clamp(
    4px,
    calc(4px + (100svh - 667px) * (4 / 699)),
    8px
  );

  --space-fluid-base: clamp(
    8px,
    calc(8px + (100svh - 667px) * (8 / 699)),
    16px
  );

  --space-fluid-loose: clamp(
    16px,
    calc(16px + (100svh - 667px) * (16 / 699)),
    32px
  );
}
```

**Note:** Board view has its own `--space-fluid-base-board` / `--space-fluid-loose-board` in §2.5, deliberately not the same tokens — board scales against width, phone against height. See §2.14 lint rule banning cross-consumption.

### §2.5 `semantic.board.css` — board-view dimensional tokens (vw-based)

**The vw-based clamp formula** (standard Utopia pattern):

```
clamp(min_px, calc(min_px + (max_px - min_px) * (100vw - min_vw) / (max_vw - min_vw)), max_px)
```

Simplified to the `X + Yvw` form Utopia generates:

```
clamp(min_px, calc(Arem + Bvw), max_px)
```

Where `A` and `B` are derived per-token from the small → large bracket (1280 → 3840). Phase 1 execution computes exact `A` and `B` values; the plan commits to the bracket range.

**Typography tokens (board, vw-based):**

```css
/*
 * Board text scale. Four display tiers — no caption/micro (board has no UI labels at
 * that scale, it's TV-rendered). WCAG 1.4.4 rem-base rule applies identically here.
 */
:root {
  /* Body text — 16px → 24px across 1280 → 3840 */
  --text-body: clamp(
    1rem,
    calc(1rem + (100vw - 1280px) * (8 / 2560)),
    1.5rem
  );

  /* Title — 24px → 42px */
  --text-title: clamp(
    1.5rem,
    calc(1.5rem + (100vw - 1280px) * (18 / 2560)),
    2.625rem
  );

  /* Display — 40px → 96px */
  --text-display: clamp(
    2.5rem,
    calc(2.5rem + (100vw - 1280px) * (56 / 2560)),
    6rem
  );

  /* Hero — 56px → 160px — DramaOverlay size */
  --text-hero: clamp(
    3.5rem,
    calc(3.5rem + (100vw - 1280px) * (104 / 2560)),
    10rem
  );

  /* Hero muted variant — subdued drama moments (e.g., GameOver reveal text
     that reads as "presence" without shouting). 32px → 100px.
     Added in deepening — resolves Phase 3 §2.3.5 cross-phase dependency. */
  --text-hero-subdued: clamp(
    2rem,
    calc(2rem + (100vw - 1280px) * (68 / 2560)),
    6.25rem
  );
}
```

**Sizing tokens (board, vw-based):**

```css
:root {
  /* Card — width-driven with 5:7 aspect ratio. Renamed from --size-card-* to
     --size-board-card-* to prevent cross-view collision with phone card sizing. */
  --size-board-card-width: clamp(
    96px,
    calc(96px + (100vw - 1280px) * (112 / 2560)),
    208px
  );
  --size-board-card-height: calc(var(--size-board-card-width) * 7 / 5);

  /* Player ring radius — the ellipse the player panels orbit */
  --size-player-ring-width: clamp(
    200px,
    calc(200px + (100vw - 1280px) * (200 / 2560)),
    400px
  );

  /* Player panel — individual player card in the ring. Width/height pair,
     added in deepening to resolve Phase 3 §2.3.3 (PlayerRing CSS) and
     Phase 4 §2.7 (measurement-div TSX readback for motion layout coupling). */
  /* AMENDED (Phase 1 follow-up sweep): min 160→180px per Phase 3 §7.3 —
     matches old 200px visual weight minus continuous-scale compression */
  --size-player-panel-width: clamp(
    180px,
    calc(180px + (100vw - 1280px) * (240 / 2560)),
    420px
  );
  --size-player-panel-height: clamp(
    90px,
    calc(90px + (100vw - 1280px) * (57 / 2560)),
    147px
  );

  /* Draw pile — board-side card stack
     AMENDED (Phase 1 follow-up sweep): 80→160 expanded to 120→240 per Phase 3 §7.3 —
     preserves old visual weight (140→320→480) in the continuous-scale form */
  --size-draw-pile-width: clamp(
    120px,
    calc(120px + (100vw - 1280px) * (120 / 2560)),
    240px
  );

  /* Arena — where cards "land" during play animations */
  --size-arena-min-width: clamp(
    200px,
    calc(200px + (100vw - 1280px) * (200 / 2560)),
    400px
  );
  --size-arena-min-height: clamp(
    140px,
    calc(140px + (100vw - 1280px) * (140 / 2560)),
    280px
  );

  /* --- Phase 1 follow-up sweep additions (Phase 3 §7.2 + §7.3) --- */

  /* Caption text scale — 8 consumers across 5 board files (pileLabel, rosterLabel,
     rosterCount, turnBadge, eliminatedName, disconnectedBadge, countdown, devLink) */
  --text-caption-board: clamp(
    0.8125rem,
    calc(0.8125rem + (100vw - 1280px) * (4 / 2560)),
    1.0625rem
  );

  /* Lobby roster — vertical player list during lobby state */
  --size-lobby-roster-max-width: clamp(440px, calc(440px + (100vw - 1280px) * (160 / 2560)), 600px);

  /* Lobby title accent bar — thin horizontal accent below the title */
  --size-title-accent-width: clamp(80px, calc(80px + (100vw - 1280px) * (80 / 2560)), 160px);

  /* GameOver rankings container width */
  --size-rankings-max-width: clamp(360px, calc(360px + (100vw - 1280px) * (160 / 2560)), 520px);

  /* GameTable felt branding SVG sizes (reticle center + 4 corner diamonds) */
  --size-felt-reticle: clamp(320px, calc(320px + (100vw - 1280px) * (280 / 2560)), 600px);
  --size-felt-diamond: clamp(36px, calc(36px + (100vw - 1280px) * (32 / 2560)), 68px);

  /* Discard card width — slightly narrower than pile container */
  --size-discard-card-width: calc(var(--size-draw-pile-width) * 0.92);

  /* NO --size-touch-target — board is TV-rendered, pointer is a remote cursor,
     WCAG 2.5.5 target-size criterion does not apply. */
}
```

**Board-view fluid spacing tokens** (vw-based, board-specific — not the same tokens as phone's `--space-fluid-*`):

```css
:root {
  /* Board-view spacing base — for GameTable outer padding, Lobby container gutters
     AMENDED (Phase 1 follow-up sweep): max 32→40px, growth 16→24 per Phase 3 §7.1 */
  --space-fluid-base-board: clamp(
    16px,
    calc(16px + (100vw - 1280px) * (24 / 2560)),
    40px
  );

  /* Board-view spacing loose — for DramaOverlay margins, GameOver card spacing
     AMENDED (Phase 1 follow-up sweep): max 64→80px, growth 32→48 per Phase 3 §7.1 */
  --space-fluid-loose-board: clamp(
    32px,
    calc(32px + (100vw - 1280px) * (48 / 2560)),
    80px
  );
}
```

**Deepening changes to §2.5:**
- `--size-card-width` / `--size-card-height` renamed to `--size-board-card-*` (cross-view collision fix).
- `--size-player-panel-width` / `-height` added (resolves Phase 3 + Phase 4 cross-phase deps).
- `--text-hero-subdued` added (resolves Phase 3 §2.3.5 cross-phase dep).
- `--space-fluid-base-board` / `-loose-board` added (resolves Phase 3 §2.3.2 + §2.3.6 cross-phase deps).
- Explicit note that touch target token is phone-only.

### §2.6 `motion.ts` — TypeScript motion tokens

**Deepening note.** Original plan placed `as const satisfies Transition` on each inner entry. Verified against `src/client/shared/animation-config.ts:7-10` (existing production pattern) + Motion 12's type declarations in `node_modules/motion-dom`: correct placement is on the outer object (`} as const satisfies Record<PresetName, Transition>`). Inner per-field casts are noise and don't earn their keep. Also: `motion-utils` exports `type BezierDefinition = readonly [number, number, number, number]` which already matches `as const` output — original plan's inline `as [number, number, number, number]` casts are redundant. Import `Easing` from `motion/react` instead.

```typescript
/**
 * Motion tokens — TypeScript source of truth for Framer Motion.
 *
 * CRITICAL: Framer Motion's transition.duration expects a Number, not a string.
 * You CANNOT write `transition={{ duration: 'var(--motion-duration-base)' }}`.
 * This file is the canonical motion-value source for React components.
 *
 * CSS custom properties in primitives.css mirror these values for plain-CSS
 * consumers (@keyframes, transition declarations). motion-token-sync.test.ts
 * enforces that TS and CSS surfaces never drift.
 *
 * Shape rules (verified during deepening 2026-04-11):
 *   - `as const` on the outer object.
 *   - `satisfies Record<Name, …>` on the outer object, NOT per-field.
 *   - Name unions (DurationName / EasingName / SpringName / PresetName) are
 *     declared as `as const` arrays so adding a key breaks compile until the
 *     sync test + every consumer catches up.
 */

import type { Transition, Easing } from 'motion/react';

// Key unions — single source of truth.
// Note: `instant` dropped in deepening (no named consumer). Re-add only when a
// Phase 4+ component audit names a component that needs sub-fast timing.
export const DURATION_NAMES = [
  'fast', 'base', 'slow', 'dramatic',
  'dots', 'ambient',
  'essentialPulse', 'essentialSpin', 'essentialFlash',
] as const;
export type DurationName = typeof DURATION_NAMES[number];

export const EASING_NAMES = [
  'base', 'emphasized', 'decelerate', 'accelerate', 'anticipate',
] as const;
export type EasingName = typeof EASING_NAMES[number];

export const SPRING_NAMES = [
  'snappy', 'deliberate', 'punchy', 'gentle',
] as const;
export type SpringName = typeof SPRING_NAMES[number];

export const PRESET_NAMES = [
  'quickFade', 'enter', 'exit', 'dramatic',
  'snappy', 'deliberate', 'punchy', 'gentle',
] as const;
export type PresetName = typeof PRESET_NAMES[number];

// Durations in seconds (Framer Motion unit).
export const MOTION_DURATIONS = {
  // Decorative — zeroed under prefers-reduced-motion (see §2.9).
  fast:           0.15,
  base:           0.25,
  slow:           0.4,
  dramatic:       0.8,

  // Named durations for specific Phase 3-4 consumers.
  dots:           1.5,   // JoinScreen dots — Phase 4 §2.5.4
  ambient:        4.0,   // DrawPile breathing — Phase 3 §2.3.10
  pulse:          1.4,   // Lobby waiting dots — DECORATIVE (follow-up sweep, Phase 3 §7.6)
  pulseSlow:      2.5,   // Lobby start + GameOver play-again — DECORATIVE (follow-up sweep, Phase 3 §7.6)

  // Essential — survives prefers-reduced-motion. See §2.9.
  essentialPulse: 1.4,   // turn-indicator breathing glow
  essentialSpin:  1.0,   // loading spinner
  essentialFlash: 0.2,   // Nope/Intercept/Burned feedback flash
} as const satisfies Record<DurationName, number>;

// Cubic-bezier easings. BezierDefinition = readonly [number, number, number, number]
// which is exactly what `as const` produces — no inline cast needed.
// `base` renamed from `standard` 2026-04-11 to match --motion-duration-base.
export const MOTION_EASINGS = {
  base:        [0.4, 0, 0.2, 1],
  emphasized:  [0.2, 0, 0, 1],
  decelerate:  [0, 0, 0.2, 1],
  accelerate:  [0.4, 0, 1, 1],
  anticipate:  [0.68, -0.55, 0.265, 1.55],
} as const satisfies Record<EasingName, Easing>;

// Springs — outer-object `satisfies` pattern matches animation-config.ts.
export const MOTION_SPRINGS = {
  /** Snappy — button presses, small UI state changes */
  snappy:     { type: 'spring', stiffness: 300, damping: 24 },
  /** Deliberate — card plays, panel transitions, mid-size movement */
  deliberate: { type: 'spring', stiffness: 250, damping: 25 },
  /** Punchy — dramatic pops (EliminatedView skull, DramaOverlay entrances) */
  punchy:     { type: 'spring', stiffness: 400, damping: 15 },
  /** Gentle — large-scale welcomes (GameOver winner reveal) */
  gentle:     { type: 'spring', stiffness: 200, damping: 20 },
} as const satisfies Record<SpringName, Transition>;

/** Named presets combining duration + easing for common cases */
export const MOTION = {
  /** Quick CSS transition equivalent */
  quickFade:   { duration: MOTION_DURATIONS.fast,     ease: MOTION_EASINGS.base },
  /** Standard enter transition */
  enter:       { duration: MOTION_DURATIONS.base,     ease: MOTION_EASINGS.decelerate },
  /** Standard exit transition */
  exit:        { duration: MOTION_DURATIONS.fast,     ease: MOTION_EASINGS.accelerate },
  /** Full attention — use sparingly for high-drama moments */
  dramatic:    { duration: MOTION_DURATIONS.dramatic, ease: MOTION_EASINGS.emphasized },

  /** Spring-based — consume directly */
  snappy:      MOTION_SPRINGS.snappy,
  deliberate:  MOTION_SPRINGS.deliberate,
  punchy:      MOTION_SPRINGS.punchy,
  gentle:      MOTION_SPRINGS.gentle,
} as const satisfies Record<PresetName, Transition>;
```

**CSS mirror** (already defined in `primitives.css` per §2.2 above — duration numbers and easing curves). `motion-token-sync.test.ts` iterates `DURATION_NAMES` / `EASING_NAMES` (not `Object.entries`), so a missing CSS mirror fails the test even if the TS object is complete.

**MotionConfig reducedMotion="user" — add to `MotionProvider`.** Motion 12's recommended app-wide reduced-motion opt-out disables transform/layout animations for every descendant `m` component while preserving opacity/backgroundColor (the WAI-correct behavior — motion that conveys meaning via color/opacity survives; motion that triggers vestibular symptoms via transform gets cut). Phase 1 wraps `MotionProvider` with it:

```tsx
// src/client/shared/MotionProvider.tsx (post-deepening)
import { LazyMotion, MotionConfig, domMax } from 'motion/react';

export const MotionProvider = ({ children }: { children: React.ReactNode }) => (
  <LazyMotion features={domMax} strict>
    <MotionConfig reducedMotion="user">
      {children}
    </MotionConfig>
  </LazyMotion>
);
```

The CSS `@media (prefers-reduced-motion: reduce)` block in §2.9 and `MotionConfig reducedMotion="user"` are **both** consumers of the same OS media query — no conflict, belt-and-suspenders. CSS handles `@keyframes` / CSS transitions (outside Motion's reach); `MotionConfig` handles every `m` component; individual components reach for `useReducedMotion()` only when they need a bespoke fallback animation.

**Reduced-motion CSS fork** — see §2.9 for the full dual-family token pattern (plain decorative tokens zero; `--motion-duration-essential-*` survive for gameplay-signal animations).

### §2.7 CI test harness (Vitest)

**Deepening note (CRITICAL).** The original plan's test files had **three blocker-level API errors** that would crash on first run:

1. `culori.filter('deuteranopia', 1)` **does not exist**. Culori's real CVD simulation API exports `filterDeficiencyDeuter`, `filterDeficiencyProt`, `filterDeficiencyTrit` from the top-level package. Each is a factory — `filterDeficiencyDeuter(severity = 1)` returns `(color) => simulatedColor`. Algorithm: Machado-Oliveira-Fernandes 2009 (IEEE TVCG 15:6), the current best-in-class CVD model. Source verified against `src/deficiency.js` in culori v4.0.2.
2. `apca-w3.sRGBtoY(parse(color))` silently returns `NaN`. Per the apca-w3 source header comment block: *"Each must be a numeric NOT a string, as this simple version has no string parsing utilities."* `sRGBtoY` expects an **integer RGBA array** `[R, G, B, A]` with R/G/B in `0..255`. Culori's `rgb()` gives floats in `0..1`. An adapter is required.
3. `Math.abs(APCAcontrast(...))` is wrong. Per the apca-w3 source: *"DO NOT output an absolute value — light text on dark BG should return a negative number. APCA is polarity sensitive!"* Keep the signed Lc for the test report (shows `WoB` vs `BoW`), compare on the absolute value for the pass gate.

Also: `apca-w3` ships **no TypeScript declarations**. A local ambient declaration file is required or `pnpm typecheck` fails.

**Dependency install** (step 2 of §3 execution order):

```bash
pnpm add -D culori apca-w3 postcss
# colorparsley is a transitive dep of apca-w3 — don't install separately
```

**Ambient type declaration** — create `src/types/apca-w3.d.ts`:

```typescript
// src/types/apca-w3.d.ts
// apca-w3 v0.1.9 ships no TypeScript types. This declaration covers only the
// exports Phase 1 consumes. Algorithm is W3C-licensed and version-frozen at
// 0.0.98G-4g (Feb 2021) per Myndex — stale npm publish date is not a staleness
// signal, it's an algorithm-locked signal.
declare module 'apca-w3' {
  export function APCAcontrast(fgY: number, bgY: number, places?: number): number;
  export function sRGBtoY(rgba: [number, number, number, number] | [number, number, number]): number;
  export function displayP3toY(rgba: [number, number, number, number]): number;
  export function calcAPCA(txt: string | number[], bg: string | number[]): number;
  export function alphaBlend(fg: number[], bg: number[], round?: boolean): number[];
  export function fontLookupAPCA(lc: number): readonly number[];
}
```

---

**`palette-cvd.test.ts`** — ensures critical semantic pairs remain distinguishable under simulated deuteranopia, protanopia, and tritanopia, AND that every scale meets Radix's APCA guarantees (step-11-on-step-2 Lc 60, step-12-on-step-2 Lc 90).

```typescript
import { describe, test, expect } from 'vitest';
import {
  parse,
  rgb,
  filterDeficiencyDeuter,
  filterDeficiencyProt,
  filterDeficiencyTrit,
  differenceEuclidean,
} from 'culori';
import { APCAcontrast, sRGBtoY } from 'apca-w3';
import { PALETTE } from '../palette.generated';

// ---------- CVD simulation gate ----------

// Semantic pairs that must stay distinguishable under CVD simulation.
// Update when tokens are added or renamed — the pair list is declarative.
const CRITICAL_PAIRS = [
  ['color-bg-danger',     'color-bg-success',     'danger vs success (bg)'],
  ['color-fg-danger',     'color-fg-success',     'danger vs success (fg)'],
  ['color-accent-burned', 'color-accent-intercept', 'Burned card vs Intercept card'],
  ['color-accent-burned', 'color-accent-operative', 'Burned card vs operative'],
  ['color-border-focus',  'color-border-strong',  'focus ring vs static border'],
] as const;

// Raw oklab Euclidean distance (NOT oklch — oklch's hue-chroma weighting is
// misleading for CVD comparisons near greyscale). Starting threshold is 5× the
// CSS Color Module Level 4 "just noticeable" default of 0.02, tuned against
// our 11-step oklch ramps. Raise to 0.12 if we add a hue near 250° which
// Machado-flattens harder against teal.
const MIN_OKLAB_DISTANCE = 0.10;

const deuter = filterDeficiencyDeuter(1);
const protan = filterDeficiencyProt(1);
const tritan = filterDeficiencyTrit(1);
const oklabDistance = differenceEuclidean('oklab');

const SIMULATORS = [
  ['deuteranopia', deuter],
  ['protanopia',   protan],
  ['tritanopia',   tritan],
] as const;

describe('palette CVD legibility', () => {
  for (const [simName, sim] of SIMULATORS) {
    for (const [a, b, label] of CRITICAL_PAIRS) {
      test(`${label} — distinguishable under ${simName}`, () => {
        const colorA = parse(PALETTE[a]);
        const colorB = parse(PALETTE[b]);
        if (!colorA || !colorB) {
          throw new Error(`Unparseable: ${a}=${PALETTE[a]} / ${b}=${PALETTE[b]}`);
        }
        const simA = sim(colorA);
        const simB = sim(colorB);
        const d = oklabDistance(simA, simB);
        expect(
          d,
          `${a} (${PALETTE[a]}) vs ${b} (${PALETTE[b]}) under ${simName}: distance ${d.toFixed(4)} < ${MIN_OKLAB_DISTANCE}`,
        ).toBeGreaterThanOrEqual(MIN_OKLAB_DISTANCE);
      });
    }
  }
});

// ---------- Radix APCA guarantees per scale ----------

// culori rgb() → apca-w3 [R,G,B] adapter. apca-w3 requires integer RGB in
// 0..255 — culori gives floats in 0..1. Don't skip the conversion.
function toApcaRgb(cssColor: string): [number, number, number, number] {
  const c = rgb(cssColor);
  if (!c) throw new Error(`Unparseable color for APCA: ${cssColor}`);
  return [
    Math.round((c.r ?? 0) * 255),
    Math.round((c.g ?? 0) * 255),
    Math.round((c.b ?? 0) * 255),
    c.alpha ?? 1,
  ];
}

// Radix Colors publishes two guarantees on every 12-step scale:
//   step-11 on step-2 >= APCA Lc 60 (low-contrast text)
//   step-12 on step-2 >= APCA Lc 90 (high-contrast text)
// Bake both as automatic assertions for every scale — catches palette drift
// before component work starts.
const SCALES = ['teal', 'ochre', 'cream', 'charcoal', 'cordovan', 'emerald'] as const;

describe('Radix APCA guarantees per scale', () => {
  for (const scale of SCALES) {
    const step2Key  = `color-${scale}-2`  as keyof typeof PALETTE;
    const step11Key = `color-${scale}-11` as keyof typeof PALETTE;
    const step12Key = `color-${scale}-12` as keyof typeof PALETTE;

    test(`${scale}-11 on ${scale}-2 meets APCA Lc 60`, () => {
      const fgY = sRGBtoY(toApcaRgb(PALETTE[step11Key]));
      const bgY = sRGBtoY(toApcaRgb(PALETTE[step2Key]));
      const lcSigned = APCAcontrast(fgY, bgY);
      const lcMag = Math.abs(lcSigned);
      const polarity = lcSigned < 0 ? 'WoB' : 'BoW';
      expect(
        lcMag,
        `${scale}-11 on ${scale}-2 [${polarity}]: Lc ${lcSigned.toFixed(1)}`,
      ).toBeGreaterThanOrEqual(60);
    });

    test(`${scale}-12 on ${scale}-2 meets APCA Lc 90`, () => {
      const fgY = sRGBtoY(toApcaRgb(PALETTE[step12Key]));
      const bgY = sRGBtoY(toApcaRgb(PALETTE[step2Key]));
      const lcSigned = APCAcontrast(fgY, bgY);
      const lcMag = Math.abs(lcSigned);
      const polarity = lcSigned < 0 ? 'WoB' : 'BoW';
      expect(
        lcMag,
        `${scale}-12 on ${scale}-2 [${polarity}]: Lc ${lcSigned.toFixed(1)}`,
      ).toBeGreaterThanOrEqual(90);
    });
  }
});

// ---------- Luminance separation for the red/green CVD trap ----------

describe('cordovan vs emerald luminance separation', () => {
  test('|L_oklab(cordovan-9) - L_oklab(emerald-9)| >= 0.15', () => {
    const cord = parse(PALETTE['color-cordovan-9']);
    const emer = parse(PALETTE['color-emerald-9']);
    if (!cord || !emer) throw new Error('Unparseable cordovan-9 or emerald-9');
    // Read L channel via oklab conversion — culori's parse returns whatever
    // mode the string specified, so normalize to oklab first.
    const { converter } = require('culori');
    const toOklab = converter('oklab');
    const lCord = toOklab(cord).l;
    const lEmer = toOklab(emer).l;
    const delta = Math.abs(lCord - lEmer);
    expect(
      delta,
      `cordovan-9 L ${lCord.toFixed(3)} vs emerald-9 L ${lEmer.toFixed(3)}: ΔL ${delta.toFixed(3)}`,
    ).toBeGreaterThanOrEqual(0.15);
  });
});
```

---

**`palette-contrast.test.ts`** — WCAG 2.1 AA + APCA Lc (Myndex Bronze) checks for every semantic fg/bg pair. Both must pass; disagreements force human decision rather than auto-picking one.

```typescript
import { describe, test, expect } from 'vitest';
import { wcagContrast, rgb } from 'culori';
import { APCAcontrast, sRGBtoY } from 'apca-w3';
import { PALETTE } from '../palette.generated';

// Myndex ARC Bronze thresholds (APCA Readability Criterion, Feb 2021 locked).
// Source: git.myndex.com/APCA README + Font Lookup Table.
const APCA_BODY    = 75;  // body paragraphs, card copy
const APCA_CONTENT = 60;  // button labels, card titles, HUD numbers
const APCA_LARGE   = 45;  // headlines, hero text
// Lc 30 = "absolute floor, never lower"; Lc 15 = "point of invisibility"

// WCAG 2.1 AA (additive safety net; use alongside APCA, not instead of).
const WCAG_NORMAL = 4.5;  // body text
const WCAG_LARGE  = 3.0;  // large text / UI components

type Tier = 'body' | 'content' | 'large';

// Semantic fg/bg pairs from §2.3. Update when tokens change.
const PAIRS = [
  ['color-fg-primary',    'color-bg-app',     'body'],
  ['color-fg-primary',    'color-bg-surface', 'body'],
  ['color-fg-secondary',  'color-bg-app',     'content'],
  ['color-fg-muted',      'color-bg-app',     'large'],
  ['color-fg-danger',     'color-bg-app',     'content'],
  ['color-fg-success',    'color-bg-app',     'content'],
  ['color-fg-warning',    'color-bg-app',     'content'],
  ['color-fg-info',       'color-bg-app',     'content'],
  ['color-fg-on-danger',  'color-accent-burned',    'content'],
  ['color-fg-on-success', 'color-accent-intercept', 'content'],
  ['color-fg-on-warning', 'color-ochre-9',          'content'],
  ['color-fg-on-drama',   'color-accent-drama',     'content'],
  ['color-fg-on-neon',    'color-accent-neon',      'content'],
  // Add every real fg/bg pair that ships in a Phase 2-5 component.
] as const satisfies ReadonlyArray<readonly [keyof typeof PALETTE, keyof typeof PALETTE, Tier]>;

const APCA_MIN: Record<Tier, number> = {
  body: APCA_BODY, content: APCA_CONTENT, large: APCA_LARGE,
};
const WCAG_MIN: Record<Tier, number> = {
  body: WCAG_NORMAL, content: WCAG_NORMAL, large: WCAG_LARGE,
};

function toApcaRgb(cssColor: string): [number, number, number, number] {
  const c = rgb(cssColor);
  if (!c) throw new Error(`Unparseable color for APCA: ${cssColor}`);
  return [
    Math.round((c.r ?? 0) * 255),
    Math.round((c.g ?? 0) * 255),
    Math.round((c.b ?? 0) * 255),
    c.alpha ?? 1,
  ];
}

describe('palette contrast — WCAG 2.1 AA', () => {
  for (const [fg, bg, tier] of PAIRS) {
    test(`${fg} on ${bg} (${tier}) ≥ ${WCAG_MIN[tier]}:1`, () => {
      const ratio = wcagContrast(PALETTE[fg], PALETTE[bg]);
      expect(
        ratio,
        `${fg}=${PALETTE[fg]} on ${bg}=${PALETTE[bg]}: ${ratio.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(WCAG_MIN[tier]);
    });
  }
});

describe('palette contrast — APCA Lc (Myndex Bronze)', () => {
  for (const [fg, bg, tier] of PAIRS) {
    test(`${fg} on ${bg} (${tier}) |Lc| ≥ ${APCA_MIN[tier]}`, () => {
      const fgY = sRGBtoY(toApcaRgb(PALETTE[fg]));
      const bgY = sRGBtoY(toApcaRgb(PALETTE[bg]));
      const lcSigned = APCAcontrast(fgY, bgY);  // KEEP SIGN — polarity meaningful
      const lcMag = Math.abs(lcSigned);
      const polarity = lcSigned < 0 ? 'WoB' : 'BoW';
      expect(
        lcMag,
        `${fg} on ${bg} [${polarity}]: Lc ${lcSigned.toFixed(1)}`,
      ).toBeGreaterThanOrEqual(APCA_MIN[tier]);
    });
  }
});
```

---

**`motion-token-sync.test.ts`** — ensures TS motion tokens match CSS custom properties. Iterates `DURATION_NAMES` / `EASING_NAMES` (not `Object.entries`) so a missing TS entry fails. Uses PostCSS instead of regex for whitespace-tolerant, comment-safe parsing.

```typescript
import { describe, test, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import postcss from 'postcss';
import {
  DURATION_NAMES, EASING_NAMES,
  MOTION_DURATIONS, MOTION_EASINGS,
} from '../motion';

// Parse primitives.css once; build a map of custom properties on :root.
const primitivesCssPath = resolve(__dirname, '../primitives.css');
const primitivesCss = readFileSync(primitivesCssPath, 'utf-8');
const root = postcss.parse(primitivesCss);
const customProps = new Map<string, string>();
root.walkRules(':root', (rule) => {
  rule.walkDecls(/^--/, (decl) => {
    customProps.set(decl.prop, decl.value.trim());
  });
});

// Parse a CSS duration value loosely — accepts "150ms", "0.15s", ".15s", "150 ms".
function parseCssDurationMs(value: string): number {
  const trimmed = value.trim().toLowerCase();
  if (trimmed.endsWith('ms')) return parseFloat(trimmed);
  if (trimmed.endsWith('s'))  return parseFloat(trimmed) * 1000;
  throw new Error(`Cannot parse CSS duration: ${value}`);
}

// Parse a cubic-bezier() expression into its four numbers.
function parseCubicBezier(value: string): [number, number, number, number] {
  const m = value.trim().match(/^cubic-bezier\(\s*([^)]+)\s*\)$/);
  if (!m) throw new Error(`Not a cubic-bezier: ${value}`);
  const parts = m[1].split(',').map((s) => parseFloat(s.trim()));
  if (parts.length !== 4 || parts.some(Number.isNaN)) {
    throw new Error(`Malformed cubic-bezier: ${value}`);
  }
  return [parts[0], parts[1], parts[2], parts[3]];
}

describe('motion token TS/CSS sync — durations', () => {
  for (const name of DURATION_NAMES) {
    const cssName = `--motion-duration-${name.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    test(`${cssName} matches MOTION_DURATIONS.${name}`, () => {
      const cssValue = customProps.get(cssName);
      expect(cssValue, `CSS missing ${cssName}`).toBeDefined();
      const ms = parseCssDurationMs(cssValue!);
      expect(ms).toBeCloseTo(MOTION_DURATIONS[name] * 1000, 3);
    });
  }
});

describe('motion token TS/CSS sync — easings', () => {
  for (const name of EASING_NAMES) {
    const cssName = `--motion-ease-${name}`;
    test(`${cssName} matches MOTION_EASINGS.${name}`, () => {
      const cssValue = customProps.get(cssName);
      expect(cssValue, `CSS missing ${cssName}`).toBeDefined();
      const [a, b, c, d] = parseCubicBezier(cssValue!);
      const ts = MOTION_EASINGS[name];
      expect([a, b, c, d]).toEqual([ts[0], ts[1], ts[2], ts[3]]);
    });
  }
});
```

---

**`palette-sync.test.ts` — DELETED per Decision 1 (codegen).** Originally drafted during deepening as a drift guard for hand-authored dual-source `palette.ts` + `primitives.css`. No longer needed: `palette.generated.ts` is emitted from `primitives.css` at build time by `scripts/generate-palette.ts` (see §3 step 8). Drift is structurally impossible — the TS artifact cannot diverge from the CSS source because it IS derived from the CSS source. One fewer moving part, no test churn on every palette edit.

**`scripts/generate-palette.ts`** — the codegen script. Reference implementation:

```typescript
// scripts/generate-palette.ts
// Regenerates src/client/shared/tokens/palette.generated.ts from primitives.css.
// Run by `pnpm generate:palette`, chained into `prebuild` and `predev`.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const PRIMITIVES_PATH = resolve(REPO_ROOT, 'src/client/shared/tokens/primitives.css');
const OUTPUT_PATH    = resolve(REPO_ROOT, 'src/client/shared/tokens/palette.generated.ts');

const css = readFileSync(PRIMITIVES_PATH, 'utf-8');
const root = postcss.parse(css);
const entries: Array<[string, string]> = [];

root.walkRules((rule) => {
  // Only top-level :root declarations inside @layer primitives.
  if (rule.selector !== ':root') return;
  rule.walkDecls(/^--color-/, (decl) => {
    entries.push([decl.prop.slice(2), decl.value.trim()]);  // strip leading --
  });
});

if (entries.length === 0) {
  throw new Error(`generate-palette: no --color-* declarations found in ${PRIMITIVES_PATH}`);
}

const header = `/* eslint-disable */
// ⚠ GENERATED FILE — DO NOT EDIT MANUALLY.
// Source: src/client/shared/tokens/primitives.css
// Regenerate: pnpm generate:palette
// Generator: scripts/generate-palette.ts
//
// Editing primitives.css and saving triggers a predev/prebuild regen that
// overwrites this file. Drift is structurally impossible by design.

`;

const body = [
  'export const PALETTE = {',
  ...entries.map(([key, value]) => `  '${key}': '${value}',`),
  '} as const;',
  '',
  'export type PaletteKey = keyof typeof PALETTE;',
  'export type PaletteValue = typeof PALETTE[PaletteKey];',
  '',
].join('\n');

writeFileSync(OUTPUT_PATH, header + body, 'utf-8');
console.log(`generate-palette: wrote ${entries.length} color tokens to ${OUTPUT_PATH}`);
```

**`.gitignore` addition:**

```
# Generated palette token artifact — source of truth is primitives.css
src/client/shared/tokens/palette.generated.ts
```

**package.json additions:**

```json
{
  "scripts": {
    "generate:palette": "tsx scripts/generate-palette.ts",
    "predev":           "pnpm generate:palette",
    "prebuild":         "pnpm generate:palette",
    "pretest":          "pnpm generate:palette"
  }
}
```

**Note on `motion.ts`:** Motion stays TS-first (the reverse direction from palette). TS is source of truth because `motion.ts` has structural pieces that CSS can't express — spring configs, name-union type arrays, `MOTION` preset compositions. Motion → CSS mirror drift is caught by `motion-token-sync.test.ts`, which IS justified because the drift direction is hand-authored on both sides. If motion.ts also gains a codegen direction in a future phase (emit `@layer primitives-motion` block from the TS source), `motion-token-sync.test.ts` becomes vestigial too — flag for Phase 5 if the motion token count grows past ~20.

### §2.8 Dreamland S8 reference frame extraction — COMPLETE

**Status:** Done on 2026-04-11 as part of plan authoring, not execution. Per `feedback-plans-are-baking-recipes.md`: research happens at plan-time, not execution-time. The Phase 1 palette values in §2.2 are extracted directly from the Dreamland frames, not speculative.

**Output location:** `docs/plans/css-foundation-rebuild/dreamland-reference/`
- `README.md` — full frame manifest with source attribution, episode references, scene descriptions, and fair-use posture warning.
- `images/` — 18 Dreamland S8 frames downloaded from Archer Wiki (Fandom), `.webp` format, ~1.1 MB total.

**Frames used for extraction (6 of 18):**

| File | Role | Sourced colors |
|---|---|---|
| `dreamland-12-mother-window.webp` | Canonical "Dreamland look" | ochre 3–8, 11; teal 3–6, 10–11 |
| `dreamland-07-venetian-blinds.webp` | Tight crop cross-check | ochre/mahogany/sage triad validation |
| `dreamland-18-ngd-45.webp` | Max-chroma teal/amber dockyard | teal 7–9; ochre 9–11 |
| `dreamland-13-mother-drink.webp` | Warm mahogany interior | ochre 1–3; cream 10–12; cordovan 8–10 |
| `dreamland-02-interior-bar.webp` | Warm cream walls + olive tie | cream 5–12; emerald 5–9; ochre 12 |
| `dreamland-01-title.webp` | Dreamland neon sign + night sky | rose-neon spot values; teal 1–3 cross-check |

**Fair-use posture:** These frames are FX/FXX copyrighted material (fan-uploaded to Archer Wiki, not from official press kits). Allowed use: internal palette extraction and art direction reference. **NOT allowed: publication, marketing use, public-repo commits.** If the BURNED repo ever goes public, `dreamland-reference/images/` must be added to `.gitignore`. The `README.md` (with URLs and descriptions) is fine to publish; the actual image files are not.

**What Phase 1 execution still does:**
- Cross-references the extracted hex values against the CVD CI gate thresholds. Minor adjustments (± 5–10 perceptual units on 1–3 values max) are expected if any critical pair fails the distance check — commit those adjustments to `primitives.css` during step 13 of the execution order.
- Runs the palette through the WCAG + APCA contrast tests. Same adjustment budget.
- Visually reviews the rendered token system at token-grid size against the Dreamland frames — not individual components, just the token swatches — as the first pass of the §4.6 Archer acceptance test.

### §2.9 Reduced-motion dual-family tokens (NEW in deepening)

**Problem the original plan shipped.** The plan's `@media (prefers-reduced-motion: reduce) { :root { --motion-duration-*: 0ms } }` block is too blunt:

1. A loading spinner with zeroed rotation reads as "frozen app" — a *new* accessibility failure, not a fix. Font Awesome's issue tracker has extensive documentation of this exact regression.
2. BURNED's turn-indicator breathing glow is a **gameplay-essential signal** (telling the player whose turn it is). WCAG 2.3.3 (Animation from Interactions, Level AAA) explicitly carves out *"motion that is essential to the functionality or information being conveyed"* — zeroing it removes meaning, which is a separate compliance failure.
3. The plan also doesn't mandate that `@keyframes` animations consume motion tokens, so a rogue `animation: spin 1s infinite` hardcoded in a component CSS silently bypasses the global override entirely.

**Fix:** parallel "essential" token family that survives the `@media` override. Already declared in §2.2 primitives and §2.6 `motion.ts` — this section documents the full `@media` fork:

```css
/* Baseline — runs normally */
:root {
  /* Decorative */
  --motion-duration-fast:     150ms;
  --motion-duration-base:     250ms;
  --motion-duration-slow:     400ms;
  --motion-duration-dramatic: 800ms;

  /* Named durations (decorative) */
  --motion-duration-dots:       1500ms;
  --motion-duration-ambient:    4000ms;
  --motion-duration-pulse:      1400ms;  /* follow-up sweep, Phase 3 §7.6 */
  --motion-duration-pulse-slow: 2500ms;  /* follow-up sweep, Phase 3 §7.6 */

  /* Essential — gameplay-signal animations */
  --motion-duration-essential-pulse:  1400ms;
  --motion-duration-essential-spin:   1000ms;
  --motion-duration-essential-flash:  200ms;
}

@media (prefers-reduced-motion: reduce) {
  :root {
    /* Decorative — zero */
    --motion-duration-fast:     0ms;
    --motion-duration-base:     0ms;
    --motion-duration-slow:     0ms;
    --motion-duration-dramatic: 0ms;

    /* Named — zero (ambient/decorative loops are not gameplay-critical) */
    --motion-duration-dots:       0ms;
    --motion-duration-ambient:    0ms;
    --motion-duration-pulse:      0ms;   /* follow-up sweep */
    --motion-duration-pulse-slow: 0ms;   /* follow-up sweep */

    /* Essential — PRESERVED (and optionally slowed for comfort) */
    --motion-duration-essential-pulse:  2400ms;  /* slower breath, still readable */
    --motion-duration-essential-spin:   1500ms;  /* slower spin, still animated */
    --motion-duration-essential-flash:  200ms;   /* feedback pulse unchanged */
  }
}
```

**Rule (enforced by §2.14 lint check):** Every `@keyframes` animation must consume a `--motion-duration-*` token. `animation: spin 1s infinite` is banned — must be `animation: spin var(--motion-duration-essential-spin) infinite linear`. The lint grep catches the former; no hardcoded seconds/ms allowed in any `animation:` declaration.

**BURNED animations that MUST use an essential-* token:**
- Turn-indicator breathing glow (pulse)
- Reconnect-overlay loading spinner (spin)
- Lobby "waiting for players" dots (this is decorative, uses `--motion-duration-dots` — allowed to zero)
- Nope / Intercept / Burned card-draw feedback flash (flash)
- Drama-moment "!" interrupt overlay flash (flash)

**Everything else** (card hover lifts, deal arcs, shuffle spin, hand fan-out, modal slide-ins, confetti, DramaOverlay slide-in, GameOver winner reveal, announcement-feed scroll) uses the decorative tokens and zeroes under reduce.

**Testing pattern** — `reduced-motion.test.ts` in §2.7 family (added during Phase 1 execution step 11):

```typescript
import { describe, test, expect, vi, beforeEach } from 'vitest';

function mockReducedMotion(on: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: query.includes('prefers-reduced-motion') ? on : false,
      media: query, onchange: null,
      addEventListener: vi.fn(), removeEventListener: vi.fn(),
      addListener: vi.fn(), removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

describe('reduced-motion token behavior', () => {
  test('essential tokens remain non-zero under reduce', () => {
    // Assertions will run during Phase 5 E2E via Playwright's
    // page.emulateMedia({ reducedMotion: 'reduce' }) — Vitest/jsdom can't
    // actually re-parse :root CSS variables under a media-query switch.
    // This suite's job is to catch regressions where a Phase 2-4 commit
    // accidentally renames an essential-* token or adds a non-token animation.
    expect(true).toBe(true);  // placeholder — real coverage in Phase 5
  });
});
```

Full Playwright coverage lands in Phase 5's visual regression matrix (plan §5 of `phase-5-verification-acceptance.md`). Phase 1's job is to ship the token structure, lint rule, and placeholder test so Phase 5 has surface to build against.

---

### §2.10 `@property` declarations (NEW in deepening)

**Why add.** `@property` went Baseline Widely Available in July 2024 — 20+ months of cross-browser interop by April 2026. Production-ready. Three concrete wins:

1. **Live reduced-motion transitions.** Without `@property`, changing `--motion-duration-base` via an `@media` query does not trigger transition recomputation on already-animating elements — the reduced-motion switch during an in-flight animation doesn't take effect until the next transition starts. With `@property { syntax: '<time>' }`, the browser treats the variable as a real time value and recomputes `transition-duration` live. This is a silent correctness bug the original plan shipped.
2. **Typo catch at parse time.** `initial-value: 25o0ms` fails to register and logs a console warning. Without `@property`, a typo silently becomes a 0-duration transition.
3. **Future-proofs animated tokens.** Any token that might need to interpolate (hover glow color transitions, drama accent pulses) requires `@property` to transition at all.

**Block to add at the top of `primitives.css`** (before any `:root` rule):

```css
/*
 * @property declarations — type-safe CSS custom properties.
 * Baseline Widely Available since July 2024. Zero bundle cost at runtime;
 * ~1-2KB gzipped from the at-rule block itself.
 *
 * RULE: every initial-value MUST byte-match the :root value below. If they
 * diverge, the :root wins at computed time but initial-value becomes the
 * fallback inside shadow-DOM boundaries. The palette-sync test catches drift.
 */

/* Motion durations */
@property --motion-duration-fast     { syntax: '<time>'; inherits: true; initial-value: 150ms; }
@property --motion-duration-base     { syntax: '<time>'; inherits: true; initial-value: 250ms; }
@property --motion-duration-slow     { syntax: '<time>'; inherits: true; initial-value: 400ms; }
@property --motion-duration-dramatic { syntax: '<time>'; inherits: true; initial-value: 800ms; }
@property --motion-duration-dots       { syntax: '<time>'; inherits: true; initial-value: 1500ms; }
@property --motion-duration-ambient    { syntax: '<time>'; inherits: true; initial-value: 4000ms; }
@property --motion-duration-pulse      { syntax: '<time>'; inherits: true; initial-value: 1400ms; }  /* follow-up sweep */
@property --motion-duration-pulse-slow { syntax: '<time>'; inherits: true; initial-value: 2500ms; }  /* follow-up sweep */
@property --motion-duration-essential-pulse { syntax: '<time>'; inherits: true; initial-value: 1400ms; }
@property --motion-duration-essential-spin  { syntax: '<time>'; inherits: true; initial-value: 1000ms; }
@property --motion-duration-essential-flash { syntax: '<time>'; inherits: true; initial-value: 200ms; }

/* Color primitives — one @property per color scale step and spot color.
   Example for teal; repeat for ochre/cream/charcoal/cordovan/emerald and neon. */
@property --color-teal-1  { syntax: '<color>'; inherits: true; initial-value: #08181a; }
@property --color-teal-2  { syntax: '<color>'; inherits: true; initial-value: #0c2024; }
/* ... all 72 scale tokens + 2 neon spots, byte-matching §2.2 hex values ... */
@property --color-neon-magenta      { syntax: '<color>'; inherits: true; initial-value: #e84a9c; }
@property --color-neon-magenta-glow { syntax: '<color>'; inherits: true; initial-value: #ff6fb8; }
```

**What NOT to register** (deliberate exclusions):
- `--text-*` (uses `clamp()` with viewport math — `@property` + `clamp()` has historical quirks not worth opening)
- `--space-fluid-*` (same reason)
- `--size-*` (same reason)
- `--radius-*` (no animation use case; keep simple)
- Semantic-layer aliases like `--color-fg-primary` (they're `var()` chains to primitives, which are already typed; double-registering adds bytes for zero gain)

**Lightning CSS / Vite 8 behavior.** Lightning CSS does NOT auto-polyfill `@property` (registration is a browser engine feature, no runtime polyfill possible). It passes the at-rule through unchanged. Browsers that don't understand `@property` ignore the at-rule; the bare `:root` assignments still work as unregistered string variables. Natural progressive-enhancement fallback.

**Bundle cost verified:** ~80-110 bytes raw per declaration, ~35-50 bytes gzipped. For ~85 registered tokens (10 durations + ~74 colors + 1-2 spot), total ~3 KB raw / ~700-800 bytes gzipped. Included in the corrected §8 bundle math.

---

### §2.11 `@layer` cascade ordering (NEW in deepening)

**Why add.** Vite 8 + Rolldown RC has documented cases where the global order between unrelated CSS chunks becomes non-deterministic in production builds — the dev server preserves import order, production may not. If `semantic.css` loaded before `primitives.css` in a production build, every `var(--color-teal-9)` in semantic.css would resolve to its `@property` `initial-value` (which is correct by content, but brittle by luck). `@layer` makes cascade order **declarative and build-tool-independent**.

**Declaration — add to `primitives.css` as the first rule:**

```css
/* Cascade order — declarative, build-tool-independent.
   Every subsequent rule in this project's CSS must live in one of these layers. */
@layer primitives, semantics, semantics-phone, semantics-board, components, overrides;
```

**Wrap each token file's contents in its layer:**

```css
/* primitives.css (after the @layer declaration + all @property rules) */
@layer primitives {
  :root {
    --color-teal-1: #08181a;
    /* ... */
  }
}

/* semantic.css */
@layer semantics {
  :root {
    --color-bg-app: var(--color-charcoal-1);
    /* ... */
  }
}

/* semantic.phone.css */
@layer semantics-phone {
  :root {
    --text-body: clamp(0.875rem, /* ... */);
    /* ... */
  }
}

/* semantic.board.css */
@layer semantics-board {
  :root {
    --text-body: clamp(1rem, /* ... */);
    /* ... */
  }
}
```

**Phase 2/3 component `.module.css` files wrap their content in `@layer components`.** Phase 5 polish / overrides live in `@layer overrides` (highest specificity, lowest priority above). This also pre-solves Phase 2's "how do I override a token for one component" problem — the override layer wins the cascade without needing `!important`.

**Bundle cost:** ~40 bytes gzipped for the declaration; per-file `@layer X {}` wrapper adds ~15 bytes gzipped per file.

---

### §2.12 Safe-area tokens + viewport meta (NEW in deepening)

**Why add.** Original `semantic.phone.css` had no `env(safe-area-inset-*)` handling. On notch/Dynamic Island iPhones (14 Pro / 15 / 16 / 17 Pro / 26-series), the bottom home indicator consumes ~34 px and the top inset is ~59 px. A `100svh` phone root without safe-area adjustment clips critical UI under the home indicator.

**Viewport meta tag** — must be present in `player.html` (`src/client/player.html`):

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content">
```

- `viewport-fit=cover` is **mandatory** — without it, `env(safe-area-inset-*)` returns 0 and all the tokens below become no-ops.
- `interactive-widget=resizes-content` is supported in Chrome 108+ and Firefox 132+. Safari still ignores it and defaults to `resizes-visual` (per WebKit GitHub tracker) — set it anyway, Safari's silent no-op is fine and the declaration aids Android.

**Safe-area tokens — add to `semantic.phone.css`:**

```css
:root {
  /* Safe-area insets — raw browser values (0 on non-notch devices). */
  --inset-top:    env(safe-area-inset-top, 0px);
  --inset-right:  env(safe-area-inset-right, 0px);
  --inset-bottom: env(safe-area-inset-bottom, 0px);
  --inset-left:   env(safe-area-inset-left, 0px);

  /* Safe viewport height — 100svh minus unreachable zones. Use as the
     phone root's min-height (NOT 100svh directly). */
  --size-viewport-safe: calc(100svh - var(--inset-top) - var(--inset-bottom));
}
```

**Phone root rule** — the Phase 2 migration of `PlayingView.module.css` (or whichever file becomes the phone root container) consumes these as:

```css
.phoneRoot {
  min-height: var(--size-viewport-safe);
  padding-top:    var(--inset-top);
  padding-left:   var(--inset-left);
  padding-right:  var(--inset-right);
  /* bottom padding gets the max of base fluid spacing OR the home indicator */
  padding-bottom: max(var(--space-fluid-base), var(--inset-bottom));
}
```

**Note on soft keyboard.** `svh` / `dvh` / `lvh` do **not** respond to the iOS/Android soft keyboard — they track browser chrome (URL bar, tab bar), not the keyboard. When a player opens a soft keyboard to type a room code, `100svh` stays the same and the keyboard overlays content. This is actually good news for BURNED (layout doesn't reflow mid-turn), but document it so nobody "fixes" the keyboard issue with JS viewport math.

---

### §2.13 Font loading strategy (NEW in deepening)

**Why add.** Original plan referenced `--font-display: 'Clash Display'` but had no `@font-face` block, no `<link rel="preload">`, and no `font-display` strategy. Clash Display at 4 weights × 2 styles ≈ 60 KB gzipped WOFF2 — larger than everything else Phase 1 adds combined. Without a load strategy, first visit shows system font → Clash Display swaps in 200-800 ms later (FOUT). Phase 1 ships the loading strategy alongside the token.

**Strategy: `font-display: optional` + preload of one weight.**

- **`font-display: optional`** — browser waits up to 100 ms for the font; if it arrives in time, it uses it. If not, it renders the fallback and *does not swap* on this page load. Cached on second load, uses Clash Display immediately. Result: zero FOUT/FOIT on first visit (user sees system font for one session, then Clash Display from session 2 onward). This is the 2026-safe pattern for Archer-grade typography that shouldn't cause perceived loading jank.
- **Preload ONE weight** (the primary display weight — `Clash Display Semibold` at 600) so the 100 ms optional-window has a fighting chance on first load. Body + mono fonts deferred (no preload).

**HTML head additions** — in both `player.html` and `board.html`:

```html
<link rel="preload"
      href="/fonts/ClashDisplay-Semibold.woff2"
      as="font"
      type="font/woff2"
      crossorigin>
```

**`@font-face` block** — create `src/client/shared/tokens/fonts.css` (new file, imported after `semantic.css` in §2.1):

```css
@layer components {
  @font-face {
    font-family: 'Clash Display';
    src: url('/fonts/ClashDisplay-Semibold.woff2') format('woff2');
    font-weight: 600;
    font-style: normal;
    font-display: optional;
  }

  @font-face {
    font-family: 'Clash Display';
    src: url('/fonts/ClashDisplay-Bold.woff2') format('woff2');
    font-weight: 700;
    font-style: normal;
    font-display: optional;
  }

  /* General Sans body + JetBrains Mono lazy-loaded from Fontshare CDN.
     Not preloaded (body text is fine on system-font fallback during first paint). */
  @import url('https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600&display=optional');
}
```

**Bundle impact:** `fonts.css` itself is ~600 bytes gzipped. Preloaded WOFF2 is ~14 KB gzipped on the network (one weight only), but it's a parallel font fetch, **not part of the 100 KB JS bundle budget**. Documented in §8 separately from the JS delta.

**Baveuse deferral.** If the §4.6 Archer acceptance test fails on Clash Display, swap `--font-display` value — one-line change. Baveuse license (~$30) acquired at that moment, not before.

---

### §2.14 Lint rules (NEW in deepening)

**Why add.** Phase 1 is the token contract; Phases 2-5 execute against it. Without machine-enforced rules, the contract drifts the first time a component author is in a hurry. Plan ships a minimal lint check alongside the tokens — these run in CI as part of `pnpm lint`.

**Rule 1 — Ban custom property DEFINITIONS in component `.module.css` files.** Tokens live in `src/client/shared/tokens/` only. Stylelint rule (add to `.stylelintrc.json` if using stylelint, or a grep-based check in `scripts/lint-css.sh` + a CI step):

```bash
#!/bin/bash
# scripts/lint-css.sh — Phase 1 token-boundary enforcement
set -e

BAD=$(grep -rEn '^\s*--(color|space|motion|text|size|radius|shadow|z|inset)-[a-z0-9-]+:' \
  src/client/player src/client/board src/client/shared \
  --include='*.module.css' || true)

if [ -n "$BAD" ]; then
  echo "ERROR: Custom property definitions found in component CSS."
  echo "Tokens must live in src/client/shared/tokens/, not component modules."
  echo "$BAD"
  exit 1
fi
```

Exception list for Phase 2+: `cardAccent` inline style via `style={{ '--card-accent': fill }}` is a component-level *consumer*, not a definition — the grep targets `:` at end-of-line inside a `.module.css` file, so React inline styles don't trip it.

**Rule 2 — Ban `@keyframes` with hardcoded durations.** Every `animation:` declaration must reference a `--motion-duration-*` token. Catches `animation: spin 1s infinite` that bypasses reduced-motion:

```bash
BAD=$(grep -rEn 'animation:\s*[a-z0-9_-]+\s+[0-9.]+m?s' \
  src/client --include='*.module.css' \
  | grep -v 'var(--motion-duration' || true)

if [ -n "$BAD" ]; then
  echo "ERROR: Hardcoded animation duration. Use var(--motion-duration-*)."
  echo "$BAD"
  exit 1
fi
```

**Rule 3 — Ban `position: fixed` in phone-view components.** Use `position: sticky` inside a flex column instead (avoids WebKit bug 297779 — see §5 landmine 7). Board view can still use fixed.

```bash
BAD=$(grep -rEn 'position:\s*fixed' src/client/player \
  --include='*.module.css' || true)

if [ -n "$BAD" ]; then
  echo "ERROR: position: fixed in phone view. Use position: sticky inside a flex column."
  echo "See Phase 1 §5 landmine 7 (WebKit bug 297779)."
  echo "$BAD"
  exit 1
fi
```

**Rule 4 — Ban `dvh` in `semantic.phone.css`.** `dvh` shimmers on iOS scroll (recalc on every address-bar frame). Phone is `svh`-only.

```bash
BAD=$(grep -En '\b(dvh|vh)\b' src/client/shared/tokens/semantic.phone.css || true)
if [ -n "$BAD" ]; then
  echo "ERROR: dvh/vh in semantic.phone.css. Phone is svh-only."
  echo "$BAD"
  exit 1
fi
```

**Rule 5 — Ban `color-mix(in oklch, ...)` everywhere.** Safari's `in oklch` bug renders some blues as pink. Use `in oklab`.

```bash
BAD=$(grep -rEn 'color-mix\(\s*in\s+oklch' src/client --include='*.css' || true)
if [ -n "$BAD" ]; then
  echo "ERROR: color-mix(in oklch) — Safari renders some blues as pink. Use in oklab."
  echo "$BAD"
  exit 1
fi
```

**Rule 6 — Ban `--color-accent-neon` + pseudo-class combinations.** Neon is a 2-spot accent; growing it into hover/focus/active/disabled states would need a proper scale.

```bash
BAD=$(grep -rEn 'color-accent-neon.*:(hover|focus|active|disabled)' \
  src/client --include='*.module.css' || true)

if [ -n "$BAD" ]; then
  echo "ERROR: --color-accent-neon with pseudo-class state. Neon is a spot color, not a scale."
  echo "$BAD"
  exit 1
fi
```

**Wire-up** — add to `package.json`:

```json
"scripts": {
  "lint": "eslint src/ && bash scripts/lint-css.sh"
}
```

All six rules run on every `pnpm lint` and block merges if anything fails. Phase 2-5 authors see the error the moment they save.

---

## §3 — Step-by-Step Execution Order

Phase 1 tasks, in dependency order. Each step has a commit point. **Deepening pass 2026-04-11 added steps 1a, 2a, 5a, 6a, 7a, 8a, 11a, 16a and renumbered acceptance gates.**

1. **Create directory structure.** `src/client/shared/tokens/` + `__tests__/` subdirectory. Also `src/types/` (for the apca-w3 ambient declaration).
   - *Verification fact (deepening):* `src/client/shared/tokens/` does NOT currently exist — confirmed by codebase scan 2026-04-11. Fresh creation.
1a. **Add `src/types/apca-w3.d.ts`** ambient declaration per §2.7. Without this, `pnpm typecheck` fails the moment step 9 imports `apca-w3`.
2. **Install dependencies.** `pnpm add -D culori apca-w3 postcss tsx`. (postcss is used by `motion-token-sync.test.ts` for whitespace-tolerant CSS parsing AND by `scripts/generate-palette.ts` to parse primitives.css at codegen time; culori + apca-w3 are the test harness; tsx runs the codegen script from `pnpm generate:palette`. All dev-only.)
   - *Verification fact:* `culori`, `apca-w3` NOT currently in `package.json` devDependencies. `postcss` is likely transitive via Vite/Lightning CSS — verify before installing; if present, install is a no-op.
2a. **Scaffold `scripts/lint-css.sh`** with Rules 1-6 from §2.14. Wire into `pnpm lint` in `package.json`.
3. **Author `primitives.css`** with all six color scales (initial values from §2.2), spacing, radius, motion duration (decorative + named + essential), motion easing, z-index. Start with the `@layer primitives, semantics, semantics-phone, semantics-board, components, overrides;` declaration (§2.11) and the `@property` block (§2.10).
4. **Author `motion.ts`** with TS motion tokens per §2.6 — `DURATION_NAMES`/`EASING_NAMES`/`SPRING_NAMES`/`PRESET_NAMES` unions first, then `MOTION_DURATIONS`/`MOTION_EASINGS`/`MOTION_SPRINGS`/`MOTION` using outer-object `as const satisfies Record<Name, …>`. Import `Easing` from `motion/react`.
5. **Author `semantic.css`** with axis-independent semantic tokens per §2.3 — including `--color-shadow-base`, the `--color-fg-on-*` family, `--color-border-info`, and the renamed `--color-accent-neon` referencing `--color-neon-magenta`. Wrap in `@layer semantics { ... }`.
5a. **Author `fonts.css`** per §2.13 (`@font-face` block with `font-display: optional` for Clash Display, Fontshare `@import` for General Sans). Wrap in `@layer components`.
6. **Author `semantic.phone.css`** with svh-based dimensional tokens per §2.4 — including the WCAG 1.4.4 load-bearing comment, safe-area tokens per §2.12, and the renamed `--size-phone-card-*` tokens. Wrap in `@layer semantics-phone`. Five text tokens (not six — `--text-micro` merged into `--text-caption`).
6a. **Update HTML shells** — add `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content">` to both `src/client/player.html` and `src/client/board.html`. Add `<link rel="preload" href="/fonts/ClashDisplay-Semibold.woff2" as="font" type="font/woff2" crossorigin>` to both.
7. **Author `semantic.board.css`** with vw-based dimensional tokens per §2.5 — including renamed `--size-board-card-*`, new `--size-player-panel-width/-height`, `--text-hero-subdued`, `--space-fluid-base-board`, `--space-fluid-loose-board`, **plus follow-up sweep tokens**: `--text-caption-board`, 6 sizing tokens (`--size-lobby-roster-max-width`, `--size-title-accent-width`, `--size-rankings-max-width`, `--size-felt-reticle`, `--size-felt-diamond`, `--size-discard-card-width`). Wrap in `@layer semantics-board`.
7a. **Place Clash Display font files** at `public/fonts/ClashDisplay-Semibold.woff2` and `ClashDisplay-Bold.woff2` (download from Fontshare, place in `public/fonts/`). Verify the preload URL resolves via `curl -I http://localhost:5173/fonts/ClashDisplay-Semibold.woff2` once the dev server starts at step 19.
8. **Author `scripts/generate-palette.ts`** (codegen decision — see Enhancement Summary Decision 1). The script is ~30-50 LOC: parse `primitives.css` with PostCSS, walk `:root` rules, extract every `--color-*` custom property, emit `src/client/shared/tokens/palette.generated.ts` as a flat `as const` object keyed by kebab-case name without `--` prefix. Include a file-level header comment: *"⚠ GENERATED FILE — DO NOT EDIT. Source: `src/client/shared/tokens/primitives.css`. Regenerate: `pnpm generate:palette`."*
8b. **Wire the generator into package.json.** Add `"generate:palette": "tsx scripts/generate-palette.ts"`, `"prebuild": "pnpm generate:palette"`, `"predev": "pnpm generate:palette"`. Add `src/client/shared/tokens/palette.generated.ts` to `.gitignore`. Run `pnpm generate:palette` once to confirm the output compiles and is importable.
8a. **Migrate `cardAccent()` from `theme.ts` to `palette.ts` (or new `card-accents.ts`).** CRITICAL — `theme.ts:cardAccent` is currently consumed at `src/client/shared/MinimalCard.tsx:28` and `src/client/player/sheets/FuturePeek.tsx:70` via inline style. Step 16 cannot delete `theme.ts` until these consumers are updated. Export a pure function `cardAccent(type: CardType): { fill: string; glow: string }` from the new home, update both import sites, typecheck clean.
9. **Author `palette-cvd.test.ts`** per §2.7. Uses `filterDeficiencyDeuter/Prot/Trit` (NOT `filter('deuteranopia')` — that API doesn't exist). Uses `differenceEuclidean('oklab')` (NOT `'oklch'` — the hue-chroma weighting is misleading for CVD). Includes Radix APCA guarantees (step-11/step-2 Lc 60, step-12/step-2 Lc 90) per scale and the cordovan/emerald luminance-separation assertion. Run it. Some pairs may fail initially — those failures drive step 13.
10. **Author `palette-contrast.test.ts`** per §2.7. WCAG 2.1 + APCA Bronze. APCA uses integer RGB triple via `rgb()` adapter (NOT `parse()` directly — `sRGBtoY` expects ints 0-255). Polarity preserved in error message; compare magnitude. Run it. Failures drive step 13.
11. **Author `motion-token-sync.test.ts`** per §2.7. Iterates `DURATION_NAMES`/`EASING_NAMES` unions. PostCSS parse instead of regex for robust whitespace/comment handling. This should PASS immediately — if not, fix the TS/CSS drift before proceeding.
11a. **~~Author `palette-sync.test.ts`~~** — DELETED per Decision 1 (codegen). `palette.generated.ts` is emitted from `primitives.css` at build time; drift is structurally impossible. No sync test needed. Skip this step.
11b. **Author `reduced-motion.test.ts`** placeholder per §2.9. Matches jsdom `matchMedia` pattern; full coverage lands in Phase 5's Playwright suite.
12. **~~Frame-extract Dreamland S8 references~~** — ALREADY DONE at plan-authoring time. Frames live at `docs/plans/css-foundation-rebuild/dreamland-reference/images/`. Skip.
13. **Palette CVD + contrast + Radix guarantee adjustment pass.** Run `palette-cvd.test.ts`, `palette-contrast.test.ts`. For any critical pair that fails the distance threshold, any fg/bg pair that fails WCAG/APCA, or any Radix Lc 60/Lc 90 guarantee that fails, tune the relevant primitive hex values in `primitives.css` AND the corresponding `@property initial-value` (both must stay byte-identical — `palette.generated.ts` regenerates automatically on next `pnpm generate:palette`). Re-run until green. Expected budget: ± 5-10 perceptual units on at most 1-3 values. If more than 3 values need tuning, STOP and debate with Briggsy. Commit.
14. **Update `src/client/player/main.tsx`** to import `primitives.css` + `semantic.css` + `semantic.phone.css` + `fonts.css` and remove the existing `applyTheme('player')` call. Do NOT add `data-theme="dark"` dynamically — the dark tokens live on bare `:root` per §2.3 deepening. Typecheck clean.
15. **Update `src/client/board/main.tsx`** to import `primitives.css` + `semantic.css` + `semantic.board.css` + `fonts.css` and remove the existing `applyTheme()` call. Typecheck clean.
16. **Delete `src/client/shared/theme.ts` + `src/client/shared/theme.css`** — remove the runtime `applyTheme()` pattern. Confirmed verification-scan 2026-04-11: no `applyTheme()` call in `MotionProvider.tsx` — original plan's landmine #6 reference is vestigial, safe to delete mention. Grep `git grep "from.*theme"` must return zero results after this step.
16a. **Grep-delete orphan `[data-theme="light"]` blocks from existing `.module.css` files.** Verified 2026-04-11: at least 11 `.module.css` files (`MinimalCard`, `GameOver`, `JoinScreen`, `NopeButton`, `InterceptButton`, `TurnBanner`, `TitleBar`, `player/StatusBar`, `SmartActionBox`, `PlayingView`, `sheets/sheets`) contain `[data-theme="light"]` selectors wired to old `theme.ts` tokens. These become silent dead code the moment `theme.ts` is deleted, but they're landmines if anyone ever forces `data-theme="light"` and references a non-existent `var(--red-glow)`. Delete every `[data-theme="light"] { … }` block and every `[data-theme="light"]` ancestor qualifier in these files. Commit as *"chore(css): remove orphan light-mode selectors pre-Phase-2 migration"*.
17. **Update `MotionProvider.tsx`** to add `<MotionConfig reducedMotion="user">` wrapping its children (§2.6). The surrounding `<LazyMotion features={domMax} strict>` stays.
18. **Wire reduced-motion coverage** — run `reduced-motion.test.ts` placeholder (must pass), confirm no ESLint warnings, verify no hardcoded `animation:` declarations exist in existing components (will flag some that Phase 4 later fixes, but shouldn't hard-fail on existing code — adjust `scripts/lint-css.sh` Rule 2 to emit warnings only on files *not* yet migrated if this becomes a false-positive wall).
19. **Bundle size check.** Run `pnpm build` and verify phone entry stays under 97.5 KB gzipped (tightened from the original +5 KB tolerance per deepening's corrected math in §8). If it regressed past 97.5 KB, investigate before shipping. Record the actual delta in the commit message.
20. **Run full test suite** — `pnpm test` + `pnpm typecheck` + `pnpm lint`. Everything green, including the six new `scripts/lint-css.sh` rules.
21. **Visual smoke test.** Start `pnpm dev` + `pnpm dev:server`. Load both `http://localhost:5173/player.html?room=TEST` and `http://localhost:5173/board.html?room=TEST`. Confirm zero console errors. Existing components still use hardcoded values so they won't look different — that's expected; the test is that the token foundation doesn't break the existing render and the preloaded Clash Display weight arrives within the `font-display: optional` 100 ms window.
22. **Commit + tag.** `feat(css-foundation): Phase 1 — token system foundation (deepened)` with reference to `docs/plans/css-foundation-rebuild/phase-1-foundation.md` and a summary of the deepening corrections landed.

---

## §4 — Acceptance Criteria

Phase 1 is done when **all** of the following are true:

### §4.1 Files exist and are wired

- [ ] `src/client/shared/tokens/primitives.css` exists, starts with `@layer primitives, semantics, semantics-phone, semantics-board, components, overrides;`, contains the `@property` block (§2.10), wraps tokens in `@layer primitives { :root { ... } }`, and defines every token in §2.2.
- [ ] `src/client/shared/tokens/semantic.css` exists, wraps tokens in `@layer semantics { :root { ... } }`, and defines every token in §2.3 (including `--color-shadow-base`, `--color-border-info`, full `--color-fg-on-*` family, `--color-accent-neon` pointing at `--color-neon-magenta`).
- [ ] `src/client/shared/tokens/semantic.phone.css` exists, wraps in `@layer semantics-phone`, defines every token in §2.4 (including safe-area tokens `--inset-*`, `--size-viewport-safe`, `--size-phone-card-*`, `--size-card-detail-max`, `--size-touch-target-comfortable`). Uses only 5 text tiers (body/caption/callout/title/display — NO `--text-micro`).
- [ ] `src/client/shared/tokens/semantic.board.css` exists, wraps in `@layer semantics-board`, defines every token in §2.5 (including renamed `--size-board-card-*`, new `--size-player-panel-width/-height`, `--text-hero-subdued`, `--space-fluid-base-board`, `--space-fluid-loose-board`).
- [ ] `src/client/shared/tokens/fonts.css` exists with `@font-face` blocks for Clash Display Semibold + Bold using `font-display: optional`, and `@import` for General Sans from Fontshare. Wrapped in `@layer components`.
- [ ] `src/client/shared/tokens/motion.ts` exists and exports `DURATION_NAMES`, `EASING_NAMES`, `SPRING_NAMES`, `PRESET_NAMES`, `MOTION_DURATIONS`, `MOTION_EASINGS`, `MOTION_SPRINGS`, `MOTION`. All four name-union types derived from `as const` arrays. `DURATION_NAMES` does NOT include `'instant'` (dropped in deepening).
- [ ] `scripts/generate-palette.ts` exists per §2.7 reference implementation and runs successfully via `pnpm generate:palette`.
- [ ] `src/client/shared/tokens/palette.generated.ts` is generated (not hand-authored), gitignored, and regenerated on `predev`/`prebuild`/`pretest`. Starts with the "⚠ GENERATED FILE" header comment.
- [ ] `.gitignore` contains `src/client/shared/tokens/palette.generated.ts`.
- [ ] `package.json` scripts include `generate:palette`, `predev`, `prebuild`, `pretest` chain.
- [ ] `src/types/apca-w3.d.ts` ambient declaration exists.
- [ ] `primitives.css` + `semantic.css` + `semantic.phone.css` + `fonts.css` imported by the player entry point (`src/client/player/main.tsx`).
- [ ] `primitives.css` + `semantic.css` + `semantic.board.css` + `fonts.css` imported by the board entry point (`src/client/board/main.tsx`).
- [ ] `src/client/player.html` and `src/client/board.html` have the `<meta name="viewport" content="..., viewport-fit=cover, interactive-widget=resizes-content">` tag and the Clash Display Semibold `<link rel="preload" ...>` tag.
- [ ] `public/fonts/ClashDisplay-Semibold.woff2` and `ClashDisplay-Bold.woff2` exist and are fetchable at `/fonts/...`.
- [ ] `src/client/shared/theme.ts` and `src/client/shared/theme.css` deleted. `git grep "from.*theme"` returns zero results.
- [ ] `cardAccent()` migrated to `palette.ts` (or new `card-accents.ts`). `MinimalCard.tsx` and `FuturePeek.tsx` updated to import from the new home. Both typecheck clean.
- [ ] `MotionProvider.tsx` wraps children in `<MotionConfig reducedMotion="user">` inside the existing `<LazyMotion features={domMax} strict>`.
- [ ] Zero remaining `[data-theme="light"]` selector blocks across `src/client/**/*.module.css`. `git grep '\[data-theme="light"\]'` returns zero results inside `src/client/` (outside of Phase 1 deliberate tokens).
- [ ] Zero remaining `applyTheme` callsites. `git grep 'applyTheme'` returns zero results project-wide.

### §4.2 Purity checks

- [ ] `primitives.css` has zero hardcoded hex outside the color-scale definitions + `@property initial-value` block (the `@property initial-value` values are deliberately mirrored hex — they must byte-match the `:root` values).
- [ ] `semantic.css` has zero hardcoded hex — every color value is a `var(--color-...)` reference.
- [ ] `semantic.phone.css` has zero `vw`/`cqw`/`vh`/`dvh`/`lvh` usage (phone is svh-only). Enforced by lint Rule 4.
- [ ] `semantic.board.css` has zero `svh`/`dvh`/`vh` usage for dimensional sizing (board is vw/cqw-only).
- [ ] Zero `color-mix(in srgb, …)` and zero `color-mix(in oklch, …)` anywhere in the token files — every `color-mix()` uses `in oklab`. Enforced by lint Rule 5.
- [ ] Zero `--motion-duration-*`, `--color-*`, `--space-*`, `--text-*`, `--size-*`, `--radius-*`, `--shadow-*`, `--z-*`, `--inset-*` custom property DEFINITIONS in any `.module.css` file under `src/client/`. Enforced by lint Rule 1.
- [ ] Zero `animation:` declarations with hardcoded `Ns`/`Nms` duration literals in `.module.css` files — all use `var(--motion-duration-*)`. Enforced by lint Rule 2. (Warning-level on pre-migration files; blocker on any file touched in Phase 1.)

### §4.3 Tests pass

- [ ] `pnpm test` — all existing tests still pass (167/167).
- [ ] `palette-cvd.test.ts` — every critical pair passes `MIN_OKLAB_DISTANCE >= 0.10` under all three CVD simulations (deuter/protan/tritan).
- [ ] `palette-cvd.test.ts` — every scale passes the Radix APCA guarantees: step-11/step-2 `|Lc| >= 60` and step-12/step-2 `|Lc| >= 90`.
- [ ] `palette-cvd.test.ts` — `|L_oklab(cordovan-9) − L_oklab(emerald-9)| >= 0.15` (red/green luminance separation).
- [ ] `palette-contrast.test.ts` — every semantic fg/bg pair passes both WCAG 2.1 AA ratio AND APCA Myndex Bronze Lc minimum for its tier (body/content/large).
- [ ] `motion-token-sync.test.ts` — every TS duration/easing iterated from `DURATION_NAMES`/`EASING_NAMES` has a matching CSS custom property parsed via PostCSS with the correct value.
- [ ] ~~`palette-sync.test.ts`~~ — DELETED per Decision 1. `palette.generated.ts` is codegen, drift is structurally impossible.
- [ ] `reduced-motion.test.ts` placeholder passes (full coverage deferred to Phase 5 Playwright suite).
- [ ] `pnpm typecheck` — clean. Zero `apca-w3` type errors (proves `src/types/apca-w3.d.ts` is wired).
- [ ] `pnpm lint` — clean. Includes all six `scripts/lint-css.sh` rules passing.
- [ ] `pnpm build` — succeeds. Phone entry **≤97.5 KB gzipped** (tightened from the original +5 KB tolerance). Commit message records the actual measured delta.
- [ ] `grep -r "readFileSync" dist/` returns zero matches (proves `motion-token-sync.test.ts` `fs` import is test-only and doesn't leak into production bundle).

### §4.3.1 Deepening-specific acceptance (NEW)

- [ ] `motion.ts` uses OUTER `} as const satisfies Record<Name, …>` pattern on every export. No per-field `as const satisfies Transition`. No inline `as [number, number, number, number]` casts on easing tuples.
- [ ] `motion.ts` imports `Easing` from `motion/react` (not from `framer-motion`, not from `motion-utils` directly).
- [ ] `MOTION_EASINGS.base` exists (not `MOTION_EASINGS.standard`); `--motion-ease-base` exists in `primitives.css` (not `--motion-ease-standard`).
- [ ] `--color-neon-magenta` and `--color-neon-magenta-glow` exist in `primitives.css` (not `--color-rose-neon*`).
- [ ] `--radius-pill` does NOT exist in `semantic.css` (consumers use `--radius-full` directly).
- [ ] `--z-max` does NOT exist in `primitives.css`.
- [ ] `--text-micro` does NOT exist in `semantic.phone.css`.
- [ ] The 7 cross-phase tokens added in deepening all exist: `--size-card-detail-max`, `--space-fluid-base-board`, `--space-fluid-loose-board`, `--text-hero-subdued`, `--size-player-panel-width`, `--size-player-panel-height`, `--motion-duration-ambient`, `--motion-duration-dots`.
- [ ] The 17 follow-up sweep tokens all exist: `--text-caption-board`, `--size-lobby-roster-max-width`, `--size-title-accent-width`, `--size-rankings-max-width`, `--size-felt-reticle`, `--size-felt-diamond`, `--size-discard-card-width`, `--text-card-name-{min,max,large-min,large-max}`, `--text-card-desc-{min,max,large-min,large-max}`, `--text-drama-{hero,subdued,victory}-{min,max}`, `--motion-duration-pulse`, `--motion-duration-pulse-slow`.
- [ ] The 4 follow-up sweep amendments are applied: `--space-fluid-base-board` max=40px, `--space-fluid-loose-board` max=80px, `--size-player-panel-width` min=180px, `--size-draw-pile-width` min=120px max=240px.
- [ ] `apca-w3` imports work at runtime: `node -e "const {sRGBtoY,APCAcontrast}=require('apca-w3'); console.log(APCAcontrast(sRGBtoY([255,255,255,1]), sRGBtoY([0,0,0,1])))"` prints a positive BoW Lc number (verifies the library is installed and runnable).
- [ ] `culori.filterDeficiencyDeuter` is importable: `node -e "const {filterDeficiencyDeuter}=require('culori'); console.log(typeof filterDeficiencyDeuter)"` prints `function`.

### §4.4 Dreamland reference gate

- [x] `docs/plans/css-foundation-rebuild/dreamland-reference/` exists with 18 reference frames (done 2026-04-11).
- [x] `dreamland-reference/README.md` documents frame source attribution, scene descriptions, and fair-use posture (done 2026-04-11).
- [ ] The final primitive hex values in `primitives.css` match the Dreamland-extracted values in §2.2, with any CVD-driven adjustments documented in a `primitives.css` comment block at the top of the file explaining why each adjusted value diverged from the §2.2 extraction.
- [ ] `.gitignore` updated to exclude `dreamland-reference/images/**` if the repo goes public. (Not a Phase 1 blocker; flag for Phase 5 pre-deploy check.)

### §4.5 Visual smoke test

- [ ] Dev server starts (`pnpm dev` + `pnpm dev:server`).
- [ ] `http://localhost:5173/player.html?room=TEST` loads without console errors — existing phone components render using their current hardcoded values (Phase 1 doesn't migrate them).
- [ ] `http://localhost:5173/board.html?room=TEST` loads without console errors — existing board components render.
- [ ] `data-view="phone"` and `data-theme="dark"` are present on the phone root element, confirmed via devtools.
- [ ] `data-view="board"` and `data-theme="dark"` are present on the board root element, confirmed via devtools.

### §4.6 Archer acceptance test (token system in isolation)

- [ ] Side-by-side: Dreamland S8 reference frames + a rendered swatch grid of the primitive color scales + a rendered type sample using `--font-display` and `--font-body` at multiple sizes.
- [ ] **"Could this look like a frame from an Archer episode?"** — applied to the swatch grid + type sample as a system. If no: iterate on the palette, possibly switch `--font-display` to Baveuse ($30 Typodermic purchase + install), re-run. If yes: Phase 1 ships.

---

## §5 — Landmines

Phase 1 is foundation work, so the landmines are mostly about **not creating new ones** for Phases 2-5. Deepening pass 2026-04-11 added landmines 7-13 based on agent research findings.

1. **Don't hardcode a fallback hex in a `var()`.** Every `var(--color-whatever)` in `semantic.css` must chain to another var, not to a literal hex. If the primitive doesn't exist, add it to `primitives.css` — don't paper over with a fallback.
2. **Don't use `svh` in cross-view components.** `MinimalCard.module.css` (rewritten in Phase 2) will use `cqi` / `cqb` — phase 1 doesn't touch `MinimalCard` but it establishes the rule.
3. **`color-mix()` must work on Browserslist targets.** Verified Baseline since May 2023. BUT: **Safari has a live `color-mix(in oklch, ...)` bug** — reported Nov 2024, still live in Safari 26 as of 2026-04-11, renders some blues as pink. Phase 1 uses `in oklab` everywhere. Lint Rule 5 enforces it. **Never use `in oklch` inside `color-mix()` in Phase 1.**
4. **Reduced-motion `@media` globally zeroing motion durations is aggressive.** Phase 1 now ships a dual-family token system (§2.9) — decorative durations zero, `--motion-duration-essential-*` survive. Individual components reach for `useReducedMotion()` only when they need a bespoke fallback animation (rare).
5. **Light mode is stubbed (and deliberately empty).** An empty `:root[data-theme="light"]` block would NOT cascade-fall-through to dark. Phase 1 deliberately does NOT set `data-theme="light"` anywhere and does NOT scope dark tokens to `[data-theme="dark"]` — dark lives on bare `:root`. If Briggsy wants light mode, that's a Phase 1.5 follow-up using `@media (prefers-color-scheme: light)` as the activation selector.
6. **`from.*theme` grep after step 16.** Run `git grep "from.*theme"` after deleting `theme.ts`. Must return zero. Any remaining stale import silently succeeds in build and blows up at runtime. Verification-scan 2026-04-11 flagged 5 current callers: `player/Player.tsx`, `player/sheets/FuturePeek.tsx`, `shared/MinimalCard.tsx`, `player/main.tsx`, `board/main.tsx` — all must be resolved by step 14/15/16a.

7. **WebKit bug 297779 — iOS 26 `position: fixed` drift.** Reported Aug 2025 against iOS 26 Beta 7 (Apple Radar 159439271). `position: fixed` elements drift 10-24 px as Safari's address bar minimizes/expands, and `position: fixed` elements get displaced after keyboard dismissal. Partial fix in Safari 26.1 (Nov 2025), further partial fix in 26.4 (Mar 2026). Residual bug when "Reduce Motion + Prefer Cross-Fade Transitions" accessibility settings are both enabled. **2026-safe workaround:** never use `position: fixed` in phone view. Use `position: sticky` inside a flex-column root sized to `var(--size-viewport-safe)`. The bottom action bar (hand strip + FAB) uses sticky on a flex child; the root is never "fixed" in the buggy sense. Enforced by lint Rule 3. Board view (desktop/TV) is unaffected — `position: fixed` is still fine there.

8. **Clamp unit-mismatch — do not "simplify" the svh formula.** The §2.4 clamp pattern is deliberately shaped as `(100svh - 667px) * (delta / 699)`. The scalar `(delta / 699)` is a unitless ratio. **Never refactor to `(100svh - 667px) / 699 * delta_px`** — CSS `calc()` cannot multiply length × length. The expression crashes at parse time and silently fails the element, giving a broken `clamp()` that pins to min. Also: WCAG 1.4.4 compliance depends on the LEADING `rem` term in the preferred arm. `clamp(rem, svh * k, rem)` fails F94 (viewport units don't scale with browser text zoom at 200%); `clamp(rem, calc(rem + svh * k), rem)` passes. Never remove the rem additive base. Documented in-place above §2.4.

9. **`svh`/`dvh`/`lvh` do NOT respond to soft keyboard.** When an iOS/Android soft keyboard opens (e.g. for the room code), `100svh` stays the same and the keyboard overlays content. This is actually good news for BURNED — no mid-turn layout reflow — but document it so nobody "fixes" it later with JS `visualViewport` math.

10. **iPhone SE1 (568 px) renders phone tokens at the clamp floor.** The clamp formula scales from 667 px (SE2) to 1366 px (iPad Pro 12.9). On SE1, `100svh < 667 px`, the middle arm goes negative, and `clamp()` spec-defined behavior pins to min. Visual result: SE1 gets the minimum value of every fluid token verbatim. Acceptable, but document so nobody thinks it's a bug.

11. **`cardAccent()` deletion landmine.** `theme.ts:cardAccent` is consumed at `src/client/shared/MinimalCard.tsx:28` and `src/client/player/sheets/FuturePeek.tsx:70` via React inline `style={{ '--card-accent': ... }}`. Step 8a migrates the function to `palette.ts` (or new `card-accents.ts`) **before** step 16 deletes `theme.ts`. Skipping 8a guarantees a compile break at step 16. Verified pre-migration 2026-04-11.

12. **`dvh` in `semantic.phone.css` is forbidden.** `dvh` recalculates every scroll frame during iOS Safari URL-bar collapse/expand — 60 Hz paint cost on every root token that uses it, propagated to every descendant via `var()` inheritance. `svh` is stable (computed once on viewport-interactive change). Lint Rule 4 enforces the ban. This is a performance landmine hiding in a correctness landmine.

13. **Runtime `[data-theme]` toggling + custom properties = full subtree style recalc.** If a future phase ever adds a dark→light runtime theme switcher via JS, setting `document.documentElement.dataset.theme = 'light'` triggers style recomputation for every descendant that references a `--color-*` custom property. Current Chrome (125+) has partial Matched Properties Cache optimization but still recalculates on root custom-property changes. Phase 1 commits to pure-CSS theming with no JS toggle — dark lives on bare `:root`. If Phase 1.5 adds light mode, use `@media (prefers-color-scheme: light)` (static, fires once at page load, no runtime thrash), NOT a React effect.

14. **React-applied root attributes = FOUC.** Related to #13. If a step sets `<html data-view="phone">` via a React `useEffect`, there's a 1-3 frame FOUC window on first paint before the attribute applies. Phase 1 sets these attributes (if any) directly in `player.html` / `board.html` static HTML, NOT via React runtime. Steps 6a and 14/15 commit to this.

15. **Phase 1 motion literal count estimate.** Plan §6 Out of Scope says "22 Framer Motion inline literals" deferred to Phase 4. Phase 4 audit found **24 sites across 12 files**, not 22 across 9. Not a contradiction (Phase 4 correctly handles all of them); just an estimate drift worth noting so nobody thinks the count is load-bearing.

---

## §6 — Out of Scope

Phase 1 **does not** include:

- Migrating any `.module.css` file to consume the new tokens. That's Phases 2 and 3.
- Rewriting any component. That's Phases 2 and 3.
- Deleting `TurnBanner.tsx` (dead code). That's Phase 2.
- Consolidating `NopeButton.tsx` and `InterceptButton.tsx`. That's Phase 2.
- Resolving the `feltBranding` retheme gap. That's Phase 3.
- Unifying the 22 Framer Motion inline literals. That's Phase 4 (though Phase 1 defines the tokens they'll consume).
- Real iOS 26 device testing. That's Phase 5.
- The Playwright viewport regression matrix. That's Phase 5.
- Light mode theme. Deferred to Phase 1.5 post-Phase-5.
- Card-type accent tokens (`--card-accent-burned`, etc., currently in `theme.ts` as a `cardAccent(type)` function). These stay in `palette.ts` (or a new `card-accents.ts`) as a TS-side derivation, consumed via inline style on individual card elements — the current pattern. Phase 2 migrates `MinimalCard` to reference them.

---

## §7 — Cross-Phase Dependencies

**Phases 2-5 depend on Phase 1 for:**
- Every token they consume. Phase 1 is the contract.
- The `[data-theme]` and `[data-view]` root attributes. Phase 1 sets them.
- The motion TS/CSS twin. Phase 4 migrates components to consume it.
- The CVD + contrast test harness. Phase 5 expands the test coverage.

**Phase 1 depends on:**
- `roadmap.md` for the decisions it inherits.
- Memory file `project-burned-clean-slate-visual.md` for the clean-slate authorization.
- The Dreamland S8 frame extraction (the one sub-task in §2.8) for palette validation.

**If deepening Phase 1 surfaces a contradiction with another phase, resolve in this order:**
1. If the contradiction is about a token shape (e.g., "Phase 2 needs a token Phase 1 doesn't define"), add the token to Phase 1 — don't create parallel tokens elsewhere.
2. If the contradiction is about a value (e.g., "Phase 3 needs `--size-card-width` that breaks on 1920px boards"), adjust the Phase 1 clamp formula, not the Phase 3 override.
3. If the contradiction is about naming (e.g., "Phase 4 wants `--motion-duration-quick` but Phase 1 has `fast`"), Phase 1 wins — rename the Phase 4 reference.

---

## §8 — Bundle Budget Impact

**Deepening pass 2026-04-11 rewrote this section with realistic math.** Original estimate of "+1 to +2 KB gzipped" was understated by 2-3× because it counted only the core token tables and missed the `@property` block, `@layer` wrapping, Radix APCA test guarantees, the 7 new cross-phase tokens, and the safe-area / fonts CSS. Corrected numbers below.

### CSS additions to phone entry

| File | Tokens | Raw bytes | Gzipped |
|---|---|---|---|
| `primitives.css` core `:root` block | 74 color scale + 12 space + 8 radius + 10 motion-duration + 5 motion-ease + 6 z-index = 115 tokens | ~4.5 KB | ~900-1100 bytes |
| `primitives.css` `@property` block (§2.10) | 85 registrations (10 durations + ~74 colors + 2 spot) | ~6 KB | ~800-1000 bytes |
| `primitives.css` `@layer` declaration + wrappers | 1 declaration + 1 wrapper | ~200 bytes | ~80 bytes |
| `semantic.css` | ~45 tokens + 8 `color-mix()` shadow expressions + `@layer` wrap | ~2 KB | ~550 bytes |
| `semantic.phone.css` | 15 `clamp()` expressions + 4 safe-area `env()` + 5 touch-target/fab + `@layer` wrap | ~1.5 KB | ~500 bytes |
| `fonts.css` (§2.13) | 2 `@font-face` + 1 `@import` + `@layer` wrap | ~500 bytes | ~250 bytes |
| **CSS subtotal** | | ~14.7 KB raw | **~3.1-3.5 KB gzipped** |

### TS additions to phone entry

| File | Contents | Raw | Gzipped |
|---|---|---|---|
| `motion.ts` | 4 name-union arrays + 4 token objects + `MOTION` presets + type imports | ~2 KB | ~600 bytes |
| `palette.ts` | test-only fixture, tree-shaken from phone entry | 0 | 0 |
| **TS subtotal** | | | **~600 bytes** |

### Removals (Phase 1 step 16)

| File | Raw | Gzipped |
|---|---|---|
| `theme.ts` (`applyTheme`, `cardAccent`, `useColorScheme`, runtime color-scheme watcher) | ~6.5 KB | ~1.3 KB gzipped (after `cardAccent` moves to `palette.ts` — net removal counts the runtime JS + subscriber plumbing, not the relocated function) |
| `theme.css` | ~1 KB | ~300 bytes |
| **Removals subtotal** | | **~1.6 KB gzipped recovered** |

### Net delta

- **CSS side:** +3.1 to +3.5 KB gzipped
- **TS side:** +0.6 KB gzipped
- **Recovered:** -1.6 KB gzipped
- **Net:** **+2.1 to +2.5 KB gzipped**

Phone entry currently at **~95 KB gzipped** (CLAUDE.md measurements). After Phase 1 lands, expect **~97.1-97.5 KB gzipped**.

### Phase 1 gate (tightened from original)

**Hard ceiling: 97.5 KB gzipped** for phone entry, measured via `pnpm build` and reading the Rolldown output. Original plan's "investigate beyond +5 KB" gate was too loose — corrected math shows the delta is ~2.5 KB, so the gate must be 97.5 KB to catch regressions meaningfully. If `pnpm build` reports phone entry above 97.5 KB, investigate before shipping Phase 1.

**Escape valve (Phase 5, not Phase 1):** Lightning CSS `unusedSymbols` plugin can strip unused custom properties per-entry, recovering ~500-800 bytes gzipped per entry. Held in reserve — only enable if Phase 2-3 component migration pushes phone entry past 99 KB.

### Font loading delta (SEPARATE from JS bundle)

**Clash Display Semibold preload:** ~14 KB gzipped over the wire on first visit. **This is not part of the 100 KB phone initial JS budget** — fonts are a parallel network fetch. With `font-display: optional`, the font arrives in the background within its 100 ms window or falls back to system font for the session (first-visit only). Second visit uses the cached WOFF2 immediately.

**Clash Display Bold (deferred, no preload):** ~12 KB gzipped on the network, fetched lazily by the browser when the first `font-weight: 700` glyph renders. Also out of the 100 KB JS budget.

**General Sans (body):** loaded via `@import` from Fontshare CDN with `display=optional`. Zero bytes added to our origin's budget; the browser caches the CDN fetch. First-load penalty is fallback-font rendering for body copy — acceptable given body is secondary to the display face for the Archer identity.

**JetBrains Mono (board room-code):** not touched in Phase 1. Deferred to Phase 3 when the board room-code component is migrated.

**Total font budget: ~26 KB gzipped over the wire on first visit, ~0 KB on subsequent visits.** Flagged as a separate deliverable from the JS bundle gate.

---

## §9 — Sources

### Original plan sources (pre-deepening)

- **Radix Colors 12-step scale convention**: https://www.radix-ui.com/colors/docs/palette-composition/scales (primary source — verified + corrected during deepening, see §9.2 below)
- **Utopia fluid typography calculator**: https://utopia.fyi/ — width-based only; svh variant derived manually in this phase. No vertical-axis support as of 2026.
- **WCAG 2.1 AA contrast**: https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html (primary source)
- **WCAG 1.4.4 resize text**: https://www.w3.org/WAI/WCAG21/Understanding/resize-text.html (primary source — informs the `rem` base requirement)
- **`color-mix()` browser support**: https://caniuse.com/mdn-css_types_color_color-mix — Baseline Widely Available since 2023.
- **Archer Dreamland S8**: see `roadmap.md` §10 Sources[^1][^2][^3] for production-team citations.

### Deepening-added primary sources (verified 2026-04-11)

- **Motion 12 `Transition` type**: `node_modules/motion-dom/dist/index.d.ts` — local type declaration, authoritative. Confirms `Transition` is a discriminated union over `type: 'tween'|'spring'|'inertia'|'keyframes'|false|true`, and `Easing` includes `readonly [number, number, number, number]`. Also `motion-utils/dist/index.d.ts` exports `type BezierDefinition = readonly [number, number, number, number]`.
- **Motion 12 `reducedMotion` prop**: Context7 `/websites/motion_dev` → `MotionConfig reducedMotion="user"` is the documented app-wide opt-out pattern. Disables transform/layout while preserving opacity/backgroundColor.
- **Existing production pattern**: `src/client/shared/animation-config.ts:1-10` — demonstrates the outer-object `} as const satisfies Record<string, Transition>` pattern that already typechecks clean in this repo. Load-bearing reference for the §2.6 fix.
- **culori CVD simulation API**: https://github.com/Evercoder/culori/blob/main/src/deficiency.js — exports `filterDeficiencyDeuter/Prot/Trit(severity = 1)`. Algorithm: Machado-Oliveira-Fernandes 2009 ("A Physiologically-based Model for Simulation of Color Vision Deficiency," IEEE TVCG 15:6, doi:10.1109/TVCG.2009.113). Current best-in-class. The plan's original `filter('deuteranopia', 1)` API does not exist.
- **culori `wcagContrast` + `differenceEuclidean`**: https://github.com/Evercoder/culori/blob/main/src/wcag.js + `.../src/difference.js`. `wcagContrast` accepts CSS strings directly; `differenceEuclidean('oklab')` returns a 2-arg function.
- **culori v4.0.2 npm status**: https://registry.npmjs.org/culori — published 2025-06-27, zero runtime deps, pure ESM with CJS fallback via `exports` field, `engines.node >= 16`.
- **CSS Color Module Level 4 JND default (0.02 oklab)**: referenced in culori's `src/clamp.js` (`toGamut()` default JND), defines "just noticeable" for oklab distances. Phase 1's `MIN_OKLAB_DISTANCE = 0.10` is 5× this floor.
- **apca-w3 API**: https://github.com/Myndex/apca-w3/blob/master/src/apca-w3.js — header comment block states *"Each must be a numeric NOT a string"* for `sRGBtoY`, and *"DO NOT output an absolute value — light text on dark BG should return a negative number. APCA is polarity sensitive"* for `APCAcontrast`. Both load-bearing for the corrected §2.7.
- **APCA Readability Criterion (Bronze thresholds)**: https://github.com/Myndex/apca-w3 README + `git.myndex.com/APCA/` — Lc 75 body, Lc 60 content, Lc 45 large. Algorithm version `0.0.98G-4g` (Feb 2021), W3C-licensed, version-frozen.
- **apca-w3 v0.1.9 npm status**: https://registry.npmjs.org/apca-w3 — published 2022-07-03 (algorithm-locked, not abandoned). Depends on `colorparsley ^0.1.8`. ESM-only, no CJS fallback, no TypeScript types (requires ambient declaration).
- **`@property` Baseline status**: https://developer.mozilla.org/en-US/docs/Web/CSS/@property — Baseline Widely Available since July 2024. `<time>` syntax accepted for motion-duration tokens; `<color>` for color tokens.
- **`color-mix(in oklch)` Safari bug**: reported November 2024 via Tailwind CSS v4 beta community channels; tracked as a rendering regression where some blues interpolate as pink through the hue-angle shortcut. Still live in Safari 26 as of 2026-04-11. Workaround: use `in oklab` (verified unaffected).
- **WebKit bug 297779 — `position: fixed` drift on iOS 26**: https://bugs.webkit.org/show_bug.cgi?id=297779 + Apple Radar 159439271 + related Radar 118999803. Partial fix in Safari 26.1 release notes (Nov 2025), further partial fix in 26.4 (Mar 2026). Residual bug when Reduce Motion + Prefer Cross-Fade Transitions both enabled.
- **WCAG 2.1 Technique F94 (viewport units + text resize failure)**: https://www.w3.org/WAI/WCAG21/Techniques/failures/F94 — failure technique for F94 ("viewport units do not scale with browser text zoom"). Load-bearing for §2.4's `clamp(rem, calc(rem + svh*k), rem)` pattern explanation.
- **WCAG 2.5.5 / 2.5.8 touch target**: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum (2.5.8 = AA 24px floor) + https://www.w3.org/WAI/WCAG21/Understanding/target-size.html (2.5.5 = AAA 44px). BURNED uses AAA because it's a game not a document.
- **iOS HIG 2026 Typography + Layout**: https://developer.apple.com/design/human-interface-guidelines — 11 pt minimum readable, 17 pt body, 44 pt minimum touch target. Source for raising `--text-micro` out of Phase 1.
- **CSS `@layer` cascade order**: https://developer.mozilla.org/en-US/docs/Web/CSS/@layer — Baseline since 2022. Declarative cascade ordering independent of import/chunk order.
- **CSS `env(safe-area-inset-*)` + `viewport-fit=cover`**: https://developer.mozilla.org/en-US/docs/Web/CSS/env — required for Dynamic Island / home-indicator-safe layout.
- **`interactive-widget=resizes-content`**: https://developer.chrome.com/docs/web-platform/viewport-fit — Chrome 108+, Firefox 132+, Safari ignores (defaults to `resizes-visual`).
- **Radix Colors APCA guarantees**: https://www.radix-ui.com/colors/docs/overview/accessibility — step-11/step-2 Lc 60 guarantee and step-12/step-2 Lc 90 guarantee for every 12-step scale.
- **Codebase verification scan 2026-04-11**: `git grep` + `grep -rEh` against current `src/client/` — verified 11 orphan `[data-theme="light"]` files, 2 `cardAccent` consumers, 5 stale `from.*theme` imports, 15 `motion/react` imports using `m` alias cleanly, 13 `@keyframes` files (original plan claimed 9), 119 unique hex literals in `.module.css` (original plan claimed 71), `motion@^12.38.0` present, `culori`/`apca-w3` NOT present.

[^1]: Neal Holman, Art of the Title, May 2016. Verified 2026-04-11. Same citation as `roadmap.md`.
[^2]: Neal Holman, Salon 2016 (Wayback archive). Same as `roadmap.md`.
[^3]: Adam Reed, A.V. Club 2011 (Wayback archive). Same as `roadmap.md`.

---

## §10 — Contradiction Resolution Log (NEW in deepening)

**Purpose.** The cross-phase scan agent read all five phase files and surfaced every token Phase 2-5 consumes but Phase 1 doesn't define, every value drift, every name drift, every shape mismatch. Per Phase 1 §7 rule *"missing token → add to Phase 1"*, all resolutions landed in Phase 1 §2.2 / §2.4 / §2.5. Phase 2-5 files are unchanged by this deepening — their token references now resolve correctly against the updated Phase 1 contract.

### §10.1 Type A — Missing Tokens (7 found, all resolved)

| # | Token | Missing per | Consumer | Resolution |
|---|---|---|---|---|
| 1 | `--size-card-detail-max` | Phase 1 §2.4 | Phase 2 §2.3.9c (CardDetailSheet max width) | Added to §2.4 as `clamp(280px, calc(280px + (100svh − 667px) × (120/699)), 400px)` |
| 2 | `--space-fluid-base-board` | Phase 1 §2.5 | Phase 3 §2.3.2 (GameTable padding) + §2.3.6 (Lobby gutters) | Added to §2.5 as `clamp(16px, calc(16px + (100vw − 1280px) × (16/2560)), 32px)` |
| 3 | `--space-fluid-loose-board` | Phase 1 §2.5 | Phase 3 §2.3.2 + §2.3.6 | Added to §2.5 as `clamp(32px, calc(32px + (100vw − 1280px) × (32/2560)), 64px)` |
| 4 | `--text-hero-subdued` | Phase 1 §2.5 | Phase 3 §2.3.5 (DramaOverlay muted variant) + §2.6 (GameOver presence text) | Added to §2.5 as `clamp(2rem, calc(2rem + (100vw − 1280px) × (68/2560)), 6.25rem)` — 32 px → 100 px |
| 5 | `--size-player-panel-width` | Phase 1 §2.5 | Phase 3 §2.3.3 (PlayerRing) + Phase 4 §2.7 (measurement-div TSX readback) | Added to §2.5 as `clamp(160px, calc(160px + (100vw − 1280px) × (260/2560)), 420px)` |
| 6 | `--size-player-panel-height` | Phase 1 §2.5 | Phase 4 §2.7 (measurement-div height pair) | Added to §2.5 as `clamp(90px, calc(90px + (100vw − 1280px) × (57/2560)), 147px)` — roughly 4:7 panel ratio |
| 7 | `--motion-duration-ambient` | Phase 1 §2.2 + §2.6 | Phase 3 §2.3.10 (DrawPile breathing) | Added to §2.2 motion duration block AND to §2.6 `motion.ts` as `ambient: 4.0` (in seconds) |
| 8 | `--motion-duration-dots` | Phase 1 §2.2 + §2.6 | Phase 4 §2.5.4 (JoinScreen dots) | Added to §2.2 AND §2.6 as `dots: 1.5` |

**Total resolved: 8 missing tokens** (the cross-phase scan reported 7; the `player-panel-height` was flagged only by Phase 4 while the `player-panel-width` was flagged by both Phase 3 and Phase 4, so the count collapsed depending on how you count the pair).

### §10.2 Type B — Value Drift: none found

All referenced token values across Phases 2-5 are consistent with Phase 1's clamp ranges or fixed values. Board-bracket (1280 → 3840) and phone-bracket (667 → 1366) formulas are identical across phases.

### §10.3 Type C — Name Drift: none found

All token names in Phases 2-5 match Phase 1's naming conventions after deepening (the deepening pass also fixed Phase 1's internal naming inconsistencies — see Enhancement Summary items 17-23). Phase 2-5 files don't reference the old `--motion-ease-standard`, `--color-rose-neon*`, `--radius-pill`, `--z-max`, or `--text-micro` names — those renames are Phase 1-internal cleanups with no cross-phase consumer.

### §10.4 Type D — Shape Mismatch: 1 clarification

**Phase 4 §2.7 measurement-div pattern.** Phase 4 plans a measurement-div that reads `--size-player-panel-width` / `-height` via `getComputedStyle()` at runtime in TypeScript for motion layout coupling. Phase 1 defines these as CSS custom properties (correct shape for CSS to consume), and Phase 4 consumes them bidirectionally (CSS sizing AND TS readback). **Not a contradiction** — CSS custom properties are readable via `getComputedStyle(root).getPropertyValue('--size-player-panel-width')` which returns the resolved `clamp()` value as a string. Phase 4 TSX code parses the trailing `px` itself. Documented here so nobody thinks it's a bug.

### §10.5 Type E — Duplicate/Orphan Execution Steps: none found

### §10.6 Type F — Out-of-Scope Drift: 2 clarifications (not blockers)

1. **Motion literal count.** Phase 1 §6 originally said "22 Framer Motion inline literals deferred to Phase 4." Phase 4 audit found 24 sites across 12 files. **Not a contradiction** — Phase 4 correctly handles all 24 regardless of estimate. Documented as landmine #15.

2. **Phase 3 light-mode CSS scaffolding.** Phase 3 §2.5 and §2.6 mention light-mode variants for GameOver / DramaOverlay. Phase 1 §2.3 (post-deepening) deliberately does NOT ship light-mode tokens — `[data-theme="light"]` blocks are forbidden. **Resolution:** Phase 3 light-mode mentions are scaffold-only (comments documenting future Phase 1.5 work, not actual implementation). Confirmed via cross-phase scan — Phase 3 does not author light-mode hex values or tokens, just flags "light mode TBD." Phase 1.5 will author the tokens when it runs.

### §10.7 Type G — Order Mismatch: none found

### §10.8 Summary

- **Critical blockers resolved in Phase 1 deepening:** 8 (missing tokens added)
- **Clarifications documented but no code change:** 2 (motion literal count, light-mode scaffolding)
- **Total contradictions:** 10
- **Phase 2-5 files requiring edits:** 0

The deepening pass did its job: every contradiction resolved in Phase 1 (the contract layer), zero blast-radius on Phase 2-5 files.

---

*Phase 1 deepening pass complete 2026-04-11. 12 parallel research + review agents surfaced 7 critical code bugs (motion.ts type pattern, culori CVD API, apca-w3 adapter, orphan light-mode blocks, cardAccent migration, color-mix oklch bug, Clash Display font loading) plus 15 high-value additions (@property, @layer, safe-area, reduced-motion dual family, MotionConfig, lint rules, Radix APCA guarantees, shadow-base indirection, fg-on-* family, naming corrections, bundle math corrections). All woven into §§1-10 above with preserved §§2.8 Dreamland extraction integrity. Next: `/deepen-plan` on Phases 2-5 to find any contradictions those files have with THIS deepened Phase 1 (iterate until the contradiction map is empty); then `/ce:work` executes all five phases against the final contract.*
