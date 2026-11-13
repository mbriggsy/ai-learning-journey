---
title: A plan's builder reads only the plan; a finding left in a commit message is invisible, and a finding folded into a test the plan already has costs less than a new one
date: 2026-11-12
phase: the plan step's own skill (the Back Nine workbench plan's check)
modules: [projects/archive/skills/ultramode-plan/SKILL.md, projects/the-back-nine/docs/plans/5-workbench-plan.md]
tags: [fold, findings, last-round, commit-message, receipt, builder, tests, balanced, plans, check, fold-all, triage, packing, dense-prose, numbered-steps, plan-trial]
---

*The `ultramode-plan` skill this lesson came from is archived at `projects/archive/skills/ultramode-plan/` (2026-11-12); the lesson stands on its own.*

## Problem

- **Left out of the plan.** The Back Nine workbench check's round 3 confirmed 13 findings (1 P1) and, by the skill's rule, folded none. They sit only in `f32f8ea2`'s commit message. The plan's front matter says "1 P0/P1 open", with no pointer to them.
- **Folded into what was there.** Reviewers asked for a new test for each of two findings. Instead, U12's "appears in each enumerated income reader" test took the two readers round 1 found missing, and U15's count test took round 2's label check: the same coverage with fewer tests (Briggsy, 2026-11-12: "balanced").

## Root Cause

- The skill's rule for round 3 (`SKILL.md` step 7): "It folds nothing: what it confirms is named in the receipt as open." The receipt is the commit message, and the plan carries only its first line. A builder reads the plan, not its git history.
- A reviewer asks for a test per finding because it sees one finding at a time; it does not check whether a test the plan already has can carry it.

## Fix

- The last round's findings: not fixed. It is the gap the trial judges (the playbook TODO's START HERE). Meanwhile the Back Nine's TODO is to point U12's build at that commit message.
  > **Out of date (corrected 2026-11-12):** the trial ran (insight 029). The workbench plan's open findings are the Back Nine TODO's now: its Act 5 entry, step 1, settles them in the plan before any of its units lands.
- Folding into existing tests is the practice: before adding a test for a finding, look for one in the plan that can take it.

## Key Insight

Write every finding where the builder will look: the plan's own unit text. And fold into what is already there before adding something new.

## Also Applies To

- Review comments resolved in a PR thread but never reflected in the spec.
- Post-mortem actions recorded in a meeting note instead of the runbook.
- Test suites that grow one test per bug report.

## Extended (2026-11-12): folding every confirmed finding into the unit it touches packs the unit until its builder misreads it

In the plan-step trial (insight 029), `ultramode-plan`'s check folded all 77 of its findings (round 1's 44; round 2's 25 plus 8 traced as real) into the units they touched. The plan grew from 60,945 to 82,946 characters (`5431285e` to `566d750c`). U7's approach went from one paragraph of 129 words to one of 320 holding about a dozen tasks, and the plan's longest line from 176 words to 320. The blind builder reader named it: "U7's whole approach is one paragraph of about 400 words holding a dozen tasks ... A builder working alone will misread or skip something." ce-plan's plan, the same length (83,278 characters), applied 17 of its check's 31 findings, kept numbered steps, and was the builder reader's pick.

What it adds: "fold into what is already there" holds for tests, not for prose; a fold into a paragraph only makes it longer. Triage before folding: fix what a builder would hit and leave the rest named in the plan. When a unit's tasks pass a handful, rewrite it as numbered steps instead of growing its paragraph. Length was not the fault; packing was.
