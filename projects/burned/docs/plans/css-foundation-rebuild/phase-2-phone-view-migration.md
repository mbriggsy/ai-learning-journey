---
title: "Phase 2 — Phone View Migration"
type: feat
phase: 2
parent: docs/plans/css-foundation-rebuild/roadmap.md
depends_on: docs/plans/css-foundation-rebuild/phase-1-foundation.md
date: 2026-04-11
status: draft
---

# Phase 2 — Phone View Migration

**Goal.** Rewrite every `.module.css` file under `src/client/player/` to consume the Phase 1 token system. Eliminate all axis violations. Delete dead code (TurnBanner). Consolidate functionally-duplicate components (NopeButton + InterceptButton → FloatingActionButton). Fix the one cross-view `dvh` leak in `BottomSheet.module.css`. Resolve Tier 1 retheme gaps for `EliminatedView`. Ship the phone bundle ≤100KB gzipped.

**Scope boundary.** Phase 2 touches ONLY phone-view files (`src/client/player/*`) and the one shared file consumed by the phone view that needs a fix (`src/client/shared/BottomSheet.module.css`). `MinimalCard.module.css` (shared, cross-view) is **Phase 3**'s responsibility — it'll be rewritten there since board view is the bigger constraint on its sizing. **However**, Phase 2 may touch `MinimalCard.tsx` (the React component, not the CSS) to update the `cardAccent()` consumption pattern — see §2.6 below.

---

## §1 — Inputs

From `phase-1-foundation.md`:
- All tokens in `src/client/shared/tokens/primitives.css`, `semantic.css`, `semantic.phone.css`, `motion.ts`. Phase 2 consumes them; it does not define new ones. If Phase 2 discovers it needs a token Phase 1 doesn't define, the fix is "add it to Phase 1," not "patch it locally."
- `[data-view="phone"]` is already set on the phone root element by Phase 1.
- `[data-theme="dark"]` is already set.

From `roadmap.md`:
- **§2 Quality Bar** — every rewritten file must pass the §2.2 Archer test at the component level.
- **§3.5 Form factors** — phone = svh, NO `vw` for dimensional sizing.
- **§6.1 — Phone component inventory** (from spec §6.1) — this is the authoritative list of what exists and what states each component has.

From `docs/specifications/PRODUCT-SPECIFICATION.md`:
- **§6.4 Tier 1 retheme gaps** — `EliminatedView.tsx:45` title and `EliminatedView.tsx:8-17` flavor lines. These are user-visible violations of the Archer quality bar. Must be resolved in Phase 2.

From Agent A's codebase audit (inlined in conversation, 2026-04-11):
- Per-file enumeration of current hardcoded values, axis violations, stale fallbacks, and dead code flags.
- Specific landmine comments that encode load-bearing architecture and must be preserved as code comments referencing the new token contract.

---

## §2 — Deliverables

### §2.1 Directory state after Phase 2

```
src/client/player/
├── Player.tsx                  ← component file, not rewritten (unless Tier 1 retheme forces a TSX edit)
├── PlayingView.module.css      ← REWRITTEN
├── Hand.tsx                    ← component file, not rewritten
├── Hand.module.css             ← REWRITTEN
├── StagingArea.tsx
├── StagingArea.module.css      ← REWRITTEN (axis fix critical)
├── SmartActionBox.tsx
├── SmartActionBox.module.css   ← REWRITTEN
├── TitleBar.tsx
├── TitleBar.module.css         ← REWRITTEN
├── StatusBar.tsx
├── StatusBar.module.css        ← REWRITTEN
├── FloatingActionButton.tsx    ← NEW: consolidates NopeButton + InterceptButton
├── FloatingActionButton.module.css ← NEW
├── NopeButton.tsx              ← DELETED
├── NopeButton.module.css       ← DELETED
├── InterceptButton.tsx         ← DELETED
├── InterceptButton.module.css  ← DELETED
├── JoinScreen.tsx
├── JoinScreen.module.css       ← REWRITTEN
├── EliminatedView.tsx          ← TSX edited for Tier 1 retheme
├── EliminatedView.module.css   ← REWRITTEN
├── ErrorToast.tsx
├── ErrorToast.module.css       ← REWRITTEN
├── ConnectionOverlay.tsx
├── ConnectionOverlay.module.css ← REWRITTEN
├── CardDetailSheet.tsx
├── CardDetailSheet.module.css  ← REWRITTEN
├── TurnBanner.tsx              ← DELETED (dead code)
├── TurnBanner.module.css       ← DELETED (dead code)
├── player-hardening.css        ← REWRITTEN (global CSS, 29 LOC)
└── sheets/
    ├── sheets.module.css       ← REWRITTEN (228 LOC — biggest phone file)
    └── [various sheet TSX files, not rewritten]
```

**Files touched:** 14 CSS module rewrites + 1 global CSS rewrite + 4 deletions (2 files each for Nope and Intercept, 1 pair for TurnBanner) + 1 new file pair (FloatingActionButton) + 1 cross-view fix (BottomSheet).

### §2.2 Migration pattern (universal)

Every rewritten `.module.css` file follows the same pattern. This is the template the per-file specs in §2.3 reference:

**BEFORE (hypothetical)**:
```css
.container {
  padding: 12px 16px;
  background: #1f3338;
  color: #f5f0e0;
  border: 1px solid #3a5860;
  border-radius: 8px;
  font-family: 'Clash Display', sans-serif;
  font-size: 14px;
  transition: background 0.2s ease;
}
.container:hover {
  background: #243c42;
}
```

**AFTER**:
```css
.container {
  padding: var(--space-3) var(--space-4);
  background: var(--color-bg-surface);
  color: var(--color-fg-primary);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-card);
  font-family: var(--font-display);
  font-size: var(--text-body);
  transition: background var(--motion-duration-fast) var(--motion-ease-standard);
}
.container:hover {
  background: var(--color-bg-elevated);
}
```

**Universal rules**:
1. **Zero hardcoded hex values.** Every color goes through a semantic token (`--color-*`) which goes through a primitive token (`--color-teal-5`, etc.).
2. **Zero hardcoded spacing.** Every `padding`, `margin`, `gap`, `inset` uses `--space-N` or `--space-fluid-*-phone` where viewport-responsive sizing is needed.
3. **Zero hardcoded font sizes.** Every `font-size` uses a `--text-*-phone` token.
4. **Zero hardcoded font families.** Every `font-family` uses `--font-display` or `--font-body` or `--font-mono`.
5. **Zero hardcoded radii.** Every `border-radius` uses `--radius-*`.
6. **Zero hardcoded shadows.** Every `box-shadow` uses `--shadow-*` or `--shadow-glow-*`.
7. **Zero hardcoded motion timing.** Every `transition` and `animation` duration uses `--motion-duration-*` and easing uses `--motion-ease-*`.
8. **Zero hardcoded z-indices.** Every `z-index` uses `--z-*`.
9. **No `vw` for dimensional sizing in phone files.** Width-full bleed (`width: 100vw`) is allowed only with a structural reason; default is `width: 100%` or a token.
10. **Preserve landmine comments.** Where the old file has a comment encoding architectural knowledge (e.g., "height:100% + aspect-ratio overflows, use slot wrapper"), preserve the comment verbatim, prefix with "Inherited from pre-rebuild:" if helpful.

### §2.2a Cross-cutting patterns (the themes before the details)

Every `.module.css` file rewritten in Phase 2 is touched by some subset of the seven patterns below. The per-file specs in §2.3 enumerate which patterns apply to each file, but the patterns themselves are consistent across the whole phase — which means fixes are mechanical once the pattern is recognized.

#### Pattern 1 — Stale UMB noir palette fallbacks in `var()` calls

**Affected files (10 of 14):** `JoinScreen.module.css` (entire file), `SmartActionBox.module.css`, `TitleBar.module.css`, `StatusBar.module.css`, `InterceptButton.module.css`, `NopeButton.module.css`, `ConnectionOverlay.module.css`, `TurnBanner.module.css`, plus board-side leakers that Phase 3 handles.

**The pattern**: code like `var(--text-primary, #e8e8f0)` where the hex fallback is from the UMB noir era (`#e8e8f0`, `#2dd8c8`, `#e03535`, `#e8922a`, `#9999bb`, `#555570`, `#0c0a12`, `#12121f`, `#33ffff`, `#3a3d5a`, `#1a1d30`, `#222540`, etc.). The runtime `theme.ts` serves different values, so the hex fallback is dead code at runtime AND misleading at design time.

**The fix**: every fallback is purged. Write `var(--color-fg-primary)` with no fallback. If the token doesn't exist at the semantic layer, that's a Phase 1 bug — add it there, don't paper over with a hex.

**Why**: fallbacks in the rewritten files would make the token system feel optional. It's not. Tokens are the contract.

#### Pattern 2 — Hardcoded spacing values (44 unique)

**Affected files**: all 14.

**The pattern**: `padding: 12px 16px`, `gap: 8px`, `margin-top: 20px` — raw px everywhere. 26 distinct scalar values with no rhythm.

**The fix**: every spacing value → `var(--space-N)` per the Phase 1 scale (0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20). For dimensions that need to flex with viewport height, `var(--space-fluid-tight|base|loose)` from `semantic.phone.css`.

**Permitted exception**: structural floors like `min-width: 120px` on card slots where the value is a collapse-prevention constant, not a design decision. Document in a comment next to the value.

#### Pattern 3 — Hardcoded font sizes (35 unique)

**Affected files**: all 14.

**The pattern**: `font-size: 14px` / `12px` / `10px` / `28px` / `16px` etc. with no shared scale.

**The fix**: every font-size → `var(--text-micro|caption|body|callout|title|display)` per the Phase 1 phone type scale. The scale is fluid svh-based, so the same token gives 14px on a small phone and 18px on a large iPad portrait.

#### Pattern 4 — Hardcoded border-radius (14 unique)

**Affected files**: 12 of 14.

**The pattern**: radii span from `1px` through `999px` with no scale — some files pick 6px, some 8px, some 10px, some 12px, all for the same visual role.

**The fix**: every radius → `var(--radius-xs|sm|md|lg|xl|2xl|full)` or a semantic alias (`var(--radius-card)`, `var(--radius-button)`, `var(--radius-modal)`).

#### Pattern 5 — Hardcoded box-shadow (30+ unique)

**Affected files**: 8 of 14.

**The pattern**: hand-rolled shadows per file. `SmartActionBox` alone has 8 unique shadow values; `MinimalCard` (Phase 3 territory) has 12.

**The fix**: every shadow → `var(--shadow-sm|md|lg|xl|glow-accent|glow-danger|glow-success|glow-drama)`. For custom per-keyframe shadows during breathing animations, use `color-mix()` against the semantic accent tokens (the pattern demonstrated in §2.3.4 SmartActionBox).

#### Pattern 6 — Hardcoded motion timing (4 CSS transition durations + 10 keyframe durations)

**Affected files**: all 14 (though most simple files only have 1-2 timings each).

**The pattern**: `transition: opacity 0.2s ease-out`, `animation: spin 0.8s linear infinite`, `animation: breathe 3s ease-in-out infinite` — raw durations and raw easings per file.

**The fix**: every `transition` duration → `var(--motion-duration-instant|fast|base|slow|dramatic)`. Every easing → `var(--motion-ease-standard|emphasized|decelerate|accelerate|anticipate)`. Keyframe animation durations consume the same tokens.

**Permitted exception**: `JoinScreen.module.css` has a `dots` step animation (4 steps, 1.5s total, 375ms per step) that doesn't fit the general scale — it's a one-off step-timing tuned for readability of a 3-dot loading indicator. Keep hardcoded with an inline comment explaining.

#### Pattern 7 — Z-index collisions and unscaled layers (13 unique raw numbers)

**Affected files**: 5 of 14.

**The pattern**: raw z-indices `0, 1, 2, 3, 6, 10, 20, 30, 50, 100, 9000, 10000`. Collisions at 50 and 100 across multiple files. Two different "max" conventions (9000 and 10000) meaning nothing is actually max.

**The fix**: every z-index → `var(--z-base|raised|sticky|overlay|modal|toast|max)` per the Phase 1 scale. Collisions are eliminated by design — each layer has a named semantic, two files using the same layer is intentional because they share semantics.

---

**How to read §2.3**: the per-file specs below focus on **file-specific concerns** (structural changes, architectural landmines, state variants) and the **full rewritten file content**. They don't re-enumerate which of the 7 patterns above apply — assume all that fit. The cross-cutting summary above is the reviewer's guide; §2.3 is the execution runbook.

---

### §2.3 Per-file migration specs

Each subsection below gives: current LOC, current problems, target token consumption, and the FULL rewritten file content. Per the 2026-04-11 baking-recipe rule, execution is mechanical copy-paste — `/ce:work` does not compose CSS from transformation specs; it takes the block from the plan and writes it to disk.

#### §2.3.1 `PlayingView.module.css` — REWRITE (93 LOC → ~75 LOC)

**Current problems** (from audit):
- `height: min(100svh, 900px)` + `max-width: 600px` — compound constraints with no rationale.
- `flex: 42 1 0` / `flex: 58 1 0` rigid height ratios encode viewport assumptions.
- Hardcoded `gap: 6px`, `padding: 6px 2px 2px`, `border-radius: 6px`, `padding: 2px 10px`, `font-size: 10px`, `letter-spacing: 0.14em`.
- Stale color fallbacks: `#3a5860`, `#1a2a2e`, `#243c42`, `#b8a890`, `#d4cfc5`, `#8a8070`, `#e8e0d0`, `#f5f0e8` (some match current runtime, some don't).

**Rewritten file content**:

```css
/* PlayingView.module.css
   Phone workbench: title + status + staging + hand + floating intercept button.
   Height-driven layout on svh. Content-aware sizing replaces rigid flex ratios.

   Inherited architectural notes:
   - Cards at height:100% + aspect-ratio overflow — slot wrapper handles aspect-ratio.
   - Phone root uses max-width: var(--size-root-max-width) to cap iPad portrait.
*/

.view {
  display: flex;
  flex-direction: column;
  height: 100svh;
  max-width: var(--size-root-max-width);
  margin: 0 auto;
  background: var(--color-bg-app);
  color: var(--color-fg-primary);
  font-family: var(--font-body);
  overflow: hidden;
  box-sizing: border-box;
}

.workbench {
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-fluid-tight);
  padding: var(--space-fluid-tight) var(--space-1) var(--space-1);
  min-height: 0; /* prevent flex child from expanding beyond parent */
}

.staging {
  flex: 0 0 var(--size-staging-height);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-2);
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-surface);
  position: relative;
}

.hand {
  flex: 0 0 var(--size-hand-height);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-2) 0;
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-surface);
  position: relative;
}

.sectionLabel {
  position: absolute;
  top: var(--space-1);
  left: var(--space-2);
  padding: var(--space-0) var(--space-2);
  background: var(--color-bg-elevated);
  color: var(--color-fg-muted);
  font-family: var(--font-display);
  font-size: var(--text-micro);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  border-radius: var(--radius-sm);
  pointer-events: none;
}
```

**Key transformations**:
- `height: min(100svh, 900px)` → `height: 100svh` + `max-width: var(--size-root-max-width)` on the root.
- `flex: 42 1 0` / `flex: 58 1 0` → `flex: 0 0 var(--size-staging-height)` / `flex: 0 0 var(--size-hand-height)` (content-aware clamps, not percentage splits).
- `gap: 6px` → `var(--space-fluid-tight)` (fluid because it scales with phone height).
- Section labels inside absolutely-positioned containers — **NOT floating on the border** (landmine from autopsy: `overflow: hidden` on staging section clips absolutely-positioned elements that float on the border).

**Acceptance for this file**:
- [ ] Zero hardcoded hex, spacing, font size, radius, shadow values.
- [ ] No compound height constraints (`min()` or `max-height` mixing units).
- [ ] `.view` consumes `var(--size-root-max-width)`.
- [ ] Staging and hand sections size via `--size-staging-height` and `--size-hand-height` tokens (fluid svh-based).
- [ ] Section labels render inside their container, not floating on the border.

#### §2.3.2 `Hand.module.css` — REWRITE (51 LOC → ~45 LOC)

**Current problems**:
- `width: 100vw` at line 49 — **AXIS VIOLATION** (phone should not use `vw` for dimensional sizing).
- `gap: 12px`, `padding: 8px 16px`, `scroll-padding-left: 16px`, `min-width: 120px`, `padding: 12px`, `max-width: 460px` — all hardcoded.
- `rgba(0, 0, 0, 0.6)` hardcoded for the enlarge backdrop.
- Landmine comment at line 3: "Cards inside use width:100% — no height:100% on cards (landmine: causes overflow)"

**Rewritten file content**:

```css
/* Hand.module.css
   Horizontal scrolling card strip. Cards inside use width:100% — no height:100%
   on cards (landmine: causes overflow when combined with aspect-ratio).
*/

.hand {
  display: flex;
  align-items: stretch;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-4);
  overflow-x: auto;
  overflow-y: visible;
  scroll-snap-type: x mandatory;
  scroll-padding-left: var(--space-4);
  scrollbar-width: none;
  height: 100%;
  box-sizing: border-box;
}

.hand::-webkit-scrollbar {
  display: none;
}

.slot {
  flex: 0 0 auto;
  min-width: 120px; /* slot floor — prevents collapse, card sizing handled by MinimalCard */
  aspect-ratio: 5 / 7;
  scroll-snap-align: start;
}

.enlargeBackdrop {
  position: fixed;
  inset: 0;
  background: var(--color-bg-overlay);
  z-index: var(--z-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-3);
}

.enlargeCard {
  /* Full-bleed card detail view — width:100% of the backdrop container.
     NO vw/svh here — backdrop constrains the size. */
  width: 100%;
  max-width: min(90%, 460px);
  aspect-ratio: 5 / 7;
}
```

**Key transformations**:
- `width: 100vw` (L49) → `width: 100%` inside a `position: fixed; inset: 0` backdrop. The backdrop is full-viewport; the card inside is sized relative to the backdrop, not the viewport.
- All spacing → `var(--space-*)` tokens.
- `rgba(0, 0, 0, 0.6)` → `var(--color-bg-overlay)` (which uses `color-mix()` for the alpha blend).
- `z-index: 50` → `var(--z-modal)` (explicit layer semantic).

**Acceptance for this file**:
- [ ] Zero `vw` usage.
- [ ] Zero hardcoded colors.
- [ ] Landmine comment preserved.
- [ ] `min-width: 120px` on `.slot` is **intentionally kept** as a raw px value because it's a structural floor that prevents slot collapse, not a design token. Comment explains.

#### §2.3.3 `StagingArea.module.css` — REWRITE (47 LOC → ~40 LOC)

**Current problems**:
- `flex: 0 0 clamp(130px, 42vw, 200px)` at line 43 — **AXIS VIOLATION** (phone using `vw` for card width).
- `gap: 8px`, `gap: 10px`, `padding: 8px 0` — hardcoded.
- Landmine at line 46: "GPU layer — prevents border repaint flash".

**Rewritten file content**:

```css
/* StagingArea.module.css
   Composition zone for selecting cards to play. Scrolls horizontally when > 4 cards staged.

   Inherited architectural note: stagedSlot uses transform: translateZ(0) as a GPU layer hint
   to prevent border repaint flash during layout transitions.
*/

.staging {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  height: 100%;
  box-sizing: border-box;
}

.stagedRow {
  flex: 1 1 0;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  overflow-x: auto;
  overflow-y: visible;
  min-height: 0;
  scrollbar-width: none;
}

.stagedRow::-webkit-scrollbar {
  display: none;
}

.stagedSlot {
  flex: 0 0 auto;
  /* Card height drives card width via aspect-ratio on MinimalCard.
     stagedSlot just gives the card its vertical lane. */
  height: 100%;
  aspect-ratio: 5 / 7;
  /* GPU layer — prevents border repaint flash during Framer Motion layout transitions. */
  transform: translateZ(0);
}

.smartActionBox {
  flex: 0 0 auto;
  /* SmartActionBox.module.css controls its own dimensions. */
}
```

**Key transformations**:
- `flex: 0 0 clamp(130px, 42vw, 200px)` → `flex: 0 0 auto` + `height: 100%` + `aspect-ratio: 5/7`. The card's vertical lane is driven by parent height (svh-based via Phase 1 `--size-staging-height`); the card's width comes from aspect-ratio on the content. **Axis-correct: width is derived from height, not from viewport width.**
- All `gap` / `padding` → tokens.
- Landmine preserved as a comment on the `transform: translateZ(0)` line.

**Acceptance for this file**:
- [ ] Zero `vw`.
- [ ] `.stagedSlot` uses `aspect-ratio: 5/7` to derive width from height, not from viewport.
- [ ] Landmine comment preserved.

#### §2.3.4 `SmartActionBox.module.css` — REWRITE (153 LOC → ~140 LOC)

**Current problems**:
- **Massive stale fallback contamination**: `#d44030 x6`, `#2aaa98 x6`, `#d48820 x6`, `#1f3338 x6`, `#b8a890`, `#6a6050`, `#3a5860`, `#ff0000` (**wrong fallback** — `theme.ts` says `--red-glow = #ff3020`), `#c52b2b`, `#1a8a78`, `#b06b10` (all light-mode mismatches), `#faf8f0`.
- 8 unique box-shadow values (all hardcoded glow effects).
- `breathe 3s ease-in-out infinite` and `breatheIntense 1.5s ease-in-out infinite` animations with hardcoded durations.
- Many unique padding / radius / border values.

**Rewritten file content (partial — key `.box` and state variants)**:

```css
/* SmartActionBox.module.css
   Single-indicator contextual action button. Shows current player turn state,
   validation status, or the action to perform when cards are staged.
   Seven distinct states drive typography, color, border, and glow variants.
*/

.box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: calc(100% - var(--space-4));
  min-height: var(--size-touch-target);
  padding: var(--space-2) var(--space-4);
  margin: 0 auto;
  background: var(--color-bg-elevated);
  color: var(--color-fg-primary);
  border: 2px solid var(--color-border-subtle);
  border-radius: var(--radius-card);
  font-family: var(--font-display);
  font-size: var(--text-callout);
  font-weight: 600;
  letter-spacing: 0.02em;
  text-align: center;
  cursor: pointer;
  transition:
    background var(--motion-duration-fast) var(--motion-ease-standard),
    border-color var(--motion-duration-fast) var(--motion-ease-standard),
    box-shadow var(--motion-duration-fast) var(--motion-ease-standard);
}

.box:disabled,
.box[aria-disabled="true"] {
  cursor: not-allowed;
  color: var(--color-fg-disabled);
  background: var(--color-bg-surface);
}

/* State: not my turn — "Stand by, operative" */
.standby {
  color: var(--color-fg-muted);
  background: var(--color-bg-surface);
  border-color: var(--color-border-subtle);
}

/* State: my turn, nothing staged — "End turn — draw (N)" */
.draw {
  color: var(--color-fg-primary);
  background: var(--color-bg-interactive);
  border-color: var(--color-border-interactive);
}
.draw:hover {
  background: var(--color-bg-interactive-hover);
}

/* State: draw when deck is almost empty — adds intense glow */
.drawIntense {
  color: var(--color-fg-primary);
  background: var(--color-bg-danger);
  border-color: var(--color-accent-burned);
  box-shadow: var(--shadow-glow-danger);
  animation: breatheIntense var(--motion-duration-base) ease-in-out infinite alternate;
}

/* State: valid pair (2 matching operatives) — "Steal a random card" */
.comboPair,
.comboTriple {
  color: var(--color-fg-primary);
  background: var(--color-bg-success);
  border-color: var(--color-border-success);
  box-shadow: var(--shadow-glow-success);
}

/* State: valid single with action — "End turn — skip drawing" / "Peek at top 3" */
.action {
  color: var(--color-fg-primary);
  background: var(--color-bg-interactive);
  border-color: var(--color-border-focus);
  box-shadow: var(--shadow-glow-accent);
  animation: breathe var(--motion-duration-dramatic) ease-in-out infinite alternate;
}

/* State: invalid selection — non-interactive error state */
.invalid {
  color: var(--color-fg-danger);
  background: var(--color-bg-danger);
  border-color: var(--color-border-danger);
  cursor: not-allowed;
}

/* Hint text (secondary line beneath primary) */
.hint {
  display: block;
  margin-top: var(--space-1);
  font-family: var(--font-body);
  font-size: var(--text-caption);
  font-weight: 400;
  color: var(--color-fg-secondary);
  letter-spacing: 0;
}

/* Breathe animations — consumed from motion tokens.
   Uses --motion-duration-dramatic for gentle ambient; --motion-duration-base for intense. */
@keyframes breathe {
  0%, 100% {
    box-shadow: var(--shadow-glow-accent);
    transform: scale(1);
  }
  50% {
    box-shadow:
      0 0 20px color-mix(in srgb, var(--color-accent-operative) 60%, transparent),
      0 0 40px color-mix(in srgb, var(--color-accent-operative) 30%, transparent);
    transform: scale(1.01);
  }
}

@keyframes breatheIntense {
  0%, 100% {
    box-shadow: var(--shadow-glow-danger);
  }
  50% {
    box-shadow:
      0 0 30px color-mix(in srgb, var(--color-accent-burned) 80%, transparent),
      0 0 60px color-mix(in srgb, var(--color-accent-burned) 40%, transparent);
  }
}
```

**Key transformations**:
- All 26 stale hex fallbacks → removed; every color goes through `var(--color-*)`.
- 8 box-shadow values → consolidated into `--shadow-md` + `--shadow-glow-accent` + `--shadow-glow-danger` + `--shadow-glow-success`. Inline keyframes use `color-mix()` for the breathe animation intensity shift.
- `breathe 3s` and `breatheIntense 1.5s` → `var(--motion-duration-dramatic)` and `var(--motion-duration-base)`. These are CSS keyframes that consume CSS custom property durations — no TS involvement, because this is pure CSS presentation.
- 7 state variants: `standby`, `draw`, `drawIntense`, `comboPair`, `comboTriple`, `action`, `invalid` — each is a CSS class combined with the base `.box` class via `clsx` / `classnames` in `SmartActionBox.tsx`.

**Acceptance for this file**:
- [ ] Zero hardcoded hex.
- [ ] Zero hardcoded motion timing.
- [ ] 7 state variants each have a clear role mapping.
- [ ] `breathe` and `breatheIntense` keyframes use `color-mix()` for intensity shifts, not hardcoded rgba values.

#### §2.3.5 `TitleBar.module.css` — REWRITE (85 LOC → ~70 LOC)

**Current problems**:
- `#30c060` raw green for the "connected" status dot — not a token.
- `#30c06080` 8-digit hex for a glow — not a token.
- Stale fallbacks: `#d48820`, `#d44030`, `#f5f0e0`, `#b8a890`, `#243c42`, `#3a5860`, `#f5f0e8`, `#e8e0d0`, `#d4cfc5`.
- Hardcoded `padding: 4px 10px`, `min-height: 28px`, `gap: 6px`, `width/height: 7px`, `font-size: 12px/11px`, `box-shadow: 0 0 4px`, `animation: blink 1.2s ease-in-out infinite`.

**Rewritten file content**:

```css
/* TitleBar.module.css
   Top chrome strip: connection dot + player name + room code.
   Sticky to the top of the phone viewport. Compact (single line, ~28px min height).
*/

.titleBar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-3);
  min-height: var(--size-touch-target);
  background: var(--color-bg-elevated);
  border-bottom: 1px solid var(--color-border-subtle);
  color: var(--color-fg-primary);
  font-family: var(--font-display);
  font-size: var(--text-caption);
  flex: 0 0 auto;
}

.dot {
  width: var(--space-2);
  height: var(--space-2);
  border-radius: var(--radius-full);
  flex: 0 0 auto;
}

/* Connection state: connected */
.dotConnected {
  background: var(--color-fg-success);
  box-shadow: 0 0 var(--space-1) color-mix(in srgb, var(--color-fg-success) 50%, transparent);
}

/* Connection state: connecting (blinking) */
.dotConnecting {
  background: var(--color-accent-drama);
  animation: titleBarBlink var(--motion-duration-dramatic) var(--motion-ease-standard) infinite;
}

/* Connection state: disconnected */
.dotDisconnected {
  background: var(--color-fg-danger);
  box-shadow: 0 0 var(--space-1) color-mix(in srgb, var(--color-fg-danger) 50%, transparent);
}

.playerName {
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.roomCode {
  flex: 0 0 auto;
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--color-fg-muted);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

@keyframes titleBarBlink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
```

**Acceptance for this file**:
- [ ] Zero hardcoded hex.
- [ ] Connected-dot color uses the success semantic token, not a raw green.
- [ ] Blink animation consumes motion token for duration.
- [ ] Min-height is `--size-touch-target` (44px) — lifts the TitleBar above the pre-rebuild 28px, hitting WCAG 2.5.5.

#### §2.3.6 `StatusBar.module.css` — REWRITE (49 LOC → ~55 LOC)

**Current problems**:
- Stale fallbacks: `#d48820`, `#1a2a2e`, `#b8a890`, `#3a5860`, `#6a6050`, light-mode `#b06b10`, `#f5f0e8`.
- `min-height: 32px` — below WCAG 2.5.5 minimum touch target of 44px.
- Hardcoded `padding: 4px 12px`, `font-size: 11px/12px/13px`, `border-bottom: 1px`.

**Rewritten file content**:

```css
/* StatusBar.module.css
   Below the TitleBar. Shows turn state message: "YOUR TURN" / "Waiting for X — N in pile".
   Above the workbench; not interactive — pure communication.
*/

.statusBar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-3);
  min-height: var(--size-touch-target);
  background: var(--color-bg-app);
  border-bottom: 1px solid var(--color-border-subtle);
  color: var(--color-fg-secondary);
  font-family: var(--font-display);
  font-size: var(--text-body);
  font-weight: 500;
  letter-spacing: 0.04em;
  text-align: center;
  flex: 0 0 auto;
}

/* Variant: it's the player's turn — prominent, high-contrast */
.yourTurn {
  background: var(--color-bg-interactive);
  color: var(--color-fg-primary);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

/* Variant: waiting on another player */
.waiting {
  color: var(--color-fg-muted);
  font-weight: 400;
}

/* Pile count — visually subordinate to the main message */
.pileCount {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--color-fg-muted);
  padding: 0 var(--space-2);
  border-left: 1px solid var(--color-border-subtle);
  margin-left: var(--space-2);
}
```

**Acceptance for this file**:
- [ ] Zero hardcoded hex.
- [ ] `min-height: var(--size-touch-target)` — 44px minimum (this is a fix, not a regression — old code was 32px which violates WCAG 2.5.5).
- [ ] Three explicit variants: `.yourTurn` / `.waiting` / base.
- [ ] `.pileCount` uses monospace for numerical legibility.

#### §2.3.7 `FloatingActionButton.module.css` — NEW (replaces NopeButton + InterceptButton)

**Why this consolidation**: Agent A's audit confirmed `NopeButton.module.css` and `InterceptButton.module.css` are structurally identical — same dimensions, same positioning, same animation, same stale fallbacks. Two files, one component. The consolidation creates `FloatingActionButton.tsx` + `FloatingActionButton.module.css` that accepts a `variant="intercept"|"nope"` prop and derives label / accent color / glow from the variant.

**New component API** (TSX, not full code — execution fills in):

```tsx
// FloatingActionButton.tsx
interface FloatingActionButtonProps {
  variant: 'intercept' | 'nope';
  visible: boolean;
  onClick: () => void;
  remainingMs?: number; // drives urgency during intercept window
}
```

**`FloatingActionButton.module.css`** (full file):

```css
/* FloatingActionButton.module.css
   Consolidates InterceptButton and NopeButton — they share dimensions, positioning,
   and animation. Variant prop drives the label and accent color.

   Inherited architectural note: MUST remain on top (--z-sticky), always.
*/

.fab {
  position: fixed;
  bottom: var(--space-10);
  right: var(--space-4);
  width: var(--size-fab);
  height: var(--size-fab);
  border: 3px solid;
  border-radius: var(--radius-full);
  font-family: var(--font-display);
  font-weight: 700;
  text-transform: uppercase;
  cursor: pointer;
  z-index: var(--z-sticky);
  transition:
    transform var(--motion-duration-base) var(--motion-ease-standard),
    box-shadow var(--motion-duration-base) var(--motion-ease-standard);
}

.fab:active {
  transform: scale(0.95);
}

/* Variant: intercept (the hostile "block their play" action) */
.intercept {
  background: var(--color-bg-danger);
  color: var(--color-fg-on-accent);
  border-color: var(--color-accent-burned);
  box-shadow: var(--shadow-glow-danger);
  font-size: var(--text-caption);
}

/* Variant: nope (same thing, different label — legacy terminology cleanup) */
.nope {
  background: var(--color-bg-danger);
  color: var(--color-fg-on-accent);
  border-color: var(--color-accent-burned);
  box-shadow: var(--shadow-glow-danger);
  font-size: var(--text-body);
}

/* Urgency animation — active during the intercept window */
.urgent {
  animation: fabPulse var(--motion-duration-dramatic) ease-in-out infinite alternate;
}

@keyframes fabPulse {
  0%, 100% {
    box-shadow: var(--shadow-glow-danger);
    transform: scale(1);
  }
  50% {
    box-shadow:
      0 0 40px var(--color-accent-burned),
      0 0 80px color-mix(in srgb, var(--color-accent-burned) 50%, transparent);
    transform: scale(1.05);
  }
}
```

**Files to delete after this lands**: `src/client/player/NopeButton.tsx`, `NopeButton.module.css`, `InterceptButton.tsx`, `InterceptButton.module.css`. Update all import sites (grep for `from './NopeButton'` and `from './InterceptButton'`) to import from `./FloatingActionButton` instead.

**Acceptance**: both old components deleted, no broken imports, variant prop works.

#### §2.3.8 `JoinScreen.module.css` — REWRITE (205 LOC → ~160 LOC)

**Current problems** (biggest stale contamination in the audit):
- **Every single `var()` fallback is from the UMB noir palette:** `#1a1d30`, `#222540`, `#3a3d5a`, `#9999bb`, `#e8922a`, `#e8e8f0`, `#e03535`. None match the current runtime. This file was authored against UMB and never ported.
- 7 distinct font sizes (`32px/22px/18px/16px/15px/14px/13px`).
- 6 distinct gaps.
- Multiple radius patterns (`999px/12px/50%`).
- Hardcoded animations: `spin 0.8s linear infinite`, `popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both`, `dots 1.5s steps(4, end) infinite`.
- One correct thing: `min-height: 100svh` at line 6 (right axis).

**Key transformations**:
- Every `var(--bg-app, #1a1d30)` → `var(--color-bg-app)` (fallback removed — if the token doesn't exist, that's a Phase 1 bug, not something to paper over).
- All font sizes → `--text-micro` through `--text-display` per the phone type scale.
- `spin` animation keeps structure, consumes `--motion-duration-dramatic` for its 0.8s duration.
- `popIn` cubic-bezier → `--motion-ease-anticipate` (spring-like back-out for the overshoot effect).
- `dots` step animation stays structurally (3-dot loading indicator), consumes `--motion-duration-slow * 4` for its 1.5s cycle — or we leave it hardcoded with a comment. **Decision: leave hardcoded with an inline comment `/* 4-step, 1.5s total = 375ms per step, tuned per-animation for readability */` since it's a one-off step-animation timing that doesn't fit the general scale.** This is an allowed exception documented in §5 Landmines.
- State sub-components: `.connecting`, `.enterName`, `.joined`, `.lobbyPlayerList`, `.playerRow`, etc. — each consumes tokens.

**Acceptance**: zero stale fallbacks, every var() points at a real Phase 1 token, the one exception (dots animation step timing) is documented.

#### §2.3.9 `EliminatedView.module.css` — REWRITE (82 LOC → ~80 LOC)

**Current problems**:
- `#e03535` stale fallback (should be `--color-accent-burned`).
- Hardcoded `padding: 32px 24px`, `gap: 12px/16px/10px/8px`, `margin-top: 20px/16px`, `padding: 16px`, `border-radius: 12px`, `max-width: 300px`, `font-size: 64px/32px/16px/15px/14px/13px`, `drop-shadow(0 0 20px)`, `letter-spacing: 0.08em`.

**Rewritten file content**:

```css
/* EliminatedView.module.css
   Full-screen eliminated state. Replaces PlayingView when the player is no longer alive.
   No interaction beyond dismissing — by design, the §5.6 "vocal participation" experience.
   Player watches the TV with the group.
*/

.view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  min-height: 100svh;
  padding: var(--space-8) var(--space-6);
  background: var(--color-bg-app);
  color: var(--color-fg-primary);
  font-family: var(--font-body);
  text-align: center;
  box-sizing: border-box;
}

/* Animated skull icon — spring entry, scale 0 → 1, rotate -15° → 0°.
   Framer Motion controls the entry animation; CSS controls the resting state. */
.skull {
  font-size: var(--text-display);
  /* Skull emoji renders at display size, ~48px */
  filter: drop-shadow(0 0 var(--space-5) color-mix(in srgb, var(--color-accent-burned) 60%, transparent));
  flex: 0 0 auto;
}

.title {
  font-family: var(--font-display);
  font-size: var(--text-title);
  font-weight: 700;
  color: var(--color-accent-burned);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin: 0;
}

.flavor {
  font-family: var(--font-body);
  font-size: var(--text-body);
  color: var(--color-fg-secondary);
  font-style: italic;
  margin: 0;
  max-width: min(90%, 320px);
  line-height: 1.4;
}

.aliveList {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-4);
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  max-width: min(90%, 320px);
  margin-top: var(--space-5);
}

.aliveListLabel {
  width: 100%;
  font-family: var(--font-display);
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--color-fg-muted);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  margin-bottom: var(--space-2);
}

.alivePlayer {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-3);
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-full);
  font-size: var(--text-caption);
  color: var(--color-fg-primary);
}

.alivePlayerIcon {
  width: var(--space-3);
  height: var(--space-3);
  border-radius: var(--radius-full);
  background: var(--player-color, var(--color-fg-muted));
  flex: 0 0 auto;
}

.prompt {
  font-family: var(--font-body);
  font-size: var(--text-caption);
  color: var(--color-fg-muted);
  margin-top: var(--space-6);
  letter-spacing: 0.04em;
}
```

**Acceptance for this file**:
- [ ] Zero hardcoded hex.
- [ ] Skull drop-shadow uses `color-mix()` against `--color-accent-burned`.
- [ ] Title uses `--color-accent-burned` directly.
- [ ] `.alivePlayerIcon` consumes `--player-color` inline style per existing `PlayerIcon.tsx` pattern (preserved from pre-rebuild).
- [ ] Full phone svh viewport, centered content, max-width on text elements.

#### §2.3.9a Tier 1 retheme gap — EliminatedView.tsx edits

**This is a TSX edit, not a CSS edit. Per roadmap.md §3.3 the user-visible retheme gaps are Phase 2's responsibility because they block the §8.7 first-time-player test.**

**`src/client/player/EliminatedView.tsx:45`** — title line. Currently: `"You Exploded!"`. Replace with: **`"You're Burned."`**

Rationale: matches the game's title and tone (spy-craft failure, not cartoon explosion). Tested against the three title candidates from spec §6.4 (*"Cover Blown"* / *"You're Burned"* / *"Mission Failed"*) — *"You're Burned"* wins because it's the show's terminology for operative compromise and preserves the game name as the identity. Ties the title screen to the elimination screen via a shared motif.

**`src/client/player/EliminatedView.tsx:8-17`** — flavor line pool. Updated per spec §6.4 Tier 1 AND per roadmap.md §3.6 phrasing commitment.

Retheme decisions:

- ✅ KEEP: `"Your cover's blown."`
- ✅ KEEP: `"Game over, hotshot."`
- ✅ KEEP: `"Catastrophic failure."`
- ⚠️ REWORD: `"BOOM. You're cooked."` → `"And just like that, you're cooked."` (dry, drops the shouty "BOOM")
- ❌ CUT: `"Blown to smithereens."` (EK explosion pun)
- ❌ CUT: `"Rest in pieces."` (EK explosion pun)
- ❌ CUT: `"You had a blast."` (EK explosion pun)
- ❌ CUT: `"Ka-boom, baby."` (EK explosion pun)

**Four new Archer-tone dry-comedy lines replace the 4 cuts**:
1. `"HR has been notified."` — bureaucratic aftermath, Archer agency humor.
2. `"Somebody get the cleanup crew."` — matter-of-fact, operative-speak.
3. `"Well, that's one way to resign."` — dry understatement, classic Archer register.
4. `"The Pendleton Agency thanks you for your service."` — bitter-sweet sign-off, ties the game's agency name into the loss state.

**Phrasing beat** (per roadmap.md §3.6 cross-phase design goal — Phase 2's committed phrasing landing spot):
5. `"Penetrated by enemy assets. ...Phrasing."` — the spy-agency frame lets the double entendre land airtight; the ellipsis does the work of Archer's delayed callout.

**Final 9-option flavor pool** (the 3 kept + 1 reworded + 4 new Archer-tone + 1 phrasing beat):
```typescript
const FLAVOR_LINES = [
  "Your cover's blown.",
  "Game over, hotshot.",
  "Catastrophic failure.",
  "And just like that, you're cooked.",
  "HR has been notified.",
  "Somebody get the cleanup crew.",
  "Well, that's one way to resign.",
  "The Pendleton Agency thanks you for your service.",
  "Penetrated by enemy assets. ...Phrasing.",
];
```

**Pool sizing rationale**: 9 options = ~11% chance of hitting the phrasing beat on any single elimination. In a full 5-player BURNED game with 3-4 eliminations across all players, the phrasing beat appears ~30-50% of the time (at least one player sees it per game). Sweet spot for surprise without repetition.

**Acceptance for EliminatedView**:
- [ ] CSS rewritten, zero hardcoded values.
- [ ] Title line changed from "You Exploded!" to "You're Burned.".
- [ ] Flavor pool updated to the 9-line set above, including the phrasing beat.
- [ ] Visual review: the full eliminated state on a 5.5" phone passes the Archer test. Dry-comedy tone, not shouty-EK.
- [ ] Phrasing beat has a reasonable chance of appearing — verify the pool is actually randomized in `EliminatedView.tsx` at the render site (don't hard-code the first line).

#### §2.3.10 `ErrorToast.module.css` — REWRITE (20 LOC → ~18 LOC)

**Current problems**: `#e8e8f0` stale fallback, `animation: slideDown 0.2s ease`, hardcoded `top/left/right: 16px`, `padding: 12px 16px`, `font-size: 14px`, `border-radius: 8px`.

**Rewritten file content** (full, since it's short):

```css
/* ErrorToast.module.css
   Transient error message shown when server rejects an action.
   Auto-dismisses; no user interaction required.
*/

.toast {
  position: fixed;
  top: var(--space-4);
  left: var(--space-4);
  right: var(--space-4);
  padding: var(--space-3) var(--space-4);
  background: var(--color-bg-danger);
  color: var(--color-fg-primary);
  font-family: var(--font-body);
  font-size: var(--text-body);
  border: 1px solid var(--color-border-danger);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  z-index: var(--z-toast);
  animation: slideDown var(--motion-duration-fast) var(--motion-ease-decelerate) both;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-100%);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

**Acceptance**: full token consumption, `--z-toast` layer, motion token timing.

#### §2.3.11 `ConnectionOverlay.module.css` — REWRITE (42 LOC → ~38 LOC)

**Current problems**: stale fallbacks `#3a3d5a`, `#e8922a`, `#9999bb`; `rgba(0, 0, 0, 0.6/0.85)` hardcoded; `animation: spin 0.8s linear infinite`.

**Key transformations**:
- Stale fallbacks → tokens.
- `rgba(0, 0, 0, 0.6)` → `var(--color-bg-overlay)`.
- `rgba(0, 0, 0, 0.85)` → a semantic `--color-bg-overlay-heavy` token (needs adding to Phase 1 § semantic.css, flag for cross-phase resolution).
- `animation: spin 0.8s ...` → `animation: spin var(--motion-duration-dramatic) linear infinite` (0.8s maps to `--motion-duration-dramatic`).

**Cross-phase concern flagged**: Phase 1 semantic.css only defines `--color-bg-overlay` at 85% opacity. This file needs both 60% and 85% variants. **Resolution**: add `--color-bg-overlay-light` and `--color-bg-overlay-heavy` semantic tokens to Phase 1 during deepening. `--color-bg-overlay` stays as the default (85%), alias to `--color-bg-overlay-heavy`.

#### §2.3.12 `CardDetailSheet.module.css` — REWRITE (43 LOC → ~40 LOC)

**Good news**: one of only two genuinely clean files in the audit (no literal hex, minimal drift). Mostly a straight spacing/font-size token migration.

**Key transformations**: `gap/padding → --space-*`, `font-size → --text-*-phone`, `letter-spacing: 0.1em` stays (design decision), `max-width: 280px` → `max-width: var(--size-card-detail-max)` (add to Phase 1 semantic.phone.css).

**Cross-phase concern flagged**: Phase 1 needs `--size-card-detail-max`. Resolution: add during deepening, default to 280px svh-clamp.

#### §2.3.13 `sheets/sheets.module.css` — REWRITE (228 LOC → ~190 LOC)

**The biggest phone-view CSS file.** Styles all bottom-sheet prompts: TargetSelect, PeekResult, FavorPick, ComboNameStealer, FuturePeek, DefusePlacement.

**Current problems**:
- 35+ unique values across font-size, padding, gap.
- Component-specific `--peek-accent` custom property pattern cascaded via inline style — this is actually a GOOD pattern and should be preserved.
- Some literal hex: `#1c1a15`, `#d4cfc5`, `#fffdf8` (light-mode only values).

**Migration approach**: Since this file has ~40 classes, the migration is purely mechanical — every value → token — with one architectural preservation: the `--peek-accent` inline-style cascade stays, but the primitive color it's set to in the TSX consumer should come from the `cardAccent()` function (which lives in `theme.ts` today, moves to `palette.ts` in Phase 1).

**Key transformations per section**:
- `.sheet` container — uses `--color-bg-surface`, `--radius-modal`, `--shadow-lg`, `var(--space-*)`.
- `.sheetHeader`, `.sheetTitle`, `.sheetBody` — typography from `--text-*-phone`.
- `.optionButton`, `.optionGrid` — `var(--size-touch-target)` minimum, `--space-*` gaps.
- `.cardPreview` container — uses `var(--peek-accent, var(--color-border-subtle))` pattern preserved.
- Animations: `slideUp`, `fadeIn` keyframes consume `--motion-duration-base`, `--motion-ease-decelerate`.

**Acceptance**: every value tokenized, `--peek-accent` pattern preserved, bottom-sheet slide animation uses motion tokens.

#### §2.3.14 `player-hardening.css` — REWRITE (29 LOC → ~38 LOC)

**Current problems**:
- `100vh` fallback pattern — dead weight (svh is Baseline Widely Available since iOS Safari 15.4).
- No global `box-sizing: border-box` — each `.module.css` file has to remember to set it.
- No `color-scheme` hint for browser UI.

**Rewritten file content**:

```css
/* player-hardening.css
   Global mobile-browser hardening for the phone entry point.
   Applied via <link rel="stylesheet"> in player.html, before any component CSS.
*/

*,
*::before,
*::after {
  box-sizing: border-box;
}

:root {
  /* Tell browser UI (scrollbars, form controls, status bar) that this is a dark app. */
  color-scheme: dark;
}

html,
body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100svh;
  overflow: hidden;
  background: var(--color-bg-app);
  color: var(--color-fg-primary);
  font-family: var(--font-body);
  font-size: var(--text-body);
  line-height: 1.4;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  /* Prevent bounce-scroll and pull-to-refresh on iOS / Android */
  overscroll-behavior: none;
  /* Prevent accidental text selection during gameplay */
  -webkit-user-select: none;
  user-select: none;
  /* Disable iOS tap highlight — we handle feedback explicitly */
  -webkit-tap-highlight-color: transparent;
}

#root {
  width: 100%;
  height: 100svh;
  overflow: hidden;
}

/* Restore text selection where it makes sense — room code, player name input */
input,
textarea,
[data-selectable] {
  -webkit-user-select: text;
  user-select: text;
}
```

**Acceptance for this file**:
- [ ] Global `box-sizing: border-box` — eliminates the per-file `box-sizing` workarounds from the autopsy's landmine list.
- [ ] `100vh` fallback removed.
- [ ] `color-scheme: dark` set.
- [ ] `html`, `body`, `#root` all use `var(--color-bg-app)`.
- [ ] Text selection allowed on inputs and `[data-selectable]` elements.

### §2.4 Dead code deletion

- **Delete `src/client/player/TurnBanner.tsx`** — verified unused via Grep (only self-reference). Replaced by `StatusBar.tsx` per comment in `StatusBar.module.css:1`.
- **Delete `src/client/player/TurnBanner.module.css`** — 48 LOC of dead CSS.
- **Verification step before commit**: `rg "TurnBanner" src/client/ src/server/` should return zero results after deletion. If any file references `TurnBanner`, it's a stale import and needs fixing.

### §2.5 Component consolidation: `FloatingActionButton`

Per §2.3.7 above. New files created, old files (`NopeButton.*`, `InterceptButton.*`) deleted, import sites updated.

**Import site audit** — run `rg "from.*(NopeButton|InterceptButton)" src/client/` to find every consumer. Expected consumers (from audit):
- `src/client/player/Player.tsx` or `PlayingView.tsx` — one of these renders the active floating action button.

Replace with:
```tsx
import { FloatingActionButton } from './FloatingActionButton';

// was:
// <InterceptButton ... />  or  <NopeButton ... />
// now:
<FloatingActionButton variant="intercept" visible={...} onClick={...} remainingMs={...} />
```

### §2.6 Cross-view fix: `BottomSheet.module.css` — REWRITE (31 LOC → ~55 LOC)

**File**: `src/client/shared/BottomSheet.module.css` (shared directory — consumed by phone bottom sheets only; board doesn't use bottom sheets).

**Current problems**:
- `max-height: 80dvh` at two sites (lines 6 and 26) — `dvh` causes mid-scroll shimmering on iOS Safari per Agent C research.
- Hardcoded `padding: 20px 16px`, `border-radius: 16px 16px 0 0`.
- Stale `#1a1a2e`, `#e8e8f0`, `rgba(0, 0, 0, 0.6)`.

**Rewritten file content**:

```css
/* BottomSheet.module.css
   Phone bottom-sheet container. Slides up from the bottom edge of the viewport
   with a backdrop behind it. Consumed by every bottom-sheet prompt:
   TargetSelect, PeekResult, FavorPick, ComboNameStealer, FuturePeek, DefusePlacement, CardDetailSheet.

   Note: "shared" directory but phone-only use case. Board view does not use bottom sheets.
*/

.backdrop {
  position: fixed;
  inset: 0;
  background: var(--color-bg-overlay-light);
  z-index: var(--z-modal);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  /* Fade-in animation driven by Framer Motion in BottomSheet.tsx,
     not a CSS transition — AnimatePresence controls mount/unmount. */
}

.sheet {
  width: 100%;
  max-width: var(--size-root-max-width);
  max-height: 80svh; /* svh, not dvh — dvh causes mid-scroll shimmering on iOS */
  padding: var(--space-5) var(--space-4);
  background: var(--color-bg-elevated);
  color: var(--color-fg-primary);
  font-family: var(--font-body);
  border-top: 1px solid var(--color-border-subtle);
  border-top-left-radius: var(--radius-xl);
  border-top-right-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

/* Drag handle — visual affordance that the sheet can be dragged to dismiss.
   Actual drag gesture handled by Framer Motion in BottomSheet.tsx. */
.handle {
  width: var(--space-10);
  height: var(--space-1);
  margin: 0 auto var(--space-3);
  background: var(--color-border-strong);
  border-radius: var(--radius-full);
  flex: 0 0 auto;
}

/* Short variant: max-height: 60svh instead of 80svh, for smaller prompts */
.sheetShort {
  max-height: 60svh;
}
```

**Acceptance for this file**:
- [ ] Zero `dvh` usage.
- [ ] Zero hardcoded hex, spacing, radius values.
- [ ] Uses `--color-bg-overlay-light` (requires addition to Phase 1 during deepening — see cross-phase flags in §7).
- [ ] Drag handle element exists for gesture-dismiss affordance.

### §2.7 `MinimalCard.tsx` TSX-only edit (CSS stays for Phase 3)

**Background**: `MinimalCard.tsx` currently reads `cardAccent(type)` from `theme.ts` to get per-card-type accent colors as inline `--card-accent` / `--card-glow-color` custom properties.

**Edit**: update the import to pull from `palette.ts` (new Phase 1 location) instead of `theme.ts` (deleted in Phase 1).

```tsx
// Phase 2 edit:
- import { cardAccent } from '@client/shared/theme';
+ import { cardAccent } from '@client/shared/tokens/palette';
```

**CSS file** `MinimalCard.module.css` stays untouched until **Phase 3** (rewritten as part of cross-view migration because it's used on both phone and board).

**Acceptance**: `MinimalCard.tsx` imports from the new location, no TypeScript errors, runtime behavior unchanged.

---

## §3 — Step-by-Step Execution Order

1. **Verify Phase 1 is merged and green.** `pnpm test` + `pnpm typecheck` clean. `src/client/shared/tokens/` exists and all semantic tokens are in place.
2. **Create FloatingActionButton component.** New files `FloatingActionButton.tsx` + `FloatingActionButton.module.css` per §2.3.7 + §2.5. Do not delete old files yet.
3. **Update import sites** to use `FloatingActionButton`. Run `pnpm typecheck` — should still pass (both old and new files exist, both are consumed transiently during this step).
4. **Delete `NopeButton.*`, `InterceptButton.*`, `TurnBanner.*`.** Run `pnpm typecheck` + `rg "NopeButton\|InterceptButton\|TurnBanner" src/client/ src/server/` — expect zero matches.
5. **Update `MinimalCard.tsx`** per §2.7 to import `cardAccent` from `palette.ts`.
6. **Rewrite `player-hardening.css`** per §2.3.14.
7. **Rewrite `PlayingView.module.css`** per §2.3.1.
8. **Rewrite `StagingArea.module.css`** per §2.3.3.
9. **Rewrite `Hand.module.css`** per §2.3.2.
10. **Rewrite `SmartActionBox.module.css`** per §2.3.4.
11. **Rewrite `TitleBar.module.css`** per §2.3.5.
12. **Rewrite `StatusBar.module.css`** per §2.3.6.
13. **Rewrite `JoinScreen.module.css`** per §2.3.8.
14. **Rewrite `EliminatedView.module.css`** per §2.3.9.
15. **Edit `EliminatedView.tsx`** per §2.3.9a — title + flavor lines.
16. **Rewrite `ErrorToast.module.css`** per §2.3.10.
17. **Rewrite `ConnectionOverlay.module.css`** per §2.3.11.
18. **Rewrite `CardDetailSheet.module.css`** per §2.3.12.
19. **Rewrite `sheets/sheets.module.css`** per §2.3.13.
20. **Rewrite `BottomSheet.module.css`** per §2.6 (cross-view but phone-consumer).
21. **Run full suite**: `pnpm test` + `pnpm typecheck` + `pnpm lint` + `pnpm build`.
22. **Bundle size check**: phone entry ≤100KB gzipped.
23. **Visual smoke test**: Playwright screenshots of every phone screen at 375×667 and 1024×1366.
24. **Tier 1 retheme gap acceptance** — live review of the eliminated state on a real phone.
25. **Commit with tag**: `feat(css-foundation): Phase 2 — phone view migration`.

Commit points between major file rewrites (every 3-4 files). Don't commit a single mega-commit; commit incrementally so bisecting is possible if a regression appears.

---

## §4 — Acceptance Criteria

### §4.1 File state

- [ ] All 14 phone `.module.css` files rewritten — zero hardcoded hex, spacing, font-size, radius, shadow, motion timing, z-index values.
- [ ] `player-hardening.css` rewritten — uses tokens, no `100vh` fallback.
- [ ] `BottomSheet.module.css` rewritten — `dvh` → `svh`, tokens consumed.
- [ ] `FloatingActionButton.tsx` + `.module.css` created.
- [ ] `NopeButton.*`, `InterceptButton.*`, `TurnBanner.*` deleted — 6 files total.
- [ ] `MinimalCard.tsx` imports from `palette.ts`, not `theme.ts`.
- [ ] `EliminatedView.tsx` title and flavor lines updated per §2.3.9a.

### §4.2 Purity checks (automated)

- [ ] `rg "#[0-9a-fA-F]{3,8}" src/client/player/` returns zero matches outside comments. (Grep check for stray hex.)
- [ ] `rg "\\b\\d+px\\b" src/client/player/ | grep -v "comment\\|landmine"` returns only documented-exception lines (e.g., `min-width: 120px` on `.slot` in `Hand.module.css`, which is a structural floor).
- [ ] `rg "\\bvw\\b" src/client/player/` returns zero matches outside comments. **This is the axis-violation purity check.**
- [ ] `rg "NopeButton\\|InterceptButton\\|TurnBanner" src/client/ src/server/` returns zero matches.

### §4.3 Test & build checks

- [ ] `pnpm typecheck` — clean.
- [ ] `pnpm test` — all 167+ tests pass. No regression.
- [ ] `pnpm lint` — clean. No ESLint errors from import-boundary or dead-code rules.
- [ ] `pnpm build` — succeeds. Phone entry ≤100KB gzipped.

### §4.4 Visual review

- [ ] **Dev server smoke test**: `pnpm dev` + `pnpm dev:server` start cleanly. Navigate to `http://localhost:5173/player.html?room=TEST` and walk through:
  - JoinScreen → enter name → joined
  - PlayingView in all 7 SmartActionBox states (Stand-by / Draw / DrawIntense / ComboPair / ComboTriple / Action / Invalid)
  - Each bottom sheet (TargetSelect / PeekResult / FavorPick / ComboNameStealer / FuturePeek / DefusePlacement / CardDetailSheet)
  - ErrorToast (trigger via a deliberate server rejection)
  - ConnectionOverlay (trigger via `pnpm dev:server` restart mid-session)
  - EliminatedView (trigger via a 5-player game with forced elimination)
- [ ] **Playwright visual regression matrix**: 375×667, 393×852, 744×1133, 1024×1366 portrait for every screen above. Save outputs to `docs/plans/css-foundation-rebuild/phase-2-screenshots/` for reference.
- [ ] **Archer acceptance test on every screen.** Binary yes/no per §2.2. If any screen fails, triage: is it a token issue (back to Phase 1) or a component-level issue (fix in Phase 2)?
- [ ] **Tier 1 retheme visual acceptance**: the EliminatedView's new title and flavor lines read as Archer-tone. Drop the shouty-EK energy.

### §4.5 iPad portrait cap

- [ ] At 1024×1366 portrait, the phone view renders with `max-width: var(--size-root-max-width)` (640px). Content is centered with excess horizontal space as background margin. Nothing stretches to fill the iPad width.

---

## §5 — Landmines

Carrying forward from Agent A's codebase audit. Each landmine below is an architectural truth that must survive the rewrite as a preserved comment, not a deleted-during-cleanup loss.

1. **Hand cards at `height:100%` + `aspect-ratio` overflow the screen.** Current fix: aspect-ratio on the SLOT wrapper, not the card. Preserved as comment in `Hand.module.css` header.
2. **No global `box-sizing: border-box`.** Added manually to `.card` and `.hand` in the current code. **Phase 2 opportunity**: add it globally to `html, *, *::before, *::after` in `player-hardening.css` and remove the per-element copies. Flag as a sub-task of §2.3.14.
3. **`overflow: hidden` on staging section clips absolutely-positioned elements.** Section labels must be INSIDE the box, not floating on the border. Preserved in `PlayingView.module.css` comment.
4. **CSS `justify-content: center` on scroll containers clips left overflow.** Use `::before`/`::after` flex spacers + JS scroll centering instead. This only matters for `StagingArea`'s horizontal scroll — preserved as a comment if/when that pattern is needed.
5. **Framer Motion `layoutId` on staged cards causes border flash** when siblings exit. Removed in current code. `transition: none` on `[data-selected]` prevents remaining flicker. **Phase 2 must preserve** the `transition: none` override where it exists.
6. **`dots` step animation in `JoinScreen.module.css` uses a one-off step timing** (4 steps, 1.5s total, 375ms per step). Doesn't fit the general motion scale. **Allowed exception** — keep hardcoded with inline comment explaining why.
7. **FloatingActionButton z-index is load-bearing.** Must remain on top (`--z-sticky`), always. Preserved as comment in `FloatingActionButton.module.css`.
8. **`MinimalCard` threshold detection uses content-box math.** Preserved in the MinimalCard CSS (Phase 3) — but the inline-style cascade pattern for `--card-accent` must survive Phase 2's TSX edit.

---

## §6 — Out of Scope

Phase 2 **does not** include:

- **`MinimalCard.module.css` rewrite.** Phase 3 owns it (cross-view component, board has bigger constraint).
- **`DramaOverlay.module.css` rewrite.** Phase 3 owns it (cross-view).
- **`GameOver.module.css` rewrite.** Phase 3 owns it (cross-view).
- **Motion token consolidation across Framer Motion inline literals.** Phase 4 owns the sweep. Phase 2 migrates CSS animation keyframes to consume motion tokens, but individual Framer Motion `transition={{ ... }}` props in phone TSX files are NOT migrated in Phase 2.
- **Board view migration.** Phase 3.
- **iOS 26 real-device testing.** Phase 5.
- **Full game loop acceptance test (§8.6 of spec).** Phase 5.
- **First-time player test (§8.7 of spec).** Phase 5.
- **Light mode theme.** Deferred until post-Phase-5.

---

## §7 — Cross-Phase Dependencies

**Phase 2 depends on:**
- **Phase 1** for every token consumed. If Phase 1 is missing a token Phase 2 needs, add it to Phase 1 via amendment, not a local patch.
- **`BottomSheet.module.css` cross-view status** — shared directory, but phone-exclusive consumer. Phase 3 deepening may find a conflict; resolve then.

**Phase 2 is depended on by:**
- **Phase 3** for the `palette.ts` import pattern (established by Phase 2's `MinimalCard.tsx` edit).
- **Phase 4** for the CSS keyframe motion-token consumption pattern (Phase 2 establishes it, Phase 4 expands across Framer Motion inline literals).
- **Phase 5** for the Playwright visual regression screenshots baseline — Phase 2 captures "after phone migration" screenshots that Phase 5 compares against final "after all phases" screenshots.

**Cross-phase tokens flagged during Phase 2 draft** (to be added to Phase 1 during deepening):
- `--color-bg-overlay-light` (60% alpha variant of overlay bg) — needed by `ConnectionOverlay.module.css` and `BottomSheet.module.css`.
- `--color-bg-overlay-heavy` (85% alpha, aliases `--color-bg-overlay`) — needed by same.
- `--size-card-detail-max` (max-width for CardDetailSheet modal) — needed by `CardDetailSheet.module.css`.

Flag these in deepen-plan review of Phase 1.

---

## §8 — Bundle Budget Impact

**Expected deltas** (phone entry, gzipped):

| Change | Δ (estimated) |
|---|---|
| Delete `NopeButton.*` + `InterceptButton.*` + `TurnBanner.*` | −1.5 KB |
| New `FloatingActionButton.*` | +1.2 KB |
| Rewrite all 14 CSS modules (token-based is typically more compressible) | −2 KB to 0 KB |
| Delete stale hex fallbacks (reduces CSS module size) | −0.5 KB |
| Tier 1 retheme text changes | +0.1 KB (new flavor lines slightly longer) |

**Net expected**: −2 to −3 KB on phone entry. Phase 2 likely *improves* the bundle budget headroom.

If bundle size regresses unexpectedly, investigate the rewritten CSS modules for:
- Accidental token duplication (consuming the same token 3x in one rule).
- Comments that should have been stripped by the CSS minifier but weren't.
- Unused CSS classes that should be deleted.

---

## §9 — Sources

- **Agent A codebase audit** (inlined in conversation, 2026-04-11). Per-file hardcoded value enumeration and stale-fallback contamination map.
- **`docs/post-mortems/VISUAL-LAYER-AUTOPSY.md`** — the "two sizing systems in one layout" diagnosis that informs §2.3.1 and §2.3.3.
- **`docs/specifications/PRODUCT-SPECIFICATION.md` §6.1** — phone component inventory (the authoritative list of states and screens).
- **`docs/specifications/PRODUCT-SPECIFICATION.md` §6.4 Tier 1** — EliminatedView retheme gaps source.
- **`phase-1-foundation.md`** — token contract this phase consumes.

---

*Phase 2 is ready for `/deepen-plan` once all 5 phase files are drafted. Deepening will surface contradictions with Phase 1 (e.g., the flagged cross-phase tokens) and with Phases 3-5. No `/ce:work` invocation until the full contradiction map is resolved.*
