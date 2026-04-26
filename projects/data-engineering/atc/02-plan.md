# 02 — Plans

The contract tells you what to build. Plans tell you how to build it, phase by phase. This file is about producing the build's execution recipe: a series of phased plans, deepened until each one is solid enough that the build agent can pick it up and fly.

This chapter covers two steps from the flight pattern in one place — plans get *drafted* first, then *deepened*. Both are fully agent-driven. You start the work and call each phase in turn.

## What's a plan

One plan = one implementation phase. A meaningful pipeline has multiple phases (ingestion, transforms, output sinks, tests, etc.); each gets its own plan file under `plans/`.

A plan is **decisions, not code**. Concrete enough that the build agent can start without ambiguity, but never pre-written implementation. If the plan reads like code, it's the wrong shape.

Plans are agent-drafted. Use a planning skill (`ce:plan`, `gsd:plan-phase`, or whichever fork fits your stack) — it reads the contract (PRD + RTM) and produces phase plans against it. Your job: kick off the phase, watch the context window, call the next phase when the agent's done. You don't write the plan, review it, or approve content — the agent and the challenger panel do that work.

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

If the plan reads like code (method signatures, SQL strings, git commands), it's the wrong shape — fix it in the deepening pass. If the plan says "the agent will figure out X," it's punting — resolve X in deepening, or surface it as a deferred open question.

## Drafting and deepening — both one at a time

This phase has two passes through the plan series:

**Drafting pass.** You tell the planning agent to draft phase 1's plan. Agent drafts. You tell it to draft phase 2's plan. Agent drafts. Continue until the series is on disk. Each plan informs the next — phase 2 is sharper for phase 1 already existing.

**Deepening pass.** Same cadence, different work. You tell the agent to deepen phase 1's plan. A panel of challenger agents reads the plan and pushes back from different angles — correctness, feasibility, scope, security, coherence, adversarial. The drafting agent integrates the findings. Plan strengthens. You tell the agent to deepen phase 2's plan. Repeat. Use a multi-persona review skill (`ce:document-review`, or whichever fork fits your stack) to drive the challenge.

A drafted-but-undeepened plan is a wish list with confidence; the build agent will fly against it and produce wishes back. The challenger panel is what turns a plausible plan into a survivable one.

One plan at a time, drafting then deepening. Never batch. Cascading errors land that way.

## When the plan phase is done

The plan phase is complete when:

1. Every implementation phase has a deepened plan file.
2. Every plan covers all the decisions above.
3. The series covers every RTM row at least once.
4. All open questions are resolved or explicitly deferred with stated reasons.
5. No contradictions across phase boundaries.

Plans at this stage are **build-ready**. `03-execute.md` starts here. Do not start building from a plan series that hasn't cleared all five — that's the singular fastest way to waste a week.
