# Family Feud

A fantasy football co-pilot for Briggsy's 8-team Sleeper league, **Family Feud** (2026).
Snake draft, 16 rounds, ~Aug 29. Full PPR, 6 of 8 make the playoffs.

**The mission is beating Hunter** — his son, and the league commissioner.

## What's here

| | |
|---|---|
| **A 174-player draft board** | 48 RB · 59 WR · 20 TE · 23 QB · 14 DEF · 10 K — every entry tiered, badged, and carrying empirical VORP |
| **A live draft engine** | reads the cumulative Sleeper picks feed and prints board state, every roster's open needs, run watch, tier cliffs, best-available and VBD leans |
| **A proven executor mode** | Claude drives Briggsy's logged-in Chrome and clicks the picks. Mock #3: 15/15 manual picks, zero clock misses, roster VORP 1225.8 |
| **An hourly data mule** | a Windows scheduled task hauling 5 Sleeper endpoints + 5 fantasy RSS feeds + the expert consensus and the market ADP pool to disk, so nothing depends on a network call at draft time. It **validates what it caught** — status, content-type, that it parses, that a feed has items — and **never overwrites good cargo with bad**: a failed source keeps the last payload and records how old it now is |
| **A draft-state watcher** | the mule's first consumer. Hourly, it notices the moment `start_time` stops being null — or moves — and writes it down, because the date is a handshake that can shift **earlier**. It also refuses to go quiet: stale cargo, a lost baseline, a moved seat, or a re-created draft each raise their own alert |

## Where things are

```
docs/            all prose — start here
  league.md              identity, scoring, roster, playoff format  (verified against the live API)
  data-access.md         endpoints, curl, the mule, credentials policy
  draft-day-runbook.md   THE operating manual. Read before any draft or mock.
  ranking-methodology.md why the board ranks what it ranks
  live-board-plan.md     the self-updating wall board — shipped; this is the design record
  nightly-feud.md        the newsletter — how it builds, and the nightly job that publishes it
  in-season-plan.md      what happens after the draft. A stub on purpose; read the un-stub trigger
  insights/              hard-won lessons, one per file. Read before debugging
                         something that smells familiar.
  plans/                 implementation plans. The machinery rebuild lives here.

draft-kit/       the draft-day arsenal (run the engine from in here)
  draft_engine.py                    players_data.json
  family-feud-draft-board.html       family-feud-cheat-sheet.pdf
  normalize.py     the ONE name normalizer. Rules live here as data; norm_spec.json
                   and the board's JS are both generated from it. Never fork it.
  sleeper_ids.json every board row's frozen Sleeper id. Append-only ledger, and
                   the key the engine joins live picks on — names drift, ids don't.
  vorp_curve.json  rank → points by position, averaged over four seasons. Declares
                   what it excludes and that it does not reproduce the Aug 5 board.
  cache/           the pinned /players/nfl dump the ids were resolved against.

newsletter/      The Nightly Feud machinery + the mule
                 data/inbox/   mule cargo (gitignored — a cache, not source)
                 data/state/   watcher baseline + DRAFT_ALERTS.md (gitignored)
scripts/         install-mule.ps1     — registers and verifies the hourly mule
                 install-watcher.ps1  — same, for the draft-state watcher
                 merge_picks.py       — fetches /picks and merges into picks.json;
                                        refuses picks from a different draft, and reports a
                                        pick that VANISHED upstream (--rebuild to accept it)
                 watch_draft_state.py — reads mule cargo; writes an alert when the
                                        draft becomes real. Never a notification.
                 resolve_sleeper_ids.py — resolves board rows to Sleeper ids against
                                        the pinned dump. Hard-stops rather than guess.
                 validate_board.py    — the schema gate. Refuses to let a board the
                                        engine cannot eat reach draft day. Born red.
                 scoring.py           — the league's scoring rules as ONE pure function.
                                        Reproduces nflverse's own PPR exactly, 2469/2469.
                 build_curves.py      — the empirical VORP curve from nflverse seasons.
                 build_board.py       — THE GENERATOR. One command regenerates every surface
                                        from players_data.json. Stages, gates the staged set,
                                        and emits only on pass — write-all-or-write-none.
                                        --verify-only is the draft-morning sanity check.
                 render_html.py       — the board HTML, from templates/board.html
                 render_pdf.py        — the cheat-sheet PDF. All 174 rows, one page.
                 templates/board.html — presentation only; every FACT comes from the source
                 shape.py             — league shape from the draft object. ONE owner, two
                                        consumers. Refuses a non-snake draft; distinguishes
                                        "cannot tell" from "will not compute".
                 run_engine.py        — RUN THE ENGINE THROUGH THIS. Reads seat, teams, rounds
                                        and the roster from the draft object instead of your
                                        memory, and arms the contamination gate for you.
                 validate_cargo.py    — is this payload actually the thing we asked for? The
                                        mule's per-source gate: status, content-type, parse, items.
                 build_newsletter.py  — THE NIGHTLY FEUD. Turns the mule's cargo into an edition.
                                        Facts are computed, never written by a model; the design
                                        is carried from the frozen template; no network calls.
                 market.py            — value (priced for THIS league) vs ADP: who the room lets
                                        fall, and who it overpays for. READ-ONLY. In an 8-team
                                        league replacement is QB12, so QBs below it are worth
                                        NEGATIVE points and the market does not know that.
                                        Four artifacts had to come out before the list was
                                        trustworthy — pool depth, thin-sample ADP, the position
                                        mix ('you' and 'mkt' must count the same men, and K/DEF
                                        broke that), and self-counting at the spread edges. It
                                        shares consensus.depth_rank rather than counting for
                                        itself; two copies is how the two drifted. → insights/019
                 rerank.py            — re-derives r/pr/tier from the consensus. Refuses to write
                                        while a note still claims a board position, unless you
                                        acknowledge it BY NAME with --notes-reviewed.
                 injury_check.py      — board injury prose vs Sleeper's LIVE designations, joined
                                        on the frozen sleeperId (174/174). READ-ONLY: it reports a
                                        disagreement and leaves the sentence to a human, same rule
                                        as rerank.py. Found 19 rows Sleeper flagged that the board
                                        was silent about, and one the board flagged that Sleeper
                                        was not. ⚠ In August `injury_status` is a practice-report
                                        artifact, not a game-day call — it points at rows to
                                        re-read and feeds no rank.
                 consensus.py         — what the board's gap to the expert consensus COSTS in
                                        points. READ-ONLY: it never writes the board. Joins
                                        id-to-id, never by name. Ranks BOTH sides within the
                                        board's own depth — FantasyPros counts inside 523 rows
                                        and this board carries 174, so counting separately
                                        prices the list-length difference as a disagreement.
                                        ⚠ Its section [1] is CIRCULAR while rerank.py owns the
                                        ordering (on 2026-08-08 it was 150/150 rows; it drifts
                                        between re-ranks -- the run prints the live count) and
                                        it SAYS SO on every run — that zero is an identity, not
                                        ~100 experts ratifying the board. The live signal is
                                        section [2], who the consensus ranks that the board does
                                        not carry — the half a rank-gap metric cannot see.
                                        → docs/insights/018
tests/           861 tests: python -m unittest discover -s tests  (run from the root)
                 fixtures/lab_feed_120.json — the spent lab room's 120 picks
logo/            team art. deez-nuts/ is Briggsy's; hunter-maker/ is Hunter's.
```

## Refreshing the board

`players_data.json` is the single source; the HTML and the PDF are **build outputs**. Never edit a
surface by hand — `draft-kit/build_manifest.json` carries a sha256 per surface and will catch it.

```bash
python scripts/build_board.py            # regenerate all three surfaces from the source
python scripts/build_board.py --verify-only    # draft-morning sanity check; writes nothing
```

🚨 **Neither of those can move a RANK.** `scripts/rerank.py` is the only writer of `r`/`pr`/`tier`;
the generator derives `vorp` from `pr`, so on an unchanged source it re-stamps byte-identical data
and `--verify-only` goes green on a stale ordering. **Re-ranking is its own sequence** — it lives in
[`docs/draft-day-runbook.md`](docs/draft-day-runbook.md) under *THE REAL REFRESH*, and it is the
thing to run before a draft. Read `meta.rankings.synthesized` to see how old the ordering is;
`meta.updated` is input-mtime freshness and does **not** move when the consensus does.

Edit the judgment fields in `players_data.json` — ranks, tiers, badges, notes — and re-run. The
generator recomputes VORP from the curve, re-derives `dst`, restamps `meta.shape` from the live
draft object, re-renders both surfaces, and **refuses to emit unless the schema gate passes on the
staged set**. One refresh = one commit.

## Running the engine

```bash
python scripts/merge_picks.py <draft_id>   # from the repo ROOT — refreshes picks.json
python scripts/run_engine.py               # from the repo ROOT — everything else is read
```

`run_engine.py` is the way in. It reads your seat, the team count, the round count and the roster
shape **from the draft object the mule already hauls hourly**, hands them to the engine, and prints
exactly where each number came from before a word of advice appears. Nothing is typed from memory,
which is the point: `draft_engine.py 3 8 15` against a 16-round draft goes *silent* about your own
round-16 pick and exits 0, and a changed roster slot makes "their open needs" confidently wrong
with no error at all.

It also **arms the contamination gate for you** when the cargo is fresh — that flag is optional
today and a human on a 120-second clock forgets it. When the cargo is stale it deliberately does
*not*, and says so, because a stale id would refuse a correct run.

Overrides exist and are never quiet — `--teams`, `--rounds`, `--draft-id` each win and announce
that they won. `--dry-run` resolves everything and launches nothing.

```bash
python scripts/run_engine.py 3             # state the seat yourself (before draft_order fills)
python scripts/run_engine.py --dry-run     # what would it use, and where did each value come from
```

**It refuses a draft it cannot model.** A non-snake or third-round-reversal draft is a hard stop
with a non-zero exit, never a fallback: `slot_of()` and `my_picks()` assume plain snake, so
computing anyway would print a complete, confident advisory on a pick order that is not this
draft's. A *missing* cargo is different and never blocks the run — it degrades to what you typed,
out loud, every time.

<details><summary>Running <code>draft_engine.py</code> directly (still supported)</summary>

```bash
cd draft-kit
python draft_engine.py <briggsy_slot> [teams=8] [rounds=16] [draft_id]
```

Two directories, deliberately: the merge script runs from the repo root, the engine from
`draft-kit/` (it opens `players_data.json`, `picks.json` and an optional `slot_names.json` by
literal name from the current directory). `run_engine.py` handles that for you. The merge loop and
cadence rules are in [`docs/draft-day-runbook.md`](docs/draft-day-runbook.md); do not improvise them.

**Pass the `draft_id` as argument 4.** It is optional only so the engine still runs without it —
supply it and the engine refuses a `picks.json` belonging to a different draft, which is otherwise
invisible (`picks.json` is gitignored, so `git status` never shows a spent mock sitting there).
Run it bare and the roster shape falls back to the constants in the file, which are this league's
shape as of authoring and are **not** checked against the live draft.

</details>

**The engine refuses to guess.** It derives board state from `max(pick_no)` and hard-exits on an
interior gap or a duplicate. If it screams, re-fetch and re-merge — never advise off a picks file
it rejected. That gate exists because a single dropped pick silently shifts the clock and leaves
already-drafted players on the available list.

**It also refuses to take your word for it.** `my_slot`, `teams`, `rounds` and `slot_names.json`
are all cross-checked against the draft itself — the mule's cargo and the `picked_by` on your own
picks — before any advice is computed. A wrong seat is inside the legal range, so it used to
produce a complete, plausible advisory for another manager's team and exit 0. A missing oracle
never blocks the run; it prints `[unverified]` and says exactly what it could not check.

**Picks join on the frozen Sleeper id, not the name.** That id is what makes an already-drafted
player disappear from the board even when Sleeper renders his name differently than we do, or he
has changed teams since the board was authored.

The engine reads it from **the board's own rows** — every row carries `sleeperId`, and the
generator refuses to emit a board where one does not. So the war-room working directory needs
`players_data.json`, `normalize.py` and `picks.json`, and nothing else. `sleeper_ids.json` remains
the resolver's ledger — the provenance record of how each id was established, and what
`resolve_sleeper_ids.py --verify` re-asserts — and it is the fallback for a board built before the
generator existed. With neither, the engine falls back to matching names — and says so, naming
which source it used.

## Validating the board

```bash
python scripts/validate_board.py           # static + cross-surface, milliseconds, offline
python scripts/validate_board.py --full    # adds a real-engine replay of the lab feed
```

Checks all 174 rows — never a sample, because both known break modes are latent: a float
`vbdDelta` passes an empty-picks run and kills the whole advisory three picks in. It also checks
the things a row-level gate never looks at, which is where the verified drift actually was:
`dst`, `strategy`, the HTML's prose outside the data blob, and the cheat sheet.

**It is born red, and that is correct.** Several surfaces are drifted today and the gate's job is
to say so. Acceptance is *"the gate correctly reports the known-drifted surfaces as failing"* —
never *"the gate passes"*. A gate that must be born green is a gate someone weakens until it is.
**Fix the surface, never the gate.**

## State of play

**Verified on this machine 2026-08-08:** the engine through `run_engine.py` (shape read from the
draft, exit 0), the board polling a live feed in a browser, curl to Sleeper, and the mule —
**12 sources, 0 failed, and this time the "ok" means something**: every payload was parsed and
counted, not weighed. The wire carries **5 working feeds and 145 items** (yahoo 50 · cbs 36 ·
pft 30 · espn 24 · rotowire 5). Item counts move daily; re-read `mule_status.json` rather than
quoting these.

**Proven, but not since the migration:** executor mode. Its evidence is Mock #3 on Aug 6, run
under Cowork — 15/15 manual picks, zero clock misses. The browser-driving half has **not** been
exercised in this environment. Treat it as unproven here until a mock says otherwise.

**The Nightly Feud publishes itself now.** Its build half had never run once; **Edition #1 went out
2026-08-08** — `python scripts/build_newsletter.py`. Deterministic code owns every fact, the design
is carried byte-for-byte from the frozen template rather than copied, and it makes no network calls.
**It is scheduled** (U12): the *Family Feud Newsletter* task runs **daily at 21:45**, sixteen
minutes behind the mule's `:29` haul. Its installer proves the job by output freshness rather than
by an exit code, because a task pointing at a deleted script reports success indefinitely. Back
issues are not committed; the current edition is. See [`docs/nightly-feud.md`](docs/nightly-feud.md).

**What the season looks like after the draft** is stubbed, not built:
[`docs/in-season-plan.md`](docs/in-season-plan.md) records the three deliverables, the four Sleeper
endpoints the mule would need, and the un-stub trigger — `/state/nfl` flipping `season_type` from
`"pre"` to `"regular"`.

**The board polls the live draft now.** Open it and click **▶ Go live** — or open it with `?live=1`
and it starts itself, which is what a wall display wants. Every 12 seconds it reads the picks feed
and greys out whoever has gone, stamping each row with the pick number and seat that took him.
Verified by replaying the committed 120-pick lab feed through a real HTTP endpoint in a browser:
**116 rows matched, 4 picks unmatched — pick for pick what `draft_engine.py` reports on the same
feed.** Kill the network mid-session and it keeps the last good board, says the poll failed, and
backs off; it never blanks and it never un-greys a player on its own. See
[`docs/live-board-plan.md`](docs/live-board-plan.md).

⚠️ **The board is an August 5 snapshot and it expires.** Ranks, injuries and ADP move daily in
August. It must be rebuilt before the real draft. The reminder that used to exist did not survive
the migration — **`scripts/watch_draft_state.py` replaces it**, and on better terms: the old one
fired on a hardcoded Aug 26, which is the wrong shape for a date that is still null and can move
earlier. The watcher fires on the actual transition. See `TODO.md`.

## History

This project was built in Claude Cowork on Aug 5–6, 2026 and migrated here Aug 7. Several rules
in older docs were Cowork sandbox constraints and are now actively wrong — chiefly "use WebFetch,
curl is proxy-blocked." Here it's the reverse: **curl works, WebFetch is banned.** Where an
obsolete rule was load-bearing, the doc that carried it now says so explicitly rather than
quietly dropping it.
