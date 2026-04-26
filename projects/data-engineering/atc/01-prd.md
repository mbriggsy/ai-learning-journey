# 01 — The PRD

The PRD is the contract for everything that follows. Plans, code, tests, evidence — all trace back to it. If the PRD is wrong, every downstream artifact is wrong in the same shape.

This file is about taking ownership of a PRD before you start flying.

## Where the PRD comes from

**Chapter 1.** A reverse-engineering pass against the legacy code emits the PRD. The skill that runs that pass is the sister project at `../etl-reverse-engineering/`. You inherit the document; you don't author it.

**Chapter 2.** The team authors the PRD fresh, always agent-guided. Start with a brainstorm/ideate skill (`ce:brainstorm`, `ce:ideate`, `gsd:new-project`, or whichever fork fits your stack), then organize the output into the PRD template — RTM section included, every requirement a row. Authoring this way takes longer than inheriting from the RE skill, but the contract has to clear the same bar.

Either way, what lands on your desk is the same artifact: a PRD that can serve as a clean-room contract.

## Clean room — the rule that makes the PRD load-bearing

For Chapter 1: from the moment the PRD lands, the build agent does not read the legacy code. Not "to clarify a section." Not "to double-check the join logic." Not "just this once." The PRD is the only acceptable input.

This rule is what makes the PRD load-bearing. If the agent can fall back to the legacy code, the PRD doesn't need to be complete — and so it won't be. Clean room forces the PRD to carry every required detail. That discipline is the whole point.

If you find yourself wanting to peek, the right move is to update the PRD and stay in clean room.

## How to own it

You read it. Cover to cover. Slowly. You are the human checkpoint between the document and the rest of the flight.

When you read, hunt for these failure classes:

- **Holes.** Inputs without schemas. Outputs without consumers. Logic described as "transform the data" with no specifics. Every hole is a future plan that will be wrong.
- **Implicit assumptions.** Time zones, null handling, deduplication rules, late-arriving data, schema evolution. If the PRD doesn't say it, the agent will guess — and guesses diverge from legacy behavior.
- **Unresolved correctness flags.** Ch1 PRDs surface suspected legacy bugs. For each, the PRD must say: build matches legacy, or build fixes with justification. Make the call before locking.
- **RTM gaps.** The Requirements Traceability Matrix sits inside the PRD as a row per behavior (Ch1) or row per requirement (Ch2). At lock time, you're checking *row coverage* — every meaningful behavior or requirement has a row. The build-side columns (rebuild anchor, test case, status) populate during later phases; they're not part of the PRD-lock check.

Find any of those, kick the PRD back. Re-run the RE skill with sharper guidance, or extend the team's authored spec. Do not start the planning phase against a PRD with known holes — the cost to patch now is one update; the cost mid-execute is a re-run of every phase that depended on the broken assumption.

## When it's done

The PRD locks when:

1. You have read every section.
2. You have nothing to kick back.
3. The RTM has every behavior (Ch1) or requirement (Ch2) covered by a row.

The lock is a state of your conviction, not a sign-off ceremony. From that moment, the PRD becomes the contract for everything downstream. Updates after lock are explicit contract changes — handled with downstream re-planning where the change reaches.
