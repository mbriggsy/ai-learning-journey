# BURNED — TODO

## Current State
- **PRODUCT-SPECIFICATION.md v1.0 LOCKED** — `docs/specifications/PRODUCT-SPECIFICATION.md` (2026-04-10).
- **234/234 tests, typecheck clean** (verified 2026-04-12).
- **Phone bundle: ~97.6 KB gzipped** (under 100KB budget, ~2.4KB headroom).
- **Phase 4 — Motion Consolidation COMPLETE.** All 24 FM sites + 3 GSAP tweens + 3 CSS edits migrated to token system. `animation-config.ts` deleted. PlayerRing measurement-div coupling resolved. All 8 verification greps pass.

## CSS Foundation Rebuild Progress

| Phase | Status | Commit |
|---|---|---|
| Phase 1 — Token System Foundation | ✅ COMPLETE | `6f52c02d` |
| Phase 2 — Phone View Migration | ✅ COMPLETE | `421cb10c` (8 commits total) |
| Phase 3 — Board View Migration | ✅ COMPLETE | `dd1280c0` (6 commits total) |
| Phase 4 — Motion Consolidation | ✅ COMPLETE | `35dd5c2c` (15 commits total) |
| Phase 5 — Verification & Acceptance | DEEPENED | Awaiting execution after Phase 4 |

## Next Steps (in priority order)

### 1. CRITICAL — Visual audit of phone layout (Phase 2 regressions)

Phase 2's CSS rewrites broke the phone playing view. These must be fixed BEFORE Phase 5:

- **Staging area height** — Phase 2 replaced the working `flex: 42 1 0` / `flex: 58 1 0` proportional split with fixed-height tokens (`--size-staging-height: max 160px`, `--size-hand-height: max 220px`). Not enough room for cards. Partially reverted this session but needs proper visual verification with `/frontend-design`.
  - `src/client/player/PlayingView.module.css:37` — staging flex
  - `src/client/player/PlayingView.module.css:49` — hand flex
  - `src/client/player/StagingArea.module.css:50-58` — stagedSlot sizing
- **ConnectionOverlay dialog CSS** — `.overlay { display: flex }` overrode UA `dialog:not([open]) { display: none }`. Fixed this session: changed to `.overlay[open]`.
  - `src/client/player/ConnectionOverlay.module.css:16`

### 2. CRITICAL — Connection module StrictMode fix

React StrictMode double-mount caused WebSocket connect→disconnect→connect race condition. Fixed this session with delayed disconnect (50ms) + room-aware idempotency + stale event guards. Needs testing on actual phone.
- `src/client/connection.ts` — full rewrite this session

### 3. Execute Phase 5 — Verification & Acceptance

**`/ce:work docs/plans/css-foundation-rebuild/phase-5-verification-acceptance.md`**

Must use `/frontend-design` skill for visual verification. Paper-only CSS plans produced regressions.

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
