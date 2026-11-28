---
title: A plan's own mechanical step can be obsoleted by a decision made LATER in the same effort — re-verify each step against the live authoritative doc before executing
date: 2026-06-18
phase: P2 (the doc-restructure close — M6 step 4/5)
modules: [src/shared/model.ts, src/store/db.ts, docs/roadmap.md]
tags: [doc-reconciliation, plan-staleness, ground-truth-first, restructure, blast-radius, deferred-obligation, code-comments, supersession, precedence, constraint-reason, static-legend, mechanical-limit, retired-step, template, plan-writing, verification-contract, caddie-walk, amended-plan, rulings, scope-seat, test-cadence]
---

## Problem

The doc-restructure's `RESTRUCTURE-PLAN.md` step 4 read: "the P→Act code-comment sweep (~18 source files) — comments that say 'Phase 1/2/3/4' → 'Act 1/2/3/4'; IDs unchanged, comments-only, stays green under typecheck." Taken literally it is a rote find-and-replace. Executing it would have rewritten ~128 `Pn·Um` join-keys + `Pn` abbreviations across the source AND the insight-corpus frontmatter (`phase: P1·U2`) — manufacturing code↔docs↔git drift, the exact opposite of the restructure's goal.

## Root Cause

The plan step predated the decision that obsoleted it. The roadmap's ID scheme — authored LATER in the same restructure (M2, the four hubs) — deliberately landed on: **code stays in `P`-form, docs use `Act`-form, they join on the immutable U-key** ("a doc that says `Act 2·U7` and code that says `P2·U7` join unambiguously on `U7`"). An early restructure plan is a hypothesis about the work; a decision made midway through that *same* effort can quietly invert one of its steps, but the plan text never self-updates.

## Fix

Read the live authoritative doc (the roadmap) BEFORE executing the rote-looking step. That exposed the rename as wrong and surfaced step 4's REAL residue: the content-stale **dead-premise comments** insight/018 had explicitly predicted as "code-side siblings" of the 2026-06-08 accumulation fold — comments asserting "the P2 first-answer runs overlay-OFF / first written to disk by Phase 3," which the doc-only reconciliation sweep never touched. Four (`model.ts:286/721/1259/1265` — the tax-overlay-input section comment, the `SimulationParams.overlay` docblock, and two lines of the schemaVersion-2 block comment; `db.ts:12`, the `rewriteModel` vault-upgrade note) had sat wrong for 8 days. Fixed those (comment-only, 942/942 byte-identical); abandoned the rename.

## Key Insight

A plan's mechanical-looking step is still a hypothesis — re-verify it against the live authoritative doc before executing, *especially* the rote find-and-replace ones, because those are the steps you are tempted to run on autopilot. And the precedence rule breaks the tie: when a scaffolding plan and the landed authoritative doc disagree, the authoritative doc wins — it post-dates the plan. (Here: roadmap > RESTRUCTURE-PLAN, per the project's own precedence ladder.)

## Also Applies To

- An insight's **"Also Applies To"** that names a code-side blast-radius (018 named these exact comment siblings) is a deferred OBLIGATION to track and close, not a footnote — it predicted the 8-day-stale comments and nothing swept them.
- A premise-phrase grep for a superseded decision (018's method) must sweep CODE comments, not just docs — the doc-only sweep is *why* the siblings survived.
- Any migration/refactor checklist that outlives a mid-effort design pivot: a "rename X→Y everywhere" item authored before Y's scheme was finalized.
- Sibling: [[025]] (a plan's test scenario is a hypothesis), [[037]] (the orchestrator's own finding is a hypothesis) — the "a plan's X is a hypothesis, verify before acting" family.

## Extended (2026-11-23): a constraint binds by its reason, not its wording

Walk 5's round (b9-8) wanted the W fork's question to name the figure "Yes" sets, and build 2's KTD17 said the legend
was "static". It read like a design rule. The pay check's deepen had recorded the reason, and the reason was mechanical:
`SegmentedControl` took only a catalog key for its legend. One optional prop removed it (the `legend` string beside
`legendKey` in `src/intake/fields.tsx`, fed by `slots.workingCostLegendFigure`), and the question now names the figure.
Before obeying a constraint a plan states, find why it exists. A limit of today's component is a build item; only a
reason about the household binds. See also [[164]] (a plan fails on what its sentences imply).

## Extended (2026-11-27): a plan written from the template puts back a step Briggsy retired

Gap 4's draft plan (`b3a68293`) took its checks from the project's standing pattern. Its Verification Contract asked
for "a Caddie walk before it is called shipped" on every new screen, and three units' Verification lines named a
Caddie walk. Briggsy's 2026-11-22 rulings had dropped that: no extra Caddie read, and the words ship flagged for his
later read. The workbench plan's verification lines already said so, each marked "Amended 2026-11-26"
(`docs/plans/5-workbench-plan.md`). The deepening's three seats let it through, and only the doc review's scope seat
caught it (`f0f77605`). The same seat also dropped a version-7 fixture mint and a planted fault on the version floor,
which the draft had copied from the version-4 pattern (`mint-v4.mts`, [[151]]); the version-6 and version-7 bumps had
shipped without either. The plan now lists the Caddie walk among the things considered and not built
(`docs/plans/features/spending-line-repeat-and-rate-build-spec.md`).

The draft listed this insight in its own Sources and still did it. That is because the step was not a stale one waiting
to be run: it was written fresh, after the ruling, from sources that never got the ruling. The older build specs still
show Caddie walks, and the caddie skill's own trigger still says "pre-walk every U-batch"
(`.claude/skills/caddie/SKILL.md`). Before writing a plan's verification, read the newest amended plan's verification
lines for steps his rulings retired, not the template or an older spec. See also [[154]] (a rule's authority is who
ruled it, not the document it sits in).
