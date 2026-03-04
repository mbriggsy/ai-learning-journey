# OpenCode: Research Summary
*AI Coding Agent Deep Dive — March 2026*

---

## What Is OpenCode?

OpenCode is an open-source AI coding agent built for the terminal, desktop, and IDE. Originally created by the team behind SST (now rebranded as Anomaly Innovations), it has exploded in popularity as the community's answer to Claude Code. As of early 2026, it has over **112,000 GitHub stars**, 779 contributors, 9,000+ commits, and approximately **2.5 million monthly active developers**.

It is available as:
- A **Terminal UI (TUI)** — built with Bubble Tea (Go), providing a smooth, graphical-in-terminal experience
- A **Desktop App**
- A **VS Code / Cursor / IDE Extension**
- Compatible with any editor supporting the **Agent Client Protocol (ACP)**, including JetBrains, Zed, Neovim, and Emacs

---

## Architecture

### Client/Server Design
OpenCode's most distinctive architectural decision is its full client/server separation. The TUI is just one of many possible frontends — this design enables remote sessions, mobile control, and the upcoming **Workspaces** feature that persists context even when you close your laptop. Claude Code's simpler CLI architecture cannot support this.

### Model-Agnostic by Design
OpenCode acts as a **universal adapter** — it standardizes how prompts are sent to LLMs and how tools are used, but leaves model selection entirely to the developer. It supports **75+ AI model providers**, including:
- Anthropic Claude (via API key)
- OpenAI / GPT-4 class models
- Google Gemini
- AWS Bedrock
- Groq
- Azure OpenAI
- OpenRouter
- Local models via Ollama (enabling fully air-gapped operation)

### Built-in Agents
OpenCode ships with two primary built-in agents, switchable via the `Tab` key:
- **Build** — Full-access agent for development work (file ops, system commands, etc.)
- **Plan** — Read-only agent for analysis and planning without making changes

Plus two subagents:
- **General** — Multi-step research and task execution (`@general`)
- **Fast** — Read-only codebase exploration

Custom agents can be defined via markdown files with YAML frontmatter, stored globally or per-project.

### LSP Integration
OpenCode integrates with Language Server Protocol (LSP) servers automatically. This provides ~**50ms navigation** vs. ~45 seconds for text search on large codebases — a roughly 900x difference. Supported LSPs include Rust, Swift, Terraform, TypeScript, PyRight, and more.

### Storage & Sessions
Conversations are stored in a **SQLite database**, enabling persistent sessions and session management across restarts. The upcoming Workspaces feature will extend this to cross-device persistence.

---

## Key Features

| Feature | Details |
|---|---|
| **Model support** | 75+ providers including local models |
| **Interface** | TUI, Desktop App, IDE Extension |
| **Agent modes** | Build (full access) / Plan (read-only) |
| **LSP integration** | Auto-loads language servers; ~50ms navigation |
| **Custom commands** | Markdown files in `~/.config/opencode/commands/` |
| **Image input** | Drag-and-drop images into terminal |
| **Undo** | `/undo` command reverts changes |
| **Non-interactive mode** | `opencode -p "prompt"` for scripting/automation |
| **Permissions** | Granular Allow/Ask/Deny per tool (edit, bash, webfetch) |
| **Privacy** | Local-first; optional auditable share links |
| **Air-gapped mode** | Full offline operation via Ollama |
| **MCP support** | Model Context Protocol tool extensibility |

---

## OpenCode vs. Claude Code

### Philosophy
- **Claude Code** = Apple approach. Polished, fast, vertically integrated, Anthropic-only. "Just works" but you play by their rules.
- **OpenCode** = Android/Linux approach. Maximum flexibility, model-agnostic, customizable, community-driven. Rougher edges but you own the stack.

### Performance
| Metric | Claude Code | OpenCode |
|---|---|---|
| SWE-bench accuracy | 80.9%+ | Depends on model used |
| CORE Bench Hard (Opus 4.5) | 95% | Model-dependent |
| Speed | Optimized for fast output | Optimized for thoroughness |
| Context compaction | Automatic (built-in) | Manual / configurable |
| LSP navigation | Standard | ~50ms (vs. 45s text search) |

### Behavioral Differences (head-to-head, same model)
In refactoring tests using Claude Sonnet 4.5 in both tools:
- **Claude Code** preserved JSDoc comments, treating documentation as a separate layer from code logic
- **OpenCode** renamed everything including comments — more thorough, less nuanced

Neither is universally "right" — it depends on team conventions and whether docs are parsed by external tooling.

### Feature Comparison
| Feature | Claude Code | OpenCode |
|---|---|---|
| Model flexibility | Anthropic only | 75+ providers |
| Open source | ❌ | ✅ (MIT) |
| Desktop app | ❌ | ✅ |
| Local model support | ❌ | ✅ (Ollama) |
| Air-gapped mode | ❌ | ✅ |
| Custom agents | Limited | ✅ (markdown files) |
| Client/server architecture | ❌ | ✅ |
| Context persistence (Workspaces) | ❌ (in development) | ✅ (in development) |
| Safety guardrails | Built-in (can't disable) | Configurable |
| Automatic context compaction | ✅ | Manual |
| GitHub stars (Feb 2026) | ~71K | ~112K |
| Daily active commits (GitHub) | ~135K/day (4% of all) | Community-driven |

---

## The January 2026 Drama

This is the defining event that split the community.

**January 9, 2026:** Anthropic silently blocked OpenCode from using Claude via consumer OAuth tokens. OpenCode removed Claude Pro/Max support from its codebase, citing "Anthropic legal requests."

**Developer reaction:** The backlash on Hacker News was immediate and fierce. The community interpreted this as Anthropic protecting its Claude Code revenue stream.

**OpenCode's response:**
- Launched **"Black"** — an enterprise API gateway at $20/$100/$200/month tiers
- Launched **"Zen"** — a pay-as-you-go curated model gateway with benchmarked models
- Added adaptive thinking support for Claude Sonnet 4.6 and Opus 4.6 for API key users

**OpenAI's response:** Publicly welcomed third-party tools as direct counter-positioning, calling out Anthropic's approach by name.

**What this means today:** You can still use Claude models in OpenCode via **direct API keys** or through the OpenCode Black/Zen gateways — but your Claude Pro/Max subscription no longer works through OpenCode. Claude-heavy OpenCode users now pay API rates for Anthropic models.

---

## Security

**CVE-2026-22812** (CVSS 8.8 — High) was disclosed in January 2026.

Previous versions started an HTTP server that allowed any website to execute arbitrary shell commands on your machine. The fix shipped in **v1.1.10**, and the server is now disabled by default.

Takeaways:
- Always run a current version (v1.1.10+)
- Open source = more eyeballs AND more attack surface
- The maintainers acknowledged in a February 2026 GitHub issue that recent releases had been "more turbulent than usual" — moving fast has trade-offs

---

## Pricing

| Option | Cost | Notes |
|---|---|---|
| **OpenCode (base)** | Free | MIT-licensed; bring your own API keys |
| **OpenCode Zen** | Pay-as-you-go | Curated, benchmarked models; pass-through pricing |
| **OpenCode Black** | $20 / $100 / $200/mo | Enterprise API gateway; team-tier access |
| **Claude Code Pro** | $20/mo | Anthropic subscription |
| **Claude Code Max** | $100–$200/mo | Heavy-use Anthropic subscription |

> **Note:** Running DeepSeek V3 through OpenCode costs roughly $5–15/month for moderate use. Local models via Ollama cost $0 in API fees.

---

## Who Should Use What?

### Use OpenCode if you:
- Want model flexibility and zero vendor lock-in
- Need privacy-first or air-gapped operation (healthcare, fintech, defense)
- Live in the terminal (Neovim, tmux, etc.)
- Want to optimize costs by routing simple tasks to cheaper models
- Value open-source auditability and community-driven development
- Want a desktop app with cross-IDE support

### Use Claude Code if you:
- Want the most polished, out-of-box experience
- Need proven SWE-bench accuracy and consistent performance
- Are deeply committed to the Anthropic ecosystem
- Prefer automatic context compaction and Anthropic's built-in safety handling
- Value stability over flexibility

---

## Bottom Line

OpenCode is not hype — it's a **legitimately powerful, production-ready alternative** to Claude Code with a massive and rapidly growing community. The Anthropic OAuth block in January 2026 was a catalyst that paradoxically made OpenCode stronger: the community rallied, stars doubled, and OpenCode launched its own model gateways to become less dependent on Anthropic entirely.

The choice is increasingly **philosophical and political** as much as technical: open ecosystem vs. vertically integrated. Both tools are excellent. The "best" one depends on what you value.

---

*Sources: opencode.ai, GitHub (anomalyco/opencode), InfoQ, DataCamp, Builder.io, Morph, Thomas Wiegold Blog, ByteIota — March 2026*
