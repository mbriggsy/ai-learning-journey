# v6 Fix Agent Prompt

## Mission
Fix Issue #010 in the top-down-racer-01 project: replace the raw speed reward with a forward progress reward along the track centerline. This eliminates the wall-hugging exploit where the AI learns to pin against a wall and hold the gas pedal down for free speed reward.

## Project Location
`C:\Users\brigg\ai-learning-journey\projects\top-down-racer-01`

## Stack
- Python 3.12, Arcade 3.3.3, Gymnasium 1.2.3, Stable-Baselines3 2.7.1
- Venv: `.venv\` in project root

## The Problem (Issue #010)
In v5, the speed reward is computed as:
  `reward += 0.12 * (speed / max_speed)`

This rewards the car for going fast regardless of direction. The AI learned to:
1. Grab a few breadcrumbs
2. Crash into a wall
3. Hold the gas forever (wheels spinning = speed = reward)

Result: ep_len_mean hits 6000 (max timeout) every episode; ep_checkpoints_hit never exceeds ~0.03.

## The Fix
Replace speed reward with **forward progress along the track centerline**.

### Concept
Track progress = how far along the track's centerline the car has moved since the last step.
- If the car moves FORWARD along the track → positive reward proportional to distance gained
- If the car moves BACKWARD along the track → negative reward (or zero)
- If the car is pinned to a wall going nowhere → zero reward

This naturally kills the wall-hugging exploit.

### Implementation Notes

1. **Track centerline**: `game/track.py` already has `checkpoint_positions` (list of (x,y) tuples) — these define the track path. Use them as waypoints for the centerline.

2. **Progress tracking in RacingEnv** (`ai/racing_env.py`):
   - Add `self.track_progress` (float) = index along the centerline (can be fractional)
   - On each step, compute the car's closest point on the centerline
   - `delta_progress = new_track_progress - old_track_progress`
   - `forward_progress_reward = config.get('forward_progress_reward_scale', 1.0) * delta_progress` (if delta > 0)
   - Penalize backward progress: if delta < 0, apply small negative reward

3. **Remove or reduce speed reward**: The raw speed reward should be removed entirely or reduced to near-zero. Add a config key `speed_reward_scale: 0.0` so it can be tuned without code changes.

4. **Config keys to add in `configs/default.yaml`**:
   ```yaml
   forward_progress_reward_scale: 2.0   # reward per unit of track progress
   backward_progress_penalty_scale: 0.5  # penalty multiplier for going backwards
   speed_reward_scale: 0.0              # set to 0 to disable speed reward
   ```

5. **Checkpoint reward**: Keep existing checkpoint rewards — they're working fine.

6. **Breadcrumb reward**: Keep existing breadcrumb one-time-per-lap rewards — they're working fine.

7. **Handle wraparound**: When the car completes a lap (progress goes from near-end back to near-start), treat it as forward progress, not backward.

### Centerline Helper
Add a helper method to `RacingEnv` or `game/track.py`:

```python
def get_track_progress(self, car_x, car_y) -> float:
    """
    Returns fractional index [0, num_checkpoints) representing
    how far along the track centerline the car is.
    """
    # Find closest checkpoint, interpolate between checkpoints
    ...
```

## Files to Modify
- `ai/racing_env.py` — main reward logic, add progress tracking
- `configs/default.yaml` — add new config keys
- `game/track.py` — may need to expose centerline points or add helper
- `ISSUES.md` — file Issue #010 as RESOLVED with description of fix
- `BUILD_LOG.md` — add entry for v6 prep / Issue #010 fix
- `README.md` — update training history to note v5 killed at 3.16M steps; v6 planned

## CRITICAL Rules
- NO emoji in YAML files (crashes on cp1252 encoding)
- All config values in `configs/default.yaml` — NO magic numbers in code
- DO NOT start training — Harry will do that separately after reviewing the changes
- DO NOT commit the file `v6_fix_prompt.md`
- DO commit all other changes with a clear message like: "fix: Issue #010 - replace speed reward with centerline forward progress"

## Verification
Before finishing, verify:
1. `ai/racing_env.py` imports and uses the new forward_progress_reward_scale config
2. Speed reward is disabled (scale = 0.0) or removed
3. `configs/default.yaml` has the new keys (no emoji!)
4. ISSUES.md has Issue #010 marked RESOLVED
5. BUILD_LOG.md updated
6. README.md updated

## When Done
Run this command to notify Harry:
`openclaw system event --text "Done: v6 fixes committed - Issue #010 centerline progress reward implemented" --mode now`
