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
- **Phase 4: Core Game UI — COMPLETE + REVIEWED** (2026-04-05)
  - 135/135 tests, typecheck clean, build succeeds
  - Phone initial JS: ~88KB gzipped (under 100KB budget)
  - 30+ new components across board + phone
  - Review: 8 agents, 24 findings — all P1/P2 resolved
  - P1 fixes: Rules of Hooks (hooks above conditional return), localTargetMode reset on state change, FuturePeek double-fire guard, PendingPrompt cardIds stripped from board projection, See the Future read-only sheet routing, dialog stacking mutual exclusion
  - P2 fixes: dead code cleanup (~40 lines), useSendAction reads server snapshot, useDiscardTop typed as CardInstance, NopeButton portal cached, nameOf extracted + fallback standardized, handleConfirm dead path removed
- All cross-phase contradictions resolved (2026-04-05)
- Rules audit complete -- canonical reference at `docs/rules/RULES-REFERENCE.md`

## Next Steps (in order)
1. Execute Phase 5: Visual & Animation
2. Execute Phase 6: Hardening & Deploy

## Landmines
- Phase 5: ImageBitmap.close() required in canvas cleanup (Phase 6 cross-plan note #10)
- 5 cat types: Taco Cat, Beard Cat, Rainbow-Ralphing Cat, Hairy Potato Cat, Cattermelon
- qrcode.react added as production dependency (small, SVG-only, board bundle only)
- `@cloudflare/workers-types` added to tsconfig types array for DurableObject ctx access
- `nextNopeGeneration` is module-level mutable state — works per-isolate in PartyKit but violates pure-engine ideal. Consider moving to PlayingState in Phase 6.
- Optimistic overlay is Phase 4 minimal (single transform, clear-on-any-update). Phase 5+ may need targeted rollback with actionId.
- Nope button 300ms grace window deferred to Phase 5 (P3 from review — UX polish, not correctness)
- See the Future 10s auto-close deferred to Phase 5 (P3 — UX polish)
- Announcement feed shows 3 stacked; spec says no stacking + 3s duration — Phase 5 polish
- PendingPromptBanner missing timeout countdown — Phase 5 polish
- `isConnected` missing from BoardPlayer in playing phase — Phase 5 wire disconnected indicator
- Combo validation duplicated between engine (isValidCombo) and shared (isValidComboMatch) — drift risk, consider dedup in Phase 5
- PlayingView is monolithic (~200 lines) — split into sub-components in Phase 5 when animations make re-render cost matter
- DefusePlacement "Random" uses client-side Math.random() — server validates range, acceptable
