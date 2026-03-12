# Top-Down Racer v04

## Project Overview
A visual upgrade + track evolution of v02, built using Compound Engineering methodology.
Methodology comparison: CE (v04) vs GSD (v02) â€” same game, different approach.

**Full spec:** `docs/Top-Down-Racer-v04-CE-Spec.md` â€” read it before planning anything.

## Methodology
Compound Engineering (CE) â€” Plan â†’ Work â†’ Review â†’ Compound
- Context7 â€” live framework docs
- Serena â€” semantic code understanding
- Sequential Thinking â€” structured reasoning

**NO GSD. This is a clean CE build.**

## Stack
- TypeScript + PixiJS v8 (WebGL)
- Vite + Vitest
- pnpm
- Python 3.12 (Stable Baselines3, PPO) for AI training

## Game Scope
- **3 tracks**: Oval (frozen from v02), Speedway (redesigned), Gauntlet (redesigned)
- **3 game modes**: Single Player, vs AI, Spectator
- Lap timing + checkpoint system
- PPO-trained AI opponent â€” retrained on v04 tracks, v02 model retired

## Architecture Rules (Non-Negotiable)
- Engine (`src/engine/`) is FROZEN â€” 366+ tests, zero modifications
- Engine/renderer boundary is SACRED â€” zero cross-layer imports
- Renderer reads engine state, never mutates it
- AI trains against headless engine
- HUD lives OUTSIDE the post-processing filter container (always sharp)

## Asset Generation (Phase 0 â€” Fully Autonomous)
Assets are generated via **Gemini Imagen 4 API** â€” no human art tools, no manual steps.
- Script: `scripts/generate-assets.ts`
- Prompts: `scripts/asset-prompts.ts` (versioned in git)
- API key: `.env` â†’ `GEMINI_API_KEY` (gitignored)
- Run: `pnpm run generate-assets`
- Output: `assets/raw/` â†’ processed to `public/assets/`

Do NOT use Nano Banana, Ludo.ai, or any browser-based art tool. Gemini API only.

## Reference
- v02 (GSD build, FROZEN): `C:\Users\brigg\ai-learning-journey\projects\top-down-racer-02`
- Full spec + ADRs: `docs/Top-Down-Racer-v04-CE-Spec.md`
