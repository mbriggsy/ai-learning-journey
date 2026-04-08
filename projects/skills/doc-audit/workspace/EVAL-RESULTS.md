# doc-audit Eval Results

## Iteration 2 (current)

| Metric | With Skill | Without Skill (baseline) | Delta |
|--------|-----------|--------------------------|-------|
| Pass Rate | 100% (20/20) | 95% (19/20) | +5% |
| Avg Time | 262s | 306s | -44s |

### Key Findings

- **Precision is the skill's edge.** On a clean project with 1 real issue (contradicting API usage patterns), the skill found exactly that issue and nothing else. The baseline missed it and reported 5 low-severity nice-to-haves instead.
- **Recall is at parity.** Both configs catch obvious issues (broken links, version conflicts, duplication) reliably.
- **Contradiction detection works.** The expanded Agent 4 catches cross-doc conflicts like conflicting class names (Transform vs BaseTransform) and conflicting API usage patterns (Jest matcher vs regular method) — things the baseline misses.

### Test Fixtures

| Fixture | Purpose | Planted Issues |
|---------|---------|----------------|
| node-app | Obvious issues | 5 broken links, stale Node version, README/setup duplication |
| python-lib | Subtle issues | 3 broken links, Pydantic v1/v2 conflict, Python version conflict, tech stack in 3 files |
| clean-project | False-positive test | 1 real issue (toMatchBaseline API usage contradiction), otherwise clean |

### Per-Eval Breakdown

**Eval 0: node-app** — 8/8 both configs. Easy issues, no differentiation.

**Eval 1: python-lib** — 7/7 both configs (iter 2). Iter 1 baseline missed install duplication (6/7).

**Eval 2: clean-project** — This is the differentiator:
- With skill: 5/5. Found the 1 real issue (toMatchBaseline), reported nothing else.
- Without skill: 4/5. Missed the contradiction, reported 5 low-severity noise items instead.

## Iteration History

- **Iteration 1** — Initial skill. 100% recall on dirty projects, but missed the toMatchBaseline contradiction on the clean project (0 issues reported when 1 existed). Baseline was noisier (8 findings on clean project including some arguable false positives).
- **Iteration 2** — Expanded Agent 2 (cross-doc code example checking) and Agent 4 (contradiction detection alongside duplication). Fixed the miss. Also caught a bonus Transform/BaseTransform conflict not in the original assertions.
