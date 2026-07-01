---
title: A rider folded into a decision-reviewed commit inherits none of that review's scrutiny — and a wiring-repair fix ships its own silent-regression vector unless a test asserts the association RESOLVES
date: 2026-07-01
phase: P2 (U8 follow-up — the first ultramode CODE review of the colaPct ceiling, insight 050)
modules: [src/intake/OtherIncomeEntry.tsx, src/intake/__tests__/otherIncomeEntry.test.tsx, src/shared/scenarioCodec.ts, src/intake/fields.tsx, src/intake/FieldError.tsx]
tags: [code-review, decision-review-vs-code-review, rider, a11y, aria-describedby, regression-test, dangling-reference, color-blind, fix-is-a-hypothesis, ultramode-review]
---

## Problem

The colaPct-ceiling commit (`dd45083d`, [[050]]) did two things: it closed a cardinal-sin never-deplete
money hole (a grounded range gate on a user COLA rate) **and** it carried an a11y **rider** — a repair of
a dangling `aria-describedby` (every field-level income error set `aria-describedby=err-income-<field>`
on the invalid input, but the single `FieldError` always rendered at `income.save`, so the referenced id
never existed). The gate's *number* (0.05) was settled by a 9-elder Council. But when the unit finally got
its first **ultramode CODE review** (8 lenses + a 3-angle adversarial panel, every finding verified against
source), the money gate came back **clean** — boundary/float, NaN/Inf/overflow, and correctness all returned
**zero** findings — and **100 % of what survived verification lived in the un-reviewed rider.**

## Root Cause

A **decision review is not a code review.** The Council vetted the *judgment* (which number, hard-vs-soft) in
a fresh context; it never read the diff. The a11y rider rode along on that correctness commit and so was
reviewed by **nobody** — not the council (out of its scope), not a code pass (never run until now). Two
concrete gaps hid there: **(1)** the `aria-describedby` association had **no regression test**. `colaPct` —
the field the whole unit exists for — was the ONE field whose error-channel wiring was unasserted, while its
sibling `accountEntry.test.tsx:128-129` already asserted `aria-invalid` **and** `aria-describedby === alert.id`.
Two mutations shipped green: deleting the `errIncomeColaRange` map entry (reverts to the dangling
`err-income-save`) and dropping the range arm from the field's `invalid=` prop (strips `aria-invalid`,
breaking the color-blind three-channel law). **(2)** the new `ERROR_OWNER_FIELD` map newly exposed an
**orphan alert**: a `taxableFraction` range error renders a `role="alert"` pointing at a field hidden in the
collapsed advanced tier (expand → enter `150` → collapse → Save).

## Fix

- A parametrized `expectFieldBoundToAlert` helper asserts the **non-dangling** association (`aria-invalid` +
  `aria-describedby` resolves to the rendered alert) on the colaPct required + range tests, plus a new
  collapsed-tier-reveal test. **The suggested fix was itself a hypothesis ([[026]]):** the sibling's bare-id
  `toHaveAttribute('aria-describedby', alert.id)` would **false-fail** on colaPct, because a field WITH help
  text carries a **two-id** describedby (`{helpId} err-income-colaPct`, `fields.tsx` `describedBy`) — the
  correct assertion is `.split(' ').toContain(alert.id)`. Verified against the real DOM, not pasted.
- `save()` now re-reveals the advanced tier on an advanced-tier error key (`ADVANCED_TIER_ERRORS`), so the
  alert never names a field the user can't see.
- Folding in the arch+simplicity advisory: the restore codec's `needColaRate` now **reuses** the shared
  `colaRateInRange` predicate instead of a hand-copied inline `n < MIN || n > MAX`, so all three gates
  (codec / sanity / form) run byte-identical range logic — the [[020]] agreement made *structural*, not a
  coincidence a future edit could silently break.

## Key Insight

Two edges of the same blade. **(a) A bug-fix's regression guard is PART of the fix.** A wiring/association
repair (`aria-describedby`, a foreign key, an id map, an event binding) is one edit from silently regressing
unless a test **fails on the exact re-break** — and the field the fix is *for* is the one most likely left
unasserted, because the fixer's attention is on making it *work*, not on locking it. The tell: a sibling has
the guard and the just-fixed thing doesn't. **(b) A DECISION review is not a CODE review.** When a council
settles a value, or a design review approves copy, it vets the *judgment* in fresh context — it never reads
the diff. Anything folded into that commit **beyond the decision's scope** (a "while I'm here" a11y rider, a
refactor, a helper) is unreviewed *by construction*. Before calling such a commit done, **grep the diff for
changes outside the decided scope and review THOSE as their own unit** — that residue is exactly where the
ultramode review found everything real here.

## Also Applies To

- Any commit that bundles a rider onto a reviewed/approved change: a refactor beside a bugfix, a "quick"
  a11y/typing cleanup beside a council-settled number, a copy tweak beside a layout approval.
- Cross-reference repairs generally (id maps, `htmlFor`/`aria-*`, FK wiring, pub/sub topics): the fix is
  invisible to a message-text assertion; only an **association-resolves** assertion catches a re-break —
  kin to [[048]] (a green suite that never drives the real path) and [[033]] (verify the gate's TARGET).
- The [[026]] family: a reviewer's suggested fix is a hypothesis — its *shape* (here, bare-id equality) may
  not transfer to the actual wiring (a two-id describedby). Verify against source before pasting.
- The [[035]] a11y-craft family (reserve the live region's box) and [[020]] (one of N equivalent gates
  protects none of the others — now closed structurally for the COLA band).
