# 02 — Plans

The contract tells you what to build. Plans tell you how to build it, phase by phase. This file is about producing the build's execution recipe: a series of phased plans, deepened until every value is concrete, ready for the build agent to fly.

This chapter covers two steps from the flight pattern in one place — plans get *drafted* first, then *deepened*. Both are agent-guided.

## What's a plan

One plan = one implementation phase. A meaningful pipeline has multiple phases (ingestion, transforms, output sinks, tests, etc.); each gets its own plan file under `plans/`. A plan is paint-by-numbers for an agent — concrete enough that another agent (or another engineer at 3 AM) could pick it up and execute without ambiguity.

Plans are always agent-guided. Use a planning skill (`ce:plan`, `gsd:plan-phase`, or whichever fork fits your stack) — it reads the contract (PRD + RTM) and produces phase plans against it.

## What goes in a plan

At minimum, every phase plan covers:

- **Goal.** What this phase produces. One sentence.
- **RTM rows touched.** The `req_id`s this phase implements.
- **Concrete tasks.** Step-by-step actions. Real file paths, real method signatures, real values where applicable.
- **Code patterns referenced.** If the team has a known pattern (e.g., an idempotent Delta merge), the plan names it and links to it.
- **Exit criteria.** What "done" looks like — specific, verifiable.
- **Commit points.** Where to commit and what the commit messages should say.
- **Test strategy.** Which tests this phase adds, what they cover.
- **Open questions.** Anything the agent should NOT silently guess at.

Bar: another agent should execute the plan with zero rediscovery. "Transform the data" isn't a plan — it's a wish.

## Plans are baking recipes, not menus

A menu lists options. A recipe lists steps. Plans are recipes:

- Concrete values, not vague directives.
- Actual code snippets where applicable, not "implement the merge logic."
- Step-by-step execution order, not "do these in parallel."
- Research happens at plan-time. If a join needs a specific window function, the plan names it — the agent doesn't research mid-execute.

If you catch yourself writing "the agent will figure out X" — stop. Figure out X now, or surface it as an open question.

## Drafting and deepening — both one at a time

This phase has two passes through the plan series:

**Drafting pass.** Draft phase 1's plan → review → fix → draft phase 2's plan → review → fix → … Each plan informs the next; reviewing in isolation is faster than reviewing a stack.

**Deepening pass.** Once the series is drafted, go back through each plan and sharpen every value, verify every referenced code pattern, cross-check phase-boundary consistency, and resolve every open question. Same rule — one plan at a time, with review between. A drafted-but-undeepened plan is a wish list with confidence; the build agent will fly against it and produce wishes back.

Never batch the series. Cascading errors land that way.

## When the plan phase is done

The plan phase is complete when:

1. Every implementation phase has a deepened plan file.
2. Every plan covers all the elements above.
3. The series covers every RTM row at least once.
4. All open questions are resolved or explicitly deferred with stated reasons.
5. No contradictions across phase boundaries.

Plans at this stage are **build-ready**. `03-execute.md` starts here. Do not start building from a plan series that hasn't cleared all five — that's the singular fastest way to waste a week.
