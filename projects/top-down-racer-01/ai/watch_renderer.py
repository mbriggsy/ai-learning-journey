"""Arcade view for watching the RL agent drive in real-time.

WatchView is an arcade.View that reads live state from a RacingEnv and
draws the game plus AI-specific visualizations:
  - 13 ray-cast lines (green = open road, red = wall nearby)
  - Training checkpoint (breadcrumb) dots on the track centerline
  - Mini action HUD showing current steering / throttle / drift values

This module is only imported when render_mode="human" is requested, so
headless training has zero cost from this file.
"""

from __future__ import annotations

import math
from typing import TYPE_CHECKING

import arcade
import numpy as np

from game.camera import GameCamera
from game.hud import HUD
from ai.observations import RAY_ANGLES_RAD

if TYPE_CHECKING:
    from ai.racing_env import RacingEnv


class WatchView(arcade.View):
    """Arcade view that renders a RacingEnv for human observation.

    Reads live state from the env each frame — no game objects are
    duplicated here. Designed for manual rendering (called step-by-step
    from RacingEnv.render()) rather than arcade's event loop.

    Args:
        env: The RacingEnv instance whose state to render.
        config: Full game config dict.
        render_options: Dict of display flags from watch.py CLI args:
            show_rays (bool): Draw ray-cast visualization. Default True.
            show_breadcrumbs (bool): Draw training checkpoint dots. Default True.
    """

    def __init__(
        self,
        env: RacingEnv,
        config: dict,
        render_options: dict | None = None,
    ) -> None:
        super().__init__()

        self._env = env
        self._config = config
        self._opts: dict = render_options or {}

        screen = config["screen"]
        self._screen_w: int = screen["width"]
        self._screen_h: int = screen["height"]

        # ── Colors from config ─────────────────────────────────────────
        colors = config["colors"]
        self._bg_color: tuple = tuple(colors["background_color"])
        self._car_color: tuple = tuple(colors["car_color"])
        trail_rgb = tuple(colors["drift_trail_color"])
        self._trail_color: tuple = trail_rgb[:3]  # strip alpha if present
        self._trail_width: int = int(config["drift"]["trail_width"])

        # ── Camera (smooth follow + look-ahead) ───────────────────────
        self._camera = GameCamera(config)
        spawn_x, spawn_y, _ = env._track.get_spawn_position()
        self._camera.reset(spawn_x, spawn_y)

        # ── HUD (reuses existing Phase 1 HUD) ────────────────────────
        self._hud = HUD(config, self._screen_w, self._screen_h)

        # ── Track shapes (built once, drawn every frame) ──────────────
        self._track_shapes = env._track.build_shape_list()

        # ── AI config ─────────────────────────────────────────────────
        self._max_ray_dist: float = float(config["ai"]["max_ray_distance"])

    # ------------------------------------------------------------------
    # Called by RacingEnv on env.reset() to snap camera to spawn
    # ------------------------------------------------------------------

    def handle_reset(self) -> None:
        """Snap the camera to the car's new spawn position instantly.

        Called by RacingEnv.reset() so the camera doesn't drift across
        the track during the brief gap between episodes.
        """
        spawn_x, spawn_y, _ = self._env._track.get_spawn_position()
        self._camera.reset(spawn_x, spawn_y)

    # ------------------------------------------------------------------
    # Main draw method — called manually from RacingEnv.render()
    # ------------------------------------------------------------------

    def on_draw(self) -> None:
        """Render one frame: track + AI visualizations + HUD + action bars.

        Called manually from RacingEnv.render() — not by arcade's event loop.
        """
        car = self._env._car

        # 1. Update camera to follow car with smooth lerp and look-ahead
        self._camera.update(car.position, car.velocity)

        # 2. Clear background
        bg = self._bg_color
        self.clear(color=arcade.types.Color(bg[0], bg[1], bg[2], 255))

        # 3. World space — everything scrolls with the camera
        self._camera.use()

        self._track_shapes.draw()

        if self._opts.get("show_breadcrumbs", True):
            self._draw_breadcrumbs()

        self._draw_drift_trails(car)
        self._draw_car(car)

        if self._opts.get("show_rays", True):
            self._draw_rays(car)

        # 4. HUD (manages its own fixed camera internally)
        env = self._env
        lap_number = env._laps_completed + 1
        lap_time = (env._step_count - env._lap_start_step) * env._dt
        best_lap = min(env._lap_times) if env._lap_times else float("inf")
        self._hud.draw(car, lap_number, 0, lap_time, best_lap)

        # 5. AI action overlay — drawn in screen space (HUD camera still active)
        self._draw_ai_hud(env._last_action)

    # ------------------------------------------------------------------
    # Car + trail drawing (mirrors RacerView exactly)
    # ------------------------------------------------------------------

    def _draw_car(self, car) -> None:
        """Draw the car as a filled rectangle with a yellow nose triangle."""
        corners = car.get_corners()
        arcade.draw_polygon_filled(corners, self._car_color)

        fl, fr = corners[0], corners[1]
        front_mid_x = (fl[0] + fr[0]) / 2
        front_mid_y = (fl[1] + fr[1]) / 2
        nose_x = front_mid_x + math.cos(car.angle) * 10.0
        nose_y = front_mid_y + math.sin(car.angle) * 10.0
        arcade.draw_polygon_filled([fl, (nose_x, nose_y), fr], (255, 220, 80))

    def _draw_drift_trails(self, car) -> None:
        """Draw fading drift trail points behind the car."""
        for point in car.drift_trail_points:
            alpha = int(point["opacity"] * 180)
            if alpha < 5:
                continue
            arcade.draw_point(
                point["pos"][0],
                point["pos"][1],
                (*self._trail_color, alpha),
                self._trail_width,
            )

    # ------------------------------------------------------------------
    # AI visualizations
    # ------------------------------------------------------------------

    def _draw_rays(self, car) -> None:
        """Draw the 13 ray-cast lines.

        Each ray is colored on a red-to-green gradient:
        - Red  (norm_dist = 0.0) = wall is right there
        - Green (norm_dist = 1.0) = open road ahead, no wall in range

        Source: env._last_obs[:13] holds the normalized distances from
        the most recent build_observation() call.
        """
        last_obs = self._env._last_obs
        if last_obs is None:
            return

        ox = float(car.position[0])
        oy = float(car.position[1])

        for i, rel_angle in enumerate(RAY_ANGLES_RAD):
            norm_dist = float(last_obs[i])  # [0, 1]
            dist = norm_dist * self._max_ray_dist

            ray_angle = car.angle + float(rel_angle)
            end_x = ox + math.cos(ray_angle) * dist
            end_y = oy + math.sin(ray_angle) * dist

            # Green when clear, red when close to wall
            r = int((1.0 - norm_dist) * 255)
            g = int(norm_dist * 220)
            arcade.draw_line(ox, oy, end_x, end_y, (r, g, 0, 160), 1.5)

            # Small dot at the hit point
            if norm_dist < 1.0:
                arcade.draw_circle_filled(end_x, end_y, 3.0, (r, g, 0, 200))

    def _draw_breadcrumbs(self) -> None:
        """Draw training checkpoint dots along the track centerline.

        All checkpoints are shown as faint white circles. The *next*
        checkpoint (the one the agent is currently aiming for) is shown
        as a bright pulsing yellow dot.
        """
        checkpoints = self._env._training_checkpoints
        next_idx = self._env._next_checkpoint_idx

        for i, (cx, cy) in enumerate(checkpoints):
            if i == next_idx:
                # Next target — bright yellow, slightly larger
                arcade.draw_circle_filled(cx, cy, 9.0, (255, 255, 0, 200))
                arcade.draw_circle_outline(cx, cy, 12.0, (255, 255, 0, 80), 1.5)
            else:
                # Visited / upcoming — faint white
                arcade.draw_circle_filled(cx, cy, 4.0, (220, 220, 220, 45))

    def _draw_ai_hud(self, action: np.ndarray | None) -> None:
        """Draw steering / throttle / drift action bars in the bottom-right.

        Three small horizontal bars at the bottom-right corner show the
        agent's current action values at a glance. The HUD camera is
        already active when this is called.

        Layout (screen coords, bottom-right area):
            Steering  [-1 ... 0 ... +1]  blue←  →red
            Throttle  [   0 ... +1    ]  green / orange for reverse
            Drift     [   0 ... +1    ]  purple when engaged (> 0.5)
        """
        if action is None:
            return

        # Bar geometry
        bar_w = 140.0
        bar_h = 10.0
        margin_x = self._screen_w - bar_w - 20.0
        spacing = 32.0
        base_y = 20.0

        labels = ["Steer", "Throttle", "Drift"]
        values = [float(action[0]), float(action[1]), float(action[2])]

        for idx, (label, val) in enumerate(zip(labels, values)):
            bar_y = base_y + idx * spacing

            # Background track
            arcade.draw_rect_filled(
                arcade.LBWH(margin_x, bar_y, bar_w, bar_h),
                (30, 30, 30, 200),
            )

            if idx == 0:
                # Steering: centered bar, blue left, red right
                center_x = margin_x + bar_w / 2
                fill_w = abs(val) * (bar_w / 2)
                fill_x = center_x - fill_w if val < 0 else center_x
                color = (80, 80, 255, 220) if val < 0 else (255, 80, 80, 220)
                if abs(val) > 0.05:
                    arcade.draw_rect_filled(
                        arcade.LBWH(fill_x, bar_y, fill_w, bar_h),
                        color,
                    )
                # Center tick
                arcade.draw_line(
                    center_x, bar_y, center_x, bar_y + bar_h,
                    (180, 180, 180, 150), 1,
                )
            elif idx == 1:
                # Throttle: left-to-right, green for throttle, orange for reverse
                if val >= 0:
                    fill_w = val * bar_w
                    color = (60, 220, 60, 220)
                else:
                    fill_w = abs(val) * bar_w
                    color = (255, 140, 0, 220)
                if fill_w > 1:
                    arcade.draw_rect_filled(
                        arcade.LBWH(margin_x, bar_y, fill_w, bar_h),
                        color,
                    )
            else:
                # Drift: purple fill when engaged
                fill_w = max(0.0, val) * bar_w
                color = (160, 60, 220, 220) if val > 0.5 else (100, 40, 140, 180)
                if fill_w > 1:
                    arcade.draw_rect_filled(
                        arcade.LBWH(margin_x, bar_y, fill_w, bar_h),
                        color,
                    )

            # Bar outline
            arcade.draw_rect_outline(
                arcade.LBWH(margin_x, bar_y, bar_w, bar_h),
                (140, 140, 140, 150),
                border_width=1,
            )

            # Label
            arcade.draw_text(
                f"{label}: {val:+.2f}",
                margin_x,
                bar_y + bar_h + 3,
                (200, 200, 200, 200),
                font_size=9,
            )
