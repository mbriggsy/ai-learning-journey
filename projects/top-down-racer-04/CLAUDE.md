# Top-Down Racer v04

## Project Overview
A top-down racing game built using Compound Engineering methodology.
Comparison project vs racer-02 (built with GSD).

## Methodology
This project uses Compound Engineering (Plan → Work → Review → Compound) with:
- Context7 — library/framework documentation
- Serena — semantic code understanding
- Sequential Thinking — structured reasoning

NO GSD. This is a clean CE comparison build.

## Stack
- TypeScript + PixiJS v8 (WebGL)
- Vite + Vitest
- pnpm
- Python (Stable Baselines3, PPO) for AI training

## Architecture Rules
- Engine (src/engine/) is headless — zero PixiJS imports
- Renderer reads engine state, never mutates it
- AI trains against headless engine via WebSocket bridge
- Clean boundary between engine and renderer is SACRED

## Reference
- racer-02 (GSD build): C:\Users\brigg\ai-learning-journey\projects\top-down-racer-02
- CE methodology: research/compound engineering/
