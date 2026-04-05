# Exploding Kittens Digital -- TODO

## Current State
- All 6 phase plans deepened and locked
- All cross-phase contradictions resolved (2026-04-05)
- Rules audit complete -- canonical reference at `docs/rules/RULES-REFERENCE.md`
- 5-different combo cut (not in Party Pack rules)
- Draw from Bottom confirmed as auto-trigger after Nope window
- Self-Nope disallowed per community consensus

## Next Steps (in order)
1. **Execute Phase 1: Foundation** -- scaffold project, shared types, card definitions, Vite 8 config, tsconfig
2. Execute Phase 2: Game Engine
3. Execute Phase 3: Networking + Lobby
4. Execute Phase 4: Core Game UI
5. Execute Phase 5: Visual & Animation
6. Execute Phase 6: Hardening & Deploy

## Landmines
- Phase 1 player.html: viewport meta already updated in plan (no `user-scalable=no`, has `viewport-fit=cover`)
- Phase 2: Nope grace window mechanism must be implemented (Phase 6 cross-plan note #9)
- Phase 2: `startedAtMs` needed on NopeWindow for reconnection countdown (Phase 6 cross-plan note #8)
- Phase 3: `onStart()` must restore ALL prompt timeout timers, not just Nope (Phase 6 cross-plan note #1)
- Phase 3: Reconnection state-send MUST be enqueued in serial queue (Phase 6 cross-plan note #4)
- Phase 5: ImageBitmap.close() required in canvas cleanup (Phase 6 cross-plan note #10)
- Vite 8 uses `rolldownOptions` not `rollupOptions` (breaking change from UMB)
- 5 cat types: Taco Cat, Beard Cat, Rainbow-Ralphing Cat, Hairy Potato Cat, Cattermelon
