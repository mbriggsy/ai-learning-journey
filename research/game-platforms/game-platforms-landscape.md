# Game Development Platforms — Landscape Overview

Where we've been, what's out there, and what to think about when picking the next proving ground.

---

## Platforms at a Glance

| Platform | Language | Strengths | Limitations | Install Required? |
|----------|----------|-----------|-------------|-------------------|
| **Web (React/TS/Vite)** | TypeScript | Zero-install for players, phones as controllers, fast iteration, multiplayer via WebSockets/PartyKit | Browser performance ceiling, no native GPU access, limited audio/physics | No |
| **Unity** | C# | Massive community, best docs/tutorials, strong 2D + 3D, builds to PC/mobile/console/web, visual editor | Editor-heavy workflow, asset store dependency culture, licensing changes spooked devs | Yes |
| **Godot** | GDScript / C# | Free + open source, lightweight, clean API, great 2D, growing fast, no licensing drama | Smaller community, 3D still maturing, fewer tutorials than Unity | Yes |
| **Unreal Engine** | C++ / Blueprints | AAA visuals, best-in-class 3D rendering, massive built-in systems, free until $1M revenue | Steep learning curve, C++ complexity, heavyweight editor, overkill for 2D/indie | Yes |
| **Pygame** | Python | Dead simple to start, pure code (no editor), great for learning fundamentals | No engine — you build everything yourself, performance ceiling, no built-in physics/UI | No |

---

## What We've Already Built

| Project | Platform | What It Proved |
|---------|----------|----------------|
| **Tic-Tac-Toe** | Web | First project. Basics. |
| **Pac-Man** | Web | Classic arcade remake. Movement, ghost AI, collision, scoring. |
| **Top-Down Racer v02/v04** | Pygame | Game loops, physics, AI opponents, test-driven development, full phase-based build workflow |
| **Hide & Seek** | Pygame | Top-down engine, pathfinding, AI state machines. Shelved — visuals were the bottleneck. |
| **Do Not Disturb** | Pygame | Side-scroller attempt. Proved presentation > systems. Shelved. |
| **Undercover Mob Boss** | Web (vanilla JS) | PartyKit networking, Gemini AI narration, audio/TTS pipeline, trailer production |
| **Exploding Kittens** | Web (React/TS) | In progress — multiplayer card game, AI opponents with personality, Jackbox-style architecture |

---

## Things to Think About

### The Web vs Engine Jump
The biggest decision point. Web gives you zero-friction distribution (send a link, anyone plays). Engines give you creative freedom (physics, 3D worlds, real-time action). Different games want different platforms.

**Web is best for:** card games, board games, party games, turn-based strategy, quiz/trivia, anything where phones-as-controllers matters.

**Engines are best for:** platformers, shooters, RPGs, physics puzzles, racing, anything with real-time movement and collision.

### Editor-Based vs Code-Only
Pygame and web development are code-only — you write everything. Unity/Godot/Unreal have visual editors where you drag objects, set properties in inspectors, and preview in real-time. The feedback loop is different: faster visual iteration, but the editor becomes a dependency. You can't just read the code to understand the project — you need the editor open.

### Claude's Blindspot with Engines
Claude can write scripts, configs, shaders, and architect systems — but can't interact with visual editors. For web projects, Claude can run builds, execute tests, and verify everything end-to-end. For engine projects, the workflow shifts: Claude writes the code, you handle the editor and visual verification. More ATC involvement required.

### Distribution
- **Web:** Send a URL. Done.
- **Godot/Unity:** Export to PC/Mac (executable), mobile (app store), or WebGL (browser, but with performance tradeoffs).
- **Unreal:** PC/console builds. WebGL export is limited.

### Learning Curve (from where you are now)
1. **Godot** — closest to "just code." GDScript reads like Python. Lightest editor. Fastest onboarding.
2. **Unity** — C# is clean, tons of tutorials, but the editor/inspector workflow takes getting used to.
3. **Unreal** — C++ is a different beast. Blueprints (visual scripting) help, but the engine is massive and opinionated.

### What Transfers from Exploding Kittens
Regardless of which platform comes next, EK is building transferable skills:
- **State machines** — every game engine uses them (AI, game flow, animation)
- **Networking/multiplayer** — same concepts whether it's PartyKit or Unity Netcode
- **Turn-based game logic** — rules engines, validation, win conditions
- **Animation systems** — timeline-based, event-driven animation thinking
- **AI opponents** — decision trees, personality systems, difficulty tuning

---

## No Decision Needed Yet

This doc is a map, not a plan. Finish Exploding Kittens, then revisit. The proving ground will tell us what kind of game wants to be built next, and that'll point at the right platform.
