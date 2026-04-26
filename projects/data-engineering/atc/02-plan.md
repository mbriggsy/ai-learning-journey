# 02 — Plans

The contract tells you what to build. Plans tell you how to build it, phase by phase. This file is about producing the build's execution recipe: a series of phased plans, deepened until each one is solid enough that the build agent can pick it up and fly.

This chapter covers two steps from the flight pattern in one place — plans get *drafted* first, then *deepened*. Both are agent-driven; you direct.

## What's a plan

One plan = one implementation phase. A meaningful pipeline has multiple phases (ingestion, transforms, output sinks, tests, etc.); each gets its own plan file under `plans/`.

A plan is **decisions, not code**. Concrete enough that the build agent can start without ambiguity, but never pre-written implementation. If the plan reads like code, it's the wrong shape.

Plans are agent-drafted. Use a planning skill (`ce:plan`, `gsd:plan-phase`, or whichever fork fits your stack) — it reads the contract (PRD + RTM) and produces phase plans against it. Your job is to direct: confirm scope, surface blockers, accept or reject the agent's proposed approach. Not to write the plan yourself.

## What goes in a plan

Each phase plan captures these decisions:

- **Goal.** What this phase produces. One sentence.
- **Requirements.** The `req_id`s in the RTM this phase satisfies.
- **Dependencies.** What must exist first (other phases, infra, libs).
- **Files.** Repo-relative paths the phase will create, modify, or test. Never absolute paths.
- **Approach.** The shape of the solution — key decisions, data flow, component boundaries. *Not* the code.
- **Patterns to follow.** Existing code or conventions to mirror, with paths to reference examples.
- **Test scenarios.** Specific cases the implementer should write, by category — happy path, edge cases, error paths, integration. Each scenario names input, action, expected outcome.
- **Verification.** Outcomes that must hold when the phase is done. Expressed as outcomes, not shell command recipes.
- **Open questions.** What the agent should NOT silently guess at — surface for resolution or explicit deferral.

Bar: an implementer should start without ambiguity. They shouldn't need to invent the plan's missing pieces, and they shouldn't need to read between the lines for missing decisions. "Transform the data" isn't a plan — it's a wish.

## Decisions, not code

A plan captures decisions: scope, approach, dependencies, file paths, patterns to follow, test scenarios, verification outcomes. It does not capture *implementation* — no method signatures, no SQL strings, no git command recipes.

Research happens at plan-time. If a join needs a specific window function, the plan names it. If a merge follows a known pattern, the plan points at the pattern. The agent doesn't research mid-build — it executes the decisions the plan already made.

If you find yourself writing actual code in a plan, the plan is the wrong shape. If you find yourself writing "the agent will figure out X," resolve X now or surface it under open questions.

## Drafting and deepening — both one at a time

This phase has two passes through the plan series:

**Drafting pass.** A planning agent drafts phase 1's plan → you confirm direction → fix → agent drafts phase 2's plan → you confirm direction → fix → … Each plan informs the next; reviewing one in isolation is faster than reviewing a stack.

**Deepening pass.** Once a plan is drafted, a panel of challenger agents reads it and pushes back. Each challenger reviews from a different angle — correctness, feasibility, scope, security, coherence, adversarial — and surfaces issues the drafting agent didn't catch. Their findings get integrated; the plan strengthens. Use a multi-persona review skill (`ce:document-review`, or whichever fork fits your stack) to drive the challenge.

A drafted-but-undeepened plan is a wish list with confidence; the build agent will fly against it and produce wishes back. The challenger panel is what turns a plausible plan into a survivable one.

Same rule — one plan at a time. Never batch the series. Cascading errors land that way.

## When the plan phase is done

The plan phase is complete when:

1. Every implementation phase has a deepened plan file.
2. Every plan covers all the decisions above.
3. The series covers every RTM row at least once.
4. All open questions are resolved or explicitly deferred with stated reasons.
5. No contradictions across phase boundaries.

Plans at this stage are **build-ready**. `03-execute.md` starts here. Do not start building from a plan series that hasn't cleared all five — that's the singular fastest way to waste a week.
