# Context7 MCP Server — Deep Dive

Live, version-specific documentation injected directly into your AI's context window. No hallucinated APIs. No deprecated patterns. No stale training data.

---

## What Is Context7?

Context7 is an open-source MCP server built by Upstash that fetches up-to-date, version-specific documentation and code examples from official library sources and injects them directly into your LLM's prompt at query time.

It solves a fundamental problem: LLMs have stale training data. When you're working with Next.js 16, React 19, or any library that's evolved since the model's knowledge cutoff, you get hallucinated APIs and deprecated patterns. Context7 eliminates this by giving Claude access to the actual current documentation before it generates code.

**Package:** `@upstash/context7-mcp`  
**License:** MIT (MCP server is open source; API backend is proprietary)  
**GitHub:** [github.com/upstash/context7](https://github.com/upstash/context7)  
**Dashboard:** [context7.com/dashboard](https://context7.com/dashboard)

---

## The Problem It Solves

Every AI coding assistant shares the same Achilles' heel: training data goes stale. Here's what happens without Context7:

**You ask:** "Set up Next.js 16 middleware that checks for a valid JWT"

**Without Context7:** Claude suggests code based on Next.js 13 patterns from its training data. Functions are renamed, APIs are deprecated, the middleware file location is wrong. You spend 30 minutes debugging code that was never going to work.

**With Context7:** Claude fetches the actual Next.js 16 documentation, sees the current middleware API, and generates working code on the first try.

This isn't a theoretical problem — it's the #1 frustration developers report with AI coding assistants. Context7 kills it dead.

---

## How It Works

Context7 provides two tools that Claude can invoke:

### Tool 1: `resolve-library-id`

Converts a general library name into a Context7-compatible identifier.

| Parameter | Type | Description |
|---|---|---|
| `query` | string | The user's question or task (used for relevance ranking) |
| `libraryName` | string | The library name to search for |

**Example:** "next.js" → `/vercel/next.js`

### Tool 2: `query-docs`

Fetches documentation for a specific library using its Context7 ID.

| Parameter | Type | Description |
|---|---|---|
| `libraryId` | string | Context7 library ID (e.g., `/mongodb/docs`) |
| `query` | string | The question or task to get relevant docs for |

Returns current documentation chunks, code examples, and API references — ranked by relevance to your specific question.

### The Flow

```
You: "Create a Next.js middleware that checks for a JWT. use context7"
    ↓
Claude invokes resolve-library-id("next.js")
    ↓
Context7 returns: /vercel/next.js (latest version)
    ↓
Claude invokes query-docs("/vercel/next.js", "middleware JWT authentication")
    ↓
Context7 returns: Current middleware docs, code examples, API patterns
    ↓
Claude generates code using ACTUAL current APIs
    ↓
Code works on the first try
```

---

## Key Features

### Version-Specific Documentation

Context7 doesn't just fetch "the docs" — it fetches docs for the exact version you're using. Mention a version in your prompt and it automatically matches: "How do I set up Next.js 14 middleware?" fetches Next.js 14 docs specifically.

### Community-Contributed Library Index

Libraries are indexed from official documentation sources. The community can contribute new libraries or update existing ones. This means coverage keeps expanding organically.

### Free Tier with Optional API Key

Context7 works without an API key for basic usage. A free API key from `context7.com/dashboard` unlocks higher rate limits. No paid tier required for individual developers.

### Universal Compatibility

Works with Claude Code, Claude Desktop, Cursor, Windsurf, VS Code (Cline, RooCode), and any MCP-compatible client. Not locked to any single tool.

### Auto-Invocation Rules

You can set up rules so Context7 fires automatically on code-related questions — no need to type "use context7" every time:

```
Always use Context7 MCP when I need library/API documentation,
code generation, setup or configuration steps without me having
to explicitly ask.
```

### Millisecond Response Times

Documentation lookup and injection is fast enough that it doesn't meaningfully slow down your workflow. The documentation is pre-indexed and chunked for efficient retrieval.

---

## What It Covers

Context7 indexes documentation from official library sources. Coverage includes but isn't limited to:

- **Frontend:** React, Next.js, Vue, Nuxt, Svelte, Angular, Tailwind CSS
- **Backend:** Node.js, Express, FastAPI, Django, Flask, Spring Boot
- **Databases:** MongoDB, PostgreSQL, Supabase, Firebase, Prisma
- **Cloud:** AWS SDK, Cloudflare Workers, Vercel, Netlify
- **Languages:** TypeScript, Python, Rust, Go standard libraries
- **DevOps:** Docker, Kubernetes, Terraform
- **AI/ML:** LangChain, OpenAI SDK, Hugging Face

The library index is community-contributed and continuously growing. You can add your own libraries via the project addition guide on GitHub.

---

## When to Use It

### Always Use Context7 When:

- Working with any framework or library that updates frequently
- Using a library version that may have released after Claude's training data
- Generating boilerplate or configuration code (setup files, middleware, configs)
- Integrating with third-party APIs where exact method signatures matter
- Working with React, Next.js, or any fast-moving frontend framework

### Skip Context7 When:

- Writing pure algorithmic code with no external library dependencies
- Working with stable, rarely-changing APIs you already know well
- Doing conceptual brainstorming that doesn't involve specific library code
- The library you need isn't indexed yet (check context7.com first)

### The Practical Test

If you're about to write code that calls a library function, and there's any chance the function signature has changed since Claude's training data — use Context7.

---

## Installation

### Claude Code (Recommended)

```bash
# With API key (recommended for higher rate limits)
claude mcp add --scope user context7 -- npx -y @upstash/context7-mcp --api-key YOUR_API_KEY

# Without API key (basic rate limits)
claude mcp add context7 -- npx -y @upstash/context7-mcp@latest
```

### Claude Desktop (Config File)

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp", "--api-key", "YOUR_API_KEY"]
    }
  }
}
```

### Remote HTTP (No Node.js Required)

```bash
claude mcp add --scope user --header "CONTEXT7_API_KEY: YOUR_API_KEY" --transport http context7 https://mcp.context7.com/mcp
```

### Auto-Invocation Rule

Add to your `CLAUDE.md` or project rules:

```
Always use Context7 MCP tools before planning or implementing code
that involves external libraries or frameworks.
```

This ensures Context7 fires automatically without you typing "use context7" in every prompt.

---

## How It Fits With Other Tools

| Tool | Relationship |
|---|---|
| **Sequential Thinking** | Perfect pairing — Sequential Thinking reasons, Context7 provides verified facts to reason with |
| **SuperClaude** | SuperClaude auto-invokes Context7 for evidence-based methodology |
| **GSD** | Context7 enhances GSD's research and execution phases with live docs |
| **Superpowers** | Context7 ensures the code Superpowers enforces TDD on uses current APIs |
| **Serena** | Complementary — Serena understands YOUR code, Context7 understands LIBRARY code |

### The Holy Trinity

Context7 is one third of the most popular MCP combination:

- **Sequential Thinking** = The Brain (structured reasoning)
- **Context7** = The Library (live documentation)
- **Serena** = The Eyes (codebase understanding)

Together, Claude can reason carefully, verify against current docs, and understand the actual codebase — covering all three knowledge gaps that cause AI coding failures.

---

## Before vs. After

### Without Context7

```
You: "Set up Supabase auth with Next.js App Router"
Claude: [generates code using old Pages Router patterns]
Claude: [suggests deprecated createClient import]
Claude: [uses auth helper methods that were renamed 3 versions ago]
Result: 45 minutes debugging why nothing works
```

### With Context7

```
You: "Set up Supabase auth with Next.js App Router. use context7"
Context7: [fetches current Supabase + Next.js docs]
Claude: [generates code using current App Router patterns]
Claude: [uses correct @supabase/ssr package]
Claude: [applies current auth helper methods]
Result: Working auth in 5 minutes
```

---

## Tips & Best Practices

1. **Get a free API key** — Basic rate limits are fine for casual use, but a free key unlocks much higher limits
2. **Set up auto-invocation** — Add the rule to your CLAUDE.md so you never forget to invoke it
3. **Be specific about versions** — "Next.js 14" gets you v14 docs, "Next.js" gets latest
4. **Use library IDs directly** — If you know the ID (e.g., `/supabase/supabase`), you can skip the resolve step
5. **Pair with Sequential Thinking** — For complex decisions, let Sequential Thinking reason about the docs Context7 provides
6. **Check coverage first** — Not every library is indexed. Visit context7.com to confirm before relying on it

---

*Last updated: February 2026*
