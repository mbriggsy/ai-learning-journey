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

### Game Engine: Arcade (not Pygame)

**Who decided:** Harry, independently during initial setup.  
**Why it stuck:** Arcade has built-in camera/viewport panning, pymunk physics comes bundled, and it's less boilerplate for a top-down racer. The architect (chat Claude) agreed it was the better call.

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

### Config-Driven Everything
All tunable values live in `configs/default.yaml`. Car speed, drift grip, damage multipliers, track shape, colors — everything. No magic numbers in code. This means you can tweak the game feel without touching a single line of Python.

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
| Math | NumPy | latest | Vector ops, ray casting |
| Config | PyYAML | latest | Parameter loading |
| RL env (Phase 2) | Gymnasium | — | Standard RL interface |
| RL training (Phase 2) | Stable-Baselines3 | — | PPO algorithm |
| Neural net (Phase 2) | PyTorch (CPU) | — | Under the hood |

---

## Phase Plan

### Phase 1: The Playable Game ← WE ARE HERE
- Track with interesting turns
- Car with drift mechanics
- Wall collisions + damage
- Camera follow
- HUD (speed, health, laps)
- Game over + restart
- **Built by Agent Teams, documented in BUILD_LOG.md**

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

## Environment Setup (What Harry Did)

Harry's full setup journey is documented in `SETUP.md`. The highlights:

1. Python 3.14 was installed but too new — CrewAI and other packages couldn't compile
2. Installed Python 3.12.10 alongside 3.14
3. Created `.venv` with `py -3.12 -m venv .venv`
4. Installed Rust 1.93.1 (needed for some compiled packages)
5. Installed: arcade, pymunk, crewai, anthropic, python-dotenv, numpy, pyyaml

Project lives at: `C:\Users\brigg\ai-learning-journey\projects\top-down-racer-01\`

---

## How to Run the Build

```powershell
cd C:\Users\brigg\ai-learning-journey\projects\top-down-racer-01
.\.venv\Scripts\Activate.ps1
```

Open VS Code → Claude Code → paste the prompt from `QUICKSTART.md`.

Or from terminal:
```powershell
.\launch_team.ps1
```

---

## Files in This Project

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Master blueprint — Claude Code reads this automatically |
| `README.md` | Project overview |
| `QUICKSTART.md` | Step-by-step launch instructions |
| `SETUP.md` | Harry's environment setup journey |
| `PROJECT_GENESIS.md` | You are here — how we got to this point |
| `BUILD_LOG.md` | Build journal (agents write this during construction) |
| `launch_team.ps1` | One-click terminal launch script |
| `requirements.txt` | Python dependencies |
| `.claude/settings.json` | Enables Agent Teams automatically |

---

*Planned by Claude Opus 4.6 (chat) × Built by Claude Code Agent Teams × Driven by Briggs*
