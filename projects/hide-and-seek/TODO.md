# Hide and Seek — TODO

## Current State
- Brainstorm complete (2026-03-29)
- Master plan complete (2026-03-29) — 8 phases (now 9 with Phase 5 split), all research done
- **Master plan DEEPENED (2026-03-29)** — 16 research/review agents, 3 Context7 queries, 6 contradictions resolved
- **Phase 0 plan DEEPENED (2026-03-29)** — 12 agents (4 research + 7 review + 1 repo analyst), 3 Context7 queries, 3 web searches, 5 contradictions resolved
- **Phase 1 plan DEEPENED (2026-03-29)** — 14 agents (5 research + 7 review + 1 spec flow + 1 repo analyst), 3 Context7 queries, 3 web searches, 11 contradictions resolved
- **Phase 2 plan DEEPENED (2026-03-30)** — 14 agents (4 research + 6 review + 1 spec flow + 1 repo analyst), 1 Context7 query, 2 web searches, 12 contradictions resolved
- **Phase 3 plan DEEPENED (2026-03-30)** — 13 agents (4 research + 6 review + 1 spec flow + 1 codebase explorer + 1 general-purpose), 3 Context7 queries, 13 contradictions resolved
- **Phase 4 plan DEEPENED (2026-03-30)** — 14 agents (9 review + 4 research + 1 web research), 4 Context7 queries, 13 contradictions resolved
- Phase plans broken out into individual documents — deepening in progress
- No code yet — project is in design phase

### Documents
- Brainstorm: `docs/ideation/2026-03-29-hide-and-seek-brainstorm.md`
- Master plan: `docs/plans/2026-03-29-001-feat-hide-and-seek-game-plan.md`
- Phase plans: `docs/plans/2026-03-29-002` through `009`

## What We Did (2026-03-30, Session 4)
- **DEEPENED Phase 3 plan with 13 agents:**
  - 4 research agents: Phaser fog of war (per-tile alpha, shadowcasting, overlay layers), scene management (sleep/wake, lifecycle, data passing), camera dramatic effects (Promise chaining, dual-camera, easing), HUD/UI patterns (BitmapText, timer states, menu navigation)
  - 6 review agents: architecture strategist, TypeScript reviewer, performance oracle, code simplicity, spec flow analyzer, race condition reviewer, pattern recognition
  - 1 codebase explorer: verified NO CODE EXISTS, confirmed Phase 2 architecture decisions
  - 1 general-purpose agent: Context7-based scene management research (replaced stuck best-practices-researcher)
  - 3 Context7 doc queries: Phaser scenes API (start/launch/sleep/wake), camera effects API (fade/zoom/pan/flash events), tilemap API (setTint/setAlpha per-tile)
  - Resolved 13 contradictions (Boot scope, loaderror, controller nav, fog tween, COUNTDOWN→HUNT fade, fog rendering approach, onboarding defer, reduced-motion toggle, settings-from-pause defer, SceneTransition utility, EndOfRoundSequence utility, FOV boundary violation, zoomTo(1.5) jitter)
  - 6 simplification proposals evaluated: 3 accepted (merge Boot+Preloader, remove Settings UI, remove AI-vs-AI button), 1 partially accepted (remove renderer-side dirty flag, keep game-layer FOV dirty flag), 2 rejected with evidence (HUD parallel scene KEPT — zoom scaling problem; full camera sequences KEPT — data-driven approach makes them cheap)
  - 5 new systems designed: PauseAuthority (~20 LOC), EndOfRoundSequence polling state machine (~40 LOC), SceneTransition (type-safe via SceneDataMap), CinematicManager (dual-camera), TestBridge (Playwright integration)
  - 7 new type definitions: SceneDataMap, ResultsSceneData, HUDSceneData, GameSettings, SequenceStep, FogState, TimerState
  - 5 critical race conditions caught: HUD deaf on first frame, EndOfRoundSequence softlock, dual pause authority conflict, EasyStar ghost callbacks, Escape during cinematic
  - 8 Playwright test specifications with TestBridge architecture
  - WebFetch stuck-agent lesson learned: best-practices-researcher agents hang on Cloudflare-protected blog URLs. Killed and relaunched 3 times before switching to general-purpose agent with Context7-only instructions. Future fix: use Playwright MCP for blog fetches.

## What We Did (2026-03-30, Session 3)
- **DEEPENED Phase 2 plan with 14 agents:**
  - 4 research agents: symmetric shadowcasting, EasyStar.js API, stealth game AI FSM, game flow state machine
  - 6 review agents: architecture strategist, TypeScript reviewer, performance oracle, simplicity, spec flow analyzer, race condition reviewer
  - 1 Context7 query: EasyStar.js full API (findPath, calculate, avoidAdditionalPoint, cancel)
  - 2 web searches: Albert Ford shadowcasting, game AI FSM patrol/chase patterns
  - Resolved 12 contradictions (FOV Uint8Array, findPath callback pattern, two-level GameState, actions layer defer, switch FSM, SeekerState split, 3-way detection, path smoothing defer, TypedEmitter scope, HUD text-only, minimal pause, calculate() placement)
  - Critical discoveries: EasyStar callbacks fire via setTimeout (not during calculate()), checkDetection must return 3-way result (none/spotted/found), terminal states must halt fixedUpdate, TypedEmitter needs copy-on-iterate
  - Added: TypedEmitter implementation, minimal pause, end-of-game display, FOV dirty flag, transition delays, SeekerConfig, waypoint consume-remaining pattern

## What We Did (2026-03-29, Session 2)
- **DEEPENED Phase 1 plan with 14 agents:**
  - 5 research agents: Tiled+Phaser integration, fixed timestep patterns, dual input handling, tile-based collision, Phaser camera+sprites
  - 7 review agents: architecture strategist, TypeScript reviewer, performance oracle, security sentinel, pattern recognition, code simplicity, frontend races
  - 1 spec flow analyzer: found 14 user flows (plan had 8), 8 master plan contradictions, 12 unspecified edge cases
  - 1 repo research analyst: carried forward patterns from racer-04 and Conway
  - 3 Context7 doc queries: Phaser tilemap, camera, gamepad APIs
  - 3 web searches: Tiled collision, fixed timestep, dual input
  - Resolved 11 contradictions (render interpolation, accumulator ownership, tile layers, GameState, TypedEmitter, tab visibility, tick rate, state.ts naming, ReadonlyDeep, seeker spawn, BootScene naming)
  - Critical discovery: render interpolation is dead code with roundPixels: true — eliminated InterpolatedSprite from Phase 1
  - Added: GameEngine class, tab visibility handler, validateMapData(), pixelToTile/tileToPixel utils, blocks_los tile property, scaled radial deadzone, one-shot signal consumption, determinism test, performance benchmark

## What We Did (2026-03-29, Session 1)
- Full brainstorm session: game design, tech stack, art direction, AI behavior, controls, round flow
- Reviewed and refined brainstorm — added round flow, controller support, speed balance, door mechanics, AI hider tiers, found moment design, moved fog of war to Tier 1
- Ran SpecFlow analysis — identified 17 gaps, resolved all critical questions
- External research (3 parallel agents): Phaser.js framework, game AI patterns (FSM, pathfinding, smart-but-fair), fog of war + LOS (shadowcasting, rendering), map design + Tiled workflow
- Key tech decisions: symmetric shadowcasting (Albert Ford) for LOS, EasyStar.js for pathfinding, FSM for seeker AI, per-tile alpha tinting for fog, 32x32 tiles
- Wrote comprehensive master plan (8 phases aligned to brainstorm tiers)
- Broke master plan into 8 individual phase plan documents
- **DEEPENED master plan with 16 agents:**
  - 10 research agents: shadowcasting, stealth AI, fog rendering, fixed timestep, pathfinding, sonar/minimap, art pipeline, Web Audio, Tiled integration, best practices
  - 6 review agents: architecture, TypeScript patterns, performance, security, patterns, spec flow
  - 3 Context7 doc queries: Phaser 3.90, EasyStar.js, Vitest 4
  - Resolved 6 contradictions, identified 15 critical improvements, 10 missing user flows, 6 new risks
  - Split Phase 5 into 5a (seeker tiers) + 5b (hider AI + spectator)
  - Added: GameEngine class, typed event system, discriminated unions, ReadonlyDeep, Uint8Array FOV, tab backgrounding, accessibility, canvas config, controller menus
- **DEEPENED Phase 0 plan with 12 agents:**
  - 4 research agents: Phaser+Vite scaffolding, TS strict config, architecture boundary enforcement, Vitest 4 config
  - 7 review agents: architecture strategist, TypeScript reviewer, performance oracle, security sentinel, pattern recognition, code simplicity, spec flow analyzer
  - 1 repo research analyst (sibling project conventions)
  - 3 Context7 doc queries: Phaser 3.90 game config, Vite 7 build config, Vitest 4 projects
  - 3 web searches: Phaser+Vite template, TS strict 2026, Vitest 4 patterns
  - Resolved 5 contradictions (noPropertyAccessFromIndexSignature, constants scope, empty dirs, CSP, Playwright)
  - Critical discoveries: Vite CVE (pin ^7.0.7), esModuleInterop required for Phaser, CSP deferred, fps.limit not fps.target, mergeConfig required for vitest
  - Expanded: 13 tasks → 15, 4 success criteria → 8, 2 risks → 9, added complete code examples for all config files

## Next Steps (Priority Order)

**DEEPEN ALL PHASE PLANS (serial, one at a time):**
- [x] `/deepen-plan docs/plans/2026-03-29-001-feat-hide-and-seek-game-plan.md` ← MASTER PLAN DONE
- [x] `/deepen-plan docs/plans/2026-03-29-002-phase-0-project-scaffolding-plan.md` ← DONE (12 agents, 5 contradictions resolved)
- [x] `/deepen-plan docs/plans/2026-03-29-003-phase-1-map-movement-plan.md` ← DONE (14 agents, 11 contradictions resolved)
- [x] `/deepen-plan docs/plans/2026-03-29-004-phase-2-seeker-detection-plan.md` ← DONE (14 agents, 12 contradictions resolved)
- [x] `/deepen-plan docs/plans/2026-03-29-005-phase-3-fog-game-flow-plan.md` ← DONE (13 agents, 13 contradictions resolved)
- [x] `/deepen-plan docs/plans/2026-03-29-006-phase-4-doors-minimap-plan.md` ← DONE (14 agents, 13 contradictions resolved)
- [ ] `/deepen-plan docs/plans/2026-03-29-007-phase-5-ai-depth-spectator-plan.md`
- [ ] `/deepen-plan docs/plans/2026-03-29-008-phase-6-sound-scoring-plan.md`
- [ ] `/deepen-plan docs/plans/2026-03-29-009-phase-7-art-pipeline-plan.md`

**THEN fix any contradictions across deepened plans.**

**THEN execute phases sequentially (fresh context window per phase):**
- [ ] Execute Phase 0: Project Scaffolding
- [ ] Execute Phase 1: Map + Movement
- [ ] Execute Phase 2: Seeker + Detection
- [ ] Execute Phase 3: Fog of War + Game Flow
- [ ] Execute Phase 4: Doors + Minimap
- [ ] Execute Phase 5: AI Depth + Spectator
- [ ] Execute Phase 6: Sound + Scoring
- [ ] Execute Phase 7: Art Pipeline

## Infrastructure: WebFetch Timeout Hook (UNTESTED)

**Problem:** WebFetch tool has NO timeout parameter. When agents call it on slow/dead URLs, they hang indefinitely — losing all accumulated work. Hit this twice during Phase 4 deepening (2 agents stalled with 0 output).

**Solution:** PreToolUse hook blocks WebFetch and redirects agents to `curl --max-time 15` via Bash.

**Files:**
- Hook script: `~/.claude/hooks/block-webfetch.sh`
- Wired in: `~/.claude/settings.json` under `hooks.PreToolUse` → matcher `"WebFetch"`

**Status:** Script tested manually (works). Hook NOT yet tested live — needs session restart to load.

**Next session:** Call WebFetch to verify the hook blocks it and returns the curl alternative. If it doesn't fire, investigate hook loading lifecycle.

## Landmines
- **Phaser 3.90.0 is likely the LAST v3 release** — Phaser 4 is RC7, not stable. Fine for our scope, game logic is Phaser-independent.
- **NEVER use multiply blend mode** for fog of war — produces black artifacts with transparency (documented in top-down-racer-04). Note: setTint() multiplies colors but is NOT the multiply blend mode — setTint() is safe.
- **Fixed timestep is manual** — Phaser has no built-in fixed timestep. Must implement accumulator pattern. CAP AT 5 TICKS to prevent spiral of death.
- **phaser-raycaster plugin is NOT recommended** — low adoption (96 stars, 0 npm dependents), geometric raycasting is slower than shadowcasting for grid-based FOV. Roll our own.
- **EasyStar.js is async** — cancel and re-request paths when door state changes. findPath() returns instanceId for cancelPath(). stopAvoidingAdditionalPoint(x,y) EXISTS (confirmed via Context7).
- **OscillatorNode.start() can only be called ONCE** — use gain node for heartbeat on/off (Phase 6).
- **Gamepad API requires user interaction first** — browser security policy, handle gracefully.
- **Context rot** — quality degrades at 50% context utilization. New terminal per phase. Phase 5 SPLIT into 5a/5b.
- **Tiled JSON export** — use CSV or Base64 uncompressed tile layer format. Phaser can't read compressed.
- **Camera zoom** — integer values only when using roundPixels (non-integer = jitter).
- **NO .gitignore yet** — MUST create in Phase 0 before any .env file. API key will leak without it. (NEW — CRITICAL)
- **Vite 7.0.0-7.0.6 have active CVEs** — CVE-2025-31125 (arbitrary file read, exploited in the wild), CVE-2025-58751, CVE-2025-58752 (server.fs bypass). Minimum safe version is ^7.0.7. (NEW — CRITICAL)
- **esModuleInterop: true required for Phaser** — Phaser's type defs use `export = Phaser`. Without esModuleInterop, `import Phaser from 'phaser'` fails under verbatimModuleSyntax. Conway didn't need it. (NEW)
- **vitest.config.ts must use mergeConfig** — without it, vitest.config OVERRIDES vite.config entirely. Import mergeConfig from 'vitest/config', not 'vite'. (NEW)
- **Defer CSP to hardening pass** — Phaser internally uses dynamic code evaluation (try/catch). strict CSP produces console warning but game still works. Defer rather than add unsafe-eval. (NEW)
- **fps.limit not fps.target** — fps.target is a hint, fps.limit is the hard cap. Without limit, 120Hz monitors waste GPU doubling render frames. (NEW)
- **Tab backgrounding** — requestAnimationFrame stops when tab hidden. Delta spikes on return. Must auto-pause via visibilitychange + cap accumulator. (NEW)
- **Camera flash seizure risk** — camera.flash() with white is photosensitivity hazard. Need reduced-motion toggle. (NEW)
- **FOV must use Uint8Array, NOT Set<string>** — 60 Set allocations/sec causes GC micro-stutters. Pre-allocate and reuse. (NEW)
- **Shallow Readonly<T> is insufficient** — renderer can still mutate nested arrays. Must use ReadonlyDeep<T>. (NEW)
- **Phaser EventEmitter is untyped** — string names + any payloads. Use custom TypedEmitter<GameEventMap>. (NEW)
- **FogRenderer must NOT call computeFOV()** — FOV computation belongs in game layer fixedUpdate(). Renderer only reads results from GameState. (NEW)
- **API key variable naming** — MUST be GEMINI_API_KEY, NOT VITE_GEMINI_API_KEY. Vite auto-exposes VITE_ prefix to client bundle. (NEW)
- **DynamicTilemapLayer is legacy terminology** — Phaser 3.50+ merged Dynamic/Static. createLayer() always returns dynamic. (NEW)
- **Phaser 3.90 breaking change** — ImageCollections tileset defaults changed from null to undefined. (NEW)
- **strictPropertyInitialization** — keep strict:true in tsconfig, use definite assignment (!) for Phaser-lifecycle renderer properties only. (NEW)
- **Audio in spectator mode** — no heartbeat (no player perspective). Both agents' footsteps audible. (NEW)
- **Render interpolation is dead code with roundPixels** — `pixelArt: true` snaps to integers. InterpolatedSprite deferred to Phase 7 (if roundPixels ever disabled). (NEW)
- **Camera must snap before startFollow** — without `centerOn()` before `startFollow()`, camera slides 400ms from (0,0) to spawn. (NEW)
- **Gamepad `once('connected')` misses reconnection** — use `on()` not `once()`. Also check `total > 0` on scene create for already-connected pads. (NEW)
- **Tiled tileset name is case-sensitive** — `addTilesetImage()` first arg must exactly match JSON `"name"` field. Mismatch returns null silently. (NEW)
- **Tiled external tilesets (.tsj) not resolved** — Phaser loader ignores `"source"` references. Always embed tilesets. (NEW)
- **Tiled object properties are arrays, not flat maps** — `obj.properties` is `[{name, type, value}]`. Need helper function for access. (NEW)
- **NaN delta poisons accumulator permanently** — `NaN >= FIXED_STEP` is always false; loop never runs again. Guard with `Number.isFinite()`. (NEW)
- **Keyboard state stale after tab return** — `keyup` may never fire when tabbing away. Call `resetKeys()` on resume. (NEW)
- **Document visibilitychange listener leaks on scene restart** — must use named function + removeEventListener in shutdown. Never anonymous lambda. (NEW)
- **EasyStar callbacks fire via setTimeout** — NOT during calculate(). Path results arrive next event loop tick. Never wrap in Promise without cancel mechanism. (NEW)
- **EasyStar type definitions lie** — callback type omits `null`. findPath() returns `undefined` when start===end. Grid is `[y][x]` but API is `(x,y)`. (NEW)
- **EasyStar default iterationsPerCalculation is MAX_VALUE** — MUST set to 200 for real-time. Without it, calculate() blocks until all paths complete. (NEW)
- **checkDetection must return 3-way result** — 'none'/'spotted'/'found'. Boolean conflates "LOS without proximity" (should trigger CHASE) with "no LOS" (should do nothing). (NEW)
- **Terminal states (FOUND/SURVIVED) must halt fixedUpdate** — without guard, player keeps moving, AI keeps patrolling, detection re-fires after game over. (NEW)
- **TypedEmitter needs copy-on-iterate** — if handler calls off() during emit(), array mutates during iteration. Snapshot with [...handlers] before iterating. (NEW)
- **TypedEmitter handlers must NOT call back into engine** — handlers are notifications. Modifying game state inside emit() bypasses dispatch order. (NEW)
- **FOV dirty flag** — only recompute when entity changes tile. Seeker at 120px/s changes tile ~2 times/sec. Saves ~58 redundant computations/sec. (NEW)
- **FSM transition delays prevent flickering** — without reactionDelay (PATROL→CHASE) and chaseTimeout (CHASE→PATROL), seeker rapidly oscillates when hider is at LOS boundary. (NEW)
- **Seeker must halt on FSM transition** — clear path, zero velocity, cancel pending pathfinding. Otherwise 1-tick wrong-direction movement. (NEW)
- **FOUND takes priority over SURVIVED** — if both trigger same tick, detection is checked before timers in dispatch order. (NEW)
- **camera.stopFollow() MUST precede camera.pan()** — follow logic overrides pan scroll every frame. Without stopFollow, pan visually does nothing. (NEW)
- **setScrollFactor(0) does NOT prevent zoom scaling** — objects fixed to viewport still render at camera's zoom level. Use dual-camera (UI camera at zoom=1) for splash text. (NEW)
- **Camera effects require force:true in sequences** — without it, calling same effect type while previous is running is silently ignored. (NEW)
- **scene.wake() does NOT call init()/create()** — data only arrives via 'wake' event listener. Biggest Phaser scene landmine. (NEW)
- **Use stop() for PauseMenu, not sleep()** — no state worth preserving. stop() triggers clean shutdown, next launch() runs fresh create(). (NEW)
- **setTint() is WebGL-only** — Canvas renderer ignores it silently. Verify renderer type at boot. (NEW)
- **scene.sleep() is deferred 1 frame** — GameEngine pause flag is true freeze mechanism (checked in fixedUpdate before accumulator). (NEW)
- **scene.launch() is deferred** — HUD must PULL initial state on create, not rely on catching first PHASE_CHANGED event (already emitted). (NEW)
- **scene.bringToTop() after launch** — guarantee PauseMenu z-ordering above HUD and Game. (NEW)
- **Math.ceil for timer display** — Math.floor shows "00:00" with 0.98s remaining. ceil shows "00:00" only at actual expiry. (NEW)
- **External emitter listeners survive scene shutdown** — Phaser auto-cleans this.events listeners but NOT listeners on custom TypedEmitter or game.events. Must manually .off() in shutdown handler. (NEW)
- **camera.resetFX() before cinematic sequences** — clears any in-flight effects that would cause silently-ignored new effects. (NEW)
- **EndOfRoundSequence needs timeout safety** — if any camera callback fails to fire (WebGL context loss), polling state machine force-advances after duration+500ms. Prevents softlock. (NEW)
- **PauseAuthority needed for 3-way pause** — tab visibility, PauseMenu, and cinematic all fight each other. Reason-tracked system prevents resume-during-pause bugs. (NEW)
- **Double-tap Escape spawns multiple PauseMenus** — guard with isActive() check + JustDown() edge detection. (NEW)
- **COUNTDOWN→HUNT transition needs camera fade** — without 200ms fadeOut, full-map snaps to black for 1 frame before FOV renders. Jarring. (NEW)
- **EasyStar setTimeout callbacks survive scene destruction** — GameEngine.dispose() must cancel all pending paths AND set disposed flag checked by every callback. (NEW)
- **Fog overlay = dedicated black-tile TilemapLayer** — NOT terrain tinting. Separate layer at depth 100, per-tile alpha controls visibility. Cleaner, no terrain modification. (NEW)
- **Manual lerp for fog transitions, NOT Phaser Tweens** — Tweens create ~60 garbage objects/sec. Manual lerp (lerpFactor=0.12) is zero-GC. (NEW)
