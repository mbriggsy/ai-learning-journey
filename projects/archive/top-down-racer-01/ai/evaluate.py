"""Evaluate Richard Petty's performance across N headless episodes.

Runs the model without rendering and reports objective performance statistics.
Use this to compare model versions and track improvement across training runs.

Reported metrics:
  - Average total reward per episode
  - Average laps completed per episode
  - Survival rate (% of episodes with ≥ 1 lap completed)
  - Average time per lap (seconds)
  - Best lap time seen across all runs
  - Average wall hits per lap

Usage::

    python -m ai.evaluate                                    # 20 episodes, auto model
    python -m ai.evaluate --episodes 100                     # 100 episodes
    python -m ai.evaluate --model models/richard_petty_v2   # specific model
    python -m ai.evaluate --verbose                          # per-episode output
"""

from __future__ import annotations

import argparse
import math
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


def _mean_std(values: list[float]) -> tuple[float, float]:
    """Return (mean, std) of a list. Returns (0.0, 0.0) for empty lists."""
    if not values:
        return 0.0, 0.0
    n = len(values)
    mean = sum(values) / n
    variance = sum((x - mean) ** 2 for x in values) / n
    return mean, math.sqrt(variance)


def main() -> None:
    """Parse CLI arguments and run headless evaluation."""
    parser = argparse.ArgumentParser(
        description="Evaluate Richard Petty — headless performance measurement"
    )
    parser.add_argument(
        "--episodes", type=int, default=20,
        help="Number of episodes to run (default: 20)"
    )
    parser.add_argument(
        "--model", type=str, default=None,
        help="Path to model file (without .zip). Auto-detects latest if omitted."
    )
    parser.add_argument(
        "--config", type=str, default="configs/default.yaml",
        help="Path to config YAML file (default: configs/default.yaml)"
    )
    parser.add_argument(
        "--verbose", action="store_true",
        help="Print per-episode results in addition to the summary"
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
    from stable_baselines3 import PPO
    from ai.racing_env import RacingEnv

    print(f"Loading model: {model_path}")
    model = PPO.load(str(model_path))

    # No render_mode — run headless for speed
    env = RacingEnv(config_path=args.config)

    print(f"Running {args.episodes} episodes headlessly...\n")

    # --- Collect per-episode stats ------------------------------------------
    all_rewards: list[float] = []
    all_laps: list[int] = []
    all_lap_times: list[float] = []   # all individual lap times across all episodes
    all_wall_hits: list[float] = []   # wall hits per lap (episode_wall_hits / max(1, laps))
    survived: int = 0
    best_lap_time: float = float("inf")

    for ep in range(args.episodes):
        obs, _info = env.reset()
        episode_reward = 0.0
        terminated = False
        truncated = False

        while not (terminated or truncated):
            action, _ = model.predict(obs, deterministic=True)
            obs, reward, terminated, truncated, info = env.step(action)
            episode_reward += float(reward)

        # Collect stats from the final info dict
        laps = int(info.get("laps_completed", 0))
        ep_lap_times: list[float] = info.get("lap_times", [])
        wall_hits: int = int(info.get("wall_hits", 0))

        all_rewards.append(episode_reward)
        all_laps.append(laps)
        all_lap_times.extend(ep_lap_times)

        hits_per_lap = wall_hits / max(laps, 1)
        all_wall_hits.append(hits_per_lap)

        if laps >= 1:
            survived += 1

        if ep_lap_times:
            ep_best = min(ep_lap_times)
            if ep_best < best_lap_time:
                best_lap_time = ep_best

        if args.verbose:
            lap_str = f"{ep_lap_times[0]:.1f}s" if ep_lap_times else "n/a"
            print(
                f"  Ep {ep+1:3d}: reward={episode_reward:+7.1f} | "
                f"laps={laps} | best_lap={lap_str} | walls={wall_hits}"
            )

    env.close()

    # --- Compute summary stats ----------------------------------------------
    reward_mean, reward_std = _mean_std(all_rewards)
    laps_mean, laps_std = _mean_std([float(x) for x in all_laps])
    lap_time_mean, lap_time_std = _mean_std(all_lap_times)
    wall_mean, wall_std = _mean_std(all_wall_hits)
    survival_rate = 100.0 * survived / args.episodes
    best_str = f"{best_lap_time:.1f}s" if best_lap_time < float("inf") else "n/a"

    # --- Print summary -------------------------------------------------------
    print()
    print("=" * 42)
    print("   Richard Petty Evaluation Results")
    print("=" * 42)
    print(f"  Model:              {model_path.stem}")
    print(f"  Episodes run:       {args.episodes}")
    print("-" * 42)
    print(f"  Avg reward/ep:      {reward_mean:+.1f} ± {reward_std:.1f}")
    print(f"  Avg laps/ep:        {laps_mean:.2f} ± {laps_std:.2f}")
    print(f"  Survival rate:      {survival_rate:.1f}%")
    if all_lap_times:
        print(f"  Avg time/lap:       {lap_time_mean:.1f}s ± {lap_time_std:.1f}s")
        print(f"  Best lap time:      {best_str}")
    else:
        print(f"  Avg time/lap:       n/a (no laps completed)")
        print(f"  Best lap time:      n/a")
    print(f"  Avg wall hits/lap:  {wall_mean:.1f} ± {wall_std:.1f}")
    print("=" * 42)


if __name__ == "__main__":
    main()
