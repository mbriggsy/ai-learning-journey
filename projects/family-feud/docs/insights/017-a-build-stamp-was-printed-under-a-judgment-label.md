# 017 — A build stamp was printed under a judgment label, and the gate certified it

**Found:** 2026-08-08, three weeks before the draft, while verifying the TODO rather than
debugging anything.

## What the board said

> Rankings synthesized **Aug 8, 2026** from FantasyPros, FTN, ESPN, Yahoo, CBS, NFL.com, SI, PFF
> consensus + training-camp reporting, tuned for this league's exact format.

## What was true

The rankings were the **Aug 5** synthesis. Hashing the judgment fields (`r`, `pr`, `tier`,
`badges`, `note`) separately from the generated ones across every commit that touched
`players_data.json` put the judgment frozen at one value since `c6379d78` — and `c6379d78` was
eight rows of `"team": "JAC"` → `"JAX"`, a spelling fix that re-ranked nobody.

## The mechanism

Three correct-looking pieces composing into a lie:

1. `build_board.py` — `floors = [today]`, then `meta["updated"] = max(floors)`. **Honest.** It
   means "this build is at least as new as its newest input," and it is always today.
2. `render_html.py` fed that number to `__SYNTH_DATE__`, which lands behind the words *"Rankings
   synthesized."* `render_pdf.py` printed it again on the cheat sheet.
3. `validate_board.py` asserted **the visible date equals `meta.updated`** — so the check passed
   every day *by construction*, while the sentence it blessed got less true every day.

Rebuild on Aug 28 and both surfaces claim a synthesis from "training-camp reporting" performed
that morning, over judgment 23 days old.

## The lesson

**A number is not a fact; a number under a label is. Guard the pair.**

`meta.updated` was never wrong. It was *relabelled* by the sentence it was dropped into, and no
check reads sentences. Every check on this board compared the board to another copy of itself —
residue #3's lesson, one key over — so a board perfectly self-consistent about the wrong thing
stayed green forever.

The fix is not a better date. It is a **pinned prior assertion**: `meta.rankings`
`{synthesized, judgment}`, written when a human last actually re-ranked and **carried** by the
generator, never regenerated. Recomputing the digest at build time would make the check agree by
construction and verify nothing — the disease, not the cure. That mutant was planted, and it
**survived** the first run.

## Three ways this nearly shipped broken anyway

- **The call site was untested.** Cutting `problems += check_rankings_provenance(d)` out of
  `validate()` left all eleven function tests green and the whole suite green. Insight
  [`013`](013-every-guard-was-tested-and-not-one-was-proven-connected.md) for the third time. If
  a guard's deletion turns nothing red, the guard is decoration.
- **The digest was blind to the re-rank that matters most.** `pr` is the rank *within* a
  position, so trading two players at different positions in overall board order leaves both `pr`
  values identical. Swapping Bijan Robinson (r=2, RB) and Ja'Marr Chase (r=3, WR) produced a
  **byte-identical digest**. `r` is the primary judgment; `pr` is a pure function of it
  (0 violations across 174 rows).
- **The fixture could not have caught it.** `good_board()` rows carried no `sleeperId`, so the
  digest keyed every row on the string `"None"` and two rows identical apart from `r` collapsed
  into one multiset entry. The test failed on its first run **against a fixture that did not
  model the board it stands in for.**

## How the blindness was found: a plant that failed to land

The end-to-end test set Gibbs `pr=1` and Chase `pr=1` to swap them. The script printed:

```
before: Jahmyr Gibbs pr=1   Ja'Marr Chase pr=1
after : Jahmyr Gibbs pr=1   Ja'Marr Chase pr=1
```

They are RB1 and WR1. The swap was a no-op, and the gate stayed green. **Had the script not
printed the values, a green gate would have read as "the guard does not work"** — and the real
finding (that `pr` is position-relative, so `r` is the field that carries board order) would have
been buried under a wrong diagnosis of a guard that was actually fine.

Print what you planted. Then ask why a no-op was a no-op.

## The standing rule

- **Never print a derived timestamp behind a hand-written claim about *what* happened.** Either
  derive the claim too, or pin the claim and check it against a digest of the thing it describes.
- **A change-detector must be keyed on the field a human edits**, not on a field derived from it.
  Ask: what is the smallest real edit that must fire this, and does it?
- **Fixtures that omit fields the real artifact always carries will pass tests the real artifact
  would fail.** `enrich()` refuses to build a board without `sleeperId`; the fixture had none.

## It was still live on a third surface a day later — found at squeaky, by the calendar

**2026-08-09.** The fix above moved `render_html.py` and `render_pdf.py` onto
`meta.rankings.synthesized`. **`docs/ranking-methodology.md` was missed**, and its generated block
went on printing `meta.updated` under the literal word *Rankings*:

> *Rankings snapshot: **August 9, 2026**.*

about a synthesis performed on **August 8**. Same field, same label, same lie — one surface over.
Insight [`005`](005-the-tie-breaker-agreed-with-the-board-by-construction.md)'s meta-lesson, for
the second time: **an insight that does not reach every surface stating the rule is a note, not a
fix.** When 017 was written, "which surfaces print this?" was answered with two.

**How it surfaced is the useful part.** Nobody went looking. A squeaky-clean pass ran the suite,
two byte-stability tests were red that had been green all evening, and a tracked doc was modified
that nobody had touched. The only thing that had changed was midnight.

**And the root cause was one line wider than the label.** `meta.updated` was
`max(today, dump_fetched_at, three mtimes)` — `today` unconditionally in the list, which made a
data-freshness field into a build timestamp. Measured: a rebuild the next morning rewrote
`players_data.json`, the board HTML, the cheat-sheet PDF **and** the doc, with byte-identical data.
The gate's rule is one-sided (`if when_d > claimed_d` — it only complains when an input is *newer*
than the stamp), so **`max(inputs)` satisfies it exactly and `today` was never buying anything.**
When the build ran is a build fact and `meta.build` already holds it.

Two lessons, both narrower and more actionable than "guard the pair":

- **A derived timestamp that includes `today` is not a data field, whatever it is named.** It will
  churn every surface it touches, daily, forever, and the churn looks like a real diff.
- **A test whose green depends on the artifact having been built today is a time bomb.**
  `test_an_unchanged_rebuild_is_byte_stable` compares the committed board against a fresh rebuild,
  so it silently encoded "the committed board was built today." It passed for a full session and
  went red at midnight. Both mutants confirm the link: restoring `today` to the floors turns the
  new clock test **and** the byte-stability test red together.

## Related

- [`013`](013-every-guard-was-tested-and-not-one-was-proven-connected.md) — the call site, again.
- [`006`](006-four-verification-steps-that-could-silently-do-nothing.md) — checks anchored on a
  word that a rename makes silent.
- [`008`](008-a-broken-instrument-returns-zero-and-zero-reads-like-a-finding.md) — why the new
  PDF footer reader treats "found no date" as a finding rather than as agreement.
