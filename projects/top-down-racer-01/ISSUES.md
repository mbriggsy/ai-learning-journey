# 🐛 Issues Log — Top-Down Racer 01

A running log of bugs found, root causes, and fixes applied.
Format: newest issues at the top.

---

## Issue #001 — Arcade 3.x API Compatibility (3 failures)

**Date:** 2026-02-22  
**Found by:** Harry 🧙 (first launch attempt)  
**Status:** ✅ Fixed

### Background
The agent team built against Arcade 2.x API references. We're running Arcade 3.3.3, which moved and renamed several functions in the `shape_list` module.

---

### Failure 1: `arcade.ShapeElementList` not found

**Error:**
```
AttributeError: module 'arcade' has no attribute 'ShapeElementList'
```

**Root Cause:**  
In Arcade 3.x, `ShapeElementList` was moved out of the top-level `arcade` namespace into `arcade.shape_list`.

**Files affected:** `game/track.py`, `game/renderer.py`

**Fix:**  
- `game/track.py`: Added `from arcade.shape_list import ShapeElementList, create_line, create_line_strip, create_triangles_filled_with_colors` inside `build_shape_list()`. Replaced `arcade.ShapeElementList()` with `ShapeElementList()`.
- `game/renderer.py`: Updated type annotation from `arcade.ShapeElementList` to `arcade.shape_list.ShapeElementList`.

---

### Failure 2: `arcade.create_line` / `arcade.create_line_strip` not found

**Error:** (would have followed after fix #1)

**Root Cause:**  
Same as above — `create_line` and `create_line_strip` were also moved to `arcade.shape_list` in 3.x.

**Files affected:** `game/track.py`

**Fix:**  
Included in the same import fix as Failure 1. Replaced:
- `arcade.create_line_strip(...)` → `create_line_strip(...)`
- `arcade.create_line(...)` → `create_line(...)`

---

### Failure 3: `create_triangles_filled_with_colors()` wrong keyword argument

**Error:**
```
TypeError: create_triangles_filled_with_colors() got an unexpected keyword argument 'color_list'
```

**Root Cause:**  
The parameter was renamed between Arcade versions. The correct name in 3.x is `color_sequence`, not `color_list`.

**Files affected:** `game/track.py`

**Fix:**
```python
# Before (Arcade 2.x)
create_triangles_filled_with_colors(point_list=tri, color_list=[...])

# After (Arcade 3.x)
create_triangles_filled_with_colors(point_list=tri, color_sequence=[...])
```

---

### Post-fix Status
Game window launched successfully. Displays:
- Window title: "Top-Down Racer 01" ✅
- Lap counter: Lap 1 / 3 ✅  
- Race timer running ✅
- Track visible on screen ✅

**Outstanding warning** (non-blocking):
```
PerformanceWarning: draw_text is an extremely slow function for displaying text.
Consider using Text objects instead.
```
This affects HUD rendering performance. Not a crash — game runs — but worth addressing in a future pass to replace `arcade.draw_text()` calls in `game/hud.py` with `arcade.Text` objects.

---

---

## Issue #002 — Wall Damage Makes Game Unplayable

**Date:** 2026-02-22  
**Found by:** Briggsy (first play session)  
**Status:** ✅ Fixed

### Problem
Wall contact ended the game almost instantly. Even a glancing blow at speed was fatal.

### Root Cause
Default damage config was too aggressive for a playable racing game:
- `wall_damage_multiplier: 0.5` → at max speed (400 px/s), one hit = 200 damage = instant death
- `min_damage_speed: 50` → any tap over 50 px/s triggered damage
- `max_health: 100` → no buffer at all

### Fix (`configs/default.yaml`)

| Setting | Before | After | Effect |
|---|---|---|---|
| `wall_damage_multiplier` | `0.5` | `0.1` | Max hit = 40 damage (was 200) |
| `min_damage_speed` | `50` | `100` | Scrapes/grazes are free |
| `max_health` | `100` | `200` | ~5 full-speed hits to die |

### Result
At max speed (400 px/s), a full broadside hit does 40 out of 200 health — about 20% per hit. Five heavy impacts to die. Grazes under 100 px/s do nothing. Should feel punishing but survivable.

---

---

## Issue #003 — Lap 3 Completes Early (Before Start/Finish Line)

**Date:** 2026-02-22  
**Found by:** Briggsy (first play session)  
**Status:** ✅ Fixed

### Problem
The race ended (lap 3 complete) before the car crossed the start/finish line. The win triggered somewhere in the final section of the track.

### Root Cause
The lap completion logic fired as soon as ALL checkpoints were hit — regardless of which checkpoint was crossed last. The start/finish line was checkpoint index 0, which gets crossed early in the lap. By the time the final track checkpoint (CP20, chicane entry) was hit, all checkpoints were in the set → lap complete triggered at the wrong location.

### Fix (Attempt 1 — partial)

**`configs/default.yaml`**: Moved start/finish line to be LAST in `checkpoint_indices`.

**`game/renderer.py`**: Changed lap completion to only fire when the finish line (last checkpoint) was specifically the one being crossed.

### Secondary Bug (discovered during fix)

The car **spawns on the start/finish line**. On the first frame it moved, the crossing detection fired → start/finish got pre-added to the set → when the car came back around, it was already in the set and couldn't trigger again → laps never counted.

### Fix (Final — renderer.py)

Split checkpoint detection into two stages:

**Stage A** — Intermediate checkpoints (all except finish line): collected into `checkpoints_hit` set normally.

**Stage B** — Finish line: only becomes "hot" once ALL intermediate checkpoints are in the set. Completely ignored until then — including at spawn.

```python
# All intermediates done?
all_intermediate_hit = len(checkpoints_hit) == finish_line_idx

if all_intermediate_hit:
    if check_checkpoint(...finish_seg...):
        # LAP COMPLETE
```

This means the spawn crossing of the finish line is harmlessly ignored every time, because `all_intermediate_hit` is always False until the car has gone all the way around. ✅

---

---

## Issue #004 — Emoji in YAML Broke the Game on Launch

**Date:** 2026-02-22  
**Found by:** Briggsy ("it doesn't launch")  
**Status:** ✅ Fixed  
**Caused by:** Harry 🧙 (wizard moment)

### Problem
Game refused to launch immediately after disabling damage.

### Root Cause
Harry put a `⚠️` emoji in a YAML comment. YAML files are read with Windows cp1252 encoding by default, which cannot decode multi-byte unicode characters like emoji.

```
UnicodeDecodeError: 'charmap' codec can't decode byte 0x8f in position 2080
```

### Fix
Removed the emoji. Used plain ASCII instead.

### Lesson
**No emoji in config files.** Ever. Stick to plain ASCII in YAML comments.

---

---

## Issue #005 — watch.py Froze Because Step Loop Starved Arcade's Event Queue

**Date found:** 2026-02-22
**Date fixed:** 2026-02-23
**Found by:** Briggsy (first watch session)
**Fixed by:** Fix agent (Issue #005)
**Status:** Fixed

### Problem
Running `python ai/watch.py` opened a window that immediately froze (Not Responding).
The AI was stepping, but the window never updated.

### Root Cause — Architecture Inversion
`watch.py` used a blocking `while True` loop:
```python
while True:
    action, _ = model.predict(obs)
    obs, reward, terminated, truncated, info = env.step(action)
    env.render()
```

`env.render()` tried to pump Arcade's event queue manually via `window.dispatch_pending_events()` and `window.flip()`. This never works — Arcade requires **it** to own the main loop via `arcade.run()`. Calling `dispatch_pending_events()` from inside a blocking while-loop doesn't give the OS event queue enough time to breathe, so the window shows "Not Responding" immediately.

Additionally, `racing_env.__init__` was creating an `arcade.Window` when `render_mode="human"`, which conflicted with the architecture.

### Fix — Flip the Architecture

**`ai/watch.py`** — Complete rewrite:
- Created `WatchWindow(arcade.Window)` with `on_update()` and `on_draw()`
- `on_update()` calls `model.predict()` and `env.step()` — inside Arcade's event loop
- `on_draw()` renders track, car, rays, breadcrumbs, HUD, action bars, episode info
- `arcade.run()` at the bottom hands control to Arcade — no more blocking while-loop
- Env is now created with `render_mode='rgb_array'` (WatchWindow handles the display)
- Drawing logic adapted directly from `ai/watch_renderer.py` (WatchView)

**`ai/racing_env.py`** — Cleaned up:
- Removed `arcade.Window` creation from `__init__` (was under `render_mode="human"`)
- Removed `dispatch_pending_events()` / `flip()` from `render()`
- `render()` is now always a no-op (returns `None`)
- `reset()` no longer calls `watch_view.handle_reset()`
- `close()` simplified (no window to close)

### Key Insight
The fix is a pure architecture flip:

| Before | After |
|--------|-------|
| `while True: env.step(); env.render()` | `arcade.run()` → calls `on_update()` each frame |
| `env.render()` manually pumps events | Arcade pumps its own events natively |
| `RacingEnv` creates the window | `WatchWindow` creates the window |
| `render_mode="human"` | `render_mode="rgb_array"` (env is headless) |

### Result
- Window opens immediately, stays fully responsive
- AI car drives autonomously on the track
- Episode resets work correctly
- Ray visualization, breadcrumbs, action bars, episode info all render correctly
- ESC key closes the window cleanly

---

---

## Issue #006 — AI Car Spawns on Start/Finish Line, Gets False Lap Credit

**Date found:** 2026-02-23
**Found by:** Briggsy (watch mode observation)
**Fixed by:** Fix agent (Issue #006)
**Status:** Fixed

### Problem
Two related bugs in the AI watch/training environment:

1. **Car spawns straddling the start/finish line.** The spawn point was at `centerline[0]` = `(400, 400)`, which is also the position of training checkpoint 0. The car would immediately collect the first breadcrumb at spawn, getting free reward for doing nothing.

2. **False lap credit at spawn.** With no grace period and no direction check, the car could collect checkpoints while stationary or moving in reverse. This distorted the reward signal during training and made watch mode show spurious lap completions.

### Root Cause
Three missing safeguards in `ai/racing_env.py`:

- **Spawn position overlapped checkpoint 0.** `track.get_spawn_position()` returned `centerline[0]`, which is exactly where the first training breadcrumb was placed. Distance = 0, well within the 40px collection radius.

- **No grace period after reset.** Checkpoint collection was active from step 1, so any breadcrumb within radius of spawn was instantly collected before the car even moved.

- **No forward-velocity check.** Checkpoints could be collected while in reverse or stationary, allowing the car to game the system by oscillating near checkpoints.

### Fix (3 layers of protection)

**Layer 1 — Move spawn forward (`configs/default.yaml` + `game/track.py`):**
- Added `spawn_forward_offset: 200` to track config.
- `get_spawn_position()` now offsets from `centerline[0]` by 200px along the track direction (toward `centerline[1]`).
- Car now spawns at approximately `(600, 400)` instead of `(400, 400)` — well clear of checkpoint 0.

**Layer 2 — Grace period (`ai/racing_env.py`):**
- Added `_steps_since_reset` counter, reset to 0 in `reset()`.
- All checkpoint/lap logic is skipped while `_steps_since_reset < spawn_grace_steps` (default: 30 steps = 0.5 seconds).
- Config key: `ai.spawn_grace_steps: 30`.

**Layer 3 — Forward-velocity requirement (`ai/racing_env.py`):**
- Checkpoints are only collected when `car.speed > min_checkpoint_speed` (default: 5.0 px/s).
- Prevents reverse-crossing credit and stationary checkpoint farming.
- Config key: `ai.min_checkpoint_speed: 5.0`.

**Bonus — Correct starting checkpoint index:**
- `reset()` now calls `_find_first_checkpoint_ahead()` which iterates training checkpoints and finds the first one whose position is forward of the spawn point (positive dot product with facing direction).
- Prevents the car from needing to loop backward to collect checkpoint 0 before making forward progress.

### Files Changed
| File | Change |
|------|--------|
| `configs/default.yaml` | Added `spawn_forward_offset`, `spawn_grace_steps`, `min_checkpoint_speed` |
| `game/track.py` | Added `spawn_forward_offset` field, modified `get_spawn_position()` |
| `ai/racing_env.py` | Added grace period, forward-speed check, `_find_first_checkpoint_ahead()` |

### Impact on Human Mode
None. The renderer.py checkpoint system (line-crossing with two-stage finish-line protection from Issue #003) is completely independent. The spawn offset actually improves human mode too — the car no longer starts right at the corner junction between the approach segment and the straight.

---

---

## Issue #007 — Reward Tuning (Phase 2 Training)

**Date:** 2026-02-23
**Requested by:** Briggsy
**Status:** ✅ Applied

### Problem
Phase 2 training reward signal needed rebalancing. Breadcrumb reward was too weak relative to penalties, wall hits weren't punished enough, zigzag spacing was too loose in tight corners, and the stuck timer was too generous.

### Changes (`configs/default.yaml`)

| Setting | Before | After | Reasoning |
|---|---|---|---|
| `training_checkpoint_reward` | `3.0` | `5.0` | Stronger breadcrumb signal — makes forward progress the dominant reward |
| `wall_damage_penalty_scale` | `0.5` | `2.0` | 4x harsher wall penalty — teaches the agent to avoid walls earlier |
| `zigzag_spacing_multiplier` | `0.7` | `0.5` | Denser breadcrumbs in tight curves — better guidance through hairpins and S-curves |
| `stuck_timeout` | `3.0` | `2.0` | Faster stuck detection — agent gets terminated sooner when stalled |

### Impact
- Breadcrumb reward per lap: ~150 → ~250 (at ~50 checkpoints)
- Wall hit penalty for a 300 px/s impact: -10 → -40 (4x increase)
- More training checkpoints packed into high-curvature sections
- Stuck episodes end 1 second sooner, reducing wasted training steps

---

---

---

## Issue #008 — Reward Exploitation & Entropy Collapse (v3 Training)

**Date:** 2026-02-23
**Found by:** Briggsy (TensorBoard analysis + watch mode observation)
**Status:** Fixed

### Problem
Three issues discovered after richard_petty_v3 (5M step) training run:

1. **Reward exploit observed:** The AI found a hack — it drives to the first curve, hits the wall, reverses onto a breadcrumb dot, and oscillates back and forth. This appeared to give free reward without forward progress.

2. **Wall damage too lethal:** `wall_damage_penalty_scale: 2.0` (set in Issue #007) caused episodes to end so quickly from wall hits that the agent couldn't learn from mistakes. It died before getting useful gradient signal.

3. **Entropy collapse:** Policy entropy dropped to near-zero by ~50% through training. The agent stopped exploring and got stuck in a local minimum (the oscillation exploit). With no entropy bonus, PPO had no incentive to maintain action diversity.

### Investigation — Breadcrumb System

Audited the breadcrumb collection system in `ai/racing_env.py`. The system uses a sequential `_next_checkpoint_idx` that only advances forward — checkpoint N must be collected before N+1 becomes available. This means:

- The SAME breadcrumb cannot be collected twice in one lap (sequential index prevents it)
- Reverse collection is blocked (`car.speed > min_checkpoint_speed`, speed is signed negative in reverse)
- Grace period blocks collection for 30 steps after spawn

**Verdict:** The one-time-per-lap mechanism is correctly implemented. The observed "oscillation" exploit was likely the agent farming speed reward + smooth steering bonus by oscillating near a wall, not actually re-collecting breadcrumbs. The sequential index makes breadcrumb re-collection impossible without a full lap.

### Fixes Applied

| File | Change | Reasoning |
|------|--------|-----------|
| `configs/default.yaml` | `wall_damage_penalty_scale`: 2.0 -> 0.8 | Punishing but survivable — gives agent time to learn from wall hits instead of dying instantly |
| `configs/default.yaml` | Added `ent_coef: 0.01` | Entropy bonus keeps exploration alive longer, prevents premature convergence to exploit strategies |
| `ai/train.py` | Pass `ent_coef` from config to PPO constructor | Wires the new config value into SB3's PPO |

### Expected Impact for v4 Training
- **Wall penalty:** A 300 px/s impact: penalty drops from -40 to -16. Agent survives ~3x more wall hits per episode.
- **Entropy:** 0.01 coefficient adds a small bonus for action randomness throughout training. Standard technique to prevent policy collapse in continuous action spaces.
- **Breadcrumbs:** Already correct — no change needed. The sequential index system ensures one-time collection per lap.

---

---

## Issue #009 -- Missing Training Observability (ep_rew_mean, episode stats, checkpoints)

**Date:** 2026-02-23
**Found by:** Briggsy (TensorBoard analysis of v1-v4 runs)
**Status:** Fixed

### Problem
Three observability gaps made it hard to understand training progress:

1. **`ep_rew_mean` never appeared in training output.** SB3's built-in episode reward/length stats were missing from both console output and TensorBoard. Without these, the only reward signal was the raw per-step values -- impossible to tell if the agent was actually improving episode-over-episode.

2. **No per-episode diagnostic stats.** When episodes ended, there was no record of how far the agent got (breadcrumbs collected), how much of the track it covered (major checkpoints), or how long it survived (step count). Debugging reward exploits and learning stalls required guessing from raw reward curves.

3. **No mid-training model snapshots.** Training ran for millions of steps before saving a single model. Couldn't run `watch.py` mid-training to visually inspect progress or catch problems early.

### Root Causes

1. **No Monitor wrapper.** SB3 requires each env to be wrapped in `stable_baselines3.common.monitor.Monitor` for episode-level stats (`ep_rew_mean`, `ep_len_mean`) to be tracked. The `make_env()` factory returned a bare `RacingEnv`.

2. **Info dict missing key fields.** `racing_env.py`'s `step()` info dict had reward breakdown and collision data, but no cumulative episode-level counters for breadcrumbs, track progress, or step count.

3. **No `CheckpointCallback`.** `model.learn()` was called with no callbacks at all -- no periodic saves, no custom logging.

### Fixes Applied

| File | Change | Purpose |
|------|--------|---------|
| `ai/train.py` | Wrapped `RacingEnv` in `Monitor()` inside `make_env()` | Enables `ep_rew_mean` and `ep_len_mean` in SB3 output |
| `ai/racing_env.py` | Added `_breadcrumbs_collected` counter, `breadcrumbs_collected`, `checkpoints_hit` (0-4 quarters), `step_count` to info dict | Episode-level diagnostics available to callbacks |
| `ai/train.py` | Added `EpisodeStatsCallback(BaseCallback)` logging per-episode and rolling-100 means to TensorBoard | `episode/breadcrumbs_collected`, `episode/checkpoints_hit`, `episode/survived_steps` + rolling means |
| `ai/train.py` | Added `CheckpointCallback(save_freq=500K // num_envs)` saving to `models/checkpoints/` | Mid-training snapshots for `watch.py` inspection |
| `ai/train.py` | Combined callbacks via `CallbackList`, passed to `model.learn()` | Both callbacks active during training |

### New TensorBoard Metrics
- `rollout/ep_rew_mean` -- mean episode reward (from Monitor)
- `rollout/ep_len_mean` -- mean episode length (from Monitor)
- `episode/breadcrumbs_collected` -- per-episode breadcrumb count
- `episode/checkpoints_hit` -- per-episode major checkpoint progress (0-4)
- `episode/survived_steps` -- per-episode step count
- `episode/mean_breadcrumbs_100` -- rolling 100-episode mean
- `episode/mean_checkpoints_100` -- rolling 100-episode mean
- `episode/mean_steps_100` -- rolling 100-episode mean

### Impact
Training output now shows episode-level stats in real-time. TensorBoard has full diagnostic curves. Model snapshots every 500K steps allow `watch.py` to inspect the agent mid-training without waiting for the full run to complete.

---

---

## Issue #010 -- Speed Reward Enables Wall-Hugging Exploit (v5 Training)

**Date:** 2026-02-23
**Found by:** Briggsy (TensorBoard analysis of v5 run at 3.16M steps)
**Fixed by:** Fix agent (Issue #010)
**Status:** Fixed

### Problem
In v5, the speed reward was computed as:
```
reward += 0.12 * (speed / max_speed)
```
This rewarded the car for going fast regardless of direction. The AI learned to:
1. Grab a few early breadcrumbs
2. Crash into a wall
3. Hold the gas forever (wheels spinning = speed > 0 = free reward every step)

**TensorBoard evidence:**
- `ep_len_mean` hit 6000 (max episode timeout) every episode -- the car never died, never got stuck
- `ep_checkpoints_hit` never exceeded ~0.03 -- the car wasn't making forward progress
- The agent found a stable local minimum: wall-pinned + gas = infinite speed reward with no risk

### Root Cause
The speed reward is direction-agnostic. `abs(car.speed)` is positive whenever the wheels are spinning, even if the car is pinned against a wall making zero forward progress. The time penalty (-0.01/step) was far too small to offset the speed reward (+0.12 * speed_fraction per step), so the agent was net-positive just by holding the gas.

### Fix -- Replace Speed Reward with Centerline Forward Progress

**Concept:** Instead of rewarding raw speed, reward movement along the track centerline. Project the car's position onto the centerline each step, compute the delta, and reward forward progress while penalizing backward movement.

**Implementation:**

| File | Change |
|------|--------|
| `game/track.py` | Added `get_track_progress(x, y) -> float` -- projects a world position onto the centerline and returns a fractional index [0, N) representing how far along the track the car is |
| `ai/rewards.py` | Added `forward_progress` field to `StepInfo`. Added forward progress reward component: positive delta * `forward_progress_reward_scale`, negative delta * `backward_progress_penalty_scale`. Updated `get_reward_range()` |
| `ai/racing_env.py` | Added `_track_progress` tracking. Each step computes new progress, delta (with wraparound handling for the start/finish seam), and passes it to `StepInfo` |
| `configs/default.yaml` | Added `forward_progress_reward_scale: 2.0`, `backward_progress_penalty_scale: 0.5`. Set `speed_reward_scale: 0.0` to disable the exploitable speed reward |

**Why this kills the exploit:**
- A car pinned against a wall with wheels spinning has speed > 0 but makes zero centerline progress. Forward progress reward = 0.
- A car driving backward gets negative progress reward.
- Only actual forward movement along the track generates reward.

**Wraparound handling:** When the car crosses the start/finish seam (progress goes from ~23.8 to ~0.3), the raw delta would be -23.5. The code detects jumps larger than half the track (12 points) and adds/subtracts the full track length to get the correct small forward delta (+0.5).

**Config values:**
```yaml
forward_progress_reward_scale: 2.0    # ~48 reward per lap at cruising speed
backward_progress_penalty_scale: 0.5  # Small penalty for going the wrong way
speed_reward_scale: 0.0               # Disabled -- was the exploit vector
```

### Expected Impact
- Wall-hugging is no longer rewarded (zero centerline progress = zero reward)
- Forward driving is directly incentivized
- Breadcrumbs remain the primary learning signal (~250/lap); forward progress provides continuous shaping (~48/lap)
- Combined with existing entropy coefficient (0.01), the agent should explore forward driving strategies

---

## Issue #012 - Breadcrumb Chain Locks on Miss

**Status:** Fixed (v7)
**Priority:** Low (v7 candidate)
**Reported:** 2026-02-23
**Fixed:** 2026-02-23

### Description
Breadcrumbs are collected sequentially via a single `_next_checkpoint_idx` pointer. The car can only earn reward from the currently illuminated (active) breadcrumb. If the car drives past the active breadcrumb without collecting it, the index never advances -- that breadcrumb stays lit and no subsequent ones illuminate for the rest of the episode.

### Observed Behavior
- `mean_breadcrumbs_100` is stuck around 5/ep -- car collects a few near spawn then gets locked out of the rest of the chain
- Missed breadcrumb stays visually illuminated; nothing further lights up
- Car would need to backtrack to collect missed breadcrumb, which it never learns to do

### Root Cause
In `ai/racing_env.py`, only `self._training_checkpoints[self._next_checkpoint_idx]` is checked each step. A missed breadcrumb permanently blocks the chain until lap reset.

### Fix (v7)
Added breadcrumb auto-advance in `ai/racing_env.py`. After the normal checkpoint collection check, if the breadcrumb was NOT collected, the code computes the car's track progress and the breadcrumb's track progress. If the car is more than 1.5 breadcrumb-spacings ahead of the current target (configurable via `breadcrumb_auto_advance_multiplier`), the index auto-advances. Uses the same wraparound-safe forward-delta logic as the progress reward.

The car does NOT get reward for auto-advanced breadcrumbs -- only collected ones earn reward. This purely prevents the chain from locking and ensures the "next target" indicator always stays ahead of the car.

### Files Changed
- `ai/racing_env.py` -- auto-advance logic after checkpoint collection block
- `configs/default.yaml` -- added `breadcrumb_auto_advance_multiplier: 1.5`

---

## Issue #013 - Wall Damage Too Forgiving

**Status:** Fixed (v7)
**Priority:** Low (v7 candidate)
**Requested:** 2026-02-23
**Fixed:** 2026-02-23

### Description
`wall_damage_penalty_scale` is currently 0.8. Car survives full 6,000-step episodes every time, suggesting wall scraping has little consequence. This may allow the car to learn a strategy that tolerates wall contact instead of learning clean track driving.

### Observed Behavior (v6, ~32% trained)
- `ep_len_mean` is 6,000 every episode -- car never dies
- `mean_checkpoints_100` = 0 -- car not reaching first checkpoint
- Wall contact appears unpunished enough to be a viable "strategy"

### History
- v2/v3: `wall_damage_penalty_scale: 2.0` -- too lethal, episodes ended too fast for learning
- v4/v5/v6: `wall_damage_penalty_scale: 0.8` -- fixed instant death, but may be too forgiving now

### Fix (v7)
Increased `wall_damage_penalty_scale` from 0.8 to 1.2 in `configs/default.yaml`. A 300 px/s impact now produces penalty = (300-100)*0.1*1.2 = -24 (was -16). Combined with breadcrumb auto-advance (Issue #012) and the new lateral displacement penalty, the car should learn to stay away from walls rather than ride them.

### Files Changed
- `configs/default.yaml` -- `wall_damage_penalty_scale: 0.8` -> `1.2`

---

## Issue #014 - Lateral Displacement Penalty (v7 Feature)

**Status:** Implemented
**Priority:** Medium
**Added:** 2026-02-23

### Description
New reward component for v7. Penalizes the car for being far from the track centerline laterally. Works in conjunction with the forward progress reward -- forward progress rewards moving ALONG the centerline, lateral displacement penalizes being FAR FROM the centerline. Together they push the car toward clean center-track racing lines.

### Implementation
- `game/track.py` -- added `get_lateral_displacement(x, y) -> float`, returns perpendicular distance in pixels from the car to the nearest centerline segment
- `ai/rewards.py` -- added `lateral_displacement` field to `StepInfo`, new `lateral_penalty` reward component: `-(distance * lateral_displacement_penalty_scale)`
- `ai/racing_env.py` -- computes lateral displacement each step, passes to StepInfo
- `configs/default.yaml` -- added `lateral_displacement_penalty_scale: 0.005`

### Design Notes
Scale is deliberately small (0.005). At the track edge (~60px from centerline), penalty = -0.3 per step. Over 1000 steps of wall-riding, that's -300 total. Combined with the wall damage penalty and the lack of forward progress reward, wall-riding should become strongly net-negative. At the centerline (0px displacement), penalty = 0 -- clean racing is free.

---

## Issue #014 - Missing Forward Ray (20-Degree Blind Spot)

**Status:** Fixed (v8)
**Priority:** Low (v8 candidate)
**Reported:** 2026-02-23
**Fixed:** 2026-02-23

### Description
The observation ray fan has a 20-degree blind spot directly ahead of the car. Ray angles are:
`-120, -100, -75, -50, -30, -10, +10, +30, +50, +75, +100, +120`

There is no 0-degree (straight ahead) ray. The closest rays are at -10 and +10 degrees. When driving directly toward a wall, neither ray measures the true perpendicular distance -- they measure the slightly-longer diagonal distance at ±10 degrees (`d / cos(10°) ≈ 1.5% overestimate`). This is a minor but real observability gap.

### Impact
Low. The 1.5% distance overestimate is unlikely to cause significant behavior changes. However, a direct forward ray would give the agent cleaner "wall ahead" signal and is trivially easy to add.

### Fix (v8)
Added `0.0` to `RAY_ANGLES_DEG` in `ai/observations.py`. Observation space changed from (17,) to (18,). Updated `NUM_RAYS` (12 -> 13), `OBS_SIZE` (17 -> 18), all docstrings, and hardcoded indices in `build_observation()` to use `NUM_RAYS`-relative offsets. Also updated `racing_env.py` docstrings. Breaks backward compatibility with v1-v7 models (different obs space shape) -- v8 is a fresh training run.

### Files Changed
- `ai/observations.py` -- added 0-degree ray, updated NUM_RAYS/OBS_SIZE/docstrings/indices
- `ai/racing_env.py` -- updated obs size in docstrings
- `configs/default.yaml` -- updated `num_rays: 13`

---

## Issue #016 - No Reward Signal Linking Curvature to Speed (v10 Fix)

**Status:** Fixed (v10)
**Priority:** High (v10 target)
**Reported:** 2026-02-23
**Fixed:** 2026-02-23

### Observed Behavior (v9, killed at 29%)
The car has curvature lookahead in its observation space (v9 fix) but never learned to USE it. It still flies into corners at full speed and crashes. After reversing from the wall, the 2-second stuck timeout terminates the episode before the car can recover.

### Root Cause
Two problems:
1. **No reward signal linking curvature to speed.** The curvature obs values are in the observation space, but the reward function never penalizes "high speed + high curvature." The agent has the information but no incentive to act on it. The neural network can't learn an association between obs inputs and optimal behavior without a corresponding reward signal.
2. **Stuck timeout too short.** At 2.0 seconds, the car reverses from a wall, has about 2 seconds to do something, then the episode terminates. Not enough time to reverse, turn, and re-approach the corner.

### Fix (v10) -- Two changes

**Fix 1 -- Corner speed penalty (new reward component):**
Added a penalty that scales with both speed and upcoming curvature:
```
curvature_1 = track.get_curvature_lookahead(track_progress, 1)[0]
curvature_deviation = abs(curvature_1 - 0.5) * 2.0   # 0=straight, 1=sharpest
speed_fraction = abs(car.speed) / max_speed
penalty = -corner_speed_penalty_scale * speed_fraction * curvature_deviation
```
- Zero on straight sections (curvature_deviation = 0)
- Small on mild curves at low speed
- Large on sharp corners at high speed
- Forces the agent to learn "high curvature ahead = slow down"

**Fix 2 -- Stuck timeout doubled:**
`stuck_timeout`: 2.0 -> 4.0 seconds. Gives the car more time to recover after hitting a wall before the episode terminates.

### Files Changed
- `ai/racing_env.py` -- computes curvature_deviation from lookahead, passes to StepInfo
- `ai/rewards.py` -- new `corner_speed_penalty` component in compute_reward(), updated StepInfo and get_reward_range()
- `configs/default.yaml` -- added `corner_speed_penalty_scale: 0.05`, changed `stuck_timeout: 4.0`

---

---

## Issue #015 - Car Blind to Upcoming Corners (v9 Candidate)

**Status:** Fixed (v9)
**Priority:** High (v9 target)
**Reported:** 2026-02-23
**Fixed:** 2026-02-23

### Observed Behavior (v8, 1.5M step checkpoint)
Car drives forward well, collecting breadcrumbs, then reaches the first zigzag corner:
1. Hits corner wall (minor damage)
2. Reverses briefly (learned escape behavior)
3. Stops completely
4. Stuck timeout terminates episode

Car never learned to slow down, steer through, or recover because it has zero advance warning of corners. It flies in at full speed every time.

### Root Cause
The observation space has no track curvature information. The car cannot "see" how sharp an upcoming turn is. It only sees:
- 13 wall distance rays (reactive, not predictive)
- Speed, angular velocity, drift, health (car state)
- Angle to next breadcrumb (direction, not path shape)

By the time the wall rays show a sharp corner, the car is already too close to react.

### Fix (v9)
Added 3 track curvature lookahead values to the observation space:
- `curvature_1` (index 18): turn angle at 1 centerline point ahead (normalized, 0=sharp left, 0.5=straight, 1=sharp right)
- `curvature_2` (index 19): turn angle at 2 centerline points ahead
- `curvature_3` (index 20): turn angle at 3 centerline points ahead

Uses the car's current `track_progress` (fractional centerline index) to look up upcoming centerline vertices. At each vertex, computes the cross product of incoming and outgoing tangent vectors to get signed curvature, then normalizes to [0, 1].

**Obs space:** (18,) -> (21,) -- backward incompatible with v1-v8 models (v9 is a fresh training run).

### Files Changed
- `game/track.py` -- added `get_curvature_at_index()` and `get_curvature_lookahead()` methods
- `ai/observations.py` -- added `NUM_CURVATURE_LOOKAHEAD`, updated `NUM_STATE_VALUES` (5->8), `OBS_SIZE` (18->21), updated `build_observation()` signature and body, updated all docstrings
- `ai/racing_env.py` -- passes `track` and `track_progress` to `build_observation()` in both `reset()` and `step()`, updated docstrings
- `configs/default.yaml` -- added `curvature_lookahead_steps: 3`

---

*Maintained by Harry -- if it broke and got fixed, it lives here*
