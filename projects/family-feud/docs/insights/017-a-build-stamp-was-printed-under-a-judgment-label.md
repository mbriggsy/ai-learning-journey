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

## Related

- [`013`](013-every-guard-was-tested-and-not-one-was-proven-connected.md) — the call site, again.
- [`006`](006-four-verification-steps-that-could-silently-do-nothing.md) — checks anchored on a
  word that a rename makes silent.
- [`008`](008-a-broken-instrument-returns-zero-and-zero-reads-like-a-finding.md) — why the new
  PDF footer reader treats "found no date" as a finding rather than as agreement.
