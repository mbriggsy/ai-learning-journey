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

## Phase 2 — AI Training (In Progress)

The game is wrapped as a Gymnasium environment and trained with PPO via Stable-Baselines3.

### Architecture
- **Observation space:** 21-dim float32 vector -- 13 ray-cast distances (240-degree forward fan including 0-degree center ray) + 5 car state values (speed, angular velocity, drift flag, health, angle-to-next-checkpoint) + 3 track curvature lookahead values (turn sharpness at 1/2/3 centerline points ahead), all normalized to [0, 1]
- **Action space:** 3-dim continuous (steering, throttle, drift) → quantized to binary key inputs for the existing car physics
- **Reward shaping:** Dense breadcrumb checkpoints (~50 per lap), speed bonus, smooth steering bonus, wall damage penalty, stuck/death penalty
- **Training:** PPO with 8 parallel SubprocVecEnv workers, all hyperparams in `configs/default.yaml`

### Training Runs

| Model | Steps | Result | Key Issue |
|-------|-------|--------|-----------|
| richard_petty_v1 | 500K | Baby model, random flailing | Too few steps (pipeline validation only) |
| richard_petty_v2 | 2M | Drives but stuck near start | Episodes not completing, ep_rew_mean never appeared |
| richard_petty_v3 | 5M | **Worse** — exploited rewards | Entropy collapsed to ~0, agent oscillated near wall for easy reward |
| richard_petty_v4 | 5M | **In progress** | Added ent_coef=0.01, reduced wall penalty 2.0->0.8 |
| richard_petty_v5 | 3.16M (killed) | **Wall-hugging exploit** | Speed reward let AI pin against wall + hold gas for free reward |
| richard_petty_v6 | 1.5M (killed) | **Wall-riding, no progress** | Forward progress reward working but car still hugs walls; breadcrumb chain locks on miss |
| richard_petty_v7 | 1.34M (killed) | **Lateral penalty too aggressive** | ep_rew_mean stuck at -350, entropy collapsed to -6.0, lateral penalty drowned out positive signals |
| richard_petty_v8 | 1.77M (killed) | **Blind to corners** | Drives straights well, crashes at first zigzag -- no curvature info in obs space |
| richard_petty_v9 | 1.45M (killed at 29%) | **Curvature obs unused** | Car has curvature lookahead but never learned to slow down -- no reward signal linking curvature to speed |
| richard_petty_v10 | (planned) | -- | Corner speed penalty + stuck timeout 4s -- forces association between curvature obs and braking |

### Key Lessons So Far
1. **Reward hacking is real.** The AI found the easiest path to reward (oscillating near a breadcrumb) rather than actually driving the track.
2. **Entropy collapse kills exploration.** With SB3's default `ent_coef=0.0`, the policy locked into a bad strategy by 50% through training and never escaped.
3. **Penalties must be survivable.** Too-harsh wall damage (2.0x) caused instant death, preventing the agent from learning from mistakes.
4. **Good value function ≠ good policy.** `explained_variance` 0.9+ just means the critic accurately predicts returns from the exploit strategy.
5. **You can't debug RL blind.** Fixing watch.py (Issue #005) to visualize the agent was essential for diagnosing problems.
6. **Direction-agnostic rewards get exploited.** Speed reward (`abs(speed) * scale`) rewards wheels spinning against a wall. Replace with direction-aware progress along the track centerline.
7. **Forward progress alone doesn't prevent wall-riding.** A car hugging the wall can still make forward progress along the centerline. Need lateral displacement penalty to push the car toward the center of the road.
8. **Sequential reward chains must handle missed links.** If one breadcrumb in a sequential chain is missed, the entire chain goes dark. Auto-advance prevents this from killing the reward signal for the rest of the episode.

### AI Files
```
ai/
├── racing_env.py           # Gymnasium environment wrapper
├── observations.py         # Ray casting + observation space (21-dim)
├── rewards.py              # Reward function (8 components, all configurable)
├── train.py                # PPO training script (SB3 + SubprocVecEnv)
├── watch.py                # Watch trained AI play (Arcade visualization)
├── evaluate.py             # Headless evaluation + stats
├── watch_renderer.py       # Render utilities for watch mode
└── training_checkpoints.py # Dense breadcrumb system for reward shaping
```

### Running

```bash
# Train a new model
python ai/train.py

# Watch the AI drive
python ai/watch.py

# Evaluate over N episodes
python ai/evaluate.py --episodes 50
```

## Build Method
Built using Claude Code Agent Teams — 4 specialized agents + 1 team lead.
See `BUILD_LOG.md` for the full build journal and `ISSUES.md` for the bug log.
