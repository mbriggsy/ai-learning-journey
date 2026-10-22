# GSD (Get Shit Done) — Deep Dive

The context engineering layer that makes Claude Code reliable at scale.

---

## What Is GSD?

GSD is a lightweight, open-source meta-prompting and spec-driven development system for Claude Code (and now OpenCode, Gemini CLI, and Codex). It acts as a complete development lifecycle wrapper — interviewing you about what you want to build, creating detailed specs and roadmaps, executing tasks with fresh subagents, and verifying everything actually works. The complexity lives in the system, not in your workflow.

**By:** TÂCHES (glittercowboy)  
**License:** MIT  
**GitHub:** [github.com/gsd-build/get-shit-done](https://github.com/gsd-build/get-shit-done) — ⭐ 20.6K stars  
**Install:** `npx get-shit-done-cc`  
**Lesson:** [ccforeveryone.com/gsd](https://ccforeveryone.com/gsd)

---

## The Problem It Solves: Context Rot

Context rot is the progressive degradation of AI accuracy as the session accumulates tokens. It's not your imagination — Claude's quality measurably drops as the context window fills:

- **0–30% context:** Peak quality. Thorough, comprehensive, remembers everything.
- **50%+:** Starts rushing. "I'll be more concise." Cuts corners.
- **70%+:** Hallucinations. Forgotten requirements. Inconsistent output.

Traditional spec-driven frameworks (BMAD, SpecKit, Taskmaster) share a structural limitation: they execute planning, research, development, and verification in a single context window. The longer the session, the worse the output.

GSD inverts this. Instead of one long session that gradually degrades, it spawns fresh Claude instances for each task. Each subagent gets a clean 200K token context window. Task 50 runs just as sharp as Task 1.

---

## The GSD Lifecycle

### 1. Discuss

GSD interviews you about your project — asking detailed questions to extract requirements, edge cases, and design decisions. This isn't a formality; developers consistently report that GSD's questions surface aspects of the project they hadn't considered.

Everything you discuss gets written to markdown files in the `.planning/` directory, creating a persistent spec that survives across sessions.

### 2. Research

Spawns parallel research agents to investigate technical approaches, evaluate libraries, and assess feasibility. Your main context stays clean while agents do the heavy lifting.

### 3. Plan

Creates a complete spec, roadmap, and phased execution plan broken into milestones. Each milestone contains small, atomic plans — 2–3 tasks each, designed to fit in ~50% of a fresh context window. No single task is big enough to degrade quality.

Plans are prompts — the PLAN.md file isn't a document that becomes a prompt. It IS the executable instruction that subagents read directly.

### 4. Execute

Work cannot begin until the phase is planned. During execution:

- **Waves** — Independent tasks run in parallel. Dependent tasks wait. Wave 1 might run three plans simultaneously. Wave 2 waits for Wave 1.
- **Fresh contexts** — Each agent gets a full 200K context. No degradation from first task to last.
- **Atomic commits** — Each task gets its own commit. Git bisect finds exact failing tasks. Each task is independently revertable.

### 5. Verify

Goal-backward verification: Instead of "what tasks did we do?" GSD asks "what must be TRUE for this to work?" You test observable behaviors, not implementation details. If something fails, debug agents spring into action.

---

## Architecture

### Installation Structure

```
~/.claude/
├── commands/gsd/           # 35+ slash commands
│   ├── help.md
│   ├── new-project.md
│   ├── progress.md
│   ├── execute-phase.md
│   ├── quick.md
│   └── ...
├── agents/                 # Specialized subagents
│   ├── gsd-executor.md
│   ├── gsd-planner.md
│   ├── gsd-verifier.md
│   ├── gsd-researcher.md
│   └── 7+ more
├── get-shit-done/
│   ├── workflows/          # 30+ workflow templates
│   ├── references/         # Methodology docs
│   └── VERSION
├── hooks/
│   ├── gsd-statusline.js   # Status bar integration
│   └── gsd-update-check.js # Version check
└── settings.json           # Claude Code config
```

### Project Structure

```
your-project/
└── .planning/
    ├── config.json          # Project settings, model profiles
    ├── project-spec.md      # Full specification
    ├── roadmap.md           # Phase breakdown
    ├── milestones/          # Milestone definitions
    ├── plans/               # Executable task plans
    └── checkpoints/         # Verification records
```

Single GSD installation serves multiple projects. Project state lives in `.planning/` per-project.

---

## Key Commands

| Command | What It Does |
|---|---|
| `/gsd:new-project` | Initialize a new project with the discuss phase |
| `/gsd:quick "task"` | Quick mode — fresh agent guarantees, skips heavy planning |
| `/gsd:execute-phase` | Execute the current phase plan |
| `/gsd:progress` | View current session status and phase progress |
| `/gsd:check-todos [area]` | Review and manage task list |
| `/gsd:verify-work` | Run verification against completed work |
| `/gsd:settings` | Configure models, workflow toggles, git branching |
| `/gsd:update` | Update GSD to latest version |
| `/gsd:help` | Full command reference |

### Quick Mode

For smaller tasks that don't need the full lifecycle:

```
/gsd:quick "Add dark mode toggle to settings page"
```

Same fresh-agent guarantees. Skips the heavy planning phases. Good for feature additions, bug fixes, and enhancements where the scope is clear.

---

## Model Profiles

GSD lets you control which Claude model each agent uses, balancing quality vs. token spend:

| Profile | Planning | Execution | Verification |
|---|---|---|---|
| **Quality** | Sonnet 4 | Sonnet 4 | Sonnet 4 |
| **Balanced** | Sonnet 4 | Haiku | Haiku |
| **Budget** | Haiku | Haiku | Haiku |

Configure via `/gsd:settings` or directly in `.planning/config.json`. You can also set per-stage overrides within any profile.

### Optional Subagents

These spawn additional agents during planning/execution. They improve quality but add tokens and time:

- Research agents (investigate technical approaches)
- Debug agents (diagnose verification failures)
- Review agents (cross-check implementation)

Toggle via `/gsd:settings`.

---

## Git Integration

GSD manages branching during execution:

- **Atomic commits** per task — each is surgical, traceable, and independently revertable
- **Git bisect** finds exact failing task
- **Squash merge** (recommended) or merge with history at milestone completion
- Clear history for Claude in future sessions
- Better observability in AI-automated workflows

---

## Cross-Tool Compatibility

GSD now natively supports multiple runtimes:

```bash
npx get-shit-done-cc          # Claude Code
npx gsd-opencode              # OpenCode
# Also: Gemini CLI, Codex (via skills)
```

Community ports:
- **rokicool/gsd-opencode** — OpenCode adaptation with enhanced model management
- Gemini CLI uses TOML configuration format
- Codex uses skills (skills/gsd-*/SKILL.md) rather than custom prompts

---

## Real-World Results

**Blake Watson** built a complete macOS accessibility tool in a single coding session using GSD. The app was code-signed, notarized, and published to GitHub. He noted that GSD's planning phase surfaced project aspects he hadn't considered and that the token expenditure, while significant, was a worthwhile investment compared to the cumulative cost of failed unstructured attempts.

**Esteban Torres** used GSD to build a BlogWatcher GUI from a blank canvas. At the end of a single session, he had a working product with plans and roadmaps left in the codebase for future reference. His key takeaway: the research phase could be streamlined when architecture is already clear, but the planning phase consistently delivered the most value.

**The New Stack** covered GSD in a multi-part series, noting that GSD's question-driven approach produced detailed project planning that extracted sensible steps from vague descriptions, with the planning structure managed entirely by GSD rather than defined by the user.

---

## When to Use It

**Ideal for:**
- Building projects from scratch (greenfield development)
- Complex features spanning multiple files and concerns
- Solo developers who want structured, reliable output
- Anyone who's had Claude "forget" what they're building mid-session
- Projects where you want a persistent spec and documentation trail

**Quick mode for:**
- Feature additions, bug fixes, enhancements
- Tasks where scope is clear and planning overhead isn't needed
- Smaller changes that still benefit from fresh agent contexts

**Skip when:**
- Trivial one-liner changes
- Exploratory prototyping where you don't know what you want yet
- Work that needs constant human judgment at every step

---

## Watch Out For

- **Token consumption is real** — GSD's planning phases burn tokens aggressively. The philosophy is this saves tokens overall by avoiding failed attempts, but monitor your usage. Multiple users report blowing through their Claude Pro monthly allocation quickly.
- **Command syntax issue** — After a Jan 2026 Claude Code update, colon-syntax commands (`/gsd:help`) had issues in some configurations. Workaround: move commands from `~/.claude/commands/gsd/` to `~/.claude/commands/` if needed. This has since been addressed.
- **GSD evolves fast** — Update periodically with `/gsd:update`. Breaking changes can happen between versions.
- **Prompt injection risk** — One developer noted caution about running external prompt sources directly on your machine. Consider sandboxing for untrusted projects.

---

## Pairs Well With

- **Agent Teams** — Use GSD for the discuss/research/planning phases, then hand the execution plan to Agent Teams for parallel implementation
- **Claude-Mem** — GSD captures specs in files; Claude-Mem captures session context in memory. Complementary persistence.
- **Serena** — GSD plans what to build; Serena helps Claude understand the existing codebase while building it
- **Compound Engineering** — Similar philosophy (plan → work → review → compound) but different execution model. Compound focuses on institutional learning; GSD focuses on fresh-context execution.

---

*Last updated: February 2026*
