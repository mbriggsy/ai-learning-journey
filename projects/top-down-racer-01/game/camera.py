"""Camera module — smooth-follow viewport with look-ahead bias.

Wraps arcade.Camera2D to provide a cinematic camera that smoothly tracks
the player car. Instead of rigidly centering on the car, the camera lerps
toward the car's position with configurable smoothing and biases slightly
in the direction of travel so the player can see what's coming.

Key behaviors:
- Smooth follow: Camera moves a fraction (follow_speed) of the remaining
  distance to the target each frame. At 0.1, it takes ~23 frames to cover
  90% of the distance — smooth but responsive.
- Look-ahead: The camera target is offset in the direction of the car's
  velocity, scaled by lookahead_factor. This prevents the car from sitting
  dead-center and gives the player better visibility ahead.
- Zoom: Stored from config, applied to the Camera2D. Currently 1.0 (no zoom).
"""

import math

import arcade
import numpy as np


class GameCamera:
    """Smooth-follow camera with look-ahead bias for world-space rendering.

    The camera follows the player car with configurable lag and biases
    its position toward the direction of travel. Uses arcade.Camera2D
    for the underlying viewport transformation.
    """

    def __init__(self, config: dict) -> None:
        """Initialize the camera from game config.

        Args:
            config: Full game config dict (needs 'camera' and 'screen' sections).
        """
        cam_cfg = config["camera"]
        screen_cfg = config["screen"]

        self.follow_speed: float = cam_cfg["follow_speed"]
        self.zoom: float = cam_cfg["zoom"]
        self.lookahead_factor: float = cam_cfg["lookahead_factor"]

        # Maximum look-ahead distance in pixels to prevent wild camera swings
        # at very high speeds. 150px keeps the car visible while showing the
        # road ahead.
        self._max_lookahead: float = 150.0

        self.screen_width: int = screen_cfg["width"]
        self.screen_height: int = screen_cfg["height"]

        # The camera's current smoothed position (world coordinates)
        self._position: np.ndarray = np.array([0.0, 0.0], dtype=np.float64)

        # Create the arcade Camera2D
        self._camera: arcade.Camera2D = arcade.Camera2D()

    def reset(self, x: float, y: float) -> None:
        """Snap the camera to a position instantly (no lerp).

        Used on game start / restart to avoid the camera slowly panning
        from (0,0) to the spawn point.

        Args:
            x: World x coordinate to center on.
            y: World y coordinate to center on.
        """
        self._position[0] = x
        self._position[1] = y
        self._camera.position = (x, y)

    def update(self, car_pos: np.ndarray, car_velocity: np.ndarray) -> None:
        """Update the camera position to follow the car.

        Computes a target point ahead of the car (based on velocity) and
        lerps the camera position toward it.

        Args:
            car_pos: Car's current world position as [x, y].
            car_velocity: Car's current velocity vector as [vx, vy].
        """
        # Compute look-ahead offset
        speed = float(np.linalg.norm(car_velocity))
        if speed > 1.0:
            direction = car_velocity / speed
            lookahead_dist = min(speed * self.lookahead_factor, self._max_lookahead)
            target = car_pos + direction * lookahead_dist
        else:
            target = car_pos.copy()

        # Lerp camera position toward target
        self._position = (
            self._position * (1.0 - self.follow_speed) + target * self.follow_speed
        )

        # Apply to the arcade camera
        self._camera.position = (float(self._position[0]), float(self._position[1]))

    def use(self) -> None:
        """Activate this camera for subsequent world-space draw calls."""
        self._camera.use()
