# Top-Down Racer v02 — Complete Tool Stack

## The Mission

Build a top-down racing game (v02) in TypeScript + PixiJS, then train an AI to drive the car better than any human ever could. The game has a decoupled two-layer architecture: a **Simulation Engine** (pure logic, runs headless in Node.js for AI training at thousands of simulations per second) and a **Renderer** (PixiJS WebGL, browser only, for humans to play). After the game is built, we wire up a Python ML pipeline via Gymnasium + stable-baselines3 to teach a neural network to race.

The tool stack exists to make this happen autonomously — Claude Code does the work, the tools keep it sharp, and you drink coffee.

---

## Stack Overview

| Layer | Tool | Role |
|-------|------|------|
| **Orchestration** | GSD (Get Shit Done) | Project manager. Specs, phases, subagent spawning, verification. |
| **MCP Server** | Context7 | Live, current library documentation on demand. |
| **MCP Server** | Serena | Semantic code navigation via Language Server Protocol. |
| **MCP Server** | Sequential Thinking | Structured step-by-step reasoning for architecture decisions. |
| **Plugin (partial)** | Compound Engineering | Cherry-picked skills, agents, and commands for quality and knowledge. |
| **Skill** | Visual Explainer | Turns diagrams and tables into interactive HTML instead of ASCII. |

---

## Layer 1: Orchestration — GSD (Get Shit Done)

**What it is:** A meta-prompting and context engineering system for Claude Code. Spec-driven development with phase-based planning, fresh subagent execution, and goal-backward verification.

**The problem it solves — Context Rot:**

As Claude's context window fills up during long coding sessions, quality degrades predictably:

- **0–30% context used:** Peak quality. Thorough, comprehensive, remembers everything.
- **50%+ context used:** Starts rushing. Cuts corners. "I'll be more concise."
- **70%+ context used:** Hallucinations. Forgotten requirements. Drift.

GSD prevents this by never letting a single session get that far. Instead of one long degrading session, it spawns **fresh Claude instances (subagents)** for each task. Each subagent gets a clean 200K token context window. Task 50 has the same quality as Task 1.

**How GSD works:**

1. **Interview Phase** — GSD asks you what you want to build. It extracts requirements, edge cases, and design decisions through structured questioning. The output is a detailed spec.

2. **Roadmap Creation** — The spec becomes a phased roadmap. Each phase has clear objectives, deliverables, and success criteria.

3. **Phase Planning** — For each phase, GSD creates small, atomic plans. Each plan is 2–3 tasks designed to fit in ~50% of a fresh context window. No single task is big enough to cause quality degradation.

4. **Wave-Based Execution** — Plans are organized into waves based on dependencies:
   - **Wave 1:** Blocking tasks (must complete first)
   - **Wave 2:** Independent tasks (run in parallel)
   - **Wave 3:** Tasks that depend on Wave 2
   - At peak, multiple agents can run simultaneously.

5. **Atomic Commits** — Every task gets its own git commit. If something breaks, you can bisect to the exact task that caused it.

6. **Goal-Backward Verification** — Instead of asking "what did we build?" GSD asks "what must be TRUE for this to work?" Tests verify observable behaviors, not implementation details.

**Key GSD Commands:**

| Command | What It Does |
|---------|-------------|
| `/gsd:new-project` | Start a new project. Interviews you, creates spec. |
| `/gsd:create-roadmap` | Generate phased roadmap from spec. |
| `/gsd:plan-phase N` | Create detailed plan for phase N. |
| `/gsd:execute-plan <path>` | Execute a plan with fresh subagents. |
| `/gsd:quick "description"` | Quick mode for small tasks. Same fresh-agent guarantees. |
| `/gsd:help` | Show all available commands. |

**Why GSD over alternatives (SuperClaude, Compound Engineering's /lfg):**

For a single, phased build project — game engine → renderer → features → AI training → AI vs Human — GSD's spec-driven approach with fresh subagent contexts is purpose-built. SuperClaude's personas are better for ongoing maintenance of diverse projects. Compound Engineering's /lfg workflow was built for a team shipping multiple products simultaneously. Running multiple orchestrators = conflicting instructions, wasted context window, inconsistent behavior. One brain, not three.

---

## Layer 2: MCP Servers

MCP (Model Context Protocol) is Anthropic's standard for connecting AI models to external tools. Think of MCP servers as "USB ports for Claude" — each one gives Claude a new capability.

### Context7 — Live Library Documentation

**What it is:** An MCP server that fetches current, real documentation for any library or framework, directly from the source.

**The problem it solves:**

Claude's training data has a cutoff. When you're using PixiJS v8, Vite 6, or the latest stable-baselines3 release, Claude might reference APIs that don't exist anymore — or miss new APIs entirely. Context7 fetches the actual current docs and injects them into Claude's context so it codes against reality, not memory.

**How it works:**

1. Claude recognizes it needs documentation (or you say "use context7").
2. Context7 resolves the library name to a Context7-compatible ID.
3. It fetches version-specific documentation and code examples.
4. Claude receives current, accurate API information.

**Why it matters for our project:**

We're using multiple libraries that evolve fast — PixiJS, Vite, Vitest, stable-baselines3, Gymnasium. One hallucinated API call in the physics engine or training pipeline means hours of debugging. Context7 eliminates that category of bug entirely.

**Key features:**
- Supports 15,000+ libraries
- Version-specific documentation (e.g., "PixiJS v8" vs "PixiJS v7")
- Code examples from official sources
- Free and open-source (optional API key for higher rate limits)

### Serena — Semantic Code Navigation

**What it is:** An MCP server that gives Claude symbolic understanding of your codebase through Language Server Protocol (LSP) integration.

**The problem it solves:**

Without Serena, Claude navigates code by text-searching — basically running `grep` across files. This works fine for small projects but falls apart fast in a codebase with 50+ files. Serena uses the same technology that powers "Go to Definition" and "Find All References" in VS Code, giving Claude IDE-grade code understanding.

**How it works:**

Serena wraps language server implementations (for TypeScript, Python, and 30+ other languages) and exposes their capabilities as MCP tools. Claude can:

- **Find symbols** — locate any function, class, type, or variable by name across the entire project
- **Find references** — see everywhere a symbol is used
- **Get symbol overviews** — understand a file's structure without reading every line
- **Navigate relationships** — trace how types flow through the codebase
- **Edit at the symbol level** — make surgical changes instead of full-file rewrites

**Why it matters for our project:**

The decoupled architecture means our codebase has strict boundaries: the simulation engine can't import from the renderer, the AI observation code must access engine state through clean interfaces, and type definitions are shared across all modules. Serena makes Claude *understand* these boundaries at the symbol level, not just follow text patterns.

As the project grows from Phase 1 (simulation engine) through Phase 6 (AI vs Human mode), the codebase will have hundreds of interconnected types, functions, and modules. Serena keeps Claude efficient and accurate throughout.

**Key features:**
- Symbolic code understanding (not text search)
- 30+ language support (TypeScript and Python both covered)
- Project memory system (persists context across sessions)
- Token-efficient (reads only what it needs, not entire files)
- Dedicated `--context claude-code` flag that avoids tool conflicts with Claude Code's built-in capabilities

### Sequential Thinking — Structured Reasoning

**What it is:** An MCP server that helps Claude break down complex problems into structured, step-by-step reasoning with the ability to revise, branch, and backtrack.

**The problem it solves:**

Some decisions can't be answered with a quick response. When Claude needs to think through architectural trade-offs, design reward functions for RL training, or debug a subtle physics issue, it benefits from structured reasoning that mirrors how a senior engineer would work through the problem on a whiteboard.

**How it works:**

Sequential Thinking provides a `create_sequential_thought` tool that lets Claude:

- Break problems into numbered steps
- Revise earlier steps as understanding evolves
- Branch into alternative approaches
- Dynamically adjust the total number of steps needed
- Filter out irrelevant information

**Why it matters for our project:**

Two specific areas where this pays dividends:

1. **Architecture decisions** — The decoupled simulation/renderer boundary, the Node.js ↔ Python bridge design, the observation space format for the AI — these are non-trivial design decisions where structured thinking prevents costly mistakes.

2. **AI training design** — Reward function design (how do you numerically define "good driving"?), observation space selection (what does the AI "see"?), and hyperparameter reasoning all benefit from step-by-step analysis rather than gut-feel answers.

---

## Layer 3: Cherry-Picked from Compound Engineering

Compound Engineering is a comprehensive plugin with 29 agents, 22 commands, and 19 skills. We install the full plugin but only actively use components that complement GSD without conflicting. Everything is namespaced, so there are no collisions.

### Skills (7 selected)

| Skill | Purpose | When It's Used |
|-------|---------|----------------|
| **brainstorming** | Collaborative design exploration before implementation | Before building any major feature. "What approaches should we consider for the ray-casting observation system?" |
| **compound-docs** | Captures solved problems as searchable YAML-frontmatter documentation | After every non-trivial bug fix, architecture decision, or gotcha. Builds institutional knowledge that future agents can search. |
| **document-review** | Quality gate for plans and specs | After GSD creates a plan, before execution. Catches gaps, ambiguities, and unrealistic assumptions. |
| **frontend-design** | Production-grade UI/UX generation | When building the game's HUD, menus, track selection screen, and AI-vs-Human mode UI. Makes the game look polished, not like a homework assignment. |
| **git-worktree** | Manages isolated parallel development branches | When GSD spawns parallel waves. Each wave gets its own worktree so agents don't step on each other's files. |
| **orchestrating-swarms** | Multi-agent coordination patterns | Enhancement to GSD's wave execution. Better patterns for how agents communicate results and hand off work. |
| **skill-creator** | Meta-skill for creating new project-specific skills | As we build, we'll create skills for "game-physics-testing," "rl-training-pipeline," etc. This skill teaches Claude how to create effective skills. |

### Agents (8 selected)

| Agent | Purpose | When It's Used |
|-------|---------|----------------|
| **architecture-strategist** | Pattern compliance and design integrity review | After structural changes. Ensures the simulation/renderer boundary stays clean and the AI interface is stable. |
| **performance-oracle** | Performance bottleneck analysis | Critical for both game FPS (nobody plays a 15 FPS game) and AI training speed (slow simulations = slow learning). |
| **security-sentinel** | Security audit | Over-engineering tax. Catches things like eval() usage, dependency vulnerabilities, and unsafe input handling. |
| **code-simplicity-reviewer** | YAGNI enforcement | Counterbalance to our over-engineering instinct. Keeps complexity intentional, not accidental. |
| **pattern-recognition-specialist** | Cross-module consistency analysis | As multiple agents build different modules, this catches when one uses a different pattern than another. |
| **bug-reproduction-validator** | Systematic bug reproduction and validation | When the AI does weird things on the track, helps determine if it's a training issue or a physics bug. |
| **best-practices-researcher** | External research for current best practices | Huge for the RL/AI training phase. Current PPO tuning practices, reward shaping techniques, Gymnasium patterns, etc. |
| **spec-flow-analyzer** | Gap detection in specifications | Before building. Catches missing edge cases, undefined behaviors, and user flow gaps in specs. |

### Commands (3 selected)

| Command | Purpose |
|---------|---------|
| **/deepen-plan** | Enhances GSD plans with parallel research agents. Adds depth, best practices, and implementation details without adding context rot. |
| **/reproduce-bug** | Investigates bugs using logs, console inspection, and browser screenshots. Game debugging on steroids. |
| **/resolve_parallel** | Resolves all TODO comments using parallel processing. Cleanup crew for after major build phases. |

### What We Deliberately Left Out

- **All Ruby/Rails tools** — DHH reviewer, Kieran Rails reviewer, ankane gem writer, Rails style guide. Not our stack.
- **Every editorial tools** — every-style-editor and related. We're building a game, not publishing articles.
- **Figma sync agents** — No Figma involved in this project.
- **Deployment verification** — No production deployment for a learning project.
- **/lfg and /slfg commands** — These are Compound Engineering's own orchestration workflows. They'd conflict with GSD.
- **Data migration agents** — schema-drift-detector, data-integrity-guardian, data-migration-expert. No database in our game.
- **Agent-native architecture** — Designed for building products where AI agents are end-users. Not relevant here.

---

## Layer 4: Game Tech Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Language** | TypeScript | Type safety catches bugs early. LSP support makes Serena powerful. Runs in browser AND Node.js (headless). |
| **Renderer** | PixiJS | WebGL-accelerated 2D rendering. Fast, beautiful, battle-tested. Browser-native — send a link, play immediately. |
| **Physics** | Custom (deterministic, tick-based) | Full control over determinism. External physics engines introduce non-deterministic behavior that makes AI training unreliable. |
| **Build** | Vite | Fast dev server with hot module reload. TypeScript compilation, asset handling, zero-config development experience. |
| **Testing** | Vitest | Native TypeScript support. Same config as Vite. Fast, modern test runner. |
| **AI Bridge** | Node.js ↔ Python (ZeroMQ or WebSocket) | Gymnasium-compatible wrapper. Python sends actions, Node.js simulation steps one tick, returns observation. |
| **ML Framework** | stable-baselines3 + PyTorch | Industry standard for RL. PPO and SAC algorithms. TensorBoard integration for training visualization. |
| **Observation** | Ray-casting + state vector | Car "sees" track edges via simulated sensors (rays from the car). State vector includes position, velocity, angle, distances. |
| **Version Control** | Git (managed by GSD) | Atomic commits per task. Wave-based branching via git-worktree. Full history for bisecting issues. |

---

## Layer 5: Bonus Tools

### Visual Explainer

A Claude Code skill that transforms architecture diagrams, data tables, and process flows from ugly ASCII art into interactive HTML pages with Mermaid diagrams, dark/light themes, syntax highlighting, and proper typography. Because nobody should read architecture decisions rendered in monospace courier.

### GitHub MCP Server (Optional)

Enables Claude Code to manage GitHub repos directly — create PRs, issues, browse code, trigger CI/CD. Optional because the project can live purely local, but useful if we want to track progress via GitHub Issues or share the repo.

---

## How Everything Works Together

Here's the flow for a typical development session:

1. **You say:** "Let's build Phase 2 — the PixiJS renderer."

2. **GSD takes over:** Creates a detailed plan for Phase 2, breaking it into small atomic tasks organized in waves.

3. **Document-review skill** refines the plan, catching gaps.

4. **GSD spawns fresh subagents** for each task. Each gets a clean 200K context window.

5. Each subagent uses:
   - **Context7** to fetch current PixiJS v8 documentation
   - **Serena** to navigate the existing simulation engine code and understand the types/interfaces it needs to visualize
   - **Sequential Thinking** for any non-trivial design decisions

6. **Git-worktree** keeps parallel waves isolated.

7. **Atomic commits** land after each task.

8. **Architecture-strategist** and **performance-oracle** review the results.

9. **Compound-docs** captures any important decisions or gotchas.

10. **GSD verifies** the phase deliverables against success criteria.

You spent step 1 talking and steps 2–10 drinking coffee.

---

## Project Phases

| Phase | What Gets Built | Key Deliverable |
|-------|----------------|-----------------|
| **1** | Core simulation engine | Deterministic tick-based physics, car dynamics, track geometry, collision detection. Fully testable, zero rendering. |
| **2** | PixiJS renderer + playable game | You can race in a browser. Thin visualization layer reading engine state. |
| **3** | Game features & polish | Multiple tracks, HUD, difficulty settings, particles, audio, track selection. |
| **4** | Gymnasium environment wrapper | Headless mode, Python bridge, observation/action spaces defined. |
| **5** | AI training pipeline | Reward function design, PPO training, TensorBoard monitoring, hyperparameter tuning. |
| **6** | AI vs Human mode | Watch your AI creation smoke you on your own track. The whole point. |
