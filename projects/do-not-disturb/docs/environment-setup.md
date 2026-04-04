# Environment Setup

How to get a working Do Not Disturb dev environment from scratch.

## Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| Node.js | 20+ | `node -v` |
| pnpm | 10.30.3+ | `pnpm -v` |

## Install & Verify

```bash
cd projects/do-not-disturb
pnpm install
pnpm typecheck            # 0 errors
pnpm test                 # 449 tests, 42 files
pnpm dev                  # → http://localhost:5173
```

## Dev Workflow

```bash
# Terminal 1 — watch tests
pnpm test:watch

# Terminal 2 — dev server
pnpm dev
```

## Before Every Commit

```bash
pnpm typecheck
pnpm test
pnpm build
```

## MCP Servers

Configured in `/.mcp.json` at repo root. Activated on session start.

| Server | Purpose | Package |
|--------|---------|---------|
| **Context7** | Live documentation lookup for any library/framework | `@upstash/context7-mcp@latest` |
| **Sequential Thinking** | Step-by-step reasoning for complex problems | `@modelcontextprotocol/server-sequential-thinking` |
| **GitHub** | PR, issue, and repo operations | Provided by platform |

## Hooks

Configured in `~/.claude/settings.json`.

| Hook | Trigger | What It Does |
|------|---------|--------------|
| **stop-hook-git-check.sh** | Every Stop | Ensures no uncommitted changes, no untracked files, and no unpushed commits before session ends |

The stop hook enforces squeaky-clean git state. If it blocks you, commit and push before stopping.

## Skills (Slash Commands)

Available in every Claude Code session:

| Skill | When to Use |
|-------|-------------|
| `/simplify` | Review changed code for quality and efficiency |
| `/batch` | Large-scale parallel refactoring across worktrees |
| `/loop` | Run a command on a recurring interval |
| `/schedule` | Create scheduled remote agents |
| `/claude-api` | Help building with Claude API / Anthropic SDK |
| `/update-config` | Modify Claude Code settings and hooks |
| `/session-start-hook` | Set up startup hooks for web sessions |

## Playwright (E2E Playtest)

```bash
npx playwright test tests/e2e/playtest.spec.ts
```

Requires the dev server running (`pnpm dev`). The Playwright config auto-starts it if not already up. Browsers must match the installed Playwright version (1.56.1).

## Asset Pipeline (Not Yet Active)

Needs optional dependencies not yet in package.json:

```bash
pnpm add -D sharp @google/genai
export GOOGLE_GENAI_API_KEY="your-key"

pnpm assets:process       # Imagen 4 generation
pnpm assets:validate      # Verify output
pnpm assets:tiles         # Programmatic floor tiles
```

Assets land in `public/assets/`. Manifest defined in `src/game/asset-manifest.ts`.

## Documentation Reading Order

For full context on a fresh session:

1. **This file** — get the environment running
2. `CLAUDE.md` — architecture rules, conventions, landmines
3. `README.md` — game design and lore
4. `TODO.md` — current status and remaining work
5. `docs/ORIGIN.md` — why this project exists
6. `docs/plans/the-plan.md` — phase tracker
7. `docs/insights/` — reference when touching related areas
