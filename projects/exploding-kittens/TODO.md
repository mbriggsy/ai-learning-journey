# Exploding Kittens Digital -- TODO

## Current State
- **All 6 phases COMPLETE + REVIEWED**
- **Comprehensive codebase audit COMPLETE** (2026-04-06)
  - 10 agents: Architecture, Security, Performance, Silent Failures, Test Coverage, Type Design, Frontend Races, User Flows, Pattern Recognition, Code Simplicity
  - 149/149 tests, typecheck clean, build succeeds
  - Phone initial JS: ~92KB gzipped (under 100KB budget, 8KB headroom)
  - Game-freezers fixed: nextNopeGeneration moved to PlayingState (survives hibernate), grace period restored on wake
  - UX dead ends fixed: JoinScreen errors visible, See the Future dismissal, FavorResponse EK-only auto-resolve
  - Room codes: 6 chars (887M combos), rejection sampling, no modulo bias
  - Board: error banner, room code persisted in URL hash (survives refresh)
  - Nope countdown displayed on phone FAB
  - Projection allowlist: projectForPlayer no longer uses ...board spread
  - Combo steal + Draw from Bottom tests added (zero coverage → full end-to-end)
  - Test helpers extracted to shared test-helpers.ts

## Next Steps (in order)
1. **"Play Again" button** — engine `return-to-lobby` action, GameOver button on Board + Player. Everyone stays connected, no rescan. THE #1 UX gap.
2. **Wire animation code OR delete it** — AnimationSequencer + particle system + ScreenFlash (607 LOC built Phase 5, never connected to GameTable render tree). Decision: wire for EK drama or delete (git has history).
3. **Board protocol version check** — board never gets `joined` message, protocolMismatch always false. Add PROTOCOL_VERSION to state-update payload or send a version message to host on connect.
4. **iOS Safari reconnect handler gap** — `handleVisibilityChange` calls `socket.reconnect()` but doesn't set `hasConnectedOnce = true`, so the next open event is not treated as a reconnect. `isReconnecting` never set, stale errors not suppressed.
5. **discardPile trim for player messages** — phones never render discardPile but receive the full array. Project `discardPile: []` or `discardTop` only in player views. Saves 30-40% message size late-game.
6. **Unused exports cleanup** — MOTION presets (IMPACT, TENSION, RELIEF, ANTICIPATION, INSTANT), haptic presets (heavy, success), useReducedMotionPreference hook, CardVisualProps/PremiumCardProps types. Delete or wire.
7. **motion-features preload** — 27KB lazy chunk may not load before first Nope on slow party WiFi. Add `<link rel="modulepreload">` in player.html.
8. Manual testing: real phones, WiFi toggle, screen lock/unlock
9. Set up GitHub secrets (PARTYKIT_TOKEN, PARTYKIT_LOGIN, CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID)
10. First production deploy

## Landmines
- 5 cat types: Taco Cat, Beard Cat, Rainbow-Ralphing Cat, Hairy Potato Cat, Cattermelon
- qrcode.react added as production dependency (small, SVG-only, board bundle only)
- `@cloudflare/workers-types` added to tsconfig types array for DurableObject ctx access
- Combo validation duplicated between engine (isValidCombo) and shared (isValidComboMatch) — drift risk
- Phone JS at ~92KB gzipped — only 8KB headroom before 100KB budget
- 2 pre-existing lint errors (ReducedMotionProvider empty block, unused CardType import in useSharedSelectors)
- E2E tests require `npx playwright install` before first run
- Remaining E2E Tier 2 scenarios (11-20) not yet written — scaffold only
- PendingPromptBanner missing timeout countdown
- `isConnected` missing from BoardPlayer in playing phase
- Lobby.module.css and JoinScreen.module.css use `rem` units (Phase 1) while Phase 4+ uses `px`
- `game_over` phase uses snake_case while all other phases use kebab-case (legacy, breaking to change)
- Phase 5 review P3 deferred: roving tabindex on Hand, BottomSheet aria-labelledby, data-testid attributes, conditional Framer Motion reduced motion, optimistic 5s safety timeout, checkState() contract testing
