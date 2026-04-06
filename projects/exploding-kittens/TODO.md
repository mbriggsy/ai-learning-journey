# Exploding Kittens Digital -- TODO

## Current State
- **All 6 phases COMPLETE + REVIEWED**
- **Comprehensive codebase audit COMPLETE** (2026-04-06)
  - 10 agents: Architecture, Security, Performance, Silent Failures, Test Coverage, Type Design, Frontend Races, User Flows, Pattern Recognition, Code Simplicity
  - 149/149 tests, typecheck clean, 0 lint errors, build succeeds
  - Phone initial JS: ~93KB gzipped (under 100KB budget, 7KB headroom)
- **TODO items 1-7 COMPLETE** (2026-04-06)
  - Play Again button (return-to-lobby), animation code deleted (607 LOC / -567 net), board protocol version check, iOS Safari reconnect fix, discardPile trim for phones, unused exports cleanup, motion-features preload
  - All pre-existing lint errors resolved (was 5, now 0)

## Next Steps (in order)
1. Manual testing: real phones, WiFi toggle, screen lock/unlock
2. Set up GitHub secrets (PARTYKIT_TOKEN, PARTYKIT_LOGIN, CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID)
3. First production deploy

## Landmines
- 5 cat types: Taco Cat, Beard Cat, Rainbow-Ralphing Cat, Hairy Potato Cat, Cattermelon
- qrcode.react added as production dependency (small, SVG-only, board bundle only)
- `@cloudflare/workers-types` added to tsconfig types array for DurableObject ctx access
- Combo validation duplicated between engine (isValidCombo) and shared (isValidComboMatch) — drift risk
- Phone JS at ~93KB gzipped — only 7KB headroom before 100KB budget
- E2E tests require `npx playwright install` before first run
- Remaining E2E Tier 2 scenarios (11-20) not yet written — scaffold only
- PendingPromptBanner missing timeout countdown
- `isConnected` missing from BoardPlayer in playing phase
- Lobby.module.css and JoinScreen.module.css use `rem` units (Phase 1) while Phase 4+ uses `px`
- `game_over` phase uses snake_case while all other phases use kebab-case (legacy, breaking to change)
- Phase 5 review P3 deferred: roving tabindex on Hand, BottomSheet aria-labelledby, data-testid attributes, conditional Framer Motion reduced motion, optimistic 5s safety timeout, checkState() contract testing
- ReducedMotionProvider is a passthrough ��� context + hook stripped until consumer is wired
