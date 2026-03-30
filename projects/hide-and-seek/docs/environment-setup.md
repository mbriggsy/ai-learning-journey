# Environment Setup

Everything needed to work on this project with Claude Code. This is the single source of truth for tooling — if it's not here, it's not installed.

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | v24.13.1+ | Required for MCP servers and Phaser dev |
| npm | 11.10.0+ | Comes with Node |
| pnpm | 10.30.3+ | Package manager for the game project |
| Python | 3.12.x | For Serena MCP. **NOT 3.14** (breaks pygame in sibling projects) |
| Git | 2.53+ | CRLF warnings suppressed (`core.safecrlf=false`) |
| curl | 8.18+ | Comes with Git Bash on Windows. Used by WebFetch hook fallback. |
| jq | any | Used by hook scripts to parse JSON. Comes with Git Bash. |

## MCP Servers

MCP (Model Context Protocol) servers give Claude Code additional tools. Configured in `~/.claude/.mcp.json`.

### Serena (Code Navigation)

Semantic code analysis — symbol lookup, find references, rename, insert before/after. Preferred over Grep for exploring code structure and tracing call chains.

- **Config:** `.serena/project.yml` in project root
- **Tools:** `find_symbol`, `get_symbols_overview`, `find_referencing_symbols`, `replace_symbol_body`, `search_for_pattern`, etc.
- **When to use:** Exploring code architecture, tracing call chains, refactoring

### Context7 (Library Documentation)

Fetches current documentation for frameworks, libraries, and APIs. Use even when you think you know the answer — training data may be stale.

- **Tools:** `mcp__context7__resolve-library-id`, `mcp__context7__query-docs`
- **When to use:** Any question about Phaser, EasyStar.js, Vitest, Vite, or any library API
- **When NOT to use:** General programming concepts, refactoring, code review

### Sequential Thinking (Multi-Step Reasoning)

Structured problem-solving with revision, branching, and hypothesis testing. Mandatory after multi-agent research returns (per project rules).

- **Tools:** `mcp__sequential-thinking__sequentialthinking`
- **When to use:** Synthesizing multi-agent results, debugging chains with 2+ layers of causation, architectural decisions

### Playwright (Browser Testing)

Browser automation for E2E testing. Takes screenshots, fills forms, clicks elements.

- **Tools:** `mcp__playwright__browser_navigate`, `mcp__playwright__browser_snapshot`, `mcp__playwright__browser_take_screenshot`, etc.
- **When to use:** Playwright E2E tests, visual verification, interacting with web UIs

### Gemini Grounding (Web Search + Summarize) — NEW, UNTESTED

Searches Google via Gemini API, reads pages, and returns synthesized answers with citations. Replaces WebFetch for research tasks.

- **Package:** `epilande/gemini-grounding` (via `npx -y gemini-grounding`)
- **Config:** `~/.claude/.mcp.json`
- **Requires:** `GEMINI_API_KEY` environment variable (sourced from `top-down-racer-04/.env`)
- **Free tier:** 1,500 grounding queries/day
- **Tools:** `web_search` (general), `dev_docs` (framework docs), `reddit_search`
- **When to use:** Anywhere you'd use WebFetch — this is better (searches + summarizes + cites + has timeouts)
- **Status:** Installed 2026-03-30, needs session restart to verify

## Plugins

Installed via Claude Code plugin system. Configured in `~/.claude/settings.json` under `enabledPlugins`.

### Active Plugins

| Plugin | Source | Purpose |
|--------|--------|---------|
| **compound-engineering** | every-marketplace | `/ce:plan`, `/ce:work`, `/deepen-plan`, review agents, research agents |
| **pr-review-toolkit** | claude-plugins-official | Code review, type design analysis, silent failure hunting, test analysis |
| **document-skills** | anthropic-agent-skills | PDF, DOCX, XLSX, frontend design, canvas, algorithmic art |
| **code-review** | claude-plugins-official | PR code review |
| **security-guidance** | claude-plugins-official | Security audit patterns |
| **commit-commands** | claude-plugins-official | `/commit`, `/commit-push-pr`, `/clean_gone` |
| **skill-creator** | claude-plugins-official | Create and evaluate custom skills |
| **plugin-dev** | claude-plugins-official | Create plugins, agents, skills, hooks |
| **claude-md-management** | claude-plugins-official | Audit and improve CLAUDE.md files |
| **typescript-lsp** | claude-plugins-official | TypeScript language server |
| **pyright-lsp** | claude-plugins-official | Python type checking |
| **frontend-design** | claude-plugins-official | Production-grade frontend interfaces |

### Disabled Plugins

| Plugin | Reason |
|--------|--------|
| **hookify** | Disabled — we write hooks manually |

## Hooks

Custom shell scripts that run before/after tool calls. Configured in `~/.claude/settings.json` under `hooks`.

### WebFetch Blocker (`PreToolUse` → matcher `"WebFetch"`)

**Problem:** WebFetch has no timeout parameter. Agents hang indefinitely on slow URLs.

**Script:** `~/.claude/hooks/block-webfetch.sh`

**Behavior:** Blocks every WebFetch call. Returns a message telling the agent to use:
1. `mcp__gemini-grounding__web_search` (preferred — search + summarize + citations)
2. `curl -sL --max-time 15 'URL' | head -c 50000` via Bash (fallback)

**Status:** Installed 2026-03-30, needs session restart to verify.

### Notification (`Notification` → matcher `""`)

**Behavior:** Pops a Windows MessageBox when Claude Code needs attention (e.g., permission prompt while you're in another window).

## CLAUDE.md Instructions

Project-level instructions live in two places:

1. **`~/.claude/CLAUDE.md`** — Global rules (autonomy, NASA quality standard, session protocol, git conventions, tool preferences)
2. **Memory system** — `~/.claude/projects/{project}/memory/MEMORY.md` — persistent cross-session context (user preferences, feedback, project state)

Key rules that affect tooling:
- **Serena over Grep** for code navigation
- **Context7** before guessing library behavior
- **Sequential Thinking** for multi-step debugging and post-research synthesis
- **Never use WebFetch** — use gemini-grounding or curl instead (once verified)

## File Locations Summary

| What | Where |
|------|-------|
| MCP server config | `~/.claude/.mcp.json` |
| Settings (hooks, plugins, permissions) | `~/.claude/settings.json` |
| Hook scripts | `~/.claude/hooks/` |
| Global CLAUDE.md | `~/.claude/CLAUDE.md` |
| Memory index | `~/.claude/projects/{project}/memory/MEMORY.md` |
| Serena project config | `.serena/project.yml` (per project) |
| Installed plugins manifest | `~/.claude/plugins/installed_plugins.json` |
| Plugin cache | `~/.claude/plugins/cache/` |

## Setup From Scratch

If starting fresh on a new machine:

```bash
# 1. Install prerequisites
# Node.js 24+, Python 3.12, Git, pnpm

# 2. Install Claude Code
npm install -g @anthropic-ai/claude-code

# 3. Create MCP config
cat > ~/.claude/.mcp.json << 'EOF'
{
  "mcpServers": {
    "gemini-grounding": {
      "command": "npx",
      "args": ["-y", "gemini-grounding"],
      "env": {
        "GEMINI_API_KEY": "YOUR_KEY_HERE"
      }
    }
  }
}
EOF

# 4. Create hooks directory and WebFetch blocker
mkdir -p ~/.claude/hooks
# Copy block-webfetch.sh from this repo's reference

# 5. Install plugins (via Claude Code CLI)
# claude plugins install compound-engineering@every-marketplace
# claude plugins install pr-review-toolkit@claude-plugins-official
# ... etc (see Active Plugins table above)

# 6. Configure Serena per-project
# Copy .serena/project.yml to each project root

# 7. Set up CLAUDE.md and memory
# Copy ~/.claude/CLAUDE.md from backup
# Memory files rebuild naturally over conversations
```
