# v10 Fix Agent Prompt

## Mission
Two fixes for richard_petty_v10:
1. Add corner speed penalty — penalize going fast through sharp turns
2. Increase stuck timeout from 2.0s to 4.0s — give car more time to recover from corners

## Project Location
`C:\Users\brigg\ai-learning-journey\projects\top-down-racer-01`

## Background
v9 (29% trained) shows the car still crashing at corners and immediately going dead after reversing. The curvature lookahead obs was added in v9 and is working correctly (verified: spawn curvature values are accurate). The car just hasn't learned to USE the curvature info to slow down.

Root causes:
1. No reward signal linking "high curvature + high speed = bad" — car never learned to associate curvature obs with braking
2. Stuck timeout is 2.0s — car reverses from wall, has ~2s to do something, gives up and episode ends

## Fix 1: Corner Speed Penalty

Add a new reward component to `ai/racing_env.py`:

```python
# Corner speed penalty — penalize going fast through sharp turns
# Uses the curvature lookahead obs already computed this step
# curvature_1 is the NEXT centerline point ahead
curvature_1 = track.get_curvature_lookahead(self._track_progress, 1)[0]
curvature_deviation = abs(curvature_1 - 0.5) * 2.0  # 0=straight, 1=sharpest
speed_fraction = abs(car.speed) / max_speed
corner_speed_penalty = -config.get('corner_speed_penalty_scale', 0.05) * speed_fraction * curvature_deviation
```

This creates a penalty that is:
- Zero on straight sections (curvature_deviation = 0)
- Small on mild curves at low speed
- Large on sharp corners at high speed
- Forces the car to associate "high curvature ahead" with "reduce throttle"

Add config key to `configs/default.yaml`:
```yaml
corner_speed_penalty_scale: 0.05
```

The track's `get_curvature_lookahead()` is already available — it's being called in `build_observation()`. You can either call it again in the reward step, or store the result from the observation build and reuse it. The cleaner approach is to store it:

In `racing_env.py`, after building the observation, store the curvature values:
```python
self._last_curvature_1 = track.get_curvature_lookahead(self._track_progress, 1)[0]
```
Then use `self._last_curvature_1` in the reward computation.

## Fix 2: Increase Stuck Timeout

In `configs/default.yaml`, change:
```yaml
stuck_timeout: 2.0
```
to:
```yaml
stuck_timeout: 4.0
```

This doubles the time the car has to recover after hitting a wall before the episode terminates. Gives it more opportunity to reverse, turn, and re-approach corners rather than just giving up.

## Files to Modify
- `ai/racing_env.py` — add corner speed penalty computation and reward component
- `configs/default.yaml` — corner_speed_penalty_scale: 0.05, stuck_timeout: 4.0
- `ISSUES.md` — add Issue #016 (corner speed penalty) as Fixed, note stuck timeout increase
- `BUILD_LOG.md` — add v10 prep entry
- `README.md` — update training history (v9 killed at 29%)

## CRITICAL Rules
- NO emoji in YAML files (crashes on cp1252 encoding)
- All config values in `configs/default.yaml` — NO magic numbers in code
- DO NOT start training — Harry will do that separately
- DO NOT commit `v10_fix_prompt.md` or `debug_curvature.py`
- Commit: "fix: add corner speed penalty + increase stuck timeout for v10"

## Verification
1. `corner_speed_penalty_scale: 0.05` in configs/default.yaml
2. `stuck_timeout: 4.0` in configs/default.yaml
3. Corner speed penalty is computed and added to step reward
4. No emoji in YAML
5. BUILD_LOG.md and README.md updated

## When Done
Run: `openclaw system event --text "Done: v10 fixes committed - corner speed penalty + stuck timeout 4s" --mode now`
