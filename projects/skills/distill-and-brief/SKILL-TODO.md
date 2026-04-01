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

### What doesn't work — hook output delivery
Non-blocking hook output does NOT reach Claude. Tested exhaustively:

| Hook type | Format | Result |
|-----------|--------|--------|
| `type: "command"`, exit 0 | plain text stdout | **silently dropped** |
| `type: "command"`, exit 0 | `{"systemMessage":"..."}` | **silently dropped** |
| `type: "command"`, exit 0 | `{"decision":"allow","reason":"..."}` | **silently dropped** |
| `type: "command"`, exit 0 | `{"hookSpecificOutput":{"permissionDecision":"allow"},"systemMessage":"..."}` | **silently dropped** |
| `type: "command"`, exit 0 | `{"continue":true,"systemMessage":"..."}` | **silently dropped** |
| `type: "command"`, exit 2 | stderr text | **DELIVERED (blocks tool)** |
| `type: "command"`, exit 0 | `{"decision":"block","reason":"..."}` | **DELIVERED (blocks tool)** |
| `type: "prompt"` | allow + context text | **silently dropped** |
| `type: "prompt"` | deny | **DELIVERED (blocks tool)** |

**Conclusion: only blocking output reaches Claude. All non-blocking output is silently discarded.**

This is a confirmed Claude Code platform bug:
- 7+ GitHub issues: #19432, #18534, #25987, #24788, #20062, plus plugin-side issues
- PostToolUse `additionalContext` is documented but NOT IMPLEMENTED (#18534)
- Anthropic's own Hookify plugin has the same bug — warnings don't reach model
- CE plugin has ZERO hooks — never used this mechanism

### Other findings
- CE's /ce:compound is manual-only (`disable-model-invocation: true` on compound-docs)
- CE's /ce:work and /ce:review do NOT invoke /ce:compound (read all 1,030 lines)
- /brief A/B eval: minimal quality delta because it's a read skill — real value is convenience + hooks (broken)
- Hooks cannot invoke skills — separate systems, tested with prompt hook

## Done
- [x] Fix /distill description truncation — trimmed from 730 to 246 chars
- [x] Ran /brief A/B eval — 3 test cases, 6 agents, honest metrics in showcase
- [x] Tested all hook output formats — 9 combinations, only blocking delivers
- [x] Updated showcase README — design intent + known bug section
- [x] All pushed to GitHub
