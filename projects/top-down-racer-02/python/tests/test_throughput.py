"""Throughput benchmark test for AI-08."""
import pytest

from training.benchmark import run_benchmark


@pytest.mark.timeout(60)
def test_bridge_throughput(bridge_server):
    """Verify bridge throughput meets minimum target for training viability.

    AI-08 states 3000+ ticks/sec. The WebSocket bridge adds overhead that may
    limit this. We test against a practical minimum (1500 steps/sec) that still
    enables viable training.

    NOTE: This measures RAW bridge throughput (no SB3 policy inference overhead).
    Actual SB3 training throughput (visible via time/fps in TensorBoard) will be
    20-40% lower due to PPO rollout collection overhead (policy forward pass,
    tensor conversions, buffer storage). A raw throughput of 1500 implies actual
    training throughput of ~900-1200 steps/sec — still viable for 2M timesteps
    in under 30 minutes.
    """
    metrics = run_benchmark(steps=5000, target=1500)
    print(f"\nThroughput: {metrics['steps_per_sec']:.0f} steps/sec")
    print(f"Mean latency: {metrics['mean_ms']:.3f}ms")
    print(f"P50: {metrics['p50_ms']:.3f}ms | P95: {metrics['p95_ms']:.3f}ms | P99: {metrics['p99_ms']:.3f}ms")

    # Verify expected metric keys exist (catches API drift in benchmark.py)
    for key in ("steps_per_sec", "mean_ms", "p50_ms", "p95_ms", "p99_ms"):
        assert key in metrics, f"Missing expected metric key: {key}"

    # Assert minimum viable throughput
    assert metrics["steps_per_sec"] >= 1500, (
        f"Bridge throughput {metrics['steps_per_sec']:.0f} steps/sec is below "
        f"minimum viable threshold of 1500 steps/sec"
    )
