You are fixing reward exploitation bugs in this RL racing game to prepare for richard_petty_v4 training.

## The Problem
The AI found a reward hack: it drives to the first curve, hits the wall, reverses onto a breadcrumb dot, and oscillates back and forth collecting the same dot repeatedly. This gives free reward without driving forward.

## Investigation First
Read these files carefully before making any changes:
- ai/racing_env.py -- how breadcrumb checkpoints are tracked and rewarded
- configs/default.yaml -- current reward/training settings

## Fix 1: One-time breadcrumbs per lap (MOST IMPORTANT)
In racing_env.py, the training checkpoints (breadcrumbs) must be one-time collectibles per lap. Once a breadcrumb is collected, it should NOT give reward again until the car completes a full lap (at which point all breadcrumbs reset for the next lap).

Verify this is already implemented. If breadcrumbs can be re-collected without completing a lap, fix it. The car must visit NEW breadcrumbs to get reward -- re-visiting consumed ones should give ZERO reward (not a penalty, just zero -- the penalty is the opportunity cost of not moving forward).

## Fix 2: Wall damage tuning in configs/default.yaml
The wall_damage_penalty_scale was set to 2.0 last run. This caused the car to die so fast from wall hits that episodes ended before learning could happen. Change:
- wall_damage_penalty_scale: 2.0 → 0.8 (punishing but survivable, gives time to learn)

## Fix 3: Add entropy coefficient to PPO config in configs/default.yaml
The entropy collapsed to near-zero by 50% through training, meaning the agent stopped exploring too early and got stuck in a bad local minimum. Add an entropy coefficient to keep exploration alive longer:
- Add new config value: ent_coef: 0.01 (standard SB3 PPO default is 0.0; 0.01 encourages continued exploration)

Then in ai/train.py, pass ent_coef from config to the PPO constructor.

## Fix 4: Log this as Issue #008 in ISSUES.md
Title: "Reward exploitation: AI oscillates on breadcrumb dots instead of driving"
Describe what happened, root cause (re-collectible breadcrumbs + wall damage too high + entropy collapse), and fixes applied.

## Fix 5: Update BUILD_LOG.md with a brief entry

## Fix 6: Commit all changes
Commit message: "fix: Issue #008 - prevent breadcrumb re-exploitation, tune wall damage, add entropy coefficient for v4"

Do NOT start a training run -- Harry will do that separately.

When completely finished, run:
openclaw system event --text "Done: v4 reward fixes applied and committed, ready to train" --mode now
