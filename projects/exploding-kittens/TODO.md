# Exploding Kittens Digital -- TODO

## Current State
- **Phase 1: Foundation — COMPLETE + REVIEWED** (2026-04-05)
  - 12/12 tests, typecheck clean, lint clean, build succeeds
  - Phone initial JS: ~71KB gzipped (under 100KB budget)
  - Code review: 5 agents, 16 findings — all P1/P2 fixes applied
- **Phase 2: Game Engine — COMPLETE + REVIEWED** (2026-04-05)
  - 67/67 tests (49 scenario + 6 PBT + 12 foundation)
  - dispatch + all 12 card effects + Nope chains + combo validation
  - Review: 5 agents, 22 findings — all P1/P2 resolved
- **Phase 3: Networking + Lobby — COMPLETE + REVIEWED** (2026-04-05)
  - 105/105 tests, typecheck clean, lint clean
  - Review: 10 agents, 24 findings — all P1/P2 resolved
  - P1 fixes: useGameSelector memoization (useRef), phantom EK in defuse timeout, onClose phase-aware broadcast, reconnection Zod fix (empty name + token), useEffect cleanup (disconnect + all unsubs), host-connect on every reconnect, handleHostConnect enqueued, ErrorCode mapping, random() [0,1) fix
  - P2 fixes: server errors in store, ClientAction typing, draw-from-bottom removed, z.enum, SubPhase typing, projectForBoard N→1 optimization, disconnectTimes removed, 100dvh, prompt-cancelled removed, allowlist in handleStartGame, connection state helper, persistState error logging, rejection sampling for randomInt
- All cross-phase contradictions resolved (2026-04-05)
- Rules audit complete -- canonical reference at `docs/rules/RULES-REFERENCE.md`

## Next Steps (in order)
1. Execute Phase 4: Core Game UI
2. Execute Phase 5: Visual & Animation
3. Execute Phase 6: Hardening & Deploy

## Landmines
- Phase 5: ImageBitmap.close() required in canvas cleanup (Phase 6 cross-plan note #10)
- 5 cat types: Taco Cat, Beard Cat, Rainbow-Ralphing Cat, Hairy Potato Cat, Cattermelon
- qrcode.react added as production dependency (small, SVG-only, board bundle only)
- `@cloudflare/workers-types` added to tsconfig types array for DurableObject ctx access
- `nextNopeGeneration` is module-level mutable state — works per-isolate in PartyKit but violates pure-engine ideal. Consider moving to PlayingState in Phase 6.
- Self-Nope not guarded in engine — rules say disallowed. Add guard when implementing Phase 4 UI.
- PARTYKIT_HOST duplicated in Board.tsx + Player.tsx — extract to shared config when adding more entry points.
- Optimistic overlay infrastructure needed in gameStore for Phase 4 (cross-plan note #5).
