# 🏎️ Top-Down Racer 01 — Project Genesis

**Date:** February 22, 2026  
**Architect:** Claude (Opus 4.6, chat interface)  
**IT Support:** Harry 🧙 (Claude Code, terminal)  
**Builder:** Claude Code (VS Code extension, Agent Teams)  
**Test Driver / Boss:** Briggs

---

## The Idea

Build a simple racing car game — a track loop with turns in both directions, wall damage, and Tokyo drift mechanics. One car, simple controls. Once that's working, train an AI to play it. The whole thing is a learning project: the journey matters more than the product.

> *"I'm less concerned about the end product, although it has to be kick ass, so we can show it off 😋 The fucking cool part for me is the journey and trying the different ways to build things — even if it's less efficient; that way when we need to do something that we wanna take over the world with, we have an arsenal of knowledge in our toolbelt. So for now, over engineering is the name of the game!"*

---

## Decision Log

### Platform: Python (not Unity, not Godot)

**Why:** The entire project is code — no visual editor clicking. Claude agents can own 100% of the build. The AI/RL training ecosystem (Gymnasium, Stable-Baselines3, PyTorch) is native Python. Switching from "human plays" to "AI trains" is practically a light switch.

The architect originally proposed Pygame. Harry independently chose Arcade during setup. The architect agreed it was the better call.

### Game Engine: Arcade (not Pygame)

**Who decided:** Harry, independently during initial setup.  
**Why it stuck:** Arcade has built-in camera/viewport panning, pymunk physics comes bundled, and it's less boilerplate for a top-down racer.

### Agent Framework: Claude Code Agent Teams (not CrewAI)

**The fork in the road:** Harry initially set up CrewAI + Anthropic API — a Python framework where you define agents in code that use Claude's API to think. The architect proposed Claude Code Agent Teams — multiple Claude instances working in parallel on the filesystem.

**Decision:** Agent Teams for version 01. CrewAI saved for a future version (`top-down-racer-02`) as a different learning exercise. Agent Teams lets us go full parallel build with minimal middleman overhead.

### Build Method: Agent Teams via VS Code

**Not terminal Harry.** The original plan was to have Harry (Claude Code in terminal) run everything. But Briggs wanted to use Claude Code via the VS Code extension instead — more visual, easier to watch agents work, better for learning.

**Harry's new role:** IT support and janitor. Library installs, environment fixes, directory setup. The dignified work of keeping the lights on.

---

## Architecture Decisions

### Separation of Concerns
Game logic (car physics, track geometry, collisions) is completely independent of rendering. The Arcade renderer is a thin layer on top. This is critical for Phase 2 — the AI trains against the game logic directly without needing a window.

The Car & Physics Agent went so far as to hardcode key constants (`KEY_W = 119`, etc.) locally rather than importing from arcade — keeping the physics module 100% rendering-free.

### Config-Driven Everything
All tunable values live in `configs/default.yaml`. Car speed, drift grip, damage multipliers, track shape, colors — everything. No magic numbers in code. This means you can tweak the game feel without touching a single line of Python.

The Foundation Agent documented every single parameter with comments explaining what it does and what units it uses.

### Agent Team Design (4 builders + 1 lead)
The team was designed to **maximize parallelism without file conflicts**:

| Agent | Files | Runs When |
|-------|-------|-----------|
| 🔧 Foundation | `default.yaml`, `__init__.py` | First (everything depends on config) |
| 🛤️ Track | `track.py` | After config — parallel with Car |
| 🏎️ Car & Physics | `car.py`, `physics.py` | After config — parallel with Track |
| 🎨 Integration | `renderer.py`, `camera.py`, `hud.py`, `main.py` | Last (needs all interfaces) |

The Team Lead uses **delegate mode** — it coordinates and reviews plans but writes zero code. This prevents the lead from trying to do everything itself.

5 agents is the sweet spot. More agents would mean overlapping files and merge conflicts. Fewer would mean less parallelism. This setup has zero file overlap between parallel agents.

### Build Journal (BUILD_LOG.md)
Every agent is required to log:
- What they built and why
- Key design decisions and tradeoffs
- Problems encountered and how they were solved
- Anything interesting or surprising

Not blow-by-blow code narration — real engineering storytelling. The goal: a document you can read afterward and say "holy fuck, look what these minions did."

---

## The Stack

| Layer | Tool | Version | Purpose |
|-------|------|---------|---------|
| Runtime | Python | 3.12.10 | In .venv (3.14 was too bleeding-edge) |
| Game engine | Arcade | 3.3.3 | Rendering, camera, input |
| Physics | pymunk | 6.9.0 | Bundled with Arcade |
| Math | NumPy | 2.4.2 | Vector ops, ray casting |
| Config | PyYAML | 6.0.3 | Parameter loading |
| RL env (Phase 2) | Gymnasium | — | Standard RL interface |
| RL training (Phase 2) | Stable-Baselines3 | — | PPO algorithm |
| Neural net (Phase 2) | PyTorch (CPU) | — | Under the hood |

---

## Environment Setup (What Harry Did)

Harry's full setup journey is documented in `SETUP.md`. The highlights:

1. Python 3.14 was installed but too new — CrewAI and other packages couldn't compile
2. Installed Python 3.12.10 alongside 3.14
3. Created `.venv` with `py -3.12 -m venv .venv`
4. Installed Rust 1.93.1 (needed for some compiled packages)
5. Installed: arcade, pymunk, crewai, anthropic, python-dotenv, numpy, pyyaml
6. Created project directories (`game/`, `ai/`, `assets/`, `configs/`) with `__init__.py` files

Project lives at: `C:\Users\brigg\ai-learning-journey\projects\top-down-racer-01\`

---

## The First Build — What Happened

### Launch
Briggs opened VS Code in the project folder, fired up Claude Code, and pasted the agent team prompt from `QUICKSTART.md`. The team lead spawned 4 agents and coordinated the build.

### What the Agents Built
The agent team delivered **18 files** in a single session:

| File | Agent | Description |
|------|-------|-------------|
| `configs/default.yaml` | 🔧 Foundation | 24-point track layout, all physics params, colors, everything |
| `game/__init__.py` | 🔧 Foundation | Package init |
| `BUILD_LOG.md` | 🔧 Foundation | Build journal (created and first entry) |
| `game/car.py` | 🏎️ Car & Physics | Full car class with bicycle steering and drift mechanics |
| `game/physics.py` | 🏎️ Car & Physics | Collision detection, resolution, ray casting, checkpoint detection |
| `game/track.py` | 🛤️ Track | Track geometry, wall generation, smoothed normals, rendering |
| `game/renderer.py` | 🎨 Integration | Main game View class, drawing, input, game loop |
| `game/camera.py` | 🎨 Integration | Smooth camera follow with look-ahead |
| `game/hud.py` | 🎨 Integration | Speed, health bar, lap counter, lap time, drift indicator |
| `main.py` | 🎨 Integration | Entry point — config loading, window creation, run |

### Build Log Highlights

The agents didn't just write code — they wrote *engineering journals*. Some standout entries:

**Foundation Agent** on drift grip:
> *"Drift grip at 0.3 means the car's velocity direction lags significantly behind its facing angle during drift. Lower values (like 0.1) would make drifting uncontrollable; higher values (like 0.5) would feel too tame and barely different from normal driving."*

**Foundation Agent** on track design:
> *"The sharp hairpin (points 16-19) is the signature feature. Nearly 180 degrees of rotation in a tight radius. The player MUST brake or drift to survive this. Approaching at full speed is a guaranteed wall hit."*

**Foundation Agent** on wall damage:
> *"wall_damage_multiplier of 0.5 means at full speed (400 px/s), a wall hit does 200 damage — a guaranteed instant kill since max_health is 100. This makes walls genuinely terrifying and rewards clean driving."*

**Car & Physics Agent** on the drift mechanic:
> *"During drift (grip=0.3), velocity = velocity × 0.7 + intended × 0.3, so 70% of the old velocity direction persists each frame. This is what creates the lateral slide: the car is pointed at the apex but still sliding toward the outside of the turn. It's a simple lerp but it produces surprisingly satisfying drift behavior."*

**Car & Physics Agent** on angular velocity during drift:
> *"angular_velocity × 1.05 when drifting gives a 5% boost per frame. Combined with 0.92 damping every frame, drift rotation reaches a stable equilibrium at roughly 1.05/0.92 = 1.14x the base steering angular velocity. This swings the rear end out during drift without letting it spin forever."*

**Car & Physics Agent** on a bug they caught:
> *"The trickiest part was getting the collision normal orientation right — an early version occasionally pushed the car through the wall instead of out of it because the normal was flipped. Fixed by using the dot product test against the hit-point-to-center vector."*

**Track Agent** on why smoothed normals matter:
> *"The track's hairpin and chicane have large direction changes between adjacent segments, so the smoothing is essential — without it, the inner and outer walls would cross each other at tight turns, creating impossible-to-render and impossible-to-collide-with geometry."*

**Note:** The Integration Agent (🎨) did not log their entry. Their work on renderer.py, camera.py, hud.py, and main.py is undocumented in the build journal. A gap to address in future builds.

Full build journal in `BUILD_LOG.md`.

### Harry's Post-Build Fixes

The agent team built everything, but `python main.py` crashed on first run. Harry diagnosed and fixed **3 Arcade 3.x API compatibility issues** — the agents had used Arcade 2.x API calls that no longer exist in 3.3:

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| `arcade.ShapeElementList` not found | Moved to submodule in Arcade 3.x | Changed to `arcade.shape_list.ShapeElementList` |
| `arcade.create_line` / `create_line_strip` not found | Same submodule move | Changed to `arcade.shape_list.create_line` etc. |
| `color_list=` parameter error | Renamed in Arcade 3.x | Changed to `color_sequence=` |

After Harry's patches: **the game launched.** Window title "Top-Down Racer 01", lap counter showing, timer running.

Full issue log in `ISSUES.md`.

### First Commit
Harry pushed to GitHub as commit `3afa2356` — "Initial agent team build — Top-Down Racer 01". 18 files, agent-built source with Harry's compatibility fixes baked in.

---

## Phase Plan

### Phase 1: The Playable Game ← FIRST BUILD COMPLETE
- ✅ Track with interesting turns (24-point circuit with hairpin, S-curves, chicane)
- ✅ Car with drift mechanics (bicycle model, grip-based drift)
- ✅ Wall collisions + damage
- ✅ Camera follow with look-ahead
- ✅ HUD (speed, health, laps, drift indicator)
- ✅ Game over + restart
- ✅ Built by Agent Teams, documented in BUILD_LOG.md
- 🔄 Gameplay tuning and polish (next)

### Phase 2: AI Training
- Gymnasium environment wrapper
- Observation space: car state + ray-cast wall distances
- Action space: steering, throttle, handbrake
- Reward shaping: checkpoints, speed, laps vs. wall hits
- PPO training via Stable-Baselines3
- `watch.py` to see the AI drive

### Phase 3+: Iterate
- `top-down-racer-02` with CrewAI agent framework
- Different tracks, multiplayer AI, etc.
- Whatever sounds fun

---

## How to Run

```powershell
cd C:\Users\brigg\ai-learning-journey\projects\top-down-racer-01
.\.venv\Scripts\Activate.ps1
python main.py
```

Controls: WASD to drive, SPACE to drift, R to restart, ESC to quit.

---

## Files in This Project

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Master blueprint — Claude Code reads this automatically |
| `README.md` | Project overview |
| `QUICKSTART.md` | Step-by-step launch instructions |
| `SETUP.md` | Harry's environment setup journey |
| `PROJECT_GENESIS.md` | You are here — how we got to this point |
| `BUILD_LOG.md` | Build journal (agents wrote this during construction) |
| `ISSUES.md` | Bug log with Harry's fixes |
| `launch_team.ps1` | One-click terminal launch script |
| `requirements.txt` | Python dependencies |
| `.claude/settings.json` | Enables Agent Teams automatically |

---

## Roles

| Role | Who | What They Do |
|------|-----|-------------|
| Architect | Claude (Opus 4.6, chat) | Plans, designs, writes specs, creates CLAUDE.md |
| IT Support / Janitor | Harry 🧙 (Claude Code, terminal) | Library installs, environment fixes, compatibility patches |
| Builder | Claude Code (VS Code, Agent Teams) | Writes all game code via 4 specialized agents |
| Test Driver / Boss | Briggs | Plays the game, gives feedback, makes decisions |

---

*Planned by Claude Opus 4.6 (chat) × Built by Claude Code Agent Teams × Fixed by Harry 🧙 × Driven by Briggs*
