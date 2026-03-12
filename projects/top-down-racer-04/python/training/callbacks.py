"""Custom TensorBoard callbacks for racer-specific training metrics."""

from __future__ import annotations

from typing import Any

from stable_baselines3.common.callbacks import BaseCallback


class RacerMetricsCallback(BaseCallback):
    """Log racer-specific metrics to TensorBoard.

    Per-step reward components use record_mean() to average across
    the entire rollout window (n_steps). Episode-level metrics
    (lap times, completion rate) are accumulated and logged once
    per rollout via _on_rollout_end().
    """

    TICKS_PER_SECOND: int = 60

    REWARD_KEYS: tuple[str, ...] = (
        "progress", "speed", "wall", "offTrack", "backward", "stillness",
    )

    def __init__(self, verbose: int = 0) -> None:
        super().__init__(verbose)
        self._prev_laps: list[int] = []
        self._prev_step_counts: list[int] = []
        # Accumulators cleared each rollout
        self._lap_times: list[float] = []
        self._episode_completions: list[float] = []  # 1.0 or 0.0

    def _on_training_start(self) -> None:
        num_envs: int = self.training_env.num_envs
        self._prev_laps = [1] * num_envs
        self._prev_step_counts = [0] * num_envs

    def _on_step(self) -> bool:
        infos: list[dict[str, Any]] = self.locals.get("infos", [])
        dones = self.locals.get("dones", [])

        for i, info in enumerate(infos):
            if i >= len(self._prev_laps):
                break  # Guard against mismatched env count

            # Per-step: accumulate with record_mean across all steps in rollout
            for key in self.REWARD_KEYS:
                if key in info:
                    self.logger.record_mean(f"reward/{key}", info[key])

            # Detect lap completion (lap number increased)
            current_lap: int = info.get("lap", 1)
            if current_lap > self._prev_laps[i]:
                step_count: int = info.get("stepCount", 0)
                # Per-lap time = delta from previous lap boundary, not cumulative
                lap_time = (step_count - self._prev_step_counts[i]) / self.TICKS_PER_SECOND
                self._lap_times.append(lap_time)
                self._prev_step_counts[i] = step_count
                if self.verbose >= 1:
                    print(f"  Lap completed! Time: {lap_time:.2f}s (env {i})")
            self._prev_laps[i] = current_lap

            # Track episode completion
            if i < len(dones) and dones[i]:
                completed = current_lap > 1
                self._episode_completions.append(float(completed))
                # Reset per-env state for next episode
                self._prev_laps[i] = 1
                self._prev_step_counts[i] = 0

        return True  # MUST return True explicitly (SB3 >= 2.2.1 enforces this)

    def _on_rollout_end(self) -> None:
        """Log episode-level aggregates just before dump() fires."""
        if self._episode_completions:
            n = len(self._episode_completions)
            rate = sum(self._episode_completions) / n
            self.logger.record("racer/completion_rate", rate)
            self.logger.record("racer/episodes_this_rollout", n)
            self._episode_completions.clear()

        if self._lap_times:
            import numpy as np
            self.logger.record("racer/mean_lap_time_sec", float(np.mean(self._lap_times)))
            self.logger.record("racer/best_lap_time_sec", min(self._lap_times))
            self._lap_times.clear()
