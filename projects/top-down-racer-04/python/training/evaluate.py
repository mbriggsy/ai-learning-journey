"""Evaluate a trained model by running inference episodes.

Usage:
    cd python
    python -m training.evaluate --model models/ppo_run_1_final.zip --episodes 10

Requires the bridge server to be running:
    npx tsx src/ai/run-bridge.ts
"""
import argparse
import sys
from collections.abc import Callable
from pathlib import Path

import gymnasium as gym

sys.path.insert(0, str(Path(__file__).parent.parent))

from stable_baselines3 import PPO, SAC
from stable_baselines3.common.vec_env import DummyVecEnv, VecNormalize
from racer_env import RacerEnv

TICKS_PER_SECOND: int = 60


def make_env(bridge_url: str, track_id: str) -> Callable[[], gym.Env]:
    """Factory function for creating a RacerEnv (no Monitor needed for evaluation)."""
    def _init() -> gym.Env:
        return RacerEnv(bridge_url=bridge_url, track_id=track_id)
    return _init


def vecnorm_path_for(model_path: str) -> Path:
    """Derive VecNormalize stats path from a model path."""
    p = Path(model_path)
    stem = p.with_suffix("") if p.suffix == ".zip" else p
    return stem.parent / f"{stem.name}_vecnormalize.pkl"


def load_model(model_path: str, vec_env: VecNormalize) -> PPO | SAC:
    """Load model, auto-detecting algorithm from the saved file.

    SECURITY: SB3 model files use pickle internally.
    Never load models from untrusted sources.
    """
    try:
        return PPO.load(model_path, env=vec_env)
    except (ValueError, KeyError) as e:
        if "class" not in str(e).lower() and "ppo" not in str(e).lower():
            raise  # Re-raise unexpected errors
        return SAC.load(model_path, env=vec_env)


def evaluate(args: argparse.Namespace) -> None:
    vec_env = DummyVecEnv([make_env(args.bridge_url, args.track_id)])

    # Load VecNormalize stats
    vnorm_path = Path(args.vecnorm) if args.vecnorm else vecnorm_path_for(args.model)
    if vnorm_path.exists():
        vec_env = VecNormalize.load(str(vnorm_path), vec_env)
    else:
        print(f"Warning: No VecNormalize stats at {vnorm_path}, using unnormalized observations")
        vec_env = VecNormalize(vec_env, norm_obs=False, norm_reward=False)

    # CRITICAL: Disable training mode for inference
    vec_env.training = False
    vec_env.norm_reward = False

    model = load_model(args.model, vec_env)

    print(f"Evaluating {args.model} on {args.track_id} for {args.episodes} episodes")
    print(f"Deterministic: {args.deterministic}\n")

    lap_times: list[float] = []
    rewards: list[float] = []

    try:
        for ep in range(args.episodes):
            obs = vec_env.reset()
            ep_reward = 0.0
            done = False
            prev_lap = 1
            prev_step_count = 0  # Track step count at last lap boundary

            while not done:
                action, _ = model.predict(obs, deterministic=args.deterministic)
                obs, reward, dones, infos = vec_env.step(action)
                ep_reward += reward[0]
                done = dones[0]
                info = infos[0]

                # Track lap completion -- use step count DELTA for per-lap time
                current_lap = info.get("lap", 1)
                if current_lap > prev_lap:
                    step_count = info.get("stepCount", 0)
                    lt = (step_count - prev_step_count) / TICKS_PER_SECOND
                    lap_times.append(lt)
                    prev_step_count = step_count
                    print(f"  Episode {ep+1}: Lap completed in {lt:.2f}s")
                prev_lap = current_lap

            rewards.append(ep_reward)
            steps = info.get("stepCount", 0)
            print(f"  Episode {ep+1}: reward={ep_reward:.2f}, steps={steps}, laps={info.get('lap', 1)-1}")
    finally:
        vec_env.close()

    print(f"\n--- Summary ({args.episodes} episodes) ---")
    print(f"Mean reward: {sum(rewards)/len(rewards):.2f}")
    if lap_times:
        print(f"Laps completed: {len(lap_times)}")
        print(f"Mean lap time: {sum(lap_times)/len(lap_times):.2f}s")
        print(f"Best lap time: {min(lap_times):.2f}s")
    else:
        print("No laps completed.")
    print(f"\nNote: Visual evaluation requires loading the model in the browser (Phase 6).")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Evaluate a trained racer model (requires bridge server running)")
    parser.add_argument("--model", type=str, required=True, help="Path to saved model .zip")
    parser.add_argument("--vecnorm", type=str, default=None, help="Path to VecNormalize .pkl stats")
    parser.add_argument("--episodes", type=int, default=10, help="Number of evaluation episodes")
    parser.add_argument("--track-id", default="track-01", help="Track ID to evaluate on")
    parser.add_argument("--bridge-url", default="ws://localhost:9876", help="Bridge server WebSocket URL")
    parser.add_argument("--deterministic", action=argparse.BooleanOptionalAction, default=True,
                        help="Use deterministic actions (--no-deterministic for stochastic)")
    args = parser.parse_args()
    evaluate(args)


if __name__ == "__main__":
    main()
