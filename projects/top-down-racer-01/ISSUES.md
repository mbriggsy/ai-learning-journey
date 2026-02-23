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

## Issue #005 — watch.py Has No Game Window (render() is a Placeholder)

**Date:** 2026-02-22  
**Found by:** Briggsy (first watch session)  
**Status:** ⏳ Open — needs agent team fix

### Problem
Running `python ai/watch.py` loads the model, runs episodes, and prints reward scores — but **no game window appears**. The AI is driving, you just can't see it.

### Root Cause
`RacingEnv.render()` in `ai/racing_env.py` is a stub with a TODO comment:

```python
def render(self) -> None:
    """Render the environment.

    Currently a placeholder. For headless training, render_mode is None...
    handles Arcade window rendering separately.
    """
    # TODO: Integrate with Arcade renderer for watch.py visualization.
```

The agent team built the RL training loop but left the human visualization unfinished.

### What Needs to Be Done

Implement `render_mode="human"` in `RacingEnv` so it opens an Arcade window and draws the car/track in real time during watch mode:

1. When `render_mode="human"` and `env.reset()` is called: initialize an Arcade window using the existing `RacerView` renderer from `game/renderer.py`
2. On each `env.render()` call: update the Arcade window with current car state, track, HUD
3. Handle window close event gracefully (raise `KeyboardInterrupt` or set `terminated=True`)

### Context
- `game/renderer.py` already has a working `RacerView` (arcade.View) that renders everything
- `game/car.py`, `game/track.py`, `game/physics.py` are rendering-agnostic
- The RL env drives the car via `car.apply_controls()` — the renderer just needs to visualize that state
- Watch mode: `python ai/watch.py` (auto-detects latest model in `models/`)

### Acceptance Criteria
- Running `python ai/watch.py` opens a visible game window
- The AI car drives autonomously on the track (even badly — it's only 500k steps)
- Ray visualization lines show what the AI "sees"
- Window can be closed normally

---

*Maintained by Harry 🧙 — if it broke and got fixed, it lives here*
