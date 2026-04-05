Update the project documentation to capture everything that happened today (Feb 23, 2026) during Phase 2 training. Read the existing docs first, then update them.

## Files to read first:
- ISSUES.md
- BUILD_LOG.md
- README.md

## What happened today (use this to fill in gaps):

### Training Runs:
- **richard_petty_v1**: 500k steps (prior run). Baby model, 0 laps/episode.
- **richard_petty_v2**: 2M steps. Fixed watch.py (Issue #005). Car was visible and driving but stuck near start line. Model too early-stage.
- **richard_petty_v3**: 5M steps with reward tuning (checkpoint reward 3→5, wall damage 0.5→2.0, zigzag multiplier 0.7→0.5, stuck timeout 3→2). Result: WORSE. AI exploited reward by oscillating on one breadcrumb dot. ep_rew_mean never appeared (episodes not completing). Entropy collapsed to near-zero by 50% through training — locked into a bad strategy.
- **richard_petty_v4**: In progress (5M steps). Fixes: breadcrumbs one-time per lap, wall damage 2.0→0.8, entropy coefficient 0.01 added to PPO.

### Issues fixed today:
- Issue #005: watch.py freeze — Arcade now owns the loop, AI drives in on_update()
- Issue #006: spawn position and false lap credit at reset
- Issue #007: reward shaping tuning (v3 run)
- Issue #008: reward exploitation — AI oscillated on same dot for infinite reward

### Key observations:
- ep_rew_mean never appeared in v2 or v3 runs — means episodes were not completing (car dying or getting stuck before finishing a lap)
- entropy_loss collapsing to near-zero = premature convergence (bad local minimum)
- explained_variance 0.9+ = good value function, but useless if policy is exploiting rewards
- Reward hacking: AI found easiest path to reward (oscillate on dot) rather than driving — classic RL problem

## What to update:

1. **ISSUES.md**: Verify Issues #005-#008 are all logged with root cause and fix. Add anything missing.

2. **BUILD_LOG.md**: Add a Phase 2 Training section documenting v1-v4 training runs, what each produced, what was learned, and what was changed for the next run.

3. **README.md**: Update the "Current Status" or "Progress" section to reflect Phase 2 is actively in training. Mention the RL stack (PPO, Gymnasium, Stable-Baselines3), what's been learned about reward shaping, and where things stand.

Do NOT change any code. Documentation only.

Commit with message: "docs: update ISSUES.md, BUILD_LOG.md, README.md with Phase 2 training observations and lessons learned"

When done, run:
openclaw system event --text "Done: docs updated with Phase 2 training observations" --mode now
