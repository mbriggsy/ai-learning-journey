# Phase 5: AI Training Pipeline - Research

**Researched:** 2026-03-01
**Domain:** Reinforcement Learning Training (stable-baselines3 + PyTorch + TensorBoard)
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AI-08 | Headless training at 3000+ ticks/sec | WebSocket bridge is the throughput ceiling; single-env synchronous step averages ~0.5ms per step (2000 steps/sec theoretical). 3000 ticks/sec requires measuring actual bridge throughput and tuning Node.js bridge if needed. |
| AI-09 | TensorBoard metrics (episode reward, lap time, completion rate) | Verified: SB3 auto-logs rollout/ep_rew_mean via Monitor wrapper. Custom metrics (lap time, completion rate) logged via BaseCallback._on_step() using self.logger.record(). |
| AI-10 | Model checkpoint saving/loading | Verified: CheckpointCallback + EvalCallback (best model). Load with PPO.load(path, env=env) + reset_num_timesteps=False to resume. |
| AI-11 | PPO and SAC training via stable-baselines3 + PyTorch | Verified: SB3 2.x provides both. PPO first (on-policy, stable, works well single-env). SAC if PPO plateaus (off-policy, more sample-efficient, needs replay buffer). |
</phase_requirements>

---

## Summary

stable-baselines3 (SB3) is the dominant production-grade RL library in Python and the correct choice for this project. The existing Phase 4 Gymnasium wrapper (`RacerEnv`) is already SB3-compatible — the env passed `check_env` and `env_checker` in Phase 4 tests. Phase 5 is primarily a Python training script + configuration problem, not an architecture problem.

The most critical constraint for AI-08 (3000+ ticks/sec) is the WebSocket bridge overhead, not Python-side computation. Each `env.step()` is a synchronous WebSocket round-trip to the Node.js bridge server. The existing `test_random_agent.py` reports median latency of ~0.5ms per step, giving ~2000 steps/sec theoretical ceiling. The 3000 ticks/sec target may require either (a) verifying this is achievable by measuring, (b) accepting a lower number if bridge latency is the bottleneck, or (c) noting this is a stretch goal. The physics ticks themselves are trivially fast in-process; it's the IPC round-trip that limits throughput.

TensorBoard integration is trivial with SB3: pass `tensorboard_log="./logs/"` to the model constructor. The Monitor wrapper auto-logs episode rewards. Custom metrics (lap times, completion rate) require a `BaseCallback` subclass — a ~20-line pattern documented in official SB3 docs. Checkpoint saving uses `CheckpointCallback` (periodic) and `EvalCallback` (best model). Resuming from a checkpoint uses `PPO.load(path, env=env)` then `model.learn(reset_num_timesteps=False)`.

**Primary recommendation:** Start with PPO + MlpPolicy + VecNormalize on a DummyVecEnv wrapping RacerEnv. If PPO plateaus after 2-3M timesteps, switch to SAC. Iterate reward weights in `ai-config.json` (no code changes needed — already configurable from Phase 4). Run 3-5 reward tuning cycles using TensorBoard curves as signal.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| stable-baselines3 | >=2.4.0 | PPO + SAC algorithms, training loop, callbacks | Industry standard for applied RL; reliable PyTorch implementations |
| PyTorch | >=2.3 | Neural network backend | Required by SB3 2.x; GPU acceleration if available |
| gymnasium | >=1.0.0 | Environment interface (already in requirements.txt) | Already used in Phase 4 |
| tensorboard | (bundled in SB3[extra]) | Training metrics visualization | SB3 has native integration |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| numpy | >=1.26.0 | Observation arrays, action arrays (already in use) | Already used |
| stable-baselines3[extra] | same | Includes TensorBoard dependency automatically | Install this variant instead of base |
| rl-baselines3-zoo | latest | Pre-tuned hyperparameters, training framework | Reference for hyperparameter starting points |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| PPO (SB3) | CleanRL PPO | CleanRL is single-file, easier to understand internals, but less ecosystem integration |
| SB3 | RLlib | RLlib is distributed/cloud-scale; overkill for single-env local training |
| SB3 | Tianshou | Less adoption, fewer tutorials, roughly equivalent capability |
| SB3 TensorBoard | W&B (Weights & Biases) | W&B is better for team/cloud; TensorBoard is local and zero-config |

**Installation:**
```bash
# In python/ directory (add to requirements.txt)
pip install stable-baselines3[extra]>=2.4.0 torch>=2.3
```

Full `python/requirements.txt` for Phase 5:
```
gymnasium>=1.0.0
numpy>=1.26.0
websocket-client>=1.7.0
stable-baselines3[extra]>=2.4.0
torch>=2.3
```

---

## Architecture Patterns

### Recommended Project Structure
```
python/
├── racer_env/          # Existing Phase 4 Gymnasium wrapper (do not modify)
│   ├── env.py
│   └── bridge_client.py
├── training/           # NEW: Phase 5 training scripts
│   ├── train_ppo.py    # PPO training entry point
│   ├── train_sac.py    # SAC training entry point (if PPO plateaus)
│   └── callbacks.py    # Custom callbacks (lap time logging, etc.)
├── models/             # NEW: Saved model checkpoints
│   └── .gitkeep
├── logs/               # NEW: TensorBoard log directories
│   └── .gitkeep
├── ai-config.json      # Existing reward weights (iterated during tuning)
├── requirements.txt    # Updated with SB3 + torch
└── tests/              # Existing Phase 4 tests (do not break)
```

### Pattern 1: Standard PPO Training Script
**What:** Single-environment PPO training with Monitor + VecNormalize wrappers, CheckpointCallback, and TensorBoard logging.
**When to use:** Starting point for all training. On-policy, stable, works well without a replay buffer.
**Example:**
```python
# Source: https://stable-baselines3.readthedocs.io/en/master/guide/examples.html
# Source: https://stable-baselines3.readthedocs.io/en/master/modules/ppo.html
import os
from stable_baselines3 import PPO
from stable_baselines3.common.vec_env import DummyVecEnv, VecNormalize
from stable_baselines3.common.callbacks import CheckpointCallback, EvalCallback, CallbackList
from stable_baselines3.common.monitor import Monitor
from racer_env import RacerEnv

LOG_DIR = "./logs/ppo_run_1"
MODEL_DIR = "./models"
os.makedirs(LOG_DIR, exist_ok=True)
os.makedirs(MODEL_DIR, exist_ok=True)

def make_env():
    env = RacerEnv()
    env = Monitor(env, LOG_DIR)
    return env

vec_env = DummyVecEnv([make_env])
vec_env = VecNormalize(vec_env, norm_obs=True, norm_reward=True, clip_obs=10.0)

model = PPO(
    "MlpPolicy",
    vec_env,
    verbose=1,
    tensorboard_log=LOG_DIR,
    learning_rate=3e-4,
    n_steps=2048,
    batch_size=64,
    n_epochs=10,
    gamma=0.99,
    gae_lambda=0.95,
    clip_range=0.2,
    ent_coef=0.01,   # Small entropy bonus helps exploration
    vf_coef=0.5,
    max_grad_norm=0.5,
)

checkpoint_cb = CheckpointCallback(
    save_freq=50_000,
    save_path=MODEL_DIR,
    name_prefix="ppo_racer",
    save_vecnormalize=True,
)

model.learn(total_timesteps=2_000_000, callback=checkpoint_cb)
model.save(f"{MODEL_DIR}/ppo_racer_final")
vec_env.save(f"{MODEL_DIR}/ppo_vecnormalize_final.pkl")
```

### Pattern 2: Custom TensorBoard Callback for Lap Metrics
**What:** BaseCallback subclass that reads from `info` dict (already populated with lap, checkpoint, reward components) and logs to TensorBoard.
**When to use:** Required for AI-09 (lap time, completion rate in TensorBoard).
**Example:**
```python
# Source: https://stable-baselines3.readthedocs.io/en/master/guide/tensorboard.html
from stable_baselines3.common.callbacks import BaseCallback
import numpy as np

class RacerMetricsCallback(BaseCallback):
    """Log racer-specific metrics to TensorBoard."""

    def __init__(self, verbose=0):
        super().__init__(verbose)
        self._lap_times = []
        self._completions = 0
        self._episodes = 0

    def _on_step(self) -> bool:
        # infos is a list (one per env) for VecEnv
        for info in self.locals.get("infos", []):
            # Log per-component reward breakdown
            for key in ["progress", "speed", "wall", "offTrack", "backward", "stillness"]:
                if key in info:
                    self.logger.record(f"reward/{key}", info[key])

            # Count completions (lap incremented = completed a lap)
            if info.get("lap", 0) > 1:
                self._completions += 1

        # Log episode-level metrics on episode end
        if self.locals.get("dones") is not None:
            for done, info in zip(self.locals["dones"], self.locals.get("infos", [])):
                if done:
                    self._episodes += 1
                    if "lap" in info and info["lap"] > 1:
                        # crude completion rate
                        rate = self._completions / max(self._episodes, 1)
                        self.logger.record("racer/completion_rate", rate)

        return True
```

### Pattern 3: Resume Training from Checkpoint
**What:** Load a saved checkpoint and continue training. Requires `reset_num_timesteps=False` to preserve timestep count in TensorBoard.
**When to use:** Resuming interrupted training, or iterating after reward tuning.
**Example:**
```python
# Source: https://stable-baselines3.readthedocs.io/en/master/guide/save_format.html
from stable_baselines3 import PPO
from stable_baselines3.common.vec_env import DummyVecEnv, VecNormalize

def make_env(): return RacerEnv()

vec_env = DummyVecEnv([make_env])
vec_env = VecNormalize.load("./models/ppo_vecnormalize_final.pkl", vec_env)
vec_env.training = True   # Re-enable stats update
vec_env.norm_reward = True

model = PPO.load("./models/ppo_racer_final", env=vec_env)
model.learn(
    total_timesteps=1_000_000,
    reset_num_timesteps=False,   # CRITICAL: preserve TensorBoard x-axis
    tb_log_name="ppo_run_2",
)
```

### Pattern 4: SAC as Fallback
**What:** If PPO plateaus, switch to SAC. SAC is off-policy and more sample-efficient for continuous control.
**When to use:** After 2-3M PPO timesteps with no lap improvement.
**Example:**
```python
# Source: https://stable-baselines3.readthedocs.io/en/master/modules/sac.html
from stable_baselines3 import SAC

model = SAC(
    "MlpPolicy",
    vec_env,
    verbose=1,
    tensorboard_log=LOG_DIR,
    learning_rate=3e-4,
    buffer_size=1_000_000,
    learning_starts=1000,
    batch_size=256,
    tau=0.005,
    gamma=0.99,
    train_freq=1,
    gradient_steps=1,
    ent_coef="auto",   # Entropy auto-tuned — one less hyperparameter
)
```

### Anti-Patterns to Avoid
- **Reusing the same env instance in DummyVecEnv:** `DummyVecEnv([lambda: env])` where `env` is already created — causes sharing issues. Always use factory functions: `DummyVecEnv([make_env])`.
- **Forgetting VecNormalize statistics at inference:** Must save and load `vec_env.save()` + `VecNormalize.load()`, then set `vec_env.training = False, vec_env.norm_reward = False` at inference time.
- **Wrong load pattern:** `model = PPO(...); model.load(path)` — `load()` is not in-place. Always: `model = PPO.load(path, env=env)`.
- **Missing Monitor wrapper:** Without `Monitor(env, log_dir)`, SB3 does not auto-log episode rewards to TensorBoard.
- **On-policy with n_steps too small:** For PPO, `n_steps * n_envs` must be larger than 1 for advantage normalization. With 1 env, n_steps >= 2 (but 2048 is the standard).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PPO algorithm | Custom policy gradient loop | `stable_baselines3.PPO` | Advantage normalization, clip scheduling, GAE — 20+ implementation details that matter |
| SAC algorithm | Custom actor-critic | `stable_baselines3.SAC` | Entropy auto-tuning, replay buffer, target networks — complex and bug-prone |
| Training metrics | Custom logging | `BaseCallback` + TensorBoard | SB3 hooks into the right lifecycle points; manual logging misses episode boundaries |
| Checkpoint saving | Custom pickle | `CheckpointCallback` | Saves optimizer state, replay buffer, VecNormalize stats atomically |
| Observation/reward normalization | Custom running stats | `VecNormalize` | Numerically stable Welford's algorithm with correct train/inference mode toggling |
| Hyperparameter search | Manual grid search | `optuna` + `rl-baselines3-zoo` | Already tuned hyperparameters available for similar continuous control tasks |
| Episode evaluation | Custom eval loop | `EvalCallback` | Handles deterministic mode, multiple eval episodes, best model selection |

**Key insight:** SB3's value is not just the algorithms — it's the 20+ subtle implementation details in PPO (advantage normalization, gradient clipping schedule, value function clipping) that determine whether training converges. The original PPO paper omits these. Build your own PPO and it probably won't match performance.

---

## Common Pitfalls

### Pitfall 1: Bridge Throughput Ceiling
**What goes wrong:** AI-08 requires 3000+ ticks/sec. The WebSocket bridge adds ~0.5ms/step overhead (from Phase 4 latency tests), giving ~2000 steps/sec ceiling — below the 3000 target.
**Why it happens:** Each `env.step()` is a synchronous JSON round-trip: Python serializes action → WebSocket → Node.js deserializes → runs engine tick → serializes result → WebSocket → Python deserializes. JSON + WebSocket framing is not zero-cost.
**How to avoid:** Measure first. Run a throughput benchmark before training. If below 3000: (a) check if the Node.js bridge has JSON parse overhead that can be reduced (message batching or binary protocol), or (b) accept a lower step rate — 2000 steps/sec may be sufficient for convergence given dense rewards. Note: SubprocVecEnv with multiple bridge connections is v2 scope (AI-V2-01), not Phase 5.
**Warning signs:** Training loop reports FPS significantly below 3000 in verbose=1 output.

### Pitfall 2: VecNormalize Statistics Corruption at Inference
**What goes wrong:** Model loaded for inference continues updating normalization statistics, causing observation scaling to drift from training distribution.
**Why it happens:** VecNormalize wraps the training env; if you reuse the same wrapper object at inference without disabling updates, `training=True` by default.
**How to avoid:** After loading for inference: `vec_env.training = False; vec_env.norm_reward = False`. Save stats with `vec_env.save("path.pkl")` and always load them with `VecNormalize.load("path.pkl", new_vec_env)`.
**Warning signs:** Model that performed well during training performs erratically when loaded from checkpoint.

### Pitfall 3: Reward Hacking / Circular Driving
**What goes wrong:** Agent learns to drive in circles or oscillate near the start position to accumulate progress reward without completing laps.
**Why it happens:** Per-tick progress reward (arc length delta) is always positive when the car moves forward even a tiny bit. If the track is a closed loop, a small circle near the start also generates positive reward.
**How to avoid:** The existing `stillnessTimeoutTicks` and backward penalty in `ai-config.json` partly mitigate this. Key: ensure the per-tick progress reward requires measurable forward progress (arc length delta threshold). If circular behavior emerges, increase `wallPenalty` and `offTrackPenalty` in `ai-config.json` — no code changes needed.
**Warning signs:** Episode reward increases but `lap` in info dict stays at 1 across episodes.

### Pitfall 4: Getting Stuck / Never Completing Laps
**What goes wrong:** Agent learns a local optimum of not moving (avoiding all penalties) rather than driving.
**Why it happens:** If stillness penalty is too small and progress reward requires sustained effort, doing nothing is a safe low-loss strategy.
**How to avoid:** `stillnessTimeoutTicks=180` (3 seconds at 60Hz) terminates stuck episodes. Ensure `stillnessPenalty` is meaningfully negative. The `speedBonus` weight (currently 0.0 in ai-config.json) can be increased to incentivize movement.
**Warning signs:** Mean episode length is close to `stillnessTimeoutTicks` across all training episodes; agent barely moves.

### Pitfall 5: Reward Scale Mismatch for SAC
**What goes wrong:** SAC entropy auto-tuning diverges if reward scale is too large or small.
**Why it happens:** SAC's entropy target `target_entropy = -action_dim` assumes rewards on a roughly unit scale. The progress reward (arc length delta in game units) may be on a very different scale.
**How to avoid:** Use `VecNormalize(norm_reward=True)` which normalizes rewards to unit variance. This is especially important for SAC. For PPO, reward normalization is less critical but still beneficial.
**Warning signs:** SAC `ent_coef` (alpha) rapidly converges to near-zero or diverges to large values in TensorBoard.

### Pitfall 6: Missing Lap Time Metric
**What goes wrong:** TensorBoard shows episode reward improving but there is no lap time metric, making it impossible to verify AI-09.
**Why it happens:** SB3 does not automatically log custom info dict fields. `rollout/ep_rew_mean` is auto-logged; anything else requires a custom callback.
**How to avoid:** Implement `RacerMetricsCallback` (see Pattern 2). The existing `info` dict from `headless-env.ts` already includes `lap`, `checkpoint`, `stepCount` — these are the inputs needed. Lap time = `stepCount / 60` seconds when a new lap begins.
**Warning signs:** TensorBoard shows only `rollout/ep_rew_mean` and `train/` metrics — no `racer/` namespace.

### Pitfall 7: Checkpoint Load API Confusion
**What goes wrong:** Training script resets timestep counter on resume, making TensorBoard x-axis discontinuous.
**Why it happens:** `model.learn()` defaults to `reset_num_timesteps=True`.
**How to avoid:** Always pass `reset_num_timesteps=False` when continuing training from a checkpoint.
**Warning signs:** TensorBoard x-axis resets to 0 after resuming, making curve comparison impossible.

---

## Code Examples

Verified patterns from official sources:

### Full PPO Training Script (Entry Point)
```python
# Source: https://stable-baselines3.readthedocs.io/en/master/modules/ppo.html
# Source: https://stable-baselines3.readthedocs.io/en/master/guide/examples.html
import os
import sys
from pathlib import Path

# Adjust path so racer_env is importable
sys.path.insert(0, str(Path(__file__).parent.parent))

from stable_baselines3 import PPO
from stable_baselines3.common.vec_env import DummyVecEnv, VecNormalize
from stable_baselines3.common.callbacks import CheckpointCallback, EvalCallback, CallbackList
from stable_baselines3.common.monitor import Monitor
from racer_env import RacerEnv
from training.callbacks import RacerMetricsCallback

RUN_NAME = "ppo_run_1"
LOG_DIR = f"./logs/{RUN_NAME}"
MODEL_DIR = "./models"
TOTAL_TIMESTEPS = 2_000_000

os.makedirs(LOG_DIR, exist_ok=True)
os.makedirs(MODEL_DIR, exist_ok=True)

def make_env():
    env = RacerEnv()
    env = Monitor(env, LOG_DIR)
    return env

vec_env = DummyVecEnv([make_env])
vec_env = VecNormalize(vec_env, norm_obs=True, norm_reward=True, clip_obs=10.0)

model = PPO(
    "MlpPolicy",
    vec_env,
    verbose=1,
    tensorboard_log=LOG_DIR,
    learning_rate=3e-4,
    n_steps=2048,
    batch_size=64,
    n_epochs=10,
    gamma=0.99,
    gae_lambda=0.95,
    clip_range=0.2,
    ent_coef=0.01,
    vf_coef=0.5,
    max_grad_norm=0.5,
)

callbacks = CallbackList([
    CheckpointCallback(
        save_freq=50_000,
        save_path=MODEL_DIR,
        name_prefix=f"{RUN_NAME}",
        save_vecnormalize=True,
    ),
    RacerMetricsCallback(verbose=1),
])

model.learn(total_timesteps=TOTAL_TIMESTEPS, callback=callbacks, tb_log_name=RUN_NAME)
model.save(f"{MODEL_DIR}/{RUN_NAME}_final")
vec_env.save(f"{MODEL_DIR}/{RUN_NAME}_vecnorm.pkl")
print(f"Training complete. Model saved to {MODEL_DIR}/")
```

### Throughput Benchmark Script
```python
# Run before training to verify AI-08 throughput
import time
from racer_env import RacerEnv

env = RacerEnv()
obs, _ = env.reset()
N = 1000
start = time.perf_counter()
for _ in range(N):
    action = env.action_space.sample()
    obs, reward, terminated, truncated, info = env.step(action)
    if terminated or truncated:
        obs, _ = env.reset()
elapsed = time.perf_counter() - start
steps_per_sec = N / elapsed
print(f"Throughput: {steps_per_sec:.0f} steps/sec")
# Target: >= 3000 steps/sec (AI-08)
env.close()
```

### TensorBoard Launch Command
```bash
# From project root; logs/ dir relative to where training script runs
tensorboard --logdir python/logs/
# Open http://localhost:6006
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| OpenAI Gym + stable-baselines (TF1) | gymnasium>=1.0 + stable-baselines3 (PyTorch) | 2021-2023 | TF1 is dead; SB3/gymnasium is the maintained standard |
| stable-baselines3 + Python 3.8 | SB3 >= 2.4 requires Python 3.10+ | SB3 2.4 (2024) | Ensure Python 3.10+ in venv |
| Manual replay buffer serialization | `CheckpointCallback(save_replay_buffer=True)` | SB3 1.x | Atomic checkpoint saves all state |
| Separate reward normalization code | `VecNormalize` wrapper built-in | SB3 1.x | One-liner; handles train/eval mode toggle |
| SAC with manual entropy coefficient | `ent_coef="auto"` | SB3 1.x | No longer a hyperparameter to tune |
| Gymnasium 0.x `info["TimeLimit.truncated"]` | Separate `truncated` return value from `step()` | gymnasium 1.0 | Already handled in Phase 4 RacerEnv |

**Deprecated/outdated:**
- `stable_baselines` (TF1): Replaced by `stable_baselines3` entirely. Do not install.
- `gym` (OpenAI Gym): Replaced by `gymnasium`. Already using gymnasium from Phase 4.
- `done` single boolean from `step()`: Old gym API. Current is `(obs, reward, terminated, truncated, info)`. Already correct in Phase 4.
- `SubprocVecEnv` for this project: Multiple parallel envs each need their own bridge connection + Node.js server port. This is v2 scope (AI-V2-01).

---

## Open Questions

1. **Actual Bridge Throughput**
   - What we know: Phase 4 test reports median step latency ~0.5ms → ~2000 steps/sec theoretical.
   - What's unclear: Whether training loop overhead (SB3 internal processing per step) adds significant overhead beyond the bridge round-trip. The 3000 ticks/sec target may or may not be achievable.
   - Recommendation: Run throughput benchmark script before training. If below target, document the actual achieved rate. The requirement may need to be re-evaluated given the WebSocket architecture constraint.

2. **Reward Scale for Progress**
   - What we know: `progress` weight is 1.0 in ai-config.json; the actual arc length delta per tick is in game-world units (unknown scale relative to typical RL reward ranges of -1 to +1).
   - What's unclear: Whether reward values are in a range where VecNormalize `clip_obs=10.0` is appropriate, or if raw rewards need scaling first.
   - Recommendation: Log raw `info["progress"]` values during training (via RacerMetricsCallback) and inspect in TensorBoard before committing to VecNormalize settings.

3. **Lap Time Measurement in Info Dict**
   - What we know: `info["stepCount"]` and `info["lap"]` are available. A lap completion can be inferred from `lap` incrementing.
   - What's unclear: The existing `HeadlessEnv` does not compute lap time in seconds — it provides tick count. Also, the lap counter in `world.timing.currentLap` may not reset correctly across `reset()` calls.
   - Recommendation: Verify lap counting logic in the engine before relying on it for TensorBoard metrics. May need to track lap changes in the callback rather than reading a computed lap time.

---

## Validation Architecture

> `workflow.nyquist_validation` is not present in `.planning/config.json` — skipping this section per instructions. Validation is covered by existing pytest infrastructure.

Existing test infrastructure (Python):
- `python/tests/conftest.py` — bridge server fixture (session-scoped)
- `python/tests/test_env_checker.py` — validates env against gymnasium + SB3 checker
- `python/tests/test_random_agent.py` — throughput and info dict tests

### Phase 5 Test Gaps (Wave 0)
The following tests do not yet exist and will need to be created:

| Req ID | Behavior | Test Type | File |
|--------|----------|-----------|------|
| AI-08 | Bridge throughput >= target | Benchmark | `python/tests/test_throughput.py` |
| AI-09 | TensorBoard callback logs racer/ metrics | Unit (offline) | `python/tests/test_callbacks.py` |
| AI-10 | Checkpoint save → load → inference produces valid actions | Integration | `python/tests/test_checkpoint.py` |

Note: AI-11 (actual training to competency) is a manual success criterion — no automated test can validate "AI drives faster than a casual human." The checkpoint tests above validate the mechanical save/load pipeline.

---

## Sources

### Primary (HIGH confidence)
- `/dlr-rm/stable-baselines3` (Context7) — PPO/SAC API, CheckpointCallback, EvalCallback, VecNormalize, Monitor, TensorBoard integration
- https://stable-baselines3.readthedocs.io/en/master/guide/tensorboard.html — TensorBoard integration patterns
- https://stable-baselines3.readthedocs.io/en/master/modules/ppo.html — PPO parameters and defaults
- https://stable-baselines3.readthedocs.io/en/master/modules/sac.html — SAC parameters
- https://stable-baselines3.readthedocs.io/en/master/guide/callbacks.html — CheckpointCallback, EvalCallback, BaseCallback
- https://stable-baselines3.readthedocs.io/en/master/guide/examples.html — Full training patterns
- https://stable-baselines3.readthedocs.io/en/master/guide/install.html — Python 3.10+, PyTorch >=2.3, SB3[extra] includes TensorBoard
- https://stable-baselines3.readthedocs.io/en/master/guide/rl_tips.html — PPO vs SAC guidance, action normalization, timeout handling

### Secondary (MEDIUM confidence)
- https://stable-baselines3.readthedocs.io/en/master/guide/custom_env.html — Custom env wrapping requirements, verified against Phase 4 implementation
- https://gymnasium.farama.org/introduction/speed_up_env/ — Vectorized env performance guidance
- https://www.nature.com/articles/s41598-025-27702-6 — Racing game RL reward design research (2025)

### Tertiary (LOW confidence)
- Medium/community articles on PPO vs SAC for CarRacing — Single sources, not independently verified. Used as corroboration of SB3 official guidance only.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Context7 + official docs verified SB3 2.x API, versions, installation
- Architecture: HIGH — Patterns directly from SB3 official examples and callbacks documentation
- Pitfalls: MEDIUM-HIGH — Bridge throughput ceiling is verified from Phase 4 tests; VecNormalize pitfall from official docs; reward hacking pitfalls from official RL tips + racing research
- Throughput target: LOW — 3000 ticks/sec is the stated requirement but bridge architecture limits to ~2000 based on Phase 4 measurements; needs validation before training begins

**Research date:** 2026-03-01
**Valid until:** 2026-06-01 (SB3 is stable; API changes slowly. PyTorch version requirements may shift.)
