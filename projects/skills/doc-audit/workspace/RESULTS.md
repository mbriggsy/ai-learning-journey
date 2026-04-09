# doc-audit Eval Results

3 test fixtures, 20 assertions. Measures recall (catching planted issues) and precision (not inventing fake ones).

## Iterations

| Iter | Change | With Skill | Without Skill | Delta |
|------|--------|-----------|---------------|-------|
| 1 | Baseline — 4 parallel agents | 100% (19/19), 152s, 33K tok | 86.9% (17/19), 167s, 35K tok | +13.1% pass, -15s |
| 2 | Added contradiction detection (Agent 2 + 4) | 100% (20/20), 262s, 44K tok | 95% (19/20), 306s, 42K tok | +5% pass, -44s |
| 3 | Added formatting checks (Agent 3) | 100% (20/20), 173s, 36K tok | 95% (19/20), 123s, 30K tok | +5% pass, +50s |
| 4 | Split Agent 4 → Agent 4 (duplication) + Agent 5 (consistency) | 100% (20/20) | — | Coverage maintained, cleaner reports |

## Test Fixtures

| Fixture | Purpose | Key Planted Issues |
|---------|---------|-------------------|
| node-app | Obvious issues | 5 broken links, stale Node version, README/setup duplication |
| python-lib | Subtle issues | 3 broken links, Pydantic v1/v2 conflict, Python version conflict, tech stack in 3 files |
| clean-project | False-positive test | 1 real issue (toMatchBaseline API contradiction), otherwise clean |

## What Each Iteration Fixed

- **Iter 1 miss:** Clean project got 0 issues — missed the toMatchBaseline contradiction (Jest matcher vs regular method across two docs).
- **Iter 2 fix:** Expanded Agent 2 to cross-reference code examples + Agent 4 (pre-split) to detect contradictions (not just duplication). Caught it. Bonus: also found Transform vs BaseTransform class name conflict on python-lib.
- **Iter 3 addition:** Agent 3 now checks formatting (heading hierarchy, code block language tags, table structure). Caught untagged code blocks in both dirty fixtures. Clean project stayed clean.
- **Iter 4 split:** Agent 4 had grown to 12 checks across 3 distinct jobs (duplication + contradiction + presentation consistency). Split into Agent 4 (duplication, 5 checks) + Agent 5 (consistency, 7 checks). Principle: group by PURPOSE not METHOD. Coverage maintained at 100%, reports are cleaner and more focused.
