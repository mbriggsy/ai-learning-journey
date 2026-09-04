# Draft state alerts

Written by `scripts/watch_draft_state.py`. Append-only — newest at the bottom.
Every entry carries the moment it fired, so reading this late still tells you
*when* something happened.

---

## LEAGUE ROSTER CHANGED — 2026-08-10 03:35:01

6 -> 7 of 8 seats filled
joined: kblizzy23

_cargo was 6 min old when this ran_

---

## LEAGUE ROSTER CHANGED — 2026-08-12 21:35:02

7 -> 8 of 8 seats filled
joined: Cltchiefs
The room is FULL. A date usually follows.

_cargo was 6 min old when this ran_

---

## CARGO IS STALE — THIS WATCHER IS BLIND — 2026-08-15 17:26:11

- last mule run was 297 minutes ago.
- sleeper_draft.json on disk was last written 297 minutes ago.
- sleeper_users.json on disk was last written 297 minutes ago.
The mule runs hourly; anything past 150 minutes means it missed at least two runs.
Until it is fixed, 'no change' below means 'no new data', NOT 'nothing happened'.
Re-run scripts/install-mule.ps1 — it re-derives every path from its own location.

_cargo was 297 min old when this ran_

---

## CARGO IS STALE — THIS WATCHER IS BLIND — 2026-08-21 10:50:40

- last mule run was 922 minutes ago.
- sleeper_draft.json on disk was last written 922 minutes ago.
- sleeper_users.json on disk was last written 922 minutes ago.
The mule runs hourly; anything past 150 minutes means it missed at least two runs.
Until it is fixed, 'no change' below means 'no new data', NOT 'nothing happened'.
Re-run scripts/install-mule.ps1 — it re-derives every path from its own location.

_cargo was 922 min old when this ran_

---

## STARTING GUN — 2026-08-31 10:35:02

The draft date EXISTS: Sun 06 Sep 2026, 06:45 PM.
The board's ORDERING expires -- check meta.rankings.synthesized (NOT meta.updated, which is input freshness and does not move when the consensus does). Rebuild it from the repo root:
  python scripts/rerank.py            # dry run; then --write
  python scripts/build_board.py --rankings-synthesized <scrape date>
build_board.py ALONE CANNOT MOVE A RANK.

_cargo was 6 min old when this ran_

---

## T-7 DAYS TO THE DRAFT — 2026-08-31 10:35:02

The draft is 6 days, 8 hours away -- Sun 06 Sep 2026, 06:45 PM.
The board's ORDERING expires; check meta.rankings.synthesized (NOT meta.updated, which is input freshness and does not move when the consensus does). A week out is the last unhurried moment to rebuild it. From the REPO ROOT:
  python scripts/rerank.py            # dry run; then --write
  python scripts/build_board.py --rankings-synthesized <scrape date>
build_board.py ALONE CANNOT MOVE A RANK.

_cargo was 6 min old when this ran_

---

## YOUR SLOT EXISTS — 2026-09-03 22:35:01

draft_order["1390750540631150592"] = 6.
Read it from that and nothing else -- slot_to_roster_id is an identity map and will hand you a plausible wrong answer.
Run the engine from the REPO ROOT: python scripts/run_engine.py 6
Naming the seat is deliberate -- run_engine re-derives it from draft_order and REFUSES on a disagreement, so this is two independent readings having to agree rather than one being trusted.

_cargo was 6 min old when this ran_
