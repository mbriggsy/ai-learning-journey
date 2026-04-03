You are fixing Issue #005 in this top-down racing game project: watch.py freezes because a Gymnasium step loop starves Arcade's event queue.

## The Problem
ai/watch.py currently uses a pattern like:
  while True:
      action, _ = model.predict(obs)
      obs, reward, terminated, truncated, info = env.step(action)
      env.render()

This conflicts with Arcade's event loop. The window opens but immediately freezes (Not Responding).

## The Fix: Flip the Architecture (Option 2)

Arcade must own the main loop via arcade.run(). The RL agent must call model.predict() + env.step() from INSIDE an on_update() method, not in a while loop.

### Key files to understand first:
- game/renderer.py -- has the working RacerView(arcade.View) class used for human play
- ai/racing_env.py -- the Gymnasium env; render() method has broken/placeholder window code
- ai/watch.py -- needs to be completely rewritten
- models/richard_petty_v1.zip -- the trained PPO model to load
- configs/default.yaml -- config values

### What to implement:

1. **ai/watch.py** -- Rewrite entirely:
   - Create a WatchWindow(arcade.Window) class
   - In __init__: load the SB3 model (PPO.load), instantiate RacingEnv with render_mode='rgb_array' (NOT 'human' -- Arcade handles display itself), call env.reset() to get initial obs
   - In on_update(delta_time): call model.predict(obs), env.step(action), update self.obs; handle episode resets when terminated or truncated is True
   - In on_draw(): render the current game state -- reuse the drawing logic from game/renderer.py as much as possible (track, car, HUD)
   - Use arcade.run() at the bottom to start the loop
   - The window must NOT freeze -- Arcade drives everything

2. **ai/racing_env.py** -- Fix the render() method:
   - Remove any code that tries to create its own arcade.Window or call arcade.run() inside render()
   - render_mode='human' should be a no-op (display is handled by WatchWindow)
   - render_mode='rgb_array' can return None or a placeholder array for now

3. Add a small text overlay in on_draw() showing: Episode #, Step count, current reward, total reward

4. Window title: 'AI Watch Mode - richard_petty_v1'

### Constraints:
- Python 3.12, Arcade 3.3.3, stable-baselines3 2.7.1
- .venv is at .venv\ -- use .venv\Scripts\python.exe
- All config from configs/default.yaml (no magic numbers)
- NO emoji in YAML files (encoding crash)
- Log this fix as Issue #005 resolution in ISSUES.md

### Acceptance criteria:
- Running .\.venv\Scripts\python.exe ai/watch.py opens a visible, non-frozen Arcade window
- The AI car drives around the track autonomously
- Window stays responsive (no Not Responding)
- Episode resets work correctly when terminated/truncated

When completely finished, run this command to notify:
openclaw system event --text "Done: watch.py fixed - Arcade owns the loop, AI drives in on_update" --mode now
