---
title: The reused function was safe only on the input it grew up with
date: 2026-11-09
phase: in-season
modules: [scripts/season_edition.py, scripts/gameday_check.py, scripts/season_cargo.py, tests/test_season_edition.py]
tags: [reuse, adapter, implicit-contract, projections, injury-tags, byes, plan-check, review]
---

## Problem

The in-season newsletter reuses two tested pieces of `gameday_check.py` instead of writing a second
copy: `projected_total` (what a lineup should finish with) and `assess` (the start/sit calls). Both
were fed a new input through an adapter: the three-site average instead of Sleeper's projection.

`projected_total` never reads an injury tag. It never needed to: Sleeper empties the projection row
of a man it has written off, so an Out starter scored 0 without anyone writing that rule. CBS and
ESPN keep pricing him. Fed their numbers, the same function counted Rhamondre Stevenson, tagged
Out, at 13.3 points, and the page would have printed a projected score 13 points too high with no
error anywhere. A plan-check reader found it by running the function on the real week-10 rows.

The same shape turned up three more times in one build:

- `assess` treats "has a game date" as "can be started". The adapter dated every man whose team
  played, so a kicker with an emptied row drew no call at all, and a bench player priced by one
  site was offered as the fix "projected 0.0".
- The bye rule everywhere in this repo is "a DEF row with no opponent". It worked on Sleeper's own
  projections. The joined three-site rows usually leave a bye team's defense out altogether: the
  rule found one of week 10's four byes and none of week 9's two.
- `select_autoescape(["html"])` matches a template name ending in `.html`. Ours end in `.html.j2`,
  so nothing had been escaped since the first edition, and every feed headline went in raw.

## Root cause

A function's safety on its original input is partly the input's doing. The guard was in the data,
not in the code, so no test named it and no reader of the code could see it. Reuse carried the code
across and left the guard behind.

## Fix

- `season_edition.expected` scores 0 for a starter who cannot play before calling `projected_total`
  (a locked Out starter too: he was credited his projection times the share of a live game left).
- `season_edition.adapter` gives no date to a man who cannot be priced.
- `season_cargo.bye_set` counts byes from the full team list, and returns "unknown" when fewer
  than 20 defenses have an opponent.
- `render` uses `autoescape=True`; the carried CSS and theme script are the two values marked safe.

## Lesson

Before feeding a tested function a new source, list what the OLD source did for it for free: which
rows it dropped, which values it zeroed, which keys were always present. Then run the function on
the new source's real rows and look for the case the old source would have removed. Each of the
four above was found that way and none by reading the code. Pin each with a positive control (a
healthy starter counts in full) beside the negative (an Out one counts zero): insight 008.
