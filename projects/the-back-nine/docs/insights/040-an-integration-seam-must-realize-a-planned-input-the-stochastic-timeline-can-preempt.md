---
title: An integration seam must realize a planned input the stochastic timeline can preempt — the survivor base credited DRCs the deceased never lived to earn
date: 2026-06-14
phase: P2 (SS benefit sub-engine — integration seam review, post-wiring)
modules: [src/engine/simulate.ts, src/engine/socialSecurityBenefit.ts]
tags: [integration-seam, calm-but-wrong-optimistic, survivor-floor, claim-age, coverage-gap, holistic-review, mutation-survival, DND-012]
---

## Problem

The §202 survivor seam built the deceased's `BenefitPerson` with `claimAge: d.socialSecurityClaimAge`
— the household's **PLANNED** claim age — unconditionally, then computed the survivor base from it. On
any Monte-Carlo path where the death offset preceded the claim offset, the deceased **never lived to
file**, yet the seam credited the full delayed-retirement credit of a claim they never made: a
plan-70 breadwinner dying at 68 got a `1.24×` PIA survivor base instead of the `1.08×` they actually
earned; dying at 66 (before FRA) got `1.24×` instead of the full PIA. An **OPTIMISTIC overstatement of
the survivor floor — the cardinal sin — on exactly the early-widowhood paths the §202 unit exists to
harden.** Reachable, not measure-zero: the longevity sampler's minimum death age is 66
(`longevity.ts`: `startAge = max(currentAge, 65)`, loop from `startAge+1`), and claim-70 is the de
facto household default, so deaths at 66–69 before a planned-70 claim are a common path class.

Two sibling **coverage gaps** rode alongside (the seam code was correct but unverified): no fixture
drove a **nonzero spousal excess** through `cashTermsForYear`, leaving the excess START gate
(`max(claim, higherClaim)`) and END-at-death (anti-double-count) gate untested; and the survivor
`max(ownStream, survivorStream)` was tested only survivor-wins (survivor `pia=0`), never own-wins.

## Root Cause

The pure sub-engine (`survivorBenefitAnnual`) **correctly** trusts `deceased.claimAge` as the
*realized* claim age — that is its input contract, and the pure-core review (insight 039) locked it.
The bug lived entirely in the **integration seam**: the seam is the only layer that knows the
stochastic timeline (which path, which death year), and it fed the pure core a **planned** value as if
it were realized. The highest-value finding lived in the *interaction* between the new seam and the
correct pure core — precisely where a diff-scoped review cannot look, and why this holistic
integration pass existed.

## Fix

`realizedClaimAgeAtDeath(plannedClaimAge, birthYear, ageAtDeath) = max(min(planned, ageAtDeath), ⌊FRA⌋)`,
called in the seam to realize the deceased's claim age before constructing the `BenefitPerson`.
Capping at age-at-death strips the unearned credits; the FRA floor keeps an unfiled **pre-FRA** death
from picking up a spurious early-claim reduction (it lands on the full PIA — 20 CFR §404.313, POMS RS
00615.301/.690, confirmed by grounded search corroborating the plan's own cited primaries). EXACT for
a whole-year FRA (both shipped cohorts = 67); for a fractional-FRA cohort it floors to ⌊FRA⌋, a
sub-one-year **conservative** (never optimistic) residual. The pure core is untouched — the seam
composes the new helper with the unchanged `survivorBenefitAnnual`, so insight-039's lock holds. Six
hand-derived goldens (DND/012) pin it: the realization at each boundary, the integration dollar
($19,587.60 vs the buggy $22,490.40), the nonzero-excess START/END gates, and the own-wins selection.

## Key Insight

**A pure unit's input contract assumes its inputs are already realized; realizing a PLANNED input that
a stochastic process can preempt is the SEAM's job, never the pure core's.** When a model field is a
*plan* the simulation can cut short — a planned claim age vs. a death before it — the seam must reconcile
the plan against the path. Carrying the plan verbatim is calm-but-wrong, and the direction is the one
that matters: here it overstated the most consequential number in the run.

And the gap that hid it: **a discriminating test must drive the PREEMPTION, not just the plan-equals-outcome
case.** Every fixture reaching the survivor branch used an already-claimed deceased (negative claim
offset ⇒ death always *after* filing), so the death-before-claim path was structurally untested — and
an adversary's mutation proved the same of the excess gates (stripping the START gate and leaking the
excess into the survivor branch each survived 915/915). A money path no fixture exercises with a
**nonzero, preemptible** value is unverified even when the code is correct (cf. insight 029 — an
equality on a structurally-zero surface discriminates nothing).

## Also Applies To

- Any engine field that is a PLAN a stochastic outcome can preempt: a planned retirement age vs. an
  earlier death, a planned Roth conversion vs. mid-path depletion, a planned contribution stream vs. a
  death-truncated working window. The seam realizes the plan against the path; the pure layer must not
  assume the plan happened.
- The realization belongs in the layer that owns the conditioning information (here: the death
  timeline lives only inside the path loop) — a mirror of insight 020/027 (gate a guard on the
  hazard's own domain, not a proxy or an upstream assumption).
- Reviewing a "wire it in" commit: read the seam against the WHOLE pure contract it consumes, and ask
  for every input "can the simulation make this false before it's used?" — the planned-vs-realized
  fracture is invisible in the diff and invisible to fixtures that only test the realized-as-planned case.
