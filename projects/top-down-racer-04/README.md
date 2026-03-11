# Top-Down Racer v04

> *Commercial polish. Genuine AI. Zero hand-written game code.*

A top-down racing game built entirely with Compound Engineering methodology — autonomous asset generation via Gemini Imagen 3 API, post-processing shaders, commercial-grade UI, and an AI opponent that actually *generalizes* instead of memorizing a route.

## Why This Exists

racer-02 was a genuine technical achievement: autonomous SDLC, not a line of code written by a human, an AI that taught itself to race from zero. But the simple visuals undersell it. Someone who doesn't understand what happened looks at it and sees a rectangle driving in a circle.

**v04's job is to make the presentation match the achievement.**

When someone sees it for the first time, they should think *"that looks like a real game"* — before they even know the story.

Two goals, simultaneously:
1. **Commercial polish** — AI-generated sprites, post-processing bloom and motion blur, cinematic menus, commercial HUD
2. **Genuine AI generalization** — redesigned tracks that make memorization statistically impossible; the AI has to actually learn to drive

And yes — we're also trying out **Compound Engineering** instead of GSD. Same game, different methodology. Head-to-head comparison.

## What's New vs v02

| Layer | v02 | v04 |
|-------|-----|-----|
| Car sprites | Geometric shapes | AI-generated high-res top-down art (Gemini Imagen 3) |
| Track surfaces | Flat color fills | Tiled textures: asphalt, curbs, grass, rumble strips |
| Post-processing | Basic particles | Bloom, motion blur, heat shimmer, skid marks |
| Menu | Functional HTML | Cinematic, commercial feel |
| HUD | Text overlay | Speedometer, mini-map, lap counter |
| Tracks | 3 tracks | Track 1 frozen; Tracks 2 & 3 redesigned — bigger, no repeated corners |
| AI opponent | Memorized Track 3 | Retrained on new geometry — forced to generalize |
| Methodology | GSD | Compound Engineering |

## Game Modes

- **Single Player** — race against the clock
- **vs AI** — race the PPO-trained opponent
- **Spectator** — watch the AI race itself

## Stack

- TypeScript 5.x + PixiJS v8 (WebGL)
- Vite + Vitest
- pnpm
- Python 3.12 + Stable Baselines3 (PPO) for AI training
- ONNX export for browser inference
- **Gemini Imagen 3 API** — autonomous asset generation (no human art tools)

## Architecture Rules (sacred from v02)

- Engine (`src/engine/`) is **FROZEN** — 366+ tests, zero modifications
- Engine/renderer boundary is **SACRED** — zero cross-layer imports
- Renderer reads engine state, never mutates it
- AI trains against headless engine
- HUD lives outside the post-processing filter container (always sharp)

## Methodology

**Compound Engineering** — Plan → **Deepen** → Work → Review → Compound

| Step | What Happens |
|------|-------------|
| Plan | Define what needs to be built, break into phases |
| **Deepen Plan** ⭐ | **24-agent Strike Team stress-tests the plan before a line of code is written. Caught 169 bugs in v03. The step that earns its keep.** |
| Work | Build it with Context7 + Serena + Sequential Thinking |
| Review | Independent review of what was built |
| Compound | Capture learnings back into the system |

MCP Stack: **Context7** (framework docs) + **Serena** (semantic code nav) + **Sequential Thinking** (architectural reasoning)

NO GSD. This is a clean CE build.

## Docs

- Full spec + ADRs: `docs/Top-Down-Racer-v04-CE-Spec.md`
- Reference build (GSD): `C:\Users\brigg\ai-learning-journey\projects\top-down-racer-02`
- GitHub: [mbriggsy/ai-learning-journey](https://github.com/mbriggsy/ai-learning-journey)
