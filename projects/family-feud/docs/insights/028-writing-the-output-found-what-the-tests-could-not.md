# 028 — Writing the product's own output found three defects the tests could not

**Found 2026-08-17**, while writing the worked examples for the four-line advisory format
(`docs/draft-day-runbook.md` → *Advisory format — THE FOUR LINES*).

## The claim this corrects

`TODO.md` item 0 said, in the sentence that scoped the whole build:

> *"The engine's state is rich enough already; what does not exist is the **synthesis**."*

**It was not rich enough.** Composing three real advisories against
`tests/fixtures/lab_feed_120.json` found **three separate defects in the engine**, at a moment when
the repo held **975 passing tests, a green board gate, and a mutation-tested guard on almost every
branch that mattered.** None of that machinery had found any of them, and none of them were subtle
once seen.

## What it found

### 1. The "one clause of why" was loaded and never printed

The format's first line is *"THE CALL — one name, **one clause of why**"*. The why-material is the
`note` on the board's own rows — 174 of them, mean 60 characters — and `draft_engine.py` loaded
every one and printed none. Composing a call therefore required opening `players_data.json` in a
**second round trip**, and round trips are 96-98% of every on-clock second ([026](026-the-loop-fits-and-the-scripts-were-never-the-cost.md)).

No test could have caught this. Nothing was *wrong*. A field was simply absent from an output whose
consumer had never been written down.

### 2. The seat list went silent at the exact moment it was needed

`draft_engine.py` printed *"Between now and you"* under `if ... picks_until_me > 0`. The instant it
became **our** clock — `picks_until_me == 0`, the pick actually being made — the block vanished.
`THE WAIT` gave the *count* of opposing picks before our next turn; this gave the *seats*; and the
two were **never on screen together**. On the clock: a count with no seats. Off the clock: seats for
a turn not being taken yet.

Line four of the advisory is literally *"who picks before I pick again, and what do they need."*
The advisory's own denominator was missing from the state it is composed from.

### 3. I asserted a fact from memory and nothing could have corrected me

The first draft of the `#30` example read *"slots 4 and 6 both need WR and both pick before you."*
The real answer is **slot 2, slot 1, slot 1, slot 2** — two teams picking twice each, both needing
**TE**, while `TE T3` sat on a cliff. Not only was the invented version wrong, the true version was
a **sharper read** than the thing I made up.

That is defect 2 seen from the operator's side: the number was not on screen, so working memory
filled the hole, exactly as it would have at 8pm on 29 August.

## The lesson

> **Compose the product's real output. It is a stronger test of the instrument than the test suite,
> because it is the only check that asks whether the instrument says what a human actually needs.**

Tests, gates and mutants all answer *"is this code doing what it was written to do?"* Every one of
them was green. They cannot answer *"is what it emits sufficient to do the job?"* — because that
question is not about the code, it is about the **gap between the output and its consumer**, and
nothing in a repo represents the consumer until somebody sits in that chair.

This is the same family as [005](005-the-tie-breaker-agreed-with-the-board-by-construction.md) and
[013](013-every-guard-was-tested-and-not-one-was-proven-connected.md) — a check that cannot fail,
or is not connected to the thing it names — but arriving from the opposite direction. There the
instrument was wired to nothing. Here the instrument was perfect and **pointed slightly away from
the target**, and only standing where the user stands revealed the angle.

## What to do about it

- **After any engine change, write one real advisory from its output.** Not a test asserting a
  string — the actual four lines, read as Briggsy would read them on a clock. It is now recorded as
  a step in `TODO.md` item 0.
- **Treat "the state is rich enough already" as an unmeasured claim**, every time, no matter who
  wrote it. It is a statement about a consumer that may not exist yet.
- **When an example needs a fact the output does not carry, that is a finding, not an
  inconvenience.** All three defects above surfaced as "I need X and cannot see it" and every one
  of them was a real gap. The temptation is to go fetch X from a file and keep writing.

## Related

- [026](026-the-loop-fits-and-the-scripts-were-never-the-cost.md) — why a second round trip is the
  expensive thing, and therefore why an unprinted field is not a small problem.
- [013](013-every-guard-was-tested-and-not-one-was-proven-connected.md) — green tests over a guard
  connected to nothing.
- [016](016-the-banner-printed-after-the-advisory-it-qualifies.md) — the other defect class that
  only appears when you read the output in order, as a human does.
