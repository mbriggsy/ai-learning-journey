# CLAUDE.md — Instructions for Claude Code

## Project Overview
You are building **Top-Down Racer 01**, a 2D top-down racing game with drift mechanics, wall damage, and a panning camera. Built in Python with the **Arcade** library (which includes pymunk physics). The game will later be wrapped as a Gymnasium environment and trained with reinforcement learning.

Read README.md for the full game spec.

This is a **learning project**. Over-engineering is intentional. The journey matters more than efficiency. We're building an arsenal of knowledge.

## Key Principles
1. **Game logic is completely separate from rendering.** The car, track, and physics modules must work without Arcade's window. The renderer/view is a thin layer on top.
2. **All tunable values go in configs/default.yaml** — car speed, acceleration, drift grip, damage amounts, track dimensions, etc. No magic numbers buried in code.
3. **Keep it simple visually but rich mechanically.** Geometric shapes, no sprite assets. Clean and readable code. Docstrings on every class and public method.
4. **The game must be human-playable and fun before any AI work begins.**
5. **Leverage Arcade's strengths** — use its built-in Camera for viewport scrolling, ShapeElementList for efficient batch rendering, and pymunk for physics where appropriate.

## Tech Stack

| Package | Version | Purpose |
|---------|---------|---------|
| Python | 3.12.10 | Runtime (in .venv) |
| arcade | 3.3.3 | Game engine, rendering, camera, input |
| pymunk | 6.9.0 | Physics engine (comes with arcade) |
| numpy | latest | Vector math, ray casting |
| pyyaml | latest | Config file loading |
| gymnasium | latest | RL environment wrapper (Phase 2) |

## Environment
```powershell
cd C:\Users\brigg\ai-learning-journey\projects\top-down-racer-01
.\.venv\Scripts\Activate.ps1
```

---

## 📋 BUILD JOURNAL — MANDATORY

**Every agent MUST maintain the build journal.** This is non-negotiable.

File: `BUILD_LOG.md` in the project root.

### Rules
1. **Before starting work**, append a log entry with your agent role, what you plan to build, and your approach.
2. **After completing each file**, append a log entry summarizing what you built, key design decisions, any tradeoffs you made, and anything interesting or surprising.
3. **If you encounter a problem**, log it — what went wrong, what you tried, how you fixed it.
4. **If you make a decision that could have gone another way**, log WHY you chose the path you did.
5. **After all work is complete**, append a final summary of everything you built and how it all fits together.

### Format
```markdown
---
### [TIMESTAMP] 🏗️ [AGENT ROLE] — [Action]
**Files:** `list of files touched`
**Summary:** What was done and why
**Decisions:** Key choices made and reasoning
**Issues:** Any problems encountered (or "None")
---
```

### What Makes a Good Log Entry
- NOT: "Created car.py with car physics" (useless)
- YES: "Built Car class with bicycle physics model. Chose bicycle model over point-mass because it gives realistic front-wheel steering — the car turns from the front, not the center. Drift mechanic uses a grip multiplier that drops from 1.0 to 0.3 when handbrake is active, which makes the rear end slide out. Tuned initial values to feel responsive but not twitchy. angular_velocity is damped at 0.92 per frame to prevent infinite spinning."

The build journal is the story of how this game was made. Make it worth reading.

---

## Project Structure
```
top-down-racer-01/
├── main.py              # Entry point — human plays the game
├── BUILD_LOG.md         # 📋 Build journal (agents write here)
├── CLAUDE.md            # You are here
├── README.md            # Full project spec
├── requirements.txt
├── game/
│   ├── __init__.py
│   ├── car.py           # Car class: physics, drift, damage
│   ├── track.py         # Track class: walls, checkpoints, spawn point
│   ├── camera.py        # Camera/viewport management
│   ├── hud.py           # HUD rendering: speedometer, health, lap info
│   ├── physics.py       # Collision detection, wall response, ray casting
│   └── renderer.py      # Main game View class (arcade.View)
├── ai/                  # Phase 2 — empty for now
│   └── __init__.py
├── assets/              # Empty for now (geometric shapes, no sprites)
└── configs/
    └── default.yaml     # All tunable game parameters
```

---

## Agent Team Configuration

Use an agent team with **4 specialized teammates** plus the team lead. The team lead uses **delegate mode** — it coordinates and reviews only, it does NOT write code.

### Team Structure (5 agents total)

```
TEAM LEAD (delegate mode — coordinates, reviews, does NOT code)
│
├── 🔧 Foundation Agent
│   Files: configs/default.yaml, game/__init__.py, BUILD_LOG.md (creates it)
│   Goes FIRST — everything depends on the config
│
├── 🛤️ Track Agent
│   Files: game/track.py
│   Starts after config exists — parallel with Car & Physics Agent
│
├── 🏎️ Car & Physics Agent
│   Files: game/car.py, game/physics.py
│   Starts after config exists — parallel with Track Agent
│
└── 🎨 Integration Agent
    Files: game/renderer.py, game/camera.py, game/hud.py, main.py
    Starts after Track + Car & Physics agents deliver their files
```

### Agent Role Details

#### 🔧 Foundation Agent
**Files:** `configs/default.yaml`, `game/__init__.py`, `BUILD_LOG.md`
**Mission:** Create the configuration foundation that all other agents build on. Define every tunable parameter the game needs. Create BUILD_LOG.md and write the first entry.
**Goes first.** No dependencies. All other agents wait for this.

Config must include:
- Screen: width (1280), height (720), fps (60), title
- Car: max_speed, acceleration, brake_force, reverse_max_speed, steering_speed, drift_grip_multiplier (how much grip drops during drift), normal_grip, mass, width, length
- Damage: wall_damage_multiplier, min_damage_speed (below this speed, no damage), max_health (100)
- Track: all centerline points defining the track shape, track_width
- Camera: follow_speed (lerp factor), zoom
- Colors: road_color, wall_color, car_color, drift_trail_color, background_color, hud_colors
- Drift: trail_lifetime, trail_width, trail_fade_rate

#### 🛤️ Track Agent
**Files:** `game/track.py`
**Depends on:** `configs/default.yaml`
**Mission:** Design a fun, interesting track and implement the Track class.

Must implement:
- `Track` class that loads layout from config
- `inner_walls` and `outer_walls` as lists of (x, y) polygon points
- Track should have: gentle curves, at least one sharp hairpin, an S-curve section, and one long straight. NOT just an oval.
- Checkpoints as line segments across the track width (for lap counting)
- `get_spawn_position() → (x, y, angle)` — where the car starts
- `get_wall_segments() → list of ((x1,y1), (x2,y2))` — for collision detection
- `is_on_track(x, y) → bool`
- `get_checkpoint_segments() → list` — for lap/checkpoint detection
- Method to build Arcade `ShapeElementList` for efficient rendering (but don't import arcade at module level — keep it in a method or make it optional)

**Track design tip:** Use a spline or manually place centerline points, then offset by ±track_width/2 to create inner/outer walls. The track should be large enough that the camera panning is obvious and satisfying.

#### 🏎️ Car & Physics Agent
**Files:** `game/car.py`, `game/physics.py`
**Depends on:** `configs/default.yaml`
**Parallel with:** Track Agent (zero file overlap)
**Mission:** Build the car physics, drift mechanics, and collision system.

**game/car.py** must implement:
- `Car` class with state: position (numpy array), angle, speed, angular_velocity, health, is_drifting, drift_trail_points
- `update(dt, keys_pressed: set)` — core physics update each frame
  - Acceleration/braking based on input
  - Steering: front-wheel-steered bicycle model (car turns from front, not center)
  - **Drift mechanic:** When SPACE held, `is_drifting = True`, rear grip drops to `drift_grip_multiplier` (e.g., 0.3). The car's velocity direction lags behind its facing angle — this creates the lateral slide. Angular velocity increases during drift. Drift trail points are recorded from rear wheel positions.
  - Speed clamped to max_speed
  - Angular velocity damped each frame (prevent infinite spinning)
- `apply_damage(amount)` — reduce health, clamp to 0
- `get_corners() → list of 4 (x,y) tuples` — rotated rectangle corners for collision
- `reset(x, y, angle)` — full state reset for respawn
- `is_alive → bool` — health > 0

**game/physics.py** must implement:
- `line_segment_intersection(p1, p2, p3, p4) → (x,y) or None` — math utility
- `check_wall_collisions(car_corners, wall_segments) → list of CollisionInfo` — check each car edge against each wall segment
- `resolve_collision(car, collision_info)` — push car out of wall, reduce speed, return damage based on impact velocity
- `check_checkpoint(car_pos, car_prev_pos, checkpoint_segment) → bool` — did car cross this checkpoint?
- `cast_rays(position, angle, wall_segments, num_rays=8, max_distance=500) → list of float` — for future AI observations. Cast rays at evenly spaced angles from car, return distance to nearest wall for each.

#### 🎨 Integration Agent
**Files:** `game/renderer.py`, `game/camera.py`, `game/hud.py`, `main.py`
**Depends on:** ALL other agents' files (starts last)
**Mission:** Wire everything together into a playable game.

**game/camera.py:**
- Wraps `arcade.Camera2D` (or equivalent in arcade 3.3)
- Smooth follow: lerp toward car position each frame
- Look-ahead: bias slightly in direction of travel so you can see what's coming

**game/hud.py:**
- Speed display (number or bar)
- Health bar (green → yellow → red as health drops)
- Lap counter ("Lap 1/3" or similar)
- Current lap time + best lap time
- Uses a separate fixed camera (HUD doesn't scroll with the world)
- Small "DRIFTING!" indicator when car is drifting (fun touch)

**game/renderer.py:**
- `RacerView(arcade.View)` — main game view
- `on_update(delta_time)`: update car, check collisions, apply damage, check checkpoints, check lap completion
- `on_draw()`: clear screen, activate world camera, draw track, draw drift trails, draw car, activate HUD camera, draw HUD
- `on_key_press` / `on_key_release`: maintain a `keys_pressed` set passed to car.update()
- Draw car as a rotated filled rectangle with a pointed front (so you can tell which way it faces)
- Draw drift trails as fading semi-transparent lines behind rear wheels
- Game over overlay when health = 0 with "Press R to restart"

**main.py:**
- Load config from `configs/default.yaml`
- Create `arcade.Window`
- Create `RacerView`, pass config
- `arcade.run()`

### Coordination Rules

1. **Foundation Agent goes first.** No other agent starts until `configs/default.yaml` exists.
2. **Track Agent and Car & Physics Agent work in PARALLEL.** They touch completely different files. Zero conflict.
3. **Integration Agent starts LAST.** It needs the interfaces from both Track and Car & Physics to be defined.
4. **Team Lead stays in delegate mode.** Coordinate, review plans, review output, but do NOT write code.
5. **Each agent submits a plan before implementing.** Lead reviews and approves or sends back for revision.
6. **Every agent writes to BUILD_LOG.md** after completing each major piece of work. This is mandatory.
7. **After all agents finish, Team Lead runs `python main.py`** to verify the game launches and works. If there are bugs, assign fix tasks to the appropriate agent.

### Dependency Graph
```
Foundation Agent ──→ configs/default.yaml ✅
       │
       ├──→ Track Agent ──→ game/track.py ──────────────┐
       │     (parallel)                                  │
       ├──→ Car & Physics Agent ──→ game/car.py ────────┤
       │                       ──→ game/physics.py ─────┤
       │                                                 │
       └──→ Integration Agent (waits for above) ────────┘
             ──→ game/camera.py
             ──→ game/hud.py
             ──→ game/renderer.py
             ──→ main.py
             ──→ Team Lead verifies: python main.py
```

---

## Controls
| Key | Action |
|-----|--------|
| W / Up Arrow | Accelerate |
| S / Down Arrow | Brake / Reverse |
| A / Left Arrow | Steer left |
| D / Right Arrow | Steer right |
| SPACE | Handbrake (drift) |
| R | Restart (after game over) |
| ESC | Quit |

## Coding Standards
- Type hints on all function signatures
- Docstrings on all classes and public methods
- No circular imports — dependency flows: main → renderer → car, track, physics
- Use numpy arrays for vector math (positions, velocities)
- Frame-rate independent: multiply ALL physics by `dt`
- Load ALL tunable values from config — absolutely no magic numbers in code
- Python 3.12 features are fine to use

## Testing Checklist
After all agents finish, verify:
1. ✅ `python main.py` launches a window with the track visible
2. ✅ Car drives with WASD, steers correctly
3. ✅ Camera follows the car smoothly around the track
4. ✅ Spacebar triggers drift (car slides laterally, trails appear)
5. ✅ Hitting walls causes damage (health bar decreases)
6. ✅ Health at 0 shows game over screen
7. ✅ R restarts the game
8. ✅ Car can complete a full lap, lap counter increments
9. ✅ Lap time displays and updates
10. ✅ BUILD_LOG.md has entries from every agent

## What NOT to Build Yet
- Do NOT build train.py, watch.py, or anything in `ai/`
- Do NOT install or import torch or stable-baselines3
- Do NOT build game_env.py (Gymnasium wrapper)
- These are Phase 2 — the game must be fun first
