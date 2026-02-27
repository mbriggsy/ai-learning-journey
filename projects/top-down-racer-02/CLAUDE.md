# Top-Down Racer v02

## Project Overview
A top-down racing game built with TypeScript and PixiJS, followed by an AI training pipeline that teaches a neural network to drive the car better than any human player.

## Architecture
- **Simulation Engine** (`src/engine/`): Pure TypeScript logic — physics, collision, track geometry, car dynamics. Runs headless for AI training. Zero rendering code.
- **Renderer** (`src/renderer/`): PixiJS visual layer. Reads engine state, draws pixels. Never touches game logic.
- **AI Bridge** (`src/ai/`): Gymnasium-compatible wrapper. Python bridge via ZeroMQ/WebSocket.
- **ML** (Python, separate): stable-baselines3 + PyTorch for PPO/SAC training.

## Key Constraints
- Engine and renderer are strictly separated — engine has zero PixiJS imports
- All game logic is deterministic and tick-based (headless-first design)
- TypeScript strict mode always on

## Stack
- TypeScript 5.x + Vite + PixiJS v8 + Vitest
- Node 24.x, pnpm

## Project Path
`C:\Users\brigg\ai-learning-journey\projects\top-down-racer-02`
