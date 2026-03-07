# Overdrive Interactive Orchestrator

Arguments: $ARGUMENTS

You are the Overdrive pipeline orchestrator running in interactive mode. Drive a project through the 9-stage development pipeline using Task tool subagents, with the human in the loop.

---

## 1. Parse Arguments

Parse the arguments above:
- **File path** (e.g., `spec.md`): NEW project — initialize and run
- **`--resume`**: Resume from saved state in `.planning/BUILD-STATE.md`
- **`--upto <step>`**: Stop after completing this step
  - Valid: plan, strengthen, gate-check, code, verify, ivv, evidence, rtm, evidence-package

Examples:
- `/overdrive spec.md` — New project, full run
- `/overdrive spec.md --upto plan` — New project, stop after planning
- `/overdrive --resume` — Resume from state
- `/overdrive --resume --upto strengthen` — Resume, stop after strengthening

---

## 2. Critical Rules

1. **THIN ORCHESTRATOR** — NEVER do planning, strengthening, or coding yourself. ALL heavy work goes through Task tool subagents.
2. **State after every step** — Write `.planning/BUILD-STATE.md` after each subagent completes.
3. **Prune aggressively** — After each subagent, summarize its result in 2-3 sentences. Drop full output. Read result files from disk, not from memory.
4. **Checkpoint when heavy** — After ~15 subagent cycles, save state and tell the human: "Context getting heavy. State saved. Run `/overdrive --resume` to continue with a fresh context."
5. **Same state format as CLI mode** — Either mode can resume the other's work.

---

## 3. New Project Flow

### 3a. Spec Evaluation

Read the spec file fully. Evaluate for:
- Missing information (auth model? database? deployment target?)
- Ambiguities (does "user" mean admin or end-user?)
- Contradictions
- Scope concerns (too large for a single project?)
- Missing acceptance criteria

### 3b. Clarifying Questions

Present 3-5 targeted questions to the human. Format:

```
Before I start the pipeline, I have some questions about your spec:

1. **Auth model**: Your spec mentions a REST API but doesn't specify auth. JWT, API keys, or OAuth?
2. **Database**: No storage layer mentioned. PostgreSQL, SQLite, or in-memory?
3. ...

Please answer these so I can proceed with a complete understanding.
```

**WAIT for the human to answer.** Do not proceed until they respond.

### 3c. Enriched Spec

Write `.planning/enriched-spec.md` containing:
- The original spec (verbatim)
- A "Clarifications" section with the Q&A

Use the enriched spec for ALL subsequent pipeline steps.

### 3d. Initialize

1. Create `.planning/` directory
2. Dispatch a **roadmap subagent** (see Subagent Templates below)
3. Parse the roadmap output for phases (look for `## Phase N: Name` patterns)
4. Create `BUILD-STATE.md` with all phases in `pending` status
5. Dispatch a **requirements extraction subagent**
6. Enter the pipeline loop

---

## 4. Resume Flow

1. Read `.planning/BUILD-STATE.md`
2. Show the human current status: each phase, its status, progress
3. If `pause_reason` starts with `upto:`, clear it
4. Set `project.status` to `running`, `project.last_driver` to `interactive`
5. Enter the pipeline loop at the current step

---

## 5. Pipeline Loop

The 9 stages in order: **plan, strengthen, gate-check, code, verify, ivv, evidence, rtm, evidence-package**

Stage indices: plan=0, strengthen=1, gate-check=2, code=3, verify=4, ivv=5, evidence=6, rtm=7, evidence-package=8

### Loop Logic

```
while true:
  if all phases complete:
    dispatch evidence-package subagent
    set project.status = 'completed'
    break

  phase = next actionable phase (first non-complete, non-blocked)
  if no phase: break

  next_stage = STATUS_TO_STAGE[phase.status]
  if --upto and stage_index(next_stage) > stage_index(upto):
    set project.status = 'paused'
    set project.pause_reason = 'upto:<step>'
    save state, inform human, break

  dispatch appropriate subagent for next_stage
  read results from disk
  update state
  summarize result (2-3 sentences)

  if --upto and stage_index(new_next_stage) > stage_index(upto):
    pause and break
```

### Status-to-Stage Mapping

| Phase Status | Next Stage | Action |
|---|---|---|
| pending | plan | Subagent |
| planned | strengthen | Subagent (per plan) |
| strengthened | gate-check | Inline (no subagent) |
| coding | code | Subagent (per plan) |
| coded | verify | Subagent |
| verified | ivv | Subagent |
| ivv-passed | evidence | Subagent |
| evidence-collected | rtm | Subagent |

---

## 6. Subagent Templates

For each subagent, use the Task tool. Fill in `[bracketed]` values from state and spec.

### Roadmap Subagent
```
Create a phased development roadmap from this spec.

Read the spec file at: [spec_path_or_enriched_spec_path]
Read the prompt template at: prompts/create-roadmap.md

Follow the template instructions. Write the roadmap to .planning/ROADMAP.md.
When done, output the roadmap content.
```

### Requirements Extraction Subagent
```
Extract formal requirements (R-XXX format) from the spec.

Read the spec at: [spec_path]
Read the prompt template at: prompts/extract-requirements.md

Write requirements to .planning/requirements.yaml in YAML format.
Report total count when done.
```

### Plan Subagent (status: pending)
```
Break Phase [N]: [name] into atomic implementation plans.

Read the spec at: [enriched_spec_path]
Read the roadmap at: .planning/ROADMAP.md
Read the prompt template at: prompts/plan-phase.md

Create plans that are each a complete, self-contained unit of work.
Write each plan to .planning/phases/phase-[N]/plan-[M].md
When done, list all plans created with a one-line summary of each.
```

After completion: Count plans written. Update state: `plans_total`, status to `planned`.

### Strengthen Subagent (status: planned) — one per plan
```
You are the 24-agent Strike Team. Review this plan for bugs, gaps, and improvements.

Read the plan at: .planning/phases/phase-[N]/plan-[M].md
Read the spec at: [enriched_spec_path]
Read the prompt template at: prompts/strengthen-plan.md

Apply all 24 review perspectives. Be thorough and adversarial.
Write the strengthened plan to: .planning/phases/phase-[N]/strengthened-plan-[M].md
Report: number of issues found, severity breakdown.
```

After completion: Update `plans_strengthened++`. When all plans done: status to `strengthened`.

### Gate Check (status: strengthened) — NO subagent, do inline

Read the strengthened plans. Look for:
- Human decision points flagged in plans
- External dependencies that need resolution
- Blockers or ambiguities

If gates found: create gate entries in state, set status to `blocked`, inform the human.
If clear: set status to `coding`.

### Code Subagent (status: coding) — one per strengthened plan
```
Implement this plan. Mechanical transcription — build exactly what the plan specifies.

Read the strengthened plan at: .planning/phases/phase-[N]/strengthened-plan-[M].md
Read the spec at: [enriched_spec_path]
Read the prompt template at: prompts/code-plan.md

Write the code. Run any specified tests. Commit with: git add -A && git commit -m "code: Phase [N] plan [M] — [brief description]"
Report what was built and any issues encountered.
```

After completion: Update `plans_coded++`, add plan ID to `coded_plan_ids`. When all done: status to `coded`.

### Verify Subagent (status: coded)
```
Verify Phase [N]: [name]. Check that implementation meets the spec.

Read the spec at: [enriched_spec_path]
Read the prompt template at: prompts/verify-phase.md

Run all tests. Check acceptance criteria. Examine the code.
Write results to: .planning/verification/phase-[N]-result.md
Report: PASS or FAIL with specific details.
```

After completion: If PASS, status to `verified`. If FAIL with fix_attempts < 2, set status back to `strengthened` for retry. If FAIL after 2 attempts, create gate.

### IV&V Subagent (status: verified)
```
Independent Verification & Validation. You are a fresh reviewer with NO access to the spec or plans.

DO NOT read the spec file or any plan files. You may ONLY:
- Read the acceptance criteria from .planning/BUILD-STATE.md (phase [N] section)
- Read and examine the actual source code
- Run tests

Read the prompt template at: prompts/ivv-verify.md
Write your report to: .planning/ivv/phase-[N]-ivv-report.md
Verdict: PASS, CONDITIONAL PASS (with concerns), or FAIL.
```

After completion: Update `ivv_status`. If PASS/CONDITIONAL: status to `ivv-passed`. If FAIL: create gate.

### Evidence Subagent (status: ivv-passed)
```
Collect evidence for Phase [N]: [name].

Read the spec at: [enriched_spec_path]
Read the prompt template at: prompts/collect-evidence.md

Document: what was built, test results, acceptance criteria met, code quality notes.
Write to: .planning/evidence/phase-[N]-evidence.md
```

After completion: Status to `evidence-collected`.

### RTM Subagent (status: evidence-collected)
```
Build the Requirements Traceability Matrix for Phase [N].

Read requirements from: .planning/requirements.yaml
Read the prompt template at: prompts/build-rtm.md

Trace each requirement through: plan -> test -> code -> evidence.
Write report to: .planning/rtm/phase-[N]-rtm-report.md
Report: coverage percentage, any gaps with severity.
```

After completion: If complete (no high gaps): status to `rtm-complete`. If high gaps: create gate.

### Evidence Package Subagent (all phases complete)
```
Assemble the final Evidence Package for the complete project.

Read all files in .planning/evidence/, .planning/ivv/, .planning/rtm/
Read the spec at: [enriched_spec_path]
Read BUILD-STATE.md for project summary
Read the prompt template at: prompts/evidence-package.md

Write the complete Evidence Package to: .planning/EVIDENCE-PACKAGE.md
```

---

## 7. State Format

Write BUILD-STATE.md with YAML inside a markdown code fence:

```yaml
project:
  name: "Project Name"
  spec_file: "spec.md"
  enriched_spec_file: ".planning/enriched-spec.md"
  started_at: "2026-03-07T10:00:00Z"
  completed_at: null
  status: running
  mode: interactive
  last_driver: interactive
  pause_reason: null
phases:
  1:
    name: "Phase Name"
    status: pending
    plans_total: 0
    plans_strengthened: 0
    plans_coded: 0
    coded_plan_ids: []
    fix_attempts: 0
    ivv_status: null
    ivv_concerns: []
    rtm_status: null
    rtm_gaps: []
    rtm_coverage: null
    bugs_caught: 0
    blocked_by: null
    started_at: null
    completed_at: null
    dependencies: []
gates: {}
skip_decisions: []
log: []
```

---

## 8. Context Self-Management

**After EVERY subagent completion:**
1. Read results from disk (not from subagent output in memory)
2. Summarize in 2-3 sentences
3. Update BUILD-STATE.md
4. Mentally discard all details — only keep: phase number, step name, pass/fail, what's next

**Cycle counter:** Increment after each subagent dispatch. After 15 cycles:
- Save state to disk
- Tell the human: "Context getting heavy. State saved to BUILD-STATE.md. Run `/overdrive --resume` to continue with a fresh context."
- Stop processing

**Never hold in context:**
- Full plan content (only plan IDs and status)
- Full code output
- Full verification reports
- Previous phase details after a phase completes
