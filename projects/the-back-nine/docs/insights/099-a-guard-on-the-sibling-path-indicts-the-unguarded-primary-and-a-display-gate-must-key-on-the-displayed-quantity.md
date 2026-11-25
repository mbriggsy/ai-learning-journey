---
title: A guard shipped on the sibling path indicts the unguarded primary — and a display gate must key on the quantity the surface DISPLAYS, not a correlated axis
date: 2026-07-22
phase: U16 recommendation surface (ultramode fold)
modules: [src/ui/recommendationView.ts, src/ui/money.ts]
tags: [held-out-split, seed-B, inversion, guard-asymmetry, sibling-sweep, display-gate, calm-but-wrong, component-family, aria-disabled, aria-describedby, blocked-apply, state-style, said-once, message-key, message-lifetime, two-input-claim, editsKey, applied-message, action-items-tray, subTenthCollapse, runner-up, no-change, reassurance, false-reassurance, recComposeAlready, inherited-gate, hero-change, stale-disjunct, seed-order]
---

## Problem

The U16 fold's strongest finding (three lenses converged independently; 8/8 refuter
votes RM): the primary delta hero rendered "keeps ~$X more than today's plan" via a
sign-stripping `formatDeltaDollar(|x|)` with NO check that the seed-A-crowned winner
actually displays AHEAD of the baseline at seed-B — while `runnerUpVizFor`, in the
same file, shipped exactly that guard (`winnerDisplaysAhead`) for the sibling
comparison. On a near-tie display inversion the hero would claim "$X more" while its
own viz drew the recommended bar SHORTER. The re-run boundary lens then found the
same shape one axis over: the active-hero gate checked `noChange` + `subTenthCollapse`
(a survival tenth) but never the goal-DOLLAR delta the hero displays, so a real
winner with a sub-$50 seed-B dollar edge rendered "Leaves about $0 more."

## Root Cause

Two instances of one law breaking. (1) The builder KNEW the inversion failure mode —
the sibling guard is the proof — but the knowledge stayed local to the path where it
was first noticed; nothing forced the sweep to every sibling renderer of the same
comparison. (2) The no-dollar gate was keyed to axes CORRELATED with the displayed
quantity (selection noChange, survival collapse), not to the displayed quantity
itself (the formatted goal-dollar delta), so every gate could pass while the string
the user reads was absurd.

## Fix

(30b5ae85) `winnerDisplaysAhead` mirrored onto the primary hero/viz/aria; a formatted
delta of '0' folds into the same `noDollar` routing (predicate = the REAL formatter's
output, never a re-typed threshold); inversion and zero-collapse both route to the
existing honest no-dollar register. Mutants: guard-drop and mirror-drop each red.

## Key Insight

A guard on one sibling path is an INDICTMENT of every unguarded sibling — it proves
the failure mode was known at build time, so the review question is never "is this
failure conceivable" but "grep every renderer of the same comparison for the same
guard." And a gate that protects a DISPLAYED claim must be keyed on the displayed
quantity itself (the formatter's own output), because correlated axes (survival vs
dollars, selection vs display) diverge exactly on the near-ties where honesty
matters most.

## Also Applies To

Any A-decides/B-displays surface (every future solver render); the fan/band renders
if a derived caption ever claims a direction; any place a `format*` result is
asserted positive by the surrounding copy — the "$0 more" class recurs wherever a
gate checks the model and the copy shows the formatter.

## Extended (2026-11-23): a style aimed at a component family must key on the rendered reason

The display-gate rule holds for a look as much as for a figure. A blocked-Apply look (the primary button styled as
"cannot commit") was written for the control sheets that block Apply for a stated reason, and aimed at the whole family
by `aria-disabled` alone. Two members arrive disabled for a different reason: `HealthcareSheet` opens with the picked
option equal to the applied one, and `RothLever` opens on an empty plan. Both got a loud "cannot commit" with no
sentence beside it, which is worse than a quiet disabled button. The look now keys on the rendered reason: the selector
requires `aria-describedby` as well (`.control-sheet__actions .btn-primary[aria-disabled='true'][aria-describedby]` in
`src/intake/controls.css`, whose comment reads "the look is earned by the words"). Key a family-wide state style on the
fact the user is being told, never on a state flag members reach for different reasons.

## Extended (2026-11-25, milestone 1 review round 3, b9-8): a said-once message must be keyed on every input its claim reads

The same rule governs how long a message stays up. After Apply, the Action Items tray said "Applied. Your plan now
holds these changes." and kept the words until their key moved. The key was the shown bundle alone. A new tray edit
moves only the pending edits, so the words stood beside an edit the plan did not hold, and they hid the true line,
"Your changes show once you press Refresh." The claim reads two inputs (what is shown, and that nothing waits beyond
it), and the key read one. Two of round 3's four lenses found it. Fixed in `31bf6d9e`: the key is the tray's `editsKey`,
the shown bundle plus the pending edits (`src/ui/screens/retirement/ActionItemsTray.tsx`), read on the render after the
press.

List what a message's sentence asserts, and key its lifetime on every input behind each assertion. A key on one of two
inputs makes the message true when written and false the moment the other input moves.

## Extended (2026-11-25, milestone 2 review round 3, b9-1): a gate written for an earlier hero, and a reassurance that never reads your plan

The July fold above named `subTenthCollapse` as a correlated axis, added the inversion and `$0` guards beside it, and
left it in the gate. It routed the other way from those guards: not a dollar claim that should not show, but a real win
hidden behind a reassurance. `recommendedView` in `src/ui/recommendationView.ts` set
`isNoChange = payload.noChange || (payload.grade?.subTenthCollapse ?? false)`, and no-change prints
`copy.recComposeAlready`, "You're already on one of the strongest paths we tested". The flag
(`GradeResult.subTenthCollapse`, `src/engine/validation/gradeCalibration.ts`) is true when the winner and the RUNNER-UP
share a displayed tenth of the odds. It never looks at the household's plan, which is what the sentence is about. On
`?seed=order` (winner and runner-up both 7 of 10, per the fix's code comment) the card read "already" under "A confident
lean" while switching saved about $45,000 of lifetime tax and premiums, and the household's plan ranked 14th of 77 (the
figures the commit records). The same words reached the Winner card, Summary, Comparison, Details and the home card. The
P0, 3 of 3 refuters.

Why it was there: `docs/plans/4-recommendation.md`'s grade-calibration bullet ("Grade vs. display resolution are
reconciled", which `gradeCalibration.ts` cites as S4.4) guards an `X of 10` hero, where a sub-tenth win would show an unchanged `X of 10` under "just do it". Its first remedy
is "show the finer figure". By the first build (`6f9278628`, 2026-07-22) the hero was already a dollar delta against the
no-action baseline, which is that finer figure, but the routing came across from the plan unchanged and stood four
months. Fixed in `ff4e1c0d4`: `isNoChange` is `payload.noChange` alone. The inversion and `$0` guards, neither of which
reads the flag, still cover every misleading dollar. The flag is still computed and saved; nothing routes on it. The
test in `src/ui/__tests__/recommendationView.test.ts` now expects a sub-tenth collapse alone to stay `active` with its
dollar delta. In the real app, order's card reads "~$45,000 less in tax and health premiums, compared with your plan
today".

What it adds: (1) when a hero's quantity changes, re-key every gate that guards it on the new quantity; a gate kept from
the old hero guards nothing, and here it suppressed the new hero. (2) The no-dollar register is not a safe default: a
reassurance is a claim about the household's plan, so its gate must compare that plan, not two other candidates. Check
that the operands a gate reads are the operands its sentence names. (3) A fix that adds guards to an OR'd gate should
also re-ask whether each old disjunct still earns its place, because the routed sentence is only as true as the weakest
one. A near cousin is filed, not fixed (`docs/backlog.md`, Tier 1, *Act 6 milestone 2's review: what a reader can misread,
left open*): the seed-B inversion route can still say "already" where the winner, crowned on the odds, costs more on
the goal.
