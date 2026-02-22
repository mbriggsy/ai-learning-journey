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

*Maintained by Harry 🧙 — if it broke and got fixed, it lives here*
