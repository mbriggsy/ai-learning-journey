"""Training script for Richard Petty -- PPO via Stable-Baselines3.

Trains a PPO agent to drive the top-down racer using the Gymnasium
environment wrapper (ai.racing_env.RacingEnv). Hyperparameters are loaded
from configs/default.yaml under the 'ai' section. Models are saved to
models/ and TensorBoard logs to logs/.

Usage:
    python -m ai.train                              # default 500K steps
    python -m ai.train --timesteps 1000000          # custom step count
    python -m ai.train --resume models/richard_petty_v1  # resume from checkpoint
    python -m ai.train --envs 4                     # fewer parallel envs
    python -m ai.train --model-name my_racer        # custom model name
"""

import argparse
import sys
from collections import deque
from pathlib import Path

import numpy as np
import yaml
from stable_baselines3 import PPO
from stable_baselines3.common.callbacks import BaseCallback, CallbackList, CheckpointCallback
from stable_baselines3.common.vec_env import SubprocVecEnv


def load_config(config_path: str) -> dict:
    """Load and return the YAML config dictionary.

    Args:
        config_path: Path to the YAML config file.

    Returns:
        Parsed config dictionary.
    """
    path = Path(config_path)
    if not path.exists():
        print(f"ERROR: Config file not found: {config_path}")
        sys.exit(1)

    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


class EpisodeStatsCallback(BaseCallback):
    """Custom callback that logs per-episode racing stats to TensorBoard.

    Tracks breadcrumbs collected, major checkpoints hit (0-4), and episode
    length (survived steps). Logs both per-episode values and rolling means
    over the last 100 episodes.
    """

    def __init__(self, verbose: int = 0) -> None:
        super().__init__(verbose)
        self._ep_breadcrumbs: deque[int] = deque(maxlen=100)
        self._ep_checkpoints: deque[int] = deque(maxlen=100)
        self._ep_steps: deque[int] = deque(maxlen=100)

    def _on_step(self) -> bool:
        """Called after each vectorized step. Check for completed episodes."""
        infos = self.locals.get("infos", [])
        dones = self.locals.get("dones", [])

        if infos is None or dones is None:
            return True

        for i, done in enumerate(dones):
            if done and i < len(infos):
                info = infos[i]
                breadcrumbs = info.get("breadcrumbs_collected", 0)
                checkpoints = info.get("checkpoints_hit", 0)
                steps = info.get("step_count", 0)

                self._ep_breadcrumbs.append(breadcrumbs)
                self._ep_checkpoints.append(checkpoints)
                self._ep_steps.append(steps)

                # Log to TensorBoard
                self.logger.record("episode/breadcrumbs_collected", breadcrumbs)
                self.logger.record("episode/checkpoints_hit", checkpoints)
                self.logger.record("episode/survived_steps", steps)

                if len(self._ep_breadcrumbs) > 0:
                    self.logger.record(
                        "episode/mean_breadcrumbs_100",
                        np.mean(self._ep_breadcrumbs),
                    )
                    self.logger.record(
                        "episode/mean_checkpoints_100",
                        np.mean(self._ep_checkpoints),
                    )
                    self.logger.record(
                        "episode/mean_steps_100",
                        np.mean(self._ep_steps),
                    )

                if self.verbose >= 1:
                    print(
                        f"  Episode done: breadcrumbs={breadcrumbs}, "
                        f"checkpoints={checkpoints}/4, steps={steps}"
                    )

        return True


def make_env(config_path: str = "configs/default.yaml"):
    """Factory function for creating RacingEnv instances for SubprocVecEnv.

    Returns a callable that creates a fresh RacingEnv. The import is done
    lazily inside the callable to avoid multiprocessing serialization issues
    -- each subprocess imports the module independently.

    Args:
        config_path: Path to the YAML config file.

    Returns:
        A zero-argument callable that produces a RacingEnv.
    """
    def _init():
        import sys
        import os
        # Subprocess workers don't inherit the parent's sys.path,
        # so we need to add the project root explicitly.
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        if project_root not in sys.path:
            sys.path.insert(0, project_root)
        from ai.racing_env import RacingEnv
        from stable_baselines3.common.monitor import Monitor
        return Monitor(RacingEnv(config_path=config_path))
    return _init


def find_next_version(model_dir: Path, base_name: str) -> str:
    """Find the next available version number for a model name.

    Scans model_dir for files matching {base_name}_v{N}.zip and returns
    {base_name}_v{N+1}. If no existing versions are found, returns
    {base_name}_v1.

    Args:
        model_dir: Directory to scan for existing model files.
        base_name: Base model name (e.g. 'richard_petty').

    Returns:
        The versioned model name (e.g. 'richard_petty_v3').
    """
    existing_versions: list[int] = []

    if model_dir.exists():
        for f in model_dir.iterdir():
            if f.stem.startswith(f"{base_name}_v") and f.suffix == ".zip":
                version_str = f.stem[len(f"{base_name}_v"):]
                if version_str.isdigit():
                    existing_versions.append(int(version_str))

    next_version = max(existing_versions, default=0) + 1
    return f"{base_name}_v{next_version}"


def main() -> None:
    """Parse CLI arguments and run PPO training."""
    parser = argparse.ArgumentParser(
        description="Train Richard Petty -- PPO agent for Top-Down Racer 01"
    )
    parser.add_argument(
        "--timesteps", type=int, default=500_000,
        help="Total training timesteps (default: 500000)"
    )
    parser.add_argument(
        "--envs", type=int, default=None,
        help="Number of parallel environments (default: from config, usually 8)"
    )
    parser.add_argument(
        "--resume", type=str, default=None,
        help="Path to an existing model to resume training from (without .zip extension)"
    )
    parser.add_argument(
        "--model-name", type=str, default="richard_petty",
        help="Base name for the saved model (default: richard_petty)"
    )
    parser.add_argument(
        "--config", type=str, default="configs/default.yaml",
        help="Path to config YAML file (default: configs/default.yaml)"
    )
    args = parser.parse_args()

    # --- Load config ---------------------------------------------------------
    config = load_config(args.config)
    ai_cfg = config.get("ai", {})

    # --- Resolve number of parallel envs ------------------------------------
    num_envs = args.envs if args.envs is not None else ai_cfg.get("num_parallel_envs", 8)

    # --- Create directories --------------------------------------------------
    model_dir = Path("models")
    log_dir = Path("logs") / "richard_petty"
    model_dir.mkdir(parents=True, exist_ok=True)
    log_dir.mkdir(parents=True, exist_ok=True)

    # --- Build vectorized environment ----------------------------------------
    print(f"Starting training with {num_envs} parallel envs for {args.timesteps:,} timesteps...")
    print(f"Config: {args.config}")

    env = SubprocVecEnv([make_env(args.config) for _ in range(num_envs)])

    # --- Build or load PPO model ---------------------------------------------
    ppo_kwargs = {
        "learning_rate": ai_cfg.get("learning_rate", 3e-4),
        "n_steps": ai_cfg.get("n_steps", 2048),
        "batch_size": ai_cfg.get("batch_size", 64),
        "n_epochs": ai_cfg.get("n_epochs", 10),
        "gamma": ai_cfg.get("gamma", 0.99),
        "gae_lambda": ai_cfg.get("gae_lambda", 0.95),
        "clip_range": ai_cfg.get("clip_range", 0.2),
        "ent_coef": ai_cfg.get("ent_coef", 0.0),
        "verbose": 1,
        "tensorboard_log": str(log_dir),
    }

    if args.resume:
        resume_path = Path(args.resume)
        # Accept with or without .zip extension
        if not resume_path.suffix:
            resume_path = resume_path.with_suffix(".zip")
        if not resume_path.exists():
            print(f"ERROR: Model file not found: {resume_path}")
            env.close()
            sys.exit(1)

        print(f"Resuming training from: {resume_path}")
        model = PPO.load(str(resume_path), env=env, **ppo_kwargs)
    else:
        policy_type = ai_cfg.get("policy", "MlpPolicy")
        print(f"Creating new PPO model with policy: {policy_type}")
        model = PPO(policy_type, env, **ppo_kwargs)

    # --- Callbacks -----------------------------------------------------------
    checkpoint_dir = model_dir / "checkpoints"
    checkpoint_dir.mkdir(parents=True, exist_ok=True)

    checkpoint_cb = CheckpointCallback(
        save_freq=max(500_000 // num_envs, 1),
        save_path=str(checkpoint_dir),
        name_prefix=args.model_name,
    )
    episode_stats_cb = EpisodeStatsCallback(verbose=1)
    callbacks = CallbackList([checkpoint_cb, episode_stats_cb])

    # --- Train ---------------------------------------------------------------
    print(f"Training for {args.timesteps:,} timesteps...")
    print(f"TensorBoard logs: {log_dir}")
    print(f"Checkpoints every 500K steps: {checkpoint_dir}")
    print("  (run `tensorboard --logdir logs` to monitor)")

    model.learn(total_timesteps=args.timesteps, callback=callbacks, progress_bar=True)

    # --- Save model ----------------------------------------------------------
    version_name = find_next_version(model_dir, args.model_name)
    save_path = model_dir / version_name
    model.save(str(save_path))
    print(f"Model saved: {save_path}.zip")

    # --- Cleanup -------------------------------------------------------------
    env.close()
    print("Training complete!")


if __name__ == "__main__":
    main()
