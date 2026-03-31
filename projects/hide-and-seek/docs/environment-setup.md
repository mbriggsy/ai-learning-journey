# Environment Setup

Everything needed to work on this project with Claude Code. This is the single source of truth for tooling — if it's not here, it's not installed.

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | v24.13.1+ | Required for MCP servers and Phaser dev |
| npm | 11.10.0+ | Comes with Node |
| pnpm | 10.30.3+ | Package manager for the game project |
| Git | 2.53+ | CRLF warnings suppressed (`core.safecrlf=false`) |
| curl | 8.18+ | Comes with Git Bash on Windows. Used by WebFetch hook fallback. |
| jq | any | Used by hook scripts to parse JSON. Comes with Git Bash. |

## MCP Servers

MCP (Model Context Protocol) servers give Claude Code additional tools. They are registered via `claude mcp add` which stores them in Claude's internal config (`.claude.json`). Do NOT manually create `~/.claude/.mcp.json` — it doesn't work.

### How MCP Servers Work on Windows

Every server uses the pattern: `cmd /c npx -y <package>` (or `cmd /c uvx` for Python-based servers). In Git Bash, `/c` gets expanded to `C:/` which breaks the command. **Always use `//c`** when running `claude mcp add` from Git Bash to prevent this.

### ~~Serena (Code Navigation)~~ — REMOVED

Removed 2026-03-30 after a shootout test. `find_referencing_symbols` returned empty results for TypeScript types and exported functions (3/3 failures). The one feature worth having didn't work for our stack. Grep + Read + Glob covers everything Serena offered, with less friction.

**Don't reinstall** unless the codebase exceeds 500+ files AND uses a language where LSP references work (Python, Java, Go — not TS type aliases).

### Context7 (Library Documentation)

Fetches current documentation for frameworks, libraries, and APIs. Use even when you think you know the answer — training data may be stale.

- **Tools:** `mcp__context7__resolve-library-id`, `mcp__context7__query-docs`
- **When to use:** Any question about Phaser, EasyStar.js, Vitest, Vite, or any library API
- **When NOT to use:** General programming concepts, refactoring, code review

```bash
claude mcp add context7 -s user -e "CONTEXT7_API_KEY=YOUR_KEY_HERE" -- cmd //c npx -y @upstash/context7-mcp
```

### Sequential Thinking (Multi-Step Reasoning)

Structured problem-solving with revision, branching, and hypothesis testing. Mandatory after multi-agent research returns (per project rules).

- **Tools:** `mcp__sequential-thinking__sequentialthinking`
- **When to use:** Synthesizing multi-agent results, debugging chains with 2+ layers of causation, architectural decisions

```bash
claude mcp add sequential-thinking -s user -- cmd //c npx -y @modelcontextprotocol/server-sequential-thinking
```

### Playwright (Browser Testing)

Browser automation for E2E testing. Takes screenshots, fills forms, clicks elements.

- **Tools:** `mcp__playwright__browser_navigate`, `mcp__playwright__browser_snapshot`, `mcp__playwright__browser_take_screenshot`, etc.
- **When to use:** Playwright E2E tests, visual verification, interacting with web UIs

```bash
claude mcp add playwright -s user -- cmd //c npx -y @playwright/mcp@latest
```

### Gemini Grounding (Web Search + Summarize)

Searches Google via Gemini API, reads pages, and returns synthesized answers with citations. Replaces WebFetch for research tasks.

- **Package:** `epilande/gemini-grounding` (via `npx -y gemini-grounding`)
- **Requires:** `GEMINI_API_KEY` (get from [Google AI Studio](https://aistudio.google.com/apikey))
- **Free tier:** 1,500 grounding queries/day
- **Tools:** `web_search` (general), `dev_docs` (framework docs), `reddit_search`
- **When to use:** Anywhere you'd use WebFetch — this is better (searches + summarizes + cites + has timeouts)
- **Verified:** 2026-03-30 — `claude mcp list` shows `✓ Connected`

```bash
claude mcp add gemini-grounding -s user -e "GEMINI_API_KEY=YOUR_KEY_HERE" -- cmd //c npx -y gemini-grounding
```

### Verifying MCP Servers

After adding servers, restart Claude Code and run:

```bash
claude mcp list
```

All servers should show `✓ Connected`. If any show `✗ Failed to connect`, check the command format and env vars.

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

### Solution Injector (`PreToolUse` → matcher `"Skill"`)

**Problem:** Agents start work without awareness of previously documented root causes, risking repeat debugging.

**Script:** `~/.claude/hooks/inject-solutions.sh`

**Behavior:** Intercepts every Skill tool invocation. If the skill is `ce:work`:
1. Reads all `.md` files from `docs/solutions/` (if the directory exists)
2. Extracts title and key insight from each
3. Injects summaries as context so the agent starts work with full solution awareness

For non-`ce:work` skills or projects without `docs/solutions/`, exits silently (no interference).

**Status:** Installed 2026-03-31.

### Distill Reminder (`PostToolUse` → matcher `"Skill"`)

**Problem:** After executing work or reviewing code, agents don't remember to write solution docs for non-obvious findings.

**Script:** `~/.claude/hooks/remind-distill.sh`

**Behavior:** Intercepts every Skill tool invocation. If the skill is `ce:review` or `ce:work`:
1. Checks if the project has a `docs/` directory
2. Outputs a reminder to evaluate findings and run `/distill` if warranted

For non-matching skills or projects without `docs/`, exits silently.

**Status:** Installed 2026-03-31.

### Notification (`Notification` → matcher `""`)

**Behavior:** Pops a Windows MessageBox when Claude Code needs attention (e.g., permission prompt while you're in another window).

## CLAUDE.md Instructions

Project-level instructions live in two places:

1. **`~/.claude/CLAUDE.md`** — Global rules (autonomy, NASA quality standard, session protocol, git conventions, tool preferences)
2. **Memory system** — `~/.claude/projects/{project}/memory/MEMORY.md` — persistent cross-session context (user preferences, feedback, project state)

Key rules that affect tooling:
- **Grep + Read + Glob** for code navigation (Serena removed — broken for TS)
- **Context7** before guessing library behavior
- **Sequential Thinking** for multi-step debugging and post-research synthesis
- **Never use WebFetch** — use gemini-grounding or curl instead (once verified)

## File Locations Summary

| What | Where |
|------|-------|
| MCP server config | `~/.claude.json` (internal, managed by `claude mcp add`) |
| Settings (hooks, plugins, permissions) | `~/.claude/settings.json` |
| Hook scripts | `~/.claude/hooks/` (block-webfetch, inject-solutions, remind-distill) |
| Personal skills | `~/.claude/skills/` (distill, brief) |
| Global CLAUDE.md | `~/.claude/CLAUDE.md` |
| Memory index | `~/.claude/projects/{project}/memory/MEMORY.md` |
| Installed plugins manifest | `~/.claude/plugins/installed_plugins.json` |
| Plugin cache | `~/.claude/plugins/cache/` |

## Setup From Scratch

If starting fresh on a new machine. Run all commands in **Git Bash** (not PowerShell, not CMD).

### 1. Install Prerequisites

Install Node.js 24+, Git, and pnpm. Verify:

```bash
node --version    # v24.13.1+
git --version     # 2.53+
pnpm --version    # 10.30.3+
```

### 2. Install Claude Code

```bash
npm install -g @anthropic-ai/claude-code
```

### 3. Add MCP Servers

**IMPORTANT:** Use `//c` (double slash) in Git Bash. This prevents bash from expanding `/c` to `C:/`.

```bash
# Sequential Thinking (multi-step reasoning)
claude mcp add sequential-thinking -s user -- cmd //c npx -y @modelcontextprotocol/server-sequential-thinking

# Context7 (library documentation) — get API key from https://context7.com
claude mcp add context7 -s user -e "CONTEXT7_API_KEY=YOUR_KEY" -- cmd //c npx -y @upstash/context7-mcp

# Playwright (browser testing)
claude mcp add playwright -s user -- cmd //c npx -y @playwright/mcp@latest

# Gemini Grounding (web search) — get API key from https://aistudio.google.com/apikey
claude mcp add gemini-grounding -s user -e "GEMINI_API_KEY=YOUR_KEY" -- cmd //c npx -y gemini-grounding
```

Verify all connected:

```bash
claude mcp list
# All should show ✓ Connected
```

### 4. Create Hook Scripts

```bash
mkdir -p ~/.claude/hooks
```

Create three files in `~/.claude/hooks/`:

- **`block-webfetch.sh`** — Blocks WebFetch (no timeout, causes hangs). Redirects to gemini-grounding or curl.
- **`inject-solutions.sh`** — PreToolUse on `"Skill"`. Injects `docs/solutions/` summaries before `/ce:work`.
- **`remind-distill.sh`** — PostToolUse on `"Skill"`. Reminds to run `/distill` after `/ce:review`.

See the Hooks section above for full behavior descriptions. All hooks are wired in `~/.claude/settings.json` under `hooks.PreToolUse` and `hooks.PostToolUse`.

### 5. Add Permissions

In `~/.claude/settings.json`, add to `permissions.allow`:

```json
"mcp__context7__*",
"mcp__sequential-thinking__*",
"mcp__sequentialthinking__*",
"mcp__playwright__*",
"mcp__gemini-grounding__*"
```

### 6. Install Plugins

```bash
# Via Claude Code's plugin system (interactive prompts)
# See Active Plugins table above for the full list
```

### 7. Create Compound Skill

```bash
mkdir -p ~/.claude/skills/distill ~/.claude/skills/brief
```

Create two personal skills:
- `~/.claude/skills/distill/SKILL.md` — write solution docs (dynamic injection shows existing + auto-numbers)
- `~/.claude/skills/brief/SKILL.md` — read solution context on demand

See `/distill` and `/brief` in a Claude Code session to verify.

### 8. Create Project Folders

```bash
mkdir -p docs/solutions docs/todos temp
```

- `docs/solutions/` — Non-obvious root causes and fixes (persistent across sessions)
- `docs/todos/` — Review findings work queue (deleted at squeaky clean)
- `temp/` — Screenshots and debug output (deleted at squeaky clean)

### 9. Set Up CLAUDE.md and Memory

- Copy `~/.claude/CLAUDE.md` from backup or write fresh
- Memory files rebuild naturally over conversations

### Gotchas

| Problem | Cause | Fix |
|---------|-------|-----|
| `claude mcp add` says "Invalid environment variable format" | `-e` flag is greedy — server name parsed as env var | Put the server name **before** `-e` in the command |
| Server shows `cmd C:/ npx` instead of `cmd /c npx` | Bash expanded `/c` to `C:/` | Use `//c` (double slash) |
| Server shows `✓ Connected` but tools missing | Tools load at session startup | Restart Claude Code after adding |
| `~/.claude/.mcp.json` exists but server not loading | `.mcp.json` is not used by Claude Code | Delete it, use `claude mcp add` instead |
