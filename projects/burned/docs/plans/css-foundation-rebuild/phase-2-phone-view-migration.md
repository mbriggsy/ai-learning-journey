---
title: "Phase 2 — Phone View Migration"
type: feat
phase: 2
parent: docs/plans/css-foundation-rebuild/roadmap.md
depends_on: docs/plans/css-foundation-rebuild/phase-1-foundation.md
date: 2026-04-11
status: completed
deepened: 2026-04-11
---

# Phase 2 — Phone View Migration

**Goal.** Rewrite every `.module.css` file under `src/client/player/` to consume the Phase 1 token system. Eliminate all axis violations. Delete dead code (TurnBanner, NopeButton — both verified orphaned). Migrate `InterceptButton` → `FloatingActionButton` (NopeButton was never live; the consolidation is asymmetric — see §2.5 deepening note). Fix the one cross-view `dvh` leak in `BottomSheet.module.css`. Resolve Tier 1 retheme gaps for `EliminatedView`. Ship the phone bundle ≤100KB gzipped.

---

## Enhancement Summary (NEW in deepening 2026-04-11)

This phase was deepened on 2026-04-11 via an 8-agent parallel pass that produced ~80 prescriptive fixes spanning Phase 1 contradictions, source-file audit gaps, and architectural corrections. The biggest blind spots in the original draft were:

1. **TSX class-rename cascades** — Phase 2 rewrites several `.module.css` files with new class names (`.hint → .standby`, `.target → .comboPair/.comboTriple/.action`, `.ready → .action` in SmartActionBox; `.container → .view`, `.remaining → .aliveList`, `.playerChip → .alivePlayer`, `.watchPrompt → .prompt`, `.explosionWrap` removed in EliminatedView; `.left` removed in TitleBar; `.pileInfo → .pileCount` in StatusBar). These are **silent breaking changes** — `styles.X` returns `undefined` at runtime when the key is gone, producing unstyled elements. Phase 2's per-file specs treated rewrites as token swaps; agent 8's source-file audit caught the cascade. New §§2.3.4b, 2.3.5b, 2.3.6b, 2.3.9b sections enumerate every required TSX edit alongside the CSS rewrite.

2. **`position: fixed` → Phase 1 lint Rule 3** — Phase 1 §2.14 Rule 3 BANS `position: fixed` in `src/client/player/**/*.module.css` (WebKit bug 297779 — iOS 26 fixed-element drift, partial fix in 26.1/26.4). Phase 2 had **5 violations**: Hand `.enlargeBackdrop`, FloatingActionButton `.fab`, ConnectionOverlay `.overlay`, ErrorToast `.toast`, BottomSheet `.backdrop` (cross-view, phone-only consumer). Resolved via:
   - **New Phase 1 follow-up rule** in `semantic.phone.css`: `html, body { height: var(--size-viewport-safe); position: relative; overflow: hidden; }` + `#root { position: relative; height: 100%; }` — establishes a non-scrolling, viewport-safe-sized positioning root.
   - **Hand.enlargeBackdrop** → React portal to `document.body`, `position: absolute`. TSX wraps `<AnimatePresence>` in `createPortal(..., document.body)`.
   - **FloatingActionButton** → render as direct child of `<Player>` Fragment (sibling of `<PhoneRouter>`), `position: absolute` against `#root`. Delete `<div id="nope-root">` from `player.html`.
   - **ConnectionOverlay** → native `<dialog>` + `showModal()`. UA stylesheet applies `position: fixed` to top-layer dialogs, but the AUTHOR `.module.css` never declares `position: fixed` so lint Rule 3 doesn't trip. Full TSX rewrite.
   - **ErrorToast** → `position: absolute` against `#root`.
   - **BottomSheet** → no structural change. Current TSX already uses `<dialog>` + `showModal()`. The original Phase 2 §2.6 draft was wrong about a phantom `.backdrop` DOM element. CSS-only fix: remove the redundant author-declared `position: fixed`, replace `dvh` with `svh`, use the `::backdrop` pseudo-element for the scrim.

3. **`@layer components { ... }` wrapping (Phase 1 §2.11) gap** — Phase 2 draft never mentioned `@layer`. Empirically verified against the project's actual Vite 8.0.3 + postcss-modules pipeline: `@layer components { ... }` wrapping works for every construct Phase 2 uses (keyframes, `@media`, `:focus-visible`, `color-mix()`, `:global()`, scoped class names). Cost: ~10 bytes gzipped per file × 14 module files = ~140 bytes total, under the Phase 1 §2.11 estimate. **Wraps every `.module.css` file rewritten in this phase EXCEPT `player-hardening.css`** — it's a global stylesheet (not a CSS module), and resets like `box-sizing` and `html, body` belong outside any layer (unlayered CSS wins cascade by default, which is the right behavior for resets). New universal rule #11 added to §2.2.

4. **Phase 1 token renames Phase 2 must absorb** — Phase 1 deepening landed on 2026-04-11 (commit `ba6f18ce`) with several token renames, deletions, and additions. Phase 2 was written before any of these landed. Renames Phase 2 absorbs:
   - **`--motion-ease-standard` → `--motion-ease-base`** — 17 sites across 8 files. Mechanical replace-all.
   - **`--text-micro` DELETED** → use `--text-caption`. PlayingView `.sectionLabel` (line 284) is the one consumer; pattern enumeration in §2.2a Pattern 3 also updated.
   - **`--radius-pill` DELETED** → use `--radius-full` directly. JoinScreen `.roomBadge` (line 906) is the one consumer.
   - **`--z-max` DELETED** → `--z-toast: 3000` is the ceiling. No actual consumers, just an enumeration in §2.2a Pattern 7.
   - **`--motion-duration-instant` DROPPED (Decision 2)** — removed from §2.2a Pattern 6 and §2.3.8 prose enumerations.
   - **`--text-body` floor 14 → 15 px (Decision 3)** — every `--text-body` consumer gets a free 1px bump. Doc-only — prose references to "14-18px" range updated to "15-18px" in §2.3.8 (line 1115) and §2.3.12 (line 1551).
   - **`--color-fg-on-accent` → explicit per-role tokens**. Phase 1 §2.3 introduced `--color-fg-on-burned`, `--color-fg-on-intercept`, `--color-fg-on-operative`, `--color-fg-on-drama`. Phase 2 sites:
     - FloatingActionButton `.intercept` and `.nope` → `--color-fg-on-burned` (red-bg variants)
     - sheets `.confirmBtn` → `--color-fg-on-intercept` (emerald-bg variant)

5. **Reduced-motion essential-* token assignments (Phase 1 §2.9)** — Phase 1 deepening introduced a dual-family token system: decorative tokens (`fast/base/slow/dramatic/dots/ambient`) zero out under `prefers-reduced-motion: reduce`, essential tokens (`essential-pulse/-spin/-flash`) survive (slowed for comfort). Phase 2 was written using only decorative tokens; gameplay-signal animations would zero out and remove information. Six essential-token swaps:
   - `SmartActionBox .action` breathe → `--motion-duration-essential-pulse` (turn-active CTA "act now" pulse)
   - `SmartActionBox .drawIntense` breatheIntense → `--motion-duration-essential-pulse` (near-empty-deck Burned warning)
   - `TitleBar .dotConnecting` blink → `--motion-duration-essential-spin` (connection-state app signal — synced with ConnectionOverlay spinner cadence)
   - `FloatingActionButton .urgent` fabPulse → `--motion-duration-essential-pulse` (intercept-window "act now" affordance)
   - `JoinScreen .spinner` → `--motion-duration-essential-spin` (app-state "connecting" signal)
   - `ConnectionOverlay .spinner` → `--motion-duration-essential-spin` (Phase 1 §2.9 canonical consumer, named explicitly in the bullet list)
   - **Delete redundant `@media (prefers-reduced-motion: reduce)` `.spinner` overrides** in JoinScreen (lines 1099-1102) and ConnectionOverlay (lines 1437-1441) — essential-spin handles the slowdown automatically; the per-component pulse fallback is dead code. Also delete the `joinScreenSpinnerPulse` and `connectionPulse` keyframe definitions.
   - **`SmartActionBox` two-intensity pulse drift flagged for Phase 1 follow-up**: both `.action` (gentle) and `.drawIntense` (urgent) now consume the same `--motion-duration-essential-pulse: 1400ms` token. Phase 1 ships only one essential-pulse value, flattening the visual distinction. Recommended Phase 1 amendment: add `--motion-duration-essential-pulse-urgent: 900ms baseline / 1500ms reduce`. Keyframe content (scale + glow intensity) carries the differential in the meantime.

6. **Lint Rule 2 — `dots` keyframe hardcode resolved** — JoinScreen `.waitingDots::after` previously declared `animation: joinScreenDots 1.5s steps(4, end) infinite` as an "allowed exception" per landmine 6. Phase 1 deepening added `--motion-duration-dots: 1500ms` *specifically* for this consumer. Replace with `var(--motion-duration-dots)`. **Landmine 6 RETIRED** — no exception exists.

7. **Safe-area token migration (Phase 1 §2.12)** — Phase 1 added `--size-viewport-safe`, `--inset-top/bottom/left/right`. Phone roots must use `min-height: var(--size-viewport-safe)` (NOT raw `100svh`) so the home indicator and notch don't clip critical UI. Six sites:
   - PlayingView `.view` → `min-height: var(--size-viewport-safe)` (replaces `height: 100svh`)
   - JoinScreen `.container` → same; padding becomes `max(--space-8, --inset-*)` per side
   - EliminatedView `.view` → same
   - player-hardening `html, body` → `height: var(--size-viewport-safe)` (consolidates with the new Phase 1 follow-up positioning contract)
   - player-hardening `#root` → `height: 100%` + safe-area inset padding
   - BottomSheet `.dialog` → `max-height: 80svh` becomes `max-height: calc(var(--size-viewport-safe) * 0.8)` (and `60svh` short variant becomes `* 0.6`)

8. **Cross-phase tokens that must be added to Phase 1 in follow-up sweep (3 new + 1 amended):**
   - `--color-bg-overlay-light` (60% alpha, ConnectionOverlay center stop + BottomSheet backdrop) — formula: `color-mix(in oklab, var(--color-shadow-base) 60%, transparent)`
   - `--color-bg-overlay-heavy` (85% alpha, ConnectionOverlay edge stop) — formula: `color-mix(in oklab, var(--color-shadow-base) 85%, transparent)`
   - `--size-content-narrow` — UNIFIES the 5 narrow-column consumers (JoinScreen `.form` 300px, JoinScreen `.lobbyList` 320px, CardDetailSheet `.hint` 280px, EliminatedView `.flavor` 320px, EliminatedView `.aliveList` 320px). Formula: `clamp(280px, calc(280px + (100svh - 667px) * (40 / 699)), 320px)`. **SUPERSEDES `--size-card-detail-max`** (Phase 1's first deepening pass added a 280→400 single-consumer version; this widens scope and narrows the ceiling to 320 to match actual consumer values).
   - **New Phase 1 §2.12 follow-up rule**: `html, body { height: var(--size-viewport-safe); position: relative; overflow: hidden; overscroll-behavior: none; }` + `#root { position: relative; height: 100%; }` — establishes the phone-root positioning contract that lets descendants use `position: absolute` against `#root` for viewport-anchored placement without `position: fixed`.

9. **`cardAccent` migration must use `card-accents.ts`, NOT `palette.ts`** — Phase 1 §2.7 Decision 1 flipped `palette.ts` to a CODEGEN file (`palette.generated.ts` emitted from `primitives.css`). It must NOT contain hand-written functions. The original Phase 2 §2.7 import path `'@client/shared/tokens/palette'` is wrong. Correct path: `'@client/shared/tokens/card-accents'`. Phase 1 §3 step 8a and §6 left this ambiguous ("palette.ts or card-accents.ts") — Phase 2 deepening forces the choice: **`card-accents.ts` is the only valid target after Decision 1**. Flagged for Phase 1 follow-up: lock the choice in Phase 1's text.

10. **`theme.ts` deletion boundary expansion** — Phase 1 §5 landmine 11 enumerates 2 `cardAccent` consumers (MinimalCard.tsx, FuturePeek.tsx). Phase 1 §5 landmine 6 enumerates 5 `from.*theme` callers including `player/main.tsx`, `board/main.tsx`, `player/Player.tsx`. Phase 2 §2.7 only handled `MinimalCard.tsx`. The full set Phase 2 must touch:
    - **`MinimalCard.tsx:5`** — `import { cardAccent } from './theme'` → `from '@client/shared/tokens/card-accents'`
    - **`FuturePeek.tsx:5`** — `import { cardAccent } from '@client/shared/theme'` → `from '@client/shared/tokens/card-accents'` (NEW — Phase 2 §2.7 missed this consumer)
    - **`player/main.tsx:6`** — `import { applyTheme } from '@client/shared/theme'` → DELETE the import + delete the call. Phase 1 commits to pure-CSS dark theming via bare `:root` (landmine 13); `applyTheme` runtime injection is dead.
    - **`board/main.tsx:6`** — same as player/main.tsx
    - **`Player.tsx:34`** — `import { useColorScheme } from '@client/shared/theme'` → DELETE the import
    - **`Player.tsx:51`** — delete the `useColorScheme()` call. Light mode is out of scope (Phase 1 §6); the "force re-render on OS scheme switch" trigger is dead code after `theme.ts` deletion. Phase 1 landmine 11 did NOT enumerate this consumer — Phase 2 deepening surfaced it.

11. **EliminatedView TSX retheme refinement (§2.3.9a)** — agent 2 verified the actual current file:
    - `FLAVOR_LINES` array has **8 lines** (not 9 — Phase 2's "9-line" lead-in was a minor typo; the 9 referred to the new pool).
    - `pickFlavor()` uses `Math.random()` inside `useMemo(pickFlavor, [])` — randomization is correct, fresh per mount, stable within mount, not hard-coded. **No randomization fix required.**
    - JSX text needs `&apos;` escape: `You're Burned.` should be `You&apos;re Burned.` to be ESLint-agnostic.
    - The 9-line new pool is correct. Phrasing-beat probability for a 5-player game (4 eliminations): exactly 37.6% per the (8/9)^4 calculation. Phase 2's "30-50%" claim is approximately right for typical 4-7 player games.
    - **Class-name cascade**: the new EliminatedView CSS in §2.3.9 renames most classes. Full TSX edit prescription is now §2.3.9b.

12. **Touch target audit (Agent 1)** — one real WCAG 2.5.5 AAA blocker found:
    - **`sheets.module.css .positionInput button`** — currently `width/height: var(--space-10)` (40px). FAILS WCAG 2.5.5 AAA (44px floor) and Apple HIG. The §2.3.13 defense (*"slightly under floor but compensated by the larger overall row touch zone"*) is NOT a valid WCAG exception (none of 2.5.5's five exceptions apply). **Fix**: change to `var(--size-touch-target)` (44px) at both width and height.
    - **`.quickBtn` computation correction**: §2.3.13 currently says `16+14+16=46px`. Phase 1 Decision 3 raised `--text-body` floor to 15px. New computation: `16+15+16=47px` (and ≥49px with UA line-height). Both AAA and HIG still pass. Comment update only.
    - **Optional `.box` upgrade**: SmartActionBox `.box` currently uses `--size-touch-target` (44px). Phase 1 §2.4 also defines `--size-touch-target-comfortable: 48px`. Bumping `.box` to comfortable would clear Material 3's 48dp recommendation alongside AAA + HIG. Cost: 4 extra pixels at SE. Recommend the bump.

13. **Phase 2 silently dropped accessibility rules and load-bearing patterns from current code** (agent 8's source-file audit):
    - **`PlayingView.module.css .handSection[data-disabled]::after`** — disabled-haze overlay rule. Phase 2 rewrite has no equivalent. `Player.tsx:356` sets `data-disabled` to trigger the haze; without the CSS selector, the attribute does nothing → no visible disabled feedback. **PRESERVE**.
    - **`StagingArea.module.css .stagedCards::before / ::after`** — flex spacers implementing "center cards when they fit, collapse when they overflow." This is the exact pattern §5 landmine 4 protects. Phase 2 rewrite drops them and uses `justify-content: flex-start`. Centering behavior changes from "centered when fit" to "always left-aligned." **PRESERVE the spacers**.
    - **`SmartActionBox.module.css @media (prefers-reduced-motion: reduce) { .draw, .drawIntense { animation: none } }`** — accessibility rule. Phase 2 rewrite drops it. Now redundant after the essential-pulse swap (essential-pulse survives reduce by design, and `.draw` with no animation is fine), but the rewrite must explicitly NOT zero out the essential pulses. Document.
    - **`Hand.module.css -webkit-overflow-scrolling: touch` and `overscroll-behavior-x: contain`** — iOS momentum-scroll fixes. Phase 2 rewrite drops them. **PRESERVE**.
    - **`PlayingView.module.css .sectionLabel` is currently a flex child** (not absolute). Phase 2's rewrite makes it `position: absolute` inside a container with `overflow: hidden`. This RE-INTRODUCES landmine 3 ("`overflow: hidden` clips absolutely-positioned elements"). **KEEP `.sectionLabel` as a flex child** — the Phase 2 draft was wrong about the architecture.

14. **`[data-theme="light"]` orphan-block sweep** — Phase 1 step 16a deletes orphan blocks across 11 verified files. Phase 2 explicitly mentioned deletion in only 2 of 9 phone-view files (JoinScreen, sheets). The other 7 phone files (PlayingView ×3 blocks, SmartActionBox ×4 blocks, TitleBar ×1 block, StatusBar ×1 block, plus the 3 deleted-file blocks in NopeButton/InterceptButton/TurnBanner) need explicit "deleted by full-file rewrite" call-outs in their respective §2.3.X "Current problems" lists. New §3 step 1a verifies Phase 1 step 16a's commit is in git history before Phase 2 starts.

15. **NopeButton verified ALREADY ORPHANED** — `grep -rn "NopeButton" src/client/` returns only self-references in `NopeButton.tsx`. No `import { NopeButton }` anywhere. The Phase 2 framing of "consolidate two live components" is wrong. Real shape: **delete the dead `NopeButton.*` files + migrate `InterceptButton.*` → `FloatingActionButton.*`**. The new component preserves InterceptButton's full architecture: `createPortal` (which then disappears once the FAB renders inline as a sibling of `<PhoneRouter>`), `secondsLeft` countdown via `useState` + `useEffect`, hook-driven state via `useNopeWindow()`/`useHand()`/`useMyPlayer()`, the `disabled={!hasIntercept}` state, the `INTERCEPT{secondsLeft}s` label format. The "nope" variant is preserved as a CSS class only — it has no live consumer in 2026 (the protocol reuses the `nope` action name internally per §6.4 Tier 3 in the spec).

16. **`<PlayingView />` is NOT a top-level file** — it's an inner function inside `Player.tsx` (declared at line ~190, renders at the `<PlayingView />` JSX site at line ~125). Phase 2 §2.5 said *"Player.tsx or PlayingView.tsx — one of these renders the active floating action button"* — there is NO `PlayingView.tsx`. The `<InterceptButton />` render site is `Player.tsx:435` inside the inner `PlayingView` function. The `<FloatingActionButton />` move (out of `PlayingView`'s tree, up into the top-level `<Player>` Fragment alongside `<ErrorToast />` and `<ConnectionOverlay />`) is the architectural change needed to make the FAB's `position: absolute` against `#root` work correctly.

17. **`player.html` FOUC inline-style hex values** — line 2 (`<html style="background:#1a1d30">`) and line 10 (`<body style="margin:0;background:#1a1d30;color:#e8e8f0">`) contain hardcoded hex values used for flash-of-unstyled-content prevention before CSS modules load. Two options: (a) update to new Dreamland palette hex equivalents (still hardcoded but intentional), (b) document the FOUC-prevention exception in §2.2 universal rules. **Recommend (a)**: update to `#0f1f1f` (charcoal-1 from Phase 1 palette) for `background` and `#f0e6d2` (cream-12 from Phase 1 palette) for `color`. Both values match the runtime CSS so there's zero perceived flash, AND they're documented as intentional exceptions in §2.2.

18. **`Player.tsx` inline styles with stale token references** — agent 8 found three sites:
    - Line 100: `style={{ color: 'var(--text-primary)' }}` on the "No room code" fallback div — the token name is legacy. Update to `var(--color-fg-primary)`.
    - Line 116: `style={{ background: 'var(--bg-primary, #0c0a12)' }}` on the protocolMismatch overlay — update to `var(--color-bg-app)` and drop the fallback hex.
    - Line 117: `style={{ color: 'var(--amber, #e8922a)' }}` on the same — update to `var(--color-accent-drama)` and drop the fallback hex.
    - Plus `TargetSelect.tsx:27` `style={{ color: 'var(--text-secondary)', fontSize: '13px' }}` — update color token, replace `'13px'` with a CSS class consuming `--text-caption`.

19. **`sheets.module.css` consumer enumeration corrections** — Phase 2 §2.3.13's "five sheet consumers and their classes" mapping had errors:
    - **NameCard** uses `.optionBtn` inside `.cardGrid` (not "button children styled inline"). The grid contains `.optionBtn` children with `style={{ justifyContent: 'center' }}`.
    - **DefusePlacement** has TWO branches: small-deck branch uses `.sheetTitle + .sheetSubtitle + .optionList + .optionBtn`; large-deck branch uses `.sheetTitle + .sheetSubtitle + .quickActions + .quickBtn + .positionInput + .confirmBtn`. Phase 2 only enumerated the large-deck branch.
    - Net effect: `.optionBtn` is consumed by **4 of 5 sheets** (TargetSelect, FavorResponse, NameCard, DefusePlacement-small-deck), not just 2. Touch-target fixes on `.optionBtn` therefore affect more consumers than Phase 2 claimed — the fix is correct, the enumeration was wrong.

20. **insight-006 (`css-fallback-must-precede-modern-property`) verification** — the insight's "fallback first, modern second" rule still applies in general, but the specific `100vh`/`100svh` case it documents is now obsolete because `svh` reached Baseline Widely Available March 2022 (universal as of April 2026). Phase 2 §2.3.14 correctly drops the `100vh` fallback entirely. Update the inline comment at line 1895 to note the insight's rule still applies to *future* fallback pairs, just not this specific one.

### Counts after deepening

- **17 file deliverables** (was: 14 phone modules + player-hardening + BottomSheet + FAB rewrite). Counts unchanged but the breakdown is clearer:
  - 12 phone module rewrites (PlayingView, Hand, StagingArea, SmartActionBox, TitleBar, StatusBar, JoinScreen, EliminatedView, ErrorToast, ConnectionOverlay, CardDetailSheet, sheets/sheets)
  - 1 new module file (FloatingActionButton.module.css)
  - 1 global stylesheet rewrite (player-hardening.css)
  - 1 cross-view CSS-only fix (BottomSheet.module.css — corrected from "rewrite" to "fix" — current TSX architecture is preserved)
  - 6 TSX rewrites (FloatingActionButton.tsx, ConnectionOverlay.tsx, ErrorToast.tsx, EliminatedView.tsx, MinimalCard.tsx, FuturePeek.tsx) + Player.tsx + main.tsx ×2 + player.html surgical edits
  - 3 file deletions (NopeButton.*, TurnBanner.*, plus #nope-root from player.html — InterceptButton.* migrates rather than deletes since the new file is a rename)

- **80 prescriptive fixes** across the 17 deliverables. Bundle impact is now ~+0.14 KB gzipped from `@layer` wrappers + ~−2 KB gzipped from rewrites + token compressibility = net **−1.5 to −2 KB gzipped on phone entry**. Well under budget; the original ≤100KB target stands with extra headroom.

- **Phase 1 follow-up sweep items locked in** (must apply during the cross-phase contradiction sweep step 6 in TODO.md):
  1. Add `--color-bg-overlay-light` and `--color-bg-overlay-heavy` to `semantic.css` §2.3 (replaces single `--color-bg-overlay`)
  2. Add `--size-content-narrow` to `semantic.phone.css` §2.4 (supersedes `--size-card-detail-max`)
  3. Add `html, body { ... }` + `#root { ... }` positioning contract to `semantic.phone.css` §2.12 (enables the position:absolute migration)
  4. Lock `card-accents.ts` as definitive `cardAccent` migration target (remove "or palette.ts" ambiguity from §3 step 8a, §5 landmine 11, §6)
  5. Add `Player.tsx:51 useColorScheme()` to landmine 11's enumerated consumers
  6. Optional: add `--motion-duration-essential-pulse-urgent: 900ms / 1500ms` for SmartActionBox dual-intensity (currently both `.action` and `.drawIntense` flatten to the same 1400ms pulse)
  7. Extend lint Rule 3 grep scope to include `src/client/shared/BottomSheet.module.css` (phone-consumer shared file)

### Workflow

The body of this phase document below has been edited in-place with the deepening corrections — Phase 1's deepening pattern. Where a §2.3.X CSS block needs significant restructuring, the rewrite replaces the original. Where a TSX cascade needs prescription, a new §2.3.Xb subsection has been appended (§§2.3.4b, 2.3.5b, 2.3.6b, 2.3.9b). When `/ce:work` runs Phase 2, it executes the latest CSS blocks AND the §2.3.Xb TSX cascades together — both are now baking-recipe-ready.

---

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
  transition: background var(--motion-duration-fast) var(--motion-ease-base);
}
.container:hover {
  background: var(--color-bg-elevated);
}
```

**Universal rules**:
1. **Zero hardcoded hex values.** Every color goes through a semantic token (`--color-*`) which goes through a primitive token (`--color-teal-5`, etc.). One documented exception: `player.html` FOUC-prevention inline styles (lines 2 and 10) use raw hex equivalents of palette tokens (`#0f1f1f` charcoal-1 + `#f0e6d2` cream-12) to avoid first-paint flash before CSS modules load. Documented in §2.2 below; not a regression.
2. **Zero hardcoded spacing.** Every `padding`, `margin`, `gap`, `inset` uses `--space-N` or `--space-fluid-*-phone` where viewport-responsive sizing is needed.
3. **Zero hardcoded font sizes.** Every `font-size` uses a `--text-*-phone` token. **`--text-micro` was deleted in Phase 1 deepening** — merged into `--text-caption`. Five tiers: caption / body / callout / title / display.
4. **Zero hardcoded font families.** Every `font-family` uses `--font-display` or `--font-body` or `--font-mono`.
5. **Zero hardcoded radii.** Every `border-radius` uses `--radius-*`. **`--radius-pill` was deleted in Phase 1 deepening** — use `--radius-full` directly for pill shapes.
6. **Zero hardcoded shadows.** Every `box-shadow` uses `--shadow-*` or `--shadow-glow-*`.
7. **Zero hardcoded motion timing.** Every `transition` and `animation` duration uses `--motion-duration-*` and easing uses `--motion-ease-*`. **`--motion-ease-standard` was renamed to `--motion-ease-base` in Phase 1 deepening** — use `--motion-ease-base` everywhere. **`--motion-duration-instant` was dropped (Decision 2)** — fast/base/slow/dramatic only.
8. **Zero hardcoded z-indices.** Every `z-index` uses `--z-*`. **`--z-max` was deleted in Phase 1 deepening** — `--z-toast: 3000` is the ceiling.
9. **No `vw` for dimensional sizing in phone files.** Width-full bleed (`width: 100vw`) is allowed only with a structural reason; default is `width: 100%` or a token.
10. **Preserve landmine comments.** Where the old file has a comment encoding architectural knowledge (e.g., "height:100% + aspect-ratio overflows, use slot wrapper"), preserve the comment verbatim, prefix with "Inherited from pre-rebuild:" if helpful.
11. **Wrap every `.module.css` body in `@layer components { ... }`** (NEW in deepening, per Phase 1 §2.11). Single flat block, file-header comments stay outside the wrapper. `@keyframes`, `@media (prefers-reduced-motion)`, `:focus-visible`, `color-mix()`, `:global()` all live INSIDE the wrapper — empirically verified against the project's actual Vite 8.0.3 + postcss-modules pipeline. Cost: ~10 bytes gzipped per file. **`player-hardening.css` is the ONE exception** — global stylesheet (not a CSS module), reset rules (`*`, `html`, `body`) belong outside any layer; unlayered CSS wins cascade by default and that's correct for resets. Acceptance grep: `rg --files-without-match '^@layer components \{' src/client/player/**/*.module.css src/client/shared/BottomSheet.module.css` returns zero files.
12. **No `position: fixed` anywhere in phone CSS** (NEW in deepening, per Phase 1 §2.14 lint Rule 3 + landmine 7 — WebKit bug 297779, iOS 26 fixed-element drift). Use `position: absolute` against the phone-root positioning contract (Phase 1 follow-up adds `html, body { position: relative; height: var(--size-viewport-safe); overflow: hidden; }` and `#root { position: relative; height: 100% }` to `semantic.phone.css`). For full-screen modals (ConnectionOverlay, BottomSheet), use the native `<dialog>` element + `showModal()` — the UA stylesheet applies `position: fixed` to top-layer dialogs internally, so the AUTHOR's `.module.css` never declares it and the lint grep doesn't trip.
13. **Use safe-area tokens for the phone root** (NEW in deepening, per Phase 1 §2.12). Phone-root containers (PlayingView `.view`, JoinScreen `.container`, EliminatedView `.view`, player-hardening html/body, #root) use `min-height: var(--size-viewport-safe)` (NOT raw `100svh`) and consume `--inset-top/bottom/left/right` for padding. Without this, the home indicator and notch clip critical UI on iPhone 14 Pro+ / 15 / 16 / 17 Pro / 26-series.
14. **Use essential motion tokens for gameplay-signal animations** (NEW in deepening, per Phase 1 §2.9). The dual-family motion system means decorative tokens (`fast/base/slow/dramatic/dots/ambient`) zero out under `prefers-reduced-motion: reduce` — fine for sugar (hover transitions, slide-ins, popIn) but wrong for gameplay-essential signals. Phase 2 sites that MUST consume `--motion-duration-essential-*`:
   - SmartActionBox `.action` breathe + `.drawIntense` breatheIntense → `essential-pulse` (turn-active CTA + near-empty-deck warning)
   - TitleBar `.dotConnecting` blink → `essential-spin` (connection-state app signal)
   - FloatingActionButton `.urgent` fabPulse → `essential-pulse` (intercept-window "act now")
   - JoinScreen `.spinner` + ConnectionOverlay `.spinner` → `essential-spin` (app-state "connecting")

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

**The fix**: every font-size → `var(--text-caption|body|callout|title|display)` per the Phase 1 phone type scale (5 tiers — `--text-micro` deleted in deepening, merged into caption). The scale is fluid svh-based, so `--text-body` gives 15px on a small phone (raised from 14px in Phase 1 Decision 3) and 18px on a large iPad portrait.

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

**The fix**: every `transition` duration → `var(--motion-duration-fast|base|slow|dramatic)` (decorative tier — `--motion-duration-instant` was dropped in Phase 1 Decision 2). Every easing → `var(--motion-ease-base|emphasized|decelerate|accelerate|anticipate)` (renamed from `--motion-ease-standard` in Phase 1 deepening). Keyframe animation durations consume the same tokens for decorative animations OR `--motion-duration-essential-pulse|-spin|-flash` for gameplay-essential signals (see universal rule #14 above).

**No exceptions** — landmine 6 (the `dots` step animation 1.5s hardcode) is RETIRED in deepening. Phase 1 §2.2 added `--motion-duration-dots: 1500ms` *specifically* for the JoinScreen dots consumer. The keyframe now reads `animation: joinScreenDots var(--motion-duration-dots) steps(4, end) infinite`. The `steps(4, end)` timing function is orthogonal to the duration token and doesn't violate Lint Rule 2.

#### Pattern 7 — Z-index collisions and unscaled layers (13 unique raw numbers)

**Affected files**: 5 of 14.

**The pattern**: raw z-indices `0, 1, 2, 3, 6, 10, 20, 30, 50, 100, 9000, 10000`. Collisions at 50 and 100 across multiple files. Two different "max" conventions (9000 and 10000) meaning nothing is actually max.

**The fix**: every z-index → `var(--z-base|raised|sticky|overlay|modal|toast)` per the Phase 1 scale (`--z-max` deleted in deepening; `--z-toast: 3000` is the ceiling). Collisions are eliminated by design — each layer has a named semantic, two files using the same layer is intentional because they share semantics.

---

**How to read §2.3**: the per-file specs below focus on **file-specific concerns** (structural changes, architectural landmines, state variants) and the **full rewritten file content**. They don't re-enumerate which of the 7 patterns above apply — assume all that fit. The cross-cutting summary above is the reviewer's guide; §2.3 is the execution runbook.

---

### §2.3 Per-file migration specs

Each subsection below gives: current LOC, current problems, target token consumption, and the FULL rewritten file content. Per the 2026-04-11 baking-recipe rule, execution is mechanical copy-paste — `/ce:work` does not compose CSS from transformation specs; it takes the block from the plan and writes it to disk.

#### §2.3.1 `PlayingView.module.css` — REWRITE (93 LOC → ~95 LOC)

**Current problems** (from audit):
- `height: min(100svh, 900px)` + `max-width: 600px` — compound constraints with no rationale.
- `flex: 42 1 0` / `flex: 58 1 0` rigid height ratios encode viewport assumptions.
- Hardcoded `gap: 6px`, `padding: 6px 2px 2px`, `border-radius: 6px`, `padding: 2px 10px`, `font-size: 10px`, `letter-spacing: 0.14em`.
- Stale color fallbacks: `#3a5860`, `#1a2a2e`, `#243c42`, `#b8a890`, `#d4cfc5`, `#8a8070`, `#e8e0d0`, `#f5f0e8` (some match current runtime, some don't).
- **3 orphan `[data-theme="light"]` blocks** at lines 84-93 wire old `theme.ts` tokens. Light mode is deferred per §6 Out of Scope. Deleted by the full-file rewrite below.
- **Raw `100svh` doesn't subtract iOS safe-area insets** — home indicator clips bottom UI. Migrate to `var(--size-viewport-safe)` + `--inset-*` padding per Phase 1 §2.12.

**Rewritten file content** (deepening corrections: `@layer components` wrapper, safe-area migration, `.sectionLabel` stays as flex child NOT absolute, `.handSection[data-disabled]::after` disabled-haze rule preserved, `--text-micro` → `--text-caption`):

```css
/* PlayingView.module.css
   Phone workbench: title + status + staging + hand + floating intercept button.
   Height-driven layout on viewport-safe svh. Content-aware sizing replaces rigid flex ratios.

   Inherited architectural notes:
   - Cards at height:100% + aspect-ratio overflow — slot wrapper handles aspect-ratio.
   - Phone root uses max-width: var(--size-root-max-width) to cap iPad portrait.
   - .sectionLabel stays as a flex child (NOT position:absolute) — landmine 3 from
     the autopsy: `overflow: hidden` on the section container clips absolutely-positioned
     children. Keep labels as inline flex elements ordered before the scroll content.
*/

@layer components {
  .view {
    display: flex;
    flex-direction: column;
    min-height: var(--size-viewport-safe);
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

  .handSection {
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

  /* Disabled-haze overlay — fired via [data-disabled] attribute by Player.tsx
     when permission.allowed is false or optimisticPending is true. Visual
     feedback that the hand is non-interactive. PRESERVE — Player.tsx:356
     relies on this selector existing for the haze to render. */
  .handSection[data-disabled]::after {
    content: '';
    position: absolute;
    inset: 0;
    background: color-mix(in oklab, var(--color-bg-app) 60%, transparent);
    border-radius: var(--radius-surface);
    pointer-events: none;
    z-index: var(--z-raised);
  }

  /* Section label — flex child, NOT absolutely positioned. Lives at the top
     of its parent .staging or .handSection as the first ordered child.
     Landmine 3: `overflow: hidden` on the parent clips absolutely-positioned
     children, so labels CANNOT be position: absolute. Inline flex order is the
     correct architecture. */
  .sectionLabel {
    flex: 0 0 auto;
    align-self: flex-start;
    padding: var(--space-0) var(--space-2);
    margin: var(--space-1) 0 0 var(--space-2);
    background: var(--color-bg-elevated);
    color: var(--color-fg-muted);
    font-family: var(--font-display);
    font-size: var(--text-caption);
    letter-spacing: 0.14em;
    text-transform: uppercase;
    border-radius: var(--radius-sm);
    pointer-events: none;
    position: relative;
    z-index: var(--z-raised);
  }
}
```

**Key transformations**:
- `height: min(100svh, 900px)` → `min-height: var(--size-viewport-safe)` + `max-width: var(--size-root-max-width)` on the root. Phase 1 §2.12 contract: never raw `100svh` on the phone root.
- `flex: 42 1 0` / `flex: 58 1 0` → `flex: 0 0 var(--size-staging-height)` / `flex: 0 0 var(--size-hand-height)` (content-aware clamps, not percentage splits).
- `gap: 6px` → `var(--space-fluid-tight)` (fluid because it scales with phone height).
- **Section labels stay as flex children** — Phase 2's first draft proposed `position: absolute` which would re-introduce landmine 3. Corrected during deepening.
- **`.handSection[data-disabled]::after` disabled-haze preserved** — Phase 2's first draft silently dropped this rule, breaking the disabled-state visual feedback that `Player.tsx:356` relies on. Restored during deepening.
- `--text-micro` → `--text-caption` (Phase 1 deepening deleted `--text-micro`, merged into `--text-caption`).
- Wrapped in `@layer components { ... }` per §2.2 universal rule #11.

**Acceptance for this file**:
- [ ] Zero hardcoded hex, spacing, font size, radius, shadow values.
- [ ] No compound height constraints (`min()` or `max-height` mixing units).
- [ ] `.view` consumes `var(--size-root-max-width)` and `var(--size-viewport-safe)`.
- [ ] Staging and hand sections size via `--size-staging-height` and `--size-hand-height` tokens (fluid svh-based).
- [ ] Section labels render as INLINE FLEX CHILDREN, not absolutely positioned (landmine 3 protected).
- [ ] `.handSection[data-disabled]::after` disabled-haze rule present (verify via DevTools by setting `data-disabled` on `.handSection` in elements panel and confirming the dim overlay appears).
- [ ] Wrapped in `@layer components { ... }` (grep verifies one match).
- [ ] All 3 orphan `[data-theme="light"]` blocks deleted by the rewrite.

#### §2.3.2 `Hand.module.css` — REWRITE (51 LOC → ~45 LOC)

**Current problems**:
- `width: 100vw` at line 49 — **AXIS VIOLATION** (phone should not use `vw` for dimensional sizing).
- `gap: 12px`, `padding: 8px 16px`, `scroll-padding-left: 16px`, `min-width: 120px`, `padding: 12px`, `max-width: 460px` — all hardcoded.
- `rgba(0, 0, 0, 0.6)` hardcoded for the enlarge backdrop.
- Landmine comment at line 3: "Cards inside use width:100% — no height:100% on cards (landmine: causes overflow)"

**Rewritten file content** (deepening corrections: `@layer components` wrapper, `position: fixed → absolute` for `.enlargeBackdrop` per Phase 1 lint Rule 3, `-webkit-overflow-scrolling: touch` and `overscroll-behavior-x: contain` preserved, `--color-bg-overlay → --color-bg-overlay-heavy`):

```css
/* Hand.module.css
   Horizontal scrolling card strip. Cards inside use width:100% — no height:100%
   on cards (landmine: causes overflow when combined with aspect-ratio).

   .enlargeBackdrop is rendered via React portal to document.body — see
   Hand.tsx wrapping. position: absolute against the body positioning contract
   (Phase 1 §2.12 follow-up establishes html, body { position: relative;
   height: var(--size-viewport-safe); overflow: hidden }), NOT position: fixed.
   Phase 1 lint Rule 3 + landmine 7 (WebKit bug 297779).
*/

@layer components {
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
    /* iOS momentum scroll + horizontal-scroll containment — preserved from
       pre-rebuild (silently dropped in Phase 2's first draft, restored in
       deepening). */
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-x: contain;
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

  /* Enlarge backdrop — portalled to document.body via createPortal in Hand.tsx.
     position: absolute against <body> (Phase 1 §2.12 contract: body is
     position: relative + sized to var(--size-viewport-safe) + overflow: hidden).
     Achieves viewport-sized full-screen coverage WITHOUT position: fixed,
     dodging WebKit bug 297779 on iOS 26. */
  .enlargeBackdrop {
    position: absolute;
    inset: 0;
    background: var(--color-bg-overlay-heavy);
    z-index: var(--z-modal);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-3);
  }

  .enlargeCard {
    /* Full-bleed card detail — width:100% of the backdrop container.
       NO vw/svh here — backdrop constrains the size. */
    width: 100%;
    max-width: min(90%, 460px);
    aspect-ratio: 5 / 7;
  }
}
```

**Key transformations**:
- `width: 100vw` (L49) → `width: 100%` inside a `position: absolute; inset: 0` backdrop. The backdrop fills the viewport-safe body rectangle; the card inside is sized relative to the backdrop.
- **`position: fixed` → `position: absolute`** (Phase 1 lint Rule 3 + landmine 7). Backdrop is portalled to `document.body` via `createPortal` (Hand.tsx edit, see below). `<body>` is the positioned ancestor (Phase 1 §2.12 follow-up rule).
- All spacing → `var(--space-*)` tokens.
- `rgba(0, 0, 0, 0.6)` → `var(--color-bg-overlay-heavy)` (Phase 1 follow-up adds the `-heavy` suffix; uses `color-mix(in oklab, var(--color-shadow-base) 85%, transparent)`).
- `z-index: 50` → `var(--z-modal)` (explicit layer semantic).
- **`-webkit-overflow-scrolling: touch` and `overscroll-behavior-x: contain` preserved** (Phase 2 first draft silently dropped them).
- Wrapped in `@layer components { ... }`.

**TSX edit required** (Hand.tsx, lines 124-149 — wrap enlarge `<AnimatePresence>` in `createPortal`):

```tsx
// Add to imports at top:
import { createPortal } from 'react-dom'

// Replace the enlarge block (current lines 124-149) with:
{createPortal(
  <AnimatePresence>
    {enlargedCard && (
      <m.div
        key="enlarge-backdrop"
        className={styles.enlargeBackdrop}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        onPointerUp={(e: React.PointerEvent) => {
          handleEnlargedTap(enlargedCard.id, e)
        }}
      >
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
      </m.div>
    )}
  </AnimatePresence>,
  document.body,
)}
```

Framer Motion + portal is fully supported (verified against Framer docs). AnimatePresence + `m.div` work unchanged inside a portal.

**Acceptance for this file**:
- [ ] Zero `vw` usage.
- [ ] Zero hardcoded colors.
- [ ] Zero `position: fixed` (lint Rule 3 grep `rg "position:\s*fixed" src/client/player/Hand.module.css` returns zero).
- [ ] `-webkit-overflow-scrolling: touch` and `overscroll-behavior-x: contain` preserved.
- [ ] `min-width: 120px` on `.slot` is intentionally kept as a raw px value.
- [ ] Hand.tsx imports `createPortal` from `react-dom` and wraps the enlarge `<AnimatePresence>` in `createPortal(..., document.body)`.
- [ ] Wrapped in `@layer components { ... }`.

#### §2.3.3 `StagingArea.module.css` — REWRITE (47 LOC → ~40 LOC)

**Current problems**:
- `flex: 0 0 clamp(130px, 42vw, 200px)` at line 43 — **AXIS VIOLATION** (phone using `vw` for card width).
- `gap: 8px`, `gap: 10px`, `padding: 8px 0` — hardcoded.
- Landmine at line 46: "GPU layer — prevents border repaint flash".

**Rewritten file content** (deepening corrections: `@layer components` wrapper, `::before`/`::after` flex spacers PRESERVED for landmine 4 — center-when-fit / collapse-when-overflow centering pattern):

```css
/* StagingArea.module.css
   Composition zone for selecting cards to play. Scrolls horizontally when > 4 cards staged.

   Inherited architectural notes:
   - stagedSlot uses transform: translateZ(0) as a GPU layer hint to prevent
     border repaint flash during layout transitions.
   - .stagedRow uses ::before / ::after flex spacers to implement
     "center when cards fit, collapse when they overflow" — landmine 4: CSS
     `justify-content: center` on a scroll container clips the leftmost
     overflow on iOS Safari. Spacers + flex-start does NOT clip. PRESERVE.
*/

@layer components {
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

  /* Centering spacers — flex 1 0 0 on each end pushes content to center
     when there's slack, collapses to zero when content overflows. Landmine 4
     protection: justify-content: center on a scroll container clips left
     overflow on iOS Safari, this pattern doesn't. PRESERVE — pre-rebuild
     code uses this; Phase 2's first draft dropped it (regression). */
  .stagedRow::before,
  .stagedRow::after {
    content: '';
    flex: 1 0 0;
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
}
```

**Key transformations**:
- `flex: 0 0 clamp(130px, 42vw, 200px)` → `flex: 0 0 auto` + `height: 100%` + `aspect-ratio: 5/7`. The card's vertical lane is driven by parent height (svh-based via Phase 1 `--size-staging-height`); the card's width comes from aspect-ratio on the content. **Axis-correct: width is derived from height, not from viewport width.**
- All `gap` / `padding` → tokens.
- Landmine preserved as a comment on the `transform: translateZ(0)` line.
- **`::before` / `::after` centering spacers preserved** (Phase 2 first draft dropped them, breaking landmine 4's center-when-fit pattern).
- Wrapped in `@layer components { ... }`.

**Acceptance for this file**:
- [ ] Zero `vw`.
- [ ] `.stagedSlot` uses `aspect-ratio: 5/7` to derive width from height, not from viewport.
- [ ] Landmine comment preserved (GPU layer translateZ).
- [ ] `.stagedRow::before` and `::after` flex spacers present — verify centering behavior at 1 staged card (centered), 2 (centered), 4 (centered), 6 (left-aligned scrollable).
- [ ] Wrapped in `@layer components { ... }`.

#### §2.3.4 `SmartActionBox.module.css` — REWRITE (153 LOC → ~155 LOC)

**Current problems**:
- **Massive stale fallback contamination**: `#d44030 x6`, `#2aaa98 x6`, `#d48820 x6`, `#1f3338 x6`, `#b8a890`, `#6a6050`, `#3a5860`, `#ff0000` (**wrong fallback** — `theme.ts` says `--red-glow = #ff3020`), `#c52b2b`, `#1a8a78`, `#b06b10` (all light-mode mismatches), `#faf8f0`.
- 8 unique box-shadow values (all hardcoded glow effects).
- `breathe 3s ease-in-out infinite` and `breatheIntense 1.5s ease-in-out infinite` animations with hardcoded durations.
- Many unique padding / radius / border values.
- **4 orphan `[data-theme="light"]` blocks** at lines 130-147 wire old `theme.ts` tokens. Deleted by the full-file rewrite below.
- **Class name cascade** — Phase 2's rewrite renames `.hint → .standby`, `.target → .comboPair/.comboTriple/.action`, `.ready → .action`. SmartActionBox.tsx (current source lines 99, 123, 133, 146, 155) uses the old names. Full TSX edit prescription is in §2.3.4b below.

**Rewritten file content** (deepening corrections: `@layer components` wrapper, `--motion-ease-standard → --motion-ease-base` (3 sites), `--motion-duration-base → --motion-duration-essential-pulse` for `.drawIntense`, `--motion-duration-dramatic → --motion-duration-essential-pulse` for `.action`, `color-mix(in srgb → in oklab)` per Phase 1 lint Rule 5, `@media (prefers-reduced-motion)` block preserved with explicit non-zeroing comment):

```css
/* SmartActionBox.module.css
   Single-indicator contextual action button. Shows current player turn state,
   validation status, or the action to perform when cards are staged.
   Seven distinct states drive typography, color, border, and glow variants.

   Animation tier: .action and .drawIntense breathe pulses are GAMEPLAY-ESSENTIAL
   (turn-active CTA "act now" + near-empty-deck Burned warning). They consume
   --motion-duration-essential-pulse, which survives prefers-reduced-motion: reduce
   per Phase 1 §2.9. Decorative state-swap transitions use the regular --fast tier.
*/

@layer components {
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
      background var(--motion-duration-fast) var(--motion-ease-base),
      border-color var(--motion-duration-fast) var(--motion-ease-base),
      box-shadow var(--motion-duration-fast) var(--motion-ease-base);
  }

  .box:disabled,
  .box[aria-disabled="true"] {
    cursor: not-allowed;
    color: var(--color-fg-disabled);
    background: var(--color-bg-surface);
  }

  /* Keyboard focus indicator — outline (not box-shadow) so the focus ring
     never fights variant glow effects. WCAG 2.4.7. */
  .box:focus-visible {
    outline: 2px solid var(--color-border-focus);
    outline-offset: var(--space-1);
  }

  /* State: not my turn — "Stand by, operative" (renamed from .hint in TSX) */
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

  /* State: draw when deck is almost empty — gameplay-essential warning pulse.
     Consumes --motion-duration-essential-pulse: survives prefers-reduced-motion. */
  .drawIntense {
    color: var(--color-fg-primary);
    background: var(--color-bg-danger);
    border-color: var(--color-accent-burned);
    box-shadow: var(--shadow-glow-danger);
    animation: breatheIntense var(--motion-duration-essential-pulse) ease-in-out infinite alternate;
  }

  /* State: valid pair / triple (renamed from .target in TSX) */
  .comboPair,
  .comboTriple {
    color: var(--color-fg-primary);
    background: var(--color-bg-success);
    border-color: var(--color-border-success);
    box-shadow: var(--shadow-glow-success);
  }

  /* State: valid single with action (renamed from .ready/.target in TSX).
     Gameplay-essential CTA pulse — survives prefers-reduced-motion. */
  .action {
    color: var(--color-fg-primary);
    background: var(--color-bg-interactive);
    border-color: var(--color-border-focus);
    box-shadow: var(--shadow-glow-accent);
    animation: breathe var(--motion-duration-essential-pulse) ease-in-out infinite alternate;
  }

  /* State: invalid selection — non-interactive error state */
  .invalid {
    color: var(--color-fg-danger);
    background: var(--color-bg-danger);
    border-color: var(--color-border-danger);
    cursor: not-allowed;
  }

  /* Hint text (secondary line beneath primary) — distinct from .standby state class */
  .hintText {
    display: block;
    margin-top: var(--space-1);
    font-family: var(--font-body);
    font-size: var(--text-caption);
    font-weight: 400;
    color: var(--color-fg-secondary);
    letter-spacing: 0;
  }

  /* Breathe animations — both consume --motion-duration-essential-pulse via
     the .action and .drawIntense rules above. The visual differentiation
     between "gentle ready" and "urgent warning" comes from the keyframe
     content (scale amplitude + glow intensity), NOT from duration.
     Phase 1 follow-up may add --motion-duration-essential-pulse-urgent (900ms)
     for a sharper visual differential — flagged as Phase 1 amendment item. */
  @keyframes breathe {
    0%, 100% {
      box-shadow: var(--shadow-glow-accent);
      transform: scale(1);
    }
    50% {
      box-shadow:
        0 0 20px color-mix(in oklab, var(--color-accent-operative) 60%, transparent),
        0 0 40px color-mix(in oklab, var(--color-accent-operative) 30%, transparent);
      transform: scale(1.01);
    }
  }

  @keyframes breatheIntense {
    0%, 100% {
      box-shadow: var(--shadow-glow-danger);
      transform: scale(1);
    }
    50% {
      box-shadow:
        0 0 30px color-mix(in oklab, var(--color-accent-burned) 80%, transparent),
        0 0 60px color-mix(in oklab, var(--color-accent-burned) 40%, transparent);
      transform: scale(1.03);
    }
  }

  /* Reduced-motion: essential-pulse already survives via Phase 1 §2.9 token
     dual-family (1400ms baseline → 2400ms reduce). The breathe and
     breatheIntense animations keep running, slowed for vestibular comfort.
     This block is intentionally EMPTY for documentation: the rewrite does
     NOT zero out the breathe animations, because they carry gameplay
     information (turn-state CTA + near-empty-deck warning) per WCAG 2.3.3
     essential-motion carve-out. PRESERVE the absence of an override here. */
  @media (prefers-reduced-motion: reduce) {
    /* Intentionally empty — see comment above. */
  }
}
```

**Key transformations**:
- All 26 stale hex fallbacks → removed.
- 8 box-shadow values → consolidated into `--shadow-glow-accent` + `--shadow-glow-danger` + `--shadow-glow-success`.
- **`breathe 3s` and `breatheIntense 1.5s` → `var(--motion-duration-essential-pulse)` (both)** — consume essential-pulse so they survive `prefers-reduced-motion: reduce` (gameplay signals must NOT zero per Phase 1 §2.9). Visual intensity differential moves from duration to keyframe content (scale + glow). Phase 1 follow-up amendment may add `essential-pulse-urgent: 900ms` to restore the duration-based differential.
- **`color-mix(in srgb → in oklab)`** — Phase 1 lint Rule 5 mandates `oklab` for `color-mix` (Safari oklch live bug).
- **`--motion-ease-standard → --motion-ease-base`** at 3 transition declarations.
- 7 state variants (standby, draw, drawIntense, comboPair, comboTriple, action, invalid) — class names below cascade through to TSX rename in §2.3.4b.
- **`.hint` renamed to `.hintText`** — the old `.hint` class collided semantically with the `.standby` state-class rename. `.hintText` is the secondary text label (used inside `.standby`-state boxes); `.standby` is the state class itself.
- **Keyboard focus indicator added** (WCAG 2.4.7).
- Wrapped in `@layer components { ... }`.
- Empty `@media (prefers-reduced-motion: reduce)` block kept as a documentation marker (deliberately does not zero the essential animations).

**Acceptance for this file**:
- [ ] Zero hardcoded hex.
- [ ] Zero hardcoded motion timing.
- [ ] 7 state variants each have a clear role mapping.
- [ ] `breathe` and `breatheIntense` consume `--motion-duration-essential-pulse` (gameplay-essential carve-out).
- [ ] `color-mix()` uses `in oklab` (lint Rule 5).
- [ ] `--motion-ease-base` (not `-standard`) at all 3 transition sites.
- [ ] `.box:focus-visible` paints an outline ring (WCAG 2.4.7).
- [ ] All 4 orphan `[data-theme="light"]` blocks deleted by the rewrite.
- [ ] Wrapped in `@layer components { ... }`.
- [ ] §2.3.4b TSX class rename cascade applied to SmartActionBox.tsx (see below).

#### §2.3.4b SmartActionBox.tsx — class rename cascade (NEW in deepening)

The §2.3.4 CSS rewrite renames classes that the current `SmartActionBox.tsx` uses. Without these TSX edits, `styles.X` returns `undefined` at runtime → unstyled buttons. Phase 2's first draft missed this entirely; deepening adds the prescription.

**File:** `src/client/player/SmartActionBox.tsx` (current source 162 lines).

**Renames the §2.3.4 rewrite forces:**
- `.hint` → `.standby` (state class for the not-my-turn message)
- `.target` → `.comboPair` (when `playType.kind === 'pair'`)
- `.target` → `.comboTriple` (when `playType.kind === 'triple'`)
- `.target` → `.action` (when `playType.requiresTarget` for a single card)
- `.ready` → `.action` (when single card without `requiresTarget`)

**Exact edits:**

Edit 1 — line 99 (the no-cards-staged hint case):
```diff
- className: `${styles.box} ${styles.hint}`,
+ className: `${styles.box} ${styles.standby}`,
```

Edit 2 — line 123 (pair):
```diff
-     className: `${styles.box} ${styles.target}`,
+     className: `${styles.box} ${styles.comboPair}`,
```

Edit 3 — line 133 (triple):
```diff
-     className: `${styles.box} ${styles.target}`,
+     className: `${styles.box} ${styles.comboTriple}`,
```

Edit 4 — line 146 (single requiring target):
```diff
-     className: `${styles.box} ${styles.target}`,
+     className: `${styles.box} ${styles.action}`,
```

Edit 5 — line 155 (single ready, no target needed):
```diff
-     className: `${styles.box} ${styles.ready}`,
+     className: `${styles.box} ${styles.action}`,
```

Optional Edit 6 — TRANSITION literal (line 29). Phase 4 owns Framer Motion inline literal migration, so this stays as-is in Phase 2:
```tsx
const TRANSITION = { duration: 0.2, ease: 'easeInOut' as const }
```
Phase 4 will replace with `MOTION.SNAPPY` from `@client/shared/animation-config`. Documented as an intentional Phase 2/Phase 4 seam.

**Verification:**
1. After Phase 2 migration, run `pnpm typecheck` — passes (CSS Modules return `string | undefined`, the type system doesn't catch missing keys, but the next check does).
2. Run `pnpm dev` and visit `/player.html?room=TEST`. Walk through every SmartActionBox state in DevTools elements panel:
   - Stand by, operative (not my turn) — confirm `.box.standby` class on the rendered element.
   - End turn — draw (N) (my turn, nothing staged) — confirm `.box.draw` class.
   - End turn — draw with deck ≤5 — confirm `.box.draw.drawIntense` class with the warning pulse animating.
   - Stage 2 matching cards — confirm `.box.comboPair` class with the success glow.
   - Stage 3 matching cards — confirm `.box.comboTriple` class.
   - Stage 1 valid action card requiring target — confirm `.box.action` class with the CTA pulse.
   - Stage 1 valid action card not requiring target — confirm `.box.action` class.
   - Stage 1 invalid card — confirm `.box.invalid` class.
3. Grep `rg "styles\\.(hint|ready|target)\\b" src/client/player/SmartActionBox.tsx` — expects ZERO matches after the cascade.

#### §2.3.5 `TitleBar.module.css` — REWRITE (85 LOC → ~80 LOC)

**Current problems**:
- `#30c060` raw green for the "connected" status dot — not a token.
- `#30c06080` 8-digit hex for a glow — not a token.
- Stale fallbacks: `#d48820`, `#d44030`, `#f5f0e0`, `#b8a890`, `#243c42`, `#3a5860`, `#f5f0e8`, `#e8e0d0`, `#d4cfc5`.
- Hardcoded `padding: 4px 10px`, `min-height: 28px`, `gap: 6px`, `width/height: 7px`, `font-size: 12px/11px`, `box-shadow: 0 0 4px`, `animation: blink 1.2s ease-in-out infinite`.
- **1 orphan `[data-theme="light"]` block** at lines 76-79. Deleted by full-file rewrite.
- **Class removal**: TitleBar.tsx (line 24) uses `<span className={styles.left}>`. Phase 2's first draft removed `.left` from the rewrite without enumerating the TSX edit. §2.3.5b below preserves `.left` as a flex layout class.

**Rewritten file content** (deepening corrections: `@layer components` wrapper, `--motion-ease-standard → --motion-ease-base`, `--motion-duration-dramatic → --motion-duration-essential-spin` for `.dotConnecting`, `color-mix(in srgb → in oklab)`, `.left` flex-group class preserved):

```css
/* TitleBar.module.css
   Top chrome strip: connection dot + player name + room code.
   Sticky to the top of the phone viewport.

   .dotConnecting blink is GAMEPLAY-ESSENTIAL — the only signal that the app is
   trying to reconnect. Frozen dot reads as frozen app. Consumes
   --motion-duration-essential-spin (1000ms baseline / 1500ms reduce per Phase 1
   §2.9), syncing cadence with ConnectionOverlay .spinner so both fire in sync
   during a reconnect.
*/

@layer components {
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

  /* Left flex group — connection dot + player name. PRESERVE this class:
     TitleBar.tsx wraps the dot+name pair in <span className={styles.left}>.
     Phase 2's first draft removed .left without the corresponding TSX edit. */
  .left {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex: 1 1 auto;
    min-width: 0;
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
    box-shadow: 0 0 var(--space-1) color-mix(in oklab, var(--color-fg-success) 50%, transparent);
  }

  /* Connection state: connecting — gameplay-essential blink, survives reduce */
  .dotConnecting {
    background: var(--color-accent-drama);
    animation: titleBarBlink var(--motion-duration-essential-spin) var(--motion-ease-base) infinite;
  }

  /* Connection state: disconnected */
  .dotDisconnected {
    background: var(--color-fg-danger);
    box-shadow: 0 0 var(--space-1) color-mix(in oklab, var(--color-fg-danger) 50%, transparent);
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
}
```

**Acceptance for this file**:
- [ ] Zero hardcoded hex.
- [ ] Connected-dot color uses the success semantic token, not a raw green.
- [ ] `.dotConnecting` consumes `--motion-duration-essential-spin` (gameplay signal — survives `prefers-reduced-motion`).
- [ ] `--motion-ease-base` (not `-standard`).
- [ ] `color-mix()` uses `in oklab` (lint Rule 5).
- [ ] `.left` flex-group class present (TitleBar.tsx requires it).
- [ ] Min-height is `--size-touch-target` (44px).
- [ ] Orphan `[data-theme="light"]` block deleted by the rewrite.
- [ ] Wrapped in `@layer components { ... }`.

#### §2.3.5b TitleBar.tsx — class verification (NEW in deepening)

No TSX edits required. The Phase 2 first draft removed `.left` from the CSS without the TSX edit; the deepened §2.3.5 rewrite preserves `.left` as a flex-group class. TitleBar.tsx (line 24) `<span className={styles.left}>` continues to work unchanged.

**Verification:**
- Run `pnpm typecheck` after Phase 2 — passes.
- Visit `/player.html?room=TEST`, inspect `.titleBar` in DevTools elements panel — confirm both `.left` (wrapping dot + name) and `.roomCode` (sibling, right-aligned) render correctly.

#### §2.3.6 `StatusBar.module.css` — REWRITE (49 LOC → ~60 LOC)

**Current problems**:
- Stale fallbacks: `#d48820`, `#1a2a2e`, `#b8a890`, `#3a5860`, `#6a6050`, light-mode `#b06b10`, `#f5f0e8`.
- `min-height: 32px` — below WCAG 2.5.5 minimum touch target of 44px (StatusBar is non-interactive, so this isn't a hard violation, but consistency with TitleBar is the right call).
- Hardcoded `padding: 4px 12px`, `font-size: 11px/12px/13px`, `border-bottom: 1px`.
- **`composes: base` pattern**: current StatusBar.module.css declares `.base` and uses `composes: base` in `.yourTurn` and `.waiting`. Phase 2's first draft eliminated `.base` without preserving the composition. Rewrite duplicates the shared properties into each variant — same effect, simpler structure.
- **`.pileInfo → .pileCount` rename**: current TSX uses `styles.pileInfo`. Phase 2's rewrite renames to `.pileCount`. §2.3.6b enumerates the TSX edit.
- **1 orphan `[data-theme="light"]` block** at lines 46-49. Deleted by the full-file rewrite.

**Rewritten file content** (deepening corrections: `@layer components` wrapper, `.statusBar` is the merged base + all variants extend it via class composition in TSX, `.pileCount` rename documented for §2.3.6b):

```css
/* StatusBar.module.css
   Below the TitleBar. Shows turn state message: "YOUR TURN" / "Waiting for X — N in pile".
   Above the workbench; not interactive — pure communication.

   Composition pattern: TSX applies `${styles.statusBar} ${styles.yourTurn}`
   or `${styles.statusBar} ${styles.waiting}`. The .statusBar class carries
   shared layout/spacing; the variant classes carry color/weight overrides.
   Replaces the pre-rebuild `composes: base` pattern (CSS Modules composition
   was harder to reason about for one shared base + two variants).
*/

@layer components {
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

  /* Pile count — visually subordinate to the main message.
     Renamed from .pileInfo (current StatusBar.tsx uses .pileInfo).
     §2.3.6b enumerates the TSX rename. */
  .pileCount {
    font-family: var(--font-mono);
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
    padding: 0 var(--space-2);
    border-left: 1px solid var(--color-border-subtle);
    margin-left: var(--space-2);
  }
}
```

**Acceptance for this file**:
- [ ] Zero hardcoded hex.
- [ ] `min-height: var(--size-touch-target)` — 44px (consistency with TitleBar).
- [ ] `.statusBar` class is the shared base; `.yourTurn` and `.waiting` are variants applied alongside it via TSX class composition.
- [ ] `.pileCount` uses monospace for numerical legibility.
- [ ] Orphan `[data-theme="light"]` block deleted.
- [ ] Wrapped in `@layer components { ... }`.
- [ ] §2.3.6b TSX class rename + composition cleanup applied.

#### §2.3.6b StatusBar.tsx — class rename + composition pattern (NEW in deepening)

The §2.3.6 CSS rewrite renames `.pileInfo → .pileCount` and replaces `composes: base` with explicit class composition via the TSX. Phase 2's first draft missed both edits.

**File:** `src/client/player/StatusBar.tsx` (current source ~25 lines).

**Current TSX structure** (relevant excerpts):
```tsx
// Current — uses composes: base internally to share .statusBar properties
{isMyTurn ? (
  <div className={styles.yourTurn}>YOUR TURN</div>
) : (
  <div className={styles.waiting}>
    Waiting for {currentPlayerName} <span className={styles.pileInfo}>— {drawPileCount} in pile</span>
  </div>
)}
```

**Replacement TSX:**
```tsx
{isMyTurn ? (
  <div className={`${styles.statusBar} ${styles.yourTurn}`}>YOUR TURN</div>
) : (
  <div className={`${styles.statusBar} ${styles.waiting}`}>
    Waiting for {currentPlayerName} <span className={styles.pileCount}>— {drawPileCount} in pile</span>
  </div>
)}
```

**Edits:**
1. The `.yourTurn` div explicitly composes `${styles.statusBar} ${styles.yourTurn}` (replaces the implicit `composes: base` chain).
2. The `.waiting` div explicitly composes `${styles.statusBar} ${styles.waiting}`.
3. The `.pileInfo` span renames to `.pileCount`.

**Verification:**
- Run `pnpm typecheck` after Phase 2 — passes.
- Visit `/player.html?room=TEST`, alternate turns between two browsers. Confirm:
  - Player whose turn it is sees a high-contrast "YOUR TURN" pill (`.statusBar.yourTurn`).
  - Other players see "Waiting for X — N in pile" with the pile count in monospace (`.statusBar.waiting` + `.pileCount`).
- Grep `rg "styles\\.pileInfo" src/client/player/StatusBar.tsx` — expects ZERO matches.

#### §2.3.7 `FloatingActionButton.module.css` — NEW (replaces InterceptButton; NopeButton is dead code)

**Asymmetric consolidation note** (deepening correction): NopeButton verified ALREADY ORPHANED — `grep -rn "from.*NopeButton" src/client/` returns zero consumer imports. The Phase 2 first draft framed this as "consolidate two live components," but reality is "delete the dead `NopeButton.*` files + migrate `InterceptButton.*` → `FloatingActionButton.*`." The new component PRESERVES InterceptButton's full architecture (hook-driven state, `secondsLeft` countdown, `disabled={!hasIntercept}`) and adds a `.nope` CSS class for forward-compat — the variant has no live consumer in 2026 (the protocol reuses `nope` action name internally per spec §6.4 Tier 3).

**Position-fixed migration** (Phase 1 lint Rule 3 + landmine 7 — WebKit bug 297779): the FAB must NOT use `position: fixed`. Resolution: render the FAB as a direct child of the `<Player>` Fragment (sibling of `<PhoneRouter>`, alongside `<ErrorToast />` and `<ConnectionOverlay />`), THEN use `position: absolute` against `#root`. Phase 1 §2.12 follow-up establishes the positioning contract: `html, body { position: relative; height: var(--size-viewport-safe); overflow: hidden; }` + `#root { position: relative; height: 100% }`. This deletes the need for the `createPortal` indirection and removes `<div id="nope-root">` from `player.html`.

**New component API:**

```tsx
// FloatingActionButton.tsx — internalizes all state via hooks (no props)
export function FloatingActionButton() {
  const nopeWindow = useNopeWindow()
  const hand = useHand()
  const myPlayer = useMyPlayer()
  const sendAction = useSendAction()

  const hasIntercept = hand.some(c => c.type === 'intercepted')
  const isAlive = myPlayer?.isAlive ?? false
  const show = !!nopeWindow && isAlive

  // Countdown seconds remaining (preserved from InterceptButton.tsx pattern)
  const [secondsLeft, setSecondsLeft] = useState(0)
  useEffect(() => {
    if (!nopeWindow) { setSecondsLeft(0); return }
    const update = () => {
      const remaining = Math.max(0, Math.ceil((nopeWindow.deadlineMs - Date.now()) / 1000))
      setSecondsLeft(remaining)
    }
    update()
    const timer = setInterval(update, 250)
    return () => clearInterval(timer)
  }, [nopeWindow?.deadlineMs, nopeWindow?.generation])

  return (
    <AnimatePresence>
      {show && (
        <m.button
          className={`${styles.fab} ${styles.intercept} ${secondsLeft <= 2 ? styles.urgent : ''}`}
          disabled={!hasIntercept}
          onClick={() => {
            haptic('medium')
            sendAction({ type: 'nope' })
          }}
          aria-label="Play Intercepted card"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={MOTION.SNAPPY}
        >
          INTERCEPT{secondsLeft > 0 ? ` ${secondsLeft}s` : ''}
        </m.button>
      )}
    </AnimatePresence>
  )
}
```

**`FloatingActionButton.module.css`** (deepening corrections: `@layer components` wrapper, `position: fixed → absolute`, `--motion-ease-standard → --motion-ease-base`, `--motion-duration-dramatic → --motion-duration-essential-pulse` for `.urgent`, `--color-fg-on-accent → --color-fg-on-burned`, `:disabled` rule preserved, `color-mix(in srgb → in oklab)`):

```css
/* FloatingActionButton.module.css
   Replaces InterceptButton (NopeButton was already orphaned dead code).
   Variant prop drives label and accent color.

   Positioning: position: absolute against the phone-root contract (Phase 1 §2.12
   follow-up: html, body, #root all position: relative + sized to viewport-safe).
   NO position: fixed — Phase 1 lint Rule 3 + landmine 7 (WebKit bug 297779).
   Renders as a direct child of <Player> Fragment, sibling of <PhoneRouter>,
   so it positions against #root (not inside the workbench).

   z-index: var(--z-sticky) — must remain on top of normal page content during
   the intercept window. Note: native <dialog> overlays (BottomSheet,
   ConnectionOverlay) cover the FAB via the top layer — intentional, since
   modal dialogs should outrank floating buttons.

   .urgent fabPulse is GAMEPLAY-ESSENTIAL — fires during intercept window.
   Without the pulse, the player has no affordance that the window is open.
   Consumes --motion-duration-essential-pulse, survives reduced-motion.
*/

@layer components {
  .fab {
    position: absolute;
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
    touch-action: manipulation;
    z-index: var(--z-sticky);
    transition:
      transform var(--motion-duration-base) var(--motion-ease-base),
      box-shadow var(--motion-duration-base) var(--motion-ease-base);
  }

  .fab:active {
    transform: scale(0.95);
  }

  .fab:focus-visible {
    outline: 2px solid var(--color-border-focus);
    outline-offset: 2px;
  }

  /* Disabled state — preserved from InterceptButton (Phase 2 first draft
     dropped this rule). Fires when player has no Intercepted card in hand
     during the intercept window — button still renders but is non-interactive. */
  .fab:disabled {
    opacity: 0.35;
    cursor: default;
    box-shadow: none;
  }

  /* Variant: intercept (the hostile "block their play" action) */
  .intercept {
    background: var(--color-bg-danger);
    color: var(--color-fg-on-burned);
    border-color: var(--color-accent-burned);
    box-shadow: var(--shadow-glow-danger);
    font-size: var(--text-caption);
  }

  /* Variant: nope (forward-compat for protocol naming — no live consumer 2026) */
  .nope {
    background: var(--color-bg-danger);
    color: var(--color-fg-on-burned);
    border-color: var(--color-accent-burned);
    box-shadow: var(--shadow-glow-danger);
    font-size: var(--text-body);
  }

  /* Urgency animation — active during the last 2 seconds of the intercept window.
     Gameplay-essential signal: survives prefers-reduced-motion via essential-pulse. */
  .urgent {
    animation: fabPulse var(--motion-duration-essential-pulse) ease-in-out infinite alternate;
  }

  @keyframes fabPulse {
    0%, 100% {
      box-shadow: var(--shadow-glow-danger);
      transform: scale(1);
    }
    50% {
      box-shadow:
        0 0 40px var(--color-accent-burned),
        0 0 80px color-mix(in oklab, var(--color-accent-burned) 50%, transparent);
      transform: scale(1.05);
    }
  }
}
```

**Render-tree change** (TSX edits to `Player.tsx`):

The current `Player.tsx` renders `<InterceptButton />` deep inside the inner `PlayingView` function (line 435). To make `position: absolute` against `#root` work correctly, the new `<FloatingActionButton />` must render as a TOP-LEVEL sibling of `<PhoneRouter />`, alongside `<ErrorToast />` and `<ConnectionOverlay />`:

```tsx
// Player.tsx — top of file imports
- import { InterceptButton } from './InterceptButton'
+ import { FloatingActionButton } from './FloatingActionButton'

// Player.tsx — Player function return statement (replace the existing Fragment)
return (
  <>
    {protocolMismatch && <div ...>Game updated — please refresh</div>}
    <PhoneRouter ... />
    <ErrorToast />
    <ConnectionOverlay status={connectionStatus} />
    <FloatingActionButton />
  </>
)

// Player.tsx — inside PlayingView function (line 435), DELETE this line:
- <InterceptButton />
```

**`player.html` edit** — delete the portal target div:

```html
<!-- player.html line 14 — DELETE this line: -->
- <div id="nope-root"></div>
```

The portal indirection is gone. The FAB renders inline as a sibling of `<PhoneRouter>` and positions against `#root` directly.

**Files to delete after this lands**:
- `src/client/player/NopeButton.tsx` (already orphaned, no consumers)
- `src/client/player/NopeButton.module.css`
- `src/client/player/InterceptButton.tsx` (replaced by FloatingActionButton)
- `src/client/player/InterceptButton.module.css`

**Acceptance:**
- [ ] Zero `position: fixed` (lint Rule 3 grep).
- [ ] `.fab` consumes `position: absolute` against `#root`.
- [ ] `.urgent` consumes `--motion-duration-essential-pulse` (gameplay signal — survives reduced-motion).
- [ ] `--color-fg-on-burned` (not `-on-accent`) on both `.intercept` and `.nope` variants.
- [ ] `:disabled` rule present (preserves InterceptButton behavior when player has no Intercepted card).
- [ ] `:focus-visible` outline ring (WCAG 2.4.7).
- [ ] `--motion-ease-base` (not `-standard`) at both transition declarations.
- [ ] `color-mix(in oklab, ...)` (not `srgb`).
- [ ] Wrapped in `@layer components { ... }`.
- [ ] `<FloatingActionButton />` renders as direct child of `<Player>` Fragment (NOT inside `PlayingView`).
- [ ] `<div id="nope-root">` deleted from `player.html`.
- [ ] `grep -rn "NopeButton\|InterceptButton" src/` returns zero results after migration.
- [ ] Visual test: trigger an intercept window from a second browser. Confirm the FAB appears bottom-right within ~100ms, sized 64-80px (clamp), pulsing, with the countdown text. Confirm tapping it sends the intercept and fires haptic. Confirm `disabled` state appears greyed-out when the player has no Intercepted card. Confirm at iPhone DevTools 393×852 the FAB does NOT drift during the 5-second window.

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

   Spinner is gameplay-essential — consumes --motion-duration-essential-spin
   per Phase 1 §2.9. Survives prefers-reduced-motion.
*/

@layer components {

.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: var(--size-viewport-safe);
  padding-top: max(var(--space-8), var(--inset-top));
  padding-right: max(var(--space-8), var(--inset-right));
  padding-bottom: max(var(--space-8), var(--inset-bottom));
  padding-left: max(var(--space-8), var(--inset-left));
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

/* Room code badge — pill with display-font + ochre accent on the code itself.
   --radius-pill was deleted in Phase 1 deepening — use --radius-full directly. */
.roomBadge {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-5);
  border-radius: var(--radius-full);
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
  /* Form column cap — consumes the unified --size-content-narrow token added in
     Phase 1 deepening follow-up sweep. 5 consumers across the phase share this
     fluid svh-clamp (280→320px range). */
  max-width: var(--size-content-narrow);
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
  transition: border-color var(--motion-duration-fast) var(--motion-ease-base);
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
  transition: opacity var(--motion-duration-fast) var(--motion-ease-base);
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
  /* Gameplay-essential app-state signal — survives prefers-reduced-motion
     via Phase 1 §2.9 essential-spin (1000ms baseline / 1500ms reduce). */
  animation: joinScreenSpin var(--motion-duration-essential-spin) linear infinite;
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
  /* Dots step animation — 4 steps × 375ms per step (1500ms total) via
     --motion-duration-dots. Phase 1 §2.2 added the named token specifically for
     this consumer; landmine 6 RETIRED in deepening (no exception exists). */
  animation: joinScreenDots var(--motion-duration-dots) steps(4, end) infinite;
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
  /* Lobby list cap — consumes the unified --size-content-narrow token. */
  max-width: var(--size-content-narrow);
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

/* Reduced motion: .spinner consumes --motion-duration-essential-spin which
   already survives prefers-reduced-motion (1500ms slowed rotation per Phase 1
   §2.9 — Phase 1 adjudicated that slowed rotation is acceptable for essential
   spinners; opacity-pulse fallback is abandoned). .iconWrap popIn zeroes
   automatically via decorative --motion-duration-slow. Only the dots animation
   needs an explicit override to freeze at "..." rather than empty content. */
@media (prefers-reduced-motion: reduce) {
  .waitingDots::after {
    animation: none;
    content: '...';
  }
}

} /* end @layer components */
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
- **2 hardcoded transitions** (`border-color 0.15s`, `opacity 0.15s`) → `var(--motion-duration-fast) var(--motion-ease-base)` (150ms, with explicit easing curve). Pre-rebuild had no easing specified — browser default is `ease`, which is close to but not identical to standard. Tightening the contract.
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
- [ ] `.input:focus` border-color animation runs cleanly at the new `--motion-duration-fast` + `--motion-ease-base` timing.
- [ ] `.spinner` consumes `--motion-duration-essential-spin` (Phase 1 §2.9 canonical consumer); slowed rotation under reduce is the canonical Phase 1 §2.9 behavior. The `joinScreenSpinnerPulse` keyframe and the @media `.spinner` override are GONE.
- [ ] Wrapped in `@layer components { ... }`.
- [ ] All three states render correctly: connecting (spinner + status), enter-name (title + roomBadge + form), joined (joinedCard + iconWrap pop-in + waiting + lobby list when multiplayer).
- [ ] BURNED title at `--text-display` (32px on iPhone SE, 48px on iPad portrait) reads as a branding moment, not as body text.
- [ ] Visual review against Dreamland reference: the room code in `--color-accent-drama` (ochre) feels period-correct against the warm-charcoal background, not jarring.
- [ ] `--size-content-narrow` exists in Phase 1's `semantic.phone.css` before this file is executed in `/ce:work` (Phase 1 deepening adds it; until then, the raw `300px` / `320px` max-widths are intentional placeholders).

#### §2.3.9 `EliminatedView.module.css` — REWRITE (82 LOC → ~80 LOC)

**Current problems**:
- `#e03535` stale fallback (should be `--color-accent-burned`).
- Hardcoded `padding: 32px 24px`, `gap: 12px/16px/10px/8px`, `margin-top: 20px/16px`, `padding: 16px`, `border-radius: 12px`, `max-width: 300px`, `font-size: 64px/32px/16px/15px/14px/13px`, `drop-shadow(0 0 20px)`, `letter-spacing: 0.08em`.

**Rewritten file content** (deepening corrections: `@layer components` wrapper, `100svh → var(--size-viewport-safe)` + safe-area inset padding, `min(90%, 320px) → min(90%, var(--size-content-narrow))` for `.flavor` and `.aliveList`, `color-mix(in srgb → in oklab)`, class names match the §2.3.9b TSX cascade):

```css
/* EliminatedView.module.css
   Full-screen eliminated state. Replaces PlayingView when the player is no longer alive.
   No interaction beyond dismissing — by design, the §5.6 "vocal participation" experience.
   Player watches the TV with the group.
*/

@layer components {
  .view {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-4);
    min-height: var(--size-viewport-safe);
    padding-top: max(var(--space-8), var(--inset-top));
    padding-right: max(var(--space-6), var(--inset-right));
    padding-bottom: max(var(--space-8), var(--inset-bottom));
    padding-left: max(var(--space-6), var(--inset-left));
    background: var(--color-bg-app);
    color: var(--color-fg-primary);
    font-family: var(--font-body);
    text-align: center;
    box-sizing: border-box;
  }

  /* Animated skull icon — spring entry, scale 0 → 1, rotate -15° → 0°.
     Framer Motion controls the entry animation; CSS controls the resting state.
     Wrapper class .skullWrap is consumed by the m.div in EliminatedView.tsx
     (renamed from .explosionWrap per §2.3.9b). */
  .skullWrap {
    flex: 0 0 auto;
  }

  .skull {
    font-size: var(--text-display);
    filter: drop-shadow(0 0 var(--space-5) color-mix(in oklab, var(--color-accent-burned) 60%, transparent));
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
    max-width: min(90%, var(--size-content-narrow));
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
    max-width: min(90%, var(--size-content-narrow));
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

  .prompt {
    font-family: var(--font-body);
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
    margin-top: var(--space-6);
    letter-spacing: 0.04em;
  }
}
```

**Acceptance for this file**:
- [ ] Zero hardcoded hex.
- [ ] Skull drop-shadow uses `color-mix(in oklab, ...)` against `--color-accent-burned`.
- [ ] Title uses `--color-accent-burned` directly.
- [ ] Phone root uses `min-height: var(--size-viewport-safe)` + `--inset-*` padding.
- [ ] `.flavor` and `.aliveList` consume `min(90%, var(--size-content-narrow))`.
- [ ] `.skullWrap` class added (replaces `.explosionWrap` from current TSX).
- [ ] §2.3.9b TSX class rename cascade applied to EliminatedView.tsx.
- [ ] Wrapped in `@layer components { ... }`.

#### §2.3.9b EliminatedView.tsx — class rename cascade (NEW in deepening)

The §2.3.9 CSS rewrite renames most classes that EliminatedView.tsx (current source ~85 lines) uses. Without these TSX edits, `styles.X` returns `undefined` at runtime → unstyled elements. Phase 2's first draft missed the cascade entirely.

**File:** `src/client/player/EliminatedView.tsx`.

**Renames the §2.3.9 rewrite forces:**
- `.container` → `.view`
- `.explosionWrap` → `.skullWrap` (preserved as the m.div wrapper, just renamed for accuracy — the contents are a skull, not an explosion)
- `.remaining` → `.aliveList`
- `.remainingLabel` → `.aliveListLabel`
- `.playerList` → ELIMINATED — children render directly inside `.aliveList` via flex-wrap
- `.playerChip` → `.alivePlayer`
- `.watchPrompt` → `.prompt`

**Exact edits:**

Edit 1 — line 29:
```diff
-     <div className={styles.container}>
+     <div className={styles.view}>
```

Edit 2 — line 31:
```diff
-       className={styles.explosionWrap}
+       className={styles.skullWrap}
```

Edit 3 — line 58:
```diff
-       <m.div className={styles.remaining}>
+       <m.div
+         className={styles.aliveList}
```

Edit 4 — line 63:
```diff
-       <div className={styles.remainingLabel}>Still alive</div>
+       <div className={styles.aliveListLabel}>Still alive</div>
```

Edit 5 — lines 64-71 (the playerList wrapper is eliminated; children render directly):
```diff
-       <div className={styles.playerList}>
-         {alivePlayers.map(p => (
-           <div key={p.id} className={styles.playerChip}>
-             <PlayerIcon color={p.color} size={18} />
-             <span>{p.name}</span>
-           </div>
-         ))}
-       </div>
+       {alivePlayers.map(p => (
+         <div key={p.id} className={styles.alivePlayer}>
+           <PlayerIcon color={p.color} size={18} />
+           <span>{p.name}</span>
+         </div>
+       ))}
```

Edit 6 — line 75:
```diff
-       <m.div className={styles.watchPrompt}>
+       <m.div className={styles.prompt}>
```

Plus the §2.3.9a Tier 1 retheme edits below (title + FLAVOR_LINES — see updated §2.3.9a for exact prescriptions).

**Verification:**
- Run `pnpm typecheck` after Phase 2 — passes (CSS Modules return `string | undefined`; the Player.tsx error path won't catch this, only visual review will).
- Trigger an elimination in a 5-player game from a second browser. Confirm:
  - `.view` is the outer flex container, `.skullWrap` wraps the 💀 emoji.
  - Title "You're Burned." renders in `--color-accent-burned`.
  - One of the 9 flavor lines (33% chance for the phrasing beat across the game) renders italic.
  - Alive list renders as flex-wrap of `.alivePlayer` chips with PlayerIcon + name.
  - Bottom prompt "Watch the TV for the action" renders muted.
- Grep `rg "styles\\.(container|explosionWrap|remaining|playerList|playerChip|watchPrompt)\\b" src/client/player/EliminatedView.tsx` — expects ZERO matches.

#### §2.3.9a Tier 1 retheme gap — EliminatedView.tsx edits

**This is a TSX edit, not a CSS edit. Per roadmap.md §3.3 the user-visible retheme gaps are Phase 2's responsibility because they block the §8.7 first-time-player test.**

**Deepening verification (agent 2):** the actual current `FLAVOR_LINES` array has **8 lines** (not 9 — the original "9-line" lead-in was a typo; the 9 refers to the new pool). The randomization mechanism `useMemo(pickFlavor, [])` calling `Math.random()` is **correct** and requires no fix — fresh random pick on every elimination mount, stable within the mount. No hard-coded `[0]` index.

**`src/client/player/EliminatedView.tsx:45`** — title line. Currently: `"You Exploded!"`. Replace with: **`"You're Burned."`** (or `"You&apos;re Burned."` for ESLint-agnostic JSX entity escape).

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

**Rewritten file content** (deepening corrections: `@layer components` wrapper, `position: fixed → absolute` per Phase 1 lint Rule 3, decorative `--motion-duration-fast` STAYS — the toast slide-in is sugar, not a gameplay signal):

```css
/* ErrorToast.module.css
   Transient error message shown when server rejects an action.
   Auto-dismisses after 2s; no user interaction required.

   Positioning: position: absolute against the phone-root contract (Phase 1 §2.12
   follow-up: html, body, #root all position: relative + sized to viewport-safe).
   NO position: fixed — Phase 1 lint Rule 3 + landmine 7.

   Renders as a direct child of <Player> Fragment (sibling of <PhoneRouter>),
   which positions it against #root. z-index: var(--z-toast) — above all page
   content, below native <dialog> top-layer overlays.

   The slideDown animation is DECORATIVE — the toast's visibility is controlled
   by React mount/unmount, not by the CSS animation. Under prefers-reduced-motion
   the toast appears instantly (correct behavior). Decorative tier.
*/

@layer components {
  .toast {
    position: absolute;
    top: max(var(--space-4), var(--inset-top));
    left: max(var(--space-4), var(--inset-left));
    right: max(var(--space-4), var(--inset-right));
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
}
```

**TSX touch-up** (ErrorToast.tsx — line 25 swap motion literal to token, optional Phase 4 prefab):

The current `transition={{ duration: 0.2, ease: 'easeOut' }}` is a Phase 4 concern (FM literal migration is out of Phase 2 scope per §6). Leave as-is; document the seam.

**Acceptance**:
- [ ] Zero `position: fixed`.
- [ ] `position: absolute` against `#root` (via Phase 1 §2.12 follow-up positioning contract).
- [ ] Top/left/right consume `max(--space-4, --inset-*)` for safe-area compliance.
- [ ] Wrapped in `@layer components { ... }`.
- [ ] Visual test: trigger a server-rejected action (e.g. play a card after subPhase has advanced). Toast slides down from the top. Confirm at iPhone DevTools 393×852 the toast does not drift.

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

@layer components {
  /* The <dialog> element. NO `position` declaration — UA stylesheet applies
     position: fixed + top-layer when showModal() is called. Override the
     UA's default centering via inset + margin. */
  .overlay {
    inset: 0;
    width: 100%;
    height: 100%;
    max-width: 100%;
    max-height: 100%;
    margin: 0;
    padding: 0;
    border: none;
    background: radial-gradient(
      ellipse at center,
      var(--color-bg-overlay-light) 0%,
      var(--color-bg-overlay-heavy) 100%
    );
    color: var(--color-fg-primary);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-4);
    overflow: hidden;
  }

  .overlay::backdrop {
    background: transparent;
  }

  .spinner {
    width: var(--space-10);
    height: var(--space-10);
    border: 3px solid var(--color-border-subtle);
    /* Top-border accent matches TitleBar .dotConnecting — same drama channel,
       same essential-spin cadence. Both fire in sync during reconnect. */
    border-top-color: var(--color-accent-drama);
    border-radius: var(--radius-full);
    animation: connectionSpin var(--motion-duration-essential-spin) linear infinite;
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

  /* No reduced-motion override — essential-spin token slows the rotation
     automatically (1000ms → 1500ms per Phase 1 §2.9). The pre-rebuild
     opacity-pulse fallback was abandoned in Phase 1 deepening adjudication. */
}
```

**TSX rewrite** (ConnectionOverlay.tsx — full file, current source ~19 lines):

```tsx
import { useEffect, useRef } from 'react'
import type { ConnectionStatus } from '@client/connection'
import styles from './ConnectionOverlay.module.css'

interface ConnectionOverlayProps {
  readonly status: ConnectionStatus
}

export function ConnectionOverlay({ status }: ConnectionOverlayProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const isConnecting = status !== 'connected'

  // Imperatively open/close the native dialog. Always-mounted lets the top
  // layer pick it up once; showModal()/close() toggles visibility.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (isConnecting && !dialog.open) {
      dialog.showModal()
    } else if (!isConnecting && dialog.open) {
      dialog.close()
    }
  }, [isConnecting])

  // Suppress Esc-to-dismiss — reconnection is not user-dismissable.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const handleCancel = (e: Event) => e.preventDefault()
    dialog.addEventListener('cancel', handleCancel)
    return () => dialog.removeEventListener('cancel', handleCancel)
  }, [])

  return (
    <dialog ref={dialogRef} className={styles.overlay} aria-label="Connection status">
      <div className={styles.spinner} aria-hidden="true" />
      <div className={styles.label}>
        {status === 'connecting' ? 'Connecting...' : 'Reconnecting...'}
      </div>
    </dialog>
  )
}
```

**Key transformations**:
- **Architectural change to native `<dialog>`** — UA stylesheet handles `position: fixed` + top-layer promotion via `showModal()`. Author CSS never declares `position: fixed`, so lint Rule 3 doesn't trip. iOS 26.1+ has specific top-layer drift fixes; residual edge cases are invisible against a viewport-sized backdrop.
- All 3 stale fallbacks (`#3a3d5a`, `#e8922a`, `#9999bb`) → removed.
- `rgba(0, 0, 0, 0.6)` / `rgba(0, 0, 0, 0.85)` → `var(--color-bg-overlay-light)` / `var(--color-bg-overlay-heavy)` (Phase 1 follow-up sweep adds both tokens, replacing the single `--color-bg-overlay`).
- `border-radius: 50%` → `var(--radius-full)`.
- `font-size: 16px` → `var(--text-body)`.
- `--motion-duration-dramatic` → `--motion-duration-essential-spin` (Phase 1 §2.9 canonical consumer).
- **`@keyframes connectionPulse` and the `@media (prefers-reduced-motion) .spinner` override DELETED** — essential-spin handles slowdown automatically per Phase 1 §2.9 adjudication.
- **Spinner accent matches TitleBar `.dotConnecting`** at the same essential-spin cadence — both fire in sync during reconnect.
- Wrapped in `@layer components { ... }`.

**Cross-phase concern resolved**:
- `--color-bg-overlay-light` and `--color-bg-overlay-heavy` are added to Phase 1 §2.3 in the deepening follow-up sweep (see Enhancement Summary §8). Both formulas: `color-mix(in oklab, var(--color-shadow-base) 60%/85%, transparent)`.

**Acceptance for this file**:
- [ ] Zero hardcoded hex, spacing, font-size, radius, z-index.
- [ ] **Zero `position: fixed`** in the author CSS (UA applies it for top-layer dialogs internally; lint Rule 3 grep returns zero matches in this file).
- [ ] Spinner consumes `--motion-duration-essential-spin` (Phase 1 §2.9 canonical consumer).
- [ ] `connectionPulse` keyframe and `@media .spinner` override are GONE.
- [ ] `--color-bg-overlay-light` / `-heavy` exist in Phase 1's `semantic.css` (Phase 1 follow-up sweep).
- [ ] ConnectionOverlay.tsx rewritten to use `useRef<HTMLDialogElement>` + imperative `showModal()`/`close()` + cancel-event suppression.
- [ ] Tested by killing `pnpm dev:server` mid-session — overlay appears via `showModal()`, spinner rotates, label reads "Reconnecting...", Esc does not dismiss.
- [ ] Wrapped in `@layer components { ... }`.

#### §2.3.12 `CardDetailSheet.module.css` — REWRITE (44 LOC → ~52 LOC)

**Good news**: one of only two genuinely clean files in the audit. Zero literal hex values pre-rewrite. The only "drift" is the legacy `var(--text-secondary)` token name (renamed to `var(--color-fg-secondary)` in Phase 1). Otherwise this is a straight spacing / font-size migration.

**Current problems**:
- `var(--text-secondary)` consumes the legacy token name (Phase 1 renames to `--color-fg-secondary`).
- Hardcoded `gap: 8px`, `padding: 8px 0`, `margin-top: 4px`.
- Hardcoded icon sizing: `width/height: 64px` on `.iconWrap` and `width/height: 56px` on the inner svg. The 56px is a magic number — it's "container minus 4px of breathing room on each side." Should be derived from the container, not declared independently.
- Hardcoded `font-size: 22px` (name), `12px` (category), `15px` (hint).
- Hardcoded `max-width: 280px` on the hint.

**Rewritten file content** (deepening corrections: `@layer components` wrapper, `--size-card-detail-max → --size-content-narrow`):

```css
/* CardDetailSheet.module.css
   The "what does this card do" detail view, rendered inside BottomSheet when a player
   long-presses a card in their hand. Pure presentation: icon, name, category, play hint.

   This file is consumed exclusively inside BottomSheet — the sheet provides the
   modal chrome, padding, dismiss gesture, and z-index layering. CardDetailSheet
   only owns the inner content layout.
*/

@layer components {

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
  /* Consumes the unified --size-content-narrow token (Phase 1 follow-up sweep
     supersedes --size-card-detail-max with the unified 280-320px clamp). */
  max-width: var(--size-content-narrow);
  margin-top: var(--space-1);
}

} /* end @layer components */
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

   Consumer mapping (CORRECTED in deepening — Phase 2's first draft had errors):
   - TargetSelect: .sheetTitle + .optionList + .optionBtn
   - FavorResponse: .sheetTitle + .sheetSubtitle + .optionList + .optionBtn
   - NameCard: .sheetTitle + .sheetSubtitle + .cardGrid + .optionBtn (children
     are .optionBtn, NOT unstyled — Phase 2 first draft was wrong)
   - DefusePlacement (TWO branches):
     * small-deck: .sheetTitle + .sheetSubtitle + .optionList + .optionBtn
     * large-deck: .sheetTitle + .sheetSubtitle + .quickActions + .quickBtn +
                   .positionInput + .confirmBtn
   - FuturePeek: .sheetTitle + .sheetSubtitle + .tapOrder + .tapCard + .tapCardIcon +
                 .tapCardName + .tapCardPosition + .orderBadge + .confirmBtn
   .optionBtn is consumed by 4 of 5 sheets (not 2 as Phase 2 first draft claimed).

   Architectural note: the .tapCard family uses a `--peek-accent` inline-style
   cascade. FuturePeek.tsx sets `style={{ '--peek-accent': cardAccent(type) }}`
   per card; the CSS reads it via `var(--peek-accent, var(--color-border-subtle))`
   with color-mix() blending. This is the right pattern for per-instance theming —
   threads through without inflating the className list. PRESERVE.
*/

@layer components {

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
  color: var(--color-fg-on-intercept);
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
  /* WCAG 2.5.5 — round ± buttons must hit the 44px touch target floor.
     Phase 2 first draft used var(--space-10) = 40px which fails AAA + Apple HIG.
     No row-level exception applies (adjacent controls, independent handlers).
     Use --size-touch-target directly. */
  width: var(--size-touch-target);
  height: var(--size-touch-target);
  border: 1px solid var(--color-fg-secondary);
  border-radius: var(--radius-full);
  background: var(--color-bg-app);
  color: var(--color-fg-primary);
  font-family: var(--font-display);
  font-size: var(--text-callout);
  cursor: pointer;
  touch-action: manipulation;
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
    border-color var(--motion-duration-fast) var(--motion-ease-base),
    opacity var(--motion-duration-fast) var(--motion-ease-base);
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

} /* end @layer components */
```

**Key transformations**:
- **All ~22 stale legacy token references renamed**: `--text-secondary`/`--text-primary`/`--border-subtle`/`--bg-primary`/`--accent-success` → `--color-fg-secondary`/`--color-fg-primary`/`--color-border-subtle`/`--color-bg-app`/`--color-accent-intercept`. The cyan `var(--focus-ring, #33ffff)` UMB-era stale value → `var(--color-border-focus)`.
- **All 8 hardcoded font sizes** mapped to the fluid type scale: 11/13px → `--text-caption`, 14/15/16/18/20px → `--text-body` or `--text-callout` based on emphasis role.
- **All hardcoded paddings → spacing scale.** `.optionBtn` and `.quickBtn` padding bumped to `var(--space-4)` to **fix pre-rebuild touch-target failures** (39px and 34px button heights). New heights: optionBtn 48px, quickBtn 46px — both clear the WCAG 2.5.5 floor.
- **All gaps → spacing scale.** `gap: 6px` and `gap: 10px` snapped to `var(--space-2)` (8) and `var(--space-3)` (12) respectively to land on the 4-base scale.
- **All margins → spacing scale.** `margin-bottom/top: 12px/16px` → `var(--space-3)/--space-4)`.
- **3 different border-radius mechanisms → semantic aliases.** `8px → --radius-button` (= 4px, deliberate visual change per Phase 1 hierarchy — same call as JoinScreen §2.3.8 input/button). `50% → --radius-full`. `10px (.tapCard) → --radius-card` (= 8px, slight 2px reduction lands on the scale).
- **Hardcoded transitions** on `.tapCard` (`0.15s ease`) → `var(--motion-duration-fast) var(--motion-ease-base)`. Pre-rebuild had no easing specified (browser default `ease`). Tightening the contract.
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
- [ ] Touch-target compliance: `.optionBtn` ≥ 48px, `.quickBtn` ≥ 47px (16+15+16; deepening corrected from 46px since Phase 1 Decision 3 raised `--text-body` floor to 15px; with UA line-height ≥49px), `.confirmBtn` ≥ 48px, `.tapCard` (intrinsic stacked content) ≥ 60px tall, `.positionInput button` = 44px via `var(--size-touch-target)` (deepening fix — was 40px, failed WCAG 2.5.5 AAA + Apple HIG). All clear WCAG 2.5.5 AAA (44px) and Apple HIG 44pt.
- [ ] `.confirmBtn` consumes `--color-fg-on-intercept` (not `--color-fg-on-accent` — deepening rename to per-role token).
- [ ] Wrapped in `@layer components { ... }`.
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

**Rewritten file content** (deepening corrections: `100svh → var(--size-viewport-safe)`, safe-area inset padding on `#root`, `position: relative` on html/body/#root to establish the positioning contract for `position: absolute` descendants. **NOT wrapped in @layer** — global resets belong outside any layer; unlayered CSS wins cascade by default which is correct for `box-sizing` / `html, body` resets):

```css
/* player-hardening.css
   Global mobile-browser hardening for the phone entry point.
   Applied via <link rel="stylesheet"> in player.html, before any component CSS.

   POSITIONING CONTRACT (Phase 1 §2.12 follow-up): html, body, #root are
   position: relative + sized to var(--size-viewport-safe) + overflow: hidden.
   This lets descendants (FloatingActionButton, ErrorToast, Hand.enlargeBackdrop)
   use position: absolute against this root for viewport-anchored placement
   WITHOUT declaring position: fixed — dodging WebKit bug 297779 on iOS 26.
   See Phase 1 §5 landmine 7.

   NOT WRAPPED IN @layer — these are RESET-tier rules. Unlayered CSS wins
   cascade against all layers by default, which is the right behavior for
   global resets. Component .module.css files wrap in @layer components.
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
  height: var(--size-viewport-safe);
  min-height: var(--size-viewport-safe);
  overflow: hidden;
  position: relative;
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
  height: 100%;
  overflow: hidden;
  position: relative;
  /* Safe-area padding lives at the #root level so descendants (PlayingView,
     JoinScreen, EliminatedView) inherit it. Their per-component padding
     uses max(--space-N, --inset-*) for additional design padding. */
  padding-top: var(--inset-top);
  padding-right: var(--inset-right);
  padding-bottom: var(--inset-bottom);
  padding-left: var(--inset-left);
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
- [ ] `100svh` replaced with `var(--size-viewport-safe)` (Phase 1 §2.12).
- [ ] `html, body, #root` all `position: relative` — establishes the phone-root positioning contract for `position: absolute` descendants.
- [ ] `#root` consumes `--inset-*` safe-area padding.
- [ ] `color-scheme: dark` set.
- [ ] `html`, `body`, `#root` all use `var(--color-bg-app)`.
- [ ] Text selection allowed on inputs and `[data-selectable]` elements.
- [ ] **NOT wrapped in `@layer components`** — global resets stay unlayered (correct behavior for `box-sizing` / `html, body` reset rules; verified pattern per Phase 1 §2.11 + agent 5 empirical research).

### §2.4 Dead code deletion

- **Delete `src/client/player/TurnBanner.tsx`** — verified unused via Grep (only self-reference). Replaced by `StatusBar.tsx` per comment in `StatusBar.module.css:1`.
- **Delete `src/client/player/TurnBanner.module.css`** — 48 LOC of dead CSS.
- **Verification step before commit**: `rg "TurnBanner" src/client/ src/server/` should return zero results after deletion. If any file references `TurnBanner`, it's a stale import and needs fixing.

### §2.5 Component consolidation: `FloatingActionButton` (CORRECTED in deepening)

Per §2.3.7 above. **Asymmetric consolidation**: NopeButton verified ALREADY ORPHANED — `grep -rn "from.*NopeButton" src/client/` returns zero consumer imports (only self-references in `NopeButton.tsx`). Real shape: **delete the dead `NopeButton.*` files + migrate `InterceptButton.*` → `FloatingActionButton.*`**. The new component PRESERVES InterceptButton's full architecture (hook-driven state via `useNopeWindow`/`useHand`/`useMyPlayer`, `secondsLeft` countdown, `disabled={!hasIntercept}`, the `INTERCEPT{secondsLeft}s` label format).

**Import site audit** — there is NO `PlayingView.tsx` (Phase 2 first draft was wrong). `PlayingView` is an inner function inside `Player.tsx` (declared around line 190; renders at the `<PlayingView />` JSX site around line 125). The single live `<InterceptButton />` consumer is at **`Player.tsx:435`** — inside the inner `PlayingView` function.

The §2.3.7 render-tree change moves `<FloatingActionButton />` OUT of the `PlayingView` inner function and UP into the top-level `<Player>` Fragment alongside `<ErrorToast />` and `<ConnectionOverlay />`. This is the architectural change that makes `position: absolute` against `#root` work correctly.

**Replacement edits in `Player.tsx`**:

```diff
- import { InterceptButton } from './InterceptButton'
+ import { FloatingActionButton } from './FloatingActionButton'

  // ... in the Player function return Fragment:
  return (
    <>
      {protocolMismatch && <div ...>...</div>}
      <PhoneRouter ... />
      <ErrorToast />
      <ConnectionOverlay status={connectionStatus} />
+     <FloatingActionButton />
    </>
  )

  // ... inside the PlayingView inner function around line 435, DELETE this line:
- <InterceptButton />
```

Plus the `player.html` edit:
```diff
- <div id="nope-root"></div>
```

**Files to delete after migration**:
- `src/client/player/NopeButton.tsx` (already orphaned)
- `src/client/player/NopeButton.module.css`
- `src/client/player/InterceptButton.tsx` (replaced by FloatingActionButton)
- `src/client/player/InterceptButton.module.css`

**Verification**: `rg "from.*(NopeButton|InterceptButton)" src/` returns zero matches after migration.

### §2.6 Cross-view fix: `BottomSheet.module.css` — CSS-ONLY FIX (31 LOC → ~50 LOC)

**File**: `src/client/shared/BottomSheet.module.css` (shared directory — consumed by phone bottom sheets only; board doesn't use bottom sheets).

**MAJOR CORRECTION (deepening)**: Phase 2's first draft proposed introducing `.backdrop` / `.sheet` / `.sheetShort` / `.handle` as new DOM elements in BottomSheet.tsx. **This was wrong.** The current `BottomSheet.tsx` (verified at `src/client/shared/BottomSheet.tsx:13-49`) already uses a native `<dialog>` + `showModal()` architecture with classes `.dialog` and `.content`. Phase 2 should keep that architecture (it's correct and aligns with the Phase 1 lint Rule 3 strategy of using native dialogs for true modals) and ONLY swap tokens. **No TSX edits required for BottomSheet** — current source is already correct.

**Current problems**:
- `max-height: 80dvh` at two sites (lines 6 and 26) — `dvh` causes mid-scroll shimmering on iOS Safari.
- Hardcoded `padding: 20px 16px`, `border-radius: 16px 16px 0 0`.
- Stale `#1a1a2e`, `#e8e8f0`, `rgba(0, 0, 0, 0.6)`.
- **`position: fixed` declared on `.dialog`** — REDUNDANT (UA stylesheet already applies `position: fixed` + top-layer to `dialog[open]` when opened via `showModal()`) AND would trip a phone-spirit version of lint Rule 3. Delete the author declaration.
- The lint Rule 3 grep currently targets `src/client/player/**/*.module.css` only, so this file (under `src/client/shared/`) doesn't technically trip it. But the spirit of the rule applies — flag for Phase 1 follow-up to extend Rule 3 grep scope.

**Rewritten file content** (deepening corrections: `@layer components` wrapper, `dvh → svh`, remove redundant `position: fixed`, rename Phase 2 first-draft `.backdrop`/`.sheet` back to `.dialog`/`.content` to match the actual BottomSheet.tsx, use `::backdrop` pseudo for the scrim):

```css
/* BottomSheet.module.css
   Phone bottom-sheet container. Native <dialog> + showModal() — browser places
   the element in the top layer, UA stylesheet applies position: fixed
   internally. The author's CSS never declares position: fixed, so lint Rule 3
   does not trip. iOS 26.1+ has specific fixes for top-layer drift; the
   residual edge cases on top-layer dialogs are minor cosmetic gaps in extreme
   accessibility-setting combinations.

   Slide-up animation is driven by Framer Motion in BottomSheet.tsx via
   AnimatePresence on the inner .content element — deliberately NOT a CSS
   transition. The dialog itself is imperatively opened/closed via showModal()
   and close().

   Note: "shared" directory but phone-only consumer. Board view does not use
   bottom sheets. The current BottomSheet.tsx architecture (native <dialog> +
   showModal + AnimatePresence on .content) is correct as written; this CSS
   rewrite is token-only — no TSX edits required.
*/

@layer components {
  .dialog {
    /* UA stylesheet applies position: fixed + top-layer when showModal() is
       called. Do NOT re-declare position — the author declaration is
       redundant AND would trip a phone-spirit version of lint Rule 3.
       Override the UA's default centering via inset + margin. */
    inset: auto 0 0 0; /* top: auto, right: 0, bottom: 0, left: 0 */
    width: 100%;
    max-width: min(100%, var(--size-root-max-width));
    max-height: calc(var(--size-viewport-safe) * 0.8);
    margin: 0;
    padding: 0;
    background: transparent;
    border: none;
    overflow: visible;
  }

  /* Backdrop pseudo — the scrim rendered by the browser behind the dialog.
     Replaces a separate .backdrop DOM element (which the Phase 2 first draft
     mistakenly proposed introducing). */
  .dialog::backdrop {
    background: var(--color-bg-overlay-light);
  }

  /* Inner sheet content — the visible surface that slides up. Framer Motion's
     m.div in BottomSheet.tsx animates this element's y-translate from 100%
     to 0 on mount and back on exit. */
  .content {
    width: 100%;
    max-height: calc(var(--size-viewport-safe) * 0.8);
    padding: var(--space-5) var(--space-4);
    padding-bottom: max(var(--space-5), var(--inset-bottom));
    background: var(--color-bg-elevated);
    color: var(--color-fg-primary);
    font-family: var(--font-body);
    border-top: 1px solid var(--color-border-subtle);
    border-top-left-radius: var(--radius-xl);
    border-top-right-radius: var(--radius-xl);
    box-shadow: var(--shadow-xl);
    overflow-y: auto;
    overscroll-behavior: contain;
    /* Preserve iOS momentum scrolling */
    -webkit-overflow-scrolling: touch;
  }

  /* Short variant — smaller prompts (CardDetailSheet, NameCard). */
  .contentShort {
    max-height: calc(var(--size-viewport-safe) * 0.6);
  }
}
```

**TSX impact**: NONE. The current `BottomSheet.tsx` already uses `<dialog ref={dialogRef} className={styles.dialog}>` + `<m.div className={styles.content}>` + imperative `showModal()`/`close()`. Phase 2's first draft proposed introducing a `.backdrop` DOM element and `.handle` element that don't exist; deepening corrects this — no TSX rewrite required. The `.contentShort` class is new (replaces the first-draft `.sheetShort`); BottomSheet.tsx may already accept a `short` prop and toggle this class, or this is a future expansion.

**Phase 1 follow-up flag**: extend Phase 1 §2.14 lint Rule 3's grep scope to also cover `src/client/shared/BottomSheet.module.css` (phone-consumer shared file), since the spirit of "no position: fixed in phone CSS" applies. Currently the grep only targets `src/client/player/**/*.module.css`.

**Acceptance for this file**:
- [ ] Zero `dvh` usage.
- [ ] Zero hardcoded hex, spacing, radius values.
- [ ] **Zero author-declared `position: fixed`** (UA stylesheet handles it for top-layer dialogs internally; grep returns zero matches).
- [ ] Uses `--color-bg-overlay-light` (Phase 1 follow-up sweep adds the token).
- [ ] `max-height` uses `calc(var(--size-viewport-safe) * 0.8)` (and `* 0.6` for short variant) — accounts for iOS safe-area inset.
- [ ] `.content` has `padding-bottom: max(var(--space-5), var(--inset-bottom))` to keep inner content clear of the home indicator.
- [ ] Class names `.dialog` + `.content` (+ `.contentShort` variant) — match the current BottomSheet.tsx; no TSX rewrite required.
- [ ] Wrapped in `@layer components { ... }`.

### §2.7 `theme.ts` deletion boundary — TSX edits (EXPANDED in deepening)

**Background** (corrected from Phase 2 first draft): Phase 1 deletes `src/client/shared/theme.ts` in step 16. Several files import from it. Phase 2's first draft only handled `MinimalCard.tsx`'s `cardAccent` import. Reality: there are **6 consumers across 5 files**, all of which must be edited in Phase 2 or `theme.ts` deletion will compile-break.

**CRITICAL — `cardAccent` lives in `card-accents.ts`, NOT `palette.ts`** (deepening fix). Phase 1 §2.7 Decision 1 flipped `palette.ts` to a CODEGEN file (`palette.generated.ts` emitted from `primitives.css`). It must NOT contain hand-written functions. Phase 1 §3 step 8a and §6 left this ambiguous ("`palette.ts` or `card-accents.ts`") — Phase 2 deepening forces the choice: **`card-accents.ts` is the only valid target**. Phase 1 follow-up sweep locks this.

**The 6 consumer-site edits:**

1. **`src/client/shared/MinimalCard.tsx:5`** — `cardAccent` consumer:
   ```diff
   - import { cardAccent } from './theme';
   + import { cardAccent } from './tokens/card-accents';
   ```

2. **`src/client/player/sheets/FuturePeek.tsx:5`** — second `cardAccent` consumer (Phase 2 first draft missed this):
   ```diff
   - import { cardAccent } from '@client/shared/theme';
   + import { cardAccent } from '@client/shared/tokens/card-accents';
   ```

3. **`src/client/player/main.tsx:6`** — `applyTheme` import (must be deleted; Phase 1 commits to pure-CSS dark theming, runtime injection is dead):
   ```diff
   - import { applyTheme } from '@client/shared/theme';
   ```
   And delete the `applyTheme()` call wherever it appears (typically near the React mount).

4. **`src/client/board/main.tsx:6`** — same as player/main.tsx:
   ```diff
   - import { applyTheme } from '@client/shared/theme';
   ```
   And delete the `applyTheme()` call.

5. **`src/client/player/Player.tsx:34`** — `useColorScheme` import (third theme.ts consumer; Phase 1 landmine 11 enumerated only the 2 cardAccent consumers and missed this one). Delete:
   ```diff
   - import { useColorScheme } from '@client/shared/theme';
   ```

6. **`src/client/player/Player.tsx:51`** — the `useColorScheme()` call. Delete the line entirely. Light mode is out of scope per Phase 1 §6, the "force re-render on OS scheme switch" trigger has no subscriber after `theme.ts` deletion.

**`MinimalCard.module.css`** stays untouched until **Phase 3** (rewritten as part of cross-view migration because it's used on both phone and board). Phase 2 only edits the TSX import.

**Phase 1 follow-up flags**:
1. Lock `card-accents.ts` as the definitive `cardAccent` migration target in Phase 1 §3 step 8a, §5 landmine 11, and §6 (remove "or palette.ts" ambiguity).
2. Add `Player.tsx:51 useColorScheme()` to Phase 1 §5 landmine 11's enumerated consumers (currently only lists `MinimalCard.tsx:28` and `FuturePeek.tsx:70`).

**Acceptance**:
- [ ] All 6 consumer-site edits applied.
- [ ] `grep -rn "from.*theme'" src/client/` returns zero results after Phase 2 (along with Phase 1's deletion of `theme.ts` itself).
- [ ] `pnpm typecheck` clean.
- [ ] No runtime errors at app start (verify by visiting `/player.html?room=TEST` and `/board.html?room=TEST`).
- [ ] No regression in `cardAccent`-driven per-card colors (visual review: every card type renders with its expected accent color in the hand and on the board).

---

## §3 — Step-by-Step Execution Order (UPDATED in deepening)

1. **Verify Phase 1 is merged and green.** `pnpm test` + `pnpm typecheck` clean. `src/client/shared/tokens/` exists and all semantic tokens are in place.
1a. **Verify Phase 1 follow-up sweep is complete.** Phase 1 deepening follow-up adds `--color-bg-overlay-light`, `--color-bg-overlay-heavy`, `--size-content-narrow`, `card-accents.ts`, the `html, body { ... }` + `#root { ... }` positioning contract, and updates lint Rule 3 grep scope. Run: `git log --oneline | rg "phase-1.*follow-up"` — must return at least one match. If not, STOP — Phase 1 follow-up is a hard prerequisite.
1b. **Verify Phase 1 step 16a orphan cleanup commit is in git history**: `git log --oneline | rg "remove orphan light-mode"` — must return at least one match. If zero matches, Phase 1 did not complete step 16a — STOP and run it before proceeding to Phase 2.
2. **`theme.ts` deletion boundary cleanup** per §2.7 — apply all 6 edits BEFORE Phase 1's `theme.ts` deletion lands (already happened in Phase 1 if §2.7 follows Phase 1 sequencing). Order:
   - 2a. Edit `MinimalCard.tsx:5` — `cardAccent` import from `card-accents.ts`
   - 2b. Edit `FuturePeek.tsx:5` — `cardAccent` import from `card-accents.ts`
   - 2c. Edit `player/main.tsx:6` — delete `applyTheme` import + call
   - 2d. Edit `board/main.tsx:6` — delete `applyTheme` import + call
   - 2e. Edit `Player.tsx:34` — delete `useColorScheme` import
   - 2f. Edit `Player.tsx:51` — delete `useColorScheme()` call
   - 2g. Run `pnpm typecheck` — must pass.
3. **Create FloatingActionButton component** per §2.3.7. New files `FloatingActionButton.tsx` + `FloatingActionButton.module.css`. Do not delete old files yet.
4. **Move `<FloatingActionButton />` render** in `Player.tsx`: add as sibling of `<PhoneRouter>` in the top-level `<Player>` Fragment. DELETE the `<InterceptButton />` line at `Player.tsx:435` (inside the inner `PlayingView` function). Update import. Run `pnpm typecheck` — passes.
5. **Edit `player.html`** — DELETE `<div id="nope-root"></div>` at line 14.
6. **Delete `NopeButton.*`, `InterceptButton.*`, `TurnBanner.*`.** Run `pnpm typecheck` + `rg "NopeButton|InterceptButton|TurnBanner" src/client/ src/server/` — expect zero matches.
7. **Rewrite `player-hardening.css`** per §2.3.14 — global stylesheet, NOT wrapped in `@layer`.
8. **Rewrite `PlayingView.module.css`** per §2.3.1 — preserve `.handSection[data-disabled]::after` haze, keep `.sectionLabel` as flex child.
9. **Rewrite `StagingArea.module.css`** per §2.3.3 — preserve `::before`/`::after` flex spacers.
10. **Rewrite `Hand.module.css`** per §2.3.2 — preserve momentum-scroll properties.
10a. **Edit `Hand.tsx`** — wrap enlarge `<AnimatePresence>` in `createPortal(..., document.body)`. Add `createPortal` import.
11. **Rewrite `SmartActionBox.module.css`** per §2.3.4.
11a. **Apply §2.3.4b TSX class rename cascade** to `SmartActionBox.tsx` — 5 edits: `.hint→.standby`, `.target→.comboPair/.comboTriple/.action`, `.ready→.action`. Run `pnpm typecheck` + visit dev server, walk through every state.
12. **Rewrite `TitleBar.module.css`** per §2.3.5 — `.left` class preserved, no TSX edit needed.
13. **Rewrite `StatusBar.module.css`** per §2.3.6.
13a. **Apply §2.3.6b TSX class rename cascade** to `StatusBar.tsx` — explicit `.statusBar` class composition, `.pileInfo→.pileCount` rename.
14. **Rewrite `JoinScreen.module.css`** per §2.3.8.
15. **Rewrite `EliminatedView.module.css`** per §2.3.9.
15a. **Apply §2.3.9b TSX class rename cascade** to `EliminatedView.tsx` — 6 edits: `.container→.view`, `.explosionWrap→.skullWrap`, `.remaining→.aliveList`, `.remainingLabel→.aliveListLabel`, `.playerList` eliminated, `.playerChip→.alivePlayer`, `.watchPrompt→.prompt`.
16. **Edit `EliminatedView.tsx`** per §2.3.9a — title to "You&apos;re Burned." + 9-line FLAVOR_LINES array (replaces 8-line current).
17. **Rewrite `ErrorToast.module.css`** per §2.3.10 — `position: fixed → absolute`.
18. **Rewrite `ConnectionOverlay.module.css`** per §2.3.11.
18a. **Rewrite `ConnectionOverlay.tsx`** per §2.3.11 — full rewrite to use `useRef<HTMLDialogElement>` + `showModal()`/`close()` + cancel suppression.
19. **Rewrite `CardDetailSheet.module.css`** per §2.3.12.
20. **Rewrite `sheets/sheets.module.css`** per §2.3.13 — `.positionInput button` 40→44px touch-target fix, `.confirmBtn` color token swap.
21. **Rewrite `BottomSheet.module.css`** per §2.6 — CSS-only fix, remove redundant `position: fixed`, `dvh → svh`. NO TSX edits (current architecture is correct).
22. **player.html FOUC inline-style update** — change line 2 `style="background:#1a1d30"` and line 10 `style="margin:0;background:#1a1d30;color:#e8e8f0"` to use the new Dreamland palette equivalents (`#0f1f1f` charcoal-1 + `#f0e6d2` cream-12 — verify exact hex against Phase 1's `primitives.css`). Documented exception per §2.2 universal rule #1 (FOUC prevention).
23. **Player.tsx inline-style cleanup** — agent 8 found 3 inline styles with stale token references. Update:
    - Line ~100: `var(--text-primary)` → `var(--color-fg-primary)`
    - Line ~116: `var(--bg-primary, #0c0a12)` → `var(--color-bg-app)` (drop fallback)
    - Line ~117: `var(--amber, #e8922a)` → `var(--color-accent-drama)` (drop fallback)
24. **TargetSelect.tsx inline-style cleanup** — line ~27 `style={{ color: 'var(--text-secondary)', fontSize: '13px' }}` → either move to a class consuming `var(--color-fg-secondary)` + `var(--text-caption)` OR update the inline style token references.
25. **Run full suite**: `pnpm test` + `pnpm typecheck` + `pnpm lint` + `pnpm build`. Lint check: `rg --files-without-match '^@layer components \{' src/client/player/**/*.module.css src/client/shared/BottomSheet.module.css` returns zero files.
26. **Bundle size check**: phone entry ≤100KB gzipped.
27. **Visual smoke test**: Playwright screenshots of every phone screen at 375×667 and 1024×1366.
28. **Tier 1 retheme gap acceptance** — live review of the eliminated state on a real phone.
29. **Commit with tag**: `feat(css-foundation): Phase 2 — phone view migration`.
23. **Visual smoke test**: Playwright screenshots of every phone screen at 375×667 and 1024×1366.
24. **Tier 1 retheme gap acceptance** — live review of the eliminated state on a real phone.
25. **Commit with tag**: `feat(css-foundation): Phase 2 — phone view migration`.

Commit points between major file rewrites (every 3-4 files). Don't commit a single mega-commit; commit incrementally so bisecting is possible if a regression appears.

---

## §4 — Acceptance Criteria (UPDATED in deepening)

### §4.1 File state

- [ ] All 12 phone module rewrites complete (PlayingView, Hand, StagingArea, SmartActionBox, TitleBar, StatusBar, JoinScreen, EliminatedView, ErrorToast, ConnectionOverlay, CardDetailSheet, sheets/sheets) — zero hardcoded hex, spacing, font-size, radius, shadow, motion timing, z-index values.
- [ ] `FloatingActionButton.module.css` + `FloatingActionButton.tsx` created (NEW file pair, replaces InterceptButton).
- [ ] `player-hardening.css` rewritten — uses safe-area tokens, NOT wrapped in `@layer` (global resets stay unlayered).
- [ ] `BottomSheet.module.css` CSS-only fix — `dvh → svh`, `position: fixed` removed, `--color-bg-overlay-light` consumed, `.dialog`/`.content`/`.contentShort` class names match current TSX (no TSX rewrite).
- [ ] `ConnectionOverlay.tsx` rewritten to native `<dialog>` + `showModal()` per §2.3.11.
- [ ] `Hand.tsx` wraps enlarge `<AnimatePresence>` in `createPortal(..., document.body)`.
- [ ] `Player.tsx` renders `<FloatingActionButton />` as direct sibling of `<PhoneRouter>`; old `<InterceptButton />` line at 435 deleted.
- [ ] `player.html` line 14 `<div id="nope-root">` deleted.
- [ ] `player.html` lines 2 and 10 FOUC inline-style hex values updated to Dreamland palette equivalents (documented exception).
- [ ] `NopeButton.*` (orphan dead code), `InterceptButton.*` (replaced), `TurnBanner.*` (orphan dead code) deleted — 6 files total.
- [ ] `MinimalCard.tsx` imports from `card-accents.ts`, not `theme.ts`.
- [ ] `FuturePeek.tsx` imports from `card-accents.ts`, not `theme.ts`.
- [ ] `player/main.tsx` and `board/main.tsx` `applyTheme` import + call deleted.
- [ ] `Player.tsx` `useColorScheme` import + call deleted (line 34 + line 51).
- [ ] `EliminatedView.tsx` title and flavor lines updated per §2.3.9a (8-line array → 9-line array, `&apos;` JSX entity escape).
- [ ] §2.3.4b SmartActionBox.tsx class rename cascade applied (5 edits).
- [ ] §2.3.6b StatusBar.tsx class composition update applied.
- [ ] §2.3.9b EliminatedView.tsx class rename cascade applied (6 edits).

### §4.2 Purity checks (automated)

- [ ] `rg "#[0-9a-fA-F]{3,8}" src/client/player/` returns zero matches outside comments and the documented `player.html` FOUC exception.
- [ ] `rg "\\b\\d+px\\b" src/client/player/ | grep -v "comment\\|landmine"` returns only documented-exception lines (e.g., `min-width: 120px` on `.slot` in `Hand.module.css`).
- [ ] `rg "\\bvw\\b" src/client/player/` returns zero matches outside comments. **Axis-violation purity check.**
- [ ] `rg "\\bdvh\\b" src/client/` returns zero matches.
- [ ] `rg "position:\\s*fixed" src/client/player/` returns zero matches. **Phase 1 lint Rule 3 enforcement.**
- [ ] `rg "position:\\s*fixed" src/client/shared/BottomSheet.module.css` returns zero matches.
- [ ] `rg --files-without-match '^@layer components \\{' src/client/player/**/*.module.css src/client/shared/BottomSheet.module.css` returns zero files. **`@layer components` wrapper enforcement.** Exception: `player-hardening.css` is intentionally unlayered.
- [ ] `rg "var\\(--text-micro\\b" src/client/` returns zero matches (token deleted in Phase 1 deepening).
- [ ] `rg "var\\(--radius-pill\\b" src/client/` returns zero matches (token deleted).
- [ ] `rg "var\\(--motion-ease-standard\\b" src/client/` returns zero matches (renamed to `--motion-ease-base`).
- [ ] `rg "var\\(--z-max\\b" src/client/` returns zero matches (token deleted).
- [ ] `rg "var\\(--color-fg-on-accent\\b" src/client/player/` returns zero matches (replaced with explicit per-role tokens).
- [ ] `rg "var\\(--motion-duration-instant\\b" src/client/` returns zero matches (token dropped per Decision 2).
- [ ] `rg "NopeButton|InterceptButton|TurnBanner" src/client/ src/server/` returns zero matches.
- [ ] `rg "from.*['\"]@?client/shared/theme['\"]" src/client/` returns zero matches (theme.ts deletion boundary).
- [ ] `rg "applyTheme|useColorScheme" src/client/` returns zero matches.
- [ ] `grep -E "1\\.5s|0\\.8s|3s" src/client/player/JoinScreen.module.css src/client/player/SmartActionBox.module.css src/client/player/ConnectionOverlay.module.css src/client/player/FloatingActionButton.module.css src/client/player/TitleBar.module.css` returns zero matches (Lint Rule 2: no hardcoded animation durations; all use motion tokens).
- [ ] §2.3.4b SmartActionBox cascade verification: `rg "styles\\.(hint|ready|target)\\b" src/client/player/SmartActionBox.tsx` returns zero matches.
- [ ] §2.3.9b EliminatedView cascade verification: `rg "styles\\.(container|explosionWrap|remaining|playerList|playerChip|watchPrompt)\\b" src/client/player/EliminatedView.tsx` returns zero matches.
- [ ] §2.3.6b StatusBar cascade verification: `rg "styles\\.pileInfo" src/client/player/StatusBar.tsx` returns zero matches.

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

## §5 — Landmines (UPDATED in deepening)

Carrying forward from Agent A's codebase audit. Each landmine below is an architectural truth that must survive the rewrite as a preserved comment, not a deleted-during-cleanup loss.

1. **Hand cards at `height:100%` + `aspect-ratio` overflow the screen.** Current fix: aspect-ratio on the SLOT wrapper, not the card. Preserved as comment in `Hand.module.css` header.
2. **No global `box-sizing: border-box`.** Added manually to `.card` and `.hand` in the current code. **Phase 2 opportunity**: add it globally to `html, *, *::before, *::after` in `player-hardening.css` and remove the per-element copies. Flag as a sub-task of §2.3.14.
3. **`overflow: hidden` on staging section clips absolutely-positioned elements.** Section labels must be INSIDE the box, not floating on the border, AND must NOT be `position: absolute` (Phase 2 first draft proposed this; deepening corrected — `.sectionLabel` is a flex child). Preserved in `PlayingView.module.css` comment.
4. **CSS `justify-content: center` on scroll containers clips left overflow.** Use `::before`/`::after` flex spacers instead. **PRESERVE** the spacers in `.stagedRow` — Phase 2 first draft dropped them.
5. **Framer Motion `layoutId` on staged cards causes border flash** when siblings exit. Removed in current code. `transition: none` on `[data-selected]` prevents remaining flicker. **Phase 2 must preserve** the `transition: none` override where it exists.
6. ~~**`dots` step animation in `JoinScreen.module.css` uses a one-off step timing**~~ **RETIRED in deepening.** Phase 1 §2.2 added `--motion-duration-dots: 1500ms` specifically for this consumer. The animation now declares `animation: joinScreenDots var(--motion-duration-dots) steps(4, end) infinite` and passes Lint Rule 2. No exception exists.
7. **FloatingActionButton z-index is load-bearing.** Must remain on top (`--z-sticky`), always. The portal indirection (`#nope-root`) is GONE in deepening — FAB renders inline as a sibling of `<PhoneRouter>` and uses `position: absolute` against `#root`. Preserved as comment in `FloatingActionButton.module.css`.
8. **`MinimalCard` threshold detection uses content-box math.** Preserved in the MinimalCard CSS (Phase 3) — but the inline-style cascade pattern for `--card-accent` must survive Phase 2's TSX edit (now imports from `card-accents.ts`, not `palette.ts`).
9. **(NEW)** **WebKit bug 297779 — iOS 26 `position: fixed` drift.** Phase 1 lint Rule 3 + landmine 7 BANS `position: fixed` in phone CSS. Phase 2's 5 sites (Hand.enlargeBackdrop, FAB, ErrorToast, ConnectionOverlay, BottomSheet) all migrate to alternative architectures: React portal + `position: absolute` for Hand.enlargeBackdrop; inline `position: absolute` for FAB and ErrorToast; native `<dialog>` + `showModal()` for ConnectionOverlay and BottomSheet. The Phase 1 follow-up positioning contract (`html, body { position: relative; height: var(--size-viewport-safe); overflow: hidden; }`) is mandatory infrastructure.
10. **(NEW)** **TSX class-rename cascade landmine.** Rewrites in §2.3.4 (SmartActionBox), §2.3.6 (StatusBar), §2.3.9 (EliminatedView) silently rename CSS classes that the corresponding TSX consumers use. Without §§2.3.4b, 2.3.6b, 2.3.9b TSX edits, `styles.X` returns `undefined` at runtime and the elements render unstyled — CSS Modules don't error on missing keys, the only signal is visual regression. Always check both the CSS rewrite AND the TSX consumer when rewriting a `.module.css` file.
11. **(NEW)** **`palette.ts` is CODEGEN (per Phase 1 Decision 1).** Hand-written code (like `cardAccent`) MUST go in a separate file (`card-accents.ts`), NOT in `palette.ts`. Phase 2's first draft imported `cardAccent` from `palette.ts` — wrong. Always check Phase 1 Decision 1 status when migrating a token-side function.
12. **(NEW)** **`@layer components` wrapper enforcement.** Phase 1 §2.11 requires every component `.module.css` file in Phase 2-5 to wrap its body in `@layer components { ... }`. The single exception is `player-hardening.css` (global resets stay unlayered). Empirically verified that the wrapper plays correctly with CSS Modules + Vite 8 + postcss-modules + `@keyframes`/`@media`/`color-mix`/`:global()`/etc.
13. **(NEW)** **Reduced-motion essential-* tokens are gameplay-critical.** Six animation sites (`SmartActionBox .action`/`.drawIntense`, `TitleBar .dotConnecting`, `FloatingActionButton .urgent`, `JoinScreen .spinner`, `ConnectionOverlay .spinner`) MUST consume `--motion-duration-essential-pulse` or `--motion-duration-essential-spin`. Decorative tokens (`fast/base/slow/dramatic`) zero out under `prefers-reduced-motion: reduce`, removing gameplay information — that's a separate WCAG 2.3.3 violation distinct from the rotation-triggers-vestibular violation. Phase 1 §2.9 dual-family system is the correct architecture.

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

**Cross-phase tokens RESOLVED in Phase 2 deepening — fold back into Phase 1 follow-up sweep**:
- ✅ `--color-bg-overlay-light` (60% alpha) — formula `color-mix(in oklab, var(--color-shadow-base) 60%, transparent)`. Consumers: ConnectionOverlay `.overlay` (radial-gradient center stop), BottomSheet `.dialog::backdrop`.
- ✅ `--color-bg-overlay-heavy` (85% alpha) — formula `color-mix(in oklab, var(--color-shadow-base) 85%, transparent)`. Consumers: ConnectionOverlay `.overlay` (radial-gradient edge stop), Hand `.enlargeBackdrop`. Replaces the single `--color-bg-overlay` Phase 1 currently has.
- ✅ `--size-content-narrow` — formula `clamp(280px, calc(280px + (100svh - 667px) * (40 / 699)), 320px)`. Unifies 5 consumers: JoinScreen `.form`, JoinScreen `.lobbyList`, CardDetailSheet `.hint`, EliminatedView `.flavor` (wrapped in `min(90%, ...)`), EliminatedView `.aliveList` (wrapped in `min(90%, ...)`). **SUPERSEDES `--size-card-detail-max`** (Phase 1's first deepening pass added a 280→400 single-consumer version; this widens scope and narrows the ceiling to 320 to match actual consumer values).
- ✅ Phase 1 §2.12 follow-up positioning contract — `html, body { position: relative; height: var(--size-viewport-safe); overflow: hidden; overscroll-behavior: none; }` + `#root { position: relative; height: 100%; }` — the foundation for the `position: absolute`-against-root migration in §2.3.2, §2.3.7, §2.3.10, §2.3.11.
- ✅ `--motion-duration-essential-pulse-urgent` (optional Phase 1 amendment) — 900ms baseline / 1500ms reduce. Restores the SmartActionBox `.drawIntense` vs `.action` two-intensity differential that flattens to 1400ms when both consume `--motion-duration-essential-pulse`. Recommended; not blocking.
- ✅ `card-accents.ts` definitive target lock — Phase 1 §3 step 8a, §5 landmine 11, §6 must remove the "or `palette.ts`" ambiguity. `card-accents.ts` is the only valid target after Decision 1 (palette.ts is codegen-reserved).
- ✅ Lint Rule 3 grep scope extension — extend to cover `src/client/shared/BottomSheet.module.css` (phone-consumer shared file).
- ✅ Phase 1 §5 landmine 11 — add `Player.tsx:51 useColorScheme()` to the enumerated `theme.ts` consumers (Phase 1 only listed 2; Phase 2 deepening surfaced the third).

Apply these in the cross-phase contradiction sweep step (TODO.md step 6 in the deepening flow).

---

## §8 — Bundle Budget Impact (UPDATED in deepening)

**Expected deltas** (phone entry, gzipped):

| Change | Δ (estimated) |
|---|---|
| Delete `NopeButton.*` (orphaned) + `InterceptButton.*` (replaced) + `TurnBanner.*` (orphaned) | −1.5 KB |
| Delete `theme.ts` runtime (`applyTheme`, `useColorScheme` subscriber, color-scheme watcher) — Phase 1 deletion BUT Phase 2 removes the import sites + dead-code-strips them | −0.6 KB additional after Phase 1's −1.6 KB |
| New `FloatingActionButton.*` (preserves InterceptButton's hooks + countdown + AnimatePresence) | +1.2 KB |
| Rewrite 12 phone CSS modules (token-based is more compressible) | −2 KB to 0 KB |
| Delete stale hex fallbacks (smaller CSS module sizes) | −0.5 KB |
| `@layer components { ... }` wrappers across 14 module files (per agent 5 empirical measurement: ~10 bytes gzipped per file) | +0.14 KB |
| Reduced-motion `@media` blocks DELETED in JoinScreen + ConnectionOverlay (essential-spin handles the slowdown automatically) | −0.2 KB |
| `connectionPulse` and `joinScreenSpinnerPulse` keyframes DELETED | −0.15 KB |
| `position: fixed → absolute` migrations + new safe-area inset padding rules | +0.3 KB |
| Native `<dialog>` rewrite of ConnectionOverlay.tsx (imperative open/close + cancel suppression — net ~30 lines TS) | +0.5 KB |
| ConnectionOverlay.tsx removes the `<div>` wrapper architecture (replaced by `<dialog>`) | −0.1 KB |
| `Hand.tsx` createPortal import + wrap | +0.05 KB |
| Tier 1 retheme text changes (9-line flavor pool slightly longer than 8-line) | +0.1 KB |

**Net expected**: **−1.5 to −2.2 KB on phone entry.** Phase 2 likely improves bundle budget headroom by 1.5-2 KB (smaller swing than the original draft estimate, due to FAB hook preservation + native dialog TSX growth + @layer wrappers, but still a net reduction).

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
- **`docs/insights/006-css-fallback-must-precede-modern-property.md`** — verified `svh` is Baseline since iOS Safari 15.4 (March 2022); the insight's pattern still applies to future fallback pairs but the specific `100vh`/`100svh` case is moot in 2026.

### Deepening sources (added 2026-04-11)

- **Phase 1 §2.9** — reduced-motion dual-family token system (essential-pulse, essential-spin, essential-flash). Source for the 6 essential-token swaps in Phase 2.
- **Phase 1 §2.10** — `@property` declarations. Phase 2 doesn't add new tokens but inherits the typed-property infrastructure.
- **Phase 1 §2.11** — `@layer` cascade ordering. Source for the universal rule #11 (`@layer components { ... }` wrapping).
- **Phase 1 §2.12** — safe-area tokens. Source for the 6 safe-area migration sites and the new positioning contract follow-up.
- **Phase 1 §2.13** — font loading strategy (Clash Display, font-display: optional, preload). Phase 2 doesn't touch fonts but inherits the loaded faces.
- **Phase 1 §2.14** — six lint rules. Source for the position:fixed migration, the dots animation cleanup, the color-mix oklab requirement, and the various token-definition / token-rename enforcements.
- **Phase 1 §5 landmines 7, 11, 13** — WebKit bug 297779, theme.ts deletion landmine, runtime data-theme caveat. Source for the 5-site position:fixed migration and the theme.ts deletion boundary expansion.
- **Phase 1 §10.1 cross-phase token addition table** — source for the Phase 1 follow-up sweep deltas.
- **Empirical Vite 8.0.3 + postcss-modules pipeline test** (agent 5) — verified `@layer components { ... }` works for every Phase 2 construct.
- **Agent verification of `EliminatedView.tsx`, `SmartActionBox.tsx`, `InterceptButton.tsx`** — actual class names and import paths, not relied on the audit alone.

---

*Phase 2 was DEEPENED 2026-04-11. ~80 prescriptive fixes applied across 17 deliverables. Ready for `/ce:work` AFTER the Phase 1 follow-up sweep step lands the 7 cross-phase items in §7. Do NOT begin `/ce:work` until Phase 3, Phase 4, Phase 5 are also deepened and the cross-phase contradiction sweep step is complete.*
