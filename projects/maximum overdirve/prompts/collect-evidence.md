# COLLECT EVIDENCE: Phase {{PHASE_NUMBER}} — {{PHASE_NAME}}

## What This Is

Verification told us whether the phase PASSED or FAILED. Evidence collection is different — it's about **building the proof record**. Think of it like a building inspector who not only checks the wiring but photographs it, logs the measurements, and files the report. The evidence we collect here feeds into the final Evidence Package — the irrefutable record that this project was built right.

This isn't bureaucracy. This is accountability. When someone asks "how do we know the AI training module actually works?" — the answer is this evidence, not "well, Claude said it was fine."

---

## Spec

{{SPEC_CONTENT}}

---

## Instructions

For Phase {{PHASE_NUMBER}} ({{PHASE_NAME}}), collect the following evidence categories. Be thorough. Be specific. Capture the actual output, not summaries of output.

### Evidence Category 1: Test Results

Run the full test suite and capture EVERYTHING:

```bash
# Run tests and capture output
npm test 2>&1
# Or whatever the project's test command is
```

Record:
- Total tests run, passed, failed, skipped
- Execution time
- Full output of any failed tests (should be zero post-verification, but capture it)
- Coverage report if available
- The exact command used to run tests

### Evidence Category 2: Acceptance Criteria Verification

For EACH acceptance criterion in this phase's plans:
- State the criterion exactly as written
- Describe HOW it was verified (test name, manual check, output inspection)
- Capture the PROOF (test output, screenshot description, command output)
- Mark as: ✅ MET, ❌ NOT MET, ⚠️ PARTIALLY MET

### Evidence Category 3: Architecture Compliance

Run an architecture boundary check:
- List all source files created/modified in this phase
- For each file, list its imports — verify they respect module boundaries
- Check for cross-boundary violations
- Verify naming convention consistency
- Capture the output of: `grep -r "import.*from" src/` (or equivalent)

### Evidence Category 4: Git History

Capture the commit record for this phase:
```bash
git log --oneline --since="[phase start time]"
```
- List each commit hash, message, and files changed
- Verify atomic commit discipline (one plan = one commit)
- Note any merge commits or fixup commits

### Evidence Category 5: Code Metrics

Gather quantitative data:
- Lines of code added/modified/deleted (use `git diff --stat`)
- Number of new files created
- Number of new tests added
- Any static analysis output (linting, type checking)
- Build output — does it compile cleanly with zero warnings?

### Evidence Category 6: Regression Check

Verify that this phase didn't break anything from previous phases:
- Run ALL tests, not just this phase's tests
- Compare test count before and after (no tests should have disappeared)
- Note any tests from previous phases that changed

### Evidence Category 7: Bug Resolution Record

Reference the strengthening step's bug table:
- List each bug that the Strike Team found
- Confirm each bug was addressed in the code
- Note the file and line where each fix landed

---

## Output Format

```markdown
# Evidence Record: Phase {{PHASE_NUMBER}} — {{PHASE_NAME}}

**Collected:** [timestamp]
**Collected by:** Overdrive automated evidence collection

## Test Results
[Full test output]
- Tests Run: [N]
- Passed: [N]
- Failed: [N]
- Skipped: [N]
- Coverage: [N%] (if available)
- Duration: [Ns]

## Acceptance Criteria
| # | Criterion | Status | Verification Method | Evidence |
|---|-----------|--------|--------------------|---------| 
| 1 | [criterion] | ✅/❌/⚠️ | [how verified] | [proof] |

## Architecture Compliance
- Boundary violations: [None / list]
- Import analysis: [output]
- Files modified: [list with line counts]

## Git Record
[commit log output]
- Total commits this phase: [N]
- Atomic discipline: [CLEAN / violations noted]

## Code Metrics
- Lines added: [N]
- Lines modified: [N]  
- Lines deleted: [N]
- New files: [N]
- New tests: [N]
- Build status: [Clean / warnings]

## Regression Check
- Full test suite: [PASS / FAIL]
- Test count change: [before] → [after]
- Previous phase tests: [all pass / issues]

## Bug Resolution
| Bug # | Severity | Finding | Resolved | Location |
|-------|----------|---------|----------|----------|
| 1 | [sev] | [what] | ✅/❌ | [file:line] |

## Raw Outputs
[Append full command outputs below for archival]
```

---

## Rules

- **Capture actual output, not summaries.** The evidence package needs real data, not "tests passed."
- **Run every command yourself.** Don't assume the verification step already did it — verify independently.
- **If evidence can't be collected** (e.g., no test suite exists), document that explicitly. Absence of evidence IS evidence.
- **Timestamps matter.** Every piece of evidence should be timestamped.
- **This evidence must be reproducible.** Include the exact commands used so anyone can re-run them.
