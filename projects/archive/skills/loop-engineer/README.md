# loop-engineer — ARCHIVED 2026-06-24

> Retired here for reference, not deleted. It **worked** — this is about cost/benefit, not failure.

`loop-engineer` was a user-invocable skill: a **live, human-in-the-loop delegated build harness** on Claude Code **Agent Teams**. The team-lead (the main window) stays context-light while named teammates implement → independently verify → fix-loop, and the human steers mid-run. Its sibling [`../swarm`](../swarm) was the fire-and-forget half (over the **Workflow tool**) — launch a background fan-out, review the result.

## Why we archived it

Both skills were **thin discipline-layers over native capabilities** — `loop-engineer` over Agent Teams, `swarm` over the Workflow tool. Neither added a capability the native engine lacked; they encoded a *cadence + hard-won laws* on top. Keeping them as maintained skills was a bad trade:

- **The mechanism rots.** Each carried mechanism-specific cadence + caveats (CLI-version behavior, relay quirks) that go stale every harness/model release and need constant feeding.
- **They risk handcuffing native judgment.** As Agent Teams / the Workflow tool / native `ultracode` improve, a calcified skill can push the older, more manual path instead of letting native judgment use the better one.
- **The value was the lessons, not the wrapper.** The durable part — the principles — doesn't rot.

So we **harvested the lessons into session memory** (`feedback-delegated-build-laws` + `feedback-dont-wrap-improving-native-capabilities`) and retired the wrappers. Run delegated / multi-agent work *natively* with those principles in mind.

## Dogfood-proven first — that's why the lessons are trustworthy

`loop-engineer` got one full live run before retirement: **The Back Nine U6-render `ConfidenceBand`** (an eye-oracle UI surface). It earned its keep — the independent-verify loop **caught a real cardinal-sin bug that 61/61 green unit gates were blind to**, fixed it across two fix-loops, and locked it behind a proven regression test, all while the coordinator stayed context-light. It also surfaced the harness's rough edges (lossy messaging, shared working tree, async-swept `temp/`).

**The real lessons live in [`references/mechanism-and-caveats.md`](references/mechanism-and-caveats.md) → _First-dogfood field notes_.** If you read one thing here, read that.

## Before you un-archive either

Ask: does it add **durable** value native won't grow into? If it's just discipline, that discipline belongs in memory/principles applied to the native engine — not a wrapper you have to feed. The split worth remembering: **eye-oracle work** (taste/viz, human-in-the-loop) → stay-and-steer (Agent Teams); **test-oracle work** (green = done) → fire-and-forget (Workflow tool).
