---
title: Multi-violation files need multi-error surfaces — and LLM authors need concrete examples, not field lists
date: 2026-04-29
modules: [scripts/playtest/verify-calibration.ts, scripts/playtest/agents/seat-scripted.md, scripts/playtest/agents/seat-free-play.md]
tags: [validator-ergonomics, error-aggregation, prompt-engineering, llm-authoring, calibration-finding]
---

## Problem

Calibration retry run `2026-04-26-1303-3p` (seat-1 v1 / v2) produced
seat-log files with TWO independent shape drifts:

- `scenarioId: null` (schema requires a string).
- `questionsTried: "single string"` (schema requires an array of
  strings).

`verify-calibration` check 5 surfaced ONE of those errors and bailed:

```ts
if (result.errors.length > 0) {
  parseErrors.push(
    `${file}: ${result.errors[0]!.message}`,  // ← only the first
  )
}
```

The triage operator saw "questionsTried: array required" and went
hunting for the bad block — but the file ALSO had a `scenarioId: null`
violation that never appeared. They had to scroll the raw markdown to
find it. With multiple seats producing logs in parallel, the masked
violations grow combinatorially.

## Root Causes

**(1) Information funnelling.** The parser at `lib/log-parser.ts` does
the right thing — it accumulates per-block errors so the caller can
see all of them. But the verifier reduced the per-file array to its
first element before reporting. Two layers of perfectly correct work
pinched at the surface.

**(2) Field-list prompts.** The seat-agent templates (`seat-scripted.md`,
`seat-free-play.md`) listed every required field but never showed a
COMPLETE example. The agent had to imagine what well-formed YAML
looked like:

> Fields: `entryType`, `seat`, `seatName`, `timestamp`, `severity`
> (`low` | `medium` | `high`), `relatedScenario` (or `null`),
> `questionsTried`.

A field list specifies WHAT must be present. It does not specify
SHAPE. `questionsTried` could be a string, an array of strings, an
object with a `tried` key, a CSV inside a string, or any of a dozen
other plausible reductions. Without a concrete example, the LLM
picks one — sometimes the right one, sometimes not.

## Fix

**Verifier (information surface):**

```ts
for (const err of result.errors) {
  parseErrors.push(
    `${file} block ${err.blockIndex}: ${err.message}`,
  )
}
// header includes total count: `seat-log parse errors (3): ...`
```

Every error per file surfaces, prefixed with the block index so the
operator can jump directly to the source location.

**Agent prompts (authorial precision):**

Both seat templates gain a "Concrete YAML examples" section with one
fully-formed block per `entryType`. Plus a "Field shape rules" section
that calls out the documented drift sources directly:

> - `scenarioId` is always a string. There is NO `scenarioId: null`
>   form; if you have no scenario in mind, you are writing a
>   `suspicion` (which uses `relatedScenario: null`), not a
>   `scenario-fire`.
> - `questionsTried` is ALWAYS an array of strings (YAML list syntax
>   with `-` per item), even when there is exactly one item.
>   Single-string form is rejected.

Examples are wrapped in 4-tick fences inside the markdown so the
content shows AS code without being parsed by the seat-log parser at
calibration time.

## Key Insight

**Multi-error contexts demand multi-error surfaces.** If a downstream
artifact can hold N independent violations, surfacing one and bailing
loses N-1 signals. The cost of "fail fast on first error" is paid at
triage time when humans have to crawl source files looking for what
the verifier could have shown them in one pass. Aggregate at the
output layer, not the input layer.

**LLM authoring needs examples, not just constraints.** A field list
documents structure the way a type signature does — completely, but
abstractly. Concrete examples document structure the way a reference
implementation does — partially, but unambiguously. When the producer
is an LLM, examples beat lists every time. The drift in TODO #13 was
not "the agent didn't read the field list"; it was "the field list
permitted multiple readings, and the agent picked one." Examples
collapse the readings to one.

These two lessons compose: when the producer is unreliable AND the
consumer's error reporting is funnelled, drift compounds silently.
Fix both ends.

## Related

- Insight 027 — absence-of-X assertions need presence-of-Y companions
  (sibling pattern: a verifier that succeeds vacuously when no input
  exists is the dual of one that fails coarsely when input is bad).
- Insight 029 — downstream plans reference structured data that
  upstream only captured as authorial prose. Inverse failure mode:
  upstream wrote enough, downstream couldn't extract it.
- Insight 020 — subagent capability enforcement is frontmatter, not
  wrapper. Same general theme: where the LLM is the author of
  artifact shape, structural constraints must live where the LLM
  can see them.
