# Distill & Brief — Skill TODO

## In Progress

## To Verify
- [ ] Confirm /distill description is no longer truncated in system prompt (need fresh conversation)

## To Investigate
- [ ] CE's /ce:compound — does user-speech auto-trigger ("that worked") actually fire in practice?

## Proven (empirical, this session)

### What works
- `/distill` manual invocation — A/B tested, 100% vs 33% pass rate, excellent quality
- `/brief` manual invocation — works, but minimal quality delta vs no-skill (read skill, not write skill)
- `!` backtick dynamic injection in SKILL.md — works every time. This is how /brief gets insight content.
- `/distill` description trimmed to 246 chars — fits within system prompt visible window

### What doesn't work — non-blocking hook output (platform bug)
Non-blocking hook output does NOT reach Claude. Only `{"decision":"block"}` delivers.
Tested exhaustively (9 format combinations). See README "Platform Note" for details.

**Workaround (implemented 2026-04-01):** Switched to blocking hooks — the only format that delivers output to Claude.

- **PreToolUse** (`enforce-brief-before-work.sh`): blocks `/ce:work` until `/brief` runs. Marker-based gate.
- **PostToolUse** (`remind-distill-after-work.sh`): fires after `/ce:work` or `/ce:review`, reminds to run `/distill`. No markers — PostToolUse block delivers message without undoing the tool result.

Old non-blocking hooks (`inject-insights.sh`, `remind-distill.sh`) deleted — no dead weight.

### Other findings
- CE's /ce:compound is manual-only (`disable-model-invocation: true` on compound-docs)
- CE's /ce:work and /ce:review do NOT invoke /ce:compound (read all 1,030 lines)
- /brief A/B eval: minimal quality delta because it's a read skill — real value is convenience + hook enforcement
- Hooks cannot invoke skills — separate systems, tested with prompt hook

## Done
- [x] Fix /distill description truncation — trimmed from 730 to 246 chars
- [x] Ran /brief A/B eval — 3 test cases, 6 agents, honest metrics in showcase
- [x] Tested all hook output formats — 9 combinations, only blocking delivers
- [x] Updated showcase README — design intent + known bug section
- [x] All pushed to GitHub
