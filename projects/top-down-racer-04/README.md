# Top-Down Racer v04

> *Commercial polish. Genuine AI. Zero hand-written game code.*

A top-down racing game built entirely with Compound Engineering methodology — autonomous asset generation via Gemini Imagen 4 API, post-processing shaders, commercial-grade UI, and an AI opponent that actually *generalizes* instead of memorizing a route.

## Why This Exists

racer-02 was a genuine technical achievement: autonomous SDLC, not a line of code written by a human, an AI that taught itself to race from zero. But the simple visuals undersell it. Someone who doesn't understand what happened looks at it and sees a rectangle driving in a circle.

**v04's job is to make the presentation match the achievement.**

When someone sees it for the first time, they should think *"that looks like a real game"* — before they even know the story.

Two goals, simultaneously:
1. **Commercial polish** — AI-generated sprites, post-processing bloom and motion blur, cinematic menus, commercial HUD
2. **Genuine AI generalization** — redesigned tracks that make memorization statistically impossible; the AI has to actually learn to drive

And yes — we're also trying out **Compound Engineering** instead of GSD. Same game, different methodology. Head-to-head comparison.

## Quick Start

```bash
pnpm install
pnpm run build
pnpm run preview
```

Open http://localhost:4173 in your browser. For development with hot reload: `pnpm run dev`

## Controls

| Key | Action |
|-----|--------|
| Arrow keys / WASD | Steer, accelerate, brake |
| Escape | Pause |
| R | Restart race |
| Q | Quit to menu (from pause) |
| M | Toggle mute |
| F / F11 | Toggle fullscreen |

## What's New vs v02

| Layer | v02 | v04 |
|-------|-----|-----|
| Car sprites | Geometric shapes | AI-generated high-res top-down art (Gemini Imagen 4) |
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
- **Gemini Imagen 4 API** — autonomous asset generation (no human art tools)

## Architecture Rules (sacred from v02)

- Engine (`src/engine/`) is **FROZEN** — 487+ tests (366 engine + 121 AI/renderer/UI), zero engine modifications
- Engine/renderer boundary is **SACRED** — zero cross-layer imports
- Renderer reads engine state, never mutates it
- AI trains against headless engine
- HUD lives outside the post-processing filter container (always sharp)

## Methodology

**Compound Engineering** — Plan → **Deepen** → Work → Review → Compound

<table>
<tr><th width="180">Step</th><th>What Happens</th></tr>
<tr><td>Plan</td><td>Define what needs to be built, break into phases</td></tr>
<tr><td><strong>Deepen Plan ⭐</strong></td><td><strong>Strike Team agent swarm stress-tests the plan before a line of code is written. Proven to catch hundreds of bugs across previous projects. The step that earns its keep.</strong></td></tr>
<tr><td>Work</td><td>Build it with Context7 + Serena + Sequential Thinking</td></tr>
<tr><td>Review</td><td>Independent review of what was built</td></tr>
<tr><td>Compound</td><td>Capture learnings back into the system</td></tr>
</table>

MCP Stack: **Context7** (framework docs) + **Serena** (semantic code nav) + **Sequential Thinking** (architectural reasoning)

NO GSD. This is a clean CE build.

## Build Progress

| Phase | Status |
|-------|--------|
| Phase -1: Foundation | Done |
| Phase 0: Asset Generation (Imagen 4) | Done |
| Phase 1: Asset Pipeline + Track Redesign | Done |
| Phase 2: Core Visual Upgrade | Done |
| Phase 3: Post-Processing & Effects | Done |
| Phase 4: Commercial UI & Audio | Done |
| Phase 5: AI Retraining & Validation | Done |
| Phase 6: Integration & Polish | Done |

## Tests

```bash
pnpm test              # Unit + renderer tests (487 tests)
pnpm run test:build    # Build verification tests (13 tests)
```

## Docs

- Full spec + ADRs: `docs/Top-Down-Racer-v04-CE-Spec.md`
- Reference build (GSD): `../top-down-racer-02`
- GitHub: [mbriggsy/ai-learning-journey](https://github.com/mbriggsy/ai-learning-journey)
