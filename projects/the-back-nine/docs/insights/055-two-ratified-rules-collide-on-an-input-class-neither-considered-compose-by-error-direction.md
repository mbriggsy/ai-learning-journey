---
title: Two independently-ratified rules collide on an input class neither ruling considered — compose by the error-direction law and pin BOTH behaviors, never special-case one rule to satisfy the other
date: 2026-07-02
phase: P3·U9
modules: [src/budget, src/engine]
tags: [council, plan-collision, sticky-rule, degenerate-identity, conservative-direction, compositionality, byte-identity]
---

## Problem

Building U9a's compile layer, two rulings — each correct, each ratified — turned out to
contradict each other on exactly one input class. The council's sticky rule (2026-07-02):
an `other`-category essentials line ERRS STICKY (never scaled by `survivorSpendingRatio`
at widowhood — an unclassifiable survival cost must not shrink). The plan's degenerate-
inert law (3-controls.md U9): a single-essentials-line budget reproduces the scalar path's
ratio-on-total BYTE-IDENTICALLY. A budget consisting of ONE `other`+essentials line
satisfies both antecedents and cannot satisfy both consequents: sticky ⇒ survivor years
spend the full amount; byte-identity ⇒ they spend `amount × ratio`.

## Root Cause

Each ruling was authored against a different prototype input — the council pictured a
multi-line budget with an unclassifiable line among classified ones; the plan pictured
the migration case (one line = the old scalar). Neither body ever saw the intersection
(a lone `other` line IS both). Ratification processes validate a rule against the inputs
argued about, not against the cross-product with every other standing rule.

## Fix

Composed without re-convening, using the project's own tie-breaker (the cardinal rule:
when honest options differ, err CONSERVATIVE — here, a higher survivor floor spend =
lower survival = never optimistic): the sticky rule stands compositionally
(`sticky(category, tier)` is a pure per-line property), and the byte-identity golden is
SCOPED to scalable-category lines (`food` etc.), where it holds exactly. Both behaviors
are test-pinned — including the divergence itself (a strict `<` on the sticky arm's
survival vs the scalable arm's, so the conservative branch is proven live, not assumed).
The rejected alternative — special-casing the compile so a LONE `other` line maps
scalable — would have broken compositionality: adding a second line would silently flip
the first line's survivor semantics. Flagged in the Briggsy digest (U9b's seed-a-budget
affordance must disclose the boundary or seed with a scalable category).

## Key Insight

When two ratified rules collide on an input class neither considered, do not weaken
either rule with a special case keyed to the collision (a rule whose meaning depends on
what OTHER inputs are present is no longer a rule). Instead: (1) let the more
COMPOSITIONAL rule stand unconditionally; (2) scope the identity/equivalence claim to
the region where it provably holds; (3) resolve the contested class by the project's
error-direction law; (4) pin BOTH sides — including a strict-inequality test on the
divergence, so the boundary is a documented feature, not latent drift.

## Also Applies To

- Insight 041's family (a plan step obsoleted by a later decision) — this is the
  SIMULTANEOUS variant: neither ruling supersedes the other; they compose.
- Any per-item classification rule × any aggregate identity claim (tax treatment per
  account vs portfolio-level reduce-to-spine; per-stream COLA modes vs total-income goldens).
- U9b/U11: adding a `healthcare` category later re-opens this cross-product — re-derive
  the sticky map × degenerate scope before shipping the enum addition.
