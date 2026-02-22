# Pac-Man

A faithful browser-based recreation of the classic Pac-Man arcade game, built entirely with vanilla JavaScript and HTML5 Canvas. No installation, no server, no dependencies — just open `index.html` in any modern browser and play. The game features all four original ghosts with their authentic AI behaviours, five progressively faster levels, power pellets, a consecutive ghost-eat scoring multiplier, and synthesised sound effects via the Web Audio API.

---

## How to Play

1. **Download or clone** the repository to your computer.
2. **Open `index.html`** directly in your browser — double-click the file or drag it into a browser window. No web server is required; the game runs fine from a `file://` URL.
3. **Press any arrow key or WASD** to start moving Pac-Man and begin the game.
4. **Eat all the dots** in the maze to complete a level. Clear all five levels to win.

> Works with Chrome, Firefox, Edge, and Safari (modern versions).

---

## Controls

| Key | Action |
|-----|--------|
| Arrow Keys | Move Pac-Man |
| W A S D | Move Pac-Man (alternate) |
| P / Escape | Pause / Unpause |
| Enter / Space | Restart (after Game Over or Win) |

Pac-Man remembers your last input — tap a direction just before a corner and he will turn as soon as the path opens.

---

## Scoring

| Item | Points |
|------|--------|
| Pellet (dot) | 10 |
| Power Pellet | 50 |
| Ghost (1st eaten) | 200 |
| Ghost (2nd consecutive) | 400 |
| Ghost (3rd consecutive) | 800 |
| Ghost (4th consecutive) | 1,600 |
| Extra Life bonus | at 10,000 pts |

**Consecutive ghost multiplier:** eating multiple ghosts during a single power pellet doubles the value each time (200 → 400 → 800 → 1,600). The multiplier resets to zero every time a new power pellet is eaten, so a fresh power pellet always starts the sequence again at 200.

**Extra life:** one bonus life is awarded automatically when your score reaches 10,000 points.

---

## The Ghosts

| Ghost | Color | Chase Strategy |
|-------|-------|----------------|
| Blinky (Red) | Red | Directly targets Pac-Man's current tile |
| Pinky (Pink) | Pink | Targets 4 tiles ahead of Pac-Man's current direction |
| Inky (Cyan) | Cyan | Complex: reflects Blinky's position through 2 tiles ahead of Pac-Man |
| Clyde (Orange) | Orange | Chases Pac-Man when more than 8 tiles away; retreats to his corner when close |

### Ghost Modes

- **Scatter mode** — Periodically, all ghosts abandon their chase and retreat to their assigned corner of the maze (Blinky: top-right, Pinky: top-left, Inky: bottom-right, Clyde: bottom-left). Scatter phases become shorter in higher levels.

- **Frightened mode** — Eating a Power Pellet turns all active ghosts blue. While blue, ghosts move slowly and randomly, and Pac-Man can eat them for bonus points. Ghosts flash white just before frightened mode expires, giving you a warning. Frightened duration decreases with each level (6 seconds on level 1, down to 2 seconds on level 5).

- **Dead mode** — After being eaten, a ghost is reduced to a pair of eyes that travel back to the ghost house at high speed. Once it re-enters the house it respawns and rejoins the game immediately.

---

## Levels

The game contains five levels (Level 1 through Level 5). Each level uses the same maze but increases the speed of both Pac-Man and the ghosts, and shortens the time ghosts spend frightened after a power pellet. Completing Level 5 — eating every dot on the board — triggers the **"YOU WIN!"** victory screen. Press **Enter** or **Space** to start a new game from Level 1.

| Level | Pac-Man speed | Ghost speed | Frightened duration |
|-------|--------------|-------------|---------------------|
| 1 | 80 px/s | 75 px/s | 6 s |
| 2 | 90 px/s | 85 px/s | 5 s |
| 3 | 90 px/s | 85 px/s | 4 s |
| 4 | 90 px/s | 85 px/s | 3 s |
| 5 | 100 px/s | 95 px/s | 2 s |

---

## Tips & Strategy

- **Scatter mode is your friend.** At the start of each level and after losing a life, ghosts briefly scatter to their corners. Use this time to safely eat dots and position yourself near a power pellet before they switch back to chase.

- **Time your power pellets.** Don't eat a power pellet the moment you see a ghost — wait until multiple ghosts are nearby so you can chain consecutive ghost-eats for maximum points (up to 1,600 for the fourth ghost).

- **Watch for the white flash.** Ghosts flash white for about two seconds before frightened mode ends. If you are still chasing a ghost when it starts flashing, back off immediately — it can turn dangerous at any moment.

- **Use the tunnel.** The side passages in the middle row slow ghosts down significantly. Pac-Man is not slowed, so ducking through the tunnel is a reliable way to lose a pursuer.

- **Corner trapping.** Blinky follows you directly, but Pinky and Inky aim ahead of you. Running straight at a corner can cause Pinky to overshoot, giving you room to double back.

---

## Technical Notes

- **Engine:** Pure HTML5 Canvas with vanilla JavaScript (ES6 classes). No external libraries or frameworks.
- **Audio:** Sound effects are generated procedurally using the Web Audio API (oscillator-based synthesis). If the browser does not support Web Audio, sound is silently disabled — the game still works normally.
- **Tile map:** 28 columns x 31 rows, matching the proportions of the original arcade layout.
- **Game loop:** `requestAnimationFrame`-driven with delta-time physics (capped at 1/15 s per frame to prevent spiral-of-death on slow machines).
- **Ghost AI:** Greedy tile-distance targeting with no-reverse constraints and tunnel speed penalties, faithfully reproducing original arcade behaviour.
- **Tested on:** Chrome, Firefox, Edge.

---

## File Structure

```
PacMan1/
  index.html    — Open this to play
  style.css     — Visual styles (centering, background)
  game.js       — All game logic (~1,500 lines)
  tests.html    — Open this to run unit tests
  tests.js      — Unit test suite
  README.md     — This file
```
