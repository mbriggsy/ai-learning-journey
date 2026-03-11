# Future Plan: Maximum Overdrive — CE Orchestration Engine
*Written March 2026 — for MO v3 / next evolution*

---

## The Problem This Solves

CE's `/slfg` runs the full pipeline in **one context window**. For a single feature, that's fine.
For a 5-phase project like racer-04, the context fills up, quality degrades, and CE forgets
decisions it made 40K tokens ago.

The current workflow: human manages sessions manually. Open Claude Code. Run plan. Kill window.
Open new window. Run deepen. Kill window. Open new window. Run work. Repeat 12+ times.

**That's 12 manual handoffs across 5 phases.** Each one is a context reset the human manages
by hand. Briggsy is the orchestrator right now. Briggsy shouldn't have to be.

---

## What Exists Today

### Maximum Overdrive v2 (slash-command orchestrator)
- **Path:** `C:\Users\brigg\ai-learning-journey-private\maximum overdrive`
- **Architecture:** Claude Code slash-command (`/overdrive-maximum`) that runs the full
  GSD-style pipeline *inside* one Claude Code session
- **Pipeline:** Spec → Plan → Strike Team Strengthen (24 agents) → Execute → Verify (6 agents)
- **Limitation:** Still runs in one context window. Built for GSD's architecture, not CE's.

### CE Workflow (as-is)
- **Architecture:** Manual slash-command sequence inside Claude Code
- **Pipeline:** `/workflows:plan` → `/deepen-plan` → `/workflows:work` → `/workflows:review` → `/ce:compound`
- **Artifacts:** Each step writes files to disk (`docs/plans/`, `docs/reviews/`, etc.)
- **Limitation:** Human manages every context reset by hand

### Key Insight
CE already writes artifacts between steps. `/workflows:plan` produces a plan file.
`/deepen-plan` reads it and writes a hardened version. `/workflows:work` reads the hardened plan.
**The steps are already decoupled through the filesystem.** An external runner just needs to
call `claude` for each step and check that the expected artifact appeared.

---

## The Vision: MO CE Runner

An external Node.js script that orchestrates the full CE pipeline autonomously:

```
runner.js
  │
  ├── Step 1: claude --print "/workflows:plan [description]"
  │    → wait for exit
  │    → check: docs/plans/YYYY-MM-DD-*.md exists?
  │    → YES: proceed | NO: halt + report
  │
  ├── Step 2: claude --print "/deepen-plan"
  │    → wait for exit
  │    → check: plan file modified? (mtime changed)
  │    → YES: proceed | NO: halt + report
  │
  ├── Step 3: claude --print "/workflows:work"
  │    → wait for exit
  │    → check: new source files in src/ ? test suite passes?
  │    → YES: proceed | NO: halt + report
  │
  ├── Step 4: claude --print "/workflows:review"
  │    → wait for exit
  │    → check: review output file exists?
  │    → YES: proceed | NO: halt + report
  │
  └── Step 5: claude --print "/compound-engineering:resolve_todo_parallel"
       → wait for exit
       → check: CLAUDE.md updated? todos cleared?
       → YES: PHASE COMPLETE | NO: halt + report
```

Each step = fresh 200K context. No context rot. No manual handoffs.

---

## Architecture Design

### Runner Script (`scripts/ce-runner.js` or `bin/overdrive-ce.js`)

```javascript
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const STEPS = [
  {
    name: 'Plan',
    command: (desc) => `claude --print "/workflows:plan ${desc}"`,
    successCheck: () => fs.readdirSync('docs/plans').some(f => f.endsWith('.md')),
    artifact: 'docs/plans/',
  },
  {
    name: 'Deepen Plan',
    command: () => `claude --print "/deepen-plan"`,
    successCheck: () => planFileRecentlyModified(),
    artifact: 'docs/plans/ (modified)',
  },
  {
    name: 'Work',
    command: () => `claude --print "/workflows:work"`,
    successCheck: () => testSuitePassses() && newSourceFilesExist(),
    artifact: 'src/ (new files)',
  },
  {
    name: 'Review',
    command: () => `claude --print "/workflows:review"`,
    successCheck: () => fs.existsSync('docs/reviews/latest.md'),
    artifact: 'docs/reviews/',
  },
  {
    name: 'Compound',
    command: () => `claude --print "/compound-engineering:resolve_todo_parallel"`,
    successCheck: () => todosCleared(),
    artifact: 'CLAUDE.md (updated)',
  }
];
```

### Success Signals Per Step

| Step | Artifact Signal | Failure Signal |
|------|----------------|----------------|
| Plan | `docs/plans/YYYY-MM-DD-*.md` exists | No plan file after timeout |
| Deepen | Plan file mtime newer than before step | Plan file unchanged |
| Work | New files in `src/`, tests pass (`pnpm test` exit 0) | Test failure or no new files |
| Review | `docs/reviews/` has new file | No review file |
| Compound | `CLAUDE.md` mtime updated | CLAUDE.md unchanged |

### Error Handling

```
STEP FAILED: Work (Phase 2)
  Reason: Test suite failed (12 tests failing)
  Artifacts produced: src/renderer/TrackRenderer.ts
  Last claude output saved to: .overdrive/logs/phase-2-work-error.txt

Options:
  [R] Retry this step
  [S] Skip and continue (dangerous)
  [H] Halt and hand off to human
  [D] Debug mode - show full claude output
```

### Phase Management

The runner doesn't just manage steps — it manages **phases**. Each phase is a full
Plan → Deepen → Work → Review → Compound cycle:

```
overdrive-ce run --phase 0 --description "Build autonomous asset generation pipeline"
overdrive-ce run --phase 1 --description "Asset pipeline and track redesign"
overdrive-ce run --phase 2 --description "Core visual upgrade"
# etc.
```

Or run all phases from a manifest file:

```yaml
# overdrive/phases.yaml
phases:
  - id: 0
    name: Asset Generation
    description: "Build autonomous asset generation pipeline per ADR-02 and ADR-11"
    success_criteria: "scripts/generate-assets.ts exists and runs without error"
  - id: 1
    name: Asset Pipeline + Track Redesign
    description: "Asset processor, typed manifest, Track 2 + Track 3 geometry"
    success_criteria: "pnpm test passes, src/tracks/track02.ts and track03.ts exist"
```

---

## Integration with Maximum Overdrive v2

MO v2 already has:
- 24-agent Strike Team (the strengthen/deepen step)
- 6-agent verification team (the review step)
- Gate logic between phases
- Pipeline logging and evidence collection

**The CE Runner doesn't replace MO v2 — it extends it.**

CE's `/deepen-plan` IS the Strike Team step. The runner can optionally call
`/overdrive-strengthen` instead of (or in addition to) CE's native `/deepen-plan` for
maximum Strike Team firepower.

```
STANDARD MODE (CE native):
  plan → /deepen-plan (CE's built-in) → work → review → compound

OVERDRIVE MODE (MO Strike Team):
  plan → /deepen-plan → /overdrive-strengthen (24 agents) → work → /overdrive-verify (6 agents) → compound

MAXIMUM OVERDRIVE MODE (full pipeline):
  plan → /deepen-plan → /overdrive-strengthen → work → tests → /overdrive-verify → gap-closure loop → compound
```

---

## What Needs to Be Built

### Phase 1: Proof of Concept (Simple)
- [ ] PowerShell script `scripts/ce-phase-runner.ps1` for racer-04
- [ ] Hardcoded 5-step CE pipeline (plan → deepen → work → review → compound)
- [ ] File-existence success checks
- [ ] Basic error halt + log output to file
- [ ] Test on one racer-04 phase

### Phase 2: Node.js Runner (Reusable)
- [ ] `bin/overdrive-ce.js` in Maximum Overdrive repo
- [ ] `overdrive/phases.yaml` manifest format
- [ ] Proper success/failure detection per step type
- [ ] Retry logic (configurable retry count per step)
- [ ] `--phase N` targeting + `--from-phase N` resume
- [ ] Human gate option (prompt before each step)

### Phase 3: MO Integration
- [ ] `overdrive-ce run --mode maximum` triggers MO Strike Team on deepen step
- [ ] MO verification team replaces CE `/workflows:review` in overdrive mode
- [ ] Evidence package generated per phase (same as current MO v2 pipeline)
- [ ] Single command: `overdrive-ce run --all` runs all phases from manifest

---

## Key Technical Questions to Validate First

1. **Does `claude --print` support slash commands?**
   Test: `claude --print "/workflows:plan test"` — does it execute the plan workflow
   or just echo the text? If slash commands don't work in `--print` mode, we need a
   workaround (pass the slash command content directly as a prompt).

2. **What's the working directory behavior?**
   When `claude --print` is called from an external script, does it use the current
   working directory as the project root? (It should, but needs validation.)

3. **Does CE write consistent artifact paths?**
   The success checks depend on predictable artifact locations. Validate that
   `/workflows:plan` always writes to `docs/plans/` and not somewhere else.

4. **Timeout handling?**
   Some CE steps (especially Work on complex phases) could run for 10-30 minutes.
   The runner needs configurable timeouts with graceful handling vs hard kills.

---

## Why This Is MO v3

MO v1: Markdown-based concept (never fully built as a runner)
MO v2: Claude Code slash-command orchestrator (runs inside one session — context limit)
**MO v3: External runner + CE integration (fresh context per step — no context limit)**

The philosophical difference:
- MO v2 orchestrates *from inside* Claude Code
- MO v3 orchestrates *from outside* Claude Code, calling it as a subprocess

This is the same insight that made Maximum Overdrive valuable in the first place:
*"You can't orchestrate from inside the thing you're orchestrating."*

MO v2 partially solved this for GSD. MO v3 solves it fully for CE.

---

## Suggested Next Steps

1. **Validate the POC** — before building anything fancy, test one `claude --print` call
   with a CE slash command manually in racer-04. Confirm it works.
   ```powershell
   cd "C:\Users\brigg\ai-learning-journey\projects\top-down-racer-04"
   claude --print "/workflows:plan test prompt"
   ```

2. **Build the simple PowerShell runner** for racer-04 immediately — don't wait for the
   Node.js version. Use it on Phase 1. Learn from it.

3. **Once validated on racer-04**, port to Node.js and add to Maximum Overdrive as
   `overdrive-ce` subcommand.

4. **MO integration last** — get the CE runner working clean before adding the 24-agent
   Strike Team on top.

---

*This doc is a roadmap, not a spec. Build the POC first. Then write the real spec.*
*— Harry 🧙, March 2026*
