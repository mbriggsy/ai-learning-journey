# TOP-DOWN RACER v02

## Autonomous Development Evidence Package

# EXECUTIVE SUMMARY

*A complete racing game with AI opponent built entirely by autonomous AI development. Zero lines of hand-written game code.*

*Prepared by Briggsy — March 2026*

---

## The Challenge

Can a non-coding architect design, build, and ship a complete software product using autonomous AI development—without writing a single line of game code?

Top-Down Racer v02 was built to answer that question. The project is a fully playable browser-based racing game with a neural network AI opponent that taught itself to drive, deployed as a static site with zero server infrastructure. Every line of game code was authored by Claude Code, orchestrated by the GSD (Get Shit Done) framework, and quality-gated by automated verification at every stage.

This document is the executive summary of a comprehensive evidence package proving the rigor, quality, and reproducibility of the autonomous development approach. The accompanying technical binders provide the receipts.

---

## What Was Built

A top-down racing game with two decoupled layers: a deterministic simulation engine (pure TypeScript logic, zero rendering code) and a PixiJS WebGL renderer (visual layer only, never touches game logic). This architectural boundary is the foundation of the entire project—it enables the simulation to run headless at thousands of ticks per second for AI training while the renderer provides the human play experience.

### Game Features

Three playable tracks with increasing complexity (learning oval, flowing speedway, technical gauntlet). Full sound system synthesized entirely via Web Audio API. Visual effects including skid marks, dust and spark particles, and checkpoint flashes. Animated main menu, track selection with thumbnail previews and best times, configurable lap count, pause menu, and instant restart. Three game modes: Solo (time trial), vs AI (head-to-head ghost racing), and Spectator (watch the AI drive).

### AI Training Pipeline

A complete reinforcement learning pipeline: Gymnasium-compatible Python environment communicating with the headless TypeScript simulation via WebSocket bridge. PPO training via stable-baselines3 with custom reward shaping, TensorBoard monitoring, and model checkpointing. The trained model is exported to ONNX format and runs live inference in the browser via onnxruntime-web—no server required.

> The AI learned to drive clean laps on the most complex track in under 3 minutes of training. Default reward weights worked on the first run with zero tuning. The reward design was war-gamed before implementation and validated by 3 rounds of research agent review.

---

## By The Numbers

| Metric | Value |
|--------|-------|
| Lines of hand-written game code | **0** |
| Total phases completed | **6 of 6** |
| Total plans executed | **20+** |
| Git commits | **80+** |
| Automated tests passing | **366+** |
| Determinism verification | **100 runs × 10,000 ticks = identical hash** |
| Headless simulation speed | **13,000+ ticks/sec** (target: 10,000) |
| Defect prevention (/deepen-plan) | **15 for 15** — bugs caught in every run |
| AI training to competent driving | **< 3 minutes** (60K steps) |
| Reward tuning iterations needed | **0** (defaults worked first run) |
| AI penalty signals at convergence | **All at zero** (clean driving) |
| ONNX model size (browser delivery) | **23.7 KB** |
| Server infrastructure required | **None** — fully static deployment |

---

## How It Was Built

### The Human Role: Architect, Not Coder

The human contributor (Briggsy) served as architect and decision-maker. This included designing the two-layer architecture, war-gaming every major design decision (car physics model, track system, collision behavior, AI observation space, reward shaping), creating the tool stack, writing the specification documents, and reviewing output at phase boundaries. At no point did the human write, edit, or debug game code directly.

A second human contributor (Harry) served as hands-on executor—running Claude Code sessions, following setup documentation, and executing terminal commands. Harry operated from written instructions and learned the workflow as the project progressed.

### The Autonomous Development Stack

The core insight is that AI code generation quality degrades predictably as context windows fill up—a phenomenon called context rot. At 50% context utilization, the AI starts cutting corners. At 70%, hallucinations begin. The entire tool stack is designed to prevent this.

**GSD (Get Shit Done)** is the orchestration framework. It takes a specification, creates a phased roadmap, breaks each phase into small atomic plans, and executes each plan with a fresh Claude Code instance (subagent) that has a clean 200K token context window. Task 50 runs at the same quality level as Task 1. Every task produces an atomic git commit. If something breaks, you can bisect to the exact task that caused it.

**Three MCP servers** augment Claude Code's capabilities: Context7 fetches live, current library documentation so the AI codes against reality, not stale training data. Serena provides semantic code navigation via Language Server Protocol—the AI understands code at the symbol level, not through text search. Sequential Thinking enables structured step-by-step reasoning for architectural decisions.

**Compound Engineering** provides cherry-picked quality tools: an architecture strategist that enforces design boundaries, a performance oracle for bottleneck analysis, a code simplicity reviewer for YAGNI enforcement, and most critically, the /deepen-plan command that dispatches 10–12 specialized research agents to review every plan before execution.

### The Six-Phase Build

| Phase | What Was Built | Key Evidence | Status |
|-------|----------------|--------------|--------|
| 1 | Core Simulation Engine | 214 tests, 13K ticks/sec, determinism verified | ✅ |
| 2 | PixiJS Renderer + Playable Game | Decoupled rendering, controller support | ✅ |
| 3 | Game Features & Polish | 3 tracks, sound, particles, menus, race completion | ✅ |
| 4 | Gymnasium Environment Wrapper | 48 + 17 + 3 tests, 3,980 steps/sec bridge | ✅ |
| 5 | AI Training Pipeline | PPO + SAC scripts, TensorBoard, 12 tests | ✅ |
| 6 | AI vs Human Mode | ONNX browser inference, 3 game modes, grace period | ✅ |

---

## Defect Prevention: The /deepen-plan Record

The single most impactful quality practice in the entire build was running /deepen-plan before every phase execution. This command dispatches 10–12 specialized research agents—TypeScript reviewers, architecture strategists, performance oracles, PixiJS documentation researchers, race condition analysts, and others—to review a plan before a single line of code is written.

The result: **15 consecutive runs, 15 consecutive bug catches.** Every single deepening session found real defects that would have shipped without review. Not theoretical risks—concrete bugs with specific code-level descriptions of what would break and how.

### Sample Bugs Caught Before Execution

| Bug | Severity | What Would Have Happened |
|-----|----------|--------------------------|
| Sparse reward instead of dense | **Critical** | AI training would have failed completely—no learning signal |
| Speed bonus 37x too high | **Critical** | AI learns to spin in circles at max speed instead of racing |
| AI car heading 90° wrong | **High** | Ghost car visually drives sideways on screen |
| VecNormStats snake/camelCase mismatch | **Critical** | All AI inference produces NaN—AI completely non-functional |
| WASM output tensors not disposed | Medium | 43 KB/min memory leak during AI inference |
| Container.tint doesn't exist in PixiJS v8 | Medium | AI car tint silently ignored—no visual distinction |
| Grace countdown ticks during pause | **High** | Player's 5-second window consumed while game is paused |
| record() vs record\_mean() in TensorBoard | Medium | Silent data corruption in training metrics |
| pickle.load() security risk (CWE-502) | Medium | Arbitrary code execution via malicious model file |
| Multi-lap checkpoint key corruption | **High** | Gap timer shows wildly incorrect values after lap 1 |

> This is a sample—the full defect prevention evidence document catalogs every bug caught across all 15 deepening sessions, with severity ratings, root cause analysis, and the specific plan that identified each defect.

---

## Architecture Integrity

The two-layer architecture—simulation engine completely decoupled from renderer—is the non-negotiable foundation of the project. If the boundary leaks, the simulation can't run headless, and the AI training pipeline breaks.

This boundary was verified programmatically: all 9 engine source files import exclusively from within src/engine/. Zero cross-boundary imports. The renderer reads engine state through clean interfaces and never mutates game logic. The architecture-strategist agent reviewed the boundary after every structural change.

When the architecture strategist found a violation—game state machine logic living in the renderer layer—it was extracted to the engine (ARCH-01) before Phase 3 began. The violation was caught by automated review, not manual inspection.

> The accompanying Architecture Evidence document includes full dependency analysis, import boundary verification scripts, module coupling metrics, and the complete architecture decision record.

---

## Testing Rigor

The project maintains 366+ automated tests across TypeScript (Vitest) and Python (pytest), covering the simulation engine, AI components, bridge infrastructure, and training pipeline. Tests were written as part of each plan's execution—not bolted on after the fact.

### Test Count Progression

| Phase | Cumulative Tests Passing |
|-------|--------------------------|
| Phase 1: Simulation Engine | 214 |
| Phase 2: Renderer + Playable Game | ~250 |
| Phase 3: Features & Polish | 315 |
| Phase 4: Gymnasium Wrapper | 350 |
| Phase 5: Training Pipeline | 362 |
| Phase 6: AI vs Human Mode | 366+ |

Determinism proof: The simulation engine was verified deterministic by running 100 independent simulations of 10,000 ticks each and comparing the resulting state hashes. All 100 produced identical results. This guarantees that AI training produces reproducible outcomes—the same actions always produce the same physics state.

---

## AI Training Evidence

The reinforcement learning pipeline uses PPO (Proximal Policy Optimization) via stable-baselines3 with a carefully designed 14-value observation vector (9 ray-cast distances plus 5 state values) and 3 continuous action outputs (steering, throttle, brake).

### Reward Design Validation

The reward function was designed before implementation through structured war-gaming sessions documented in the GSD Interview Prep. Key design decisions: checkpoint progress as primary signal (not centerline distance, which fights optimal racing lines), dense per-tick rewards with milestone bonuses at checkpoints, and a four-tier penalty system where penalties are always smaller than progress rewards to prevent timid driving.

Three rounds of /deepen-plan research agents reviewed the reward design. They caught a critical bug (sparse-not-dense progress reward that would have killed training entirely) and a weight imbalance (speed bonus 37x too high) before any training occurred. The corrected design worked on the first training run with zero further tuning.

### Training Results

Track 1 (oval) sanity run: AI learned clean laps in under 60,000 steps (approximately 3 minutes of training). Best lap time 7.43 seconds with zero wall contact. Value function explained variance reached 0.994—near-perfect prediction of expected returns.

Track 3 (Gauntlet) production run: 2,000,000 steps on the most complex track with tight hairpins in both directions and S-curves. This model ships with the game and demonstrates genuine learned driving skill, not memorized trajectories.

> The final ONNX model is 23.7 KB—small enough to load instantly in any browser. No server infrastructure, no API calls, no latency. The AI runs live inference at 60fps alongside the game simulation.

---

## Process Discipline

The build followed a rigorous workflow that was iterated and refined across all six phases:

**1. Specification:** Every design decision was war-gamed and documented before implementation. The GSD interview prep document contains pre-baked answers with full rationale for car physics, track design, collision behavior, AI observation space, and reward shaping.

**2. Planning:** GSD created phased roadmaps broken into small atomic plans. Each plan targets approximately 50% of a fresh context window—small enough to prevent quality degradation.

**3. Deepening:** Every plan was reviewed by 10–12 research agents before execution. This practice was maintained without exception across all 15 deepening runs. Plans were deepened serially because later plans depend on corrections from earlier ones.

**4. Execution:** Fresh Claude Code subagents executed each plan with clean context windows. Wave-based parallelization for independent tasks. Atomic git commits per task.

**5. Verification:** Goal-backward verification at phase boundaries. Architecture strategist review after structural changes. Human verification checkpoints for subjective quality.

Workflow learnings were captured and applied iteratively. For example: the discovery that direct terminal work outside GSD caused progress tracking drift (Phases 2–3) led to the rule that all code changes must be routed through GSD. The discovery that research phases were redundant with thorough deepening led to skipping redundant research in later phases.

---

## What This Proves

Top-Down Racer v02 demonstrates that autonomous AI development can produce software with measurable quality indicators that meet or exceed what most human development teams achieve:

**Architecture discipline:** Clean module boundaries verified programmatically. Zero cross-layer imports. Violations caught by automated review, not manual inspection.

**Testing rigor:** 366+ tests written as part of development, not afterthoughts. Deterministic physics verified across 1,000,000 ticks. Every phase adds tests.

**Defect prevention:** 15 consecutive pre-execution reviews caught real bugs in every single run—including critical defects that would have caused complete AI training failure.

**Design quality:** Reward function worked on first training run with no tuning. Architecture held clean across 6 phases and 80+ commits. The upfront design investment paid dividends throughout.

**Process maturity:** Documented workflow with iterative improvements. Decision records for every locked choice. Context rot prevention built into the development methodology.

> The question is not whether AI can assist with writing code—that's yesterday's news. The question is whether AI can autonomously build production-quality software under human architectural direction, with the same rigor expected of professional development teams. This evidence package documents what autonomy looks like.

---

## Evidence Package Contents

| Doc # | Title | Contents |
|-------|-------|----------|
| 0 | Executive Summary | This document — the story and key metrics |
| 1 | Architecture Evidence | Dependency analysis, boundary verification, decision records |
| 2 | Requirements Traceability | 63 requirements mapped to code files and test files |
| 3 | Testing & Defect Prevention | Test progression, determinism proof, 15-for-15 bug catalog |
| 4 | Code Quality Analysis | Static analysis, complexity metrics, TypeScript strict mode |
| 5 | AI Training Evidence | Reward design, training curves, convergence analysis |
| 6 | Process & Workflow Evidence | GSD workflow, decision log, tool stack justification |
| 7 | Build Metrics Dashboard | Timeline, commits, LOC, phase completion, human effort |

---

*— End of Executive Summary —*
