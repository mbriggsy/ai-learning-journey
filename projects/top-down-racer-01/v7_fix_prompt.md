# v7 Fix Agent Prompt

## Mission
Implement three fixes for richard_petty_v7 training to stop the car from wall-riding:
1. Issue #012: Breadcrumb auto-advance (stop chain-locking on missed breadcrumbs)
2. Issue #013: Increase wall damage penalty scale 0.8 -> 1.2
3. New: Centerline lateral displacement penalty (punish being far from centerline sideways)

## Project Location
`C:\Users\brigg\ai-learning-journey\projects\top-down-racer-01`

## Stack
- Python 3.12, Arcade 3.3.3, Gymnasium 1.2.3, Stable-Baselines3 2.7.1
- Venv: `.venv\` in project root

## Fix 1: Issue #012 — Breadcrumb Auto-Advance

### Problem
`_next_checkpoint_idx` only advances when the car physically collects the active breadcrumb. If the car drives past it without collecting, the index never advances — that breadcrumb stays illuminated, no further ones illuminate, and the car's breadcrumb reward chain is broken for the rest of the episode.

### Fix
After the existing checkpoint collection logic in `ai/racing_env.py`, add an auto-advance step:

After checking `cp_reached`, also check if the car has moved far enough AHEAD of the current breadcrumb that it clearly missed it. Use track progress to detect this:

```python
# Auto-advance if car has moved more than 1.5 breadcrumb-spacings ahead of current target
# This prevents the chain from locking when a breadcrumb is missed
next_cp = self._training_checkpoints[self._next_checkpoint_idx]
car_progress = self._get_track_progress(car_x, car_y)
cp_progress = self._get_track_progress(next_cp[0], next_cp[1])
# If car is more than 1 breadcrumb-spacing ahead, auto-advance
spacing_in_progress = self._num_centerline_points / self._num_checkpoints
if forward_delta(car_progress, cp_progress) > spacing_in_progress * 1.5:
    self._next_checkpoint_idx = (self._next_checkpoint_idx + 1) % self._num_checkpoints
```

The `_get_track_progress` method already exists (added in Issue #010 fix). `forward_delta` needs to handle the lap wraparound correctly (same wraparound logic as the progress reward).

Add a config key: `breadcrumb_auto_advance_multiplier: 1.5` (how many spacings ahead before auto-advance kicks in).

Mark Issue #012 as Fixed in ISSUES.md.

## Fix 2: Issue #013 — Wall Damage Scale

### Change
In `configs/default.yaml`, change:
```yaml
wall_damage_penalty_scale: 0.8
```
to:
```yaml
wall_damage_penalty_scale: 1.2
```

Mark Issue #013 as Fixed in ISSUES.md.

## Fix 3: Centerline Lateral Displacement Penalty

### Problem
The forward progress reward only rewards moving ALONG the track centerline, but doesn't penalize the car for being FAR FROM the centerline laterally. A car can hug the left wall and still earn forward progress reward as long as it's moving forward.

### Fix
Add a new reward component: **lateral displacement penalty**. At each step, compute the car's perpendicular distance from the nearest centerline segment. Apply a negative reward proportional to that distance.

```python
# Lateral displacement penalty
lateral_dist = get_lateral_displacement(car_x, car_y, centerline_points)
lateral_penalty = -config.get('lateral_displacement_penalty_scale', 0.01) * lateral_dist
```

**Implementation:**
1. Add `get_lateral_displacement(car_x, car_y, centerline_points) -> float` to `game/track.py` (or as a helper in `ai/racing_env.py`). Returns perpendicular distance in pixels from car to nearest centerline segment.
2. In `ai/racing_env.py`, compute this each step and add to reward.
3. Add config key: `lateral_displacement_penalty_scale: 0.005` (start small — don't overpower other rewards).

**Note:** The centerline points are already available as `self._config["track"]["centerline_points"]`.

Add new config keys to `configs/default.yaml`:
```yaml
lateral_displacement_penalty_scale: 0.005
breadcrumb_auto_advance_multiplier: 1.5
```

## Files to Modify
- `ai/racing_env.py` — breadcrumb auto-advance, lateral displacement penalty
- `game/track.py` — add `get_lateral_displacement()` helper
- `configs/default.yaml` — new config keys, wall_damage_penalty_scale: 1.2
- `ISSUES.md` — mark #012 and #013 as Fixed, add lateral displacement as new feature
- `BUILD_LOG.md` — add v7 prep entry
- `README.md` — note v6 killed at 1.5M steps; v7 planned with 3 fixes

## CRITICAL Rules
- NO emoji in YAML files (crashes on cp1252 encoding)
- All config values in `configs/default.yaml` — NO magic numbers in code
- DO NOT start training — Harry will do that separately
- DO NOT commit `v7_fix_prompt.md`
- Commit all other changes: "fix: Issues #012 #013 + lateral displacement penalty for v7"

## Verification
Before finishing, verify:
1. `_next_checkpoint_idx` auto-advances when car moves past a breadcrumb
2. `wall_damage_penalty_scale: 1.2` in configs/default.yaml
3. `lateral_displacement_penalty_scale: 0.005` in configs/default.yaml
4. `get_lateral_displacement()` implemented and called each step
5. Issues #012 and #013 marked Fixed in ISSUES.md
6. No emoji in any YAML file

## When Done
Run: `openclaw system event --text "Done: v7 fixes committed - breadcrumb auto-advance, wall damage 1.2, lateral displacement penalty" --mode now`
