---
title: A fix that raises a bound must prove that bound is the one that BINDS — an outer timeout cannot rescue an inner wait that already gave up
date: 2026-07-27
phase: U17 §S6 (the arrived plant) — found by a CI red on the stage's own commit
modules: [vite.config.ts, src/ui/__tests__/App.test.tsx, TODO.md]
tags: [flake, timeout, nested-bounds, prescription, react-lazy, ci, event-loop-starvation]
---

## Problem

CI run **30310885497** went red on `src/ui/__tests__/App.test.tsx` — the wiped-device survivor's
re-entry arm. That is the *same arm* `TODO.md` had recorded, earlier the same day, as **"THE
INTERMITTENT FULL-SUITE FAILURE IS CAPTURED AND CLOSED"**, complete with a filed fix and the
instruction: *"If a red returns after this, it is a genuine hang — treat it as one."*

It was not a hang. And the failure **mode had changed**, which was the only visible tell: the filed
sighting was `Error: Test timed out in 5000ms`; this was
`TestingLibraryElementError: Unable to find an element by: [data-testid="recovery-flow"]` at
**5033ms**.

## Root Cause

The filed fix raised **vitest's per-test `testTimeout` from 5s to 20s** (`vite.config.ts:97-98`).
That change was real and was genuinely applied — verified in source, not assumed.

But the failing arm carries **its own inner budget**:

```ts
await screen.findByTestId('recovery-flow', undefined, { timeout: 5_000 })
```

**An outer per-test budget can never rescue an inner wait that has already given up.** The inner
`findBy` expires at ~5000ms and throws; vitest's 20s outer budget is still nine-tenths unspent and
never gets the chance to matter. The prescription raised a bound that *cannot fire first*, so it was
a no-op against this failure — while reading, to every future reader, like a closed ticket.

> ## ⚠️ UPDATE 2026-07-31 — THE DIAGNOSIS BELOW WAS ALSO WRONG. THE HEADLINE LESSON SURVIVES INTACT.
>
> This page said *"The diagnosis underneath it had been **right**: CPU contention starving a wait in a
> parallel run."* **It was not.** The arm was never slow and was never starved. `vi.mock('../RecoveryFlow')`
> was being **BYPASSED**, and App mounted the **REAL** `RecoveryFlow` — which carries no
> `data-testid="recovery-flow"`, so the wait could never succeed and burned whatever budget it was
> given. Every "timeout" reading was the symptom of a component-identity bug.
>
> **Chain:** `App.tsx` imported each lazy chunk from TWO sites (the `lazy()` initializer and the warm
> effect). Vite gives a module ONE mutable callstack array for its lifetime
> (`vite/dist/node/module-runner.js:1214-1218`); Vitest push/splices the mocked id around an await
> (`startVitestModuleRunner…js:393-403`, carrying its own warning *"this will not work if user does
> `Promise.all(import(), import())`"*); a second arrival inside that window trips `isSelfImport` and is
> served `_vitest_original` (`:560-563`); and `React.lazy` caches that resolution permanently, so one
> lost race pins the real component for the whole file.
>
> **Proof, deterministic and public-API-only:** two `import()` call sites in one module, module
> `vi.mock`'d, fired concurrently → `['STUB','REAL']`. The memoized-loader shape → `['STUB','STUB']`.
> Corroborating evidence was sitting in CI all along: run **30310885497**, the ONLY red whose inner
> budget was smaller than the outer, printed a DOM containing "Use your recovery word" and "Open with
> my recovery word" (`RecoveryFlow.tsx:176`/`:231`) — the real component, never the stub.
>
> **THE BITTER RIDE-ALONG, and it is this page's own lesson eating itself:** raising the inner budget
> to 20s made it EQUAL to `testTimeout`, so the outer clock always fired first and the DOM dump was
> suppressed. The fix-that-raised-a-bound didn't just fail to bind — **it destroyed the only
> diagnostic that had ever named the bug.**
>
> **FIX:** one memoized loader per chunk in `App.tsx` (single-flight ⇒ the overlap is
> unrepresentable), with a `.catch` that clears the slot so a failed warm still leaves the click a
> retry — `ErrorBoundary.tsx:2-8`'s offline-survivor case. The redundant pre-import was removed and
> the inner budget returned below `testTimeout` so it can print its DOM again.
>
> **What survives, and why this page still earns its place:** the title lesson is unchanged and was
> vindicated twice over — *a fix that raises a bound must prove that bound is the one that BINDS.*
> Add its corollary: **when three prescriptions in a row all adjust clocks, stop adjusting clocks.**
> A budget that keeps expiring on work that should take milliseconds is evidence the wait is
> impossible, not slow.

~~The diagnosis underneath it had been **right**: CPU contention starving a wait in a parallel run.~~
Only the prescription was wrong, and it was wrong in the most expensive way — it named a real
mechanism, changed real code, and left the defect untouched.

The mechanism the inner budget actually governs: `RecoveryFlow` is reached through `React.lazy`, so
the click starts a **dynamic import**, and the wait races module resolution plus a Suspense flush
against a wall clock. Under a contended parallel run the **event loop is starved** — the import is
not slow. That same budget had already been raised once for exactly this reason (1s → 5s,
2026-07-18) and blew through the raise, which is precisely what [insight 104](104-a-starved-timing-budget-fails-only-the-control-arm-so-the-sweep-it-validates-goes-silently-vacuous.md)
predicts about raising a racy constant: *a bigger number relocates the failure to the next unlucky
runner.*

## Fix

**Determinism, not a third number.** `await import('../RecoveryFlow')` before the click. The module
is `vi.mock`'d already, so resolving it up front removes module resolution from the timed path
entirely; what remains is a render flush, and the surviving budget is an explicit **hang guard** —
the same philosophy the `testTimeout` bump was reaching for, applied to the clock that actually
governs. The `testTimeout` change stays: it is correct, it simply governs a different clock.

The `TODO.md` header was rewritten from **CLOSED** to a recurrence record carrying the wrong-clock
analysis, and — deliberately — is **not** marked closed again: the contention is not reproducible
locally (the arm passes on Windows every time, including before the change). What is *proven* is
that the previous prescription targeted a bound that cannot bind. That is a different claim from
"the flake is dead", and conflating the two is what produced the false closure in the first place.

## Key Insight

**When a fix adjusts a limit, enumerate every limit on the path and prove which one fires first.**
Waits nest — an inner poll inside an outer test budget inside a CI step budget inside a job budget —
and only the tightest one is ever observed. Raising any of the others changes nothing while
producing all the outward signs of a fix: a real diff, a plausible rationale, a closed ticket.

The diagnostic signature is cheap and reliable: **if the observed failure mode is not the one the
raised bound produces when it expires, the raised bound is not the one that fired.** A `testTimeout`
expiry says `Test timed out in Nms`; an element-not-found at ~N ms says an inner poll expired. The
two messages are different because the two clocks are different, and the message was sitting in the
log the whole time.

This is [insight 105](105-a-filed-prescription-does-not-inherit-the-trust-of-its-diagnosis.md)
sharpened to a specific failure shape: 105 says a prescription does not inherit its diagnosis's
credibility; this says **verify the prescription's named mechanism can actually produce the observed
symptom** — a correct diagnosis attached to a mechanism that cannot fire is worse than no fix,
because it closes the investigation.

## Also Applies To

Any nested-bound system: HTTP client vs server vs reverse-proxy timeouts (raising the server's while
the client gives up first); DB statement vs transaction vs connection timeouts; retry budgets inside
overall deadlines; CI step-level vs job-level timeouts; debounce inside throttle; a `waitFor`
inside an `act()` inside a test budget. Also any "we raised the limit" fix that shipped without a
reproduction — if the limit was never observed to be the binding one, the fix is a hypothesis
wearing a diff.
