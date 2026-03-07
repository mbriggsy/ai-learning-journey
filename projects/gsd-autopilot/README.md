# /gsd-autopilot — Autonomous Project Orchestrator

**The meta-orchestrator that sits above GSD and Compound Engineering.**

Feed it a spec. Walk away. It runs the full GSD lifecycle — plan every phase, deepen every
plan, execute every plan, verify at boundaries — spawning fresh context windows each time.
When it hits something only a human can do, it pauses, tells you exactly what it needs,
skips ahead to whatever it CAN do, and waits for you to come back.

---

## Prerequisites

- **Claude Code** — the autopilot runs as a Claude Code slash command
- **GSD** — installed and configured (`npx get-shit-done-cc`)
- **Compound Engineering** (optional) — for `/deepen-plan` pre-execution review.
  If not installed, the autopilot skips deepening gracefully.

---

## Installation

Copy one folder into your project:

```bash
# Copy the entire .claude/ directory (command + internals)
cp -r .claude/commands/gsd-autopilot.md  YOUR_PROJECT/.claude/commands/
cp -r .claude/gsd-autopilot/             YOUR_PROJECT/.claude/gsd-autopilot/
```

That's it. Everything lives under `.claude/`. No npm install, no dependencies, no build step.
The autopilot is ~5 markdown files that compose GSD and CE commands.

---

## Usage

### Start a Build

```
/gsd-autopilot start
```

The autopilot will:
1. Find your spec and ROADMAP.md
2. Parse phases and pre-declared human gates
3. Initialize AUTOPILOT-STATE.md
4. Begin the phase loop autonomously

### Check Progress

```
/gsd-autopilot status
```

Read-only. Shows which phases are complete, in progress, blocked, or pending.

### Resume After a Gate

When the autopilot pauses for human input, it writes clear instructions to
`.planning/HUMAN-GATES.md`. After you've done what it asked:

```
/gsd-autopilot resume
```

The autopilot checks what gates are resolved and picks up where it left off.

---

## How It Works

```
Spec → ROADMAP → For each phase:
  Plan (fresh context) → Deepen (fresh context) → Execute (fresh context) → Verify (fresh context)
  
  If blocked → skip ahead to independent phases → pause when nothing's left
  If resumed → pick up blocked phases first → continue forward
```

### Skip-Ahead: The Key Feature

Most orchestrators stop when they hit a wall. This one evaluates what work is independent
of the block and keeps going. Example from a visual game project:

- Phase 2 (visual upgrade) needs assets you generate externally
- Phase 3 (post-processing shaders) has zero asset dependency
- Phase 5 (AI training) is headless — doesn't care about visuals

The autopilot blocks Phase 2, skips ahead to plan + deepen + execute Phases 3 and 5,
and when you come back with assets, Phase 2 is the only thing left.

### Human Gates

Four gate types the autopilot recognizes:

| Type | Example | What Happens |
|------|---------|-------------|
| `external-action` | Generate images in Nano Banana | Autopilot writes detailed spec, pauses, skips ahead |
| `approval` | Approve track geometry before training | Autopilot pauses at checkpoint, asks for sign-off |
| `quality-check` | "Does this look like a real game?" | Autopilot pauses after execution, asks for review |
| `decision` | Unexpected architectural choice surfaced | Autopilot pauses, presents options, waits for call |

Gates can be **pre-declared** in your spec (the autopilot reads them at init) or
**discovered** during execution (deepening surfaces an unresolved question).

---

## File Map

```
your-project/
├── .claude/commands/
│   └── gsd-autopilot.md           ← Slash command entry point
│
├── .claude/gsd-autopilot/
│   ├── gsd-autopilot-workflow.md               ← Phase loop orchestrator (the brain)
│   ├── gsd-autopilot-gate-evaluator.md         ← Agent: detects human gates
│   ├── gsd-autopilot-dependency-analyzer.md    ← Agent: maps dependencies for skip-ahead
│   └── templates/
│       ├── gsd-autopilot-state-template.md     ← Blank state (populated at init)
│       └── gsd-autopilot-human-gates-template.md ← Blank gates file (populated at init)
│
├── .planning/                     ← Created by GSD + autopilot at runtime
│   ├── AUTOPILOT-STATE.md        ← The autopilot's brain (created at /gsd-autopilot start)
│   ├── HUMAN-GATES.md            ← What you read when it pauses (created at /gsd-autopilot start)
│   ├── ROADMAP.md                ← GSD roadmap (autopilot reads this)
│   └── phases/                    ← GSD's per-phase plans
```

---

## Writing Specs for Autopilot

The autopilot is only as good as the spec it reads. Tips for autopilot-friendly specs:

1. **Declare gates explicitly.** If you know a phase needs external assets or human approval,
   say so in the phase description. The autopilot reads these at init.

2. **Lock your design decisions.** Every ADR in the spec is a question the autopilot
   won't need to ask you. Unlocked decisions become `decision` gates that pause execution.

3. **Describe phase dependencies.** If Phase 5 is headless and doesn't need Phase 2's
   visual output, say that. The dependency analyzer uses this to make skip-ahead decisions.

4. **Define success criteria per phase.** Objective criteria (tests pass, files exist)
   let the autopilot verify automatically. Subjective criteria ("looks professional")
   become quality-check gates.

---

## Portability

The autopilot is project-agnostic. To use on a new project:

1. Copy `.claude/commands/gsd-autopilot.md` and `.claude/gsd-autopilot/` to the new project
2. Write your spec and run `/gsd:new-project` to create ROADMAP.md
3. Run `/gsd-autopilot start`

No configuration needed. The autopilot reads whatever spec and roadmap it finds.

---

*Zero hand-written game code. Zero hand-driven build steps. The human makes decisions. The agent builds.*
