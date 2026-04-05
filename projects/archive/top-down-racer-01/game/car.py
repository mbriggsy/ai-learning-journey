"""Car class with bicycle steering model and drift mechanics.

The car is the core gameplay object. It maintains its own physics state
(position, velocity, angle) and updates each frame based on player input.
Game logic is completely separated from rendering — this module has zero
dependency on arcade or any rendering library.

Physics model:
- Bicycle steering: the car turns from the front, proportional to speed.
- Drift mechanic: holding the handbrake drops rear grip. The velocity vector
  lags behind the facing angle, creating a lateral slide. Angular velocity
  amplifies slightly during drift to swing the rear end out.
- Velocity is a separate vector from the facing direction. During normal
  driving, grip=1.0 snaps velocity to the facing direction instantly.
  During drift, grip=0.3 means 70% of the old velocity direction persists
  each frame, producing the characteristic powerslide.
"""

import math
import numpy as np
from typing import Optional

# ---------------------------------------------------------------------------
# Key codes — match arcade.key constants so we can compare against the
# keys_pressed set without importing arcade in the game logic layer.
# ---------------------------------------------------------------------------
KEY_W = 119
KEY_UP = 65362
KEY_S = 115
KEY_DOWN = 65364
KEY_A = 97
KEY_LEFT = 65361
KEY_D = 100
KEY_RIGHT = 65363
KEY_SPACE = 32


class Car:
    """Player-controlled car with bicycle steering model and drift mechanics.

    The car's physical state is updated each frame by calling update(dt, keys_pressed).
    Rendering code reads position, angle, health, drift trails, etc. to draw the car.

    Coordinate system (arcade default):
        - x increases to the right
        - y increases upward
        - angle 0 = facing right, angle pi/2 = facing up (counterclockwise positive)
    """

    def __init__(self, config: dict, x: float, y: float, angle: float) -> None:
        """Initialize the car at a given position and angle.

        Args:
            config: Full game config dict (contains 'car', 'damage', 'drift' sections).
            x: Initial x position in world pixels.
            y: Initial y position in world pixels.
            angle: Initial facing angle in radians.
        """
        # --- Unpack config into instance attributes for fast access ----------
        car_cfg = config["car"]
        dmg_cfg = config["damage"]
        drift_cfg = config["drift"]

        self.max_speed: float = car_cfg["max_speed"]
        self.acceleration: float = car_cfg["acceleration"]
        self.brake_force: float = car_cfg["brake_force"]
        self.reverse_max_speed: float = car_cfg["reverse_max_speed"]
        self.steering_speed: float = car_cfg["steering_speed"]
        self.drift_grip_multiplier: float = car_cfg["drift_grip_multiplier"]
        self.normal_grip: float = car_cfg["normal_grip"]
        self.mass: float = car_cfg["mass"]
        self.car_width: float = car_cfg["width"]
        self.car_length: float = car_cfg["length"]

        self.wall_damage_multiplier: float = dmg_cfg["wall_damage_multiplier"]
        self.min_damage_speed: float = dmg_cfg["min_damage_speed"]
        self.max_health: float = dmg_cfg["max_health"]

        self.trail_lifetime: float = drift_cfg["trail_lifetime"]

        # --- Friction tuning -------------------------------------------------
        # Per-second friction multiplier. 0.98^60 ~ 0.30 per second at 60fps.
        # Using dt-based exponential decay: speed *= friction_per_second ** dt
        self._friction_per_second: float = 0.3

        # --- Physics state ---------------------------------------------------
        self.position: np.ndarray = np.array([x, y], dtype=np.float64)
        self.angle: float = angle
        self.speed: float = 0.0
        self.angular_velocity: float = 0.0
        self.velocity: np.ndarray = np.array([0.0, 0.0], dtype=np.float64)
        self.health: float = self.max_health
        self.is_drifting: bool = False
        self.drift_trail_points: list[dict] = []
        self.prev_position: np.ndarray = np.array([x, y], dtype=np.float64)

    # ------------------------------------------------------------------
    # Core update
    # ------------------------------------------------------------------

    def update(self, dt: float, keys_pressed: set) -> None:
        """Run one frame of car physics.

        Args:
            dt: Time elapsed since last frame in seconds.
            keys_pressed: Set of integer key codes currently held down.
        """
        # --- Read input flags ------------------------------------------------
        accel = KEY_W in keys_pressed or KEY_UP in keys_pressed
        brake = KEY_S in keys_pressed or KEY_DOWN in keys_pressed
        steer_left = KEY_A in keys_pressed or KEY_LEFT in keys_pressed
        steer_right = KEY_D in keys_pressed or KEY_RIGHT in keys_pressed
        handbrake = KEY_SPACE in keys_pressed

        # --- Speed update ----------------------------------------------------
        if accel:
            self.speed += self.acceleration * dt
            if self.speed > self.max_speed:
                self.speed = self.max_speed
        elif brake:
            if self.speed > 0:
                # Braking while moving forward
                self.speed -= self.brake_force * dt
                if self.speed < 0:
                    self.speed = 0.0
            else:
                # Reversing
                self.speed -= self.acceleration * dt
                if self.speed < -self.reverse_max_speed:
                    self.speed = -self.reverse_max_speed
        else:
            # No throttle/brake input — apply friction decay
            self.speed *= self._friction_per_second ** dt

            # Snap to zero when nearly stopped to avoid drifting creep
            if abs(self.speed) < 1.0:
                self.speed = 0.0

        # --- Steering (bicycle model) ----------------------------------------
        # Only steer when the car is actually moving
        if abs(self.speed) > 10.0:
            # Turn rate scales with speed fraction — tight at low speed,
            # wider at high speed. Multiplied by sign(speed) so steering
            # reverses when driving in reverse (realistic).
            speed_fraction = self.speed / self.max_speed
            turn_amount = self.steering_speed * dt * speed_fraction

            if steer_left:
                self.angle += turn_amount
                self.angular_velocity = self.steering_speed * speed_fraction
            elif steer_right:
                self.angle -= turn_amount
                self.angular_velocity = -self.steering_speed * speed_fraction
            else:
                self.angular_velocity = 0.0
        else:
            self.angular_velocity = 0.0

        # --- Drift mechanic --------------------------------------------------
        if handbrake and abs(self.speed) > 10.0:
            self.is_drifting = True
            grip = self.drift_grip_multiplier

            # Amplify angular velocity during drift — swings the rear end out
            self.angular_velocity *= 1.05
        else:
            self.is_drifting = False
            grip = self.normal_grip

        # Damp angular velocity every frame to prevent infinite spinning
        self.angular_velocity *= 0.92

        # Apply residual angular velocity to angle (matters most during drift
        # when the amplification pushes it beyond the steering input)
        if not steer_left and not steer_right and abs(self.angular_velocity) > 0.01:
            self.angle += self.angular_velocity * dt

        # Compute the "intended" velocity — where the car wants to go based
        # on its current facing angle and speed.
        forward = np.array([math.cos(self.angle), math.sin(self.angle)])
        intended_velocity = forward * self.speed

        # Lerp actual velocity toward intended velocity.
        # grip=1.0: velocity instantly matches facing (no slide)
        # grip=0.3: velocity retains 70% of old direction (lateral slide)
        self.velocity = self.velocity * (1.0 - grip) + intended_velocity * grip

        # --- Position update -------------------------------------------------
        self.prev_position = self.position.copy()
        self.position += self.velocity * dt

        # --- Drift trail management ------------------------------------------
        self._update_drift_trails(dt)

    # ------------------------------------------------------------------
    # Drift trail helpers
    # ------------------------------------------------------------------

    def _update_drift_trails(self, dt: float) -> None:
        """Add new trail points if drifting, age and cull existing points."""
        if self.is_drifting and abs(self.speed) > self.min_damage_speed:
            # Compute rear wheel positions
            half_length = self.car_length / 2.0
            half_width = self.car_width / 2.0
            cos_a = math.cos(self.angle)
            sin_a = math.sin(self.angle)

            # Rear-left wheel: back along facing, then left perpendicular
            rl_x = self.position[0] - cos_a * half_length + sin_a * half_width
            rl_y = self.position[1] - sin_a * half_length - cos_a * half_width

            # Rear-right wheel: back along facing, then right perpendicular
            rr_x = self.position[0] - cos_a * half_length - sin_a * half_width
            rr_y = self.position[1] - sin_a * half_length + cos_a * half_width

            self.drift_trail_points.append(
                {"pos": (rl_x, rl_y), "opacity": 1.0, "age": 0.0}
            )
            self.drift_trail_points.append(
                {"pos": (rr_x, rr_y), "opacity": 1.0, "age": 0.0}
            )

        # Age all trail points and fade opacity
        for point in self.drift_trail_points:
            point["age"] += dt
            point["opacity"] = max(0.0, 1.0 - point["age"] / self.trail_lifetime)

        # Remove expired trails
        self.drift_trail_points = [
            p for p in self.drift_trail_points if p["age"] < self.trail_lifetime
        ]

    # ------------------------------------------------------------------
    # Damage
    # ------------------------------------------------------------------

    def apply_damage(self, amount: float) -> None:
        """Reduce health by the given amount, clamped to zero.

        Args:
            amount: Damage to apply (positive value).
        """
        self.health = max(0.0, self.health - amount)

    # ------------------------------------------------------------------
    # Geometry
    # ------------------------------------------------------------------

    def get_corners(self) -> list[tuple[float, float]]:
        """Return the 4 corners of the car rectangle, rotated by the current angle.

        Returns:
            List of (x, y) tuples in order: front-left, front-right,
            rear-right, rear-left. This order forms a clockwise polygon
            when y points up.
        """
        half_length = self.car_length / 2.0
        half_width = self.car_width / 2.0
        cos_a = math.cos(self.angle)
        sin_a = math.sin(self.angle)

        # Forward and right direction vectors
        fx, fy = cos_a * half_length, sin_a * half_length   # forward
        rx, ry = sin_a * half_width, -cos_a * half_width     # right (perpendicular)

        cx, cy = self.position[0], self.position[1]

        front_left = (cx + fx - rx, cy + fy - ry)
        front_right = (cx + fx + rx, cy + fy + ry)
        rear_right = (cx - fx + rx, cy - fy + ry)
        rear_left = (cx - fx - rx, cy - fy - ry)

        return [front_left, front_right, rear_right, rear_left]

    # ------------------------------------------------------------------
    # Reset / state queries
    # ------------------------------------------------------------------

    def reset(self, x: float, y: float, angle: float) -> None:
        """Full state reset for respawn.

        Args:
            x: New x position.
            y: New y position.
            angle: New facing angle in radians.
        """
        self.position = np.array([x, y], dtype=np.float64)
        self.prev_position = np.array([x, y], dtype=np.float64)
        self.angle = angle
        self.speed = 0.0
        self.angular_velocity = 0.0
        self.velocity = np.array([0.0, 0.0], dtype=np.float64)
        self.health = self.max_health
        self.is_drifting = False
        self.drift_trail_points = []

    @property
    def is_alive(self) -> bool:
        """True if the car still has health remaining."""
        return self.health > 0.0
