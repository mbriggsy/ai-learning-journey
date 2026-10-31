---
title: "A direction read off a household TOTAL hides offsetting per-person moves, and a split by the obvious unit can misfire too — read it off the quantity the law makes monotone: the money picture left a release beside a held claim unnamed, a per-payee read would have named one where nothing was released, and each EARNER's charged excess was the quantity"
date: 2026-10-31
phase: the pay check's whole-file review (Phase C, b9-9) — finding c2; corrects the A7 review's "no per-person arrays needed"
modules: [src/engine/earningsTest.ts, src/engine/workingYearLedger.ts]
tags: [aggregate, direction, monotone, earnings-test, apportionment, per-earner, per-payee, money-picture, event-producer, boundary]
---

## Problem

The money picture names why a later working year's Social Security moved — a claim, a spousal start, or the earnings
test's own step. A7 read "who explains this move" off household figures, and its review concluded no per-person
arrays were needed. The whole-file review's c2 found a year where her FRA-year release sat beside his new claim, which
the test held in full: the household's held-back figure ROSE, so the release went unnamed. The obvious fix reads the hold
per PAYEE; verifier (b) showed it misfires the other way — a spousal start on a working earner's record re-splits his
charge across the family (20 CFR 404.439), so his own hold falls while nothing is released. A sibling over-naming came
from the split month's dollar floors.

## Root Cause

The earnings test charges each EARNER's excess against every benefit on that earner's record, apportioned across the
payees. The household's hold sums the earners' charges after apportionment; a payee's hold is one apportioned share.
Both mix in moves with no fixed sign — a start adds a benefit for the excess to reach, a re-split moves a charge
between payees. Only the earner's charged excess moves one way for one reason: a start only widens what an excess can
reach and never starts a credit, so a fall there is the test's own step (a smaller FRA-year excess, fewer months, the
end of the test).

## Fix

`EarningsTestYears.chargedExcess` (per earner, per year, in exact cents), and the ledger names a release only where
`chargedExcess.some((c) => toCents(c[t]) < toCents(c[t - 1]))` — never off the household's held-back figure, never per
payee. The A7 candidate was corrected in place before this distill.

## Key Insight

**Before reading a direction off any figure — rose, fell, released, started — find the quantity whose movement the
rule makes monotone for the cause you want to name.** A total nets offsetting moves; a split by the visible unit
(payee, account, bucket) carries the rule's own re-apportionment as noise. Ask what the law charges and to whom, then
read that. The tells: a "why did this move" sentence keyed on a sum, or on a share the law re-divides.

The same family one layer down (A7): a compiled input that pre-sums per-item vectors loses each item's boundary — a
person's income streams are one leaf, so a pension ending beside a second stream never reaches 0 in the run. An event
producer takes a boundary from the source that still holds it (the draft, compiled one stream at a time), never from
the summed vector.

## Also Applies To

- Every later-year event the money picture names, and any future "what changed this year" line.
- [[093]] — a byte-identity guard over a sum forgives every reallocation inside it; this is the same sum, read for a
  direction instead of an identity.
- [[024]] — keep the per-entity shape through the wire and sum at the last consumer; the pre-summed income leaf is
  that law broken at the event producer.
