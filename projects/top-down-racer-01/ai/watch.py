"""Watch Richard Petty drive using a trained PPO model.

Loads a trained model and runs it in the game with full Arcade rendering.
Arcade owns the main loop via arcade.run(). The RL agent calls model.predict()
and env.step() from inside WatchWindow.on_update() each frame — no blocking
while-loop, no frozen window.

Optional visualizations (enabled by default):
  - Ray lines from the car (green = far, red = close) showing what the AI sees
  - Training checkpoint dots on the track (faint, next one highlighted)
  - Mini HUD showing current steering / throttle / drift values
  - Episode info overlay (top-right): episode #, step count, reward

Usage::

    python -m ai.watch                                    # latest model (auto-detected)
    python -m ai.watch --model models/richard_petty_v1   # specific model
    python -m ai.watch --speed 2                          # 2 env steps per frame
    python -m ai.watch --no-rays                          # hide ray visualization
    python -m ai.watch --no-breadcrumbs                   # hide breadcrumb dots
"""

from __future__ import annotations

import argparse
import math
import os
import sys
from pathlib import Path

# Ensure the project root is importable when running as `python ai/watch.py`
_project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

import arcade
import numpy as np
import yaml

from ai.observations import RAY_ANGLES_RAD
from game.camera import GameCamera
from game.hud import HUD


def find_latest_model(model_dir: Path) -> Path | None:
    """Find the most recently modified .zip model file in model_dir.

    Args:
        model_dir: Directory to search for .zip model files.

    Returns:
        Path to the latest model file, or None if no models found.
    """
    if not model_dir.exists():
        return None
    zips = sorted(model_dir.glob("*.zip"), key=lambda p: p.stat().st_mtime)
    return zips[-1] if zips else None


class WatchWindow(arcade.Window):
    """Arcade window that runs the RL agent autonomously.

    Arcade owns the main loop via arcade.run(). model.predict() and env.step()
    are called inside on_update() each frame — never in a blocking while-loop.
    This keeps the event queue pumped and the window responsive at all times.

    Args:
        model: Loaded SB3 PPO model.
        env: RacingEnv instance (must be initialized with render_mode='rgb_array').
        config: Full game config dict loaded from default.yaml.
        render_options: Display flags: show_rays (bool), show_breadcrumbs (bool).
        speed_multiplier: Number of env steps taken per visual frame (default 1).
    """

    def __init__(
        self,
        model,
        env,
        config: dict,
        render_options: dict,
        speed_multiplier: float = 1.0,
    ) -> None:
        """Initialize the watch window and perform the first env reset."""
        screen = config["screen"]
        super().__init__(
            screen["width"],
            screen["height"],
            "AI Watch Mode - richard_petty_v1",
        )

        self._model = model
        self._env = env
        self._config = config
        self._opts = render_options
        # Integer steps per frame — 1 at normal speed, more for fast-forward
        self._steps_per_frame: int = max(1, round(speed_multiplier))

        # Colors from config
        colors = config["colors"]
        self._bg_color: tuple = tuple(colors["background_color"])
        self._car_color: tuple = tuple(colors["car_color"])
        trail_rgb = tuple(colors["drift_trail_color"])
        self._trail_color: tuple = trail_rgb[:3]
        self._trail_width: int = int(config["drift"]["trail_width"])
        self._max_ray_dist: float = float(config["ai"]["max_ray_distance"])

        # Camera and HUD (require OpenGL context — created after super().__init__)
        self._camera = GameCamera(config)
        self._hud = HUD(config, screen["width"], screen["height"])

        # Track shapes built once; draw() is called every frame
        self._track_shapes = env._track.build_shape_list()

        # Episode tracking
        self._episode: int = 1
        self._step_count: int = 0
        self._episode_reward: float = 0.0
        self._last_reward: float = 0.0

        # Initial env reset — snap camera to spawn
        self._obs, _ = env.reset()
        spawn_x, spawn_y, _ = env._track.get_spawn_position()
        self._camera.reset(spawn_x, spawn_y)

    # ------------------------------------------------------------------
    # Arcade event loop callbacks
    # ------------------------------------------------------------------

    def on_update(self, delta_time: float) -> None:
        """Step the RL agent and environment each frame.

        Called by Arcade at ~60 fps. Calls model.predict() and env.step()
        inside the event loop so the window stays responsive. Multiple steps
        per frame implement the playback speed multiplier.

        Args:
            delta_time: Seconds elapsed since the previous frame (unused —
                the env uses its own fixed timestep internally).
        """
        for _ in range(self._steps_per_frame):
            action, _ = self._model.predict(self._obs, deterministic=True)
            obs, reward, terminated, truncated, info = self._env.step(action)
            self._obs = obs
            self._last_reward = float(reward)
            self._episode_reward += self._last_reward
            self._step_count += 1

            if terminated or truncated:
                laps = info.get("laps_completed", 0)
                print(
                    f"Episode {self._episode:3d} ended | "
                    f"steps={self._step_count} | "
                    f"reward={self._episode_reward:+.1f} | "
                    f"laps={laps}"
                )
                self._obs, _ = self._env.reset()
                self._episode += 1
                self._step_count = 0
                self._episode_reward = 0.0
                self._last_reward = 0.0
                spawn_x, spawn_y, _ = self._env._track.get_spawn_position()
                self._camera.reset(spawn_x, spawn_y)
                break  # Don't keep stepping after a reset — wait for next frame

        # Update camera to follow car with smooth lerp and look-ahead
        car = self._env._car
        self._camera.update(car.position, car.velocity)

    def on_draw(self) -> None:
        """Render the current game state.

        World space: track, breadcrumbs, drift trails, car body, ray lines.
        Screen space: HUD (speed/health/lap), action bars, episode info overlay.
        """
        self.clear(color=self._bg_color)

        car = self._env._car

        # --- World space (scrolls with camera) ---
        self._camera.use()

        self._track_shapes.draw()

        if self._opts.get("show_breadcrumbs", True):
            self._draw_breadcrumbs()

        self._draw_drift_trails(car)
        self._draw_car(car)

        if self._opts.get("show_rays", True):
            self._draw_rays(car)

        # --- Screen space (HUD — manages its own camera internally) ---
        env = self._env
        lap_number = env._laps_completed + 1
        lap_time = (env._step_count - env._lap_start_step) * env._dt
        best_lap = min(env._lap_times) if env._lap_times else float("inf")
        self._hud.draw(car, lap_number, 0, lap_time, best_lap)

        # Action bars and episode overlay (HUD camera still active from above)
        self._draw_ai_hud(env._last_action)
        self._draw_episode_info()

    def on_key_press(self, key: int, modifiers: int) -> None:
        """Handle key events.

        Args:
            key: Arcade key constant.
            modifiers: Bitfield of active modifier keys.
        """
        if key == arcade.key.ESCAPE:
            self._env.close()
            arcade.exit()

    # ------------------------------------------------------------------
    # Drawing helpers — adapted from ai/watch_renderer.py
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

    def _draw_rays(self, car) -> None:
        """Draw the 12 ray-cast lines colored green (far) to red (close).

        Source: env._last_obs[:12] holds the normalized distances from the
        most recent build_observation() call.
        """
        last_obs = self._env._last_obs
        if last_obs is None:
            return

        ox = float(car.position[0])
        oy = float(car.position[1])

        for i, rel_angle in enumerate(RAY_ANGLES_RAD):
            norm_dist = float(last_obs[i])  # normalized [0, 1]
            dist = norm_dist * self._max_ray_dist

            ray_angle = car.angle + float(rel_angle)
            end_x = ox + math.cos(ray_angle) * dist
            end_y = oy + math.sin(ray_angle) * dist

            # Green when open road, red when close to a wall
            r = int((1.0 - norm_dist) * 255)
            g = int(norm_dist * 220)
            arcade.draw_line(ox, oy, end_x, end_y, (r, g, 0, 160), 1.5)

            if norm_dist < 1.0:
                arcade.draw_circle_filled(end_x, end_y, 3.0, (r, g, 0, 200))

    def _draw_breadcrumbs(self) -> None:
        """Draw training checkpoint dots along the track centerline.

        All checkpoints are faint white circles; the next target is bright yellow.
        """
        checkpoints = self._env._training_checkpoints
        next_idx = self._env._next_checkpoint_idx

        for i, (cx, cy) in enumerate(checkpoints):
            if i == next_idx:
                arcade.draw_circle_filled(cx, cy, 9.0, (255, 255, 0, 200))
                arcade.draw_circle_outline(cx, cy, 12.0, (255, 255, 0, 80), 1.5)
            else:
                arcade.draw_circle_filled(cx, cy, 4.0, (220, 220, 220, 45))

    def _draw_ai_hud(self, action: np.ndarray | None) -> None:
        """Draw steering/throttle/drift action bars in the bottom-right corner.

        The HUD camera is already active when this is called (set by self._hud.draw).

        Args:
            action: Current action array [steering, throttle, drift], or None.
        """
        if action is None:
            return

        screen_w = self._config["screen"]["width"]
        bar_w = 140.0
        bar_h = 10.0
        margin_x = screen_w - bar_w - 20.0
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
                # Steering: centered bar, blue = left, red = right
                center_x = margin_x + bar_w / 2
                fill_w = abs(val) * (bar_w / 2)
                fill_x = center_x - fill_w if val < 0 else center_x
                color = (80, 80, 255, 220) if val < 0 else (255, 80, 80, 220)
                if abs(val) > 0.05:
                    arcade.draw_rect_filled(
                        arcade.LBWH(fill_x, bar_y, fill_w, bar_h), color
                    )
                arcade.draw_line(
                    center_x, bar_y, center_x, bar_y + bar_h,
                    (180, 180, 180, 150), 1,
                )
            elif idx == 1:
                # Throttle: left-to-right, green = throttle, orange = reverse
                if val >= 0:
                    fill_w = val * bar_w
                    color = (60, 220, 60, 220)
                else:
                    fill_w = abs(val) * bar_w
                    color = (255, 140, 0, 220)
                if fill_w > 1:
                    arcade.draw_rect_filled(
                        arcade.LBWH(margin_x, bar_y, fill_w, bar_h), color
                    )
            else:
                # Drift: purple fill, bright when engaged
                fill_w = max(0.0, val) * bar_w
                color = (160, 60, 220, 220) if val > 0.5 else (100, 40, 140, 180)
                if fill_w > 1:
                    arcade.draw_rect_filled(
                        arcade.LBWH(margin_x, bar_y, fill_w, bar_h), color
                    )

            arcade.draw_rect_outline(
                arcade.LBWH(margin_x, bar_y, bar_w, bar_h),
                (140, 140, 140, 150),
                border_width=1,
            )
            arcade.draw_text(
                f"{label}: {val:+.2f}",
                margin_x,
                bar_y + bar_h + 3,
                (200, 200, 200, 200),
                font_size=9,
            )

    def _draw_episode_info(self) -> None:
        """Draw episode number, step count, last reward, and total reward.

        Rendered in the top-right corner in screen space. The HUD camera is
        already active when this is called.
        """
        screen_w = self._config["screen"]["width"]
        screen_h = self._config["screen"]["height"]

        x = screen_w - 20
        y = screen_h - 30
        line_spacing = 22

        lines = [
            f"Episode: {self._episode}",
            f"Step:    {self._step_count}",
            f"Reward:  {self._last_reward:+.3f}",
            f"Total:   {self._episode_reward:+.1f}",
        ]

        for i, line in enumerate(lines):
            arcade.draw_text(
                line,
                x,
                y - i * line_spacing,
                (220, 220, 220, 210),
                font_size=12,
                anchor_x="right",
                anchor_y="center",
            )


def main() -> None:
    """Parse CLI arguments, load model and env, launch the watch window."""
    parser = argparse.ArgumentParser(
        description="Watch Richard Petty drive — loads a trained PPO model"
    )
    parser.add_argument(
        "--model", type=str, default=None,
        help="Path to model file (without .zip). Auto-detects latest if omitted."
    )
    parser.add_argument(
        "--speed", type=float, default=1.0,
        help="Steps per frame (default: 1, try 2 or 4 for fast-forward)"
    )
    parser.add_argument(
        "--no-rays", action="store_true",
        help="Disable ray cast visualization"
    )
    parser.add_argument(
        "--no-breadcrumbs", action="store_true",
        help="Disable training checkpoint (breadcrumb) visualization"
    )
    parser.add_argument(
        "--config", type=str, default="configs/default.yaml",
        help="Path to config YAML file (default: configs/default.yaml)"
    )
    args = parser.parse_args()

    # --- Resolve model path --------------------------------------------------
    model_dir = Path("models")

    if args.model:
        model_path = Path(args.model)
        if not model_path.suffix:
            model_path = model_path.with_suffix(".zip")
        if not model_path.exists():
            print(f"ERROR: Model file not found: {model_path}")
            sys.exit(1)
    else:
        model_path = find_latest_model(model_dir)
        if model_path is None:
            print("ERROR: No model files found in models/")
            print("  Train first: python -m ai.train")
            sys.exit(1)
        print(f"Auto-detected latest model: {model_path}")

    # --- Load config ---------------------------------------------------------
    config_path = Path(args.config)
    if not config_path.exists():
        print(f"ERROR: Config not found: {config_path}")
        sys.exit(1)

    with open(config_path, "r", encoding="utf-8") as f:
        config: dict = yaml.safe_load(f)

    # --- Load model ----------------------------------------------------------
    from stable_baselines3 import PPO

    print(f"Loading model: {model_path}")
    model = PPO.load(str(model_path))

    # --- Create env (headless — WatchWindow handles all display) --------------
    from ai.racing_env import RacingEnv

    render_options = {
        "show_rays": not args.no_rays,
        "show_breadcrumbs": not args.no_breadcrumbs,
    }

    env = RacingEnv(
        config_path=args.config,
        render_mode="rgb_array",   # WatchWindow owns the display, not the env
        render_options=render_options,
    )

    print(f"Watching Richard Petty drive at {args.speed}x speed...")
    print("Press ESC or close the window to stop.\n")

    # --- Launch window and hand control to Arcade ----------------------------
    _window = WatchWindow(
        model=model,
        env=env,
        config=config,
        render_options=render_options,
        speed_multiplier=args.speed,
    )

    try:
        arcade.run()
    finally:
        env.close()


if __name__ == "__main__":
    main()
