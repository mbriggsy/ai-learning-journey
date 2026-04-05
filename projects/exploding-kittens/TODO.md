# Exploding Kittens Digital -- TODO

## Current State
- **Phase 1: Foundation — COMPLETE + REVIEWED** (2026-04-05)
  - 12/12 tests, typecheck clean, lint clean, build succeeds
  - Phone initial JS: ~71KB gzipped (under 100KB budget)
  - Code review: 5 agents, 16 findings — all P1/P2 fixes applied
- **Phase 2: Game Engine — COMPLETE** (2026-04-05)
  - 67/67 tests (49 scenario + 6 PBT + 12 foundation)
  - dispatch + all 12 card effects + Nope chains + combo validation
  - PBT: card conservation, projection privacy, immutability
  - Pure functions only — zero UI, zero network code
- All cross-phase contradictions resolved (2026-04-05)
- Rules audit complete -- canonical reference at `docs/rules/RULES-REFERENCE.md`

## Next Steps (in order)
1. **Execute Phase 3: Networking + Lobby** -- WebSocket layer, Zod validation, room lifecycle
2. Execute Phase 4: Core Game UI
3. Execute Phase 4: Core Game UI
4. Execute Phase 5: Visual & Animation
5. Execute Phase 6: Hardening & Deploy
6. Review Phase 2 (recommended before Phase 3 — engine is security-critical)

## Landmines
- Phase 2: Nope grace window mechanism must be implemented (Phase 6 cross-plan note #9)
- Phase 2: `startedAtMs` needed on NopeWindow for reconnection countdown (Phase 6 cross-plan note #8)
- Phase 3: `onStart()` must restore ALL prompt timeout timers, not just Nope (Phase 6 cross-plan note #1)
- Phase 3: Reconnection state-send MUST be enqueued in serial queue (Phase 6 cross-plan note #4)
- Phase 5: ImageBitmap.close() required in canvas cleanup (Phase 6 cross-plan note #10)
- partyserver peer dep warning: wants @cloudflare/workers-types@^4.20240729.0, got 4.20240718.0 (transitive, non-blocking)
- 5 cat types: Taco Cat, Beard Cat, Rainbow-Ralphing Cat, Hairy Potato Cat, Cattermelon
