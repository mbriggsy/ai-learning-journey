# Claude-Mem — Deep Dive

Persistent memory for Claude Code. Every session builds on the last.

---

## What Is Claude-Mem?

Claude-Mem is a Claude Code plugin that automatically captures everything Claude does during your coding sessions, compresses it with AI (using Claude's Agent SDK), and injects relevant context back into future sessions. It solves the "amnesia problem" — where Claude starts fresh every session, losing all context from previous work.

**By:** thedotmack  
**License:** Open source (with optional Pro features)  
**GitHub:** [github.com/thedotmack/claude-mem](https://github.com/thedotmack/claude-mem)  
**Docs:** [docs.claude-mem.ai](https://docs.claude-mem.ai)  
**Web Viewer:** localhost:37777

---

## The Problem It Solves

You spend Monday setting up an auth system with Claude. Tuesday, you switch branches for a hotfix. Wednesday morning, Claude acts like it's never seen your codebase. All your architectural decisions, established patterns, edge case discussions — gone.

The root cause isn't Claude's intelligence. It's the fundamental constraint of context windows. Every session starts with a blank slate. Claude-Mem fixes this by maintaining continuity across sessions without you having to re-explain anything.

---

## How It Works

### The 5 Lifecycle Hooks

Claude-Mem intercepts five key moments in every session:

1. **SessionStart** — Loads compressed context from prior sessions. Injects a high-level overview first, deeper history on demand.
2. **UserPromptSubmit** — Monitors your prompts for context cues
3. **PostToolUse** — Captures every tool action Claude takes (file edits, bash commands, etc.)
4. **Summary** — Compresses raw observations into ~500-token summaries
5. **SessionEnd** — Archives the full session for future retrieval

### Progressive Disclosure

Claude-Mem doesn't dump everything into context. It starts with a high-level summary: "Yesterday you refactored the auth system, last week you built the payment integration." If Claude needs more detail about something specific, it requests deeper history, and Claude-Mem retrieves the relevant compressed observations. This keeps token usage efficient — roughly 2,250 tokens saved vs. full context injection.

### Architecture

```
Session Starts → Hook injects compressed prior context
    ↓
You Work → PostToolUse hooks capture every action
    ↓
Worker Service → AI compresses observations (~500 tokens each)
    ↓
Session Ends → Summary generated, archived to SQLite + Chroma
    ↓
Next Session → Relevant context auto-injected
```

**Worker Service:** Express API on port 37777, Bun-managed, handles AI processing asynchronously  
**Database:** SQLite3 at `~/.claude-mem/claude-mem.db`  
**Vector Search:** Chroma for semantic embeddings  
**Web Viewer:** React interface at localhost:37777

---

## Key Features

- **Persistent Memory** — Context survives across sessions automatically
- **Progressive Disclosure** — Layered retrieval with token cost visibility
- **mem-search Skill** — Natural language queries against your project history ("What did I decide about the auth architecture?")
- **Chroma Vector DB** — Hybrid semantic + keyword search
- **Web Viewer UI** — Browse all observations at localhost:37777
- **Type Indicators** — 🔴 critical, 🟤 decision, 🔵 informational
- **Branch-Scoped Memory** — Git ancestry filtering (new — filters memory by branch context)
- **Manual Memory Save** — Explicitly capture important decisions via `save_memory` tool
- **Project Exclusion** — Glob patterns to exclude projects from tracking
- **Citations** — Reference past observations by ID
- **Beta: Endless Mode** — Biomimetic memory architecture for extended sessions

---

## Installation

```bash
/plugin marketplace add thedotmack/claude-mem
/plugin install claude-mem
```

Restart Claude Code. Context from previous sessions will automatically appear.

**Important:** Claude-Mem is published on npm, but `npm install -g claude-mem` only installs the SDK — it does NOT register hooks or start the worker service. Always install via `/plugin` commands.

### Requirements

- Node.js (npm in PATH)
- Bun (auto-installed if missing)
- uv (auto-installed if missing, provides Python for Chroma)

---

## Configuration

Settings managed in `~/.claude-mem/settings.json` (auto-created with defaults on first run):

```json
{
  "CLAUDE_MEM_MODEL": "claude-haiku-4-5",
  "CLAUDE_MEM_WORKER_PORT": "37777",
  "CLAUDE_MEM_CONTEXT_OBSERVATIONS": "50",
  "CLAUDE_MEM_CHROMA_ENABLED": true,
  "CLAUDE_MEM_EXCLUDED_PROJECTS": "",
  "CLAUDE_MEM_FOLDER_CLAUDEMD_ENABLED": false
}
```

```bash
# Edit via CLI
./claude-mem-settings.sh

# Or view current settings
curl http://localhost:37777/api/settings
```

---

## When to Use It

**Always use when:** Working on multi-session projects, switching between branches, maintaining architectural decisions across days/weeks, onboarding Claude to a project you've been working on.

**Skip when:** One-off scripts, throwaway experiments, projects where session continuity doesn't matter.

---

## Watch Out For

- Beta features (Endless Mode) add 60-90s latency per tool observation
- Worker service runs on port 37777 — ensure it's available
- Hook errors are designed to fail gracefully (exit code 0) to avoid blocking Claude Code
- The plugin has been under extremely active development (1,200+ PRs, frequent releases)

---

*Last updated: February 2026*
