# Hide and Seek — TODO

## Current State
- Brainstorm complete (2026-03-29)
- Master plan complete (2026-03-29) — 8 phases (now 10 with Phase 5 + 6 splits), all research done
- **Master plan DEEPENED (2026-03-29)** — 16 research/review agents, 3 Context7 queries, 6 contradictions resolved
- **Phase 0 plan DEEPENED (2026-03-29)** — 12 agents (4 research + 7 review + 1 repo analyst), 3 Context7 queries, 3 web searches, 5 contradictions resolved
- **Phase 1 plan DEEPENED (2026-03-29)** — 14 agents (5 research + 7 review + 1 spec flow + 1 repo analyst), 3 Context7 queries, 3 web searches, 11 contradictions resolved
- **Phase 2 plan DEEPENED (2026-03-30)** — 14 agents (4 research + 6 review + 1 spec flow + 1 repo analyst), 1 Context7 query, 2 web searches, 12 contradictions resolved
- **Phase 3 plan DEEPENED (2026-03-30)** — 13 agents (4 research + 6 review + 1 spec flow + 1 codebase explorer + 1 general-purpose), 3 Context7 queries, 13 contradictions resolved
- **Phase 4 plan DEEPENED (2026-03-30)** — 14 agents (9 review + 4 research + 1 web research), 4 Context7 queries, 13 contradictions resolved
- **Phase 5 plan SPLIT + DEEPENED (2026-03-30)** — 14 agents (5 research + 7 review + 1 spec flow + 1 architecture verification), 3 Context7 queries, 12 Gemini Grounding queries, 14 contradictions resolved, 25 race conditions identified, 33 silent failures caught
- **Phase 6 plan SPLIT + DEEPENED (2026-03-30)** — 15 agents (3 research + 10 review + 1 GSD plan checker + 1 spec flow), 2 Context7 queries, 8 contradictions resolved, 26 silent failures caught
- Phase plans broken out into individual documents — all 10 deepened
- **Phase 0 EXECUTED (2026-03-30)** — scaffolding complete, 3 tests
- **Phase 1 EXECUTED (2026-03-30)** — map + movement, 43 tests, arrow keys added
- **Phase 0+1 code review PASSED (2026-03-30)** — 5 agents, zero blockers
- **Phase 2 EXECUTED (2026-03-30)** — seeker AI + detection, 119 tests
- **Phase 2 code review PASSED (2026-03-30)** — 5 agents (TS, arch, perf, security, simplicity), zero blockers, all P1+P2 fixed
- **Phase 3 EXECUTED (2026-03-30)** — fog of war + game flow, 125 tests, visually verified
- **Phase 4 EXECUTED (2026-03-30)** — doors + minimap + sonar, 163 tests, visually verified
- **Phase 5a EXECUTED (2026-03-30)** — seeker difficulty tiers + 4-state FSM, 211 tests (dead module removed Session 12)
- **Phase 5a BLOCKER FIXED (2026-03-31)** — pendingPath guard, seeker moves, code reviewed (4 agents), dead code removed
- **Phase 4 REVIEWED (2026-03-31)** — dead action handlers purged, SonarPing cleanup, depth collision fix, 8 todos + 5 solutions documented, 210 tests
- **Vision model LOCKED (2026-03-30)** — 4-tier flashlight tag, spec at `docs/design/vision-model-spec.md`
- **Branch:** `feat/phase-0-scaffolding` pushed to origin

### Documents
- Brainstorm: `docs/ideation/2026-03-29-hide-and-seek-brainstorm.md`
- Master plan: `docs/plans/2026-03-29-001-feat-hide-and-seek-game-plan.md`
- Phase plans: `docs/plans/2026-03-29-002` through `009`
- Phase 5a: `docs/plans/2026-03-29-007a-phase-5a-seeker-tiers-plan.md`
- Phase 5b: `docs/plans/2026-03-29-007b-phase-5b-hider-spectator-plan.md`
- Phase 6a: `docs/plans/2026-03-29-008a-phase-6a-audio-atmosphere-plan.md`
- Phase 6b: `docs/plans/2026-03-29-008b-phase-6b-scoring-stats-plan.md`
- Original Phase 5 (superseded): `docs/plans/2026-03-29-007-phase-5-ai-depth-spectator-plan.md`
- Original Phase 6 (superseded): `docs/plans/2026-03-29-008-phase-6-sound-scoring-plan.md`

## What We Did (2026-03-31, Session 15)
- **Skill Creator optimizer — FULLY OPERATIONAL on Windows**
- Fixed 4 bugs in Skill Creator scripts (marketplace plugin files):
  1. `select.select` on Windows — replaced with threading+queue reader (both marketplace copies)
  2. YAML multi-line quoted string parsing in `parse_skill_md` — now reads continuation lines
  3. `import anthropic` SDK dependency — switched to `anthropic-agent-skills` version using `claude -p`
  4. **Eval detection only matched test command name** — smoking gun for ALL previous 0% recall. Claude triggers real skill, not test duplicate. Fixed to match both.
- **Ran full optimizer on /distill** — 5 iterations, 20 queries, 3 runs each, 0.4 holdout. Best: iter 3 at 92% test (8/8). Applied.
- **Ran full optimizer on /brief** — 5 iterations, 20 queries, 3 runs each, 0.4 holdout. Best: iter 4 at 81% train. Applied.
- **Created `projects/skills/distill-and-brief/` project** — dedicated home for skills, eval sets, optimizer results, hooks
  - Windows directory junctions from `~/.claude/skills/` → project (single source of truth)
  - Per-skill READMEs with usage docs, hook descriptions, installation notes
  - Showcase doc moved from `research/distill-and-brief/` to project README
- **Renamed `docs/solutions/` → `docs/insights/`** — "solutions" implies finality, "insights" captures ongoing compounding knowledge
  - Updated: both SKILL.md files, both hooks, all READMEs, CLAUDE.md, eval sets, memory, settings.json
  - Hook renamed: `inject-solutions.sh` → `inject-insights.sh`
- ~~**Verify in fresh session:** `/brief` should read from `docs/insights/`~~ — **VERIFIED Session 16.** All 3 hooks tested: block-webfetch, inject-insights, remind-distill. All fire correctly, fast-exit on non-matching skills confirmed.
- Test baseline: **210 tests passing** (unchanged)
- **Branch:** `feat/phase-0-scaffolding`

## What We Did (2026-03-31, Session 14)
- **Distill & Brief knowledge system** — two custom Skills 2.0 skills + two hooks for automatic knowledge capture and injection
- `/distill` skill — writes insight docs with dynamic injection (shows existing, auto-numbers, provides template)
- `/brief` skill — reads insight context on demand with dynamic injection
- `inject-insights.sh` hook (PreToolUse) — auto-injects insight summaries before `/ce:work`
- `remind-distill.sh` hook (PostToolUse) — reminds to `/distill` after `/ce:work` and `/ce:review`
- **Skill Creator A/B eval** — 100% pass rate with-skill vs 33% without (18/18 vs 6/18 assertions), fewer tokens
- **Windows `select.select()` bug found + fixed** in skill-creator's `run_eval.py` — replaced with threading for pipe compatibility
- **Showcase doc** — now at `projects/skills/distill-and-brief/README.md`, Mermaid diagrams, appendix with eval data
- **Squeaky clean protocol updated** — completed todos deleted at session end, insights persist
- **CLAUDE.md + environment-setup.md** updated with hooks, skills, folder setup
- Completed todo docs (8) deleted per new protocol
- Test baseline: **210 tests passing** (unchanged)
- Build: typecheck clean
- **Branch:** `feat/phase-0-scaffolding`

## What We Did (2026-03-31, Session 13)
- **Phase 4 code review** — dead code purge + cleanup from review findings
- **Dead action types removed** — `MOVE_TO`, `REQUEST_PATH`, `LOOK_AROUND` from `actions.ts` + engine handler cases + tests
- **Duplicate `recordSelfOpen` removed** from `seeker-fsm.ts` (already fires at execution in `processActionQueue`)
- **Dead minimap methods removed** — `setSeekerBlipAlpha()`, `getCamera()` from `MinimapManager.ts`
- **SonarPing cleanup** — proper typed `counterTween` property (was cast hack), dead `isAnimating` removed, `onPhaseChanged` typed as `GameFlowKind`
- **Depth collision fix** — `MINIMAP_PLAYER` 200→195 (was colliding with `UI: 200`)
- **Broken evidence stub removed** — empty `hasEvidence` check in engine.ts that did nothing
- **8 todo docs** in `docs/todos/` + **5 insight docs** in `docs/insights/` — institutional knowledge from review
- Test baseline: **210 tests passing** (24 files) — 1 dropped (dead MOVE_TO test)
- Build: typecheck clean
- **Branch:** `feat/phase-0-scaffolding`

## What We Did (2026-03-31, Session 12)
- **FIXED Phase 5a blocker: seeker movement** — `pendingPath: boolean` added to `SeekerAIInternalState`, set/cleared in `requestPathTo()`/callback/`clearPath()`, guards in all 4 FSM states
- **Seeker state colors** — 4 distinct colors per FSM state (red=patrol, orange=suspicious, yellow=search, bright red=chase) replacing indistinguishable 2-shade ternary
- **Serena purged from environment-setup.md** — removed from prerequisites, MCP section (replaced with REMOVED tombstone), setup-from-scratch steps, permissions, gotchas, file locations
- **Code review (4 agents)** — TS reviewer, architecture strategist, performance oracle, simplicity reviewer. Zero blockers, 1 P2 fixed (search-state nesting flattened to early return)
- **Dead code removed** — `src/game/ai/seeker.ts` + `tests/game/ai/seeker.test.ts` (zero importers, orphaned predecessor to FSM system)
- **compound-engineering.local.md created** — review agent config for TS game project
- Test baseline: **211 tests passing** (24 files) — 12 dropped from dead module removal
- Build: typecheck clean
- **Branch:** `feat/phase-0-scaffolding`

## What We Did (2026-03-30, Session 11)
- **EXECUTED Phase 5a: Seeker Difficulty Tiers** — 4-state FSM + 3 difficulty tiers
- FSM refactor: SeekerFSM class with PatrolState, SuspiciousState, SearchState, ChaseState
- Priority ordering: CHASE(3) > SEARCH(2) > SUSPICIOUS(1) > PATROL(0), pending transitions, error boundary
- 3 tier configs: Easy (60° cone, random patrol, 1.5s reaction), Medium (90° cone, systematic patrol, 0.75s), Hard (120° cone, strategic patrol, 0.25s)
- Vision cone detection: checkDetection() filters by facing angle + cone width (backwards compatible)
- Path smoothing: Bresenham LOS + greedy string-pulling, per-tick validation against door changes
- Room system: Tiled object layer parsing, BFS center-finding, adjacency detection, overlap warning
- Room tracking: utility scoring (time 50% + distance 30% + adjacency 15% - recent 5%), completion lock
- Evidence tracking (Hard AI): door snapshot at hunt start, doorsIOpened self-exclusion, lastToggleTick double-toggle catch
- Hiding spots: pre-computed corners (L-shape walls), dead ends (1 neighbor), cover tiles (3+ walls)
- Engine integration: canonical 9-step fixedUpdate, door evidence pipeline, Difficulty parameter, menace gauge
- GameSettings: `seekerDifficulty: Difficulty` replaces old `difficulty: 'easy'`
- LOOK_AROUND action: 4-direction rotation over configurable ticks
- SEEKER_STATE_CHANGED event for renderer/UI hooks
- facingAngle (continuous radians) on SeekerRenderState for smooth vision cone
- **Serena MCP server REMOVED** — tested in shootout, find_referencing_symbols broken for TS. Grep/Read/Glob win.
- Test baseline: **223 tests passing** (163 → 223, +60 new)
- Build: typecheck clean, zero console spam
- **Branch:** `feat/phase-0-scaffolding` pushed to origin (30 commits)

## Next Steps
1. **Skill Creator: description optimizer** — run full `run_loop.py` with threading fix applied. Improve `/distill` trigger accuracy (currently 0% auto-trigger). Consider creating a dedicated skills project.
2. **Visual testing** — play on Easy/Medium/Hard, verify seeker behavior differences (needs difficulty selector — URL param or menu)
3. **Tiled map: add Rooms object layer** — rectangle objects with roomId properties for Medium/Hard patrol
4. **Phase 5b** — AI hider, spectator mode, vision cones rendered
5. **Phase 6a** — audio + atmosphere

## Landmines
- **Module-level `let` in SearchState/SuspiciousState** — singleton state means multi-seeker will stomp. Must move to `SeekerAIInternalState` before adding second seeker.

## What We Did (2026-03-30, Session 10)
- **EXECUTED Phase 4: Doors + Minimap + Sonar** — full tactical layer
- DoorSystem: toggle, cooldown (500ms/30 ticks), occupancy check (AABB hitbox), LOS/collision/pathfinding grid integration, doorGeneration counter for FOV dirty flag
- ActionQueue: MOVE_TO, OPEN_DOOR, WAIT, REQUEST_PATH — seeker door-opening behavior
- 6 doors placed at corridor chokepoints, corridors narrowed to 1-tile doorways
- DoorSprite: factory + event-driven frame swap (tileset frames 3/4)
- MinimapManager: second camera bottom-right 160x160, dynamic zoom, player dot (blue), door indicators (red/green), seeker blip (orange)
- SonarPing: game-layer tick counter → SONAR_PING_DUE event, renderer expanding ring + distance-based blip reveal
- Types: DoorId branded, DoorState, DOOR_TOGGLED, SONAR_PING_DUE, sonarTicksUntilPing on HuntPhase, doors+doorGeneration on PlayingState
- Constants: DOOR, SONAR, MINIMAP, INTERACTION groups + minimap depth values
- Engine: door interaction in fixedUpdate, FOV doorGeneration dirty flag, sonar timer
- **Bugfixes during visual testing:**
  - Phaser flattens Tiled object properties to Record<string, unknown> (not arrays) — fixed property access
  - Tileset loaded as image (no frames) → spritesheet with 32x32 frames
  - Tileset metadata stale (columns=3, imagewidth=96 → 5, 160)
  - canToggleDoor center-point check → AABB hitbox overlap (fixed wall teleport on close)
  - Corridors 3 tiles wide → narrowed with flanking walls to 1-tile doorways
- **Vision model design debate → LOCKED:** 4-tier flashlight tag replacing fog-of-war
  - Easy: omniscient (full map), Medium: lantern (radius), Medium-Hard: flashlight (cone), Hard: darkness (memory only)
  - Seeker always has visible flashlight cone, unchanged across tiers
  - Spec: `docs/design/vision-model-spec.md`, implementation target: Phase 5a
  - Easy mode is default until Phase 5a adds difficulty selector
- Cross-phase fixes applied: minimap bottom-right 160x160, tile indices documented
- Debug cleanup: hacks replaced with clean Easy mode code, no commented-out blocks
- Test baseline: **163 tests passing** (125 → 163, +38 new)
- Build: typecheck clean, zero console spam
- **Branch:** `feat/phase-0-scaffolding` pushed to origin (25 commits)

## What We Did (2026-03-30, Session 9)
- **EXECUTED Phase 3: Fog of War + Game Flow** — Tier 1 complete, fully playable with polish
- 6 scenes: Boot (Click to Start + loading), MainMenu, Game (refactored composition root), HUD (parallel), PauseMenu (overlay), Results
- FogRenderer: dedicated black-tile overlay layer, 3 states (UNEXPLORED/EXPLORED/VISIBLE), manual lerp transitions, distance-based vignette, camera-culled
- CinematicManager: dual-camera (UI at zoom=1 for splash text), Promise-wrapped camera effects (zoomTo, panTo, flash, fadeOut, shake, wait)
- EndOfRoundSequence: polling state machine with SequenceStep discriminated union, timeout safety per step, reduced-motion (filter flash), FOUND/SURVIVED sequences
- PauseAuthority: reason-tracked (MENU/TAB_HIDDEN/CINEMATIC), request/release, game only resumes when all reasons cleared
- SceneTransition: type-safe via SceneDataMap, camera fade, static isTransitioning guard
- Game state additions: playerFov Uint8Array (fill(1) during countdown, computed in hunt), GameStats (distanceTraveled), GameEngine.dispose()
- Player FOV computation with dirty-flag optimization in fixedUpdate
- TestBridge: dev-only window.__GAME_TEST__ with typed interface for Playwright
- 6 Playwright e2e specs + playwright.config.ts
- Types: GameSettings, SceneDataMap, HUDSceneData, ResultsSceneData, GameSceneData
- Constants: FOG, CINEMATIC, HUD groups + DEPTH.FOG (100) below DEPTH.UI (200)
- **Bug fixes found during visual verification:**
  - JustDown doesn't work with Playwright keyboard events — switched to key.on('down') event listener
  - UI camera rendered sprite facing indicators as stray dots (looked like broken minimap) — fixed by ignoring all sprite game objects on UI camera
  - Seeker facing indicator leaked through fog — fixed with SeekerSprite.setVisible() controlling both body + indicator
- 3 new landmines documented in CLAUDE.md
- Test baseline: **125 tests passing** (6 new)
- Build: app chunk 40.8KB, Phaser 1.2MB, zero vulnerabilities
- **Branch:** `feat/phase-0-scaffolding` pushed to origin (19 commits)

## What We Did (2026-03-30, Session 8)
- **EXECUTED Phase 2: Seeker + Detection** — first playable hide-and-seek
- Symmetric shadowcasting FOV (Albert Ford, rational arithmetic, Uint8Array, zero-alloc after review)
- EasyStar.js pathfinding (callback-based, grid [y][x] conversion, 200 iter/frame)
- Seeker AI FSM: PATROL (random wander + pause) / CHASE (last-known-position, re-path every 30 ticks)
- Transition delays: 1.5s reaction (PATROL→CHASE), 3s timeout (CHASE→PATROL)
- 3-way detection: none/spotted/found (360° for Phase 2, cone deferred to Phase 5)
- Game flow: countdown → hunt → found|survived (two-level discriminated union)
- TypedEmitter with copy-on-iterate + offAll()
- Terminal state guards halt all logic after game over
- Renderer: SeekerSprite with facing indicator, countdown/hunt timer HUD, "HUNT!" flash, minimal pause (ESC), FOUND!/SURVIVED! end screen with restart
- Applied ALL cross-phase fixes from Session 7 code review (tileCoord allocs, mutate-in-place, ReadonlyDeep, MutablePlayingState, etc.)
- **Code review with 5 agents** (TS reviewer, architecture strategist, performance oracle, security sentinel, simplicity reviewer):
  - Architecture: "PASS — zero blockers, zero boundary violations, pristine"
  - Security: risk level LOW, zero critical/high issues
  - Simplicity: "complexity score LOW, minor tweaks only"
  - Performance: 5 allocation hot spots found and fixed (FOV Slope objects, pixelToTile, tileToPixelCenter, hiderPos literal, lastKnownHiderPos)
  - TS reviewer: P1 — 4 `!` assertions in src/game/ removed; dead types/constants/events cleaned
  - Killed ~35 LOC dead code, eliminated ~1500+ allocs/sec across hot paths
- Fixed seeker eyes (added facing indicator) and HUD positioning (camera worldView instead of setScrollFactor(0))
- Added `executed:` and `reviewed:` fields to all phase plan frontmatter
- Test baseline: **119 tests passing** (72 new)
- Build: app chunk 20.9KB, zero vulnerabilities
- **Branch:** `feat/phase-0-scaffolding` pushed to origin (10 commits)

## What We Did (2026-03-30, Session 7)
- **EXECUTED Phase 0 + Phase 1** — first code in the project
- Phase 0: .gitignore, package.json (pnpm, ESM), tsconfig (strict + 4 flags), Vite (3-way chunk split), Vitest (3 projects), index.html, constants (15 grouped), type system (ReadonlyDeep, TileCoord branded, GameState union, TypedEmitter), BootScene proof of life, architecture boundary test, CLAUDE.md
- Phase 1: GameEngine (60Hz fixed timestep, delta guards, pause/resume), map.ts (Tiled JSON → Uint8Array collision/LOS grids), movement.ts (separate-axis collision, corner sliding, normalized diagonals), InputManager (WASD + arrows + Xbox gamepad, scaled radial deadzone, edge-triggered buttons), PlayerSprite, Game scene (camera zoom 2 snap-then-follow, tab visibility), 40x30 tile map (8 rooms)
- Added arrow key support (Briggsy request)
- **Code review with 5 agents** (TS reviewer, architecture strategist, performance oracle, security sentinel, simplicity reviewer):
  - Zero critical issues in application code
  - Architecture: "textbook clean" — boundary pristine, scales to all 10 phases
  - Performance: 3 allocation hot spots to fix before Phase 2 (tileCoord per call, PlayerState per tick, deadzone object per frame) — fine at 1 entity
  - Security: GitHub PAT in git remote URL — FIXED (URL stripped, token needs rotation on github.com)
  - Security: .env with Gemini key properly gitignored, not VITE_ prefixed — safe
  - Simplicity: one dead function removed (getObjectProp), rest is earned complexity
  - TypeScript: getState() returns shallow Readonly (upgrade to ReadonlyDeep in Phase 2)
- Discovered: `override` works on Phaser Scene `update()` but NOT `create()`/`preload()`/`init()` — documented in CLAUDE.md
- Test baseline: **43 tests passing** (map, movement, engine, state, architecture boundary)
- Build: Phaser chunk 1.2MB + app chunk 9.2KB, zero vulnerabilities

## What We Did (2026-03-30, Session 6)
- **DEEPENED Phase 6 plan with 15 agents, SPLIT into 6a + 6b:**
  - 3 research agents: Web Audio API game patterns, Phaser 3.90 Sound Manager (Context7), game scoring systems + stats persistence
  - 10 review agents: architecture strategist, TypeScript reviewer, performance oracle, security sentinel, pattern recognition, frontend races, type design analyzer, silent failure hunter, code simplicity, data integrity guardian
  - 1 GSD plan checker: goal-backward verification, 5 blockers found
  - 1 spec flow analyzer: 23 user flows traced, 12 gaps identified
  - 2 Context7 doc queries: Phaser Sound Manager API, WebAudioSound API
  - **Resolved 8 contradictions:**
    1. Heartbeat: pre-recorded sample wins over OscillatorNode (single-start, synthetic sound)
    2. Close calls: debounced enter/exit zone wins (per-tick inflates 60x)
    3. Audio channels: 3 (master + SFX + ambient), not 2
    4. Creak interval: 8-20s compromise (3-8s too frequent, 10-30s too sparse)
    5. localStorage key: camelCase (hideAndSeekStats, hideAndSeekSettings)
    6. CSP: deferred per Phase 0 decision, no Phase 6 changes
    7. bestTime: renamed bestSurvivalTimeS, -1 sentinel (Infinity breaks JSON)
    8. Phaser pauseOnBlur: disabled, PauseAuthority + AudioGate own lifecycle
  - 26 silent failures caught (6 CRITICAL: HTML5 fallback crash, raw Web Audio bypasses mute, NaN in spectator, resume() rejection, schema version missing, OscillatorNode contradiction; 12 HIGH; 8 MEDIUM)
  - Key new designs: AudioManager coordinator with 3 subsystems (HeartbeatSystem, SoundEffects, AmbientSound), AudioGate class for suspend/resume Promise sequencing, SoundPool with round-robin + oldest-steal, footstep distance accumulator, close call state machine, PersistencePort interface + dependency injection, RoundResult type (replaces ScoreState), score fields on HuntPhase (not separate type), additive-then-multiplicative score formula with difficulty multiplier
  - Phase 6a: AudioManager, SFX sourcing, sound effects + pools, heartbeat (playbackRate + lerp + hysteresis), ambient (drone + creaks + duck/unduck), spectator audio, tab visibility (AudioGate), settings (3 sliders + mute)
  - Phase 6b: Score accumulation on HuntPhase (fixedUpdate step 10), scoring.ts pure functions, score formula (base + close calls + proximity + efficiency + doors × difficulty multiplier), GameEventMap additions (CLOSE_CALL, FOOTSTEP), RoundResult + ResultsSceneData extension, stats persistence (PersistencePort, schema v1, migration chain, hand-rolled type guard), StatsSchema (Record<Difficulty>, -1 sentinels, win streak), results screen (count-up animation, PB flash, itemized breakdown)

## What We Did (2026-03-30, Session 5)
- **Tested Gemini Grounding MCP** — confirmed working with Phaser 3.90 + fog of war blog queries. Full Cloudflare bypass.
- **Updated WebFetch guidance** — removed Playwright-for-blogs workaround from TODO and memory. Gemini Grounding handles all web research now.
- **DEEPENED Phase 5 plan with 14 agents, SPLIT into 5a + 5b:**
  - 5 research agents: FSM class patterns + utility scoring (Gemini Grounding), Director system / rubber-banding (Gemini Grounding), path smoothing / string-pulling (Gemini Grounding + Context7 EasyStar), room detection + clearing AI (Gemini Grounding + Context7 Phaser), AI hider + spectator camera (Gemini Grounding + Context7 Phaser)
  - 7 review agents: architecture strategist, TypeScript reviewer, performance oracle, code simplicity, pattern recognition, frontend races, silent failure hunter
  - 1 spec flow analyzer: found 23 user flows (plan covered 14), 9 contradictions, 20 critical questions
  - 1 architecture verification: confirmed FSM class refactor, 2 EasyStar instances, INVESTIGATE_STIMULUS is NOT an action
  - 3 Context7 doc queries: EasyStar.js full API, Phaser 3 camera/graphics, Vitest state machine testing
  - 12 Gemini Grounding queries: FSM patterns, stealth AI, director systems, path smoothing, room clearing, hiding spots
  - **Resolved 14 contradictions:**
    1. SUSPICIOUS state: KEEP (distinct from SEARCH — environmental stimulus vs lost-LOS)
    2. Director system: REMOVE (violates perception principle, Hard AI strong enough without it)
    3. Detection miss rate: REMOVE (feels like bug, reaction delays are the difficulty knob)
    4. Menace gauge: ADD (prevents relentless Hard chase, Easy: none, Medium: 25s, Hard: 20s)
    5. Vision cone: RESTRICTS DETECTION (core stealth mechanic, not rendering-only)
    6. INVESTIGATE_STIMULUS: NOT an action (SUSPICIOUS state sequences primitives)
    7. Strategy pattern files: REMOVE (data-driven SeekerConfig is sufficient)
    8. SeekerConfig: FLAT (grouped with comments, no nesting)
    9. CHASE → SEARCH: after chaseTimeout (preserves Phase 2 anti-flicker)
    10. Easy vision range: 4 tiles (Phase 5 table authoritative, Phase 2's 6 → Medium)
    11. DOOR_TOGGLED toggledBy: NOT needed (Hard AI tracks doorsIOpened internally)
    12. Phase 5a/5b split: RETAIN (context window management)
    13. Path smoothing: INCLUDE in 5a (~80 LOC, deferred from Phase 2)
    14. Door snapshot: new Map(doors) not structuredClone (shallow clone safe)
  - 13 simplification proposals evaluated: 4 ACCEPT, 5 REJECT, 2 PARTIALLY ACCEPT, 2 SIMPLIFY
  - 25 race conditions identified with concrete mitigations (~150 LOC total)
  - 33 silent failures caught (6 CRITICAL, 13 HIGH)
  - Key new designs: FSM priority ordering, canonical 9-step fixedUpdate order, separate EasyStar instances per agent, event handlers record-don't-act pattern, compound flee trigger for Hard hider
  - Phase 5a: seeker FSM refactor (4 states), 3 difficulty tiers, path smoothing, near-miss tuning
  - Phase 5b: AI hider (Easy+Medium mandatory, Hard optional), SpectatorGame standalone scene, vision cones, MainMenu updates

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
  - WebFetch stuck-agent lesson learned: best-practices-researcher agents hang on Cloudflare-protected blog URLs. Killed and relaunched 3 times before switching to general-purpose agent with Context7-only instructions. Fixed: Gemini Grounding MCP handles all web research (searches + summarizes + cites, no Cloudflare issues).

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
- [x] `/deepen-plan docs/plans/2026-03-29-007-phase-5-ai-depth-spectator-plan.md` ← DONE — SPLIT into 5a + 5b (14 agents, 14 contradictions resolved, 25 race conditions, 33 silent failures)
- [x] `/deepen-plan docs/plans/2026-03-29-008-phase-6-sound-scoring-plan.md` ← DONE — SPLIT into 6a + 6b (15 agents, 8 contradictions resolved, 26 silent failures)
- [x] `/deepen-plan docs/plans/2026-03-29-009-phase-7-art-pipeline-plan.md` ← DONE (15 agents, 7 contradictions resolved)

**ALL PLANS DEEPENED. Cross-phase review COMPLETE (2026-03-30).**

**EXECUTION (serial, one phase at a time — code review after each):**
- [x] Phase 0: Scaffolding — EXECUTED + REVIEWED
- [x] Phase 1: Map + Movement — EXECUTED + REVIEWED
- [x] Phase 2: Seeker + Detection — EXECUTED + REVIEWED
- [x] Phase 3: Fog of War + Game Flow — EXECUTED + REVIEWED (5 agents, P1 quit flow fixed, ~42 LOC dead code removed)
- [x] Phase 4: Doors + Minimap — EXECUTED + REVIEWED (4 agents, 5 P2 + 3 P3 findings, 8 todos created)
- [x] Phase 5a: Seeker Tiers — EXECUTED + REVIEWED (4 agents, zero blockers, blocker fixed Session 12)
- [ ] Phase 5b: Hider + Spectator
- [ ] Phase 6a: Audio + Atmosphere
- [ ] Phase 6b: Scoring + Stats
- [ ] Phase 7: Art Pipeline

**Cross-phase reconciliation (apply during execution of each phase):**

Master plan Phase 7 section (21 fixes needed — apply when updating master plan):
- [ ] Line 690: "256x256" → "1024x1024, two-stage downscale (LANCZOS 1024→128, NEAREST 128→32)"
- [ ] Line 693: Model ID wrong (`gemini-3.1-flash-image-preview` → `gemini-3-pro-image-preview`). Change "Consider" to definitive selection.
- [ ] Line 704: Post-processing spec outdated. Update to: two-stage downscale, magenta chroma-key, palette enforcement, PNG re-encode.
- [ ] Line 716: "Generate full sprite sheet, then slice" → "Generate individual frames with reference image (AI sheets have alignment issues)"
- [ ] Lines 713-715: Update frame counts (4-frame walk, 3 dirs + mirror, 52 total frames, palette swap AI hider)
- [ ] Line 714: Flashlight is definitive separate overlay sprite, not "maybe"
- [ ] Line 728: Atlas tooling → "free-tex-packer-core (npm, scriptable)"
- [ ] Lines 697-704: Restructure to reference 5-file script decomposition
- [ ] Add: tile extrusion requirement (tile-extruder, margin=1, spacing=2)
- [ ] Add: typed TEXTURE_KEYS / asset manifest pattern
- [ ] Add: JPEG→PNG re-encode requirement
- [ ] Add: .gitignore prerequisite blocker
- [ ] Add: quality gates / validation script
- [ ] Line 687: Outline weight "2-3px at 256px" → "1px at 32x32, ~32px at 1024x1024"
- [ ] Line 169, 894, 905: Update model name and risk description
- [ ] Lines 1002-1003: Update references (drop "I Love Sprites", add sharp/tile-extruder/@google/genai)
- [ ] Add to Alternative Approaches: sprite sheet rejected, Python rejected, @google/generative-ai deprecated

Phase 0 fixes (apply during Phase 0 execution):
- [ ] Add `assets/raw/` and `assets/processed/` to .gitignore (AI-generated binaries, large)
- [ ] Add .env.example creation task with `GEMINI_API_KEY=your_key_here`
- [ ] Add `scripts/ + scripts/tsconfig.json` to deferred directories list
- [ ] Make `roundPixels: true` and `antialias: false` explicit in Phaser config (belt and suspenders)

Phase 1-2 fixes (apply during Phase 1/2 execution):
- [x] Type `getGameObject()` as `Phaser.GameObjects.GameObject` (not `Rectangle`) in PlayerSprite and SeekerSprite ✓

Phase 2 fixes (from Session 7 code review — ALL APPLIED in Session 8):
- [x] Fix tileCoord() allocation — isWalkable/isBlocking accept (x, y) number pairs ✓
- [x] Mutate PlayerState in place in updateMovement ✓
- [x] Pre-allocate deadzone result object in InputManager ✓
- [x] Upgrade getState() to ReadonlyDeep<GameState> ✓
- [x] Extract MutablePlayingState type alias ✓
- [x] Doc comment on InputManager.sample() reused singleton ✓

Phase 2 fixes (from Session 8 code review — ALL APPLIED):
- [x] Remove all `!` assertions from src/game/ (4 occurrences) ✓
- [x] Flatten Slope objects in FOV to raw (num, den) numbers — zero-alloc scanQuadrant ✓
- [x] Pre-allocate pixelToTile + tileToPixelCenter results ✓
- [x] Pass s.player directly to seeker AI (not object literal) ✓
- [x] Mutate lastKnownHiderPos in place during chase ✓
- [x] Add offAll() to shutdown handler (emitter cleanup) ✓
- [x] Remove dead types (FogState, TileFlag, TileType), constants (6), events (2), fields (1) ✓
- [x] Fix createCountdownTicks duplication (state.ts now calls the function) ✓
- [x] Document ReadonlyDeep<Uint8Array> gap + singleton patterns in CLAUDE.md ✓

Phase 3 fixes (apply during Phase 3 execution):
- [ ] TEXTURE_KEYS manifest must include fog overlay tile AND BitmapFont entries (not just game art)
- [ ] Clock API frame-freeze: either implement in TestBridge or defer to Phase 7
- [ ] Clarify that EndOfRoundSequence will be replaced by Phase 7 with richer animation code

Phase 4 fixes (apply during Phase 4 execution):
- [x] Minimap position: change from top-right to **bottom-right** ✓ (implemented bottom-right)
- [x] Minimap size: change from 200x150 to ~160x160 ✓ (MINIMAP.WIDTH=160, MINIMAP.HEIGHT=160)
- [x] Document stable tile indices for door_open/door_closed frames ✓ (FRAME_DOOR_CLOSED=3, FRAME_DOOR_OPEN=4 in DoorSprite.ts)

Phase 5a fixes (apply during Phase 5a execution):
- [ ] Document FSM state → animation mapping (PATROL=walk, SUSPICIOUS=walk/idle, SEARCH=walk, CHASE=chase)
- [ ] Apply vision model spec (`docs/design/vision-model-spec.md`) — 4-tier flashlight tag, seeker cone becomes visible beam, player vision per difficulty

Phase 6a fix (apply during Phase 6a execution):
- [ ] Consider adding sonar ping audio SFX (currently visual-only — no audio cue in Phase 6a)

Phase 6b fix (apply during Phase 6b execution):
- [ ] Results screen UI art not specified in Phase 7 — added during deepening. Verify compatibility with Phase 6b layout spec.

**THEN execute phases sequentially (fresh context window per phase):**
- [x] Execute Phase 0: Project Scaffolding ✓ (2026-03-30, Session 7)
- [x] Execute Phase 1: Map + Movement ✓ (2026-03-30, Session 7)
- [x] Execute Phase 2: Seeker + Detection ✓ (2026-03-30, Session 8)
- [x] Execute Phase 3: Fog of War + Game Flow ✓
- [x] Execute Phase 4: Doors + Minimap ✓
- [ ] Execute Phase 5a: Seeker Difficulty Tiers
- [ ] Execute Phase 5b: AI Hider + Spectator
- [ ] Execute Phase 6a: Audio Atmosphere
- [ ] Execute Phase 6b: Scoring + Stats
- [ ] Execute Phase 7: Art Pipeline

## Infrastructure: WebFetch Hook + Gemini Grounding MCP — VERIFIED ✓

**WebFetch hook:** ✓ Tested 2026-03-30. Blocks WebFetch calls with redirect message.

**Gemini Grounding MCP:** ✓ Registered and connected 2026-03-30. `claude mcp list` shows `✓ Connected`.
- **Root cause of prior failures:** Server was manually written into `~/.claude/.mcp.json` — a file Claude Code DOES NOT READ. Servers must be added via `claude mcp add`, which stores them in `.claude.json` (internal config).
- **Windows gotcha:** Git Bash expands `/c` to `C:/`. Must use `//c` in `claude mcp add` commands.
- Orphaned `~/.claude/.mcp.json` deleted.
- Permissions added: `mcp__gemini-grounding__*` in `~/.claude/settings.json`.
- **Tools available next session restart.** Full docs in `docs/environment-setup.md`.

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
- ~~**NO .gitignore yet**~~ — DONE in Phase 0. .env properly excluded.
- ~~**Vite 7.0.0-7.0.6 have active CVEs**~~ — DONE. Using Vite 7.3.1.
- ~~**esModuleInterop: true required for Phaser**~~ — DONE in Phase 0 tsconfig.
- ~~**vitest.config.ts must use mergeConfig**~~ — DONE in Phase 0.
- ~~**fps.limit not fps.target**~~ — DONE. fps.limit: 60 in Phaser config.
- ~~**Tab backgrounding**~~ — DONE. visibilitychange handler + pause/resume + keyboard reset in Phase 1.
- **Defer CSP to hardening pass** — Phaser uses dynamic code eval. No CSP until verified post-Phase 7.
- **override keyword on Phaser Scene** — works on update() ONLY. create()/preload()/init() NOT declared in Phaser's type defs (TS4113). Documented in CLAUDE.md.
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
- **Vision cone RESTRICTS detection** — not rendering-only. checkDetection() filters by cone angle. Easy 60°, Medium 90°, Hard 120°. Without this, seeker detects behind itself (unfair). (NEW — Phase 5a)
- **STATE_PRIORITY must gate pendingTransition** — without priority check, door sound overwrites in-progress CHASE reaction. CHASE(3) > SEARCH(2) > SUSPICIOUS(1) > PATROL(0). (NEW — Phase 5a)
- **One FSM transition per tick maximum** — without this, two transitions same tick = 0-frame intermediate state, exit/enter callbacks misfire. (NEW — Phase 5a)
- **Event handlers RECORD, don't ACT** — DOOR_TOGGLED handler pushes to pendingDoorEvidence queue. No state mutation during emit(). Process queue at fixedUpdate step 1. (NEW — Phase 5a)
- **INVESTIGATE_STIMULUS is NOT an Action** — it's what SUSPICIOUS state does by sequencing primitives (REQUEST_PATH → MOVE_TO → LOOK_AROUND). Remove from Phase 4 prerequisites. (NEW — Phase 5a)
- **Separate EasyStar instances for seeker vs hider** — different door costs (seeker: 50, hider: blocked). Can't share one cost model. (NEW — Phase 5b)
- **Medium AI with no "Rooms" Object Layer = frozen seeker** — must fall back to Easy patrol with log warning. (NEW — Phase 5a)
- **Room center BFS** — Tiled rectangle geometric center may be a wall tile. BFS outward to nearest walkable. Without this, null path, seeker freezes. (NEW — Phase 5a)
- **Double-toggled doors fool state-diff evidence** — use lastToggleTick comparison, not just isOpen vs snapshot. Any toggle since hunt start = evidence. (NEW — Phase 5a)
- **SpectatorGame must NOT process player input** — separate scene, no InputManager for movement. Spectator pressing E would toggle doors near AI hider. (NEW — Phase 5b)
- **roundPixels: false in SpectatorGame only** — zoom-to-fit produces non-integer zoom. Game.ts keeps roundPixels: true. (NEW — Phase 5b)
- **Graphics.arc() uses RADIANS** — config has degrees. Convert or vision cones render incorrectly. (NEW — Phase 5b)
- **BitmapText NOT Text for FSM labels** — Text.setText() costs 0.5-1ms (canvas rerender). BitmapText: ~0.01ms. (NEW — Phase 5b)
- **Director system REMOVED by design** — violates "AI must never act on unperceived info." If Hard AI needs help, add back as tuning lever. (NEW — Phase 5a decision)
- **Detection miss rate REMOVED by design** — feels like bug. Reaction delays + transition delays are the near-miss mechanism. (NEW — Phase 5a decision)
- **Tiled Object Layer properties ARE flat maps in Phaser** — despite raw JSON being array format, Phaser parses them into `obj.properties.roomId` (flat key-value). Contradicts Phase 4 landmine about arrays. (NEW — Phase 5a, corrects Phase 4 landmine)
- **AudioContext suspend/resume Promises can cross** — calling resume() while suspend() is in-flight kills audio permanently. AudioGate class chains through single pendingOp Promise. (NEW — Phase 6a)
- **Phaser pauseOnBlur conflicts with PauseAuthority** — blur/focus vs visibilitychange are different events, different timing. Disable Phaser's pauseOnBlur, own through PauseAuthority + AudioGate. (NEW — Phase 6a)
- **HeartbeatSystem crashes on HTML5 Audio fallback** — `this.sound.context` is undefined. Check `instanceof WebAudioSoundManager`, disable if HTML5. (NEW — Phase 6a)
- **Raw Web Audio nodes bypass Phaser mute** — GainNode connected to AudioContext.destination ignores `this.sound.mute`. Route through Phaser's master gain chain. (NEW — Phase 6a)
- **60 footsteps/second without distance accumulator** — per-tick triggering = machine gun. Emit FOOTSTEP event every ~24px movement. (NEW — Phase 6a)
- **Heartbeat boundary stutter** — same FSM flickering pattern. Hysteresis: start 8 tiles, stop 9.5 tiles. Lerp rate (0.08). (NEW — Phase 6a)
- **GainNode.value direct assignment produces clicks** — use linearRampToValueAtTime(value, now + 0.015) for all volume changes. (NEW — Phase 6a)
- **setTargetAtTime(0) never reaches zero** — exponential asymptote. Use linearRampToValueAtTime(0) for final silence. (NEW — Phase 6a)
- **sound.setRate() changes pitch** — playbackRate 2.0 = double speed + one octave higher. Intentional for heartbeat. NEVER use on footsteps. (NEW — Phase 6a)
- **Phaser Sound Manager is game-global** — sounds survive scene shutdown. Must explicitly stopByKey() in shutdown handler. (NEW — Phase 6a)
- **cancelScheduledValues(now) before new automation** — without it, AudioParam events queue unpredictably. (NEW — Phase 6a)
- **Infinity breaks JSON.stringify** — `JSON.stringify({x: Infinity})` → `{"x":null}`. Use -1 sentinel for "never played". (NEW — Phase 6b)
- **totalGames is derived, not stored** — compute as wins + losses. Storing creates invariant violation risk. (NEW — Phase 6b)
- **Number.isFinite() required in type guards** — NaN and Infinity both pass typeof === 'number'. (NEW — Phase 6b)
- **localStorage re-read before write** — narrows concurrent-tab race from entire session to microseconds. (NEW — Phase 6b)
- **`@google/generative-ai` is DEPRECATED** — use `@google/genai` only. (NEW — Phase 7)
- **`responseModalities: ['IMAGE']`** (without 'TEXT') avoids MIME type mismatch bug where Gemini declares PNG but returns JPEG. (NEW — Phase 7)
- **Gemini returns JPEG by default** — JPEG artifacts destroy pixel art. ALWAYS re-encode through Sharp as PNG. (NEW — Phase 7)
- **No Gemini model supports 32x32 output** — minimum 1K (1024x1024). Two-stage downscale: LANCZOS 1024→128, NEAREST 128→32. (NEW — Phase 7)
- **Tile extrusion mandatory for WebGL** — without 1px extrusion, sub-pixel camera positions cause tile bleeding. `tile-extruder` npm, margin=1, spacing=2 in Tiled. (NEW — Phase 7)
- **`pixelArt` and `roundPixels` are TOP-LEVEL** Phaser config, NOT nested under `render`. (NEW — Phase 7)
- **`addTilesetImage` first arg is case-sensitive** — must match Tiled tileset name exactly. Mismatch returns null silently. (NEW — Phase 7)
- **Keep two tileset versions** — non-extruded for Tiled editing, extruded for Phaser runtime. (NEW — Phase 7)
- **Gemini API key must be `GEMINI_API_KEY`** — never `VITE_GEMINI_API_KEY`. Vite exposes `VITE_` prefix to client. (NEW — Phase 7)
- **free-tex-packer: `allowRotation: false`** — rotation destroys pixel art alignment. (NEW — Phase 7)
- **BitmapText cannot render gradients** — SURVIVED splash "gradient gold" must be flat fill or pre-rendered sprite. (NEW — Phase 7)
- **Phase 7 replaces Phase 3's EndOfRoundSequence** — starburst/particles/elastic tweens exceed SequenceStep union. Direct Phaser tween/Graphics code instead. (NEW — Phase 7)
