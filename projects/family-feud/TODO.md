# Family Feud — TODO

> **Actionable next-actions only.** No session history — `git log` has that.
> Re-ranked every session, so never cite "item N" anywhere; cite the title.

## ▶ WHERE WE ARE — read this first, update it when it changes

```
plan ✅ → deepen ✅ → work ✅ (U6) → ultramode ✅ → work ✅ (U15·U7·U8·U10·U11)  ◀ HERE (U12)
```

**Units shipped:** U1, U2 (Phase 0 gates) · **U9** (draft-state watcher) · **U3** (one normalizer,
proven equal in two runtimes) · **U14** (`sleeperId` frozen — 174 ids, 0 unresolved) ·
**U4** (board schema gate, born red on 13 real findings) · **U5** (scoring as code + the empirical
curve; oracle exact at 2469/2469) · **U6** (the generator — one source, every surface) ·
**U15** (the engine wrapper — shape read from the draft, not typed) · **U7** (the board polls the
live draft) · **U8** (the runbook's draft loop is executable again) · **U10** (the mule validates
what it caught) · **U11** (The Nightly Feud publishes) — the last eight on 2026-08-08.

**Phase 2 closed; U8, U10 and U11 done.** **Next action: U12** — schedule the newsletter. Edition #1
exists but only because a human typed the command; a nightly paper that needs a human is not a
nightly paper. Mirror `install-mule.ps1`: derive from `$PSScriptRoot`, register, force a run,
verify, throw if not green, `-StartWhenAvailable` so a run missed while the laptop sleeps fires on
wake. **Health is proven by output freshness, never by `Last Result`** — both are frozen signals.

⚠️ **One thing to decide before U12 runs unattended:** each build writes a back issue into
`newsletter/archive/`, which is **tracked**, so a nightly job leaves an uncommitted file every
night and `git status` is never clean again. Either gitignore back issues (the edition number
self-heals from disk, so numbering still works) or have the job commit them. Briggsy's call.

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
gate went **13 findings → 0** by fixing surfaces. **491 tests**, 0 skips on this machine
(`python -m unittest discover -s tests` from the root); on a clean clone it is 491 with **2 skips**,
both live-cargo environment probes. Verified by eye, not only by tests: the cheat sheet is **2 pages
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

## 0.5 Review residue — **9 of 10 CLOSED 2026-08-08.** One left, and it is deliberate

From the 2026-08-08 ultramode pass. **Only item 4 remains open**, and it is the one that changes
board *content* rather than machinery — it rewrites `strategy` prose Briggsy has read, so it wants
his eye rather than a quiet refactor. Everything else below is done.

1. ~~**A clean clone cannot run ~20 tests.**~~ ✅ **FIXED 2026-08-08.** The suite read gitignored,
   hourly-churning mule cargo through `read_shape()`. `build()` now takes `cargo=`/`league_cargo=`
   and the tests pass committed fixtures (`tests/fixtures/sleeper_draft.json`,
   `sleeper_league.json`). **Measured both ways:** with the cargo hidden the suite went from
   **22 errors + 2 failures** to **327 OK, 1 skip** — the skip being an explicit environment probe.
2. ~~**`meta.format` is a hand-typed duplicate of `meta.shape` (KTD-1).**~~ ✅ **FIXED 2026-08-08.**
   `shape.format_line()` derives it and `enrich()` stamps it; the gate now recomputes the whole
   string and compares exactly, instead of regexing two of the ~8 shared facts out of it. **The
   derivation reproduced the hand-typed string byte-for-byte** — the fact was right, it was just
   unguarded, and the unguarded half was the ROSTER, which is what the PDF header prints.
   `meta.shape` gained `scoring_type` (from the draft object's `metadata`) to make it derivable.
   4 mutants killed.
3. ~~**Nothing ever re-checks `meta.shape` against the draft object it names.**~~ ✅ **FIXED
   2026-08-08.** `check_shape_against_draft()` compares `draft_id` and the shape facts against the
   hauled cargo, and the gate prints the cargo's age on every run. Every other check in the gate
   compares the board to **itself**, so all of them stay green on a board that is perfectly
   self-consistent about the wrong draft.
   - **A re-created draft reports only that** — a different draft's teams/rounds are a different
     league, not drift, and seven more lines would bury the one fact that matters.
   - **`status` and `start_time` are deliberately NOT failures.** Both are expected to move, they
     affect a header string rather than any advice, and the watcher owns them. Failing on them
     would turn `--verify-only` red on draft morning, when it most needs to be trustworthy.
   - **Missing cargo is silent, but the gate SAYS it did not check** (`[unverified] meta.shape was
     NOT re-checked…`). A clean clone must not go red (insight 009).
   - **The call-site test was missing and the mutation found it:** cutting the check out of
     `validate()` left all nine unit tests green. Insight 013's exact shape, caught this time.
4. **OPEN — `strategy` prose hardcodes baselines and league shape** (KTD-1 + KTD-7). Left for
   Briggsy's eye on purpose: it rewrites sentences he has read, which is a **content** change, not
   a machinery one. Everything needed to do it is below.

   **What is actually hardcoded** (re-measured 2026-08-08):
   - `strategy.slotNotes[0..2].slot` = `"Picks 1-3"`, `"Picks 4-6"`, `"Picks 7-8"` — three literal
     seat ranges over `meta.shape.teams` (8). A 10-team league silently mislabels every one.
   - `strategy.rules[10]` names the VBD baselines in prose. The live values are
     `meta.vbd.baselineWaiver = {QB:12, RB:41, WR:47, TE:12}` and
     `lastStarter = {QB:8, RB:21, WR:27, TE:8}` — already data, already on the board, quoted a
     second time in a sentence nothing checks.

   **The prescription** — same shape as `meta.format`, which this session already did (item 2):
   1. Add `strategy_slot_ranges(shape)` to `scripts/shape.py`, beside `format_line()`. Split
      `shape["teams"]` into three near-equal bands and return the `"Picks a-b"` labels. For 8 that
      must reproduce `1-3 / 4-6 / 7-8` exactly — assert it, the way `format_line` was proven to
      reproduce its hand-typed string byte-for-byte before being trusted.
   2. In `enrich()` (`scripts/build_board.py`, right after `meta["format"] = format_line(shape)`),
      overwrite each `slotNotes[i]["slot"]` from that function. **Leave `note` alone** — the prose
      is judgment and is Briggsy's.
   3. For `rules[10]`, do NOT template the sentence. Make the gate check it instead: extend
      `check_strategy` in `scripts/validate_board.py` to assert every `QB\d+/RB\d+/WR\d+/TE\d+`
      run found in `rules` matches `meta.vbd`. Deriving the sentence would put an f-string in the
      one place the voice lives; checking it keeps the prose human and still cannot drift.
   4. Test both against a 10-team synthetic shape, and mutate each to prove it goes red.

   **Why the old-value sweep never caught these:** it sweeps *quantities that changed between two
   builds*. These have not changed, so there is nothing to compare — they are wrong only in the
   sense that nothing would notice if the league moved underneath them.
5. ~~**The PDF prints a VBD arrow on every K and DEF row.**~~ ✅ **FIXED 2026-08-08.** All 24 cleared
   |8| and all 24 drew a green ▲ on the one page you hold, hiding the real steals. The rule is now
   the named predicate `render_pdf.draws_vbd_chip()` rather than a condition buried in a draw call,
   and a test asserts the board HTML applies the same one — the two surfaces disagreed about the
   same fact. **24 arrows removed, 82 real ones kept.**
6. ~~**`_draw_strategy`'s `block()` silently truncates.**~~ ✅ **FIXED 2026-08-08.** It returned
   early, dropped every remaining line and reported success. It now **counts** what it cannot draw
   and raises `render_pdf.StrategyOverflow` naming the block and the number of lines lost. The PDF
   has no comment channel and cannot warn you it is incomplete — a sheet missing the eleventh
   commandment reads as finished. Nothing overflows today, so it ships with a control proving the
   current prose still renders.
7. ~~**`old_value_sweep` goes blind when a headline row changes identity.**~~ ✅ **FIXED
   2026-08-08.** Keys are `vorp[<player name>]`, so when the top RB changed the old key was absent
   from the new side and `k in new` discarded it — the refresh most likely to leave a stale
   name-and-number in a doc was the one refresh the sweep could not see. Dropped keys are now
   resolved against the **full** new board, so a demoted leader is reported only when his number
   actually moved, and a departed one is reported as gone. ⚠️ **Headline rows are chosen by MAX
   VORP, not by board rank** — reordering `pr` does not change identity, and an early draft of
   these tests moved `pr` and proved nothing.
8. ~~**Badge glyphs are checked for encodability, not uniqueness.**~~ ✅ **FIXED 2026-08-08.**
   `check_badges` now refuses two badges sharing a mark, on **both** surfaces — the PDF `glyph`
   and the HTML `icon`. A duplicate is worse than a blank: a blank looks like nothing, a duplicate
   says something specific and wrong and the legend confirms both readings. All eight are distinct
   today and a test asserts it against the live board. 3 mutants killed.
9. ~~**`check_strategy`'s name/team prose check keys on the last whitespace token.**~~ ✅ **FIXED
   2026-08-08.** `"Marvin Harrison Jr.".split()[-1]` is `"Jr."`, so prose reading `Harrison (ARI)`
   matched nothing. **Measured: 10 of 174 rows end in a suffix** — and it was worse than blind,
   because they all collided on a handful of keys, so `Jr.` mapped to the union of six teams and
   would have accepted almost any team named beside a `Jr.` surname. `surname_keys()` indexes both
   forms. Insight 008's shape, so it ships with a **positive control** proving the instrument can
   register a reading before its zero is trusted.
10. ~~**Dead constants in `render_pdf.py`.**~~ ✅ **FIXED 2026-08-08.** `ROW_GAP`, `TIER_LEAD`,
    `TIER_AFTER` and `SECTION_LEAD` were left behind by the adaptive-density rewrite, duplicating
    `DENSITY[0]`; tuning them did nothing. Removed. ⚠️ **`SECTION_AFTER` was NOT dead** and is still
    there — it is used twice, because the per-density `section` value is a LEAD and this is the
    trailing half added to it. Deleting all five, as the finding implied, would have broken the PDF.

**Escalated on a materiality split — HALF CLOSED 2026-08-08.** The row-level `sleeperId` U6 stamps
now has a reader: **U7's poll loop joins on it first**, name second, and that path is browser-
verified against the lab feed. What is still open is the **engine**, which continues to join
through `sleeper_ids.json`. Pointing it at the board's own key is a separate change needing its
own replay verification — not hard, but it must not be done blind.

---

## 0. Start with `/brief`

Sixteen insight docs now exist. Each has a documented wrong answer that looks right. Read them
before designing, not after debugging.

**The two from 2026-08-08 are the ones to read before writing any wrapper or any `except`:**
- **[`015`](docs/insights/015-the-degrade-path-would-have-swallowed-the-refusal.md)** — `read_shape`
  raised one exception class for "there is no cargo" and "this is an auction draft," which demand
  opposite responses. The obvious wrapper (`except Refuse: fall back to argv`) would have degraded
  an auction to typed defaults and advised off a pick order this repo does not model. **Name
  exceptions for the recovery they permit, not the place they were raised.**
- **[`016`](docs/insights/016-the-banner-printed-after-the-advisory-it-qualifies.md)** — the
  provenance banner printed *after* the advisory whenever stdout was redirected, because the parent
  block-buffers while the child writes straight to the fd. Invisible on a terminal. **Flush before
  handing stdout to a subprocess**, and check anything loggable through a redirect at least once.

⚠️ **And the meta-lesson from this session:** insight
[`005`](docs/insights/005-the-tie-breaker-agreed-with-the-board-by-construction.md) correctly
recorded the VBD circularity on 2026-08-07 — and `ranking-methodology.md` went on stating the
falsified rule until U8 fixed it a day later. **An insight nobody propagates to the surface that
states the rule is a note, not a fix.**

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
- ~~**U11 The Nightly Feud's build half**~~ ✅ **SHIPPED 2026-08-08 — Edition #1 exists.**
  `scripts/build_newsletter.py` + `newsletter/templates/edition.html.j2`, 41 tests.
  The mule spent days stockpiling cargo for a consumer that did not exist. It exists.
  - **Deterministic code owns every fact.** `Days to Draft` renders an asterisked dash because
    `start_time` is null, and switches to a real countdown the night it populates — no code edit.
    `Your Slot` reads `draft_order` or a dash, **never** `slot_to_roster_id`.
  - **The design is CARRIED, not copied.** The frozen template's `<style>` and theme script are
    extracted at build time; a test asserts the rendered CSS hashes identically. Consequence worth
    knowing: the unused `.preview-banner` rule survives in the stylesheet. The banner does not.
  - **Zero network calls.** Trending ids join the board on the frozen `sleeperId`, retiring the
    plan's 48 per-player lookups — U6 changed that fact after the plan was written.
  - ⚠️ **The Wire matches FULL names only.** Surname matching was measured against one real night:
    **10 false positives out of 11.** "Hall of Fame" matched Breece Hall five times; "Kirk Cousins"
    matched Christian Kirk. Every one of those headlines is now a test. The cost is that
    *"Nacua ruled out"* is missed — accepted deliberately, and written down as a decision.
  - **Headlines are grouped by player**, worst news first, with an outlet count. 31 raw matches
    became 20 groups; five outlets carrying one Gibbs story is one item, not five.
  - **Verified in a browser at 1536×791**, not just by tests — which is how the Board Version tile
    was caught wrapping onto two lines.
- ~~**U10 harden the mule**~~ ✅ **SHIPPED 2026-08-08.** `newsletter/feud_mule.ps1` (v2) +
  `scripts/validate_cargo.py`, 21 tests.
  - **The mule now validates content, not bytes.** Status, content-type, that it parses
    (`defusedxml`), and that a feed carries items. `rss_nbc_edge` had been recorded **ok** every
    hour for days while being a 793 KB web page with zero `<item>` elements — it passed `size > 50`
    comfortably. **Retired; ProFootballTalk replaces it.** Wire: **5 feeds, 145 items.**
  - **Nothing is overwritten until it passes.** v1 downloaded straight onto the live file, so a bad
    response destroyed good cargo and only removed it if under 50 bytes — leaving neither. Fetches
    now land on `<name>.incoming` and are promoted only on a pass. **Proven in an isolated run
    against the real failing NBC payload: cargo sha256 AND mtime unchanged, no temp left behind,
    and the status recorded both the failure and that what remains is 0 min old.**
  - **It fails safe, not open.** If the validator cannot run, the payload is rejected and the old
    cargo kept — accepting it would silently reinstate the bug.
  - **`null` is now a failure.** Sleeper answers `null` for a retired draft id; it parses cleanly,
    and v1 would have written it over good cargo — which is precisely how a re-created draft blinds
    the watcher.
  - **The `ok` prefix is a contract** with `watch_draft_state.py`, which keys on it. Tested at the
    call site, not just as a string.
- ~~**U8 correct the misleading docs**~~ ✅ **SHIPPED 2026-08-08.** Runbook, `league.md`,
  `ranking-methodology.md`, `README.md`, `CLAUDE.md`.
  - **The headline defect is gone: the draft loop is executable.** The runbook said `cd draft-kit/`
    while its own Step 3.1 only resolves from the repo root — following it literally meant one of
    the two commands failed. **Everything now runs from the repo root** and it was verified by
    *executing the loop*, not by reading it: `merge_picks.py` then `run_engine.py`, same directory,
    both exit 0.
  - **`metadata.slot_name_*` does not exist on the real draft.** Re-measured: `metadata` has exactly
    four keys. That doctrine came from Mock #1's room and was generalised. Corrected, with the
    `slot_to_roster_id` identity-map trap written down beside it.
  - **The VBD same-tier tie-breaker rule was inert and now says so.** Within a position `vorp` is a
    pure function of board rank, so the chip agrees with the board by construction. Measured on this
    board: **0 violations across 146 adjacent same-position pairs.** Cross-positional VBD — the part
    that was always the real value — is untouched.
  - **Rollback is now written down** as literal commands. Restore `draft-kit/` whole, never one
    surface, then `--verify-only` — the only detector that covers the PDF.
  - **Stale by the time it was read:** `ranking-methodology.md`'s two factual errors (the 40+/50+
    bonuses, the play-by-play provenance) were already corrected by an earlier session. Left as is.
  - **Deliberately NOT upgraded:** the waiver-day claim. The plan says a 2025-history check
    confirmed Wednesday ~03:10 ET across 111 waivers, but the league object carries no
    `previous_league_id` today, so it **cannot be reproduced from current cargo**. It is recorded in
    `league.md` as a citation with that provenance stated, not as re-verified fact. One look at the
    first live cycle settles it.
- ~~**U7 live board poll loop**~~ ✅ **SHIPPED 2026-08-08.** `scripts/templates/board.html`
  (never the generated HTML — KTD-1), 15 tests. **▶ Go live**, or `?live=1` for a wall display.
  - **Verified in a browser, not by reading it.** The board was served over HTTP and polled a real
    endpoint holding `tests/fixtures/lab_feed_120.json`: **116 rows matched, 4 picks unmatched —
    identical to what `draft_engine.py` reports on the same feed**, and `next is #121, seat 8`
    matches the engine's `next is pick 121 (slot 8)`. Growth from 20 → 120 picks landed without a
    reload; scroll held at 1200px on a 10775px page; search text and focus survived.
  - **`taken` and `drafted` are separate collections.** Polled picks never touch the operator's
    own cross-off, so un-crossing somebody is no longer undone by the next poll.
  - **Failure was tested by killing the server**, not by stubbing `fetch`: 116 rows stayed crossed,
    174 rows stayed rendered, the failure was surfaced, and the backoff climbed 12s → 60s (capped).
  - **It never un-greys a player on its own.** A shrinking feed is surfaced and the rows stay.
  - **First reader of the row-level `sleeperId`** — see the escalated item below, now half-closed.
    Honest limit: on THIS feed the id and name joins agree on all 116, so the id is proven
    equivalent here, not superior. Its value is insurance against the documented "J. Gibbs" drift,
    which this fixture does not contain.
- ~~**U15 engine wrapper**~~ ✅ **SHIPPED 2026-08-08.** `scripts/run_engine.py` + `scripts/shape.py`,
  45 tests. **Run the engine through it** — `python scripts/run_engine.py` from the repo root.
  - Seat, teams, rounds and the whole roster now come from the draft object. The seat is read from
    `draft_order[<briggsy>]` when it exists and **refuses** rather than guessing when it does not
    (it is still `null` today, so that refusal is what you will see).
  - **The roster half was the silent one.** `teams`/`rounds` were at least cross-checked against
    cargo; `STARTERS` and the flex count were hardcoded in `draft_engine.py` and checked by
    nothing. They now arrive via `FF_STARTERS`/`FF_FLEX`, with the built-ins as a loud fallback.
  - **The contamination gate arms itself** when cargo is fresh — and deliberately does NOT when
    cargo is stale, because a stale id would refuse a *correct* run (insight 009's false red).
  - **`read_shape()` moved to `scripts/shape.py`** so the wrapper does not inherit jinja2 and
    reportlab through `build_board.py`. Its refusals are now typed: `CargoUnreadable` (cannot
    tell — a caller with a fallback may degrade) vs `UnsupportedShape` (an auction or a reversal —
    never degrade past it). Both still subclass `Refuse`, so the generator is untouched.
  - **Four mutants killed**, including cutting the engine's `FF_STARTERS` read: the tests assert
    on the engine's printed needs line, not on the wrapper's dict (insight 013).

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

Then run the engine **through the wrapper**, from the repo root — it re-reads all four of the
above from the draft object itself and arms the contamination gate for you:
`python scripts/run_engine.py` (add the slot — `run_engine.py 3` — until `draft_order` fills).
Start with `--dry-run` to see every value and where it came from before anything advises you.

---

## Landmines

Full set in [`CLAUDE.md`](CLAUDE.md); [`docs/insights/`](docs/insights/) has the sixteen worked cases.
The four that bite hardest under time pressure:

- **A screaming engine means STOP.** Re-fetch, re-merge, rerun. Never advise off a `picks.json` it
  refused.
- **A silent engine can also be wrong.** `picks.json` is gitignored, so a spent mock's picks are
  invisible to `git status`. Both `merge_picks.py` and the engine now refuse them — but only the
  engine's check fires if you skip the merge, and only when you pass the draft_id.
- **Presence is not health.** `Last Result: 0`, `NumberOfMissedRuns`, and the mule's `10/10 ok` are
  all untrustworthy. Only the cargo timestamp in `mule_status.json` proves life.
  ([`007`](docs/insights/007-presence-is-not-health-the-third-instance-of-one-pattern.md))
- ~~**`rss_nbc_edge` is not RSS.**~~ ✅ **RETIRED 2026-08-08 (U10).** It returned HTTP 200,
  ~793 KB, `Content-Type: text/html`, zero `<item>` elements — failing content-type, parse *and*
  item count while passing the only check `Fetch-Source` ran (`size > 50`). **ProFootballTalk**
  replaced it. The wire now carries **5 working feeds, 145 items**. Do not restore the old URL:
  it is not broken, it was never a feed.
