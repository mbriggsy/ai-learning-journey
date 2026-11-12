---
title: CE's plan check turns off its own "is the problem real?" challenge for any plan with an origin, such as a brief
date: 2026-11-12
phase: the plan step (the hybrid plan's design; re-read on CE 3.38.1)
modules: [projects/skills/ultramode-plan/lib/resolve-ce.mjs]
tags: [compound-engineering, ce-doc-review, ce-plan, premise, origin, brief, product-lens, adversarial, plan-check, suppression, lite, depth-full, coverage-line, named-adversary]
---

## Problem

A wrong premise sank a whole program (the our-setup flight plan, flushed 2026-10-29), and no plan check, CE's or ours, caught it. A plan that ce-plan writes from a brief never gets "is the problem real?" from CE's own check.

## Root Cause

CE's plan check skips the premise challenge whenever the plan names an origin. When `Document type: plan` and `Origin:` is a path, both personas assume the premise "has already been validated upstream":
- `ce-doc-review/references/personas/product-lens-reviewer.md:15` suppresses its Premise challenge and Prioritization coherence sections.
- `ce-doc-review/references/personas/adversarial-document-reviewer.md:17-23` suppresses Premise challenging and Simplification pressure entirely.

Read on CE 3.34.0, and read again on 3.38.1 (2026-11-12): the same lines, the same rule.

## Fix

The plan step's own skill has a premise seat that reads no CE file and runs in the deepen and in the check (`SEATS_WITHOUT_CE` in `lib/resolve-ce.mjs`); its prompt states that CE's origin-keyed suppression never applies to it (`lib/prompts.mjs`). ce-plan is still the playbook's plan step, so a ce-plan plan with an origin still gets no premise challenge from CE.

## Key Insight

CE treats an origin document as proof that the premise was checked. Our briefs gather lessons; they do not check premises. When ce-plan plans from a brief, ask "is the problem real?" some other way, and weigh this when the trial compares the two plan steps.

## Also Applies To

- Any reviewer that skips checks because metadata says an earlier stage did them.
- Pipelines where "approved upstream" is a field anyone can set.

## Extended (2026-11-12): the check also runs "lite" unless asked for full, and asking held on its first run

Since CE 3.36.0 a plan check runs `lite`, one reviewer applying the coherence, feasibility and scope lenses with no adversary, unless the caller passes `depth:full`, a saved review state records full, or a conditional persona other than the scope reviewer switches on (`ce-doc-review/references/depth.md:9-15`, read on 3.38.1). The playbook README's step 2 asks for `depth:full` and for the adversary by name. On their first run (the plan-step trial's ce-plan arm, CE 3.38.0, playbook-4), Coverage showed a full review by seven reviewers with the adversary on the team (the arm's receipt).

What it adds: this is a second way the check narrows itself without the caller asking, and both are keyed to the plan's shape (an origin; no conditional persona). Lite says so in the Coverage line; the origin rule says nothing anywhere. Naming the adversary puts it on the team, but its premise challenge still switches off for a plan with an origin, so this lesson's Key Insight stands.
