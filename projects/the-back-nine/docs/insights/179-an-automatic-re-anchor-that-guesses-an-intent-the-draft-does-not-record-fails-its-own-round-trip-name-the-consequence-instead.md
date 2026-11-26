---
title: An automatic re-anchor that guesses an intent the draft does not record fails its own round trip — a birth-year fix that kept the typed claim year and moved "paying now" streams turned a typo fixed back (A to B to A) into a pension paying a year early; name the consequence before Save and let the household choose
date: 2026-11-26
phase: Act 6 milestone 3's whole-file review, rounds 1 and 2 (b9-4, 2026-11-26)
modules: [src/ui/screens/profile/drawers/familyFields.ts, src/ui/screens/profile/drawers/FamilyDrawers.tsx]
tags: [round-trip, A-B-A, intent, re-anchor, derived-fields, birth-year, claim-age, income-stream, paying-now, notice, never-blocking, calm-but-wrong, guess, provenance]
---

## Problem

Round 1 of milestone 3's review (`4be1d777`) found that a corrected birth year moved income already paying and the
Social Security year the household had typed. Its fix made a birth-year change keep the typed claim YEAR and re-anchor
each "paying now" stream at the new age. Round 2's adversary (`4bad8f72`) then fixed a typo back: 1961 to 1962 and back
to 1961. The streams did not come back: a pension typed to start next year was now paying, a P0. The same seat showed
the tray writes claim AGES, so "keep the year" contradicted a figure the household had set in age terms.

## Root Cause

The draft stores ages (`socialSecurityClaimAge`, each stream's `startAge` and `endAge`), and a stream entered as "paying
now" is stored as starting at the owner's age that day. Nothing records whether the household meant the age or the
calendar year it fell in. The re-anchor picked one meaning and rewrote the stored figures to match it, so each move
compounded: B was rebuilt from A under a guess, and A was then rebuilt from B under the same guess, landing somewhere
neither save described.

## Fix

A birth-year change writes only the birth year and the age derived from it. The Family drawer names, before Save and
without blocking, what would move (`birthYearMoves`): the claim's new calendar year at the same age, and each stream
that would start later, pay now, end or pay again. With the form back at A the notice is empty and nothing has moved.

## Key Insight

Where the model cannot hold an intent, never guess it in a write: a transform built on a guess is not invertible, and
the household's next correction compounds the error. Name the consequence where they decide and let them change the
figure themselves. Test every automatic transform on a reversible edit with A, then B, then A again: the draft must
equal the original.

## Also Applies To

- Any write that "helpfully" keeps one representation of a fact while another moves: a calendar year beside an age, a
  monthly figure beside a yearly one, a share beside a dollar amount.
- [[144]]'s 2026-11-23 extension: a provenance mark must survive the control's round trip. The same A-B-A test, for a
  mark instead of a figure.
- The notice itself must be readable before the action: [[149]]'s 2026-11-26 extension.
