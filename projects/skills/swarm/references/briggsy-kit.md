# The Briggsy kit — the preamble every worker carries

This is the **one thing** a Workflow worker doesn't get for free and the whole reason `swarm` exists as more than vanilla ultracode. The probes (2026-06-19, CLI 2.1.183) proved exactly what a Workflow-spawned worker inherits:

- ✅ **auto-loads** — Briggsy's global `~/.claude/CLAUDE.md` (rides in the worker's `claudeMd` block) and the **memory INDEX** (`MEMORY.md` one-liners).
- ❌ **does NOT auto-load** — the elite-engineer **manifesto** (proven *absent* at a worker's startup; the session-start hook that injects it in a normal session doesn't appear to fire for Workflow workers) and the **bodies** of individual memory files (only the index rides along).
- ✅ **reachable on demand** — the worker can `Read` any of it; the filesystem is live from inside a worker.

So the kit closes exactly that gap: it tells the worker what it already has, points it at the manifesto to load, and tells it where memory bodies live. **Single-source** — it points at the live manifesto file, never a stale copy (the workflow script itself can't read files, so the kit is an *instruction the worker runs*, not inlined text).

## Canonical preamble (drop into the workflow script as a string constant)

```js
const BRIGGSY_KIT = `You operate at Briggsy's engineering bar — the same standard as the main session, no drop-off for being a worker.

ALREADY in your context (no action needed): Briggsy's global CLAUDE.md (his rules — "Briggsy is ATC", the NASA-standard NO COMPROMISES block) and the memory INDEX.

NOT auto-loaded for you — load it FIRST: read \`~/.claude/manifesto/elite-engineer.md\` and hold it as your operating standard for this task: quality is the deliverable; verify before you claim "done"/"works"/"fixed" (runtime truth over green tests); trace root cause, never patch symptoms; proven, not believed; own slips cleanly, no apology theater.

If your task needs a specific memory's detail, the bodies live at \`~/.claude/projects/C--Users-brigg-ai-learning-journey/memory/\` (only the index rode along, not the bodies) — read what you need.

Return ONLY your final result. Keep file reads, diffs, test output, and intermediate reasoning in your OWN window so the coordinator stays context-light.`
```

Then prepend it to every worker prompt:

```js
agent(`${BRIGGSY_KIT}\n\n---\n\nYOUR TASK:\n${taskPrompt}`, { model: 'opus', effort: 'xhigh', schema })
```

## Apply it to every worker

Briggsy's requirement is "every worker knows Briggsy code." Default: the kit goes on **every** worker, including verifiers.

One allowed economy: for a purely **mechanical, low-effort** stage (e.g. a rote rename sweep at `effort: 'low'`), the manifesto read is dead weight — use the trimmed kit below, which keeps the bar line + "return only your result" and drops the manifesto read. Don't trim it on anything correctness-bearing.

```js
const BRIGGSY_KIT_LITE = `You operate at Briggsy's bar. Your global CLAUDE.md is already in your context. This is a mechanical task — do it precisely and return ONLY your final result (keep intermediate work in your own window).`
```

## Why not inline the manifesto text instead of reading it?
Two reasons: (1) the workflow script has **no filesystem access** — it literally cannot read the manifesto to inline it; only the worker can. (2) Inlining means a hardcoded copy that goes stale the moment the manifesto changes. Pointing at the file keeps one source of truth. The cost is one `Read` per worker — cheap, and the worker was going to spend a turn orienting anyway.
