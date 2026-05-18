---
title: "CSS Foundation Rebuild — Roadmap"
type: feat
parent: docs/PRODUCT-SPECIFICATION.md
date: 2026-04-11
status: in-progress
phases:
  - phase-1-foundation.md               # completed 2026-04-12
  - phase-2-phone-view-migration.md     # completed
  - phase-3-board-view-migration.md     # completed 2026-04-22
  - phase-4-motion-consolidation.md     # completed 2026-04-22
  - phase-5-verification-acceptance.md  # deepened — active work
  - phase-5-cvd-followup.md             # in-progress — Options A + C landed 2026-05-06; §2.5 #1/#2/#3 + residuals pending
---

# CSS Foundation Rebuild — Roadmap

> *This is the parent document for the CSS Foundation Rebuild. It captures the research, the decisions, and the phase breakdown. The five phase files inherit their quality bar and token contract from this document. When a phase file disagrees with the roadmap, the roadmap wins unless the roadmap is demonstrably wrong — in which case we update the roadmap.*

**Mission.** Replace BURNED's visual layer with a shared design token system that lets every screen pass the §2.2 Archer acceptance test: *"Could this look like a frame from an Archer episode?"* Clean slate on the visual layer; game logic, protocol, server, tests, and Framer Motion library choice all survive untouched.

---

## §1 — Why This Exists

### The autopsy finding

BURNED's game layer is solid (167/167 tests at plan-authoring time 2026-04-11; current count in `TODO.md` §1, clean protocol, Framer Motion discipline clean, MinimalCard using container queries correctly). The **visual layer is the only broken surface**, and it's broken in exactly one way: **there is no real token system.** Per the codebase audit (2026-04-11):

- **2,845 LOC** across 33 CSS files.
- **123 unique hex colors** across the codebase — 52 in `theme.ts`, **71 literal hex sprinkled across `.module.css` files**. Many are stale fallbacks from the old UMB noir palette, quietly disagreeing with the current runtime values.
- **44 unique padding values, 15 unique margins, 10 unique gaps, 35 unique font-sizes, 14 unique border-radii, 30+ unique box-shadows, 13 unique z-indices.** No rhythm, no scale, no coordination.
- **Zero scales** for typography, spacing, sizing, elevation, motion, or z-index. The entire shared-token layer is 11 color semantic roles + 20 raw accents + `--spacing-card: 8px` + `--radius-card: 8px`. That's it.
- **Two phone-view axis violations** (`StagingArea.module.css:43` uses `42vw`, `Hand.module.css:49` uses `100vw`) and **three board-view axis mixes** (one of them, `GameTable.module.css:6`, uses `3vh 4vw` in a single declaration).
- **Three parallel animation systems with zero shared tokens:** Framer Motion (16 files), GSAP (2 files), CSS `@keyframes` (9 files).
- **Six board files mix `@media (min-width: 1280px)` hard-pixel doubling WITH `clamp(...vw...)`.** Two competing scaling strategies inside the same file.

### The superseded art-direction doc's damning diagnostic

From `docs/ideation/2026-04-11-visual-layer-autopsy.md`, the most important line for this rebuild:

> *"CSS Modules without shared tokens = organized chaos. The encapsulation creates an illusion of architecture."*

BURNED has the illusion. UMB had the reality. UMB's Phase 4 plan embedded the token system as deliverables — colors as CSS custom properties, spacing scale with `clamp()`, typography scale with `clamp()`, animation timing hooks — **before any component CSS was written.** BURNED went from sketch → code and never got the foundation.

This rebuild is not a refactor. It's a replacement of the visual layer, informed by everything UMB got right and everything the current codebase got wrong.

### What "clean slate" means

Per Briggsy's explicit authorization on 2026-04-11 (persisted in memory as `project-burned-clean-slate-visual.md`):

- **In scope for replacement:** every CSS module, every hardcoded color, every hardcoded dimension, every hardcoded animation timing, the entire `theme.css` + `theme.ts` token surface, every motion inline literal.
- **Out of scope (survives untouched):** game logic (`src/server/game/`), protocol (`src/shared/protocol.ts`), Zod validation, state projection, tests, Cloudflare infrastructure, Framer Motion library choice (ADR-04), CSS Modules library choice, Vite 8 build config.
- **Surviving patterns worth preserving as models:**
  - **Framer Motion `m` discipline.** Zero leaks to full `motion` component across 16 files. `LazyMotion` + `domMax` configured correctly in `MotionProvider.tsx`. This is the one piece of the visual layer that's architecturally correct.
  - **`MinimalCard.module.css` container-query pattern.** Uses `cqi` across 8 sites for intrinsic card scaling. This is the model for cross-view components that must work on both phone and board without knowing which one they're in.
  - **`animation-config.ts` TS-as-motion-source template.** Under-consumed today (only 7 of 22 Framer Motion transition sites reference it), but the *pattern* is correct and will grow into the motion token layer.

---

## §2 — Quality Bar (inherited from spec §2)

**Mission line.** *"BURNED is indistinguishable from a commercial party game released by a real studio — Jackbox-easy to pick up, Archer in tone and look, stunning on every screen."*

**Acceptance test (applied to every screen, card, button, modal, transition state).** *"Could this look like a frame from an Archer episode?"* Binary yes/no. Yes = ship it. No = fix it or cut it.

**First-time player reaction (§8.7, the final quality gate).** *"Wait — did Archer and company release this?"* — not *"cool, you built this?"* We're aiming for **mistaken-for-commercial**, not *"nice work for a hobbyist."*

This quality bar is transitively enforced: the roadmap inherits it from the spec; every phase file inherits it from the roadmap; every acceptance criterion in every phase resolves to "could this look like a frame from Archer?" When a phase's plan says "build component X with styling Y," the implicit "and it must pass the Archer test" is carried through without being re-stated — same pattern that made UMB's Phase 4 and Phase 5 work.

---

## §3 — Visual Reference

### §3.1 Verified influences (inherited from spec §3.6)

> **Migrated 2026-05-09.** The verified-influences table (Saul Bass, Kirby/Ditko, Mad Men, 1960 Bond, OSS 117, Pink Panther, deliberate anachronism) and the synthesis derived from it are product-DNA — they live in `docs/PRODUCT-SPECIFICATION.md` §3.6 with their primary-source footnotes. This roadmap inherits them.

**Implementation note (footnote pattern).** Spec §3.6's `[^N]` inline-citation pattern (every external reference that could be mistaken for a hallucination gets a numbered footnote, Sources section names the primary source) is a proof-of-shape. If it survives the first-time-player test, formalize as a project-wide doc-standard.

### §3.2 (merged into spec §3.6)

> **Removed 2026-05-09.** Synthesis of the verified influences moved to spec §3.6 alongside the citations table. No standalone content here.

### §3.3 Palette implementation (inherited from spec §3.7)

> **Migrated 2026-05-09.** The Season 8 Dreamland reference-season decision and the "inspired by, not licensed from" honest-scoping rule live in spec §3.7. The "teal and orange is fan vocabulary" warning also lives there.

**Phase 1 implementation:**
- Frame-extract observed colors from representative Season 8 Dreamland stills.
- Label every extracted color as `observed from S8E01 @ 12:34` (or similar timestamp anchor) — per spec §3.7's honest-scoping rule, no extracted palette becomes "Archer's official palette" in any BURNED doc.
- Run all fg/bg pairings through the CVD (color-vision-deficiency) verification gate before they enter the token system.

### §3.4 Typography

**Display face: Clash Display (current) — Baveuse (deferred evaluation).**

The verified Archer title font per Agent B's research is **Baveuse** (Ray Larabie / Typodermic Fonts, ~$30), but confidence is medium (Fonts In Use + community consensus, no Holman quote). **Decision 2026-04-11: start Phase 1 with the currently-loaded Clash Display** (Indian Type Foundry / Fontshare, free, already installed). Clash Display is geometric, bold, display-weight, and lives in the same genre as Baveuse — plausibly close enough that the §2.2 Archer test may pass on it.

**Phase 1 visual review is the Baveuse decision gate.** If Phase 1's initial render against Dreamland reference stills shows Clash Display failing the Archer test, Baveuse is a one-line swap — the token abstraction (`--font-display`) means every consuming component updates transparently. The $30 license is a Phase 1 budget item, not a pre-commit. TODO.md carries this as a pending decision so it doesn't evaporate.

**Body face: General Sans** (Indian Type Foundry / Fontshare, already loaded, free). Agent B could not find an authoritative attribution for Archer's lower-third / location-card / episode-intertitle fonts. Keeping General Sans because:
- It's geometric and clean — pairs with both Clash Display and (if we switch) Baveuse.
- It's already loaded, zero bundle impact.
- It's a neutral modern sans that doesn't fight the display face for attention.
- Same deferred-evaluation gate: if Phase 1 visual review flags it, swap it in Phase 1 before later phases lock around it.

**Mono face: JetBrains Mono** (board-only, for the room code). Keep. No reason to change.

**Action item — Briggsy:** order *The Art of Archer* (Neal Holman, Dey Street / HarperCollins, 2016, ISBN 978-0062441010) when convenient. $15–25 on Amazon. It may or may not contain palette specs not in any interview. If it arrives before Phase 1 ships, cross-reference; if after, we adjust in a follow-up. I can't place the order myself — no tool available — so this one step is on your desk or Harry's.

### §3.5 Form factors (inherited from spec §3.4)

Two form factors, two scaling axes, no mixing.

**Phone controller (`src/client/player/`)** — portrait only, 5.5" phone → 13" iPad Pro in portrait.
- **Constraining axis: HEIGHT.**
- **Primary unit: `svh`** (small viewport height — stable across iOS Safari URL-bar auto-hide).
- **Not `vh`** (breaks on iOS during URL bar collapse), **not `dvh`** (causes mid-scroll shimmering per Agent C's research), **not `vw`** (wrong axis).
- Width is centered with `max-width` cap; excess horizontal space becomes margin.

**Shared screen (`src/client/board/`)** — landscape only, 13" laptop → 65" TV.
- **Constraining axis: WIDTH.**
- **Primary unit: `vw`** for root-level scaling, **`cqw`/`cqi`** for component-local container queries (used today by MinimalCard, the one correctly-architected file).
- Height uses full available.

**Cross-view components (`src/client/shared/`):**
- **Axis-independent tokens only** — colors, font families, border-radii, motion timings, z-index.
- **No viewport units in dimensional sizing** — use container queries (`cqi`/`cqb`) so the component sizes itself from its parent without knowing whether it's on phone or board.
- **MinimalCard.module.css is the model** — it uses `cqi` correctly for every dimensional clamp.

### §3.6 Recurring design motifs (cross-phase)

> **Moved 2026-05-09.** The Phrasing! cadence contract migrated to `docs/PRODUCT-SPECIFICATION.md` §3.5 — it's product-DNA tone direction, not CSS plan-time research. Cadence target was also revised to **abundance, not restraint** (away from the original "3-5 distinct beats total" cap). Spec is the source of truth; phase plans inherit. The shipped beats catalog lives in spec §3.5; the rotating wire-report pool lives in `BURNED_PHRASING_POOL` in `src/client/shared/DramaOverlay.tsx`. (Original TODO §6 pointer retired 2026-05-17 when that section was found never to have existed; replaced here too.)

---

## §4 — Technical Foundation (from best-practices research, 2025-2026)

### §4.1 Two-layer token system (the 2026 consensus)

Every mature design system surveyed (Radix, shadcn/ui, Material 3, Carbon, Primer, Tailwind, Linear, Stripe) uses a two-layer token system:

1. **Primitives layer** — raw values, named by what they are (`--color-teal-500`, `--size-4`, `--duration-200`).
2. **Semantic layer** — role-based names that consume primitives (`--color-bg-surface: var(--color-teal-950)`, `--color-fg-danger: var(--color-red-500)`).

Components **only consume semantic tokens**. This keeps the primitive layer swappable (change a palette → all semantic tokens update → every component updates transparently) and enforces consistency at the semantic layer (two components that both need a "danger" accent consume the same token; they cannot drift independently).

**Token naming convention:** role-based semantic (`--color-bg-danger`, not `--alert-bg-red`). Foreground/background pairs for every semantic role as cheap contrast insurance (`--color-fg-danger` + `--color-bg-danger`). This is the Radix / Material 3 convention.

### §4.2 File structure

```
src/client/shared/tokens/
├── primitives.css              ← raw values (colors, sizes, durations)
├── semantic.css                ← axis-independent semantic tokens (colors, fonts, radii, motion)
├── semantic.phone.css          ← phone-view dimensional semantics (svh-based)
├── semantic.board.css          ← board-view dimensional semantics (vw/cqw-based)
└── motion.ts                   ← TypeScript-first motion tokens (Framer Motion consumers)
```

Imported once each by the phone and board entry points:
- `src/client/player/index.tsx` imports `primitives.css` + `semantic.css` + `semantic.phone.css`.
- `src/client/board/index.tsx` imports `primitives.css` + `semantic.css` + `semantic.board.css`.
- `motion.ts` is imported by any component using Framer Motion.

**No JS-applied theme.** Current `theme.ts` runs `applyTheme()` at boot via `document.documentElement.style.setProperty(...)`. We're replacing that with pure-CSS custom properties on `:root[data-theme="dark"]` / `:root[data-theme="light"]` selectors. Reasoning: less JS, lighter bundle, cleaner architecture, no race between first paint and `applyTheme()` execution. Theme toggle becomes a single attribute flip instead of a JS call. Removes ~30 LOC of boot-time work from the phone bundle.

**Skip Style Dictionary, skip CSS-in-JS, skip Tailwind.** Hand-authored CSS custom properties + CSS Modules is the right fit for Vite 8 + existing tooling. No additional build step.

### §4.3 Motion token twin pattern (critical finding from Agent C)

**Framer Motion's `transition.duration` expects a Number, not a string.** You **cannot** write `transition={{ duration: 'var(--motion-duration-base)' }}` — Framer Motion will silently fail to parse it. (Confirmed against current Motion 11 docs.)

**The correct pattern** is to store motion tokens in a TypeScript object AND mirror them as CSS custom properties. Two surfaces, one source of truth:

```typescript
// src/client/shared/tokens/motion.ts
export const MOTION_DURATIONS = {
  instant: 0.1,
  fast: 0.15,
  base: 0.25,
  slow: 0.4,
  dramatic: 0.8,
} as const satisfies Record<string, number>;

export const MOTION_EASINGS = {
  standard: [0.4, 0, 0.2, 1],       // Material Standard
  emphasized: [0.2, 0, 0, 1],        // Material Emphasized
  decelerate: [0, 0, 0.2, 1],        // ease-out, for elements entering
  accelerate: [0.4, 0, 1, 1],        // ease-in, for elements exiting
  spring_snappy: { type: 'spring', stiffness: 300, damping: 24 } as const,
  spring_deliberate: { type: 'spring', stiffness: 250, damping: 25 } as const,
} as const;

// Mirrored as CSS custom properties for plain-CSS consumers
// Generated inline via a `<style>` tag in MotionProvider, OR authored in semantic.css
```

```css
/* src/client/shared/tokens/semantic.css */
:root {
  --motion-duration-instant: 100ms;
  --motion-duration-fast: 150ms;
  --motion-duration-base: 250ms;
  --motion-duration-slow: 400ms;
  --motion-duration-dramatic: 800ms;

  --motion-ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
  --motion-ease-emphasized: cubic-bezier(0.2, 0, 0, 1);
  --motion-ease-decelerate: cubic-bezier(0, 0, 0.2, 1);
  --motion-ease-accelerate: cubic-bezier(0.4, 0, 1, 1);
}
```

Framer Motion components read from the TS object. CSS `transition` / `@keyframes` read from the custom properties. Values match because they're authored side-by-side with the same names.

**Runtime check in Phase 4:** a unit test that imports `motion.ts` and walks the CSS `semantic.css` file to verify every TS token has a matching CSS mirror with the correct value. This prevents drift between the two surfaces.

### §4.4 Fluid sizing formulas

**Phone view (svh-based, constraining axis HEIGHT):**

Utopia's canonical fluid-typography calculator only supports **width-based** clamps. For phone's height axis, we derive the formula manually. Using small phone (`375×667`) → large tablet portrait (`1024×1366`) as the size pair:

```
font-size: clamp(
  {min-rem},
  calc({min-rem} + ({max-px - min-px} / {large-svh - small-svh}) * 1svh),
  {max-rem}
)
```

Worked example for a body text token, 14px → 18px across 667svh → 1366svh viewport heights:

```
--text-body-phone: clamp(
  0.875rem,                              /* 14px floor */
  calc(0.875rem + (4 / 699) * 1svh),     /* fluid midsection: adds 4px over 699svh */
  1.125rem                                /* 18px ceiling */
);
```

**Always include the `rem` base in the preferred value.** Pure `svh` or pure `vw` fails WCAG 1.4.4 (text resize must work at 200% zoom). The `rem` base makes the value respond to user zoom.

**Board view (vw-based, constraining axis WIDTH):**

Standard Utopia formula, from 1280px (small laptop) → 2560px (4K reference):

```
--text-body-board: clamp(
  1rem,                                  /* 16px floor */
  calc(1rem + (8 / 1280) * 100vw),       /* fluid midsection */
  1.5rem                                 /* 24px ceiling */
);
```

**Cross-view components:** use container queries (`cqi` for inline-axis intrinsic sizing). MinimalCard's existing pattern is the model.

### §4.5 CVD verification (automatic, not discipline)

**Decision: CVD verification becomes a Vitest CI gate, not a review discipline.** Agent C found that `culori` supports deuteranopia/protanopia/tritanopia simulation via the Brettel-Viénot-Mollon algorithm (the canonical one) as well as Machado-Oliveira-Fernandes (newer, more perceptually accurate). `chroma-js` does NOT do CVD simulation — common misconception.

```typescript
// src/shared/tokens/__tests__/palette-cvd.test.ts
import { describe, it, expect } from 'vitest';
import { differenceEuclidean, formatHex, parse, filter } from 'culori';
import { COLORS } from '../palette.ts';

const deuteranopia = filter('deuteranopia', 1);
const protanopia = filter('protanopia', 1);
const tritanopia = filter('tritanopia', 1);

describe('palette CVD legibility', () => {
  const criticalPairs = [
    ['bg-danger', 'bg-success'],        // red vs green — most common CVD failure
    ['bg-accent', 'bg-warning'],        // amber vs orange
    ['turn-active', 'turn-inactive'],   // game-critical state distinction
  ];

  for (const [a, b] of criticalPairs) {
    for (const sim of [deuteranopia, protanopia, tritanopia]) {
      it(`${a} vs ${b} remains distinguishable under ${sim.name}`, () => {
        const simA = sim(parse(COLORS[a]));
        const simB = sim(parse(COLORS[b]));
        const distance = differenceEuclidean('oklch')(simA, simB);
        expect(distance).toBeGreaterThan(0.15);  // threshold TBD in Phase 1
      });
    }
  }
});
```

**This is a CI gate.** Every palette change runs through every critical pair in every CVD simulation. No more "I think it looks OK on my screen" — if the distances fail, the PR fails.

**Complementary check: WCAG + APCA contrast.** Radix Colors has publicly moved from WCAG 2.x to APCA for contrast calculation (APCA better models perceptual contrast than WCAG's luminance formula). But WCAG 2.x remains the legal compliance baseline. **Phase 1 adds BOTH tests** — WCAG for legal, APCA for truth — and any failure on either blocks merge.

**No automated check for "color is not the sole carrier of meaning."** Agent C confirmed there is no mature lint rule for this. It remains a review discipline enforced in each phase's acceptance criteria.

### §4.6 Known landmines for 2026

From Agent C's 2025-2026 best-practices research:

- **iOS 26 broke `position: fixed` and `position: sticky`** (partially fixed in 26.1, still flaky). This is the exact pattern BURNED uses for persistent chrome on the phone view (TitleBar, StatusBar, floating InterceptButton). **Phase 5 gates visual lock on real iOS 26 device testing** — no shipping to prod until confirmed working on real hardware.
- **`dvh` causes mid-scroll shimmering.** `BottomSheet.module.css` currently uses `max-height: 80dvh` — fix to `svh` in Phase 2.
- **iPad portrait "huge phone" problem.** Tablets in portrait hit desktop breakpoints if not explicitly capped. Phone root gets `max-width` + `@media (pointer: coarse)` explicit targeting.
- **Browser zoom + clamp() + pure vw = WCAG 1.4.4 failure.** Always include a `rem` base in the preferred value so text responds to user zoom at 200%.
- **In-app WebView viewport unit quirks.** Not currently a scope for BURNED (we're browser-first, not PWA-embedded), but worth noting in the plan so future work doesn't trip it.

---

## §5 — Token Taxonomy (shape, not final values)

Final values are in Phase 1's plan file. The roadmap commits to the *shape*.

### §5.1 Color primitives (Dreamland-inspired)

Proposed scale shape (Radix-style 12-step scales per hue):

- **Teal scale** (1-12) — deep teal-greens for backgrounds, surfaces, dark chrome.
- **Ochre scale** (1-12) — burnt oranges, ambers, accent warmth.
- **Cream scale** (1-12) — rich creams for text, highlights, paper-like surfaces.
- **Charcoal scale** (1-12) — deep warm charcoals for UI chrome.
- **Cordovan scale** (1-12) — burnt reds for danger, Burned card, intercept alerts.
- **Emerald scale** (1-12) — muted greens for success, Intercept confirmation (CVD-verified against Cordovan).

Per-scale: 12 steps, numbered 1 (lightest) → 12 (darkest), following Radix convention. Phase 1 commits to actual hex values after frame-extracting from S8 Dreamland reference stills.

### §5.2 Semantic color tokens

Role-based, with fg/bg pairs:

```
Backgrounds & surfaces:  --color-bg-app, --color-bg-surface, --color-bg-elevated, --color-bg-overlay, --color-bg-interactive, --color-bg-interactive-hover
Borders:                 --color-border-subtle, --color-border-strong, --color-border-focus
Text:                    --color-fg-primary, --color-fg-secondary, --color-fg-muted, --color-fg-disabled, --color-fg-on-accent
Interactive:             --color-fg-interactive, --color-bg-interactive, --color-border-interactive
Feedback:                --color-fg-danger, --color-bg-danger, --color-fg-success, --color-bg-success, --color-fg-warning, --color-bg-warning, --color-fg-info, --color-bg-info
Accents (game-specific): --color-accent-burned, --color-accent-intercept, --color-accent-operative, --color-accent-drama
```

Every semantic token is a `var(--primitive)` reference. No hex in the semantic layer.

### §5.3 Typography scale

Proposed scale shape (fluid, per-axis):

```
Phone (svh-based):   --text-micro-phone, --text-caption-phone, --text-body-phone, --text-callout-phone, --text-title-phone, --text-display-phone
Board (vw-based):    --text-micro-board, --text-caption-board, --text-body-board, --text-callout-board, --text-title-board, --text-display-board
Axis-independent:    --font-display: 'Baveuse, ...', --font-body: 'General Sans, ...', --font-mono: 'JetBrains Mono, ...'
```

Modular scale: 1.25 (major third) for body/UI, 1.333 (perfect fourth) for display. Both within the typical 2026 ranges per best-practices research.

### §5.4 Spacing scale

4px base (2026 consensus, still standard). Proposed steps:

```
--space-0: 0
--space-1: 4px    (0.25rem)
--space-2: 8px    (0.5rem)
--space-3: 12px   (0.75rem)
--space-4: 16px   (1rem)
--space-5: 20px   (1.25rem)
--space-6: 24px   (1.5rem)
--space-8: 32px   (2rem)
--space-10: 40px  (2.5rem)
--space-12: 48px  (3rem)
--space-16: 64px  (4rem)
--space-20: 80px  (5rem)
```

Axis-independent — spacing is spacing, whether on phone or board. For fluid spacing tied to viewport axis, use clamp tokens (`--space-fluid-phone-*`, `--space-fluid-board-*`).

### §5.5 Sizing scale

Semantic sizing for common component dimensions:

```
--size-touch-target:     44px   (WCAG minimum — non-negotiable)
--size-card-phone:       clamp() in svh
--size-card-board:       clamp() in vw
--size-icon-sm / md / lg
--size-avatar-sm / md / lg
--size-fab:              72px   (InterceptButton / NopeButton unified)
```

### §5.6 Radius scale

```
--radius-none: 0
--radius-xs:   2px
--radius-sm:   4px
--radius-md:   8px       (current --radius-card — preserved)
--radius-lg:   12px
--radius-xl:   16px
--radius-full: 9999px
```

### §5.7 Elevation scale

Named shadows consumed via tokens, not inline:

```
--shadow-none
--shadow-sm      (subtle surface lift)
--shadow-md      (card elevation)
--shadow-lg      (modal / bottom sheet)
--shadow-xl      (drama overlay)
--shadow-glow-accent  (neon-accent glow, per-card-type coloring)
--shadow-glow-intense (high-drama glow — InterceptButton during window)
```

### §5.8 Motion scale

Per §4.3 above — TS object + CSS custom property twin. Five named durations (`instant/fast/base/slow/dramatic`), six named easings (`standard/emphasized/decelerate/accelerate/spring_snappy/spring_deliberate`), plus spring configs exposed as TS-only (CSS can't consume spring primitives).

### §5.9 Z-index scale

```
--z-base:       0
--z-raised:     10
--z-sticky:     100    (TitleBar, StatusBar)
--z-overlay:    1000   (ConnectionOverlay, DramaOverlay)
--z-modal:      2000   (BottomSheet)
--z-toast:      3000   (ErrorToast)
--z-max:        9999   (absolute emergencies)
```

Current codebase uses raw numbers 0, 1, 2, 3, 6, 10, 20, 30, 50, 100, 9000, 10000 with collisions. This scale eliminates collisions by design — every layer has a named semantic.

---

## §6 — Device Matrix (concrete clamp brackets)

**Phone (portrait):**

| Bracket | Reference device | Width × Height | svh value |
|---|---|---|---|
| Min | iPhone SE (first gen) | 375 × 667 | 667svh treated as 100% |
| Max | iPad Pro 12.9" portrait | 1024 × 1366 | 1366svh treated as 100% |

All phone dimensional clamps use this svh-bracket pair as the fluid range. Root container is also capped at `max-width: min(100vw, 640px)` to prevent tablet-as-huge-phone drift — content stays phone-shaped even on a 1024px-wide iPad.

**Board (landscape):**

| Bracket | Reference device | Width × Height | vw value |
|---|---|---|---|
| Min | 13" laptop | 1280 × 800 | 1280px treated as 100vw |
| Max | 4K reference | 3840 × 2160 | 3840px treated as 100vw |

Note: the board's "max" is chosen at 4K rather than 65" TV because 65" TVs in a party context are typically driven by a 4K signal from a laptop/console — the *signal* is the scaling constraint, not the physical panel.

**iPad in portrait vs iPad in landscape:**
- iPad in portrait → phone view (because portrait = phone orientation per spec §3.4).
- iPad in landscape → board view.
- The controller handles this by sniffing orientation at boot and routing to `/player.html` or `/board.html` accordingly. Out of scope for this rebuild — the existing routing is fine.

---

## §7 — Phase Structure

Five phases. Each phase is its own file in this directory. Each is sequenced; each has a goal, a scope, acceptance criteria, and a deliverable token contract. Phases are `/deepen-plan`'d **all five sequentially** before any `/ce:work` begins — deepening finds contradictions between phases, and we resolve the full contradiction map before executing anything.

### Phase 1 — Foundation (`phase-1-foundation.md`)

**Goal.** Stand up the complete token system — primitives, semantics, axis-forked files, motion TS/CSS twin, CVD test harness. Zero component migration. The foundation exists as files that pass their own tests before any `.module.css` consumes them.

**Scope:**
- Create `src/client/shared/tokens/` directory.
- Author `primitives.css` with the six color scales (Dreamland-referenced), type scale, spacing scale, sizing scale, radius scale, elevation scale, z-index scale.
- Author `semantic.css` with all axis-independent semantic tokens.
- Author `semantic.phone.css` with svh-based dimensional semantics.
- Author `semantic.board.css` with vw/cqw-based dimensional semantics.
- Author `motion.ts` with the TS object + CSS mirror pattern.
- Replace `theme.ts` runtime `applyTheme()` with pure-CSS `[data-theme]` approach. Remove ~30 LOC of boot-time JS.
- Add Vitest CI test: `palette-cvd.test.ts` with critical-pair CVD distance checks.
- Add Vitest CI test: `palette-contrast.test.ts` with WCAG + APCA contrast checks on all fg/bg pairs.
- Add Vitest CI test: `motion-token-sync.test.ts` verifying TS motion tokens match CSS mirrors.
- **Fonts:** keep currently-loaded Clash Display for `--font-display` initial render. **Baveuse decision gated on visual review** — if Clash Display fails the §2.2 Archer test against Dreamland reference stills, purchase Baveuse ($30 from Typodermic) and swap the one-line token value. Decision point logged in `TODO.md`.
- Frame-extract Dreamland S8 reference stills, document in `docs/plans/css-foundation-rebuild/dreamland-reference/README.md`, derive hex values.

**Acceptance criteria:**
- [ ] `pnpm typecheck` clean.
- [ ] `pnpm test` green, including all new CVD + contrast + motion-sync tests.
- [ ] `pnpm build` produces no bundle regression beyond +5KB on the phone entry (still under 100KB budget).
- [ ] `primitives.css` has zero hardcoded hex outside the primitives layer.
- [ ] `semantic.css` has zero hardcoded hex — every value is a `var(--primitive)` reference.
- [ ] Baveuse renders on both phone and board entry points.
- [ ] Reviewed visually against Dreamland reference stills — passes §2.2 Archer test as a token palette in isolation.

**Landmines preserved from audit:** none — this phase creates new files, doesn't touch existing ones.

### Phase 2 — Phone View Migration (`phase-2-phone-view-migration.md`)

**Goal.** Rewrite every `.module.css` file under `src/client/player/` to consume the token system. Eliminate all axis violations. Delete dead code. Consolidate duplicated components.

**Scope:**
- **14 files to rewrite:** `PlayingView.module.css`, `Hand.module.css`, `StagingArea.module.css`, `SmartActionBox.module.css`, `TitleBar.module.css`, `StatusBar.module.css`, `InterceptButton.module.css`, `JoinScreen.module.css`, `EliminatedView.module.css`, `ErrorToast.module.css`, `ConnectionOverlay.module.css`, `CardDetailSheet.module.css`, `sheets.module.css`, `player-hardening.css`.
- **Delete dead code:** `TurnBanner.tsx` + `TurnBanner.module.css` (verified unused).
- **Consolidate duplication:** `NopeButton.module.css` ≡ `InterceptButton.module.css`. Rewrite both as a single `FloatingActionButton.module.css` with variant props.
- **Fix axis violations:** `StagingArea.module.css:43` (`42vw` → svh-based), `Hand.module.css:49` (`100vw` → svh or token-based).
- **Fix dvh leak:** `BottomSheet.module.css` uses `dvh` — switch to `svh` to match the rest of phone view.
- **Tier 1 retheme gaps from spec §6.4:**
  - `EliminatedView.tsx:45` — "You Exploded!" → TBD Archer-tone replacement (final copy decided in Phase 2 draft).
  - `EliminatedView.tsx:8-17` — cut 4 flavor lines, keep 3, reword 1, add 4 new Archer-tone lines.
- **Bundle budget check:** after migration, phone entry must still be ≤100KB gzipped.

**Acceptance criteria:**
- [ ] Every `.module.css` file in `src/client/player/` has zero hardcoded hex values.
- [ ] Every `.module.css` file in `src/client/player/` has zero hardcoded spacing / font-size / radius values — all consume tokens.
- [ ] Zero `vw` usage for dimensional sizing in `src/client/player/` (exception: `100vw` for full-bleed backdrops is explicitly allowed).
- [ ] `TurnBanner.*` files deleted, no broken imports.
- [ ] `NopeButton.*` and `InterceptButton.*` consolidated to `FloatingActionButton.*` with variant API.
- [ ] `EliminatedView` retheme gaps resolved.
- [ ] iPad portrait at 1024×1366 renders phone view (not board view) and content is capped at `max-width: 640px`.
- [ ] Tested on real iOS 26 device — `position: fixed` for TitleBar / StatusBar / InterceptButton works or has documented fallback.
- [ ] §2.2 Archer test passes on every phone screen (ConnectionOverlay, JoinScreen, PlayingView in every SmartActionBox state, every bottom sheet, EliminatedView, GameOver).

**Landmines preserved from audit** (carried forward as code comments referencing the token contract):
- Hand cards overflow if they use `height: 100%` + `aspect-ratio` — slot wrapper handles aspect-ratio.
- `MinimalCard` threshold detection uses content-box math — document in a token comment.
- `transition: none` on `[data-selected]` prevents Framer Motion `layoutId` flash — preserve.

### Phase 3 — Board View Migration (`phase-3-board-view-migration.md`)

**Goal.** Rewrite every `.module.css` file under `src/client/board/` to consume the token system. Eliminate the `@media(min-width)` hard-pixel doubling in favor of clamp(vw) throughout. Fix axis mixes. Resolve the `feltBranding` Tier 1 retheme gap.

**Scope:**
- **11 files to rewrite:** `GameTable.module.css`, `Lobby.module.css`, `PlayerRing.module.css`, `DrawPile.module.css`, `DiscardFan.module.css`, `Arena.module.css`, `AnnouncementFeed.module.css`, `StatusBar.module.css`, `NopeCountdownBar.module.css`, `PendingPromptBanner.module.css`, `fonts-mono.css`.
- **Fix axis mixes:** `GameTable.module.css:5` (`height: 100svh` → no explicit height, use full-screen grid), `GameTable.module.css:6` (`padding: 3vh 4vw` → token-based vw), `Lobby.module.css:8` (`height: 100svh` → vw-relative).
- **Remove hard-pixel doubling:** 6 files use `@media (min-width: 1280px)` with hand-tuned px — replace with `clamp(...vw...)` tokens.
- **Tier 1 retheme gap:** `GameTable.tsx:24` `feltBranding` element — replace with Archer/Pendleton-era decorative element.
- **Lobby palette cleanup:** current gradient uses greens (`#1e3a24`, `#193220`, `#142a1a`) inconsistent with `GameTable`'s teal-charcoal. Unify via tokens.
- **Reconcile with Phase 2's `MinimalCard` usage.** The card component is cross-view and landed in Phase 2 if it had to; Phase 3 confirms board view consumes it correctly.

**Acceptance criteria:**
- [ ] Every `.module.css` file in `src/client/board/` has zero hardcoded hex values.
- [ ] Zero `svh`/`vh` usage for dimensional sizing in `src/client/board/`.
- [ ] Zero `@media (min-width: 1280px)` hard-pixel blocks — replaced by token-based clamp(vw).
- [ ] `feltBranding` retheme gap resolved.
- [ ] Lobby palette matches GameTable palette via shared tokens.
- [ ] Board renders correctly at 1280×800, 1920×1080, 2560×1440, 3840×2160 — tested via Playwright viewport matrix.
- [ ] §2.2 Archer test passes on every board screen (Lobby, GameTable with PlayerRing + DrawPile + DiscardFan + Arena, NopeCountdownBar during intercept window, PendingPromptBanner, StatusBar, GameOver).

### Phase 4 — Motion Consolidation (`phase-4-motion-consolidation.md`)

**Goal.** Unify all 22 Framer Motion transition sites + GSAP timings + 15 CSS `@keyframes` durations under the motion token layer. Eliminate all inline literals. Verify TS/CSS twin sync via CI test.

**Scope:**
- **22 Framer Motion sites** — rewrite every `transition={{ duration: X }}`, `{ type: 'spring', stiffness: X, damping: Y }`, and variant config to consume `MOTION_DURATIONS` / `MOTION_EASINGS` from `motion.ts`.
- **2 GSAP sites** (`PlayerRing.tsx:55-57`, `DramaOverlay.tsx:123-128`) — rewrite to consume the same motion tokens via direct TS import.
- **15 CSS `@keyframes` durations** across 9 files — rewrite to consume `--motion-duration-*` CSS custom properties.
- **13 CSS `transition` declarations** — rewrite to consume `--motion-duration-*` + `--motion-ease-*`.
- **Literal duplicates to remove:** `GameOver.tsx:80` (literal `{ stiffness: 300, damping: 24 }` — same as `MOTION.SNAPPY`), `GameOver.tsx:101` (literal `{ stiffness: 250, damping: 25 }` — same as `MOTION.DELIBERATE`).
- **Unique springs to name:** `EliminatedView.tsx:34` `{ stiffness: 400, damping: 15 }` and `GameOver.tsx:52` `{ stiffness: 200, damping: 20 }` — both have specific character, name them (e.g., `spring_punchy` and `spring_gentle`) and add to `motion.ts`.
- **CI test:** `motion-token-sync.test.ts` walks `motion.ts` TS exports and confirms every duration/easing has an equivalent CSS custom property with the matching value.
- **`prefers-reduced-motion` handling** — motion tokens fork into a reduced-motion variant that zeroes out durations or shortens to instant.

**Acceptance criteria:**
- [ ] Zero inline duration literals in Framer Motion transition configs across `src/client/`.
- [ ] Zero inline spring literals — all spring configs live in `motion.ts`.
- [ ] Zero hardcoded `@keyframes` durations in CSS modules — all consume `--motion-duration-*`.
- [ ] Zero hardcoded `transition` durations in CSS modules — all consume `--motion-duration-*` + `--motion-ease-*`.
- [ ] GSAP calls in `PlayerRing.tsx` and `DramaOverlay.tsx` import from `motion.ts`.
- [ ] `motion-token-sync.test.ts` passes.
- [ ] `prefers-reduced-motion: reduce` is respected — all animation token durations zero out or shorten appropriately.
- [ ] `pnpm test` green.

### Phase 5 — Verification & Acceptance (`phase-5-verification-acceptance.md`)

**Goal.** Run the full acceptance battery and prepare for the §8.7 first-time player test. This phase is not "implementation" — it's "prove the rebuild met the spec."

**Scope:**
- **Real-device testing on iOS 26** — iPhone (whatever version you have) on iOS 26. Confirm `position: fixed` for TitleBar, StatusBar, InterceptButton works or has a documented fallback.
- **Visual regression matrix via Playwright** — screenshots across the full device matrix:
  - Phone: iPhone SE (375×667), iPhone 15 (393×852), iPad mini portrait (744×1133), iPad Pro 12.9" portrait (1024×1366).
  - Board: 1280×800, 1920×1080, 2560×1440, 3840×2160.
  - Capture every major screen (Lobby, JoinScreen, PlayingView in 3-4 SmartActionBox states, every bottom sheet, EliminatedView, GameOver, every DramaOverlay key frame).
- **200% browser zoom test** — WCAG 1.4.4 — body text at 200% zoom does not horizontally scroll or get clipped.
- **CVD palette verification** — the `palette-cvd.test.ts` from Phase 1 runs in CI and is now populated with every critical pair.
- **Contrast verification** — WCAG 2.1 AA + APCA checks on every fg/bg pair.
- **Full game loop test (§8.6 of spec)** — 5-player game from lobby to game-over without errors. Every card type played at least once. Elimination + reconnect tests.
- **First-time player test prep (§8.7 of spec)** — a friend who has never seen BURNED plays a full game. Pass condition: *"Wait — did Archer and company release this?"*
- **Documentation pass** — update `README.md`, `TODO.md`, and any phase-plan references so the new architecture is discoverable for future Claude sessions.

**Acceptance criteria:**
- [ ] iOS 26 real-device test passes on all persistent chrome elements.
- [ ] Playwright visual regression matrix passes for every screen at every viewport.
- [ ] WCAG 1.4.4 200% zoom test passes on all text.
- [ ] CVD distance test passes for every critical pair × 3 CVD types.
- [ ] WCAG 2.1 AA contrast passes on every semantic fg/bg pair.
- [ ] APCA contrast ≥60 Lc on all body text pairs.
- [ ] Full game loop (§8.6) runs clean for a 5-player game.
- [ ] First-time player test (§8.7) passes with at least one friend.
- [ ] `TODO.md` and `README.md` updated to reflect the new architecture.

---

## §8 — Cross-Phase Concerns (what deepening should watch for)

These are the topics where phase files are most likely to introduce contradictions. `/deepen-plan` should pay special attention when it surfaces an issue touching any of these.

1. **Token naming collisions.** Phases 2, 3, 4 all consume tokens defined in Phase 1. If Phase 2's migration introduces a "we need a new semantic token" finding, Phase 1 might need to grow. Resolve by adding the token to Phase 1's scope, not by creating a parallel token in Phase 2.
2. **Cross-view components.** `MinimalCard`, `DramaOverlay`, `GameOver`, `BottomSheet` are used on both phone and board. Which phase owns their rewrite? Default: the first phase that touches them owns the rewrite; the second phase confirms consumption. Phase 2 likely rewrites `MinimalCard` (phone view touches it first); Phase 3 confirms.
3. **Motion tokens consumed before they exist.** Phases 2 and 3 rewrite components that use Framer Motion, but Phase 4 is when motion tokens get consolidated. Phases 2 and 3 must consume `motion.ts` values WHERE available (Phase 1 defines the basic scale), but Phase 4 finishes the job. Don't let Phases 2/3 introduce new inline literals — always import from `motion.ts`.
4. **Palette hex values finalized in Phase 1.** Phases 2 and 3 must not second-guess. If a Phase 2/3 review reveals a palette problem, the fix belongs in Phase 1 with an amendment — don't patch the palette in a component file.
5. **iOS 26 `position: fixed` fallback.** If Phase 5 testing finds iOS 26 broken, the fallback strategy must be encoded in Phase 2's phone-view rewrite (TitleBar, StatusBar, InterceptButton). Coordinate the fix cross-phase.
6. **Bundle budget.** Phase 1 adds fonts + tokens (~+5KB expected). Phase 4 might shave bytes via motion consolidation. Phase 5 confirms the final bundle size. If any phase blows the 100KB budget, we stop and triage before shipping.

---

## §9 — Open Action Items

- **Order *The Art of Archer***  (Briggsy or Harry) — Neal Holman, Dey Street / HarperCollins, 2016, ISBN 978-0062441010. $15–25 on Amazon. Not a blocker, but if it arrives before Phase 1 palette lock, cross-reference the book against our frame-extracted hex values.
- **Baveuse font license — DEFERRED.** Per Briggsy 2026-04-11: wait and see. Start Phase 1 with Clash Display; evaluate against Dreamland reference stills; purchase Baveuse ($30 Typodermic) if Clash Display fails the Archer test. Logged in `TODO.md`.
- **Dreamland S8 reference frame extraction** — Phase 1 sub-task. I'll do this during Phase 1 writeup and save the reference stills to `docs/plans/css-foundation-rebuild/dreamland-reference/`.
- **Footnote-as-doc-standard — ADOPTED 2026-04-11.** Briggsy approved the pattern on review. This roadmap demonstrates it with `[^N]` markers for every Archer influence citation. All CSS Foundation Rebuild phase files follow the same pattern. Future work: make it a BURNED doc standard (README update), eventually a skill.

---

## §10 — Sources

**Primary-source citations for Archer's visual vocabulary:**

- `[^1]` Neal Holman interview, Art of the Title, May 2016. https://www.artofthetitle.com/title/archer/ (verified 2026-04-11 by research agent)
- `[^2]` Neal Holman, Salon 2016 (accessed via Wayback Machine archive, live URL 404). Cites Jack Kirby, Steve Ditko, Mad Men as rendering/production-design influences.
- `[^3]` Adam Reed, A.V. Club 2011 (accessed via Wayback Machine). Reed's named influences: 1960 Bond, OSS 117, Pink Panther, mid-century furniture, '60s clothing, '70s muscle cars, deliberate anachronism.
- **Production pipeline details** (iron-clad sourced across AWN 2010/2014/2016 interviews): flat-color vector in Illustrator with thick black outlines (Kirby/Ditko reference), layered puppet rigs, limited animation, composited in After Effects; backgrounds 3D-modeled in Autodesk 3ds Max by Trinity Animation and Photoshop-overpainted.
- **Canonical reference book** (not yet acquired): *The Art of Archer*, Neal Holman, Dey Street / HarperCollins, 2016, ISBN 978-0062441010.

**Technical best-practices citations (2025-2026):**

- Two-layer token system consensus — verified across Radix UI, shadcn/ui, Material 3, IBM Carbon, GitHub Primer, Tailwind, Linear, Stripe design systems.
- `svh`/`dvh`/`lvh` browser support — Baseline Widely Available since iOS Safari 15.4 (March 2022), confirmed via MDN browser compatibility data.
- `svh` vs `dvh` mid-scroll shimmering — documented across 2024-2026 dev-blog war stories and Reddit `r/webdev` threads.
- iOS 26 `position: fixed` / `position: sticky` regression — confirmed via WebKit bugzilla and developer Reddit threads; partial fix in 26.1.
- Framer Motion `transition.duration` type constraint — verified against Motion 11.x official API docs.
- `culori` CVD simulation via Brettel-Viénot-Mollon — documented in culori README, npm v4 and later.
- `chroma-js` does NOT do CVD simulation — common misconception flagged in `culori` and `@cantoo/color-blindness` docs.
- WCAG 2.x vs APCA contrast — Radix Colors publicly moved from WCAG to APCA in 2023; APCA still a W3C draft but used in production by multiple design systems.
- Utopia fluid-typography calculator — https://utopia.fyi/ (width-based only; vertical-axis svh-equivalent formula derived manually in §4.4 above).
- 4px base spacing + 1.25/1.333 modular scale — 2026 consensus per surveyed design systems.

**Internal documents:**

- `docs/PRODUCT-SPECIFICATION.md` v1.0 (locked 2026-04-10) — the parent contract.
- `docs/ideation/2026-04-11-visual-layer-autopsy.md` — diagnosis of current visual layer.
- `docs/insights/009-product-specification-authoring.md` — the session that authored the spec (referenced, not yet read in full during this rebuild).
- `CLAUDE.md` (BURNED project conventions).

---

*This roadmap is the parent document for the CSS Foundation Rebuild. It is drafted 2026-04-11 and will be updated as each phase file is written and `/deepen-plan` surfaces cross-phase concerns. When a phase file contradicts this roadmap, the contradiction is resolved in one direction or the other — never ignored.*
