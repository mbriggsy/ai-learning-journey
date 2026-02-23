"""Watch Richard Petty drive using a trained PPO model.

Loads a trained model and runs it in the game with full Arcade rendering.
The AI drives autonomously; the window stays open, auto-resetting each episode.

Optional visualizations (enabled by default):
  - Ray lines from the car (green = far, red = close) showing what the AI sees
  - Training checkpoint dots on the track (faint, next one highlighted)
  - Mini HUD showing current steering / throttle / drift values

Usage::

    python -m ai.watch                                    # latest model (auto-detected)
    python -m ai.watch --model models/richard_petty_v1   # specific model
    python -m ai.watch --speed 2.0                       # 2x playback speed
    python -m ai.watch --no-rays                         # hide ray visualization
    python -m ai.watch --no-breadcrumbs                  # hide breadcrumb dots
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path


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


def main() -> None:
    """Parse CLI arguments and run the watch loop."""
    parser = argparse.ArgumentParser(
        description="Watch Richard Petty drive — loads a trained PPO model"
    )
    parser.add_argument(
        "--model", type=str, default=None,
        help="Path to model file (without .zip). Auto-detects latest if omitted."
    )
    parser.add_argument(
        "--speed", type=float, default=1.0,
        help="Playback speed multiplier (default: 1.0, try 2.0 or 4.0)"
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

    # --- Load model and env --------------------------------------------------
    import os
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if project_root not in sys.path:
        sys.path.insert(0, project_root)

    from stable_baselines3 import PPO
    from ai.racing_env import RacingEnv

    print(f"Loading model: {model_path}")
    model = PPO.load(str(model_path))

    render_options = {
        "show_rays": not args.no_rays,
        "show_breadcrumbs": not args.no_breadcrumbs,
        "speed_multiplier": args.speed,
    }

    env = RacingEnv(
        config_path=args.config,
        render_mode="human",
        render_options=render_options,
    )

    print(f"Watching Richard Petty drive at {args.speed}x speed...")
    print("Close the window or press Ctrl+C to stop.\n")

    obs, _info = env.reset()
    episode = 1
    total_reward = 0.0

    try:
        while True:
            action, _ = model.predict(obs, deterministic=True)
            obs, reward, terminated, truncated, info = env.step(action)
            total_reward += float(reward)

            env.render()

            if terminated or truncated:
                laps = info.get("laps_completed", 0)
                print(
                    f"Episode {episode:3d} ended | "
                    f"reward={total_reward:+.1f} | "
                    f"laps={laps}"
                )
                obs, _info = env.reset()
                episode += 1
                total_reward = 0.0

    except KeyboardInterrupt:
        print("\nStopped by user.")
    finally:
        env.close()


if __name__ == "__main__":
    main()
