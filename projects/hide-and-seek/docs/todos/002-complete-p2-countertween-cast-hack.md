---
status: complete
priority: p2
issue_id: "002"
tags: [code-review, quality, type-safety, phase-4]
dependencies: []
---

# SonarPing _counterTween stored via unsafe type cast

## Problem Statement

`SonarPing` stores a tween reference using `(this as { _counterTween?: Phaser.Tweens.Tween })._counterTween` instead of a private class field. This bypasses TypeScript's type system — typos, refactoring misses, and type mismatches are invisible to the compiler.

**Flagged by:** TS reviewer, Architecture strategist, Simplicity reviewer (3/4 agents)

## Findings

- `SonarPing.ts:97` — Write via cast: `(this as ...)._counterTween = counter`
- `SonarPing.ts:118` — Read via cast: `const counterTween = (this as ...)._counterTween`

## Proposed Solutions

**Option A: Replace with private field**
- Add `private counterTween: Phaser.Tweens.Tween | null = null;`
- Replace both casts with direct field access
- Pros: Type-safe, refactor-friendly, obvious
- Effort: Small (5 min)
- Risk: None

## Technical Details

- **Affected files:** `src/renderer/systems/SonarPing.ts`

## Acceptance Criteria

- [ ] `_counterTween` is a declared private field
- [ ] No `this as` casts remain for tween storage
- [ ] Typecheck passes

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-31 | Created from Phase 4 code review | 3/4 agents flagged independently |
