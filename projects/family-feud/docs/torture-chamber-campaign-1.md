# Torture Chamber — Campaign 1 report

> **2,200 synthetic rooms against the shipping queue policy. Run and verified 2026-08-20,
> 9 days out.** Plan: [`torture-chamber-plan.md`](torture-chamber-plan.md). Oracles:
> [`torture-chamber-invariants.md`](torture-chamber-invariants.md) (ratified by Briggsy the
> same day). Every finding below survived an independent adversarial verifier that was told to
> kill it; every number a verifier corrected is shown corrected, with the wrong version named.
> Batteries are seed-reproducible; verifier scratch work is quoted from their reports.

## ▶ THE THREE DECISIONS FOR BRIGGSY — the campaign's entire actionable output

**D-A · Measure Sleeper's real blown-clock fallback (fold into the advisor-mode mock).**
The chamber's scariest result is not a defect in our code — it is an ASSUMPTION we are
renting. When a blown clock pins auto-pick (Mock #2: one miss → pinned for the rest of the
draft), our armed 12-name queue only covers **1-6 of the 6-15 unattended picks** — real-shaped
bots eat the armed names between our turns — and everything after that is filled by
**Sleeper's own fallback, whose need-awareness we have observed exactly once** (Mock #2:
Dicker + the Patriots, catalog E2). Re-run the same 380 pinned-drain rooms with the fallback
modeled as pure best-available instead: **DEF strands in 380/380, K in 332/380, TE in 62/380**,
and the off-policy slack violations the catalog predicted (C6) fire on schedule. So:
*attended, the policy is safe everywhere we probed; unattended past ~4 picks, safety is
currently a bet on Sleeper's fallback.* One deliberately-blown clock in the next mock prices
that bet for real. Cheap, and it rides a session we already owe.

**D-B · The dead-QB bench stack — decide whether the queue gets a surplus guard.**
Real, confirmed in the shipping engine, and already seen live once (the 2026-08-19 mock's
naive queue offered a second QB — `draft_engine.py:766-769` records it). Once our lineup
saturates (~our 9th pick), every pick's queue-top is a zero-delta bench body chosen by BOARD
ORDER — and surplus QBs never leave that pool, because QB2+ has delta exactly 0 forever (one
QB slot, no flex eligibility) while surplus RB/WR/TE keep positive deltas until FLEX fills and
get drained by other seats. Verified magnitude: in ADP-faithful rooms the policy benches
**4-6 QBs (modal 4)**; in rooms bounded by this league's measured facts, **mode 3, with 4+ in
~35-40%** — i.e. 1-3 dead bench slots that could have been RB/WR/TE insurance. The
counterfactual is priced: capping QBs at 2 changes the starting lineup by EXACTLY zero
(definitionally — these are bench picks) and buys back the insurance (in the worst probe
rooms the shipping policy kept only 2 WRs for 4 WR-eligible slots). ⚠️ Two honest cautions
before deciding: the remedy lives one door from insight 024's defect 3 ("a cleverer queue"),
and his eye — not this report — owns whether a 3rd QB is ever wanted (trade bait is not a
thing in an 8-team room, but the call is his). The chamber's recommendation: a cap or
deprioritization of *unstartable surplus* in the zero-delta tail is arithmetic, not valuation
— but it is a shipping-policy change, so it waits for ratification, and the ~Aug 27 refresh
is its natural moment (never inside the 48-hour freeze).

**D-C · Supply-aware squeeze line — cheap hardening, low urgency.**
The automated alarms carry no board-supply term anywhere (`mandatory_squeeze` counts picks,
never pool — catalog E3, now measured): zero kickers left with picks to spare prints nothing,
and a fully exhausted position silently VANISHES from TIER CLIFFS instead of alarming. A
human reading the advisory does see supply (the cliffs print counts every run — the verifier
made sure we did not overclaim this); the unattended actor and the alarm layer are what's
blind. A supply term in the squeeze + an "exhausted tier" line is advisory-only and
doctrine-compatible (E2: warn the human, never re-rank the queue). Low urgency because the
trigger is unreachable in this room (below).

## The findings, as verified

**F-1 — Supply-blind K/DEF deferral. QUALIFIED.** Mechanism confirmed in code end-to-end;
batteries reproduce bit-exact; threshold real (3-4 hoarder seats: 48/48 PASS · 5-6 seats:
388/388 FINDING, K stranded every time). **Corrections the verifier forced:** my "last chance
is round 4" was FALSE — an artifact of the chamber's own violation-detail truncating the
chances list to its FIRST four (fixed in `chamber.py` the same day); the measured last chance
was round 5-6 in all 444 finding rooms, and a wrapper policy taking the best K at its round-5
pick prevents the stranding in 100/100 rooms at zero lineup cost (1090.1 vs 1087.6 — better).
A reactive trigger fails only for seats 1-2 (snake geometry hides the drain). **Reachability:
essentially nil** — needs ≥5 of 7 humans double-hoarding kickers from round 5 against a room
measured at zero K picks before round 10 in 18/18 drafter-views; and the 10-K exhaustion is a
174-row-board construct (real Sleeper holds ~32 Ks; a stranded K is a waiver add, not a season
of zeros). What survives for the real world is D-C's code-level truth.

**F-2 — Dead-QB bench stacking. QUALIFIED → D-B above.** Premise code-true, histograms
reproduce from seeds, traces confirm every surplus QB was a zero-delta board-order fallback
pick, and the SHIPPING engine prints the same queue-tops (`Jayden Daniels QB5 · Δ +0.0,
bench` as row 1). **Corrections:** my "ADP is 12-team-priced" was wrong — the cache is labeled
teams:8 and the repo's own measurement says the teams parameter is cosmetic and the pool is
BLENDED; the deferral is real regardless (QB displacement +6.35 mean, +11.75 for the top 12)
but TE is deferred MORE (+10.30) — **QBs pile because market deferral COMPOUNDS with zero
flex-eligibility**, not deferral alone. "Perpetually QBs" overstated: QBs are 57.5% of
fallback picks in ADP rooms, 35% in room-facts rooms. And this room takes QBs ~7 picks EARLIER
than ADP (6/7 measured drafts), which thins the pile to the 2-4 range on draft night.

**N — The nulls, attacked and mostly held.** Sensors proven able to fire (mutant controls +
independent unit probes); 56 rooms re-run by seed with an independent slot-arithmetic oracle —
all match. What held: every real-room-shaped scenario (ADP/need/facts σ4-12, sniper,
run-storms, chaos σ14, all 8 seats) filled every mandated slot **while attended**; zero
on-policy slack violations (vacuous by theorem — the verifier correctly refused to count it as
evidence); zero crashes. What did NOT hold: the unattended-drain null (D-A — fallback-rented),
and the headline "2,200 rooms" phrasing (340 of them DID strand, all in 6-hoarder rooms —
counts, not clauses, from now on).

## Chamber defects found by the verification (instrument backlog)

- ✅ **`c[:4]` display trap** — fixed same-day; details now show the LAST chances and the count.
- **`make_seats` cycling deception:** `["hoarder","hoarder","hoarder","adp"]` reads as 3
  hoarders and seats SIX. Round-1's scenario label in the reports is wrong in exactly this
  way. Fix: exact 7-name lists everywhere, or a count syntax.
- **`bot_room_facts` omits the QB-early fact its own docstring names** — the one measured
  behavior (first QB ~7 picks before ADP, 6/7 drafts) that would have thinned F-2's pile is
  not implemented in any archetype. The probes therefore overstate QB availability.
- **The sniper is misaimed in drain rooms** — it snipes the attended policy's hypothetical
  pick, not the armed queue's actual next serve.
- **H3's ladder-side plants (squeeze-disarm, cliff-EMPTY-suppress, needs/must_fill twin) are
  unimplemented** — the battery runs the fast path, which never exercises ladder parsing, so
  those sensors exist only in the catalog. Honest status: the chamber tests the POLICY
  thoroughly and the advisory PARSERS not at all.

## What Campaign 1 cost and what it bought

~4,900 rooms total (batteries + sweeps + verifier re-runs + fallback counterfactuals), three
agent fleets (6 + 3 verifiers, ~870k agent tokens), one day. Bought: two verified policy
findings with priced counterfactuals, one rented-assumption exposure that upgrades draft-day
prep (D-A), a proven simulator licensed for Campaigns 2 and 3, and five instrument defects
found before they could lie to us twice. The strongest pattern of the day: **every wrong
number in this campaign was caught by someone whose job was to refute it** — including two of
mine.
