# Fix Spec: watch.py — Event Loop Conflict

**Issue:** #005  
**Priority:** High  
**Written by:** Harry 🧙

---

## Problem

Running `python ai/watch.py` opens a game window titled "Top-Down Racer 01 — AI Watch" but it immediately freezes ("Not Responding"). The AI IS running (episode rewards print to terminal) but the window is a gray frozen rectangle.

**Root cause:** Arcade wants to own the main loop via `arcade.run()`. The current watch.py runs a `while True: env.step()` loop on the main thread and calls `env.render()` after each step. This starves Arcade's event queue → freeze.

---

## The Fix: Flip the Loop

**Arcade must own the main thread.** The AI agent step must happen *inside* Arcade's update cycle.

### Architecture

Create a new `WatchView(arcade.View)` class that:

1. Holds the trained PPO model and RacingEnv
2. Calls `model.predict(obs)` inside `on_update(delta_time)`
3. Steps the env with `env.step(action)` inside `on_update()`
4. Draws everything in `on_draw()` using the existing `RacerView` rendering code
5. Resets on episode end and prints episode stats to console
6. Handles window close cleanly

### Pseudocode

```python
class WatchView(arcade.View):
    def __init__(self, model, env, render_options):
        super().__init__()
        self.model = model
        self.env = env
        self.obs, _ = env.reset()
        self.total_reward = 0.0
        self.episode = 1
        # reuse existing game rendering components:
        self.track = env.track
        self.car = env.car
        self.camera = SmoothCamera(...)
        self.hud = HUD(...)

    def on_update(self, delta_time):
        action, _ = self.model.predict(self.obs, deterministic=True)
        self.obs, reward, terminated, truncated, info = self.env.step(action)
        self.total_reward += reward
        self.camera.update(self.car.position, self.car.velocity)

        if terminated or truncated:
            print(f"Episode {self.episode} | reward={self.total_reward:+.1f} | laps={info.get('laps_completed', 0)}")
            self.obs, _ = self.env.reset()
            self.total_reward = 0.0
            self.episode += 1

    def on_draw(self):
        self.clear()
        self.camera.use()
        # draw track, car, ray lines (what the AI sees)
        self.track_shapes.draw()
        self.car.draw()
        if self.show_rays:
            draw_ray_lines(self.env.last_ray_distances, self.car)
        self.camera.use_gui()
        self.hud.draw(...)

def main():
    model = PPO.load("models/richard_petty_v1.zip")
    env = RacingEnv(config_path="configs/default.yaml")  # no render_mode needed
    window = arcade.Window(1280, 720, "Top-Down Racer 01 — AI Watch")
    view = WatchView(model, env)
    window.show_view(view)
    arcade.run()  # Arcade owns the loop
```

---

## Key Points

- **Do NOT use `render_mode="human"` on RacingEnv** — leave it headless. The WatchView handles all rendering directly using the game components.
- **Reuse existing rendering code** from `game/renderer.py`, `game/camera.py`, `game/hud.py` — don't rewrite it.
- **Ray visualization** — draw green/red lines from the car showing the AI's sensor rays. Ray distances are in the observation vector (see `ai/observations.py`).
- **Speed multiplier** — `on_update` runs at 60fps. For `--speed 2.0`, run 2 env steps per `on_update` call.
- **Keep the CLI args** (`--model`, `--speed`, `--no-rays`, `--no-breadcrumbs`)

---

## Files to Modify

| File | Change |
|------|--------|
| `ai/watch.py` | Rewrite main loop to use WatchView + arcade.run() |
| `ai/racing_env.py` | No changes needed — keep render() as stub |

---

## Acceptance Criteria

- [ ] `python ai/watch.py` opens a visible, responsive game window
- [ ] AI car drives autonomously (even badly — 500k steps is early)
- [ ] Green/red ray lines visible from car (showing AI sensor view)
- [ ] Episode stats still print to terminal on each reset
- [ ] Window closes cleanly with X button or Ctrl+C
- [ ] `--speed 2.0` runs noticeably faster
