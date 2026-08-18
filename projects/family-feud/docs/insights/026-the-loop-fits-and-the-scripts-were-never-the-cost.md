# 026 — The loop fits in 120s, and the scripts were never the cost

**Measured 2026-08-15** on live mock `1394479498451251200` (8-team PPR snake, 15 rounds,
`pick_timer: 120`, seat 5 confirmed by `draft_order["1390750540631150592"] = 5`), by a session that
did **not** write `.claude/skills/sleeper-draft-room/`.

## The claim this replaces

The repo asserted, in `TODO.md` and the runbook, and never re-measured after the one incident:

> *"a live run proved the human-in-terminal loop is too slow: the 4.3 clock expired while the
> engine was being run in Bash"*

**That generalisation is false.** Seven picks were fired on a live 120-second clock. The worst
case used **61 of 120 seconds**; the typical case used **24-28**. Nothing came close to expiring.

## The measurement — clock remaining at the instant of fire, read from Sleeper's own `.timer-text`

| pick | protocol | clock at fire | used | scripts | latency | latency share |
|---|---|---|---|---|---|---|
| #5  | merge · engine · ladder as 3 separate calls | `00:59` | **61s** | 1.16s | 59.8s | 98.1% |
| #12 | engine+ladder chained | `01:15` | **45s** | 0.88s | 44.1s | 98.0% |
| #21 | engine+ladder chained | `01:36` | **24s** | 0.88s | 23.1s | 96.3% |
| #28 | merge · engine · ladder as 3 separate calls | `01:32` | **28s** | 1.10s | 26.9s | 96.1% |
| #37 | engine+ladder chained | `01:32` | **28s** | 0.58s | 27.4s | 97.9% |
| #44 | engine+ladder chained | `01:32` | **28s** | ~0.5s | ~27s | ~98% |
| #53 | chained + queue re-arm in the same trip | `01:36` | **24s** | 0.46s | 23.5s | 98.1% |

**23 script invocations across the whole rehearsal totalled 5.28 seconds — mean 0.230s.**
`run_engine.py` never exceeded **0.18s**. `precompute_ladder.py` never exceeded **0.25s**.
`merge_picks.py` never exceeded **0.27s**. The `ffDraft` click itself: **0.21-0.22s** typical.

🚨 **96-98% of every on-clock second was round-trip and agent latency, not computation.**
Optimising the Python would buy nothing. **The only lever that matters is the NUMBER OF ROUND
TRIPS and the SIZE OF THE OUTPUT read between them.**

## Where the 61 seconds actually went (pick #5, the worst case)

```
t+ 0.00s  our clock starts (pick #4 lands)
t+23.56s  merge_picks starts   <- 23.6s gap: reading the START DRAFT result
t+32.12s  run_engine starts    <-  8.3s gap
t+51.62s  precompute starts    <- 19.3s gap: reading 32 lines of engine output
t+61.00s  FIRE                 <-  9.1s gap
```

The 19.3-second gap is the actionable one: it was spent **reading a long engine dump**. On pick
#28 the identical three-separate-call protocol took **28s instead of 61s** for one reason — the
output was grepped down to 5 lines. **Piping the engine through `grep -A5 "BEST AVAILABLE"` is
worth more than every micro-optimisation available in the Python.**

## Two things the feed makes free, and neither was written down

1. **While you are on the clock, the feed CANNOT change** — nobody else can pick. So a
   `merge_picks` run made while on the clock is provably a no-op. The re-sync belongs *before*
   your window, not inside it.
2. **The confirm-merge IS the next cycle's sync.** `merge_picks` run to confirm pick N leaves
   `picks.json` current for pick N+1. Running it twice is pure round-trip cost.

## The off-clock window is the real constraint, and it is the one nobody measured

In an **all-CPU room the bots pick every ~2.8s**, so our off-clock window between picks was only
**~19-25 seconds** — and on one cycle a single round trip consumed all of it: pick #37 was fired,
and by the time the confirm returned the feed already read 43, meaning **#44 was live before the
off-clock precompute finished**. The on-clock budget is comfortable; **the between-picks budget in
a fast room is not.** The real draft has humans and will be slower, but the runbook's *FAST room*
mode is exactly this situation and its pacing advice is now measured rather than estimated.

## Positive control: a blown clock really does degrade to our board, and `picked_by` really does lie

Pick **#60 was deliberately not fired.** Outcome, straight from `/picks`:

```
PICK #60 -> DJ Moore (WR) | draft_slot=5 | picked_by=1390750540631150592
```

- **DJ Moore was our queue-top.** Auto-pick drained OUR ladder, not Sleeper's ADP board. The
  queue safety net is confirmed working under a genuinely blown clock, not simulated.
- 🚨 **`picked_by` stamped OUR user id for a pick we provably did not make.** The TODO carried
  this as a warning; it is now a measurement. **Under a running clock the only trustworthy oracle
  is the pick COUNT and the player identity — never `picked_by`.**
- Auto-draft then took the rest (#69, #76 …), reproducing the known "miss one clock and Sleeper
  drafts the remainder" behaviour.

## The queue drains silently, and nothing in the loop re-arms it

Six names were pre-armed before the draft. By roughly pick #21 the queue was **empty** — its
players had all been drafted — and **picks #28, #37 and #44 were fired with no safety net at all.**
Nothing in Step 3 re-arms it; `precompute_ladder.py` *prints* the order but never loads it.

⚠️ **And an empty queue does not read as a problem.** `ffQueueList()` returns
`{count: null, entries: [], agrees: true}` — `agrees` is `true` only because `q.length === 0`
short-circuits the check, and `count` is `null` because Sleeper renders no `QUEUE (n)` text at
zero. **The unsafe state and the healthy state print the same reassuring word.**

> ✅ **FIXED 2026-08-17 — this paragraph describes the OLD contract and is kept as the record of
> what was measured here.** `ffQueueList()` now returns `empty: true` plus a `note` naming
> `ffQueueSync`, and `agrees` is only the label-vs-panel cross-check (`null` when there is no
> label). Measuring it first also found a **second** state the same short-circuit was masking: a
> **blind panel** — tab label says `QUEUE (3)`, panel renders zero rows — also returned
> `agrees: true`, and that one is worse because it produces a wrong *action*. `empty` therefore
> keys off Sleeper's own words, never off `entries.length`.

⚠️ **`ffQueue`'s +1 verification is not robust to concurrent removals.** Re-arming four names
returned `queued: true` for three; the queue ended holding **two**. Jayden Daniels reported
`queued: true, count: 1` and was not in the final queue — a bot drafted him mid-loop and Sleeper
removed him, so an unrelated add saw a `+1` transition and was credited. **Only the trailing
`ffQueueList()` is trustworthy.** Re-arming 4 names cost **5.1s** in one round trip.

## What to do on draft day

1. **Do the merge/engine/ladder work in ONE chained shell call**, not three. Measured saving: ~16s.
2. **Grep the engine output.** `grep -A5 "BEST AVAILABLE"` — reading the full dump cost 19s once.
3. **Re-arm the queue every cycle**, and verify with `ffQueueList()` — never the per-call
   `queued: true`. Budget ~1.5-2s per name.
4. **Do not re-merge while on the clock.** The feed cannot move.
5. Against a **mock**, `run_engine.py` and `precompute_ladder.py` bare are **wrong** — they read
   the real league's draft object (16 rounds) and arm the contamination gate with the real
   draft id. Required form: `--rounds 15 --draft-id <mock_id>` and the seat positionally.

## Related

[`020`](020-the-cdn-served-a-contiguous-prefix-and-every-gate-passed.md) (why every read needs a
unique nonce) · [`025`](025-the-click-reported-success-and-drafted-nobody.md) (the click that
drafted nobody — the fix is now live-proven seven more times, `handlerRan: true` and
`btnHandlers: ["onClick"]` on every fire) · `.claude/skills/sleeper-draft-room/SKILL.md`.
