# External Integrations

**Analysis Date:** 2026-02-27

## APIs & External Services
**Current (active):**
- None detected in source code. The project is in scaffold phase — no source files authored yet.

**Planned (documented in `docs/Top-Down-Racer-v02-Complete-Tool-Stack.md`):**
- Context7 MCP Server (`@upstash/context7-mcp`) - Fetches live library documentation for Claude Code; installed via `claude mcp add context7 -- npx -y @upstash/context7-mcp`. Optional API key from `context7.com/dashboard` for higher rate limits.
- GitHub MCP Server (`@modelcontextprotocol/server-github`) - Optional integration for Claude Code to manage GitHub repos (PRs, issues, CI/CD). Requires a GitHub Personal Access Token supplied via env var `GITHUB_PERSONAL_ACCESS_TOKEN`.
- Serena MCP Server (`oraios/serena` via `uvx`) - Local Language Server Protocol tool for semantic code navigation. Runs locally; no external API calls.
- Sequential Thinking MCP Server (`@modelcontextprotocol/server-sequential-thinking`) - Local MCP server for structured reasoning; no external API.

## Data Storage
**Databases:** None
**File Storage:** Local filesystem only
- `public/assets/` - Static game assets (sprites, audio, track images)
- `dist/` - Build output
- `.planning/` - GSD orchestration planning files (gitignored)
**Caching:** None

## Authentication & Identity
None currently in codebase.

**Planned/Optional:**
- GitHub Personal Access Token (`GITHUB_PERSONAL_ACCESS_TOKEN`) - Required only if the optional GitHub MCP server is configured (see `docs/setup_guide.txt`, Phase G, Step G2). Supplied as an environment variable to `claude mcp add github`.
- Context7 API key - Optional; used if rate limits are hit on the Context7 documentation service. Not required for basic usage.

## Monitoring & Observability
**Current:** None detected.
**Planned (AI training phases):**
- TensorBoard - Training visualization for the RL/AI pipeline (Phase 5). Will be used locally; no cloud service required.

## CI/CD & Deployment
**Hosting:** Not configured. This is a local learning project with no production deployment.
**CI/CD:** No CI/CD configuration files detected (no `.github/workflows/`, no `Dockerfile`, no deployment manifests).
**Version Control:** Git (local), with optional GitHub remote. Atomic commits per GSD task are the intended workflow.

## Environment Configuration
**`.env` files:** A `.env` entry is present in `.gitignore`, indicating `.env` files are expected to be excluded from version control. No `.env` file was found in the project root at time of analysis.
**Required env vars:** None currently required for the base TypeScript/PixiJS game.
**Optional env vars (documented, not yet configured):**
- `GITHUB_PERSONAL_ACCESS_TOKEN` - Required only if the GitHub MCP server integration is enabled (see `docs/setup_guide.txt`)

## Webhooks & Callbacks
None — no webhook endpoints, no serverless functions, no inbound HTTP handlers defined or planned in the current architecture.

## Node.js-to-Python Bridge (Planned, Phase 4)
Per `docs/Top-Down-Racer-v02-Complete-Tool-Stack.md` and `CLAUDE.md`, Phase 4 will introduce an inter-process communication bridge between the Node.js simulation engine and the Python ML pipeline:
- Transport: ZeroMQ or WebSocket (decision deferred to Phase 4)
- Protocol: Gymnasium-compatible observation/action interface
- Direction: Python sends actions in, Node.js steps one simulation tick, returns observation vector
- This is local IPC only — not an external API or internet-facing service.

---
*Integration audit: 2026-02-27*
