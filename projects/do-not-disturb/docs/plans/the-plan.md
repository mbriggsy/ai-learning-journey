---
title: "Do Not Disturb — The Plan"
type: feat
status: active
date: 2026-04-03
origin: docs/ideation/2026-04-03-do-not-disturb-brainstorm.md
---

# Do Not Disturb — The Plan

## Phase Tracker

| Phase | Name | Status | Plan |
|-------|------|--------|------|
| 1 | Scaffolding & Tech Stack | **done** | [01-scaffolding.md](phases/01-scaffolding.md) |
| 2 | Core Engine & Foundation | **done** | [02-core-engine.md](phases/02-core-engine.md) |
| 3 | Player & Physics | **done** | [03-player-physics.md](phases/03-player-physics.md) |
| 4 | Hotel World | **done** | [04-hotel-world.md](phases/04-hotel-world.md) |
| 5 | Camera & Visibility | **done** | [05-camera-visibility.md](phases/05-camera-visibility.md) |
| 6 | The Bellhop + Night 1 | **deep** | [06-bellhop-night1.md](phases/06-bellhop-night1.md) |
| 7 | The Housekeeper + Night 2 | **deep** | [07-housekeeper-night2.md](phases/07-housekeeper-night2.md) |
| 8 | The Guest + Night 3 | **deep** | [08-guest-night3.md](phases/08-guest-night3.md) |
| 9 | Night Progression & Narrative | **deep** | [09-night-progression.md](phases/09-night-progression.md) |
| 10 | Art, Sound & Polish | **deep** | [10-art-sound-polish.md](phases/10-art-sound-polish.md) |

## Overview

Side-scrolling 2D playful horror game. A kid trapped in an abandoned hotel, hunted by three monsters with learnable rules. Survive 5 nights, escape through the front door.

This plan breaks the full build into 10 sequential phases (1 through 10). Each phase has a clear deliverable and builds on the previous. Night 1 is playable after Phase 6 — early validation of the core loop.

**Origin:** All design decisions from the [locked brainstorm](../ideation/2026-04-03-do-not-disturb-brainstorm.md). 13 key decisions finalized, zero open questions at the design level. Implementation-level gaps identified by SpecFlow analysis are captured in the Open Questions section below.

## Tech Stack Decision

**Recommended: Phaser 3 + TypeScript + Vite + Vitest + pnpm**

Justification (evaluated from zero per CLAUDE.md):

| Requirement | Phaser 3 | Alternative |
|---|---|---|
| Side-scrolling with gravity | Arcade Physics built in | Custom physics or Matter.js |
| Tiled map integration | Native loader (with known gotchas — insight 003) | Manual parsing |
| Parallax layers | Built-in camera system | Custom scroll math |
| Sprite animation | Animation manager | Manual frame handling |
| Audio | Web Audio API wrapper | Howler.js (would need integration) |
| Team familiarity | Deep — 336-test engine in prior project | Learning curve |
| Keyboard input | Event-based listeners available (insight 002) | N/A |

Phaser wins on every axis. The shift from top-down to side-scrolling changes game logic, not the framework. Arcade Physics handles gravity and platform collision. The proven architecture (game logic with ZERO Phaser imports, renderer reads ReadonlyDeep state) carries forward unchanged.

**Full stack:**
- **Runtime:** Phaser 3.90+, TypeScript 5.9+
- **Build:** Vite 7, pnpm 10
- **Test:** Vitest 4 (globals: false, restoreMocks: true), V8 coverage
- **Maps:** Tiled (exported as JSON)
- **Art:** Imagen 4 (via @google/genai), Sharp for processing
- **Pathfinding:** Platform graph (custom — not grid A*, see Phase 2)

## Architecture Constraints (Non-Negotiable)

Proven patterns carried from the prior project (see brainstorm: "Why fresh project"):

1. **Game logic layer has ZERO imports from Phaser, DOM, or browser APIs**
2. **Renderer reads state via `ReadonlyDeep<GameState>` — never shallow `Readonly<T>`**
3. **Fixed-timestep accumulator** — constant dt, max catchup guard
4. **FSM states are stateless** — all per-instance data on context objects, zero module-level `let` (insight 005 — critical with 3 concurrent monster FSMs)
5. **Event-based input, not polling** — `key.on('down', ...)` not `JustDown()` (insight 002)
6. **Centralize world-state side effects on events**, not callsites (insight 006)
7. **Constants as `as const satisfies`**, unit suffixes (`_S`, `_DEG`), no enums
8. **Named exports only, no barrel files, `import type` enforced**
9. **ReadonlyDeep with function guard** — fix the method-killing bug (insight 007)
10. **AI tiles fail 100%** — all repeating textures drawn programmatically (insight 010)
11. **Imagen 4 edge-strip** — strip outermost 1px border on all chroma-keyed sprites (insight 011)
12. **Pending-request guards** on all async operations (insight 001)
13. **Initial state explicit init** — never rely on transition events for startup (insight 008)

## Insight Docs to Carry Over

Three insight docs from hide-and-seek are NOT yet in DND's `docs/insights/` but are highly relevant:

- **006 — Scattered side-effect updates** → centralized event handlers for doors, elevator, hiding spots
- **009 — Dual sentinel values** → `Infinity` for runtime, `-1` for persisted. Pick ONE convention per struct
- **010 — AI-generated tiles fail at 32px** → 100% failure rate. Draw programmatically. AI for standalone assets only

Copy these during Phase 1 scaffolding.

## Implementation Phases

### Phase 1: Scaffolding & Tech Stack

**Goal:** Empty project that builds, lints, and runs tests (even with zero tests).

- [x] Initialize pnpm project, install Phaser + TypeScript + Vite + Vitest
- [x] tsconfig with `verbatimModuleSyntax`, strict mode
- [x] Directory structure following proven pattern:
  ```
  src/
    game/          # Pure logic (ZERO framework imports)
    renderer/      # Phaser scenes, sprites, camera
    types/         # Shared type definitions
    constants.ts   # All design constants
  ```
- [x] Vitest config: separate test projects (game/node, renderer/jsdom)
- [x] Copy insight docs 006, 009, 010 from hide-and-seek
- [x] Placeholder `index.html` + Vite dev server
- [x] Update CLAUDE.md with finalized tech stack and commands

**Deliverable:** `pnpm build` succeeds, `pnpm test` runs (0 tests), `pnpm dev` serves blank Phaser canvas.

---

### Phase 2: Core Engine & Foundation

**Goal:** Engine ticks, events fire, FSMs transition, noise model computes — all tested.

- [x] **Fixed-timestep accumulator** — `tick(deltaMs)`, constant dt (1/60s), max catchup guard
- [x] **Typed event emitter** — minimal (~26 lines), copy-on-iterate, generic over `GameEventMap`
- [x] **GameState type** — initial structure (player, monsters, world, night, inventory)
- [x] **ReadonlyDeep** — with function guard (`T extends Function ? T : ...`) to fix insight 007
- [x] **FSM framework** — stateless states, generic context, `onEnter/onUpdate/onExit`
- [x] **Constants scaffold** — grouped by domain (SIMULATION, MOVEMENT, MONSTER, SOUND, etc.)
- [x] **Noise model foundation** — zone-based propagation (each room = zone, attenuation by zone distance, walls reduce, floors heavily reduce, elevator shaft moderate)
- [x] **Platform graph pathfinding** — nodes at floor positions, edges for stairs/elevator/drops. NOT grid A*. The Bellhop needs cross-floor navigation; Housekeeper patrols linearly; Guest doesn't move far
- [x] **Game clock** — tracks elapsed time within a night, fires events for escape window approach/open/close

**Deliverable:** Engine loop runs at fixed timestep, events emit and receive correctly, FSM transitions work with 3+ concurrent instances, noise propagation computes zone distances, pathfinding resolves cross-floor routes. All tested.

---

### Phase 3: Player & Physics

**Goal:** Kid moves through a test level with correct physics and noise output.

- [x] **Gravity + ground collision** — Arcade Physics, configurable gravity constant
- [x] **6 movement modes** with noise levels:
  | Mode | Input | Speed | Noise |
  |------|-------|-------|-------|
  | Run | Shift+dir | Fast | LOUD |
  | Walk | Direction | Medium | Moderate |
  | Sneak | Ctrl+dir | Slow | Near silent |
  | Jump | Space | Varies | Landing thud |
  | Slide | Down while running | Fast | Whoosh |
  | Interact | E | None | Varies (doors creak) |
- [x] **Input system** — event-based listeners, NOT polling. Exposes current mode to engine
- [x] **Noise emission** — per-tick computation based on movement mode + surface type
- [x] **Surface type system** — carpet (quiet), wood (loud), tile (echoes). Affects noise multiplier
- [x] **Basic collision** — walls, floors, one-way platforms (for vents/ledges)

**Deliverable:** Kid runs/walks/sneaks/jumps/slides through a test level. Noise values compute correctly per mode per surface. All movement tested without Phaser (pure game logic).

---

### Phase 4: Hotel World

**Goal:** Navigable 5-floor hotel with all interactive elements.

- [x] **5-floor structure** (Tiled maps):
  | Floor | Character | Key Elements |
  |-------|-----------|-------------|
  | Attic | Tight spaces, exposed beams | Vents, cobwebs |
  | Floor 3 | Guest rooms, long corridor | Beds, closets, doors |
  | Floor 2 | Guest rooms, laundry chute | Beds, closets, chute to basement |
  | Lobby | Front desk, piano, tall windows | Escape door, phone |
  | Basement | Kitchen, freezer, boiler | Freezer hiding, near pitch black |
- [x] **Rooms with doors** — open/close with creak (noise event). Tiled properties accessed via `obj.properties?.propName` (insight 003)
- [x] **Stairs** — doorway-style transition between floors. Short transition animation. Monsters CAN follow after a delay
- [x] **Elevator** — moves between floors, DING on arrival (loudest sound — attracts Bellhop). Can be called as decoy (press button, walk away)
- [x] **Laundry chute** — one-way from Floor 2 to Basement. Makes sliding noise. Monsters cannot use it
- [x] **Hiding spots** (5 types):
  | Spot | Protection | View | Notes |
  |------|-----------|------|-------|
  | Under beds | High | See feet | Housekeeper checks — NOT safe from her |
  | Closets | High | Peek through slats | Housekeeper checks — NOT safe from her |
  | Behind furniture | Low | Quick crouch | Can be spotted by any monster |
  | Vents | Safe | Crawl between rooms | Slow but safe from ALL monsters |
  | Freezer (basement) | Time-limited | Door blocks view | Cold timer |
- [x] **Surface types per room** — stored in Tiled tile properties
- [x] **Data-driven level loading** — each night loads a level config. Nights 1-4 use same config. Night 5 uses variant. World system doesn't know which night it is — loads what it's told (Night 5 ready from day 1)
- [x] **Light zones** — per-area ambient light levels. Attic: moonlight through holes. Floors 2-3: flickering sconces. Lobby: moonlight (best visibility). Basement: near pitch black

**Deliverable:** Player navigates all 5 floors via stairs and elevator. Doors open/close with noise. Hiding spots enterable. Light zones render. Level configs load from data. All interactive elements tested.

---

### Phase 5: Camera & Visibility

**Goal:** Camera follows player with all behavior modes, parallax works, visibility correct.

- [x] **Lead-ahead** — camera leads in movement direction (see what's ahead)
- [x] **Zoom-on-hide** — camera zooms in when player enters hiding spot (claustrophobic feel)
- [x] **Screen shake** — on monster alert events
- [x] **Horror beat hold** — brief camera hold when monster is first spotted
- [x] **Parallax** — 3 layers: foreground furniture, midground play area, background architecture
- [x] **Light zone rendering** — darkness mask with cutouts for light sources (moonlight, sconces, lanterns, lighter)
- [x] **Monster light sources** — Bellhop's swinging lantern, Housekeeper's cart fluorescent. Rendered as moving light cutouts
- [x] **Lightning flashes** — occasional full-screen flash (ambient)

**Deliverable:** Camera behavior modes all work. Parallax scrolls correctly across all 5 floors. Light zones render with proper darkness. Monster light sources visible through doors (see harsh light under door). All tested.

---

### Phase 6: The Bellhop + Night 1 Playable

**Goal:** Night 1 is FULLY PLAYABLE. Start → survive → escape or get caught.

- [ ] **Bellhop AI** — FSM: Patrol → Alert (heard sound) → Rush (toward source) → Investigate (search area) → Confused (lost target) → Return to patrol
- [ ] **Sound-based hunting** — Bellhop navigates toward loudest recent noise via platform graph. Detection radius per noise type. Pure sound — NO visual detection (stand motionless in plain sight = safe)
- [ ] **Bellhop visuals** — tall, lanky, skeletal frame in oversized bellhop uniform. Glowing eyes. Swinging lantern (light source)
- [ ] **Bellhop audio tells** — humming elevator music, bell jingle when alert, lantern creak
- [ ] **Throwable system** — environmental pickups (shoes, books, bottles). Fixed positions per level (learnable). Carry limit: 3. Throw creates decoy noise at impact point. ~8-10 available per night
- [ ] **Escape window mechanic**:
  - Night runs indefinitely in hunt/escape cycles
  - First escape window at ~90s. If missed, next at ~150s. Repeat
  - Kid's inner monologue warns 15-20s before ("I think I heard the lock clicking...")
  - Front door unlocks for 20s (Night 1)
  - Miss it → door locks → back to hunt
- [ ] **Phone call** — rings at night start in the lobby. Attracts Bellhop (risk/reward). Answering delivers tutorial hints. Ignoring = phone rings for ~15s then stops. Skippable on retry
- [ ] **HUD** — escape timer (when active), throwable count, night counter
- [ ] **Breath mechanic** — when hiding: breath meter appears. Base duration ~8s. Rhythm tap extends (tap within timing window to "calm breathing"). Run out → gasp → Bellhop hears
- [ ] **Catch animation** — Bellhop bows, rings bell, "Checking you in." 2-3s, then restart night
- [ ] **Death/restart** — instant restart to night start. Phone rings again, dialogue fast-skippable. Monster starting positions fixed (player learns from death)
- [ ] **Player spawn** — always same room (near phone in lobby area). Learnable start

**Deliverable:** Night 1 complete loop: wake up → phone rings → Bellhop activates → explore/hide/throw decoys → escape window opens → sprint to lobby → escape or die trying. Fully playable, fully tested.

---

### Phase 7: The Housekeeper + Night 2 Playable

**Goal:** Night 2 playable with both monsters interacting.

- [ ] **Housekeeper AI** — FSM: Patrol (L-to-R, room by room, floor by floor) → Check Room (open door, check bed, check closet) → Skip Room (DND sign present) → Found Player → Catch
- [ ] **Methodical patrol** — opens every door, checks every hiding spot. Predictable pattern = counterable. Player must count rooms and stay ahead
- [ ] **Housekeeper vs hiding spots** — she FINDS you in beds and closets (design tension — intentional). Vents are the only guaranteed-safe hiding from her. Behind furniture is risky
- [ ] **DND sign system** — limited inventory: 2-3 per night. Found as environmental pickups (hung on wall hooks near supply closets). Place on door → Housekeeper skips that room. Signs are NOT recoverable after placement. Housekeeper does NOT remove them
- [ ] **Housekeeper visuals** — round, shuffling, apron. Head rotates unnaturally far. Cleaning cart with flickering fluorescent tube
- [ ] **Housekeeper audio tells** — cart wheels squeaking, muttering about "the mess", mop dragging, tuts at open doors
- [ ] **Catch animation** — wags finger, tuts, drags kid off-screen by the hoodie. 2-3s
- [ ] **Two-monster balance** — Bellhop and Housekeeper are independent agents. They ignore each other. Can be in the same room simultaneously. Nearest monster catches if both in range. Player must balance: silence (Bellhop safety) vs. movement (staying ahead of Housekeeper)

**Deliverable:** Night 2 playable with both monsters. DND signs work. Two-monster interactions emergent but fair. Tested.

---

### Phase 8: The Guest + Night 3 Playable

**Goal:** Night 3 playable with all three monsters. Full monster roster complete.

- [ ] **Guest AI** — FSM: Ambush (sit still, disguised as furniture) → Detect (player enters ~2-tile range) → Lunge (fast burst toward player) → Miss (player dodged) → Reset (return to same or new ambush spot after ~10s visible cooldown)
- [ ] **Ambush mechanic** — Guest sits in chairs, bathtubs, dark corners. Looks like furniture until it unfolds. Only faint eye glow visible. Cannot chase far (~4 tiles max)
- [ ] **Lighter tool** — illuminate dark areas, reveals Guest's eye glow before trigger range. Limited fuel: ~30s burn time per charge, 2-3 charges per night (found as matches/fuel pickups). Using lighter makes player visible to Bellhop and Housekeeper (light tradeoff)
- [ ] **Guest visuals** — paper-thin, folded into impossible positions. Jerky stop-motion movement when unfolding. Eyes glow faintly
- [ ] **Guest audio tells** — silence... then paper rustling when triggered. Fold/unfold sounds on reset
- [ ] **Catch animation** — wraps around player like origami. Player folds into it. 2-3s
- [ ] **Three-monster balance** — all independent. Monsters ignore each other. The lighter tradeoff (safety from Guest vs. visibility to others) creates genuine decision-making. Player must manage: noise (Bellhop), position (Housekeeper), darkness (Guest)
- [ ] **Inventory interface** — number keys to select tool (1: throwable, 2: DND sign, 3: lighter). Tools cannot be used during Run or Slide (speed/safety tradeoff). Contextual use with E (interact)

**Deliverable:** Night 3 playable with all three monsters + all three counter-tools. Three-way threat management works. Tool/monster matrix clean (each tool affects exactly one monster). Tested.

---

### Phase 9: Night Progression & Narrative

**Goal:** All 5 nights playable with narrative thread and escalating difficulty.

- [ ] **Night state machine** — 5 nights, clean start each. Progression:
  | Night | Monsters | Escape Window | Twist |
  |-------|----------|---------------|-------|
  | 1 | Bellhop | 20s | Tutorial, learn sound |
  | 2 | + Housekeeper | 18s | Learn patrols |
  | 3 | + Guest | 15s | Full roster |
  | 4 | All, 25% faster | 12s | Pressure test |
  | 5 | All + layout changes | 10s | Memorization broken |
- [ ] **Night 4 scaling** — 25% increase to monster movement speed. Detection radii unchanged. Escape window timing tighter
- [ ] **Night 5 layout variants** — rooms and hiding spots shuffle positions within each floor. Stairs and elevator stay put (macro-navigation preserved, room-level memorization broken). Loaded via data-driven level config (designed for in Phase 4)
- [ ] **Phone call system** — rings start of each night (lobby). Content per night:
  - Night 1: Tutorial — controls, monsters, "don't make noise"
  - Night 2: Hints about patrol patterns + narrative thread
  - Night 3: "Something else is here" + more narrative
  - Night 4: Urgency + narrative
  - Night 5: "I remember now." — the revelation
- [ ] **Kid's inner monologue** — text overlay system. Context-sensitive reactions:
  - Near monsters: "Is that... humming?"
  - New area: "Oh GREAT, another floor."
  - Escape warning: "I think I heard the lock clicking..."
  - Night 5: "Have I been here before?" / "I remember now."
- [ ] **Between-night transitions** — brief fade-to-black. New monster introduction gets a moment (kid reacts: "What was THAT?")
- [ ] **Catch animation per monster** — already implemented in Phases 6-8, wired into night restart flow
- [ ] **Save persistence** — autosave after each completed night. Resume at highest unlocked night
- [ ] **Game completion** — escape Night 5 → short ending sequence resolving the mystery → credits

**Deliverable:** All 5 nights playable end-to-end. Narrative arc from confusion to revelation. Night 5 layout changes work. Save/load works. Tested.

---

### Phase 10: Art, Sound & Polish

**Goal:** Ship-quality audiovisual experience. Water beads off it.

**Art (Imagen 4 pipeline):**
- [ ] Character sprites: kid (all movement modes), Bellhop, Housekeeper, Guest
- [ ] Chroma-key processing with 1px edge-strip (insight 011)
- [ ] 48-64px character height, thick uneven outlines, crosshatch shading
- [ ] Furniture and props (beds, closets, desks, chairs, piano, phone)
- [ ] Programmatic tiles for floors/walls (NOT AI-generated — insight 010)
- [ ] Parallax background layers per area
- [ ] Per-area color palettes: amber (lobby), blue-grey (guest floors), near-black (basement), cold white (attic moonlight)

**Animation:**
- [ ] Squash and stretch on kid (bouncy movement)
- [ ] Unsettling monster movement (Bellhop's tilt, Housekeeper's waddle, Guest's stop-motion)
- [ ] Sketch wobble effect — edges aren't perfectly clean (hand-drawn feel)
- [ ] Catch animations (already functional from Phases 6-8, now with final art)

**Sound:**
- [ ] Spatial audio — sound attenuates with distance, pans with position
- [ ] Surface-based footsteps (carpet, wood, tile — different samples per surface)
- [ ] Monster audio telegraphs (already designed per monster, now with real audio assets)
- [ ] Ambient soundscape: rain on windows, thunder + lightning flash, pipe groans (basement), clock ticking (lobby), elevator cable groans
- [ ] Music box melody — faint, gets louder with danger proximity
- [ ] Elevator DING — the loudest, most recognizable sound in the game

**Environmental polish:**
- [ ] Dust in moonbeams (particle effect)
- [ ] Curtains sway when player runs past
- [ ] Rain on windows with drip animations
- [ ] Creaky floorboards in specific spots (gameplay noise)
- [ ] Lightning flashes (ambient + brief full visibility)

**Deliverable:** Every pixel and sound meets the "water beads off it" bar. Hand-drawn style coheres. Audio tells are distinct and learnable. Environmental details make the hotel feel alive. Full integration testing passes.

---

## Risk Analysis

| Risk | Severity | Phase | Mitigation |
|------|----------|-------|------------|
| Platform graph pathfinding complexity | HIGH | 2 | Design early, test with multi-floor routes before monster AI |
| 3 concurrent FSMs sharing world state | HIGH | 6-8 | Stateless states from day 1 (insight 005), centralized side effects (insight 006) |
| Housekeeper-checks-hiding-spots balance | HIGH | 7 | Intentional design tension. Vents are the safe option. Playtest early |
| Night 5 layout variants scope | MEDIUM | 9 | Room shuffle within floors only. Stairs/elevator fixed. Scoped in Phase 4 data-driven design |
| Sound propagation model complexity | MEDIUM | 2 | Zone-based (not physics-based). Room = zone. Simple distance. Tuneable |
| Lighter fuel balance (too much = Guest trivial) | MEDIUM | 8 | ~30s per charge, 2-3 charges. Playtest to tune |
| Breath rhythm mechanic UX | MEDIUM | 6 | Simple timing window (not music-game precision). Forgiving on easy, tight on hard |
| Imagen 4 art consistency | MEDIUM | 10 | Prompt engineering + edge-strip pipeline. Batch similar assets for style consistency |

## Open Questions (Identified by SpecFlow Analysis)

These are implementation-level gaps — not design disagreements. Each has a recommended default. Resolve during phase deepening or early execution.

### Must Resolve Before Phase 6

1. **Monster speed ratios** — Bellhop faster than Run (can't outrun, must hide/decoy), Housekeeper slower than Walk (can stay ahead), Guest lunge ~4 tiles then stops. *Exact values tuned during playtest.*
2. **Cross-floor sound propagation** — does the elevator DING attract from any floor? Can running on Floor 3 be heard on Floor 2? *Recommended: DING global, footsteps attenuate to zero after 1 floor distance.*
3. **Action compatibility** — can you throw while running? Use lighter while sneaking? *Recommended: tools require Walk/Sneak/Still. No tools during Run or Slide.*

### Must Resolve Before Phase 9

4. **Night 4 "faster" specifics** — *Recommended: 25% movement speed increase only. Simple, testable.*
5. **Night 5 layout change scope** — *Recommended: rooms + hiding spots shuffle within floors. Stairs/elevator fixed.*
6. **Jump and Slide purposes** — *Recommended: Jump reaches high vents + hops over knocked furniture. Slide passes under half-closed doors + crawl spaces.*

### Nice-to-Have (Reasonable Defaults)

7. Can the elevator be called as a decoy? *Default: yes.*
8. Does the lighter make you visible to non-Guest monsters? *Default: yes (creates tradeoff).*
9. Can monsters use the laundry chute? *Default: no.*
10. Post-Night 5 ending sequence? *Default: yes — short cutscene + credits.*

## Sources & References

### Origin

- **Brainstorm document:** [docs/ideation/2026-04-03-do-not-disturb-brainstorm.md](../ideation/2026-04-03-do-not-disturb-brainstorm.md) — all 13 key decisions carried forward. Zero open design questions.

### Insight Docs (Carried Forward)

| # | Insight | Phase Impact |
|---|---------|-------------|
| 001 | Async request flooding — pendingPath guards | Phase 2, 6-8 |
| 002 | JustDown polling broken — use event listeners | Phase 3 |
| 003 | Phaser flattens Tiled properties | Phase 4 |
| 005 | Module-level singleton FSM — stateless states | Phase 2, 6-8 |
| 007 | ReadonlyDeep kills methods — function guard | Phase 2 |
| 008 | Initial state fires no transition event | Phase 2, 6 |
| 011 | Imagen 4 decorative borders — edge-strip | Phase 10 |

### Insight Docs (To Carry Over from hide-and-seek)

| # | Insight | Phase Impact |
|---|---------|-------------|
| 006 | Scattered side-effect updates | Phase 2, 4 |
| 009 | Dual sentinel values (Infinity vs -1) | Phase 2 |
| 010 | AI tiles fail at 32px — draw programmatically | Phase 10 |

### Reference Patterns (hide-and-seek — code not inherited, patterns are)

- Engine tick: `hide-and-seek/src/game/engine.ts`
- Typed emitter: `hide-and-seek/src/game/events.ts`
- FSM interface: `hide-and-seek/src/types/fsm.ts`
- ReadonlyDeep: `hide-and-seek/src/types/utility.ts`
- Constants: `hide-and-seek/src/constants.ts`
- Test config: `hide-and-seek/vitest.config.ts`
