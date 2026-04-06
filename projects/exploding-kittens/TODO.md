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
- **Phase 4: Core Game UI — COMPLETE + REVIEWED** (2026-04-05)
  - 135/135 tests, typecheck clean, build succeeds
  - Phone initial JS: ~88KB gzipped (under 100KB budget)
  - 30+ new components across board + phone
  - Review: 8 agents, 24 findings — all P1/P2 resolved
- **Phase 5: Visual & Animation — COMPLETE + REVIEWED** (2026-04-05)
  - 135/135 tests, typecheck clean, build succeeds
  - Phone initial JS: ~92KB gzipped (under 100KB budget)
  - Review: 7 agents, 21 findings — all P1/P2 resolved
- **Phase 6: Hardening & Deploy — COMPLETE + REVIEWED** (2026-04-06)
  - 144/144 tests (135 existing + 6 Phase 6 + 3 review), typecheck clean, build succeeds
  - Phone initial JS: ~92KB gzipped (under 100KB budget, 8KB headroom)
  - Mobile hardening: wake lock, landscape detection, 100svh, overscroll, safe-area, PWA suppress
  - Security: origin validation, max connections (12), heartbeat (30s/10s), idle timeout, name regex, protocol version, ESLint react/no-danger
  - Client resilience: ErrorBoundary (phone + board), protocol mismatch banner, global error handlers
  - Reconnection: isReconnecting flag, Nope grace window (300ms two-step), serial queue state-send (P0), disconnect debounce (3s)
  - Performance: bundle size CI script, preconnect hints, font-display: swap verified
  - Deploy config: CF Pages _headers/_redirects, partykit.json, env vars, schema versioning
  - CI/CD: GitHub Actions pipeline (verify → deploy-server → deploy-client)
  - E2E: Playwright config, fixtures, helpers, tier1 test scaffold
  - Monitoring: structured JSON logging, client error reporting
- All cross-phase contradictions resolved (2026-04-05)
- Rules audit complete -- canonical reference at `docs/rules/RULES-REFERENCE.md`

## Next Steps (in order)
1. Manual testing: real phones, WiFi toggle, screen lock/unlock, 10-player stress
2. Set up GitHub secrets (PARTYKIT_TOKEN, PARTYKIT_LOGIN, CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID)
3. First production deploy

## Landmines
- 5 cat types: Taco Cat, Beard Cat, Rainbow-Ralphing Cat, Hairy Potato Cat, Cattermelon
- qrcode.react added as production dependency (small, SVG-only, board bundle only)
- `@cloudflare/workers-types` added to tsconfig types array for DurableObject ctx access
- `nextNopeGeneration` is module-level mutable state — works per-isolate in PartyKit but violates pure-engine ideal
- Room code generation is client-side (Board.tsx) — server-side generation deferred (join rate limiting constants removed)
- AnimationSequencer + particle system + screen effects are built but NOT wired into GameTable render tree
- Font files in public/fonts/ (~98KB total) downloaded from CDN — consider subsetting further if bandwidth is a concern
- Phone JS at ~92KB gzipped — only 8KB headroom before 100KB budget
- 2 pre-existing lint errors (ReducedMotionProvider empty block, unused CardType import in useSharedSelectors)
- E2E tests require `npx playwright install` before first run
- Remaining E2E Tier 2 scenarios (11-20) not yet written — scaffold only
- PendingPromptBanner missing timeout countdown — deferred
- `isConnected` missing from BoardPlayer in playing phase — deferred
- Combo validation duplicated between engine (isValidCombo) and shared (isValidComboMatch) — drift risk
- Phase 5 review P3 items deferred: roving tabindex on Hand, BottomSheet aria-labelledby, data-testid attributes, conditional Framer Motion reduced motion, optimistic 5s safety timeout, checkState() contract testing
