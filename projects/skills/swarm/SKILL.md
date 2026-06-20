---
name: swarm
description: Fire-and-forget MASS delegation that keeps THIS window light — you fire heavy work off to many workers you do NOT steer, and only their final answers land here (if you want to steer workers mid-run, that's loop-engineer). The main window only decomposes · launches · tracks · reviews; a background Workflow fans out the workers — each at opus + xhigh effort, each carrying Briggsy's full bar (CLAUDE.md + memory index auto-load; the elite-engineer manifesto injected) — so the coordinator never saturates. Use when the user wants to "swarm X", "fan this out", "fan out to many workers", "launch workers/agents to do X", run a "fire-and-forget batch", "mass-delegate" something, "delegate this to workers (no live steering)", or "keep this window light" / keep the main window from filling up. NOT for work you'll just do inline, a single lookup, or one quick agent task (just do it / one plain subagent); and NOT when the user wants to stay a LIVE coordinator who steers workers mid-run or needs milestone relay (that's loop-engineer / Agent Teams).
argument-hint: "[the task to swarm, e.g. 'audit every route for auth gaps' or a plan/doc ref]"
user-invocable: true
---

# Swarm

Fire-and-forget mass delegation. THIS window stays a **light coordinator** — it decomposes the task, launches a background **Workflow** that does the heavy lifting across many separate-context workers, and only ever sees the **final answers**. The file reads, diffs, tool output, and intermediate reasoning all burn in the *workers'* windows, never here — so one coordinator can drive far more work before its context saturates.

It rides the **Workflow tool**, because that is the only spawn path that gives all three of what this is for (proven 2026-06-19 — see `references/mechanics-and-proof.md`):
- **per-worker effort you set explicitly** (`effort: 'xhigh'` lands as a real `CLAUDE_EFFORT=xhigh` in the worker), and can *vary* (cheap stages at `low`);
- **only the final answer returns to the coordinator** (the context-light property — Agent Teams relays land in your window; Workflow returns just the result);
- **scale** — dozens to hundreds of workers per run.

## Quickstart — how to drive it (read this first)

**The user names a *decided* unit; the assistant flies it.** The user never writes the workflow.

1. **Decide first.** The unit must be ce:deepened + doc-reviewed *before* it's swarmed — swarm is fire-and-forget, so a worker can't stop to ask a question; it guesses or fails. Deciding the unit is a planning job, not a swarm job (this is swarm's version of "decide before dispatch"). If the unit is still fuzzy, plan it first, *then* swarm.
2. **Invoke** by naming the unit: "swarm R40 U4", "build-swarm the next unit — it's deepened", or `/swarm <unit>`.
3. **The assistant then:** recons the project (gates, invariants, plan doc) → launches the build-swarm (`patterns.md` §5) in an **isolated git worktree** — *the user's main checkout is never touched until they approve* → runs **implement → review panel → fix-loop** → returns only the final verdict (the user stays context-light).
4. **The user reviews the result** and says **land it** (→ commit to main) or **drop it** (→ the worktree evaporates, main untouched).

**Landmines:**
- **Don't swarm an un-decided unit** — ambiguity + fire-and-forget = a confident wrong guess.
- **A brand-new unit has no answer key** (unlike re-running shipped work) — lean on the coverage checklist + adversarial lens to substitute for a reference diff, and flag explicitly what can't be checked against known-good.
- **Doc-stat gates:** adding tests bumps a project's stat surfaces (e.g. the-back-nine's `verify:doc-stats`) — the build-swarm must reconcile README/roadmap counts or that gate fails.

## The contract

- **The coordinator executes nothing of the work.** It decomposes, launches, tracks, reviews. The moment it reads a whole file or runs the task itself, the context-light property is gone. If it needs to see Earth, a worker runs it and returns the result.
- **Every worker carries Briggsy's full bar.** CLAUDE.md + the memory index ride along automatically; the manifesto does **not** auto-load for a Workflow worker, so the **Briggsy kit** injects it (`references/briggsy-kit.md`). No worker operates below the bar just because it's a worker.
- **Fire-and-forget — no human mid-run.** You don't steer workers while they run (that's loop-engineer's job). Decide the decomposition before you launch; the swarm runs to done and you review the output. (Agent permission prompts — including an un-allowlisted shell/web/MCP call in a worker — can still pause it; nothing else does.)
- **Proven, not believed.** For correctness-bearing fan-outs, build the adversarial-verify pass *into* the swarm (workers refute each other's findings) so what comes back is already stress-tested — not one worker's self-report.

## When to use

When the user wants to push a *decomposable* chunk of work out to many workers and keep this window as pure coordination — "swarm this", "fan this out", "launch workers to do X", "keep this window light." Ideal when the task is wide (many independent items / angles) and the only thing that matters here is the synthesized result.

**Not for:** work you'll just do inline (do it — a swarm has overhead); a task where the user wants to **be the live coordinator**, watch individual workers, or get milestone relay mid-run (use **loop-engineer** / Agent Teams); a single quick lookup (one plain subagent, or just do it).

`swarm` (fire-and-forget, Workflow) and `loop-engineer` (live-coordinated, Agent Teams) are **siblings** — same "coordinator stays empty" spirit, different coordination needs. Pick by whether the user wants to steer mid-run.

## Arguments

`$ARGUMENTS`, optional:
- *the task* (a goal, a work-list, a plan/doc ref) → what to swarm.
- *nothing* → infer the obvious current task from context and **confirm the decomposition with the user before launching** (a wrong fan-out is expensive once it's in the air).

## The cadence

### 1 · Decompose (inline, cheap)
In *this* window, scout just enough to find the work-list or the stages — list the files, the routes, the angles, the items. You don't need the answer, only the shape of the fan-out. Keep it light; if it's getting heavy, that discovery is itself a swarm worker.

### 2 · Build the swarm
Write a Workflow (`references/patterns.md`) that:
- prepends the **`BRIGGSY_KIT`** to every worker prompt (`references/briggsy-kit.md`);
- defaults each worker to `model: 'opus'`, `effort: 'xhigh'` — downshift a purely mechanical stage to `effort: 'low'` with the trimmed kit;
- returns **structured** results (a `schema`), never prose;
- uses `pipeline` by default; `parallel` only when a stage truly needs all prior results at once;
- bakes in **adversarial-verify** for anything correctness-bearing.

### 3 · Launch (background) + track
Fire the Workflow. It runs in the background and notifies on completion — this window is now free. For a multi-batch swarm, optionally seed a `TaskCreate` spine so progress is on disk, not just in chat.

### 4 · Review the returns
Only the final answers land here. **Synthesize with Sequential Thinking** (standing rule for multi-agent returns) before you trust or relay anything.

### 5 · Verify what's load-bearing
If the swarm didn't already self-verify, adversarially check the claims that matter against source before calling anything done — runtime truth over a worker's say-so.

### 6 · Relay + distill
Report the synthesized result to the user. Run `/distill` on anything the swarm taught about the harness — each swarm should make the next one tighter.

## Defaults
- `model: 'opus'`, `effort: 'xhigh'` on every worker (Briggsy's bar). Per-stage downshift to `low` only for rote mechanical work.
- Full Briggsy kit on every worker (the manifesto inject is the whole point).
- Structured `schema` returns; `pipeline` over `parallel`; adversarial-verify for correctness.

## Notes
- Most of this *is* what `ultracode` already does (Workflow on every substantial task, only final answers land). The genuine delta `swarm` adds is the **Briggsy-kit inject** — workers don't inherit the manifesto on their own (proven). That's the reason this exists as a named, repeatable harness instead of a hand-rolled preamble each time.
- Workers **cannot self-orchestrate** (a Workflow worker has no `Agent`/`Workflow` tool). If a sub-fan-out is needed, the *coordinator* runs another workflow. Keep decomposition here.
- Mechanics are **probe-verified** against CLI 2.1.183 on 2026-06-19 — but this is a personal proving-ground harness on an experimental substrate; expect it to shift and keep `references/mechanics-and-proof.md` current.
