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

- **Phase 5: Visual & Animation — COMPLETE + REVIEWED** (2026-04-05)
  - 135/135 tests, typecheck clean, build succeeds
  - Phone initial JS: ~92KB gzipped (under 100KB budget)
  - Neo-Noir Casino theme system (3-tier: primitives → semantic → card-type accents)
  - Premium card component (glow pseudo-element, face/back, SVG icon badges, high-contrast)
  - 3 self-hosted variable fonts (Clash Display, General Sans, JetBrains Mono)
  - Animation config (7 motion presets) + shared timing constants
  - Board layout: elliptical player ring (JS-calculated), arena, draw pile, discard fan
  - Card animations: AnimatePresence popLayout, staggered deal, layout="position" with guards
  - AnimationSequencer state machine (EK reveal 7-step + tension hold)
  - Particle system: TypedArray SoA pool (300 max, zero GC), pre-rendered sprites
  - Screen flash (seizure-safe WCAG 2.3.1), screen shake (trauma-based decreasing amplitude)
  - Bottom sheet springs, Nope FAB scale animation, ErrorToast + announcement AnimatePresence
  - Haptics (4 presets, Vibration API wrapper), phone UI Neo-Noir styling
  - Accessibility: aria-live regions, ReducedMotionProvider, focus-visible rings
  - Deferred items resolved: See the Future 10s auto-close
  - Review: 7 agents, 21 findings — all P1/P2 resolved
  - P1 fixes: MinimalCard keyboard activation, FavorResponse div→button, dead code (PlayerList, exitVariant, generateShakeKeyframes, haptics toggle), protocol readonly, ResizeObserver throttle, ParticlePool O(1) activeCount, clear() rAF race
  - P2 fixes: NopeButton :focus-visible, announce() wired to aria-live, useEffect deps fixed, CSS_PROPERTY_MAP typed, magic numbers→TIMING, formatEvent exhaustive, SEMANTIC un-exported, fonts split (mono board-only), Clash Display preload removed from phone, ReducedMotionProvider JSDoc

## Next Steps (in order)
1. Execute Phase 6: Hardening & Deploy

## Landmines
- Phase 5: ImageBitmap.close() required in canvas cleanup (Phase 6 cross-plan note #10)
- 5 cat types: Taco Cat, Beard Cat, Rainbow-Ralphing Cat, Hairy Potato Cat, Cattermelon
- qrcode.react added as production dependency (small, SVG-only, board bundle only)
- `@cloudflare/workers-types` added to tsconfig types array for DurableObject ctx access
- `nextNopeGeneration` is module-level mutable state — works per-isolate in PartyKit but violates pure-engine ideal. Consider moving to PlayingState in Phase 6.
- Optimistic overlay is Phase 4 minimal (single transform, clear-on-any-update). Phase 5+ may need targeted rollback with actionId.
- ~~Nope button 300ms grace window deferred to Phase 5~~ — TIMING constant added, not yet wired to FAB delay
- ~~See the Future 10s auto-close deferred to Phase 5~~ — DONE (countdown + auto-dismiss)
- Announcement feed shows 3 stacked; spec says no stacking + 3s duration — still stacked (AnimatePresence added but count logic unchanged)
- PendingPromptBanner missing timeout countdown — deferred to Phase 6
- `isConnected` missing from BoardPlayer in playing phase — deferred to Phase 6
- Combo validation duplicated between engine (isValidCombo) and shared (isValidComboMatch) — drift risk, Phase 6
- PlayingView is monolithic (~200 lines) — deferred to Phase 6 (animation cost not yet measured)
- DefusePlacement "Random" uses client-side Math.random() — server validates range, acceptable
- AnimationSequencer + particle system + screen effects are built but NOT wired into GameTable render tree — deferred to Phase 6
- Font files in public/fonts/ (~98KB total) downloaded from CDN — consider subsetting further if bandwidth is a concern
- Phone JS at ~92KB gzipped — only 8KB headroom before 100KB budget
- `ReducedMotionProvider` context provider added — all Phase 5+ animation code should check `useReducedMotionPreference()` before running motion
- Phase 5 review P3 deferred to Phase 6: roving tabindex on Hand, BottomSheet aria-labelledby, data-testid attributes, conditional Framer Motion reduced motion, optimistic 5s safety timeout, checkState() contract testing
- Nope FAB 300ms grace delay: TIMING constant exists but not yet wired to button interaction delay
