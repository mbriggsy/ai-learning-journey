---
title: Positive-completion gates must check only properties the animation owns; CSS co-occupation produces permanent false negatives
date: 2026-05-22
phase: trailer-phase-3
modules: [videos/trailer/scripts/capture-htp-scroll-burned.ts, src/client/howtoplay/components/DossierPage.module.css, src/client/howtoplay/hooks/useScrollReveal.ts]
tags: [gates, completion-detection, computed-style, css-cascade, animation-ownership, playwright, scrollreveal]
---

## Problem

Phase 3 Unit 3.1 upgrades a Playwright capture script's gate from
WARN-but-proceed to positive-completion. The plan template specified
the gate as:

```ts
return cs.opacity === '1' &&
  (cs.transform === 'none' || cs.transform === 'matrix(1, 0, 0, 1, 0, 0)')
```

— wait until every `[data-reveal]` element reaches opacity=1 AND
identity transform. The reasoning: "the reveal animation terminates
when both opacity and transform reach their rest state."

Against production BURNED HTP, the gate **timed out on every run**
despite the reveal animation actually completing. Diagnostic dump
showed all 10 `[data-reveal]` elements at opacity=1, but with
non-identity matrix3d transforms like `0.999945, -0.0104699` —
sub-1° rotations.

That's not a half-finished animation. It's `DossierPage.module.css`
shipping `transform: rotate(-4deg)` on `.paper` AT REST, before any
animation touches the element. Per-`nth-child` alternates the angle
slightly across pages (hence the +/- variation). The matrix3d we
see is `rotate(-4deg)` composited with the reveal's terminal
`translateY(0)`.

The gate would have **permanently false-negatived** any capture
against any HTP version that ships the rest-rotation. Reveal
completion was real; the gate condition was over-constrained.

## Root Cause

**The reveal animation does NOT own the transform property.** It
owns opacity (and possibly a tween's translate-Y inside a
`gsap.from`), but the matrix3d at terminal state is the combination
of:

- whatever the reveal animation sets at completion (translateY 0)
- whatever CSS sets independently (`.paper { transform: rotate(-4deg) }`)

The plan author assumed the animation owned the entire transform
property. It didn't. The CSS rest-state co-occupies the same
computed-style slot.

Computed-style is the **final composite** of all sources that touch
a property: cascade, animation values, transitions. Asserting a
property reaches a specific terminal value requires either:

1. Knowing that ONLY the animation writes that property, OR
2. Knowing what the cascade contribution will be and accepting it
   as part of the terminal state.

The plan template did neither. It asserted `transform === 'none' ||
identity-matrix`, which is only true when nothing else in the
cascade touches transform — a default the plan author didn't verify
against the actual HTP markup.

## Fix

Loosen the gate to check opacity only. Add a comment explaining why
(so a future "more rigorous" pass doesn't reintroduce the transform
check):

```ts
// DELIBERATE: we check opacity ONLY, NOT transform.
// `DossierPage`'s `.paper` class sets `transform: rotate(-4deg)`
// (and per-nth-child variants) AT REST, independent of the
// useScrollReveal opacity tween. Including transform in the gate
// produces a permanently-stuck false positive. Opacity is the
// load-bearing signal of reveal completion; the presence-companion
// (count ≥ MIN_REVEAL_COUNT, asserted earlier) handles the
// empty-selector vacuous case (insight #027).
return Array.from(reveals).every(
  (el) => getComputedStyle(el).opacity === '1',
)
```

The presence-companion (count ≥ 8) still handles the empty-selector
case from #027. The gate is opacity-only because opacity is what the
reveal animation actually owns.

## Key Insight

**Every condition in a multi-condition completion gate must be both
(a) load-bearing for the completion signal AND (b) owned by the
animation alone.** A property the animation *touches* but doesn't
*own* will combine with cascade contributions and produce a terminal
state that's never the "identity" the gate naively assumes.

The reverse mistake — adding too few conditions — is easy to catch
(the gate passes on incomplete animations). The mistake here —
adding too many conditions — is hard to catch because the gate fails
LOUD on a CORRECT terminal state. You diagnose "why isn't the
animation completing?" and waste hours before realizing the animation
completed fine; the gate is wrong.

Catch shape during plan execution: when implementing a
`waitForFunction` or `waitForCondition` style gate that asserts
multiple computed-style values, ask each one:

1. Does the animation under test SET this property at its terminal
   state? (If no — drop the condition.)
2. Does any other source — cascade, transition, sibling animation —
   also write this property? (If yes — include the cascade
   contribution in the expected terminal, or drop the condition.)
3. If both 1 and 2 are uncertain — instrument first. Run the page
   to its terminal state by hand, dump getComputedStyle, see what
   the real terminal value is. Then write the gate.

The broader rule: **"more rigorous" gates are not monotonically
safer.** A gate that fails on the correct terminal state is worse
than a gate that misses some failure modes — at least the second
ships product. Misaimed rigor produces "the system is broken!" panic
when the system is fine.

## Also Applies To

- ANY Playwright / WebDriver / Puppeteer completion gate that uses
  getComputedStyle to assert "animation done."
- React Testing Library `waitFor` assertions on CSS values that
  multiple animations/transitions/cascade rules might write.
- CSS visual regression tests that compare computed styles —
  baseline must be derived from the real terminal state, not from
  what the plan author expected.
- GSAP / Framer Motion / WAAPI completion detection: which
  properties does the tween OWN vs which does it TOUCH? GSAP's `from`
  composites with rest CSS; this insight is its load-bearing form.
- Any "wait until state matches" pattern where "state" is the
  composite of multiple sources. The composite has rules; assert
  against them, not against a default.
- Distinct from insight #019 (surface coherence misses signature
  drift — about plan-review pass quality) and #057 (plan-vs-spike
  drift — about constants) and #062 (default-fallback masks
  data-pull). This is **plan-template gate conditions assume
  implementation ownership of CSS properties the animation doesn't
  actually own**.
