# Autonomous Pipeline Plan

> **Goal:** Evolve the current GSD plan-deepen-execute workflow into a near-autonomous
> pipeline where Claude plans, researches, executes with self-healing, runs visual and
> unit regression testing, and only escalates genuine blockers to the human operator.

---

## Current State (Baseline)

| Capability | Status |
|---|---|
| Structured planning (PLAN.md) | Done — 26 plans executed across 6 phases |
| Parallel research agents (deepen-plan) | Done — 10-12 agents per deepening session |
| Wave-based execution (execute-phase) | Done — but human-gated between waves |
| Unit tests | ~300 tests, engine + AI coverage, zero renderer coverage |
| Visual regression testing | None — no Playwright, no screenshot baselines |
| Pre-commit quality gates | None — manual `pnpm test` + `tsc --noEmit` |
| Self-healing on failure | None — execution stops, human investigates |
| Autonomous bug detection | None |

## Target State

```
Human: "Build phase 7: online multiplayer"
  │
  ▼
┌─────────────────────────────────────────────────────────┐
│  AUTONOMOUS PIPELINE                                     │
│                                                          │
│  1. Research (parallel agents)                           │
│  2. Plan generation + plan-check verification            │
│  3. Deepen plan (parallel research enrichment)           │
│  4. Execute waves with self-healing:                     │
│     ├─ Per-task: implement → test → tsc                  │
│     ├─ On failure: analyze → fix → retry (3x)           │
│     ├─ Per-wave gate: full test suite + visual check     │
│     └─ On wave failure: rollback → re-plan → retry      │
│  5. Visual regression check (Playwright screenshots)     │
│  6. Full verification (VERIFICATION.md)                  │
│                                                          │
│  Escalate to human ONLY when:                            │
│  - Design ambiguity (multiple valid approaches)          │
│  - 3x retry exhausted on same failure                    │
│  - Visual regression detected with no obvious fix        │
│  - Requirement conflict discovered                       │
└─────────────────────────────────────────────────────────┘
  │
  ▼
Human: Reviews VERIFICATION.md + visual diff report
```

---

## Implementation Phases

### Phase A: Automated Quality Gates (Foundation)

**Why first:** Every subsequent phase depends on fast, reliable automated validation.
Without this, self-healing has no signal to heal against.

#### A1. Claude Code Hooks — Instant Feedback Loop

Add to `.claude/settings.local.json`:

```jsonc
{
  "hooks": {
    "postToolUse": [
      {
        "matcher": "Edit|Write|NotebookEdit",
        "command": "cd C:/Users/brigg/ai-learning-journey/projects/top-down-racer-02 && npx tsc --noEmit 2>&1 | tail -20"
      }
    ]
  }
}
```

**What this does:** Every time Claude edits or writes a file, TypeScript compilation
runs automatically. Errors surface immediately — no more committing broken types.

> **Note:** A pre-commit hook running the full test suite is valuable but slow (~15s).
> Consider adding it as a custom skill instead (see A2) so it doesn't block every commit.

#### A2. Custom Skill: `/commit-verified`

Create `.claude/skills/commit-verified/SKILL.md`:

```markdown
# Verified Commit

Before committing any changes:
1. Run `pnpm exec tsc --noEmit` — abort if TypeScript errors exist
2. Run `pnpm test` — abort if any test fails
3. Report test count and pass status
4. If both pass, stage relevant files and commit with a descriptive message
5. If either fails, diagnose and fix the issue, then retry from step 1
6. Never commit with failing tests or TypeScript errors
```

**What this does:** Replaces the manual "remember to run tests" pattern with a
single `/commit-verified` command that guarantees clean commits.

#### A3. Custom Skill: `/diagnose-before-fix`

Create `.claude/skills/diagnose-before-fix/SKILL.md`:

```markdown
# Diagnose Before Fix

When investigating a bug or unexpected behavior:
1. DO NOT edit any files yet
2. Trace the exact runtime code path from trigger to observed behavior
3. Use find_symbol, find_referencing_symbols, and grep to map the call chain
4. Identify where actual behavior diverges from expected behavior
5. Present the diagnosis: which file, which function, which line, why it's wrong
6. Wait for human confirmation before making any changes
7. If the bug is visual/rendering-related, take a Playwright screenshot first
```

**What this does:** Directly addresses the #1 friction pattern (9 wrong-approach
events) by enforcing diagnosis before editing.

#### Deliverables
- [ ] Post-edit TypeScript hook in settings.local.json
- [ ] `/commit-verified` custom skill
- [ ] `/diagnose-before-fix` custom skill
- [ ] Update CLAUDE.md with debugging protocol

---

### Phase B: Visual Regression Pipeline

**Why second:** Visual bugs are the #1 misdiagnosis category. A screenshot pipeline
gives Claude concrete evidence instead of reasoning about pixels it can't see.

#### B1. Install Playwright + Configure

```bash
pnpm add -D @playwright/test
npx playwright install chromium
```

Add to `playwright.config.ts`:
```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/visual',
  use: {
    baseURL: 'http://localhost:5173',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'pnpm dev',
    port: 5173,
    reuseExistingServer: true,
  },
});
```

#### B2. Visual Test Harness

Create `tests/visual/` directory with test files that:
1. Launch the game at each key visual state
2. Capture full-viewport screenshots
3. Compare against stored baselines with configurable tolerance

**Key visual states to capture:**
| State | How to reach | What to verify |
|---|---|---|
| Track 1 render | Load game → select Track 1 | Road, shoulders, walls, runoff zones |
| Track 2 render | Load game → select Track 2 | Same + inner loop geometry |
| Track 3 render | Load game → select Track 3 | Same + complex curves |
| HUD + minimap | Start solo race | Timer, speed, lap counter, minimap boundaries |
| Pause overlay | Press Escape during race | Overlay opacity, button layout, text |
| Finish screen (solo) | Complete a race | Time display, leaderboard, button states |
| Finish screen (vs AI) | Complete vs-AI race | Placement, grace period, DNF display |
| Particle effects | Drive onto shoulder/runoff | Dust/grass particles visible |

#### B3. Baseline Management

```
tests/visual/
  baselines/
    track-1-render.png
    track-2-render.png
    ...
  *.spec.ts          # Playwright test files
  diff-report.ts     # Utility to generate HTML diff reports
```

Store baselines in git. When a visual change is intentional, update baselines
with `npx playwright test --update-snapshots`.

#### B4. Custom Skill: `/visual-verify`

```markdown
# Visual Verify

1. Ensure the dev server is running (pnpm dev)
2. Run Playwright visual tests: npx playwright test tests/visual/
3. If any screenshots differ from baseline:
   - Generate a diff report showing changed regions highlighted
   - If the changes are INTENTIONAL (match the current task), update baselines
   - If the changes are UNINTENTIONAL, flag as visual regression
4. Save diff report to $TEMP/visual-diff-report.html
5. Report: number of states checked, any regressions found
```

#### B5. Package.json Scripts

```json
{
  "test:visual": "playwright test tests/visual/",
  "test:visual:update": "playwright test tests/visual/ --update-snapshots",
  "test:all": "vitest run && playwright test tests/visual/"
}
```

#### Deliverables
- [ ] Playwright installed and configured
- [ ] Visual test files for all 8+ key states
- [ ] Baseline screenshots committed
- [ ] `/visual-verify` custom skill
- [ ] `test:visual` and `test:all` scripts in package.json
- [ ] HTML diff report generator

---

### Phase C: Self-Healing Plan Execution

**Why third:** With quality gates (Phase A) and visual verification (Phase B) providing
reliable pass/fail signals, the execution pipeline can now auto-detect and auto-fix
failures instead of stopping for human intervention.

#### C1. Enhanced Execution Protocol

Modify the GSD execute-phase workflow to add self-healing at two levels:

**Task-level self-healing (inner loop):**
```
For each task in wave:
  1. Implement the task
  2. Run task-specific verification (from <verify> tag)
  3. Run pnpm exec tsc --noEmit
  4. IF failure:
     a. Read the error output
     b. Trace the root cause (grep for the failing symbol/line)
     c. Apply a fix
     d. Re-run verification
     e. Repeat up to 3 times
     f. If still failing after 3 retries → mark task as BLOCKED
  5. IF success: commit task, move to next
```

**Wave-level validation gate (outer loop):**
```
After all tasks in wave N complete:
  1. Run full test suite: pnpm test
  2. Run TypeScript compilation: pnpm exec tsc --noEmit
  3. Run visual regression: pnpm test:visual (if visual changes expected)
  4. IF any gate fails:
     a. Identify which task in wave N caused the regression
     b. Spawn a diagnostic agent to trace the root cause
     c. Apply fix, re-run gates
     d. If fix fails after 3 retries → rollback wave N, mark as NEEDS_HUMAN
  5. IF all gates pass: proceed to wave N+1
```

#### C2. Rollback Strategy

```
On wave failure (after 3 retries exhausted):
  1. git stash all uncommitted changes
  2. Revert to the last committed task in the wave
  3. Write a BLOCKED.md file with:
     - Which task failed
     - Error output from all 3 retry attempts
     - Root cause hypothesis
     - Suggested alternative approaches
  4. Notify human with the BLOCKED.md summary
```

#### C3. Custom Skill: `/execute-autonomous`

```markdown
# Autonomous Phase Execution

Execute the current phase plan with self-healing enabled.

1. Read the next PLAN.md from the roadmap
2. Parse all waves and tasks
3. For each wave, execute all tasks sequentially:
   - Implement → verify → tsc → commit
   - On failure: diagnose → fix → retry (max 3)
   - On 3x failure: mark BLOCKED, continue to next task
4. After each wave, run the full validation gate:
   - pnpm test (all unit tests)
   - pnpm exec tsc --noEmit (type safety)
   - pnpm test:visual (if wave touched renderer/)
5. On wave gate failure: identify regressing task → fix → retry gate
6. On unrecoverable failure: rollback wave, write BLOCKED.md, stop
7. After all waves: generate SUMMARY.md
8. Report: tasks completed, tasks blocked, tests passed, visual regressions
```

#### C4. Impact Checklist Enforcement

Add to the plan-phase workflow:

Every PLAN.md must include an `## Impact Checklist` section listing:
- Every game mode affected (solo, vs-ai, spectator, freeplay)
- Every track affected (1, 2, 3, or all)
- Every renderer component affected
- Verification step for each

This prevents the recurring "forgot spectator mode" and "fix didn't apply to all tracks"
class of bugs.

#### Deliverables
- [ ] Task-level self-healing retry logic (3x max)
- [ ] Wave-level validation gate (tests + tsc + visual)
- [ ] Rollback strategy with BLOCKED.md generation
- [ ] `/execute-autonomous` custom skill
- [ ] Impact checklist requirement in plan-phase workflow
- [ ] CLAUDE.md updated with cross-mode/cross-track verification rules

---

### Phase D: Autonomous Bug Detection

**Why fourth:** With self-healing execution (Phase C) handling bugs during planned work,
this phase adds bug detection for regressions that slip through — catching issues
between sessions or after manual changes.

#### D1. Post-Commit Validation Agent

Custom skill `/validate-commit` that runs after any commit:

```markdown
# Post-Commit Validation

After any commit to the project:
1. Run the full test suite: pnpm test
2. Run TypeScript compilation: pnpm exec tsc --noEmit
3. Run visual regression tests: pnpm test:visual
4. If ALL pass: report "Clean commit" with test count
5. If ANY fail:
   a. Spawn a diagnostic sub-agent for each failure category
   b. Each agent: reads the error, traces the code path, identifies root cause
   c. Each agent: proposes a fix with confidence level (high/medium/low)
   d. For HIGH confidence fixes (single-file, <20 lines):
      - Apply the fix in a new branch
      - Run tests to verify the fix works
      - Report: "Auto-fix available on branch fix/{issue-name}"
   e. For MEDIUM/LOW confidence: write a structured bug report
   f. Save all reports to docs/auto-bugs/{date}-{issue}.md
```

#### D2. Structured Bug Report Format

```markdown
# Bug Report: {title}

**Detected:** {timestamp}
**Commit:** {hash}
**Severity:** Critical | High | Medium | Low
**Category:** Test Failure | Type Error | Visual Regression

## Symptoms
{What failed and how}

## Root Cause Analysis
{Traced code path from trigger to failure}

## Affected Files
{List of files involved}

## Affected Game Modes
{solo, vs-ai, spectator — which are impacted}

## Proposed Fix
{Specific code change with confidence level}

## Verification Steps
{How to confirm the fix works}
```

#### D3. Regression Tracker

Maintain `docs/regression-log.md` as a running log:

```markdown
# Regression Log

| Date | Commit | Category | Description | Auto-fixed? | Resolution |
|---|---|---|---|---|---|
| 2026-03-02 | abc1234 | Visual | Minimap overflow | Yes | fix/minimap-clip |
```

#### Deliverables
- [ ] `/validate-commit` custom skill
- [ ] Bug report template in docs/
- [ ] Auto-fix branch creation for high-confidence fixes
- [ ] Regression log tracker
- [ ] Sub-agent spawning for parallel failure diagnosis

---

### Phase E: End-to-End Autonomous Pipeline

**Why last:** This is the orchestration layer that chains Phases A–D into a single
autonomous flow. Each prior phase must be solid before composing them.

#### E1. The Master Command: `/auto-phase`

```markdown
# Autonomous Phase Pipeline

Execute an entire phase from goal to verified completion with minimal human input.

## Input
- Phase number and name (from ROADMAP.md or user instruction)

## Pipeline

### Stage 1: Research (autonomous)
- Run /gsd:research-phase for the target phase
- Spawn 10-12 parallel research agents covering:
  architecture, security, performance, patterns, pitfalls,
  framework docs, existing codebase analysis
- Synthesize into RESEARCH.md
- Auto-proceed (no human gate)

### Stage 2: Plan (autonomous with check)
- Run /gsd:plan-phase using the research output
- Generate PLAN.md files with Impact Checklists
- Run plan-check verification automatically
- IF plan-check finds issues: auto-fix and re-check (2x)
- IF plan-check passes: auto-proceed

### Stage 3: Deepen (autonomous)
- Run deepen-plan with parallel research agents
- Enrich each task with implementation insights
- Cross-reference with existing codebase patterns
- Auto-proceed when synthesis completes

### Stage 4: Execute (self-healing)
- Run /execute-autonomous (Phase C skill)
- Per-task: implement → verify → tsc → commit
- Per-wave: full test suite + visual regression gate
- Self-heal on failure (3x retry with root cause analysis)
- Escalate BLOCKED tasks to human

### Stage 5: Verify (autonomous)
- Run /gsd:verify-work
- Generate VERIFICATION.md
- Run visual regression against pre-phase baselines
- Check all Impact Checklist items

### Stage 6: Report
- Generate SUMMARY.md
- Update STATE.md, ROADMAP.md, REQUIREMENTS.md
- Present to human:
  - Tasks completed vs blocked
  - Test delta (new tests, pass rate)
  - Visual diff report
  - Any escalated issues

## Escalation Triggers (human intervention required)
- Design ambiguity with multiple valid approaches
- 3x retry exhausted on same failure
- Visual regression with no clear fix
- Requirement conflict between existing and new code
- Security-sensitive changes detected
```

#### E2. Pipeline Telemetry

Track metrics across autonomous runs:

```markdown
## Pipeline Metrics (auto-updated)

| Phase | Duration | Tasks | Self-Healed | Blocked | Tests Added | Visual States |
|---|---|---|---|---|---|---|
| 7-01 | 45min | 8 | 2 | 0 | 12 | 3 |
```

This data feeds back into improving the pipeline — if self-heal rate is high,
the planning stage needs improvement; if blocked rate is high, research needs
more depth.

#### E3. Headless Mode for Non-Interactive Stages

For stages that don't need human judgment (research, deepening, plan-check),
use Claude Code headless mode:

```bash
# Research stage (no human input needed)
claude -p "Run /gsd:research-phase 7" --allowedTools "Read,Write,Glob,Grep,Agent,WebSearch,WebFetch"

# Deepen stage
claude -p "Run /deepen-plan for phase 7" --allowedTools "Read,Write,Glob,Grep,Agent,WebSearch,WebFetch"
```

This eliminates the 6+ "continuation sessions that just finish writing a file"
pattern identified in the insights report.

#### Deliverables
- [ ] `/auto-phase` master orchestration skill
- [ ] Pipeline telemetry tracking in STATE.md
- [ ] Headless mode scripts for non-interactive stages
- [ ] Escalation protocol documented in CLAUDE.md
- [ ] Feedback loop: metrics → pipeline tuning

---

## Implementation Order & Dependencies

```
Phase A ──────────────────► Foundation (hooks, skills, quality gates)
  │
  ├──► Phase B ───────────► Visual Pipeline (Playwright, baselines, diffs)
  │      │
  │      ▼
  └──► Phase C ───────────► Self-Healing Execution (retry, rollback, gates)
         │
         ▼
       Phase D ───────────► Autonomous Bug Detection (watchers, auto-fix)
         │
         ▼
       Phase E ───────────► End-to-End Orchestration (auto-phase command)
```

- **Phase A** is prerequisite for everything (provides the pass/fail signals)
- **Phase B** and early **Phase C** can partially overlap (C doesn't need visual
  gates until it's feature-complete)
- **Phase D** requires C's self-healing patterns
- **Phase E** composes all prior phases

## Estimated Effort

| Phase | Complexity | What's Built |
|---|---|---|
| A | Low | 3 skill files + 1 hook config + CLAUDE.md update |
| B | Medium | Playwright setup + 8+ visual tests + baselines + diff tooling |
| C | High | Execution workflow rewrite + retry logic + rollback + impact checklist |
| D | Medium | Validation skill + bug report template + regression log |
| E | High | Master orchestration skill + telemetry + headless scripts |

## Risk Mitigation

| Risk | Mitigation |
|---|---|
| Visual tests are flaky (anti-aliasing, timing) | Use pixel tolerance threshold + retry on first failure |
| Self-healing loops forever | Hard cap at 3 retries per task, 2 retries per wave |
| Autonomous execution makes wrong architectural choices | Plan-check gate catches this; escalate design decisions |
| Headless mode can't handle interactive prompts | Only use headless for research/deepening; execution stays interactive |
| Auto-fix creates more bugs than it fixes | Auto-fixes run full test suite before proposing; low-confidence fixes are reports only |

---

## Success Criteria

The pipeline is "near-autonomous" when:

1. **Zero manual test runs** — all validation happens automatically via hooks, gates, and skills
2. **< 20% escalation rate** — 80%+ of tasks complete without human intervention
3. **Visual bugs caught before commit** — no more "no visual change" feedback loops
4. **Self-healing success rate > 60%** — most transient failures auto-resolve
5. **End-to-end phase completion** — `/auto-phase` can take a phase from goal to VERIFICATION.md
   with human only reviewing the final output
