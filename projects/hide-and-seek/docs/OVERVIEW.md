# Hide and Seek — Project Overview

## The Idea

You're alone in a dark mansion. An AI is hunting you. You can hear its footsteps getting closer. Your only tools: a 6-tile circle of light, a sonar ping that briefly reveals the seeker's position, and doors you can slam shut to break line of sight. Survive two minutes and you win. Get found and it's over.

That was the pitch. A tension game where what you CAN'T see matters more than what you can.

## How We Built It

This was a fully autonomous build — every line of code, every asset, every commit produced by AI agents. Briggsy directed, Claude flew the plane. We started with a [brainstorm](ideation/2026-03-29-hide-and-seek-brainstorm.md) that locked the core design, then broke it into 10 phases:

| Phase | What it added |
|-------|--------------|
| 0 | Scaffolding — Vite, TypeScript, Phaser config |
| 1 | Map + movement — Tiled JSON, WASD, camera follow |
| 2 | Seeker AI — A* pathfinding, shadowcasting FOV, vision cone detection |
| 3 | Fog of war + game flow — scenes, HUD, round lifecycle, countdown → hunt → found/survived |
| 4 | Doors + minimap — interactive doors, sonar ping minimap |
| 5a | Seeker difficulty — Easy/Medium/Hard FSM (patrol → suspicious → search → chase) |
| 5b | AI hider + spectator — god-view mode with visible vision cones |
| 6a | Audio — footsteps, door sounds, heartbeat proximity, ambient drone |
| 6b | Scoring + stats — round results, localStorage persistence |
| 7 | Art pipeline — Imagen 4 generation, chroma-key, palette enforcement, atlas packing (partial) |

Each phase had a detailed plan created with multi-agent research, then executed and reviewed. Plans live in [`docs/plans/`](plans/).

## What We Actually Built

The engine is solid. 336 tests across 32 files, strict TypeScript, clean architecture boundary between game logic and renderer (enforced by integration tests). The AI pathfinds, tracks evidence, escalates through behavioral states. The fog system works. The audio layers — footsteps, heartbeat, ambient — all react to game state. There's a full Imagen 4 art pipeline that generates, processes, and packs 75 assets.

The technical foundation is real.

## Where It Fell Short

The game isn't fun. When we played it, it was obvious:

- **The map is a shoebox.** 40x30 tiles, 3 rooms. You cross it in seconds. There's no maze to get lost in, no labyrinth to create dread.
- **The characters are blobs.** AI-generated 32x32 sprites don't have enough resolution for personality. They look like colored smudges at game zoom.
- **You can't hide.** The game is called Hide and Seek, but there are no hiding spots — no beds to crawl under, no closets to squeeze into, no furniture to duck behind. All you can do is run.
- **The map is static.** Same mansion every time. No procedural generation means no replayability and no surprise.

The engineering was done right. The game design wasn't ambitious enough.

## What It Would Need

To be worth showing to someone:

1. **Procedural mansion generation** — bigger maps, dozens of rooms, hallways, dead ends. Every round a new layout.
2. **Hiding as a mechanic** — interact with furniture to hide. The seeker checks hiding spots. Heart-in-throat moments when the seeker walks past the bed you're under.
3. **Art direction** — either higher resolution or hand-crafted pixel art with a cohesive style. The current AI blobs don't cut it.
4. **Sound as the primary weapon** — your footstep volume scales with speed. Running is loud. Walking is quiet. Standing still is silent. The seeker LISTENS.

The engine, the AI, the audio, the pipeline — all that stays. The game design is what needs rethinking.

## Key References

- [Original Brainstorm](ideation/2026-03-29-hide-and-seek-brainstorm.md) — the vision and all design decisions
- [Vision Model Spec](design/vision-model-spec.md) — the 4-tier flashlight tag vision system
- [Art Style Guide](art-style-guide.md) — palette, sprite conventions, Imagen 4 prompting
- [Insights](insights/) — 11 hard-won root-cause analyses from the build
- [Phase Plans](plans/) — detailed implementation plans for each phase
