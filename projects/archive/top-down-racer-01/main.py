"""Top-Down Racer 01 — entry point.

Loads the game configuration, creates the arcade window, and launches
the main game view. Run this file to play:

    python main.py
"""

import arcade
import yaml
from pathlib import Path

from game.renderer import RacerView


def main() -> None:
    """Load config, create the window, and start the game."""
    config_path = Path(__file__).parent / "configs" / "default.yaml"
    with open(config_path, "r") as f:
        config = yaml.safe_load(f)

    screen_cfg = config["screen"]

    window = arcade.Window(
        width=screen_cfg["width"],
        height=screen_cfg["height"],
        title=screen_cfg["title"],
    )

    view = RacerView(config)
    view.setup()
    window.show_view(view)

    arcade.run()


if __name__ == "__main__":
    main()
