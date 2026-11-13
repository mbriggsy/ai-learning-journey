---
title: Before a plan or a unit leans on an input, trace it to its source; a gate's input to a producer someone builds, a required field to its writer in every run kind, a decision to the plan, and a goal to a source that states one
date: 2026-11-12
phase: the plan step's own skill (the hybrid plan's check; U4's reviews)
modules: [projects/archive/skills/ultramode-plan/lib/select.mjs, projects/archive/skills/ultramode-plan/lib/flow.mjs, projects/archive/skills/ultramode-plan/lib/run-record.mjs, projects/archive/skills/ultramode-plan/lib/resolve-ce.mjs]
tags: [inputs, producer, writer, run-kind, restart, state-machine, for-each, source-of-truth, comments, goal, request, plans, review, brief, deliberate-value, false-premise, never-flag, schema-version, cross-plan, collision, plan-trial]
---

*The `ultramode-plan` code this lesson came from is archived at `projects/archive/skills/ultramode-plan/` (2026-11-12); the lesson stands on its own.*

## Problem

- **An input nobody builds.** `selectSections` counted scores against KTD7's section index, and no module produced that index. A builder grepping `^#` would have read fenced `# comment` lines as headings in 21 of the repo's 105 plans, and let a two-row list pass.
- **A per-item rule with no home.** KTD9's "round 3 on each fix alone" had no launch-per-fix form, and the run record reads one launch a step, so a dead per-fix launch would never be re-checked (3 of 3 verifiers).
- **A field one run kind never writes.** R4-11 made the deepen's outside researchers require the research stage's `external` note, which an update run never records, since it skips research (6 findings across 5 lenses). R4-25 made an edit's old text required, and only the fold's moment holds it, since the rename leaves no copy; a restart between the fold and round 2 had no source for it (R4-28, the only P1 U4's round-3 gate found; 3 of 3 verifiers).
- **A comment taken as the decision.** U4 made the premise seat deepen-only because a comment in `resolve-ce.mjs` called it "the deepen's premise seat". KTD6 puts it in the check's roster too, and `flow.mjs`'s `CLASSES` needs its coverage (the first review caught it, 3 of 3 verifiers; the comment now says it runs in both).
- **A request taken as the goal.** U4 made an update run's request the goal's yardstick (no brief, and the plan's own Goal Capsule banned as circular). A re-check request that names no goal then made the committed plan's standing goal look unasked, and the verifiers, fed the same block, would confirm it (R4-20: 4 findings, the hand-verify among them).

## Root Cause

Each one took an input on trust from something nearby: an index assumed built, a field assumed written in every run, a code comment read as the plan's ruling, a request read as the goal. The plan said what to read; nobody named who writes it, when, and in which kinds of run.

## Fix

- The unit whose gate takes the input also builds and tests its producer (`flow.mjs index`, round 2).
- A per-item rule gets a record field that holds one item, or it is not written as "for each".
- Each required input is traced to its writer per run kind and across a restart; the lean plan later stopped wiring update runs at all (every launch says `update: false`).
- A unit is built from the plan's decisions, never from a comment about them.
- A goal is judged only against a source that states one, a moved goal is measured from HEAD's version, and a goal no source states is named as unjudged: never a finding, never a pass.

## Key Insight

For every input a gate, rule or seat reads, name its writer, in every kind of run and across a restart. If there is none, the same unit builds it or the rule changes. Before writing "for each X" into a plan, find the field that holds one X. Read decisions from the plan, and judge a goal only against a source that states it.

## Also Applies To

- Feature flags or config keys read by code that no deploy path sets.
- Jobs with several entry points (fresh, resume, retry) that each assume another wrote a field.
- Reviews that grade a change against its ticket's wording instead of the spec.

## Extended (2026-11-12): a brief's "never flag this" needs a source beyond a code comment, and a shared version step needs every plan that claims it

- **A comment handed to every helper as a deliberate value.** The contract brief for the plan-step trial's `ultramode-plan` arm (playbook-5) told every helper: "the 59½ line is read at integer age 60. That is a year on the conservative side, the same proxy PA's gate uses: never flag the year it overcharges", citing a code comment (`src/engine/stateTax.ts:95-96`). It is half wrong. For a July-to-December birthday, the year an owner turns 60 holds days before 59½, so reading that whole year as past the line is rosy. The research and both deepen rounds pushed back anyway (playbook-5's record), and the plan overturned it (its KTD2); the trial's blind rules reader confirmed the plan's reading.
- **A shared step two plans claim.** In the trial's ce-plan arm, three of the seven check reviewers found on their own that the workbench plan (`5-workbench-plan.md`) also claims the Back Nine's next saved-format version (the arm's receipt). Our arm's plan had caught it too.

What it adds: a line in a brief that says "never flag X" is an input like any other, and a stronger one, because it switches off the check that would catch it, as an origin does in CE's check (insight 027). Give each deliberate value in a brief its source, and mark a claim unverified when only a comment states it. And a plan that takes a numbered shared step (a saved-format version, a migration number, a solver version) reads every committed plan for the same step before it claims one.
