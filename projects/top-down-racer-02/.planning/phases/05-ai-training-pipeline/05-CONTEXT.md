# Phase 5: AI Training Pipeline — Context

**Phase:** 05
**Name:** AI Training Pipeline
**Status:** Planning

## Requirements

| ID | Description |
|----|-------------|
| AI-08 | Headless training at 3000+ ticks/sec |
| AI-09 | TensorBoard metrics (episode reward, lap time, completion rate) |
| AI-10 | Model checkpoint saving/loading |
| AI-11 | PPO and SAC training via stable-baselines3 + PyTorch |

## Success Criteria

1. Trained AI completes laps consistently without getting stuck or driving in circles
2. AI lap times are faster than a casual human player on the primary track
3. TensorBoard shows episode reward, lap time, and completion rate improving over training
4. Model checkpoints can be saved mid-training and loaded to resume or deploy

## Critical Constraint

**Physics parameters must be frozen before this phase begins. Any physics change invalidates all trained models.**

## Existing Foundation (Phase 4)

### Python Package Structure
```
python/
├── racer_env/
│   ├── __init__.py          # Exports RacerEnv
│   ├── bridge_client.py     # Synchronous WebSocket RPC client (TCP_NODELAY)
│   └── env.py               # Gymnasium-compatible env (Box action/obs spaces)
├── tests/
│   ├── conftest.py          # Session-scoped bridge server fixture
│   ├── test_env_checker.py  # Gymnasium check_env validation
│   └── test_random_agent.py # 100-episode stability + latency tests
├── ai-config.json           # Reward weights + episode config (already configurable)
└── requirements.txt         # gymnasium, numpy, websocket-client
```

### RacerEnv Interface
- **Action space:** Box([-1, 0, 0], [1, 1, 1]) — [steer, throttle, brake]
- **Observation space:** Box(14) — 9 rays + speed + yawRate + steering + progress + centerlineDist
- **Info dict keys:** progress, speed, wall, offTrack, backward, stillness, lap, checkpoint, stepCount
- **Bridge URL:** ws://localhost:9876
- **Bridge server:** `npx tsx src/ai/run-bridge.ts`

### Performance Baseline
- Median step latency: 0.251ms
- P99 step latency: 0.480ms
- ~3980 steps/sec theoretical ceiling (from 0.251ms median)

### ai-config.json (Current)
```json
{
  "weights": {
    "progress": 1.0, "speedBonus": 0.0,
    "wallPenalty": -0.002, "offTrackPenalty": -0.001,
    "backwardPenalty": 0.0, "stillnessPenalty": -0.001,
    "stillnessSpeedThreshold": 2.0
  },
  "episode": { "maxSteps": 3000, "stillnessTimeoutTicks": 180 }
}
```

## Key Decisions (from Research)

1. **Start with PPO** — on-policy, stable, works well single-env. Switch to SAC only if PPO plateaus after 2-3M timesteps.
2. **VecNormalize** — normalize observations and rewards for stable training.
3. **Monitor wrapper** — required for SB3 to auto-log episode rewards.
4. **BaseCallback subclass** — for custom TensorBoard metrics (lap time, completion rate, per-component reward).
5. **CheckpointCallback** — periodic model saves; EvalCallback for best model.
6. **Resume pattern** — `PPO.load(path, env=env)` + `reset_num_timesteps=False`.
7. **Throughput benchmark first** — validate AI-08 before starting long training runs.

## Scope Boundaries

**In scope:**
- Python training scripts (train_ppo.py, train_sac.py)
- Custom TensorBoard callback for racer metrics
- Model checkpoint save/load pipeline
- Throughput benchmark script
- Updated requirements.txt with SB3 + torch
- Throughput test, callback unit test, checkpoint integration test

**Out of scope:**
- Modifying the Node.js bridge server or TypeScript engine
- SubprocVecEnv / multi-env parallelism (v2 scope)
- Reward weight tuning iterations (that's manual Phase 5 work after scripts are built)
- Actual training to competency (depends on compute time + reward tuning)
