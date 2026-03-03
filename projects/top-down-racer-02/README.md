# TOP-DOWN RACER v02

**AI SDLC Autonomy Isn't the Future. It's Now.**

A complete top-down racing game with a self-taught neural network AI opponent — built entirely by autonomous AI development. Zero hand-written game code.

### [▶ Play It Now](https://top-down-racer-02.vercel.app/)

---

| Metric | Value |
|--------|-------|
| Hand-written lines of game code | **0** |
| Total lines of code | **10,497** |
| Git commits | **189+** |
| Automated tests | **389** (377 TypeScript + 12 Python) |
| Pre-execution defect catches | **15 / 15** |
| Headless simulation speed | **13,000+ ticks/sec** |
| AI model size | **23.7 KB** (ONNX) |
| Build time | **~3 days** |
| Server infrastructure | **$0** (fully static) |

Every line of code authored by [Claude Code](https://docs.anthropic.com/en/docs/claude-code) under human architectural direction. Not copilot. Not autocomplete. Autonomous development orchestrated by the [GSD framework](https://github.com/get-shit-done-ai/gsd).

> *The human never writes code. The human makes decisions.*

---

## What Is This?

A top-down racing game with three tracks, full sound, particle effects, menus, HUD, pause, and replays — plus a neural network AI opponent that learned to drive via reinforcement learning with zero human training data. Race against your own creation head-to-head in the browser.

The project exists to prove a thesis: **autonomous AI development is production-ready.** The 7-document evidence package below provides the receipts.

---

## Architecture

Two-layer decoupled architecture enforced across all 6 build phases:

```
┌─────────────────────┐         ┌─────────────────────┐
│  SIMULATION ENGINE   │────────▶│   PIXIJS RENDERER    │
│                      │ reads   │                      │
│  Pure TypeScript     │ state   │  Visual layer only   │
│  Zero rendering      │         │  Never touches logic │
│  Runs headless       │         │  WebGL 2D            │
│  13K+ ticks/sec      │         │  Browser-only        │
│  Deterministic       │         │  Read-only state     │
└─────────────────────┘         └─────────────────────┘
```

The simulation engine has **zero rendering imports**. It runs identically in the browser (human play), in headless Node.js (AI training at 13K+ ticks/sec), and with ONNX inference (AI vs Human mode). Same physics, same collisions, same determinism — every time.

---

## Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Language | TypeScript (strict mode) | Type safety, runs in browser and Node.js |
| Renderer | PixiJS v8 | WebGL-accelerated 2D rendering |
| Physics | Custom (deterministic, tick-based) | Full control over determinism for AI training |
| Build | Vite | Dev server with HMR, TypeScript compilation |
| Testing | Vitest + pytest | 377 TypeScript tests + 12 Python tests |
| AI Bridge | Node.js ↔ Python (WebSocket) | Gymnasium-compatible, ~3,980 steps/sec |
| ML Framework | stable-baselines3 + PyTorch | PPO reinforcement learning |
| AI Inference | ONNX Runtime Web | 23.7 KB model running at 60fps in browser |
| Deployment | Vercel | Fully static, auto-deploys on push |

---

## Prerequisites

- **Node.js** 18+
- **pnpm** (package manager)
- **Python** 3.10–3.12 (for AI training only)
- **Git**

---

## Getting Started

### Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/top-down-racer-02.git
cd top-down-racer-02
pnpm install
```

### Run the Game (Development)

```bash
pnpm dev
```

Opens at `http://localhost:5173`. Pick a track, pick a mode, race.

### Build for Production

```bash
pnpm build
```

Output goes to `dist/`. Fully static — drop it on any static host.

### Run Tests

```bash
# TypeScript tests (377 tests)
pnpm test

# Python tests (12 tests) — bridge must NOT be running separately
cd python
. .venv/Scripts/Activate.ps1   # Windows
# source .venv/bin/activate    # macOS/Linux
pytest tests/ -v
```

### Type Check

```bash
npx tsc --noEmit
```

### Check for Circular Dependencies

```bash
npx madge --circular --extensions ts src/
```

---

## AI Training

Training the neural network to drive requires three terminals.

### 1. Set Up Python Environment (First Time Only)

```bash
cd python
python -m venv .venv
. .venv/Scripts/Activate.ps1   # Windows
# source .venv/bin/activate    # macOS/Linux
pip install -r requirements.txt
```

> **Note:** PyTorch 2.3 requires Python 3.10–3.12. Python 3.13+ will fail to install dependencies.

### 2. Start the Bridge Server

```bash
# Terminal 1
npx tsx src/ai/run-bridge.ts
```

This runs the simulation engine headless (no PixiJS, no browser) and listens for WebSocket connections from the Python training client.

### 3. Run Training

```bash
# Terminal 2
cd python
. .venv/Scripts/Activate.ps1
python -m training.train_ppo --timesteps 2000000 --track-id track-03
```

Training progress is logged to `python/logs/`. To resume an existing run:

```bash
python -m training.train_ppo --timesteps 2000000 --track-id track-03 --resume
```

### 4. Monitor with TensorBoard (Optional)

```bash
# Terminal 3
cd python
. .venv/Scripts/Activate.ps1
tensorboard --logdir logs
```

Open `http://localhost:6006` to watch reward curves, episode lengths, and explained variance in real time.

### 5. Export to ONNX for Browser Play

```bash
cd python
. .venv/Scripts/Activate.ps1
python -m training.export_onnx --model models/YOUR_MODEL.zip --vecnorm models/YOUR_VECNORM.pkl
```

Outputs `public/assets/model.onnx` (~23.7 KB) and `public/assets/vecnorm_stats.json` (816 bytes). Both are served as static files by Vite.

---

## Project Structure

```
src/
├── engine/          # Pure simulation logic — physics, collision, car dynamics, track
│                    #   ZERO rendering imports. Runs headless for AI training.
├── renderer/        # PixiJS visual layer — reads engine state, draws pixels
│                    #   Never touches game logic.
├── ai/              # AI observation, reward functions, bridge server, ONNX inference
├── types/           # Shared TypeScript type definitions
├── utils/           # Math helpers, vector operations
└── tracks/          # Track definitions (geometry, checkpoints, spawn points)

tests/
├── engine/          # 286 tests — physics, collision, car dynamics
├── renderer/        # 25 tests — visual layer
└── ai/              # 91 tests — observations, rewards, bridge, ONNX

python/
├── racer_env/       # Gymnasium-compatible environment (racer_env.py)
├── training/        # PPO training scripts, ONNX export, evaluation
├── tests/           # 12 Python tests
└── logs/            # TensorBoard training logs

public/assets/       # Static assets — sprites, audio, model.onnx
```

---

## Game Modes

| Mode | Description |
|------|-------------|
| **Solo** | Race alone. Set lap records. |
| **vs AI** | Head-to-head against the neural network. Grace period start, shared race clock. |
| **Spectator** | Watch the AI drive. See what 2 million training steps looks like. |

Three tracks with increasing difficulty. The AI was trained on Track 3 (hardest) and generalizes to Track 1. Track 2's wide sweeping turns require a different driving approach — multi-track training is on the v03 roadmap.

---

## How It Was Built

This project was built using the **GSD (Get Shit Done) framework** — a spec-driven autonomous development orchestrator for Claude Code.

**The process:**

1. **Specify** — War-game every design decision before writing code. 47 decisions documented.
2. **Plan** — Break into atomic tasks. 50% context window max per task.
3. **Deepen** — 10–12 specialized research agents review every plan before execution. 15 for 15 bug catch rate.
4. **Execute** — Fresh subagents per task. Clean 200K context window. No rot.
5. **Verify** — Goal-backward testing. Architecture review at phase boundaries.

Six phases, ~3 build days (Feb 27–28, Mar 1), 189+ commits. The upfront specification investment eliminates rework — execution is fast because there are no decisions left to make and no surprises to debug.

---

## Evidence Package

Comprehensive documentation proving autonomous AI development rigor. Every claim is backed by automated evidence, not assertions.

| Doc | Title | Key Metric |
|-----|-------|------------|
| 0 | Executive Summary | 5–8 page overview |
| 1 | Architecture Evidence | 0 boundary violations |
| 2 | Requirements Traceability Matrix | 78 traced items, 100% coverage |
| 3 | Testing & Defect Prevention | 389 tests, 15/15 pre-execution catches |
| 4 | Code Quality Analysis | 0 circular dependencies, strict TypeScript |
| 5 | AI Training Evidence | 23.7 KB model, 0 tuning iterations |
| 6 | Process & Workflow Evidence | 47 decisions, 11 workflow learnings |
| 7 | Build Metrics Dashboard | All metrics visualized (interactive HTML) |

---

## Verification Commands

Every architectural claim can be independently verified:

| Claim | Command |
|-------|---------|
| Engine has zero renderer imports | `grep -r "from.*renderer\|from.*pixi" src/engine/` → 0 results |
| TypeScript compiles clean | `npx tsc --noEmit` → 0 errors |
| All tests pass | `pnpm test` → 389 tests passing |
| No circular dependencies | `npx madge --circular --extensions ts src/` → 0 cycles |
| Deterministic physics | Run 100 simulations of 10K ticks → identical state hashes |
| Headless mode works | `npx tsx src/ai/run-bridge.ts` → starts with 0 PixiJS imports |
| ONNX model runs in browser | `pnpm dev` → vs AI mode → AI car drives autonomously |

---

## License

[Add your license here]

---

*Built with autonomous AI development. The human makes decisions. The AI writes code.*
