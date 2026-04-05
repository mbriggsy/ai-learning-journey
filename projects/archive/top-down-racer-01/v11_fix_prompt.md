# v11 Fix Agent — richard_petty_v11

You are a fix agent for a top-down racing RL project. Your job is to diagnose and fix three known issues, update ISSUES.md, update configs/default.yaml (and code if needed), and commit. Do NOT start training. Do NOT commit this prompt file.

## Project context
- Path: `C:\Users\brigg\ai-learning-journey\projects\top-down-racer-01`
- Stack: Python 3.12, arcade 3.3.3, gymnasium 1.2.3, stable-baselines3 2.7.1
- Venv: `.venv\Scripts\python.exe`
- All reward config lives in `configs/default.yaml` under `ai:`
- Reward logic lives in `ai/racing_env.py`
- Training hyperparams live in `configs/default.yaml` under `ai:` (PPO kwargs)
- ISSUES.md tracks all bugs and fixes

## Observed behavior (v10 post-mortem)
1. **Wall-riding persists**: Car still hugs guard rails. The `lateral_displacement_penalty_scale: 0.001` is too weak. The car makes valid centerline forward progress while pinned to the wall, so the penalty isn't competing with the reward.
2. **Car stops at zigzag corners**: The `corner_speed_penalty_scale: 0.05` is backfiring. The car sees high curvature ahead (curvature obs 18-20), brakes to near-zero, and then freezes. It learned "slow down near corners" but not "steer through corners." It idles until the stuck timer fires and kills the episode.
3. **Policy collapse at ~3M steps**: Every v10 training run collapsed around 60% (3M/5M steps). Breadcrumbs dropped from 20/ep to 4/ep, checkpoints went to zero, entropy collapsed to -8. Likely cause: `clip_range: 0.2` allows updates that are too large, causing catastrophic forgetting. `ent_coef: 0.01` entropy bonus wasn't enough to maintain exploration.

## Fixes required

### Issue #016 — Wall-riding: lateral penalty too weak
**File:** `configs/default.yaml`
**Fix:** Increase `lateral_displacement_penalty_scale` from `0.001` to `0.003`.
- Note: v7 used `0.005` which drowned all positive reward signals. `0.003` is a safer step up that should bite without overwhelming the breadcrumb signal.
- Document in ISSUES.md.

### Issue #017 — Corner navigation: car stops at zigzag turns  
**File:** `configs/default.yaml` and `ai/racing_env.py`

**Fix part 1:** Set `corner_speed_penalty_scale: 0.0` — disable it entirely. It's teaching "stop at corners" not "navigate corners." The curvature obs is useful context, but penalizing speed in corners incentivizes braking to zero rather than smooth cornering.

**Fix part 2:** Add a new reward: **cornering reward**. When the car has high curvature ahead AND is maintaining meaningful speed AND is turning (angular velocity), give a small bonus. This rewards the behavior we actually want: carrying speed through corners.

Add to `configs/default.yaml` under `ai:`:
```yaml
cornering_reward_scale: 0.05       # Bonus for maintaining speed through corners (curvature > threshold).
cornering_speed_threshold: 0.3     # Minimum speed fraction (speed/max_speed) to qualify for cornering bonus.
cornering_curvature_threshold: 0.3 # Minimum curvature deviation (0=straight, 1=sharpest) to trigger cornering bonus.
```

Add to `ai/racing_env.py` in the `_compute_reward` method (or wherever the per-step reward is computed):
```python
# Cornering reward: bonus for carrying speed through corners
curvature_1 = self._obs[18]  # normalized curvature lookahead 1
# curvature obs: 0=sharp left, 0.5=straight, 1=sharp right
# deviation from straight = abs(curvature - 0.5) * 2, range [0, 1]
curvature_deviation = abs(curvature_1 - 0.5) * 2.0
speed_fraction = abs(self._car.speed) / self._config['car']['max_speed']
if (curvature_deviation > self._config['ai']['cornering_curvature_threshold'] and
        speed_fraction > self._config['ai']['cornering_speed_threshold']):
    cornering_reward = self._config['ai']['cornering_reward_scale'] * speed_fraction * curvature_deviation
    reward += cornering_reward
```

Make sure to look at the actual code structure in racing_env.py before implementing — adapt to the actual variable names and observation access patterns used in the file. The obs indices are:
- 0-12: rays
- 13: speed (normalized, signed — check how it's stored)
- 14: angular_vel
- 15: drift
- 16: health
- 17: checkpoint_angle
- 18: curvature_1
- 19: curvature_2
- 20: curvature_3

IMPORTANT: Check how `self._obs` or observation values are actually accessed in the existing reward code. Use the same pattern. Do NOT assume structure — read the file first.

Document in ISSUES.md.

### Issue #018 — Policy collapse: clip_range too large, entropy too low
**File:** `configs/default.yaml`
**Fix:**
- `clip_range`: `0.2` → `0.1` — smaller policy update steps reduce catastrophic forgetting
- `ent_coef`: `0.01` → `0.02` — more entropy bonus maintains exploration pressure longer into training

Document in ISSUES.md.

## ISSUES.md format
Each issue should have:
```
### Issue #NNN — [title]
**Status:** Open / Fixed
**Observed:** [what was seen]
**Root cause:** [why it happened]  
**Fix:** [what was changed]
**Files:** [which files]
```

Mark #016, #017, #018 as Fixed after implementing.

## Commit instructions
After all fixes are implemented and verified (do a quick syntax check — run `.venv\Scripts\python.exe -c "import ai.racing_env"` to verify no import errors):

```
git add -A -- ':!v11_fix_prompt.md' ':!*.md.bak'
git commit -m "fix: Issues #016 #017 #018 - wall penalty, corner reward, PPO stability for v11"
```

Do NOT commit `v11_fix_prompt.md` or any other prompt files.
Do NOT git push (Harry handles that).
Do NOT start training.

## Done signal
When completely finished, run:
```
openclaw system event --text "v11 fix agent done: Issues #016 #017 #018 implemented and committed" --mode now
```
