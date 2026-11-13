---
title: Price a fan-out from the last one measured, read the rule's own file before picking a helper's model, and have a long seat write as it goes
date: 2026-11-12
phase: the plan step's own skill (the remaining-units update, 2026-11-11)
modules: [playbook/TODO.md]
tags: [fan-out, cost, weekly-meter, estimates, helpers, model-choice, memory-index, standing-rule, usage-limit, output-file, workflow, process]
---

## Problem

All on 2026-11-11:
- **Estimates ran low.** The lead's three estimates of what a fan-out would cost on the weekly meter each ran low by about half. One seat at max effort on that day's costlier model cost about 2.4 weekly points; nine such writers cost about 22, and nine researchers with eighteen Opus refuters about 17.
- **The wrong model.** The lead took "always latest model" from a memory's index line and launched nine helpers at max effort on a model the standing rule did not allow. They were stopped 8 minutes in, at about 4 weekly points of redone work. Briggsy cleared that one push in words afterward.
- **All or nothing.** Four seats at max hit a usage limit about 16 minutes in and left nothing, since each writes its one output file at the end. The same four seats, with ten refuters, reran on Opus at xhigh as 14 helpers and 3.55M helper tokens.

## Root Cause

- An estimate from a helper count leaves out how long each helper runs and what its model costs; only the meter measures that.
- An index line is a summary. The rule, with its limits, is in its file, and today's message and a standing rule can pull in different directions.
- A seat that writes once, at the end, loses everything when it dies.

## Fix

- Read the meter (`seven_day` in `~/.claude/statusline-meters.json`) before and after every fan-out, and carry the last measured ratio forward (the playbook's `docs/landmines.md`, Meters and cost).
- Read a rule's own file before choosing a helper's model, and ask before launching when today's message and a standing rule disagree.
- For a long seat, have it append findings as it goes, or expect to pay for the whole seat again.

## Key Insight

The meter is the measurement; a helper count is a guess that runs low. An index line points at a rule, and the rule is the file. A seat that writes only at the end is all or nothing.

## Also Applies To

- Cloud batch jobs priced from instance counts instead of the last bill.
- Any summary line (a README badge, a memory index) used as the rule it summarizes.
- Long jobs that hold results in memory until they finish.
