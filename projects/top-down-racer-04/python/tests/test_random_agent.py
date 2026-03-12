"""Random agent stability and latency test."""
import time
import statistics

from racer_env import RacerEnv

EPISODE_COUNT = 100


def test_random_agent_100_episodes(bridge_server):
    """Random agent must complete 100 episodes without crashes or hangs."""
    env = RacerEnv()
    episodes_completed = 0
    step_latencies: list[float] = []

    try:
        for ep in range(EPISODE_COUNT):
            obs, info = env.reset()
            assert obs.shape == (14,), f"Observation shape mismatch: {obs.shape}"
            assert obs.dtype.name == "float32", f"Observation dtype mismatch: {obs.dtype}"

            done = False
            steps = 0
            while not done:
                action = env.action_space.sample()
                start = time.perf_counter()
                obs, reward, terminated, truncated, info = env.step(action)
                elapsed = (time.perf_counter() - start) * 1000  # ms
                step_latencies.append(elapsed)

                done = terminated or truncated
                steps += 1

                # Safety: abort if episode runs too long (shouldn't happen with maxSteps)
                assert steps <= 5000, f"Episode {ep} exceeded 5000 steps"

            episodes_completed += 1
    finally:
        env.close()

    assert episodes_completed == EPISODE_COUNT, (
        f"Only completed {episodes_completed}/{EPISODE_COUNT} episodes"
    )

    # Latency stats
    median_latency = statistics.median(step_latencies)
    p99_latency = sorted(step_latencies)[int(len(step_latencies) * 0.99)]
    print(f"\nLatency stats: median={median_latency:.3f}ms, p99={p99_latency:.3f}ms")
    print(f"Total steps across {EPISODE_COUNT} episodes: {len(step_latencies)}")

    # Report but don't hard-fail on latency (hardware-dependent)
    if median_latency > 0.5:
        print(f"WARNING: Median latency {median_latency:.3f}ms exceeds 0.5ms target")


def test_reward_components_logged(bridge_server):
    """Info dict must contain per-component reward breakdown (AI-13)."""
    env = RacerEnv()
    try:
        obs, info = env.reset()
        action = env.action_space.sample()
        obs, reward, terminated, truncated, info = env.step(action)

        required_components = [
            "progress", "speed", "wall", "offTrack", "backward", "stillness"
        ]
        for component in required_components:
            assert component in info, (
                f"Missing reward component '{component}' in info dict"
            )
    finally:
        env.close()
