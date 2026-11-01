---
title: A read-only check that finds a stale claim finds it again every run, until it is allowed to write the fix
date: 2026-10-31
phase: brief's correction rule
modules: [projects/skills/distill-and-brief/brief/SKILL.md]
tags: [brief, staleness, correction, read-only, lessons, recurring-finding, write-path, drift]
---

## Problem

Brief checks each lesson it reads against today's code. It flagged the Back Nine's lesson 006, which still said the gross-up pass cap was 128 after it had become 192, on 10-20 and again on 10-29. Each time the session read the flag and went on with its work, and nobody corrected the lesson.

## Root Cause

The check could only report. A report lands in a session busy with its own job, the stale lesson stays as it was, and the next brief finds the same thing.

## Fix

Brief's correction rule (`8e0f7f04`): when the lesson is the stale side, brief adds one dated pointer note under the stale paragraph, naming where the truth lives now, and commits that file alone. It leaves the lesson alone when the code is the wrong side, when the right side is unclear, or when another session has edits in it. Lessons 006 and 007 got their notes in `52a9b0d7`.

## Key Insight

A finding that comes back every run and never gets fixed means the check has no write path. Give the finder the smallest safe write (a pointer to the current home, never a copied value, which goes stale the same way) with clear cases where it must refuse, or the same finding returns every run.

## Also Applies To

- Linters and doc audits that report and never fix.
- Stale-link and drift checkers.
- Any recurring review comment that no one owns.
