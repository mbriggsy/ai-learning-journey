# A crashed verify stage reads as a clean result — Array.from's mapFn INVOKES what you meant to defer

## Problem
The U10 ultramode review's verify phase returned `verified: []` while the lens phase had produced 10 acted-on P0–P2 findings. The workflow "completed" — a reader skimming the result would conclude the verifiers cleared everything (zero material findings), fold nothing, and ship.

## Root Cause
`parallel(Array.from({ length: votes }, one))` — `Array.from`'s second argument is a **map function, invoked per element**. It called `one()` immediately, handing `parallel()` an array of live *promises* instead of thunks. `parallel()` rejected each ("expects an array of functions"), every per-finding verifier died before running, and the `.filter(Boolean)` discipline silently converted ten crashes into an empty verified list. The workflow's own `failures` block carried the truth — but the headline `result` looked like a completed review.

## Fix
`Array.from({ length: n }, () => one)` — the mapper RETURNS the thunk (or `Array.from({length: n}, () => () => agent(...))`). Then resume with `resumeFromRunId`: the 13 cached lens results replayed instantly and only the broken stage re-ran — the fix cost one stage, not the whole fan-out. All 10 findings verified real on the re-run (7 CONFIRMED, 3 ADJUSTED, zero false alarms — an empty verified list would have been a 100% miss).

## Key Insight
An empty result from a *crashed* checker is indistinguishable from a *passing* checker unless you read the failure channel — the same class as insight 019 (a crashed verifier is not a refutation), now reproduced inside my own orchestration layer. Two disciplines: (1) in workflow scripts, anything handed to `parallel()`/`pipeline()` must be a function — and `Array.from`'s mapFn is an *invoker*, the exact wrong tool to build a deferred list; (2) before acting on any phase's output, read the run's `failures` block first — `verified: []` + ten `parallel[i] failed` lines means UNVERIFIED, never CLEARED.

## Also Applies To
Any orchestration where a collection stage feeds a judgment stage (test shards, CI matrices, map-reduce audits): the reduce must distinguish "checked and empty" from "checker never ran." Any JS deferred-execution list built with `Array.from`/`map` over async factories.
