"""Reward function for the Richard Petty RL agent.

Separated into its own module so reward shaping can be iterated without
touching the Gymnasium environment or any other system.

All reward weights come from config["ai"] — no magic numbers here.
The function is a pure function with no side effects.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class StepInfo:
    """All information available for reward computation at one timestep.

    Attributes:
        training_checkpoint_reached: True if car collected the next breadcrumb.
        lap_completed: True if the car completed a full lap this step.
        wall_damage: Damage taken from wall collisions this step (0 = no hit).
        dead: True if car health reached 0 this step.
        speed: Current car speed in pixels/second (absolute value).
        prev_steering: Steering action from the previous step [-1, 1].
        curr_steering: Steering action this step [-1, 1].
        is_stuck: True if car has been below stuck_speed_threshold for too long.
        forward_progress: Delta track progress this step (positive = forward along
            centerline, negative = backward). Units are fractional centerline indices.
    """

    training_checkpoint_reached: bool
    lap_completed: bool
    wall_damage: float
    dead: bool
    speed: float
    prev_steering: float
    curr_steering: float
    is_stuck: bool = False
    forward_progress: float = 0.0
    lateral_displacement: float = 0.0


def compute_reward(
    info: StepInfo,
    config: dict,
) -> tuple[float, dict[str, float]]:
    """Compute the total reward for one environment step.

    All reward weights are read from config["ai"]. The function also returns a
    per-component breakdown dict for debugging and TensorBoard logging.

    Reward components:

    1. **Training checkpoint** (primary signal — the breadcrumbs)
       Fires every ~150 px of track. With ~50 per lap this is the backbone of
       learning. Frequent and reliable.

    2. **Lap completion bonus**
       Extra reward on top of the final breadcrumb for a completed lap.

    3. **Speed reward**
       Small continuous reward proportional to speed. Keeps the car moving
       without rewarding recklessness.

    4. **Wall hit penalty** (proportional to damage taken)
       One heavy wall hit ≈ losing 2-3 breadcrumbs worth of reward.

    5. **Death penalty**
       Large negative for health reaching zero.

    6. **Time penalty**
       Small constant each step — prevents sitting-still strategies.

    7. **Smooth steering bonus**
       Small reward for not jerking the wheel — encourages racing lines.

    8. **Stuck penalty**
       Same magnitude as death penalty — being stuck is effectively terminal.

    Args:
        info: StepInfo containing all relevant state for this step.
        config: Full game config dict (reward weights under config["ai"]).

    Returns:
        Tuple of (total_reward, component_breakdown) where component_breakdown
        maps component names to their individual contributions. Positive =
        reward, negative = penalty.

    Example::

        reward, breakdown = compute_reward(info, config)
        # breakdown == {
        #     "checkpoint":      2.0,
        #     "lap":             0.0,
        #     "speed":           0.08,
        #     "wall_penalty":    0.0,
        #     "death_penalty":   0.0,
        #     "time_penalty":   -0.01,
        #     "smooth_steering": 0.01,
        #     "stuck_penalty":   0.0,
        # }
    """
    ai = config.get("ai", {})
    car = config.get("car", {})

    max_speed: float = float(car.get("max_speed", 400.0))

    checkpoint_reward: float = float(ai.get("training_checkpoint_reward", 2.0))
    lap_bonus: float = float(ai.get("lap_completion_bonus", 20.0))
    speed_scale: float = float(ai.get("speed_reward_scale", 0.1))
    wall_scale: float = float(ai.get("wall_damage_penalty_scale", 0.5))
    death_penalty: float = float(ai.get("death_penalty", 20.0))
    time_penalty: float = float(ai.get("time_penalty", 0.01))
    smooth_bonus: float = float(ai.get("smooth_steering_bonus", 0.01))
    fwd_progress_scale: float = float(ai.get("forward_progress_reward_scale", 2.0))
    bwd_progress_scale: float = float(ai.get("backward_progress_penalty_scale", 0.5))
    lateral_scale: float = float(ai.get("lateral_displacement_penalty_scale", 0.005))

    breakdown: dict[str, float] = {
        "checkpoint": 0.0,
        "lap": 0.0,
        "speed": 0.0,
        "forward_progress": 0.0,
        "lateral_penalty": 0.0,
        "wall_penalty": 0.0,
        "death_penalty": 0.0,
        "time_penalty": 0.0,
        "smooth_steering": 0.0,
        "stuck_penalty": 0.0,
    }

    # 1. Training checkpoint (primary learning signal)
    if info.training_checkpoint_reached:
        breakdown["checkpoint"] = checkpoint_reward

    # 2. Lap completion bonus
    if info.lap_completed:
        breakdown["lap"] = lap_bonus

    # 3. Speed reward — encourage driving (set speed_reward_scale=0.0 to disable)
    speed_fraction = min(abs(info.speed) / max_speed, 1.0) if max_speed > 0 else 0.0
    breakdown["speed"] = speed_fraction * speed_scale

    # 3b. Forward progress — reward movement along the track centerline
    if info.forward_progress > 0:
        breakdown["forward_progress"] = info.forward_progress * fwd_progress_scale
    elif info.forward_progress < 0:
        breakdown["forward_progress"] = info.forward_progress * bwd_progress_scale

    # 3c. Lateral displacement penalty — penalize being far from centerline
    if info.lateral_displacement > 0:
        breakdown["lateral_penalty"] = -(info.lateral_displacement * lateral_scale)

    # 4. Wall hit penalty — proportional to damage taken
    if info.wall_damage > 0:
        breakdown["wall_penalty"] = -(info.wall_damage * wall_scale)

    # 5. Death penalty — large negative for dying
    if info.dead:
        breakdown["death_penalty"] = -death_penalty

    # 6. Time penalty — small constant, prevents sitting still
    breakdown["time_penalty"] = -time_penalty

    # 7. Smooth steering bonus — reward small steering changes
    steering_change = abs(info.curr_steering - info.prev_steering)
    if steering_change < 0.1:
        breakdown["smooth_steering"] = smooth_bonus

    # 8. Stuck penalty — same magnitude as death (being stuck is terminal)
    if info.is_stuck:
        breakdown["stuck_penalty"] = -death_penalty

    total = sum(breakdown.values())
    return total, breakdown


def get_reward_range(config: dict) -> tuple[float, float]:
    """Return the theoretical (min, max) reward per step for Gymnasium compliance.

    Gymnasium's Env.reward_range should be set to this value.

    The minimum reward in a single step is: death + stuck + wall + time penalty
    (all worst-case at once, though in practice death and stuck are mutually
    exclusive with most other penalties).

    The maximum reward in a single step is: checkpoint + lap + speed + smooth
    (all best-case at once).

    Args:
        config: Full game config dict.

    Returns:
        (min_reward_per_step, max_reward_per_step) tuple of floats.
    """
    ai = config.get("ai", {})

    checkpoint_reward = float(ai.get("training_checkpoint_reward", 2.0))
    lap_bonus = float(ai.get("lap_completion_bonus", 20.0))
    speed_scale = float(ai.get("speed_reward_scale", 0.1))
    wall_scale = float(ai.get("wall_damage_penalty_scale", 0.5))
    death_penalty = float(ai.get("death_penalty", 20.0))
    time_penalty = float(ai.get("time_penalty", 0.01))
    smooth_bonus = float(ai.get("smooth_steering_bonus", 0.01))
    max_health = float(config.get("damage", {}).get("max_health", 200.0))

    fwd_progress_scale = float(ai.get("forward_progress_reward_scale", 2.0))
    bwd_progress_scale = float(ai.get("backward_progress_penalty_scale", 0.5))
    lateral_scale = float(ai.get("lateral_displacement_penalty_scale", 0.005))

    # Worst-case backward progress in a single step is small (< 1.0 index units)
    max_bwd_progress_penalty = 1.0 * bwd_progress_scale
    # Best-case forward progress in a single step (at max speed, ~6.7 px/frame on
    # a ~300px segment gives ~0.02 index units; use 0.1 as generous upper bound)
    max_fwd_progress_reward = 0.1 * fwd_progress_scale

    # Worst-case lateral displacement: half the track width (car at the wall)
    track_width = float(config.get("track", {}).get("track_width", 120.0))
    max_lateral_penalty = (track_width / 2.0) * lateral_scale

    max_wall_damage = max_health  # worst case: full health in a single hit
    min_reward = -(death_penalty + death_penalty + max_wall_damage * wall_scale + time_penalty + max_bwd_progress_penalty + max_lateral_penalty)
    max_reward = checkpoint_reward + lap_bonus + speed_scale + smooth_bonus + max_fwd_progress_reward

    return (min_reward, max_reward)
