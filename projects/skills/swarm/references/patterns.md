# Swarm patterns — canonical Workflow scaffolds

Every scaffold prepends the `BRIGGSY_KIT` (see `briggsy-kit.md`) to every worker, defaults to `model: 'opus'` / `effort: 'xhigh'`, and returns **structured** results (a `schema`) so the coordinator gets clean data, not prose to re-parse. Read the Workflow tool's own description for the full API — these are the swarm-flavored shapes.

## Skeleton every swarm shares

```js
export const meta = {
  name: 'swarm-<task>',
  description: '<one line>',
  phases: [{ title: 'Work' }],
}

const BRIGGSY_KIT      = `...` // from briggsy-kit.md — verbatim
const BRIGGSY_KIT_LITE = `...` // from briggsy-kit.md — for mechanical low-effort stages only

const RESULT = { /* JSON Schema: force structured returns, not prose */ }

const kit     = (task) => `${BRIGGSY_KIT}\n\n---\n\nYOUR TASK:\n${task}`
const kitLite = (task) => `${BRIGGSY_KIT_LITE}\n\n---\n\nYOUR TASK:\n${task}`

phase('Work')
// ...one of the patterns below...
```

## 1. Flat fan-out (map a work-list, no dependencies)
The bread-and-butter: N independent items, one worker each, all at once.
```js
const results = await parallel(
  items.map(it => () => agent(kit(promptFor(it)), { label: `work:${it.id}`, model: 'opus', effort: 'xhigh', schema: RESULT }))
)
return results.filter(Boolean)            // a thrown/skipped worker resolves to null (per the Workflow API)
```

## 2. Fan-out → adversarial-verify (the quality default for correctness-bearing work)
Pipeline by default — each item verifies the moment its work completes, no barrier.
```js
const out = await pipeline(
  items,
  it  => agent(kit(doPrompt(it)), { label: `do:${it.id}`, phase: 'Work', model: 'opus', effort: 'xhigh', schema: RESULT }),
  (res, it) => parallel(
    [0,1,2].map(n => () => agent(
      kit(`Adversarially verify this result. Try to REFUTE it; default to refuted=true if uncertain.\n${JSON.stringify(res)}`),
      { label: `verify:${it.id}:${n}`, phase: 'Verify', model: 'opus', effort: 'xhigh', schema: VERDICT }
    )).then(v => ({ ...res, survived: v.filter(Boolean).filter(x => !x.refuted).length >= 2 }))
  )
)
return out.flat().filter(Boolean).filter(r => r.survived)
```

## 3. Per-stage effort (the efficiency lever only Workflow gives)
Cheap mechanical stages at `low`, hard reasoning at `xhigh`. Use the trimmed kit on the `low` stage (skip the manifesto read — see `briggsy-kit.md`).
```js
const found = await parallel(targets.map(t => () =>
  agent(kitLite(`Mechanically extract X from ${t}`), { effort: 'low',  model: 'opus', schema: EXTRACT })))   // cheap
const judged = await parallel(found.filter(Boolean).map(f => () =>
  agent(kit(`Judge whether ${f.x} is correct and why`),  { effort: 'xhigh', model: 'opus', schema: JUDGE })))  // hard
```

## 4. Loop-until-budget (scale depth to a token target)
Guard on `budget.total` — with no target, `remaining()` is `Infinity` and it runs to the agent cap (per the Workflow API).
```js
const acc = []
while (budget.total && budget.remaining() > 80_000) {
  const r = await agent(kit('Find the next batch of X'), { effort: 'xhigh', model: 'opus', schema: BATCH })
  acc.push(...r.items); log(`${acc.length} so far, ${Math.round(budget.remaining()/1000)}k left`)
}
return acc
```

## 5. The build-swarm — implement → review → fix (shipping a decided unit)
The shape for building real code from a deepened plan. **The unit of trust is the LOOP, not the implement step** — proven on the R40 U3 re-run (2026-06-19): a lone implementer produced *correct* routing but under-tested (skipped the fail-loud battery, left a branch unreached) and shipped one subtly-wrong guard; the independent panel caught all of it, the fix-loop closed it, and the result re-gated to **parity-plus** (1003 tests vs the human's 1001). The implementer's confident "complete" is a map.

```js
// One implementer for an ATOMIC unit; fan out across INDEPENDENT units only (a half-done atomic unit is WRONG, not partial).
const WT = '<path outside the repo>'   // implementer runs: git worktree add <WT> <base-commit>   (isolate every parallel implementer)

// 1 · IMPLEMENT — hand it the COVERAGE CHECKLIST (a lone worker skips these unless told):
const COVERAGE = `Tests MUST include: a fail-loud test for EVERY guard you write; a fixture that reaches EVERY branch (incl. the rarely-hit one); >=1 externally-derived magnitude oracle (not all-relative ==/>); a path test that actually RUNS the code (not one that drops at compile).`
const impl = await agent(kit(`In a worktree off <base>, implement <unit> per <plan paths> + <contract brief>. ${COVERAGE} Gate: typecheck && lint && test GREEN — a run you saw.`),
  { label: 'implement', phase: 'Build', model: 'opus', effort: 'xhigh', schema: IMPL })

// 2 · REVIEW — parallel ultramode lenses, READ-ONLY against the worktree (+ a divergence lens if an answer key exists):
const reviews = await parallel(LENSES.map(L => () =>
  agent(kit(`${L.prompt} Read the WHOLE changed files in ${WT}. ${SCOPE_GUARDS}`),
    { label: `review:${L.key}`, phase: 'Review', model: 'opus', effort: 'xhigh', schema: REVIEW })))
const punch = reviews.flatMap(r => r.findings).filter(f => ['P0','P1','P2'].includes(f.severity))

// 3 · FIX-LOOP — close the punch-list; MUTATION-PROVE every new test (mutate → watch it fail → revert); re-gate:
if (punch.length) await agent(kit(`In ${WT}, close: ${JSON.stringify(punch)}. For each test you add, mutate the code, see it fail, REVERT — prove it bites. Re-gate GREEN.`),
  { label: 'fix', phase: 'Fix', model: 'opus', effort: 'xhigh', schema: FIX })
```
For a first/risky run, **stage it** (checkpoint between implement · review · fix — see the worker fail the hard part before spending on review). Once a pipeline is proven, collapse it into one fire-and-forget workflow.

**Always close with a war diary.** After the loop returns, write the after-action report to `<repo-root>/.swarm-runs/<date>-<unit>.md` — the coordinator writes it from the synthesized results (or, in a single fire-and-forget workflow, a final scribe agent does, since the script has no filesystem access). It's the durable record of what was built, where the review drew blood, and the verdict. Template + path/gitignore convention: `war-diary.md`.

## Rules of thumb
- **The loop is the unit of trust, not the implement step.** Never call a swarm-built unit done on the implementer's "green" — a lone implementer lands ~90% correct but under-tests and ships subtle divergences. Implement → independent review → fix.
- **Hand every implementer a coverage checklist** (the `COVERAGE` block above) — a cheap prompt change that closes the biggest gap class (the proven misses were a whole fail-loud battery and an unreached branch).
- **Isolate parallel implementers in git worktrees** (`git worktree add <wt> <base>`); review and diff read-only against them. A reference answer (if one exists) powers a divergence lens; without one, the testing lens's "is every branch reached / is the fail-loud battery present" check carries that weight.
- **Decompose inline first** (in the main window, cheap) to discover the work-list, THEN swarm over it. You don't need the shape before the *task*, only before the *fan-out*.
- **Pin exact file paths in every worker prompt** — list the absolute paths, never "the four files" / "the skill's references". A worker handed no explicit paths *will wander* (proven: in the first live swarm, the one review worker whose prompt omitted the paths reviewed the *sibling* skill by mistake). Interpolate a `DIR` constant into every prompt.
- **`pipeline` by default**, `parallel` only when a stage genuinely needs ALL prior results at once (dedup/merge, early-exit on zero, cross-item comparison). A barrier you don't need is wasted wall-clock.
- **Always `schema`** — structured returns keep the coordinator light; prose makes it re-read.
- **Log what you drop** — if you cap to top-N or sample, `log()` it. Silent truncation reads as "covered everything."
- **Synthesize returns with Sequential Thinking** (standing rule) before relaying to Briggsy.
- **No silent self-orchestration** — workers can't nest (no Agent tool in a Workflow worker); if a sub-fan-out is needed, the *main window* runs another workflow. Keep decomposition at the coordinator.
