Make the following reward tuning changes to configs/default.yaml. These are precise value swaps only — do not change anything else.

## Changes:

1. `training_checkpoint_reward: 3.0` → `5.0`
2. `wall_damage_penalty_scale: 0.5` → `2.0`
3. `zigzag_spacing_multiplier: 0.7` → `0.5`
4. `stuck_timeout: 3.0` → `2.0`

## After making changes:

1. Verify the 4 values are correct in the file
2. Log this as Issue #007 in ISSUES.md — title: "Reward shaping tuning for v3 training run", describe what changed and why (stronger wall penalty, richer breadcrumb reward, tighter zigzag coverage, faster stuck detection)
3. Add a brief entry to BUILD_LOG.md
4. Commit all changes with message: "tune: reward shaping for richard_petty_v3 - stronger wall penalty, richer breadcrumbs, tighter zigzag spacing"
5. Do NOT start a training run — Harry will do that separately

When completely finished, run:
openclaw system event --text "Done: reward tuning applied and committed, ready for v3 training" --mode now
