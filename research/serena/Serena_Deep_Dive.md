# Serena — Deep Dive

IDE-like semantic code intelligence for Claude. The Eyes of the Holy Trinity.

---

## What Is Serena?

Serena is a free, open-source MCP server that gives Claude IDE-like capabilities — symbol-level code retrieval, semantic navigation, and precision editing. Instead of reading entire files or doing grep searches, Claude can use tools like `find_symbol`, `find_referencing_symbols`, and `insert_after_symbol` to work like a developer in an IDE.

It supports 30+ programming languages through Language Server Protocol (LSP) integration, and offers an alternative JetBrains plugin backend for even deeper code analysis.

**By:** Oraios AI  
**License:** Free & open source  
**GitHub:** [github.com/oraios/serena](https://github.com/oraios/serena)

---

## The Problem It Solves

Claude Code lacks built-in codebase indexation. Unlike Cursor, it doesn't pre-index your project for semantic understanding. Every time Claude needs to find a function, it reads entire files. Need to understand a class hierarchy? It greps through the codebase. Want to edit a method? String replacement on the raw text.

This works for small projects but falls apart at scale. A 500-file codebase means Claude burns through tokens reading files it doesn't need, missing relationships between symbols, and making imprecise edits.

Serena pre-indexes your project and provides symbol-level access. Claude calls `find_symbol("authenticate")` and gets the exact function — definition, parameters, return type, file location. No reading entire files. No grep. No guessing.

---

## How It Works

### Two Backend Options

**1. LSP Backend (Free/Open-Source)**

Builds on Language Server Protocol — the same technology powering "Go to Definition" in your IDE. Auto-installs language servers for:

- Python (pylsp)
- JavaScript/TypeScript (typescript-language-server)
- Rust (rust-analyzer)
- Go (gopls)
- Java, C++, Ruby, and 8+ others

**2. JetBrains Plugin Backend**

Leverages IntelliJ/PyCharm/WebStorm/GoLand/CLion code analysis. Supports all JetBrains-supported languages. Most robust experience but requires a JetBrains IDE. Works with everything except Rider.

---

## Core Tools

### Code Retrieval

| Tool | What It Does |
|---|---|
| `find_symbol` | Locate functions, classes, methods by name |
| `find_referencing_symbols` | Find everything that calls/uses a symbol |
| `get_symbols_overview` | High-level map of exports, imports, functions in a file |
| `search_in_files` | Regex search across the codebase |

### Code Editing

| Tool | What It Does |
|---|---|
| `insert_after_symbol` | Add code after a specific symbol |
| `replace_symbol_body` | Replace a function/method body directly |

### Session Memory

| Tool | What It Does |
|---|---|
| `write_memory` | Store notes that persist within a session |
| `read_memory` | Retrieve stored session notes |
| `list_memories` | See all stored memories |

### Shell Execution

Serena can also execute shell commands (tests, linters, builds) — enabling autonomous error correction.

---

## The Token Efficiency Argument

**Without Serena:**
```
Claude: "Let me find the authenticate function"
→ Reads auth.ts (500 lines, ~2000 tokens)
→ Reads middleware.ts (300 lines, ~1200 tokens)
→ Finally finds it in helpers/auth.ts (400 lines, ~1600 tokens)
Total: ~4,800 tokens to find a 10-line function
```

**With Serena:**
```
Claude: find_symbol("authenticate")
→ Returns: src/helpers/auth.ts:45, function authenticate(credentials)
→ Gets exactly the 10-line function body
Total: ~200 tokens
```

24x more efficient. And that's one lookup. In a real debugging session with dozens of lookups, the savings are massive.

---

## Installation

### Claude Code (one command)

```bash
claude mcp add serena -- uvx --from git+https://github.com/oraios/serena serena start-mcp-server --project-root /path/to/project
```

### Claude Desktop (config file)

```json
{
  "mcpServers": {
    "serena": {
      "command": "uvx",
      "args": [
        "--from", "git+https://github.com/oraios/serena",
        "serena", "start-mcp-server",
        "--project-root", "/path/to/your/project"
      ]
    }
  }
}
```

### Prerequisites

- **uv** — Python package manager (install from [astral.sh](https://astral.sh))
- Language servers auto-install for supported languages

---

## Best Use Cases

**Excels at:**
- Complex refactoring — rename a function, update all references across dozens of files
- Deep debugging — trace bugs through call stacks by following symbol references
- Feature implementation — add to large codebases where understanding context is critical
- Onboarding — efficiently understand a new project via symbol overview

**Less useful for:**
- Empty/new projects (no symbols to navigate)
- Very small projects (reading whole files is trivial)
- Non-code work (documentation, configs)

---

## The Holy Trinity

Serena is one third of the most effective MCP combination:

| MCP Server | Role | Provides |
|---|---|---|
| Sequential Thinking | The Brain | Structured reasoning for complex decisions |
| Context7 | The Library | Live, version-accurate documentation |
| **Serena** | **The Eyes** | Semantic code understanding & symbol search |

**Context7** understands LIBRARY code (external docs). **Serena** understands YOUR code (your codebase). Together, Claude has complete vision.

---

## Integration Workflow

```
1. /plan → Enter read-only mode
2. find_symbol("calculateTotal") → Locate target
3. get_symbols_overview("src/api/users.ts") → Understand module
4. find_referencing_symbols("calculateTotal") → Find all callers
5. /execute → Exit plan mode
6. replace_symbol_body("calculateTotal", "...") → Apply changes
7. Run tests → Verify correctness
```

---

*Last updated: February 2026*
