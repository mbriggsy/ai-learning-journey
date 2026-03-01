# Plan 05-01 Summary: Training Infrastructure

**Status:** Complete
**Date:** 2026-03-01

## What Was Done

### Task 1: Dependencies and Directory Structure
- Updated `python/requirements.txt` with upper-bounded versions:
  - `stable-baselines3[extra]>=2.4.0,<3` (includes TensorBoard)
  - `torch>=2.3,<3`
  - Added upper bounds to existing deps (`gymnasium`, `numpy`, `websocket-client`)
- Added Python version constraint comment (3.10-3.12) and GPU install instructions
- Created `python/training/__init__.py` (package init)
- Created `python/models/.gitkeep` and `python/logs/.gitkeep` (output directories)
- Updated `.gitignore` with model/log artifact patterns (`*.zip`, `*.pkl`, log dirs)
- Recreated Python venv with Python 3.10 (3.14 is incompatible with pygame, a SB3[extra] dependency)

### Task 2: RacerMetricsCallback
- Created `python/training/callbacks.py` with `RacerMetricsCallback(BaseCallback)`
- Per-step reward components logged via `record_mean()` under `reward/` namespace:
  - `reward/progress`, `reward/speed`, `reward/wall`, `reward/offTrack`, `reward/backward`, `reward/stillness`
- Per-lap time computed using step count deltas (not cumulative episode time)
- Episode-level metrics accumulated and logged in `_on_rollout_end()`:
  - `racer/completion_rate`, `racer/episodes_this_rollout`
  - `racer/mean_lap_time_sec`, `racer/best_lap_time_sec`
- `TICKS_PER_SECOND = 60` extracted as named class constant

### Task 3: Throughput Benchmark
- Created `python/training/benchmark.py` with `run_benchmark()` function
- 200-step warmup phase excluded from measurements
- `try/finally` ensures `env.close()` on error
- `ConnectionRefusedError` caught with helpful error message (exit code 2)
- Reports: steps/sec, mean latency, p50/p95/p99 latency
- CLI args: `--steps`, `--target`, `--warmup`
- Exit codes: 0 (pass), 1 (below target), 2 (bridge not running)

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Recreated venv with Python 3.10 instead of 3.14 | PyTorch 2.3 requires Python 3.10-3.12; pygame (SB3[extra] dep) fails on 3.14 |
| Used `record_mean()` for per-step rewards | `record()` overwrites; only last value before dump() survives |
| Episode metrics in `_on_rollout_end()` not `_on_step()` | Prevents last-value-wins problem; fires right before dump() |
| Per-lap time via step count delta | Cumulative stepCount/60 gives episode time, not individual lap time |
| Default benchmark target: 2000 steps/sec | Raw bridge throughput; actual SB3 training will be 1500-2500 steps/sec |

## Artifacts Created

| File | Purpose |
|------|---------|
| `python/requirements.txt` | Updated dependency list with SB3 + PyTorch |
| `python/training/__init__.py` | Package init |
| `python/training/callbacks.py` | RacerMetricsCallback for TensorBoard |
| `python/training/benchmark.py` | Throughput benchmark for AI-08 validation |
| `python/models/.gitkeep` | Model checkpoint output directory |
| `python/logs/.gitkeep` | TensorBoard log output directory |

## Verification Results

- SB3 + TensorBoard imports: PASS
- RacerMetricsCallback import: PASS
- Benchmark import: PASS
- Directory structure: PASS
- .gitignore patterns: PASS
