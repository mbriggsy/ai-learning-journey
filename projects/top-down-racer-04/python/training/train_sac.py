"""SAC training script for the top-down racer AI.

Fallback algorithm when PPO plateaus. SAC is off-policy (uses a replay
buffer) and auto-tunes its entropy coefficient, making it less sensitive
to hyperparameter choices than PPO.

Usage:
    cd python
    python -m training.train_sac --run-name sac_run_1 --timesteps 2000000
    python -m training.train_sac --resume models/sac_run_1_final.zip --timesteps 1000000

Requires the bridge server to be running:
    npx tsx src/ai/run-bridge.ts
"""
import argparse
import sys
from collections.abc import Callable
from pathlib import Path

import gymnasium as gym

sys.path.insert(0, str(Path(__file__).parent.parent))

from stable_baselines3 import SAC
from stable_baselines3.common.vec_env import DummyVecEnv, VecNormalize
from stable_baselines3.common.callbacks import CheckpointCallback, CallbackList
from stable_baselines3.common.monitor import Monitor
from racer_env import RacerEnv
from training.callbacks import RacerMetricsCallback

# Resolve paths relative to the python/ directory, not CWD
PYTHON_DIR = Path(__file__).resolve().parent.parent
LOG_ROOT = PYTHON_DIR / "logs"
MODEL_DIR = PYTHON_DIR / "models"


def make_env(bridge_url: str, track_id: str, log_dir: str) -> Callable[[], gym.Env]:
    """Factory function for creating a monitored RacerEnv."""
    def _init() -> gym.Env:
        env = RacerEnv(bridge_url=bridge_url, track_id=track_id)
        env = Monitor(env, log_dir)
        return env
    return _init


def vecnorm_path_for(model_path: str) -> Path:
    """Derive VecNormalize stats path from a model path."""
    p = Path(model_path)
    stem = p.with_suffix("") if p.suffix == ".zip" else p
    return stem.parent / f"{stem.name}_vecnormalize.pkl"


def train(args: argparse.Namespace) -> None:
    log_dir = LOG_ROOT / args.run_name
    log_dir.mkdir(parents=True, exist_ok=True)
    MODEL_DIR.mkdir(exist_ok=True)

    # Pre-flight: verify bridge is reachable before expensive SB3 setup
    try:
        test_env = RacerEnv(bridge_url=args.bridge_url, track_id=args.track_id)
        test_env.reset()
        test_env.close()
    except (ConnectionError, OSError) as e:
        print(f"ERROR: Cannot connect to bridge server: {e}")
        print("Start the bridge first: npx tsx src/ai/run-bridge.ts")
        sys.exit(1)

    vec_env = DummyVecEnv([make_env(args.bridge_url, args.track_id, str(log_dir))])

    if args.resume:
        # Resume from checkpoint
        print(f"Resuming from {args.resume}")
        vnorm_path = vecnorm_path_for(args.resume)
        if vnorm_path.exists():
            vec_env = VecNormalize.load(str(vnorm_path), vec_env)
            vec_env.training = True
            vec_env.norm_reward = True
        else:
            # SECURITY: SB3 model files use pickle internally.
            # Never load models from untrusted sources.
            print(f"ERROR: VecNormalize stats not found at {vnorm_path}")
            print("A resumed model REQUIRES its original normalization stats.")
            print("Without them, observations will be on a different scale and the model will produce garbage actions.")
            vec_env.close()
            sys.exit(1)
        model = SAC.load(args.resume, env=vec_env)
    else:
        # Fresh training
        # VecNormalize with norm_reward=True is especially important for SAC
        # because the entropy auto-tuning assumes rewards on a roughly unit scale.
        vec_env = VecNormalize(vec_env, norm_obs=True, norm_reward=True, clip_obs=10.0)
        model = SAC(
            "MlpPolicy",
            vec_env,
            verbose=1,
            tensorboard_log=str(log_dir),
            learning_rate=7.3e-4,
            buffer_size=300_000,
            learning_starts=10_000,
            batch_size=256,
            tau=0.02,
            gamma=0.99,
            train_freq=8,
            gradient_steps=10,
            ent_coef="auto",
            use_sde=True,
        )

    callbacks = CallbackList([
        CheckpointCallback(
            save_freq=args.checkpoint_freq,
            save_path=str(MODEL_DIR),
            name_prefix=args.run_name,
            save_vecnormalize=True,
        ),
        RacerMetricsCallback(verbose=1),
    ])

    try:
        model.learn(
            total_timesteps=args.timesteps,
            callback=callbacks,
            tb_log_name=args.run_name,
            reset_num_timesteps=args.resume is None,  # False when resuming
        )

        # Save final model and VecNormalize stats
        final_path = MODEL_DIR / f"{args.run_name}_final"
        model.save(str(final_path))
        vec_env.save(str(final_path.parent / f"{final_path.name}_vecnormalize.pkl"))
        print(f"\nTraining complete. Model saved to {final_path}.zip")
    except KeyboardInterrupt:
        # Save emergency checkpoint on Ctrl+C
        interrupted_path = MODEL_DIR / f"{args.run_name}_interrupted"
        print(f"\nInterrupted! Saving checkpoint to {interrupted_path}.zip ...")
        model.save(str(interrupted_path))
        vec_env.save(str(interrupted_path.parent / f"{interrupted_path.name}_vecnormalize.pkl"))
        print("Checkpoint saved. Resume with: --resume", str(interrupted_path) + ".zip")
    finally:
        vec_env.close()

    print(f"TensorBoard logs in {log_dir}/")
    print(f"\nView this run:  tensorboard --logdir {log_dir} --host localhost")
    print(f"Compare runs:   tensorboard --logdir {LOG_ROOT} --host localhost")


def main() -> None:
    parser = argparse.ArgumentParser(description="Train SAC agent on the top-down racer")
    parser.add_argument("--run-name", default="sac_run_1", help="Name for this training run")
    parser.add_argument("--timesteps", type=int, default=2_000_000,
                        help="Additional timesteps to train (added to existing count when resuming)")
    parser.add_argument("--resume", type=str, default=None, help="Path to checkpoint .zip to resume from")
    parser.add_argument("--checkpoint-freq", type=int, default=50_000, help="Checkpoint save frequency (steps)")
    parser.add_argument("--track-id", default="track-01", help="Track ID to train on")
    parser.add_argument("--bridge-url", default="ws://localhost:9876", help="Bridge server WebSocket URL")
    args = parser.parse_args()

    if args.resume and not Path(args.resume).exists():
        # Also check with .zip appended (SB3 auto-appends .zip on save)
        if not Path(args.resume + ".zip").exists():
            parser.error(f"Resume checkpoint not found: {args.resume}")

    train(args)


if __name__ == "__main__":
    main()
