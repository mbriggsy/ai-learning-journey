# HANDOVER — Autonomous Build Orchestrator

*From: v03 build attempt — March 6, 2026*
*Project: Build a proper external orchestrator to replace gsd-autopilot*

---

## Why This Project Exists

### The Journey

**v02 (Top-Down Racer):** Built a complete racing game with AI opponent using GSD + Compound Engineering. Zero hand-written game code. 366+ tests. The `/deepen-plan` step (Compound Engineering) caught real bugs in 15 out of 15 runs — including critical defects that would have killed AI training entirely. The methodology worked.

**v03 attempt:** Built `gsd-autopilot` — a meta-orchestrator designed to automate the full GSD lifecycle: plan → deepen → execute → verify, with human gates for things only humans can do (asset generation, quality checks). The autopilot's DESIGN was sound. Its EXECUTION MODEL was fundamentally broken.

### What Went Wrong

The autopilot was implemented as a Claude Code slash command — a markdown file loaded into Claude's context window. The problem: **a prompt running inside a context window cannot spawn fresh context windows.** It can't programmatically chain `/gsd:plan-phase` → `/deepen-plan` → `/gsd:execute-phase` as separate processes.

What actually happened:
1. Autopilot initialized correctly (parsed spec, created roadmap, wrote state)
2. Hit "spawn subagent" step → **can't actually do this**
3. Punted to human: "run this command in a fresh context"
4. Human advisor (me) said "just use GSD's `--auto` flag"
5. `--auto` chains plan → execute → verify — **skipping `/deepen-plan` entirely**
6. The ENTIRE POINT of the autopilot was to enforce deepening between plan and execute
7. Money burned on undeepened execution. Build killed.

### The Root Cause

**You cannot orchestrate from inside the thing you're orchestrating.** A slash command running inside Claude Code IS Claude Code. It can't control Claude Code's lifecycle, spawn separate processes, or enforce workflow steps. It's a to-do list expecting the paper to do the tasks.

### The Solution

**The orchestrator must live OUTSIDE Claude Code.** A Node.js CLI that calls `claude` as a subprocess. Each step is a separate `claude` invocation = guaranteed fresh context window. The script manages state between invocations. The script enforces the workflow. No step can be skipped because the script controls what gets called next.

---

## What We're Building

A **Node.js CLI tool** that autonomously drives software projects from spec to shipped product. It sits above Claude Code the same way a CI/CD pipeline sits above build tools — it orchestrates, enforces, and tracks.

**Working name:** `briggsy-build` (or whatever feels right)

### The Atomic Unit

One `claude` CLI invocation = one fresh 200K context window = one focused task.

Everything else is the script reading files, making decisions, and calling Claude again. The orchestrator itself never runs out of context because it's not using context — it's code.

### The Workflow It Enforces

```
For each phase:
  PLAN      → claude invocation → plans written to disk
  DEEPEN    → claude invocation per plan → bugs caught, plans corrected (MANDATORY)
  GATE CHECK → script logic (file checks, no AI needed)
  EXECUTE   → claude invocation per plan → code written, atomic commits
  VERIFY    → claude invocation → tests run, pass/fail
```

**Deepening is mandatory.** The script literally will not call execute until all plans are deepened. This is the whole point. The `--auto` footgun doesn't exist because GSD's auto-chain is never used.

### What It Replaces

| Old | New | Why |
|-----|-----|-----|
| GSD slash commands | Claude CLI invocations driven by external script | Fresh context guaranteed, workflow enforced |
| Compound Engineering `/deepen-plan` | Custom deepening prompts | No plugin dependency, same concept |
| gsd-autopilot (slash command) | Node.js CLI | Lives outside Claude Code, can actually orchestrate |
| Manual `/clear` between steps | Automatic — each `claude` call is separate | Human can't forget or skip |

### What It Keeps

The THINKING from the autopilot design is solid. Keep all of it:

- **State tracking** — AUTOPILOT-STATE.md pattern (YAML in markdown, git-trackable)
- **Gate evaluator** — detecting when human intervention is needed
- **Dependency analyzer** — mapping phase dependencies for skip-ahead
- **Skip-ahead logic** — when blocked, evaluate what can proceed independently
- **Human gates** — external-action, approval, quality-check, decision types
- **Wave analysis** — independent plans run in parallel, dependent plans run serial
- **Atomic commits** — one plan = one git commit = bisectable history

---

## Context: The Tools That Exist

### GSD (Get Shit Done)
- Open source Claude Code orchestration framework
- Installs as slash commands: `/gsd:new-project`, `/gsd:plan-phase`, `/gsd:execute-phase`, `/gsd:verify-work`
- Creates phased roadmaps, atomic plans, wave-based execution
- Good at: planning, execution structure, atomic commits
- Bad at: enforcing deepening, chaining across fresh contexts
- **Our orchestrator replaces GSD's orchestration but can borrow its prompting patterns**

### Compound Engineering
- Claude Code plugin with research agents
- `/deepen-plan` dispatches 10-12 specialized agents to review a plan
- Catches real bugs before execution — proven 15/15 in v02
- **Our orchestrator replaces the `/deepen-plan` command but implements the same concept: multi-agent plan review before execution**

### Claude CLI
- `claude` command line tool
- Can run with prompts: `claude -p "your prompt here"`
- Each invocation = fresh 200K context window
- Can read files, write files, run commands
- **This is our execution engine. Every step is a `claude` invocation.**

### MCP Servers (Context7, Serena, Sequential Thinking)
- Augment Claude Code with live docs, semantic navigation, structured reasoning
- These still work with `claude` CLI invocations
- **Keep using these — they're orthogonal to orchestration**

---

## Key Design Decisions (Pre-Locked)

These are settled. Don't revisit them during implementation.

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Implementation language | Node.js | Same ecosystem as the projects it orchestrates. Briggsy's stack. |
| Execution model | External CLI calling `claude` subprocess | The whole point — orchestrator lives OUTSIDE Claude Code |
| State persistence | Markdown + YAML files in `.planning/` | Git-trackable, human-readable, survives crashes |
| Deepening | Mandatory, script-enforced | v02 proved 15/15 bug catches. Non-negotiable. |
| Plan granularity | ~50% of context window per plan | Prevents context rot. Proven in v02. |
| Git integration | Atomic commit per plan execution | Bisectable history. Proven in v02. |
| GSD dependency | NONE — standalone tool | No black box dependencies. We control the full workflow. |
| CE dependency | NONE — standalone tool | Deepening concept kept, plugin dependency removed. |

---

## v02 Evidence That Informs This Design

These aren't theoretical — they're measured results from v02:

| Finding | Evidence | Design Implication |
|---------|----------|--------------------|
| Context rot starts at 50% utilization | Quality degradation observed in v02 | Plans target 50% of context window max |
| Deepening catches bugs every time | 15/15 runs found real defects | Deepening is mandatory, never skippable |
| Fresh context = consistent quality | Task 50 same quality as Task 1 | Every step is a fresh `claude` invocation |
| Atomic commits enable bisection | 80+ commits, could trace any bug to its source | One plan = one commit |
| Wave parallelization works | Independent plans executed in parallel successfully | Dependency analysis enables parallel execution |
| Reward function bug caught pre-execution | Would have killed AI training entirely | Pre-execution review is not optional |
| Architecture boundary violations caught | Engine/renderer leak found by automated review | Boundary verification should be a standard step |

---

## Success Criteria

1. **The orchestrator runs from terminal**, not from inside Claude Code
2. **Each step is a fresh `claude` invocation** — verified by checking process spawning
3. **Deepening cannot be skipped** — the script won't proceed without it
4. **State survives crashes** — kill the script, restart, it picks up where it left off
5. **Human gates pause cleanly** — blocked work stream stops, independent work continues
6. **Tested on a toy project first** — NOT on a real build until the orchestrator itself is proven

---

## Files in This Handover

| File | Purpose |
|------|---------|
| `HANDOVER-orchestrator-project.md` | This document — the story and context |
| `ORCHESTRATOR-ARCHITECTURE-SPEC.md` | Technical spec for what to build |
| `LESSONS-LEARNED.md` | Detailed failure analysis and design principles |

---

*— End of Handover —*
