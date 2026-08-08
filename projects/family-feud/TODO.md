# Family Feud — TODO

> **Actionable next-actions only.** No session history — `git log` has that.
> Re-ranked every session, so never cite "item N" anywhere; cite the title.

## ▶ WHERE WE ARE — read this first, update it when it changes

```
plan ✅ → deepen ✅ → work ✅ (U6) → ultramode ✅ → work  ◀ YOU ARE HERE ({ U7 ∥ U15 })
```

**Units shipped:** U1, U2 (Phase 0 gates) · **U9** (draft-state watcher) · **U3** (one normalizer,
proven equal in two runtimes) · **U14** (`sleeperId` frozen — 174 ids, 0 unresolved) ·
**U4** (board schema gate, born red on 13 real findings) · **U5** (scoring as code + the empirical
curve; oracle exact at 2469/2469) · **U6** (the generator — one source, every surface) — the last
three on 2026-08-08.

**Next action: `{ U7 ∥ U15 }`** — the live board poll loop and the engine shape wrapper. Both
depend on U6, which is done and reviewed.

**The ultramode review RAN 2026-08-08** (13 reviewers, 4-angle adversary panel, 3 refuters per
finding, `real`/`material` aggregated separately). 77 confirmed after verification, 22 correctly
rejected. Everything that could produce a wrong answer is fixed and committed; the residue is
listed below and is advisory, not blocking.

**The planning phase is CLOSED.** The plan was deepened 2026-08-07 and does not get another pass.
If something in it turns out to be wrong, fix it inside `/ce-work` — do not reopen a deepening
cycle. **Three plan facts were already falsified in flight and fixed in code, not by re-planning**
(see `docs/insights/011` and `012`): the hand-typed 32-team table (the pinned dump already had it),
the Latin-1 glyph assertion (wrong codec — it rejects `†` and every em-dash), and the forecast PDF
crash (reportlab does not raise; it silently substitutes ZapfDingbats). A closed plan's *decisions*
bind; its *facts* expire.

**State: the spine exists.** One command regenerates every surface, refuses to emit unless the gate
passes on the STAGED set, and restores from `.last_good/` if a replace fails mid-set. The board
gate went **13 findings → 0** by fixing surfaces. **327 tests**, 0 skips on this machine
(`python -m unittest discover -s tests` from the root); on a clean clone it is 327 with **1 skip**,
the live-cargo environment probe. Verified by eye, not only by tests: the cheat sheet is **2 pages
— the whole 174-row board on page 1**, the plan on page 2 — and the HTML board renders shape-driven
round labels with no invented rounds.

**Everything below is detailed in**
[`docs/plans/2026-08-07-001-refactor-rebuild-the-machinery-plan.md`](docs/plans/2026-08-07-001-refactor-rebuild-the-machinery-plan.md).
The plan owns *what to build*; this file owns *what's next*.

**⏳ The draft date STILL does not exist.** Re-pulled from cargo stamped **2026-08-08 14:29**:
`status: pre_draft`, `start_time: null`, `draft_order: null`, **6 of 8 seats filled**, and the
watcher has raised no alert. `~Aug 29` is a handshake — **it can move earlier.** Assume no slack.
The board's header now says "Draft date not set" rather than asserting a date the draft object
does not carry.

---

## 0.5 Review residue — ranked, advisory, none of it blocks U7/U15

From the 2026-08-08 ultramode pass. Everything that could produce a **wrong answer** is already
fixed (commits `5e7ae390`, `76849ad9`, `fdf190eb`, `13c3ed3b`). What follows is real but bounded.

1. ~~**A clean clone cannot run ~20 tests.**~~ ✅ **FIXED 2026-08-08.** The suite read gitignored,
   hourly-churning mule cargo through `read_shape()`. `build()` now takes `cargo=`/`league_cargo=`
   and the tests pass committed fixtures (`tests/fixtures/sleeper_draft.json`,
   `sleeper_league.json`). **Measured both ways:** with the cargo hidden the suite went from
   **22 errors + 2 failures** to **327 OK, 1 skip** — the skip being an explicit environment probe.
2. **`meta.format` is a hand-typed duplicate of `meta.shape` (KTD-1).** The gate cross-checks only
   `teams` and `rounds` of the ~8 facts they share — and the ROSTER half is what the PDF header
   prints. Fix: derive `meta.format` from `meta.shape` in `enrich()`.
3. **Nothing ever re-checks `meta.shape` against the draft object it names.** A board built from a
   dead or superseded draft passes `--verify-only` forever. Fix: a gate check comparing
   `meta.shape.draft_id` + values against the hauled cargo, with the cargo's age reported.
4. **`strategy` prose still hardcodes both baselines and league shape**, inside the source
   (KTD-1 + KTD-7). `rules[10]` embeds `QB12/RB41/WR47/TE12`; `slotNotes` embed `Picks 1-3` etc.
   The old-value sweep cannot see them because they are not a quantity it tracks.
5. **The PDF prints a VBD arrow on every K and DEF row; the HTML deliberately suppresses it.**
   All 24 have |vbdDelta| >= 8 so all 24 draw a green ▲, which is noise on the one page you hold.
6. **`_draw_strategy`'s `block()` silently truncates** prose that runs past the page floor —
   returns early and drops content with no warning. Today nothing overflows; a longer rule would.
7. **`old_value_sweep` goes blind when a headline row changes identity.** It sweeps the CURRENT
   top RB/WR/QB, so if the top RB changes, the previous leader's value is never swept — the
   refresh that most needs it is the one it cannot see.
8. **Badge glyphs are checked for encodability, not uniqueness** — two badges can print the same
   mark and the legend becomes ambiguous.
9. **`check_strategy`'s name/team prose check keys on the last whitespace token**, so it silently
   does nothing for suffixed players (`Marvin Harrison Jr.`) — insight 008's shape.
10. **Dead constants in `render_pdf.py`** (`ROW_GAP`, `TIER_LEAD/AFTER`, `SECTION_LEAD`) survive
    the adaptive-density rewrite and duplicate `DENSITY[0]`; tuning them does nothing.

**Escalated on a materiality split, for a human call:** the row-level `sleeperId` U6 stamps has
**no reader yet** — the engine still joins through `sleeper_ids.json`. Real, and deliberate for
now (U6 put the key on the board; pointing the engine at it is a separate change with its own
replay verification). Worth doing in U15's neighbourhood.

---

## 0. Start with `/brief`

Fourteen insight docs now exist. Each has a documented wrong answer that looks right. Read them
before designing, not after debugging.

**The two from the ultramode review are the ones to read before writing any new guard:**
- **[`013`](docs/insights/013-every-guard-was-tested-and-not-one-was-proven-connected.md)** — six
  guards in U6 had tests for the guard FUNCTION and none for its CALL SITE. Stubbing `gate_staged`
  to `[]` left 315/315 green, so nothing proved the gate was wired to the emit at all. Delete a
  guard's call site: if nothing goes red, the guard is decoration. And a new test is a hypothesis
  until it has failed once on purpose.
- **[`014`](docs/insights/014-the-gate-crashed-while-reporting-the-drift-it-exists-to-catch.md)** —
  the gate died with `UnicodeEncodeError` while PRINTING the drift it had correctly found. The
  error path is the least-tested code and the only code that ever meets the worst data.

**The two written during U6 constrain U6 itself** — both are corrections to the closed plan, proven
by measurement, and both are already reflected in the build:
- **[`011`](docs/insights/011-the-renderer-did-not-crash-it-printed-a-different-symbol.md)** —
  reportlab does **not** raise on a glyph Helvetica cannot encode; it silently substitutes
  ZapfDingbats and prints a different symbol. The plan's `try/except` framing has no exception to
  catch, and its prescribed **Latin-1** test is the wrong encoding (it rejects `†` and all 34
  em-dashes). The guard is a **pre-emit cp1252 assertion**.
- **[`012`](docs/insights/012-the-closed-plans-remedy-would-have-reintroduced-the-plans-own-disease.md)** —
  the plan's hand-typed 32-entry team table would have created a fresh hand-maintained duplicate,
  the exact class KTD-1 kills. `dst` is a pure projection of the DEF rows; the pinned dump supplies
  an identity check instead. A closed plan's *decisions* bind; its *facts* expire.

Also load-bearing:
[`004`](docs/insights/004-name-similarity-could-not-separate-the-two-populations-at-any-threshold.md),
[`006`](docs/insights/006-four-verification-steps-that-could-silently-do-nothing.md),
[`007`](docs/insights/007-presence-is-not-health-the-third-instance-of-one-pattern.md),
[`008`](docs/insights/008-a-broken-instrument-returns-zero-and-zero-reads-like-a-finding.md) —
**positive-control any PDF extractor before trusting a row count; a zlib-only read of this
ASCII85-then-Flate PDF returns zero text, which reads as "empty PDF" not "broken reader"** — and
[`010`](docs/insights/010-exactly-one-candidate-was-treated-as-proof-of-identity.md), whose lesson
(a lone survivor of a pool narrowed by attributes the wrong answer shares is not identified) is
what 012's DEF identity check applies.

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
  lab feed at prefixes 1, 2, **3**, 4, **5**, ... — the reproduced `vbdDelta` break fires at a
  SINGLE-DIGIT prefix, so deciles of a 120-pick feed, the first of which is 12, would have missed
  it. It was 3 on the Aug 5 board and is 5 since U6 recomputed VORP and the VBD ranks moved; the
  test pins the property, not the number). **BORN RED with 13 findings, all real drift** — all
  thirteen fixed by U6; the gate is green today
  (re-measured 2026-08-08; `--fast` and `--full` both exit 1): `meta.updated` claims Aug 5 while its
  inputs are dated Aug 7-8 (**4** — U5's `vorp_curve.json` became a fourth stale-input witness the
  moment it shipped) · eight `meta.vbd` numbers hardcoded as literals in the board HTML's prose (8) ·
  the cheat sheet holds 150 of 174 rows, missing every K and DEF (1).
  **Fix the surface, never the gate.** U6 regenerates them.
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
- ~~**U6 generator**~~ ✅ **SHIPPED 2026-08-08.** `scripts/build_board.py` + `render_html.py` +
  `render_pdf.py` + `scripts/templates/board.html`, 41 tests. **The gate went 13 → 0.**
  - `python scripts/build_board.py` refreshes every surface · `--verify-only` is the draft-morning
    "is my board sane?" command (gate + a sha256 per surface from `draft-kit/build_manifest.json`,
    the only detector that covers the PDF) · `--allow-dirty` stamps `meta.build.dirty`.
  - **Write-all-or-write-none, proven by injected crash**, both paths: a raise during staging
    leaves the surfaces untouched; a raise *between* replaces restores from `.last_good/`.
    Mutation-tested — deleting the restore turns the test red.
  - **Byte-stable**: two rebuilds on a clean tree leave `git status draft-kit/` empty. This needed
    two real fixes — reportlab stamps wall-clock time into the PDF trailer (`invariant=1`), and
    `meta.build`/the manifest carry provenance forward when nothing else moved.
  - **The rows now carry `sleeperId`** — consumers no longer join through the ledger. Also
    `vorpMethod` per row, `meta.shape` from the live draft object, and
    `meta.badges[code].glyph`, which killed the engine's fourth glyph table.
  - **VORP is CARRIED, not recomputed** — deliberate, per KTD-6. See the note below.
- **U15 engine wrapper** (NEW) — KTD-8's missing owner. Reads shape from the draft object; hard-refuses
  non-snake drafts. **Note:** U6 already stamps `meta.shape` (teams/rounds/starters/flex/bench/ir/
  playoff_teams/draft_id) and already refuses non-snake and `reversal_round != 0` at BUILD time —
  U15 is the same discipline at RUN time, and `read_shape()` in `build_board.py` is the pattern.

**Board today:** 174 players + 8 derived `dst`, `meta.updated: 2026-08-08`, **every row carrying
`sleeperId` and `vorpMethod`**, `meta.shape` stamped from draft `1390509994847240192`. Never edit
any surface by hand — `build_manifest.json`'s sha256 will catch it, and `--verify-only` names the
file. To change the board, edit `players_data.json`'s judgment fields and re-run the generator.

---

### ✅ DECIDED 2026-08-08 — VORP is RECOMPUTED from the curve, not carried

**Briggsy's call: "whatever is the more correct approach."** The deciding argument was not
accuracy, it was that carrying was a dead end:

- The Aug 5 values came from the **Cowork-era pipeline, which no longer exists**. They could not
  be verified, audited, or regenerated — the only figures on the board the generator did not
  generate, in a unit whose entire thesis is that every surface is generated.
- They **could not survive a refresh.** The gate requires `{vorp, vbdRank, vbdDelta}`
  all-present-or-all-absent board-wide, so adding one player left a row with no vorp and no way
  to compute one. The plan's load-bearing requirement is repeated interactive refresh.

**What moved:** VBD #1 changed hands — **Gibbs 268.4 → 254.4, Chase 242.7 → 256.1.**
**Within a position nothing reordered** (verified: 0 order violations across all 150 skill rows).
The curve is a rank→points lookup with `pr` as its input, so vorp is monotone in `pr` by
construction; what moved is the **cross-positional** comparison, which is the only thing VORP is
for. RB1 is still RB1.

**Seasons: 2021-2024, and that is the newest window that exists with exact scoring** — verified
2026-08-08, `player_stats_2025.csv` and `stats_player_week_2025.csv` both **404**. 2025 exists only
as play-by-play (`play_by_play_2025.csv.gz`, HTTP 200), which needs nflverse's stat builder
reimplemented and misattributes TDs on ~5% of player-seasons. A narrower EXACT basis beats a wider
approximate one; revisit 2025 as its own measured unit.

**K and DEF still carry flat per-tier constants** (`carried:kdef-tier-flat`) — `build_curves.py`
builds QB/RB/WR/TE only, so KTD-6's "K and DEF keep the historical curve" is not satisfiable from
the shipped curve. Labelled rather than invented. **This is the next real accuracy gap.**

~~**Blocking prerequisite:** no lab-feed fixture exists**~~ ✅ **RESOLVED** — `tests/fixtures/lab_feed_120.json`
is committed and verified: 120 picks, `pick_no` contiguous 1→120, every pick carrying `player_id`,
all from draft `1390923383440424960`. "Replay the lab feed" now has something to replay.

~~**Install now, not in draft week:** `jinja2` and `reportlab` are both absent.~~ ✅ **RESOLVED** —
verified 2026-08-08 on Python 3.14.3: `jinja2`, `reportlab` and `defusedxml` all import. U6's PDF
and template paths have their dependencies.

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

## Landmines

Full set in [`CLAUDE.md`](CLAUDE.md); [`docs/insights/`](docs/insights/) has the fourteen worked cases.
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
