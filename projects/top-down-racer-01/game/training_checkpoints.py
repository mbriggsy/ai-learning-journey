"""Dense training checkpoints for RL reward shaping.

Generates ~40-60 "breadcrumb" checkpoints along the track centerline at regular
arc-length intervals.  These are invisible to the human player and exist purely
as reward signals for a reinforcement-learning agent.  Dense checkpoints let the
agent learn track progress in ~500K steps instead of millions.

The module is rendering-agnostic — it uses only numpy and has no arcade imports.
"""

from __future__ import annotations

import numpy as np


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_tight_section_indices(
    centerline: np.ndarray,
    curvature_threshold: float = 0.3,
) -> list[int]:
    """Auto-detect tight / high-curvature sections of the track.

    Computes the turn angle at each centerline vertex.  Segments with high
    curvature (sharp turns) are identified as tight sections.

    The turn angle at vertex *i* is the unsigned angle between the incoming
    segment (i-1 -> i) and the outgoing segment (i -> i+1).  A perfectly
    straight section has a turn angle of 0; a 180-degree hairpin has an angle
    of pi.

    Args:
        centerline: (N, 2) numpy array of centerline points.
        curvature_threshold: Minimum turn angle (radians) to flag as tight.
                             0.3 rad ~= 17 degrees.  Hairpins will be ~pi.

    Returns:
        List of segment indices where curvature exceeds the threshold.
        Segment *i* connects centerline[i] to centerline[i+1].
    """
    n = len(centerline)
    tight_indices: list[int] = []

    for i in range(n):
        prev_pt = centerline[(i - 1) % n]
        curr_pt = centerline[i]
        next_pt = centerline[(i + 1) % n]

        vec_in = curr_pt - prev_pt
        vec_out = next_pt - curr_pt

        len_in = np.linalg.norm(vec_in)
        len_out = np.linalg.norm(vec_out)

        if len_in < 1e-9 or len_out < 1e-9:
            continue

        # Cosine of the angle between incoming and outgoing direction.
        cos_angle = float(np.dot(vec_in, vec_out) / (len_in * len_out))
        # Clamp to [-1, 1] to guard against floating-point overshoot.
        cos_angle = max(-1.0, min(1.0, cos_angle))
        turn_angle = np.arccos(cos_angle)

        if turn_angle >= curvature_threshold:
            # Mark the segment *leaving* this vertex as tight.
            tight_indices.append(i)

    return tight_indices


def generate_training_checkpoints(
    centerline: np.ndarray,
    spacing: float = 150.0,
    tight_section_indices: list[int] | None = None,
    zigzag_multiplier: float = 0.7,
) -> list[tuple[float, float]]:
    """Walk the track centerline and drop checkpoints at regular intervals.

    The track is a closed loop — after the last centerline point, it wraps back
    to the first.  Walk the entire loop and place a checkpoint every *spacing*
    pixels of arc length.

    In tight sections (if *tight_section_indices* provided), use
    ``spacing * zigzag_multiplier`` for denser coverage.

    Args:
        centerline: (N, 2) numpy array of track centerline points (closed loop).
        spacing: Target distance between checkpoints in pixels.
        tight_section_indices: Centerline segment indices that are tight /
            technical and should get denser checkpoints.
        zigzag_multiplier: Multiply spacing by this in tight sections (< 1.0
            = tighter spacing = more checkpoints).

    Returns:
        List of (x, y) checkpoint positions along the centerline.
        These are WORLD positions, not indices.
    """
    n = len(centerline)

    if n < 2:
        return []

    tight_set: set[int] = set(tight_section_indices) if tight_section_indices else set()

    checkpoints: list[tuple[float, float]] = []

    # Always include a checkpoint at the very start of the loop.
    checkpoints.append((float(centerline[0][0]), float(centerline[0][1])))

    accumulated = 0.0

    for seg_idx in range(n):
        a = centerline[seg_idx]
        b = centerline[(seg_idx + 1) % n]

        seg_vec = b - a
        seg_len = float(np.linalg.norm(seg_vec))

        if seg_len < 1e-9:
            continue

        seg_dir = seg_vec / seg_len

        # Determine effective spacing for this segment.
        effective_spacing = spacing
        if seg_idx in tight_set:
            effective_spacing = spacing * zigzag_multiplier

        # Walk along this segment, consuming distance.
        walked = 0.0

        while True:
            remaining_to_next = effective_spacing - accumulated
            remaining_in_seg = seg_len - walked

            if remaining_to_next <= remaining_in_seg:
                # Place a checkpoint within this segment.
                walked += remaining_to_next
                point = a + seg_dir * walked
                checkpoints.append((float(point[0]), float(point[1])))
                accumulated = 0.0
            else:
                # This segment is exhausted before the next checkpoint.
                accumulated += remaining_in_seg
                break

    return checkpoints


def check_training_checkpoint(
    car_pos: np.ndarray,
    checkpoint_pos: tuple[float, float],
    radius: float = 40.0,
) -> bool:
    """Check if the car is close enough to a training checkpoint to collect it.

    Uses a simple radius check (not line crossing) for reliability at any speed.

    Args:
        car_pos: Car position as an array-like [x, y].
        checkpoint_pos: Checkpoint (x, y) world position.
        radius: Collection radius in pixels.

    Returns:
        True if the car is within *radius* of the checkpoint.
    """
    dx = float(car_pos[0]) - checkpoint_pos[0]
    dy = float(car_pos[1]) - checkpoint_pos[1]
    return (dx * dx + dy * dy) <= radius * radius


# ---------------------------------------------------------------------------
# Quick smoke test
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import os
    import yaml  # type: ignore[import-untyped]

    # Resolve the config path relative to this file's location.
    _here = os.path.dirname(os.path.abspath(__file__))
    config_path = os.path.join(_here, os.pardir, "configs", "default.yaml")

    with open(config_path, "r") as f:
        config = yaml.safe_load(f)

    centerline = np.array(config["track"]["centerline_points"], dtype=np.float64)

    # --- Without tight-section detection ---
    cps_uniform = generate_training_checkpoints(centerline, spacing=150.0)
    print(f"Uniform spacing (150px):   {len(cps_uniform)} checkpoints")

    # --- With tight-section detection ---
    tight = get_tight_section_indices(centerline, curvature_threshold=0.3)
    cps_adaptive = generate_training_checkpoints(
        centerline,
        spacing=150.0,
        tight_section_indices=tight,
        zigzag_multiplier=0.7,
    )
    print(f"Adaptive spacing (150px):  {len(cps_adaptive)} checkpoints")
    print(f"Tight section indices:     {tight}")

    # --- Compute total centerline perimeter for reference ---
    n = len(centerline)
    perimeter = sum(
        float(np.linalg.norm(centerline[(i + 1) % n] - centerline[i]))
        for i in range(n)
    )
    print(f"Track perimeter:           {perimeter:.0f} px")

    # --- Quick radius-check test ---
    if len(cps_uniform) >= 2:
        cp = cps_uniform[0]
        near = np.array([cp[0] + 10.0, cp[1]])
        far = np.array([cp[0] + 100.0, cp[1]])
        print(f"Radius check (10px away):  {check_training_checkpoint(near, cp, 40.0)}")
        print(f"Radius check (100px away): {check_training_checkpoint(far, cp, 40.0)}")
