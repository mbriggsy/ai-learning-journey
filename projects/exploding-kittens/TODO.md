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
- **Phase 4: Core Game UI — COMPLETE** (2026-04-05)
  - 135/135 tests, typecheck clean, build succeeds
  - Phone initial JS: ~88KB gzipped (under 100KB budget)
  - 30+ new components: GameTable, PlayerList, NopeCountdownBar, AnnouncementFeed,
    PendingPromptBanner, Hand, CardConfirmBar, DrawButton, NopeButton (portal),
    5 prompt sheets (TargetSelect, DefusePlacement, FuturePeek, FavorResponse, NameCard),
    BottomSheet, GameOver, EliminatedView, ErrorToast, ConnectionOverlay
  - Cross-plan prerequisites resolved: motion package, PendingPrompt type,
    BoardView/PlayerView discriminated unions, optimistic overlay, event accumulation
  - Landmines resolved: self-Nope guard, PARTYKIT_HOST extracted, combo-validation shared
- All cross-phase contradictions resolved (2026-04-05)
- Rules audit complete -- canonical reference at `docs/rules/RULES-REFERENCE.md`

## Next Steps (in order)
1. Review Phase 4 (multi-agent review)
2. Execute Phase 5: Visual & Animation
3. Execute Phase 6: Hardening & Deploy

## Landmines
- Phase 5: ImageBitmap.close() required in canvas cleanup (Phase 6 cross-plan note #10)
- 5 cat types: Taco Cat, Beard Cat, Rainbow-Ralphing Cat, Hairy Potato Cat, Cattermelon
- qrcode.react added as production dependency (small, SVG-only, board bundle only)
- `@cloudflare/workers-types` added to tsconfig types array for DurableObject ctx access
- `nextNopeGeneration` is module-level mutable state — works per-isolate in PartyKit but violates pure-engine ideal. Consider moving to PlayingState in Phase 6.
- Optimistic overlay infrastructure is Phase 4 minimal (single transform, clear-on-any-update). Phase 5+ may need targeted rollback with actionId.
- See the Future sheet auto-closes on SubPhase change but has no explicit 10s auto-dismiss timer (Phase 5 polish).
- DefusePlacement "Random" option uses client-side Math.random() — acceptable since server validates position range anyway. True CSPRNG would require a dedicated server action.
