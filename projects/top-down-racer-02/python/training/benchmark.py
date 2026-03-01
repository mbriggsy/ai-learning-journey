"""Throughput benchmark for the RacerEnv bridge (AI-08 validation).

Measures raw env.step() throughput (no SB3 policy inference overhead).
This represents the theoretical ceiling -- actual training throughput will
be 20-40% lower due to PPO rollout collection overhead (policy forward
pass, tensor conversions, buffer storage).

Expected results:
- Raw bridge throughput: ~3000-4000 steps/sec (0.25-0.33ms/step)
- SB3 PPO training throughput: ~1500-2500 steps/sec (from time/fps TensorBoard metric)
"""

import argparse
import sys
import time
from pathlib import Path
from typing import Any

import numpy as np

# Add parent to path for racer_env imports
sys.path.insert(0, str(Path(__file__).parent.parent))
from racer_env import RacerEnv

WARMUP_STEPS = 200


def run_benchmark(
    steps: int = 5000,
    target: int = 2000,
    warmup: int = WARMUP_STEPS,
) -> dict[str, Any]:
    """Run throughput benchmark, return metrics dict.

    Includes a warmup phase to exclude JIT compilation, connection
    negotiation, and other one-time costs from measurements.
    """
    try:
        env = RacerEnv()
        obs, _ = env.reset()
    except (ConnectionRefusedError, OSError) as e:
        print(f"ERROR: Cannot connect to bridge server: {e}")
        print("Is the bridge running? Start it with: npx tsx src/ai/run-bridge.ts")
        sys.exit(2)

    try:
        # Warmup phase (not measured)
        for _ in range(warmup):
            action = env.action_space.sample()
            obs, _, terminated, truncated, _ = env.step(action)
            if terminated or truncated:
                obs, _ = env.reset()

        # Measurement phase
        latencies: list[float] = []
        t_start = time.perf_counter()
        for _ in range(steps):
            action = env.action_space.sample()
            t0 = time.perf_counter()
            obs, reward, terminated, truncated, info = env.step(action)
            latencies.append(time.perf_counter() - t0)
            if terminated or truncated:
                obs, _ = env.reset()
        t_end = time.perf_counter()
    finally:
        env.close()

    lat = np.array(latencies) * 1000  # Convert to ms
    elapsed = t_end - t_start
    sps = steps / elapsed

    return {
        "steps": steps,
        "warmup": warmup,
        "elapsed_sec": elapsed,
        "steps_per_sec": sps,
        "mean_ms": float(np.mean(lat)),
        "p50_ms": float(np.percentile(lat, 50)),
        "p95_ms": float(np.percentile(lat, 95)),
        "p99_ms": float(np.percentile(lat, 99)),
        "target": target,
        "passed": sps >= target,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="RacerEnv throughput benchmark")
    parser.add_argument("--steps", type=int, default=5000, help="Number of steps to measure")
    parser.add_argument("--target", type=int, default=2000, help="Target steps/sec (exit 1 if below)")
    parser.add_argument("--warmup", type=int, default=WARMUP_STEPS, help="Warmup steps (not measured)")
    args = parser.parse_args()

    print(f"Warming up ({args.warmup} steps)...")
    print(f"Measuring ({args.steps} steps)...")
    metrics = run_benchmark(args.steps, args.target, args.warmup)

    print(f"\nThroughput: {metrics['steps_per_sec']:.0f} steps/sec")
    print(f"Mean latency: {metrics['mean_ms']:.3f}ms")
    print(f"P50: {metrics['p50_ms']:.3f}ms | P95: {metrics['p95_ms']:.3f}ms | P99: {metrics['p99_ms']:.3f}ms")
    print(f"Target: {metrics['target']} steps/sec -- {'PASS' if metrics['passed'] else 'FAIL'}")

    sys.exit(0 if metrics["passed"] else 1)


if __name__ == "__main__":
    main()
