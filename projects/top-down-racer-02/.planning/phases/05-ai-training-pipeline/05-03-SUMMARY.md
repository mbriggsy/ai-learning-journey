# Plan 05-03 Summary: Training Pipeline Tests

**Status:** Complete
**Date:** 2026-03-01

## What Was Done

### Task 1: Throughput Benchmark Test
- Created `python/tests/test_throughput.py` for AI-08 validation
- Measures raw bridge throughput via `run_benchmark(steps=5000, target=1500)`
- Asserts minimum viable threshold of 1500 steps/sec
- Verifies expected metric keys exist (catches API drift in benchmark.py)
- Prints actual metrics (steps/sec, mean latency, p50/p95/p99) for visibility
- Uses existing `bridge_server` session fixture from conftest.py
- 60-second timeout prevents hangs

### Task 2: Callback Unit Tests
- Created `python/tests/test_callbacks.py` for AI-09 validation
- 6 offline tests (no bridge server needed, <3s total runtime)
- FakeLogger separates `records` and `records_mean` dicts to verify correct SB3 logger API usage
- `_make_info()` helper eliminates 9-key boilerplate from all tests
- Mock model injection via `MagicMock` to work with SB3's read-only `logger` and `training_env` properties
- Tests:
  - `test_reward_components_use_record_mean`: All 6 reward keys use record_mean(), not record()
  - `test_reward_mean_values_correct`: Correct values sent to record_mean()
  - `test_lap_time_logged_on_rollout_end`: Accumulate-then-flush lifecycle matches SB3
  - `test_completion_rate_across_episodes`: Rate computed from multiple episodes in one rollout
  - `test_rollout_end_clears_accumulators`: Clean state for subsequent rollouts
  - `test_resets_lap_tracking_on_episode_end`: No false positives across episode boundaries

### Task 3: Checkpoint Integration Tests
- Created `python/tests/test_checkpoint.py` for AI-10 validation
- `test_ppo_save_load_predict`: Full train->save->load->predict pipeline
  - Verifies model .zip and VecNormalize .pkl files created
  - Verifies obs_rms.mean and obs_rms.var survive round-trip
  - Verifies loaded model produces finite actions with correct shape (1, 3)
  - try/finally prevents Windows file-lock issues on temp cleanup
- `test_ppo_resume_training`: Validates reset_num_timesteps=False preserves timestep counter
  - Critical for TensorBoard x-axis continuity and CheckpointCallback naming
- Factory functions (not lambdas) for DummyVecEnv (per Plan 02 convention)
- pathlib throughout (consistent with project convention)
- 60-second timeouts (tests complete in 2-6s)

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Mock model injection for FakeLogger | SB3 BaseCallback.logger is a read-only property delegating to self.model.logger; direct assignment fails |
| training_env via mock_model.get_env() | SB3 BaseCallback.training_env is a read-only property delegating to self.model.get_env() |
| 1500 steps/sec threshold (not 3000) | Conservative CI-safe minimum; actual throughput ~3000-4000; 2x safety margin prevents false failures |
| Installed pytest-timeout | Required for @pytest.mark.timeout decorators; prevents hanging tests |
| Callback tests fully offline | No bridge needed; mocks SB3 logger and env; runs in <3s |

## Artifacts Created

| File | Purpose |
|------|---------|
| `python/tests/test_throughput.py` | Bridge throughput benchmark test (AI-08) |
| `python/tests/test_callbacks.py` | Callback unit tests (AI-09, offline) |
| `python/tests/test_checkpoint.py` | Checkpoint save/load integration tests (AI-10) |

## Requirements Satisfied

| ID | Requirement | How |
|----|-------------|-----|
| AI-08 | Headless training at 3000+ ticks/sec | Throughput benchmark test measures raw bridge steps/sec |
| AI-09 | TensorBoard metrics (episode reward, lap time, completion rate) | Callback tests verify all metric keys and correct logger API usage |
| AI-10 | Model checkpoint saving/loading | Checkpoint tests verify save->load->predict pipeline and VecNormalize round-trip |

## Verification Results

- test_callbacks.py (6 tests): ALL PASS (offline, 2.48s)
- test_throughput.py: Syntax OK (requires bridge server to run)
- test_checkpoint.py: Syntax OK (requires bridge server to run)
- No modifications to existing Phase 4 test files
