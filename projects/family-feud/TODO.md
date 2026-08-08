# Family Feud — TODO

> **Actionable next-actions only.** No session history — `git log` has that.
> Re-ranked every session, so never cite "item N" anywhere; cite the title.

## ▶ WHERE WE ARE — read this first, update it when it changes

```
plan  ✅ → deepen  ✅ → work  ◀ YOU ARE HERE → ultramode ⬜ (at the Phase 1 boundary, after U6)
```

**Units shipped:** U1, U2 (Phase 0 gates) · **U9** (draft-state watcher) · **U3** (one normalizer,
proven equal in two runtimes) · **U14** (`sleeperId` frozen — 174 ids, 0 unresolved) ·
**U4** (board schema gate, born red on 12 real findings) · **U5** (scoring as code + the empirical
curve; oracle exact at 2469/2469) — the last two on 2026-08-08.

**Next action: **U6, the generator** —
[`docs/plans/2026-08-07-001-refactor-rebuild-the-machinery-plan.md`](docs/plans/2026-08-07-001-refactor-rebuild-the-machinery-plan.md)
(§ U6). It is the unit that FIXES what U4 currently reports: regenerate `players_data.json`, the
HTML and the PDF from one source, stamp the frozen ids onto the rows, render `meta.vbd`'s numbers
from data instead of literals, and put all 174 rows in the cheat sheet instead of 150.
**Write-all-or-write-none** — stage every surface, run the gate, and emit only on pass; the plan
forecasts its own crash (a badge glyph Helvetica cannot encode kills the PDF *after* the HTML is
written, leaving new HTML + old PDF + a green gate + a non-zero exit nobody reads).**

**The planning phase is CLOSED.** The plan was deepened 2026-08-07 and does not get another pass.
If something in it turns out to be wrong, fix it inside `/ce-work` — do not reopen a deepening
cycle. Reopening is how this project loses its thread: analysis that spawns analysis has no
stopping condition, and the plan still outweighs the code (**13 commits, 5 of which changed code;
15 units planned, 3 built**).

**Ultramode fires once, after U6** — one review of a working spine, not six reviews of fragments.

**State:** both silent paths to advising an already-drafted player are closed, the hauler has its
first consumer, and the board now joins to Sleeper on a frozen id instead of a name. **274 tests**,
zero skips (`python -m unittest discover -s tests` from the root). What remains is the spine: one
source that generates every surface.

**Everything below is detailed in**
[`docs/plans/2026-08-07-001-refactor-rebuild-the-machinery-plan.md`](docs/plans/2026-08-07-001-refactor-rebuild-the-machinery-plan.md).
The plan owns *what to build*; this file owns *what's next*.

**⏳ The draft date does not exist.** `start_time` is `null` and Sleeper's UI reads "Draft time has
not yet set" (verified Aug 7, two sources). `~Aug 29` is a handshake — **it can move earlier.**
Assume no slack.

---

## 0. Start with `/brief`

Ten insight docs now exist. Four of them directly constrain how the next units get built — each
has a documented wrong answer that looks right:
[`004`](docs/insights/004-name-similarity-could-not-separate-the-two-populations-at-any-threshold.md),
[`006`](docs/insights/006-four-verification-steps-that-could-silently-do-nothing.md),
[`007`](docs/insights/007-presence-is-not-health-the-third-instance-of-one-pattern.md), and
**[`010`](docs/insights/010-exactly-one-candidate-was-treated-as-proof-of-identity.md) — read this
one before U4.** A gate that asserts every row has a `sleeperId` without checking the id resolves
to *that player* is 010 with a schema on top, and "174 ids, 0 unresolved" is a survivor count, not
an identification. Read them before designing, not after debugging.

---

## 1. ~~Deepen the plan~~ ✅ DONE 2026-08-07

Full confidence-check-and-deepen pass ran. Plan carries `deepened: 2026-08-07`, grew 37K → 80K, and
now has **15 units** (U14 and U15 added — see below). **All four Open Questions are resolved**, two
by Briggsy's decision and two by measurement.

**Two decisions Briggsy made, now binding:**
- **Delete the dated snapshot.** Git is the archive. U4 drops its snapshot check; U6 asserts the
  filename class can't reappear.
- **Accuracy over effort on VORP.** Curve keeps replacement baselines + K/DEF; projections take
  skill-player values; `vorp` provenance recorded per row and gate-enforced.

---

## 2. Build order (corrected — this is NOT the old U3→U4→U5→U6)

```
U9  →  U3  →  U14  →  { U4 ∥ U5 }  →  U6  →  { U7 ∥ U15 }  →  U8  →  U10 → U11 → U12 → U13
```

- ~~**U9 draft-state watcher**~~ ✅ **SHIPPED 2026-08-07**, hardened 2026-08-08. Scheduled task
  *Family Feud Draft Watcher* runs hourly at :35, six minutes behind the mule. Writes to
  `newsletter/data/state/DRAFT_ALERTS.md` (gitignored). **Nothing to do here — but know it exists**,
  because it is what tells you the draft date appeared or moved. If it ever needs re-registering
  after a folder move: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\install-watcher.ps1`
  Four ways it could go deaf are now closed: a **lost baseline** (unreadable snapshot) alerted and
  exits 1 instead of silently re-baselining and eating the starting gun; a seat that **moves or
  vanishes** fires, not just one that appears; freshness is measured **per cargo file** (and against
  the mule's per-source result), not per run; and a **re-created draft** is caught by comparing
  `sleeper_league.json`'s `draft_id` against the pinned one the mule keeps hauling.
- ~~**U3 normalizer**~~ ✅ **SHIPPED 2026-08-07** (`522843cd`). `draft-kit/normalize.py` owns the
  rules as data; `norm_spec.json` and the board's JS are generated from it. **Never fork it.**
- ~~**U14 `sleeperId`**~~ ✅ **SHIPPED 2026-08-07** (`c6379d78` + hardening). 174 ids frozen, 0
  unresolved, ledger at `draft-kit/sleeper_ids.json`, dump pinned at `draft-kit/cache/`. Standing
  check: `python scripts/resolve_sleeper_ids.py --verify` — exit 0 means the join key still holds.
  **A lone shared-token match is never auto-accepted** — it is routinely a same-position teammate
  (six such pairs on this board), so it proposes and hard-stops for a human.
- ~~**U4 gate**~~ ✅ **SHIPPED 2026-08-08.** `scripts/validate_board.py`, 42 tests. `--fast`
  (static + cross-surface, offline, milliseconds) and `--full` (adds a real-engine replay of the
  lab feed at prefixes 1, 2, **3**, 4, ... — the reproduced `vbdDelta` break fires at exactly
  three picks, so deciles would have missed it). **BORN RED with 12 findings, all real drift:**
  `meta.updated` claims Aug 5 while its inputs are dated Aug 7-8 (3) · eight `meta.vbd` numbers
  hardcoded as literals in the board HTML's prose (8) · the cheat sheet holds 150 of 174 rows,
  missing every K and DEF (1). **Fix the surface, never the gate.** U6 regenerates them.
- ~~**U5 VORP**~~ ✅ **SHIPPED 2026-08-08.** `scripts/scoring.py` (league.md as ONE pure
  function) + `scripts/build_curves.py` → `draft-kit/vorp_curve.json`, 22 tests.
  **Oracle: 2469/2469 player-seasons reproduce nflverse's own PPR exactly**, so the
  machinery is proven against an outside reference; the fixture is a real committed season
  (324KB gz) so it survives a clean clone.
  **Two documented limits, both from the SOURCE, both with one known route out:** it does
  not reproduce the Aug 5 board (best 1.84 MAD, measured across every plausible config) and
  it excludes the 40+/50+ long-TD bonuses. `player_stats_*.csv` stops at 2024 and carries no
  TD distance; **`play_by_play_*.csv.gz` DOES publish 2025** (verified, 48,771 plays) and has
  per-play yardage. Prototyped and MEASURED, not assumed: PBP aggregation reproduces 554/607
  player-seasons exactly, 20 within 2 pts, 33 off by multiples of six (TD attribution —
  laterals, fumble-recovery TDs). Closing it means reimplementing nflverse's stat builder;
  shipping unquantified attribution error would be worse than shipping a narrower EXACT
  basis. **That is the next accuracy win if anyone wants it.**
- **U6 generator** — staged emit, `.last_good/`, `--verify-only`, one-refresh-one-commit.
- **U15 engine wrapper** (NEW) — KTD-8's missing owner. Reads shape from the draft object; hard-refuses
  non-snake drafts.

**Board today:** 174 players + 8 dst, `meta.updated: 2026-08-05`. **The ids are frozen in
`draft-kit/sleeper_ids.json`, NOT on the board rows** — every row still has no `sleeperId` field.
Stamping them onto the board is U6's job, as the generator's output. Until U6 runs, any consumer
must join through the ledger — **the engine now does** (2026-08-08), reading `sleeper_ids.json`
from cwd and matching live picks on `player_id` before falling back to the name.

~~**Blocking prerequisite:** no lab-feed fixture exists**~~ ✅ **RESOLVED** — `tests/fixtures/lab_feed_120.json`
is committed and verified: 120 picks, `pick_no` contiguous 1→120, every pick carrying `player_id`,
all from draft `1390923383440424960`. "Replay the lab feed" now has something to replay.

**Install now, not in draft week:** `jinja2` and `reportlab` are both absent. Both are pure-Python
`py3-none-any` wheels on 3.14.3, so it's a two-package install. `defusedxml` is already present.

---

## 3. Draft-morning checklist (cannot be closed early, by definition)

Re-pull and confirm — **never quote these from a doc**:

- `/league/1390509993844809728/users` — **6 of 8** seats filled as of Aug 7 19:32 (live pull and the
  mule's 19:29 cargo agree). Was 4 earlier the same day — **the room is filling**
- `/draft/1390509994847240192` — **`draft_order` is `null`.** Read your slot from
  `draft_order["1390750540631150592"]` and **nothing else**
- `/league/.../rosters` — proves which roster_id is whose (Briggsy = roster 3)
- `/draft/.../traded_picks` — `[]` on Aug 7

Then run the engine **with the draft_id as arg 4** so the contamination gate is armed:
`python draft_engine.py <slot> 8 16 1390509994847240192`

---

## 4. Delete the empty husk

`C:\Users\brigg\ai-learning-journey\projects\family feud` (with the space) is left over from the
Aug 7 rename. Not empty as previously recorded — it holds one 79-byte
`.claude/settings.local.json`, **byte-identical** to the live project's, so nothing is lost.

**Blocked:** the permission classifier refused `Remove-Item` *and* `rm -rf` again on 2026-08-07
(third refusal, two sessions). Needs a settings rule or Briggsy running the line below.

**`-Recurse` is required** — the folder is not empty (it holds `.claude\settings.local.json`), and
the previously recorded command omitted it, which fails on a directory with children:

```powershell
Remove-Item -LiteralPath "C:\Users\brigg\ai-learning-journey\projects\family feud" -Recurse -Force
```

---

## Landmines

Full set in [`CLAUDE.md`](CLAUDE.md); [`docs/insights/`](docs/insights/) has the ten worked cases.
The four that bite hardest under time pressure:

- **A screaming engine means STOP.** Re-fetch, re-merge, rerun. Never advise off a `picks.json` it
  refused.
- **A silent engine can also be wrong.** `picks.json` is gitignored, so a spent mock's picks are
  invisible to `git status`. Both `merge_picks.py` and the engine now refuse them — but only the
  engine's check fires if you skip the merge, and only when you pass the draft_id.
- **Presence is not health.** `Last Result: 0`, `NumberOfMissedRuns`, and the mule's `10/10 ok` are
  all untrustworthy. Only the cargo timestamp in `mule_status.json` proves life.
  ([`007`](docs/insights/007-presence-is-not-health-the-third-instance-of-one-pattern.md))
- **`rss_nbc_edge` is not RSS.** Re-measured 2026-08-07 at the mule's real URL: HTTP 200,
  **803,573 bytes, `Content-Type: text/html`, zero `<item>` elements** — it fails content-type,
  parse *and* item count while passing the only check `Fetch-Source` runs (`size > 50`). The wire
  has **4 working feeds, not 5** (yahoo 50 · cbs 36 · espn 23 · rotowire 5 = 114 items).
  Replacement decided and measured: **ProFootballTalk** (`https://profootballtalk.nbcsports.com/feed/`
  — 30 items, 9 naming board players). (U10)
