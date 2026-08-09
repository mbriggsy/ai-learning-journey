---
title: Four mutants, all killed, and the bug was on the axis I never mutated
date: 2026-08-08
phase: machinery-rebuild
modules: [scripts/consensus.py, tests/test_consensus.py]
tags: [mutation-testing, verification, off-by-one, adversarial-review, false-confidence, insight-013]
---

## Problem

The depth correction in `consensus.py` ([insight 018](018-the-bias-was-the-only-thing-producing-findings.md))
shipped with what looked like a complete verification story:

- 638 tests, 0 failures
- 4 mutants planted, 4 killed, source restored byte-identical
- a call-site test specifically written to catch the naive port
- the result re-measured on the live board, 150 rows, zero variance

It was committed and described as correct. **It contained a critical off-by-one on every single
row**, and an adversarial review fleet found it within the hour — two independent lenses, three
refuters each, all six confirming.

`depth_rank()` is `bisect_left(ladder, ecr) + 1`, and a board player **is himself on that ladder**.
At his own ECR `bisect_left` excludes him for free, because it is left-of-equal. But the spread
probes at `ecr ± sd`, and at `ecr + sd` his own rung sorts strictly below the probe — **so he was
counted as one of the players ranked ahead of himself.** `worst` came back one rung too deep on
**150 of 150 rows**, always in the same direction.

## Root Cause

Three failures stacked, and each one individually looked like diligence.

### 1. The mutants only probed the axis I already suspected

All four mutants targeted **the ladder restriction** — no restriction (M1), reverting the point
estimate (M2), reverting the omitted-player rank (M3), and the naive port (M4). Every one asked
*"is the ranking done over the right population?"*

Not one asked *"is the subject correctly excluded from his own comparison?"* That axis never
occurred to me, so no mutant probed it, so the green result carried no information about it.

> **A mutation suite proves your tests catch the bugs you thought of. It is silent, and
> confidently silent, about the ones you did not.** Four killed mutants read as "this code is
> verified" when it only ever meant "these four hypotheses are covered."

### 2. A test I wrote asserted the bug

`test_the_spread_EDGES_are_measured_on_the_restricted_ladder` asserted:

```python
self.assertEqual(thin_worst, len(thin["RB"]) + 1)
```

with a comment explaining that `len+1` is the last rung an insertion rank can name.

**That comment is true — for a player the board OMITS.** He has no rung of his own, so "behind
everyone I carry" is a real answer for him. It is false for a player the board **carries**, who
cannot rank behind more players than exist including himself.

One function answered both questions, which was the design's elegance — and the trap. I met the
`len+1` behaviour while debugging a failing assertion, reasoned my way to why it was correct,
narrated it as a small discovery, and wrote it into a test. **The bound from the omitted case was
generalised onto the carried case, and then locked in.**

### 3. The evidence I had was real, and pointed the wrong way

The `150/150, zero variance` measurement was genuine and correctly interpreted — it *is* the
circularity. But it was measured on the **point estimate**, which was the half that was right.
Nothing in it touched the spread bounds. A strong, true, load-bearing measurement of one half
supplied confidence about the other half, which it had never examined.

## Fix

An `own=` argument — a player is never his own competition — and it must stay **conditional**,
because over-correcting breaks the omitted-player insertion rank instead (mutant M6):

```python
ahead = bisect.bisect_left(e, ecr)
if own is not None and own < ecr:
    ahead -= 1                    # he is on this ladder; he is not ahead of himself
return ahead + 1
```

Now **7 mutants, all killed**, and the three new ones are the axis that was missing: M5 restores
the self-counting bug, M6 over-corrects, M7 leaves the fix in place but stops passing `own=` at the
call site (insight 013's shape, again).

## The lesson

**Mutation testing measures the imagination of the person who wrote the mutants.** Killing every
mutant means the hypotheses you enumerated are covered — it is evidence about your test suite, not
about your code. Before trusting a clean mutation run, ask the separate question: *what axis of
this function did none of my mutants touch?* Here the whole suite pushed on **which population** is
ranked, and nothing pushed on **who is in the comparison**.

Two concrete generalisations worth carrying:

- **When one function answers several questions, enumerate the questions and test each one's
  boundary separately.** The elegance of `depth_rank` answering three questions is real, and it is
  exactly why a bound legitimately derived from one of them could be asserted against another. Ask
  of every shared helper: *does this invariant hold for all three callers, or only the one I was
  looking at?*
- **A measurement that is true and load-bearing still only covers what it measured.** `150/150,
  zero variance` was correct and important, and it said nothing whatsoever about the spread bounds.
  Confidence does not spread from one half of a change to the other just because both halves
  shipped together.

And the practical one: **the adversarial pass earned its keep on the run where everything was
already green.** It was launched as belt-and-braces on work that had passed tests, mutation
testing, and a live re-measurement. That is precisely the state in which a review is most likely
to be skipped and most likely to pay — insight 013's *"a new test is a hypothesis until it has
failed once on purpose"*, one level up: **a verification method is a hypothesis until something
it missed has been found by other means.**

## Evidence

- Independently reproduced before accepting the fleet's numbers (agent findings are claims, not
  results): `worst` moved on **150 of 150** rows, **150 of 150 in the same direction**, total
  **897.5** VORP points of spurious band-widening, mean **6.0**, max **59.3** (Ja'Marr Chase),
  then Josh Allen 33.3, Drake Maye 24.4, Gibbs 23.1, Bijan 23.1, McBride 21.8.
- End-to-end failure, through `compare()`: hand-demote Chase WR1 → WR2 and the shipped band `(1,2)`
  gives `surviving = 0.0`; the correct band `(1,1)` gives **+59.3, "they like him MORE."**
- **643 tests**, 0 failures. **7 mutants, 7 killed**, source restored byte-identical.
- The new tests fail on M5, M6 and M7 — verified by planting each, not by assuming.
