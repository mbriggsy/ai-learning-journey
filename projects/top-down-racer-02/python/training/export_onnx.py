"""Export trained SB3 PPO model to ONNX for browser inference.

Usage:
    cd python
    python -m training.export_onnx --model models/your_model.zip --vecnorm models/your_vecnorm.pkl

Requires: onnx, onnxruntime (see requirements.txt)
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import gymnasium as gym
import torch as th
from stable_baselines3 import PPO
from stable_baselines3.common.policies import BasePolicy
from stable_baselines3.common.vec_env import DummyVecEnv, VecNormalize


class OnnxableSB3Policy(th.nn.Module):
    """Wrapper that extracts only actions from SB3 policy forward pass."""

    def __init__(self, policy: BasePolicy) -> None:
        super().__init__()
        self.policy = policy

    def forward(self, obs: th.Tensor) -> th.Tensor:
        actions, _values, _log_probs = self.policy(obs, deterministic=True)
        return actions  # Only export actions -- browser only needs [steer, throttle, brake]


def export_model(model_path: Path, output_path: Path) -> PPO:
    """Export SB3 PPO model to ONNX. Returns the loaded model."""
    print(f"Loading model from {model_path} ...")
    model = PPO.load(str(model_path), device="cpu")

    obs_size: int = model.observation_space.shape[0]  # type: ignore[index]
    print(f"  Observation size: {obs_size}")

    onnx_policy = OnnxableSB3Policy(model.policy)
    onnx_policy.eval()

    dummy_input = th.randn(1, obs_size)

    print(f"Exporting ONNX model to {output_path} ...")
    with th.no_grad():
        th.onnx.export(
            onnx_policy,
            dummy_input,
            str(output_path),
            opset_version=17,
            input_names=["obs"],
            output_names=["actions"],
            dynamic_axes={"obs": {0: "batch_size"}, "actions": {0: "batch_size"}},
            dynamo=False,  # Explicit: PyTorch 2.9+ defaults to True, breaks SB3 wrappers
        )

    size_kb = output_path.stat().st_size / 1024
    print(f"  ONNX model exported: {output_path} ({size_kb:.1f} KB)")
    return model


def export_vecnorm(
    vecnorm_path: Path,
    output_path: Path,
    observation_space: gym.spaces.Space,
    action_space: gym.spaces.Space,
) -> None:
    """Export VecNormalize stats to JSON.

    Uses VecNormalize.load() ONLY -- no pickle.load() fallback.
    pickle.load() on untrusted files enables arbitrary code execution (CWE-502).

    VecNormalize.load() requires a real VecEnv (accesses num_envs, render_mode,
    observation_space, etc.). We build a DummyVecEnv with a minimal gymnasium
    env that carries the model's observation/action spaces.
    """
    print(f"Loading VecNormalize stats from {vecnorm_path} ...")
    try:
        # Build a lightweight DummyVecEnv that satisfies VecNormalize.load().
        # The env is never stepped — only its spaces and VecEnv attributes are read.
        def _make_dummy_env() -> gym.Env:
            env = gym.Env()
            env.observation_space = observation_space  # type: ignore[assignment]
            env.action_space = action_space  # type: ignore[assignment]
            return env

        dummy_venv = DummyVecEnv([_make_dummy_env])
        vn = VecNormalize.load(str(vecnorm_path), venv=dummy_venv)
    except Exception as e:
        print(f"ERROR: Failed to load VecNormalize stats: {e}", file=sys.stderr)
        print("  Ensure the file is a valid VecNormalize .pkl created by SB3.", file=sys.stderr)
        sys.exit(1)

    stats = {
        "obs_mean": vn.obs_rms.mean.tolist(),
        "obs_var": vn.obs_rms.var.tolist(),
        "clip_obs": float(vn.clip_obs),
        "epsilon": float(vn.epsilon),
    }

    output_path.write_text(json.dumps(stats, indent=2))
    print(f"  VecNormalize stats: {output_path} ({output_path.stat().st_size} bytes)")


def verify_onnx(model_path: Path, obs_size: int) -> None:
    """Verify ONNX model by loading and running dummy inference."""
    import numpy as np
    import onnxruntime as ort

    print("\nVerifying exported ONNX model ...")
    session = ort.InferenceSession(str(model_path))

    input_names = [inp.name for inp in session.get_inputs()]
    output_names = [out.name for out in session.get_outputs()]
    print(f"  Input names:  {input_names}")
    print(f"  Output names: {output_names}")

    dummy_obs = np.random.randn(1, obs_size).astype(np.float32)
    result = session.run(None, {"obs": dummy_obs})
    output_shape = result[0].shape
    print(f"  Output shape: {output_shape}")

    expected_actions = 3  # [steer, throttle, brake]
    if output_shape != (1, expected_actions):
        print(f"  WARNING: Expected output shape (1, {expected_actions}), got {output_shape}")
    else:
        print(f"  Verification PASSED: output shape is (1, {expected_actions})")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Export trained SB3 PPO model to ONNX for browser inference"
    )
    parser.add_argument(
        "--model", type=str, required=True,
        help="Path to saved PPO model .zip (REQUIRED)"
    )
    parser.add_argument(
        "--vecnorm", type=str, required=True,
        help="Path to VecNormalize .pkl stats (REQUIRED)"
    )
    parser.add_argument(
        "--output-dir", type=str,
        default=str(Path(__file__).resolve().parent.parent.parent / "public" / "assets"),
        help="Output directory for ONNX model and stats JSON (default: public/assets/)"
    )
    args = parser.parse_args()

    model_path = Path(args.model)
    vecnorm_path = Path(args.vecnorm)
    output_dir = Path(args.output_dir)

    # Validate inputs
    if not model_path.exists():
        print(f"ERROR: Model file not found: {model_path}", file=sys.stderr)
        sys.exit(1)
    if not vecnorm_path.exists():
        print(f"ERROR: VecNormalize file not found: {vecnorm_path}", file=sys.stderr)
        sys.exit(1)

    # Create output directory
    output_dir.mkdir(parents=True, exist_ok=True)

    model_output = output_dir / "model.onnx"
    stats_output = output_dir / "vecnorm_stats.json"

    # Export model
    model = export_model(model_path, model_output)
    obs_size: int = model.observation_space.shape[0]  # type: ignore[index]

    # Export VecNormalize stats
    export_vecnorm(
        vecnorm_path,
        stats_output,
        observation_space=model.observation_space,
        action_space=model.action_space,
    )

    # Check obs_size consistency
    stats = json.loads(stats_output.read_text())
    vecnorm_obs_size = len(stats["obs_mean"])
    if obs_size != vecnorm_obs_size:
        print(f"\n  WARNING: Model obs_size ({obs_size}) != VecNormalize obs_size ({vecnorm_obs_size})")

    # Verify exported model
    verify_onnx(model_output, obs_size)

    # Summary
    print(f"\n--- Export Complete ---")
    print(f"  ONNX model:      {model_output} ({model_output.stat().st_size / 1024:.1f} KB)")
    print(f"  VecNorm stats:   {stats_output} ({stats_output.stat().st_size} bytes)")
    print(f"  Observation size: {obs_size}")


if __name__ == "__main__":
    main()
