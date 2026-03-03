# AI SDLC AUTONOMY ISN'T THE FUTURE. IT'S NOW.

**Top-Down Racer v02 — Evidence Package**

*A complete racing game + neural network AI opponent built by autonomous AI development. Zero hand-written game code.*

---

## The Claim

# 0

**lines of hand-written game code**

Every line authored by Claude Code under human architectural direction. Not copilot. Not autocomplete. Autonomous development.

| Metric | Value |
|--------|-------|
| Phases completed | 6 of 6 |
| Git commits | 80+ |
| Automated tests | 366+ |

---

## What Was Built

**Racing Game** — 3 tracks, full sound, particles, menus, HUD, pause, replays

**Neural Network AI** — Self-taught driving via reinforcement learning — zero human training data

**Browser Deployed** — ONNX inference at 60fps, fully static, zero server infrastructure

**AI vs Human** — Race against your own creation. Head-to-head with grace period.

---

## The Numbers

| Metric | Value | Context |
|--------|-------|---------|
| Headless sim speed | **13,000+ ticks/sec** | Target was 10,000 |
| AI training to competent driving | **< 3 minutes** | 60K steps on Track 1 |
| ONNX model size | **23.7 KB** | Runs in any browser |
| Determinism | **100%** | 100 runs × 10K ticks = identical hash |
| Pre-execution bug catches | **15 / 15** | Never missed |
| Server cost | **$0** | Fully static deployment |

---

## Defect Prevention: 15 for 15

Every pre-execution review caught real bugs. Not theoretical risks — concrete defects with specific code-level fixes.

| Bug Caught Before Execution | Severity | What Would Have Shipped |
|-----------------------------|----------|------------------------|
| Sparse reward (not dense) | **CRITICAL** | AI training completely fails |
| Speed bonus 37× too high | **CRITICAL** | AI spins in circles, never races |
| VecNorm case mismatch | **CRITICAL** | All inference returns NaN |
| AI heading 90° wrong | HIGH | Ghost car drives sideways |
| Grace ticks during pause | HIGH | 5s window consumed while paused |
| WASM tensors not disposed | MEDIUM | 43 KB/min memory leak |

10–12 specialized research agents review every plan before a single line of code is written.

---

## Architecture Held Clean

Two-layer decoupled architecture verified across 80+ commits and 6 phases.

**SIMULATION ENGINE** → *reads state* → **PIXIJS RENDERER**

| Simulation Engine | PixiJS Renderer |
|-------------------|-----------------|
| Pure TypeScript logic | Visual layer only |
| **Zero rendering imports** | **Never touches game logic** |
| Runs headless in Node.js | WebGL 2D rendering |
| 13K+ ticks/sec | Read-only engine state |
| Deterministic physics | Browser-only component |

> Boundary violation caught by architecture-strategist agent before Phase 3. Game state machine extracted from renderer to engine. Automated review, not manual inspection.

---

## The AI Taught Itself to Drive

| Training Stage | What Happened |
|----------------|---------------|
| 0 steps | Random flailing. Drives into walls. |
| 30K steps | Discovers forward motion. Stays on road sometimes. |
| 60K steps | Clean laps. Learns braking points. |
| 2M steps | Rips the hardest track. Zero wall contact. |

| AI Metric | Value |
|-----------|-------|
| Tuning iterations | **0** |
| Wall contacts at convergence | **0** |
| Explained variance | **0.994** |
| Observation dimensions | **14** |
| Action outputs | **3** |

---

## Not Vibes. Engineering.

**01 SPECIFY** → **02 PLAN** → **03 DEEPEN** → **04 EXECUTE** → **05 VERIFY**

| Step | What Happens |
|------|-------------|
| Specify | War-game every decision. Document before building. |
| Plan | Break into atomic tasks. 50% context window max. |
| Deepen | 10-12 research agents review before execution. |
| Execute | Fresh subagents per task. Clean 200K context. |
| Verify | Goal-backward testing. Architecture review. |

Context rot eliminated. Task 50 runs at the same quality as Task 1.

> **The human never writes code. The human makes decisions.**

---

## The Shift

| | ASSISTANCE *(yesterday)* | AUTONOMY *(now)* |
|---|---|---|
| Who codes | Human writes code | AI builds the entire system |
| AI role | Suggests completions | Autonomous development |
| Tool metaphor | Copilot fills in blanks | Fresh agents prevent rot |
| Quality driver | Depends on the coder | Enforced by process |
| Context | Degrades over time | Every task gets clean context |

**Assistance scales linearly. Autonomy scales exponentially.**

---

## This Isn't a Proof of Concept. It's a Proof of Production.

366+ tests. 80+ commits. 15/15 defect catches. 23.7 KB neural network. Zero server infrastructure. Zero lines of hand-written code.

*Full evidence package available.*
