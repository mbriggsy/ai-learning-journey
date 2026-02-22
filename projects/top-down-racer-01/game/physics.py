"""Collision detection, wall response, checkpoint crossing, and ray casting.

This module provides all the spatial/geometric computations the game needs:
- Line segment intersection (the fundamental primitive)
- Car-vs-wall collision detection and resolution
- Checkpoint crossing detection (for lap counting)
- Ray casting (for future AI observations)

All functions are pure geometry — no rendering, no arcade dependency.
The Car type is used only for resolve_collision (to mutate position/velocity).
"""

import math
import numpy as np
from dataclasses import dataclass
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from game.car import Car


@dataclass
class CollisionInfo:
    """Data about a single collision between a car edge and a wall segment.

    Attributes:
        point: The (x, y) intersection point in world coordinates.
        normal: Unit vector perpendicular to the wall, pointing toward the car center.
        penetration: Estimated overlap depth in pixels (how far the car has pushed into the wall).
        wall_segment: The ((x1,y1), (x2,y2)) wall segment that was hit.
        car_edge_index: Which car edge was involved (0=front, 1=right, 2=back, 3=left).
    """
    point: tuple[float, float]
    normal: np.ndarray
    penetration: float
    wall_segment: tuple[tuple[float, float], tuple[float, float]]
    car_edge_index: int


# ---------------------------------------------------------------------------
# Segment intersection — the core geometric primitive
# ---------------------------------------------------------------------------

def line_segment_intersection(
    p1: tuple[float, float],
    p2: tuple[float, float],
    p3: tuple[float, float],
    p4: tuple[float, float],
) -> Optional[tuple[float, float]]:
    """Find the intersection point of line segments p1-p2 and p3-p4.

    Uses the parametric form:
        P = p1 + t * (p2 - p1),  t in [0, 1]
        Q = p3 + s * (p4 - p3),  s in [0, 1]

    Solves for t and s via the 2D cross product. If both parameters fall
    within [0, 1], the segments intersect within their extents.

    Args:
        p1: First endpoint of segment A.
        p2: Second endpoint of segment A.
        p3: First endpoint of segment B.
        p4: Second endpoint of segment B.

    Returns:
        (x, y) intersection point if the segments cross, or None if they don't.
    """
    dx1 = p2[0] - p1[0]
    dy1 = p2[1] - p1[1]
    dx2 = p4[0] - p3[0]
    dy2 = p4[1] - p3[1]

    # 2D cross product of the two direction vectors
    denom = dx1 * dy2 - dy1 * dx2

    # Parallel or coincident segments — treat as no intersection
    if abs(denom) < 1e-10:
        return None

    # Vector from p1 to p3
    dx3 = p3[0] - p1[0]
    dy3 = p3[1] - p1[1]

    t = (dx3 * dy2 - dy3 * dx2) / denom
    s = (dx3 * dy1 - dy3 * dx1) / denom

    if 0.0 <= t <= 1.0 and 0.0 <= s <= 1.0:
        ix = p1[0] + t * dx1
        iy = p1[1] + t * dy1
        return (ix, iy)

    return None


# ---------------------------------------------------------------------------
# Wall collision detection
# ---------------------------------------------------------------------------

def check_wall_collisions(
    car_corners: list[tuple[float, float]],
    wall_segments: list[tuple[tuple[float, float], tuple[float, float]]],
) -> list[CollisionInfo]:
    """Check all 4 car edges against all wall segments for intersections.

    The car is represented as a quadrilateral with corners in order:
    front-left (0), front-right (1), rear-right (2), rear-left (3).

    Edges are:
        0: front   (FL -> FR)
        1: right   (FR -> RR)
        2: back    (RR -> RL)
        3: left    (RL -> FL)

    For each intersection found, a CollisionInfo is produced with the wall
    normal oriented to point toward the car's center.

    Args:
        car_corners: List of 4 (x, y) tuples — the car's rotated rectangle.
        wall_segments: List of ((x1,y1), (x2,y2)) wall line segments.

    Returns:
        List of CollisionInfo for every detected intersection.
    """
    collisions: list[CollisionInfo] = []

    # Build the 4 car edges
    edges = [
        (car_corners[0], car_corners[1]),  # front
        (car_corners[1], car_corners[2]),  # right side
        (car_corners[2], car_corners[3]),  # back
        (car_corners[3], car_corners[0]),  # left side
    ]

    # Car center — used to orient the wall normal
    cx = sum(c[0] for c in car_corners) / 4.0
    cy = sum(c[1] for c in car_corners) / 4.0

    for edge_idx, (ep1, ep2) in enumerate(edges):
        for wall in wall_segments:
            wp1, wp2 = wall
            hit = line_segment_intersection(ep1, ep2, wp1, wp2)
            if hit is None:
                continue

            # Compute wall normal (perpendicular to the wall segment)
            wall_dx = wp2[0] - wp1[0]
            wall_dy = wp2[1] - wp1[1]
            wall_len = math.hypot(wall_dx, wall_dy)
            if wall_len < 1e-10:
                continue

            # Two candidate normals — pick the one pointing toward the car center
            nx = -wall_dy / wall_len
            ny = wall_dx / wall_len
            normal = np.array([nx, ny])

            # Dot with vector from hit point to car center
            to_center_x = cx - hit[0]
            to_center_y = cy - hit[1]
            if nx * to_center_x + ny * to_center_y < 0:
                normal = -normal

            # Estimate penetration as the distance from the deepest car corner
            # to the wall line (on the wrong side of it).
            penetration = _estimate_penetration(car_corners, wp1, wp2, normal)

            collisions.append(CollisionInfo(
                point=hit,
                normal=normal,
                penetration=max(penetration, 1.0),  # at least 1px push-out
                wall_segment=wall,
                car_edge_index=edge_idx,
            ))

    return collisions


def _estimate_penetration(
    corners: list[tuple[float, float]],
    wp1: tuple[float, float],
    wp2: tuple[float, float],
    normal: np.ndarray,
) -> float:
    """Estimate how far the car has penetrated past a wall.

    Projects each car corner onto the wall normal and finds the maximum
    penetration depth (how far any corner has crossed to the wrong side
    of the wall line).

    Args:
        corners: The 4 car corner positions.
        wp1: First endpoint of the wall segment.
        wp2: Second endpoint of the wall segment.
        normal: Unit normal of the wall pointing toward the car interior.

    Returns:
        Estimated penetration depth in pixels (>= 0).
    """
    # A point on the wall line
    wx, wy = wp1

    max_pen = 0.0
    for cx, cy in corners:
        # Signed distance from this corner to the wall line along the normal
        dist = (cx - wx) * normal[0] + (cy - wy) * normal[1]
        # Negative distance means the corner is on the wall side (penetrating)
        if dist < 0:
            max_pen = max(max_pen, -dist)

    return max_pen


# ---------------------------------------------------------------------------
# Collision resolution
# ---------------------------------------------------------------------------

def resolve_collision(car: "Car", collision: CollisionInfo, config: dict) -> float:
    """Push the car out of a wall and compute damage from the impact.

    Resolution steps:
    1. Move the car position along the wall normal by the penetration depth.
    2. Kill (and slightly reflect) the velocity component along the normal.
    3. Compute damage based on the impact speed component.

    Args:
        car: The Car object to mutate (position, velocity, speed).
        collision: The CollisionInfo describing the intersection.
        config: Full game config dict (needs config['damage']).

    Returns:
        Damage amount to apply (caller should call car.apply_damage with this).
    """
    dmg_cfg = config["damage"]
    wall_damage_multiplier: float = dmg_cfg["wall_damage_multiplier"]
    min_damage_speed: float = dmg_cfg["min_damage_speed"]

    normal = collision.normal

    # 1. Push car out of wall
    car.position += normal * collision.penetration

    # 2. Compute velocity component along wall normal
    v_along_normal = float(np.dot(car.velocity, normal))

    if v_along_normal < 0:
        # Car is moving into the wall — remove that component with a
        # small bounce factor (0.3 = 30% energy retained as bounce)
        bounce = 0.3
        car.velocity -= normal * v_along_normal * (1.0 + bounce)

        # Update scalar speed to match the new velocity magnitude
        new_speed = float(np.linalg.norm(car.velocity))
        # Preserve the sign of speed (forward vs reverse)
        if car.speed >= 0:
            car.speed = new_speed
        else:
            car.speed = -new_speed

    # 3. Compute damage
    impact_speed = abs(v_along_normal)
    if impact_speed > min_damage_speed:
        damage = (impact_speed - min_damage_speed) * wall_damage_multiplier
    else:
        damage = 0.0

    return damage


# ---------------------------------------------------------------------------
# Checkpoint detection
# ---------------------------------------------------------------------------

def check_checkpoint(
    car_pos: np.ndarray,
    car_prev_pos: np.ndarray,
    checkpoint_segment: tuple[tuple[float, float], tuple[float, float]],
) -> bool:
    """Check if the car crossed a checkpoint segment since last frame.

    Uses line_segment_intersection between the car's movement path
    (prev_pos -> pos) and the checkpoint line segment.

    Args:
        car_pos: Current car position as [x, y].
        car_prev_pos: Previous frame car position as [x, y].
        checkpoint_segment: ((x1, y1), (x2, y2)) defining the checkpoint line.

    Returns:
        True if the car's path crossed the checkpoint segment.
    """
    p1 = (float(car_prev_pos[0]), float(car_prev_pos[1]))
    p2 = (float(car_pos[0]), float(car_pos[1]))
    p3, p4 = checkpoint_segment

    return line_segment_intersection(p1, p2, p3, p4) is not None


# ---------------------------------------------------------------------------
# Ray casting (for future AI observations)
# ---------------------------------------------------------------------------

def cast_rays(
    position: np.ndarray,
    angle: float,
    wall_segments: list[tuple[tuple[float, float], tuple[float, float]]],
    num_rays: int = 8,
    max_distance: float = 500.0,
) -> list[float]:
    """Cast evenly-spaced rays from a position and return wall distances.

    Rays are spread across a full 360 degrees, centered on the car's facing
    angle. For each ray, the distance to the nearest wall intersection is
    returned, or max_distance if no wall is hit.

    This function is designed for AI observations in Phase 2 — it gives the
    agent a sense of how far walls are in every direction, like a LIDAR scan.

    Args:
        position: Origin point [x, y] to cast rays from.
        angle: Car's facing angle in radians (ray 0 points this direction).
        wall_segments: List of wall ((x1,y1), (x2,y2)) segments.
        num_rays: Number of rays to cast (evenly spaced over 360 degrees).
        max_distance: Maximum ray length in pixels.

    Returns:
        List of distances (one per ray), in order of increasing angle offset.
        Distance is to the nearest wall hit, or max_distance if no hit.
    """
    distances: list[float] = []
    angle_step = 2.0 * math.pi / num_rays
    origin = (float(position[0]), float(position[1]))

    for i in range(num_rays):
        ray_angle = angle + i * angle_step
        dx = math.cos(ray_angle) * max_distance
        dy = math.sin(ray_angle) * max_distance
        ray_end = (origin[0] + dx, origin[1] + dy)

        nearest_dist = max_distance

        for wall in wall_segments:
            wp1, wp2 = wall
            hit = line_segment_intersection(origin, ray_end, wp1, wp2)
            if hit is not None:
                dist = math.hypot(hit[0] - origin[0], hit[1] - origin[1])
                if dist < nearest_dist:
                    nearest_dist = dist

        distances.append(nearest_dist)

    return distances
