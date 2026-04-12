# BURNED — TODO

## Current State
- **PRODUCT-SPECIFICATION.md v1.0 LOCKED** — `docs/specifications/PRODUCT-SPECIFICATION.md` (2026-04-10).
- **234/234 tests, typecheck clean** (verified 2026-04-12).
- **Phone bundle: ~97.6 KB gzipped** (under 100KB budget, ~2.4KB headroom).
- **Phase 4 — Motion Consolidation COMPLETE.** All 24 FM sites + 3 GSAP tweens + 3 CSS edits migrated to token system. `animation-config.ts` deleted. PlayerRing measurement-div coupling resolved. All 8 verification greps pass.
- **Code reverted to pre-session state.** 2026-04-12 session attempted phone layout fixes, failed — all changes reverted.

## Next Steps (in priority order)

### 1. CRITICAL — Phone PlayingView layout: TitleBar/StatusBar disappear after card interaction

**Symptom:** TitleBar ("player name + room code") and StatusBar ("YOUR TURN") are visible on initial load, then disappear after double-tapping a card to stage it. The staging area shifts to the top of the viewport, hiding the chrome above it.

**Reproduction:** Chrome DevTools → Pixel 7 (412×915) → join a game → double-tap a card to stage it → TitleBar and StatusBar gone.

**Root cause: UNDIAGNOSED.** The 2026-04-12 session tried 6+ theories (safe-area double-subtraction, percentage height resolution, overflow:hidden vs overflow:clip focus-scrolling, CSS custom property recalculation, container-type containment, viewport unit stale caching) — none fixed it. The Playwright diagnostic at 412×915 showed correct layout (TitleBar rectTop=0, scrollTop=0 everywhere), meaning the bug does NOT reproduce in Playwright headless. It only appears in Chrome DevTools device emulation.

**What the next session MUST do differently:**
- Do NOT guess. Inject a diagnostic script into the ACTUAL Chrome DevTools session (via console or a dev-only component) that logs computed heights, scrollTop, and getBoundingClientRect() on html/body/#root/.view/TitleBar BEFORE and AFTER the card interaction.
- Compare the "before" and "after" values to identify exactly which element moves and why.
- Only then write a fix. ONE fix. Test it. Move on.

**Files involved:**
- `src/client/player/PlayingView.module.css` — `.view` sizing and overflow
- `src/client/player/player-hardening.css` — html/body/#root sizing and overflow
- `player.html` — `#root` has `container-type:inline-size` inline style (investigate if this contributes)

### 2. SmartActionBox not anchored to bottom of staging area

The `.smartActionBox` CSS class in `StagingArea.module.css` defines `margin-top: auto` but the `<SmartActionBox>` component in `StagingArea.tsx` is rendered as a direct child without a wrapper div, so the class is never applied. Fix: wrap `<SmartActionBox>` in `<div className={styles.smartActionBox}>`.

### 3. Execute Phase 5 — Verification & Acceptance

**`/ce:work docs/plans/css-foundation-rebuild/phase-5-verification-acceptance.md`**

Blocked by #1 and #2.

### 4. Tier 2 Retheme Cleanup (non-blocking)
- `src/server/game/engine.ts` — 11 "EK" → "Burned" comment renames
- `src/shared/constants.ts:21-23` — `EK_REVEAL_MS` → `BURNED_REVEAL_MS` (+ 2 more), coordinated rename across all call sites
- `src/server/game/engine.ts:1040` — error message `'No EK in hand'` → `'No Burned card in hand'`
- `src/client/board/Arena.tsx:7` — comment `"EK reveal"` → `"Burned reveal"`

### 5. Pending Decisions (visual review gates)
- **Baveuse font evaluation** — one-line token swap if Clash Display fails the Archer test.
- **GameOver winner glow hue** — `--color-accent-drama` (ochre) vs `--color-accent-intercept` (emerald).
- **NopeCountdownBar emerald saturation** — emerald-9 vs -8/-10.
- **`--radius-input` / `--radius-button`** (4px) — if too sharp vs Dreamland stills.

## Landmines
- **Wrangler local SQLite corruption** — `.wrangler/state` can corrupt after hard kills. Fix: `taskkill //F //IM workerd.exe && rm -rf .wrangler/state`. This is a dev-only issue.
- **Dev launcher race condition** — player tabs open 1s after board (was 150ms). If players join before board sends `host-connect`, server rejects with GAME_ALREADY_STARTED. `dev.html` timing was increased this session.
- **DramaOverlay GSAP cleanup** — pre-existing: timeline created in `processQueue()` never killed on unmount. Phase 5 fix.
- **StagingArea.module.css has uncommitted pre-session changes** — `.stagedRow` was changed from `flex: 1 1 0` to `flex: 0 0 auto; height: var(--size-phone-card-height)`, and `.smartActionBox` got `margin-top: auto`. These were in the working tree before the 2026-04-12 session and were NOT reverted (they're separate from the failed layout fixes). Review before committing.
