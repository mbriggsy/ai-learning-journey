# ORCHESTRATOR ARCHITECTURE SPEC

*The technical blueprint. What to build, how it works, where the boundaries are.*

---

## Overview

A Node.js CLI tool that drives autonomous software development from spec to shipped product. It calls `claude` CLI as a subprocess for each step, enforcing a mandatory workflow: plan → deepen → execute → verify. State is persisted to disk between invocations. Human gates pause work streams without blocking independent work.

---

## CLI Interface

```bash
# Initialize a new project from a spec file
briggsy-build init <spec-file>

# Start or resume autonomous execution
briggsy-build run

# Check status (read-only)
briggsy-build status

# Resume after resolving a human gate
briggsy-build resume

# Run a single step manually (escape hatch)
briggsy-build step <phase> <step-name>
```

### `init`
- Reads the spec file
- Calls `claude` to create a phased roadmap (phases, descriptions, dependencies)
- Scans spec for pre-declared human gates
- Writes initial state to `.planning/BUILD-STATE.md`
- Commits: "build: initialized from [spec name]"

### `run`
- Reads state from disk
- Enters the phase loop (see below)
- Runs until all phases complete OR all work is blocked by gates
- Can be killed safely at any point — state is on disk

### `status`
- Reads and prints state. No execution. No side effects.

### `resume`
- Checks for resolved gates (files exist? human confirmed?)
- Updates state, re-enters phase loop

### `step`
- Manual override for a single step. Escape hatch, not normal workflow.
- Use when debugging or when automatic flow hit an edge case.

---

## The Phase Loop

```
WHILE any phase status != complete:

  1. Select next actionable phase:
     priority: resumed-from-gate > in-progress > next-pending > skip-ahead-target

  2. Route based on phase status:
     pending    → PLAN
     planned    → DEEPEN
     deepened   → GATE CHECK → EXECUTE
     executed   → VERIFY
     blocked    → SKIP-AHEAD EVALUATION
     complete   → next phase

  3. After EVERY step:
     - Write state to disk (crash-safe)
     - Git commit state file
     - Log to execution log (append-only)

  IF all phases complete → exit success
  IF all work blocked → print gate instructions → exit (wait for resume)
```

---

## Step Definitions

### PLAN

**Input:** Phase number, spec file, roadmap
**Output:** Atomic plan files in `.planning/phases/phase-N/`

```bash
claude -p "$(cat prompts/plan-phase.md)" \
  --context spec.md roadmap.md \
  > .planning/phases/phase-N/plans.md
```

The planning prompt instructs Claude to:
- Read the spec and roadmap for this phase
- Break the phase into atomic plans (each targeting ~50% context window)
- Identify dependencies between plans (which can run in parallel)
- Write each plan as a separate file with clear task descriptions, acceptance criteria, and file targets
- Organize into waves (independent plans in same wave = parallel execution)

**State update:** `phase.status = "planned"`, `phase.plans_total = count`

---

### DEEPEN (MANDATORY — NEVER SKIPPED)

**Input:** Each plan file from the PLAN step
**Output:** Reviewed/corrected plan files, bug report

```bash
# For EACH plan in the phase:
claude -p "$(cat prompts/deepen-plan.md)" \
  --context .planning/phases/phase-N/plan-01.md spec.md \
  > .planning/phases/phase-N/plan-01-deepened.md
```

The deepening prompt instructs Claude to:
- Act as multiple specialized reviewers (TypeScript expert, architecture reviewer, performance analyst, API documentation checker, race condition detector, etc.)
- Review the plan for: logical errors, API misuse, architecture violations, missing edge cases, performance issues, security issues, incorrect assumptions
- Produce a corrected plan with all found issues addressed
- List all bugs caught with severity ratings

**Parallelization rules:**
- Plans within a wave CAN be deepened in parallel (no dependencies)
- Plans across waves MUST be deepened serially (later plans may depend on corrections from earlier deepening)

**State update:** `phase.plans_deepened += 1`, bugs logged

**THE CRITICAL CONSTRAINT:** The script checks `plans_deepened === plans_total` before allowing the EXECUTE step. If any plan is not deepened, execution is blocked. This is enforced in code, not in prompts. No flag, no override, no `--skip-deepen`. The function that runs execution literally checks the count first.

---

### GATE CHECK

**Input:** Deepened plans, spec file, project file tree
**Output:** List of gates (if any), list of executable plans, list of blocked plans

This step can be mostly CODE, not Claude:

```javascript
// Check 1: Do any plans reference files that don't exist?
for (const plan of plans) {
  const referencedFiles = extractFileReferences(plan);
  const missing = referencedFiles.filter(f => !fs.existsSync(f));
  if (missing.length > 0) {
    gates.push({ type: 'external-action', missingFiles: missing, plan: plan.id });
  }
}

// Check 2: Does the spec declare a gate at this phase boundary?
const specGates = parseSpecGates(spec, phaseNumber);

// Check 3: Are there subjective quality criteria?
// (This one might need a claude call to evaluate)
```

For ambiguous cases, call Claude:
```bash
claude -p "$(cat prompts/gate-check.md)" \
  --context plans.md spec.md \
  > .planning/gate-check-phase-N.md
```

**State update:** Gates created (if any), plans classified as executable or blocked

---

### EXECUTE

**Input:** Deepened plan file, project codebase
**Output:** Code changes, atomic git commit

```bash
# For EACH plan (respecting wave order):
claude -p "$(cat prompts/execute-plan.md)" \
  --context .planning/phases/phase-N/plan-01-deepened.md CLAUDE.md \
  --allowedTools "Bash,Read,Write,Edit" \
  2>&1 | tee .planning/logs/execute-phase-N-plan-01.log
```

The execution prompt instructs Claude to:
- Read the deepened plan (which includes bug fixes from deepening)
- Implement everything described in the plan
- Run tests as it goes
- Produce a clean atomic commit with a descriptive message

**Parallelization:** Plans in the same wave execute in parallel (separate `claude` processes). Plans in different waves execute serially.

**Error handling:**
- If execution fails (tests don't pass, code doesn't compile):
  - Retry once with a fresh context that includes the error output
  - If second attempt fails: create a `decision` gate, block the plan

**State update:** `phase.plans_completed += 1`, commit hash logged

---

### VERIFY

**Input:** Phase number, spec success criteria, test suite
**Output:** Pass/fail with details

```bash
claude -p "$(cat prompts/verify-phase.md)" \
  --context spec.md .planning/phases/phase-N/plans.md \
  --allowedTools "Bash,Read" \
  > .planning/verification/phase-N-result.md
```

The verification prompt instructs Claude to:
- Run all tests relevant to this phase
- Check acceptance criteria from the plans
- Verify architecture boundaries haven't been violated
- Report pass/fail with specifics

**If PASS:** `phase.status = "complete"` → next phase
**If FAIL (auto-fixable):** Create fix plans → execute fixes → re-verify (max 2 cycles)
**If FAIL (needs human):** Create gate → block → skip-ahead evaluation

---

### SKIP-AHEAD EVALUATION

**Input:** Current state, roadmap, spec, blocked gate details
**Output:** List of phases/plans that can proceed independently

This is primarily CODE logic:

```javascript
function evaluateSkipAhead(state, roadmap, spec) {
  const blockedPhase = state.currentBlockedPhase;
  const results = [];

  for (const phase of roadmap.phases) {
    if (phase.number <= blockedPhase.number) continue;
    if (phase.status === 'complete') continue;

    const deps = analyzeDependencies(phase, blockedPhase, spec);

    if (deps.type === 'none') {
      results.push({ phase: phase.number, action: 'proceed', scope: 'full' });
    } else if (deps.type === 'soft') {
      results.push({ phase: phase.number, action: 'plan-and-deepen', scope: 'partial' });
    } else {
      results.push({ phase: phase.number, action: 'blocked' });
    }
  }

  return results;
}
```

For complex dependency analysis, call Claude:
```bash
claude -p "$(cat prompts/dependency-analysis.md)" \
  --context roadmap.md spec.md state.md \
  > .planning/skip-ahead-analysis.md
```

---

## Prompt Templates

The orchestrator ships with a `prompts/` directory containing markdown templates for each Claude invocation:

```
prompts/
  ├── plan-phase.md          ← "Break this phase into atomic plans..."
  ├── deepen-plan.md         ← "Review this plan as multiple specialists..."
  ├── execute-plan.md        ← "Implement this plan exactly as specified..."
  ├── verify-phase.md        ← "Verify this phase meets acceptance criteria..."
  ├── gate-check.md          ← "Evaluate if this phase needs human input..."
  ├── dependency-analysis.md ← "Map dependencies between these phases..."
  └── create-roadmap.md      ← "Create a phased roadmap from this spec..."
```

These are the prompts that make the system work. They encode the methodology — what a good plan looks like, how deepening reviews should work, what execution discipline means. **The prompts are the product.**

Each prompt template has variables that the script fills in:
```markdown
# Plan Phase {{PHASE_NUMBER}}

## Spec
{{SPEC_CONTENT}}

## Roadmap
{{ROADMAP_CONTENT}}

## Instructions
Break this phase into atomic plans. Each plan should...
```

---

## State Management

### File: `.planning/BUILD-STATE.md`

```yaml
project:
  name: "Project Name"
  spec_file: "path/to/spec.md"
  started_at: "2026-03-06T10:00:00Z"
  status: running  # pending | running | paused | completed | failed

phases:
  1:
    name: "Phase name"
    status: pending  # pending | planned | deepened | executing | complete | blocked
    plans_total: 0
    plans_deepened: 0
    plans_completed: 0
    blocked_by: null  # gate ID if blocked
    started_at: null
    completed_at: null

gates:
  GATE-001:
    phase: 2
    type: external-action
    summary: "Generate car sprites with Nano Banana"
    status: blocked  # pending | blocked | resolved
    blocked_at: "2026-03-06T12:00:00Z"
    resolved_at: null

skip_decisions:
  - blocked_phase: 2
    skipped_to: 3
    rationale: "Phase 3 (shaders) has zero dependency on Phase 2 (assets)"

log:
  - timestamp: "2026-03-06T10:00:00Z"
    action: init
    detail: "Initialized from Top-Down-Racer-v03-GSD-Spec.md"
  - timestamp: "2026-03-06T10:01:00Z"
    action: plan-phase
    phase: 1
    detail: "Phase 1 planned — 3 atomic plans"
```

### Rules
1. **Write after every step.** Not after every phase — after every step.
2. **Log is append-only.** Never edit or truncate.
3. **Gate IDs are sequential.** Never reuse.
4. **Git commit state at phase boundaries.**

---

## Project Structure

```
briggsy-build/
  ├── bin/
  │   └── briggsy-build.js       ← CLI entry point
  ├── src/
  │   ├── orchestrator.js         ← Phase loop engine
  │   ├── claude-runner.js        ← Wraps `claude` CLI invocations
  │   ├── state-manager.js        ← Reads/writes BUILD-STATE.md
  │   ├── gate-evaluator.js       ← Detects human gates
  │   ├── dependency-analyzer.js  ← Maps phase dependencies
  │   ├── plan-parser.js          ← Reads/parses plan files
  │   └── logger.js               ← Append-only execution log
  ├── prompts/
  │   ├── plan-phase.md
  │   ├── deepen-plan.md
  │   ├── execute-plan.md
  │   ├── verify-phase.md
  │   ├── gate-check.md
  │   ├── dependency-analysis.md
  │   └── create-roadmap.md
  ├── templates/
  │   ├── state-template.md
  │   └── gates-template.md
  ├── package.json
  └── README.md
```

---

## Claude CLI Integration

### How to invoke Claude programmatically

```javascript
const { execSync, spawn } = require('child_process');

function runClaude(prompt, options = {}) {
  const { contextFiles = [], allowedTools = [], timeout = 300000 } = options;

  const args = ['-p', prompt, '--output-format', 'text'];

  // Add context files
  for (const file of contextFiles) {
    args.push('--context', file);
  }

  // Add allowed tools
  if (allowedTools.length > 0) {
    args.push('--allowedTools', allowedTools.join(','));
  }

  const result = execSync(`claude ${args.join(' ')}`, {
    timeout,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024, // 10MB
    cwd: projectRoot,
  });

  return result;
}
```

### Fresh context guarantee
Each `execSync('claude ...')` call spawns a new Claude process = new context window. No context leaks between steps. This is the fundamental architectural advantage over slash commands.

### Parallel execution
For plans in the same wave:
```javascript
async function executeWave(plans) {
  const promises = plans.map(plan =>
    new Promise((resolve, reject) => {
      const child = spawn('claude', ['-p', buildPrompt(plan)], { cwd: projectRoot });
      // ... handle stdout, stderr, exit code
    })
  );
  return Promise.all(promises);
}
```

---

## Configuration

### Project-level config: `.briggsy-build.yaml`

```yaml
# Optional — the tool works with sensible defaults

spec_file: ./Top-Down-Racer-v03-GSD-Spec.md

# Claude model to use for each step type
models:
  plan: claude-sonnet-4-20250514     # Planning doesn't need opus
  deepen: claude-sonnet-4-20250514   # Deepening benefits from strong reasoning
  execute: claude-sonnet-4-20250514  # Execution needs to write good code
  verify: claude-sonnet-4-20250514   # Verification needs careful checking

# MCP servers to activate (passed to claude CLI)
mcp_servers:
  - context7
  - serena
  - sequential-thinking

# Timeouts per step (ms)
timeouts:
  plan: 300000      # 5 min
  deepen: 180000    # 3 min
  execute: 600000   # 10 min
  verify: 300000    # 5 min
```

---

## Error Handling

| Scenario | Response |
|----------|----------|
| Claude invocation times out | Retry once. If second attempt times out, create decision gate. |
| Claude invocation exits non-zero | Log error, retry once with error context. If fails again, create decision gate. |
| State file corrupted | Attempt reconstruction from git history. If fails, print state and ask human. |
| Plan file missing | Fatal — something deleted work in progress. Halt and report. |
| Tests fail during execution | Part of normal flow — execution prompt includes "run tests." Claude fixes in-context. |
| Tests fail during verification | Create fix plans → execute → re-verify. Max 2 cycles, then gate. |

---

## What This Is NOT

- **Not a fork of GSD.** GSD is a slash command framework. This is an external orchestrator. Different architecture, different execution model.
- **Not a general-purpose AI agent framework.** This is specifically for building software projects from specs. Not for chatbots, not for data analysis.
- **Not opinionated about what Claude builds.** The orchestrator doesn't care if you're building a game, a web app, or a CLI tool. It cares about the PROCESS: plan → deepen → execute → verify.

---

*— End of Architecture Spec —*
