# doc-audit — TODO

## Current State
- 5-agent architecture, 100% pass rate (20/20 assertions, 4 iterations)
- Global install at `~/.claude/skills/doc-audit/SKILL.md` — must `cp` from project source to sync
- Eval fixtures: node-app (obvious), python-lib (subtle), clean-project (false-positive test)

## Future Considerations
- **Spec compliance skill** — a separate skill that checks whether code actually implements what the docs claim. Doc-audit verifies docs against config files and each other; spec compliance would verify docs against source code behavior. Different tool, different failure modes (requires AI code comprehension, high false-positive risk). Narrow version: check doc feature claims against package dependencies.

