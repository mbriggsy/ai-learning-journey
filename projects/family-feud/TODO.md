# Family Feud — TODO

> **Actionable next-actions only.** No session history — `git log` has that.
> Re-ranked every session, so never cite "item N" anywhere; cite the title.

## ▶ WHERE WE ARE — read this first, update it when it changes

```
plan ✅ → deepen ✅ → work ✅ (U6) → ultramode ✅ → work ✅ (U15·U7·U8·U10·U11·U12·U13)
  → review residue ✅ (all 10) → engine join ✅ → provenance ✅ → consensus ✅ → re-rank ✅
  → ADP ✅ → mule v2.1 ✅ → mock proven end-to-end ✅ → CDN staleness fixed ✅
  ◀ HERE — the board is DERIVED, refreshes itself hourly, and the draft-day feed is no longer stale
```

**Units shipped:** U1, U2 (Phase 0 gates) · **U9** (draft-state watcher) · **U3** (one normalizer,
proven equal in two runtimes) · **U14** (`sleeperId` frozen — 174 ids, 0 unresolved) ·
**U4** (board schema gate, born red on 13 real findings) · **U5** (scoring as code + the empirical
curve; oracle exact at 2469/2469) · **U6** (the generator — one source, every surface) ·
**U15** (the engine wrapper — shape read from the draft, not typed) · **U7** (the board polls the
live draft) · **U8** (the runbook's draft loop is executable again) · **U10** (the mule validates
what it caught) · **U11** (The Nightly Feud publishes) · **U12** (it publishes without a human) ·
**U13** (the in-season cadence, stubbed against measured payloads) — the last ten on 2026-08-08.

**Phase 2 closed. Every unit U1–U15 is done, all 10 review-residue items are closed, and the
engine's `sleeperId` join is repointed.** The build order below has nothing left in it.

**THE BOARD'S ORDERING NOW COMES FROM THE CONSENSUS (2026-08-08).** Briggsy's call: the Cowork-era
`r`/`pr`/`tier` "carry no weight." `scripts/rerank.py` re-derives them from FantasyPros Full PPR
ECR; 164 of 174 rows moved. **The edge is not the ranking — it is that this board is priced for an
8-team, 2-FLEX, full-PPR room** (replacement at QB12/RB41/WR47/TE12) while the rest of the league
drafts off a generic list. Verified kept: name/team/pos/`sleeperId` (160/160 agree with live
Sleeper, positive-controlled) and every note.

**ADP IS IN — `scripts/market.py`, value-vs-price.** Fantasy Football Calculator, PPR, 5,187 drafts,
joined on the exact `(team, pos, normalized name)` key: **156/174, 0 ambiguous**. The finding it
exists for: this league starts 1 QB across 8 teams, so replacement is **QB12 and every QB below it
is worth negative points here** — the market prices for a 12-team room and does not know. It takes
Stafford (−30.1) at pick ~85 while letting Lamar Jackson (+106.7) fall 20 spots past his value.
⚠️ **The source's `teams=8` parameter is COSMETIC** — verified, `teams=8` and `teams=12` return
byte-identical ADP for all 256 players while echoing whatever you asked into `meta`. It is a
BLENDED pool; the league-size correction must keep coming from `vorp` on our side.

**THE MULE HAULS BOTH, HOURLY (v2.1).** `Run-Fetcher` invokes `consensus.py --fetch-only` and
`market.py --fetch-only`, which own their own download-validate-promote cycle; the mule records
their one line beside the other ten sources. **12/12 ok, proven end to end** — and proven the other
way too: with `market.py` renamed away it recorded `FAIL: scripts\market.py is missing`, the other
eleven sources were unaffected, and **the ADP cache survived byte-for-byte with its mtime unmoved**.
The validation logic stays in Python deliberately; this repo does not test PowerShell.

**✅ THE DEPTH CORRECTION IS PORTED (2026-08-08) — and it turned up something bigger.**
`consensus.py` now ranks BOTH sides inside the board's own depth (`depth_rank()`, one function for
the point estimate, the spread bounds and the insertion rank of a player the board omits). The six
"disagreements" were the artifact entire — **all six said "they like him LESS", six for six**, which
is an instrument reading, not a finding. Also recovered **3 rows that were off-curve** purely
because their inflated consensus ranks ran past the curve's last measured point: `3 → 0`.

⚠️ **AND SECTION [1] IS NOW PROVEN CIRCULAR — `board pr − restricted consensus rank == 0` on all
150 rows, zero variance.** `rerank.py` derives the ordering from this same FantasyPros ECR, so the
section asks whether the consensus disagrees with itself. **The report announces this on every run**
rather than printing a zero that reads as ~100 experts ratifying the board. What it means going
forward:
- **Section [1] is a DRIFT DETECTOR, not a discovery tool.** It wakes when a rank is overruled by
  hand, or when FantasyPros publishes a scrape newer than the board's synthesis (`2026-08-07`
  today — they are in lockstep, which is exactly why it is silent).
- **Section [2] is the only half that still discovers**, because those players were never inputs to
  the re-rank. It improved: worth-more-than-replacement went **2 → 3**, Jayden Reed 0.0 → **+4.0**.
- Full write-up: [`docs/insights/018`](docs/insights/018-the-bias-was-the-only-thing-producing-findings.md).
  **Do not "fix" the zero by loosening the spread filter** — that rebuilds the noise machine.

⚠️ **THE FIRST VERSION OF THAT FIX SHIPPED A ONE-RUNG COPY OF THE SAME BUG, and it was caught by an
adversarial pass on an already-green run.** `depth_rank` counted the player as one of the players
ranked ahead of *himself* at the upper spread edge — `worst` one rung too deep on **150 of 150 rows**,
897.5 VORP points of spurious band-widening, max **59.3** (Chase). Only `low` was corrupted, so the
band stretched **downward only** and real *"they like him MORE"* findings were returned as zero —
the exact blind spot the correction exists to remove. Fixed with an `own=` argument that must stay
**conditional** (a player the board OMITS legitimately reaches `len+1`; over-correcting breaks
section [2] — mutant M6). **9 mutants now, 9 killed.**
- **Read [`019`](docs/insights/019-the-mutants-only-probe-the-axis-you-already-suspect.md) before
  trusting a green mutation run.** All four original mutants probed *which population is ranked*;
  none probed *who is in the comparison*, so the clean sweep carried no information about the axis
  that was actually broken — and **a test written in the same pass asserted the bug.**

**✅ `market.py` IS FIXED TOO (2026-08-08) — it had BOTH defects, and only one had been reported.**
Found by the adversarial fleet, then measured rather than taken on its word:
- **Position mix.** `val` ranks skill only; the market rank subtracted from it counted every
  matched row. 10 K/DEF sit at all-positions ranks **119-151**, so **28 of 146** skill rows read as
  bigger bargains than they are, by up to **10 spots**. Now ranked twice — `mkt_all` for display,
  `mkt` over skill for the subtraction — and the report SAYS both columns count skill only.
- **Self-counting, found by asking insight 019's question of a file nobody had flagged.**
  `mkt_worst` counted the player himself (correct) while `mkt_best` at `adp − sd` did not, and
  neither added a `+1`: **`mkt_best` wrong on 133 of 146 rows**, one rung too GOOD, understating
  every bargain. `market_ranks` now delegates to `consensus.depth_rank` — **two implementations of
  "where does this value slot" is how the two instruments drifted apart.**
- ⚠️ **All 32 existing market tests stayed green through both changes.** A semantic change nothing
  notices is insight 013's signal. 7 tests added, 4 mutants planted and killed.

**✅ THE KICKER CURVE IS BUILT AND K TIERS ARE DERIVED (2026-08-08).** `build_curves.py` now ships a
**41-rank K curve**, exact — nflverse publishes FG makes already bucketed by distance and the
buckets map 1:1 onto `league.md`'s bands, verified by asserting they sum to `fg_made` on all 542
REG rows of 2024 (the loader hard-stops if that ever fails). `rerank.value_bands` derives K tiers
now, because tiers need no baseline: **3 kicker tiers moved** (Dicker 1→2, Pineiro 2→3, McPherson
2→3), and exactly **3 fields on the whole board changed**, all `tier`, all K — audited field by
field. `tests/test_build_curves.py` is new, **14 tests**; that file had none.
- **The monotonicity test found a defect in the ALREADY-SHIPPED curve.** It is a mean of order
  statistics, so a rank only means something if the same number of seasons went into it. All four
  seasons supply **QB to 78, RB 135, WR 212, TE 116, K 41** — so the 80-deep curve was averaging
  three seasons past QB78 and carried a real inversion there. Now truncated per position at the
  deepest rank every season supplies. **0 inversions anywhere.** Kickers made it visible because
  they are the shallowest position there is.
- **One unstated rule, BOUNDED not assumed:** a blocked FG is neither a make nor a miss in this
  source (`fg_att` 1115 == made 937 + missed 160 + blocked 18). league.md says "miss: −1" and does
  not say which. Blocks count as misses; `--check` prints the sensitivity both ways — **0.0–1.7
  pts, mean 0.45** across 41 ranks, i.e. immaterial.

## ▶ NEXT ACTION

**◀ NEXT: the mock-draft harness.** Proven 2026-08-09 that the whole spine already runs against a
real Sleeper mock with **zero new code** — see the operating facts below. What is missing is the
part that beats the clock, and the shape is now decided by measurement rather than taste:

- **One terminal on the clock, never a fleet.** A draft is maximally coupled — one board, one
  clock, one decision, mutating every 120s — and a live run proved the human-in-terminal loop is
  too slow: the 4.3 clock expired while the engine was being run in Bash.
- **The answer must exist BEFORE the clock starts.** Pre-compute the branches offline where time
  is free; on the clock do a LOOKUP, not a deliberation.
- **Keep a player queued at all times**, so a blown clock degrades to *our* board instead of
  Sleeper's. Measured cost of not doing this: auto-pick took Tetairoa McMillan (81.3) at 5.3 while
  **Lamar Jackson (~107) was still on the board and did not go until #40**.
- **Many terminals only OFF the clock**, one per opposing doctrine, and **forbidden to talk** —
  opponents that share a brain are not opponents.

⚠️ **OPERATING FACTS FOR ANY MOCK WORK — all measured 2026-08-09, none of them guessable:**
- **Mocks never appear in `/user/<id>/drafts`.** Only the real league does. The browser URL is the
  ONLY way to learn a mock's `draft_id`.
- **A mock's `league_id` is `null`** — that is the signature that distinguishes it from the real draft.
- **A mock DOES populate `draft_order`** (`{"1390750540631150592": 3}` on all three). The real
  draft's is still null, so **a mock is the only way to rehearse `run_engine.py`'s seat read.**
- **`slot_to_roster_id` is the identity map on mocks too** — re-confirmed live, still the most
  attractive wrong answer in the project.
- **A mock's roster carries `slots_bn: None`.** `read_shape` handles it (bench → 0), and the shape
  banner correctly prints no bench.
- ✅ **START DRAFT's dialog is a native `window.confirm` — SOLVED, mocks now run unattended.**
  Override it *before* the click (`window.confirm = () => true`), click, then **restore it
  immediately** — an auto-accept-everything hook left armed on a page will silently accept a
  destructive dialog later. Never leave it installed, and never install it on the real league.
  Text it raises: *"Are you sure you want to start the draft? This action cannot be undone."*
- **Miss your clock once and Sleeper puts you on auto-pick and LEAVES you there** for the rest of
  the draft. It drafted rounds 4-15 before this was noticed.
- **`picked_by` identifies the SEAT OWNER, not the agent.** Auto-pick on a claimed seat still
  stamps your user_id, so it cannot tell you whether a human chose.

⚠️ **DRIVING THE ROOM — `scripts/sleeper_draft_console.js` (`ffFind` / `ffDraft`), all measured:**
- **NEVER click the draft room by screenshot coordinate.** Screenshot pixels are not CSS pixels
  and the scale drifts between captures: viewport is **1536×791 CSS** while successive screenshots
  came back **1568×750** and **1522×784**, putting a row that lives at CSS y=544 at y=562. **18px
  of error on a 26px row** — it cost a real pick (McBride, 2.6). Address the DOM instead.
- **The row's leftmost cell (`row.children[0]`, ~34px, holds an svg, no text) IS the draft button**
  when you are on the clock. It is NOT a queue button — that misread is what made the first mock
  look like queue-plus-auto-pick worked.
- **The player list is VIRTUALISED** — the scroll container is ~98,000px tall with only ~53 name
  cells in the DOM. Most players cannot be found by querying; **the search box is mandatory**, and
  it must be driven through React's native value setter, not by assignment.
- **Do not interleave keystrokes and JS calls.** Executing JS moves focus, so `ctrl+u` → type →
  run-JS silently lands the keystrokes nowhere. Observed: the box read empty afterwards.
- **Poll, never sleep.** A fixed 700ms wait reported "no exact match" mid-re-render, which is
  indistinguishable from "he's already gone." Polling resolved the same lookup in **219ms**.
- **Match names EXACTLY and fold apostrophes.** `Chase` matches Chase Brown as readily as Ja'Marr
  Chase; Sleeper's apostrophe differs from the board's. Ambiguity must refuse, never guess.
- 🚨 **`ffDraft` reports a CLICK, NOT A PICK.** It returned `drafted:true` for Chase while the API
  showed our slot got Puka Nacua and Chase went to slot 4 — the clock had expired and the click hit
  a stale un-re-rendered row. **The browser cannot be the oracle for its own action.** Confirm every
  pick with `merge_picks.py <draft_id>` and check the player landed on OUR `draft_slot`. Insight 007.
- ◀ **THE QUEUE CONTROL IS IDENTIFIED BUT WILL NOT FIRE — the one open mechanism item.**
  Briggsy pointed it out from a screenshot; **three different controls live in a player row** and
  this session conflated two of them:
  | control | what it is |
  |---|---|
  | `row.children[0]` (green `+`) | **DRAFTS immediately** when on the clock |
  | `img[src*="icon_watch_player.png"]` | the star — watchlist, not queue |
  | `img[src*="queue.png"]` | **the queue button** |
  **Match on the image `src`, never on position** — the star's box is 42×44 and the queue icon's
  24×24, both inside `row.children[2]`, and geometry-based selectors are the pixel problem again.
  **Activation is UNSOLVED.** Failed against a confirmed-live draft (31 picks, seat 3):
  `.click()` on the img and on its container · a full synthetic pointer down/up/click sequence ·
  a real CDP click at the CSS centre from `getBoundingClientRect()`. Plain `.click()` *does* drive
  New Mock, CLAIM and START DRAFT, so this is specific to this control.
  **Next to try:** read the React fibre (`__reactProps$…`) off the element and call its `onClick`
  directly; or calibrate the CDP↔CSS coordinate mapping against a known element first, since the
  coordinate attempt may simply have missed.
  **Why it is the highest-value item:** miss a clock once and Sleeper puts you on auto-pick *for
  the rest of the draft*. With a loaded queue that takes OUR next-best player; without one it takes
  Sleeper's. That is the difference between a blown pick and a blown draft.

The other open item is the 2025 season (below); it was parked by measurement, not by neglect, so
re-opening it is Briggsy's call and it comes with an error budget attached.

**Standing work that is not a task:** the mule hauls hourly, the watcher watches, the newsletter
publishes nightly at 21:45, and `python scripts/build_board.py --verify-only` is the draft-morning
sanity check. None of that needs touching.

**DECIDED 2026-08-08 — recorded so nobody reopens them as oversights:**
1. ✅ **NO K BASELINE. K `vorp` stays carried, deliberately.** Briggsy's call.
   The reasoning, so nobody reopens it as an oversight: the curve exists and `recompute_vorp` needs
   a curve **and** a baseline, but `meta.vbd.baselineWaiver`'s four came from a **Thunderdome sim,
   300 rooms × 16 seasons** that cannot be reproduced here. The mechanical answer (**K9** — 8 teams
   × 1 kicker rostered, the 9th free on waivers) is defensible but is **not** how the other four
   were produced: QB12 and TE12 in an 8-team, 1-starter league imply rostered backups, and nobody
   rosters a backup kicker. **A fifth baseline derived by a different method is a fabricated number
   wearing a measured one's clothes** — and the part that actually affects a draft decision, the
   tiers, is already derived. **Reopen only by re-running the sim**, not by picking a rank.
2. ~~**THE LABEL `carried:kdef-tier-flat` IS FALSE FOR K**~~ ✅ **FIXED 2026-08-08 (Briggsy's call:
   re-map the constants onto the new tiers).** It had been false since the consensus re-rank moved
   kickers while their carried vorp stayed pinned to whichever **player** held it — measured at
   `917c498a`, K tier 2 held `{6.0, −2.0}` and tier 3 `{−2.0, 6.0}`. DEF was correct only by luck:
   its ordering had not moved. `build_board.repin_carried_to_tiers()` now pins the distinct
   constants to the distinct tiers, best to best, on **every** build — K 16/6/−2 → tiers 1/2/3, DEF
   27/14/4 unchanged (a no-op there, which is what proves the mapping is the one the board was
   built with). **Nothing invented; 3 vorp values moved, all kickers.** It **refuses** rather than
   guessing when the counts disagree — four constants across three tiers was never flat-per-tier,
   and collapsing it quietly would put an invented number under a label saying it was carried.
   3 mutants planted and killed, including the call site (insight 013).
3. ⚠️ **DO NOT BUILD A DEF CURVE — the 14 DEF rows should stay labelled.** Sources probed live
   2026-08-08, HTTP 200 and columns actually read: `player_stats_def_2024.csv` is **player-level**,
   so sacks/INT/FF/FR/TD/safety must be aggregated to a team, and **it does not carry points
   allowed at all** — the largest and most volatile term in the DST ladder (0 pts → **10** … 35+ →
   **−4**). That has to come from `nfldata/games.csv` (`home_score`/`away_score`, verified 200),
   and **Sleeper's points-allowed convention is not confirmed** — whether it charges the defense
   for points the *opponent's* defense/ST scored is exactly the kind of unstated rule that produces
   a confident wrong number. Blocked kicks (2 pts) have no clean team-level source either. **This
   is the same argument that parked 2025:** a narrower EXACT basis beats a wider approximate one,
   and a DST curve carrying unquantified convention error would be a fabricated number in a column
   the board sorts by. Reopen only with a measured error budget, as its own unit.
**◀ THE ONE OPEN ITEM — the curve stops at 2024, and re-opening it is a decision.**
`player_stats_2025.csv` and `stats_player_week_2025.csv` are both **404** (re-verified 2026-08-08
by HTTP status, twice). 2025 exists only as `play_by_play_2025.csv.gz` (HTTP 200, 48,771 plays,
already cached), which needs nflverse's stat builder reimplemented. **Prototyped and MEASURED, not
assumed:** PBP aggregation reproduces **554 of 607** player-seasons exactly, 20 within 2 points,
and **33 off by multiples of six** — touchdown attribution (laterals, fumble-recovery TDs).

**The tension, stated plainly, because it is the whole decision:** a 2022-2025 window is one season
fresher and the freshest season is the one that best describes today's league — against ~5% of
player-seasons carrying unquantified attribution error, in the table every `vorp` on the board is
subtracted from. This project's precedent is that a narrower EXACT basis wins, and that precedent
is why it was parked. **If it is re-opened it needs its own unit and its own error budget** —
"reproduce nflverse's own weekly totals exactly, or state the residual per position and gate on
it" — not a quiet swap of the seasons list. Note the K curve just built is 2021-2024 too and would
have to move with it.

**The archive question is DECIDED (Briggsy, 2026-08-08): back issues are gitignored.** The
deciding argument was his: `newsletter/data/archive/` — the cargo each edition is built from — was
already ignored "for zero value", so committing the edition while ignoring its own inputs was
backwards. `newsletter/family-feud-newsletter.html` **stays tracked**, the way every generated
surface in `draft-kit/` is. Accepted consequence, written into `.gitignore`: a clean clone restarts
edition numbering at #1. The nightly job leaves exactly one modified tracked file, which is
meaningful — *tonight's paper is newer than what's committed* — and it gets committed at squeaky.
**No auto-commit in the scheduled job**, deliberately: no unattended process writes to git here.

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
gate went **13 findings → 0** by fixing surfaces. **682 tests**, 0 skips on this machine
(`python -m unittest discover -s tests` from the root); on a clean clone it is 682 with **11 skips**
— 2 live-cargo probes plus **9** that need the gitignored consensus/ADP caches
(`draft-kit/cache/fp_ecr.csv.gz`, `player_ids.csv.gz`, `ffc_adp.json.gz`). Re-measured 2026-08-08 by
actually hiding all four paths and naming every skip, not copied from the previous line — which had
aged to `628 / 10 / 8` and was wrong on all three. Verified by eye, not only by tests: the cheat sheet is **2 pages
— the whole 174-row board on page 1**, the plan on page 2 — and the HTML board renders shape-driven
round labels with no invented rounds.

**Everything below is detailed in**
[`docs/plans/2026-08-07-001-refactor-rebuild-the-machinery-plan.md`](docs/plans/2026-08-07-001-refactor-rebuild-the-machinery-plan.md).
The plan owns *what to build*; this file owns *what's next*.

**⏳ The draft date STILL does not exist.** Re-pulled from cargo stamped **2026-08-08 20:46**
(all **12** sources `ok`): `status: pre_draft`, `start_time: null`, `draft_order: null`, **6 of 8
seats filled**, `type: snake`, `reversal_round: 0`. Parked at 6 seats for ~27 hours. `~Aug 29` is a handshake — **it can move earlier.** Assume no slack.
The board's header now says "Draft date not set" rather than asserting a date the draft object
does not carry.

---

## 0.5 Review residue — **ALL 10 CLOSED 2026-08-08**

From the 2026-08-08 ultramode pass. Nothing here is open. Kept because each entry records a wrong
answer that looked right, and several are shapes that will recur.

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
4. ~~**`strategy` prose hardcodes baselines and league shape** (KTD-1 + KTD-7).~~ ✅ **FIXED
   2026-08-08.** Two halves, deliberately fixed by two different mechanisms.
   - **The slot labels are DERIVED.** `shape.strategy_slot_ranges()` splits `meta.shape.teams`
     into near-equal bands, remainder to the earliest, and `enrich()` restamps each
     `slotNotes[i].slot`. **It reproduced the hand-typed `Picks 1-3 / 4-6 / 7-8` byte-for-byte**
     — proven before being trusted, the way `format_line` was, and confirmed a third way: a full
     rebuild left `draft-kit/` byte-identical. A 10-team room now relabels to `1-4 / 5-7 / 8-10`.
     **The `note` is untouched** — that prose is judgment about drafting from the front, middle or
     back of a room, and it does not become wrong when the room grows.
   - **The baselines are CHECKED, not templated.** Deriving that sentence would put an f-string in
     the one place the voice lives. `validate_board.baseline_claims()` reads the numbers back out
     of the prose and the gate compares them to `meta.vbd`.
   - ⚠️ **A blanket `(QB|RB|WR|TE)\d+` scan — which is what the prescription said — would have
     been a false-red machine.** Measured before writing it: the live board's `roundPlan[1]` says
     `"RB2"` and `slotNotes[2]` says `"WR1"`/`"RB1"`, all tier shorthand, none of them baselines.
     The check is anchored on the word *baseline* instead. That anchor is also a blind spot
     (rename the clause to "replacement levels" and it silently reads nothing — insight 006), so
     it ships with a **positive control** asserting it still finds four claims on the live board.
   - 4 mutants killed. Mutant 2 (remainder to the last bands) was caught by **6** tests including
     byte-stability, which is what proves the derivation reaches the emitted surface.

   **Why the old-value sweep never caught these:** it sweeps *quantities that changed between two
   builds*. These had not changed, so there was nothing to compare — they were wrong only in the
   sense that nothing would have noticed if the league moved underneath them.
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

**Escalated on a materiality split — FULLY CLOSED 2026-08-08.** The row-level `sleeperId` U6 stamps
has both its readers now: **U7's poll loop** (browser-verified against the lab feed) and **the
engine**, which no longer joins through `sleeper_ids.json`.

**It was not done blind.** The old engine WITH the ledger in cwd and the new engine WITHOUT it
produce **byte-identical advisories** on the 120-pick lab feed at prefixes 1, 3, 5, 20, 60, 119 and
120 — every line except the provenance line, which was reworded on purpose to name its source.
- **The ledger did not go away.** It is still the resolver's provenance record, still what
  `resolve_sleeper_ids.py --verify` re-asserts, and still the fallback for a pre-U6 board. What
  changed is that the two can no longer disagree with the engine silently preferring the older one.
- **`--full`'s replay no longer copies `sleeper_ids.json` into the work dir**, so a regression back
  to "the ledger must be in cwd" cannot replay green here and fail on draft morning.
- ⚠️ **Four existing tests went red and every one of them was right to.** They prove the NAME-JOIN
  safety net (the JAC/JAX bucket, the "STILL on BEST AVAILABLE" warning, the "not shown" wording)
  and reached it only because the board had no ids in reach. Their picks carry `player_id` = the
  pick number, so with a complete id set the engine correctly reads "an id we do not hold" as "not
  one of our 174" and inverts the escalation's wording — the tests were asserting the old sentence
  about an input that now means something else. They run against `real_board_without_ids()` now,
  which is the world each was actually written about, **and a new test asserts the better outcome
  on the same input**: with ids, the drifted Jaguar is joined on his id and never reaches the
  escalation at all.

---

## 0. Start with `/brief`

Twenty insight docs now exist. Each has a documented wrong answer that looks right. Read them
before designing, not after debugging.

**Read [`020`](docs/insights/020-the-cdn-served-a-contiguous-prefix-and-every-gate-passed.md)
before trusting any feed on draft day.** The Sleeper picks endpoint is Cloudflare-cached and the
un-busted URL was **behind on 76 of 77 observations of a live draft, by up to 16 picks**. A stale
response is a CONTIGUOUS PREFIX, so it passes the gap gate, the duplicate gate, the contamination
gate and the engine's integrity gate — every guard here checks *shape* or *provenance*, and none
checked *freshness*. **U7 already knew and had fixed it in the browser**; the lesson never reached
the Python fetch site, which is insight 005's meta-lesson landing a second time.

**Read [`019`](docs/insights/019-the-mutants-only-probe-the-axis-you-already-suspect.md) before
trusting a green mutation run.** Four mutants were planted on the depth correction, all four were
killed, and the shipped code still had a critical off-by-one on **150 of 150 rows** — because every
mutant probed *which population is ranked* and none probed *who is in the comparison*. **A mutation
suite measures the imagination of whoever wrote the mutants.** Worse, a test written in the same
pass **asserted the bug**: a bound that is genuinely correct for a player the board OMITS was
generalised onto a player the board CARRIES, because one function answered both questions. An
adversarial fleet found it on a run where everything was already green — which is exactly the state
where review is most likely to be skipped and most likely to pay.

**The other new one, to read before touching any comparison, join or "disagreement" metric:**
- **[`018`](docs/insights/018-the-bias-was-the-only-thing-producing-findings.md)** — correcting the
  depth artifact in `consensus.py` took its findings from six to **zero**, because the artifact was
  the only thing producing them. Underneath sat a tautology: `rerank.py` builds the board's ordering
  from the very list the board is being compared against. **Before trusting any disagreement metric,
  check whether the two sides share an ancestor** — and if a bias correction empties your results,
  that is a result, not a regression. **A tautology that prints six findings is far more dangerous
  than one that prints none.**

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

## 2. Build order — **COMPLETE.** Every unit below is shipped

```
U9 ✅ → U3 ✅ → U14 ✅ → { U4 ✅ ∥ U5 ✅ } → U6 ✅ → { U7 ✅ ∥ U15 ✅ } → U8 ✅ → U10 ✅ → U11 ✅ → U12 ✅ → U13 ✅
```

**Kept, not deleted, and not as a diary.** Each entry below carries the measured limits and the
traps found while building it — the `--full` prefix that catches the `vbdDelta` break, the two
documented VORP limits, the Wire's full-name-only rule and what it costs. Those are the constraints
on the next change, which is why they stay. The ✅ prose is how you know a limit was *measured*
rather than assumed.

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
  test pins the property, not the number). **BORN RED with 13 findings, all real drift**:
  `meta.updated` claimed Aug 5 while its inputs were dated Aug 7-8 (**4** — U5's `vorp_curve.json`
  became a fourth stale-input witness the moment it shipped) · eight `meta.vbd` numbers hardcoded as
  literals in the board HTML's prose (8) · the cheat sheet held 150 of 174 rows, missing every K and
  DEF (1). **All thirteen fixed by U6.**
  **Re-measured 2026-08-08 18:00 — `--fast` and `--full` BOTH exit 0**, each printing
  `174 rows, every check passed`, preceded by
  `[checked] meta.shape against live draft 1390509994847240192 (cargo 30 min old)`.
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
- ~~**U13 stub the in-season cadence**~~ ✅ **SHIPPED 2026-08-08.** [`docs/in-season-plan.md`](docs/in-season-plan.md).
  A planning document, no code, no tests — but written against **live payloads pulled 2026-08-08**,
  not against the plan's description of them, which is the whole point of a stub.
  - **Un-stub trigger:** `/state/nfl` flips `season_type` `"pre"` → `"regular"`. Measured today:
    `{"week": 1, "leg": 0, "season_type": "pre", "season_start_date": "2026-08-06"}`.
  - **Four endpoints the mule would need, all probed live:** `/state/nfl` (200, the keystone —
    everything else is keyed by week and nothing on disk knows the week), `/league/…/rosters`
    (200, **8 rosters already exist**, `owner_id` null on the 2 empty seats, `starters` is ten
    positional slots of `"0"`), `/league/…/matchups/1` and `/league/…/transactions/1` (200, **`[]`**).
  - ⚠️ **`[]` is a VALID payload and `validate_cargo.py` accepts it** (`ok (2 bytes, 0 entries)`,
    exit 0) while rejecting `null`. Do **not** "harden" the JSON sources to require `entries > 0` —
    that reds the mule through the whole pre-season and every quiet week. The consequence to carry
    instead: for matchups and transactions, empty and broken look identical, so the cargo timestamp
    stays the only health signal.
  - ⚠️ **The plan's own U13 text says to record "the confirmed waiver timing." It is not
    confirmed** — another plan fact that expired. `waiver_day_of_week: 2` with `waiver_type: 0`
    (rolling priority, so `waiver_budget: 100` is inert). The Wednesday reading is a citation from
    2025 history that **cannot be reproduced** — `previous_league_id` is still null, re-confirmed
    today. The doc says: do not hardcode a day, watch the first live cycle.
  - ⚠️ **Recorded trap: the VORP curve is not a weekly projection.** It is a pre-season
    rank→points lookup over full seasons 2021-2024. Reusing it for a Sunday start/sit would emit a
    confident number containing no weekly information. Named explicitly so nobody reaches for it.
- ~~**U12 schedule the newsletter**~~ ✅ **SHIPPED 2026-08-08.** `scripts/install-newsletter.ps1`,
  task **Family Feud Newsletter**, **daily at 21:45** — sixteen minutes behind the mule's :29 haul
  and ten behind the watcher's :35, so it races neither. Verified registered and green; next run
  21:45 tonight. Re-register after any folder move:
  `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\install-newsletter.ps1`
  - **A prerequisite defect was found and fixed first.** `edition_number()` was
    `count of *.html + 1`, so a second build in one day wrote a same-dated `-edition-2` AND added a
    permanent +1 to every edition after it. **U12's own installer force-runs the job to verify it**,
    so U12 would have minted the phantom itself on install day. It is now idempotent per day:
    today's issue is republished in place, and the count is over **distinct days**, not files.
    Proven by running the real build **three times on 2026-08-08** — still Edition #1, still one
    file in the archive. Two mutants killed, 4 tests each, including the call-site test (insight 013).
  - **Health is proven by OUTPUT FRESHNESS, not `Last Result`** — and that probe has a
    **positive control**, not just a comment. A throwaway task that exits 0 while writing nothing
    was registered and run: it reported `Last Result: 0` (the lie reproduced) and the edition's
    mtime did not move, so the installer's `$after -le $before` throw fires. Insight 007's exact
    shape, tested rather than asserted. The number is also read back out of the rendered page, so a
    green run proves the file on disk is the one this run produced.
  - **The nightly job does not touch git.** See the archive decision above.
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

**Superseded 2026-08-08 by the consensus re-rank** (`scripts/rerank.py`). The claim that once sat
here — *"within a position nothing reordered, RB1 is still RB1"* — was true of the VORP recompute
and is **false now**: `pr` itself is re-derived, so positions reorder by design. Chase is board #1
and RB1 changed hands from Gibbs to Bijan. What has not changed is the mechanism: vorp is still a
rank→points lookup with `pr` as its input, monotone in `pr` by construction, and the
**cross-positional** comparison is still the only thing VORP is for.

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

- `/league/1390509993844809728/users` — **6 of 8** seats filled (mule cargo 2026-08-08 17:29). Was
  4 earlier on Aug 7 — **the room is filling**, and it has been parked at 6 for ~22 hours
- `/draft/1390509994847240192` — **`draft_order` is still `null`** (17:29 cargo). Read your slot from
  `draft_order["1390750540631150592"]` and **nothing else**
- `/league/.../rosters` — proves which roster_id is whose (Briggsy = roster 3)
- `/draft/.../traded_picks` — `[]` on Aug 7

Then run the engine **through the wrapper**, from the repo root — it re-reads all four of the
above from the draft object itself and arms the contamination gate for you:
`python scripts/run_engine.py` (add the slot — `run_engine.py 3` — until `draft_order` fills).
Start with `--dry-run` to see every value and where it came from before anything advises you.

---

## Landmines

Full set in [`CLAUDE.md`](CLAUDE.md); [`docs/insights/`](docs/insights/) has the twenty worked cases.
The four that bite hardest under time pressure:

- ⚠️ **NEVER RENAME `newsletter/data/inbox/` OR `draft-kit/cache/` TO SIMULATE A CLEAN CLONE.**
  Hit for real 2026-08-08 at 22:29: the hourly mule fired while `inbox/` was renamed away,
  **recreated it from scratch**, and the restore then failed with `FileExistsError` — which aborted
  the rest of the restore loop and left **three cache files orphaned as `.hidden`** behind an error
  message about something else entirely. No damage, purely because the mule re-fetched all three
  caches in the same run (verified sha256-identical) and `.gitkeep` was recoverable — that is the
  mule being resilient, not the technique being safe. Two rules if this measurement is ever needed
  again: **copy the repo to a temp dir instead of renaming in place**, and if you must rename, make
  the restore loop `try/except` per path so one failure cannot orphan the others.
- ⚠️ **`meta.updated` IS INPUT FRESHNESS, NOT A BUILD CLOCK — do not put `today` back in its
  floors.** It was `max(today, dump_fetched_at, three mtimes)` until 2026-08-09, which quietly made
  a data field into a build timestamp: measured, a rebuild the next morning rewrote
  `players_data.json`, the board HTML, the cheat-sheet PDF **and** `ranking-methodology.md` with
  byte-identical data. The gate's rule is one-sided (`if when_d > claimed_d` — it only complains
  when an input is NEWER), so `max(inputs)` satisfies it and `today` bought nothing. **When the
  build ran is `meta.build`'s job.** Mutant Q1 restores the bug and turns two tests red together.
- ⚠️ **A test whose green depends on the board having been built TODAY is a time bomb.**
  `test_an_unchanged_rebuild_is_byte_stable` compares the committed board to a fresh rebuild, so it
  silently encoded that assumption and went red at midnight after a full green session. It is fine
  now only because `meta.updated` stopped moving — if a future stamp becomes clock-derived again,
  this test is where it will show up, at 00:00, looking like something else.
- **A screaming engine means STOP.** Re-fetch, re-merge, rerun. Never advise off a `picks.json` it
  refused.
- **A silent engine can also be wrong.** `picks.json` is gitignored, so a spent mock's picks are
  invisible to `git status`. Both `merge_picks.py` and the engine now refuse them — but only the
  engine's check fires if you skip the merge, and only when you pass the draft_id.
- **Presence is not health.** `Last Result: 0`, `NumberOfMissedRuns`, and the mule's `12/12 ok` are
  all untrustworthy. Only the cargo timestamp in `mule_status.json` proves life.
  ([`007`](docs/insights/007-presence-is-not-health-the-third-instance-of-one-pattern.md))
- **A foreign source's parameter can be decorative.** Fantasy Football Calculator accepts
  `teams=8`, echoes it into `meta.teams`, and returns **byte-identical ADP to `teams=12`** for all
  256 players — verified 2026-08-08 by diffing the two responses. Never trust a knob because the
  response repeats it back; diff two settings before building on one.
- **`normalize.norm` STRIPS DIGITS.** `norm("P1")` is `"p"`, so synthetic fixture names like
  `P1..P40` all collapse to one key and every row hard-stops as ambiguous — a fixture that
  measures nothing while looking busy. Use alphabetic names in any join fixture, and assert the
  fixture actually joined before trusting what it reports.
- **JAC/JAX is not finished — it recurs at every new foreign boundary.** U14 fixed it in the
  board's own field; FantasyPros still says `JAC`, which silently cost the Jaguars defense its
  consensus row until `rerank.FOREIGN_TEAM_ALIASES` normalised it. Fixing the ROOT applies to
  fields we own; a foreign source needs an adapter at the boundary. Expect the next source to
  need one too.
- ~~**`rss_nbc_edge` is not RSS.**~~ ✅ **RETIRED 2026-08-08 (U10).** It returned HTTP 200,
  ~793 KB, `Content-Type: text/html`, zero `<item>` elements — failing content-type, parse *and*
  item count while passing the only check `Fetch-Source` ran (`size > 50`). **ProFootballTalk**
  replaced it. The wire now carries **5 working feeds, 145 items**. Do not restore the old URL:
  it is not broken, it was never a feed.
