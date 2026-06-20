# Quickstart — how to drive swarm

**The user names a *decided* unit; the assistant flies it.** The user never writes the workflow.

1. **Decide first.** The unit must be ce:deepened + doc-reviewed *before* it's swarmed — swarm is fire-and-forget, so a worker can't stop to ask a question; it guesses or fails. Deciding the unit is a planning job, not a swarm job (this is swarm's version of "decide before dispatch"). If the unit is still fuzzy, plan it first, *then* swarm.
2. **Invoke** by naming the unit: "swarm R40 U4", "build-swarm the next unit — it's deepened", or `/swarm <unit>`.
3. **The assistant then:** recons the project (gates, invariants, plan doc) → launches the build-swarm (`patterns.md` §5) in an **isolated git worktree** — *the user's main checkout is never touched until they approve* → runs **implement → review panel → fix-loop** → returns only the final verdict (the user stays context-light).
4. **The user reviews the result** and says **land it** (→ commit to main) or **drop it** (→ the worktree evaporates, main untouched).

## Landmines
- **Don't swarm an un-decided unit** — ambiguity + fire-and-forget = a confident wrong guess.
- **A brand-new unit has no answer key** (unlike re-running shipped work) — lean on the coverage checklist + adversarial lens to substitute for a reference diff, and flag explicitly what can't be checked against known-good.
- **Doc-stat gates:** adding tests bumps a project's stat surfaces (e.g. the-back-nine's `verify:doc-stats`) — the build-swarm must reconcile README/roadmap counts or that gate fails.
