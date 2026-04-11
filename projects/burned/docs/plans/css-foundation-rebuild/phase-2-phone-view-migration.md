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

**Rewritten file content**:

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

/* Keyboard focus indicator — visible only on keyboard nav, never on mouse click.
   Outline (not box-shadow) so the focus ring never fights variant glow effects:
   .action / .drawIntense / .comboPair already paint shadow-glows, and stacking a
   focus shadow on top would either get clobbered or muddy the glow. Outline is a
   separate paint layer; it always wins. WCAG 2.4.7 (focus visible). */
.box:focus-visible {
  outline: 2px solid var(--color-border-focus);
  outline-offset: var(--space-1);
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
- **Keyboard focus indicator added.** Pre-rebuild SmartActionBox had no focus ring at all — a WCAG 2.4.7 violation that the audit missed. The rewrite adds a single `.box:focus-visible` rule that paints an `outline: 2px solid var(--color-border-focus)` with `outline-offset: var(--space-1)`. Outline (not `box-shadow`) is the right tool because every interactive variant already paints a `--shadow-glow-*`, and stacking a focus shadow on top would either get clobbered by the glow or muddy it. Outline is a separate paint layer — it always wins. `--color-border-focus` is `--color-ochre-8` per Phase 1 §2.2 — amber accent ring, high-contrast on every variant background, CVD-friendly.

**Acceptance for this file**:
- [ ] Zero hardcoded hex.
- [ ] Zero hardcoded motion timing.
- [ ] 7 state variants each have a clear role mapping.
- [ ] `breathe` and `breatheIntense` keyframes use `color-mix()` for intensity shifts, not hardcoded rgba values.
- [ ] `.box:focus-visible` paints an outline ring — keyboard accessibility (WCAG 2.4.7). Verified by tabbing to the box in dev mode and confirming a visible amber outline appears with no glow conflict on `.action` / `.drawIntense` / `.comboPair`.

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

#### §2.3.8 `JoinScreen.module.css` — REWRITE (206 LOC → ~190 LOC)

**Current problems** (biggest stale contamination in the audit):
- **Every single `var()` fallback is from the UMB noir palette.** 22 fallback sites across the file, all from the dead noir palette: `var(--bg-app, #1a1d30)` (×2), `var(--text-primary, #e8e8f0)` (×3), `var(--font-body, system-ui, sans-serif)` (×1), `var(--bg-card, #222540)` (×3), `var(--border-subtle, #3a3d5a)` (×4), `var(--text-secondary, #9999bb)` (×4), `var(--amber, #e8922a)` (×4), `var(--red, #e03535)` (×1). None match the current runtime. This file was authored against UMB and never ported.
- 7 distinct font sizes hardcoded: `32px/26px/22px/18px/16px/15px/14px/13px`. No shared scale.
- 6 distinct gap values: `6px/8px/10px/12px/16px`.
- 5 distinct padding values: `8px 20px / 14px 16px / 14px / 16px / 32px`.
- Multiple radius patterns: `999px / 12px / 50%`. Three different mechanisms for the same job.
- Hardcoded animations: `spin 0.8s linear infinite`, `popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both`, `dots 1.5s steps(4, end) infinite`.
- Hardcoded transitions: `border-color 0.15s`, `opacity 0.15s` — both 150ms (= `--motion-duration-fast`) but with no easing specified.
- **`prefers-reduced-motion` is the same half-measure as ConnectionOverlay** — slows the spin from 0.8s to 1.5s instead of replacing rotation. WCAG 2.3.3 spirit violation.
- **Dead `[data-theme="light"]` override block at lines 195-205.** Light mode is deferred per §6 Out of Scope; these rules reference legacy token names and never fire in the current build. Dead code.
- **No `:focus-visible` on `.joinButton`.** Same WCAG 2.4.7 gap as pre-rebuild SmartActionBox (§2.3.4) — keyboard users get no focus indicator on the primary CTA.
- One thing the file gets right: `min-height: 100svh` at line 6 (correct phone axis).

**Rewritten file content**:

```css
/* JoinScreen.module.css
   Three-state phone screen: connecting → enter name → joined+lobby.
   Renders before the player has any cards. Branding moment + form + waiting state.

   The "BURNED" title is the player's first impression of the visual identity —
   display font, biggest type token (--text-display 32-48px fluid), bold.

   Drama-channel consistency: the room code, the input focus border, the join
   button background, and the spinner accent ALL consume --color-accent-drama.
   Across the system, ochre = "we are working on it / pay attention to it" —
   matches TitleBar .dotConnecting and ConnectionOverlay spinner.
*/

.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100svh;
  padding: var(--space-8);
  background: var(--color-bg-app);
  color: var(--color-fg-primary);
  font-family: var(--font-body);
}

/* --- Enter Name State --- */

.title {
  font-family: var(--font-display);
  font-size: var(--text-display);
  font-weight: 700;
  letter-spacing: 0.02em;
  margin-bottom: var(--space-4);
}

/* Room code badge — pill with display-font + ochre accent on the code itself. */
.roomBadge {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-5);
  border-radius: var(--radius-pill);
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-subtle);
  margin-bottom: var(--space-10);
}

.roomLabel {
  font-family: var(--font-display);
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--color-fg-secondary);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.roomCode {
  font-family: var(--font-display);
  font-size: var(--text-title);
  font-weight: 700;
  letter-spacing: 0.15em;
  color: var(--color-accent-drama);
}

.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  width: 100%;
  /* Form column max-width — keeps the input from stretching across full phone width.
     Structural floor, not a design decision. See cross-phase note below — Phase 1
     deepening may unify form/lobby/hint/eliminated max-widths under one token. */
  max-width: 300px;
}

.input {
  padding: var(--space-4);
  font-family: var(--font-body);
  font-size: var(--text-callout);
  border: 2px solid var(--color-border-subtle);
  border-radius: var(--radius-input);
  background: var(--color-bg-surface);
  color: var(--color-fg-primary);
  outline: none;
  transition: border-color var(--motion-duration-fast) var(--motion-ease-standard);
}

.input:focus {
  border-color: var(--color-accent-drama);
}

.error {
  font-family: var(--font-body);
  font-size: var(--text-body);
  color: var(--color-fg-danger);
  margin: 0;
}

.joinButton {
  padding: var(--space-4);
  font-family: var(--font-display);
  font-size: var(--text-callout);
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  border: none;
  border-radius: var(--radius-button);
  background: var(--color-accent-drama);
  color: var(--color-bg-app);
  cursor: pointer;
  touch-action: manipulation;
  transition: opacity var(--motion-duration-fast) var(--motion-ease-standard);
}

.joinButton:hover {
  opacity: 0.9;
}

/* Keyboard focus indicator — outline (not box-shadow), same pattern as SmartActionBox.
   --color-border-focus = ochre-8, which is one step lighter than the .joinButton bg
   (accent-drama = ochre-9) for clear contrast against the button itself. */
.joinButton:focus-visible {
  outline: 2px solid var(--color-border-focus);
  outline-offset: var(--space-1);
}

/* --- Connecting State --- */

.spinner {
  width: var(--space-8);
  height: var(--space-8);
  border: 3px solid var(--color-border-subtle);
  border-top-color: var(--color-accent-drama);
  border-radius: var(--radius-full);
  animation: joinScreenSpin var(--motion-duration-dramatic) linear infinite;
}

.status {
  font-family: var(--font-body);
  font-size: var(--text-callout);
  color: var(--color-fg-secondary);
  margin-top: var(--space-3);
}

/* --- Joined State --- */

.joinedCard {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
}

.iconWrap {
  /* Spring back-out overshoot — anticipate easing scaled from 0 to 1 over slow duration. */
  animation: joinScreenPopIn var(--motion-duration-slow) var(--motion-ease-anticipate) both;
}

.joinedName {
  font-family: var(--font-display);
  font-size: var(--text-title);
  font-weight: 700;
  margin: 0;
}

.waiting {
  font-family: var(--font-body);
  font-size: var(--text-body);
  color: var(--color-fg-secondary);
  margin: 0;
}

.waitingDots::after {
  content: '';
  /* One-off step animation — 4-step, 1.5s total = 375ms per step, tuned for
     readability of a 3-dot loading indicator. Allowed exception per §5 landmine 6
     (doesn't fit the general motion scale, kept hardcoded). */
  animation: joinScreenDots 1.5s steps(4, end) infinite;
}

/* --- Lobby Player List (joined state, multi-player) --- */

.lobbyList {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-3);
  margin-top: var(--space-8);
  padding: var(--space-4);
  border-radius: var(--radius-surface);
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-subtle);
  width: 100%;
  /* Lobby list cap — structural floor, mirrors form max-width pattern above. */
  max-width: 320px;
}

.lobbyPlayer {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.lobbyPlayerName {
  font-family: var(--font-body);
  font-size: var(--text-body);
  color: var(--color-fg-primary);
}

/* --- Keyframes --- */

@keyframes joinScreenSpin {
  to { transform: rotate(360deg); }
}

@keyframes joinScreenPopIn {
  from { transform: scale(0); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

@keyframes joinScreenDots {
  0% { content: ''; }
  25% { content: '.'; }
  50% { content: '..'; }
  75% { content: '...'; }
}

@keyframes joinScreenSpinnerPulse {
  from { opacity: 0.4; }
  to { opacity: 1; }
}

/* Reduced motion: spin → opacity pulse (vestibular safety, WCAG 2.3.3),
   popIn → instant, dots → frozen at "..." (the final state). */
@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation: joinScreenSpinnerPulse var(--motion-duration-dramatic) var(--motion-ease-standard) infinite alternate;
  }
  .iconWrap {
    animation: none;
  }
  .waitingDots::after {
    animation: none;
    content: '...';
  }
}
```

**Key transformations**:
- **All 22 stale UMB fallback hexes purged.** Every `var()` call points at a Phase 1 token; zero fallbacks. If a token doesn't exist, the answer is "add to Phase 1," not "paper over with a hex."
- **7 hardcoded font sizes → fluid type scale.** `.title` → `--text-display` (32-48px), `.roomCode` + `.joinedName` → `--text-title` (20-28px), `.input` + `.joinButton` + `.status` → `--text-callout` (16-20px), `.error` + `.waiting` + `.lobbyPlayerName` → `--text-body` (14-18px), `.roomLabel` → `--text-caption` (11-13px). Every size lands on the scale; iPad portrait gets a meaningfully larger render than the smallest phone.
- **All 6 hardcoded gaps → spacing scale.** `6px → --space-2` (snap up to 8 to land on scale), `8px → --space-2`, `10px → --space-3` (12), `12px → --space-3`, `16px → --space-4`.
- **All 5 hardcoded paddings → spacing scale.** `.container 32px → --space-8`, `.input 14px → --space-4` (snap up to 16 — ensures the input clears the 44px touch-target floor at the smallest font size: 16+16+16 = 48px), `.joinButton 14px → --space-4` (same reason), `.lobbyList 16px → --space-4`, `.roomBadge 8px 20px → --space-2 var(--space-5)`.
- **3 different radius mechanisms → 4 semantic aliases.** `.roomBadge 999px → --radius-pill`. `.spinner 50% → --radius-full`. `.lobbyList 12px → --radius-surface` (preserves current 12px). **`.input` and `.joinButton` 12px → `--radius-input` and `--radius-button` (both 4px)**. This is a **deliberate visual change** — Phase 1's semantic aliases establish a hierarchy: cards 8px, surfaces 12px, modals 16px, inputs/buttons 4px. The current 12px on inputs/buttons are wrong by Phase 1's reckoning. Documented here so it's not a surprise during visual review; if Phase 1's call is wrong, the fix is to amend Phase 1's `--radius-input` / `--radius-button` aliases, not to override them in this file.
- **`spin` keyframe** stays structurally, consumes `var(--motion-duration-dramatic)` for the 0.8s duration. Keyframe renamed `joinScreenSpin` for compiled-output clarity (CSS Modules scopes keyframe names regardless).
- **`popIn` cubic-bezier → `var(--motion-ease-anticipate)`** — verified Phase 1 has `cubic-bezier(0.68, -0.55, 0.265, 1.55)` at this name. Spring back-out overshoot, the exact effect the original wanted. Duration `0.4s → var(--motion-duration-slow)`.
- **`dots` step animation kept hardcoded with explicit landmine comment** — the 4-step, 1.5s total / 375ms per step timing doesn't fit the general motion scale (the scale's smallest step is `--motion-duration-instant: 100ms`, the largest is `--motion-duration-dramatic: 800ms`; a 4-step cycle of 375ms each doesn't compose from these). Allowed exception per §5 landmine 6.
- **2 hardcoded transitions** (`border-color 0.15s`, `opacity 0.15s`) → `var(--motion-duration-fast) var(--motion-ease-standard)` (150ms, with explicit easing curve). Pre-rebuild had no easing specified — browser default is `ease`, which is close to but not identical to standard. Tightening the contract.
- **Reduced-motion upgrade**: spin → opacity pulse (same WCAG 2.3.3 fix as ConnectionOverlay §2.3.11). `iconWrap` popIn → instant (preserved). `waitingDots::after` → frozen at "..." (preserved).
- **Dead `[data-theme="light"]` rules deleted.** Light mode is out of scope per §6; these rules referenced legacy token names and never fired in the current build. Removing dead code aligns with the rebuild philosophy. If light mode comes back post-Phase-5, it gets re-implemented from scratch on top of the new token system, not patched onto the old override pattern.
- **`:focus-visible` on `.joinButton`** — outline (not box-shadow), same pattern as §2.3.4 SmartActionBox. WCAG 2.4.7. `--color-border-focus` = ochre-8, one step lighter than `--color-accent-drama` (ochre-9) used for the button background — clear contrast against the button itself.
- **Drama-channel consistency:** `.roomCode`, `.input:focus` border, `.joinButton` background, `.spinner` accent all consume `--color-accent-drama`. Same token TitleBar `.dotConnecting` and ConnectionOverlay spinner reach for. The whole "we are working on it / pay attention to it" semantic lives on one token, system-wide.
- **`.input:focus` stays as `:focus`** (not `:focus-visible`) — text inputs need to communicate the active field whether reached by tap or keyboard. `:focus` is the right pseudo-class for inputs; `:focus-visible` is for buttons.
- **Font-family explicitly set on every text element** — pre-rebuild relied on inheritance from `.container { font-family: ... }`. Explicit per-rule declarations make refactors safer.

**Cross-phase concern flagged** (carries forward to Phase 1 deepening):
- `.form { max-width: 300px }`, `.lobbyList { max-width: 320px }`, `.error` text width, `CardDetailSheet .hint { max-width: 280px }`, and `EliminatedView` content max-widths all live in the **280-320px "narrow content column"** range. Five consumers, no token. **Suggested Phase 1 deepening**: introduce a single `--size-content-narrow` token (fluid clamp, default range 280-320 svh-based) and migrate all five consumers. This is bigger than the existing `--size-card-detail-max` flag for §2.3.12 — consider unifying both.
- **`--radius-input` and `--radius-button` semantic aliases**: Phase 1 currently maps both to `--radius-sm` (4px). If visual review against Dreamland reference stills shows the rewritten input/button feel too sharp, the fix is to change the alias in Phase 1's `semantic.css`, NOT to override in this file. Flag for Phase 1 visual-review pass.

**Acceptance for this file**:
- [ ] Zero hardcoded hex (22 stale fallbacks purged).
- [ ] Zero hardcoded spacing / font-size / radius / motion timing values (one documented exception: the dots step animation, per landmine 6).
- [ ] Zero `var(...)` fallback expressions.
- [ ] Dead `[data-theme="light"]` override block deleted.
- [ ] `:focus-visible` outline on `.joinButton` — keyboard accessibility verified by tabbing through the form in dev mode and confirming the amber outline appears around the button.
- [ ] `.input:focus` border-color animation runs cleanly at the new `--motion-duration-fast` + `--motion-ease-standard` timing.
- [ ] `prefers-reduced-motion: reduce` replaces the spinner animation with `joinScreenSpinnerPulse` (opacity oscillation), not a slowed spin.
- [ ] All three states render correctly: connecting (spinner + status), enter-name (title + roomBadge + form), joined (joinedCard + iconWrap pop-in + waiting + lobby list when multiplayer).
- [ ] BURNED title at `--text-display` (32px on iPhone SE, 48px on iPad portrait) reads as a branding moment, not as body text.
- [ ] Visual review against Dreamland reference: the room code in `--color-accent-drama` (ochre) feels period-correct against the warm-charcoal background, not jarring.
- [ ] `--size-content-narrow` exists in Phase 1's `semantic.phone.css` before this file is executed in `/ce:work` (Phase 1 deepening adds it; until then, the raw `300px` / `320px` max-widths are intentional placeholders).

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

#### §2.3.11 `ConnectionOverlay.module.css` — REWRITE (42 LOC → ~50 LOC)

**Current problems**:
- Stale UMB noir fallbacks: `var(--border-subtle, #3a3d5a)`, `var(--amber, #e8922a)`, `var(--text-secondary, #9999bb)`. None of the fallback hexes match current runtime values.
- `var(--text-primary)` consumes a token that no longer exists at the new semantic layer (renamed to `--color-fg-primary` in Phase 1).
- Radial gradient uses `rgba(0, 0, 0, 0.6)` → `rgba(0, 0, 0, 0.85)` — pure black, not the warm charcoal that the rest of the BURNED palette uses for dimming. Visually drifts from the rest of the system.
- Hardcoded `gap: 16px`, `width/height: 36px`, `border: 3px solid` (border width is fine raw, but the value `3px` should be intentional).
- Hardcoded `font-size: 16px`.
- Hardcoded `border-radius: 50%` instead of `--radius-full`.
- Hardcoded `z-index: 10000` — collides with the unscaled z-index space; should consume `--z-overlay`.
- Hardcoded animation duration `0.8s` and easing `linear`.
- **`prefers-reduced-motion` is a half-measure.** Current code slows the spin from 0.8s to 1.5s. Per WCAG 2.3.3 + Agent C's 2025-2026 research, rotation is the textbook bad case for vestibular sensitivity — slowing it doesn't meet the spirit of the rule. The rewrite replaces the spin entirely with an opacity pulse under reduced-motion.

**Rewritten file content**:

```css
/* ConnectionOverlay.module.css
   Full-screen overlay shown when the WebSocket is connecting or reconnecting.
   Radial gradient backdrop (lighter center, darker edges) draws focus to the
   center spinner. Sits at --z-overlay — above sticky chrome (TitleBar/StatusBar),
   below modals (BottomSheet) and toasts (ErrorToast).

   Semantic consistency: the spinner accent color is --color-accent-drama, which
   matches TitleBar's .dotConnecting. The whole system uses the drama (ochre)
   channel for "we are trying to connect" — never invent a new amber.
*/

.overlay {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  background: radial-gradient(
    ellipse at center,
    var(--color-bg-overlay-light) 0%,
    var(--color-bg-overlay-heavy) 100%
  );
  color: var(--color-fg-primary);
  z-index: var(--z-overlay);
}

.spinner {
  width: var(--space-10);
  height: var(--space-10);
  border: 3px solid var(--color-border-subtle);
  /* Top-border accent matches TitleBar .dotConnecting — same drama channel,
     same "trying to connect" semantic across the system. */
  border-top-color: var(--color-accent-drama);
  border-radius: var(--radius-full);
  animation: connectionSpin var(--motion-duration-dramatic) linear infinite;
}

.label {
  font-family: var(--font-body);
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--color-fg-secondary);
}

@keyframes connectionSpin {
  to { transform: rotate(360deg); }
}

@keyframes connectionPulse {
  from { opacity: 0.4; }
  to { opacity: 1; }
}

/* Reduced motion: replace spin with opacity pulse. Rotation is the textbook
   bad case for vestibular sensitivity (WCAG 2.3.3); slowing the spin (the
   pre-rebuild approach) doesn't meet the spirit of the rule. */
@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation: connectionPulse var(--motion-duration-dramatic) var(--motion-ease-standard) infinite alternate;
  }
}
```

**Key transformations**:
- All 3 stale fallbacks (`#3a3d5a`, `#e8922a`, `#9999bb`) → removed entirely. Every `var()` call points at a real Phase 1 token; no fallbacks.
- `var(--text-primary)` → `var(--color-fg-primary)` (Phase 1 renaming).
- `rgba(0, 0, 0, 0.6)` and `rgba(0, 0, 0, 0.85)` → `var(--color-bg-overlay-light)` and `var(--color-bg-overlay-heavy)`. **Both tokens flagged as Phase 1 cross-phase additions** (see §7) — they replace pure black with warm-charcoal-at-alpha so the dimming reads consistent with the rest of the BURNED palette.
- `gap: 16px` → `var(--space-4)`.
- `width: 36px; height: 36px` → `var(--space-10)` (40px). Lands on the spacing scale and stays under the 44px touch-target floor — slight upsize from 36px is acceptable; if visual review later finds 40px chunky, that's a Phase 1 fluid token decision, not a Phase 2 patch.
- `border-radius: 50%` → `var(--radius-full)`.
- `font-size: 16px` → `var(--text-body)`.
- `z-index: 10000` → `var(--z-overlay)`. Eliminates the worst z-index collision in the codebase (10000 was the unscaled "max" alongside another file's 9000).
- `animation: spin 0.8s linear infinite` → `animation: connectionSpin var(--motion-duration-dramatic) linear infinite`. Renamed `spin` → `connectionSpin` for explicit clarity in compiled output (CSS Modules scopes keyframe names anyway, so the rename is for human readers, not the compiler).
- **Reduced-motion upgrade**: spin replaced with opacity pulse instead of slowed-spin. Rotation is the WCAG 2.3.3 trigger; an opacity pulse delivers the same "still loading" affordance without the rotation. ~5 LOC cost, real accessibility win.
- **Spinner accent matches TitleBar `.dotConnecting`** — both consume `--color-accent-drama`. System-wide consistency: the drama (ochre) channel always means "trying to connect" across BURNED.

**Cross-phase concern flagged** (carries forward to Phase 1 deepening):
- Phase 1 semantic.css currently defines only `--color-bg-overlay` at 85% opacity. This file needs **both** 60% and 85% variants for the radial gradient. **Resolution during Phase 1 deepening**: add `--color-bg-overlay-light` (60% alpha, charcoal-1 mixed with transparent) and `--color-bg-overlay-heavy` (85% alpha — aliases the existing `--color-bg-overlay`). The existing `--color-bg-overlay` stays valid as the default (= heavy).
- BottomSheet (§2.6) also consumes `--color-bg-overlay-light`. Two consumers confirms the token is real, not a one-off.

**Acceptance for this file**:
- [ ] Zero hardcoded hex.
- [ ] Zero hardcoded spacing / font-size / radius / z-index.
- [ ] Zero stale UMB fallbacks in any `var()` call.
- [ ] Spinner accent uses `--color-accent-drama` — verified by inspecting TitleBar `.dotConnecting` consumption and confirming both files reach for the same token.
- [ ] `prefers-reduced-motion: reduce` replaces the spin with `connectionPulse` (opacity oscillation), not a slowed spin.
- [ ] Tested at the Vite dev server by killing `pnpm dev:server` mid-session — overlay appears, spinner spins, label reads "Reconnecting…" — and again with the OS-level reduced-motion preference enabled, confirming the pulse fallback fires.
- [ ] `--color-bg-overlay-light` and `--color-bg-overlay-heavy` exist in Phase 1's semantic.css before this file is executed in `/ce:work` (Phase 1 deepening adds them).

#### §2.3.12 `CardDetailSheet.module.css` — REWRITE (44 LOC → ~52 LOC)

**Good news**: one of only two genuinely clean files in the audit. Zero literal hex values pre-rewrite. The only "drift" is the legacy `var(--text-secondary)` token name (renamed to `var(--color-fg-secondary)` in Phase 1). Otherwise this is a straight spacing / font-size migration.

**Current problems**:
- `var(--text-secondary)` consumes the legacy token name (Phase 1 renames to `--color-fg-secondary`).
- Hardcoded `gap: 8px`, `padding: 8px 0`, `margin-top: 4px`.
- Hardcoded icon sizing: `width/height: 64px` on `.iconWrap` and `width/height: 56px` on the inner svg. The 56px is a magic number — it's "container minus 4px of breathing room on each side." Should be derived from the container, not declared independently.
- Hardcoded `font-size: 22px` (name), `12px` (category), `15px` (hint).
- Hardcoded `max-width: 280px` on the hint.

**Rewritten file content**:

```css
/* CardDetailSheet.module.css
   The "what does this card do" detail view, rendered inside BottomSheet when a player
   long-presses a card in their hand. Pure presentation: icon, name, category, play hint.

   This file is consumed exclusively inside BottomSheet — the sheet provides the
   modal chrome, padding, dismiss gesture, and z-index layering. CardDetailSheet
   only owns the inner content layout.
*/

.sheet {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) 0;
  text-align: center;
}

.iconWrap {
  /* Icon container is one unit on the spacing scale (64px). The inner svg fills
     the container with --space-1 of breathing room on each side, derived from
     the container — no magic 56px. */
  width: var(--space-16);
  height: var(--space-16);
  padding: var(--space-1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.iconWrap svg {
  width: 100%;
  height: 100%;
}

.name {
  font-family: var(--font-display);
  font-size: var(--text-title);
  font-weight: 700;
}

.category {
  font-family: var(--font-display);
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--color-fg-secondary);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.hint {
  font-family: var(--font-body);
  font-size: var(--text-body);
  line-height: 1.5;
  color: var(--color-fg-secondary);
  max-width: var(--size-card-detail-max);
  margin-top: var(--space-1);
}
```

**Key transformations**:
- `var(--text-secondary)` → `var(--color-fg-secondary)` (Phase 1 rename — both `.category` and `.hint` consumers).
- `gap: 8px`, `padding: 8px 0` → `var(--space-2)`. `margin-top: 4px` → `var(--space-1)`.
- `width/height: 64px` (iconWrap) → `var(--space-16)`. Lands on the spacing scale (64px is one of the standard step values).
- `width/height: 56px` (svg) → **eliminated**. The inner svg fills its container (`width/height: 100%`) and the container has `padding: var(--space-1)`, giving 4px of breathing room on each side. Result: same effective 56px svg, but the value is derived from the container instead of declared as a magic number.
- `font-size: 22px` (name) → `var(--text-title)` (20px → 28px fluid). Slightly smaller on the smallest phone, much larger on iPad portrait — the fluid scale is better UX than the static 22px.
- `font-size: 12px` (category) → `var(--text-caption)` (11px → 13px fluid).
- `font-size: 15px` (hint) → `var(--text-body)` (14px → 18px fluid). Hint text growing on larger screens is correct UX (more reading distance, more characters per line).
- `max-width: 280px` (hint) → `var(--size-card-detail-max)`. **Flagged for Phase 1 deepening** (see cross-phase concern below).
- `font-family: var(--font-display)` added to `.category`. Pre-rebuild the category inherited the body font, but the visual hierarchy is cleaner when the name + category share the display font and the hint uses body font — separates "what is this card" (display) from "what does it do" (body).
- `letter-spacing: 0.1em` on `.category` preserved as a raw value (design decision; matches the StatusBar §2.3.6 pattern of letter-spacing as a per-rule choice, not tokenized).
- `line-height: 1.5` on `.hint` preserved as a raw value (no line-height tokens in Phase 1).
- Font weights `700` (name) and `600` (category) preserved as raw values (no font-weight tokens in Phase 1).

**Cross-phase concern flagged** (carries forward to Phase 1 deepening):
- Phase 1 does not currently define `--size-card-detail-max`. **Resolution during Phase 1 deepening**: add to `semantic.phone.css` as a fluid svh-based clamp. Default value 280px (matches pre-rebuild) but expressed as a clamp so it scales gently with phone height. Suggested formula: `clamp(240px, calc(240px + (100svh - 667px) * (40 / 699)), 320px)` — gives 240px on iPhone SE and 320px on iPad portrait.

**Acceptance for this file**:
- [ ] Zero hardcoded hex (this was already true pre-rewrite — preserve).
- [ ] Zero hardcoded spacing / font-size / sizing values.
- [ ] No magic-number svg sizing — inner svg derives its size from the iconWrap container.
- [ ] `var(--color-fg-secondary)` consumed at both `.category` and `.hint` (legacy `--text-secondary` removed).
- [ ] `--size-card-detail-max` exists in Phase 1's `semantic.phone.css` before this file is executed in `/ce:work` (Phase 1 deepening adds it).
- [ ] Renders correctly inside `BottomSheet` — the sheet provides the modal chrome; this file only owns the inner content layout. Visual review at 375×667, 393×852, and 1024×1366 portrait.
- [ ] Long-press a card in the hand → CardDetailSheet appears → name, category, hint, and icon all read at appropriate sizes for the device.

#### §2.3.13 `sheets/sheets.module.css` — REWRITE (229 LOC → ~210 LOC)

**Audit correction (2026-04-11)**: the original audit said "228 LOC, ~40 classes, 6 sheet consumers (TargetSelect, PeekResult, FavorPick, ComboNameStealer, FuturePeek, DefusePlacement)." Reality on disk: **229 LOC, 15 surface classes + ~9 pseudo/state selectors = ~24 rules total, 5 sheet consumers** (TargetSelect, FavorResponse, NameCard, DefusePlacement, FuturePeek). The audit conflated possibly-renamed components with current ones. This rewrite is sized against the real file.

**The five sheet consumers and which classes they use:**
- **TargetSelect.tsx** — `.sheetTitle` + `.sheetSubtitle` + `.optionList` + `.optionBtn` (pick a player to target).
- **FavorResponse.tsx** — `.sheetTitle` + `.sheetSubtitle` + `.optionList` + `.optionBtn` (pick a card to give away to the requester).
- **NameCard.tsx** — `.sheetTitle` + `.sheetSubtitle` + `.cardGrid` + (button children styled inline by consumer or unstyled — `cardGrid` is just a 2-column layout container).
- **DefusePlacement.tsx** — `.sheetTitle` + `.sheetSubtitle` + `.quickActions` + `.quickBtn` + `.positionInput` + `.confirmBtn` (top/middle/bottom shortcuts + manual position input + confirm).
- **FuturePeek.tsx** — `.sheetTitle` + `.sheetSubtitle` + `.tapOrder` + `.tapCard` + `.tapCardIcon` + `.tapCardName` + `.tapCardPosition` + `.orderBadge` + `.confirmBtn` (rearrange the top 3 cards via tap-order).

**Current problems**:
- **Stale legacy token names everywhere.** `var(--text-secondary)` (×4), `var(--text-primary)` (×5), `var(--border-subtle)` (×4), `var(--bg-primary)` (×6 including inside `color-mix()` calls), `var(--accent-success)` (×3). Plus the cyan UMB-era focus ring `var(--focus-ring, #33ffff)` (×1). All renamed in Phase 1.
- **35+ unique hardcoded values** across font-size (8 distinct: 11/13/14/15/16/18/20px), padding (6 distinct: 8/10/12 14 / 12 16 / 14 12), gap (4 distinct: 6/8/10/12), margin (3 distinct: 12/16), border-radius (3 distinct: 8/10/50%).
- **Touch-target failures.** `.optionBtn` is `padding: 12px 16px` + `font-size: 15px` = 39px tall, **below the 44px WCAG 2.5.5 minimum**. `.quickBtn` is `padding: 10px` + `font-size: 14px` = 34px tall, also below. Pre-rebuild bug.
- **Hardcoded transitions** on `.tapCard`: `border-color 0.15s ease, opacity 0.15s ease`. 150ms = `--motion-duration-fast`, but the easing is unspecified (`ease`, browser default).
- **Missing `:focus-visible`** on 4 of 5 interactive elements. `.optionBtn` has it (with stale cyan token); `.confirmBtn`, `.quickBtn`, `.tapCard`, and `.positionInput button` have nothing — keyboard users get no focus indicator on most of the bottom-sheet buttons.
- **Dead `[data-theme="light"]` override block** at lines 197-228. ~32 LOC. Light mode is deferred per §6 Out of Scope; these rules contain the only literal hex in the file (`#d4cfc5`, `#fffdf8`, `#1c1a15`) and never fire in the current build. Dead code.
- **One thing the file gets right**: the `--peek-accent` inline-style cascade pattern on `.tapCard`. FuturePeek.tsx sets `style={{ '--peek-accent': cardAccent(card.type) }}` per card, and the CSS uses `var(--peek-accent, var(--border-subtle))` with `color-mix()` to blend the accent into the card background and border. **This pattern is preserved** — it's the right way to thread per-instance theming through CSS without inflating the className list.

**Rewritten file content**:

```css
/* sheets.module.css
   Shared styles for all bottom-sheet prompts under src/client/player/sheets/.
   Five consumers: TargetSelect, FavorResponse, NameCard, DefusePlacement, FuturePeek.
   The BottomSheet wrapper (src/client/shared/BottomSheet.module.css, see §2.6)
   provides the modal chrome, padding, dismiss gesture, and z-index. This file
   only owns the inner content layout for each sheet's specific prompt.

   Architectural note: the .tapCard family uses a `--peek-accent` inline-style
   cascade. FuturePeek.tsx sets `style={{ '--peek-accent': cardAccent(type) }}`
   per card; the CSS reads it via `var(--peek-accent, var(--color-border-subtle))`
   with color-mix() blending. This is the right pattern for per-instance theming —
   threads through without inflating the className list. PRESERVE.
*/

/* --- Sheet meta (used by every consumer) --- */

.sheetTitle {
  font-family: var(--font-display);
  font-size: var(--text-callout);
  font-weight: 700;
  text-align: center;
  margin-bottom: var(--space-4);
}

.sheetSubtitle {
  font-family: var(--font-body);
  font-size: var(--text-body);
  color: var(--color-fg-secondary);
  text-align: center;
  margin-bottom: var(--space-3);
}

/* --- Option list (TargetSelect, FavorResponse) --- */

.optionList {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.optionBtn {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  /* --space-4 vertical padding ensures the button clears the 44px touch-target floor:
     16 + var(--text-callout floor 16) + 16 = 48px. Pre-rebuild was 12+15+12=39px (bug). */
  padding: var(--space-4);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-button);
  background: var(--color-bg-app);
  color: var(--color-fg-primary);
  font-family: var(--font-body);
  font-size: var(--text-callout);
  text-align: left;
  cursor: pointer;
  touch-action: manipulation;
}

.optionBtn:active {
  background: var(--color-border-subtle);
}

.optionBtn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* --- Confirm button (DefusePlacement, FuturePeek) --- */

.confirmBtn {
  display: block;
  width: 100%;
  padding: var(--space-4);
  margin-top: var(--space-4);
  border: none;
  border-radius: var(--radius-button);
  background: var(--color-accent-intercept);
  color: var(--color-fg-on-accent);
  font-family: var(--font-display);
  font-size: var(--text-callout);
  font-weight: 600;
  cursor: pointer;
  touch-action: manipulation;
}

.confirmBtn:disabled {
  opacity: 0.4;
  cursor: default;
}

/* --- Quick actions row (DefusePlacement: top/middle/bottom shortcuts) --- */

.quickActions {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.quickBtn {
  flex: 1;
  /* --space-4 padding for touch-target compliance: 16+14+16=46px. */
  padding: var(--space-4);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-button);
  background: var(--color-bg-app);
  color: var(--color-fg-primary);
  font-family: var(--font-body);
  font-size: var(--text-body);
  text-align: center;
  cursor: pointer;
  touch-action: manipulation;
}

/* --- Position input (DefusePlacement: manual +/- counter) --- */

.positionInput {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  padding: var(--space-3) 0;
}

.positionInput button {
  width: var(--space-10);
  height: var(--space-10);
  border: 1px solid var(--color-fg-secondary);
  border-radius: var(--radius-full);
  background: var(--color-bg-app);
  color: var(--color-fg-primary);
  font-family: var(--font-display);
  font-size: var(--text-callout);
  cursor: pointer;
}

.positionInput span {
  font-family: var(--font-display);
  font-size: var(--text-callout);
  font-weight: 600;
  /* Number display floor — keeps multi-digit positions from causing layout shift.
     Structural value, not a design token. */
  min-width: 60px;
  text-align: center;
}

/* --- Card grid (NameCard: pick a card type to name) --- */

.cardGrid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-2);
}

/* --- Tap order with peek-accent cascade (FuturePeek: rearrange top 3) --- */

.tapOrder {
  display: flex;
  gap: var(--space-2);
  justify-content: center;
  padding: var(--space-2) 0;
}

.tapCard {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-4) var(--space-3);
  border-radius: var(--radius-card);
  /* Per-instance theming via --peek-accent inline cascade. Border + background
     blend the accent at low opacity into the surface color so each card carries
     its card-type's signature color without dominating. PRESERVE THIS PATTERN. */
  border: 2px solid color-mix(in srgb, var(--peek-accent, var(--color-border-subtle)) 40%, var(--color-border-subtle));
  border-left: 3px solid var(--peek-accent, var(--color-border-subtle));
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--peek-accent, transparent) 12%, var(--color-bg-app)) 0%,
      color-mix(in srgb, var(--peek-accent, transparent) 4%, var(--color-bg-app)) 100%
    );
  color: var(--color-fg-primary);
  font-family: var(--font-body);
  font-size: var(--text-caption);
  text-align: center;
  cursor: pointer;
  touch-action: manipulation;
  /* Floor — prevents the card from collapsing too narrow inside the flex tap-order row. */
  min-width: 90px;
  transition:
    border-color var(--motion-duration-fast) var(--motion-ease-standard),
    opacity var(--motion-duration-fast) var(--motion-ease-standard);
}

.tapCard:active {
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--peek-accent, transparent) 20%, var(--color-bg-app)) 0%,
      color-mix(in srgb, var(--peek-accent, transparent) 8%, var(--color-bg-app)) 100%
    );
}

.tapCard[data-tapped] {
  border-color: var(--color-accent-intercept);
  opacity: 0.5;
}

.tapCardIcon {
  display: flex;
  align-items: center;
  justify-content: center;
  /* Sized to match the CardBadge child component below (28px) — structural value
     keyed to the consumer component, not a design decision. */
  width: 28px;
  height: 28px;
  color: var(--peek-accent, var(--color-fg-secondary));
}

.tapCardIcon :global(.cardBadge) {
  position: static;
  width: 100%;
  height: 100%;
}

.tapCardIcon :global(.cardBadge) svg {
  width: 100%;
  height: 100%;
}

.tapCardName {
  font-family: var(--font-body);
  font-weight: 600;
  font-size: var(--text-caption);
  /* Per-instance accent at 70% strength blended over the primary text color —
     subtle tinting that hints at the card's category without losing legibility. */
  color: color-mix(in srgb, var(--peek-accent, var(--color-fg-primary)) 70%, var(--color-fg-primary));
  line-height: 1.2;
}

.tapCardPosition {
  font-family: var(--font-body);
  font-size: var(--text-caption);
  font-weight: 500;
  color: var(--color-fg-secondary);
}

.orderBadge {
  font-family: var(--font-display);
  font-size: var(--text-caption);
  font-weight: 700;
  color: var(--color-accent-intercept);
}

/* --- Keyboard focus indicator (combined selector for all interactive elements) ---
   Same pattern as SmartActionBox / JoinScreen / FloatingActionButton: outline (not
   box-shadow) so the focus ring never fights variant colors or per-instance accents.
   --color-border-focus = ochre-8 — clear contrast on every background in this file.
   WCAG 2.4.7. */
.optionBtn:focus-visible,
.confirmBtn:focus-visible,
.quickBtn:focus-visible,
.tapCard:focus-visible,
.positionInput button:focus-visible {
  outline: 2px solid var(--color-border-focus);
  outline-offset: var(--space-1);
}
```

**Key transformations**:
- **All ~22 stale legacy token references renamed**: `--text-secondary`/`--text-primary`/`--border-subtle`/`--bg-primary`/`--accent-success` → `--color-fg-secondary`/`--color-fg-primary`/`--color-border-subtle`/`--color-bg-app`/`--color-accent-intercept`. The cyan `var(--focus-ring, #33ffff)` UMB-era stale value → `var(--color-border-focus)`.
- **All 8 hardcoded font sizes** mapped to the fluid type scale: 11/13px → `--text-caption`, 14/15/16/18/20px → `--text-body` or `--text-callout` based on emphasis role.
- **All hardcoded paddings → spacing scale.** `.optionBtn` and `.quickBtn` padding bumped to `var(--space-4)` to **fix pre-rebuild touch-target failures** (39px and 34px button heights). New heights: optionBtn 48px, quickBtn 46px — both clear the WCAG 2.5.5 floor.
- **All gaps → spacing scale.** `gap: 6px` and `gap: 10px` snapped to `var(--space-2)` (8) and `var(--space-3)` (12) respectively to land on the 4-base scale.
- **All margins → spacing scale.** `margin-bottom/top: 12px/16px` → `var(--space-3)/--space-4)`.
- **3 different border-radius mechanisms → semantic aliases.** `8px → --radius-button` (= 4px, deliberate visual change per Phase 1 hierarchy — same call as JoinScreen §2.3.8 input/button). `50% → --radius-full`. `10px (.tapCard) → --radius-card` (= 8px, slight 2px reduction lands on the scale).
- **Hardcoded transitions** on `.tapCard` (`0.15s ease`) → `var(--motion-duration-fast) var(--motion-ease-standard)`. Pre-rebuild had no easing specified (browser default `ease`). Tightening the contract.
- **`:focus-visible` added** to all 5 interactive elements via one combined selector. Pre-rebuild only had it on `.optionBtn` (with stale cyan token); keyboard users got no focus indicator on `.confirmBtn`, `.quickBtn`, `.tapCard`, or `.positionInput button`. WCAG 2.4.7 gap closed across the whole file in 6 lines of CSS.
- **`--peek-accent` inline cascade preserved** — same pattern, same color-mix percentages, same fallback chain. Only the fallback target is updated from `var(--border-subtle)` to `var(--color-border-subtle)`. The TSX consumer (FuturePeek.tsx) reads `cardAccent()` from `palette.ts` per §2.7 — coordinated.
- **`.tapCardIcon :global(.cardBadge)` simplified.** Pre-rebuild explicitly set the inner cardBadge to `28px × 28px` matching the wrapper's 28×28. Rewrite makes the inner element fill its container (`width/height: 100%`) — same effective size, no magic-number duplication. Same pattern as CardDetailSheet §2.3.12's iconWrap fix.
- **Dead `[data-theme="light"]` override block deleted** (32 LOC). Contains the only literal hex values in the file (`#d4cfc5`, `#fffdf8`, `#1c1a15`) — all light-mode-only, all referencing the deferred theme. Per §6 Out of Scope, light mode comes back post-Phase-5 (if at all) on top of the new token system, not patched onto the legacy override pattern.
- **Confirm button text color** uses `--color-fg-on-accent` (= cream-12) instead of `--bg-primary` (legacy "use the dark bg color as text on a green button"). Phase 1 has the dedicated `fg-on-accent` semantic for exactly this case — cleaner mapping, no need to invert a background color into a foreground role.
- **Touch-action: manipulation** added to every interactive element that didn't have it (`.optionBtn`, `.quickBtn`, `.tapCard`, `.confirmBtn`). Eliminates the iOS 300ms tap delay. Pre-rebuild had it on the position input buttons but not the others — closing the gap.

**Cross-phase concern flagged** (carries forward to Phase 1 deepening):
- **`.positionInput span { min-width: 60px }`** — same "narrow content column" family as the `--size-content-narrow` flag from §2.3.8 JoinScreen. Different value (60px vs 280-320px), but same category: structural floor for variable-length content. Phase 1 deepening should consider whether to introduce a `--size-numeric-floor` or similar token for this micro-case, OR document that small structural floors stay raw with comments while only large content-column caps tokenize.
- **`.tapCardIcon { width/height: 28px }`** — keyed to the CardBadge child component's intrinsic size. If CardBadge gets resized in a future phase, this needs updating. Could be tokenized as `--size-card-badge` to centralize the contract, but only one consumer means it's premature now. Flag for Phase 5 audit.

**Acceptance for this file**:
- [ ] Zero stale legacy token references (`--text-*`, `--bg-*`, `--border-*`, `--accent-*`, `--focus-ring` all replaced).
- [ ] Zero hardcoded hex (the only literal hexes in pre-rebuild were in the dead light-mode block, now deleted).
- [ ] Zero hardcoded font-size, padding, margin, gap, or radius values (one structural exception: `min-width: 60px` on the position number display, documented).
- [ ] Touch-target compliance: `.optionBtn` ≥ 48px, `.quickBtn` ≥ 46px, `.confirmBtn` ≥ 48px, `.tapCard` (intrinsic stacked content) ≥ 60px tall, `.positionInput button` exactly 40px (round +/- buttons — slightly under floor but compensated by the larger overall row touch zone).
- [ ] `:focus-visible` outline on all 5 interactive elements via combined selector — keyboard accessibility verified by tabbing through every sheet variant in dev mode.
- [ ] `--peek-accent` inline cascade pattern preserved exactly. Visual review: render FuturePeek with three distinct card types and verify each card's border/background tinting reads as a different signature color.
- [ ] Dead `[data-theme="light"]` block deleted.
- [ ] All five sheet consumers (TargetSelect, FavorResponse, NameCard, DefusePlacement, FuturePeek) render correctly at 375×667 and 1024×1366 portrait.
- [ ] BottomSheet wrapper (§2.6) provides the modal chrome — this file only contributes inner content layout. Visual review: the sheet inner content fits cleanly inside the BottomSheet's elevated surface with appropriate breathing room.

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
