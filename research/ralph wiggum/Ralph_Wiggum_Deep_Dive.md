# Ralph Wiggum — Deep Dive

Autonomous development loops. Let Claude keep working until the job is actually done.

---

## What Is Ralph Wiggum?

Ralph Wiggum is a Claude Code plugin that implements autonomous development loops — continuous cycles where Claude iteratively works on your project until completion criteria are met. Named after the Simpsons character, it embodies the philosophy of persistent iteration despite setbacks. You define a task and success criteria, and Ralph prevents Claude from stopping early.

**Concept By:** Geoffrey Huntley  
**Official Plugin By:** Anthropic  
**GitHub:** [anthropics/claude-code/plugins/ralph-wiggum](https://github.com/anthropics/claude-code/tree/main/plugins/ralph-wiggum)  
**Community Implementations:** snarktank/ralph, frankbria/ralph-claude-code, harrymunro/ralph-wiggum

---

## The Problem It Solves

Claude tends to stop too early. It does one pass at a task, declares it done, and exits — even when tests are still failing, edge cases aren't handled, or features are incomplete. Developers end up running Claude over and over, each time saying "that's not done, keep going."

Ralph automates this. It intercepts Claude's exit attempts and re-feeds the original prompt until actual completion criteria are met.

---

## How It Works

### The Core Mechanism

```bash
/ralph-loop "Your task description" --completion-promise "DONE" --max-iterations 50
```

1. Claude works on the task
2. Claude tries to exit
3. **Stop hook intercepts** (exit code 2 blocks the exit)
4. Stop hook re-feeds the SAME prompt
5. Each iteration sees modified files and git history from previous runs
6. Loop continues until the completion promise string is emitted OR max iterations hit

The loop happens inside your current session — no external bash loops needed.

### The Exit Gate

Ralph uses a dual-condition exit gate: Claude must output BOTH the completion promise string AND an explicit EXIT_SIGNAL. String matching is exact — "DONE" won't match "done" or "Done."

---

## Two Approaches

### 1. Plugin Method (Single Context Window)

Everything runs in one Claude Code session. Simpler to set up but context can fill up on long tasks.

```bash
/ralph-loop "Build a REST API with CRUD, validation, and tests. 
Output <promise>COMPLETE</promise> when done." 
--completion-promise "COMPLETE" --max-iterations 50
```

### 2. Bash Loop Method (Fresh Context Per Iteration)

Each iteration spawns a new Claude Code instance with clean context. Memory persists only through git history, `progress.txt`, and `prd.json`. Better for long-running tasks that would exhaust a single context window.

```bash
while true; do
  claude --prompt @PROMPT.md
  [[ $? -eq 0 ]] && break
done
```

**Key difference:** The bash loop gives each iteration a fresh context window — this is fundamentally better for long-running tasks. The plugin approach keeps everything in one window, which means context fills up.

---

## Safety Controls

- **--max-iterations** — Hard cap on iterations. ALWAYS set this. Start with 10-20.
- **--completion-promise** — Exact string that signals genuine completion
- **Rate Limiting** — 100 calls/hour (configurable)
- **Circuit Breaker** — Detects runaway loops and cascading errors
- **Response Analyzer** — Semantic understanding with two-stage error filtering
- **Timeout Guard** — Configurable execution timeout per iteration

### Cost Protection

One developer wiped their entire $20/month API quota in a single Ralph loop. Always set `--max-iterations` and monitor the first 2-3 iterations before walking away.

---

## Real Results

- Geoffrey Huntley ran a 3-month loop that built a complete programming language
- YC hackathon teams shipped 6+ repos overnight for $297 in API costs
- The technique has spread widely — listed on AwesomeClaude, documented on DeepWiki, covered by numerous blogs

---

## The PRD-Driven Workflow

Ralph works best with a structured Product Requirements Document (PRD):

```json
[
  {
    "category": "setup",
    "description": "Initialize Next.js project with TypeScript",
    "steps": [
      "Run create-next-app with TypeScript template",
      "Install additional dependencies",
      "Verify dev server starts"
    ],
    "passes": false
  },
  {
    "category": "feature",
    "description": "User authentication with JWT",
    "steps": [
      "Create auth middleware",
      "Add login/register endpoints",
      "Write integration tests"
    ],
    "passes": false
  }
]
```

Each iteration picks the next `"passes": false` item, implements it, runs tests, and marks it as passing. When all items pass, Ralph exits.

### The Learning Loop

After each iteration, Ralph updates AGENTS.md files with learnings. Future iterations (and human developers) benefit from discovered patterns, gotchas, and conventions — similar to Compound Engineering's compounding philosophy.

---

## Best Practices

1. **Start with a comprehensive PRD** — Ralph is only as good as the prompt driving it. Garbage in, garbage out.
2. **Break PRD items small** — Each should complete in one context window. Too big = poor code when context runs out.
3. **ALWAYS set --max-iterations** — Start with 10-20 for smaller projects. Scale up once you trust the loop.
4. **Watch the first 2-3 iterations** — Confirm things are heading the right direction before walking away.
5. **Use sandboxing** — Enable it for long-running autonomous tasks.
6. **Include escape hatch instructions** — "After 15 iterations, if not complete: document what's blocking, list what was attempted, suggest alternatives."
7. **Use with visual testing** — Playwright MCP or Agent Browser for verifying UI changes.

---

## Commands

| Command | What It Does |
|---|---|
| `/ralph-loop` | Start a Ralph loop with a given prompt |
| `/ralph-loop:cancel-ralph` | Cancel the active loop |
| `/ralph-loop:help` | Explain the technique and available commands |

### Community Tools (frankbria/ralph-claude-code)

| Command | What It Does |
|---|---|
| `ralph-setup project-name` | Create new Ralph project |
| `ralph-enable` | Interactive wizard to enable Ralph in existing project |
| `ralph-import prd.md project` | Convert PRD/specs to Ralph project |
| `ralph --monitor` | Start with integrated monitoring |
| `ralph --status` | Check current loop status |
| `ralph --live` | Enable live streaming output |

---

## When to Use It

**Ideal for:**
- Large refactors (migrating test frameworks, updating APIs across dozens of files)
- Batch operations (processing support tickets, generating docs)
- Multi-phase feature builds with clear acceptance criteria
- Any task where "keep trying until it works" is the right strategy
- Building proof-of-concept projects from a PRD

**Skip when:**
- Judgment-heavy work that needs human review at each step
- Exploratory work where requirements aren't clear
- Quick tasks Claude can finish in one pass
- Production applications (Ralph is for POCs and iteration)

---

## The Philosophy

From Geoffrey Huntley: *"Deterministically bad means failures are predictable and informative. Use them to tune prompts."*

This inverts the usual AI workflow. Instead of carefully reviewing each step, you define success criteria upfront and let the agent iterate toward them. Failures become data. Each iteration refines the approach. The skill shifts from "directing Claude step by step" to "writing prompts that converge toward correct solutions."

---

*Last updated: February 2026*
