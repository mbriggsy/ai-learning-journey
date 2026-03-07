# CREATE EVIDENCE PACKAGE

## What This Is

This is the **final act**. Every phase has been planned, strengthened, coded, verified, and its evidence collected. Now you assemble the **Evidence Package** — a single, comprehensive document that proves this project was built correctly.

This isn't a formality. This is the document that answers: "How do we know this works?" It's the document a new team member reads to understand what was built and why. It's the document you hand to a client, a stakeholder, or your future self when something breaks at 2 AM and you need to know what was tested and what wasn't.

---

## Project Information

**Project:** {{PROJECT_NAME}}
**Spec:** {{SPEC_FILE}}
**Build Started:** {{BUILD_STARTED}}
**Build Completed:** {{BUILD_COMPLETED}}

## Available Evidence

The following evidence records have been collected during the build:

{{EVIDENCE_FILES}}

## IV&V Reports

Independent Verification & Validation reports (verifier had NO access to spec or plans):

{{IVV_FILES}}

## Requirements Traceability Matrix

Machine-checked requirement tracing: R-XXX → Plan → Test → Code → Evidence:

{{RTM_SUMMARY}}

## Spec

{{SPEC_CONTENT}}

## Build State

{{STATE_CONTENT}}

---

## Instructions

Assemble the Evidence Package. Read ALL evidence records from each phase and synthesize them into a single authoritative document.

### Package Structure

```markdown
# Evidence Package: {{PROJECT_NAME}}

## Executive Summary
- Project delivered: [one sentence]
- Total phases: [N] completed, [N] blocked
- Total plans: [N] strengthened, [N] coded, [N] verified
- Total tests: [N] passing, [N] failing
- Total bugs caught by Strike Team: [N] (before any code was written)
- Architecture: [clean / violations noted]
- Build duration: [start] to [end]

## Build Timeline
| Phase | Name | Status | Plans | Bugs Caught | Tests | Duration |
|-------|------|--------|-------|-------------|-------|----------|
| 1 | [name] | ✅ | [N] | [N] | [N pass/N fail] | [time] |

## Spec Compliance Matrix
For EVERY requirement in the spec:
| Req # | Requirement | Status | Phase | Evidence |
|-------|-------------|--------|-------|----------|
| 1 | [requirement from spec] | ✅/❌/⚠️ | [phase #] | [link to evidence] |

## Strike Team Impact Report
This section proves the value of the strengthening step.

### Bugs Caught Pre-Code (would have shipped without strengthening)
| # | Phase | Severity | Finding | What Would Have Happened |
|---|-------|----------|---------|--------------------------|
| 1 | [N] | 🔴 CRITICAL | [bug] | [consequence if it had shipped] |

### Summary Statistics
- Total bugs caught: [N]
- Critical: [N] — would have caused runtime failures
- High: [N] — would have caused incorrect behavior
- Medium: [N] — would have caused edge case failures
- Low: [N] — style/efficiency improvements

### Cost Analysis
- Estimated cost to catch these bugs post-coding: [high/medium/low with reasoning]
- Estimated cost of strengthening step: [token costs if available]
- ROI assessment: [was strengthening worth it? spoiler: yes]

## Test Evidence
### Full Test Suite Results
- Total tests: [N]
- Passing: [N]
- Failing: [N]
- Coverage: [N%]
- [Include or reference the full test output]

### Test Distribution by Phase
| Phase | Unit Tests | Integration Tests | Total | All Pass? |
|-------|-----------|-------------------|-------|-----------|

## Architecture Report
- Module boundaries: [clean / violations]
- Cross-boundary imports: [none / list]
- Dependency graph: [describe the module structure]
- Technical debt noted: [any items flagged by the Strike Team for future attention]

## Git History Summary
- Total commits: [N]
- Atomic commit discipline: [maintained / violations noted]
- Commit log: [condensed list]

## Gates Encountered
| Gate ID | Phase | Type | Summary | Resolution | Duration Blocked |
|---------|-------|------|---------|------------|-----------------|

## Skip-Ahead Decisions
| Blocked Phase | Skipped To | Rationale | Outcome |
|---------------|-----------|-----------|---------|

## Risk Register
Issues or concerns that surfaced during the build that don't block delivery but should be tracked:
| # | Risk | Severity | Phase | Mitigation |
|---|------|----------|-------|------------|

## Requirements Traceability Matrix
Include the full RTM summary from above. For EVERY requirement:
| Req ID | Requirement | Plan | Test | Code | Evidence | Status |
|--------|-------------|------|------|------|----------|--------|
| R-001 | [text] | ✅/❌ | ✅/❌ | ✅/❌ | ✅/❌ | 🟢/🟡/🔴 |

### RTM Gap Analysis
- Total requirements: [N]
- Fully traced: [N]
- Gaps: [N]
- Orphaned: [N]
- Coverage: [N%]

### Gap Findings (if any)
| # | Requirement | Missing Link | Severity | Recommended Action |
|---|-------------|-------------|----------|-------------------|

## IV&V Independence Report
For EACH phase, summarize the IV&V verdict:
| Phase | Verdict | Concerns | Cold Code Read |
|-------|---------|----------|----------------|
| 1 | PASS/CONDITIONAL/FAIL | [summary] | [active/not active] |

### IV&V Impact Assessment
- Findings that survived the full pipeline (plan → strengthen → code → verify): [list any]
- Cold code read observations (at maximum): [list any]
- Independence value: [assessment of what IV&V caught that internal verify missed]

## Appendices
- Appendix A: Full phase-by-phase evidence records
- Appendix B: Complete Strike Team findings (all phases)
- Appendix C: Full test output
- Appendix D: Git log
```

---

## Rules

- **Be comprehensive but not redundant.** Summarize at the top, detail in the appendices.
- **Every claim needs evidence.** "All tests pass" is only valid if the test output is included.
- **The Strike Team Impact Report is the most important section.** This is what proves the methodology works. Be specific about what would have happened if each bug had shipped.
- **Be honest about gaps.** If a spec requirement wasn't fully tested, say so. If evidence is missing, note it. A credible evidence package acknowledges what it doesn't know.
- **This document should be readable by a non-technical stakeholder** at the executive summary level, and by a technical lead at the detail level.
- **Include cost/token data if available.** Making the economics visible is a design principle of this tool.
