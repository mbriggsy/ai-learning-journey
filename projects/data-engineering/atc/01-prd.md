# 01 — The PRD

The PRD is the spec for everything that follows — what the pipeline does, in narrative form. It travels with a sibling artifact, the **RTM** (Requirements Traceability Matrix — a row per behavior or requirement). Together, PRD + RTM form the contract: the input for plans, code, tests, and evidence. If the contract is wrong, every downstream artifact is wrong in the same shape.

This file is about taking ownership of the contract before you start flying.

## Where the contract comes from

Skills are singular-focused — one input, one output. The contract is built by composing them.

**Chapter 1.**

- The reverse-engineering skill (sister project at `../etl-reverse-engineering/`) reads the legacy code and emits the PRD.
- A separate skill reads the PRD and emits the RTM.
- You inherit both. You don't author either.

**Chapter 2.**

- A brainstorm/ideate skill (`ce:brainstorm`, `ce:ideate`, `gsd:new-project`, or whichever fork fits your stack) draws out raw requirements.
- A PRD-authoring skill (or agent-guided process) organizes the brainstorm output into the PRD.
- The same RTM-extraction skill from Ch1 reads the PRD and emits the RTM.
- Authoring takes longer than inheriting, but the contract clears the same bar.

Either way, what lands at the end of phase 1 is the same: a PRD and an RTM, both clean-room ready, both about to lock.

In both chapters, the PRD passes through a challenger panel before it locks — different angles (correctness, feasibility, scope, security, coherence, adversarial), each writing its own review; a synthesizer integrates their findings to strengthen the PRD. Some skills bundle this internally (CE's brainstorm does); others run it as a separate step. The same pattern shows up again in plan deepening.

## Clean room — the rule that makes the contract load-bearing

For Chapter 1: from the moment the contract lands, the build agent does not read the legacy code. Not "to clarify a section." Not "to double-check the join logic." Not "just this once." The contract is the only acceptable input.

This rule is what makes the contract load-bearing. If the agent can fall back to the legacy code, the contract doesn't need to be complete — and so it won't be. Clean room forces the contract to carry every required detail. That discipline is the whole point.

If you find yourself wanting to peek, the right move is to extend the PRD (re-running the RTM extraction if needed) and stay in clean room.

## How to own it

You read both documents — PRD and RTM — cover to cover. You are the human checkpoint between the contract and the rest of the flight.

When you read, hunt for these failure classes:

- **Holes.** Inputs without schemas. Outputs without consumers. Logic described as "transform the data" with no specifics. Every hole is a future plan that will be wrong.
- **Implicit assumptions.** Time zones, null handling, deduplication rules, late-arriving data, schema evolution. If the PRD doesn't say it, the agent will guess — and guesses diverge from legacy behavior.
- **Unresolved correctness flags.** Ch1 PRDs surface suspected legacy bugs. For each, the PRD must say: build matches legacy, or build fixes with justification. Make the call before locking.
- **RTM gaps.** The RTM is a sibling document to the PRD — a row per behavior (Ch1) or row per requirement (Ch2). At lock time, you're checking *row coverage*: every meaningful behavior or requirement has a row. The build-side columns (rebuild anchor, test case, status) populate during later phases; they're not part of the lock check.

Find any of those, kick the contract back. Re-run the upstream skill with sharper guidance, or extend the spec. Do not start the planning phase against a contract with known holes — the cost to patch now is one update; the cost mid-execute is a re-run of every phase that depended on the broken assumption.

## When it locks

The contract locks when:

1. You have read both documents end to end.
2. You have nothing to kick back.
3. The RTM has every behavior (Ch1) or requirement (Ch2) covered by a row.

The lock is a state of your conviction, not a sign-off ceremony. From that moment, the contract becomes the input for everything downstream. Updates after lock are explicit contract changes — handled with downstream re-planning where the change reaches.

## Open questions

Architectural decisions not yet resolved. They don't block the contract from locking; they shape future improvements to the methodology.

- **PRD template vs contract.** Should the PRD follow a fixed template (recommended sections, ordering, headings), or just satisfy a *contract* of must-answer questions (identity, I/O, business logic, framework coupling, failure modes, correctness flags, test spec, QA plan)? Rigid template = forced consistency, busywork on sections that don't apply per job. Pure contract = max flexibility, harder navigation. Current lean: contract over template, with an optional recommended structure per common job archetype. Resolves after one or two real PRDs land and we see whether structure drift bites.
