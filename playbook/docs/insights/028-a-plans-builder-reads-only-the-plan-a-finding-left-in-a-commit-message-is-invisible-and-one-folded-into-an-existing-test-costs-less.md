---
title: A plan's builder reads only the plan; a finding left in a commit message is invisible, and a finding folded into a test the plan already has costs less than a new one
date: 2026-11-12
phase: the plan step's own skill (the Back Nine workbench plan's check)
modules: [projects/skills/ultramode-plan/SKILL.md, projects/the-back-nine/docs/plans/5-workbench-plan.md]
tags: [fold, findings, last-round, commit-message, receipt, builder, tests, balanced, plans, check]
---

## Problem

- **Left out of the plan.** The Back Nine workbench check's round 3 confirmed 13 findings (1 P1) and, by the skill's rule, folded none. They sit only in `f32f8ea2`'s commit message. The plan's front matter says "1 P0/P1 open", with no pointer to them.
- **Folded into what was there.** Reviewers asked for a new test for each of two findings. Instead, U12's "appears in each enumerated income reader" test took the two readers round 1 found missing, and U15's count test took round 2's label check: the same coverage with fewer tests (Briggsy, 2026-11-12: "balanced").

## Root Cause

- The skill's rule for round 3 (`SKILL.md` step 7): "It folds nothing: what it confirms is named in the receipt as open." The receipt is the commit message, and the plan carries only its first line. A builder reads the plan, not its git history.
- A reviewer asks for a test per finding because it sees one finding at a time; it does not check whether a test the plan already has can carry it.

## Fix

- The last round's findings: not fixed. It is the gap the trial judges (the playbook TODO's START HERE). Meanwhile the Back Nine's TODO is to point U12's build at that commit message.
- Folding into existing tests is the practice: before adding a test for a finding, look for one in the plan that can take it.

## Key Insight

Write every finding where the builder will look: the plan's own unit text. And fold into what is already there before adding something new.

## Also Applies To

- Review comments resolved in a PR thread but never reflected in the spec.
- Post-mortem actions recorded in a meeting note instead of the runbook.
- Test suites that grow one test per bug report.
