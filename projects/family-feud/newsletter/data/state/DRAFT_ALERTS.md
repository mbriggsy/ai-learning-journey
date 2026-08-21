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
