# Exploding Kittens Digital -- TODO

## Current State
- **All 6 phases COMPLETE + REVIEWED**
- **TODO items 1-7 COMPLETE** (2026-04-06)
  - Play Again button (return-to-lobby), animation code deleted (607 LOC), board protocol version check, iOS Safari reconnect fix, discardPile trim for phones, unused exports cleanup, motion-features preload
- **Adversarial swarm review COMPLETE** (2026-04-06)
  - 7 hostile agents: Security, Silent Failures, Architecture, Frontend Races, Test Coverage, Performance, Pattern Recognition
  - All findings remediated across 3 tiers (5 game-killers, 4 resilience, 7 polish)
  - Methodology documented in `docs/insights/008-adversarial-swarm-review-maximum-overdrive.md`
- **Theme pivot COMPLETE** (2026-04-06)
  - Noir surfaces kept, each cat card type gets unique accent color, Nope shifted green→teal (CVD safety), player colors→IBM CVD-safe palette, warm slate for utility cards
- **149/149 tests, 0 lint errors, typecheck clean, build succeeds**
- **Phone initial JS: ~93KB gzipped (under 100KB budget, 7KB headroom)**

## What The Swarm Found & We Fixed
- **Stale pendingPrompt** — 5 engine handlers left ghost prompts after Favor/Steal/Defuse/AlterFuture resolution
- **Double-submit on bottom sheets** — DefusePlacement, FavorResponse, TargetSelect, NameCard had no tap guards
- **Optimistic draw-your-own-death** — play-card rejection + Draw tap in gap = accidental EK draw. Interaction now locked during optimistic pending.
- **Serial queue ate ALL errors** — runtime exceptions swallowed silently, game frozen for everyone. Now broadcasts state on error, sends RATE_LIMITED on overflow.
- **Nope window permanent freeze** — timer dispatch failure left window stuck forever. Now force-cleared on unexpected failure.
- **Reconnection suppressed fatal errors** — KICKED, ROOM_FULL swallowed during reconnect. Now only STALE_STATE suppressed.
- **Timer cleanup gaps** — return-to-lobby and onStart didn't clear all timers. Fixed.
- **persistState fire-and-forget** — consecutive failure tracking added, onAlarm deleteAll wrapped in try-catch with reschedule
- **BottomSheet exit animation** — dialog.close() killed AnimatePresence exit. Deferred to onExitComplete.
- **AnnouncementFeed** — tracked by array length (broke on pruning). Now tracks by event ID.
- **FuturePeek** — side effect inside setState updater. Moved to separate effect.
- **Deterministic card IDs** — `card-0`, `card-1` leaked type info via discard pile. Now `crypto.randomUUID()`.
- **Player ErrorBoundary** — no autoRecover (board had it, player didn't). Fixed.
- **Dead exports, .gitkeep, readonly, CLAUDE.md** — all cleaned up.

## Next Steps (in order)
1. Manual testing: real phones, WiFi toggle, screen lock/unlock
2. Set up GitHub secrets (PARTYKIT_TOKEN, PARTYKIT_LOGIN, CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID)
3. First production deploy
4. Add `_headers` file for Cloudflare Pages (CSP, X-Frame-Options, X-Content-Type-Options)
5. Storage migration strategy — version field on persisted state, migration function in onStart()
6. Room.ts test coverage (844 lines, zero tests — the single biggest risk factor)
7. Projection regression guard (exhaustive key assertion to prevent accidental field leakage)
8. Phase 5 visual polish: player icons per avatar, glassmorphism sheets, multi-layered card shadows, grain texture, card art via Imagen 4

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
- ReducedMotionProvider is a passthrough — context + hook stripped until consumer is wired
- Inline styles in ~15 components bypass CSS modules convention (Board.tsx, Player.tsx, ErrorBoundary.tsx, sheets)
- NopeWindow stores full GameAction in persisted state — no versioning for hibernated action payloads
- playerSessions map not pruned on return-to-lobby (stale tokens from disconnected players linger)
- Theme CSS vars renamed: `--green`→`--teal`, `--accent-nope`/`--accent-success` now point to teal (#2dd8c8). Any new CSS using old green vars will silently fall back.
- Player colors changed from generic web colors to IBM CVD-safe palette — any hardcoded references to old colors (#e74c3c, #3498db, etc.) in Lobby/JoinScreen/ErrorBoundary are now mismatched. Cleanup needed.
- Imagen 4 available via Gemini API for card art generation (Phase 5)
