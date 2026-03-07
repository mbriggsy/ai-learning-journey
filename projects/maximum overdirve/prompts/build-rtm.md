# BUILD REQUIREMENTS TRACEABILITY MATRIX — Phase {{PHASE_NUMBER}}

## What This Is

You are building a **Requirements Traceability Matrix (RTM)** for Phase {{PHASE_NUMBER}}. The RTM is a machine-checkable chain that proves every requirement has been:
1. **Planned** — addressed in an atomic plan
2. **Tested** — verified by at least one test
3. **Evidenced** — documented in the evidence record

Every empty cell in this matrix is a **gap finding**. A requirement without a plan was never addressed. A requirement without a test is unverified. A requirement without evidence is unprovable. Gaps are not failures — they are findings that must be resolved or explicitly accepted.

This is not bureaucracy. This is the difference between "we think it works" and "we can prove it works."

---

## Requirements for This Phase

These are the requirements assigned to Phase {{PHASE_NUMBER}} from the project's requirements registry:

{{PHASE_REQUIREMENTS}}

---

## What You Have Access To

You have access to the project's codebase. Use tools to read:

1. **Plan files** — `.planning/phases/phase-{{PHASE_NUMBER}}/` (both raw and strengthened plans)
2. **Test files** — Find and read all test files relevant to this phase
3. **Source files** — Read implementation files to trace requirement coverage
4. **Evidence** — `.planning/evidence/phase-{{PHASE_NUMBER}}-evidence.md`
5. **IV&V report** — `.planning/ivv/phase-{{PHASE_NUMBER}}-ivv-report.md` (if exists)
6. **Strengthen findings** — The strengthened plans contain the Strike Team's findings

---

## Protocol

### Step 1: Load All Artifacts

Read the plan files, strengthened plans, test files, source files, and evidence for Phase {{PHASE_NUMBER}}.

```bash
# Find plans
ls .planning/phases/phase-{{PHASE_NUMBER}}/

# Find test files
find . -name "*.test.*" -o -name "*.spec.*" -o -name "__tests__" | head -50

# Find evidence
cat .planning/evidence/phase-{{PHASE_NUMBER}}-evidence.md 2>/dev/null || echo "No evidence file"

# Find IV&V report
cat .planning/ivv/phase-{{PHASE_NUMBER}}-ivv-report.md 2>/dev/null || echo "No IV&V report"
```

### Step 2: Trace Each Requirement

For EACH requirement listed above, trace through the full chain:

**Plan trace:** Search plan files and strengthened plans for references to this R-XXX ID, or for content that clearly addresses this requirement even without explicit tagging.

**Test trace:** Search test files for:
- Explicit R-XXX references in test descriptions or comments
- Test names/descriptions that match the requirement's text
- Assertions that verify the requirement's expected behavior

**Code trace:** Search source files for:
- R-XXX references in comments or docstrings
- Functions/modules that implement the requirement

**Evidence trace:** Search the evidence record for:
- R-XXX references
- Acceptance criteria results that map to this requirement

### Step 3: Build the Matrix

For each requirement, record:
- **Plan coverage:** Which plan(s) address it? (file path + section)
- **Test coverage:** Which test(s) verify it? (file path + test name)
- **Code coverage:** Which source file(s) implement it? (file path + function/class)
- **Evidence coverage:** Where is the proof? (evidence file + section)
- **Status:** `covered` (all 4 filled) | `partial` (some filled) | `gap` (missing critical links)

### Step 4: Identify and Classify Gaps

For every gap (empty cell in the matrix):

- **No plan:** Requirement was never planned → `severity: high` — work may be missing
- **No test:** Requirement is untested → `severity: high` — cannot verify correctness
- **No code trace:** Code doesn't obviously implement requirement → `severity: medium` — may be implicit
- **No evidence:** Proof is missing → `severity: medium` — need to collect evidence
- **Untagged coverage:** Plan/test addresses requirement but doesn't use R-XXX tag → `severity: low` — needs tagging

---

## Output Format

Output ONLY the YAML below — no markdown fences, no preamble, no commentary. Raw YAML only.

```
phase: {{PHASE_NUMBER}}
built_at: "[ISO timestamp]"
total_requirements: [N]
covered: [N]
partial: [N]
gaps: [N]

traceability:
  R-001:
    text: "[requirement text]"
    status: covered | partial | gap
    plan:
      found: true | false
      references:
        - file: "[plan file path]"
          section: "[relevant section or line]"
    test:
      found: true | false
      references:
        - file: "[test file path]"
          name: "[test name or describe block]"
    code:
      found: true | false
      references:
        - file: "[source file path]"
          symbol: "[function/class/module name]"
    evidence:
      found: true | false
      references:
        - file: "[evidence file path]"
          section: "[relevant section]"

  R-002:
    text: "..."
    status: "..."
    plan:
      found: false
      references: []
    test:
      found: false
      references: []
    code:
      found: false
      references: []
    evidence:
      found: false
      references: []

gap_findings:
  - requirement: R-002
    missing: plan | test | code | evidence
    severity: high | medium | low
    detail: "[What's missing and why it matters]"
    recommended_action: "[What needs to happen to close this gap]"

summary:
  coverage_percentage: [N]
  high_severity_gaps: [N]
  medium_severity_gaps: [N]
  low_severity_gaps: [N]
  verdict: "[COMPLETE — all requirements traced / GAPS FOUND — N gaps require attention / INSUFFICIENT — critical gaps present]"
```

---

## Rules

- **Trace EVERY requirement.** Don't skip requirements that seem obvious or trivial. The matrix must be complete.
- **Be honest about gaps.** A gap is a finding, not a failure. But an undiscovered gap is a time bomb.
- **Distinguish between "not found" and "not applicable."** If a requirement genuinely doesn't apply to this phase, mark it as such — don't mark it as a gap.
- **Include implicit coverage.** If a test verifies a requirement without explicitly referencing R-XXX, still count it — but note it as `untagged` so it can be properly tagged later.
- **Output raw YAML only.** No markdown. No commentary. No code fences. The RTM builder parses this programmatically.
- **Read the actual files.** Don't guess. Don't assume. Open the files, read the code, check the tests. This is verification, not estimation.
