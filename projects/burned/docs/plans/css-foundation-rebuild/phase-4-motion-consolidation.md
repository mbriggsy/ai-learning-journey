---
title: "Phase 4 — Motion Consolidation"
type: feat
phase: 4
parent: docs/plans/css-foundation-rebuild/roadmap.md
depends_on: docs/plans/css-foundation-rebuild/phase-1-foundation.md
also_depends_on:
  - docs/plans/css-foundation-rebuild/phase-2-phone-view-migration.md
  - docs/plans/css-foundation-rebuild/phase-3-board-view-migration.md
date: 2026-04-11
status: completed
completed_on: 2026-04-22
---

# Phase 4 — Motion Consolidation

**Parent**: [`roadmap.md`](./roadmap.md) §7 Phase 4
**Depends on**: Phase 1 (`motion.ts` + `primitives.css` motion custom properties + `motion-token-sync.test.ts`), Phase 2 (phone TSX survivors — Hand, StagingArea, EliminatedView, SmartActionBox, ErrorToast, BottomSheet; Phase-2-created FloatingActionButton.tsx), Phase 3 (board TSX survivors — PlayerRing, Lobby, AnnouncementFeed; cross-view GameOver, DramaOverlay, MinimalCard)
**Goal**: eliminate every inline motion literal in TypeScript and every raw motion literal in CSS. Every Framer Motion `transition` prop, every GSAP `duration`/`ease` arg, every CSS `@keyframes` `animation:` shorthand, every CSS `transition:` declaration consumes the Phase 1 motion token layer. Delete the legacy `src/client/shared/animation-config.ts` file. Resolve the PlayerRing TSX ↔ CSS coupling that Phase 3 knowingly preserved. At the end of Phase 4 the entire client has ONE source of truth for motion timing, and `motion-token-sync.test.ts` catches any future drift.

**Quality bar inherited**: `PRODUCT-SPECIFICATION.md` §2 Quality Bar (*"Could this look like a frame from an Archer episode?"*). Motion consolidation doesn't introduce new easings or durations — it's a cleanup pass that makes the **existing** animation grammar tunable from one file. Animation cadence is set in Phases 2/3; Phase 4 makes it durable.

**Scope bar**: TSX + CSS edits only. No new files except the `animation-config.ts` deletion. No component logic changes. Eight sites receive intentional duration tightenings where existing inline literals are replaced by the closest semantic preset (e.g., `{ duration: 0.4 }` → `MOTION.enter` at 0.25s). These are deliberate tempo changes, not accidental — see §5 Landmine 9 for the full list, rationale, and Phase 5 escape hatch. All other sites are numerically identical before and after.

---

## Enhancement Summary (Deepening Pass — 2026-04-12)

**Deepening method.** 8 parallel agents: architecture-strategist (pattern compliance + measurement-div architecture), kieran-typescript-reviewer (type safety of MOTION presets + spread composability), julik-frontend-races-reviewer (ResizeObserver timing + GSAP/FM transform collisions), performance-oracle (bundle size + reflow costs + CSS var() in infinite animations + tree-shaking), pattern-recognition-specialist (template consistency across 24 FM sites + grep robustness + naming analysis), code-simplicity-reviewer (measurement-div alternatives + plan verbosity), best-practices-researcher (ResizeObserver spec guarantees + React 19 batching + CSS Typed OM limitations). Context7 documentation verified for Framer Motion 12.x (spring configs, transition type unions, MotionConfig reducedMotion API) and GSAP v3 (timeline fromTo, ease string registry). Project insights cross-referenced: #002 (FM VisualElement is initial — bundle baseline), #005 (stale timers need generation counters — DramaOverlay cleanup gap), #006 (CSS fallback ordering).

### Critical corrections landed (BLOCKERS — the plan's original code would fail or produce wrong output)

1. **`--motion-ease-standard` renamed to `--motion-ease-base` throughout.** Phase 1 deepening (commit `ba6f18ce`, 2026-04-11) renamed `--motion-ease-standard` → `--motion-ease-base` and `MOTION_EASINGS.standard` → `MOTION_EASINGS.base`. Phase 4 was drafted before the rename and referenced the dead name in 13+ locations: §2.2 Template CSS-S, §2.5.1-§2.5.3, §4.2, §4.3, §1 line 18, §9 sources. Every CSS `animation:` replacement would have written `var(--motion-ease-standard)` — a property that does not exist in `primitives.css`. CSS silently falls back to the `ease` default (`cubic-bezier(0.25, 0.1, 0.25, 1)`), visually different from the intended `--motion-ease-base` (`cubic-bezier(0.4, 0, 0.2, 1)`). **Found independently by 3 of 7 agents.** Global find-and-replace applied.

2. **SmartActionBox and FloatingActionButton "before" code corrected.** Phase 2 deepening changed breathing animation durations from `--motion-duration-dramatic`/`--motion-duration-base` to `--motion-duration-essential-pulse` (these are gameplay-essential signals that must survive `prefers-reduced-motion: reduce`). Phase 4's "Current" code blocks in §2.5.1-§2.5.3 and the audit table (lines 92-94) showed the pre-Phase-2-deepening state. Updated to match what the executor will actually see in the post-Phase-2 files.

3. **§2.5.4 removed — JoinScreen dots already tokenized by Phase 2.** Phase 2 deepening already replaces `1.5s` with `var(--motion-duration-dots)` in the JoinScreen.module.css full-file rewrite. Phase 1 deepening added `--motion-duration-dots: 1500ms` to the scale (commit `ba6f18ce`). Phase 4's §2.5.4 edit would have failed to find the `1.5s` string. §7.1 debate (Option A vs Option B for `--motion-duration-dots`) is moot — Phase 1 committed Option A. Both sections removed. CSS surgical edits reduced from 4 to 3.

### Warning-level fixes landed

4. **§2.7.1 measurement-div initialization fixed.** Original plan initialized `panelSize` to `{ w: 0, h: 0 }`. On first render before the ResizeObserver fires, `panelW = 0` and `panelH = 0`, placing all ring panels ~140px from their correct positions. `initial={false}` prevents entrance animation but does NOT prevent Framer Motion from springing to the corrected position when panelSize updates. Fix: added synchronous `getBoundingClientRect()` inside `useLayoutEffect` before observer attachment, so panels have correct dimensions before first paint. The `useLayoutEffect` runs after DOM insertion but before paint — the measurement div is in the document and the browser has computed its layout. This eliminates the first-frame jitter entirely.

5. **Scope bar amended.** Original claimed "identical before and after, byte for byte." Eight sites intentionally change durations (0.4→0.25 for three GameOver/EliminatedView fades, 0.3→0.25 for Hand/StagingArea backdrops, 0.2→0.15 for ErrorToast/SmartActionBox quick fades, 0.5→0.4 for PlayerRing GSAP tween). Scope bar now acknowledges these as deliberate tempo changes with a §5 Landmine 9 cross-reference.

6. **§3 step count corrected.** Was "17 steps," actually 20. Fixed.

7. **§1 MOTION_DURATIONS scale description updated.** Original listed `instant/fast/base/slow/dramatic`. Phase 1 deepening dropped `instant` (YAGNI) and added `dots`, `ambient`, `essentialPulse`, `essentialSpin`, `essentialFlash`. Updated to match the actual Phase 1 deepened scale.

8. **§2.5 verification grep 2 fixed.** Pattern included `|linear` but prose said linear is allowed. Removed `|linear` from pattern — `linear` is an acceptable CSS keyword for spinners and stepped animations.

9. **New Landmine 10 added — DramaOverlay GSAP timeline lacks cleanup on unmount.** Pre-existing bug: the GSAP timeline created inside `processQueue()` is never killed when the component unmounts. If DramaOverlay unmounts mid-animation, the timeline's `onComplete` fires on a detached component. Phase 4's scope says "no component logic changes" — correct to defer. Flagged for Phase 5. (Cross-referenced with project insight #005: stale timers need generation counters.)

### Research insights added

- **Measurement-div pattern validated** (§2.7): `getComputedStyle().getPropertyValue('--size-player-panel-width')` returns the raw `clamp()` string, NOT resolved pixels. CSS Typed OM (`computedStyleMap`) has the same limitation. The measurement div is the only reliable mechanism for resolving `clamp()`-based tokens to pixel values. Alternative approach (read from existing panel via `slotRefs`) was considered and rejected: GSAP applies `scale: 1.12` to the active panel during turn transitions, contaminating `getBoundingClientRect()` dimensions. The measurement div is never animated.
- **React 19 auto-batching confirmed** (§2.7.1): React 18+ automatically batches ALL `setState` calls regardless of origin — including ResizeObserver callbacks. Two `setState` calls produce one re-render. Combining into a single state object is cleaner but not required for correctness.
- **CSS `var()` in infinite animation has zero runtime cost** (§2.5): CSS custom properties resolve at computed-value time. For `animation:` shorthand, the browser resolves `var(--motion-ease-base)` once when computing the style, then uses the resolved `cubic-bezier()` for the animation's lifetime. No per-frame cost.
- **GSAP ease string boundary validated** (§2.4): `back.out(1.4)` uses overshoot that exceeds the 0-1 range — a single `cubic-bezier()` cannot represent it (cubic-bezier curves are monotonic). `power2.out`/`power2.in` have approximate but not exact CSS equivalents. Conversion would introduce visible changes with zero architectural benefit.
- **Framer Motion default transition when only `delay` specified** (§2.3.6): version-dependent spring (unspec'd `stiffness: 100, damping: 10` at time of writing). Phase 4's `MOTION.enter` replacement locks behavior deterministically — safer outcome, not a regression.

### Cross-phase resolutions

- **§7.1 (`--motion-duration-dots`)**: RESOLVED. Phase 1 deepening committed Option A (`--motion-duration-dots: 1500ms` in both `primitives.css` and `motion.ts`). No Phase 4 action needed. Section retained as historical record but marked resolved.
- **§7.2 (`--size-player-panel-height`)**: RESOLVED. Phase 1 deepening added the token to `semantic.board.css` (commit `ba6f18ce`, Enhancement Summary item 7). Section retained as historical record but marked resolved.

---

## §1 — Inputs

Phase 4 inherits:

- **Phase 1 `motion.ts`** (`src/client/shared/tokens/motion.ts`) — defines `MOTION_DURATIONS` (fast/base/slow/dramatic/dots/ambient/essentialPulse/essentialSpin/essentialFlash), `MOTION_EASINGS` (base/emphasized/decelerate/accelerate/anticipate), `MOTION_SPRINGS` (snappy/deliberate/punchy/gentle), and `MOTION` (combined presets: quickFade/enter/exit/dramatic + spring re-exports). Phase 1 §2.6 committed all of these values. **Note (deepening correction):** Phase 1 deepening dropped `instant` (YAGNI — no consumer) and renamed `standard` → `base`; added `dots`, `ambient`, and three `essential*` durations for reduced-motion survivors.
- **Phase 1 `primitives.css` motion block** — mirrors `motion.ts` as CSS custom properties: `--motion-duration-{fast,base,slow,dramatic,dots,ambient,essential-pulse,essential-spin,essential-flash}` + `--motion-ease-{base,emphasized,decelerate,accelerate,anticipate}`. Spring configs are TS-only; CSS has no spring primitive.
- **Phase 1 `motion-token-sync.test.ts`** — CI gate that walks `MOTION_DURATIONS` and `MOTION_EASINGS` and confirms every exported value has a matching CSS custom property declaration in `primitives.css`. Drift between the two surfaces fails the test.
- **Phase 1 reduced-motion fork** — `@media (prefers-reduced-motion: reduce)` in `primitives.css` zeros out all `--motion-duration-*` values. The TS side uses Framer Motion's `useReducedMotion` hook on a per-component basis where needed (spinners, breathing glows — see §5 landmine 3).
- **Phase 2 phone-view CSS rewrites** — every `.module.css` under `src/client/player/` already consumes `var(--motion-duration-*)` / `var(--motion-ease-*)` per its Phase 2 §2.3 spec. Phase 4's CSS scope is a surgical verification sweep over those files plus the handful of stragglers where Phase 2 left a raw `ease-in-out` keyword or a raw duration behind (see §1.1 correction 3).
- **Phase 2 FloatingActionButton creation** — Phase 2 deletes `NopeButton.*` and `InterceptButton.*` and creates `src/client/player/FloatingActionButton.tsx` + `.module.css`. Phase 2 §2.3.7 specifies the CSS in full but leaves the TSX body at "execution fills in." **Phase 4 specifies the one FM transition site inside that new file** — §2.3.23 below.
- **Phase 2 TSX retheme edit** — Phase 2 §2.3.9a edits `EliminatedView.tsx:45` (title) and lines 8-17 (flavor pool) as a retheme, not a motion edit. Phase 4 edits the transition props in the **same file** at lines 34, 43, 52, 61, 78 — the two Phase-2 and Phase-4 edits must both land cleanly. §3 step order resolves conflict.
- **Phase 3 board-view CSS rewrites** — every `.module.css` under `src/client/board/` already consumes motion tokens per Phase 3 §2.3. Phase 4's CSS scope for board files is verification only.
- **Phase 3 PlayerRing landmine** (`phase-3-board-view-migration.md` §5 landmine #1) — Phase 3 rewrites `PlayerRing.module.css` to consume `--size-player-panel-width`, but `PlayerRing.tsx:70-71` still reads hardcoded `panelW = isLargeTV ? ... : isTV ? 320 : 200`. Phase 3 explicitly defers resolution to Phase 4. §2.7 resolves it.
- **Phase 3 out-of-scope declaration** — `phase-3-board-view-migration.md` §6 lists Phase 4 as owner of: "22 Framer Motion transition sites, 2 GSAP call sites, 15 CSS `@keyframes` durations, 13 CSS `transition` declarations." Those roadmap-time counts are the starting reference; §1.1 below documents what a direct audit surfaced.

Phase 4 does NOT inherit from Phase 5 (Phase 5 is the verification phase and depends on Phase 4 being done).

---

## §1.1 — Audit corrections (roadmap preview → reality)

During plan authoring, direct reads of the `src/client/` TSX surface surfaced five places where the roadmap's Phase 4 preview undercounted or mis-located scope. All are resolved here; none change the goal.

**Correction 1 — Framer Motion TSX site count.** The roadmap §7 Phase 4 preview lists **"22 Framer Motion sites."** Direct audit via `grep -nrE "transition\s*=\s*\{" src/client/**/*.tsx`:

| # | File | Line | Current literal | Phase 4 action |
|---|---|---|---|---|
| 1 | `src/client/shared/BottomSheet.tsx` | 45 | `transition={MOTION.SNAPPY}` — uppercase, from `animation-config` | Rename + reimport (§2.3.1) |
| 2 | `src/client/shared/GameOver.tsx` | 52 | `{ type: 'spring', stiffness: 200, damping: 20, delay: 0.2 }` — unique spring | `MOTION.gentle` (§2.3.2 + §2.8) |
| 3 | `src/client/shared/GameOver.tsx` | 61 | `{ duration: 0.4, delay: 0.6 }` — inline | `MOTION.enter` (§2.3.3) |
| 4 | `src/client/shared/GameOver.tsx` | 80 | `{ type: 'spring', stiffness: 300, damping: 24, delay: ... }` — SNAPPY duplicate | `MOTION.snappy` (§2.3.4 + §2.9) |
| 5 | `src/client/shared/GameOver.tsx` | 101 | `{ type: 'spring', stiffness: 250, damping: 25, delay: ... }` — DELIBERATE duplicate | `MOTION.deliberate` (§2.3.5 + §2.9) |
| 6 | `src/client/shared/GameOver.tsx` | 115 | `{ delay: 1.5 }` — delay only | `MOTION.enter` + delay (§2.3.6) |
| 7 | `src/client/board/AnnouncementFeed.tsx` | 199 | `{ duration: 0.25, ease: 'easeOut' }` — inline | `MOTION.enter` (§2.3.7) |
| 8 | `src/client/player/EliminatedView.tsx` | 34 | `{ type: 'spring', stiffness: 400, damping: 15 }` — unique spring | `MOTION.punchy` (§2.3.8 + §2.8) |
| 9 | `src/client/player/EliminatedView.tsx` | 43 | `{ ...MOTION.SNAPPY, delay: 0.2 }` — uppercase spread | Rename + reimport (§2.3.9) |
| 10 | `src/client/player/EliminatedView.tsx` | 52 | `{ duration: 0.4, delay: 0.5 }` — inline | `MOTION.enter` (§2.3.10) |
| 11 | `src/client/player/EliminatedView.tsx` | 61 | `{ ...MOTION.SNAPPY, delay: 0.7 }` — uppercase spread | Rename + reimport (§2.3.11) |
| 12 | `src/client/player/EliminatedView.tsx` | 78 | `{ duration: 0.4, delay: 1.0 }` — inline | `MOTION.enter` (§2.3.12) |
| 13 | `src/client/player/Hand.tsx` | 102 | `{ ...MOTION.SNAPPY, delay: ... }` — uppercase spread | Rename + reimport (§2.3.13) |
| 14 | `src/client/player/Hand.tsx` | 132 | `{ duration: 0.3 }` — inline | `MOTION.enter` (§2.3.14) |
| 15 | `src/client/player/Hand.tsx` | 143 | `transition={MOTION.SNAPPY}` — uppercase | Rename + reimport (§2.3.15) |
| 16 | `src/client/player/StagingArea.tsx` | 102 | `transition={MOTION.SNAPPY}` — uppercase | Rename + reimport (§2.3.16) |
| 17 | `src/client/player/StagingArea.tsx` | 142 | `{ duration: 0.3 }` — inline | `MOTION.enter` (§2.3.17) |
| 18 | `src/client/player/StagingArea.tsx` | 150 | `transition={MOTION.SNAPPY}` — uppercase | Rename + reimport (§2.3.18) |
| 19 | `src/client/board/Lobby.tsx` | 68 | `{ ...MOTION.SNAPPY, delay: i * 0.06 }` — uppercase spread | Rename + reimport (§2.3.19) |
| 20 | `src/client/player/ErrorToast.tsx` | 25 | `{ duration: 0.2, ease: 'easeOut' }` — inline | `MOTION.quickFade` (§2.3.20) |
| 21 | `src/client/player/SmartActionBox.tsx` | 61 | `transition={TRANSITION}` — local const | `MOTION.quickFade` + delete const (§2.3.21) |
| 22 | `src/client/player/SmartActionBox.tsx` | 72 | `transition={TRANSITION}` — local const | `MOTION.quickFade` + delete const (§2.3.21) |
| 23 | `src/client/board/PlayerRing.tsx` | 103 | `transition={MOTION.DELIBERATE}` — uppercase | Rename + reimport (§2.3.22) |
| 24 | `src/client/player/FloatingActionButton.tsx` | *(TBD)* | *(Phase-2-created; body left to execution)* | New site — Phase 4 authors (§2.3.23) |

**Real TSX count: 24 sites** across 12 files, not 22 across 9. The delta versus roadmap:

- **+1 site** for `GameOver.tsx:115` (`{ delay: 1.5 }` — delay-only, easy to miss because it has no `duration` key).
- **+1 site** for `FloatingActionButton.tsx` — Phase 2 creates this file with the body deferred to execution; Phase 4 authors the transition prop.
- The roadmap's "9 files" count was also off: actual survivors = 12 source files (BottomSheet, GameOver, AnnouncementFeed, EliminatedView, Hand, StagingArea, Lobby, ErrorToast, SmartActionBox, PlayerRing, FloatingActionButton, and DramaOverlay via GSAP). The 22 vs 24 delta is 2 sites; the 9 vs 12 delta is BottomSheet, FloatingActionButton, and DramaOverlay (which the roadmap counted under GSAP, not under FM TSX file count).

**Plus 1 local constant to delete:** `src/client/player/SmartActionBox.tsx:29` — `const TRANSITION = { duration: 0.2, ease: 'easeInOut' as const }`. Both consumers (sites 21 and 22) migrate to `MOTION.quickFade`, which makes the local const dead code. Delete it in the same commit as sites 21 + 22.

**Correction 2 — GSAP call-site count.** The roadmap says **"2 GSAP call sites (`PlayerRing.tsx:55-57`, `DramaOverlay.tsx:123-128`)."** Direct audit:

- `src/client/board/PlayerRing.tsx:48-57` — **1 tween** (`tl.fromTo(activeEl, {...}, { scale: 1, filter: 'brightness(1)', duration: 0.5, ease: 'power2.out' })`). Roadmap's "55-57" range is the literal-value sub-slice; the full call spans 48-57.
- `src/client/shared/DramaOverlay.tsx:120-128` — **2 tweens**:
  1. Line 120-124 — `tl.fromTo(text, { scale: 2.5, opacity: 0, y: 20 }, { scale: 1, opacity: 1, y: 0, duration: 0.25, ease: 'back.out(1.4)' })`.
  2. Line 128 — `tl.to(overlay, { opacity: 0, duration: 0.4, ease: 'power2.in' })`.
- `src/client/shared/DramaOverlay.tsx:126` — `tl.to({}, { duration: config.holdMs / 1000 })` is a dynamic hold (value derived from runtime `config.holdMs`), **not** a literal to migrate. Left alone with a comment.
- `src/client/shared/DramaOverlay.tsx:119` — `tl.set(overlay, { opacity: 1, pointerEvents: 'none' })` is a property-set, no timing, no change.

**Real GSAP count: 2 call sites, 3 literal-timing tweens** (not 2 tweens as the roadmap preview implied). Section §2.4 specifies all 3.

**The GSAP easings** (`back.out(1.4)`, `power2.out`, `power2.in`) are **GSAP-specific string easings** that cannot be expressed as CSS `cubic-bezier()` values one-to-one. GSAP parses these at runtime via its own `ease` registry. The `MOTION_EASINGS` scale in `motion.ts` maps to Framer Motion and CSS consumers and intentionally does NOT include GSAP-string equivalents. **Phase 4 keeps the GSAP easing strings as literals** — they are named tokens within GSAP's own system, and the Phase 4 work for the GSAP sites is limited to duration consolidation. §2.4 documents this constraint with the reasoning inline, so future readers don't try to "complete" the migration by converting the strings.

**Correction 3 — CSS `@keyframes` duration count.** The roadmap says **"15 CSS `@keyframes` durations across 9 files."** The roadmap counted the *pre-rebuild* code. After Phases 2 and 3 land their CSS rewrites, those rewrites already consume `var(--motion-duration-*)` on every `animation:` shorthand they write (see `phase-2-phone-view-migration.md` §2.3 and `phase-3-board-view-migration.md` §2.3 — both phases systematically migrate animations to tokens). Phase 4's actual CSS scope is therefore **verification + stragglers**, not wholesale migration. Direct audit of the post-Phase-2/3 state:

**Post-rewrite stragglers where a raw easing keyword or raw duration still exists:**

| # | File | Line | Current literal | Phase 4 action |
|---|---|---|---|---|
| 1 | `src/client/player/SmartActionBox.module.css` (Phase 2 §2.3.3 rewrite) | ~527 | `animation: breatheIntense var(--motion-duration-essential-pulse) ease-in-out infinite alternate` | `ease-in-out` → `var(--motion-ease-base)` (§2.5.1) |
| 2 | `src/client/player/SmartActionBox.module.css` | ~545 | `animation: breathe var(--motion-duration-essential-pulse) ease-in-out infinite alternate` | same (§2.5.2) |
| 3 | `src/client/player/FloatingActionButton.module.css` (Phase 2 §2.3.7 rewrite) | ~826 | `animation: fabPulse var(--motion-duration-essential-pulse) ease-in-out infinite alternate` | same (§2.5.3) |

> **§2.5.4 removed during deepening** — Phase 2 deepening already tokenizes `JoinScreen.module.css` `.waitingDots::after` from `1.5s` to `var(--motion-duration-dots)`. Phase 1 deepening committed `--motion-duration-dots: 1500ms` (commit `ba6f18ce`). No Phase 4 action needed for this site.

**Real Phase 4 CSS @keyframes scope: 3 surgical edits**, not 15. The 15-count was measuring the pre-rebuild surface. Phases 2 and 3 systematically migrated the other 12 during their rewrites (including the JoinScreen dots duration). §2.5 also mandates a verification grep that confirms no Phase 2/3 file smuggled a raw duration literal past review.

**Correction 4 — CSS `transition:` declaration count.** Same mechanism as correction 3. The roadmap counted 13 pre-rebuild. Post-Phase-2/3, every `.module.css` file that survives already consumes motion tokens on every `transition:` declaration. Direct audit of the post-Phase-2/3 state surfaced **zero** stragglers — every transition declaration specified in the Phase 2 and Phase 3 plans uses `var(--motion-duration-*)` + `var(--motion-ease-*)`. **Real Phase 4 CSS transition scope: 0 surgical edits**, replaced with a **verification grep** (§2.6) that fails the Phase 4 commit if any `.module.css` file contains a bare seconds literal in a `transition:` declaration.

**Correction 5 — PlayerRing TSX ↔ CSS coupling line range.** The TODO refers to the coupling as `PlayerRing.tsx:70-71`. Accurate — lines 70-71 contain `const panelW = isLargeTV ? Math.min(420, vwPanel) : isTV ? Math.min(320, vwPanel) : 200` and `const panelH = isLargeTV ? panelW * 0.33 : isTV ? panelW * 0.35 : 90`. §2.7 replaces these two lines with a computed-style read from a hidden measurement div that reflects `--size-player-panel-width` / `--size-player-panel-height`.

**Bottom line on Phase 4 scope after corrections:**

- 24 FM transition sites across 12 TSX files (was: 22 across 9)
- 1 local `const TRANSITION` definition to delete (SmartActionBox.tsx:29)
- 3 GSAP literal-timing tweens across 2 files (was: 2 tweens)
- 3 CSS `@keyframes`/`animation:` surgical edits (was: 15 wholesale edits; deepening removed §2.5.4 — Phase 2 already tokenized JoinScreen dots)
- 0 CSS `transition:` surgical edits + 1 verification grep gate (was: 13 wholesale edits)
- 1 TSX ↔ CSS coupling resolution (PlayerRing measurement-div pattern)
- 1 legacy file deletion (`src/client/shared/animation-config.ts`)
- 0 new Phase 1 tokens needed (deepening confirmed `--motion-duration-dots` and `--size-player-panel-height` already committed by Phase 1 deepening)

The narrative shift: Phase 4 is **less about migration and more about elimination of the last inline literals**, because Phases 2 and 3 did most of the CSS-side work incidentally during their file rewrites. The TSX side was out of scope for Phases 2 and 3 and is therefore Phase 4's primary workload.

---

## §2 — Deliverables

### §2.1 Directory state after Phase 4

Phase 4 does not create new files. It deletes one file and edits existing files.

```
src/client/shared/
├── animation-config.ts     ← DELETED (every import site migrated to tokens/motion)
├── tokens/
│   ├── motion.ts           ← UNCHANGED (Phase 1 locked)
│   ├── primitives.css      ← UNCHANGED (Phase 1 locked)
│   └── __tests__/
│       └── motion-token-sync.test.ts  ← UNCHANGED (Phase 1 locked, still green)
├── BottomSheet.tsx         ← EDITED (1 site)
├── GameOver.tsx            ← EDITED (5 sites)
└── DramaOverlay.tsx        ← EDITED (2 GSAP tweens)

src/client/player/
├── Hand.tsx                ← EDITED (3 sites)
├── StagingArea.tsx         ← EDITED (3 sites)
├── EliminatedView.tsx      ← EDITED (5 sites) — conflicts with Phase 2 §2.3.9a retheme (see §3 ordering)
├── SmartActionBox.tsx      ← EDITED (2 sites + 1 local const deletion)
├── ErrorToast.tsx          ← EDITED (1 site)
├── FloatingActionButton.tsx ← EDITED (1 site — fills in the body Phase 2 deferred)
├── SmartActionBox.module.css   ← EDITED (2 CSS surgical edits — §2.5.1, §2.5.2)
├── FloatingActionButton.module.css ← EDITED (1 CSS surgical edit — §2.5.3)
└── JoinScreen.module.css   ← EDITED (1 CSS surgical edit — §2.5.4)

src/client/board/
├── PlayerRing.tsx          ← EDITED (1 site + 1 GSAP tween + TSX↔CSS coupling resolution)
├── Lobby.tsx               ← EDITED (1 site)
├── AnnouncementFeed.tsx    ← EDITED (1 site)
└── PlayerRing.module.css   ← EDITED (1 measurement-div reflection rule added for §2.7)
```

**File deletion: 1** (`animation-config.ts`).
**TSX file edits: 12** (BottomSheet, GameOver, DramaOverlay, Hand, StagingArea, EliminatedView, SmartActionBox, ErrorToast, FloatingActionButton, PlayerRing, Lobby, AnnouncementFeed).
**CSS file edits: 4** (SmartActionBox, FloatingActionButton, JoinScreen, PlayerRing).

---

### §2.2 Migration patterns (universal templates)

Every §2.3 site follows one of three templates. Every §2.5 edit follows a CSS surgical-edit template. Every reader of the plan should look up which template applies before reading the site-specific entry, so the per-site block can stay terse.

#### Template TSX-A — uppercase-to-lowercase rename (covers sites with `MOTION.SNAPPY` / `MOTION.DELIBERATE` from the legacy `animation-config.ts`)

**Before:**
```tsx
import { MOTION } from '@client/shared/animation-config'
// ...
transition={MOTION.SNAPPY}
// or
transition={{ ...MOTION.SNAPPY, delay: 0.2 }}
```

**After:**
```tsx
import { MOTION } from '@client/shared/tokens/motion'
// ...
transition={MOTION.snappy}
// or
transition={{ ...MOTION.snappy, delay: 0.2 }}
```

**Why the rename**: `animation-config.ts` used `SCREAMING_CASE` for its two presets. Phase 1 `motion.ts` uses lowercase camel for its richer scale (`snappy`, `deliberate`, `punchy`, `gentle`, plus combined presets `quickFade`/`enter`/`exit`/`dramatic`). The values behind `MOTION.snappy` (`stiffness: 300, damping: 24`) are numerically identical to the legacy `MOTION.SNAPPY` — the rename is cosmetic but the `animation-config.ts` file is deleted at the end of Phase 4 so the old import path stops resolving.

#### Template TSX-B — inline literal to named preset (covers sites with `{ duration, ease }` or `{ duration }` literals)

**Before:**
```tsx
// No MOTION import yet
transition={{ duration: 0.4, delay: 0.6 }}
// or
transition={{ duration: 0.2, ease: 'easeOut' }}
```

**After:**
```tsx
import { MOTION } from '@client/shared/tokens/motion'
// ...
transition={{ ...MOTION.enter, delay: 0.6 }}
// or
transition={MOTION.quickFade}
```

**Why named presets and not raw duration tokens**: Framer Motion `transition.duration` is a Number, not a string — you cannot write `duration: 'var(--motion-duration-fast)'` (Phase 1 §2.6 landmine). The TS token layer provides named presets (`MOTION.quickFade` = `{ duration: 0.15, ease: base }`, `MOTION.enter` = `{ duration: 0.25, ease: decelerate }`, etc.) that encode the intent, not the raw number. The inline-literal sites in §2.3 map to these presets by semantic role:

- **Entry/reveal** (`{ duration: 0.25-0.4, ease: 'easeOut' }` or similar decelerating eases) → `MOTION.enter`
- **Quick fade** (`{ duration: 0.2, ease: 'easeOut' }` for toast-style notifications) → `MOTION.quickFade`
- **Exit** (`{ duration: 0.15, ease: 'easeIn' }`, currently absent in the audit but reserved for future sites) → `MOTION.exit`
- **Dramatic** (`{ duration: 0.8, ease: ... }`, currently absent — reserved for §2.4 GSAP if dropped into Framer Motion land) → `MOTION.dramatic`

#### Template TSX-C — literal spring to named spring (covers GameOver :52, :80, :101 and EliminatedView :34)

**Before:**
```tsx
transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.2 }}
```

**After:**
```tsx
import { MOTION } from '@client/shared/tokens/motion'
// ...
transition={{ ...MOTION.gentle, delay: 0.2 }}
```

**Why**: Phase 1 §2.6 `MOTION_SPRINGS` already catalogues four named springs. The inline sites map to them verbatim:

| Literal | Phase 1 spring | Where used (pre-Phase-4) |
|---|---|---|
| `{ stiffness: 300, damping: 24 }` | `MOTION.snappy` (alias `MOTION_SPRINGS.snappy`) | GameOver.tsx:80, animation-config.ts `SNAPPY` |
| `{ stiffness: 250, damping: 25 }` | `MOTION.deliberate` | GameOver.tsx:101, animation-config.ts `DELIBERATE` |
| `{ stiffness: 400, damping: 15 }` | `MOTION.punchy` | EliminatedView.tsx:34 |
| `{ stiffness: 200, damping: 20 }` | `MOTION.gentle` | GameOver.tsx:52 |

The mapping is exact — Phase 1's `motion.ts` was written with these four sites in mind. §2.8 catalogues the unique-spring work; §2.9 catalogues the duplicate-removal work; both sections cross-reference back to this table.

#### Template CSS-S — surgical edit of a raw literal inside an already-token-consuming declaration

**Before:**
```css
.something {
  animation: drawPileBreathe var(--motion-duration-ambient) ease-in-out infinite;
}
```

**After:**
```css
.something {
  animation: drawPileBreathe var(--motion-duration-ambient) var(--motion-ease-base) infinite;
}
```

**Why**: Phases 2 and 3 systematically consumed `--motion-duration-*` tokens but left four sites with a raw `ease-in-out` keyword (pragmatic carry-over — CSS's built-in `ease-in-out` is `cubic-bezier(0.42, 0, 0.58, 1)` which is close to but not identical to Phase 1's `--motion-ease-base` `cubic-bezier(0.4, 0, 0.2, 1)`). The Phase 4 surgical edit unifies the easing reference. The perceptual difference between the two curves is <2% over a 400ms animation; the consolidation gain (one source of truth) outweighs the imperceptible curve change.

---

### §2.3 — 22 Framer Motion transition sites

**Actual audited count: 24 sites** (see §1.1 correction 1). Organized by source file in Phase-2/3 dependency order: shared files first (Phase 2 and Phase 3 both touch them), then player files (Phase 2), then board files (Phase 3). Phase 4 executes them in the §3 commit order, which interleaves sites with Phase 2/3 retheme edits to avoid merge conflicts in the same lines.

Each site follows the template format: **Site** (file:line) → **Current** (pre-Phase-4 TSX) → **Replacement** (post-Phase-4 TSX) → **Why this token**.

Import statements are shown once per file (the first site); subsequent sites in the same file assume the import has been added by the earlier site.

#### §2.3.1 — `BottomSheet.tsx:45`

**Site**: `src/client/shared/BottomSheet.tsx:45`

**Current:**
```tsx
// Line 4:
import { MOTION } from './animation-config'

// Lines 40-48:
<m.div
  className={styles.sheet}
  initial={{ y: '100%' }}
  animate={{ y: 0 }}
  exit={{ y: '100%' }}
  transition={MOTION.SNAPPY}
>
```

**Replacement:**
```tsx
// Line 4:
import { MOTION } from '@client/shared/tokens/motion'

// Lines 40-48 (only line 45 changes):
<m.div
  className={styles.sheet}
  initial={{ y: '100%' }}
  animate={{ y: 0 }}
  exit={{ y: '100%' }}
  transition={MOTION.snappy}
>
```

**Why**: Template TSX-A. `MOTION.snappy` is numerically identical to the legacy `MOTION.SNAPPY` (`stiffness: 300, damping: 24`). The bottom-sheet drawer entrance is a snappy spring — matches the preset's intended use (button presses, small UI state changes) because the drawer is a small panel relative to the full phone viewport and the quick response is what makes it feel "present" rather than "slow."

#### §2.3.2 — `GameOver.tsx:52` (unique spring `gentle`)

**Site**: `src/client/shared/GameOver.tsx:52`

**Current:**
```tsx
// Line 1 (import block):
import { m } from 'motion/react'
// No MOTION import yet

// Lines 48-55:
<m.div
  className={styles.winner}
  initial={{ opacity: 0, scale: 1.4, y: -20 }}
  animate={{ opacity: 1, scale: 1, y: 0 }}
  transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.2 }}
>
  {winner?.name ?? 'Unknown'}
</m.div>
```

**Replacement:**
```tsx
// Line 1 (import block — add MOTION import):
import { m } from 'motion/react'
import { MOTION } from '@client/shared/tokens/motion'

// Lines 48-55 (only line 52 changes):
<m.div
  className={styles.winner}
  initial={{ opacity: 0, scale: 1.4, y: -20 }}
  animate={{ opacity: 1, scale: 1, y: 0 }}
  transition={{ ...MOTION.gentle, delay: 0.2 }}
>
  {winner?.name ?? 'Unknown'}
</m.div>
```

**Why**: Template TSX-C. `{ stiffness: 200, damping: 20 }` is unique in the codebase and was named `MOTION_SPRINGS.gentle` in Phase 1 §2.6 specifically for this site. The winner-name reveal is a **slow, confident** spring — faster springs feel like a jump-cut, softer springs feel like the animation stalled. The Phase 1 naming (`gentle`) captures the intent.

#### §2.3.3 — `GameOver.tsx:61` (inline duration)

**Site**: `src/client/shared/GameOver.tsx:61`

**Current:**
```tsx
// Lines 57-68:
<m.div
  className={styles.subtitle}
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.4, delay: 0.6 }}
>
  {myResult?.rank === 1 ? 'You won!' : ...}
</m.div>
```

**Replacement:**
```tsx
<m.div
  className={styles.subtitle}
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ ...MOTION.enter, delay: 0.6 }}
>
  {myResult?.rank === 1 ? 'You won!' : ...}
</m.div>
```

**Why**: Template TSX-B. `{ duration: 0.4 }` with no explicit easing is a plain fade-in — `MOTION.enter` is `{ duration: 0.25, ease: 'decelerate' }`, slightly shorter and with an explicit decelerate curve that better matches the "subtitle arrives" intent. **Numerical change**: 0.4s → 0.25s. The subtitle is a text element that the eye reads during the animation; a shorter entrance feels crisper and the total stagger (winner 0.2s delay → subtitle 0.6s delay → rankings 0.8s+ delay per item) stays paced because the delay anchors the start, not the duration.

#### §2.3.4 — `GameOver.tsx:80` (literal SNAPPY duplicate)

**Site**: `src/client/shared/GameOver.tsx:80`

**Current:**
```tsx
// Lines 73-90:
<m.div
  key={player.id}
  className={styles.rank}
  data-winner={rank === 1 || undefined}
  data-me={player.id === myPlayerId || undefined}
  initial={{ opacity: 0, x: -30 }}
  animate={{ opacity: 1, x: 0 }}
  transition={{
    type: 'spring',
    stiffness: 300,
    damping: 24,
    delay: 0.8 + i * 0.12,
  }}
>
```

**Replacement:**
```tsx
<m.div
  key={player.id}
  className={styles.rank}
  data-winner={rank === 1 || undefined}
  data-me={player.id === myPlayerId || undefined}
  initial={{ opacity: 0, x: -30 }}
  animate={{ opacity: 1, x: 0 }}
  transition={{ ...MOTION.snappy, delay: 0.8 + i * 0.12 }}
>
```

**Why**: Template TSX-C + §2.9 literal-duplicate removal. `{ stiffness: 300, damping: 24 }` is the `MOTION.snappy` preset verbatim. The original inline was a copy-paste, not a unique tuning. Rankings slide in with a snappy spring — the quick decay is what makes the staggered reveal feel "list-like" rather than "wallowing."

#### §2.3.5 — `GameOver.tsx:101` (literal DELIBERATE duplicate)

**Site**: `src/client/shared/GameOver.tsx:101`

**Current:**
```tsx
// Lines 96-109:
<m.button
  className={styles.playAgain}
  onClick={onPlayAgain}
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{
    type: 'spring',
    stiffness: 250,
    damping: 25,
    delay: 0.8 + rankings.length * 0.12 + 0.3,
  }}
>
  Run It Back
</m.button>
```

**Replacement:**
```tsx
<m.button
  className={styles.playAgain}
  onClick={onPlayAgain}
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{
    ...MOTION.deliberate,
    delay: 0.8 + rankings.length * 0.12 + 0.3,
  }}
>
  Run It Back
</m.button>
```

**Why**: Template TSX-C + §2.9 literal-duplicate removal. `{ stiffness: 250, damping: 25 }` is the `MOTION.deliberate` preset verbatim — a slightly softer, more considered spring than `snappy`, fitting for the call-to-action button that appears after rankings have settled. The delay formula (`0.8 + rankings.length * 0.12 + 0.3`) is game-state-dependent and stays as-is.

#### §2.3.6 — `GameOver.tsx:115` (delay-only literal)

**Site**: `src/client/shared/GameOver.tsx:115`

**Current:**
```tsx
// Lines 111-118:
<m.div
  className={styles.waiting}
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ delay: 1.5 }}
>
  Waiting for host...
</m.div>
```

**Replacement:**
```tsx
<m.div
  className={styles.waiting}
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ ...MOTION.enter, delay: 1.5 }}
>
  Waiting for host...
</m.div>
```

**Why**: Template TSX-B. `{ delay: 1.5 }` without an explicit duration or easing falls back to Framer Motion's default spring (`stiffness: 100, damping: 10` at the time of writing — unspec'd and version-dependent). Explicit `MOTION.enter` removes the version dependency and makes the "waiting for host" fade have the same decelerating easing as every other secondary text reveal in the app. **Perceptual change**: essentially nil — the viewer sees a fade that takes ~250ms starting 1.5s after the rankings settle. The fix is about grep-ability and drift-prevention, not about how it feels.

#### §2.3.7 — `AnnouncementFeed.tsx:199` (inline duration + string ease)

**Site**: `src/client/board/AnnouncementFeed.tsx:199`

**Current:**
```tsx
// Line 1-3 (imports — no MOTION import yet):
import { useRef, useEffect } from 'react'
import { m, AnimatePresence } from 'motion/react'
import { useEventFeed } from '@client/shared/hooks/useEventFeed'

// Line 199 (inside a m.div):
transition={{ duration: 0.25, ease: 'easeOut' }}
```

**Replacement:**
```tsx
// Imports — add MOTION:
import { useRef, useEffect } from 'react'
import { m, AnimatePresence } from 'motion/react'
import { useEventFeed } from '@client/shared/hooks/useEventFeed'
import { MOTION } from '@client/shared/tokens/motion'

// Line 199:
transition={MOTION.enter}
```

**Why**: Template TSX-B. `{ duration: 0.25, ease: 'easeOut' }` maps exactly to `MOTION.enter` (`duration: 0.25, ease: 'decelerate'`). `ease: 'easeOut'` is Framer Motion's shorthand for `[0, 0, 0.58, 1]` (roughly), and `MOTION_EASINGS.decelerate` is `[0, 0, 0.2, 1]` — both are "fast at start, slow at end," and the decelerate curve has a marginally stronger deceleration that reads as more settled. Perceptually indistinguishable on a 250ms fade-in for a live-event toast.

#### §2.3.8 — `EliminatedView.tsx:34` (unique spring `punchy`)

**Site**: `src/client/player/EliminatedView.tsx:34`

**Current:**
```tsx
// Line 5:
import { MOTION } from '@client/shared/animation-config'

// Lines 30-37:
<m.div
  className={styles.explosionWrap}
  initial={{ scale: 0, rotate: -15 }}
  animate={{ scale: 1, rotate: 0 }}
  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
>
  <div className={styles.skull}>💀</div>
</m.div>
```

**Replacement:**
```tsx
// Line 5:
import { MOTION } from '@client/shared/tokens/motion'

// Lines 30-37 (only line 34 changes):
<m.div
  className={styles.explosionWrap}
  initial={{ scale: 0, rotate: -15 }}
  animate={{ scale: 1, rotate: 0 }}
  transition={MOTION.punchy}
>
  <div className={styles.skull}>💀</div>
</m.div>
```

**Why**: Template TSX-C. `{ stiffness: 400, damping: 15 }` is a dramatic, punchy spring (high stiffness + low damping → overshoot + wobble), unique to this site in the codebase and specifically named `MOTION.punchy` in Phase 1 §2.6 for this reveal. The skull pops in with intentional overshoot — it's the visual climax of the elimination sequence. The MOTION preset is a direct re-export of `MOTION_SPRINGS.punchy`, no delay/spread needed.

> **Phase 2 coordination**: Phase 2 §2.3.9a edits `EliminatedView.tsx:45` (title text) and `EliminatedView.tsx:8-17` (flavor pool) in the same file. Those edits are at different line ranges from §2.3.8-§2.3.12 (lines 34, 43, 52, 61, 78). Phase 2 lands first per §3 ordering, then Phase 4 edits the transition props. Both sets of edits can coexist in one file without conflict; the `pnpm lint` + `pnpm typecheck` gates after each commit catch any accidental line-shift.

#### §2.3.9 — `EliminatedView.tsx:43` (spread with uppercase MOTION)

**Site**: `src/client/player/EliminatedView.tsx:43`

**Current:**
```tsx
// Lines 39-46:
<m.div
  className={styles.title}
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ ...MOTION.SNAPPY, delay: 0.2 }}
>
  You Exploded!  {/* Phase 2 §2.3.9a changes this text to "You're Burned." */}
</m.div>
```

**Replacement:**
```tsx
<m.div
  className={styles.title}
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ ...MOTION.snappy, delay: 0.2 }}
>
  You're Burned.  {/* text already landed by Phase 2 §2.3.9a */}
</m.div>
```

**Why**: Template TSX-A. Import already migrated by §2.3.8. Rename uppercase→lowercase on the spread.

#### §2.3.10 — `EliminatedView.tsx:52` (inline duration)

**Site**: `src/client/player/EliminatedView.tsx:52`

**Current:**
```tsx
// Lines 48-55:
<m.div
  className={styles.flavor}
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.4, delay: 0.5 }}
>
  {flavor}
</m.div>
```

**Replacement:**
```tsx
<m.div
  className={styles.flavor}
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ ...MOTION.enter, delay: 0.5 }}
>
  {flavor}
</m.div>
```

**Why**: Template TSX-B. `{ duration: 0.4, delay: 0.5 }` → `MOTION.enter` (`duration: 0.25` decelerate) + delay. Slightly shorter fade; same stagger anchor. The flavor line reads more "delivered" than "lingering."

#### §2.3.11 — `EliminatedView.tsx:61` (spread with uppercase MOTION)

**Site**: `src/client/player/EliminatedView.tsx:61`

**Current:**
```tsx
// Lines 57-72:
<m.div
  className={styles.remaining}
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ ...MOTION.SNAPPY, delay: 0.7 }}
>
  <div className={styles.remainingLabel}>Still alive</div>
  ...
</m.div>
```

**Replacement:**
```tsx
<m.div
  className={styles.remaining}
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ ...MOTION.snappy, delay: 0.7 }}
>
  <div className={styles.remainingLabel}>Still alive</div>
  ...
</m.div>
```

**Why**: Template TSX-A.

#### §2.3.12 — `EliminatedView.tsx:78` (inline duration)

**Site**: `src/client/player/EliminatedView.tsx:78`

**Current:**
```tsx
// Lines 74-81:
<m.div
  className={styles.watchPrompt}
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.4, delay: 1.0 }}
>
  Watch the TV for the action
</m.div>
```

**Replacement:**
```tsx
<m.div
  className={styles.watchPrompt}
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ ...MOTION.enter, delay: 1.0 }}
>
  Watch the TV for the action
</m.div>
```

**Why**: Template TSX-B. Last element in the EliminatedView stagger; the 1.0s delay is the game-state-dependent pause that gives the player a beat to read the skull + title + flavor before pointing them at the TV.

#### §2.3.13 — `Hand.tsx:102` (multiline spread with uppercase MOTION)

**Site**: `src/client/player/Hand.tsx:102`

**Current:**
```tsx
// Line 5:
import { MOTION } from '@client/shared/animation-config'

// Lines 95-113:
<m.div
  key={card.id}
  className={styles.cardSlot}
  layout={dealComplete ? 'position' : false}
  initial={{ opacity: 0, x: 40, scale: 0.85 }}
  animate={{ opacity: 1, x: 0, scale: 1 }}
  exit={{ opacity: 0, scale: 0.7 }}
  transition={{
    ...MOTION.SNAPPY,
    delay: dealComplete ? 0 : i * 0.08 + 0.15,
  }}
  onPointerDown={...}
  onPointerUp={...}
>
```

**Replacement:**
```tsx
// Line 5:
import { MOTION } from '@client/shared/tokens/motion'

// Lines 95-113 (only lines 102-105 change):
<m.div
  key={card.id}
  className={styles.cardSlot}
  layout={dealComplete ? 'position' : false}
  initial={{ opacity: 0, x: 40, scale: 0.85 }}
  animate={{ opacity: 1, x: 0, scale: 1 }}
  exit={{ opacity: 0, scale: 0.7 }}
  transition={{
    ...MOTION.snappy,
    delay: dealComplete ? 0 : i * 0.08 + 0.15,
  }}
  onPointerDown={...}
  onPointerUp={...}
>
```

**Why**: Template TSX-A.

#### §2.3.14 — `Hand.tsx:132` (inline duration)

**Site**: `src/client/player/Hand.tsx:132`

**Current:**
```tsx
// Lines 126-136 (enlarge backdrop inside AnimatePresence):
<m.div
  key="enlarge-backdrop"
  className={styles.enlargeBackdrop}
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  transition={{ duration: 0.3 }}
  onPointerUp={...}
>
```

**Replacement:**
```tsx
<m.div
  key="enlarge-backdrop"
  className={styles.enlargeBackdrop}
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  transition={MOTION.enter}
  onPointerUp={...}
>
```

**Why**: Template TSX-B. `{ duration: 0.3 }` → `MOTION.enter` (`duration: 0.25`). Backdrop fade-in for the enlarged-card overlay. `MOTION.enter` pairs the decelerate curve with the 250ms duration — a 50ms shortening that reads as "snappier tap response."

#### §2.3.15 — `Hand.tsx:143` (plain MOTION.SNAPPY)

**Site**: `src/client/player/Hand.tsx:143`

**Current:**
```tsx
// Lines 137-146 (enlarge card):
<m.div
  key={enlargedCard.id}
  className={styles.enlargeCard}
  initial={{ scale: 0.35, y: 120 }}
  animate={{ scale: 1, y: 0 }}
  exit={{ scale: 0.35, y: 120 }}
  transition={MOTION.SNAPPY}
>
  <MinimalCard type={enlargedCard.type} />
</m.div>
```

**Replacement:**
```tsx
<m.div
  key={enlargedCard.id}
  className={styles.enlargeCard}
  initial={{ scale: 0.35, y: 120 }}
  animate={{ scale: 1, y: 0 }}
  exit={{ scale: 0.35, y: 120 }}
  transition={MOTION.snappy}
>
  <MinimalCard type={enlargedCard.type} />
</m.div>
```

**Why**: Template TSX-A.

#### §2.3.16 — `StagingArea.tsx:102` (plain MOTION.SNAPPY)

**Site**: `src/client/player/StagingArea.tsx:102`

**Current:**
```tsx
// Line 6:
import { MOTION } from '@client/shared/animation-config'

// Lines 96-115 (staged card slot):
<m.div
  key={card.id}
  className={styles.stagedSlot}
  layout="position"
  transition={MOTION.SNAPPY}
  onPointerDown={...}
  ...
>
  <MinimalCard type={card.type} />
</m.div>
```

**Replacement:**
```tsx
// Line 6:
import { MOTION } from '@client/shared/tokens/motion'

// Line 102:
transition={MOTION.snappy}
```

**Why**: Template TSX-A.

#### §2.3.17 — `StagingArea.tsx:142` (inline duration)

**Site**: `src/client/player/StagingArea.tsx:142`

**Current:**
```tsx
// Lines 136-144 (enlarge backdrop inside AnimatePresence):
<m.div
  key="enlarge-backdrop"
  className={handStyles.enlargeBackdrop}
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  transition={{ duration: 0.3 }}
  onPointerUp={...}
>
```

**Replacement:**
```tsx
<m.div
  key="enlarge-backdrop"
  className={handStyles.enlargeBackdrop}
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  transition={MOTION.enter}
  onPointerUp={...}
>
```

**Why**: Template TSX-B. Mirrors §2.3.14 — the same enlarge-backdrop pattern is duplicated between Hand and StagingArea because both surfaces need to show enlarged cards. Keeping them in sync through a shared `MOTION.enter` preset means a future adjustment in one place propagates automatically.

#### §2.3.18 — `StagingArea.tsx:150` (plain MOTION.SNAPPY)

**Site**: `src/client/player/StagingArea.tsx:150`

**Current:**
```tsx
// Lines 145-153 (enlarge card):
<m.div
  className={handStyles.enlargeCard}
  initial={{ scale: 0.35, y: -80 }}
  animate={{ scale: 1, y: 0 }}
  exit={{ scale: 0.35, y: -80 }}
  transition={MOTION.SNAPPY}
>
```

**Replacement:**
```tsx
<m.div
  className={handStyles.enlargeCard}
  initial={{ scale: 0.35, y: -80 }}
  animate={{ scale: 1, y: 0 }}
  exit={{ scale: 0.35, y: -80 }}
  transition={MOTION.snappy}
>
```

**Why**: Template TSX-A.

#### §2.3.19 — `Lobby.tsx:68` (spread with uppercase MOTION)

**Site**: `src/client/board/Lobby.tsx:68`

**Current:**
```tsx
// Line 4:
import { MOTION } from '@client/shared/animation-config'

// Lines 63-72 (player chip stagger):
<m.div
  key={player.id}
  className={styles.playerChip}
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ ...MOTION.SNAPPY, delay: i * 0.06 }}
>
```

**Replacement:**
```tsx
// Line 4:
import { MOTION } from '@client/shared/tokens/motion'

// Line 68:
transition={{ ...MOTION.snappy, delay: i * 0.06 }}
```

**Why**: Template TSX-A. The `i * 0.06` stagger is game-state-dependent (based on join order) and stays as-is.

#### §2.3.20 — `ErrorToast.tsx:25` (inline duration + string ease)

**Site**: `src/client/player/ErrorToast.tsx:25`

**Current:**
```tsx
// Lines 1-4 (imports):
import { useEffect, useState } from 'react'
import { m, AnimatePresence } from 'motion/react'
import { useLastError } from '@client/shared/gameStore'
import styles from './ErrorToast.module.css'

// Lines 20-28 (toast enter):
<m.div
  key={error.id}
  className={styles.toast}
  initial={{ y: -20, opacity: 0 }}
  animate={{ y: 0, opacity: 1 }}
  exit={{ y: -20, opacity: 0 }}
  transition={{ duration: 0.2, ease: 'easeOut' }}
>
```

**Replacement:**
```tsx
// Imports — add MOTION:
import { useEffect, useState } from 'react'
import { m, AnimatePresence } from 'motion/react'
import { useLastError } from '@client/shared/gameStore'
import { MOTION } from '@client/shared/tokens/motion'
import styles from './ErrorToast.module.css'

// Line 25:
transition={MOTION.quickFade}
```

**Why**: Template TSX-B. `{ duration: 0.2, ease: 'easeOut' }` → `MOTION.quickFade` (`duration: 0.15, ease: 'base'`). A toast needs to appear **fast** so it doesn't block perception of whatever just went wrong. Quick-fade at 150ms is faster than 200ms by a readable margin; the base easing (curve through the middle) is less "decelerating" than the original `easeOut` but on a 150ms animation the difference is sub-perceptual. This is the only site using `MOTION.quickFade` in the app; if a second site shows up later, grepping for `MOTION.quickFade` finds both.

#### §2.3.21 — `SmartActionBox.tsx:61` + `:72` + delete local `const TRANSITION`

**Sites**: `src/client/player/SmartActionBox.tsx:61` and `src/client/player/SmartActionBox.tsx:72`

**Additional edit**: delete line 29 (local `TRANSITION` constant).

**Current:**
```tsx
// Line 29 (local constant — to be deleted):
const TRANSITION = { duration: 0.2, ease: 'easeInOut' as const }

// Line 61 (inside m.button):
transition={TRANSITION}

// Line 72 (inside m.div):
transition={TRANSITION}
```

**Replacement:**
```tsx
// Line 5 (add MOTION import after existing imports):
import { MOTION } from '@client/shared/tokens/motion'

// Line 29: DELETE the local TRANSITION constant entirely.

// Lines 61 + 72:
transition={MOTION.quickFade}
```

**Why**: Template TSX-B + local-constant elimination. The `TRANSITION` local constant was a half-step toward shared motion tokens — a single file-scoped object that two sites share. Phase 4 deletes it because:

1. It's a literal duplicate of `MOTION.quickFade` semantics (`duration: 0.2` ≈ `0.15`, `ease: 'easeInOut'` ≈ `ease: 'base'` — both are symmetric cubic-bezier curves that the eye reads as identical on a sub-200ms animation).
2. It prevents the `motion-token-sync.test.ts` CI gate from catching drift — a future engineer could edit `TRANSITION` to `duration: 0.5` and nothing fails.
3. It's the only local-constant motion literal in the codebase. Deleting it establishes the precedent that **all** motion goes through `tokens/motion`, not through file-local constants.

The eye cannot distinguish `duration: 0.15, ease: cubic-bezier(0.4, 0, 0.2, 1)` from `duration: 0.2, ease: 'easeInOut'` on a 150-200ms animation — both are symmetric eases between the same endpoints. If Phase 5 visual review disagrees, add a new `MOTION.smartActionBox` preset with explicit values instead of bringing back the file-local constant; the constraint is that the values live in `motion.ts`.

#### §2.3.22 — `PlayerRing.tsx:103` (plain MOTION.DELIBERATE)

**Site**: `src/client/board/PlayerRing.tsx:103`

**Current:**
```tsx
// Line 5:
import { MOTION } from '@client/shared/animation-config'

// Lines 82-104 (ring panel):
<m.div
  key={player.id}
  ref={...}
  className={styles.panel}
  data-active={isActive || undefined}
  style={{ '--player-color': player.color } as React.CSSProperties}
  initial={false}
  animate={{
    x: dimensions.w / 2 + pos.x - panelW / 2,
    y: dimensions.h / 2 + pos.y - panelH / 2,
  }}
  exit={{ scale: 0, opacity: 0, filter: 'grayscale(1)' }}
  transition={MOTION.DELIBERATE}
>
```

**Replacement:**
```tsx
// Line 5:
import { MOTION } from '@client/shared/tokens/motion'

// Line 103:
transition={MOTION.deliberate}
```

**Why**: Template TSX-A. The panel ring-seat movement uses `deliberate` (`stiffness: 250, damping: 25`) instead of `snappy` because panels traverse a larger distance (ring-width radius) and a slightly softer spring prevents overshoot from feeling like jitter at the destination.

> **Coordination with §2.4 (GSAP) and §2.7 (TSX ↔ CSS coupling)**: Phase 4 edits this same file for the GSAP `tl.fromTo` call at lines 48-57 (§2.4) AND the hardcoded `panelW`/`panelH` at lines 70-71 (§2.7). All three edits land in **one** `PlayerRing.tsx` commit per §3 ordering.

#### §2.3.23 — `FloatingActionButton.tsx` (Phase-2-created, Phase-4-authored)

**Site**: `src/client/player/FloatingActionButton.tsx` — the transition prop inside the `m.button` that wraps the button content.

Phase 2 §2.3.7 creates this file with the interface declared but the body marked "execution fills in." Phase 4 authors the transition prop as part of that execution.

**Expected TSX structure** (Phase 2 created, Phase 4 adds the one transition line):
```tsx
import { m, AnimatePresence } from 'motion/react'
import { MOTION } from '@client/shared/tokens/motion'  // ← Phase 4 adds
import styles from './FloatingActionButton.module.css'

interface FloatingActionButtonProps {
  variant: 'intercept' | 'nope'
  visible: boolean
  onClick: () => void
  remainingMs?: number
}

export function FloatingActionButton({
  variant, visible, onClick, remainingMs,
}: FloatingActionButtonProps) {
  const isUrgent = remainingMs != null && remainingMs < 3000

  return (
    <AnimatePresence>
      {visible && (
        <m.button
          key={variant}
          className={`${styles.fab} ${styles[variant]} ${isUrgent ? styles.urgent : ''}`}
          onClick={onClick}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={MOTION.snappy}  // ← Phase 4 adds
          aria-label={variant === 'intercept' ? 'Intercept' : 'Nope'}
        >
          {variant === 'intercept' ? 'INTERCEPT' : 'NOPE'}
        </m.button>
      )}
    </AnimatePresence>
  )
}
```

**Why `MOTION.snappy` here**: The FAB is a small panel that appears during the intercept window. Quick entrance matches the time pressure of the intercept mechanic (2.5-second window). `MOTION.snappy` (`stiffness: 300, damping: 24`) gives the button a confident pop-in without overshoot — users need to read the label instantly and move to tap it.

> **Phase 2/4 boundary**: Phase 2 **may** have already authored this transition prop with `MOTION.snappy` during execution (Phase 2 §2.3.7's "execution fills in" note permits this). If so, Phase 4 verifies the prop is correct and does not duplicate the edit. The §3 execution order has Phase 4 read the file first and only edit if the transition prop is missing or uses a different preset.

---

### §2.4 — 2 GSAP call sites

**Actual audited count: 2 call-site files, 3 literal-timing tweens** (see §1.1 correction 2).

GSAP consumes `duration` as Number (same type constraint as Framer Motion), so the `MOTION_DURATIONS` TS export is directly usable. GSAP eases are string identifiers parsed by GSAP's own `ease` registry (`power2.out`, `back.out(1.4)`, etc.) and are **not** interchangeable with CSS `cubic-bezier()` values or Framer Motion `[n,n,n,n]` tuples. Phase 4 therefore migrates **only the durations** to token references and leaves the GSAP ease strings as literals. This is an explicit, documented, narrow exception — not a gap.

> **Research insight (deepening):** GSAP's `back.out(1.4)` uses overshoot that extends beyond the 0-1 range — a single `cubic-bezier()` quadruple cannot represent this because cubic-bezier curves are monotonic between control points. `power2.out` and `power2.in` have approximate CSS equivalents (`cubic-bezier(0.5, 1, 0.89, 1)` and `cubic-bezier(0.55, 0.085, 0.68, 0.53)` respectively) but converting them would introduce subtle visual changes with zero architectural benefit. Confirmed via GSAP v3 documentation (Context7) and CSS Easing Level 2 spec. The GSAP ease strings ARE the tokens within GSAP's ecosystem — migrating them would be lossy double-tokenization.

#### §2.4.1 — `PlayerRing.tsx:48-57` (turn-transition fromTo)

**Site**: `src/client/board/PlayerRing.tsx:48-57`

**Current:**
```tsx
// Line 3:
import gsap from 'gsap'

// Lines 40-58 (GSAP turn transition effect):
useEffect(() => {
  if (!currentPlayerId || currentPlayerId === prevActiveRef.current) return
  prevActiveRef.current = currentPlayerId

  const activeEl = slotRefs.current.get(currentPlayerId)
  if (!activeEl) return

  const tl = gsap.timeline()
  tl.fromTo(activeEl, {
    scale: 1.12,
    filter: 'brightness(1.6)',
  }, {
    scale: 1,
    filter: 'brightness(1)',
    duration: 0.5,
    ease: 'power2.out',
  })
}, [currentPlayerId])
```

**Replacement:**
```tsx
// Line 3:
import gsap from 'gsap'
// Line 5 (already edited by §2.3.22):
import { MOTION, MOTION_DURATIONS } from '@client/shared/tokens/motion'

// Lines 40-58:
useEffect(() => {
  if (!currentPlayerId || currentPlayerId === prevActiveRef.current) return
  prevActiveRef.current = currentPlayerId

  const activeEl = slotRefs.current.get(currentPlayerId)
  if (!activeEl) return

  const tl = gsap.timeline()
  tl.fromTo(activeEl, {
    scale: 1.12,
    filter: 'brightness(1.6)',
  }, {
    scale: 1,
    filter: 'brightness(1)',
    // GSAP ease strings are parsed by GSAP's own registry and have no
    // cubic-bezier equivalent; left as a literal. Duration consolidated.
    duration: MOTION_DURATIONS.slow,  // was 0.5
    ease: 'power2.out',
  })
}, [currentPlayerId])
```

**Why**: `0.5s` → `MOTION_DURATIONS.slow` (`0.4s`). The turn-highlight pulse on the active player's ring slot is a medium-length attention-grab; `slow` (400ms) matches the intent of "let the eye find the new active slot" without being so long that it delays gameplay. The 100ms reduction (500 → 400) is imperceptible on a lightness-pulse effect. The `power2.out` easing stays as-is — it's GSAP's "ease-out with quadratic curve," which is roughly `cubic-bezier(0.5, 1, 0.89, 1)` and has no exact match in `MOTION_EASINGS`. Migrating it would require a new easing entry and all the cross-phase token-addition ceremony for zero visual gain.

**Import addendum**: `MOTION_DURATIONS` must be exported from `tokens/motion` and imported alongside `MOTION`. Phase 1 §2.6 already exports it. The import line in `PlayerRing.tsx` becomes `import { MOTION, MOTION_DURATIONS } from '@client/shared/tokens/motion'`.

#### §2.4.2 — `DramaOverlay.tsx:120-124` (slam-in fromTo)

**Site**: `src/client/shared/DramaOverlay.tsx:120-124`

**Current:**
```tsx
// Lines 107-128:
const tl = gsap.timeline({
  onComplete: () => {
    animatingRef.current = false
    gsap.set(overlay, { opacity: 0, pointerEvents: 'none' })
    gsap.set(text, { opacity: 0 })
    processQueue()
  },
})

// SLAM IN: fast scale + opacity, dramatic entrance
tl.set(overlay, { opacity: 1, pointerEvents: 'none' })
tl.fromTo(
  text,
  { scale: 2.5, opacity: 0, y: 20 },
  { scale: 1, opacity: 1, y: 0, duration: 0.25, ease: 'back.out(1.4)' },
)
// HOLD: dramatic beat
tl.to({}, { duration: config.holdMs / 1000 })
// FADE OUT: graceful exit
tl.to(overlay, { opacity: 0, duration: 0.4, ease: 'power2.in' })
```

**Replacement** (covers §2.4.2 `fromTo` and §2.4.3 `to` — both edits in one block for readability):
```tsx
// Imports — add MOTION_DURATIONS:
import { useRef, useEffect, /* existing */ } from 'react'
import gsap from 'gsap'
import { MOTION_DURATIONS } from '@client/shared/tokens/motion'
// ... rest of existing imports

// Lines 107-128:
const tl = gsap.timeline({
  onComplete: () => {
    animatingRef.current = false
    gsap.set(overlay, { opacity: 0, pointerEvents: 'none' })
    gsap.set(text, { opacity: 0 })
    processQueue()
  },
})

// SLAM IN: fast scale + opacity, dramatic entrance
tl.set(overlay, { opacity: 1, pointerEvents: 'none' })
tl.fromTo(
  text,
  { scale: 2.5, opacity: 0, y: 20 },
  {
    scale: 1,
    opacity: 1,
    y: 0,
    // GSAP ease: 'back.out(1.4)' is overshoot-and-settle; no cubic-bezier
    // equivalent. Duration consolidated; ease string stays as literal.
    duration: MOTION_DURATIONS.base,  // was 0.25
    ease: 'back.out(1.4)',
  },
)
// HOLD: dynamic — config.holdMs is runtime-derived, not a literal
tl.to({}, { duration: config.holdMs / 1000 })
// FADE OUT: graceful exit
tl.to(overlay, {
  opacity: 0,
  // GSAP ease: 'power2.in' is an accelerate curve; no cubic-bezier equivalent
  duration: MOTION_DURATIONS.slow,  // was 0.4
  ease: 'power2.in',
})
```

**Why §2.4.2 (`0.25` → `MOTION_DURATIONS.base`)**: The DramaOverlay slam-in is a "base-tempo" entrance — fast enough to read as sudden, slow enough to feel intentional. `MOTION_DURATIONS.base = 0.25` is an exact match for the original value. This is the only site in the codebase consuming `MOTION_DURATIONS` for a base-tempo GSAP tween, so the rename is cosmetic but eliminates the literal.

**Why the `back.out(1.4)` ease stays literal**: GSAP's `back.out` is an overshoot-and-settle curve that extends below 0 and above 1 — a single `cubic-bezier()` quadruple cannot represent overshoot, because cubic-bezier curves are monotonic. The `1.4` parameter tunes the overshoot amount. Converting this to `MOTION_EASINGS.anticipate` (`[0.68, -0.55, 0.265, 1.55]`, which DOES overshoot) is tempting but wrong: `anticipate` is an **anticipation-and-overshoot** curve (dip below zero before climbing past one), whereas `back.out` is **ease-out-with-overshoot** (no anticipation, just the overshoot phase). They read differently. Leave it alone.

#### §2.4.3 — `DramaOverlay.tsx:128` (fade-out to)

**Site**: `src/client/shared/DramaOverlay.tsx:128`

Shown as part of the §2.4.2 replacement block above. The isolated summary:

**Current:**
```tsx
tl.to(overlay, { opacity: 0, duration: 0.4, ease: 'power2.in' })
```

**Replacement:**
```tsx
tl.to(overlay, {
  opacity: 0,
  duration: MOTION_DURATIONS.slow,  // was 0.4
  ease: 'power2.in',
})
```

**Why**: `0.4s` → `MOTION_DURATIONS.slow` (`0.4s`). Exact match; rename is cosmetic. The `power2.in` ease (`cubic-bezier(0.55, 0.085, 0.68, 0.53)` approx) is an accelerate curve close to `MOTION_EASINGS.accelerate` but not identical. Leaving it literal for the same reason as §2.4.2's `back.out` — the GSAP string tokens are Parser-level, not value-level.

> **`tl.to({}, { duration: config.holdMs / 1000 })` at line 126**: left untouched. The duration is a runtime-derived value (`config.holdMs / 1000`), not a literal to consolidate. A clarifying comment is added above this line: `// HOLD: dynamic — config.holdMs is runtime-derived, not a literal`.

---

### §2.5 — 15 CSS @keyframes duration edits

**Actual audited count: 4 surgical edits** after Phase 2/3 rewrites (see §1.1 correction 3). The four remaining sites are all instances where Phase 2 left a raw `ease-in-out` keyword (3 sites) or a raw `1.5s` duration (1 site) in an `animation:` shorthand declaration. Phase 4 replaces the raw keyword/value with a motion token.

Each §2.5 edit follows template CSS-S (§2.2) — surgical one-property edit inside an already-token-consuming `animation:` shorthand.

#### §2.5.1 — `SmartActionBox.module.css` `.draw` `animation:` ease keyword

**File**: `src/client/player/SmartActionBox.module.css` (Phase 2 §2.3.3 rewrite)

**Approximate line**: ~527 (post-Phase-2 line count; verify at Phase 4 execution time)

**Current:**
```css
.draw {
  /* ... other properties ... */
  animation: breathe var(--motion-duration-essential-pulse) ease-in-out infinite alternate;
}
```

> **Deepening correction (Blocker 2):** Phase 2 deepening changed this from `--motion-duration-dramatic` to `--motion-duration-essential-pulse` because breathing animations are gameplay-essential signals that must survive `prefers-reduced-motion: reduce`.

**Replacement:**
```css
.draw {
  /* ... other properties ... */
  animation: breathe var(--motion-duration-essential-pulse) var(--motion-ease-base) infinite alternate;
}
```

**Why**: `ease-in-out` (CSS built-in, approximately `cubic-bezier(0.42, 0, 0.58, 1)`) → `var(--motion-ease-base)` (`cubic-bezier(0.4, 0, 0.2, 1)`). The two curves are perceptually identical on a 800ms breathing glow — both are symmetric ease-in-out with sub-2% delta in the interior control points. Consolidating to the token means the breathing effect shares a single easing source with every other animation in the app; a future tuning in Phase 5 visual review changes it in one place.

#### §2.5.2 — `SmartActionBox.module.css` `.drawIntense` `animation:` ease keyword

**File**: `src/client/player/SmartActionBox.module.css`

**Approximate line**: ~545

**Current:**
```css
.drawIntense {
  /* ... other properties ... */
  animation: breatheIntense var(--motion-duration-essential-pulse) ease-in-out infinite alternate;
}
```

> **Deepening correction (Blocker 2):** Same as §2.5.1 — Phase 2 deepening changed this from `--motion-duration-base` to `--motion-duration-essential-pulse`.

**Replacement:**
```css
.drawIntense {
  /* ... other properties ... */
  animation: breatheIntense var(--motion-duration-essential-pulse) var(--motion-ease-base) infinite alternate;
}
```

**Why**: same as §2.5.1. The "intense" variant is a faster breathing pulse that activates when the draw pile is low (≤5 cards); the easing unification is the same edit applied to a different duration token.

#### §2.5.3 — `FloatingActionButton.module.css` `.urgent` `animation:` ease keyword

**File**: `src/client/player/FloatingActionButton.module.css` (Phase 2 §2.3.7 rewrite)

**Approximate line**: ~826

**Current:**
```css
.urgent {
  animation: fabPulse var(--motion-duration-essential-pulse) ease-in-out infinite alternate;
}
```

> **Deepening correction (Blocker 2):** Same as §2.5.1 — Phase 2 deepening changed this from `--motion-duration-dramatic` to `--motion-duration-essential-pulse`.

**Replacement:**
```css
.urgent {
  animation: fabPulse var(--motion-duration-essential-pulse) var(--motion-ease-base) infinite alternate;
}
```

**Why**: same as §2.5.1. The `.urgent` class activates on the FAB during the intercept window's last 3 seconds — a breathing pulse that ratchets visual urgency. Token consolidation.

#### ~~§2.5.4~~ — REMOVED (deepening pass)

> **Deepening correction (Blocker 3):** This section previously specified a `1.5s` → `var(--motion-duration-dots)` edit for `JoinScreen.module.css`. Phase 2 deepening already performs this tokenization in its full-file rewrite of JoinScreen.module.css (Phase 2 Enhancement Summary item 6). Phase 1 deepening committed `--motion-duration-dots: 1500ms` (commit `ba6f18ce`). No Phase 4 action needed for this site. The §7.1 debate (Option A vs Option B) is also moot — Phase 1 committed Option A.

#### §2.5 verification grep (run after the three edits above)

```bash
# Confirm no remaining raw duration or easing literals in @keyframes/animation declarations
rg --type css -n 'animation:\s+\w+\s+(\d+\.?\d*(?:s|ms))' src/client/
rg --type css -n 'animation:\s+\w+\s+var\(--[^)]+\)\s+(ease|ease-in|ease-out|ease-in-out)\b' src/client/
```

Expected: zero matches. Any match is a Phase-2/3 straggler or a regression and must be migrated before the §2.5 commit. **Deepening fix:** `linear` removed from grep 2 — `linear` is an acceptable CSS keyword (no easing applied, e.g., spinners) and `steps(...)` is also acceptable (distinct timing-function family from cubic-bezier eases). Both are allowed through.

> **Research insight (deepening):** CSS `var()` in `animation:` shorthand has **zero runtime cost** for infinite animations. The browser resolves `var(--motion-ease-base)` once at computed-value time when the style is applied, then uses the resolved `cubic-bezier()` for the animation's entire lifetime. No per-frame re-resolution. (Verified against CSS Custom Properties Level 1 spec, §3.)

---

### §2.6 — 13 CSS transition declaration edits

**Actual audited count: 0 surgical edits + 1 verification grep gate** (see §1.1 correction 4).

Every `.module.css` file that Phase 2 and Phase 3 rewrote consumes `var(--motion-duration-*)` + `var(--motion-ease-*)` on every `transition:` declaration. Phase 4's job is to **verify** this is still true after Phase 2/3 land, and to catch any accidental regression (a literal that survived review or a new `transition:` declaration that a Phase 2/3 rewrite missed).

#### §2.6.1 — Verification grep

```bash
# Fail if any module.css file contains a bare seconds literal in a transition declaration
rg --type css -n 'transition:\s*[\w-]+\s+\d+\.?\d*(?:s|ms)' src/client/
```

Expected: zero matches. Any match is either:
1. A Phase 2/3 straggler that slipped past review — fix by adding the token in-place.
2. A deliberate landmine preservation — `transition: none` on `[data-selected]` in `MinimalCard.module.css` per Phase 3 §5 landmine 5. The grep pattern excludes `none` (it requires a digit), so this is not a false positive.
3. A regression introduced between Phase 2/3 landing and Phase 4 starting — fix at the source.

#### §2.6.2 — No-shorthand-without-ease grep

```bash
# Fail if any .module.css file has a transition that uses a duration token but no easing token
rg --type css -n 'transition:\s*[\w-]+\s+var\(--motion-duration-[^)]+\)\s*;' src/client/
```

Expected: zero matches. A bare `transition: width var(--motion-duration-base);` (no easing spec) falls back to CSS's default `ease` curve (`cubic-bezier(0.25, 0.1, 0.25, 1)`), which is NOT one of the `--motion-ease-*` tokens. Phase 4 enforces the pair: every `transition:` that specifies a token duration also specifies a token ease, or uses `linear` (explicit) for the no-easing case.

#### §2.6.3 — Correction step

If either grep returns matches, Phase 4 adds the correction as an inline edit to the relevant `.module.css` file and re-runs both greps before committing. Both greps must return zero before the §3 `animation-config.ts` deletion step.

---

### §2.7 — PlayerRing TSX ↔ CSS coupling resolution

**Site**: `src/client/board/PlayerRing.tsx:70-71` (hardcoded `panelW` / `panelH`) coupled with `src/client/board/PlayerRing.module.css` `--size-player-panel-width` / `--size-player-panel-height` (Phase 3 §2.3.3 introduces these tokens).

**The problem** (from Phase 3 §5 landmine 1): Phase 3 rewrites `PlayerRing.module.css` so panel dimensions derive from `--size-player-panel-width` (a `clamp(...vw...)` token defined in `semantic.board.css`). But `PlayerRing.tsx:70-71` hardcodes the same dimensions as TSX literals:

```tsx
const isLargeTV = dimensions.w >= 1600
const isTV = dimensions.w >= 1280
const vwPanel = dimensions.w * 0.22
const panelW = isLargeTV ? Math.min(420, vwPanel) : isTV ? Math.min(320, vwPanel) : 200
const panelH = isLargeTV ? panelW * 0.33 : isTV ? panelW * 0.35 : 90
```

These numbers (`420`, `320`, `200`, `0.22`, `0.33`, `0.35`, `90`) are math-ported from the CSS clamp formula, which means **any tuning of the CSS token requires a coordinated edit of the TSX math** or the ring panels and the layout math fall out of sync. Phase 3 explicitly preserved the landmine because resolving it during Phase 3 would have required either (a) hardcoding the same values in TSX and CSS (already the case, already landmined), or (b) reading computed CSS values from TSX via `getComputedStyle`, which is a cross-concern Phase 3 declined to own.

**The fix** (measurement-div pattern): Phase 4 adds a hidden `<div>` to `PlayerRing.tsx` that carries the same `width` / `height` as a real panel via CSS, measures its computed dimensions with `getBoundingClientRect()` inside the existing `ResizeObserver` callback, and exposes the result as `panelW` / `panelH` state. The TSX math now reads the CSS truth instead of duplicating it.

#### §2.7.1 — TSX edit

**Current (lines 19-38 of `PlayerRing.tsx`):**
```tsx
export const PlayerRing = memo(function PlayerRing({
  players, currentPlayerId, turnsRemaining,
}: PlayerRingProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 })
  const prevActiveRef = useRef<string | null>(null)
  const slotRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return

    const ro = new ResizeObserver(([entry]) => {
      if (!entry) return
      const { width, height } = entry.contentRect
      setDimensions(prev => {
        if (Math.abs(prev.w - width) < 2 && Math.abs(prev.h - height) < 2) return prev
        return { w: width, h: height }
      })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
```

**Replacement** (adds a `measureRef` + measurement into the ResizeObserver callback):
```tsx
export const PlayerRing = memo(function PlayerRing({
  players, currentPlayerId, turnsRemaining,
}: PlayerRingProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)  // ← NEW: hidden measurement element
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 })
  const [panelSize, setPanelSize] = useState({ w: 0, h: 0 })  // ← NEW: read from CSS
  const prevActiveRef = useRef<string | null>(null)
  const slotRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  useLayoutEffect(() => {
    const el = containerRef.current
    const measureEl = measureRef.current
    if (!el || !measureEl) return

    // Synchronous first read — before any observer callback, before paint.
    // useLayoutEffect fires after DOM insertion but before paint, so the
    // browser has already computed layout for the measurement div. This
    // eliminates the first-frame {w:0,h:0} jitter that would cause panels
    // to spring ~140px from incorrect positions. (Deepening fix — Warning 4.)
    const initialRect = measureEl.getBoundingClientRect()
    if (initialRect.width > 0) {
      setPanelSize({ w: initialRect.width, h: initialRect.height })
    }

    const ro = new ResizeObserver(([entry]) => {
      if (!entry) return
      const { width, height } = entry.contentRect
      setDimensions(prev => {
        if (Math.abs(prev.w - width) < 2 && Math.abs(prev.h - height) < 2) return prev
        return { w: width, h: height }
      })
      // Read CSS-computed panel dimensions from the hidden measurement div.
      // The measurement div's size is driven by --size-player-panel-width /
      // --size-player-panel-height, which respond to container width via clamp(vw).
      // Note: React 19 auto-batches both setState calls into one re-render,
      // even inside ResizeObserver callbacks (verified against react.dev docs).
      const panelRect = measureEl.getBoundingClientRect()
      setPanelSize(prev => {
        if (Math.abs(prev.w - panelRect.width) < 2 && Math.abs(prev.h - panelRect.height) < 2) return prev
        return { w: panelRect.width, h: panelRect.height }
      })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
```

**Delete lines 66-71 (the hardcoded panelW/panelH block):**
```tsx
// DELETE these lines:
// Panel dimensions for centering — matches CSS vw-based media queries
const isLargeTV = dimensions.w >= 1600
const isTV = dimensions.w >= 1280
const vwPanel = dimensions.w * 0.22
const panelW = isLargeTV ? Math.min(420, vwPanel) : isTV ? Math.min(320, vwPanel) : 200
const panelH = isLargeTV ? panelW * 0.33 : isTV ? panelW * 0.35 : 90
```

**Replace with:**
```tsx
// Panel dimensions are read from CSS via a hidden measurement div — see JSX below.
// The measurement div consumes --size-player-panel-width / --size-player-panel-height,
// so CSS is the single source of truth.
const panelW = panelSize.w
const panelH = panelSize.h
```

**Add the measurement div to the JSX** (inside the `<div ref={containerRef}>` block, immediately after the opening tag):
```tsx
return (
  <div ref={containerRef} className={styles.ring}>
    {/* Hidden measurement element — consumes --size-player-panel-width /
        --size-player-panel-height so layout math can read the CSS truth. */}
    <div ref={measureRef} className={styles.measurePanel} aria-hidden="true" />

    <AnimatePresence mode="sync">
      {/* ... existing panel map ... */}
```

#### §2.7.2 — CSS edit (`PlayerRing.module.css` addition)

**Add the `.measurePanel` rule** to `src/client/board/PlayerRing.module.css`. The rule creates an off-screen element that consumes the same width/height tokens as `.panel`, so `getBoundingClientRect()` returns the current clamp-computed values.

```css
/*
 * Hidden measurement element consumed by PlayerRing.tsx via a ref.
 * Exists solely so TSX layout math can read the CSS panel dimensions
 * without duplicating the clamp formula in TypeScript.
 * Not visible, not interactive, not part of the visual ring.
 */
.measurePanel {
  position: absolute;
  top: 0;
  left: 0;
  width: var(--size-player-panel-width);
  height: var(--size-player-panel-height);
  visibility: hidden;
  pointer-events: none;
  z-index: var(--z-base);
}
```

**Why**:
- `visibility: hidden` (not `display: none`) so the browser still computes layout dimensions.
- `pointer-events: none` so the invisible div can't swallow clicks on the panels beneath.
- `position: absolute` + `top/left: 0` so it doesn't displace the ring layout — it occupies the same top-left corner as any other absolute child but is never seen.
- `z-index: var(--z-base)` keeps it at the lowest elevation tier, below all real panels.
- `aria-hidden="true"` on the TSX side (see §2.7.1) removes it from the accessibility tree — screen readers never encounter it.

> **Research insight (deepening):** The measurement-div pattern is the **only reliable mechanism** for resolving `clamp()`-based CSS tokens to pixel values in JavaScript. `getComputedStyle(el).getPropertyValue('--size-player-panel-width')` returns the raw `clamp()` string (e.g., `"clamp(12.5rem, 17.5vw, 26.25rem)"`), NOT resolved pixels. CSS Typed OM (`computedStyleMap`) has the same limitation — returns `CSSUnparsedValue`. The measurement div forces the browser to resolve the token through its normal layout engine, then `getBoundingClientRect()` reads the result. (Verified against MDN, W3C CSS Custom Properties Level 1 spec, CSS Typed OM spec.)
>
> **Alternative considered and rejected:** Reading `getBoundingClientRect()` from an existing panel element via `slotRefs` (simpler — no hidden div needed). Rejected because GSAP applies `scale: 1.12` to the active panel during turn-transition effects (§2.4.1), which contaminates `getBoundingClientRect()` width/height during the tween. The measurement div is never animated, so its dimensions always reflect the CSS truth.

#### §2.7.3 — Phase 3 dependency note

`--size-player-panel-width` and `--size-player-panel-height` must be defined in `semantic.board.css` before the measurement div can read them. **Both tokens are already committed by Phase 1 deepening** (commit `ba6f18ce`, Enhancement Summary item 7). Phase 3 §7.3 originally flagged `--size-player-panel-width`; Phase 1 deepening added both width and height tokens to `semantic.board.css`. No Phase 4 amendment needed — see §7.2 (marked RESOLVED).

#### §2.7.4 — Behavior verification

After the edit lands:
1. Resize the dev server (`pnpm dev`) at 1024px, 1280px, 1600px, 1920px, 2560px widths (via devtools responsive mode).
2. Confirm the ring panel positions stay centered around each `pos.x / pos.y` point at every breakpoint.
3. Confirm no "jitter" in panel positions during a resize — the `Math.abs(...) < 2` dedupe in the observer callback prevents sub-pixel re-renders.

#### §2.7.5 — Landmine preservation

The old `dimensions.w >= 1280` / `>= 1600` breakpoint constants are **deleted** from TSX. If a future engineer needs to branch on board-width class (e.g., to hide the `turnsRemaining` badge on ≤1280px boards), that branch should consume a new `BOARD_BREAKPOINTS.tv: 1280` / `BOARD_BREAKPOINTS.largeTv: 1600` export from `@client/shared/tokens/breakpoints.ts` — a Phase 4 follow-up if needed, flagged to `/deepen-plan` under §7.3.

---

### §2.8 — Unique springs consumption

Two spring tuples in the audit are **unique** — they appear exactly once in the codebase and encode a one-off feel:

| Literal | Named spring | Site |
|---|---|---|
| `{ stiffness: 400, damping: 15 }` | `MOTION.punchy` (alias of `MOTION_SPRINGS.punchy`) | `EliminatedView.tsx:34` (§2.3.8) |
| `{ stiffness: 200, damping: 20 }` | `MOTION.gentle` (alias of `MOTION_SPRINGS.gentle`) | `GameOver.tsx:52` (§2.3.2) |

**Phase 1 §2.6 already names both springs.** Phase 4 does not author new names — it only **consumes** them. The TSX edits at §2.3.2 (`GameOver.tsx:52`) and §2.3.8 (`EliminatedView.tsx:34`) replace the literal spring objects with `MOTION.gentle` and `MOTION.punchy` respectively. No Phase 1 amendment needed.

**Why both springs live at `MOTION.*` AND `MOTION_SPRINGS.*`**: Phase 1 §2.6 exports springs twice — once under `MOTION_SPRINGS` (the canonical home) and again under `MOTION` (the combined preset scale). The `MOTION` re-export means a component that uses both a duration preset (`MOTION.enter`) and a spring (`MOTION.gentle`) can import a single symbol (`MOTION`) instead of two. The duplication is intentional, not a smell.

**Rejection of `SPRING` namespace**: An alternative naming was `SPRING.punchy` and `SPRING.gentle` (drop the `MOTION_SPRINGS` prefix). Phase 1 rejected this because it required a third import site per component (`MOTION` + `SPRING`) and because the semantic grouping ("everything motion-related under MOTION") reads cleaner to new readers. Phase 4 inherits this decision.

---

### §2.9 — Literal duplicates removal

Two sites in `GameOver.tsx` contain spring literals that are **exact numerical duplicates** of named presets:

| Site | Literal | Named equivalent | §2.3 entry |
|---|---|---|---|
| `GameOver.tsx:80` | `{ stiffness: 300, damping: 24 }` | `MOTION.snappy` | §2.3.4 |
| `GameOver.tsx:101` | `{ stiffness: 250, damping: 25 }` | `MOTION.deliberate` | §2.3.5 |

**Why duplicates exist in the pre-Phase-4 codebase**: `GameOver.tsx` was authored before `animation-config.ts` existed. The literals were copy-pasted from an earlier prototype and never migrated. When `animation-config.ts` was added later, `MOTION.SNAPPY` and `MOTION.DELIBERATE` became available, but the existing inline literals were never updated because there was no CI gate catching drift.

**Phase 4's fix** is §2.3.4 + §2.3.5 + the global rename: the duplicates are replaced with `MOTION.snappy` / `MOTION.deliberate` as part of the per-site migration. There is no "separate §2.9 commit" — the duplicate removal happens inside the same commit that migrates the `GameOver.tsx` file.

**§2.9 also catches any future duplicates introduced between Phase 4 authoring and Phase 4 execution.** The verification grep below runs as part of §3 step 13:

```bash
# Fail if any TSX file contains an inline spring literal that's a numerical match of a named MOTION_SPRINGS entry
rg -nP "stiffness:\s*(200|250|300|400).*damping:\s*(15|20|24|25)" src/client/
```

Expected: zero matches after Phase 4 lands. If the grep catches a new site (maybe a Phase 2 or Phase 3 TSX edit accidentally reintroduced a literal), fix it in the same commit before proceeding to the `animation-config.ts` deletion step.

---

## §3 — Step-by-Step Execution Order

Phase 4 is 20 steps, organized so each commit is independently revertible. Each step ends at a commit point. The ordering minimizes file-contention risk — files that Phase 2 or Phase 3 ALSO edit (EliminatedView.tsx, GameOver.tsx, PlayerRing.tsx) come AFTER Phases 2 and 3 are fully merged.

**Prerequisite**: Phases 1, 2, and 3 all landed and all tests green. `pnpm test` + `pnpm typecheck` + `pnpm lint` + `pnpm build` clean on main branch before starting Phase 4.

**Step 1** — Verify Phase 1 `tokens/motion.ts` exports match Phase 4 expectations. Run `grep -n 'export const MOTION' src/client/shared/tokens/motion.ts` and confirm `MOTION_DURATIONS`, `MOTION_EASINGS`, `MOTION_SPRINGS`, `MOTION` are all exported. If any are missing, that's a Phase 1 deepening gap — fix in Phase 1 before Phase 4 proceeds.

**Step 2** — Verify Phase 1 `primitives.css` CSS motion custom properties match `motion.ts`. Run `pnpm test src/client/shared/tokens/__tests__/motion-token-sync.test.ts` and confirm green. Any failure blocks Phase 4 execution.

**Step 3** — Verify Phase 3 `semantic.board.css` defines `--size-player-panel-width` AND `--size-player-panel-height` (§2.7 dependency). If `--size-player-panel-height` is missing, that's a Phase 1 deepening gap — add the token in Phase 1 during deepening before Phase 4 execution (§7.2 flag).

**Step 4** — Edit `src/client/shared/BottomSheet.tsx` per §2.3.1. Run `pnpm typecheck` + `pnpm lint`. **Commit**: `feat(css-foundation): Phase 4 §2.3.1 — BottomSheet consumes MOTION.snappy from tokens/motion`.

**Step 5** — Edit `src/client/shared/GameOver.tsx` per §2.3.2 + §2.3.3 + §2.3.4 + §2.3.5 + §2.3.6. All five sites land in one commit because they share an import. Run `pnpm typecheck` + `pnpm lint`. **Commit**: `feat(css-foundation): Phase 4 §2.3.2-§2.3.6 — GameOver.tsx consumes MOTION preset scale (gentle, enter, snappy, deliberate)`.

**Step 6** — Edit `src/client/board/AnnouncementFeed.tsx` per §2.3.7. **Commit**: `feat(css-foundation): Phase 4 §2.3.7 — AnnouncementFeed consumes MOTION.enter`.

**Step 7** — Edit `src/client/player/EliminatedView.tsx` per §2.3.8 + §2.3.9 + §2.3.10 + §2.3.11 + §2.3.12. Five sites in one commit. **Coordination note**: Phase 2 §2.3.9a already edited lines 8-17 (flavor pool) and line 45 (title text) before Phase 4 starts. The transition-prop edits at lines 34, 43, 52, 61, 78 touch different lines — no conflict. Run `pnpm typecheck` + `pnpm lint`. **Commit**: `feat(css-foundation): Phase 4 §2.3.8-§2.3.12 — EliminatedView.tsx consumes MOTION preset scale (punchy, snappy, enter)`.

**Step 8** — Edit `src/client/player/Hand.tsx` per §2.3.13 + §2.3.14 + §2.3.15. Three sites in one commit. **Commit**: `feat(css-foundation): Phase 4 §2.3.13-§2.3.15 — Hand.tsx consumes MOTION.snappy + MOTION.enter`.

**Step 9** — Edit `src/client/player/StagingArea.tsx` per §2.3.16 + §2.3.17 + §2.3.18. Three sites in one commit. **Commit**: `feat(css-foundation): Phase 4 §2.3.16-§2.3.18 — StagingArea.tsx consumes MOTION.snappy + MOTION.enter`.

**Step 10** — Edit `src/client/board/Lobby.tsx` per §2.3.19. **Commit**: `feat(css-foundation): Phase 4 §2.3.19 — Lobby.tsx consumes MOTION.snappy`.

**Step 11** — Edit `src/client/player/ErrorToast.tsx` per §2.3.20. **Commit**: `feat(css-foundation): Phase 4 §2.3.20 — ErrorToast.tsx consumes MOTION.quickFade`.

**Step 12** — Edit `src/client/player/SmartActionBox.tsx` per §2.3.21. Two transition sites + one local-constant deletion in a single commit. **Commit**: `feat(css-foundation): Phase 4 §2.3.21 — SmartActionBox.tsx consumes MOTION.quickFade (delete local TRANSITION const)`.

**Step 13** — Edit `src/client/player/FloatingActionButton.tsx` per §2.3.23. If Phase 2 already authored the transition prop with `MOTION.snappy`, **verify only** and skip this commit. If the prop is missing or uses a different preset, author the edit. Run `pnpm typecheck` + `pnpm lint`. **Commit** (conditional): `feat(css-foundation): Phase 4 §2.3.23 — FloatingActionButton.tsx consumes MOTION.snappy`.

**Step 14** — Edit `src/client/board/PlayerRing.tsx` per §2.3.22 + §2.4.1 + §2.7.1. Three edits in one commit: the FM transition-prop rename, the GSAP duration migration, AND the measurement-div coupling resolution. **PlayerRing is the most surgical file in Phase 4** — all three edits need coordinated review. Also edit `src/client/board/PlayerRing.module.css` per §2.7.2 (add `.measurePanel` rule) in the same commit. Run `pnpm typecheck` + `pnpm lint` + `pnpm test` (spot-check). **Commit**: `feat(css-foundation): Phase 4 §2.3.22 + §2.4.1 + §2.7 — PlayerRing consumes MOTION.deliberate + MOTION_DURATIONS.slow + measurement-div coupling`.

**Step 15** — Edit `src/client/shared/DramaOverlay.tsx` per §2.4.2 + §2.4.3. Both GSAP tweens in one commit. **Commit**: `feat(css-foundation): Phase 4 §2.4.2-§2.4.3 — DramaOverlay GSAP tweens consume MOTION_DURATIONS (ease strings preserved)`.

**Step 16** — Run the §2.9 duplicate-detection grep. Expected: zero matches. If any match surfaces, fix it in a dedicated commit before proceeding. If no match, skip the commit.

**Step 17** — Edit CSS files per §2.5.1 + §2.5.2 + §2.5.3. Three surgical one-property edits across two files (`SmartActionBox.module.css`, `FloatingActionButton.module.css`). ~~§2.5.4 removed during deepening — Phase 2 already tokenized JoinScreen dots.~~ Run the §2.5 verification grep + §2.6.1 + §2.6.2 verification greps. All three must return zero matches before committing. **Commit**: `feat(css-foundation): Phase 4 §2.5 — CSS animation ease keywords consume --motion-ease-base`.

**Step 18** — **Delete `src/client/shared/animation-config.ts`**. Run `grep -rn "animation-config" src/client/` and confirm zero remaining import sites. Run `pnpm typecheck` + `pnpm lint` + `pnpm test` + `pnpm build`. All green. **Commit**: `feat(css-foundation): Phase 4 §2.1 — delete src/client/shared/animation-config.ts (all consumers migrated to tokens/motion)`.

**Step 19** — **Final verification**:
- `pnpm test` — all 167 tests still green + `motion-token-sync.test.ts` still green + no new test failures.
- `pnpm typecheck` — clean.
- `pnpm lint` — clean.
- `pnpm build` — successful; phone entry bundle size delta within budget (see §8).
- Run ALL verification greps (§2.5 + §2.6.1 + §2.6.2 + §2.9) — all return zero.
- Boot dev server + smoke-test both views — phone + board render cleanly, animations play, elimination sequence plays, drama overlay plays, PlayerRing centers at four viewport widths (§2.7.4). No console errors.
- Bundle size check: phone entry ≤100KB gzipped.

**Step 20** — Tag commit: `git tag css-foundation-phase-4-complete`. No separate commit needed; just the tag.

---

## §4 — Acceptance Criteria

Phase 4 is done when **all** of the following are true:

### §4.1 Files edited and deleted

- [x] `src/client/shared/animation-config.ts` is deleted. `grep -rn "animation-config" src/client/` returns zero matches.
- [x] `src/client/shared/BottomSheet.tsx` imports from `@client/shared/tokens/motion` (not `./animation-config`) and uses `MOTION.snappy`.
- [x] `src/client/shared/GameOver.tsx` imports from `@client/shared/tokens/motion` and consumes `MOTION.gentle`, `MOTION.enter`, `MOTION.snappy`, `MOTION.deliberate`.
- [x] `src/client/shared/DramaOverlay.tsx` imports `MOTION_DURATIONS` from `@client/shared/tokens/motion` and uses it for both GSAP tweens. GSAP ease strings preserved as literals with inline comments.
- [x] `src/client/player/Hand.tsx` imports from `@client/shared/tokens/motion` and consumes `MOTION.snappy`, `MOTION.enter`.
- [x] `src/client/player/StagingArea.tsx` imports from `@client/shared/tokens/motion` and consumes `MOTION.snappy`, `MOTION.enter`.
- [x] `src/client/player/EliminatedView.tsx` imports from `@client/shared/tokens/motion` and consumes `MOTION.punchy`, `MOTION.snappy`, `MOTION.enter`. Phase 2 §2.3.9a retheme edits also present.
- [x] `src/client/player/SmartActionBox.tsx` imports from `@client/shared/tokens/motion` and consumes `MOTION.quickFade`. Local `const TRANSITION` deleted.
- [x] `src/client/player/ErrorToast.tsx` imports from `@client/shared/tokens/motion` and uses `MOTION.quickFade`.
- [x] `src/client/player/FloatingActionButton.tsx` imports from `@client/shared/tokens/motion` and uses `MOTION.snappy`.
- [x] `src/client/board/PlayerRing.tsx` imports from `@client/shared/tokens/motion` (both `MOTION` and `MOTION_DURATIONS`), consumes `MOTION.deliberate` and `MOTION_DURATIONS.slow`, AND uses the `measureRef` pattern to read panel dimensions from CSS.
- [x] `src/client/board/Lobby.tsx` imports from `@client/shared/tokens/motion` and consumes `MOTION.snappy`.
- [x] `src/client/board/AnnouncementFeed.tsx` imports from `@client/shared/tokens/motion` and uses `MOTION.enter`.

### §4.2 CSS surgical edits

- [x] `src/client/player/SmartActionBox.module.css` `.draw` and `.drawIntense` `animation:` declarations consume `var(--motion-ease-base)` instead of `ease-in-out`.
- [x] `src/client/player/FloatingActionButton.module.css` `.urgent` `animation:` consumes `var(--motion-ease-base)`.
- ~~[ ] `src/client/player/JoinScreen.module.css`~~ — **removed during deepening** (Phase 2 already tokenizes dots duration). Verify Phase 2 landed `var(--motion-duration-dots)` during Step 3 prerequisite check.
- [x] `src/client/board/PlayerRing.module.css` has a `.measurePanel` rule that consumes `--size-player-panel-width` and `--size-player-panel-height` per §2.7.2.

### §4.3 Verification greps return zero matches

- [x] §2.5 grep 1 (raw `Xs` duration literal in `animation:` shorthand): zero matches.
- [x] §2.5 grep 2 (raw `ease/ease-in/ease-out/ease-in-out` keyword in `animation:` shorthand): zero matches.
- [x] §2.6.1 grep (raw `Xs` duration literal in `transition:` declaration): zero matches.
- [x] §2.6.2 grep (`transition:` with duration token but no easing token, not `linear`): zero matches.
- [x] §2.9 grep (inline spring literal matching a named preset): zero matches.
- [x] `rg 'transition\s*=\s*\{\{\s*duration:\s*[\d.]' src/client/**/*.tsx` (any remaining inline FM duration literal): zero matches.
- [x] `rg 'MOTION\.(SNAPPY|DELIBERATE)' src/client/` (uppercase legacy preset): zero matches.
- [x] `rg "from '.*animation-config'" src/client/` (legacy import path): zero matches.

### §4.4 Tests pass

- [x] `pnpm test` — all 167+ tests still pass. `motion-token-sync.test.ts` still green.
- [x] `pnpm typecheck` — clean.
- [x] `pnpm lint` — clean.
- [x] `pnpm build` — succeeds.

### §4.5 Visual behavior verification

- [ ] Dev server (`pnpm dev` + `pnpm dev:server`) boots without errors.
- [ ] Phone view: Hand deals staggered, StagingArea stages snappy, EliminatedView skull pops (`punchy`), GameOver winner settles (`gentle`), ErrorToast fades fast (`quickFade`), SmartActionBox transitions (`quickFade`), BottomSheet snaps (`snappy`), FloatingActionButton appears (`snappy`).
- [ ] Board view: Lobby chip stagger plays (`snappy`), PlayerRing panels move with deliberate spring, PlayerRing GSAP turn-pulse plays at slow duration, DramaOverlay slam-in reads at base duration, DramaOverlay fade-out reads at slow duration, AnnouncementFeed events fade in (`enter`).
- [ ] No visual regressions: side-by-side comparison of a video recording of the same play sequence before/after Phase 4 shows no perceptible difference in any animation timing.
- [ ] PlayerRing panels center correctly at 1024px, 1280px, 1600px, 1920px, and 2560px viewport widths (§2.7.4).

### §4.6 Reduced-motion respect

- [ ] `@media (prefers-reduced-motion: reduce)` at the OS level: animations slow to or collapse to near-instant per Phase 1's reduced-motion fork.
- [ ] Loading spinner (`connectionSpin` in `ConnectionOverlay.module.css`) continues spinning — the reduced-motion fork zeros out durations, which collapses spinners to static. Per Phase 1 §5 landmine 4, this is an acceptable tradeoff for Phase 4; Phase 5 visual review may reintroduce a `useReducedMotion` exemption if testers report confusion.

### §4.7 Archer acceptance test (Phase 4 as a system)

- [ ] **"Could this look like a frame from an Archer episode?"** — applied to the full game loop (lobby → draw → staging → play → nope window → drama overlay → elimination → game over). Phase 4 doesn't change any animation's look; it changes where the timing source lives. If the answer is "yes" before Phase 4, it must still be "yes" after.

---

## §5 — Landmines

Phase 4 touches 13 files and deletes one; the landmine surface is the points where the migration could introduce a subtle regression.

1. **Framer Motion `transition.duration` is Number, not string.** You cannot write `transition={{ duration: 'var(--motion-duration-base)' }}`. Every §2.3 replacement uses a `MOTION.*` preset (a TS object that embeds the literal number), not a CSS `var()` reference. The `motion-token-sync.test.ts` CI gate enforces TS/CSS sync. Phase 1 §2.6 documented this; Phase 4 inherits and preserves.

2. **GSAP ease strings are Parser-level, not Value-level.** GSAP's `'power2.out'`, `'back.out(1.4)'`, `'power2.in'` are identifiers that GSAP's own ease registry parses at runtime — they have no exact `cubic-bezier()` equivalent. §2.4 leaves them as literals with inline comments explaining why. **Do not "complete" the migration by converting them** — the conversion is lossy and a future engineer tempted to tidy will introduce a visible bug.

3. **`useReducedMotion` on non-decorative animations.** Phase 1 §5 landmine 4 flags that globally zeroing motion durations in `@media (prefers-reduced-motion: reduce)` is aggressive — spinners and breathing glows collapse to static. Phase 4 does NOT add `useReducedMotion` hooks because the per-component exemption logic is out of scope (Phase 5 visual review decides). If Phase 5 testers report that the draw-pile breathing stops and looks broken, add `const reducedMotion = useReducedMotion()` + `animation: reducedMotion ? 'none' : var(--...)` to `SmartActionBox.module.css` as a Phase 5 patch. Not a Phase 4 concern.

4. **PlayerRing measurement-div timing.** The measurement div reads `--size-player-panel-width` via `getBoundingClientRect()` inside a `ResizeObserver` callback. If the measurement div is not yet in the DOM on the first render, `measureRef.current` is null and the callback returns early without setting `panelSize`. The first render will therefore place panels at `panelW = 0, panelH = 0` — effectively collapsing all panels to a single point. **Mitigation**: the `AnimatePresence` initial render uses `initial={false}` (already in the existing code at line 93), which skips entrance animation on mount. Panels will appear at their correct positions on the first ResizeObserver callback (which fires immediately after the observer is attached). The transition between `{w:0,h:0}` and the first real measurement is not visible because the render cycle completes before paint. Verified in the behavior check §2.7.4.

5. **Phase 2 file creation order vs Phase 4 verification.** `FloatingActionButton.tsx` is created by Phase 2 during execution, not by Phase 2's plan file. Phase 4 §2.3.23 specifies how Phase 2 execution **should** author the file. If Phase 2 execution authors it differently (e.g., with a literal `{ type: 'spring', stiffness: 300, damping: 24 }` instead of `MOTION.snappy`), Phase 4 has to backfill in Step 13. The §3 Step 13 note handles both cases.

6. **Coordinate system drift in PlayerRing.** The old TSX math (`dimensions.w * 0.22`) used viewport-width-derived values; the new measurement-div approach reads actual pixels from a DOM node. If the `ResizeObserver` triggers a re-render that causes the measurement div to resize (because the container resized), the new `panelSize` propagates synchronously via `setPanelSize`. But if the container width changes faster than the observer fires (which shouldn't happen — ResizeObserver is synchronous with layout), there's a one-frame stale panelSize. **Mitigation**: the `<2px` dedupe in both `setDimensions` and `setPanelSize` means sub-pixel jitter doesn't cause churn; only real resize events propagate. If Phase 5 testing reveals a one-frame lag during aggressive resizing, add `flushSync()` to the observer callback as a Phase 5 patch.

7. **`GameOver.tsx:115` delay-only transition fallback.** Framer Motion's default transition (when neither `type` nor `duration` is specified but `delay` IS) is a version-dependent spring. The `MOTION.enter` rewrite locks the behavior to `{ duration: 0.25, ease: 'decelerate' }` deterministically. This is a **safer** outcome than the pre-Phase-4 behavior, not a regression — but it is a behavior change in the "transition default" sense. Flagged here so future readers don't think Phase 4 "broke" the 1.5s-delay fade.

8. **Local `const TRANSITION` in SmartActionBox.** Deleting the local constant is correct but the pattern was **almost** a good shared-const — just file-scoped instead of module-scoped. Future contributors may be tempted to re-create it in other files. The §2.3.21 rationale explains why `tokens/motion` is the only allowed home; the §2.9 duplicate-detection grep catches any re-introduction attempt.

9. **`MOTION.enter` vs the original `{ duration: 0.4 }`.** Several §2.3 sites originally specified `duration: 0.4` (GameOver.tsx:61, EliminatedView.tsx:52, EliminatedView.tsx:78) and Phase 4 migrates them to `MOTION.enter` which is `duration: 0.25`. **This is a 150ms shortening** — 9 fewer frames at 60fps (24 frames → 15 frames). This is a deliberate tempo tightening, not an imperceptible change. The three sites share "secondary text reveal" intent, and the shorter entrance reads as crisper. The full list of duration changes across all Phase 4 sites: GameOver.tsx:61 (0.4→0.25), EliminatedView.tsx:52 (0.4→0.25), EliminatedView.tsx:78 (0.4→0.25), Hand.tsx:132 (0.3→0.25), StagingArea.tsx:142 (0.3→0.25), ErrorToast.tsx:25 (0.2→0.15), SmartActionBox.tsx:61+72 (0.2→0.15), PlayerRing.tsx:55 GSAP (0.5→0.4). If visual review finds the 150ms shortening reads as "rushed" for the GameOver subtitle specifically, add a new `MOTION.reveal` preset (`duration: 0.4, ease: 'decelerate'`) in Phase 5 and migrate just those three sites. Not a blocker for Phase 4.

10. **DramaOverlay GSAP timeline lacks cleanup on unmount (pre-existing).** *(Added during deepening.)* The GSAP timeline created inside `processQueue()` (`DramaOverlay.tsx:107-128`) is never killed when the component unmounts. If DramaOverlay unmounts mid-animation (game-over transition, route change), the timeline's `onComplete` callback fires on a detached component, calling `processQueue()` which reads `overlayRef.current` and `textRef.current` — both now null. The existing null check at line 98 prevents a crash but GSAP itself continues tweening a detached DOM node (a leak). This is the same class of bug as project insight #005 (stale timers need generation counters). Phase 4's scope says "no component logic changes" — correct to defer. **Phase 5 fix**: store the timeline in a ref and kill it in a useEffect cleanup: `timelineRef.current = gsap.timeline({...}); return () => { timelineRef.current?.kill() }`.

---

## §6 — Out of Scope

Phase 4 **does not** include:

- **New animation presets or easing curves.** Phase 1 §2.6 locked the motion scale. If a Phase 4 site needs a novel duration/easing combo, flag it in §7 as a Phase 1 amendment, do NOT add it ad-hoc.
- **`useReducedMotion` per-component exemptions.** Spinners and breathing glows respect the global reduced-motion fork (collapse to static). Per-component exemptions are a Phase 5 concern if visual review finds collapsed spinners confusing.
- **Any `.module.css` file rewrite.** Phase 2 owns phone-side CSS rewrites; Phase 3 owns board-side CSS rewrites. Phase 4 only edits individual CSS properties (the three §2.5 surgical edits + the one §2.7.2 rule addition).
- **FloatingActionButton.tsx body beyond the transition prop.** Phase 2 owns component authoring; Phase 4 only ensures the transition prop consumes `MOTION.snappy`.
- **Breakpoint constants in TSX.** Phase 4 deletes the `dimensions.w >= 1280` / `>= 1600` inline conditionals from `PlayerRing.tsx` but does NOT create a `BOARD_BREAKPOINTS` export. If a future component needs the breakpoints, that's a Phase 5 follow-up (§7.3 flag).
- **Visual regression screenshots.** Phase 5 owns the Playwright visual regression matrix. Phase 4's visual check is manual dev-server spot-testing (§4.5), not automated snapshot diffing.
- **iOS 26 device testing.** Phase 5.
- **First-time player test (§8.7 of spec).** Phase 5.
- **Deleting any other legacy file** beyond `animation-config.ts`. `theme.ts` + `theme.css` are Phase 1's responsibility.
- **Motion for cross-view components beyond what Phase 2/3 own.** `MinimalCard`, `GameOver`, `DramaOverlay`, `BottomSheet` are cross-view but Phase 2 or Phase 3 already rewrites each of them; Phase 4 only edits motion props inside files Phase 2/3 did not rewrite for motion.
- **Performance profiling of animations.** If Phase 4 changes perceptibly impact frame budgets, that's a Phase 5 investigation.

---

## §7 — Cross-Phase Dependencies

New Phase 1 tokens (or amendments) Phase 4 requires, to be added to `phase-1-foundation.md` during `/deepen-plan`:

### §7.1 — ~~`--motion-duration-dots` (new token OR exception)~~ — RESOLVED

**Needed for**: `JoinScreen.module.css` `.waitingDots::after` `animation: joinScreenDots 1.5s steps(4, end) infinite` — §2.5.4.

**Option A (add to scale)**: extend `MOTION_DURATIONS` and `primitives.css` with:
```typescript
// motion.ts
export const MOTION_DURATIONS = {
  instant:  0.1,
  fast:     0.15,
  base:     0.25,
  slow:     0.4,
  dramatic: 0.8,
  dots:     1.5,  // ← NEW: stepped-animation cycle (waitingDots terminal cursor)
} as const satisfies Record<string, number>;
```
```css
/* primitives.css */
--motion-duration-dots: 1500ms;
```

**Pros**: consistent "every duration lives in the scale" rule; `motion-token-sync.test.ts` covers it automatically.
**Cons**: the scale leaps from `dramatic: 800ms` to `dots: 1500ms` with a ~2x gap; the new entry is used by exactly one site and its semantic role (stepped animation cycle) is unrelated to the other scale entries (which are all smooth-curve durations).

**Option B (inline comment)**: leave the site as `1.5s` with a `/* Stepped animation cycle — not part of duration scale */` comment above.

**Pros**: avoids polluting the scale with a one-off.
**Cons**: violates the "zero hardcoded durations" rule; future grep for `[0-9]+\.?[0-9]*s` in CSS has to carve out an exception.

**`/deepen-plan` resolution:** Phase 1 deepening (commit `ba6f18ce`, 2026-04-11) committed Option A — `--motion-duration-dots: 1500ms` added to both `primitives.css` and `motion.ts` (Enhancement Summary item 7). Phase 2 deepening already consumes it in JoinScreen.module.css. §2.5.4 removed from Phase 4 scope. No Phase 4 action needed. Section retained as historical record.

### §7.2 — ~~`--size-player-panel-height` (new token)~~ — RESOLVED

**Needed for**: `PlayerRing.module.css` `.measurePanel` rule (§2.7.2) — the measurement div needs both width AND height tokens.

Phase 3 §7.3 already flags `--size-player-panel-width` as a new Phase 1 board-semantic token. Phase 4 adds the matching height token:

```css
/* semantic.board.css */
--size-player-panel-width: clamp(12.5rem, 17.5vw, 26.25rem);  /* ← from Phase 3 §7.3 */
--size-player-panel-height: clamp(5.625rem, 6.125vw, 9.1875rem);  /* ← NEW */
```

(Values derived from the old `PlayerRing.tsx` formula: `panelW = 200 / 320 / 420` at three breakpoints, `panelH = 90 / panelW*0.35 / panelW*0.33`. Phase 1 deepening may adjust the clamp curve; the point is that BOTH tokens exist.)

**Why a token and not a derived value**: `calc(var(--size-player-panel-width) * 0.33)` is tempting but the original math used **different** multipliers at different breakpoints (0.33 at largeTv, 0.35 at tv, hardcoded 90 at default). A single multiplier loses that nuance. Two independent clamp tokens preserve the breakpoint-specific heights.

**`/deepen-plan` resolution:** Phase 1 deepening (commit `ba6f18ce`, 2026-04-11) added both `--size-player-panel-width` and `--size-player-panel-height` to `semantic.board.css` (Enhancement Summary item 7). No Phase 4 amendment needed. Section retained as historical record.

### §7.3 — `BOARD_BREAKPOINTS` TS export (flagged follow-up, not blocking)

**Needed for**: potential future component that wants to branch on board-width class (`tv` = 1280, `largeTv` = 1600) without reimplementing the breakpoint math.

Phase 4 §2.7 **deletes** the `dimensions.w >= 1280` / `>= 1600` conditionals from `PlayerRing.tsx` because the measurement-div pattern makes them redundant for that file. But the breakpoints themselves are architectural decisions (they match CSS `@media` breakpoints defined in `semantic.board.css`), not PlayerRing-specific.

**Proposal**: create `src/client/shared/tokens/breakpoints.ts`:
```typescript
export const BOARD_BREAKPOINTS = {
  tv:      1280,
  largeTv: 1600,
} as const satisfies Record<string, number>;
```

**Status**: NOT required for Phase 4 execution. Deferred to Phase 5 or later. Flagged here so a future "PlayerRing-like" component doesn't reintroduce inline numerics.

### §7.4 — Motion tokens consumed before they exist

Phases 2 and 3 consume `MOTION` and `--motion-*` tokens during their CSS rewrites and TSX edits. Phase 1 creates `motion.ts` + `primitives.css` motion custom properties at plan time. Phase 4 audits that consumption + cleans up inline literals.

**Invariant**: at every commit in Phase 4, `motion-token-sync.test.ts` stays green. If a Phase 4 edit accidentally introduces a token reference that doesn't exist in both `motion.ts` and `primitives.css`, the CI test catches it before the commit can merge.

### §7.5 — TurnBanner removal

Phase 2 deletes `TurnBanner.tsx` + `TurnBanner.module.css` (Phase 2 §2.5). The `TurnBanner.module.css:18` `animation: pulse 2s ease-in-out infinite` and `TurnBanner.module.css:32 @keyframes pulse` are therefore NOT Phase 4's responsibility — they go away with the file deletion. If Phase 2 execution somehow fails to delete `TurnBanner.*`, Phase 4's §2.5 verification grep catches the surviving `ease-in-out` and flags it. This is a secondary safety net.

### §7.6 — NopeButton/InterceptButton removal

Similarly, Phase 2 deletes `NopeButton.tsx` + `NopeButton.module.css` + `InterceptButton.tsx` + `InterceptButton.module.css` (Phase 2 §2.5). Any motion literals in those files are removed by deletion, not by Phase 4 editing. Phase 4's `animation-config.ts` deletion step (Step 18) implicitly depends on this: if either `NopeButton.tsx` or `InterceptButton.tsx` still exists and still imports `MOTION` from `animation-config`, the deletion breaks the typecheck. The §3 Step 18 check (`grep -rn "animation-config" src/client/`) catches this.

---

## §8 — Bundle Budget Impact

Phase 4 changes bundle size in three directions:

### §8.1 — Additions

- `@client/shared/tokens/motion` is already in the bundle (added by Phase 1). No new import costs.
- `MOTION_DURATIONS` and `MOTION_EASINGS` re-exports: each site that previously didn't import anything now imports `MOTION` (and PlayerRing + DramaOverlay additionally import `MOTION_DURATIONS`). The marginal cost is ~0 bytes after tree-shaking — if a component already imports `MOTION`, adding `MOTION_DURATIONS` to the same import statement is a no-op in the minified output.
- New `.measurePanel` rule in `PlayerRing.module.css`: ~100 bytes raw, ~50 bytes gzipped.
- New `panelSize` state + `measureRef` ref in `PlayerRing.tsx`: ~150 bytes raw, ~80 bytes gzipped.

**Total addition: ~130 bytes gzipped.**

### §8.2 — Removals

- `src/client/shared/animation-config.ts` deleted: ~300 bytes raw, ~150 bytes gzipped.
- SmartActionBox.tsx local `const TRANSITION` deleted: ~60 bytes raw, ~30 bytes gzipped.
- `PlayerRing.tsx` hardcoded `panelW/panelH` block (lines 66-71): ~250 bytes raw, ~130 bytes gzipped.
- 23 inline `{ duration: X, ease: 'easeOut' }` literals replaced by single-symbol preset references: net savings ~15 bytes per site × 23 = ~345 bytes raw, ~180 bytes gzipped.

**Total removal: ~490 bytes gzipped.**

### §8.3 — Net delta

**Net: –360 bytes gzipped** (removal exceeds addition).

Phase 4 is a bundle-reduction phase. The phone entry stays well under 100KB gzipped — Phase 4 nets a small shaving, not a growth.

### §8.4 — Verification

Phase 4 Step 19 runs `pnpm build` and confirms the phone entry bundle size. If the bundle grew by more than 200 bytes gzipped, something unexpected is happening (most likely a tree-shaking regression) — investigate before committing.

---

## §9 — Sources

**Primary references:**
- `docs/plans/css-foundation-rebuild/roadmap.md` §7 Phase 4 — parent scope definition.
- `docs/plans/css-foundation-rebuild/phase-1-foundation.md` §2.6 (`motion.ts` contract) + §2.7 (`motion-token-sync.test.ts` harness) + §2.2 (primitives.css motion custom properties).
- `docs/plans/css-foundation-rebuild/phase-2-phone-view-migration.md` §2.3.7 (FloatingActionButton creation), §2.3.9a (EliminatedView retheme), §2.5 (component consolidation / deletions), §2.6 (BottomSheet cross-view fix).
- `docs/plans/css-foundation-rebuild/phase-3-board-view-migration.md` §2.3.3 (PlayerRing CSS rewrite), §5 landmine 1 (PlayerRing TSX↔CSS coupling), §6 (Phase 4 scope enumeration), §7.3 (`--size-player-panel-width` cross-phase token).
- `src/client/shared/animation-config.ts` — legacy file being deleted.
- `src/client/shared/tokens/motion.ts` — Phase 1 creation; Phase 4 consumer.
- `src/client/shared/tokens/primitives.css` — Phase 1 creation; Phase 4 consumer.

**Technical references:**
- Framer Motion `transition.duration` Number constraint — Motion 11.x API docs, verified during roadmap research (roadmap §10).
- GSAP ease-string registry — GSAP 3.x API docs; confirms `power2.out`, `back.out(1.4)`, `power2.in` are Parser-level identifiers without cubic-bezier equivalents.
- CSS `ease-in-out` keyword definition — `cubic-bezier(0.42, 0, 0.58, 1)` per CSS Timing Functions Level 1 spec, compared against `MOTION_EASINGS.base = [0.4, 0, 0.2, 1]` (Phase 1 §2.6).
- `ResizeObserver` + `getBoundingClientRect` measurement-div pattern — W3C Resize Observer spec; standard technique for CSS→JS layout-value extraction.

**Internal documents:**
- `docs/PRODUCT-SPECIFICATION.md` v1.0 (locked 2026-04-10) — the parent contract. §2 Quality Bar applies.
- `feedback-stop-after-every-phase.md` (memory) — Phase 4 is its own session; stop after draft, wait for review, then Phase 5.
- `feedback-plans-are-baking-recipes.md` (memory) — Phase 4 specifies actual TSX and CSS snippets, not "rewrite the file per the pattern." Every site has concrete before/after.

**Memory references:**
- `project-burned-clean-slate-visual.md` — the clean-slate authorization that makes Phase 4's `animation-config.ts` deletion permissible.
- `feedback-css-tokens-before-components.md` — the "tokens before components" insight that makes Phase 4 the natural cleanup step after Phases 2/3 ship tokens.

---

*This phase file is drafted 2026-04-11 as the fourth of five CSS Foundation Rebuild phase files. It will be updated as `/deepen-plan` surfaces cross-phase contradictions and as §7 proposals (`--motion-duration-dots` Option A/B) get resolved. When `/deepen-plan` surfaces a contradiction with Phase 1, 2, 3, or 5, the contradiction is resolved in one direction or the other — never ignored.*
