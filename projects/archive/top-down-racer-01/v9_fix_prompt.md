# v9 Fix Agent Prompt

## Mission
Fix Issue #015: add 3 track curvature lookahead values to the observation space so the car can "see" upcoming corners and learn to slow down before hitting them.

## Project Location
`C:\Users\brigg\ai-learning-journey\projects\top-down-racer-01`

## Background
v8 (1.5M step checkpoint) shows the car drives well on straights, collects breadcrumbs, then reaches the first zigzag corner: hits wall, reverses briefly, stops, episode ends. Root cause: zero advance warning of corners. The obs space is purely reactive (wall rays) — no predictive track shape info.

## The Fix: Track Curvature Lookahead

### What to add
3 new observation values representing the signed turn angle at 1, 2, and 3 centerline points ahead of the car's current track position:

- `curvature_1` — turn sharpness 1 centerline point ahead
- `curvature_2` — turn sharpness 2 centerline points ahead  
- `curvature_3` — turn sharpness 3 centerline points ahead

Normalized: 0.0 = sharp left, 0.5 = straight, 1.0 = sharp right

### How to compute it
The car's current track position (`_track_progress`) is already computed each step as a fractional index into the centerline. Use this to look up upcoming centerline points.

For each lookahead k (1, 2, 3):
1. Get centerline point at index `floor(track_progress) + k` (mod num_centerline_points)
2. Get the two adjacent points to compute the tangent change
3. Cross product of consecutive tangents gives signed curvature (positive = right turn, negative = left turn)
4. Normalize to [0, 1]: `(curvature + max_curvature) / (2 * max_curvature)`, clamped

A simpler approach that works well:
```python
def get_curvature_at_index(centerline, idx):
    n = len(centerline)
    p0 = centerline[(idx - 1) % n]
    p1 = centerline[idx % n]
    p2 = centerline[(idx + 1) % n]
    
    v1 = p1 - p0  # incoming tangent
    v2 = p2 - p1  # outgoing tangent
    
    # Cross product z-component = signed turn (positive = left turn in screen coords)
    cross = v1[0] * v2[1] - v1[1] * v2[0]
    
    # Normalize by segment lengths to get consistent scale
    mag = (np.linalg.norm(v1) * np.linalg.norm(v2)) + 1e-8
    signed_curvature = cross / mag  # range roughly [-1, 1]
    
    # Map to [0, 1]: 0.5 = straight, 0 = sharp left, 1 = sharp right
    return float(np.clip((signed_curvature + 1.0) / 2.0, 0.0, 1.0))
```

### Implementation

**In `game/track.py`**: Add method `get_curvature_lookahead(current_progress, num_lookahead=3) -> list[float]`
- Takes fractional track progress index
- Returns list of `num_lookahead` normalized curvature values

**In `ai/observations.py`**:
- Add `NUM_CURVATURE_LOOKAHEAD: int = 3`
- Update `NUM_STATE_VALUES: int = 8` (was 5 — adds speed, angular_vel, drift, health, checkpoint_angle, curvature_1, curvature_2, curvature_3)
- `OBS_SIZE: int = NUM_RAYS + NUM_STATE_VALUES  # 21` (was 18)
- Update `build_observation()` to accept `track_progress` and `centerline_points` and append the 3 curvature values
- Update all docstrings (shape (21,), indices 18-20 = curvature_1/2/3)
- Update `make_observation_space()` (uses OBS_SIZE so should auto-update)

**In `ai/racing_env.py`**:
- Pass `self._track_progress` and centerline points to `build_observation()` in both `reset()` and `step()`
- Update any docstrings mentioning obs shape (18,) -> (21,)

**Config** (`configs/default.yaml`): Add under ai section:
```yaml
curvature_lookahead_steps: 3
```

### Files to Modify
- `game/track.py` — add `get_curvature_lookahead()` or equivalent helper
- `ai/observations.py` — add 3 curvature obs values, update constants/docstrings
- `ai/racing_env.py` — pass track_progress + centerline to build_observation
- `configs/default.yaml` — add curvature_lookahead_steps: 3
- `ISSUES.md` — mark #015 as Fixed
- `BUILD_LOG.md` — add v9 prep entry (v8 killed at 35% — car blind to corners; v9 adds curvature lookahead)
- `README.md` — update training history (v8 killed at 1.77M steps)

## CRITICAL Rules
- NO emoji in YAML files (crashes on cp1252 encoding)
- All config values in `configs/default.yaml` — NO magic numbers in code
- DO NOT start training — Harry will do that separately
- DO NOT commit `v9_fix_prompt.md`
- Commit: "fix: Issue #015 - add track curvature lookahead to observation space for v9"

## Verification
1. `OBS_SIZE = 21` in observations.py
2. `build_observation()` returns shape (21,) array
3. 3 curvature values are last 3 in obs vector (indices 18, 19, 20)
4. `curvature_lookahead_steps: 3` in configs/default.yaml (no emoji)
5. Issue #015 marked Fixed in ISSUES.md
6. `make_observation_space()` returns Box with shape (21,)

## When Done
Run: `openclaw system event --text "Done: v9 fixes committed - curvature lookahead obs space 18->21" --mode now`
