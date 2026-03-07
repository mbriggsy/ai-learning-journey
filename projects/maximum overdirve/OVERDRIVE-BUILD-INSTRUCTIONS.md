# OVERDRIVE — Shared Core + Dual Mode Architecture

*Build Instructions for Track 1 (Claude Code)*
*From: Track 2 Strategic Session — March 7, 2026*
*Status: EXECUTE THIS*

---

## Context

Overdrive now supports two execution modes that share a common core. This document specifies what to build and in what order. The current codebase (v0.3.0, 28 files, ~6,200 lines, 32/32 tests passing, full pipeline built including RTM) is the starting point.

**Read the full handover first:** `HANDOVER.md`

---

## The Two Modes

### Mode 1: CLI Mode (Existing — Needs Refactor)

```bash
overdrive run spec.md
```

Fully autonomous. Node.js process drives everything. Calls `claude` CLI as subprocess. Human walks away. This is what v0.3.0 already does.

### Mode 2: Interactive Mode (New — To Be Built)

```
/overdrive spec.md --upto gate-check
```

Runs inside Claude Code as a slash command. Human is in the loop. Asks clarifying questions before firing. Dispatches subagents via Task tool for plan/strengthen/code. Same pipeline, same state format, same prompts.

**Both modes share:** prompts, state format, agent registry, pipeline logic.
**They differ in:** what drives the loop (Node.js process vs. Claude Code slash command with Task tool).

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    SHARED CORE                       │
│  prompts/ • state-manager • pipeline logic • agents  │
│  gate-evaluator • dependency-analyzer • plan-parser  │
└────────────────────┬────────────────┬────────────────┘
                     │                │
          ┌──────────▼──────┐  ┌─────▼──────────────────┐
          │   CLI DRIVER    │  │  INTERACTIVE DRIVER     │
          │   (Node.js)     │  │  (Slash Command)        │
          │                 │  │                         │
          │ • Fully autonomous│ │ • Human in loop        │
          │ • claude subprocess│ │ • Clarifying Qs       │
          │ • No human needed│  │ • --upto gates         │
          │ • Long-running  │  │ • Task tool subagents   │
          └─────────────────┘  │ • Context self-mgmt     │
                               └─────────────────────────┘
                     │                │
          ┌──────────▼────────────────▼────────────────┐
          │         .planning/BUILD-STATE.md            │
          │    Shared state — either mode can           │
          │    read, write, pick up, hand off           │
          └────────────────────────────────────────────┘
```

**Killer feature:** You can mix modes mid-project. Start interactive to nail down the spec and review plans. Switch to CLI to let it rip through coding overnight. Come back to interactive for IV&V review. The state file is the handshake.

---

## Build Order

### Phase 1: Shared Core Extraction + Banner

**Goal:** Refactor v0.3.0 so the pipeline logic is cleanly separated from the CLI driver. No new features — just restructuring so both drivers can use the same core.

**NOTE:** The rename from asdlc-01 → overdrive is ALREADY DONE in v0.3.0. `bin/overdrive.js` already exists.

#### 1a. Banner + Hidden Alias

- Add `briggsy-build` as a hidden alias (symlink or bin entry that points to same file — **no documentation, no help text, easter egg only**)
- `src/banner.js` is already on disk — wire it into the CLI to replace the current banner

#### 1b. Extract Shared Core

Current `src/orchestrator.js` (944 lines) contains both pipeline logic AND CLI-specific orchestration. Split it:

```
src/
  ├── core/
  │   ├── pipeline.js          ← Pipeline step definitions (plan, strengthen, gate, code, verify, ivv, evidence, rtm, evidence-package)
  │   ├── state-manager.js     ← Unchanged, already clean
  │   ├── gate-evaluator.js    ← Unchanged
  │   ├── dependency-analyzer.js ← Unchanged
  │   ├── plan-parser.js       ← Unchanged
  │   └── logger.js            ← Unchanged
  ├── drivers/
  │   ├── cli-driver.js        ← CLI-specific: phase loop, claude subprocess spawning, parallel execution
  │   └── interactive/         ← (Phase 3 — placeholder for now)
  │       └── README.md        ← "Interactive driver — not yet implemented"
  ├── claude-runner.js         ← Shared: wraps claude CLI invocations (used by CLI driver)
  ├── mcp-detector.js          ← Unchanged
  ├── ivv-runner.js            ← Unchanged
  ├── rtm-builder.js           ← Unchanged
  └── banner.js                ← Already on disk — Happy Toyz + OVERDRIVE banner
```

**The key interface:** `pipeline.js` exports functions that describe WHAT each step does (read this state, run this prompt, write this output, update state to X). The drivers decide HOW to execute it (subprocess vs. Task tool).

```javascript
// core/pipeline.js — example interface

function getPlanStep(phase, spec, roadmap) {
  return {
    prompt: 'plan-phase.md',
    templateVars: { PHASE_NUMBER: phase.number, SPEC_CONTENT: spec, ROADMAP: roadmap },
    contextFiles: [spec.path, roadmap.path],
    outputDir: `.planning/phases/phase-${phase.number}/`,
    stateUpdate: (state) => { state.phases[phase.number].status = 'planned'; },
    requiresFreshContext: true,
  };
}

function getStrengthenStep(phase, planFile, spec) {
  return {
    prompt: 'strengthen-plan.md',
    templateVars: { PLAN_CONTENT: planFile.content, SPEC_CONTENT: spec },
    contextFiles: [planFile.path, spec.path],
    outputDir: `.planning/phases/phase-${phase.number}/`,
    stateUpdate: (state) => { state.phases[phase.number].plans_strengthened += 1; },
    requiresFreshContext: true,
  };
}

// ... same pattern for gate-check, code, verify, ivv, evidence, rtm, evidence-package
```

The CLI driver calls these to get step definitions, then executes via `claude-runner.js` subprocess.
The interactive driver (later) calls these to get step definitions, then executes via Task tool subagents.

**Critical rule:** `pipeline.js` must have ZERO knowledge of how steps are executed. It only describes the work. Drivers do the work.

#### 1c. Verification

After refactoring:
- All 32 existing integration tests still pass
- `overdrive init`, `overdrive run`, `overdrive status`, `overdrive resume`, `overdrive step` all work
- `briggsy-build run` silently works (alias)
- No functional changes — just restructured code

---

### Phase 2: CLI Driver Polish

**Goal:** The CLI driver (`drivers/cli-driver.js`) is the extracted orchestration logic from `orchestrator.js`, cleaned up and using the shared core interfaces.

- Phase loop lives here
- `claude` subprocess spawning lives here
- Parallel wave execution lives here
- All the crash recovery / state persistence logic lives here
- The `--upto` flag is added here too (it's useful in CLI mode as well)

#### The `--upto` Flag

Turns the pipeline into a controllable ratchet:

```bash
overdrive run spec.md --upto plan        # Just plan, let me review
overdrive resume --upto strengthen       # Strengthen those plans
overdrive resume --upto gate-check       # Check gates, I'll handle blockers
overdrive resume                         # Full send, no gate
```

Implementation: The phase loop checks `--upto` after each step completion. If current step matches the upto value, write state, log "Paused at [step]. Run `overdrive resume` to continue.", exit cleanly.

Valid `--upto` values: `plan`, `strengthen`, `gate-check`, `code`, `verify`, `ivv`, `evidence`, `rtm`, `evidence-package`

---

### Phase 3: Interactive Driver

**Goal:** A Claude Code slash command that drives the same pipeline via Task tool subagents, with human-in-the-loop and context self-management.

#### 3a. The Slash Command

File: `.claude/commands/overdrive.md` (or however the slash command system works in the target project)

The slash command is the **thin orchestrator**. Its only jobs:

1. **Read spec, ask clarifying questions** — evaluate the spec, identify ambiguities, ask the human before proceeding
2. **Read/write state** — `.planning/BUILD-STATE.md`, same format as CLI mode
3. **Decide what to dispatch next** — pipeline logic from shared core
4. **Dispatch subagents** — via Task tool, each gets a fresh context
5. **Read subagent results** — check outputs on disk
6. **Update state** — after each subagent completes
7. **Watch its own context** — self-management (see below)

**It must NEVER do the actual planning, strengthening, or coding itself.** That's how it stays thin.

#### 3b. Subagent Dispatch Pattern

Each heavy step becomes a Task tool invocation:

```
Orchestrator (slash command context):
  "I need to plan Phase 1. Dispatching subagent..."

  → Task tool: "You are a planning agent. Read the spec at [path] and the
    roadmap at [path]. Break Phase 1 into atomic plans following these
    instructions: [contents of plan-phase.md prompt with template vars filled].
    Write output to .planning/phases/phase-1/. When done, update state."

  ← Subagent completes, writes files to disk, exits.

Orchestrator reads results, updates state, decides next step.
```

The subagent gets:
- The filled prompt template (from shared core's pipeline.js)
- File paths to read (spec, roadmap, etc.)
- Output locations to write to
- Clear instructions to exit when done

The orchestrator gets back:
- Files on disk (plans, strengthened plans, code, etc.)
- Exit status (success/failure)

#### 3c. Context Self-Management

**Strategy: Aggressive pruning + checkpoint when needed (A+C pattern)**

**Pruning (C):** The orchestrator aggressively manages its own context:
- After each subagent completes, summarize the result in 2-3 sentences instead of keeping full output
- Drop completed plan content — only keep plan IDs and status
- Keep only active state: current phase, current step, what's next
- Never read large files into the orchestrator context — that's the subagent's job

**Checkpoint (A):** When the orchestrator detects it's getting heavy:
- Write full state to disk (already happening after every step)
- Print: "Context getting heavy. State saved. Run `/overdrive --resume` to continue with a fresh context."
- Exit cleanly
- New invocation reads state, picks up exactly where it left off

**Context tracking:** The orchestrator should maintain a rough estimate of tokens consumed. Since we can't directly measure, track:
- Number of subagent dispatch/result cycles (each adds ~500-1000 tokens of overhead)
- Number of human Q&A exchanges
- After ~15-20 cycles OR when the orchestrator notices degraded quality, trigger checkpoint

#### 3d. The `--upto` Flag (Interactive Mode)

Same as CLI mode. Especially useful here because the human is actively watching:

```
/overdrive spec.md --upto plan
  → Asks clarifying questions
  → Human answers
  → Dispatches planning subagents
  → "Planning complete. 4 plans in 2 waves. Run /overdrive --resume to strengthen."

/overdrive --resume --upto strengthen
  → Dispatches strengthening subagents (one per plan)
  → "Strengthening complete. 7 bugs caught. Run /overdrive --resume to continue."

/overdrive --resume
  → Full send from current state
```

#### 3e. Spec Evaluation & Clarifying Questions

This is unique to interactive mode and is a huge value-add. Before the pipeline starts:

1. Orchestrator reads the spec
2. Evaluates for: missing information, ambiguities, contradictions, scope concerns, missing acceptance criteria
3. Asks the human targeted questions: "Your spec mentions a REST API but doesn't specify auth. What auth model? JWT, API keys, OAuth?"
4. Human answers
5. Orchestrator writes an **enriched spec** to `.planning/enriched-spec.md` — original spec + answers to clarifying questions
6. Pipeline proceeds using the enriched spec

This step can be a single Task tool subagent (fresh context, full spec analysis) OR the orchestrator does it itself since it's early in the context window and the spec is the one thing worth reading in full.

---

## Shared State Format

No changes needed to `.planning/BUILD-STATE.md` — the current format works for both modes. Add one field:

```yaml
project:
  name: "Project Name"
  spec_file: "path/to/spec.md"
  enriched_spec_file: "path/to/enriched-spec.md"  # NEW — null if CLI mode / no questions asked
  started_at: "2026-03-07T10:00:00Z"
  status: running
  mode: cli  # NEW — 'cli' or 'interactive', informational only
  last_driver: cli  # NEW — tracks which driver last touched state
```

The `mode` and `last_driver` fields are informational — they don't gate anything. Either mode can always pick up from either mode's state.

---

## File Delivery from Track 2

The following files are already on disk from previous sessions:

| File | Purpose | Location |
|------|---------|----------|
| `banner.js` | CLI banner art (Happy Toyz + OVERDRIVE + tagline) | Already at `src/banner.js` |

---

## Locked Decisions

Everything from the existing handover remains locked. Additional locks from this session:

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Product name | **Overdrive** | Autonomous machines going hard. Maximum Overdrive IYKYK. |
| Hidden alias | `briggsy-build` | Easter egg. No docs. Just works. |
| Tagline | "NASA-grade rigor. One prompt." | The contrast IS the hook. |
| Banner art | Happy Toyz figlet + spaced OVERDRIVE | IYKYK reference. |
| Interactive driver | Claude Code slash command + Task tool | Subagents get fresh contexts. |
| Context management | A+C (prune aggressively + checkpoint) | Stretch the window, checkpoint when needed. |
| `--upto` flag | Both modes | Controllable ratchet. Pipeline stops cleanly at any step. |
| Shared core | `core/pipeline.js` describes work, drivers execute it | Zero coupling between pipeline logic and execution method. |
| Mode mixing | Fully supported | Start interactive, switch to CLI, switch back. State file is handshake. |

---

## Acceptance Criteria

### Phase 1 (Core Extract + Banner)
- [ ] `briggsy-build` alias works silently
- [ ] New banner displays on startup
- [ ] `core/pipeline.js` exports step definitions for all 9 pipeline stages
- [ ] `drivers/cli-driver.js` uses pipeline.js interface
- [ ] All 32 existing integration tests pass
- [ ] No functional regressions

### Phase 2 (CLI Polish)
- [ ] `--upto` flag works for all pipeline steps
- [ ] `overdrive resume` picks up from upto pause point
- [ ] State file records upto pause reason

### Phase 3 (Interactive Driver)
- [ ] Slash command `/overdrive` invokes the interactive driver
- [ ] Spec evaluation asks clarifying questions before pipeline starts
- [ ] Enriched spec written to disk
- [ ] Subagents dispatched via Task tool for plan/strengthen/code
- [ ] Each subagent gets a fresh context (verified)
- [ ] State updates after each subagent completion
- [ ] Context self-management: pruning keeps orchestrator thin
- [ ] Context self-management: checkpoint triggers when needed
- [ ] `--upto` works in interactive mode
- [ ] Can resume a CLI-started project in interactive mode (and vice versa)

---

*Let's ride.* 🔨
