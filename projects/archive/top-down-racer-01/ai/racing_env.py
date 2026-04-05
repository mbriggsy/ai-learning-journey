"""Gymnasium environment wrapper for Top-Down Racer 01.

Exposes the game as a standard Gymnasium environment so it can be trained
with any RL algorithm.  The environment runs the game headlessly (no Arcade
window) by default; pass render_mode="human" to open the game window.

Observation space: Box(0, 1, (21,), float32)
  - 13 ray-cast distances (normalized, 240-degree forward fan including 0-degree center)
  - 8 car/track state values:
      speed, angular vel, drift, health, checkpoint angle,
      curvature_1, curvature_2, curvature_3

Action space: Box(low=[-1, -1, 0], high=[1, 1, 1], shape=(3,), float32)
  - [0] Steering:  -1 (full left)  to  +1 (full right)
  - [1] Throttle:  -1 (full brake) to  +1 (full throttle)
  - [2] Drift:      0 (no drift)   to   1 (>0.5 = handbrake)
"""

from __future__ import annotations

import math
from pathlib import Path

import gymnasium as gym
import numpy as np
import yaml

from ai.observations import build_observation, make_observation_space
from ai.rewards import StepInfo, compute_reward, get_reward_range
from game.car import Car, KEY_W, KEY_S, KEY_A, KEY_D, KEY_SPACE
from game.physics import check_wall_collisions, resolve_collision
from game.track import Track
from game.training_checkpoints import (
    check_training_checkpoint,
    generate_training_checkpoints,
    get_tight_section_indices,
)


class RacingEnv(gym.Env):
    """Gymnasium environment wrapping the Top-Down Racer game logic.

    Each ``step()`` advances the game by one fixed-timestep frame (1/60 s),
    processes physics and collisions, and returns the observation, reward,
    termination flags, and an info dict with diagnostic data.

    The continuous 3-element action is quantized to binary key inputs for the
    existing ``Car.update()`` method, keeping car.py completely unchanged.

    Attributes:
        metadata: Gym env metadata (render modes, fps).
        observation_space: Box(0, 1, (21,), float32).
        action_space: Box([-1,-1,0], [1,1,1], (3,), float32).
    """

    metadata = {"render_modes": ["human", "rgb_array"], "render_fps": 60}

    def __init__(
        self,
        config_path: str = "configs/default.yaml",
        render_mode: str | None = None,
        render_options: dict | None = None,
        is_training: bool = False,
    ) -> None:
        """Initialize the racing environment.

        Args:
            config_path: Path to the YAML config file.
            render_mode: One of None, "human", or "rgb_array".
            render_options: Reserved for future render settings.
            is_training: If True, enables curriculum spawning (random spawn
                points). Should be True in train.py, False in watch.py.
        """
        super().__init__()

        # --- Load config -------------------------------------------------
        path = Path(config_path)
        if not path.exists():
            raise FileNotFoundError(f"Config file not found: {config_path}")

        with open(path, "r", encoding="utf-8") as f:
            self._config: dict = yaml.safe_load(f)

        self._ai_cfg: dict = self._config["ai"]
        self._dt: float = 1.0 / self._config["screen"]["fps"]

        # --- Build track and car -----------------------------------------
        self._track: Track = Track.from_config(self._config)
        spawn_x, spawn_y, spawn_angle = self._track.get_spawn_position()
        self._car: Car = Car(self._config, spawn_x, spawn_y, spawn_angle)

        # --- Pre-compute wall segments (static, never changes) -----------
        self._wall_segments = self._track.get_wall_segments()

        # --- Curriculum spawning (v12) -----------------------------------
        self._is_training: bool = is_training
        self._centerline = np.array(
            self._config["track"]["centerline_points"], dtype=np.float64
        )

        # --- Generate training checkpoints (breadcrumbs) -----------------
        centerline = np.array(
            self._config["track"]["centerline_points"], dtype=np.float64
        )
        tight_indices = get_tight_section_indices(
            centerline, self._ai_cfg["curvature_threshold"]
        )
        self._training_checkpoints: list[tuple[float, float]] = (
            generate_training_checkpoints(
                centerline,
                spacing=self._ai_cfg["training_checkpoint_spacing"],
                tight_section_indices=tight_indices,
                zigzag_multiplier=self._ai_cfg["zigzag_spacing_multiplier"],
            )
        )
        self._num_checkpoints: int = len(self._training_checkpoints)

        # --- Spaces ------------------------------------------------------
        self.observation_space: gym.spaces.Box = make_observation_space()
        self.action_space: gym.spaces.Box = gym.spaces.Box(
            low=np.array([-1.0, -1.0, 0.0], dtype=np.float32),
            high=np.array([1.0, 1.0, 1.0], dtype=np.float32),
            dtype=np.float32,
        )
        self.reward_range: tuple[float, float] = get_reward_range(self._config)

        # --- Render mode -------------------------------------------------
        self.render_mode: str | None = render_mode

        # --- Spawn protection config --------------------------------------
        self._spawn_grace_steps: int = int(self._ai_cfg.get("spawn_grace_steps", 30))
        self._min_checkpoint_speed: float = float(self._ai_cfg.get("min_checkpoint_speed", 5.0))

        # --- Track progress tracking (for forward-progress reward) --------
        self._num_centerline_points: int = len(
            self._config["track"]["centerline_points"]
        )

        # --- Episode tracking (initialized fully in reset()) -------------
        self._next_checkpoint_idx: int = 0
        self._laps_completed: int = 0
        self._step_count: int = 0
        self._steps_since_reset: int = 0
        self._wall_hits: int = 0
        self._stuck_steps: int = 0
        self._breadcrumbs_collected: int = 0
        self._lap_start_step: int = 0
        self._lap_times: list[float] = []
        self._prev_action: np.ndarray = np.zeros(3, dtype=np.float32)
        self._prev_pos: np.ndarray = np.zeros(2, dtype=np.float64)
        self._track_progress: float = 0.0

        # --- Observation / action cache (used by watch renderer) ---------
        self._last_obs: np.ndarray | None = None
        self._last_action: np.ndarray = np.zeros(3, dtype=np.float32)

    # ------------------------------------------------------------------
    # Gymnasium API
    # ------------------------------------------------------------------

    def reset(
        self,
        *,
        seed: int | None = None,
        options: dict | None = None,
    ) -> tuple[np.ndarray, dict]:
        """Reset the environment to the initial state.

        Args:
            seed: Optional RNG seed for reproducibility.
            options: Reserved for future use.

        Returns:
            Tuple of (observation, info).
        """
        super().reset(seed=seed)

        # Reset car to spawn — curriculum spawning picks a random centerline
        # point during training; watch mode always uses the default spawn.
        curriculum_enabled = (
            self._is_training
            and self._ai_cfg.get("curriculum_spawn_enabled", False)
        )
        if curriculum_enabled:
            spawn_indices = self._ai_cfg.get("curriculum_spawn_points", [0])
            idx = int(self.np_random.choice(spawn_indices))
            num_pts = len(self._centerline)
            next_idx = (idx + 1) % num_pts
            pt = self._centerline[idx]
            pt_next = self._centerline[next_idx]
            direction = pt_next - pt
            spawn_angle = float(np.arctan2(direction[1], direction[0]))
            # Offset forward along the direction to avoid sitting on a checkpoint
            offset = float(self._config["track"].get("spawn_forward_offset", 200))
            norm = np.linalg.norm(direction)
            if norm > 0:
                unit = direction / norm
            else:
                unit = np.array([1.0, 0.0])
            spawn_pos = pt + unit * offset
            spawn_x, spawn_y = float(spawn_pos[0]), float(spawn_pos[1])
        else:
            spawn_x, spawn_y, spawn_angle = self._track.get_spawn_position()

        self._car.reset(spawn_x, spawn_y, spawn_angle)

        # Reset episode tracking
        self._next_checkpoint_idx = self._find_first_checkpoint_ahead(
            spawn_x, spawn_y, spawn_angle
        )
        self._laps_completed = 0
        self._step_count = 0
        self._steps_since_reset = 0
        self._wall_hits = 0
        self._stuck_steps = 0
        self._breadcrumbs_collected = 0
        self._lap_start_step = 0
        self._lap_times = []
        self._prev_action = np.zeros(3, dtype=np.float32)
        self._prev_pos = self._car.position.copy()
        self._track_progress = self._track.get_track_progress(
            float(self._car.position[0]), float(self._car.position[1])
        )

        # Build initial observation
        next_cp = self._training_checkpoints[self._next_checkpoint_idx]
        obs = build_observation(
            self._car, self._wall_segments, next_cp, self._config,
            track=self._track, track_progress=self._track_progress,
        )
        self._last_obs = obs
        self._last_action = np.zeros(3, dtype=np.float32)

        return obs, {}

    def step(
        self, action: np.ndarray
    ) -> tuple[np.ndarray, float, bool, bool, dict]:
        """Advance the environment by one fixed timestep.

        Args:
            action: Array of shape (3,):
                [0] steering  (-1 = full left, +1 = full right)
                [1] throttle  (-1 = full brake, +1 = full throttle)
                [2] drift     (>0.5 = handbrake engaged)

        Returns:
            Tuple of (observation, reward, terminated, truncated, info).
        """
        # --- Convert continuous action to binary key set -----------------
        keys: set[int] = set()
        if action[1] > 0.1:
            keys.add(KEY_W)      # accelerate
        if action[1] < -0.1:
            keys.add(KEY_S)      # brake / reverse
        if action[0] < -0.1:
            keys.add(KEY_A)      # steer left
        if action[0] > 0.1:
            keys.add(KEY_D)      # steer right
        if action[2] > 0.5:
            keys.add(KEY_SPACE)  # drift

        # --- Step car physics --------------------------------------------
        self._car.update(self._dt, keys)

        # --- Wall collisions ---------------------------------------------
        corners = self._car.get_corners()
        collisions = check_wall_collisions(corners, self._wall_segments)

        wall_damage: float = 0.0
        for col in collisions:
            damage = resolve_collision(self._car, col, self._config)
            self._car.apply_damage(damage)
            wall_damage += damage
            self._wall_hits += 1

        # --- Training checkpoint (breadcrumb) collection -----------------
        # Guards: skip checkpoint logic during the post-reset grace period
        # and when the car is moving in reverse (prevents false lap credit).
        cp_reached: bool = False
        lap_completed: bool = False

        grace_ok = self._steps_since_reset >= self._spawn_grace_steps
        moving_forward = self._car.speed > self._min_checkpoint_speed

        if grace_ok and moving_forward:
            next_cp = self._training_checkpoints[self._next_checkpoint_idx]
            cp_radius: float = self._ai_cfg["training_checkpoint_radius"]
            cp_reached = check_training_checkpoint(
                self._car.position, next_cp, cp_radius
            )

            if cp_reached:
                self._breadcrumbs_collected += 1
                was_at_last = (
                    self._next_checkpoint_idx == self._num_checkpoints - 1
                )
                self._next_checkpoint_idx = (
                    (self._next_checkpoint_idx + 1) % self._num_checkpoints
                )
                # Lap completes when wrapping from last checkpoint back to 0
                if was_at_last and self._next_checkpoint_idx == 0:
                    lap_completed = True
                    self._laps_completed += 1
                    # Record lap time in seconds
                    lap_steps = self._step_count - self._lap_start_step
                    self._lap_times.append(lap_steps * self._dt)
                    self._lap_start_step = self._step_count

            # --- Breadcrumb auto-advance (Issue #012) ---
            # If the car has moved far enough ahead of the current breadcrumb,
            # auto-advance the index so the chain doesn't lock on a miss.
            if not cp_reached:
                next_cp = self._training_checkpoints[self._next_checkpoint_idx]
                car_progress = self._track.get_track_progress(
                    float(self._car.position[0]), float(self._car.position[1])
                )
                cp_progress = self._track.get_track_progress(
                    next_cp[0], next_cp[1]
                )
                # Forward delta with wraparound handling
                fwd_delta = car_progress - cp_progress
                if fwd_delta < -self._num_centerline_points / 2.0:
                    fwd_delta += self._num_centerline_points
                elif fwd_delta > self._num_centerline_points / 2.0:
                    fwd_delta -= self._num_centerline_points
                # Auto-advance if car is more than N breadcrumb-spacings ahead
                auto_advance_mult: float = float(
                    self._ai_cfg.get("breadcrumb_auto_advance_multiplier", 1.5)
                )
                spacing_in_progress = (
                    self._num_centerline_points / self._num_checkpoints
                )
                if fwd_delta > spacing_in_progress * auto_advance_mult:
                    self._next_checkpoint_idx = (
                        (self._next_checkpoint_idx + 1) % self._num_checkpoints
                    )

        # --- Track progress (forward-progress reward) ----------------------
        new_progress = self._track.get_track_progress(
            float(self._car.position[0]), float(self._car.position[1])
        )
        delta_progress = new_progress - self._track_progress
        # Handle wraparound: if delta is more than half the track in either
        # direction, it wrapped around the start/finish seam.
        half_track = self._num_centerline_points / 2.0
        if delta_progress > half_track:
            delta_progress -= self._num_centerline_points
        elif delta_progress < -half_track:
            delta_progress += self._num_centerline_points
        self._track_progress = new_progress

        # --- Corner curvature (for corner speed penalty) --------------------
        curvature_1 = self._track.get_curvature_lookahead(self._track_progress, 1)[0]
        curvature_deviation: float = abs(curvature_1 - 0.5) * 2.0  # 0=straight, 1=sharpest

        # --- Lateral displacement (centerline distance) --------------------
        lateral_dist: float = self._track.get_lateral_displacement(
            float(self._car.position[0]), float(self._car.position[1])
        )

        # --- Stuck detection ---------------------------------------------
        is_stuck = self._is_stuck()

        # --- Termination / truncation ------------------------------------
        terminated: bool = not self._car.is_alive
        max_steps: int = self._ai_cfg["max_episode_steps"]
        truncated: bool = (self._step_count >= max_steps) or is_stuck

        # --- Reward computation ------------------------------------------
        step_info = StepInfo(
            training_checkpoint_reached=cp_reached,
            lap_completed=lap_completed,
            wall_damage=wall_damage,
            dead=not self._car.is_alive,
            speed=abs(self._car.speed),
            prev_steering=float(self._prev_action[0]),
            curr_steering=float(action[0]),
            is_stuck=is_stuck,
            forward_progress=delta_progress,
            lateral_displacement=lateral_dist,
            curvature_deviation=curvature_deviation,
        )
        reward, breakdown = compute_reward(step_info, self._config)

        # --- Build observation (for next step) ---------------------------
        next_cp_for_obs = self._training_checkpoints[self._next_checkpoint_idx]
        obs = build_observation(
            self._car, self._wall_segments, next_cp_for_obs, self._config,
            track=self._track, track_progress=self._track_progress,
        )

        # --- Info dict ---------------------------------------------------
        # Major checkpoints: divide lap into 4 quarters based on breadcrumb progress
        checkpoints_hit: int = min(
            self._breadcrumbs_collected * 4 // self._num_checkpoints, 4
        )

        info: dict = {
            "laps_completed": self._laps_completed,
            "wall_hits": self._wall_hits,
            "lap_times": list(self._lap_times),
            "training_checkpoint_reached": cp_reached,
            "lap_completed": lap_completed,
            "wall_damage": wall_damage,
            "dead": not self._car.is_alive,
            "reward_breakdown": breakdown,
            "breadcrumbs_collected": self._breadcrumbs_collected,
            "checkpoints_hit": checkpoints_hit,
            "step_count": self._step_count,
        }

        # --- Update tracking state ---------------------------------------
        self._prev_action = np.array(action, dtype=np.float32)
        self._last_obs = obs
        self._last_action = np.array(action, dtype=np.float32)
        self._step_count += 1
        self._steps_since_reset += 1
        self._prev_pos = self._car.position.copy()

        return obs, float(reward), terminated, truncated, info

    def render(self) -> None:
        """Render the current environment state.

        Always a no-op. When watch mode is active, WatchWindow (in ai/watch.py)
        owns the Arcade event loop and draws the game state in its own on_draw().
        This method exists to satisfy the Gymnasium API contract.

        Returns:
            None.
        """
        return None

    def close(self) -> None:
        """Clean up environment resources."""
        pass

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _find_first_checkpoint_ahead(
        self, spawn_x: float, spawn_y: float, spawn_angle: float
    ) -> int:
        """Find the first training checkpoint ahead of the spawn position.

        Iterates through all training checkpoints and returns the index of
        the first one whose position is forward of the spawn point (positive
        dot product with the spawn facing direction).  Falls back to 0 if
        none are found ahead.

        Args:
            spawn_x: Spawn X position.
            spawn_y: Spawn Y position.
            spawn_angle: Spawn facing angle in radians.

        Returns:
            Index into self._training_checkpoints.
        """
        forward = np.array([math.cos(spawn_angle), math.sin(spawn_angle)])
        spawn_pos = np.array([spawn_x, spawn_y])

        for i, cp in enumerate(self._training_checkpoints):
            vec_to_cp = np.array(cp) - spawn_pos
            if float(np.dot(vec_to_cp, forward)) > 0:
                return i

        return 0

    def _is_stuck(self) -> bool:
        """Check if the car has been nearly stationary for too long.

        Tracks consecutive steps where the car's speed is below the stuck
        threshold. Returns True (and the episode should be truncated) once
        the count exceeds the limit.

        Returns:
            True if the car is stuck and the episode should end.
        """
        threshold: float = self._ai_cfg["stuck_speed_threshold"]
        # Convert stuck_timeout (seconds) to steps at the fixed timestep
        limit: int = int(self._ai_cfg["stuck_timeout"] / self._dt)

        if abs(self._car.speed) < threshold:
            self._stuck_steps += 1
        else:
            self._stuck_steps = 0

        return self._stuck_steps >= limit
