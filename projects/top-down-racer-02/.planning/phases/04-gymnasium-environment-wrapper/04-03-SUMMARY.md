---
phase: 04-gymnasium-environment-wrapper
plan: 03
status: complete
started: 2026-03-01
completed: 2026-03-01
---

## Summary

Built the Python Gymnasium wrapper that connects to the TypeScript bridge server via WebSocket. Validated with Gymnasium's `check_env` and a 100-episode random agent stability test.

### Files Created

| File | Purpose | Exports |
|---|---|---|
| `python/requirements.txt` | Python dependency list | — |
| `python/racer_env/__init__.py` | Package init exposing RacerEnv | `RacerEnv` |
| `python/racer_env/bridge_client.py` | Synchronous WebSocket RPC client with TCP_NODELAY | `BridgeClient` |
| `python/racer_env/env.py` | Gymnasium-compatible environment with inline config loading | `RacerEnv` |
| `python/tests/__init__.py` | Test package marker | — |
| `python/tests/conftest.py` | Session-scoped bridge server fixture (Windows-safe cleanup) | — |
| `python/tests/test_env_checker.py` | Gymnasium check_env validation | — |
| `python/tests/test_random_agent.py` | 100-episode stability + latency + reward component tests | — |

### Requirements Satisfied

- **AI-01**: `gymnasium.utils.env_checker.check_env(env)` passes with no errors
- **AI-07 (client side)**: Python Gymnasium wrapper connects to Node.js bridge server via WebSocket
- **AI-12**: Reward weights loaded from `python/ai-config.json` config file
- **AI-13**: Per-component reward breakdown verified in info dict (progress, speed, wall, offTrack, backward, stillness)

### Key Design Decisions

1. **`websocket-client` over `websockets`** — 2x faster sync WebSocket (80K vs 40K roundtrips/sec), native `sockopt` for TCP_NODELAY, no hidden asyncio overhead
2. **Inline config loading** — Eliminated separate `config.py` (12-line single-consumer module); 3-file package instead of 4
3. **Per-component observation bounds** — Rays/speed/progress: `[0,1]`, yaw/steer: `[-1,1]` instead of uniform `[-1,1]` for all 14 values
4. **`render_mode` parameter** — Accepted in `__init__` and stored as `self.render_mode` per Gymnasium v1.0+ contract
5. **Idempotent `close()`** — Sets `self._bridge = None` after closing to prevent double-close errors
6. **Windows process tree cleanup** — `taskkill /F /T /PID` in test fixture to prevent orphaned Node.js processes
7. **No retry logic** — Fail fast with clear error message instead of silent retry-with-backoff
8. **30-second recv timeout** — Prevents permanent hang if bridge server crashes mid-step

### Test Results

3 tests, all passing (40.01s total):

| Test | Result | Details |
|---|---|---|
| `test_env_checker` | PASS | Gymnasium `check_env` passes with no errors |
| `test_random_agent_100_episodes` | PASS | 100 episodes, 106,396 steps, median latency 0.251ms, p99 0.480ms |
| `test_reward_components_logged` | PASS | All 6 reward components present in info dict |

### Performance

- **Median step latency**: 0.251ms (target: <0.5ms)
- **P99 step latency**: 0.480ms
- **Total steps**: 106,396 across 100 episodes
- **Wall clock**: ~40 seconds for full test suite including bridge server startup

### Dependencies Added (Python)

- `gymnasium>=1.0.0`
- `numpy>=1.26.0`
- `websocket-client>=1.7.0`
- `pytest`, `pytest-timeout` (dev)

### Notes

- Pre-existing 7 test failures in `tests/engine/checkpoint.test.ts` (`lapTimes` spread bug) are unrelated to this plan
- All 48 AI tests and 17 headless-env tests continue to pass
- `python/.venv/` added to `.gitignore`
