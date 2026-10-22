# SuperClaude — Framework Deep Dive

A configuration framework that transforms Claude Code from a generic AI assistant into a specialized, context-aware development partner.

---

## What Is SuperClaude?

SuperClaude is an open-source, lightweight, drop-in configuration framework for Claude Code. It's not standalone software — it's a carefully organized collection of markdown instruction files that Claude Code reads to adopt specialized behaviors. The power comes from the crafting of these contexts and their systematic organization, not from any executing code or running processes.

It installs to `~/.claude/` and works immediately. Zero external dependencies.

**GitHub:** [github.com/SuperClaude-Org/SuperClaude_Framework](https://github.com/SuperClaude-Org/SuperClaude_Framework)

---

## Core Concept: Cognitive Personas

SuperClaude's killer feature is its **16 domain specialist agents** that Claude Code can invoke for specialized expertise. Rather than getting generic AI responses, you get responses shaped by deep domain knowledge, specialized communication patterns, and focused problem-solving approaches.

### How Auto-Activation Works

SuperClaude analyzes your request and automatically activates the appropriate cognitive persona based on keywords and patterns:

- `/sc:implement "JWT authentication"` → **Security Engineer** auto-activates
- `/sc:design "React dashboard"` → **Frontend Architect** auto-activates
- `/sc:troubleshoot "memory leak"` → **Performance Engineer** auto-activates

You can also explicitly invoke any persona as a flag on any command:

- `/analyze --frontend` — Frontend specialist analysis
- `/optimize --performance` — Performance-focused optimization
- `/review --security` — Security-focused code review
- `/refactor --architect` — Architectural refactoring approach

### Persona Collaboration

Ask about database optimization and you get the backend specialist. Ask about user experience and the frontend architect responds. Ask about both, and they collaborate — mirroring how real dev teams operate.

---

## 30 Specialized Commands

All commands are prefixed with `/sc:` and cover the full software development lifecycle.

### Ideation & Planning

| Command | Purpose |
|---|---|
| `/sc:brainstorm` | Requirements gathering through Socratic dialogue |
| `/sc:business-panel` | Business validation of requirements |
| `/sc:design` | Architecture and system design |
| `/sc:spec-panel` | Technical validation of designs |
| `/sc:workflow` | Detailed implementation planning |

### Execution & Building

| Command | Purpose |
|---|---|
| `/sc:implement` | Step-by-step implementation with quality gates |
| `/sc:spawn` | Decompose features into parallelizable tasks |
| `/sc:task` | Execute tasks with coordination |
| `/sc:build` | Build with framework-specific flags (e.g., `--react --tdd`) |

### Quality & Review

| Command | Purpose |
|---|---|
| `/sc:analyze` | Code analysis with focus flags (security, performance, etc.) |
| `/sc:test` | Testing with coverage and e2e options |
| `/sc:audit` | Security and performance auditing |
| `/sc:review` | Code review from specialist perspectives |

### Research & Context

| Command | Purpose |
|---|---|
| `/sc:research` | Deep web research (enhanced with Tavily MCP) |
| `/sc:index-repo` | Create comprehensive project index |
| `/sc:help` | View all available commands |

### Example: Full Feature Workflow

```
1. /sc:brainstorm "enterprise feature"        # Requirements
2. /sc:business-panel @requirements.md         # Business validation
3. /sc:design feature --type architecture      # Architecture
4. /sc:spec-panel @design.md --focus arch,test # Technical validation
5. /sc:workflow feature --depth deep           # Detailed plan
6. /sc:spawn "feature" --strategy adaptive     # Decompose into tasks
7. /sc:task execute task1 --parallel           # Execute
8. /sc:analyze feature --focus security        # Security review
9. /sc:test --type all --coverage              # Full testing
```

---

## 7 Behavioral Modes

Modes shift Claude's entire operating style without changing the underlying model:

| Mode | Purpose |
|---|---|
| **Normal** | Standard development workflow |
| **Brainstorming** | Creative exploration, open-ended ideation |
| **Introspection** | Deep analysis, self-reflection on approach |
| **Task Management** | Focused execution, tracking, coordination |
| **Token Efficiency** | Compressed communication, lean output |
| **Orchestration** | Multi-agent coordination and delegation |

---

## Evidence-Based Methodology

SuperClaude enforces a strict "prove it" culture through its RULES.md:

- Claude must back up claims with proof and look up official documentation before making suggestions
- Smart model routing picks the right Claude variant for specific tasks
- No hallucinated API signatures or deprecated patterns — verification is mandatory
- Constructive pushback is built in — Claude will challenge your assumptions when warranted

This is where the **Context7 MCP** integration matters most. Instead of relying on potentially outdated training data, Claude fetches live, version-accurate documentation for whatever framework you're using.

---

## MCP Integrations

SuperClaude works with several Model Context Protocol servers for enhanced capabilities:

| MCP Server | Purpose |
|---|---|
| **Context7** | Live documentation lookup for any framework |
| **Sequential** | Deep logical analysis and problem decomposition |
| **Tavily** | Web search for deep research commands |
| **Magic (21st.dev)** | UI component generation and style matching |
| **Puppeteer** | End-to-end browser automation and testing |
| **Serena** | Code understanding — symbol search, dependency analysis |

SuperClaude automatically picks the right tool based on command flags, user intent, or code context.

---

## Quality Gates

SuperClaude includes built-in quality validators that run during implementation:

- **KISS** — Keep it simple, reject over-engineering
- **Purity** — Clean code principles
- **SOLID** — Object-oriented design principles
- **Let It Crash** — Resilient error handling patterns

The `/sc:implement` command supports a `--loop` flag that iterates until a quality score threshold is met (≥70) or max iterations (5) are reached.

---

## Architecture Overview

```
User Input: "/sc:analyze src/ --focus security"
    ↓
1. Parse Command → identify 'analyze' command
    ↓
2. Load Context → read commands/sc/analyze.md
    ↓
3. Check Flags → --focus security
    ↓
4. Auto-Activation → load security-engineer.md persona
    ↓
5. Apply Patterns → follow analysis workflow
    ↓
6. Generate Output → using loaded contexts
```

The entire system is markdown files organized into a clear hierarchy. No running processes, no execution layers — just extremely well-crafted context injection.

---

## Installation

### Quick Install (Recommended)

```bash
# Install via pipx
pipx install superclaude

# Install all 30 slash commands
superclaude install

# Optional: Install MCP servers for enhanced capabilities
superclaude mcp --list              # List available servers
superclaude mcp                     # Interactive installation
superclaude mcp --servers tavily context7  # Install specific servers

# Verify
superclaude install --list
superclaude doctor
```

### Manual Install

```bash
git clone https://github.com/SuperClaude-Org/SuperClaude_Framework.git
cd SuperClaude_Framework
./install.sh
```

Supports Linux, macOS, and Windows (WSL). The installer auto-detects your platform.

---

## How SuperClaude Compares

| Dimension | GSD | Superpowers | SuperClaude |
|---|---|---|---|
| **Core identity** | Project manager | TDD enforcer | Specialist team |
| **Primary value** | Planning & orchestration | Code quality & testing | Persona-driven expertise |
| **Approach** | Interview → Plan → Execute → Verify | RED → GREEN → REFACTOR | Route to specialist → Execute with domain knowledge |
| **Context rot solution** | Fresh subagents per task | Sub-agent development | Behavioral context injection |
| **Best for** | Large projects from scratch | Mission-critical code quality | Versatile day-to-day development |
| **Commands** | ~8 lifecycle commands | Skill-based activation | 30 specialized commands |
| **Learning curve** | Low — system guides you | Medium — TDD discipline required | Medium — many commands to explore |
| **Can combine with others?** | Yes — pairs well with SuperClaude | Yes — pairs with GSD | Yes — complements GSD's planning |

---

## Best Practices

1. **Start with `/sc:help`** to see all available commands
2. **Use `/sc:brainstorm` first** for any new feature — let Claude ask the right questions
3. **Let auto-activation work** — don't force personas unless you have a specific reason
4. **Pair with GSD** for large projects — GSD handles project orchestration, SuperClaude handles execution quality
5. **Install Context7 MCP** — the evidence-based methodology is dramatically more effective with live documentation
6. **Use `--loop` on `/sc:implement`** for important features — quality gates catch issues automatically

---

*Last updated: February 2026*
