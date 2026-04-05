You are fixing two related bugs in this top-down racing game's AI watch mode (ai/watch.py + ai/racing_env.py + game/track.py or wherever spawn/checkpoint logic lives).

## Bug 1: Car spawns straddling the start/finish line and gets stuck in a corner
The AI car spawns on or very near the start/finish line and immediately gets lap credit. The car also appears stuck in the corner near spawn.

## Bug 2: Car gets false lap credit from the start/finish line at spawn
The car should NOT get credit for crossing the start/finish line at the beginning of an episode or when resetting. It should only earn lap credit after completing a full circuit.

## Investigation first
Before making any changes, read these files carefully:
- configs/default.yaml -- find spawn position (x, y, angle)
- game/track.py -- understand where checkpoints and the start/finish line are defined
- ai/racing_env.py -- understand how reset() places the car and how lap/checkpoint logic works
- game/renderer.py -- understand the spawn-crossing protection that was added in Phase 1 (Issue #003 fix)

## What to fix

1. **Spawn position**: Move the car spawn point to be clearly AHEAD of the start/finish line along the track direction (not behind it or on top of it). The car should spawn far enough forward that it cannot accidentally cross the line at spawn. Update configs/default.yaml if spawn is configured there.

2. **False lap credit at spawn**: Ensure the checkpoint/lap detection ignores line crossings that happen within the first N steps of an episode (e.g., first 30 steps). Add a `steps_since_reset` counter in RacingEnv and skip checkpoint/lap logic while steps_since_reset < 30.

3. **Reverse crossing**: The car should not get lap credit for crossing the finish line in reverse (going backward through it). If there is directional detection, verify it works. If not, add a minimum forward-velocity threshold for lap credit (e.g., car velocity dot product with track direction must be positive).

4. **Log this as Issue #006 in ISSUES.md** with description, root cause, and fix.

## Constraints
- Python 3.12, Arcade 3.3.3
- All config values in configs/default.yaml (no magic numbers in code)
- NO emoji in YAML files
- Do not break human play mode (main.py must still work correctly)
- Test by reading the logic carefully -- do not try to launch the game window

When completely finished, run this command to notify:
openclaw system event --text "Done: spawn and false lap credit bugs fixed - Issue #006 logged" --mode now
