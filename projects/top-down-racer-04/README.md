# Top-Down Racer v04

> *The GSD vs Compound Engineering comparison.*

A top-down racing game built entirely with Compound Engineering methodology — no GSD, no orchestrator. Pure CE + Context7 + Serena + Sequential Thinking.

## Why This Exists

racer-02 was built with GSD (Get Shit Done) in one day, 60+ atomic TDD commits, 6 phases, deployed to Vercel with a working AI opponent.

racer-04 answers the question: **what does CE produce on the same problem?**

Same game. Same architecture constraints. Different methodology. Comparable evidence.

## Methodology

**Compound Engineering** — Plan → Work → Review → Compound

| Step | What Happens |
|------|-------------|
| Plan | Define what needs to be built, break into phases |
| Work | Build it with Context7 + Serena + Sequential Thinking |
| Review | Independent review of what was built |
| Compound | Capture learnings back into the system |

## Stack

- TypeScript 5.x + PixiJS v8 (WebGL)
- Vite + Vitest
- pnpm
- Python + Stable Baselines3 (PPO) for AI training
- ONNX export for browser inference

## Architecture Rules (same as v02 — the constraints are the control variable)

- Engine (`src/engine/`) is headless — zero PixiJS imports
- Renderer reads engine state, never mutates it
- AI trains against headless engine via WebSocket bridge
- Engine/renderer boundary is SACRED

## MCP Stack

- **Context7** — library/framework documentation lookup
- **Serena** — semantic code understanding
- **Sequential Thinking** — structured reasoning for complex problems

NO GSD. This is a clean CE build.

## Reference

- racer-02 (GSD): `C:\Users\brigg\ai-learning-journey\projects\top-down-racer-02`
- CE research: `research/compound engineering/`
- GitHub: [mbriggsy/ai-learning-journey](https://github.com/mbriggsy/ai-learning-journey)
