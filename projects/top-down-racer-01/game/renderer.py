"""Main game view — update loop, draw loop, input handling.

RacerView is the central arcade.View that wires together the car, track,
physics, camera, and HUD into a playable game. It owns the game loop:

1. on_update: Step car physics, detect collisions, resolve damage,
   check checkpoints, update camera, detect game-over.
2. on_draw: Clear screen, draw world (track + trails + car), draw HUD,
   draw overlays (game over / race complete).
3. on_key_press / on_key_release: Maintain a keys_pressed set passed to
   the car each frame.

The View is created once by main.py. Calling setup() initializes (or
resets) all game state, enabling restart via the R key.
"""

import math

import arcade
import numpy as np

from game.car import Car
from game.track import Track
from game.camera import GameCamera
from game.hud import HUD
from game.physics import check_wall_collisions, resolve_collision, check_checkpoint


class RacerView(arcade.View):
    """Main game view — update loop, draw loop, input handling.

    Owns all game objects (car, track, camera, HUD) and orchestrates
    the frame-by-frame game loop.
    """

    def __init__(self, config: dict) -> None:
        """Initialize the view with game config.

        Does NOT create game objects yet — call setup() after attaching
        the view to a window.

        Args:
            config: Full game config dict loaded from default.yaml.
        """
        super().__init__()
        self.config: dict = config

        # Input state — set of currently held arcade.key constants
        self.keys_pressed: set[int] = set()

        # These are initialized by setup()
        self.track: Track | None = None
        self.car: Car | None = None
        self.camera: GameCamera | None = None
        self.hud: HUD | None = None
        self.track_shapes: arcade.shape_list.ShapeElementList | None = None

        # Cached geometry (set by setup)
        self._wall_segments: list = []
        self._checkpoint_segments: list = []

        # Game state (set by setup)
        self.lap: int = 1
        self.lap_time: float = 0.0
        self.best_lap_time: float = float("inf")
        self.checkpoints_hit: set[int] = set()
        self.game_over: bool = False
        self.race_complete: bool = False

        # Colors from config
        colors_cfg = config["colors"]
        self._bg_color: tuple[int, int, int] = tuple(colors_cfg["background_color"])
        self._car_color: tuple[int, int, int] = tuple(colors_cfg["car_color"])
        self._trail_color: tuple[int, int, int] = tuple(colors_cfg["drift_trail_color"])
        self._trail_width: int = config["drift"]["trail_width"]

    def setup(self) -> None:
        """Initialize or reset all game state.

        Called once after the view is attached to the window, and again
        each time the player restarts (R key after game over).
        """
        screen_cfg = self.config["screen"]
        screen_w = screen_cfg["width"]
        screen_h = screen_cfg["height"]

        # Build track
        self.track = Track.from_config(self.config)
        self.track_shapes = self.track.build_shape_list()

        # Cache geometry for per-frame collision / checkpoint checks
        self._wall_segments = self.track.get_wall_segments()
        self._checkpoint_segments = self.track.get_checkpoint_segments()

        # Spawn car
        spawn_x, spawn_y, spawn_angle = self.track.get_spawn_position()
        self.car = Car(self.config, spawn_x, spawn_y, spawn_angle)

        # Camera — snap to spawn position (no lerp on first frame)
        self.camera = GameCamera(self.config)
        self.camera.reset(spawn_x, spawn_y)

        # HUD
        self.hud = HUD(self.config, screen_w, screen_h)

        # Lap tracking
        self.lap = 1
        self.lap_time = 0.0
        self.best_lap_time = float("inf")
        self.checkpoints_hit = set()
        self.game_over = False
        self.race_complete = False

        # Clear any held keys from previous game
        self.keys_pressed.clear()

    # ------------------------------------------------------------------
    # Game loop
    # ------------------------------------------------------------------

    def on_update(self, delta_time: float) -> None:
        """Run one frame of game logic.

        Args:
            delta_time: Seconds elapsed since the previous frame.
        """
        if self.game_over or self.race_complete:
            return

        # 1. Car physics
        self.car.update(delta_time, self.keys_pressed)

        # 2. Wall collisions
        corners = self.car.get_corners()
        collisions = check_wall_collisions(corners, self._wall_segments)
        for collision in collisions:
            damage = resolve_collision(self.car, collision, self.config)
            self.car.apply_damage(damage)

        # 3. Checkpoint detection + lap completion
        # The finish line (start/finish) is the LAST segment in the list.
        # We split detection into two stages:
        #   a) Intermediate checkpoints — tracked in checkpoints_hit set
        #   b) Finish line — only becomes "hot" once all intermediates are done
        #
        # This prevents the finish line crossing at spawn from counting,
        # because all_intermediate_hit will be False until the car has
        # gone around and hit the other checkpoints first.
        finish_line_idx = len(self._checkpoint_segments) - 1

        # Stage a: intermediate checkpoints
        for i, cp_seg in enumerate(self._checkpoint_segments[:-1]):
            if i not in self.checkpoints_hit:
                if check_checkpoint(self.car.position, self.car.prev_position, cp_seg):
                    self.checkpoints_hit.add(i)

        # Stage b: finish line — only active once all intermediates are hit
        all_intermediate_hit = len(self.checkpoints_hit) == finish_line_idx
        if all_intermediate_hit:
            finish_seg = self._checkpoint_segments[finish_line_idx]
            if check_checkpoint(self.car.position, self.car.prev_position, finish_seg):
                # Lap complete!
                if self.lap_time < self.best_lap_time:
                    self.best_lap_time = self.lap_time

                self.lap += 1
                self.lap_time = 0.0
                self.checkpoints_hit = set()

                # Check race completion
                if self.lap > self.track.total_laps:
                    self.lap = self.track.total_laps  # Display final lap number
                    self.race_complete = True
                    return

        # 5. Update lap time
        self.lap_time += delta_time

        # 6. Camera follow
        self.camera.update(self.car.position, self.car.velocity)

        # 7. Game over check
        if not self.car.is_alive:
            self.game_over = True

    def on_draw(self) -> None:
        """Render the current frame."""
        self.clear(color=self._bg_color)

        # --- World space (scrolls with camera) ---
        self.camera.use()

        # Track surface, walls, checkpoints
        self.track_shapes.draw()

        # Drift trails
        self._draw_drift_trails()

        # Car
        self._draw_car()

        # --- Screen space (HUD overlay) ---
        self.hud.draw(
            self.car,
            self.lap,
            self.track.total_laps,
            self.lap_time,
            self.best_lap_time,
        )

        # Overlays
        if self.game_over:
            self.hud.draw_game_over()
        elif self.race_complete:
            self.hud.draw_race_complete(self.best_lap_time)

    # ------------------------------------------------------------------
    # Input handling
    # ------------------------------------------------------------------

    def on_key_press(self, key: int, modifiers: int) -> None:
        """Handle key down events.

        Args:
            key: The arcade.key constant for the pressed key.
            modifiers: Bitfield of active modifier keys.
        """
        self.keys_pressed.add(key)

        if key == arcade.key.ESCAPE:
            arcade.exit()

        if key == arcade.key.R and (self.game_over or self.race_complete):
            self.setup()

    def on_key_release(self, key: int, modifiers: int) -> None:
        """Handle key up events.

        Args:
            key: The arcade.key constant for the released key.
            modifiers: Bitfield of active modifier keys.
        """
        self.keys_pressed.discard(key)

    # ------------------------------------------------------------------
    # Drawing helpers
    # ------------------------------------------------------------------

    def _draw_car(self) -> None:
        """Draw the car as a filled rectangle with a pointed nose."""
        corners = self.car.get_corners()

        # Main body — filled quadrilateral
        arcade.draw_polygon_filled(corners, self._car_color)

        # Nose indicator — small triangle extending from the front edge center
        # to show which direction the car faces.
        fl, fr = corners[0], corners[1]
        front_mid_x = (fl[0] + fr[0]) / 2
        front_mid_y = (fl[1] + fr[1]) / 2

        # Extend the nose 10px beyond the front center in the facing direction
        nose_length = 10.0
        nose_x = front_mid_x + math.cos(self.car.angle) * nose_length
        nose_y = front_mid_y + math.sin(self.car.angle) * nose_length

        # Bright yellow nose triangle
        nose_color = (255, 220, 80)
        arcade.draw_polygon_filled(
            [fl, (nose_x, nose_y), fr],
            nose_color,
        )

    def _draw_drift_trails(self) -> None:
        """Draw fading drift trail points behind the car."""
        for point in self.car.drift_trail_points:
            alpha = int(point["opacity"] * 180)  # Max 180/255 for subtlety
            if alpha < 5:
                continue  # Skip nearly invisible points
            color = (*self._trail_color, alpha)
            arcade.draw_point(
                point["pos"][0],
                point["pos"][1],
                color,
                self._trail_width,
            )
