# Autopilot Workflow — Phase Loop Orchestrator

## Role

You are the phase loop engine. The `/gsd-autopilot` command delegates to you after initialization.
You drive phases from `pending` through `complete`, handle blocks, and manage skip-ahead.

**Stay thin.** You are an orchestrator, not an executor. Every heavy operation is a subagent
with a fresh 200K context window. You read state from disk, make routing decisions, delegate
work, and write state back to disk.

---

## The Phase Loop

Read `.planning/AUTOPILOT-STATE.md` to determine current state. Then:

```
WHILE any phase has status != complete:

  1. Find the highest-priority actionable phase:
     - A blocked phase whose gate just resolved (check resume queue)
     - The current_phase if it's in progress
     - The next pending phase in order
     - A skippable future phase if current is blocked

  2. Route based on that phase's status:
     - pending     → run PLAN step
     - planning    → run DEEPEN step  
     - deepening   → run GATE CHECK then EXECUTE step
     - executing   → continue execution or run VERIFY step
     - verifying   → evaluate result
     - blocked     → run SKIP-AHEAD EVALUATION
     - complete    → skip to next phase

  3. After each step:
     - Update AUTOPILOT-STATE.md on disk
     - Update execution log
     - Check: should we continue or pause?

  IF all phases complete:
     - Set run status: completed
     - Write final summary to AUTOPILOT-STATE.md
     - Git commit: "autopilot: build complete"
     - Print completion message

  IF all actionable work is blocked:
     - Set run status: paused
     - Update HUMAN-GATES.md with clear instructions
     - Print: "All available work is blocked. See HUMAN-GATES.md for what I need."
     - Exit and wait for `/gsd-autopilot resume`
```

---

## Step Definitions

### PLAN Step
**Trigger:** Phase status is `pending`
**Pre-check:** Verify no unresolved dependencies on prior blocked phases.
If dependency exists → mark this phase `blocked`, record reason, move to skip-ahead evaluation.

**Execute:**
```
1. Spawn subagent: /gsd:plan-phase N
   - This creates atomic plans in .planning/phases/phase-N/
   - GSD handles all the planning internals

2. Read the generated plans
   - Count total plans
   - Update state: plans_total = count

3. Update state:
   - phase.status = "planning"  (plans created, not yet deepened)
   - Log: "plan-phase N complete. {count} plans created."
   - Git commit: "autopilot: phase {N} planned — {count} atomic plans"
```

**Transition:** → DEEPEN step

---

### DEEPEN Step
**Trigger:** Phase status is `planning`
**Pre-check:** Confirm plans exist in `.planning/phases/phase-N/`

**Execute:**
```
FOR each plan in the phase:

  1. Spawn subagent: /deepen-plan
     - Target: the specific plan file
     - Research agents review the plan
     - Catches bugs before execution

  2. If /deepen-plan is not available:
     - Log warning: "Compound Engineering /deepen-plan not found. Skipping deepening."
     - Set all plans as deepened (graceful degradation)
     - Continue to next step

  3. Record deepening results:
     - Bugs caught, severity, plan modifications
     - Update state: plans_deepened += 1

  4. If deepening reveals a plan needs re-work:
     - The deepened plan file already contains corrections
     - Log: "Plan {N.X} modified during deepening: {reason}"

NOTE: Plans within a phase that are independent of each other CAN be deepened
in parallel (wave-based, matching GSD's execution pattern). Plans with
dependencies must be deepened serially because later plans may depend on
corrections from earlier deepening runs.

After all plans deepened:
  - Update state: phase.status = "deepening" (deepened, not yet executed)
  - Log: "All plans deepened for phase {N}. {bugs_caught} total bugs caught."
  - Git commit: "autopilot: phase {N} deepened — {bugs_caught} defects caught pre-execution"
```

**Transition:** → GATE CHECK → EXECUTE step

---

### GATE CHECK
**Trigger:** Between deepening and execution, AND between plans during execution.
**Purpose:** Catch human gates BEFORE burning execution tokens.

**Execute:**
```
1. Spawn subagent with @.claude/gsd-autopilot/gsd-autopilot-gate-evaluator.md
   - Input: the phase's plans, the spec file, current state
   - The gate evaluator checks:
     a. Does any plan require files/assets that don't exist yet?
     b. Does any plan reference external tools the autopilot can't run?
     c. Does the spec declare a human checkpoint at this phase boundary?
     d. Did deepening surface an unresolved architectural decision?

2. If gate(s) found:
   - Create gate entries in AUTOPILOT-STATE.md
   - Determine which plans within the phase are blocked vs. clear
   - If ALL plans blocked:
     → Set phase status: "blocked"
     → Trigger SKIP-AHEAD EVALUATION
   - If SOME plans are clear:
     → Execute the clear plans
     → Block at the first plan that needs the gate
     → Trigger SKIP-AHEAD EVALUATION for remaining work

3. If no gates found:
   - Proceed to EXECUTE step
```

---

### EXECUTE Step
**Trigger:** Phase status is `deepening` and gate check passed (or clear plans identified)

**Execute:**
```
1. Spawn subagent: /gsd:execute-phase N
   - GSD handles wave-based parallelization of independent plans
   - Each plan runs in a fresh subagent context
   - Each plan produces an atomic git commit

2. Monitor progress:
   - After each plan completes, update state: plans_completed += 1
   - Log each completion with commit hash

3. If a plan fails:
   - GSD's own error handling creates fix plans
   - The autopilot re-executes fix plans automatically
   - If fix fails twice: block the phase, create a gate (type: decision)
     "Plan {N.X} failed after retry. Human review needed."

4. After all executable plans complete:
   - Update state: phase.status = "executing" → ready for verify
   - Log: "Phase {N} execution complete. {plans_completed}/{plans_total} plans done."
```

**Transition:** → VERIFY step (if all plans done) or → BLOCKED (if some plans gated)

---

### VERIFY Step
**Trigger:** All plans in phase executed successfully

**Execute:**
```
1. Spawn subagent: /gsd:verify-work N
   - Goal-backward verification
   - Tests observable behaviors, not implementation details

2. Evaluate verification result:
   
   PASS:
   - Update state: phase.status = "complete", verification_result = "pass"
   - Log: "Phase {N} verified and complete."
   - Git commit: "autopilot: phase {N} complete — verified"
   - Transition: → next phase

   FAIL (auto-fixable):
   - GSD creates fix plans in verify output
   - Re-enter EXECUTE step with fix plans only
   - Re-verify after fixes
   - Max 2 fix cycles, then escalate to human

   FAIL (needs human):
   - Create a gate (type: quality-check or decision)
   - Write details to HUMAN-GATES.md
   - Block phase
   - Trigger SKIP-AHEAD EVALUATION
```

---

### SKIP-AHEAD EVALUATION
**Trigger:** A phase is blocked by a human gate

**Execute:**
```
1. Spawn subagent with @.claude/gsd-autopilot/gsd-autopilot-dependency-analyzer.md
   - Input: ROADMAP.md, spec file, current AUTOPILOT-STATE.md
   - The analyzer maps dependencies between phases and between plans

2. The analyzer returns:
   - Which future phases have ZERO dependency on the blocked phase
   - Which future phases have PARTIAL dependency (some plans clear, some blocked)
   - Which future phases are fully dependent (must wait)

3. For each phase that can proceed:
   - Record the skip decision in skip_decisions log with rationale
   - Add the blocked phase to the resume queue
   - Set the skippable phase as the new active target
   - Log: "Skip-ahead: Phase {blocked} blocked by {gate}. Proceeding with Phase {target}."

4. For partial dependencies:
   - Identify which specific plans are clear
   - Plan and deepen those plans (execution waits or proceeds if fully independent)
   - Log plan-level skip decisions

5. Update HUMAN-GATES.md:
   - Show what the autopilot IS doing while waiting
   - Show what's still blocked
   - Give the human clear next steps

6. If NOTHING can proceed:
   - Set run status: "paused"
   - Log: "All available work blocked. Pausing for human input."
   - Write clear instructions to HUMAN-GATES.md
   - Exit the phase loop
```

---

## State Management Rules

1. **Write state after every step.** Not after every phase — after every step within a phase.
   If the process crashes between plan and deepen, the state file shows exactly where to resume.

2. **Execution log is append-only.** Never edit or truncate the log. It's the audit trail.

3. **Gate IDs are sequential.** GATE-001, GATE-002, etc. Never reuse a gate ID, even after resolution.

4. **Skip decisions are immutable.** Once a skip-ahead is recorded, don't delete it even if
   the gate resolves. It's evidence of the autopilot's reasoning.

5. **Git commit at phase boundaries.** The state file itself gets committed at:
   - Phase planned
   - Phase deepened
   - Phase executed
   - Phase verified/complete
   - Gate created
   - Gate resolved (on resume)

---

## Error Recovery

If something goes wrong that isn't a human gate:

1. **Subagent timeout/crash:** Retry once with fresh context. If second attempt fails,
   create a gate (type: decision) with the error details.

2. **GSD command not found:** Fatal error. Print: "GSD not installed or not configured.
   Run `npx get-shit-done-cc` to install GSD before using autopilot."

3. **State file corrupted:** Attempt to reconstruct from git history.
   If reconstruction fails, print state and ask human to verify.

4. **Conflicting phase states:** If the state file shows impossible transitions
   (e.g., a phase is both blocked and complete), halt and ask human to review.
