---
status: complete
priority: p2
issue_id: "005"
tags: [code-review, dead-code, phase-4]
dependencies: []
---

# Empty hasEvidence stub in engine.ts does nothing

## Problem Statement

engine.ts:520-523 has an if block with an empty body that checks if `hasEvidence` method exists (it always does). Looks like a filter but filters nothing. Misleading.

**Flagged by:** TS reviewer, Simplicity reviewer

## Findings

- `engine.ts:520-523`:
  ```typescript
  if (ai.evidenceTracker?.hasEvidence === undefined) {
    // No evidence tracker or check if seeker opened it
  }
  ```
- `hasEvidence` is always defined on EvidenceTracker — condition never true
- Empty body means even if it triggered, nothing happens

## Proposed Solutions

**Option A: Delete the empty stub**
- If self-open filtering is needed later, implement properly
- Effort: Small
- Risk: None

## Technical Details

- **Affected files:** `src/game/engine.ts`

## Acceptance Criteria

- [ ] Empty stub removed
- [ ] No behavioral change (it did nothing)

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-31 | Created from Phase 4 code review | 2/4 agents flagged |
