# 🏎️ Phase 2: Teaching Richard Petty to Drive

**Date:** February 22, 2026  
**Architect:** Claude (Opus 4.6, chat interface)  
**Builder:** Claude Code (VS Code extension)  
**Project:** Top-Down Racer 01

---

## The Goal

Train a reinforcement learning AI — codename **Richard Petty** — to race the track. Not memorize it. *Drive* it. Drop Richard on any track and he should read the road and react, not replay a memorized script.

This means: the AI sees the world through "eyes" (ray casts), not through coordinates or checkpoint indices. It learns *how to drive*, not *where to turn*.

---

## Critical Design Principle: Vision, Not Memory

The AI must generalize across tracks. Every design decision flows from this:

- ✅ Ray cast distances (what's in front of me?)
- ✅ Car speed, angular velocity, drift state (what am I doing?)
- ✅ Direction to next checkpoint as relative angle (which way should I go?)
- ❌ NO absolute position (x, y on the track)
- ❌ NO checkpoint index or track progress percentage
- ❌ NO track-specific data of any kind

If we do this right, Richard Petty trained on Track A should be able to race Track B with minimal or zero retraining.

---

## Architecture Overview

```
game/                          ← Existing game logic (minimal changes)
    car.py                     ← Car physics, drift, damage
    track.py                   ← Track geometry, walls, checkpoints
                                  + NEW: generate_training_checkpoints()
    physics.py                 ← Collision detection, ray casting
    camera.py                  ← (not used in training)
    hud.py                     ← (not used in training)
    renderer.py                ← (not used in training)

ai/                            ← NEW — All Phase 2 code lives here
    racing_env.py              ← Gymnasium environment wrapper
    observations.py            ← Ray casting + observation space builder
    rewards.py                 ← Reward function (separated for easy tuning)
    train.py                   ← Training script (PPO via Stable-Baselines3)
    watch.py                   ← Load trained model, render it driving
    evaluate.py                ← Run model N times, report stats

models/                        ← NEW — Saved trained models
    richard_petty_v1.zip       ← (output of training)

configs/default.yaml           ← Add AI training params to existing config
```

The key insight from Phase 1 architecture: **game logic is already separated from rendering.** The `car.py`, `track.py`, and `physics.py` modules have zero Arcade imports. The Gymnasium wrapper just talks to these directly — no window, no rendering, pure math. This is exactly why we built it that way.

---

## Dense Training Checkpoints (The Breadcrumb System)

### The Problem with Sparse Checkpoints
Phase 1 has a handful of checkpoints for lap counting. That's fine for humans, but terrible for AI training. If checkpoints are far apart, Richard goes hundreds of steps between rewards. He has no idea which of his 500 actions between checkpoint A and checkpoint B actually helped. This is the **sparse reward problem** — the #1 killer of RL training runs.

### The Solution: Invisible Breadcrumbs
Add a dense layer of **AI-only training checkpoints** along the entire track centerline. These are invisible to the player, never rendered, and exist purely as reward signals for Richard Petty.

**Density target:** One checkpoint every ~150-200 pixels of track centerline. For a typical track, this means **40-60 training checkpoints** per lap. In tight zigzag sections, pack them even tighter (~100-120 pixels apart) so the AI gets rapid-fire "yes, good, turn NOW, yes, keep turning" feedback through every switchback.

### How They Work
- **Generated automatically** from the track centerline — not hand-placed. Walk the centerline path, drop a checkpoint every N pixels. This means they work on ANY track geometry with zero manual effort.
- **Invisible** — no rendering, no HUD display. The human game is unchanged.
- **Sequential** — Richard must hit them in order. No skipping ahead, no going backward for free rewards. The env tracks which training checkpoint is "next."
- **Wrap around** — after the last checkpoint, the next one is the first again (lap complete).
- **Separate from gameplay checkpoints** — Phase 1's existing checkpoints stay for lap counting and player HUD. The training checkpoints are a parallel system used only by the Gymnasium env.

### Why This Changes Everything
With sparse checkpoints (4-6 per lap), Richard might need 2-5 million timesteps to learn anything useful. With dense checkpoints (40-60 per lap), he gets a reward signal every ~2-3 seconds of driving. The gradient from "I'm pointing toward the next breadcrumb" to "I just hit it, reward!" is short and clear. Training should converge in 500K-1M steps instead of millions.

Dense checkpoints also teach better cornering naturally. In a tight turn, there are 3-4 breadcrumbs guiding Richard through the arc. He can't just aim at a single distant point and blast straight — he has to follow the curve to collect each one.

### Implementation
Add to `game/track.py` (or a new `game/training_checkpoints.py`):

```python
def generate_training_checkpoints(centerline_points, spacing=150):
    """
    Walk the track centerline and drop checkpoints at regular intervals.
    Returns list of (x, y) positions.

    Args:
        centerline_points: ordered list of (x,y) defining the track center
        spacing: pixels between checkpoints (tighter = more breadcrumbs)
    """
    checkpoints = []
    accumulated_dist = 0.0
    checkpoints.append(centerline_points[0])

    for i in range(1, len(centerline_points)):
        segment_dist = distance(centerline_points[i-1], centerline_points[i])
        accumulated_dist += segment_dist
        if accumulated_dist >= spacing:
            checkpoints.append(centerline_points[i])
            accumulated_dist = 0.0

    return checkpoints
```

### Config (add to `configs/default.yaml` under `ai:`)

```yaml
ai:
  # Training checkpoints (breadcrumbs)
  training_checkpoint_spacing: 150    # pixels between checkpoints
  training_checkpoint_radius: 40      # how close the car must get to "hit" one
  zigzag_spacing_multiplier: 0.7      # tighter spacing in high-curvature sections
```

---

## The Gymnasium Environment (`ai/racing_env.py`)

### Overview
A standard `gymnasium.Env` subclass that wraps the game logic. Each `step()` advances the simulation one tick, applies the AI's chosen action, and returns what the AI sees + its reward.

### Observation Space (Richard Petty's Eyes)

```python
observation_space = gym.spaces.Box(
    low=0.0, high=1.0,
    shape=(num_rays + 5,),   # e.g., 12 rays + 5 state values = 17
    dtype=np.float32
)
```

**Ray Casts (12 rays):**
Fan of rays emanating from the car, spread across ~240° in front (slightly behind on each side). Each ray returns the normalized distance to the nearest wall.

```
Ray angles (relative to car heading):
-120°, -100°, -75°, -50°, -30°, -10°, +10°, +30°, +50°, +75°, +100°, +120°

         -10° +10°         ← nearly forward
        /       \
      -30°       +30°      ← slight angles
      /             \
   -50°               +50° ← medium angles
   /                     \
 -75°                     +75°
 /                           \
-100°                       +100°
|                               |
-120°                       +120° ← just past the sides
```

Each ray value = `distance_to_wall / max_ray_distance`, clamped to [0.0, 1.0].
- 0.0 = wall is RIGHT THERE
- 1.0 = no wall detected within range (clear road ahead)

`max_ray_distance` should be configurable (start with ~300-400 pixels — enough to see upcoming turns).

**Car State (5 values), all normalized to [0.0, 1.0]:**

| Index | Value | Normalization |
|-------|-------|---------------|
| 0 | Speed | `speed / max_speed` |
| 1 | Angular velocity | `(angular_vel + max_angular_vel) / (2 * max_angular_vel)` → 0.5 = straight |
| 2 | Drift state | 0.0 = no drift, 1.0 = full drift |
| 3 | Health | `health / max_health` |
| 4 | Angle to next checkpoint | `(angle + π) / (2π)` → 0.5 = pointing straight at it |

**Why angle to next checkpoint?** This is the ONE piece of "where should I go" info we give the AI. It's a relative angle — "the next training checkpoint (breadcrumb) is 30° to my right" — not an absolute position. It works on any track because training checkpoints are auto-generated from ANY track's centerline. Without this, the AI has no idea which direction "forward" is and would just learn to sit still or drive in circles. With dense breadcrumbs (~150px apart), this angle updates frequently and guides Richard smoothly through every curve.

### Action Space

```python
action_space = gym.spaces.Box(
    low=np.array([-1.0, -1.0, 0.0]),
    high=np.array([1.0, 1.0, 1.0]),
    dtype=np.float32
)
```

| Index | Action | Range | Meaning |
|-------|--------|-------|---------|
| 0 | Steering | -1.0 to 1.0 | Full left ↔ Full right |
| 1 | Throttle | -1.0 to 1.0 | Full brake/reverse ↔ Full throttle |
| 2 | Drift | 0.0 to 1.0 | > 0.5 = handbrake engaged |

Continuous actions = smooth, human-like driving. The AI can feather the throttle and ease into turns instead of jerking between full-left and full-right.

### Episode Termination

An episode ends when:
- **Health reaches 0** (crashed too many times)
- **Lap completed** (optional — could also let it keep going for multi-lap training)
- **Time limit reached** (e.g., 60 seconds — prevents the AI from learning to sit still)
- **Car is stuck** (speed < threshold for N consecutive steps)

---

## Reward Function (`ai/rewards.py`)

This is the most important and most tunable part. Separate file so we can iterate without touching anything else.

### Reward Components

```python
def compute_reward(prev_state, curr_state, action, info):
    reward = 0.0

    # 1. TRAINING CHECKPOINT (primary reward — the breadcrumbs)
    #    Frequent, moderate reward for hitting the next breadcrumb.
    #    With ~40-60 per lap, this fires every few seconds of driving.
    #    Kept moderate per hit so the total lap reward stays balanced.
    if info["training_checkpoint_reached"]:
        reward += 2.0

    # 2. LAP COMPLETION BONUS
    #    Extra reward on top of the final breadcrumb for completing a full lap.
    if info["lap_completed"]:
        reward += 20.0

    # 3. SPEED REWARD (encourage driving, not sitting)
    #    Small continuous reward proportional to speed
    #    Only when generally pointing toward next breadcrumb (not rewarding fast wrong-way driving)
    speed_reward = (curr_state.speed / max_speed) * 0.1
    reward += speed_reward

    # 4. WALL HIT PENALTY
    #    Proportional to damage taken this step
    if info["wall_damage"] > 0:
        reward -= info["wall_damage"] * 0.5

    # 5. DEATH PENALTY
    #    Big negative for dying
    if info["dead"]:
        reward -= 20.0

    # 6. TIME PENALTY (small, constant)
    #    Slight negative each step to encourage efficiency
    reward -= 0.01

    # 7. SMOOTH DRIVING BONUS (optional, helps with quality)
    #    Small reward for not jerking the steering
    steering_change = abs(action[0] - prev_action[0])
    if steering_change < 0.1:
        reward += 0.01

    return reward
```

### Reward Math (Why These Numbers)

With ~50 training checkpoints per lap:
- Breadcrumb rewards per lap: ~50 × 2.0 = **100 points**
- Lap completion bonus: **20 points**
- Speed bonus per lap (~30 sec): ~1800 steps × 0.1 = ~**180 points** (at full speed, less realistically)
- Time penalty per lap: ~1800 × 0.01 = **-18 points**

A clean, fast lap ≈ **+280 points.** A lap with several wall hits ≈ **+200 points.** Dying halfway through ≈ **+30 points then -20.** Sitting still ≈ **-18 points per 30 seconds.** The incentive structure is clear: drive fast, hit breadcrumbs, don't crash.

### Reward Tuning Philosophy

The reward values above are starting points. The ratios matter more than absolute values:
- Training checkpoint (breadcrumb) rewards are the **primary learning signal** — frequent and reliable
- Lap completion bonus is the **celebration** — reinforces "finishing is good"
- Wall penalty should hurt but not overshadow breadcrumb progress (one wall hit ≈ losing 2-3 breadcrumbs worth of reward)
- Speed reward keeps the car moving but shouldn't encourage recklessness
- Death penalty should be significant but the AI shouldn't become so risk-averse it barely moves
- Time penalty prevents "just sit there" strategies

All reward weights should live in `configs/default.yaml` under an `ai:` section so we can tune without code changes.

---

## Training Script (`ai/train.py`)

```python
# Pseudocode structure
from stable_baselines3 import PPO
from stable_baselines3.common.vec_env import SubprocVecEnv
from ai.racing_env import RacingEnv

def make_env():
    return RacingEnv(config_path="configs/default.yaml")

if __name__ == "__main__":
    # Parallel environments for faster training
    num_envs = 8  # sweet spot for CPU training
    env = SubprocVecEnv([make_env for _ in range(num_envs)])

    model = PPO(
        "MlpPolicy",
        env,
        learning_rate=3e-4,
        n_steps=2048,
        batch_size=64,
        n_epochs=10,
        gamma=0.99,            # discount factor
        gae_lambda=0.95,       # GAE parameter
        clip_range=0.2,        # PPO clip
        verbose=1,
        tensorboard_log="./logs/richard_petty/"
    )

    # Train for N timesteps (start with 500K, scale up)
    model.learn(total_timesteps=500_000)

    # Save the model
    model.save("models/richard_petty_v1")
```

### Training Config (add to `configs/default.yaml`)

```yaml
ai:
  # Ray casting
  num_rays: 12
  ray_spread_degrees: 240
  max_ray_distance: 400

  # Training checkpoints (breadcrumbs)
  training_checkpoint_spacing: 150    # pixels between breadcrumbs on centerline
  training_checkpoint_radius: 40      # how close car must be to "collect" one
  zigzag_spacing_multiplier: 0.7      # tighter spacing in high-curvature sections

  # Training
  num_parallel_envs: 8
  total_timesteps: 500000
  learning_rate: 0.0003
  n_steps: 2048
  batch_size: 64
  n_epochs: 10
  gamma: 0.99
  gae_lambda: 0.95
  clip_range: 0.2

  # Episode limits
  max_episode_seconds: 60
  stuck_speed_threshold: 5
  stuck_steps_limit: 120    # ~2 seconds at 60fps

  # Rewards
  training_checkpoint_reward: 2.0     # per breadcrumb (~50 per lap)
  lap_completion_bonus: 20.0          # extra reward for finishing a lap
  speed_reward_scale: 0.1
  wall_damage_penalty_scale: 0.5
  death_penalty: 20.0
  time_penalty: 0.01
  smooth_steering_bonus: 0.01
```

---

## Watch Script (`ai/watch.py`)

The payoff. Load a trained model and watch Richard Petty drive with the full Arcade renderer.

```python
# Pseudocode structure
from stable_baselines3 import PPO
from ai.racing_env import RacingEnv
from game.renderer import GameView  # or however the Arcade view works

def watch(model_path="models/richard_petty_v1"):
    model = PPO.load(model_path)
    env = RacingEnv(config_path="configs/default.yaml", render_mode="human")

    obs, info = env.reset()
    while True:
        action, _ = model.predict(obs, deterministic=True)
        obs, reward, terminated, truncated, info = env.step(action)
        env.render()  # Arcade window shows the AI driving
        if terminated or truncated:
            obs, info = env.reset()
```

### Visualization Extras (nice to have)

- **Ray cast visualization:** Draw the 12 ray lines from the car so you can SEE what the AI sees. Green rays = far from wall, red rays = close. This is incredibly satisfying to watch.
- **Breadcrumb visualization:** Show the training checkpoints as faint dots on track. Highlight the "next" one so you can see what Richard is aiming for. Light them up as he collects them. Very satisfying.
- **Decision overlay:** Show steering/throttle/drift values as a mini HUD
- **Speed of playback:** Option to run at 2x, 4x speed for fast evaluation

---

## Evaluation Script (`ai/evaluate.py`)

Run the model N times without rendering and report stats:
- Average laps completed
- Average time per lap
- Average wall hits per lap
- Survival rate (% of runs where it finishes a lap without dying)
- Average reward per episode

This is how we objectively measure if Richard Petty is getting better across training runs.

---

## Implementation Order

Build and test in this order:

### Step 1: Dense Training Checkpoints
Generate the breadcrumb system from the track centerline. Add `generate_training_checkpoints()` to `game/track.py` (or new file). Test by temporarily rendering them as small dots in the game — verify they follow the centerline through every turn, are spaced correctly, and are denser in tight curves. Remove visualization after verification (or keep it behind a debug flag).

### Step 2: Ray Casting (`ai/observations.py`)
Add ray casting to `game/physics.py` (or keep it in the ai module if we prefer separation). Test it visually — temporarily draw the rays in the game renderer to verify they work correctly. This is the foundation of everything.

### Step 3: Gymnasium Environment (`ai/racing_env.py`)
Wrap the game loop. Integrate training checkpoints as the reward source. Verify with `gymnasium.utils.env_checker.check_env()` — this catches 90% of bugs before training starts. Test with random actions to make sure the env resets properly, observations are in range, training checkpoints advance correctly, etc.

### Step 4: Reward Function (`ai/rewards.py`)
Implement rewards with the dense breadcrumb system. Test by playing the game yourself and printing reward values — do they make intuitive sense? Hitting a breadcrumb should feel frequent and positive, hitting a wall should sting, completing a lap should feel like a big win.

### Step 5: Training (`ai/train.py`)
Start training. First 500K steps. Watch the tensorboard logs. Is reward trending up? With dense breadcrumbs, you should see improvement within the first 50-100K steps. If it plateaus early, the reward function probably needs tuning.

### Step 6: Watch and Evaluate
Load the model in `watch.py`. Celebrate or despair. Run `evaluate.py` for hard numbers. Tune and retrain.

---

## Dependencies to Install (Harry's Job)

```bash
pip install gymnasium stable-baselines3 tensorboard
```

PyTorch should come as a dependency of stable-baselines3. CPU-only is fine — this isn't a massive neural net, PPO on a simple observation space trains fast on CPU.

---

## Potential Gotchas

1. **Physics timestep consistency:** The Gymnasium env needs to step the game physics at a fixed rate, independent of rendering. Make sure the game loop already does this (it should, since Arcade uses a fixed update).

2. **Observation normalization:** Everything MUST be in [0, 1] range. PPO is sensitive to observation scale. If one value is 0-400 and another is 0-1, training will be wonky.

3. **Reward scale:** If rewards are too large, training can become unstable. If too small, learning is slow. The values above are reasonable starting points but expect to tune them.

4. **Episode length:** Too short and the AI can't learn long-term strategy. Too long and training is slow. 60 seconds is a good start.

5. **Stuck detection:** Without this, the AI might learn that "don't move = don't die = decent reward." The time penalty helps, but explicit stuck detection is the safety net.

6. **Ray cast performance:** 12 rays × 8 parallel envs × thousands of steps. The ray casting needs to be fast. NumPy vectorization is your friend. Don't do it in pure Python loops.

7. **Training checkpoint radius too small:** If the car has to practically drive over the exact pixel to "collect" a breadcrumb, it might miss them at high speed. Start with a radius of ~40px and increase if needed. The car should reliably hit them when driving down the center of the track.

8. **Training checkpoint generation on track changes:** If the track geometry changes (like the width update currently in progress), the training checkpoints need to be regenerated. They should be generated at runtime from the track centerline, NOT pre-computed and stored. This keeps them in sync automatically.

---

## Success Criteria

**Level 1 — It Drives:** Richard Petty completes a lap without dying. Even if it's ugly and slow, this is a huge milestone.

**Level 2 — It's Competent:** Consistently completes laps, takes reasonable lines through corners, rarely hits walls.

**Level 3 — It's Fast:** Completes laps close to human time, uses drift in corners, finds efficient racing lines.

**Level 4 — It Transfers:** Drop Richard on a new track (different geometry, same physics). If he can complete a lap on a track he's never seen, we've achieved the goal.

**Level 5 — It's Better Than Us:** Richard Petty beats Briggs's best lap time. At this point, we've created a monster and should be both proud and slightly unsettled.

---

*"If you ain't first, you're last." — Ricky Bobby (close enough to Richard Petty)*

*Designed by Claude Opus 4.6 (chat) × To be built by Claude Code × Named by Briggs*
