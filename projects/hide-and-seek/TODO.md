# Hide and Seek — TODO

## Current State
- Brainstorm complete (2026-03-29)
- Master plan complete (2026-03-29) — 8 phases (now 9 with Phase 5 split), all research done
- **Master plan DEEPENED (2026-03-29)** — 16 research/review agents, 3 Context7 queries, 6 contradictions resolved
- Phase plans broken out into individual documents — ready for deepening
- No code yet — project is in design phase

### Documents
- Brainstorm: `docs/ideation/2026-03-29-hide-and-seek-brainstorm.md`
- Master plan: `docs/plans/2026-03-29-001-feat-hide-and-seek-game-plan.md`
- Phase plans: `docs/plans/2026-03-29-002` through `009`

## What We Did (2026-03-29)
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

## Next Steps (Priority Order)

**DEEPEN ALL PHASE PLANS (serial, one at a time):**
- [x] `/deepen-plan docs/plans/2026-03-29-001-feat-hide-and-seek-game-plan.md` ← MASTER PLAN DONE
- [ ] `/deepen-plan docs/plans/2026-03-29-002-phase-0-project-scaffolding-plan.md`
- [ ] `/deepen-plan docs/plans/2026-03-29-003-phase-1-map-movement-plan.md`
- [ ] `/deepen-plan docs/plans/2026-03-29-004-phase-2-seeker-detection-plan.md`
- [ ] `/deepen-plan docs/plans/2026-03-29-005-phase-3-fog-game-flow-plan.md`
- [ ] `/deepen-plan docs/plans/2026-03-29-006-phase-4-doors-minimap-plan.md`
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
