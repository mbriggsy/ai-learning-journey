---
title: "Phase 3 — Board View Migration"
type: feat
phase: 3
parent: docs/plans/css-foundation-rebuild/roadmap.md
depends_on: docs/plans/css-foundation-rebuild/phase-1-foundation.md
also_depends_on: docs/plans/css-foundation-rebuild/phase-2-phone-view-migration.md
date: 2026-04-11
status: draft
---

# Phase 3 — Board View Migration

**Goal.** Rewrite every `.module.css` file under `src/client/board/` to consume the Phase 1 token system. Eliminate the `@media (min-width: 1280px|1600px)` hard-pixel doubling pattern in favor of `clamp(vw)` tokens throughout. Fix the axis mixes in `GameTable` and `Lobby` (`100svh` + `3vh 4vw` → width-based sizing). Unify the `Lobby` green gradient with `GameTable`'s teal-charcoal palette through shared tokens. Rewrite the three cross-view files (`MinimalCard.module.css`, `GameOver.module.css`, `DramaOverlay.module.css`) so that both entry points consume them through container queries, not axis assumptions. Rewrite `fonts-mono.css` (board-only font-face). Resolve the `feltBranding` Tier 1 retheme gap (`GameTable.tsx:24`) with an Archer / Pendleton Agency–era decorative element.

**Scope boundary.** Phase 3 touches:
- `src/client/board/*.module.css` — 10 files.
- `src/client/shared/fonts-mono.css` — 1 file (not a module; `@font-face` declaration; imported only by `Board.tsx:12`, semantically board-owned).
- `src/client/shared/MinimalCard.module.css` — cross-view, owned by Phase 3 per `phase-2-phone-view-migration.md` §2.7.
- `src/client/shared/GameOver.module.css` — cross-view, owned by Phase 3.
- `src/client/shared/DramaOverlay.module.css` — cross-view, owned by Phase 3.
- `src/client/board/GameTable.tsx:24` — one-line TSX edit to replace the `feltBranding` element content with an Archer-tone decorative element (Tier 1 retheme).

**Phase 3 does NOT touch:**
- Any `.tsx` file other than the one-line `GameTable.tsx` retheme edit. No component logic changes. No re-architecting the ring layout math in `PlayerRing.tsx`. No rewriting `DramaOverlay.tsx` GSAP timelines (Phase 4 owns motion consolidation).
- `src/client/shared/fonts.css` — that's the display-font loader, consumed by both entry points; Phase 1 wires it via the primitives layer and it needs no rewriting here.
- `src/client/shared/theme.ts` / `theme.css` — already deleted in Phase 1.
- `src/client/shared/BottomSheet.module.css` — already rewritten in Phase 2 §2.6.
- Any CSS under `src/client/player/` — Phase 2 owns that scope.

---

## §1 — Inputs

From `phase-1-foundation.md`:
- All tokens in `src/client/shared/tokens/primitives.css`, `semantic.css`, `semantic.board.css`, `motion.ts`, `palette.ts`. Phase 3 consumes them.
- `[data-view="board"]` already set on the board root element by Phase 1 (`src/client/board/main.tsx` is updated during Phase 1 step 15).
- `[data-theme="dark"]` already set.
- `cardAccent(type)` now exported from `@client/shared/tokens/palette` (previously `theme.ts`). Phase 2 §2.7 already updated `MinimalCard.tsx`'s import site; Phase 3 inherits that.

From `phase-2-phone-view-migration.md`:
- `MinimalCard.tsx` imports `cardAccent` from the new `palette.ts` location. The CSS file (`MinimalCard.module.css`) was deliberately left untouched in Phase 2 and is Phase 3's responsibility.
- Motion tokens are consumed wherever already-migrated, but Phase 4 finishes the sweep. Phase 3 CSS rewrites MUST NOT introduce new inline literals — every new `transition` / `animation` in a Phase 3 rewrite consumes `--motion-duration-*` and `--motion-ease-*`.
- `BottomSheet.module.css` is already on the new token system. Phase 3 doesn't re-enter that file.

From `roadmap.md`:
- **§2 Quality Bar** — every rewritten board file must pass the §2.2 Archer test at the component level. For board, the evaluation viewport is 1920×1080 as the baseline with a rendered grid at 1280/2560/3840 for scale verification.
- **§3.5 Form factors** — board = `vw` / `cqw`, NOT `svh` / `vh` for dimensional sizing. Full-screen bleed (`height: 100vh` on a single wrapper) is allowed because the board is a dedicated viewport, but nothing nested inside it may use vh-axis units for sizing — only `vw`-based tokens or container queries.
- **§7 Phase 3** — roadmap's Phase 3 scope preview. This file supersedes the preview wherever the two conflict; the audit-correction block below documents the deltas.

From `docs/specifications/PRODUCT-SPECIFICATION.md`:
- **§6.4 Tier 1 retheme gaps** — `GameTable.tsx:24` `feltBranding` element. Current value: a generic "EK identity" branded felt with a targeting crosshair + corner diamonds rendered from inline SVG data-URIs with hardcoded ochre hex. Gap: the inline SVG is fine conceptually but the comment and implied ownership are EK-era ("branded felt decoration — EK identity baked into the table"). Phase 3 retheme: rename the comment to reference The Pendleton Agency, keep the geometric vocabulary (reticle + corner diamonds, which ARE Archer-correct), and migrate the hex values to match the new `--color-accent-drama` (ochre-9) palette semantically. See §2.7 for the concrete edit.
- **§2 Quality Bar** — every screen ships at the Archer bar or doesn't ship.

From Agent A's board audit (inlined in conversation, 2026-04-11) and direct file reads during plan authoring:
- Per-file enumeration of current hardcoded values, axis violations, stale fallbacks, hard-pixel doubling, and cross-view contamination.
- Specific landmine preservation (PlayerRing's `resize-observer` + GSAP `useLayoutEffect` coupling with the CSS-side panel-width breakpoint, which Phase 3 must preserve as a code comment for Phase 4's GSAP motion consolidation).

---

## §1.1 — Audit corrections (roadmap preview → reality)

During plan authoring, direct reads of `src/client/board/*.module.css` + `src/client/shared/*.module.css` surfaced three places where the roadmap's Phase 3 preview underestimated the scope. All three are resolved here; none change the goal, but each expands the deliverable list.

**Correction 1 — file count.** The roadmap §7 Phase 3 scope lists **"11 files to rewrite"** and enumerates: `GameTable.module.css`, `Lobby.module.css`, `PlayerRing.module.css`, `DrawPile.module.css`, `DiscardFan.module.css`, `Arena.module.css`, `AnnouncementFeed.module.css`, `StatusBar.module.css`, `NopeCountdownBar.module.css`, `PendingPromptBanner.module.css`, `fonts-mono.css`. Reality:
- Under `src/client/board/`: **10** `.module.css` files, confirmed by `glob 'src/client/board/**/*.module.css'`. The 11th file listed (`fonts-mono.css`) is **not** a module and **not** located under `src/client/board/` — it lives at `src/client/shared/fonts-mono.css` and is imported by `Board.tsx:12` only (the player entry point does not import it). It's a single `@font-face` declaration for JetBrains Mono. The roadmap's "11 files" count is correct if you interpret it as "11 board-scoped CSS files," with `fonts-mono.css` being board-scoped by consumption even though it physically sits in `shared/`.
- This plan preserves the roadmap's intent — `fonts-mono.css` is Phase 3's responsibility — and adds a §2.3.11 subsection for it.

**Correction 2 — hard-pixel doubling count.** The roadmap §7 says **"6 files use `@media (min-width: 1280px)` with hand-tuned px — replace with `clamp(...vw...)` tokens."** Direct audit count:
- `GameTable.module.css` has **both** a 1280px and a 1600px block.
- `Lobby.module.css` has a 1280px block.
- `PlayerRing.module.css` has **both** 1280px and 1600px blocks.
- `DrawPile.module.css` has **both** 1280px and 1600px blocks.
- `DiscardFan.module.css` has **both** 1280px and 1600px blocks.
- `Arena.module.css` has a 1280px block.
- `AnnouncementFeed.module.css` has **both** 1280px and 1600px blocks.
- `StatusBar.module.css` has a 1280px block.
- `GameOver.module.css` (cross-view, Phase 3 territory) has a 1280px block.

Total: **9 files** with hard-pixel media-query doubling, not 6. Five of them stack **two** breakpoints (1280 + 1600), meaning the actual count of doubling blocks to delete is **14**. Every one is replaced by `clamp(vw)` tokens. Phase 3 deletes all 14 blocks.

**Correction 3 — GameOver axis violation.** The roadmap §7 Phase 3 scope lists axis fixes for `GameTable.module.css` and `Lobby.module.css` only. Direct audit: **`GameOver.module.css:9`** also has `min-height: 100svh`. Since `GameOver` is cross-view (consumed by both phone and board entry points), it cannot use either `svh` or `vh` as an axis assumption — it has to adapt to whichever viewport is rendering it. Phase 3 fixes this via a container-query approach that sizes against the parent container (the entry-point root div), with no raw viewport units. The fix is additive to the audit-listed scope, not a replacement.

**Bottom line on file count after corrections:**
- 10 `src/client/board/*.module.css` rewrites
- 1 `src/client/shared/fonts-mono.css` rewrite (trivial)
- 3 `src/client/shared/*.module.css` cross-view rewrites (MinimalCard, GameOver, DramaOverlay)
- 1 `src/client/board/GameTable.tsx:24` one-line TSX edit

**= 14 CSS file touches + 1 TSX edit in Phase 3.**

---

## §2 — Deliverables

### §2.1 Directory state after Phase 3

```
src/client/board/
├── Board.tsx                   ← no CSS, but imports fonts-mono.css (unchanged) and DramaOverlay/GameOver/MinimalCard via shared/
├── Board.test.tsx              ← no CSS
├── Lobby.tsx                   ← component, not rewritten
├── Lobby.module.css            ← REWRITTEN (palette unified with GameTable, dev toolbar retained)
├── GameTable.tsx               ← ONE-LINE retheme edit (feltBranding className comment)
├── GameTable.module.css        ← REWRITTEN (100svh → grid, 3vh 4vw → tokens, two 1280/1600 blocks removed, feltBranding SVG hex swapped for semantic colors)
├── PlayerRing.tsx              ← not rewritten; Phase 4 owns GSAP motion tokens later
├── PlayerRing.module.css       ← REWRITTEN
├── Arena.tsx                   ← not rewritten
├── Arena.module.css            ← REWRITTEN
├── DrawPile.tsx                ← not rewritten
├── DrawPile.module.css         ← REWRITTEN (breathing animation consumes ambient-motion token — see cross-phase flag)
├── DiscardFan.tsx              ← not rewritten
├── DiscardFan.module.css       ← REWRITTEN
├── AnnouncementFeed.tsx        ← not rewritten
├── AnnouncementFeed.module.css ← REWRITTEN
├── StatusBar.tsx               ← not rewritten
├── StatusBar.module.css        ← REWRITTEN (board-side — distinct from src/client/player/StatusBar.module.css rewritten in Phase 2)
├── NopeCountdownBar.tsx        ← not rewritten
├── NopeCountdownBar.module.css ← REWRITTEN
├── PendingPromptBanner.tsx     ← not rewritten
├── PendingPromptBanner.module.css ← REWRITTEN
├── layout/                     ← untouched (ringLayout.ts is pure math)
├── main.tsx                    ← already updated by Phase 1 to import tokens + set [data-view="board"]
└── playerName.ts               ← no CSS

src/client/shared/
├── MinimalCard.tsx             ← Phase 2 already updated import site; no further TSX change
├── MinimalCard.module.css      ← REWRITTEN (biggest cross-view rewrite, container-query driven)
├── GameOver.tsx                ← not rewritten
├── GameOver.module.css         ← REWRITTEN (100svh removed, container queries, light-mode fork via semantic tokens)
├── DramaOverlay.tsx            ← not rewritten; Phase 4 owns GSAP timing consolidation
├── DramaOverlay.module.css     ← REWRITTEN (five drama variants + hero text scales via --text-hero)
├── fonts.css                   ← untouched (handled by Phase 1's primitives loader)
└── fonts-mono.css              ← REWRITTEN (trivial — comment alignment + token-referenced fallback stack)
```

**Files touched:** 14 CSS rewrites + 1 TSX edit. No deletions. No new files. No component consolidations. Phase 3 is purely a token migration + palette unification + retheme pass on an already-structured set of files.

### §2.2 Migration pattern (universal)

Same mechanical pattern as Phase 2 §2.2. Every rewritten board `.module.css` file obeys:

**BEFORE (hypothetical)**:
```css
.panel {
  width: 200px;
  padding: 10px 14px;
  background: rgba(30, 28, 24, 0.92);
  border: 1px solid rgba(180, 160, 120, 0.1);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  color: var(--text-primary, #e8e8f0);
  font-family: var(--font-display);
  font-size: 16px;
  transition: border-color 0.3s ease;
}

@media (min-width: 1280px) {
  .panel {
    width: min(320px, 22vw);
    font-size: clamp(22px, 2vw, 32px);
  }
}

@media (min-width: 1600px) {
  .panel {
    width: min(420px, 22vw);
    font-size: clamp(28px, 2vw, 38px);
  }
}
```

**AFTER**:
```css
.panel {
  width: var(--size-player-panel-width);
  padding: var(--space-3) var(--space-4);
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-lg);
  color: var(--color-fg-primary);
  font-family: var(--font-display);
  font-size: var(--text-title);
  transition: border-color var(--motion-duration-base) var(--motion-ease-standard);
}
```

**Universal rules** (identical to Phase 2 §2.2, re-stated for clarity):
1. **Zero hardcoded hex values.** Every color → semantic token → primitive token.
2. **Zero hardcoded spacing.** Every `padding`, `margin`, `gap`, `inset` uses `--space-N`.
3. **Zero hardcoded font sizes.** Every `font-size` uses a board type-scale token (`--text-body|title|display|hero`, plus cross-phase additions `--text-caption|callout|micro` — see §7 cross-phase flags).
4. **Zero hardcoded font families.** Use `--font-display`, `--font-body`, `--font-mono`.
5. **Zero hardcoded radii.** Use `--radius-*` or semantic alias (`--radius-card`, `--radius-button`, `--radius-modal`, `--radius-pill`).
6. **Zero hardcoded shadows.** Use `--shadow-*` or `--shadow-glow-*`.
7. **Zero hardcoded motion timing.** Every `transition` duration → `--motion-duration-*`, every easing → `--motion-ease-*`. Ambient loop durations (DrawPile breathe, Lobby pulse) consume new ambient tokens — see §7 cross-phase flags.
8. **Zero hardcoded z-indices.** Every `z-index` → `--z-*`.
9. **Zero `svh` / `vh` for dimensional sizing in board files.** Exception: **one** `height: 100vh` on the outermost `GameTable.table` wrapper is allowed because the board view is a dedicated viewport and a full-bleed top-level container needs to know it owns the screen. Every child uses `vw`-based tokens or container queries.
10. **No `@media (min-width: 1280px|1600px)` hard-pixel blocks.** The entire point of `clamp(vw)` tokens is that they interpolate smoothly between the 1280 and 3840 brackets without stepped breakpoints. Any rewrite that introduces a new hard-pixel breakpoint block fails the phase.
11. **Preserve landmine comments.** Where the old file has a comment encoding architectural knowledge (`PlayerRing`'s container-query-derived panel widths coupled to `PlayerRing.tsx` layout math, DrawPile's `breathe` keyframe GPU-compositing reminder), preserve verbatim, prefix with "Inherited from pre-rebuild:" where it helps.
12. **Inline-SVG hex exception documented.** Data-URIs (`feltBranding`, `DrawPile.topCard`, `MinimalCard.cardBack`) cannot interpolate `var()` inside the encoded URL — they need literal hex. Where a data-URI is preserved, the hex values MUST match the primitive values of the semantic tokens they visually represent, AND a code comment directly above the data-URI must list the token alias and justify the inline value. Phase 5 may add a regex CI check to catch drift.

### §2.2a Board-specific cross-cutting patterns

Phase 2 identified 7 patterns affecting phone files. Board files inherit all 7 (stale fallbacks, hardcoded spacing, hardcoded font-sizes, hardcoded radii, hardcoded shadows, hardcoded motion, unscaled z-indices) — the per-file specs in §2.3 apply them mechanically and don't re-enumerate. On top of those 7, the board has **five** additional patterns not seen in the phone scope:

#### Pattern B1 — Hard-pixel-doubling media queries

**Affected files (9):** `GameTable.module.css`, `Lobby.module.css`, `PlayerRing.module.css`, `DrawPile.module.css`, `DiscardFan.module.css`, `Arena.module.css`, `AnnouncementFeed.module.css`, `StatusBar.module.css`, `GameOver.module.css` (cross-view).

**The pattern**: every file above has at least one `@media (min-width: 1280px) { … }` block that redefines dimensions as hand-tuned px (e.g., `.panel { width: min(320px, 22vw); }`). Five files stack a second `@media (min-width: 1600px) { … }` block with even larger hand-tuned px. The motivation was "the phone sizes are too small for a TV so bump them up at the TV breakpoint" — a reasonable instinct under the old no-token-system, but the Phase 1 board clamp tokens already interpolate smoothly between 1280 and 3840 without needing a second layer.

**The fix**: delete every `@media (min-width: 1280px)` and `@media (min-width: 1600px)` block from all 9 files. The base rules (outside the media query) are rewritten to consume `clamp(vw)` tokens from `semantic.board.css`. The interpolation is continuous, not stepped — better across arbitrary viewports, less code, no brittle hand-tuned breakpoints. Total deleted: **14 media-query blocks** (some files have both 1280 and 1600 variants).

**Why**: stepped breakpoints with hand-tuned px are the most common way a card grid looks "okay at 1080p and okay at 4K but weird at 1440p." Continuous clamp tokens fix the 1440p problem for free.

**Permitted exception**: `@media (prefers-reduced-motion: reduce)` is NOT a hard-pixel breakpoint and stays — it's orthogonal. `@media (prefers-contrast: more)` and `@media (forced-colors: active)` similarly stay. Only `@media (min-width: <px>)` viewport breakpoints are deleted.

#### Pattern B2 — Axis mixing (svh in the board scope)

**Affected files (4):** `GameTable.module.css` (line 5 `height: 100svh`, line 6 `padding: 3vh 4vw`), `Lobby.module.css` (line 8 `height: 100svh`), `GameOver.module.css` (line 9 `min-height: 100svh`), `DramaOverlay.module.css` (line 24 `font-size: clamp(48px, 12vw, 160px)` — this one IS vw-based, just unscaled).

**The pattern**: board-scope files using `svh`/`vh` for sizing. Worst case is `GameTable.module.css:6` — `padding: 3vh 4vw` mixes both axes in a single property.

**The fix**:
- `GameTable.module.css:5` — drop `height: 100svh` entirely. `.table` becomes a CSS Grid container with `height: 100vh` (allowed once, outermost board wrapper). Children are positioned via grid areas + absolute positioning against the grid, not against viewport height.
- `GameTable.module.css:6` — `padding: 3vh 4vw` → `padding: var(--space-fluid-base-board) var(--space-fluid-loose-board)` where the board fluid spacing tokens are new additions to Phase 1 (see §7 cross-phase flags). The two tokens interpolate with viewport width only.
- `Lobby.module.css:8` — `height: 100svh` → `min-height: 100vh` on the outermost wrapper. (Lobby is also full-bleed board; same rule as GameTable.)
- `GameOver.module.css:9` — `min-height: 100svh` → `min-height: 100cqb` (container query block-axis) against the entry-point container. Both entry points wrap GameOver in a root div sized to the viewport, so `cqb` resolves to the rendering viewport's block axis regardless of view mode.
- `DramaOverlay.module.css:24` — `clamp(48px, 12vw, 160px)` → `var(--text-hero)` (already defined in Phase 1 §2.5 with the 56→160 range). The smaller `eliminated` variant (`clamp(32px, 8vw, 100px)`) becomes a new `--text-hero-subdued` token — see §7.

**Why**: mixing axes in a property (`3vh 4vw`) makes a card look wrong on every ultrawide and portrait-tablet combination. A single axis per view eliminates the issue.

#### Pattern B3 — Palette fragmentation

**Affected files (all 14):** every board + cross-view CSS file picks its own "base" palette from one of four eras:
- **Era 1 — UMB purple-blue noir**: `#0c0a12` (bg-app), `#12121f` (bg-card), `#e8e8f0` (text-primary), `#9999bb` (text-secondary), `#555570` (text-disabled), `#2a2a4a` (border-subtle), `#33ffff` (focus-ring). Seen in: `Lobby.module.css` (entire file), `GameOver.module.css` (entire file), `PlayerRing.module.css`, `PendingPromptBanner.module.css`.
- **Era 2 — UMB Jackbox red accent**: `#e03535` (`--red`), `#e8922a` (`--amber`), `#2dd8c8` (`--teal`). Seen in: `Lobby.module.css` (title glow + start button), `GameOver.module.css` (play-again button), `PlayerRing.module.css` (turn badge), `NopeCountdownBar.module.css` (`--accent-nope`).
- **Era 3 — BURNED warm-cream transitional**: `#f5f0e0`, `#b8a890`, `#6a6050`, `#c8a960`, `#d48820` (amber), `#d44030` (red). Seen in: `GameTable.module.css`, `DrawPile.module.css`, `MinimalCard.module.css`, `AnnouncementFeed.module.css`, `StatusBar.module.css` (board), `DiscardFan.module.css`, `Arena.module.css` comments.
- **Era 4 — BURNED Dreamland teal-charcoal**: `#1a2e30`, `#162828`, `#121e20`, `#18252a`. Seen in: `GameTable.module.css` base gradient, `DrawPile.module.css` card layers, `MinimalCard.module.css` `cardBack` background.

The worst case is `Lobby.module.css`, which uses Era 1 + Era 2 exclusively — a pre-BURNED palette — while `GameTable.module.css` (the screen `Lobby` transitions into) uses Era 3 + Era 4. The two screens visually don't belong in the same product.

**The fix**: every stale fallback value is deleted. Every `var(--foo, #hex)` → `var(--color-foo)` with no fallback. The Lobby palette is unified with the GameTable palette by routing every Lobby color through the same semantic layer (`--color-bg-app`, `--color-accent-burned` for the start-button accent, `--color-accent-drama` for the glow, `--color-fg-primary/secondary/muted`). See §2.3.2 for the specific Lobby rewrite and §4 below for the palette-unification strategy.

**Why**: four palette eras coexisting is the visible symptom of the diagnosis in `VISUAL-LAYER-AUTOPSY.md` — "CSS Modules without shared tokens = organized chaos." Phase 3 is the moment that chaos gets paid down.

#### Pattern B4 — Duplicated inline-SVG data-URIs

**Affected files (3):** `GameTable.module.css` (`.feltBranding` — one central crosshair + four corner diamonds), `DrawPile.module.css` (`.topCard` — one center-diamond card-back pattern), `MinimalCard.module.css` (`.cardBack` — same center-diamond pattern as DrawPile, light-mode fork uses different hex).

**The pattern**: three files each embed an SVG as a `url("data:image/svg+xml,...")` with hex colors encoded directly in the URL (`%23d48820` for ochre, `%23d44030` for red). The same "diamond + reticle" vocabulary appears in all three, but each file encodes it independently with slightly different hex. There is no shared source of truth — changing the card-back color means manually editing 3 data-URIs in 3 files.

**The fix**:
- Accept that CSS cannot interpolate `var()` inside a data-URI — this is a known CSS limitation, not negotiable.
- Document the exception inline: every preserved data-URI is preceded by a comment block listing the token aliases the hex represents, and the primitive value each one maps to. Example:
  ```css
  /* Data-URI hex values track these semantic tokens (CSS cannot var() inside url("...")):
     %23d48820 ≡ var(--color-accent-drama) ≡ var(--color-ochre-9) ≡ #b0754c (Phase 1 §2.2)
     %23d44030 ≡ var(--color-accent-burned) ≡ var(--color-cordovan-9) ≡ #a33340
     If the primitive value changes in Phase 1, update the data-URI hex manually.
  */
  ```
- Use the new Dreamland-palette primitive values (ochre-9 = `#b0754c`, cordovan-9 = `#a33340`) in every data-URI, replacing the old transitional values (`#d48820`, `#d44030`). The visual motif (reticle + diamonds) stays — only the palette shifts.
- Phase 5 CI check (deferred, flagged): add a regex test that asserts every data-URI hex in `board/` + `shared/*.module.css` matches the current primitive value of its documented semantic alias. Drift detection.

**Why**: the inline-SVG motifs are actually good design — Archer-tone geometric patterns, spy-agency vocabulary. The problem isn't the design, it's the three independent copies. A shared source would be ideal but requires moving the SVGs out to `.svg` files in `public/` and referencing them by URL — that's a worthwhile cleanup but it's a Phase 5 / post-rebuild task, not Phase 3. For now: inline, documented, palette-aligned.

#### Pattern B5 — Cross-view axis assumption (MinimalCard, GameOver, DramaOverlay)

**Affected files (3):** the three shared files consumed by both entry points.

**The pattern**: each cross-view file picks an axis unilaterally — `MinimalCard` uses `@container` queries (good!), `GameOver` uses `svh` (phone axis), `DramaOverlay` uses `vw` (board axis). The result is that `GameOver` rendered on the board inherits `svh` which no longer maps to "the board wrapper's height," and `DramaOverlay` rendered on the phone inherits `vw` which no longer maps to "the phone's constraining axis."

**The fix**: every cross-view file switches to container-query sizing. The entry points wrap both files in a container with `container-type: inline-size` or `size`, and the cross-view files consume `cqi` / `cqb` / `cqmin` / `cqmax` — axis-resolved against the container rather than the viewport. This is what `MinimalCard` already does correctly, and Phase 3 extends the pattern to `GameOver` and `DramaOverlay`.

**Required entry-point edits** (Phase 3 scope, one-line each):
- `src/client/board/Board.tsx` (or equivalent root): add `container-type: size` to the root div (or an ancestor of the GameOver + DramaOverlay mount points). Alternatively, wrap the existing root in a new `<div>` with `container-type: size` + `min-height: 100vh`.
- `src/client/player/Player.tsx` (or equivalent root): same treatment.
- Both edits are one line each; the CSS rewrites in §2.5 and §2.6 assume they've landed.

**Why**: container queries resolve axis per-rendering-context. A 12cqi title in MinimalCard is "12% of the container's inline axis" — on the phone that's width-constrained (smaller number), on the board that's width-constrained (larger number), in both cases it's the correct axis for that view. No viewport-based assumptions.

---

### §2.3 Per-file migration specs

Each subsection below gives: current LOC, current problems, and the FULL rewritten file content. Per the 2026-04-11 baking-recipe rule, execution is mechanical copy-paste — `/ce:work` does not compose CSS from transformation specs; it takes the block from the plan and writes it to disk.

#### §2.3.1 `GameTable.module.css` — REWRITE (184 LOC → ~155 LOC)

**Current problems**:
- Line 5: `height: 100svh` — axis violation on a board file.
- Line 6: `padding: 3vh 4vw` — mixed axis in a single property.
- Line 8: stale fallback `#f5f0e0`.
- Lines 17-40: base-layer `background` uses 5 stacked gradients with raw rgba hex throughout (`rgba(212, 136, 32, 0.22)`, `rgba(42, 80, 72, 0.25)`, `rgba(8, 18, 16, 0.65)`, `rgba(26, 42, 46, 0.06)`, `#1a2e30`, `#162828`, `#121e20`). Reproduces the warm-spotlight war-room feel but every color is unanchored.
- Lines 43-65: `.table::before` "fabric weave" uses `rgba(245, 240, 224, 0.015)` cream-ish grain — unanchored.
- Lines 68-82: `.table::after` "table edge" uses `rgba(212, 136, 32, 0.12)` + `rgba(0, 0, 0, 0.2)` + `rgba(212, 136, 32, 0.08)` — unanchored.
- Lines 86-119: `.feltBranding` uses 5 stacked inline-SVG data-URIs with `%23d48820` hex encoded in each, plus hardcoded `320px 320px`, `36px 36px`, `opacity: 0.18` — all raw.
- Lines 121-131: `@media (min-width: 1280px)` block redefining `.feltBranding` with `480px 480px`, `52px 52px`, `opacity: 0.22`. Hard-pixel doubling of a scalable vector asset = wasteful and brittle.
- Lines 143, 151: `gap: 40px`, `gap: 8px` hardcoded.
- Lines 155-161: `.pileLabel` with `font-size: 11px`, raw `rgba(200, 169, 96, 0.55)` — unanchored.
- Lines 166-171: `.eventFlash` with `z-index: 50` — unscaled raw z.
- Lines 175-178: `@media (min-width: 1280px)` redefining `.center { gap: min(100px, 7vw); }` and `.pileLabel { font-size: clamp(18px, 1.5vw, 26px); }`.
- Lines 180-183: `@media (min-width: 1600px)` redefining `.center { gap: min(140px, 7vw); }` and `.pileLabel { font-size: clamp(20px, 1.5vw, 28px); }`. Double hard-pixel doubling.

**Rewritten file content**:

```css
/* GameTable.module.css
   Board — war-room briefing table with dramatic overhead lighting.
   Grid-based full-bleed layout; children are absolute-positioned against the grid.

   Axis discipline: board view is WIDTH-constrained. The outermost .table uses
   `height: 100vh` (allowed exactly once, for the board's dedicated-viewport
   root) and every child sizes against `vw` through the Phase 1 board tokens.
*/

.table {
  position: relative;
  display: grid;
  grid-template-rows: auto 1fr auto;  /* announcement feed | play area | status bar */
  height: 100vh;
  padding: var(--space-fluid-base-board) var(--space-fluid-loose-board);
  font-family: var(--font-body);
  color: var(--color-fg-primary);
  overflow: hidden;

  /* Layered war-room surface (5 gradients stacked):
     1. Overhead spotlight — hot amber pool dead-center (draws the eye to the action)
     2. Wide warm ambient fill — teal cocktail-lounge undertone
     3. Heavy vignette — dark edges force center attention
     4. Fabric weave grain — subtle felt texture
     5. Base deep teal-charcoal — Dreamland mid-century warmth, NOT poker-green
  */
  background:
    /* 1: overhead spotlight */
    radial-gradient(ellipse 50% 40% at 50% 48%,
      color-mix(in srgb, var(--color-accent-drama) 35%, transparent) 0%,
      color-mix(in srgb, var(--color-accent-drama) 18%, transparent) 30%,
      transparent 60%),
    /* 2: wide warm ambient */
    radial-gradient(ellipse 80% 70% at 50% 50%,
      color-mix(in srgb, var(--color-teal-5) 40%, transparent) 0%,
      color-mix(in srgb, var(--color-teal-4) 25%, transparent) 40%,
      transparent 65%),
    /* 3: heavy vignette */
    radial-gradient(ellipse 75% 75% at 50% 50%,
      transparent 30%,
      color-mix(in srgb, var(--color-charcoal-1) 65%, transparent) 70%,
      color-mix(in srgb, var(--color-charcoal-1) 90%, transparent) 100%),
    /* 4: fabric weave micro-grain */
    repeating-conic-gradient(
      color-mix(in srgb, var(--color-teal-3) 8%, transparent) 0%,
      color-mix(in srgb, var(--color-teal-2) 6%, transparent) 0.5%,
      color-mix(in srgb, var(--color-teal-4) 9%, transparent) 1%
    ),
    /* 5: base teal-charcoal gradient */
    linear-gradient(170deg,
      var(--color-teal-3) 0%,
      var(--color-teal-2) 50%,
      var(--color-teal-1) 100%);
}

/* Fabric weave cross-hatching — subtle cream grain over the base gradient */
.table::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      color-mix(in srgb, var(--color-cream-12) 2%, transparent) 2px,
      color-mix(in srgb, var(--color-cream-12) 2%, transparent) 3px
    ),
    repeating-linear-gradient(
      90deg,
      transparent,
      transparent 2px,
      color-mix(in srgb, var(--color-cream-12) 2%, transparent) 2px,
      color-mix(in srgb, var(--color-cream-12) 2%, transparent) 3px
    );
  pointer-events: none;
  z-index: var(--z-base);
}

/* Table edge — geometric rectangular frame, mid-century modern */
.table::after {
  content: '';
  position: absolute;
  top: 3%;
  left: 2.5%;
  right: 2.5%;
  bottom: 3%;
  border: 1px solid color-mix(in srgb, var(--color-accent-drama) 18%, transparent);
  border-radius: var(--radius-xl);
  box-shadow:
    inset 0 0 80px color-mix(in srgb, var(--color-charcoal-1) 25%, transparent),
    0 0 1px color-mix(in srgb, var(--color-accent-drama) 12%, transparent);
  pointer-events: none;
  z-index: var(--z-raised);
}

/* ─── The Pendleton Agency — war-room felt decoration ───
   Central targeting reticle + four corner diamond markers.
   Archer spy-agency vocabulary: geometric reticles are Era-4 Archer-correct
   (Kirby/Ditko linework + mid-century geometric emphasis). This is the
   Tier 1 retheme satisfying PRODUCT-SPECIFICATION.md §6.4 Gap #3.

   Data-URI hex values track these semantic tokens
   (CSS cannot var() inside url("…") — manual sync required):
     %23b0754c ≡ var(--color-accent-drama) ≡ var(--color-ochre-9)
     If Phase 1 primitives.css ochre-9 changes, update every %23b0754c below.
*/

.feltBranding {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: var(--z-raised);

  background-image:
    /* Center: agency targeting reticle — the Pendleton stamp */
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Ccircle cx='100' cy='100' r='80' fill='none' stroke='%23b0754c' stroke-width='1' opacity='0.6'/%3E%3Ccircle cx='100' cy='100' r='50' fill='none' stroke='%23b0754c' stroke-width='0.8' opacity='0.4'/%3E%3Ccircle cx='100' cy='100' r='20' fill='none' stroke='%23b0754c' stroke-width='0.6' opacity='0.3'/%3E%3Cline x1='100' y1='5' x2='100' y2='42' stroke='%23b0754c' stroke-width='1.2' opacity='0.5'/%3E%3Cline x1='100' y1='158' x2='100' y2='195' stroke='%23b0754c' stroke-width='1.2' opacity='0.5'/%3E%3Cline x1='5' y1='100' x2='42' y2='100' stroke='%23b0754c' stroke-width='1.2' opacity='0.5'/%3E%3Cline x1='158' y1='100' x2='195' y2='100' stroke='%23b0754c' stroke-width='1.2' opacity='0.5'/%3E%3C/svg%3E"),
    /* Corner diamonds — geometric mid-century markers (4 copies, same SVG, different position) */
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Cpath d='M20 4 L36 20 L20 36 L4 20 Z' fill='none' stroke='%23b0754c' stroke-width='1'/%3E%3Cpath d='M20 12 L28 20 L20 28 L12 20 Z' fill='%23b0754c' opacity='0.3'/%3E%3C/svg%3E"),
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Cpath d='M20 4 L36 20 L20 36 L4 20 Z' fill='none' stroke='%23b0754c' stroke-width='1'/%3E%3Cpath d='M20 12 L28 20 L20 28 L12 20 Z' fill='%23b0754c' opacity='0.3'/%3E%3C/svg%3E"),
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Cpath d='M20 4 L36 20 L20 36 L4 20 Z' fill='none' stroke='%23b0754c' stroke-width='1'/%3E%3Cpath d='M20 12 L28 20 L20 28 L12 20 Z' fill='%23b0754c' opacity='0.3'/%3E%3C/svg%3E"),
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Cpath d='M20 4 L36 20 L20 36 L4 20 Z' fill='none' stroke='%23b0754c' stroke-width='1'/%3E%3Cpath d='M20 12 L28 20 L20 28 L12 20 Z' fill='%23b0754c' opacity='0.3'/%3E%3C/svg%3E");

  /* Sizes scale with viewport width via clamp() tokens — no media queries */
  background-size:
    var(--size-felt-reticle) var(--size-felt-reticle),
    var(--size-felt-diamond) var(--size-felt-diamond),
    var(--size-felt-diamond) var(--size-felt-diamond),
    var(--size-felt-diamond) var(--size-felt-diamond),
    var(--size-felt-diamond) var(--size-felt-diamond);

  background-position:
    center center,
    6% 7%,
    94% 7%,
    6% 93%,
    94% 93%;

  background-repeat: no-repeat;
  opacity: 0.2;
}

/* ─── Center stage — draw pile + arena + discard, dead center ─── */

.center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-fluid-loose-board);
  z-index: var(--z-sticky);
}

.pileSection {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
}

.pileLabel {
  font-family: var(--font-display);
  font-size: var(--text-caption-board);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: color-mix(in srgb, var(--color-accent-drama) 55%, transparent);
}

/* ─── Full-screen event flash (GSAP target in Phase 4) ─── */

.eventFlash {
  position: fixed;
  inset: 0;
  z-index: var(--z-overlay);
  pointer-events: none;
  opacity: 0;
}
```

**Key transformations**:
- `height: 100svh` → `height: 100vh` (allowed on the outermost board wrapper per §2.2 rule 9) plus CSS Grid (`display: grid; grid-template-rows: auto 1fr auto`) so child layouts are grid-relative, not height-relative.
- `padding: 3vh 4vw` → `padding: var(--space-fluid-base-board) var(--space-fluid-loose-board)` (new board-fluid tokens — see §7 cross-phase flag).
- All 5 background-layer gradients rewritten to consume semantic token references via `color-mix()`. The aesthetic goal (hot amber spotlight over teal cocktail-lounge base) is preserved by routing through `--color-accent-drama` (ochre-9, the warm amber) and `--color-teal-2..5` (the cool ambient + base gradient). Three deep-vignette stops consume `--color-charcoal-1` (the darkest warm-black primitive).
- `feltBranding` SVG hex encoded as `%23b0754c` throughout — aligned with `--color-accent-drama` → `--color-ochre-9` primitive value. The exception comment at the top of the section lists the token alias so deepening or Phase 5 can add CI drift detection.
- `feltBranding` sizing uses two new scalable tokens (`--size-felt-reticle`, `--size-felt-diamond`) from Phase 1 — see §7. These interpolate `vw`-smoothly across 1280 → 3840 and eliminate the 1280px hard-pixel doubling block.
- `.center`'s gap uses `--space-fluid-loose-board` (a new board-fluid spacing token). The 1280px and 1600px media queries are DELETED.
- `.pileLabel` font-size uses `--text-caption-board` (new Phase 1 addition, board counterpart of the phone `--text-caption`). `letter-spacing: 0.2em` is retained because it's an expressive typographic choice, not a dimensional decision.
- All z-indices routed through `--z-base|raised|sticky|overlay`.

**Cross-phase concerns**:
- **New Phase 1 tokens required**: `--space-fluid-base-board`, `--space-fluid-loose-board`, `--text-caption-board`, `--size-felt-reticle`, `--size-felt-diamond`. See §7 full list.
- **Tier 1 retheme TSX edit**: `GameTable.tsx:24` comment "EK identity baked into the table" → "The Pendleton Agency — war-room felt decoration". See §2.7.

**Acceptance for this file**:
- [ ] Zero hardcoded hex outside the three data-URIs (which carry the documented exception comment).
- [ ] Zero `svh` / `vh` / `vh-axis` usage except the one allowed `100vh` on `.table`.
- [ ] Zero `@media (min-width: <px>)` viewport breakpoints.
- [ ] `.table` is a CSS Grid container with a three-row template.
- [ ] `feltBranding` data-URI hex matches `--color-ochre-9` primitive value at time of execution.
- [ ] The §2.2 Archer test passes on the GameTable base view at 1280, 1920, 2560, 3840 viewport widths.

#### §2.3.2 `Lobby.module.css` — REWRITE (316 LOC → ~240 LOC)

**Current problems**:
- Line 8: `height: 100svh` — axis violation.
- Line 27: `background: linear-gradient(175deg, #1e3a24 0%, #193220 50%, #142a1a 100%)` — GREEN base gradient, inconsistent with `GameTable`'s teal-charcoal. Symptom of Pattern B3 (palette fragmentation).
- Lines 14-27: 4 stacked background gradients with raw rgba throughout (`rgba(220, 180, 100, 0.14)`, `rgba(180, 140, 80, 0.06)`, `rgba(80, 65, 40, 0.15)`, `rgba(5, 12, 5, 0.55)`, `rgba(2, 8, 2, 0.75)`).
- Stale Era-1 fallbacks throughout: `#e8e8f0` (text-primary), `#9999bb` (text-secondary), `#555570` (text-disabled), `#12121f` (bg-card), `#2a2a4a` (border-subtle), `#33ffff` (focus-ring), `#222240` (bg-hover).
- Stale Era-2 fallback: `var(--red, #e03535)` used for title glow, accent line, start button background, start button shadow. The `--red` alias is part of the old UMB palette and gets deleted in the new tokens.
- Hardcoded `padding: 48px 32px 32px`, `font-size: 48px`, `letter-spacing: 0.08em`, `margin-bottom: 6px`, `width: 80px`, `height: 2px`, `padding: 16px`, `font-size: 36px`, `font-size: 14px`, `max-width: 440px`, `gap: 8px`, `padding: 10px 16px`, `font-size: 18px`, `font-size: 12px`, `padding: 14px 48px`, `font-size: 18px`.
- Hardcoded `rgba(30, 28, 24, 0.92)` / `rgba(18, 18, 16, 0.96)` for `.playerCard` gradient.
- Hardcoded `rgba(180, 160, 120, 0.1)` border, `rgba(0, 0, 0, 0.3)` shadow, `rgba(0, 0, 0, 0.4)` shadow.
- `@keyframes dotPulse` with raw animation timing `1.4s ease-in-out`.
- `@keyframes buttonPulse` with raw `2s ease-in-out`.
- `transition: transform 0.15s ease` — raw.
- `transition: background 0.15s, color 0.15s` — raw.
- `outline: 2px solid var(--focus-ring, #33ffff); outline-offset: 3px` — stale focus-ring hex.
- `@media (min-width: 1280px)` block with 11 hand-tuned overrides (padding, font-sizes, widths).
- `.devToolbar` / `.devLink` (dev-only localhost toolbar) — `rgba(200, 169, 96, 0.3)`, `rgba(200, 169, 96, 0.08)`, `rgba(200, 169, 96, 0.6)` hardcoded.

**Rewritten file content**:

```css
/* Lobby.module.css
   Board — first-impression screen. Room code + QR + player roster + Start button.
   Must feel visually identical to the GameTable it transitions into — shared
   palette, shared background structure, shared typographic vocabulary. This is
   Pattern B3 resolution: Lobby and GameTable are one product.
*/

.container {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  padding: var(--space-fluid-loose-board) var(--space-fluid-base-board) var(--space-fluid-base-board);
  color: var(--color-fg-primary);
  font-family: var(--font-body);
  overflow: hidden;

  /* Game-table felt — same stack as GameTable.module.css for visual continuity */
  background:
    radial-gradient(ellipse 50% 40% at 50% 35%,
      color-mix(in srgb, var(--color-accent-drama) 30%, transparent) 0%,
      color-mix(in srgb, var(--color-accent-drama) 14%, transparent) 40%,
      transparent 65%),
    radial-gradient(ellipse 80% 70% at 50% 50%,
      color-mix(in srgb, var(--color-teal-5) 40%, transparent) 0%,
      color-mix(in srgb, var(--color-teal-4) 22%, transparent) 40%,
      transparent 65%),
    radial-gradient(ellipse 85% 85% at 50% 50%,
      transparent 40%,
      color-mix(in srgb, var(--color-charcoal-1) 55%, transparent) 80%,
      color-mix(in srgb, var(--color-charcoal-1) 78%, transparent) 100%),
    linear-gradient(175deg,
      var(--color-teal-3) 0%,
      var(--color-teal-2) 50%,
      var(--color-teal-1) 100%);
}

/* ─── Title ─── */

.title {
  font-family: var(--font-display);
  font-size: var(--text-display);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  text-align: center;
  margin-bottom: var(--space-2);
  flex-shrink: 0;
  /* Cordovan ambient glow — the Burned accent, not Jackbox red */
  text-shadow:
    0 0 40px color-mix(in srgb, var(--color-accent-burned) 30%, transparent),
    0 0 80px color-mix(in srgb, var(--color-accent-burned) 12%, transparent);
}

.titleAccent {
  display: block;
  width: var(--size-title-accent-width);
  height: 2px;
  margin: 0 auto var(--space-8);
  background: linear-gradient(
    90deg,
    transparent 0%,
    var(--color-accent-burned) 30%,
    var(--color-accent-burned) 70%,
    transparent 100%
  );
  border-radius: var(--radius-xs);
}

/* ─── QR section ─── */

.qrSection {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-8);
  flex-shrink: 0;
}

.qrFrame {
  padding: var(--space-4);
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  box-shadow:
    var(--shadow-md),
    0 0 40px color-mix(in srgb, var(--color-accent-burned) 6%, transparent);
}

.roomCode {
  font-family: var(--font-mono);
  font-size: var(--text-title);
  font-weight: 700;
  letter-spacing: 0.25em;
  font-variant-numeric: tabular-nums;
  color: var(--color-fg-primary);
}

.hint {
  font-size: var(--text-body);
  color: var(--color-fg-muted);
  letter-spacing: 0.05em;
}

/* ─── Player roster ─── */

.roster {
  width: 100%;
  max-width: var(--size-lobby-roster-max-width);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-bottom: var(--space-6);
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: none;
}

.roster::-webkit-scrollbar {
  display: none;
}

.rosterHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-1) var(--space-2);
}

.rosterLabel {
  font-family: var(--font-display);
  font-size: var(--text-caption-board);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--color-fg-muted);
}

.rosterCount {
  font-family: var(--font-mono);
  font-size: var(--text-caption-board);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--color-fg-secondary);
}

/* ─── Player card ─── */

.playerCard {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: linear-gradient(
    165deg,
    color-mix(in srgb, var(--color-bg-elevated) 92%, transparent) 0%,
    color-mix(in srgb, var(--color-bg-surface) 96%, transparent) 100%
  );
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  overflow: hidden;
  box-shadow: var(--shadow-md);
}

.playerName {
  font-size: var(--text-body);
  font-weight: 500;
  flex: 1;
}

.disconnectedBadge {
  font-size: var(--text-caption-board);
  font-weight: 600;
  color: var(--color-fg-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* ─── Waiting state ─── */

.waiting {
  text-align: center;
  color: var(--color-fg-muted);
  padding: var(--space-6) 0;
}

.waitingDots {
  display: inline-flex;
  gap: var(--space-1);
  margin-left: var(--space-1);
}

.waitingDot {
  width: var(--space-1);
  height: var(--space-1);
  border-radius: var(--radius-full);
  background: var(--color-fg-muted);
  animation: lobbyDotPulse var(--motion-duration-pulse) var(--motion-ease-standard) infinite;
}

.waitingDot:nth-child(2) { animation-delay: 0.2s; }
.waitingDot:nth-child(3) { animation-delay: 0.4s; }

@keyframes lobbyDotPulse {
  0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
  40% { opacity: 1; transform: scale(1); }
}

/* ─── Start button ─── */

.startButton {
  position: relative;
  padding: var(--space-4) var(--space-12);
  font-family: var(--font-display);
  font-size: var(--text-title);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  border: none;
  border-radius: var(--radius-md);
  background: var(--color-accent-burned);
  color: var(--color-fg-on-accent);
  cursor: pointer;
  flex-shrink: 0;
  z-index: var(--z-raised);
  transition: transform var(--motion-duration-fast) var(--motion-ease-standard);
}

/* Pulsing glow — only opacity animates (GPU composited) */
.startButton::after {
  content: '';
  position: absolute;
  inset: -3px;
  border-radius: calc(var(--radius-md) + 3px);
  box-shadow:
    0 0 12px color-mix(in srgb, var(--color-accent-burned) 60%, transparent),
    0 0 32px color-mix(in srgb, var(--color-accent-burned) 30%, transparent),
    0 0 64px color-mix(in srgb, var(--color-accent-burned) 15%, transparent);
  animation: lobbyButtonPulse var(--motion-duration-pulse-slow) var(--motion-ease-standard) infinite;
  z-index: -1;
  pointer-events: none;
}

@keyframes lobbyButtonPulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}

.startButton:hover {
  transform: scale(1.03);
}

.startButton:active {
  transform: scale(0.98);
}

.startButton:focus-visible {
  outline: 2px solid var(--color-border-focus);
  outline-offset: 3px;
}

.startButton:disabled {
  background: var(--color-bg-interactive);
  color: var(--color-fg-disabled);
  cursor: not-allowed;
  transform: none;
}

.startButton:disabled::after {
  display: none;
}

/* ─── Dev toolbar (localhost only) ─── */

.devToolbar {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-4);
  flex-shrink: 0;
}

.devLink {
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-sm);
  border: 1px dashed color-mix(in srgb, var(--color-accent-drama) 30%, transparent);
  background: color-mix(in srgb, var(--color-accent-drama) 8%, transparent);
  color: color-mix(in srgb, var(--color-accent-drama) 60%, transparent);
  font-family: var(--font-mono);
  font-size: var(--text-caption-board);
  text-decoration: none;
  cursor: pointer;
  transition:
    background var(--motion-duration-fast) var(--motion-ease-standard),
    color var(--motion-duration-fast) var(--motion-ease-standard);
}

.devLink:hover {
  background: color-mix(in srgb, var(--color-accent-drama) 15%, transparent);
  color: color-mix(in srgb, var(--color-accent-drama) 90%, transparent);
}

/* ─── Reduced motion ─── */

@media (prefers-reduced-motion: reduce) {
  .startButton::after { animation: none; opacity: 0.6; }
  .waitingDot { animation: none; opacity: 0.5; }
}
```

**Key transformations**:
- Base `background` stack rewritten to mirror `GameTable.module.css`'s structure — same 4 layers (spotlight, ambient, vignette, teal-charcoal base), same token references. This is the Pattern B3 resolution: Lobby palette is literally derived from the same semantic tokens as GameTable.
- `height: 100svh` → `min-height: 100vh` (allowed on the outermost board wrapper per §2.2 rule 9).
- `var(--red, #e03535)` eliminated everywhere; title glow + accent line + start-button background + start-button pulse all route through `--color-accent-burned` (cordovan-9).
- `@media (min-width: 1280px)` block with 11 overrides DELETED. The base rules now consume `clamp(vw)` tokens throughout (`--text-display`, `--text-title`, `--text-body`, `--text-caption-board`, `--space-fluid-*-board`) which interpolate smoothly across 1280 → 3840.
- `dotPulse` → `lobbyDotPulse` renamed to prevent cross-file keyframe collision when multiple board files import each other during HMR. `buttonPulse` → `lobbyButtonPulse` similarly renamed.
- Ambient animation durations (`1.4s` dot pulse, `2s` button pulse) consume new Phase 1 tokens `--motion-duration-pulse` and `--motion-duration-pulse-slow` — see §7 cross-phase flags.
- Dev toolbar preserved with semantic-token styling; the dashed-border affordance survives.

**Cross-phase concerns**:
- **Palette unification complete** — Lobby and GameTable now share the same base gradient structure through the same semantic tokens. Any future palette tweak in Phase 1 primitives propagates to both screens automatically.
- **New Phase 1 tokens required**: `--motion-duration-pulse` (~1400ms), `--motion-duration-pulse-slow` (~2000ms), `--size-title-accent-width`, `--size-lobby-roster-max-width`, `--text-caption-board`. See §7.
- **Stale keyframe name collision potential**: the old file had a bare `dotPulse` keyframe name in module scope — CSS modules already scope keyframes, but the rename to `lobbyDotPulse` prevents confusion if anyone greps for the keyframe in the global-CSS hardening file.

**Acceptance for this file**:
- [ ] Zero hardcoded hex.
- [ ] Zero stale `var(--foo, #hex)` fallbacks.
- [ ] Background gradient structure matches `GameTable.module.css` — same 4 layers, same token references.
- [ ] Zero `@media (min-width: <px>)` viewport breakpoints.
- [ ] Start button consumes `--color-accent-burned`, not `--red`.
- [ ] Dev toolbar still visible and functional on localhost, styled through `--color-accent-drama` semantic.
- [ ] The §2.2 Archer test passes on the Lobby at 1280, 1920, 2560, 3840 viewport widths.
- [ ] Visual continuity: transitioning from Lobby to GameTable feels like the same room, not two different apps.

#### §2.3.3 `PlayerRing.module.css` — REWRITE (176 LOC → ~145 LOC)

**Current problems**:
- Line 13: `width: 200px` hardcoded panel width. Coupled to `PlayerRing.tsx:70` which reads `panelW = isTV ? Math.min(320, vwPanel) : 200` in layout math. The CSS and TSX share the hardcoded number — a landmine.
- Lines 18-22: `background: linear-gradient(165deg, rgba(30, 28, 24, 0.92) 0%, rgba(18, 18, 16, 0.96) 100%)` — same gradient as `Lobby.playerCard` but with different raw hex. Pattern B3 duplication.
- Line 23: `border: 1px solid rgba(180, 160, 120, 0.1)` — unanchored.
- Line 25: `transition: border-color 0.3s ease, box-shadow 0.4s ease` — raw timing.
- Line 26: `box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4)` — unanchored.
- Lines 32-36: active-state box-shadow with raw `rgba(0, 0, 0, 0.4)` mixed with `color-mix(…var(--player-color)…)`. The `var(--player-color)` is set from TSX inline-style and is correct; the fixed-shadow is stale.
- Lines 45-49: `.accentBar { height: 4px; transition: height 0.3s ease; }` — raw timing.
- Lines 72-82: `.name` with `font-family: var(--font-display)`, hardcoded `font-size: 16px`, stale `color: var(--text-primary, #e8e8f0)`.
- Lines 88-99: `.turnBadge` with hardcoded `font-size: 11px`, `color: var(--bg-app, #0c0a12)`, `background: var(--amber, #e8922a)`, `padding: 2px 7px`, `border-radius: 6px`, `box-shadow: 0 0 8px …`. All stale.
- Lines 110-115: `.count` with `font-size: 12px`, `color: var(--text-secondary, #9999bb)`. Stale.
- Lines 124-132: `.eliminatedRow` with `bottom: 12px`, `left: 20px`, `right: 20px`, `gap: 6px 16px`. Raw.
- Lines 141-147: `.eliminatedName` with `font-size: 12px`, `color: var(--text-disabled, #555570)`. Stale.
- Lines 151-159: `@media (min-width: 1280px)` with 6 overrides — panel width, accent bar, padding, name font-size, count font-size, turn badge.
- Lines 161-167: `@media (min-width: 1600px)` with 5 more overrides.

**Rewritten file content**:

```css
/* PlayerRing.module.css
   Board — player panels orbiting the center. Each panel is a player's identity
   card (color bar + name + turn state + card count).

   Layout math: panel position is computed in PlayerRing.tsx via ringLayout.ts
   against the container's ResizeObserver dimensions. The panel WIDTH is computed
   by reading --size-player-panel-width from CSS at runtime (not hardcoded in TSX),
   so TSX and CSS agree through a single source. Legacy landmine resolved: the
   previous code had panelW = isTV ? 320 : 200 in TSX:70 — a duplicate of the
   CSS value. After Phase 3, TSX reads the computed style of a hidden measurement
   div to get the token-driven value. The TSX edit is Phase 4 territory; this
   file makes the CSS side consume the token so the TSX-side read works.
*/

.ring {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: var(--z-raised);
}

/* ─── Player panel ─── */

.panel {
  position: absolute;
  width: var(--size-player-panel-width);
  pointer-events: auto;
  will-change: transform, filter;
  border-radius: var(--radius-card);
  background: linear-gradient(
    165deg,
    color-mix(in srgb, var(--color-bg-elevated) 92%, transparent) 0%,
    color-mix(in srgb, var(--color-bg-surface) 96%, transparent) 100%
  );
  border: 1px solid var(--color-border-subtle);
  overflow: hidden;
  transition:
    border-color var(--motion-duration-base) var(--motion-ease-standard),
    box-shadow var(--motion-duration-slow) var(--motion-ease-standard);
  box-shadow: var(--shadow-md);
}

/* ─── Active player — dramatic emphasis driven by inline --player-color ─── */

.panel[data-active] {
  border-color: color-mix(in srgb, var(--player-color) 60%, transparent);
  box-shadow:
    0 0 24px color-mix(in srgb, var(--player-color) 30%, transparent),
    0 0 60px color-mix(in srgb, var(--player-color) 12%, transparent),
    var(--shadow-md);
}

.panel:not([data-active]) {
  opacity: 0.85;
}

/* ─── Color accent bar — top edge, player identity ─── */

.accentBar {
  height: var(--space-1);
  width: 100%;
  transition: height var(--motion-duration-base) var(--motion-ease-standard);
}

.panel[data-active] .accentBar {
  height: calc(var(--space-1) + 1px);
  box-shadow: 0 2px 12px color-mix(in srgb, var(--player-color) 50%, transparent);
}

/* ─── Panel body — name + meta ─── */

.panelBody {
  padding: var(--space-3) var(--space-4) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.nameRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.name {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: var(--text-title);
  letter-spacing: 0.01em;
  color: var(--color-fg-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.panel[data-active] .name {
  color: var(--color-cream-12);
}

.turnBadge {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-size: var(--text-caption-board);
  font-weight: 800;
  color: var(--color-bg-app);
  background: var(--color-accent-drama);
  padding: var(--space-0) var(--space-2);
  border-radius: var(--radius-sm);
  flex-shrink: 0;
  box-shadow: 0 0 8px color-mix(in srgb, var(--color-accent-drama) 40%, transparent);
}

/* ─── Meta row — color dot + card count ─── */

.metaRow {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.count {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--color-fg-secondary);
}

.panel[data-active] .count {
  color: var(--color-fg-primary);
}

/* ─── Eliminated players ─── */

.eliminatedRow {
  position: absolute;
  bottom: var(--space-3);
  left: var(--space-5);
  right: var(--space-5);
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-4);
  pointer-events: none;
}

.eliminated {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  opacity: 0.3;
}

.eliminatedName {
  font-family: var(--font-body);
  font-size: var(--text-caption-board);
  font-weight: 500;
  color: var(--color-fg-disabled);
  text-decoration: line-through;
}

/* ─── Reduced motion ─── */

@media (prefers-reduced-motion: reduce) {
  .panel[data-active] {
    transition: none;
  }
  .accentBar {
    transition: none;
  }
}
```

**Key transformations**:
- Panel width `200px` → `var(--size-player-panel-width)`. The token interpolates 160 → 420 across 1280 → 3840 so the stepped 200/320/420 breakpoints become continuous.
- Both `@media (min-width: 1280px)` and `@media (min-width: 1600px)` blocks DELETED. All the formerly-stepped font sizes (`clamp(22px, 2vw, 32px)` at 1280, `clamp(28px, 2vw, 38px)` at 1600) are replaced by a single `--text-title` token that interpolates smoothly.
- Player panel background gradient consumes `--color-bg-elevated` + `--color-bg-surface` — identical to `Lobby.playerCard` in §2.3.2 so the two screens share a single source of truth for the "player card" visual motif.
- `var(--amber, #e8922a)` turn badge → `var(--color-accent-drama)` (ochre-9). The "amber" semantic becomes "drama ochre" which is the same color role.
- `transition: border-color 0.3s ease, box-shadow 0.4s ease` → split transitions consuming `--motion-duration-base` (250ms) and `--motion-duration-slow` (400ms) with `--motion-ease-standard`.

**Cross-phase concerns**:
- **Landmine preserved**: the comment at the top of the file documents the TSX ↔ CSS panel-width coupling. Phase 4 will resolve this by having TSX read `getComputedStyle(measurementDiv).getPropertyValue('--size-player-panel-width')` at layout time. Until then, the CSS token is the source of truth and TSX will be updated to match during Phase 4's GSAP motion consolidation pass.
- **New Phase 1 token required**: `--size-player-panel-width` (160 → 420 across 1280 → 3840 viewport width). See §7.
- **`--color-cream-12` in `.panel[data-active] .name`**: the old code used `#fff` for the pure-white brightened active-name. New code uses cream-12 (`#f0e4c4`) — a warmer high-contrast text that matches the Dreamland palette's warmth. This is a deliberate design shift; pure white is too cool for the cocktail-lounge room.

**Acceptance for this file**:
- [ ] Zero hardcoded hex.
- [ ] Zero `@media (min-width: <px>)` blocks.
- [ ] Panel width consumes `--size-player-panel-width`.
- [ ] `.panel[data-active]` box-shadow still consumes `var(--player-color)` inline style (preserved — TSX sets it).
- [ ] Landmine comment preserved at top of file re: TSX ↔ CSS coupling.

#### §2.3.4 `DrawPile.module.css` — REWRITE (100 LOC → ~95 LOC)

**Current problems**:
- Lines 11-12: `width: 140px`, `height: 196px` hardcoded stack dimensions.
- Line 15: `filter: drop-shadow(0 0 30px rgba(212, 64, 48, 0.15))` — raw rgba.
- Lines 18-21: `@keyframes breathe` with hardcoded `4s ease-in-out` timing and raw `rgba(212, 64, 48, 0.15)` / `rgba(212, 64, 48, 0.25)` in each keyframe stop.
- Line 27: `background-color: #18252a` raw hex.
- Line 28: `border: 1px solid rgba(212, 136, 32, 0.15)` raw.
- Line 29: `box-shadow: 0 2px 12px rgba(0, 0, 0, 0.5)` raw.
- Line 37: `background-color: #18252a` — duplicated raw hex (`.layer` and `.topCard` both declare it).
- Line 41: inline data-URI SVG with `%23d44030` + `%23d48820` hex encoded. Same pattern as `MinimalCard.cardBack`.
- Line 44: `border: 1.5px solid rgba(212, 64, 48, 0.25)` raw.
- Lines 45-48: three stacked box-shadows with raw `rgba(0, 0, 0, 0.6)`, `rgba(212, 64, 48, 0.12)`, `rgba(212, 64, 48, 0.06)`.
- Lines 52-58: `.topCard::before` inner border frame with raw `rgba(212, 136, 32, 0.18)` + `calc(var(--radius-card) - 3px)`.
- Lines 62-68: `.topCard::after` second inner frame with raw `rgba(212, 64, 48, 0.12)`.
- Lines 72-79: `.countBadge` with `font-size: 32px`, raw `rgba(245, 240, 224, 0.9)`, raw `rgba(0, 0, 0, 0.6)` text shadow.
- Lines 81-87: `@media (min-width: 1280px)` with 2 overrides.
- Lines 89-95: `@media (min-width: 1600px)` with 2 more overrides.

**Rewritten file content**:

```css
/* DrawPile.module.css
   Board — the stack of face-down cards in the middle of the table. Slow
   ambient breathing animation draws the eye. The top card shows the
   Pendleton Agency dossier pattern (geometric diamonds + crosshair).
*/

.pile {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
}

.stack {
  position: relative;
  width: var(--size-draw-pile-width);
  height: calc(var(--size-draw-pile-width) * 7 / 5);  /* 5:7 aspect ratio */
  animation: drawPileBreathe var(--motion-duration-ambient) var(--motion-ease-standard) infinite;
  /* Ambient glow beneath the pile — Burned accent */
  filter: drop-shadow(0 0 30px color-mix(in srgb, var(--color-accent-burned) 18%, transparent));
}

@keyframes drawPileBreathe {
  0%, 100% {
    transform: scale(1);
    filter: drop-shadow(0 0 30px color-mix(in srgb, var(--color-accent-burned) 18%, transparent));
  }
  50% {
    transform: scale(1.025);
    filter: drop-shadow(0 0 40px color-mix(in srgb, var(--color-accent-burned) 28%, transparent));
  }
}

.layer {
  position: absolute;
  inset: 0;
  border-radius: var(--radius-card);
  background-color: var(--color-teal-2);
  border: 1px solid color-mix(in srgb, var(--color-accent-drama) 18%, transparent);
  box-shadow: var(--shadow-md);
}

/* ─── Top card — Pendleton Agency dossier pattern ───
   Data-URI hex tracks semantic tokens (manual sync required):
     %23a33340 ≡ var(--color-accent-burned) ≡ var(--color-cordovan-9)
     %23b0754c ≡ var(--color-accent-drama)  ≡ var(--color-ochre-9)
   If Phase 1 primitives.css ochre-9 or cordovan-9 change, update the hex below.
*/

.topCard {
  position: absolute;
  inset: 0;
  z-index: var(--z-raised);
  border-radius: var(--radius-card);
  background-color: var(--color-teal-2);
  background-image:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 140'%3E%3Cpath d='M50 20 L80 70 L50 120 L20 70 Z' fill='none' stroke='%23a33340' stroke-width='1.5' opacity='0.35'/%3E%3Cpath d='M50 35 L70 70 L50 105 L30 70 Z' fill='none' stroke='%23b0754c' stroke-width='1' opacity='0.25'/%3E%3Ccircle cx='50' cy='70' r='8' fill='none' stroke='%23a33340' stroke-width='1' opacity='0.3'/%3E%3Ccircle cx='50' cy='70' r='3' fill='%23a33340' opacity='0.25'/%3E%3Cline x1='50' y1='8' x2='50' y2='30' stroke='%23b0754c' stroke-width='0.8' opacity='0.2'/%3E%3Cline x1='50' y1='110' x2='50' y2='132' stroke='%23b0754c' stroke-width='0.8' opacity='0.2'/%3E%3Cline x1='10' y1='70' x2='28' y2='70' stroke='%23b0754c' stroke-width='0.8' opacity='0.2'/%3E%3Cline x1='72' y1='70' x2='90' y2='70' stroke='%23b0754c' stroke-width='0.8' opacity='0.2'/%3E%3C/svg%3E");
  background-size: 100% 100%;
  background-repeat: no-repeat;
  border: 1.5px solid color-mix(in srgb, var(--color-accent-burned) 30%, transparent);
  box-shadow:
    var(--shadow-lg),
    0 0 30px color-mix(in srgb, var(--color-accent-burned) 14%, transparent),
    0 0 60px color-mix(in srgb, var(--color-accent-burned) 7%, transparent);
}

/* Inner border frame — double-line agency dossier feel */
.topCard::before {
  content: '';
  position: absolute;
  inset: var(--space-2);
  border: 1px solid color-mix(in srgb, var(--color-accent-drama) 20%, transparent);
  border-radius: calc(var(--radius-card) - var(--space-1));
  pointer-events: none;
}

/* Second inner frame — subtle cordovan stroke */
.topCard::after {
  content: '';
  position: absolute;
  inset: calc(var(--space-2) + 2px);
  border: 0.5px solid color-mix(in srgb, var(--color-accent-burned) 14%, transparent);
  border-radius: calc(var(--radius-card) - var(--space-2));
  pointer-events: none;
}

.countBadge {
  font-family: var(--font-display);
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  font-size: var(--text-display);
  color: color-mix(in srgb, var(--color-cream-12) 90%, transparent);
  text-shadow: 0 2px 12px color-mix(in srgb, var(--color-charcoal-1) 60%, transparent);
  letter-spacing: 0.05em;
}

@media (prefers-reduced-motion: reduce) {
  .stack { animation: none; }
}
```

**Key transformations**:
- Stack dimensions `140px × 196px` → `width: var(--size-draw-pile-width); height: calc(var(--size-draw-pile-width) * 7 / 5)`. Single token drives both axes via 5:7 aspect derivation.
- Both `@media (min-width: 1280px|1600px)` blocks DELETED. `--size-draw-pile-width` clamp interpolates across the whole viewport range.
- Breathing animation duration `4s` → `var(--motion-duration-ambient)` (new token, proposed 4000ms — see §7 cross-phase flags).
- Keyframe renamed `breathe` → `drawPileBreathe` to prevent collision with future board-wide ambient animations.
- Data-URI hex updated: `%23d44030` (transitional BURNED red) → `%23a33340` (cordovan-9 from Dreamland palette). `%23d48820` (transitional ochre) → `%23b0754c` (ochre-9 from Dreamland palette). Comment block above data-URI documents the mapping.
- Card layer background `#18252a` → `var(--color-teal-2)` (hex `#0c2024`, the "subtle background" primitive). Minor warmth shift; the visual weight is preserved.
- `.countBadge` font-size `32px` → `var(--text-display)` which interpolates 40 → 96 across the viewport range. This is an upgrade — the old code had the countBadge at `32px` baseline and `clamp(64px, 4.5vw, 96px)` at the 1280px breakpoint; the new token starts at 40 and tops out at 96, which is stronger at low ends and identical at high ends.

**Cross-phase concerns**:
- **New Phase 1 token required**: `--motion-duration-ambient` (4000ms, for slow breathing/pulse animations). Candidate for companion `--motion-duration-ambient-slow` (6000-8000ms) if other ambient loops need a slower tier.
- **`--size-draw-pile-width` already defined** in Phase 1 §2.5 at 80→160. The old code had the stack at 140/320/480 hand-tuned — the new range 80→160 is smaller. Phase 1 deepening should expand this token to 120→240 or similar to match the old visual weight. Flag for §7.

**Acceptance for this file**:
- [ ] Zero hardcoded hex outside the one documented data-URI.
- [ ] Data-URI hex matches current cordovan-9 + ochre-9 primitive values.
- [ ] Zero `@media (min-width: <px>)` blocks.
- [ ] Breathing animation consumes `--motion-duration-ambient` token.
- [ ] `prefers-reduced-motion` block retained.

#### §2.3.5 `DiscardFan.module.css` — REWRITE (43 LOC → ~50 LOC)

**Current problems**:
- Lines 6-7: `width: 130px`, `height: 182px` hardcoded.
- Line 13: `width: 120px` hardcoded top-card width.
- Line 21: `width: 120px` hardcoded peek-card width.
- Line 23: `transform: rotate(-5deg) translate(-6px, 0)` — raw pixel offset.
- Line 27: `.empty { font-size: 42px; color: rgba(180, 160, 120, 0.3); }` — raw.
- Lines 32-36: `@media (min-width: 1280px)` with 4 overrides.
- Lines 38-42: `@media (min-width: 1600px)` with 4 more overrides.

**Rewritten file content**:

```css
/* DiscardFan.module.css
   Board — discard pile showing the most-recent card on top with a peek of the
   previous card fanned behind it at a slight rotation. Sizing tracks the
   DrawPile so the two piles read as a matched pair on either side of the arena.
*/

.fan {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--size-draw-pile-width);
  height: calc(var(--size-draw-pile-width) * 7 / 5);
}

.topCard {
  position: relative;
  z-index: var(--z-raised);
  width: var(--size-discard-card-width);
  transform-origin: bottom center;
}

.peekCard {
  position: absolute;
  z-index: var(--z-base);
  width: var(--size-discard-card-width);
  transform: rotate(-5deg) translate(calc(var(--space-1) * -1.5), 0);
  transform-origin: bottom center;
  opacity: 0.7;
}

.empty {
  font-family: var(--font-mono);
  font-size: var(--text-display);
  color: color-mix(in srgb, var(--color-accent-drama) 35%, transparent);
}
```

**Key transformations**:
- Fan + card dimensions all routed through the `--size-draw-pile-width` + derived `--size-discard-card-width` token. The DrawPile and DiscardFan visually match (same stack size) without two separate tokens.
- `.peekCard` rotation offset `translate(-6px, 0)` → `translate(calc(var(--space-1) * -1.5), 0)` — the offset scales with spacing tokens, so it feels proportional at any viewport.
- `.empty` placeholder font-size `42px` → `--text-display` which interpolates larger at big viewports.
- `.empty` color `rgba(180, 160, 120, 0.3)` → `color-mix(in srgb, var(--color-accent-drama) 35%, transparent)` — the same warm-ochre vocabulary as the Lobby dev toolbar, tying the "placeholder text" visual role together.
- Both `@media (min-width: 1280px|1600px)` blocks DELETED.

**Cross-phase concerns**:
- **New Phase 1 token required**: `--size-discard-card-width` — the inner-card width inside the fan container, slightly narrower than `--size-draw-pile-width` (the outer container). Proposed value: `calc(var(--size-draw-pile-width) * 0.92)` or `clamp(76px, <vw>, 152px)`. See §7.

**Acceptance for this file**:
- [ ] Zero hardcoded hex or px outside structural offsets derived from tokens.
- [ ] Zero `@media (min-width: <px>)` blocks.
- [ ] Fan container tracks DrawPile width token.

#### §2.3.6 `Arena.module.css` — REWRITE (24 LOC → ~28 LOC)

**Current problems**:
- Line 11: `min-height: 140px` hardcoded.
- Line 12: `min-width: 200px` hardcoded.
- Line 13: `border-radius: 12px` hardcoded.
- Line 14: `z-index: 6` raw unscaled.
- Lines 18-22: `@media (min-width: 1280px)` with `min-height: 200px; min-width: 300px` overrides.

**Rewritten file content**:

```css
/* Arena.module.css
   Board — overlay zone where cards "land" during play animations. Absolute-
   positioned over the center of the table, not in flow. Min dimensions define
   the smallest landing zone; Framer Motion layout animations in PlayCard.tsx
   fill this region during the play/discard transition.
*/

.arena {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: var(--size-arena-min-width);
  min-height: var(--size-arena-min-height);
  border-radius: var(--radius-lg);
  z-index: var(--z-sticky);
  pointer-events: none;
}
```

**Key transformations**:
- `min-width: 200px` / `min-height: 140px` / 1280px override → `var(--size-arena-min-width)` / `var(--size-arena-min-height)`. Both tokens are already defined in Phase 1 §2.5 with correct ranges (200→400 width, 140→280 height).
- `z-index: 6` → `var(--z-sticky)`. The old arbitrary `6` was between the playerRing's `3` and the announcement feed's `30` — the new `--z-sticky` slots correctly in that layer stack.
- Single `@media (min-width: 1280px)` block DELETED.

**Acceptance for this file**:
- [ ] Zero hardcoded px values.
- [ ] Zero `@media (min-width: <px>)` blocks.
- [ ] Min-width / min-height consume tokens already defined in Phase 1 §2.5.

#### §2.3.7 `AnnouncementFeed.module.css` — REWRITE (42 LOC → ~45 LOC)

**Current problems**:
- Line 4: `position: fixed; top: 0; left: 0; right: 0` — fine (board uses fixed for top chrome).
- Line 8: `z-index: 30` raw unscaled.
- Line 12: `padding: 12px 16px` hardcoded.
- Lines 15-20: linear-gradient with raw `rgba(8, 12, 8, 0.6)` / `rgba(8, 12, 8, 0.2)` — unanchored.
- Line 26: `font-size: 16px` hardcoded.
- Line 28: stale `color: var(--text-primary, #e8e8f0)`.
- Lines 33-36: `@media (min-width: 1280px)` — padding + font-size overrides.
- Lines 38-41: `@media (min-width: 1600px)` — more font-size overrides.

**Rewritten file content**:

```css
/* AnnouncementFeed.module.css
   Board — top-anchored feed for gameplay announcements ("Dash played Burned",
   "Vera played Intercept"). Fades from dark-at-top so announcement text reads
   cleanly against any game-table background behind it.
*/

.feed {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: var(--z-sticky);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-3) var(--space-4);
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, var(--color-charcoal-1) 60%, transparent) 0%,
    color-mix(in srgb, var(--color-charcoal-1) 20%, transparent) 60%,
    transparent 100%
  );
  pointer-events: none;
}

.announcement {
  font-family: var(--font-display);
  font-size: var(--text-title);
  font-weight: 600;
  color: var(--color-fg-primary);
  text-align: center;
  pointer-events: auto;
  letter-spacing: 0.04em;
  text-shadow: 0 2px 12px color-mix(in srgb, var(--color-charcoal-1) 60%, transparent);
}
```

**Key transformations**:
- `font-size: 16px` baseline + `36px` / `40px` media-query overrides → single `--text-title` token (24→42 across viewport). Slightly different range than old hand-tuned (16/36/40) but smoother.
- Gradient raw `rgba(8, 12, 8, X)` → `color-mix(in srgb, var(--color-charcoal-1) X*100%, transparent)`. The gradient stops map 1:1 to the old opacity structure.
- Added `text-shadow` for readability over variable backgrounds — the old code relied on the gradient alone. New: a token-driven shadow adds a subtle dark halo so the announcement survives even if the player below is wearing a cream-colored ring.
- Both media queries DELETED.

**Acceptance for this file**:
- [ ] Zero hardcoded hex.
- [ ] Zero `@media (min-width: <px>)` blocks.
- [ ] Font-size consumes `--text-title` token.

#### §2.3.8 `StatusBar.module.css` (board) — REWRITE (34 LOC → ~45 LOC)

**Note**: this is `src/client/board/StatusBar.module.css`, distinct from the phone-side `src/client/player/StatusBar.module.css` already rewritten in Phase 2 §2.3.6. The board StatusBar is a bottom-edge comms strip; the phone StatusBar is a top-of-workbench turn banner. Same component name, completely different visual roles.

**Current problems**:
- Line 4: `position: fixed` + `bottom: 0` — fine.
- Line 12: `padding: 14px 24px` hardcoded.
- Lines 13-18: linear-gradient with raw `rgba(8, 12, 8, 0.8)` / `rgba(8, 12, 8, 0.3)` — unanchored.
- Line 19: `z-index: 20` raw unscaled.
- Line 25: `font-size: 16px` hardcoded.
- Line 26: `color: rgba(200, 190, 160, 0.7)` raw warm-cream — unanchored.
- Line 27: `letter-spacing: 0.02em` — fine, typographic.
- Lines 30-33: `@media (min-width: 1280px)` — padding + font-size overrides.

**Rewritten file content**:

```css
/* StatusBar.module.css (board)
   Board — bottom-anchored comms strip. Shows session state text like
   "Room: FOXTROT · 5 players · Press ESC to cancel". Pure communication,
   not interactive. Gradient fades from dark-at-bottom so text reads over
   any table background.

   Note: distinct from src/client/player/StatusBar.module.css which is the
   phone-side turn banner. Same filename, different file, different role.
*/

.bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-6);
  background: linear-gradient(
    to top,
    color-mix(in srgb, var(--color-charcoal-1) 80%, transparent) 0%,
    color-mix(in srgb, var(--color-charcoal-1) 30%, transparent) 60%,
    transparent 100%
  );
  z-index: var(--z-raised);
}

.text {
  font-family: var(--font-display);
  font-size: var(--text-title);
  font-weight: 600;
  color: color-mix(in srgb, var(--color-cream-11) 75%, transparent);
  letter-spacing: 0.02em;
}
```

**Key transformations**:
- Raw `rgba(8, 12, 8, X)` gradient → `color-mix` with `--color-charcoal-1`, same structure as AnnouncementFeed (the two gradients are mirrors of each other vertically, so they should share a palette source).
- `color: rgba(200, 190, 160, 0.7)` → `color-mix(in srgb, var(--color-cream-11) 75%, transparent)`. The old value was a warm-cream with 70% alpha; new maps to cream-11 (`#d0c3a5`) which is the "high-contrast text" warm-cream primitive, dimmed to 75% for the "subdued communication" role.
- `font-size: 16px` baseline + `26px` override → single `--text-title` token (24→42 across viewport).
- `z-index: 20` → `var(--z-raised)`. The board StatusBar sits just above the game table but below the announcement feed — `raised` is the correct slot.
- Single `@media (min-width: 1280px)` block DELETED.

**Acceptance for this file**:
- [ ] Zero hardcoded hex.
- [ ] Zero `@media (min-width: <px>)` blocks.
- [ ] Font-size consumes `--text-title`.
- [ ] Visual continuity: StatusBar gradient mirrors AnnouncementFeed gradient through the same `--color-charcoal-1` semantic.

#### §2.3.9 `NopeCountdownBar.module.css` — REWRITE (25 LOC → ~30 LOC)

**Current problems**:
- Line 3: `height: 6px` hardcoded.
- Line 4: `background: color-mix(in srgb, var(--accent-nope, #2dd8c8) 20%, transparent)` — stale `--accent-nope` alias + `#2dd8c8` fallback (UMB Jackbox teal).
- Line 5: `border-radius: 3px` hardcoded.
- Line 7: `margin: 8px 16px` hardcoded.
- Line 13: `background: var(--accent-nope)` — stale alias.
- Line 20: `font-size: 13px` hardcoded.
- Line 21: `color: var(--accent-nope)` — stale alias.
- Line 24: `padding: 2px 0` hardcoded.

**Rewritten file content**:

```css
/* NopeCountdownBar.module.css
   Board — countdown bar that appears during the Intercept window after
   a card is played. The fill contracts from right to left as the window
   closes (transform: scaleX driven by the component, not CSS).
*/

.container {
  position: relative;
  height: var(--space-2);
  background: color-mix(in srgb, var(--color-accent-intercept) 20%, transparent);
  border-radius: var(--radius-sm);
  overflow: hidden;
  margin: var(--space-2) var(--space-4);
}

.fill {
  position: absolute;
  inset: 0;
  background: var(--color-accent-intercept);
  transform-origin: left center;
  will-change: transform;
}

.text {
  text-align: center;
  font-family: var(--font-mono);
  font-size: var(--text-caption-board);
  color: var(--color-accent-intercept);
  font-weight: 600;
  padding: var(--space-0) 0;
}
```

**Key transformations**:
- `var(--accent-nope, #2dd8c8)` → `var(--color-accent-intercept)`. The old "nope" terminology predates the Burned retheme; the new semantic alias matches the card name (Intercept, not Nope).
- The old `#2dd8c8` fallback was a cool Jackbox teal; the new `--color-accent-intercept` resolves to emerald-9 (`#437d68`) from the Dreamland palette — a muted forest green, which is the intentional visual shift from "cool cyan nope" to "emerald spy-agency intercept."
- Height `6px` → `var(--space-2)` (8px). Slightly bigger to improve readability on large screens; still compact.
- Text font-family adds `--font-mono` for tabular numeric countdown display (the old code had no font-family specified, which inherited body — mono is a better fit).

**Cross-phase concerns**:
- **Semantic rename: `--accent-nope` → `--color-accent-intercept`**. This is already handled by Phase 1 §2.3 (the semantic token is named `--color-accent-intercept`). Any remaining references to the old name anywhere in `src/client/` get swept during Phase 3 execution via `rg 'accent-nope'`.

**Acceptance for this file**:
- [ ] Zero hardcoded hex.
- [ ] All color references consume `--color-accent-intercept` (no `--accent-nope` anywhere).
- [ ] Font family is mono for the countdown text.

#### §2.3.10 `PendingPromptBanner.module.css` — REWRITE (11 LOC → ~18 LOC)

**Current problems**:
- Line 3: `padding: 12px 16px` hardcoded.
- Line 4: `background: rgba(255, 255, 255, 0.05)` raw rgba.
- Line 5: `border-radius: 8px` hardcoded.
- Line 6: `margin: 8px 16px` hardcoded.
- Line 7: `color: var(--text-secondary)` — no fallback at least, but unscoped token reference from the old system.
- Line 8: `font-size: 15px` hardcoded.
- Line 9: `font-weight: 500` — fine.

**Rewritten file content**:

```css
/* PendingPromptBanner.module.css
   Board — thin banner shown when the game is waiting on a player's decision
   (e.g., target select, favor pick, combo name steal). Subdued styling so
   it doesn't compete with the announcement feed or status bar above/below.
*/

.banner {
  text-align: center;
  padding: var(--space-3) var(--space-4);
  background: color-mix(in srgb, var(--color-cream-12) 5%, transparent);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  margin: var(--space-2) var(--space-4);
  color: var(--color-fg-secondary);
  font-family: var(--font-body);
  font-size: var(--text-body);
  font-weight: 500;
  letter-spacing: 0.02em;
}
```

**Key transformations**:
- `rgba(255, 255, 255, 0.05)` → `color-mix(in srgb, var(--color-cream-12) 5%, transparent)`. The old value was pure-white with 5% alpha; the new maps to cream-12 (`#f0e4c4`, the brightest warm highlight) at 5% — same visual weight, Dreamland-aligned warmth.
- Added `border: 1px solid var(--color-border-subtle)` so the banner reads as a container at larger viewports where the old unbordered version looked like a loose text block.
- Added `font-family: var(--font-body)` explicit reference (was relying on cascade from the parent).

**Acceptance for this file**:
- [ ] Zero hardcoded hex or raw rgba.
- [ ] Banner has explicit border, not just background.
- [ ] Font size consumes `--text-body`.

#### §2.3.11 `fonts-mono.css` — REWRITE (10 LOC → ~14 LOC)

**Note on location**: this file lives at `src/client/shared/fonts-mono.css`, but it is imported only by `src/client/board/Board.tsx:12`, not by any phone-view file. JetBrains Mono is board-only (countdown numbers + card counts + room code). Phase 3 owns the rewrite because Phase 3 owns board consumption. A future cleanup could move the file to `src/client/board/fonts-mono.css` but that's out of scope — the import path stays identical.

**Current problems**:
- Line 6: `src: url('/fonts/JetBrainsMono-Variable.woff2') format('woff2')` — single-format, no fallback stack for older browsers that don't support woff2 (though this is now ubiquitous; Baseline since 2020).
- No comment referencing Phase 1 `--font-mono` token consumers.
- No `font-display: swap` consistency marker.

**Rewritten file content**:

```css
/* fonts-mono.css
   Board-only font-face declaration for JetBrains Mono.
   Consumed by --font-mono semantic token in semantic.css.

   Import site: src/client/board/Board.tsx:12 (board entry only).
   The phone view does not load this file — phone typography avoids mono
   since countdown numbers live on the board not the phone.
*/

@font-face {
  font-family: 'JetBrains Mono';
  src: url('/fonts/JetBrainsMono-Variable.woff2') format('woff2-variations'),
       url('/fonts/JetBrainsMono-Variable.woff2') format('woff2');
  font-weight: 100 900;
  font-display: swap;
  font-style: normal;
}
```

**Key transformations**:
- Trivial file; the rewrite is mostly comment alignment + format stack expansion.
- `font-weight: 400 700` → `font-weight: 100 900`. The JetBrains Mono Variable font file ships the full 100-900 range; the old narrow declaration meant calling `font-weight: 800` or `font-weight: 300` would fall back to faux-bold/faux-light renderings. The fix is a one-digit edit.
- Added `format('woff2-variations')` hint first with `format('woff2')` fallback, matching the modern variable-font declaration pattern. Browsers without variation support fall through to the non-variable path (same file, rendered as a static mid-weight).

**Acceptance for this file**:
- [ ] File imports unchanged (still loaded from `Board.tsx:12`).
- [ ] `font-weight` covers the full 100-900 range.
- [ ] Comment documents the board-only scope for future maintainers.

---

### §2.4 Cross-view: `MinimalCard.module.css` — REWRITE (312 LOC → ~240 LOC)

**File**: `src/client/shared/MinimalCard.module.css`. This is the biggest cross-view file in the repo. Consumed by both phone (`Hand`, `StagingArea`, `CardDetailSheet`) and board (`DrawPile.topCard`, `DiscardFan.topCard`/`peekCard`). Phase 2 §2.7 already updated `MinimalCard.tsx` to import `cardAccent` from the new `palette.ts` location; the CSS file was deliberately left for Phase 3.

**Why Phase 3 owns this**: the sizing math is container-query–driven, which is axis-neutral — but the thresholds (`@container (max-width: 115px)` for compact, `@container (min-width: 177px)` for enlarged) were tuned for phone + board combined, and the board view is the more demanding constraint (board cards scale larger, so the threshold for "show description text" matters more there). Owning it in Phase 3 ensures the thresholds are validated at the larger end of the scale.

**Current problems**:
- Line 14: `border-radius: var(--radius-card)` — already consumes a token, good.
- Line 16-22: background gradient with `var(--card-accent)` (inline-set custom property, good) + `var(--bg-card, #12121f)` stale fallback.
- Lines 23-24: borders with stale `var(--border-subtle, #2a2a4a)` and raw `rgba(255, 255, 255, 0.08)`.
- Line 25: `color: var(--text-primary, #e8e8f0)` stale fallback.
- Line 28-29: `min-height: 48px`, `min-width: 48px` — WCAG 2.5.5 minimum (44px is actual minimum; 48px is slightly safer). Preserved as landmines.
- Lines 32-36: resting glow box-shadow with raw `rgba(0, 0, 0, 0.35)` mixed with `color-mix(…var(--card-glow-color)…)`.
- Lines 63-68: intense glow layer (pseudo `::after`) with raw rgba mixed with `color-mix`.
- Line 70: `transition: opacity 0.2s ease-out` raw.
- Lines 88-89: `transition: none` comment + rule — landmine preservation per `feedback-stop-layout-thrashing.md` (preserved as-is).
- Line 106: `box-shadow: 0 0 0 5px rgba(0, 0, 0, 0.9)` raw.
- Lines 114, 125: `font-size: clamp(10px, 10cqi, 14px)` and `clamp(8px, 8cqi, 11px)` — already container-query based, but raw px values.
- Line 133: `@container (max-width: 115px)` — landmine comment re: border-box math should be preserved.
- Line 146: `@container (min-width: 177px)` — same landmine.
- Lines 176-177: `width: clamp(14px, 14cqi, 20px)` cardBadge — raw.
- Lines 198-201: `.cardBack` background-color `#18252a` raw hex.
- Lines 200-204: cardBack data-URI with `%23d44030` + `%23d48820` hex (transitional BURNED palette — same update as DrawPile).
- Lines 209-214: `.cardBack::before` inner border with `color-mix(in srgb, var(--amber, #d48820) 15%, transparent)` — stale `--amber` alias.
- Lines 219-234: `@media (prefers-contrast: more)` + `@media (forced-colors: active)` — preserved (accessibility).
- Lines 253-311: `[data-theme="light"]` light-mode fork with stale fallbacks throughout.

**Rewritten file content**:

```css
/* MinimalCard.module.css
   Cross-view card component. Consumed by:
     - Phone: Hand, StagingArea, CardDetailSheet (via container queries on
       the slot wrapper, which is what drives per-instance sizing)
     - Board: DrawPile.topCard, DiscardFan.topCard + peekCard

   Axis discipline: ENTIRELY container-query driven. The slot wrapper sets
   inline-size via its own sizing token (--size-card-* per view), and this
   file consumes cqi/cqb against that container. No viewport units. No
   axis assumptions.

   Landmines (preserved from pre-rebuild):
     - `aspect-ratio: 5/7` belongs on the SLOT wrapper, NOT the card itself.
       Card uses `width: 100%` + lets the wrapper control aspect.
     - `min-height/min-width: 48px` is the WCAG 2.5.5 touch-target floor.
       Do not remove. Cards smaller than this become unreachable on touch.
     - `@container` threshold values (115px / 177px) are content-box (NOT
       border-box) — they account for 23px of padding+border subtracted from
       the border-box width. Changing padding changes the threshold math.
     - `transition: none` on `[data-selected]` prevents Framer Motion
       `layoutId` flash when siblings exit. Do not re-enable.
*/

.card {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-1);
  aspect-ratio: 5 / 7;
  width: 100%;
  min-height: 0;
  padding: var(--space-6) var(--space-3) var(--space-3);
  border-radius: var(--radius-card);
  container-type: inline-size;
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--card-accent) 28%, var(--color-bg-surface)) 0%,
      color-mix(in srgb, var(--card-accent) 14%, var(--color-bg-surface)) 50%,
      color-mix(in srgb, var(--card-accent) 6%, var(--color-bg-surface)) 100%
    );
  border: 1.5px solid color-mix(in srgb, var(--card-accent) 40%, var(--color-border-subtle));
  border-top: 1.5px solid color-mix(in srgb, var(--card-accent) 20%, color-mix(in srgb, var(--color-cream-12) 8%, transparent));
  color: var(--color-fg-primary);
  cursor: pointer;
  user-select: none;
  min-height: 48px;  /* WCAG 2.5.5 — do not remove */
  min-width: 48px;   /* WCAG 2.5.5 — do not remove */

  /* Resting glow — token-driven colored halo makes cards pop from felt */
  box-shadow:
    0 0 6px color-mix(in srgb, var(--card-glow-color) 35%, transparent),
    0 0 14px color-mix(in srgb, var(--card-glow-color) 18%, transparent),
    var(--shadow-md);
}

/* ─── Card illustration (large centered art) ─── */

.card :global(.cardIllustration) {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1 1 0;
  width: 100%;
  pointer-events: none;
  min-height: 0;
  overflow: hidden;
  border-radius: var(--radius-sm);
}

.card :global(.cardIllustration) img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* ─── Intense glow layer — opacity-only transition (GPU composited) ─── */

.card::after {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: inherit;
  box-shadow:
    0 0 4px color-mix(in srgb, var(--card-glow-color) 80%, transparent),
    0 0 8px color-mix(in srgb, var(--card-glow-color) 60%, transparent),
    0 0 20px color-mix(in srgb, var(--card-glow-color) 40%, transparent),
    0 0 40px color-mix(in srgb, var(--card-glow-color) 20%, transparent);
  opacity: 0;
  transition: opacity var(--motion-duration-fast) var(--motion-ease-decelerate);
  pointer-events: none;
  z-index: -1;
}

/* Hover lift — desktop only. Touch devices fire sticky hover on tap. */
@media (hover: hover) {
  .card:hover {
    transform: translateY(-4px);
  }

  .card:hover::after {
    opacity: 1;
  }
}

.card[data-selected]::after {
  opacity: 1;
  transition: none;  /* Landmine: instant — prevents flash during layout re-projection */
}

.card[data-selected] {
  border-color: var(--card-accent);
  transition: none;  /* Landmine: instant — prevents border flash during layoutId animation */
}

.card[aria-disabled='true'] {
  opacity: 0.5;
  cursor: default;
  pointer-events: none;
}

/* Focus ring — two-ring for dark background visibility */
.card:focus-visible {
  outline: 2px solid var(--color-border-focus);
  outline-offset: 2px;
  box-shadow: 0 0 0 5px color-mix(in srgb, var(--color-charcoal-1) 90%, transparent);
}

/* ─── Card text ─── */

.cardName {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: clamp(var(--text-card-name-min), 10cqi, var(--text-card-name-max));
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--card-accent);
  line-height: 1.15;
  margin-top: 2px;
}

.cardDesc {
  font-family: var(--font-body);
  font-weight: 500;
  font-size: clamp(var(--text-card-desc-min), 8cqi, var(--text-card-desc-max));
  color: color-mix(in srgb, var(--card-accent) 25%, var(--color-fg-secondary));
  line-height: 1.3;
  margin-top: auto;
}

/* Compact cards (staging area + small hands): hide description, tighten padding.
   Landmine: threshold is content-box (border-box minus 23px padding+border).
   Changing padding changes this threshold. */
@container (max-width: 115px) {
  .cardDesc {
    display: none;
  }

  .card {
    padding-top: var(--space-5);
    padding-bottom: var(--space-2);
  }
}

/* Large cards (enlarge preview): text scales up to be readable.
   Landmine: threshold adjusted for border-box (200px - 23px = 177px content). */
@container (min-width: 177px) {
  .cardName {
    font-size: clamp(var(--text-card-name-large-min), 7cqi, var(--text-card-name-large-max));
    letter-spacing: 0.06em;
  }

  .cardDesc {
    font-size: clamp(var(--text-card-desc-large-min), 5cqi, var(--text-card-desc-large-max));
    line-height: 1.4;
  }

  .card {
    padding: var(--space-7) var(--space-4) var(--space-4);
    gap: var(--space-2);
  }

  .card :global(.cardBadge) {
    width: clamp(20px, 8cqi, 32px);
    height: clamp(20px, 8cqi, 32px);
    top: var(--space-2);
    left: var(--space-2);
  }
}

/* ─── Icon badge (top-left, visible on peeking edges) ─── */

.card :global(.cardBadge) {
  position: absolute;
  top: 5px;
  left: 5px;
  width: clamp(14px, 14cqi, 20px);
  height: clamp(14px, 14cqi, 20px);
  color: var(--card-accent);
  display: flex;
  align-items: center;
  justify-content: center;
}

.card :global(.cardBadge) svg {
  width: 100%;
  height: 100%;
}

/* ─── Card back — Pendleton Agency dossier pattern ───
   Data-URI hex tracks semantic tokens (manual sync required):
     %23a33340 ≡ var(--color-accent-burned) ≡ var(--color-cordovan-9)
     %23b0754c ≡ var(--color-accent-drama)  ≡ var(--color-ochre-9)
   Same pattern as DrawPile.module.css; if one changes, update both.
*/

.cardBack {
  position: relative;
  aspect-ratio: 5 / 7;
  min-height: 48px;
  min-width: 48px;
  border-radius: var(--radius-card);
  background-color: var(--color-teal-2);
  background-image:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 140'%3E%3Cpath d='M50 20 L80 70 L50 120 L20 70 Z' fill='none' stroke='%23a33340' stroke-width='1.5' opacity='0.3'/%3E%3Cpath d='M50 35 L70 70 L50 105 L30 70 Z' fill='none' stroke='%23b0754c' stroke-width='1' opacity='0.2'/%3E%3Ccircle cx='50' cy='70' r='8' fill='none' stroke='%23a33340' stroke-width='1' opacity='0.25'/%3E%3Ccircle cx='50' cy='70' r='3' fill='%23a33340' opacity='0.2'/%3E%3C/svg%3E");
  background-size: 100% 100%;
  background-repeat: no-repeat;
  border: 1px solid color-mix(in srgb, var(--color-accent-burned) 25%, var(--color-border-subtle));
  box-shadow: var(--shadow-md);
}

/* Inner border frame — double-line dossier feel */
.cardBack::before {
  content: '';
  position: absolute;
  inset: var(--space-1);
  border: 1px solid color-mix(in srgb, var(--color-accent-drama) 15%, transparent);
  border-radius: calc(var(--radius-card) - 3px);
  pointer-events: none;
}

/* ─── High contrast mode ─── */

@media (prefers-contrast: more) {
  .card::after {
    opacity: 0;
    display: none;
  }

  .card {
    box-shadow: none;
    border: 2px solid var(--card-accent);
    background: var(--color-bg-surface);
  }

  .card:focus-visible {
    outline-width: 3px;
  }
}

@media (forced-colors: active) {
  .card {
    border: 2px solid ButtonText;
    forced-color-adjust: none;
  }

  .card[data-selected] {
    border-color: Highlight;
  }

  .cardName {
    color: ButtonText;
  }
}

/* ─── Light mode — deferred to Phase 1.5 per Phase 1 §2.3 ─── */
/* Phase 1 ships dark-mode complete; [data-theme="light"] is stubbed.
   When Phase 1.5 lands, replicate the dark-mode rules with light-mode
   token values (swap bg-surface → cream variants, fg-primary → charcoal variants).
   Out of scope for Phase 3. */
```

**Key transformations**:
- Light-mode fork (lines 253-311 of old file, 58 LOC of stale-fallback light mode) **REMOVED**. Per Phase 1 §6 Out of Scope, light mode is deferred to Phase 1.5. Keeping dead light-mode CSS would force us to maintain two parallel fallback palettes. A comment at the bottom of the file documents the deferral.
- Card name / desc font-size `clamp()` min and max values extracted into Phase 1 tokens: `--text-card-name-min`, `--text-card-name-max`, `--text-card-name-large-min`, `--text-card-name-large-max`, `--text-card-desc-min`, `--text-card-desc-max`, `--text-card-desc-large-min`, `--text-card-desc-large-max`. The `cqi`-driven scale stays (`10cqi`, `8cqi`, etc.) because those are container-relative ratios, not pixel tokens — what changes is that the clamp floors and ceilings become Phase 1 responsibilities. Eight new tokens. See §7.
- Card-back data-URI hex updated from `%23d44030` / `%23d48820` to `%23a33340` / `%23b0754c` — same Dreamland-palette swap as DrawPile.
- `.cardBack` background-color `#18252a` → `var(--color-teal-2)`.
- Border coupling: `.card` resting gradient now mixes `var(--card-accent)` with `var(--color-bg-surface)` instead of `var(--bg-card, #12121f)`. The semantic anchor is a live token; the inline-set `--card-accent` custom property stays unchanged (TSX controls that via `palette.ts`).
- Focus-ring box-shadow `rgba(0, 0, 0, 0.9)` → `color-mix(in srgb, var(--color-charcoal-1) 90%, transparent)`.
- Inner-card-back frame `var(--amber, #d48820)` → `var(--color-accent-drama)` — the "amber" alias dies.
- Transition `opacity 0.2s ease-out` → `opacity var(--motion-duration-fast) var(--motion-ease-decelerate)`.
- Both `transition: none` landmine rules preserved verbatim with clarifying comments.
- The inner `::before` data-URI inset changed from `inset: 6px` to `inset: var(--space-1)` (4px) — slightly tighter frame at smaller cards. Acceptable visual shift; Phase 5 visual regression matrix verifies.

**Cross-phase concerns**:
- **Landmines preserved**: aspect-ratio-on-slot-not-card, WCAG 48px floor, content-box threshold math (115/177), `transition: none` on `[data-selected]`. All four preserved as code comments that future readers will find.
- **Light-mode fork removed**: deliberate per Phase 1 §6. If light mode ships later, the old rules are in git history for reference.
- **New Phase 1 tokens required** (8): the card-name / card-desc min/max clamp floors and ceilings. See §7.
- **Data-URI hex sync**: same constraint as `DrawPile.module.css` §2.3.4 and `GameTable.module.css` §2.3.1 — when Phase 1 primitives change cordovan-9 or ochre-9, all three files get manual updates.

**Acceptance for this file**:
- [ ] Zero hardcoded hex outside documented data-URI exceptions.
- [ ] Data-URI hex matches current cordovan-9 + ochre-9 primitive values.
- [ ] Zero stale `var(--foo, #hex)` fallbacks.
- [ ] All four landmines preserved as code comments.
- [ ] `@container (max-width: 115px)` and `@container (min-width: 177px)` thresholds retained.
- [ ] Light-mode fork removed; comment documents the deferral.
- [ ] `transition: none` on `[data-selected]` preserved.

### §2.5 Cross-view: `GameOver.module.css` — REWRITE (186 LOC → ~175 LOC)

**File**: `src/client/shared/GameOver.module.css`. Consumed by both entry points (phone and board) via `@client/shared/GameOver` import in `Board.tsx:8` and the phone entry (TurnBanner-replaced path). The component is the end-of-game ceremony: winner announcement + rankings + play-again button.

**Current problems**:
- Line 9: `min-height: 100svh` — axis violation. GameOver is cross-view, so `svh` is wrong for the board rendering.
- Lines 10-11: `padding: 32px 24px` hardcoded.
- Lines 15-18: background `radial-gradient(ellipse at 50% 35%, rgba(40, 30, 60, 0.18) 0%, transparent 55%)` + `var(--bg-app, #0c0a12)` — stale Era-1 purple-blue.
- Lines 25-28: `.winner` `font-size: 36px`, hardcoded glow with `var(--teal, #2dd8c8)` — stale Era-2 teal.
- Line 37: `.subtitle` `font-size: 16px`, stale `var(--text-secondary, #9999bb)`.
- Line 46: `.rankings` `max-width: 360px`.
- Lines 55-64: `.rank` with `padding: 12px 16px`, `border-radius: 10px`, raw `rgba(30, 30, 50, 0.8)` / `rgba(18, 18, 32, 0.9)` (Era-1 purple-blue), `rgba(255, 255, 255, 0.04)` border.
- Lines 66-75: `.rank[data-winner]` with `var(--teal, #2dd8c8)` stale teal throughout.
- Lines 78: `.rank[data-me]` border stale.
- Lines 82-88: `.rankNum` `font-size: 14px`, stale `var(--text-disabled, #555570)`.
- Line 95: `.rankName` `font-size: 16px`.
- Lines 103-118: `.playAgain` with `margin-top: 40px`, `padding: 14px 48px`, `font-size: 18px`, `border-radius: 10px`, `var(--teal, #2dd8c8)` background, `var(--bg-app, #0c0a12)` color, `transition: transform 0.15s ease` raw.
- Lines 120-131: `.playAgain::after` with raw box-shadow + `animation: playAgainPulse 2.5s ease-in-out infinite` raw timing.
- Lines 146-149: focus-visible with stale `var(--focus-ring, #33ffff)`.
- Lines 159-167: `@media (min-width: 1280px)` with 7 overrides.
- Lines 171-180: `[data-theme="light"]` light-mode fork — stale, removed (same deferral as MinimalCard).

**Rewritten file content**:

```css
/* GameOver.module.css
   Cross-view — end-of-game ceremony. Shown on both phone and board when
   `phase: 'game-over'` arrives.

   Peak-end rule: this is what players remember. The file should feel like
   the final frame of the Archer episode — winner announcement front-and-
   center with the same cocktail-lounge warmth as the rest of the app.

   Axis discipline: cross-view, so NO svh/vh/vw for sizing. Uses container
   queries against the entry-point root, which is wrapped in
   `container-type: size` by the phone and board entry points (see §2.2a
   Pattern B5 and the required entry-point edits).
*/

.container {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100cqb;  /* container block-axis — phone=height, board=height */
  padding: var(--space-8) var(--space-6);
  text-align: center;
  overflow: hidden;

  background:
    /* Centered warm spotlight — matches the war-room vocabulary */
    radial-gradient(ellipse 60% 50% at 50% 35%,
      color-mix(in srgb, var(--color-accent-drama) 18%, transparent) 0%,
      transparent 55%),
    var(--color-bg-app);
  color: var(--color-fg-primary);
}

/* ─── Winner announcement ─── */

.winner {
  font-family: var(--font-display);
  font-size: var(--text-display);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: var(--space-2);
  /* Victory glow — ochre-drama, not Jackbox teal */
  text-shadow:
    0 0 30px color-mix(in srgb, var(--color-accent-drama) 40%, transparent),
    0 0 60px color-mix(in srgb, var(--color-accent-drama) 15%, transparent);
}

.subtitle {
  font-size: var(--text-body);
  color: var(--color-fg-secondary);
  margin-bottom: var(--space-10);
}

/* ─── Rankings ─── */

.rankings {
  width: 100%;
  max-width: var(--size-rankings-max-width);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.rank {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  background: linear-gradient(
    165deg,
    color-mix(in srgb, var(--color-bg-elevated) 80%, transparent) 0%,
    color-mix(in srgb, var(--color-bg-surface) 90%, transparent) 100%
  );
  border: 1px solid var(--color-border-subtle);
}

.rank[data-winner] {
  background: linear-gradient(
    165deg,
    color-mix(in srgb, var(--color-accent-drama) 15%, var(--color-bg-elevated)) 0%,
    color-mix(in srgb, var(--color-bg-surface) 95%, transparent) 100%
  );
  border: 1px solid color-mix(in srgb, var(--color-accent-drama) 35%, transparent);
  box-shadow: 0 0 20px color-mix(in srgb, var(--color-accent-drama) 14%, transparent);
}

.rank[data-me] {
  border-color: color-mix(in srgb, var(--color-fg-secondary) 40%, transparent);
}

.rankNum {
  font-family: var(--font-mono);
  font-size: var(--text-body);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--color-fg-muted);
  min-width: var(--space-8);
}

.rank[data-winner] .rankNum {
  color: var(--color-accent-drama);
}

.rankName {
  font-size: var(--text-body);
  font-weight: 500;
  flex: 1;
}

/* ─── Play again button ─── */

.playAgain {
  position: relative;
  margin-top: var(--space-10);
  padding: var(--space-4) var(--space-12);
  font-family: var(--font-display);
  font-size: var(--text-title);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  border: none;
  border-radius: var(--radius-md);
  background: var(--color-accent-drama);
  color: var(--color-bg-app);
  cursor: pointer;
  z-index: var(--z-raised);
  transition: transform var(--motion-duration-fast) var(--motion-ease-standard);
}

.playAgain::after {
  content: '';
  position: absolute;
  inset: -3px;
  border-radius: calc(var(--radius-md) + 3px);
  box-shadow:
    0 0 12px color-mix(in srgb, var(--color-accent-drama) 50%, transparent),
    0 0 32px color-mix(in srgb, var(--color-accent-drama) 25%, transparent);
  animation: gameOverPulse var(--motion-duration-pulse-slow) var(--motion-ease-standard) infinite;
  z-index: -1;
  pointer-events: none;
}

@keyframes gameOverPulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.8; }
}

.playAgain:hover {
  transform: scale(1.04);
}

.playAgain:active {
  transform: scale(0.97);
}

.playAgain:focus-visible {
  outline: 2px solid var(--color-border-focus);
  outline-offset: 3px;
}

.waiting {
  margin-top: var(--space-10);
  font-size: var(--text-body);
  color: var(--color-fg-muted);
}

/* ─── Reduced motion ─── */

@media (prefers-reduced-motion: reduce) {
  .playAgain::after { animation: none; opacity: 0.5; }
}
```

**Key transformations**:
- `min-height: 100svh` → `min-height: 100cqb`. Requires the entry-point container to set `container-type: size`; see §2.2a Pattern B5 for the wrapper edit. This is the axis-neutralization fix for the cross-view axis violation.
- Single `@media (min-width: 1280px)` block DELETED. All 7 stepped overrides replaced by continuous clamp tokens.
- **Winner text hue shifted**: the old code used `var(--teal, #2dd8c8)` — a cool cyan Jackbox teal — for the "victory" accent. New code uses `var(--color-accent-drama)` (ochre-9) — a warm amber. **This is a deliberate design change**, justified by the Archer acceptance test: a warm ochre victory glow reads as a cocktail-lounge cheers, not a cool cyber win-screen. If visual review wants the cool option back, the alternative is `var(--color-accent-intercept)` (emerald-9 forest green) which is still Dreamland-palette-correct but cooler than ochre. Locked to ochre pending review.
- Rank gradient rewritten to consume `--color-bg-elevated` + `--color-bg-surface` just like `Lobby.playerCard` and `PlayerRing.panel`. Three places use the same vocabulary — one source of truth.
- Play-again button background `var(--teal, #2dd8c8)` → `var(--color-accent-drama)` (ochre amber). Play-again is a high-stakes action, so warm-accent feels right.
- Pulse animation duration `2.5s` → `var(--motion-duration-pulse-slow)` (same 2000-2500ms token as the Lobby start button pulse). Both buttons pulse at the same cadence, reinforcing the "press me" affordance across screens.
- Keyframe `playAgainPulse` → `gameOverPulse` for cross-file keyframe namespace cleanliness.
- Light-mode fork removed, comment documents the deferral.

**Cross-phase concerns**:
- **Winner hue decision**: ochre vs emerald — flagged for visual review during Phase 5. Current draft locks to ochre.
- **Entry-point wrapper edit required**: both `Board.tsx` and the phone entry must wrap their root in `container-type: size`. One-line edit each.
- **New Phase 1 token required**: `--size-rankings-max-width` (approximately `clamp(320px, <vw>, 560px)`). See §7.

**Acceptance for this file**:
- [ ] Zero hardcoded hex.
- [ ] Zero `svh` / `vh` usage (only `cqb`).
- [ ] Zero `@media (min-width: <px>)` blocks.
- [ ] Winner accent uses `--color-accent-drama`, not stale `--teal`.
- [ ] Play-again button uses `--color-accent-drama`, not stale `--teal`.
- [ ] Entry-point wrapper has `container-type: size` (verify at execution time).

### §2.6 Cross-view: `DramaOverlay.module.css` — REWRITE (113 LOC → ~135 LOC)

**File**: `src/client/shared/DramaOverlay.module.css`. GSAP-driven full-screen title cards (BURNED / EXTRACTED / ELIMINATED / INTERCEPTED / VICTORY). Consumed by both entry points. GSAP timing consolidation is Phase 4's responsibility — Phase 3 only rewrites the CSS file.

**Current problems**:
- Line 5: `position: fixed; inset: 0; z-index: 100` raw z.
- Line 24: `font-size: clamp(48px, 12vw, 160px)` — uses vw, which is the correct axis for board but wrong for phone. The old code assumed board-only; in practice it's cross-view.
- Line 25-28: `text-shadow: 0 4px 20px rgba(0, 0, 0, 0.5), 0 0 60px currentColor` raw.
- Lines 32-39: `.burned` gradient with raw `rgba(212, 64, 48, 0.92)` / `rgba(140, 30, 20, 0.88)` / `rgba(60, 12, 8, 0.95)` — pre-Dreamland BURNED red.
- Line 42: `.burned .text { color: #ffeedd }` raw.
- Lines 47-58: `.extracted` with raw `rgba(48, 128, 192, 0.88)` / `rgba(24, 72, 120, 0.85)` / `rgba(10, 30, 50, 0.92)` blue — not in Dreamland palette.
- Lines 62-73: `.eliminated` with desaturated `rgba(60, 55, 50, 0.92)` etc.
- Line 73: `font-size: clamp(32px, 8vw, 100px)` — second font-size scale for the eliminated variant.
- Lines 78-89: `.intercepted` with `rgba(42, 170, 152, 0.88)` teal.
- Lines 93-105: `.victory` with `rgba(212, 136, 32, 0.92)` / `rgba(160, 100, 20, 0.88)` / `rgba(60, 40, 10, 0.95)` gold.
- Line 104: `font-size: clamp(40px, 10vw, 140px)` — third font-size scale.

**Rewritten file content**:

```css
/* DramaOverlay.module.css
   Cross-view — full-screen GSAP-driven title cards for dramatic beats.
   Five variants: BURNED / EXTRACTED / ELIMINATED / INTERCEPTED / VICTORY.

   Axis discipline: cross-view, so NO vw/vh for font sizing. Uses container
   query inline-size (cqi) via the entry-point container wrapper. Three
   variants use different type-scale tokens: the default hero, a subdued
   variant for "eliminated" (quieter, grimmer), and the oversized victory
   variant (loudest reveal).

   Motion timing: Phase 4 consolidates the GSAP timelines in DramaOverlay.tsx.
   This file owns the CSS-side static appearance only.
*/

.overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  opacity: 0;
  container-type: inline-size;  /* own container for the text cqi sizing */
}

.text {
  font-family: var(--font-display);
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  text-align: center;
  line-height: 1;
  padding: 0 var(--space-6);
  /* Hero size — cqi-based, axis-neutral, works on phone AND board */
  font-size: clamp(var(--text-drama-hero-min), 12cqi, var(--text-drama-hero-max));
  text-shadow:
    0 4px 20px color-mix(in srgb, var(--color-charcoal-1) 50%, transparent),
    0 0 60px currentColor;
}

/* ─── BURNED — cordovan alarm, the big one ─── */

.burned {
  background: radial-gradient(
    ellipse 80% 60% at 50% 50%,
    color-mix(in srgb, var(--color-cordovan-9) 92%, transparent) 0%,
    color-mix(in srgb, var(--color-cordovan-6) 88%, transparent) 50%,
    color-mix(in srgb, var(--color-cordovan-1) 95%, transparent) 100%
  );
}

.burned .text {
  color: var(--color-cream-12);
}

/* ─── EXTRACTED — teal relief ─── */

.extracted {
  background: radial-gradient(
    ellipse 80% 60% at 50% 50%,
    color-mix(in srgb, var(--color-teal-8) 88%, transparent) 0%,
    color-mix(in srgb, var(--color-teal-5) 85%, transparent) 50%,
    color-mix(in srgb, var(--color-teal-1) 92%, transparent) 100%
  );
}

.extracted .text {
  color: var(--color-teal-12);
}

/* ─── ELIMINATED — desaturated charcoal, grim ─── */

.eliminated {
  background: radial-gradient(
    ellipse 80% 60% at 50% 50%,
    color-mix(in srgb, var(--color-charcoal-6) 92%, transparent) 0%,
    color-mix(in srgb, var(--color-charcoal-3) 90%, transparent) 60%,
    color-mix(in srgb, var(--color-charcoal-1) 95%, transparent) 100%
  );
}

.eliminated .text {
  color: var(--color-charcoal-11);
  /* Subdued size — quieter reveal for the darker moment */
  font-size: clamp(var(--text-drama-subdued-min), 8cqi, var(--text-drama-subdued-max));
}

/* ─── INTERCEPTED — emerald flash ─── */

.intercepted {
  background: radial-gradient(
    ellipse 80% 60% at 50% 50%,
    color-mix(in srgb, var(--color-emerald-8) 88%, transparent) 0%,
    color-mix(in srgb, var(--color-emerald-5) 85%, transparent) 50%,
    color-mix(in srgb, var(--color-emerald-1) 92%, transparent) 100%
  );
}

.intercepted .text {
  color: var(--color-emerald-12);
}

/* ─── VICTORY — ochre gold, the loudest reveal ─── */

.victory {
  background: radial-gradient(
    ellipse 80% 60% at 50% 50%,
    color-mix(in srgb, var(--color-ochre-9) 92%, transparent) 0%,
    color-mix(in srgb, var(--color-ochre-6) 88%, transparent) 50%,
    color-mix(in srgb, var(--color-ochre-1) 95%, transparent) 100%
  );
}

.victory .text {
  color: var(--color-cream-12);
  /* Oversized — victory is the biggest reveal in the game */
  font-size: clamp(var(--text-drama-victory-min), 10cqi, var(--text-drama-victory-max));
}

/* ─── Reduced motion — skip the slam, just fade ─── */

@media (prefers-reduced-motion: reduce) {
  .text {
    text-shadow: none;
  }
}
```

**Key transformations**:
- All 5 variants' backgrounds rewritten to consume primitive color scales (cordovan-9/6/1, teal-8/5/1, charcoal-6/3/1, emerald-8/5/1, ochre-9/6/1) through `color-mix`. The visual hues are semantically aligned with the five drama moments:
  - **Burned → cordovan** (the signature alarm hue, card is named Burned)
  - **Extracted → teal** (cool relief, survived the burn)
  - **Eliminated → charcoal** (dead, drained of color, warmth removed)
  - **Intercepted → emerald** (green = go, intercept succeeded)
  - **Victory → ochre** (warm gold = celebration)
- Three distinct font-size ranges via three cqi-scale tokens: `--text-drama-hero-*` (default), `--text-drama-subdued-*` (eliminated), `--text-drama-victory-*` (victory). All consume `cqi` not `vw`, making them cross-view safe.
- `z-index: 100` → `var(--z-overlay)`.
- `.overlay` declares `container-type: inline-size` so the cqi-based text inherits the correct axis regardless of whether it's rendered on phone or board.
- Text-shadow `rgba(0, 0, 0, 0.5)` → `color-mix(in srgb, var(--color-charcoal-1) 50%, transparent)` to track primitive palette.

**Cross-phase concerns**:
- **New Phase 1 tokens required** (6): `--text-drama-hero-min`, `--text-drama-hero-max`, `--text-drama-subdued-min`, `--text-drama-subdued-max`, `--text-drama-victory-min`, `--text-drama-victory-max`. See §7.
- **Phase 4 GSAP consolidation**: `DramaOverlay.tsx` lines 119-128 contain hardcoded GSAP timeline durations (0.25s, 0.4s, `back.out(1.4)`, `power2.in`). Phase 4 moves these to `motion.ts`. Phase 3 does NOT touch the TSX file — just sets up the CSS side so Phase 4's timing swap is the only outstanding issue.
- **`intercepted` hue shift**: old code was cool cyan; new code is muted emerald forest green. This is the "emerald spy-agency intercept" palette decision made in §2.3.9 NopeCountdownBar and re-asserted here. Same visual across the two intercept consumers.

**Acceptance for this file**:
- [ ] Zero hardcoded hex or raw rgba.
- [ ] All five variant backgrounds consume Dreamland primitive scales.
- [ ] Font sizes use `cqi` (not `vw`) — axis-neutral for cross-view consumption.
- [ ] `.overlay` declares `container-type: inline-size`.
- [ ] `z-index` consumes `--z-overlay`.

---

### §2.7 Tier 1 retheme gap — `GameTable.tsx` one-line edit

**Background**: `PRODUCT-SPECIFICATION.md` §6.4 Gap #3 lists `GameTable.tsx:24` as a Tier 1 retheme gap: the `feltBranding` element is commented as *"Branded felt decoration — EK identity baked into the table"*, where "EK" is the pre-retheme shorthand for Exploding Kittens. The gap is not the element itself (the element is a visual asset and stays) — it's the comment's ownership implication. The Tier 1 fix is to re-brand the comment to The Pendleton Agency while keeping the element structure intact.

**Edit**:

```tsx
// Phase 3 edit — src/client/board/GameTable.tsx:24
-      {/* Branded felt decoration — EK identity baked into the table */}
+      {/* The Pendleton Agency — war-room felt decoration (reticle + corner diamonds) */}
       <div className={styles.feltBranding} aria-hidden="true" />
```

**Why this is enough for the Tier 1 gap**: the visual element itself is already Archer-correct. A targeting reticle and four corner diamonds are Jack Kirby / Steve Ditko geometric vocabulary, which is on the verified Archer influences list (`roadmap.md` §3). The Dreamland palette swap in the CSS-side data-URIs (§2.3.1) handles the visual palette alignment. The remaining Tier 1 obligation is the ownership comment — this one-line edit satisfies spec §6.4 Gap #3 in full.

**Acceptance**:
- [ ] Comment updated to reference The Pendleton Agency, not EK.
- [ ] No `.tsx` file references "EK" or "Exploding Kittens" in user-visible text or comments introducing visual elements (verify via `rg 'EK|Exploding Kittens' src/client/board/GameTable.tsx`).
- [ ] Visual element itself unchanged (no structural TSX rewrite; this is a comment-only edit).

---

## §3 — Step-by-Step Execution Order

Phase 3 tasks, in dependency order. Each step has a commit point. Execute in a fresh terminal per `feedback-stop-after-every-phase.md` session discipline.

1. **Verify Phase 1 + Phase 2 complete and merged.** `git log` shows Phase 1 and Phase 2 commits. `pnpm test` is 167/167 green + new Phase 1 CVD/contrast/motion-sync tests green. `pnpm typecheck` + `pnpm lint` clean.
2. **Verify Phase 1 token additions land first.** Before rewriting any Phase 3 file, the 27 new Phase 1 tokens listed in §7 below must exist in `src/client/shared/tokens/`. If `/deepen-plan` has propagated them into `phase-1-foundation.md` and `/ce:work` has executed Phase 1 with the additions, this step is a verification. If not, **STOP** and add the tokens to Phase 1 first — don't work around.
3. **Entry-point container wrapper edits.** One-line edit each:
   - `src/client/board/main.tsx` — wrap `<Board />` in a `<div style={{ containerType: 'size', minHeight: '100vh' }}>` (or add `container-type: size` to an existing root wrapper class).
   - `src/client/player/main.tsx` (or `player.tsx` / whatever the phone entry is) — same treatment.
   - Run `pnpm typecheck` + `pnpm test` to verify no regressions. Commit.
4. **Rewrite `GameTable.module.css`** per §2.3.1. Run `pnpm dev` + `pnpm dev:server` and load `http://localhost:5173/board.html?room=TEST` to visually confirm the table renders. The `feltBranding` should appear with ochre-palette corner diamonds + central reticle. Commit.
5. **Edit `GameTable.tsx:24` comment** per §2.7. One-line change. Typecheck + lint + commit.
6. **Rewrite `Lobby.module.css`** per §2.3.2. Visually verify at `http://localhost:5173/board.html` landing screen. Confirm the Lobby gradient visually matches the GameTable gradient during the lobby → game transition (start a dev-mode game, watch the background, it should feel continuous). Commit.
7. **Rewrite `PlayerRing.module.css`** per §2.3.3. Visually verify player panels orbit the center with the new panel width token. Commit.
8. **Rewrite `DrawPile.module.css`** per §2.3.4. Visually verify the card-back pattern renders with the cordovan + ochre Dreamland hex, not the old red + transitional-ochre. Breathing animation still plays (check `prefers-reduced-motion: no-preference`). Commit.
9. **Rewrite `DiscardFan.module.css`** per §2.3.5. Visually verify the discard stack matches DrawPile width + renders the peek card at the correct offset. Commit.
10. **Rewrite `Arena.module.css`** per §2.3.6. Play a card in dev mode, confirm the Framer Motion landing animation still works (Arena is just the landing zone container; the animation logic lives in PlayCard.tsx). Commit.
11. **Rewrite `AnnouncementFeed.module.css`** per §2.3.7. Play a card, confirm the "Dash played Burned" announcement appears at the top of the board with the new gradient + title-font sizing. Commit.
12. **Rewrite `StatusBar.module.css` (board)** per §2.3.8. Confirm the bottom comms strip renders with the new cream-11 tint + token-driven gradient. Commit.
13. **Rewrite `NopeCountdownBar.module.css`** per §2.3.9. Trigger an Intercept window in dev mode (play a card, have another player press Intercept), confirm the countdown bar renders in emerald-9 forest-green, not the old cyan. **Cross-file grep check:** `rg 'accent-nope|--nope'` should return zero results outside `color-accent-intercept` rename sites. Commit.
14. **Rewrite `PendingPromptBanner.module.css`** per §2.3.10. Trigger a pending prompt (target select, favor pick), confirm the banner renders with the new border + cream-12 tint. Commit.
15. **Rewrite `fonts-mono.css`** per §2.3.11. Trivial edit. Verify `--font-mono` still resolves correctly on the board (countdown numbers + room code in Lobby). Commit.
16. **Rewrite `MinimalCard.module.css`** per §2.4. This is the biggest single-file change in Phase 3. After writing, visually verify cards on:
    - Phone hand (compact size, description hidden at `@container (max-width: 115px)`)
    - Phone enlarge preview (`@container (min-width: 177px)` scales text up)
    - Phone staging area (in-between size)
    - Board DrawPile (card-back pattern — should match DrawPile data-URI)
    - Board DiscardFan top card + peek card
    Card-back data-URI hex must match DrawPile data-URI hex exactly. Commit.
17. **Rewrite `GameOver.module.css`** per §2.5. Trigger a game-over in dev mode (requires a full game run or a dev-mode shortcut). Verify:
    - Winner text glow is ochre, not teal
    - Play-again button background is ochre, not teal
    - `100cqb` resolves to the full viewport height on both phone and board
    - Rankings list renders at the new token-driven max-width
    Commit.
18. **Rewrite `DramaOverlay.module.css`** per §2.6. Trigger each of the 5 drama variants in dev mode:
    - BURNED (draw a Burned card)
    - EXTRACTED (play Extraction to defuse a Burned)
    - ELIMINATED (let a player take a Burned without Extraction)
    - INTERCEPTED (Nope a card mid-window)
    - VICTORY (win the game)
    Verify each variant's background hue matches the intended scale (cordovan / teal / charcoal / emerald / ochre). Verify text sizes are correct at phone + board viewports. Commit.
19. **Full regression sweep.**
    - `pnpm typecheck` — clean.
    - `pnpm lint` — clean (import boundaries + ESLint rules).
    - `pnpm test` — 167/167 + Phase 1 additions still green.
    - `pnpm build` — bundle size check. Phone entry ≤100KB gzipped; board entry ≤ its current ceiling (~120KB gzipped + shared).
    - `rg '#[0-9a-fA-F]{3,8}' src/client/board/ src/client/shared/*.module.css` — every hit should be either a documented data-URI exception, a `currentColor` reference (no hit), or a false positive. Zero raw hex outside exceptions.
    - `rg 'svh|dvh|vh' src/client/board/ src/client/shared/MinimalCard.module.css src/client/shared/GameOver.module.css src/client/shared/DramaOverlay.module.css` — zero hits except the documented exception on `GameTable.module.css` line-1 outermost wrapper and `Lobby.module.css` outermost wrapper.
    - `rg '@media \(min-width' src/client/board/ src/client/shared/*.module.css` — zero hits except `@media (prefers-*)` / `@media (hover:*)` / `@media (forced-colors:*)`.
    - `rg 'accent-nope|--nope|--teal|--red|--amber|--bg-card|--text-primary.*[0-9]|--text-secondary.*[0-9]|--text-disabled.*[0-9]|--focus-ring' src/client/` — zero hits across the codebase.
20. **Playwright board viewport smoke test** (not the full Phase 5 regression matrix, just a smoke check). Launch dev server, run a minimal Playwright script that loads `http://localhost:5173/board.html` at 1280×800, 1920×1080, 2560×1440, 3840×2160 and screenshots the Lobby + GameTable. Visually scan the 8 screenshots for palette consistency and confirm no hard-pixel-breakpoint artifacts. Commit a `playwright-smoke/` directory if useful.
21. **Commit + tag.** `feat(css-foundation): Phase 3 — board + cross-view migration` with references to `docs/plans/css-foundation-rebuild/phase-3-board-view-migration.md`.

---

## §4 — Acceptance Criteria

Phase 3 is done when **all** of the following are true:

### §4.1 Files exist and are wired

- [ ] All 10 `src/client/board/*.module.css` files have been rewritten per §2.3.1–§2.3.10.
- [ ] `src/client/shared/fonts-mono.css` has been rewritten per §2.3.11.
- [ ] `src/client/shared/MinimalCard.module.css` has been rewritten per §2.4.
- [ ] `src/client/shared/GameOver.module.css` has been rewritten per §2.5.
- [ ] `src/client/shared/DramaOverlay.module.css` has been rewritten per §2.6.
- [ ] `src/client/board/GameTable.tsx:24` comment retheme landed per §2.7.
- [ ] Entry-point wrappers (`src/client/board/main.tsx` + phone entry) set `container-type: size` on a root container.

### §4.2 Purity checks

- [ ] Zero hardcoded hex in `src/client/board/*.module.css` outside documented data-URI exceptions.
- [ ] Zero hardcoded hex in `src/client/shared/MinimalCard.module.css` outside one documented data-URI exception.
- [ ] Zero hardcoded hex in `src/client/shared/GameOver.module.css`.
- [ ] Zero hardcoded hex in `src/client/shared/DramaOverlay.module.css`.
- [ ] Zero hardcoded spacing in any of the 14 Phase 3 files.
- [ ] Zero hardcoded font-sizes in any of the 14 Phase 3 files.
- [ ] Zero hardcoded radii in any of the 14 Phase 3 files.
- [ ] Zero hardcoded shadows in any of the 14 Phase 3 files.
- [ ] Zero hardcoded motion timings in any of the 14 Phase 3 files.
- [ ] Zero hardcoded z-indices in any of the 14 Phase 3 files.
- [ ] Zero `svh`/`dvh`/`vh` usage for dimensional sizing in board files (exception: `100vh` allowed exactly once on `GameTable.table` outermost wrapper and once on `Lobby.container`).
- [ ] Zero `@media (min-width: <px>)` viewport breakpoint blocks in any of the 14 Phase 3 files.
- [ ] Zero stale `var(--foo, #hex)` fallbacks in any Phase 3 file.

### §4.3 Tests pass

- [ ] `pnpm test` — all existing tests still pass (167/167 + Phase 1 additions).
- [ ] `pnpm typecheck` — clean.
- [ ] `pnpm lint` — clean (import boundaries maintained).
- [ ] `pnpm build` — succeeds.
- [ ] Phone entry ≤100KB gzipped (Phase 3 doesn't touch phone CSS further, so this stays at Phase 2's ceiling).
- [ ] Board entry ≤ Phase 2 baseline +5KB headroom for new board-side tokens.

### §4.4 Cross-phase token audit

- [ ] Every token consumed in Phase 3 CSS exists in the Phase 1 token files (either originally or added during Phase 1 deepening per §7 below).
- [ ] Every data-URI hex in `GameTable.module.css`, `DrawPile.module.css`, `MinimalCard.module.css` matches the current primitive value of its documented semantic alias.
- [ ] `rg 'accent-nope|--nope|--teal, #|--red, #|--amber, #|--bg-card, #|--focus-ring, #' src/client/` returns zero results.

### §4.5 Visual regression smoke test

- [ ] `pnpm dev` + `pnpm dev:server` start without errors.
- [ ] Loading `http://localhost:5173/board.html?room=TEST` at 1920×1080 shows the Lobby with the unified teal-charcoal palette (not green).
- [ ] Starting a dev-mode game transitions Lobby → GameTable with visual continuity (same gradient vocabulary).
- [ ] All 5 DramaOverlay variants trigger and render with their respective Dreamland-palette hues.
- [ ] GameOver renders with ochre victory glow, not teal.
- [ ] No console errors or CSS parse warnings.

### §4.6 Archer acceptance test (board components at the Archer bar)

Apply §2.2 Archer test (*"Could this look like a frame from an Archer episode?"*) to each of the board surfaces:

- [ ] **Lobby** at 1920×1080 — yes/no.
- [ ] **GameTable base view** at 1920×1080 — yes/no.
- [ ] **GameTable with 5 players + cards mid-game** at 1920×1080 — yes/no.
- [ ] **NopeCountdownBar during intercept window** — yes/no.
- [ ] **AnnouncementFeed with 3 stacked announcements** — yes/no.
- [ ] **PendingPromptBanner during target-select prompt** — yes/no.
- [ ] **StatusBar in lobby state + mid-game state** — yes/no.
- [ ] **DramaOverlay BURNED + EXTRACTED + ELIMINATED + INTERCEPTED + VICTORY** — each yes/no.
- [ ] **GameOver with 5 ranked players + winner** — yes/no.

If any screen fails, iterate on the tokens (in Phase 1) or the per-file rewrite (in Phase 3) until it passes. Don't advance to Phase 4 until every screen passes the Archer test.

---

## §5 — Landmines

Phase 3 preserves several landmines from the pre-rebuild codebase and creates one new cross-phase coupling.

1. **PlayerRing.tsx ↔ `--size-player-panel-width`** — `PlayerRing.tsx:70-71` currently reads `panelW = isTV ? 320 : 200` as hardcoded TSX. Phase 3 rewrites the CSS side to consume `--size-player-panel-width`, but the TSX read is still hardcoded. Phase 4 (or earlier, during Phase 3 execution if Briggsy wants it bundled) resolves this by having TSX read the computed value from a hidden measurement div. **DO NOT delete the hardcoded TSX numbers during Phase 3** — the layout math needs a working value until the TSX side is updated.

2. **Data-URI hex sync** — three files (`GameTable.module.css`, `DrawPile.module.css`, `MinimalCard.module.css`) contain inline data-URI SVGs with hex colors that must manually track `--color-accent-burned` (cordovan-9) and `--color-accent-drama` (ochre-9) primitive values. If Phase 1 primitive values change during deepening, all three files need manual updates. Every data-URI is preceded by a comment listing the token aliases it tracks. Phase 5 may add a regex CI check for drift detection.

3. **MinimalCard aspect-ratio landmine** — `aspect-ratio: 5/7` goes on the SLOT wrapper (which lives in `Hand.module.css` and `StagingArea.module.css`), not on `MinimalCard.card` itself. Preserved as a code comment at the top of `MinimalCard.module.css`. If a future refactor moves aspect-ratio onto the card element, the card will overflow its container.

4. **MinimalCard `@container` thresholds (115px / 177px)** — both thresholds are content-box values (border-box minus 23px of padding + border). Changing the card's padding changes the threshold math. Preserved as a code comment at the top of `MinimalCard.module.css` and repeated inline at each `@container` rule.

5. **`transition: none` on `[data-selected]`** — prevents Framer Motion `layoutId` flash when sibling cards exit the DOM. Preserved verbatim with a comment explaining the reason. Do NOT re-enable the transition to "improve smoothness" — the layout-projection flash is worse than the instant border change.

6. **WCAG 2.5.5 48px minimum on MinimalCard** — `min-height: 48px` + `min-width: 48px` are the touch-target floor. Preserved. Cards smaller than this are unreachable on touch devices.

7. **iOS 26 `position: fixed` regression** — affects `AnnouncementFeed.feed`, `StatusBar.bar`, `DramaOverlay.overlay`, `GameTable.eventFlash`. The board view runs on desktop/TV hardware in practice, so this is less critical than the phone view. Phase 5 real-device testing will flag if any of these board fixed-position elements regress on iOS 26 iPad (for the iPad-in-portrait → phone-view case, but also for anyone using a board view on an iPad in landscape). Keep an eye on the bug.

8. **Lobby green gradient was the canary.** The old Lobby green base color (`#1e3a24` / `#193220` / `#142a1a`) was the most visible symptom of Pattern B3 (palette fragmentation) but the root cause is that every file picked its own palette in the absence of shared tokens. Phase 3 fixes the symptom AND the root cause — but if a future component is added to the board view and starts pulling green (or any other palette) from thin air, the Archer test will catch it and force a return to token consumption.

---

## §6 — Out of Scope

Phase 3 **does not** include:

- Any `.tsx` file rewrite beyond the one-line `GameTable.tsx:24` comment retheme. All component logic, all Framer Motion variants, all GSAP timelines, all hook signatures stay exactly as they are.
- Motion consolidation — Phase 4 owns the 22 Framer Motion transition sites, 2 GSAP call sites (`PlayerRing.tsx`, `DramaOverlay.tsx`), 15 CSS `@keyframes` durations, 13 CSS `transition` declarations. Phase 3 CSS uses motion tokens where tokens already exist; Phase 4 completes the sweep and eliminates the few remaining inline literals.
- Light-mode theme CSS. Per Phase 1 §6, light mode is Phase 1.5 post-rebuild polish. Phase 3 deletes the old light-mode forks in `MinimalCard.module.css` and `GameOver.module.css` because they carry stale fallbacks; a comment in each file documents the deferral.
- Board-side bundle splitting — the board entry currently loads React + Motion core + VisualElement + board components in one bundle. Bundle splitting is a Phase 5 concern if the board gets too fat.
- Any change to `Arena.tsx`, `PlayCard.tsx`, or other animation-flow components — Phase 3 is CSS-only (+ 1 TSX comment edit).
- `src/client/player/` CSS — owned by Phase 2.
- `src/client/shared/theme.ts` / `theme.css` — deleted in Phase 1.
- `src/client/shared/BottomSheet.module.css` — rewritten in Phase 2 §2.6.
- SVG data-URI externalization to `.svg` files in `public/` — a nice-to-have but out of scope. The inline data-URIs stay; the hex-sync landmine (§5.2) is the cost.
- Real iOS 26 device testing — Phase 5.
- Playwright full viewport regression matrix — Phase 5.
- `First-time player test` — Phase 5.

---

## §7 — Cross-Phase Dependencies

**New Phase 1 tokens that Phase 3 requires** (to be added to `phase-1-foundation.md` during `/deepen-plan`):

### §7.1 Board fluid spacing (new scale)

Phase 1 §2.4 defines `--space-fluid-tight|base|loose` as svh-based for phone. Phase 3 needs the vw-based board counterparts:

```css
/* semantic.board.css additions */
:root[data-view="board"] {
  --space-fluid-tight-board: clamp(8px, calc(8px + (100vw - 1280px) * (8 / 2560)), 16px);
  --space-fluid-base-board:  clamp(16px, calc(16px + (100vw - 1280px) * (24 / 2560)), 40px);
  --space-fluid-loose-board: clamp(32px, calc(32px + (100vw - 1280px) * (48 / 2560)), 80px);
}
```

Consumers: `GameTable.module.css` (padding, center gap), `Lobby.module.css` (padding), `AnnouncementFeed` (padding), `StatusBar` (padding).

### §7.2 Board text scale additions

Phase 1 §2.5 defines `--text-body`, `--text-title`, `--text-display`, `--text-hero` for board. Phase 3 needs additional scale tokens:

```css
/* semantic.board.css additions */
:root[data-view="board"] {
  --text-micro-board:   clamp(0.75rem, calc(0.75rem + (100vw - 1280px) * (4 / 2560)), 1rem);
  --text-caption-board: clamp(0.8125rem, calc(0.8125rem + (100vw - 1280px) * (4 / 2560)), 1.0625rem);
  --text-callout-board: clamp(1.125rem, calc(1.125rem + (100vw - 1280px) * (8 / 2560)), 1.625rem);
}
```

Consumers: `pileLabel` in GameTable, `rosterLabel` / `rosterCount` in Lobby, `turnBadge` in PlayerRing, `eliminatedName` in PlayerRing, `disconnectedBadge` in Lobby, countdown text in NopeCountdownBar, dev-link text in Lobby.

### §7.3 Board sizing additions

```css
/* semantic.board.css additions */
:root[data-view="board"] {
  /* Player ring panel — width that scales smoothly across 1280 → 3840.
     Replaces the old stepped 200/320/420 TSX+CSS coupling. */
  --size-player-panel-width: clamp(180px, calc(180px + (100vw - 1280px) * (240 / 2560)), 420px);

  /* Lobby roster — the vertical list of players during lobby state */
  --size-lobby-roster-max-width: clamp(440px, calc(440px + (100vw - 1280px) * (160 / 2560)), 600px);

  /* Lobby title accent bar — the thin horizontal accent line below the title */
  --size-title-accent-width: clamp(80px, calc(80px + (100vw - 1280px) * (80 / 2560)), 160px);

  /* GameOver rankings container width */
  --size-rankings-max-width: clamp(360px, calc(360px + (100vw - 1280px) * (160 / 2560)), 520px);

  /* GameTable felt branding SVG sizes (reticle center + 4 corner diamonds) */
  --size-felt-reticle: clamp(320px, calc(320px + (100vw - 1280px) * (280 / 2560)), 600px);
  --size-felt-diamond: clamp(36px, calc(36px + (100vw - 1280px) * (32 / 2560)), 68px);

  /* Discard card width — slightly narrower than the pile container */
  --size-discard-card-width: calc(var(--size-draw-pile-width) * 0.92);
}
```

**Amendment to existing `--size-draw-pile-width`** (Phase 1 §2.5 currently specifies 80→160): bump to **120→240** so the old visual weight (140 at small / 320 at medium / 480 at large) is preserved in the continuous form. The exact values can be tuned during Phase 1 deepening; the direction is "larger than currently drafted."

### §7.4 MinimalCard text clamp floors/ceilings (8 tokens)

```css
/* semantic.css additions — axis-independent */
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
```

These are `px` tokens because they're clamp floors/ceilings for `cqi`-based font-sizes inside `MinimalCard.module.css` — they represent minimum-readable and maximum-aesthetic pixel boundaries, not fluid scales. Consumers: `MinimalCard.cardName` and `.cardDesc` in both compact and enlarged states.

### §7.5 DramaOverlay text scale tokens (6 tokens)

```css
/* semantic.css additions — axis-independent */
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
```

Consumers: `.text`, `.eliminated .text`, `.victory .text` in `DramaOverlay.module.css`.

### §7.6 Motion ambient tokens

Phase 1 §2.3 defines `--motion-duration-instant|fast|base|slow|dramatic` (100–800ms). Phase 3 needs ambient loop tokens for long-running animations:

```css
/* primitives.css additions */
:root {
  --motion-duration-pulse:       1400ms;  /* Lobby waiting dots, subtle attention */
  --motion-duration-pulse-slow:  2500ms;  /* Lobby start button + GameOver play-again pulse */
  --motion-duration-ambient:     4000ms;  /* DrawPile breathe, slow hero loop */
}
```

Matching additions to `motion.ts`:

```typescript
// motion.ts additions
export const MOTION_DURATIONS = {
  instant:   0.1,
  fast:      0.15,
  base:      0.25,
  slow:      0.4,
  dramatic:  0.8,
  pulse:     1.4,      // NEW
  pulseSlow: 2.5,      // NEW
  ambient:   4.0,      // NEW
} as const satisfies Record<string, number>;
```

Motion-sync test in Phase 1 §2.7 will automatically validate the new tokens once added.

### §7.7 Color semantic aliases cleanup

- **`--color-bg-overlay-light` (60% alpha)** already flagged by Phase 2 §2.6 (`BottomSheet`) — same token needed. Not new.
- **`--color-bg-overlay-heavy` (85% alpha, aliases current `--color-bg-overlay`)** — already flagged by Phase 2. Not new.
- **Verification during deepening**: confirm `--color-accent-intercept` resolves to `emerald-9` and matches the intended "spy-agency green" visual direction for NopeCountdownBar + DramaOverlay.intercepted. If visual review at Phase 1 visual-review-gate suggests the emerald is too muted for a flashing countdown bar, bump to emerald-10 or emerald-8 depending on the contrast CVD test results.

### §7.8 Total new tokens added by Phase 3

Tallying the deltas to `phase-1-foundation.md`:

- **semantic.board.css**: 3 fluid-spacing + 3 text-scale + 7 sizing + 1 derived = **14 new** (plus 1 amendment to `--size-draw-pile-width` range).
- **semantic.css**: 8 card-text-clamp + 6 drama-text-clamp = **14 new**.
- **primitives.css**: 3 motion-ambient = **3 new**.
- **motion.ts**: 3 motion-ambient export keys = **3 new**.

**Total: ~27 new Phase 1 tokens added during `/deepen-plan`.** Phase 1 deepening resolves each through its own addition + CVD/contrast/motion-sync test updates, and the Phase 3 rewrites consume them.

If deepening discovers that any of these 27 proposals is wrong (e.g., the clamp bracket is off, or the token name collides with a future Phase 4/5 addition), the contradiction is resolved in the Phase 1 direction per the roadmap §8 deepening-priority rule.

---

## §8 — Bundle Budget Impact

**Board entry delta (approximate)**:

- **Removals** — stale fallback hex strings get deleted from every rewritten file. Per-file gzip savings are small (~50-200 bytes each), but 14 files × ~100 bytes = ~1.4KB gzipped removed.
- **Additions** — new token references (`var(--color-foo)`) are slightly longer than the old fallback syntax (`var(--foo, #abc)`), but `var()` references compress extremely well under gzip (~20-40 bytes per unique reference after dictionary compression). Net-new text: ~300-500 bytes gzipped.
- **Phase 1 token files** — already accounted for in Phase 1's bundle budget (~2.5KB gzipped for all three token CSS files, imported once per entry).
- **Media-query block removals** — 14 `@media (min-width: <px>)` blocks deleted across 9 files, each 4-15 LOC. Net savings: ~400-600 bytes gzipped.

**Net Phase 3 delta on board bundle**: approximately **-1.5KB gzipped to neutral**. Possibly slightly smaller. Phone bundle is unchanged by Phase 3 (Phase 2 already rewrote the phone CSS).

**Bundle budgets after Phase 3**:
- Phone entry: ≤100KB gzipped (unchanged from Phase 2).
- Board entry: baseline ~150KB gzipped (pre-rebuild measurement from `CLAUDE.md` "Bundle Sizes" table, adjusted for Phase 1's ~2KB additions); Phase 3 net neutral to ~1.5KB smaller. **No budget concerns.**

If Phase 5 verification reveals the bundle has crept toward any ceiling, the first investigation target is the `color-mix()` call sites — each unique `color-mix` inline generates slightly more bytes than a pre-computed `rgba()` equivalent. If needed, a PostCSS plugin can pre-compute `color-mix` at build time for the common cases; that's a Phase 5 optimization, not a Phase 3 concern.

---

## §9 — Sources

**Internal documents**:

- `docs/plans/css-foundation-rebuild/roadmap.md` — parent contract, §7 Phase 3 scope, §8 cross-phase concerns.
- `docs/plans/css-foundation-rebuild/phase-1-foundation.md` — token contract (Phase 3 consumes its deliverables).
- `docs/plans/css-foundation-rebuild/phase-2-phone-view-migration.md` — Phase 2 §2.7 (`MinimalCard.tsx` TSX edit inherited by Phase 3), Phase 2 §2.6 (BottomSheet cross-view pattern Phase 3 mirrors for other cross-view files).
- `docs/specifications/PRODUCT-SPECIFICATION.md` — §6.4 Tier 1 retheme gap for `feltBranding`, §2 Quality Bar for the Archer acceptance test.
- `docs/post-mortems/VISUAL-LAYER-AUTOPSY.md` — diagnosis of palette fragmentation (Pattern B3) and organized-chaos problem that Phase 3 resolves for the board scope.
- `CLAUDE.md` — BURNED project conventions (CSS strategy, axis discipline §3.4, ADR-04/05 motion and visual consistency).

**External citations (re-used from roadmap §10)**:

- `[^1]` Neal Holman, Art of the Title, May 2016 — Archer visual direction source for the geometric / Kirby / Ditko vocabulary used in `feltBranding`, `DrawPile.topCard`, and `MinimalCard.cardBack` data-URIs.
- Radix Colors 12-step scale convention — structure of the Dreamland-extracted primitives `semantic.board.css` consumes.
- Utopia fluid-typography — vw-clamp formula pattern for board fluid spacing and text tokens.
- `svh`/`cqb`/`cqi` browser support — Baseline Widely Available (all needed units are supported in Safari 16+, Chrome 105+, Firefox 110+).
- WCAG 2.5.5 touch target — justification for the 48px min-height/min-width landmine in `MinimalCard.module.css`.

**Dreamland S8 reference frames** (fair-use per `dreamland-reference/README.md`): used for palette extraction of the cordovan-9, ochre-9, teal-2/3, cream-11/12, charcoal-1 primitive values that Phase 3 CSS references through their semantic aliases.

---

*Phase 3 is ready for `/deepen-plan` once Briggsy has reviewed it. Deepening will run against this file to find contradictions with Phase 1 (tokens that don't yet exist), Phase 2 (shared cross-view patterns), and Phase 4 (motion consolidation coupling). The §7 cross-phase flags section is the primary deepening input — it lists exactly what Phase 1 needs to grow to make Phase 3 executable.*

*Per `feedback-stop-after-every-phase.md`, Phase 4 is a separate session. Do NOT write Phase 4 in this turn.*

