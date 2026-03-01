# Plan 05-02 Summary: Training & Evaluation Scripts

**Status:** Complete
**Date:** 2026-03-01

## What Was Done

### Task 1: PPO Training Script
- Created `python/training/train_ppo.py` -- primary training entry point
- CLI interface with `--run-name`, `--timesteps`, `--resume`, `--checkpoint-freq`, `--track-id`, `--bridge-url`
- Bridge pre-flight connectivity check before SB3 initialization
- DummyVecEnv + VecNormalize + Monitor wrapper chain
- CheckpointCallback saves model + VecNormalize stats every `checkpoint_freq` steps
- RacerMetricsCallback logs custom racer metrics to TensorBoard
- `reset_num_timesteps=False` when resuming preserves TensorBoard x-axis continuity
- `try/finally` ensures `vec_env.close()` on all exit paths
- KeyboardInterrupt handler saves emergency checkpoint before exit
- Pathlib-anchored output paths (relative to `__file__`, not CWD)
- PPO hyperparameters tuned from rl-baselines3-zoo CarRacing config:
  - `batch_size=128`, `gamma=0.995`, `ent_coef=0.01`, `n_steps=2048`

### Task 2: SAC Training Script
- Created `python/training/train_sac.py` -- fallback when PPO plateaus
- Mirrors train_ppo.py structure with SAC-specific hyperparameters
- SAC hyperparameters from rl-baselines3-zoo CarRacing config:
  - `learning_rate=7.3e-4`, `buffer_size=300_000`, `learning_starts=10_000`
  - `batch_size=256`, `tau=0.02`, `train_freq=8`, `gradient_steps=10`
  - `ent_coef="auto"` (entropy auto-tuning), `use_sde=True` (state-dependent exploration)
- VecNormalize `norm_reward=True` critical for SAC entropy auto-tuning stability
- Same bridge pre-flight, try/finally cleanup, KeyboardInterrupt handler pattern

### Task 3: Model Evaluation Script
- Created `python/training/evaluate.py` -- inference and model validation tool
- Auto-detects algorithm type (PPO vs SAC) from saved model file
- Auto-detects VecNormalize stats path from model path convention (pathlib-based)
- Sets `vec_env.training=False` and `vec_env.norm_reward=False` at inference
- Per-lap time via step count deltas (not cumulative stepCount / 60)
- `--deterministic` flag uses `BooleanOptionalAction` (supports `--no-deterministic`)
- Reports per-episode rewards, steps, laps; aggregate mean/best lap times
- `try/finally` ensures `vec_env.close()` on all exit paths

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Keep separate PPO/SAC scripts (no unified `train.py --algo`) | Different training semantics (on-policy vs off-policy), different hyperparameter schemas, SAC may never be used, matches RL community convention |
| Missing VecNormalize stats on resume is an error, not a warning | Model trained with normalized obs produces garbage with fresh (mean=0, var=1) stats |
| Pathlib-based VecNormalize path derivation (not str.replace) | str.replace(".zip", ...) breaks if model path lacks .zip extension |
| BooleanOptionalAction for --deterministic flag | action="store_true" with default=True is a no-op |
| Factory function for DummyVecEnv (not lambda) | Lambda late-binding closure is a footgun if copied to multi-env loop |
| gamma=0.995 for PPO (instead of 0.99) | ~200-step effective horizon (3.3s) for planning turns, vs ~100-step (1.7s) with 0.99 |

## Artifacts Created

| File | Purpose |
|------|---------|
| `python/training/train_ppo.py` | PPO training entry point with checkpointing and TensorBoard |
| `python/training/train_sac.py` | SAC training entry point (fallback if PPO plateaus) |
| `python/training/evaluate.py` | Model evaluation/inference script |

## Requirements Satisfied

| ID | Requirement | How |
|----|-------------|-----|
| AI-10 | Model checkpoint saving/loading | CheckpointCallback + final save + resume flag + evaluate.py load |
| AI-11 | PPO and SAC training via stable-baselines3 + PyTorch | train_ppo.py and train_sac.py |

## Verification Results

- train_ppo.py import: PASS
- train_sac.py import: PASS
- evaluate.py import: PASS
- train_ppo.py --help shows all arguments: PASS
- train_sac.py --help shows all arguments: PASS
- evaluate.py --help shows all arguments: PASS
- reset_num_timesteps=False on resume (source verified): PASS
- vec_env.training=False in evaluate.py (source verified): PASS
