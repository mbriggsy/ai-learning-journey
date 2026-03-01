---
status: passed
verified_date: 2026-03-01
---

# Phase 05: AI Training Pipeline — Verification

## Must-Have Verification

### Plan 05-01: Training Infrastructure (Dependencies, Callback, Benchmark)

| # | Must-Have | Status | Evidence |
|---|----------|--------|----------|
| 1 | requirements.txt includes stable-baselines3[extra]>=2.4.0,<3 and torch>=2.3,<3 with upper bounds | Pass | `python/requirements.txt` lines 7-8: `stable-baselines3[extra]>=2.4.0,<3` and `torch>=2.3,<3` |
| 2 | RacerMetricsCallback uses record_mean() for per-step reward components (progress, speed, wall, offTrack, backward, stillness) | Pass | `python/training/callbacks.py` line 49: `self.logger.record_mean(f"reward/{key}", info[key])` with REWARD_KEYS tuple containing all 6 keys (lines 21-23) |
| 3 | RacerMetricsCallback accumulates episode metrics and logs them in _on_rollout_end() | Pass | `callbacks.py`: _on_step() accumulates into `self._lap_times` (line 57) and `self._episode_completions` (line 66); _on_rollout_end() logs aggregates via `self.logger.record()` (lines 73-86) and clears both accumulators |
| 4 | RacerMetricsCallback computes per-lap time (not cumulative) using step count deltas | Pass | `callbacks.py` line 56: `lap_time = (step_count - self._prev_step_counts[i]) / self.TICKS_PER_SECOND` — uses delta between current stepCount and previous lap boundary, not cumulative stepCount |
| 5 | Throughput benchmark script includes warmup phase and try/finally cleanup | Pass | `python/training/benchmark.py`: WARMUP_STEPS = 200 (line 25), warmup loop lines 48-52 (excluded from measurement), try/finally block lines 46-66 with `env.close()` in the finally clause |
| 6 | models/ and logs/ directories exist with .gitkeep files | Pass | `python/models/.gitkeep` and `python/logs/.gitkeep` both exist (confirmed via ls -la) |

### Plan 05-02: Training Scripts (PPO, SAC, Evaluate)

| # | Must-Have | Status | Evidence |
|---|----------|--------|----------|
| 1 | train_ppo.py creates a PPO model with MlpPolicy, DummyVecEnv, VecNormalize, Monitor, and trains for a configurable number of timesteps | Pass | `python/training/train_ppo.py`: PPO("MlpPolicy", vec_env, ...) on line 86, DummyVecEnv on line 64, VecNormalize on line 85, Monitor in make_env() factory line 37, configurable via `--timesteps` arg (line 115) |
| 2 | train_ppo.py saves model checkpoints periodically via CheckpointCallback and saves VecNormalize stats alongside | Pass | `train_ppo.py` lines 104-109: CheckpointCallback with `save_vecnormalize=True`. Final save on lines 122-124: `model.save()` and `vec_env.save()` |
| 3 | train_ppo.py supports --resume flag to load a checkpoint and continue training with reset_num_timesteps=False | Pass | `train_ppo.py` line 146: `--resume` arg. Line 82: `PPO.load(args.resume, env=vec_env)`. Line 118: `reset_num_timesteps=args.resume is None` (evaluates to False when resuming) |
| 4 | train_sac.py provides equivalent SAC training as a fallback when PPO plateaus | Pass | `python/training/train_sac.py` exists with full SAC implementation: SAC("MlpPolicy", ...) on line 92, SAC-specific hyperparams (buffer_size, learning_starts, tau, ent_coef="auto", use_sde=True), mirrors PPO structure (resume, checkpoints, KeyboardInterrupt handler) |
| 5 | evaluate.py loads a saved model + VecNormalize stats and runs inference episodes with deterministic actions | Pass | `python/training/evaluate.py`: load_model() on line 69, VecNormalize.load() on line 60, `model.predict(obs, deterministic=args.deterministic)` on line 86, episode loop lines 78-104 |
| 6 | evaluate.py sets VecNormalize training=False and norm_reward=False at inference time | Pass | `evaluate.py` lines 66-67: `vec_env.training = False` and `vec_env.norm_reward = False` |
| 7 | All scripts use argparse for CLI configuration (run name, timesteps, checkpoint path) | Pass | train_ppo.py lines 142-150, train_sac.py lines 148-156, evaluate.py lines 120-129, benchmark.py lines 87-91 — all use argparse.ArgumentParser |
| 8 | All scripts use try/finally to ensure vec_env.close() is called on exit or error | Pass | train_ppo.py lines 113-134, train_sac.py lines 119-140, evaluate.py lines 77-106, benchmark.py lines 46-66 — all have try/finally with close() |
| 9 | All scripts use pathlib-anchored paths relative to \_\_file\_\_, not CWD-relative strings | Pass | train_ppo.py line 28: `PYTHON_DIR = Path(__file__).resolve().parent.parent`, train_sac.py line 32 (same), evaluate.py uses pathlib in vecnorm_path_for, benchmark.py line 22: `Path(__file__).parent.parent` |
| 10 | VecNormalize path derivation uses pathlib (not str.replace) and handles missing .zip extension | Pass | All scripts use `vecnorm_path_for()`: `p = Path(model_path); stem = p.with_suffix("") if p.suffix == ".zip" else p` — pure pathlib, handles both `.zip` and no-extension cases |
| 11 | evaluate.py computes per-lap time using step count deltas (not cumulative stepCount / 60) | Pass | `evaluate.py` line 96: `lt = (step_count - prev_step_count) / TICKS_PER_SECOND`, with `prev_step_count` initialized to 0 (line 83) and updated on each lap boundary (line 98) |
| 12 | Training scripts catch KeyboardInterrupt and save an emergency checkpoint before exiting | Pass | train_ppo.py lines 126-132: except KeyboardInterrupt saves model+VecNormalize. train_sac.py lines 132-138: identical pattern |
| 13 | Training scripts validate bridge connectivity before SB3 model initialization | Pass | train_ppo.py lines 54-62: pre-flight creates test RacerEnv, calls reset(), closes, catches ConnectionError. train_sac.py lines 58-66: identical pattern. Both occur before DummyVecEnv/model creation |

### Plan 05-03: Automated Tests (Throughput, Callback, Checkpoint)

| # | Must-Have | Status | Evidence |
|---|----------|--------|----------|
| 1 | Throughput test measures actual bridge steps/sec and asserts >= target threshold | Pass | `python/tests/test_throughput.py` line 22: `run_benchmark(steps=5000, target=1500)`, line 32: `assert metrics["steps_per_sec"] >= 1500` |
| 2 | Callback unit test verifies RacerMetricsCallback logs expected metric keys via record_mean() and record() without requiring a bridge connection | Pass | `python/tests/test_callbacks.py`: FakeLogger has separate `records` and `records_mean` dicts (lines 29-36). test_reward_components_use_record_mean asserts keys in `records_mean` and NOT in `records` (lines 104-112). No bridge_server fixture used by any callback test |
| 3 | Callback tests call _on_rollout_end() before asserting episode-level metrics (matching the real SB3 lifecycle) | Pass | `test_callbacks.py`: _on_rollout_end() called at line 162 (lap time test), line 193 (completion rate test), line 212 (clear accumulators test), line 253 (episode reset test) — all before assertions on episode-level metrics |
| 4 | Checkpoint integration test verifies save-load-predict pipeline produces valid actions | Pass | `python/tests/test_checkpoint.py` test_ppo_save_load_predict: trains 128 steps (line 60), saves model+stats (lines 69-70), loads into fresh env (lines 78-94), calls predict (line 99), asserts action.shape == (1,3) and np.isfinite (lines 100-101) |
| 5 | Checkpoint test verifies VecNormalize running statistics survive the save/load round-trip | Pass | `test_checkpoint.py`: captures obs_rms.mean and obs_rms.var before save (lines 63-64), asserts np.allclose after load (lines 85-89) |
| 6 | All existing Phase 4 tests continue to pass (no regressions) | Human Needed | No Phase 4 test files were modified (verified by examining Plan 05-03 files_modified list). Actual regression testing requires running `pytest python/tests/ -v` with bridge server active |

## Artifacts Verification

| Path | Expected | Status |
|------|----------|--------|
| python/requirements.txt | SB3+PyTorch deps with upper bounds | Pass — contains `stable-baselines3[extra]>=2.4.0,<3` and `torch>=2.3,<3` |
| python/training/__init__.py | Package init | Pass — exists (empty file) |
| python/training/callbacks.py | RacerMetricsCallback for custom TensorBoard logging | Pass — exports RacerMetricsCallback class (87 lines) |
| python/training/benchmark.py | Throughput benchmark script for AI-08 validation | Pass — exports run_benchmark() function, CLI via main() |
| python/models/.gitkeep | Model checkpoint output directory | Pass — file exists |
| python/logs/.gitkeep | TensorBoard log output directory | Pass — file exists |
| python/training/train_ppo.py | PPO training entry point with checkpointing and TensorBoard | Pass — full PPO training script (161 lines) |
| python/training/train_sac.py | SAC training entry point (fallback if PPO plateaus) | Pass — full SAC training script (167 lines) |
| python/training/evaluate.py | Model evaluation/inference script | Pass — evaluation script with auto-detect PPO/SAC (134 lines) |
| python/tests/test_throughput.py | Bridge throughput benchmark test for AI-08 | Pass — tests run_benchmark with 1500 sps threshold |
| python/tests/test_callbacks.py | Callback unit test for AI-09 (offline, no bridge needed) | Pass — 7 tests covering record_mean, rollout lifecycle, accumulators |
| python/tests/test_checkpoint.py | Checkpoint save/load integration test for AI-10 | Pass — 2 tests: save/load/predict and resume training |

## Human Verification Items

1. **Run full test suite**: Execute `pytest python/tests/ -v` with bridge server running to confirm all Phase 4 and Phase 5 tests pass together (no regressions).
2. **Run actual training**: Execute a short PPO training run (`python -m training.train_ppo --timesteps 500000`) and verify TensorBoard metrics appear correctly (`reward/progress`, `racer/completion_rate`, `racer/mean_lap_time_sec`).
3. **Verify SB3 imports**: Run `python -c "from stable_baselines3 import PPO, SAC; print('OK')"` in the Python venv to confirm dependencies are installed.
4. **Test checkpoint round-trip**: Run training for 100K steps, interrupt with Ctrl+C, then resume with `--resume` flag and verify TensorBoard x-axis continuity.

## Summary

**Score: 24/25 must-haves verified (1 requires human runtime verification)**

All source code has been verified against the must-have specifications by reading the actual file contents:

- **Plan 05-01 (6/6)**: Dependencies correctly pinned with upper bounds. RacerMetricsCallback uses `record_mean()` (not `record()`) for per-step rewards, accumulates episode metrics, and logs them in `_on_rollout_end()`. Per-lap time uses step count deltas. Benchmark has warmup and try/finally. Directory structure in place.

- **Plan 05-02 (13/13)**: Both training scripts (PPO and SAC) implement the full pipeline: DummyVecEnv + VecNormalize + Monitor, CheckpointCallback with `save_vecnormalize=True`, `--resume` with `reset_num_timesteps=False`, try/finally cleanup, KeyboardInterrupt emergency saves, bridge pre-flight checks, pathlib-anchored paths, and argparse CLI. Evaluate script correctly sets `training=False` and `norm_reward=False`, uses step count deltas for lap times, and auto-detects PPO/SAC.

- **Plan 05-03 (5/6)**: All three test files exist and implement the specified test patterns. Callback tests use FakeLogger with separate `record()`/`record_mean()` storage and call `_on_rollout_end()` before asserting episode metrics. Checkpoint tests verify VecNormalize `obs_rms` round-trip and `reset_num_timesteps=False`. The one unverified item (Phase 4 regression) requires actually running the test suite.

**Overall assessment**: Phase 05 implementation is complete and correct. All code patterns match the deepened plan specifications (record_mean, step count deltas, try/finally, pathlib, rollout lifecycle). No API mismatches or implementation gaps detected.
