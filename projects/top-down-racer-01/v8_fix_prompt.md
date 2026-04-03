# v8 Fix Agent Prompt

## Mission
Two fixes for richard_petty_v8:
1. Reduce lateral displacement penalty scale (was too aggressive in v7, drowned out all positive reward signals)
2. Issue #014: Add 0-degree forward ray to observation space (17 -> 18)

## Project Location
`C:\Users\brigg\ai-learning-journey\projects\top-down-racer-01`

## Fix 1: Tune Lateral Displacement Penalty

### Problem
In v7, `lateral_displacement_penalty_scale: 0.005` caused ep_rew_mean to stay around -350 for the entire run. The penalty dominated the reward signal every step, entropy collapsed to -6.0, and the car never learned to hit checkpoints. The lateral penalty is a good idea but the magnitude is too high.

### Fix
In `configs/default.yaml`, change:
```yaml
lateral_displacement_penalty_scale: 0.005
```
to:
```yaml
lateral_displacement_penalty_scale: 0.001
```

This reduces the penalty by 5x — enough to nudge the car toward the centerline without overwhelming the breadcrumb and checkpoint reward signals.

## Fix 2: Issue #014 — Add Forward Ray

### Problem
The observation ray fan has a 20-degree blind spot directly ahead. Ray angles currently are:
`-120, -100, -75, -50, -30, -10, +10, +30, +50, +75, +100, +120`
No 0-degree (straight ahead) ray exists. Adding one gives the agent a direct forward wall reading.

### Fix
In `ai/observations.py`, change `RAY_ANGLES_DEG`:
```python
RAY_ANGLES_DEG: list[float] = [
    -120, -100, -75, -50, -30, -10,
      0,
     10,   30,  50,  75, 100, 120,
]
```

This adds 1 ray for 13 total. Update the following:
- `NUM_RAYS: int = 13` (was 12)
- `OBS_SIZE: int = NUM_RAYS + NUM_STATE_VALUES  # 18` (was 17)
- Update the module docstring to reflect 13 rays and (18,) shape
- Update `make_observation_space()` if it hardcodes shape (it uses `NUM_RAYS` so should auto-update)
- Update the docstring in `cast_observation_rays` listing the ray angles
- Update `build_observation` docstring if it mentions shape (17,)

Also update `ai/racing_env.py` if it mentions observation size (17) anywhere in comments/docstrings.

**Note:** This breaks backward compatibility with v1-v7 models (different obs shape). That's fine — v8 is a fresh training run.

Mark Issue #014 as Fixed in ISSUES.md.

## Files to Modify
- `configs/default.yaml` — lateral_displacement_penalty_scale: 0.001
- `ai/observations.py` — add 0-degree ray, update NUM_RAYS/OBS_SIZE/docstrings
- `ai/racing_env.py` — update any mentions of obs size (17) in comments
- `ISSUES.md` — mark #014 as Fixed
- `BUILD_LOG.md` — add v8 prep entry (v7 killed at 27% — lateral penalty too aggressive; v8 fixes: tuned penalty + forward ray)
- `README.md` — update training history (v7 killed at 1.34M steps)

## CRITICAL Rules
- NO emoji in YAML files (crashes on cp1252 encoding)
- All config values in `configs/default.yaml` — NO magic numbers in code
- DO NOT start training — Harry will do that separately
- DO NOT commit `v8_fix_prompt.md`
- Commit: "fix: Issue #014 + tune lateral penalty for v8"

## Verification
1. `RAY_ANGLES_DEG` has 13 entries including 0.0
2. `NUM_RAYS = 13`, `OBS_SIZE = 18`
3. `lateral_displacement_penalty_scale: 0.001` in configs/default.yaml
4. Issue #014 marked Fixed in ISSUES.md
5. No emoji in YAML

## When Done
Run: `openclaw system event --text "Done: v8 fixes committed - forward ray + lateral penalty tuned" --mode now`
