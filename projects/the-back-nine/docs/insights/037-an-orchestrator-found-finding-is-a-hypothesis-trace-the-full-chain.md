---
title: The orchestrator's own "pre-verified" finding is still a hypothesis — a partial-chain trace manufactures false confidence
date: 2026-06-14
phase: P2 (D1 — the account-level intake; ultramode review)
modules: [intake, store, engine]
tags: [review, adversarial-verify, over-confidence, source-trace, false-confidence, data-contract, magi]
---

## Problem

During the D1 holistic review, the orchestrator surfaced a finding the 10-agent
panel did NOT raise: `buildDateInput` (intakeMap.ts) drops the whole
`workingYearIrmaaMagiByPerson` array when any person's slot is `undefined`, so a
ONE-working/one-retired household loses the working spouse's required IRMAA
override → understated surcharge → a falsely-early "fuck-off date." It was traced
to source on the producer (intakeMap) AND the engine consumer
(healthcareStreams.ts), declared **"pre-verified,"** and reported to the user as
a real P1 *before any fix was written*. The adversarial-verify stage REFUTED it.

## Root Cause

The trace covered two of the **three** files the claim depends on. The premise —
"worker slot filled while the retired slot is `undefined`" — is structurally
unreachable: the actual UI **writer** (`questions.tsx` workIncome `onCommit`)
forces `next[j] = 0` for every retired person on *every* commit, so the array is
never holed that way. And even a manufactured hole is caught **loudly**:
`simulate.ts`'s bridge-year override-required gate returns a typed input-failure,
never a silent understatement. The consumer and the array's producer were read;
the array's *writer* and the engine's *backstop gate* — the two sites that close
the hole — were not. "Pre-verified" rested on a convincing subset.

## Fix

Dropped the finding; no code change. The proposed `?? 0` rewrite would have
replaced a fail-loud-on-genuine-hole with a silent 0-fill — strictly worse. The
cadence worked: the finding had been routed to a refuter *because* the panel
missed it, and the refuter read the third file. (The 11 genuinely-real fixes from
the same review all shipped.)

## Key Insight

An **orchestrator-found** finding — one you discover yourself, outside the review
panel — is ALSO a hypothesis, and the more dangerous kind: finding it yourself
*feels* like verifying it. "Pre-verified" is true only after tracing the FULL
chain — every producer, consumer, writer, AND gate between — not the two ends
that first look suspicious. A trace of N−1 of N relevant sites manufactures
confidence in proportion to how convincing the subset is. So the adversarial
refuter earns its keep most against your OWN findings: route them with the same
"default to refuted" skepticism as a reviewer's, and explicitly tell it to read
the files you didn't. (Distinct from insight 026, which verifies your *fixes* for
confirmed findings; this is about your independently-*found* claims.)

## Also Applies To

- Any "I already checked it" claim made to the user before the fix — the check's
  *completeness* is the unverified part.
- A reviewer's "X is inconsistent with Y" claim needs BOTH X and Y traced: this
  session's DA1 claimed AccountEntry clears errors on input vs the R19 grammar on
  blur — but AccountEntry clears on blur too (`onCommit`), so the inconsistency
  premise was false though the underlying law-adherence gap was real.
- Any multi-layer data-flow finding: trace the writer, the reader, and every gate
  — a value's hazard is rarely visible from just the two ends.
