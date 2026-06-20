# Mechanics + proof — the spawn-path playing field

The worker / effort / context-inheritance / nesting facts here are **empirically proven** (the two probes below), not recalled. The few raw tool-limit numbers (scale/concurrency) are from the live `workflows.md`, labeled inline — don't read them as probe-measured. Two probes on 2026-06-19, CLI 2.1.183, `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`:
- **scout** — a named teammate (Agent-tool path) that ran a nesting + context battery and relayed verbatim.
- **worker-context-probe** — a Workflow that spawned workers at `xhigh` and `low` effort and reported what each inherited, with a strict "in-context-at-startup vs. only-via-read" test.

## The three spawn paths

| | **Workflow `agent()`** | **Teammate** (`Agent` + `name`) | **Plain subagent** (`Agent`, no `name`) |
|---|---|---|---|
| Per-worker **effort** | ✅ explicit + variable (`CLAUDE_EFFORT=xhigh` observed in the worker's env) | ❌ inherits the main session's tier | ❌ inherits parent |
| Per-worker **model** | ✅ `opus` → `claude-opus-4-8` confirmed | ✅ confirmed (config records `"model":"opus"`) | ✅ |
| What returns to main | **only the final answer** (lightest) | a live relay that **lands in main's context** | final message to the caller |
| Can spawn its own workers | ❌ no `Agent` tool, no `Workflow` tool | ✅ plain subagents (depth 5) — but **cannot** add teammates | ✅ plain subagents (depth 5) |
| Manifesto auto-loads | ❌ — inject via the kit | ⚠️ **disputed** (see flag) | inherits parent |
| CLAUDE.md + memory **index** | ✅ auto | ✅ auto | ✅ auto |
| Memory file **bodies** | ❌ index only | ❌ index only | ❌ index only |
| Full Skill registry | ✅ | ✅ | ✅ |
| Scale *(limits per `workflows.md`, not probe-measured)* | dozens–hundreds; 16 concurrent / 1000 total per run; ≤4096 items per `parallel`/`pipeline` | lead-managed flat roster | ad hoc |

## The nesting verdict (the contradiction that started this, settled)
- **Teammate → teammate: HARD BLOCKED.** Verbatim runtime error: *"Teammates cannot spawn other teammates — the team roster is flat. To spawn a subagent instead, omit the name parameter."* The roster is flat; **only the lead grows it.**
- **Any agent → plain subagent: YES, to total depth 5.** The `Agent` tool is present at depths 1–4 and **silently stripped at depth 5** (the floor is enforced by tool-removal, not an error).
- The draft's old "5 levels deep" was a real number **mislabeled** — it's the *subagent* depth limit, never teammate nesting. Both halves are true: teammates can't add teammates; anyone can fan out plain subagents to depth 5.
- **Irrelevant to `swarm`** — Workflow workers have no `Agent` tool, so they don't nest, and Briggsy chose max-reasoning workers, *not* self-orchestrating ones. Recorded for completeness.

## Effort, proven
`effort: 'xhigh'` on a Workflow `agent()` is **behaviorally real**, not just an accepted param: the worker reported `CLAUDE_EFFORT=xhigh` in its own `env`; the contrast worker reported `CLAUDE_EFFORT=low`. Plain subagents/teammates have no effort param and **inherit** the parent's tier — so from an `ultracode`/xhigh main session they get xhigh for free, but you can't *vary* or *set* it per worker. Only the Workflow path gives explicit, per-worker, variable effort.

## The one flag (don't paper over — Briggsy's cardinal rule)
The two probes **disagree** on manifesto auto-load: scout (teammate path) claims it IS injected ("session-start hooks fire for teammates"); the workflow worker (careful test) reports it is NOT. They tested different paths, so both can hold — but scout may have conflated *reading* the file with it being *injected*. **`swarm` is unaffected:** it rides the Workflow path, where "manifesto absent" is the careful, agreed finding, and the kit injects it regardless. If a teammate-path variant is ever built, re-test before relying on auto-load — **the recipe:** spawn a named teammate and have it report whether the manifesto's first line is in its *startup* context *without* reading the file (the same in-context-vs-only-via-read battery `worker-context-probe` ran).

## Prerequisites (the Workflow tool itself)
CLI ≥ v2.1.154, a paid plan, and the Dynamic-workflows toggle (the `ultracode` keyword opts a single task into a workflow). Verified against the live `workflows.md`, 2026-06-19.
