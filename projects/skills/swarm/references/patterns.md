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

## Rules of thumb
- **Decompose inline first** (in the main window, cheap) to discover the work-list, THEN swarm over it. You don't need the shape before the *task*, only before the *fan-out*.
- **Pin exact file paths in every worker prompt** — list the absolute paths, never "the four files" / "the skill's references". A worker handed no explicit paths *will wander* (proven: in the first live swarm, the one review worker whose prompt omitted the paths reviewed the *sibling* skill by mistake). Interpolate a `DIR` constant into every prompt.
- **`pipeline` by default**, `parallel` only when a stage genuinely needs ALL prior results at once (dedup/merge, early-exit on zero, cross-item comparison). A barrier you don't need is wasted wall-clock.
- **Always `schema`** — structured returns keep the coordinator light; prose makes it re-read.
- **Log what you drop** — if you cap to top-N or sample, `log()` it. Silent truncation reads as "covered everything."
- **Synthesize returns with Sequential Thinking** (standing rule) before relaying to Briggsy.
- **No silent self-orchestration** — workers can't nest (no Agent tool in a Workflow worker); if a sub-fan-out is needed, the *main window* runs another workflow. Keep decomposition at the coordinator.
