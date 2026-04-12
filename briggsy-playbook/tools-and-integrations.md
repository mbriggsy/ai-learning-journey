# Tools and integrations — MCP servers, hooks, external tools

Claude Code integrates with several external tools via MCP (Model Context Protocol) servers, hooks, and built-in integrations. This is the inventory and how to use them.

## MCP servers

### Context7 — library documentation
**What:** Fetches current documentation for libraries, frameworks, SDKs, APIs, CLI tools, and cloud services. Covers React, Next.js, Prisma, Express, Tailwind, Django, Spring Boot, Cloudflare, and many more.

**When to use:**
- Asking about a library API you're not sure about
- Version migrations (framework upgrades)
- Library-specific debugging
- CLI tool usage

**Tools:**
- `mcp__context7__resolve-library-id` — find the library ID from a name
- `mcp__context7__query-docs` — query documentation for that library

**Don't use for:** Refactoring, writing scripts from scratch, debugging business logic, code review, or general programming concepts.

**Why it matters:** Claude's training data lags. Context7 gets the CURRENT docs, which may differ from what Claude remembers.

**Rule for Claude:** Verify with Context7 before guessing library behavior. This is especially important for Cloudflare Workers, partyserver, Framer Motion, and Vite — all libraries that have evolved since Claude's training cutoff.

---

### Gemini Grounding — web search with citations
**What:** Google-grounded web search that returns summarized results with citations.

**When to use:**
- General web research (product names, company news, technical articles)
- Finding blog posts, Stack Overflow answers, documentation sites
- Any time you'd normally Google something

**Tools:**
- `mcp__gemini-grounding__search_with_grounding` — general web search with grounding
- `mcp__gemini-grounding__search_documentation` — documentation-focused search
- `mcp__gemini-grounding__search_developer_resources` — developer-focused search
- `mcp__gemini-grounding__search_reddit` — Reddit-scoped search

**Why it matters:** This is the safe replacement for WebFetch. Has timeouts, has citations, produces summaries rather than dumping raw HTML into context.

**Rule for Claude:** NEVER use WebFetch. Use `mcp__gemini-grounding__*` tools instead. There's a hook that enforces this, but don't rely on the hook.

---

### Sequential Thinking — multi-step reasoning
**What:** Structured reasoning tool for debugging chains with more than 2 layers of causation.

**Tool:** `mcp__sequential-thinking__sequentialthinking`

**When to use:**
- After multiple agents report research findings (synthesize before acting)
- Multi-layer debugging where the cause is 3+ steps removed from the symptom
- Complex architectural decisions with many trade-offs
- Any time Claude's "thinking" should be explicit and traceable

**Rule for Claude:** ALWAYS use sequential-thinking after multi-agent research. See `feedback-sequential-thinking-always.md` in memory.

---

### Playwright — browser automation and testing
**What:** Full Playwright browser automation for testing local web apps.

**Tools:** `mcp__playwright__browser_*` (navigate, click, type, screenshot, snapshot, console_messages, etc.)

**When to use:**
- Testing local web apps (BURNED's board and player views)
- Taking screenshots of UI for review
- Running E2E-style flows without writing test files
- Checking browser console for errors

**Rule for Claude:** When you need to see what a page actually looks like, use `browser_take_screenshot`. When you need to test an interaction, use `browser_click`/`browser_type` etc.

---

### Claude API / Anthropic SDK tools
**What:** Integration with the Anthropic SDK for building apps with the Claude API.

**When to use:** When building a Claude-powered app or agent.

**Don't use for:** Other AI SDKs (OpenAI, etc.), general programming concepts.

---

### Google Calendar / Gmail (require authentication)
**What:** Gmail and Google Calendar integrations — read messages, create events, etc.

**Tools:** `mcp__claude_ai_Gmail__*`, `mcp__claude_ai_Google_Calendar__*`

**Status:** Require authentication step before use.

---

## Hooks

Hooks are small scripts that run on specific Claude events. They can block tool calls, inject messages, or trigger side effects.

### PreToolUse: WebFetch blocker
**What:** Intercepts any WebFetch call and redirects Claude to use gemini-grounding or curl instead.
**Why:** WebFetch has no timeout and hangs agents.
**Location:** `~/.claude/hooks/`
**Status:** Active and verified as of 2026-03-30.

### PostToolUse: Distill marker
**What:** Drops a marker file silently when Claude finishes certain types of work.
**Why:** Feeds into the Stop hook to enforce `/distill`.

### Stop hook: Distill enforcement
**What:** When Claude is about to stop, checks if a distill marker is present and reminds Claude to run `/distill` before ending.
**Why:** Prevents hard-won insights from evaporating at end of session.

**Rule:** Don't rely on hooks for safety. They can fail silently. Treat them as belt-and-suspenders.

---

## MCP server installation

**Critical gotcha (from `feedback-mcp-server-install.md` in memory):** MCP servers MUST be installed via `claude mcp add`, NOT via manual `.mcp.json` editing. On Windows, paths use `//c` not `/c`. Wasted 3 sessions learning this.

**Correct command:** `claude mcp add <server-name> <command>` with Windows paths like `//c/Users/brigg/...`.

---

## External commands (via Bash)

### `gh` — GitHub CLI
Use for ALL GitHub operations: PRs, issues, checks, releases. Claude reaches for `gh` whenever GitHub is involved.

**Common patterns:**
- `gh pr create --title "..." --body "..."` — create a PR
- `gh pr view <number>` — view a PR
- `gh api repos/<owner>/<repo>/pulls/<number>/comments` — view PR comments
- `gh workflow run <name>` — trigger a workflow

### `wrangler` — Cloudflare Workers CLI
Used for BURNED's server deployment.
- `wrangler dev` — run the Worker locally
- `wrangler deploy` — deploy to Cloudflare
- `wrangler tail` — stream logs in real time
- `wrangler versions list/deploy` — rollback procedure

### `curl` with `--max-time`
Used instead of WebFetch. ALWAYS include `--max-time 15` or similar to prevent hangs.

---

## Serena — REMOVED
Serena MCP was installed and then removed after 10 sessions of non-use. Its `find_referencing_symbols` was broken for TypeScript. Grep + Read + Glob won.

See `feedback-serena-killed.md` in Claude's memory.

**Rule:** Don't install Serena.

---

## Status line

**What:** Custom status bar at the bottom of the Claude Code terminal showing live session info at a glance.

**Location:** `~/.claude/statusline.py` — configured in `~/.claude/settings.json` under `statusLine`.

**What it shows (left to right):**
- **Model** — current model name (e.g. `[Claude Opus 4.6]`)
- **Directory** — basename of the working directory
- **Git branch** — current branch with a 🌿 icon
- **Context window** — 10-block progress bar, color-coded: green (<70%), yellow (70-89%), red (90%+)
- **Cost** — running session cost in USD
- **Duration** — session elapsed time (minutes + seconds)
- **Effort level** — current effort setting from `settings.json` (e.g. `high`)

**Why it matters:** Context window % is the one to watch — when it hits yellow, start wrapping up or plan a new terminal. Cost keeps you from burning money on runaway sessions.

---

## What to reach for when

| Need | Tool |
|---|---|
| Library API docs | `mcp__context7__*` |
| General web search | `mcp__gemini-grounding__*` |
| Multi-layer debugging | `mcp__sequential-thinking__*` |
| Browser testing / screenshots | `mcp__playwright__*` |
| GitHub PR/issue ops | `gh` via Bash |
| Cloudflare deploy | `wrangler` via Bash |
| One-off HTTP fetches | `curl --max-time 15` via Bash (never WebFetch) |
| File search | `Glob` dedicated tool |
| Content search | `Grep` dedicated tool |
| File reading | `Read` dedicated tool |
| File editing | `Edit` dedicated tool |
