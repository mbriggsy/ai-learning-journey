# doc-audit — TODO

## Current State
- 5-agent architecture, 100% pass rate (20/20 assertions, 4 iterations)
- Global install at `~/.claude/skills/doc-audit/SKILL.md` — must `cp` from project source to sync
- Eval fixtures: node-app (obvious), python-lib (subtle), clean-project (false-positive guard)

## Landmines
- Global skill install is decoupled from project source. Easy to test stale version.
