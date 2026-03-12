"""Unit tests for RacerMetricsCallback (AI-09).

Tests the callback in isolation by mocking the SB3 logger and training env.
No bridge server or actual training is needed.

The callback uses two SB3 logger APIs:
- record_mean(): per-step reward components (averaged across rollout window)
- record(): episode-level aggregates in _on_rollout_end()

Tests verify both the correct API is called and the correct metric keys are logged.
"""
from unittest.mock import MagicMock

import numpy as np
import pytest

from training.callbacks import RacerMetricsCallback


class FakeLogger:
    """Mock SB3 logger that captures record() and record_mean() calls separately.

    Separating storage lets tests verify the callback calls the correct API:
    - record_mean() for per-step values (reward components)
    - record() for per-rollout aggregates (completion rate, lap times)
    """

    def __init__(self) -> None:
        self.records: dict[str, list[float]] = {}
        self.records_mean: dict[str, list[float]] = {}

    def record(self, key: str, value: float) -> None:
        self.records.setdefault(key, []).append(value)

    def record_mean(self, key: str, value: float) -> None:
        self.records_mean.setdefault(key, []).append(value)


def _make_info(
    *,
    lap: int = 1,
    stepCount: int = 100,
    progress: float = 0.001,
    speed: float = 0.0,
    wall: float = 0.0,
    offTrack: float = 0.0,
    backward: float = 0.0,
    stillness: float = 0.0,
    checkpoint: int = 0,
) -> dict:
    """Build a RacerEnv info dict with sensible defaults.

    Only override the fields relevant to each test — the rest use safe defaults.
    This eliminates the 9-key boilerplate from every test function.
    """
    return {
        "progress": progress, "speed": speed, "wall": wall,
        "offTrack": offTrack, "backward": backward, "stillness": stillness,
        "lap": lap, "checkpoint": checkpoint, "stepCount": stepCount,
    }


def _make_callback(num_envs: int = 1) -> tuple[RacerMetricsCallback, FakeLogger]:
    """Create a callback with a FakeLogger and mock training env.

    SB3's BaseCallback has read-only properties:
    - logger -> self.model.logger
    - training_env -> self.model.get_env()
    We inject both via a single mock model object.
    """
    cb = RacerMetricsCallback(verbose=0)
    logger = FakeLogger()

    mock_env = MagicMock()
    mock_env.num_envs = num_envs

    # BaseCallback.logger reads self.model.logger
    # BaseCallback.training_env reads self.model.get_env()
    mock_model = MagicMock()
    mock_model.logger = logger
    mock_model.get_env.return_value = mock_env
    cb.model = mock_model

    cb._on_training_start()

    return cb, logger


def test_reward_components_use_record_mean():
    """Callback logs all 6 reward component keys via record_mean(), not record().

    record_mean() averages values across the entire rollout window (n_steps=2048
    for PPO). Using record() instead would silently discard all but the last
    value before dump() — a data corruption bug that Plan 01 deepening fixed.
    """
    cb, logger = _make_callback()

    cb.locals = {
        "infos": [_make_info(progress=0.003, wall=-0.002, stillness=-0.001)],
        "dones": np.array([False]),
    }
    cb._on_step()

    for key in ("progress", "speed", "wall", "offTrack", "backward", "stillness"):
        assert f"reward/{key}" in logger.records_mean, (
            f"Missing reward/{key} in records_mean — callback should use record_mean(), not record()"
        )
    # Verify these are NOT in records (wrong API would be a silent bug)
    for key in ("progress", "speed", "wall", "offTrack", "backward", "stillness"):
        assert f"reward/{key}" not in logger.records, (
            f"reward/{key} found in records — callback should use record_mean(), not record()"
        )


def test_reward_mean_values_correct():
    """record_mean() should produce the running average across all steps."""
    cb, logger = _make_callback()

    for progress_val in [0.003, 0.005, 0.001]:
        cb.locals = {
            "infos": [_make_info(progress=progress_val)],
            "dones": np.array([False]),
        }
        cb._on_step()

    # FakeLogger stores all values; verify the callback sent the right values
    assert len(logger.records_mean["reward/progress"]) == 3
    assert logger.records_mean["reward/progress"] == pytest.approx([0.003, 0.005, 0.001])


def test_lap_time_logged_on_rollout_end():
    """Lap times accumulate in _on_step() and are logged in _on_rollout_end().

    The callback computes per-lap time using step count deltas (not cumulative
    stepCount / 60), tracks lap boundaries per-env, and only writes the
    aggregated mean and best times when the rollout ends.
    """
    cb, logger = _make_callback()

    # Step 1: lap=1 (no completion)
    cb.locals = {
        "infos": [_make_info(lap=1, stepCount=500)],
        "dones": np.array([False]),
    }
    cb._on_step()

    # No lap time keys should exist yet (accumulated, not logged)
    assert "racer/mean_lap_time_sec" not in logger.records
    assert "racer/best_lap_time_sec" not in logger.records

    # Step 2: lap=2 (lap completed — time = (3000 - 0) / 60 = 50.0s)
    cb.locals = {
        "infos": [_make_info(lap=2, stepCount=3000)],
        "dones": np.array([False]),
    }
    cb._on_step()

    # Still not in logger — only accumulated in self._lap_times
    assert "racer/mean_lap_time_sec" not in logger.records

    # Trigger rollout end — this flushes accumulated metrics to the logger
    cb._on_rollout_end()

    assert "racer/mean_lap_time_sec" in logger.records
    assert "racer/best_lap_time_sec" in logger.records
    assert logger.records["racer/mean_lap_time_sec"][0] == pytest.approx(50.0)
    assert logger.records["racer/best_lap_time_sec"][0] == pytest.approx(50.0)


def test_completion_rate_across_episodes():
    """Completion rate is computed from all episodes within a single rollout.

    Both episodes must be accumulated before _on_rollout_end() to get the
    correct averaged rate. The callback accumulates into self._episode_completions
    during _on_step() and logs the aggregate in _on_rollout_end().
    """
    cb, logger = _make_callback()

    # Episode 1 ends with lap=2 (completed a lap)
    cb.locals = {
        "infos": [_make_info(lap=2, stepCount=3000)],
        "dones": np.array([True]),
    }
    cb._on_step()

    # Episode 2 ends with lap=1 (no lap completed)
    cb.locals = {
        "infos": [_make_info(lap=1, stepCount=180)],
        "dones": np.array([True]),
    }
    cb._on_step()

    # Now flush the rollout — both episodes are in the accumulator
    cb._on_rollout_end()

    assert "racer/completion_rate" in logger.records
    assert logger.records["racer/completion_rate"][0] == pytest.approx(0.5)  # 1/2 episodes completed
    assert "racer/episodes_this_rollout" in logger.records
    assert logger.records["racer/episodes_this_rollout"][0] == 2


def test_rollout_end_clears_accumulators():
    """_on_rollout_end() clears accumulators so subsequent rollouts start fresh."""
    cb, logger = _make_callback()

    # Rollout 1: one episode, one lap completed
    cb.locals = {
        "infos": [_make_info(lap=2, stepCount=3000)],
        "dones": np.array([True]),
    }
    cb._on_step()
    cb._on_rollout_end()

    assert logger.records["racer/completion_rate"][0] == 1.0

    # Rollout 2: no episodes (only non-terminal steps)
    cb.locals = {
        "infos": [_make_info(lap=1, stepCount=50)],
        "dones": np.array([False]),
    }
    cb._on_step()
    cb._on_rollout_end()

    # Should NOT log completion_rate in rollout 2 (empty accumulator)
    assert len(logger.records["racer/completion_rate"]) == 1  # still just the one from rollout 1


def test_resets_lap_tracking_on_episode_end():
    """Callback resets per-env lap tracking when episode ends, preventing false lap detection.

    Without this reset, a transition from lap=2 (end of episode 1) to lap=1
    (start of episode 2) would not trigger a false "lap completed" event, but
    without resetting _prev_step_counts, the step delta computation would be
    wrong for the next lap in episode 2.
    """
    cb, logger = _make_callback()

    # Episode 1 ends at lap=2
    cb.locals = {
        "infos": [_make_info(lap=2, stepCount=3000)],
        "dones": np.array([True]),
    }
    cb._on_step()

    # Episode 2 starts at lap=1 — should NOT trigger a lap completion
    cb.locals = {
        "infos": [_make_info(lap=1, stepCount=10)],
        "dones": np.array([False]),
    }
    cb._on_step()

    # Flush rollout — should only have 1 lap time (from episode 1)
    cb._on_rollout_end()
    assert len(logger.records.get("racer/mean_lap_time_sec", [])) == 1
