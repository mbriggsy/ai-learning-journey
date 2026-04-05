# v12 Fix Agent — richard_petty_v12

You are a fix agent for a top-down racing RL project. Your job is to diagnose and fix known issues from v11, update ISSUES.md, update configs/default.yaml and ai/racing_env.py as needed, and commit. Do NOT start training. Do NOT commit this prompt file.

## Project context
- Path: `C:\Users\brigg\ai-learning-journey\projects\top-down-racer-01`
- Stack: Python 3.12, arcade 3.3.3, gymnasium 1.2.3, stable-baselines3 2.7.1
- Venv: `.venv\Scripts\python.exe`
- All reward config lives in `configs/default.yaml` under `ai:`
- Reward/env logic lives in `ai/racing_env.py`
- Training hyperparams live in `configs/default.yaml` under `ai:` (PPO kwargs)
- ISSUES.md tracks all bugs and fixes

## v11 post-mortem
v10 at 2.5M steps: ~20 breadcrumbs/ep, first checkpoint hits, car reached the zigzag corner.
v11 (our "fixes"): car barely leaves the starting line before turning into the wall and flailing. WORSE than v10.

Three things changed in v11 vs v10:
1. `lateral_displacement_penalty_scale`: 0.001 → 0.003 (3x increase)
2. `ent_coef`: 0.01 → 0.02
3. `cornering_reward` added, `corner_speed_penalty` removed

The `lateral_displacement_penalty_scale` tripling is the primary regression suspect. At 0.003, the penalty likely overwhelms forward progress signals near walls, creating a trap the car can't escape. The car gets near any wall, receives large penalties, and the random policy can't navigate out.

The `ent_coef` increase may have contributed to the policy std exploding from 1.0 → 6.0+ by the end of training (entropy explosion, opposite of collapse). With std=6, the policy outputs near-random actions.

## Fixes required

### Issue #019 — Lateral displacement penalty regression (v11 broke basic navigation)
**Root cause:** `lateral_displacement_penalty_scale: 0.003` is too aggressive — overwhelms the forward progress reward near walls. Car can't escape wall contact zones.
**Fix:** Revert `lateral_displacement_penalty_scale` to `0.001`.
**File:** `configs/default.yaml`

### Issue #020 — Entropy explosion: policy std grew from 1.0 to 6.0+ in v11
**Root cause:** `ent_coef: 0.02` is too high — encouraged too much randomness. Policy became near-random by end of training instead of converging.
**Fix:** Revert `ent_coef` to `0.01`.
**File:** `configs/default.yaml`

### Issue #021 — Car never learns to navigate corners: needs curriculum spawning
**Root cause:** Car always spawns at track point 0 (start/finish straight). The corner (track points 3-5, the sweeping right turn) is far enough away that the agent rarely reaches it, gets little gradient signal from it, and never develops corner-handling skills. Without corner gradient signal, the policy can't learn to navigate turns.

**Fix:** Add randomized spawn curriculum — during training, randomly spawn the car at one of several track positions near the start AND the first corner, so it must regularly practice approaching and navigating the turn.

**Implementation:**

Add to `configs/default.yaml` under `ai:`:
```yaml
# --- Curriculum spawning (v12) ---
curriculum_spawn_enabled: true        # Enable randomized spawn positions during training.
curriculum_spawn_points: [0, 1, 2, 3, 4]  # Centerline point indices to randomly spawn at.
# Points 0-2: start/finish straight. Points 3-4: entry to sweeping right turn.
# Randomly spawning here forces the agent to practice corner approach regularly.
```

**Code change in `ai/racing_env.py`:**

In the `reset()` method, find where the car's spawn position is set. Currently it uses `centerline[0]` + `spawn_forward_offset`. Change it to:
- If `curriculum_spawn_enabled` is True AND this is a training environment (not watch mode), pick a random index from `curriculum_spawn_points`
- Use that centerline point as the spawn base, with the car facing the direction of the next centerline point
- Keep the existing spawn logic as a fallback when curriculum is disabled

IMPORTANT: Read the existing reset() code carefully before implementing. Adapt to the actual variable names and spawn logic. The car has a position and angle — set both correctly based on the selected centerline point and the direction to the next point.

Watch mode (`watch.py`) should NOT use curriculum spawning — always spawn at point 0. Check if there's a way to detect watch vs train mode (e.g., an env flag or argument). If in doubt, add an `is_training` parameter to the env constructor (defaulting to False) and set it to True in `train.py`'s `make_env()`.

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

Mark #019, #020, #021 as Fixed after implementing.

## Verification
After implementing, run:
```
.venv\Scripts\python.exe -c "import ai.racing_env; print('OK')"
```
Fix any import errors before committing.

## Commit instructions
```
git add -A -- ':!v12_fix_prompt.md'
git commit -m "fix: Issues #019 #020 #021 - revert lateral penalty, revert ent_coef, add curriculum spawning for v12"
```

Do NOT commit `v12_fix_prompt.md` or any other prompt files.
Do NOT git push.
Do NOT start training.

## Done signal
When completely finished, run:
```
openclaw system event --text "v12 fix agent done: Issues #019 #020 #021 committed" --mode now
```
