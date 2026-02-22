# Top-Down Racer 01 🏎️💨

A 2D top-down racing game with drift mechanics, built in Python with Arcade + pymunk, designed to eventually be trained by a reinforcement learning AI.

**Philosophy:** Over-engineer on purpose. This is a learning lab. Try every approach, build an arsenal of knowledge.

## The Game

### Track
- Closed loop circuit with interesting turns (hairpins, S-curves, straights)
- Inner/outer wall boundaries with collision detection
- Checkpoints for lap counting

### Car
- Top-down 2D physics with bicycle steering model
- **Drift mechanic**: handbrake drops rear grip → lateral slide → tire marks
- **Damage system**: wall hits reduce health based on impact speed → game over at 0

### Controls
WASD + Spacebar (drift) | R to restart | ESC to quit

## Tech Stack

| Layer | Tool | Purpose |
|-------|------|---------|
| Game engine | Arcade 3.3 | Rendering, camera, input |
| Physics | pymunk 6.9 | Available for collision shapes |
| Math | NumPy | Vector operations, ray casting |
| Config | PyYAML | Tunable parameters |
| RL (Phase 2) | Gymnasium + SB3 + PyTorch | AI training |

## Phase 2 (Future)
- Gymnasium environment wrapper with ray-cast observations
- PPO training via Stable-Baselines3
- Watch trained AI play the game

## Build Method
Built using Claude Code Agent Teams — 4 specialized agents + 1 team lead.
See `BUILD_LOG.md` for the full build journal.
