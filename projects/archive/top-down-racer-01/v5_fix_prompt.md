You are preparing the training code for richard_petty_v5. Make the following changes to ai/train.py and ai/racing_env.py.

## Fix 1: Add Monitor wrapper (CRITICAL - this is why ep_rew_mean never appeared)

In ai/train.py, in the make_env() factory function (around line 56-66), wrap the RacingEnv with SB3's Monitor wrapper:

```python
from stable_baselines3.common.monitor import Monitor

def make_env(config_path: str):
    def _init():
        import sys
        sys.path.insert(0, str(Path(__file__).parent.parent))
        from ai.racing_env import RacingEnv
        from stable_baselines3.common.monitor import Monitor
        return Monitor(RacingEnv(config_path=config_path))
    return _init
```

This makes ep_rew_mean and ep_len_mean appear in training output. Without it, SB3 never sees episode-level statistics.

## Fix 2: Custom episode instrumentation callback

Add a custom SB3 callback to ai/train.py that logs per-episode stats to TensorBoard and to the text output. The callback should track and log (per episode, rolling mean over last 100 episodes):
- ep_breadcrumbs_collected: how many breadcrumb dots the car collected before episode ended
- ep_checkpoints_hit: how many major checkpoints (0-4) were crossed
- ep_survived_steps: how many steps the episode lasted (to know if car is dying early or timing out)

To make this work, racing_env.py's step() info dict should include:
- info["breadcrumbs_collected"]: cumulative count this episode
- info["checkpoints_hit"]: count of major checkpoints cleared this episode  
- info["step_count"]: current step count

Check racing_env.py to see if these are already in the info dict. If not, add them.

The callback class in train.py should extend BaseCallback and use self.locals["infos"] to read per-step info, accumulating episode stats and logging them when done=True.

## Fix 3: Checkpoint snapshots during training

Add SB3's CheckpointCallback to save model snapshots every 500,000 steps to models/checkpoints/. This lets watch.py be run mid-training to see progress.

```python
from stable_baselines3.common.callbacks import CheckpointCallback
checkpoint_callback = CheckpointCallback(
    save_freq=500000 // num_envs,  # adjust for parallel envs
    save_path="models/checkpoints/",
    name_prefix=args.model_name
)
```

Combine with any custom callback using CallbackList.

## Fix 4: Log as Issue #009 in ISSUES.md
Title: "Missing Monitor wrapper - ep_rew_mean never logged in v1-v4"
Root cause: make_env() returned bare RacingEnv without Monitor wrapper. SB3 requires Monitor to track episode rewards.
Fix: wrapped env with Monitor in make_env().

## Fix 5: Update BUILD_LOG.md and commit
Commit message: "fix: Issue #009 - add Monitor wrapper, episode instrumentation callback, checkpoint saves for v5"

Do NOT start a training run.

When completely finished, run:
openclaw system event --text "Done: v5 fixes applied - Monitor wrapper, episode instrumentation, checkpoint saves" --mode now
