# Code Review Strategy

Three review plugins are installed. We use two — one daily, one for milestones.

| Situation | Command | Why |
|-----------|---------|-----|
| Small change, few files | `/pr-review-toolkit:review-pr code errors` | Fast, focused, saves tokens |
| New feature complete | `/pr-review-toolkit:review-pr all` | Full sweep with all 6 agents |
| End of phase / major milestone | `/ce:review` | Ultra-thinking deep dives + architecture analysis |
| Never | `/code-review:code-review` | Requires a GitHub PR — we work on main |

## PR Review Toolkit (daily driver)

Works with `git diff` — no PR needed. Six agents: code-reviewer, code-simplifier, comment-analyzer, pr-test-analyzer, silent-failure-hunter, type-design-analyzer. Aspect selection lets you run just what matters (`errors types`, `tests`, `all`, etc.).

## CE Review (milestone gates)

Up to 15 agents + ultra-thinking phases (stakeholder analysis, scenario exploration, simplification). Requires `compound-engineering.local.md` in the project root — without it, CE loads default agents (many Rails/DB-specific, irrelevant for us).

The file already exists in the EK project root. If it's missing or needs recreating:

```markdown
---
review_agents:
  - compound-engineering:review:kieran-typescript-reviewer
  - compound-engineering:review:security-sentinel
  - compound-engineering:review:performance-oracle
  - compound-engineering:review:architecture-strategist
  - compound-engineering:review:code-simplicity-reviewer
---

BURNED (spy-comedy card game) — TypeScript + React 19 + PartyKit (partyserver) + Vite 8. Jackbox-style: shared screen (TV board) + phone controllers via WebSocket. Card game engine is pure/synchronous. All server randomness uses crypto. Budget: <100KB gzipped phone JS.
```

What each agent does:
- `kieran-typescript-reviewer` — TS-specific: no `any`, named imports, immutable patterns
- `security-sentinel` — OWASP, input validation, auth
- `performance-oracle` — Big O, N+1, memory, caching
- `architecture-strategist` — SOLID, component deps, API contracts
- `code-simplicity-reviewer` — YAGNI, redundancy, readability

## Not used: Anthropic code-review

Requires a GitHub PR to exist. We commit directly to main — workflow mismatch.
