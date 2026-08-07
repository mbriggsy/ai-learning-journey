# Family Feud — TODO

> **Actionable next-actions only.** No session history — `git log` has that.
> Re-ranked every session, so never cite "item N" anywhere; cite the title.

**Where we are:** the machinery rebuild is planned and Phase 0 is shipped. The two silent paths to
advising an already-drafted player are closed and covered by **46 tests** (`python -m unittest
discover -s tests`). What remains is the spine: one source that generates every surface, and
consumers for a hauler that currently hauls into a void.

**Everything below is detailed in**
[`docs/plans/2026-08-07-001-refactor-rebuild-the-machinery-plan.md`](docs/plans/2026-08-07-001-refactor-rebuild-the-machinery-plan.md).
The plan owns *what to build*; this file owns *what's next*.

**⏳ The draft date does not exist.** `start_time` is `null` and Sleeper's UI reads "Draft time has
not yet set" (verified Aug 7, two sources). `~Aug 29` is a handshake — **it can move earlier.**
Assume no slack.

---

## 0. Start with `/brief`

Seven insight docs now exist and four landed on 2026-08-07. Three of them
([`004`](docs/insights/004-name-similarity-could-not-separate-the-two-populations-at-any-threshold.md),
[`006`](docs/insights/006-four-verification-steps-that-could-silently-do-nothing.md),
[`007`](docs/insights/007-presence-is-not-health-the-third-instance-of-one-pattern.md)) directly
constrain how the next three units get built — the normalizer, the schema gate, and the mule's
health check each have a documented wrong answer that looks right. Read them before designing, not
after debugging.

---

## 1. Deepen the plan before building any of it

`ce:plan` wrote the plan but its confidence-check-and-deepen phase never ran. Standing rule is
*deepen all plans before executing*; Phase 0 was a deliberate exception for P0 safety and does not
extend to Phase 1.

**Do:** `/ce-plan` on the existing plan path → it short-circuits to the deepening pass.

---

## 2. Phase 1 — the spine (U3 → U4 → U5 → U6, in that order)

- **U3 shared normalizer** — one spec + golden vectors feeding Python, the JS board, and the gate.
  Three copies of `norm()` are otherwise coming.
- **U4 schema gate** — must validate **all 174 rows**, not a top-N sample. Both known break modes
  are latent: a float `vbdDelta` passes an empty-picks smoke run and dies three picks in.
- **U5 VORP pipeline** — proven end to end already: nflverse `stats_player_week_{2022..2025}.csv`,
  ~8.3 MB/season, stdlib `csv` only. Scoring validated **1997/1997 exact** against nflverse's own
  `fantasy_points_ppr` (offensive fumbles only — `fumbles_lost_total` includes special teams).
- **U6 the generator** — one command emits all four surfaces or emits nothing.

**Board today:** 174 players + 8 dst, `meta.updated: 2026-08-05`.

---

## 3. Draft-morning checklist (cannot be closed early, by definition)

Re-pull and confirm — **never quote these from a doc**:

- `/league/1390509993844809728/users` — 4 of 8 seats filled as of Aug 7
- `/draft/1390509994847240192` — **`draft_order` is `null`.** Read your slot from
  `draft_order["1390750540631150592"]` and **nothing else**
- `/league/.../rosters` — proves which roster_id is whose (Briggsy = roster 3)
- `/draft/.../traded_picks` — `[]` on Aug 7

Then run the engine **with the draft_id as arg 4** so the contamination gate is armed:
`python draft_engine.py <slot> 8 16 1390509994847240192`

---

## 4. Delete the empty husk

`C:\Users\brigg\ai-learning-journey\projects\family feud` (with the space) is empty and left over
from the Aug 7 rename. **Blocked:** the permission classifier refused both `rm -rf` and
`Remove-Item` on 2026-08-07. Needs a settings rule or a manual go-ahead.

```powershell
Remove-Item -LiteralPath "C:\Users\brigg\ai-learning-journey\projects\family feud" -Force
```

---

## Landmines

Full set in [`CLAUDE.md`](CLAUDE.md); [`docs/insights/`](docs/insights/) has the seven worked cases.
The four that bite hardest under time pressure:

- **A screaming engine means STOP.** Re-fetch, re-merge, rerun. Never advise off a `picks.json` it
  refused.
- **A silent engine can also be wrong.** `picks.json` is gitignored, so a spent mock's picks are
  invisible to `git status`. Both `merge_picks.py` and the engine now refuse them — but only the
  engine's check fires if you skip the merge, and only when you pass the draft_id.
- **Presence is not health.** `Last Result: 0`, `NumberOfMissedRuns`, and the mule's `10/10 ok` are
  all untrustworthy. Only the cargo timestamp in `mule_status.json` proves life.
  ([`007`](docs/insights/007-presence-is-not-health-the-third-instance-of-one-pattern.md))
- **`rss_nbc_edge` is not RSS.** 813 KB of HTML, zero `<item>` elements, reported `ok` because
  `Fetch-Source` only checks `size > 50`. The wire has 4 working feeds, not 5. (U10)
