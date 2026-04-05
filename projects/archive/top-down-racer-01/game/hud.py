"""HUD module — heads-up display overlay for speed, health, lap info, and drift indicator.

The HUD renders in screen space using its own fixed Camera2D so the overlay
doesn't scroll with the world. All drawing uses arcade 3.x API: draw_text,
draw_rect_filled with LBWH, etc.

Layout (screen coordinates, origin bottom-left):
- Bottom-left: Health bar (200x20) + speed text above it
- Top-left: Lap counter, current lap time, best lap time
- Top-center: "DRIFT!" indicator when the car is drifting
"""

import arcade


def _lerp_color(
    color_a: tuple[int, int, int],
    color_b: tuple[int, int, int],
    t: float,
) -> tuple[int, int, int]:
    """Linearly interpolate between two RGB colors.

    Args:
        color_a: Starting color (returned when t=0).
        color_b: Ending color (returned when t=1).
        t: Interpolation factor clamped to [0, 1].

    Returns:
        Interpolated (R, G, B) tuple with integer components.
    """
    t = max(0.0, min(1.0, t))
    return (
        int(color_a[0] + (color_b[0] - color_a[0]) * t),
        int(color_a[1] + (color_b[1] - color_a[1]) * t),
        int(color_a[2] + (color_b[2] - color_a[2]) * t),
    )


def _format_time(seconds: float) -> str:
    """Format a time in seconds to MM:SS.mmm display string.

    Args:
        seconds: Elapsed time in seconds.

    Returns:
        Formatted string like "01:23.456".
    """
    minutes = int(seconds) // 60
    secs = seconds - minutes * 60
    return f"{minutes:02d}:{secs:06.3f}"


class HUD:
    """Renders the heads-up display — speed, health, lap info, drift indicator.

    The HUD uses a separate fixed Camera2D so it is always drawn in screen
    space, unaffected by the world camera's position or zoom.
    """

    def __init__(self, config: dict, screen_width: int, screen_height: int) -> None:
        """Initialize the HUD from game config.

        Args:
            config: Full game config dict (needs 'colors' section).
            screen_width: Window width in pixels.
            screen_height: Window height in pixels.
        """
        colors_cfg = config["colors"]

        self.screen_width: int = screen_width
        self.screen_height: int = screen_height

        # Colors from config
        self.text_color: tuple[int, int, int] = tuple(colors_cfg["hud_text_color"])
        self.health_high: tuple[int, int, int] = tuple(colors_cfg["health_high_color"])
        self.health_low: tuple[int, int, int] = tuple(colors_cfg["health_low_color"])

        # Health bar dimensions
        self._bar_x: float = 20.0
        self._bar_y: float = 20.0
        self._bar_width: float = 200.0
        self._bar_height: float = 20.0

        # HUD camera — fixed in screen space
        self._camera: arcade.Camera2D = arcade.Camera2D()

    def draw(
        self,
        car: object,
        lap_number: int,
        total_laps: int,
        lap_time: float,
        best_lap_time: float,
    ) -> None:
        """Draw all HUD elements.

        Activates its own camera, draws everything in screen space, then
        returns. The caller does not need to manage camera state.

        Args:
            car: The Car object (reads .health, .max_health, .speed, .is_drifting).
            lap_number: Current lap number (1-indexed).
            total_laps: Total laps in the race.
            lap_time: Elapsed time for the current lap in seconds.
            best_lap_time: Best completed lap time in seconds (inf if none).
        """
        self._camera.use()

        self._draw_health_bar(car)
        self._draw_speed(car)
        self._draw_lap_info(lap_number, total_laps, lap_time, best_lap_time)
        self._draw_drift_indicator(car)

    def draw_game_over(self) -> None:
        """Draw the game over overlay in screen space.

        Semi-transparent dark background with centered "GAME OVER" and
        "Press R to restart" text.
        """
        self._camera.use()

        # Semi-transparent dark overlay
        arcade.draw_rect_filled(
            arcade.LBWH(0, 0, self.screen_width, self.screen_height),
            (0, 0, 0, 150),
        )

        cx = self.screen_width / 2
        cy = self.screen_height / 2

        arcade.draw_text(
            "GAME OVER",
            cx,
            cy + 40,
            arcade.color.RED,
            font_size=48,
            anchor_x="center",
            anchor_y="center",
        )
        arcade.draw_text(
            "Press R to restart",
            cx,
            cy - 30,
            arcade.color.WHITE,
            font_size=24,
            anchor_x="center",
            anchor_y="center",
        )

    def draw_race_complete(self, best_lap_time: float) -> None:
        """Draw the race complete overlay in screen space.

        Args:
            best_lap_time: Best lap time achieved during the race.
        """
        self._camera.use()

        # Semi-transparent dark overlay
        arcade.draw_rect_filled(
            arcade.LBWH(0, 0, self.screen_width, self.screen_height),
            (0, 0, 0, 150),
        )

        cx = self.screen_width / 2
        cy = self.screen_height / 2

        arcade.draw_text(
            "RACE COMPLETE!",
            cx,
            cy + 40,
            arcade.color.GOLD,
            font_size=48,
            anchor_x="center",
            anchor_y="center",
        )

        if best_lap_time < float("inf"):
            time_str = _format_time(best_lap_time)
            arcade.draw_text(
                f"Best Lap: {time_str}",
                cx,
                cy - 10,
                arcade.color.WHITE,
                font_size=24,
                anchor_x="center",
                anchor_y="center",
            )

        arcade.draw_text(
            "Press R to restart",
            cx,
            cy - 50,
            arcade.color.WHITE,
            font_size=20,
            anchor_x="center",
            anchor_y="center",
        )

    # ------------------------------------------------------------------
    # Private draw helpers
    # ------------------------------------------------------------------

    def _draw_health_bar(self, car: object) -> None:
        """Draw the health bar in the bottom-left corner."""
        health_ratio = car.health / car.max_health

        # Background bar (dark gray)
        arcade.draw_rect_filled(
            arcade.LBWH(self._bar_x, self._bar_y, self._bar_width, self._bar_height),
            (40, 40, 40, 200),
        )

        # Colored fill bar — green when healthy, red when low
        if health_ratio > 0:
            fill_width = self._bar_width * health_ratio
            # t=0 means full health (green), t=1 means empty (red)
            bar_color = _lerp_color(self.health_high, self.health_low, 1.0 - health_ratio)
            arcade.draw_rect_filled(
                arcade.LBWH(self._bar_x, self._bar_y, fill_width, self._bar_height),
                (*bar_color, 230),
            )

        # Border
        arcade.draw_rect_outline(
            arcade.LBWH(self._bar_x, self._bar_y, self._bar_width, self._bar_height),
            (180, 180, 180, 200),
            border_width=1,
        )

        # Health text centered on bar
        health_text = f"{int(car.health)} / {int(car.max_health)}"
        arcade.draw_text(
            health_text,
            self._bar_x + self._bar_width / 2,
            self._bar_y + self._bar_height / 2,
            (*self.text_color, 220),
            font_size=11,
            anchor_x="center",
            anchor_y="center",
        )

    def _draw_speed(self, car: object) -> None:
        """Draw speed text above the health bar."""
        speed_val = int(abs(car.speed))
        arcade.draw_text(
            f"Speed: {speed_val}",
            self._bar_x,
            self._bar_y + self._bar_height + 8,
            (*self.text_color, 220),
            font_size=14,
        )

    def _draw_lap_info(
        self,
        lap_number: int,
        total_laps: int,
        lap_time: float,
        best_lap_time: float,
    ) -> None:
        """Draw lap counter and timing in the top-left corner."""
        top_y = self.screen_height - 30

        # Lap counter
        arcade.draw_text(
            f"Lap {lap_number} / {total_laps}",
            20,
            top_y,
            self.text_color,
            font_size=20,
            anchor_x="left",
            anchor_y="center",
        )

        # Current lap time
        arcade.draw_text(
            _format_time(lap_time),
            20,
            top_y - 30,
            self.text_color,
            font_size=16,
            anchor_x="left",
            anchor_y="center",
        )

        # Best lap time
        if best_lap_time < float("inf"):
            best_str = f"Best: {_format_time(best_lap_time)}"
        else:
            best_str = "Best: --:--.---"

        arcade.draw_text(
            best_str,
            20,
            top_y - 55,
            (*self.text_color, 180),
            font_size=14,
            anchor_x="left",
            anchor_y="center",
        )

    def _draw_drift_indicator(self, car: object) -> None:
        """Draw a 'DRIFT!' indicator at top-center when the car is drifting."""
        if not car.is_drifting:
            return

        arcade.draw_text(
            "DRIFT!",
            self.screen_width / 2,
            self.screen_height - 40,
            (255, 220, 50),
            font_size=36,
            anchor_x="center",
            anchor_y="center",
            bold=True,
        )
