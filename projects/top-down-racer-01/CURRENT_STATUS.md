# 🏎️ Top-Down Racer 01 — Current Status

**Last Updated:** February 22, 2026  
**Status:** Phase 1 — First build complete, gameplay tuning needed

---

## Where We Are

The game exists and runs. Four AI agents built it from scratch using Claude Code Agent Teams via VS Code. Harry (Claude Code in terminal) fixed 3 Arcade API compatibility bugs post-build. The game launches, the car drives, the track renders, the camera follows, the HUD works. Commit `3afa2356` is on GitHub.

**The full backstory is in `PROJECT_GENESIS.md`.** Read that first for context on every decision that got us here.

---

## What Works
- Game launches with `python main.py`
- Car drives with WASD
- Spacebar triggers drift
- Camera follows the car
- Track renders with walls and checkpoints
- HUD shows speed, health, lap counter, timer
- Game over screen when health hits 0
- R to restart

## What Needs Fixing

### 🔴 Priority 1: Wall Damage Is Insane
**The Problem:** Any wall contact at any meaningful speed is basically instant death. The game is unplayable because you can't survive a single mistake.

**Root Cause (from BUILD_LOG.md):** The Foundation Agent intentionally tuned damage to be brutal:
- `wall_damage_multiplier: 0.5` in `configs/default.yaml`
- `min_damage_speed: 50` (threshold before damage applies)
- `max_health: 100`
- Formula: `damage = (impact_speed - 50) * 0.5`
- At 200 px/s: 75 damage. At 250+ px/s: dead. At full speed (400 px/s): 175 damage — instant kill.

**Suggested Fix:** Tune values in `configs/default.yaml`. Some options:
- Lower `wall_damage_multiplier` to 0.1 or 0.15 (most impactful change)
- Raise `max_health` to 200 or 300
- Raise `min_damage_speed` to 100 or 150
- Some combination of all three
- Goal: walls should hurt and punish bad driving, but a single graze shouldn't end the run

### 🟡 Priority 2: General Gameplay Feel (TBD)
Briggs's early impression is "good" but he couldn't play long enough to fully evaluate because of the damage issue. Once damage is tuned, need feedback on:
- Does steering feel responsive enough?
- Does drift feel satisfying (Tokyo drift vibe)?
- Is the track fun? Too easy? Too hard?
- Camera feel — smooth enough? Too laggy?
- Is the car visually clear (can you tell front from back)?
- Any other collision weirdness?

### 🟡 Priority 3: Integration Agent Didn't Log
The 🎨 Integration Agent never wrote to `BUILD_LOG.md`. Three of four agents logged their work. Minor process issue — note for future builds.

---

## How to Make Changes

### Quick Config Tweaks (no code changes)
Edit `configs/default.yaml` and re-run `python main.py`. All physics values, damage, track width, colors, camera behavior — everything is config-driven. This is the fastest way to iterate on game feel.

### Code Changes
Tell Claude Code in VS Code what to fix. It reads `CLAUDE.md` automatically for project context. For targeted fixes, just describe the problem — e.g., "Wall damage is too high, tune it so the player can survive multiple wall hits."

### Harry (Terminal Claude Code)
Available for library installs, environment fixes, git operations. Don't use him for game code — that's the VS Code builder's job.

---

## Architecture Reminder (for new chats)

```
configs/default.yaml  ← ALL tunable values live here
game/car.py           ← Car physics, drift, damage (NO arcade imports)
game/track.py         ← Track geometry, walls, checkpoints
game/physics.py       ← Collision detection, resolution, ray casting
game/camera.py        ← Smooth follow camera
game/hud.py           ← Speed, health, laps, timer
game/renderer.py      ← Main game View (arcade.View), draws everything
main.py               ← Entry point
```

Game logic (car, track, physics) is completely separate from rendering. This is intentional — Phase 2 AI training runs the game logic headlessly without Arcade.

---

## What's Next
1. **Fix wall damage** — make the game survivable
2. **Playtest and tune** — steering, drift feel, track difficulty, camera
3. **Polish** — any visual or gameplay improvements
4. **Phase 2** — Gymnasium wrapper, AI training with PPO, `watch.py` to see AI drive

---

## Team
- **Architect:** Claude (Opus 4.6, chat interface) — designs specs, writes project docs
- **Builder:** Claude Code (VS Code extension) — writes game code
- **IT Support:** Harry 🧙 (Claude Code, terminal) — library installs, env fixes, git
- **Test Driver / Boss:** Briggs — plays the game, gives feedback, makes decisions
