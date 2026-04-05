"""Observation space builder for the RL agent.

Gives Richard Petty his "eyes": 13 ray casts in a 240-degree forward fan
plus 8 car/track state values, all normalized to [0, 1]. The complete
observation vector has shape (21,) and is suitable for feeding directly
into a neural network policy.

Ray angles (degrees relative to car facing):
    -120, -100, -75, -50, -30, -10, 0, +10, +30, +50, +75, +100, +120

State values (indices 13-20):
    13: speed         -- abs(speed) / max_speed
    14: angular_vel   -- centered at 0.5 (no turn), 0.0 = max CCW, 1.0 = max CW
    15: drift         -- 1.0 if drifting, 0.0 otherwise
    16: health        -- health / max_health
    17: checkpoint    -- angle to next checkpoint normalized so 0.5 = straight ahead
    18: curvature_1   -- track curvature 1 centerline point ahead (0=left, 0.5=straight, 1=right)
    19: curvature_2   -- track curvature 2 centerline points ahead
    20: curvature_3   -- track curvature 3 centerline points ahead

No arcade imports anywhere in this module. Only numpy, math, and gymnasium.
"""

from __future__ import annotations

import math
from typing import TYPE_CHECKING

import gymnasium as gym
import numpy as np

if TYPE_CHECKING:
    from game.car import Car
    from game.track import Track

# ---------------------------------------------------------------------------
# Ray configuration
# ---------------------------------------------------------------------------

RAY_ANGLES_DEG: list[float] = [
    -120, -100, -75, -50, -30, -10,
      0,
     10,   30,  50,  75, 100, 120,
]
"""Ray angles in degrees, relative to car facing. 240-degree forward fan with 0-degree center ray."""

RAY_ANGLES_RAD: np.ndarray = np.deg2rad(RAY_ANGLES_DEG).astype(np.float32)
"""Pre-computed ray angles in radians for fast casting."""

NUM_RAYS: int = len(RAY_ANGLES_DEG)
NUM_CURVATURE_LOOKAHEAD: int = 3
NUM_STATE_VALUES: int = 8  # speed, angular_vel, drift, health, checkpoint_angle, curvature_1/2/3
OBS_SIZE: int = NUM_RAYS + NUM_STATE_VALUES  # 21


# ---------------------------------------------------------------------------
# Ray casting
# ---------------------------------------------------------------------------

def cast_observation_rays(
    position: np.ndarray,
    angle: float,
    wall_segments: list[tuple[tuple[float, float], tuple[float, float]]],
    max_distance: float = 400.0,
) -> np.ndarray:
    """Cast 13 rays in a 240-degree forward fan and return normalized distances.

    Ray angles (relative to car facing): -120, -100, -75, -50, -30, -10,
                                           0, +10, +30, +50, +75, +100, +120 degrees.

    Each returned value = distance_to_nearest_wall / max_distance, clamped [0, 1].
    - Value near 0.0 = wall is very close
    - Value near 1.0 = no wall detected (open road)

    Uses vectorized numpy segment intersection for performance. For each ray,
    all wall segments are tested simultaneously using the parametric intersection
    formula, avoiding a Python-level inner loop over segments.

    Args:
        position: Car center [x, y] in world coordinates.
        angle: Car facing angle in radians (0 = east, CCW positive).
        wall_segments: List of ((x1,y1), (x2,y2)) wall line segments.
        max_distance: Maximum ray length in pixels.

    Returns:
        numpy array of shape (13,) with normalized distances, dtype float32.
    """
    ox, oy = float(position[0]), float(position[1])
    num_walls = len(wall_segments)

    if num_walls == 0:
        return np.ones(NUM_RAYS, dtype=np.float32)

    # Pre-build wall segment arrays: shape (num_walls,)
    # wp1 = start points, wp2 = end points
    wp1x = np.empty(num_walls, dtype=np.float64)
    wp1y = np.empty(num_walls, dtype=np.float64)
    wp2x = np.empty(num_walls, dtype=np.float64)
    wp2y = np.empty(num_walls, dtype=np.float64)

    for i, ((x1, y1), (x2, y2)) in enumerate(wall_segments):
        wp1x[i] = x1
        wp1y[i] = y1
        wp2x[i] = x2
        wp2y[i] = y2

    # Wall direction vectors
    wdx = wp2x - wp1x  # shape (num_walls,)
    wdy = wp2y - wp1y

    # Vector from wall start to ray origin
    dx3 = ox - wp1x  # shape (num_walls,)
    dy3 = oy - wp1y

    results = np.empty(NUM_RAYS, dtype=np.float32)

    for i in range(NUM_RAYS):
        ray_angle = angle + RAY_ANGLES_RAD[i]
        rdx = math.cos(ray_angle) * max_distance
        rdy = math.sin(ray_angle) * max_distance

        # Denominator of parametric intersection: cross(ray_dir, wall_dir)
        # denom = rdx * wdy - rdy * wdx, shape (num_walls,)
        denom = rdx * wdy - rdy * wdx

        # Avoid division by zero for parallel segments
        valid = np.abs(denom) > 1e-10

        # t = parameter along ray [0,1], s = parameter along wall [0,1]
        # t = (dx3 * wdy - dy3 * wdx) / denom
        # s = (dx3 * rdy - dy3 * rdx) / denom
        t = np.full(num_walls, 2.0, dtype=np.float64)  # default > 1 = miss
        s = np.full(num_walls, 2.0, dtype=np.float64)

        t[valid] = (dx3[valid] * wdy[valid] - dy3[valid] * wdx[valid]) / denom[valid]
        s[valid] = (dx3[valid] * rdy - dy3[valid] * rdx) / denom[valid]

        # Valid hits: both t and s in [0, 1]
        hits = valid & (t >= 0.0) & (t <= 1.0) & (s >= 0.0) & (s <= 1.0)

        if np.any(hits):
            # Distance = t * max_distance (since ray direction has length max_distance)
            min_t = np.min(t[hits])
            dist = min_t * max_distance
            results[i] = np.float32(np.clip(dist / max_distance, 0.0, 1.0))
        else:
            results[i] = np.float32(1.0)

    return results


# ---------------------------------------------------------------------------
# Observation vector builder
# ---------------------------------------------------------------------------

def build_observation(
    car: Car,
    wall_segments: list[tuple[tuple[float, float], tuple[float, float]]],
    next_checkpoint_pos: tuple[float, float],
    config: dict,
    track: Track | None = None,
    track_progress: float = 0.0,
) -> np.ndarray:
    """Build the complete observation vector for the RL agent.

    Layout: [ray_0..ray_12, speed, angular_vel, drift, health, checkpoint_angle,
             curvature_1, curvature_2, curvature_3]
    Shape: (21,), all values in [0.0, 1.0], dtype float32.

    Normalization:
    - Ray distances: distance / max_ray_distance, clamped [0, 1]
    - Speed: abs(car.speed) / max_speed (use abs -- agent sees forward+backward)
    - Angular velocity: (angular_vel + max_angular_vel) / (2 * max_angular_vel)
      -> 0.5 means no turn, 0.0 = max CCW, 1.0 = max CW
    - Drift: 1.0 if car.is_drifting else 0.0
    - Health: car.health / max_health
    - Angle to next checkpoint: relative angle normalized so 0.5 = straight ahead
    - Curvature 1/2/3: track curvature at 1/2/3 centerline points ahead
      -> 0.0 = sharp left, 0.5 = straight, 1.0 = sharp right

    Args:
        car: Car instance (has position, angle, speed, angular_velocity, health, is_drifting).
        wall_segments: Wall segments for ray casting.
        next_checkpoint_pos: (x, y) world position of the next training checkpoint.
        config: Full game config dict.
        track: Track instance for curvature lookahead (required for curvature obs).
        track_progress: Car's current fractional track progress index.

    Returns:
        numpy array of shape (21,), dtype float32, all values in [0.0, 1.0].
    """
    max_speed: float = config["car"]["max_speed"]
    max_health: float = config["damage"]["max_health"]
    max_angular_vel: float = config["car"]["steering_speed"]

    obs = np.empty(OBS_SIZE, dtype=np.float32)

    # --- Rays (indices 0-12) ------------------------------------------------
    obs[:NUM_RAYS] = cast_observation_rays(
        car.position, car.angle, wall_segments
    )

    # --- Speed (index 13) ---------------------------------------------------
    obs[NUM_RAYS] = np.float32(np.clip(abs(car.speed) / max_speed, 0.0, 1.0))

    # --- Angular velocity (index 14) ----------------------------------------
    # Map from [-max_angular_vel, +max_angular_vel] to [0, 1].
    # 0.5 = straight, 0.0 = max CCW, 1.0 = max CW.
    obs[NUM_RAYS + 1] = np.float32(np.clip(
        (car.angular_velocity + max_angular_vel) / (2.0 * max_angular_vel),
        0.0, 1.0,
    ))

    # --- Drift (index 15) --------------------------------------------------
    obs[NUM_RAYS + 2] = np.float32(1.0 if car.is_drifting else 0.0)

    # --- Health (index 16) --------------------------------------------------
    obs[NUM_RAYS + 3] = np.float32(np.clip(car.health / max_health, 0.0, 1.0))

    # --- Angle to next checkpoint (index 17) --------------------------------
    dx = next_checkpoint_pos[0] - car.position[0]
    dy = next_checkpoint_pos[1] - car.position[1]
    absolute_angle = math.atan2(dy, dx)
    relative_angle = absolute_angle - car.angle
    # Normalize to [-pi, pi]
    relative_angle = (relative_angle + math.pi) % (2.0 * math.pi) - math.pi
    # Map to [0, 1] where 0.5 = pointing straight at checkpoint
    obs[NUM_RAYS + 4] = np.float32((relative_angle + math.pi) / (2.0 * math.pi))

    # --- Track curvature lookahead (indices 18-20) --------------------------
    num_lookahead: int = int(config.get("ai", {}).get(
        "curvature_lookahead_steps", NUM_CURVATURE_LOOKAHEAD
    ))
    if track is not None:
        curvatures = track.get_curvature_lookahead(track_progress, num_lookahead)
    else:
        curvatures = [0.5] * num_lookahead  # default: straight ahead
    for i, curv in enumerate(curvatures):
        obs[NUM_RAYS + 5 + i] = np.float32(curv)

    return obs


# ---------------------------------------------------------------------------
# Gymnasium observation space
# ---------------------------------------------------------------------------

def make_observation_space(
    num_rays: int = NUM_RAYS,
    num_state_values: int = NUM_STATE_VALUES,
) -> gym.spaces.Box:
    """Create the Gymnasium observation space definition.

    Returns a Box space with shape (num_rays + num_state_values,) = (21,),
    low=0.0, high=1.0, dtype=float32.

    Args:
        num_rays: Number of ray cast distance values. Default 13.
        num_state_values: Number of car/track state values. Default 8.

    Returns:
        gymnasium.spaces.Box with shape (21,) and bounds [0, 1].
    """
    size = num_rays + num_state_values
    return gym.spaces.Box(
        low=0.0,
        high=1.0,
        shape=(size,),
        dtype=np.float32,
    )
