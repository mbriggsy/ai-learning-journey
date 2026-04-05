# Exploding Kittens Digital -- TODO

## Current State
- **Phase 1: Foundation — COMPLETE** (2026-04-05)
  - 10/10 tests passing, typecheck clean, lint clean, build succeeds
  - Phone initial JS: ~59KB gzipped (under 100KB budget)
  - 17 card types, 120 total cards, all counts verified against rules PDF
- All cross-phase contradictions resolved (2026-04-05)
- Rules audit complete -- canonical reference at `docs/rules/RULES-REFERENCE.md`

## Next Steps (in order)
1. **Execute Phase 2: Game Engine** -- dispatch, state machine, deck building, card effects, combo detection
2. Execute Phase 3: Networking + Lobby
3. Execute Phase 4: Core Game UI
4. Execute Phase 5: Visual & Animation
5. Execute Phase 6: Hardening & Deploy

## Landmines
- Phase 2: Nope grace window mechanism must be implemented (Phase 6 cross-plan note #9)
- Phase 2: `startedAtMs` needed on NopeWindow for reconnection countdown (Phase 6 cross-plan note #8)
- Phase 3: `onStart()` must restore ALL prompt timeout timers, not just Nope (Phase 6 cross-plan note #1)
- Phase 3: Reconnection state-send MUST be enqueued in serial queue (Phase 6 cross-plan note #4)
- Phase 5: ImageBitmap.close() required in canvas cleanup (Phase 6 cross-plan note #10)
- partyserver peer dep warning: wants @cloudflare/workers-types@^4.20240729.0, got 4.20240718.0 (transitive, non-blocking)
- 5 cat types: Taco Cat, Beard Cat, Rainbow-Ralphing Cat, Hairy Potato Cat, Cattermelon
