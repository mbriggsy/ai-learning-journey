# Comprehension holes are a defect class tests cannot see — only a cold reader finds them

**Date:** 2026-07-03 · **Unit:** P3·U11 (the Healthcare sheet) · **Caught by:** Briggsy's N=1 cold read — nine rounds in one night; zero of them visible to 1,930+ green tests

## The trap

A surface can pass every test, every review lens, and every honesty gate while being
**incomprehensible to its actual reader**. The Healthcare sheet shipped ultramode-reviewed
(13 lenses, 23 agents) with copy that a spouse betting real retirement money could not parse.
Seven distinct comprehension holes, all one family — copy that made the reader do work:

1. **Undefined referents** — "the cliff", "that line", "a line" with no dollar attached.
2. **Unquoted quantities** — "runs ~$174,300 under it" without ever saying what the subject's
   own figure was.
3. **Unattributed derived figures** — "your household's yearly income" for a number the user
   never entered (the plan derives it; say "the plan expects").
4. **Mechanism-frame vocabulary** — "marketplace help" (jargon that even INVERTED for the
   reader: he asked whether conversions *help* with premiums), "per enrolled spouse" (a couple
   is "the two of you").
5. **Garden-path appositions** — "the discount rides your income — around ~$X" (which noun
   owns $X?). One fact per sentence on load-bearing figures.
6. **Era-naked same-named figures** — two "incomes" ($65,100 vs $43,700) with no era on either
   read as a data bug ("test data issue?").
7. **Missing anchors** — "the next step could add ~$1,100" without what you pay *before* it.

Every one of these was invisible to the suite **by construction**: tests pin strings; they
cannot detect that a correct string fails to communicate. The ultramode lenses (correctness,
honesty, a11y) all judged the *content* right — none of them read as a person who doesn't
already know the mechanism.

## The fix shape

- The law is codified (memory `dont-make-users-think` + `back-nine-design` microcopy law):
  every referenced quantity quoted in-sentence; distances ride with both endpoints; derived
  figures name their source; the user's frame, never the mechanism's; one word per mechanism
  per surface (discount=ACA, step=Medicare); same-named quantities wear their era.
- The law is **fleet-enforceable**: a Sonnet-5 audit (5 finders + 5 render-context refuters,
  the law as rubric) swept ALL of copy.ts and found 19 real violations (2 refuted as false
  alarms after checking the rendered neighbors) — the refuter stage matters, because a
  referent supplied by the adjacent line on the same surface is NOT a violation.
- Sibling law minted the same night (memory `content-outranks-aesthetics`): when content and
  container fight, the CONTAINER yields (density tiers, type steps, chrome-less scroll +
  shadow affordance) — content is never cut to fit. The one time it was tried (the intro,
  rationalized as "redundant"), the rationalization was motivated by the pixel budget.

## The rule

Copy that references what it doesn't quote, derives what it doesn't attribute, or speaks the
mechanism's language is a **defect**, not a style choice — and no oracle in the repo can catch
it. Budget a live cold read for every new user-facing surface as a *gate*, not a courtesy; run
the law-rubric audit (finders + render-context refuters) before spending the human read.
