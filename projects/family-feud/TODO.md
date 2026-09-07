# Family Feud — TODO

> **Actionable next-actions only.** No session history — `git log` has that.
> Re-ranked every session, so never cite "item N" anywhere; cite the title.

## 🏈 THE REAL DRAFT IS DONE — 2026-09-06, 8:33–9:41 PM, draft `1390509994847240192`, seat 6

**Pre-Week-1 action — DONE 2026-09-06 ~9:50 PM, verified on `/league/.../rosters`:** Tank Dell sits in
`reserve` (IR), **Minnesota Vikings** in the DEF slot, 17 players (16 + IR). Still open:
1. **Lineup check:** the API showed **Drake London on the BENCH and Chris Godwin starting** at WR
   after the IR move — Sleeper's default ordering, not a choice. London (board 11) starts over
   Godwin (board 71). Fix in the app before Thursday's kickoff.
2. Optional: drop Wan'Dale Robinson for **Kenny Gainwell** (RB, TB — top undrafted on the board);
   Zach Charbonnet (PUP) is a second IR stash if the league's IR setting accepts PUP.

**Roster as drafted (16):** Taylor, Chase Brown, London, Collins, Flowers, Maye, Swift, Fannin,
Odunze, Stevenson, Godwin, Pittman, Pollard, Wan'Dale Robinson, Bates (K), Dell (IR stash).
Board VORP total ranks **1st of 8** seats; Hunter's (seat 3) ranks 6th — ordering only, never a
margin (insight 023). Briggsy overrode twice: Flowers over Maye at #38, Pittman over Pollard at #91.

**Draft-night landmines for the debrief / distill (not yet folded into the runbook or skill):**
- `ffQueueSync` with `{rebuild:true}` and any bridge call over ~3 DOM ops **timed out the CDP
  evaluate at 45s** four times in a live 8-human room while picks were landing; once it left the
  queue EMPTY between two of our picks. The side effects still ran. Rule that held: **2 ops per
  call, read the queue back in the same call.**
- Sleeper's room strips name suffixes: `Kenneth Walker`, `Luther Burden`, `Harold Fannin`,
  `Marvin Harrison`, `Michael Pittman`, `Kenny Gainwell` — every `III`/`Jr.` board name missed.
- The draft-room tab left the extension's tab group once (before the gun); the queue survived
  server-side, the bridge did not. Re-paste took 10s. Keep the paste file in `temp/`.
- The runbook's post-draft rule stands: **do NOT build in-season cadence** until `/state/nfl`
  reads `season_type: "regular"` (`docs/in-season-plan.md`).

## ▶ WHERE WE ARE — read this first, update it when it changes

```
plan ✅ → deepen ✅ → work ✅ (U6) → ultramode ✅ → work ✅ (U15·U7·U8·U10·U11·U12·U13)
  → review residue ✅ (all 10) → engine join ✅ → provenance ✅ → consensus ✅ → re-rank ✅
  → ADP ✅ → mule v2.1 ✅ → mock proven end-to-end ✅ → CDN staleness fixed ✅
  → harness leg (c) keep-the-queue-ranked ✅ → leg (b) the ladder precomputer ✅
  → leg (d) KILLED, opponents MEASURED instead ✅ → the board's error bars measured ✅
  → the opponent prior FAILED its floor control ✅ → realised value measured ✅
  → the realised curve FAILED its backtest, board UNCHANGED ✅
  → the harness's own defects found and fixed ✅ → board RE-RANKED on the 08-14 ECR ✅
  → the browser half LIVE-PROVEN, an API-confirmed pick ✅ → the room mapped into a skill ✅
  → the 2-minute dress rehearsal RUN, by a session that did not write the skill ✅
  ── 2026-08-15 — **THE LOOP FITS, and the repo's "too slow" claim is now dead.**
    Seven picks fired on a live 120s clock (mock `1394479498451251200`, seat 5): worst case
    used **61 of 120s**, typical **24-28s**. All 23 script invocations totalled **5.28s** and
    the engine never exceeded **0.18s** — **96-98% of every on-clock second was round-trip and
    agent latency.** The only levers are FEWER ROUND TRIPS and SHORTER OUTPUT, never faster
    Python. Numbers: [`insight 026`](docs/insights/026-the-loop-fits-and-the-scripts-were-never-the-cost.md).
    **946 tests · 23 test files · 23 scripts · 27 insights** *(as of that date — current counts are
    in the 08-17 block below, and this line is history)*.
    Two things that were only ASSERTED are now MEASURED: a deliberately blown clock took our
    queue-top (#60 = DJ Moore), and `picked_by` stamped our id on that pick we never made.
    ▸ **2026-08-17 — TWO ADVISORY FIXES SHIPPED, ONE FEATURE MEASURED AND REFUSED.**
    **`THE WAIT`** now prints the pick after next and the opposing-pick gap — the denominator of
    every now-or-later call, which the engine always knew and never said out loud. **The ⚠ CLIFF
    badge stopped crying wolf:** it fired on K/DEF at pick 19 in the same livery as the real
    decision of the pick; it now fires only on tiers holding a player in BEST AVAILABLE, which is
    scale-free (9 alarms → 4, and K/DEF arm themselves late with no round threshold hardcoded).
    🚨 **And the availability indicator — "will he be there at my next pick?" — was built,
    measured against 7 real human drafts, and DELIBERATELY NOT SHIPPED.** It beats its base rate
    by +0.095 pooled and is **negative at every gap in the only 8-team room we hold.**
    [`insight 027`](docs/insights/027-the-availability-model-works-in-every-room-but-ours.md).
    ✅ **AND THE QUEUE GAP IS CLOSED** — `ffQueueSync` fired all four paths in a live room in
    **2.3s**, verified by reading Sleeper's queue back rather than trusting per-call results.
    ⚠️ **Sleeper shipped a broken bundle that day and then fixed it** (`d308ab2e` → `a4db3d0e`);
    every draft room rendered an empty `#root` for hours. **Diagnose that with the bundle hash** —
    four plausible causes were chased and all four were wrong, including tab visibility. The
    skill's landmines carry the full list so nobody repeats them.
    `draft_order` populated on the real draft 2026-09-03 (Briggsy seat 6); it had populated correctly on the mock first.

  ── 2026-08-23/24 — **THE EXECUTOR MOCK WON ITS ROOM ON THE FRESH BOARD, AND EVERY READER
    SURFACE GOT ITS DRAFT-WEEK TUNE-UP.** **1187 tests · 28 test files · 26 scripts · 33 insights.**
    ✅ **THE BOARD IS RE-RANKED ON THE 2026-08-21 ECR** (120 moves; McBride 17→20 and OUT of
    tier 1, vorp −58; top 16 untouched). The refresh's first collision with the replay gate is
    fixed at the root: fidelity replays against the board AS DRAFTED (frozen fixture
    `tests/fixtures/board_as_drafted_20260819.json`), property tests stay on the live board.
    ⚠️ The refresh commit `bfe5ee12` went out past a red suite — a `;` where the chain needed
    `&&`; owned in `eda135ba`'s message. The remaining Aug-27 payloads (long-TD curve fold,
    board-membership look: Wan'Dale/Michael Wilson — **a third Wilson sighting at #79 of the
    executor mock**) are STILL OWED at the refresh.
    ✅ **EXECUTOR MODE, LIVE, ON THE NEW BOARD: first place again** (mock `1397335874177396736`,
    seat 5, 15 fires, 15 API confirms, ~30-60s/window, zero close clocks; startable 2181, +31
    over 2nd). **Lamar at #28 = the first draft to cash the QB market edge** — the delta queue
    surfaced him top in round 4, exactly the fall `market.py` predicted. The morning's ladder
    identity fix ran live all game (every mock ladder diverted to `ladder.<mock_id>.json`).
    Honest note: the delta queue built a 2-RB roster with zero RB bench — fine vs bots,
    **human-eye override lane on draft night**. Display-name landmines confirmed twice more
    (Fannin/Godwin/Pittman lose their "Jr." in Sleeper's search).
    ✅ **MONITOR 2 IS DRAFT-WEEK READY:** draft-id input beside Go live (paste a mock URL, id
    extracted; override visible in input+URL only, NEVER localStorage; off-size rooms refused;
    mock named in the live bar's words) · the whole header PINS — title through tabs (Briggsy's
    call, stated twice; a folding masthead shipped for an hour and was declined — **do not
    reintroduce it**; sticky child in a parent box is a no-op, the header itself is sticky).
    ✅ **THE NEWSLETTER'S FOUR FIXES:** Board Version = `meta.rankings.synthesized` (it read
    `meta.updated` and said "Aug 9" across two re-ranks) · healed stale-cargo alarms are DROPPED
    from the paper (his call; still-stale keeps its alert, both directions pinned; the FILE keeps
    all history) · wire headlines carry local-time pubDate stamps · wire links open new windows.
    ✅ **THE FOUR LINES carry (POS, Team)** after the name — his post-mock tweak, in the runbook
    template + all three worked examples.

  ── 2026-08-21 — **THE ADVISOR-MODE MOCK RAN CLEAN, END TO END, AND D-A IS MEASURED.**
    Mock `1396604748777418752` (8-team/15rd/5:00, seat 5, Briggsy on his phone): **13 picks
    advised in the four lines under a live clock, zero timeouts, zero missed wakes; warm path
    measured 20-40s from clock-start to advisory, every cycle.** It took EIGHT rooms to get
    there — five died of four stacked orchestration defects plus one delivery defect, all
    named and structurally fixed (persistent Monitor replaces one-shot watchers; advisory =
    final message of its turn; room-preconditions checklist; AUTOPICK-off after any burn):
    insights [032](docs/insights/032-the-loop-died-of-a-manual-step-six-rooms-in-a-row.md) ·
    [033](docs/insights/033-the-advisory-that-was-posted-but-never-rendered.md), runbook
    §"The advisor loop that finally ran clean". **D-A: blown-clock fallback took Jameson
    Williams (#53, deliberate) and Bhayshul Tuten (#60, accidental bonus) — list-shaped, not
    roster-shaped; consistent with pure best-available off Sleeper's list** (campaign-1 doc
    D-A block has the full record + what it does NOT prove). Also shipped same morning:
    the `precompute_ladder --cargo FILE` self-vouching overwrite closed for real (identity
    now only ever from the mule's inbox), 1181 tests.

  ── 2026-08-18 (12 commits, 999 → **1066 tests**) — **THE RANKED QUEUE IS EMPTY, AND THE THING
    THAT EMPTIED IT FOUND FOUR BUGS NO TEST WAS EVER GOING TO.**
    Items 9-12 all closed, plus a jargon sweep of the product's own words. ✅ **The re-created-draft
    remedy** (the detector had shipped 08-14 with no remedy) · **`merge_picks` stops telling you to
    retry a 404** · **`--slot` is optional and the derived-seat tautology is DECLARED** ·
    **`precompute_ladder` has a traded-picks gate** and **`parse_cliffs` stopped inventing players**
    · **33 tests for `render_html`** · six stale doc surfaces · [`insight 029`](docs/insights/029-the-line-numbers-rotted-while-i-was-writing-the-doc.md).
    🚨 **THREE OF THE FOUR REGRESSIONS WERE MINE, SHIPPED THE SAME NIGHT, AND EVERY ONE WAS FOUND BY
    RUNNING THE THING RATHER THAN BY A GREEN TEST:**
    - **The `--cargo FILE` form I added, then wrote into the runbook with a ✅, could overwrite the
      live `ladder.json`.** `cargo_draft_id` joined `sleeper_draft.json` onto a path already a file,
      returned `""`, and `resolve_out`'s `if real and draft_id and …` short-circuited to the live
      path. **The runs that could not be ARMED were exactly the runs allowed to OVERWRITE.**
      1057 tests were green over it — every `--cargo FILE` test passed `--out` and `--draft-id`,
      the two flags that disable the guards the form breaks.
    - **My first circularity warning was a FALSE RED.** `parse_provenance` keeps the whole
      `[checked] …` line as ONE string, so filtering whole lines announced *"NOTHING has
      independently confirmed the seat"* on a run where `against our own picks` sat in that line.
      The test passed because it only asserted the word CIRCULAR.
    - **The board notes still carried the jargon the format bans** — and the format names those
      notes as THE CALL's only legal source, so the rule and its source contradicted each other.

  ◀ HERE (2026-08-17 overnight, 17 commits) — **THE PRODUCT IS WRITTEN DOWN, AND FIVE WAYS THE
    ENGINE COULD HAND OVER A CONFIDENT WRONG NUMBER ARE CLOSED.**
    **1066 tests · 24 test files · 23 scripts · 29 insights · 14/14 mule sources.**
    ✅ **THE FOUR LINES EXIST** — `docs/draft-day-runbook.md` *Advisory format*, replacing the old
      ~5-line one. There is ONE format now. Three worked examples, all real engine output against
      `lab_feed_120.json` at seat 3, plus a BANNED list (no margins · no availability % · no
      "he'll never last" · never call the QB rule proven · never invent a player fact).
    ✅ **`/traded_picks` HAS A READER.** It had ZERO, and one traded pick voids "your next pick is
      #N" and "picks until you" for the rest of the draft, exit 0. It classifies rather than
      blanket-refuses: OUR pick traded → refuse; two other teams → warn and keep drafting.
    ✅ **THE SEAT STOPPED PROMISING A CHECK IT CANNOT RUN.** A typed seat printed "the engine
      cross-checks it" while BOTH oracles were structurally empty pre-draft. Now prints
      `🚨 NOTHING HAS CHECKED IT` — and `--cargo` is documented (it was in zero docs).
    ✅ **THE EMPTY QUEUE STOPPED READING HEALTHY** — and a SECOND masked state turned up: a blind
      panel (label says QUEUE(3), zero rows) also returned `agrees:true`, which is worse because it
      produces a wrong ACTION.
    ✅ **A MOCK CAN NO LONGER OVERWRITE THE LIVE `ladder.json`** — it happened TWICE in one session
      while testing, leaving a dead lab queue where auto-pick would drain it.
    ✅ **THE ENGINE PRINTS THE SCOUT NOTE** (top 5) — the "one clause of why" — and now prints the
      between-seats line **while you are on the clock**, which it never did. Line 4 of the advisory
      is exactly that question, so its own denominator had been missing.
    ✅ **THE BOARD HAS A RUNBOOK STEP** (it never did) and was verified live on the real draft.
    ✅ **THE LONG-TD BONUS IS MEASURED** — `build_curves.py --long-td-probe`. See the ranked list;
      the reason it is safe is NOT that it is small.
    🚨 **THE STANDING LESSON OF THE NIGHT:** three separate defects were found by WRITING THE
      WORKED EXAMPLES, not by reading code. Composing the actual advisory is the strongest test
      this repo has of whether the engine says what a human needs.
```

## 🎯 HOW DRAFT NIGHT ACTUALLY RUNS — Briggsy's own words, 2026-08-17. Build against THIS.

Nothing in this repo said what the product IS, so a session could spend itself polishing the wrong
half. It is written down now:

> *"The main driver is the drafting strategy and adjusting in realtime as to what is happening."*

- **BRIGGSY DRAFTS. Claude advises beside him.** He may hand over the wheel mid-draft — *"there is
  a chance I let ya do my bidding w/ me just observing"* — so the executor path must stay working,
  but it is **not** the product.
- 🚨 **THE BROWSER-CONTROL WORK IS A SIDE QUEST AND HE SAID SO.** He wanted to know what was
  possible. It is now insurance — the blown-clock safety net and the option to hand over — **not
  a build priority.** Do not spend a session on it.
- **Three monitors: Claude · the board · Sleeper.** The board is a **display he reads**, never a
  control surface — it must never need a click to be useful. **The terminal drives, the board
  shows.** `draft-kit/family-feud-draft-board.html` is already live (polls `/picks` every 12s,
  greys the drafted, stamps `#pick · seat`).
- **THEREFORE THE DELIVERABLE IS WHAT CLAUDE SAYS AT EACH PICK**, not another number on a page.
  The engine already emits a rich state (BEST AVAILABLE · VBD LEANS · tier cliffs · all-8-seat
  needs · RUN WATCH · THE WAIT). **Claude is the synthesis layer.** The next build is turning that
  state into the four lines below — agreed 2026-08-17, and explicitly *"we can play with it and
  tweak it if needed"*:
  > **THE CALL** — one name, one clause of why
  > **The one I passed on** — and what would change my mind
  > **The risk** — what it costs if I am wrong
  > **Before your next pick** — what to watch
  ✅ **RECONCILED 2026-08-17 — verified against source 2026-08-18. There is exactly ONE format.**
  It lives in `docs/draft-day-runbook.md` under the heading **`## Advisory format — THE FOUR
  LINES`** — find it by that heading, never by line number: the `:575`/`:580`/`:603` numbers this
  block once quoted had rotted to `:853`+ by 2026-08-20 (insight 029 doing exactly what it says).
  The section's own closing note records that it replaced the older ~5-line shape; the 🚨 *Banned*
  heading and three worked examples follow inside it. ⚠️ **Do not go hunting for a second format —
  the "Why this shape and not the old one" paragraph quotes one line of the dead one to explain WHY
  the shape changed. That is rationale, not a template.** ⚠️ The shipped labels are tighter than the four lines quoted above
  (`THE CALL:` / `Passed on:` / `Risk:` / `Before #<next> (<n> picks):`) — **quote the runbook,
  never this block.** What is left here is Briggsy's eye on the examples, nothing else.

✅ ~~**THE ONE OPEN DECISION FOR BRIGGSY — one 30-minute mock, or none?**~~ **ANSWERED AND SPENT
2026-08-15. The single API-confirmed pick was bought and it landed.** `ffDraft` drafted Ja'Marr
Chase at pick #1; `/picks` went 0 → 1 on our slot.
⚠️ **AND THE ADVICE IN THIS BLOCK WAS WRONG, which is worth keeping.** It said *"do not buy a full
dress rehearsal"* on the grounds that only the click was unproven. **Briggsy overruled it, and he
was right:** a No-Limit clock proves the click but deliberately removes the pressure, so it cannot
answer whether the Step 3 loop *fits in 120 seconds* — the thing the repo already asserts it does
not. **A single scoped pick was the right first buy; it was never the whole bill.** The rehearsal
is now queued at the top of this file.
⚠️ The second open question below (should QUEUE lead the precomputer's output?) is still unanswered
and still one word.

**Units shipped (2026-08-14):**
- **U16** — the opponent scout (`scout_opponents.py`), 37 leagues / **7 distinct** comparable
  1QB redrafts, 24 tests, 9 mutants killed. [`docs/opponents.md`](docs/opponents.md).
  ⚠️ Its profiles are **descriptive, not predictive** — insight 022.
- **U17** — realised value of a preseason rank (`realized_value.py`), historical ADP back to
  2015 at 98-99% join coverage, 10 tests, 5 mutants killed. Insight 023.
- **U18** — the leakage-free board backtest (`backtest_board.py`), 12 held-out seasons, 4 arms
  including a floor and a QB-EARLY arm, 16 tests, 5 mutants killed. Insight 024.
  🚨 **Read insight 024 before trusting ANY simulation result in this repo, including its own** —
  four modelling errors inside it each produced a confident, different, wrong answer.

**🚨 THE ONE DRAFT-DAY CHANGE THIS SESSION EARNED: do not spend a top-3-round pick on a QB.**
Four independent lines agree (board arithmetic · 11 seasons of realised QB value ≈ 0 · the room's
2023 8-team head-to-head · the QB-EARLY backtest arm at −49.8 ± 25.6). ⚠️ **No single line clears
2σ — quote it as four lines agreeing, never as proof.** `briggsy007` takes the **2nd** QB off the
board on median, so this is also the room's most reliable source of value falling to us.

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

**ADP IS IN — `scripts/market.py`, value-vs-price.** Fantasy Football Calculator, PPR, ~5.4k drafts (5,417 on 2026-08-09; churns hourly — read
`market.py`'s header, never this line),
joined on the exact `(team, pos, normalized name)` key: **156/174, 0 ambiguous**. The finding it
exists for: this league starts 1 QB across 8 teams, so replacement is **QB12 and every QB below it
is worth negative points here** — the market prices for a 12-team room and does not know. It takes
Stafford (−30.1) at pick ~85 while letting Lamar Jackson (+106.7) fall ~21 spots past his value.
(Re-measured 2026-08-09: Lamar +106.7 exact, wait 21; Stafford −30.1 at 85 exact.)
⚠️ **The source's `teams=8` parameter is COSMETIC** — verified, `teams=8` and `teams=12` return
byte-identical ADP for all 257 players while echoing whatever you asked into `meta`. It is a
BLENDED pool; the league-size correction must keep coming from `vorp` on our side.

**THE MULE HAULS BOTH, HOURLY (v2.1).** `Run-Fetcher` invokes `consensus.py --fetch-only` and
`market.py --fetch-only`, which own their own download-validate-promote cycle; the mule records
their one line beside the other twelve sources. **14/14 ok, proven end to end** *(12/12 on
2026-08-08; `sleeper_traded` + `sleeper_rosters` added 2026-08-17)* — and proven the other
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
**39-rank K curve**, exact — nflverse publishes FG makes already bucketed by distance and the
buckets map 1:1 onto `league.md`'s bands, verified by asserting they sum to `fg_made` on all 542
REG rows of 2024 (the loader hard-stops if that ever fails). `rerank.value_bands` derives K tiers
now, because tiers need no baseline: **3 kicker tiers moved** (Dicker 1→2, Pineiro 2→3, McPherson
2→3), and exactly **3 fields on the whole board changed**, all `tier`, all K — audited field by
field. `tests/test_build_curves.py` is new, **14 tests**; that file had none.
⚠️ **BOTH NUMBERS IN THAT PARAGRAPH WENT STALE AND ARE CORRECTED HERE (2026-08-17, verified against
the artifacts).** The curve is **39 ranks, not 41** — the 08-09 baseline swap re-truncated it
(recorded further down this file: *"K depth went 41 → 39 ranks"*), and `draft-kit/vorp_curve.json`
reads `len(curve["K"]) == 39` today. And **Dicker is tier 1 again**: the live board has
`Cameron Dicker r163 tier 1`, alongside `Fairbairn r162 t1` and `Aubrey r158 t1`, which is the
elite-K trio the runbook names. Only `Pineiro 2→3` (r168 t3) and `McPherson 2→3` (r170 t3) survive.
- **The monotonicity test found a defect in the ALREADY-SHIPPED curve.** It is a mean of order
  statistics, so a rank only means something if the same number of seasons went into it. All four
  seasons supply **QB to 78, RB 135, WR 212, TE 116, K 41** — so the 80-deep curve was averaging
  three seasons past QB78 and carried a real inversion there. Now truncated per position at the
  deepest rank every season supplies. **0 inversions anywhere.** Kickers made it visible because
  they are the shallowest position there is.
- **One unstated rule, BOUNDED not assumed:** a blocked FG is neither a make nor a miss in this
  source (`fg_att` 1115 == made 937 + missed 160 + blocked 18). league.md says "miss: −1" and does
  not say which. Blocks count as misses; `--check` prints the sensitivity both ways — **0.0–1.7
  pts, mean 0.45** across the curve's ranks, i.e. immaterial.

## 🚨 HANDOFF FROM THE 2026-08-20 LUNCH MOCK (session cleared mid-day — read before any draft work)

**The advisor-mode mock RAN and COLLAPSED at pick #37** — mock draft `1390889254560739328`,
Briggsy seat 5, 8-team/PPR/**16 rounds**/120s, drafted from his phone, DRAFT COMPLETE 128/128
(feed is authoritative and re-pullable by that id; `draft-kit/picks.json` holds all 128).
Picks #5/#12/#21/#28 were advised four-lines live (Chase / Jefferson / Chase Brown / Nabers —
#12 and #28 were his overrides of the call, which is the format working). At #37 the session
spent his clock on a browser queue-sync that hung 45s instead of firing the advisory → clock
blew → seat flipped AUTO → rounds 8-16 drafted themselves. Own goals and findings, in order:

1. ✅ **CLOSED 2026-08-21 — both halves.** The 101-128 tail is examined and recorded in the
   campaign-1 D-A block: fallback filled the auto seat's DEF at #117 (R15) and K at #124
   (R16) — Dicker/Patriots is no longer n=1 — and took Stafford at #108 as that roster's
   THIRD QB. The live burn measurement (Jamo #53 / Tuten #60) is in the same block.
   ~~**D-A IS MEASURED (campaign 1) — write the insight + close the TODO item.**~~ With the queue
   holding survivors, blown clocks took **queue-top in order** (#44 Bucky Irving, #53 D'Andre
   Swift) — the net works, live, twice. With the queue DRY, Sleeper's naked fallback took:
   #60 Jameson Williams WR · #69 Christian Watson WR · #76 Tucker Kraft TE · **#85 Dak Prescott
   QB2** (its list happily benches a second QB — the exact thing our queue now refuses) ·
   #92 Alec Pierce WR · then K/DEF in the tail (picks 101-128 in the feed, unexamined — pull
   them and record WHERE Sleeper slotted K/DEF vs Mock #2's Dicker/Patriots observation).
2. ✅ **FIXED 2026-08-21, live-proven on the recorded lunch mock.** The 08-18 "fix" had handed
   the go-time FILE to the identity read, so a mock's own draft object vouched for itself
   (`real == draft_id`, same file). Split by owner now: the ARMING id may come from the passed
   file (run_engine's own behaviour — bare `--cargo FILE` arms the gate), but IDENTITY only ever
   comes from the mule's inbox — a mock diverts to `ladder.<draft_id>.json`, and an unarmed run
   can no longer skip the divert (`ladder.unarmed.json`). Pinned at the main() wiring level
   (`test_A_MOCKS_OWN_DRAFT_OBJECT_CANNOT_VOUCH_FOR_ITSELF` + positive control), runbook ✅
   corrected, poisoned live `ladder.json` deleted. 1181 tests green.
3. ✅ **DONE 2026-08-21** — the advisor-first rule is in the runbook's Step 3 preamble: advisory
   before any browser call on his clock, queue maintenance between windows only, 2 CDP timeouts
   = bridge declared dead for the session (verify syncs by reading the queue back, insight-007
   shape).
4. **Live-clock advisor sessions need a LOWER effort setting** (Briggsy's own diagnosis, and he
   is right: ultracode/xhigh latency cannot hold a 120s cadence). `/effort medium` before the
   next live run *(he set it himself 2026-08-21 before mock #4)*. Also: **an all-bot room has no
   warm window** — CPUs finish in ~20-30s, so every compose is cold, on his clock. The real
   rehearsal wants a slower room (humans, or a longer timer) — the lab's warm-path number is
   still unmeasured.

## ▶ NEXT ACTION — as of 2026-09-03, ~3 days out, draft SCHEDULED Sun 09-06 18:45 ET, seat 6

**Live state, re-pulled 2026-09-03 22:17 (cache-busted curl + fresh cargo): `status: pre_draft`,
`start_time: 2026-09-06 18:45 ET`, `draft_order` SET — Briggsy seat 6, Hunter seat 3
(`docs/league.md` → Draft order), room 8/8 full.** The ECR re-rank ran again 2026-09-03 on the
**08-28 scrape** (104 moves; Jeanty 13→28 on a `Questionable (Knee)` the board carries no note
for). **Run it ONCE MORE at ~T-48h (Fri 09-04 evening) on whatever FantasyPros has published by
then** — `consensus.py --refresh` prints the scrape date; if it still says 08-28, say so and do
not commit a byte-identical rebuild. TWO ratified payloads are still waiting for that refresh and
did NOT run 09-03 because they are Briggsy's calls, not the re-rank's: the **long-TD curve fold**
(item 4 below, EXECUTE AT THE REFRESH) and the **board-membership look** (Wan'Dale Robinson /
Michael Wilson ~19 VORP — Wilson has now gone off-board in a mock THREE times). **Jeanty's note
needs Briggsy's voice too** — a 15-spot consensus drop on a Questionable knee at pick-range 6/11
is exactly what `injury_check.py` exists to surface, and the note still reads "Feature role locked."
**Current: 1187 tests · 28 test files · 26 scripts · 33 insights** *(counts from 2026-08-24;
re-run, never copy)*. Both cockpit modes are now live-proven first-place on mocks — what remains
before the freeze is refresh payloads and draft-day logistics, not build.

### ⚑ WAITING ON BRIGGSY — decisions, not work. Nothing below moves without him.

1. ✅ **DONE — RATIFIED BY BRIGGSY 2026-08-19: *"worked examples look good."*** All three have now
   had his eye, which is the format's ONLY oracle — there is no test for whether an advisory reads
   right under a clock. **THE FOUR LINES ARE THE SHIPPING FORMAT.** ⚠️ **Do not redesign the shape
   on a later session's taste.** His standing note still applies — *"we can play with it and tweak
   it if needed"* — so tweaks are welcome; a rewrite is not. 🚨 **The one thing his read cannot
   cover is the shape UNDER A CLOCK**, which is what the advisor-mode mock below is for: he
   approved these reading them at rest, not at 2 minutes a pick.
2. ✅ **DONE 2026-08-21 — FULL 15 ROUNDS, CLEAN.** 13 picks advised under clock, warm path
   20-40s measured, D-A measured (see the 08-21 block in WHERE WE ARE). The 🚨 below is
   history — the product has now been run in its current form, live, by its user.
   ~~**ONE ADVISOR-MODE MOCK, 4-5 rounds.**~~ 🚨 **Every live measurement in this repo is EXECUTOR
   mode.** The product — Briggsy drafting, Claude advising in four lines — has never been run in
   its current form; the only advisor run on record is Mock #1 (Aug 5), which predates
   `run_engine.py`, `precompute_ladder.py`, the monitor-2 board and the four-line format itself.
   The runbook asserts *"never eat more than ~30s of his 120"* and **that number has never been
   measured.** Claude can stand the room up and pre-measure chain-exit → four-lines-delivered; the
   read and the click need his hands.
   ✅ **CLAUDE'S HALF PRE-MEASURED 2026-08-20** (lab, 3 fresh stops — #14/#51/#83, deliberately NOT
   the worked-example stops, Briggsy at work): chain 0.6-0.8s every time; chain-exit →
   four-lines-delivered **61.3s (full read) · 43.4s · 54.7s (grepped)** — all COLD composes, upper
   bounds. **So the cold path does not fit ~30s; the runbook's ~30s is the WARM path** (pre-call
   staged during the wait → on-clock lookup + delta), **which is still the mock's number to
   measure — plus the half no lab can supply: Briggsy READING four lines at 2 min a pick.** Two
   grep gaps found composing and fixed in the runbook the same day (queue grep returned 2 names;
   the roster row was absent from the act-on view, so Risk-in-roster-terms was written by
   inference at both grepped stops). THE CALL streams first and the queue stays armed, so a blown
   compose degrades to OUR queue-top, not Sleeper's board.
   🆕 **THE MOCK NOW CARRIES A THIRD DELIVERABLE — D-A from the torture-chamber campaign
   (2026-08-20): deliberately blow ONE clock with the queue emptied and record what Sleeper's
   auto-pick takes.** Insight 031: our "unattended is safe" result is rented from an n=1 model of
   that fallback; this measurement buys the deed. Costs one pick of one mock we are running anyway.
   Briggsy's working hypothesis (same day): **pure best-available, off Sleeper's own list** —
   the measurement's question is exactly WHICH LIST, because Sleeper's slots K/DEF at sane late
   spots (fills them anyway) while a skill-heavy list strands them. Record the taken player AND
   where he sat on Sleeper's visible rankings vs ours.
3. ✅ **RESOLVED 2026-08-19 — BRIGGSY: "flip it baby!"** QUEUE THIS ORDER now prints FIRST,
   directly under the gate lines; the projection and cliffs follow as context. The on-clock banner
   and the mandatory-squeeze warning still print ABOVE it on purpose (insight 016), both their
   "queue below" texts stay literally true, and the runbook's `grep -A4 "QUEUE THIS ORDER"` never
   cared about position. Pinned by `test_the_queue_LEADS_and_the_context_follows` — mutant
   (projection moved back above) planted, killed as an assertion FAILURE, restored green.
4. ✅ **RATIFIED BY BRIGGSY 2026-08-19: *"we should include all scoring rules into our draft
   board."*** The probe ran the same day (writes nothing): ΔVORP spans −0.8 to +7.8, biggest movers
   QB6 +5.9 / RB2 +6.8 / WR2 +7.8 — small and near-uniform, no rank flip in sight. **EXECUTE AT THE
   AUG 27 REFRESH:** rebuild the curve with the bonus folded in, drop `long_td_bonus` from the
   curve's `excludes`, and update the provenance line in `docs/ranking-methodology.md` (~:86) in the
   same pass — the curve's "still excludes and still says so" honesty contract is the thing to keep
   true.
5. ✅ **RESOLVED 2026-08-19 — BRIGGSY ARCHIVED IT, which closes the item's actual cost.** The
   mystery measured earlier that day (league exists via API, PoppaBriggsy sole member, yet the web
   sidebar omits it and `/leagues/<id>`, `/predraft`, `/settings` and the draft room's back arrow
   all redirect to Family Feud while `/draft/nfl/1392338162356875264` still opens) has a mundane
   root cause: **he archived the league from his phone days earlier** when he couldn't find a
   delete. Archive hides a league from the active list on every surface — so the draft-morning
   sidebar-glance confusion this item existed to prevent is gone, phone included. The league still
   EXISTS (archive ≠ delete); truly deleting it remains a phone-app commissioner action inside the
   archived-leagues view, and is now optional hygiene, not a risk. **No web path to league
   deletion exists — do not re-attempt from a session.**
6. **THE TORTURE CHAMBER (side experiment, ratified 2026-08-20: "cleared for takeoff") — Phase 0
   gate is HIS EYE on the invariant catalog.** The plan is
   [`docs/torture-chamber-plan.md`](docs/torture-chamber-plan.md); the catalog is
   [`docs/torture-chamber-invariants.md`](docs/torture-chamber-invariants.md) — fleet-verified v2
   (six agents: 14 CONFIRMED · 8 CORRECTED · 1 REFUTED · 31 missed contracts folded in; the
   standouts are the catalog's own "two-minute read"). Phase 1 (simulator core + D4 controls) may
   build while the catalog awaits him; **no Phase 2 battery result is readable until the catalog
   has passed his eye** — findings read through unratified oracles are the thing the gate exists
   to prevent. Positive control already banked: insight 030 reproduced to the decimal, twice,
   through the real code path. This experiment is subordinate to draft-day readiness and dies
   instantly if it competes with the advisor-mode mock, the ~Aug 27 refresh, or the freeze.
   ✅ **CAMPAIGN 1 COMPLETE 2026-08-20 — battery run, verified, reported, AND ALL THREE
   DECISIONS ANSWERED BY BRIGGSY THE SAME DAY** ([`docs/torture-chamber-campaign-1.md`](docs/torture-chamber-campaign-1.md)):
   **D-A** working hypothesis = pure best-available *off Sleeper's own list* (explains Mock #2
   with zero need-awareness); the blown-clock measurement rides the advisor-mode mock and
   decides which list — insight 031 is the why. **D-B RATIFIED AND SHIPPED SAME DAY** — "no
   multiple QBs unless extreme value": the queue never offers QB2+ (engine + replay + chamber
   mirrors, `NoSecondQb` tests pin it at the engine); extreme-value falls stay HIS override via
   VBD LEANS. Post-ship verification: all D4 controls green, equivalence 0/96, battery re-run
   clean, **QB exactly 1 in 120/120 probe rooms** (was modal 4). **D-C CLOSED AS DON'T-BUILD**
   on his question and the numbers (32 K/32 DEF real pool; exhaustion was a chamber-universe
   artifact); the E3 blindness stays documented in the catalog only. Campaigns 2 (greedy vs
   lookahead) and 3 (the Seat Book) have a licensed simulator waiting on his word.
   ✅ **PHASE 1 COMPLETE THE SAME DAY — `scripts/chamber.py`, all D4 controls green, pinned by
   `tests/test_chamber.py` (7 tests, suite 1177 OK):** control-030 exact (1087.2 to the
   decimal) · closed-form room exact · mutant hard-set CAUGHT (forcing-removed needed the
   11-round forcing-bite room — see catalog D3: **the forcing is nearly redundant on the
   shipped shape**, pool shrinkage pulls K/DEF into the window anyway; `rebuild-1` honestly
   uncatchable on a zero-inversion board) · **G1 equivalence PASS, 416 our-pick states across
   26 rooms, 0 divergences — the fast path is licensed.** Building Phase 1 found and pinned a
   NEW catalog entry the fleet had missed: **B8, the metadata split-brain** (a pick with a
   valid id but empty `metadata.position` keeps the lineup math right while corrupting
   `must_fill` to `{'?': N}` — forcing fired five rounds early with K/DEF in the rebuild;
   dormant on real feeds, hard H7 contract for synthetic ones, demonstrated in the engine by
   `test_split_brain_is_real_in_the_engine`). **Next: Phase 2 battery — BLOCKED on the Phase 0
   gate (his eye on the catalog), by design.**

✅ **BOTH CLOSED THE SAME EVENING — Briggsy: "you know I fucking do!" → THE LINEUP-DELTA QUEUE
SHIPPED.** The queue now ranks by marginal lineup value (replacement-prefilled, insight 024's
surviving formulation, extracted from the backtest into `draft-kit/lineup_value.py` and shared),
with the ENDGAME forced at N-picks-for-N-slots and K/DEF deferred until forcing. Gate:
`scripts/replay_mock.py` on the recorded mock — board-order queue unattended drafted **nine WRs +
five QBs, 695.4 startable VORP**; lineup-delta drafted a human-shaped roster, every slot filled,
**1087.2 (+391.8)**. 1170 tests, four mutants killed across the day. The two items below are what
shipped; kept for the reasoning.
1. ~~**The ladder said nothing at exactly-N-picks-for-N-mandated-slots.**~~ (the forcing IS the fix) At pick #85: five picks
   left, five open mandated slots (RB×2/TE/K/DEF), queue top = a SECOND QB — taking it would have
   made a zero-scoring starting slot mathematically certain, and `mandatory_squeeze` stayed
   SILENT with K and DEF both still open. Read its trigger in `precompute_ladder.py` first: it may
   key on a tighter picks-remaining window by design. Candidate: an ENDGAME line when
   `picks_remaining == open_mandated_slots` — every pick must fill one, say so above the queue.
2. ~~**Queue-top needed a judgment overlay for the last five picks**~~ (the arithmetic half of
   the overlay is IN the queue now; taste and injury reads remain human) — the naive queue is the
   engine's stated contract ("Claude overlays judgment"), and it held: fired queue-top for picks
   5-76 (11 straight), then filled TE/RB/RB/K/DEF off the tier tables. Not a defect; written down
   so the next session doesn't re-derive WHEN the overlay starts mattering (answer: when FLEX is
   full and mandated slots ≈ picks left).

**▼ ALL SIX CLOSED 2026-08-19, plus the three parenthetical small ones** — six builders in
parallel, one adversarial verifier each, then the full suite centrally (which caught the one
thing the targeted runs could not: a literal `†` in a new engine COMMENT tripping
`test_build_board`'s one-glyph-source guard — reworded, not excepted). 1066 → **1103 tests**,
seven commits, pushed. Kept for the reasoning; nothing below is open. Two finds worth keeping:
the console's install banner names 4 of 13 helpers (Step 0 now says the `typeof ffQueueSync`
check is the only oracle, and the skill's self-test roster was widened to all 13 the same day),
and the board's **paused-after-polling** live-bar line differs from healthy LIVE by two words —
the most confusable pair on monitor 2.

1. **`docs/draft-day-runbook.md` needs a `## Step 0 — Arm the room (BOTH modes)` above Step 1.**
   Step 3's mandatory re-arm calls `window.ffQueueSync`, **which only exists if the browser console
   was pasted** — and that instruction lives only in the Executor section, which advisor mode is
   told to skip. Move its substance up, leave a pointer behind, and add one line above the
   `ffQueueSync` block saying it needs Step 0 in **both** modes.
2. **The engine's terminal output carries three unglossed tokens, one of them inverted.**
   (a) badge glyphs `† ! + ^ v » ° §` print with **no legend** — build a key from `meta.badges`
   (which already holds `label`/`desc`) and print it **after** the BEST AVAILABLE rows, never
   before: `_section()` reads the first token of each line under the header and would parse a key
   line as a row. (b) `· thin, none in the top {BEST_N} yet` — top 12 of *what*; reword **without**
   the literal `BEST AVAILABLE`, since two tests do `out.split("BEST AVAILABLE")`. (c)
   `Their open needs: DEF(4)` counts **PICKS, not teams** — at pick 3 it prints `DEF(10)` in an
   8-team league, which is the tell. Label it.
   ⚠️ **Do NOT rename the `--- VBD LEANS ---` header in the same commit** unless
   `precompute_ladder`'s `_section(stdout, "VBD LEANS")` literal moves with it and the suite is
   green — the doc-side wording fix already landed and got most of the value at zero parser risk.
3. **Runbook Step 2 says double-clicking the board starts it polling. It does not.**
   `board.html` gates polling on `new URLSearchParams(location.search).get('live') === '1'`, so a
   double-clicked `file://` page **never** polls. Say *"then click ▶ Go live"*, and add the missing
   third self-test state as the FIRST bullet.
4. **`scripts/templates/board.html`'s ☆ panel is labelled `My queue` and is wired to nothing** — it
   is a local scratch pad, not Sleeper's queue, and the two are confusable at a glance on monitor 2.
   Rename the heading and the row button's `title`; template only, then rebuild and commit
   `draft-kit/` as ONE commit.
5. **`README.md`'s State of play still says executor mode is "Proven, but not since the migration"**
   — it was proven since: Ja'Marr Chase drafted at pick #1, API-confirmed (08-15), and seven picks
   on a live 120s clock. Replace with the receipts **and their limits** (never run on the real
   league draft; `picked_by` untrustworthy on a running clock).
6. **`watch_draft_state.py` has no T-minus alarm** — `diff()` fires only on transition, so it says
   STARTING GUN once and is then silent through draft day. Add a time-based entry (clock passed IN,
   since `diff()` is pure by contract) firing T-7/T-48/T-6 with a `fired` dict in `last_seen.json`.
   Also add `newsletter/data/state/DRAFT_ALERTS.md` to CLAUDE.md's *Where truth lives* table — **an
   alert channel nobody is told to open is not a channel.**

*(Also open, small: `docs/nightly-feud.md`'s folder map says "one per build" where U12 made it one
per DAY; the runbook's After-the-draft bullet tells the next session to build in-season scripts
while `docs/in-season-plan.md` — the named owner — forbids it until `/state/nfl` flips to
`regular`; and two `ResourceWarning: unclosed file` in `tests/test_backtest_board.py`.)*

---

## ▶ NEXT ACTION

**Both of the candidates this section listed on 2026-08-09 are now CLOSED. Read the two
`✅ DONE` blocks before proposing anything — the queue below is what is actually left.**

~~**1. THE 2025 WINDOW.**~~ ✅ **DONE 2026-08-09** — measured, decomposed, and applied on Briggsy's
call; the board ships on `current` / 2022-2025 and Bijan takes #1. Full write-up in
*THE 2025 PARK WAS VOID* below. Do not re-open it as a candidate.

~~**2. THE MOCK-DRAFT HARNESS, legs (b) and (c).**~~ ✅ **DONE 2026-08-09** — both built, both
wired into the runbook, both detailed immediately below.

## ▶▶ 2026-08-14 EVENING SESSION — WHAT CHANGED, read this before the ranked list

**19 commits. 852 → 907 tests. The board's ordering was refreshed and four things that could
have cost a pick were found and fixed.** None of it was edge; all of it was correctness. The
honest headline stands: **there is no pick left that more analysis can buy.**

- ✅ **THE BOARD IS RE-RANKED on the 2026-08-14 ECR.** 101 of 174 rows moved, **20 crossed a tier**,
  and the top of round 1 reordered: **Gibbs #4 → #2 and into tier 1, Bijan #3 → #4 and out of it.**
  ⚠️ **The 1.01 argument has now reversed twice** — see the corrected block below. Quote the
  ordering, never the margin: `RB1` sd is 19.3 and insight 023 measures this curve 2.55× overstated
  at RB1.
- 🚨 **THE LADDER'S CONTAMINATION GATE COULD NEVER FIRE.** `precompute_ladder.py` armed the engine's
  cross-draft refusal with `a.draft_id or feed[0]["draft_id"]` — **the reference came from the very
  feed the gate checks.** Not a dormant branch: the runbook teaches the flagless form at both
  :167 and :207. Found on disk: `picks.json` holding 38 picks from dead mock `1392338436949561355`,
  and a persisted `ladder.json` whose queue was headed **Nico Collins** while Chase, Gibbs, Nacua
  and Bijan were all still available. **Auto-pick drains queue-top, so a blown clock CASHES that.**
  Now armed from cargo, mirroring `run_engine.py`. Both poisoned files deleted.
- 🚨 **THE DRAFT-MORNING REFRESH WAS A CEREMONY THAT COULD NOT MOVE A RANK.** `grep -c rerank
  docs/draft-day-runbook.md` returned **0**. `build_board.py` derives `vorp` from `pr`, so running
  it alone re-stamps byte-identical data and `--verify-only` prints green over a stale ordering.
  **THE REAL REFRESH is now written out in the runbook** — and `meta.updated` is input freshness,
  **not** rank staleness; the field is `meta.rankings.synthesized`.
- 🚨 **"curl works, has no cache" WAS FALSE and it is why the `?cb=` nonce got deleted.** The cache
  is **Cloudflare's edge**. Measured: three bare fetches of the draft endpoint returned
  `cf-cache-status: HIT` under `s-maxage=30, stale-while-revalidate=300`; a unique nonce returned
  MISS every time. Restored in the runbook and `data-access.md`, which had contradicted each other.
- ✅ **THE `start_time` BRANCH IS POSITIVE-CONTROLLED** against a **real** Sleeper draft object
  (`1391539007871012864`, `start_time: 1786313864801`), committed as a fixture. Negative control
  proves silence is earned; mutants both directions caught (7 and 11 failures).
- ✅ **THE WATCHER'S ALERTS NOW REACH THE NEWSLETTER**, which is the surface actually read. The
  date already had the countdown tile; *"date MOVED"*, *"slot moved"* and *"draft replaced"* had
  **no channel at all**, and moving earlier is the scenario the watcher exists for.
- ✅ **`scripts/injury_check.py` IS NEW.** 19 board rows carried a live Sleeper injury designation
  and **no I badge** — including **McCaffrey at board 8** — while Gibbs, the new RB1, still read
  *"not practicing as of 8/4"* against a blank live status. READ-ONLY; it never rewrites prose.
- ✅ **THE LADDER NOW WARNS WHEN THE QUEUE CANNOT FILL A MANDATED SLOT.** The top 128 board ranks
  are 128 skill players and **zero K/DEF** (exact — `rerank.py` sinks both below all skill, and an
  8×16 draft is 128 picks), so the queue can never contain a kicker or defense. The remedy it
  prescribes is **the null model** — clear the queue and let Sleeper's need-aware board fill them —
  never a cleverer queue (insight 024's defect #3).
- ⚠️ **`backtest_board.py` DISAGREED WITH ITS OWN WRITE-UP BY DEFAULT, ON THE SIGN.** Its defaults
  gave `ORDER +35.7`; every published figure is `−18.9`, from an invocation recorded nowhere. The
  defaults **are** the published invocation now.
- ⚠️ **Five wrong worked examples in `ranking-methodology.md`** (one attributed McBride's rank to
  Bowers) are **derived** now, as a fifth generated block.

---

## ✅ CLOSED 2026-08-15 — THE ROOM IS MAPPED AND THE SKILL IS WRITTEN

**`.claude/skills/sleeper-draft-room/SKILL.md` exists and leads with a ~20-second self-test that
RE-PROVES the DOM contract rather than asserting it.** Every row in its control map names the node
that owns the handler and the oracle that confirms the action. Do not add a claim to it that the
self-test cannot check — that is the failure mode it was built against.

<details><summary>The original plan for this section, kept because the reasoning still applies</summary>

**Briggsy's call, 2026-08-14: stop re-learning Sleeper's UI every session.** The evidence he is
right is in this repo — the runbook already carries *"the window is NOT moving… bullet rewritten so
future sessions don't blame the human"*, a lesson written down **specifically so it would not be
re-derived**, and it got re-derived anyway. Prose in a long document is not where procedural
knowledge survives.

✅ **THE BLOCKER IS GONE — MEASURED AND FIRED 2026-08-15. The room is mapped and every control is
API- or oracle-confirmed. What remains is WRITING the skill, which is now a transcription job, not
a research job.**
- **The cause:** `draftButton()` returned `row.children[0]` = `div.draft-button-wrapper`, which owns
  **no handler**; the `onClick` is on its child `div.draft-button`. **Events bubble UP, never DOWN.**
  Fixed, 914 tests, 4 mutants killed. [`insights/025`](docs/insights/025-the-click-reported-success-and-drafted-nobody.md)
  is now RESOLVED and carries the full live transcript.
- **The proof:** baseline `/picks` = 0 → `ffDraft("Ja'Marr Chase")` → `pick_no=1, draft_slot=1,
  picked_by=1390750540631150592`. Live DOM matched prediction exactly (wrapper 34×40 `[]`, button
  24×24 `["onClick"]`).
- **Swept and passing:** `ffFind` · `ffDraft` · `ffQueue` · `ffQueueList` · `ffUnqueue` ·
  `ffAutoPick` (new) · `ffStartDraft` + its three guards. The player-card modal closes via
  `.modal-item-underlay`.
- 🚨 **Carry this into the skill: set No Limit because it makes `picked_by` TRUSTWORTHY**, not just
  because it buys time. Auto-pick fires only on timeout, so `pick_timer: 0` removes the one confound
  `/picks` cannot rule out.
- **Mock `1394132992183517184` is now SPENT** (15 picks, ours is #1). Create a fresh one via
  `NEW MOCK NFL DRAFT` in the right panel — never the `+` on `/draftboards`, that is the league wizard.

**✅ A MOCK IS ALREADY SITTING THERE, `pre_draft`, NOTHING TO CREATE: `1394132992183517184`**
(8-team snake, 15 rounds, `league_id: null`, verified). `1394049093545758720` is spent — complete.

**The run, in order — ALL FOUR DONE 2026-08-15. Superseded by the skill; kept for the reasoning.**
1. ✅ **SET "No Limit" FIRST.** Done, API-confirmed `pick_timer: 0`. ⚠️ **Two corrections:** the
   `2 Min Per Pick` label is **not** clickable — it owns no handler and no ancestor within 5 hops
   does; the real path is the `.action-button` whose `onClick` contains `showMenu` → `Draft
   Settings` → `No Limit` → `UPDATE`. And the **better reason** to set it: auto-pick fires only on
   timeout, so `pick_timer: 0` makes it impossible and thereby makes `picked_by` trustworthy.
2. ✅ **ffDraft SETTLED — and by neither candidate.** The real cause was clicking the handler-less
   wrapper. **A synthetic click drafted Ja'Marr Chase at pick #1**, API-confirmed. The
   synthetic-vs-real comparison this step planned was never needed: `isTrusted` appears zero times
   in the bundle, so the axis does not exist.
3. ✅ **SWEPT.** `ffFind` · `ffDraft` · `ffQueue` · `ffQueueList` · `ffUnqueue` · `ffAutoPick` ·
   `ffStartDraft`+guards · the player-card modal (closes via `.modal-item-underlay`). ⚠️ **"The
   AUTO-PICK toggle needs a real click" was FALSE** — it needs the right *node*, `.slider`.
4. ✅ **SKILL WRITTEN**, self-test first. Its own paste command carries a landmine found while
   writing it: printing the console to stdout dies on Windows cp1252 (`ʼ`, U+02BC) and emits **zero
   bytes**, and `node --check` passes on an empty file — so the skill writes to a file and checks
   the **byte count**, not just the parse.

**Environment facts that cost time last run and should go straight into the skill:**
- **Chrome CSP blocks `fetch` to localhost**, so `sleeper_draft_console.js` must be **pasted
  inline**. `eval` itself is fine. Verify the paste by djb2-hashing each `window.ff*.toString()`
  in-page (comments stripped, whitespace collapsed) against the same normalisation of the file.
- **`(async () => {…})()` returns a promise the tool serialises as `{}`.** Three results were lost
  that way, one of them a call that had actually run. Use top-level `await` in a plain object
  literal, and treat `{}` as "it ran, go read the state".
- **The `+` on `/draftboards` is the LEAGUE wizard** (it created the stray `Ladder Test 0809`).
  The mock creator is **`NEW MOCK NFL DRAFT`** in the right panel; it opens the room directly.
- **Clicking a mock card on `/draftboards` opens the room in a NEW TAB.**
- **Screenshot scale oscillates on a window nobody is touching** — 1568×750 and 1568×763 observed
  in one session, and **1522×784** on 2026-08-15. **Never blame the human, and never click by
  screenshot coordinate.**

</details>

---

## ✅ CLOSED 2026-08-15 — THE DRESS REHEARSAL WAS RUN, BY A SESSION THAT DID NOT WRITE THE SKILL

**Seven picks fired on a live 120-second clock in mock `1394479498451251200` (seat 5, confirmed by
`draft_order["1390750540631150592"] = 5` once it populated). Zero clocks missed. THE LOOP FITS.**

| pick | protocol | clock at fire | used |
|---|---|---|---|
| #5  | merge · engine · ladder as 3 separate calls | `00:59` | **61s (worst)** |
| #12 | engine+ladder chained | `01:15` | 45s |
| #21 | chained | `01:36` | 24s |
| #28 | 3 separate calls, output grepped to 5 lines | `01:32` | 28s |
| #37 | chained | `01:32` | 28s |
| #44 | chained | `01:32` | 28s |
| #53 | chained + queue re-arm in the same trip | `01:36` | 24s |

**23 script invocations totalled 5.28s**; `run_engine.py` never exceeded **0.18s**.
**96-98% of every on-clock second was round-trip and agent latency.** Full gap analysis, the
blown-clock positive control, and the five draft-day changes:
[`insight 026`](docs/insights/026-the-loop-fits-and-the-scripts-were-never-the-cost.md).

### 📋 THE SKILL GRADE — ✅ **ALL EIGHT CLOSED (2026-08-17).** Kept for the reasoning, not as a queue.

1. ✅ **FIXED — the self-test cannot pass on a cold load and tells you to STOP.** Run verbatim at
   Step 0 as instructed, it returned **7 of 12 FAILED** and *"FAIL — STOP. Re-map before drafting"*
   on a room that was perfectly healthy: `locate()`'s 4000ms budget expired before the virtualised
   grid painted (`sawInstead: []`), and the very next `ffFind` succeeded in `waitedMs: 1`. A
   warm-up call now precedes the assertions. ⚠️ **Honest limit: on a second fresh mock the failure
   did NOT reproduce** (first-ever `ffFind` returned in 7ms), so the guard is proven *harmless*,
   not proven *necessary*. It is insurance against an intermittent false red — and a false red is
   the dangerous direction, because it teaches the operator to skip the gate.
2. 🚨 **NOTHING RE-ARMS THE QUEUE, AND AN EMPTY QUEUE READS AS HEALTHY.** Six names pre-armed;
   empty by ~pick 21; **picks #28, #37 and #44 were fired with no safety net.** `precompute_ladder.py`
   *prints* the order but never loads it, and Step 3 has no re-arm step. Worse,
   `ffQueueList()` on an empty queue returns **`{count: null, entries: [], agrees: true}`** —
   `agrees` is true only because `q.length === 0` short-circuits. ~~**Decide: add a re-arm step to
   Step 3, and make the empty case report `empty: true` instead of `agrees: true`.**~~
   ✅ **BOTH DONE 2026-08-17** — runbook Step 3.5 is the re-arm step, and `ffQueueList()` returns
   `empty: true`. See ranked item 1 for the second masked state that measuring turned up.
3. ⚠️ **`ffQueue`'s +1 verification is not robust to concurrent removals.** Asked for 4 names, 3
   returned `queued: true`, the queue held **2** — Jayden Daniels reported success and was absent
   (drafted mid-loop, so an unrelated add saw the `+1`). **Only the trailing `ffQueueList()` is
   trustworthy.** Re-arm cost: ~1.5-2s per name, 5.1s for four.
4. ⚠️ **Skill Step 1 says "SET No Limit FIRST. Non-negotiable." with no branch for a deliberate
   clock test** — following it would have destroyed this experiment. Needs a carve-out naming the
   consequence: at `pick_timer: 120`, `picked_by` is untrustworthy, so read the pick COUNT.
5. ⚠️ **`run_engine.py` / `precompute_ladder.py` bare are WRONG against a mock**, and neither the
   skill nor the runbook says so. Bare, they read the REAL league's draft object (`rounds: 16`) and
   arm the contamination gate with the REAL draft id. Required: `--rounds 15 --draft-id <mock_id>`.
6. ⚠️ **The `!!` seat-UNVERIFIED banner fires on every pre-draft ladder run**, while the runbook
   says *"If it prints the `!!` seat banner, STOP."* Pre-draft it is unavoidable (`draft_order` is
   null, no pick carries our `picked_by`) and it self-clears once our first pick lands. Same
   false-red shape as #1 — needs a stated exception.
7. ℹ️ **`.claim-text` comes in TWO nodes per team** (16 for 8 teams), not one. The skill's
   "verify its parent says the right `Team N`" works, but naive indexing lands 2× off.
8. ℹ️ **`NEW MOCK NFL DRAFT` navigates the SAME tab.** The skill's "opens in a new tab" is true of
   clicking an existing mock card, not of creating one.

**What the skill got exactly right, re-proved and worth keeping:** the control map is *exact*
(wrapper 34×40 owning nothing, button 24×24 owning `onClick`) · `ffDraft` went **7 for 7** with
`handlerRan: true` and `btnHandlers: ["onClick"]` every time · `ffStartDraft` returned
`confirmsAnswered: 1` with `window.confirm` verified restored to native · `ffAutoPick` actuated
both directions via `.slider` and restored · the paste discipline (byte count, not just parse) ·
**zero screenshot-coordinate clicks all session.**

<details><summary>The original queued task, kept because the reasoning still applies</summary>

**Run a full mock draft on the REAL 120-second clock and measure whether the loop fits inside it.**

🚨 **THIS MUST BE RUN BY A SESSION THAT DID NOT DISCOVER THE MECHANICS.** The session that wrote
`.claude/skills/sleeper-draft-room/` holds the whole answer in context and would pass the test by
memory, not by the skill — a test it cannot fail, which is this project's sixth tautology and the
same shape as insight 005 and insight 021. **The skill is the thing under test, not the room.**

**The task, and deliberately not the method:**
1. Invoke the `sleeper-draft-room` skill and follow it. Run its self-test first.
2. Create a fresh mock (`1394132992183517184` is SPENT — 15 picks). **Leave the clock at 2 minutes.**
   That is the point; do NOT set No Limit this time.
3. Draft our seat through **at least 4 of our picks** using the real Step 3 loop:
   `merge_picks.py` → `run_engine.py` → `precompute_ladder.py` → fire → confirm against `/picks`.
4. **TIME EVERY PHASE.** Wall-clock seconds per stage, per pick. This is the deliverable.

**The question being answered** — the repo asserts it and has never measured it since:
> *"a live run proved the human-in-terminal loop is too slow: the 4.3 clock expired while the
> engine was being run in Bash"*

Does the loop fit in 120s or not? If it does not, **that is the most important finding left before
Aug 29** and the fix is a draft-day change, not a code change.

⚠️ **`picked_by` is NOT trustworthy on a running clock** — auto-pick stamps the seat owner's id.
Read the pick COUNT immediately after each fire. Keep something queued at all times so a blown
clock degrades to our board, not Sleeper's.

📋 **GRADE THE SKILL AS YOU GO.** Record every moment you needed something the skill did not tell
you, or where it told you something wrong. That list is worth more than the timings. Report it
back rather than silently working around it — a gap worked around is a gap that stays.

</details>

---

**WHAT IS ACTUALLY LEFT, ranked:**
0. ▶ **BRIGGSY READS THE FOUR LINES AND CUTS THEM. THE ONLY THING LEFT HERE IS HIS EYE.**
   ✅ **BUILT 2026-08-17.** The format, the discipline and three worked examples are in
   `docs/draft-day-runbook.md` → *Advisory format — THE FOUR LINES*, and the old ~5-line format is
   GONE (both its heading and the second reference to it). **There is one format.**
   - ⚠️ **It is a JUDGEMENT surface, so his eye is the oracle, not a test — that has not happened
     yet, and it is the whole of this item now.** Show him the three worked examples (#3 round 1,
     #30 mid-run, #94 under K/DEF pressure) and let him cut. He said *"we can play with it and
     tweak it if needed"*. **Do not gold-plate before he has read one.**
   - 🚨 **THE PREMISE OF THIS ITEM WAS WRONG AND THAT IS WORTH KEEPING.** It said "the engine's
     state is rich enough already". It was not. Writing the examples found **three** gaps, none of
     which code review had found: the `note` (the literal "one clause of why") was loaded and never
     printed; the between-seats line went silent exactly when we were ON the clock, which is when
     line 4 needs it; and a draft example asserted seats from memory that the engine could not have
     corrected. **Composing the real advisory is this repo's strongest test of the engine.** Do
     that again after any engine change.
   - To re-run a stop: stage `lab_feed_120.json` truncated to a pick count, run
     `scripts/run_engine.py 3 --rounds 15 --draft-id 1390923383440424960`, then **delete
     `draft-kit/picks.json`** — gitignored war-room scratch, and a stale one poisons the next run.
1. ✅ **THE QUEUE GAP IS CLOSED AND LIVE-PROVEN (2026-08-17).** `ffQueueSync(target)` takes the
   `queue` array `precompute_ladder.py` prints and makes Sleeper's queue equal it. **All four
   paths fired in a live room in 2.3s total:** load-from-empty (771ms) · append the next man after
   one was drafted away (438ms) · **refuse** an unpermitted reorder (1ms, queue untouched) ·
   `{rebuild:true}` to force the order (1127ms). Final queue read back from Sleeper matched the
   target exactly. It decides `synced` by **reading the queue back**, never the per-call
   `queued: true` that once credited Jayden Daniels for an add he was not present for.
   ✅ **BOTH REMAINING HALVES CLOSED 2026-08-17.** (a) Runbook **Step 3.5** is the re-arm step,
   naming `ffQueueSync`, the ladder's own *QUEUE THIS ORDER* output, `ladder.json`'s `queue` key,
   and the trailing `ffQueueList()` as the only accepted oracle. Executor mode's bullet, which
   still taught the superseded hand-rolled loop, is corrected. (b) `ffQueueList()` returns
   `empty: true` — and measuring first found a **SECOND** masked state the plan had not:
   a **blind panel** (tab label says `QUEUE (3)`, panel renders zero rows) ALSO returned
   `agrees: true`. That one is worse, because it produces a wrong ACTION: "empty" sends you to
   `{rebuild:true}` to re-arm a queue that was already correct, destroying it. So `empty` keys off
   Sleeper's own words ("No players in your queue"), **never off `entries.length`**, and `agrees`
   is now only the label-vs-panel cross-check (`null` when there is no label to check).
   ⚠️ **All 68 existing console tests stayed green through a change that flips `agrees` from true
   to false on a real case** — insight 013's signal, and it meant both unsafe states were untested.
   ⚠️ **And budget from the measurement, not from the old estimate:** a full 3-name sync is
   **under ~1.2s**, not the ~2s per name the first hand-rolled loop cost.
2. 🗓️ **THE FINAL RE-RANK, ~Aug 27, THEN FREEZE.** The board ships on the **2026-08-14** ECR.
   Two preseason weeks and roster cut-downs land before Aug 29, so run *THE REAL REFRESH* in the
   runbook once more around **Aug 27** — and then **nothing touches `r`/`pr`/`tier` inside 48 hours
   of the draft.** That rule exists to stop a well-meaning session re-ranking at 7am. Run
   `python scripts/injury_check.py` in the same pass; it is the only thing that catches a note that
   healed or a player who got hurt after the synthesis.
   ⚠️ ~~POSITIVE-CONTROL THE WATCHER'S `start_time` BRANCH~~ ✅ **DONE 2026-08-14** — with a real
   Sleeper object rather than a mock, so it cost nothing and needed no browser.
3. ~~**Feed the measured opponent profiles into `precompute_ladder.py` as per-seat priors.**~~
   🚨 **DO NOT BUILD THIS. Measured and killed the same day, 2026-08-14** — see
   [`insight 022`](docs/insights/022-the-opponent-prior-lost-to-always-guess-wr.md).
   Cross-validated leave-one-draft-out, the personal positional prior scored **42.2% against a
   constant that always guesses WR at 40.6%** — and **for `briggsy007` it scored 35.2%, WORSE
   than the constant.** Round-based claims lost to the room base rate on three of four. The
   profiles are DESCRIPTIVE, not predictive. Wiring them in would have put a fabricated number
   under a measured label, which is what leg (d) was killed for.
   - ⚠️ **A last candidate looked like it survived and then did not.** QB aggression as *nth QB
     off the board* scored **76.5% vs a 52.9% floor** — until a **SUPERFLEX** league was found
     inside the sample (`2023 The Big 12`, 12tm × 26 rounds, which cleared every filter; a
     round-1 QB is *correct play* there). Cleaned: **62.5% vs a 50.0% floor, +2 of 16, one
     standard deviation. NOTHING PREDICTS.** `is_superflex()` now excludes them, +4 tests,
     +3 mutants.
   - 🚨 **AND THE SAMPLE WAS NEVER 18.** Those are overlapping *drafter-views* of **7 DISTINCT
     DRAFTS** — four members share the 2023 Fantasy Fuccbois draft. Only **one** of the seven is
     8-team. Any rate quoted from this data must say which unit it counts.
   - ✅ **What survives is near-unanimous room facts and one direction:** `no K before round 10`
     **18/18**, `waits on TE past R5` **15/18** (drafter-views), and the first QB came off the
     board before the ADP board's first QB (#29) in **6 of 7 distinct drafts**, median pick 18.
     ⚠️ **That last one compares 2023-2025 behaviour to a 2026 price list and six of seven rooms
     are bigger than ours — a direction to stay alert to, not a count to plan around.**
   - **Re-open only with more distinct 1QB drafts** (the room plays every year), never by
     loosening a floor and never by counting drafter-views as drafts.
4. 🟡 **THE LONG-TD BONUS IS MEASURED AND PROBE-SHIPPED. FOLDING IT INTO THE CURVE IS BRIGGSY'S
   CALL, and the natural moment is the ~Aug 27 refresh.** `build_curves.py --long-td-probe`
   (2026-08-17) builds the curve twice and prints the delta. **It writes nothing**, so the shipped
   curve's `excludes: ["long_td_bonus"]` stays TRUE. Same shape as `availability.py`: the
   measurement ships, the feature waits for a human.
   - **The join is perfect** — `td_player_id`/`passer_player_id` are the same gsis domain as the
     weekly file's `player_id`: **486 bonus rows over 2022-2025, 0 unjoinable.**
   - 🚨 **THIS ENTRY USED TO SAY "correctness only — the edge is ~zero", AND THAT WAS RIGHT FOR
     THE WRONG REASON.** league.md scores the bonus *"on pass, rush AND receiving TDs"*, so the
     **PASSER is credited too** — credit only the scorer and you miss every QB, which is most of
     the effect. The raw effect is therefore LARGEST at the position this project has four
     independent lines of doctrine about: **+8.7 at QB1, +12.9 at QB6**, vs +2.8 RB1, +1.0 TE1.
   - ✅ **But the board prices VORP, not the curve — and the bonus lifts the QB12 BASELINE by +7.0
     at the same time, so it very nearly CANCELS.** `QB1 VORP 129.7 → 131.4 (+1.7)`; **QB1 as a
     share of RB1 goes 48% → 49%**; the largest move anywhere is WR2 at +7.8, inside RB1's own
     sd of 19.3. **The no-early-QB doctrine survives, and now it has survived a test it had not
     been given.**
   - **So the honest sentence is not "the bonus is small" — it is "the bonus is nearly UNIFORM
     WITHIN A POSITION, so it cancels in the only number that decides a pick."** Write that, not
     the old one, or a future session will re-derive the alarm from the raw column.
   - **To fold it in:** feed `long_td_bonus(year)` into `load_season`'s totals inside `build()`,
     regenerate, drop `long_td_bonus` from `meta.excludes`, and re-run the board. Changes no
     decision — which is exactly why it needs a human watching rather than a background rebuild.
5. **DEF has no exact source at all** and the 14 rows stay labelled. **Do not build a DEF curve** —
   the reasoning is in the DECIDED block below and it has not changed. **Re-confirmed 2026-08-14
   against a NEW source:** Sleeper's own projections carry DEF, but only the `pts_allow_0` bucket
   and no points-allowed distribution, so they cannot score the largest term in the DST ladder
   either. Two independent sources, same gap. **Stop looking.**
6. ~~**Per-player projections as a second instrument.**~~ 🚨 **DO NOT BUILD THIS AS A VALUATION.
   KILLED 2026-08-14 ON LEAKAGE — it cannot be backtested, and this repo does not ship a valuation
   it cannot test.** This entry used to call it "the largest remaining build and the one with real
   upside."
   - **The fetch works and the join is still perfect** (3,300 records, 174/174 on `sleeperId`,
     `scoring.score()` reproducing their `pts_ppr` on 556/557). None of that was the problem.
   - 🚨 **Sleeper's HISTORICAL projections are END-OF-SEASON RESTATEMENTS, not preseason
     projections.** Measured directly: the **2023** "projection" for **Puka Nacua** is
     `pts_ppr 229.4, rec 87.0, rec_yd 1004.0` with **`updated_at` = 2024-01-08**, *the day after
     the 2023 regular season ended*. Nacua actually went 105/1486 as a 5th-round rookie who was
     **undrafted in most August 2023 leagues**. No August-2023 projection of 87/1004 existed
     anywhere. **The archive has seen the outcome.**
   - Therefore any backtest of a projection-based valuation would score a model that already knows
     the answer — the leakage `backtest_board.py`'s `y <= target` mutant exists to catch, arriving
     through the data instead of the code. `season_type=pre` returns empty stats for past years, so
     there is **no clean historical projection from Sleeper at all**.
   - **What it is still legitimately good for:** the CURRENT season's projections as a *reading*,
     the way `market.py` is a reading. It must never become a column the board sorts by, and the
     adversarial pass found even the annotation weak — rotowire falls outside the experts' ±1σ on
     only **18.7%** of rows, i.e. a below-average draw from the consensus the board already
     averages, and the source republishes daily so any committed list is stale before Aug 29.
   - **Re-open only with a genuinely archived PRESEASON projection set** — one whose timestamps
     predate each season's week 1. Never with this endpoint.

### 🆕 FOUND BY A DRIFT SCAN 2026-08-17, NOT YET DONE — ranked by cost if it happens on draft night

7. ✅ **DONE 2026-08-17 — ALL FIVE OF INSIGHT 026's PRESCRIPTIONS ARE NOW IN THE RUNBOOK.** Three
   of them had never reached it (chain the calls · grep the output · do not re-merge on the clock);
   `grep -c chain docs/draft-day-runbook.md` was **0**. Step 3 now opens with the chained form,
   the two greps to act on, and the do-not-re-merge rule. **Re-timed against the real draft: the
   whole chain — merge + engine + ladder, output grepped — ran in 0.617 s**, which is insight 026's
   headline proven a second time. ⚠️ The block also says to read the `[source]`/`!!` preamble in
   full on the FIRST cycle of the night: grepping it away every time is how an unarmed
   contamination gate goes unnoticed.
8. ✅ **DONE 2026-08-17 — `merge_picks.py` RETRIES A BLIP, on the SAME 15s budget.**
   `ATTEMPT_TIMEOUTS = (5, 10)` sums to the old single `TIMEOUT`, so the retry costs nothing in the
   worst case. Escalating, not two equal slices, because six live fetches measured a **96 ms
   median**. Retries 5xx/timeouts/truncated bodies; **never a 404** (that is an answer — the draft
   is gone). Nonce rebuilt per attempt or the retry is just a second hit on the same Cloudflare
   cache key (insight 020). ⚠️ It also exposed a test-isolation leak: `MergeCase.run_merge`
   monkeypatched module-level `fetch` and never restored it — fixed in `tearDown`.

**▼ NOTHING LEFT OPEN IN THIS BLOCK — 9, 10, 11 and 12 all closed 2026-08-18.** *(Was three; a
fourth was found that was in no queue at all. Re-verified item by item against source first — all
three originals were genuinely open, and **two of the three prescriptions were wrong in ways that
would have burned clock.**)*

🚨 **THE PATTERN, AND IT HELD FOR ALL FOUR: every item found a defect its own prescription did not
know about, and in every case it was BUILDING the thing that found it — never re-reading the code.**
An unarmed 404 message · six stale doc surfaces · two dormant wrong sentences on the board · a
false-red warning in the very code written to prevent a false confirmation. **Three of the four
were found by running the thing, not by a test that passed.** That is [`028`](docs/insights/028-writing-the-output-found-what-the-tests-could-not.md)
measured a fourth time — treat "the prescription is written, just apply it" as the start of the
investigation, not the end of it.

9. ✅ **DONE 2026-08-18 — the seat is derived, and the tautology it buys is DECLARED.** Omit
   `--slot` and it comes from `draft_order`; it **refuses rather than defaulting** when that is
   null. 78 → 93 tests in that file, four mutants planted and killed.
   - 🚨 **THE HAZARD THE ITEM NAMED IS HANDLED, NOT AVOIDED.** A derived seat makes the engine's
     `[checked] … against draft_order` self-confirming — it compares the value to the file it came
     from. Every derived run now prints `[!] THAT draft_order CHECK IS CIRCULAR ON THIS RUN` and
     names the one independent oracle (our own `picked_by`), or says plainly that **nothing** has
     confirmed the seat when our picks have not landed. A typed seat gets no warning, because there
     the check is real — that pair is the point.
   - 🚨 **AND THE FIRST VERSION OF THAT WARNING WAS A FALSE RED, caught by RUNNING it, not by the
     test.** `parse_provenance` keeps the whole `[checked] …` line as ONE string with claims joined
     by ` · `, so filtering whole lines announced *"NOTHING has independently confirmed the seat"*
     on a run where `against our own picks` sat in the same line. The unit test passed because it
     only asserted the word CIRCULAR. ⚠️ The opposite error is the dangerous one and is now pinned
     too: *"all 174 board rows carry a frozen sleeperId"* rides that same line and **must not** count
     as confirming a seat.
   - ✅ **`--cargo` NOW TAKES A FILE OR A DIR.** It meant a **dir** here and a **file** in
     `run_engine.py` — same flag name, opposite meanings — so the runbook's go-time
     `--cargo temp/draft.json` step worked for one script and silently did the wrong thing for the
     other. ⚠️ **That collision is also what made this item's original prescription untypeable:** it
     said `(cargo or {}).get("draft_order")`, borrowing `run_engine`'s meaning of a name that does
     not exist here.
   - ✅ The derived seat prints the **cargo age** beside it — `draft_order` flips at go time, which
     is exactly when the hourly inbox is behind, and 60 minutes trips no staleness warning (the
     threshold is 150).
   - ⚠️ **`SKILL.md`'s mock warning got STRONGER, not weaker:** bare is now the form your fingers
     reach for, and bare in a mock derives the REAL league's seat for a mock whose `draft_order` is
     its own. **In a mock, always pass the seat.**
   - ⚠️ **A test that asserted SOURCE TEXT went red for a rename that changed nothing it cared
     about** (`a.cargo` → `cargo_dir`). Replaced with a behavioural one that points `--cargo` at a
     different draft and asserts the gate reports *that* id — which no hardcoded `CARGO` satisfies.

~~9. **MAKE `precompute_ladder.py --slot` OPTIONAL.**~~ Today it is `required=True`
   (`scripts/precompute_ladder.py:625`), so the seat is typed once per pick window — ~15 more times
   under a clock, and **"3" is this project's most attractive wrong answer** (three unrelated 3s).
   🚨 **THE PRESCRIPTION THIS ITEM CARRIED UNTIL 2026-08-18 COULD NOT BE TYPED.** It said to derive
   with `W.my_slot((cargo or {}).get("draft_order"))`. **There is no `cargo` variable in
   `precompute_ladder.py`, and its `--cargo` is a DIRECTORY** (`CARGO` at `:66` = `…/inbox`, help at
   `:637` says "mule cargo dir") — it borrowed `run_engine`'s meaning, where `CARGO` (`shape.py:40`)
   is the FILE `…/inbox/sleeper_draft.json`. **Two constants with the same name, two flags with the
   same name.** Corrected below; every line number re-verified 2026-08-18 and the patch was applied,
   run, and reverted (`git status` clean) to prove it.

   **THE FIX, exactly — (a)–(e) are the item; (f) and (g) ship WITH them or the feature
   under-delivers at the one moment it matters.**
   - **(a)** `:73` — after `from run_engine import freshness` insert `import watch_draft_state as W`
     (`# noqa: E402`). Safe: `sys.path.insert` is already at `:69` and `run_engine.py:72` imports the
     same module, so it loads transitively today anyway.
   - **(b)** `:625` — `required=True` → `default=None`, and extend the help at `:626-627` with
     *"Omit it and it is read from draft_order"* (mirroring `run_engine.py:295`).
   - **(c)** insert after `:664` (`print(gate_line)`) — before `a.slot`'s first consumer at `:668`:
     `raw, problem = W.load_json(os.path.join(a.cargo, "sleeper_draft.json"), encoding="utf-8-sig")`
     → `order` → `derived = W.my_slot(order)` → **raise** `SystemExit("NO SEAT. …")` when None →
     `a.slot = int(derived)` → print `[draft] slot={N} from draft_order["1390750540631150592"]`.
     ⚠️ **`utf-8-sig`, not `utf-8`** — the two existing readers of that file (`:363`, `:420-423`) use
     `utf-8`, `run_engine` uses `utf-8-sig`, and a go-time curl can carry a BOM. Match `run_engine`.
     ⚠️ `W.my_slot` **returns None, never raises** (`watch_draft_state.py:173-176`) — the raise is
     the caller's job.
   - **(d)** `:704` — `print(f"!! (you passed --slot {a.slot} to the precomputer)")` **becomes a lie
     on a derived seat.** Capture `slot_given = a.slot is not None` before (c) and branch on it.
   - **(e)** NEW TEST in `tests/test_precompute_ladder.py` — nothing covers a bare invocation today.
     Use the existing `def cargo(self, draft_id=REAL):` temp-dir pattern. ⚠️ **Do NOT point it at
     `tests/fixtures/sleeper_draft_started.json`** — the reader opens `sleeper_draft.json` by literal
     name, so the started fixture can never be seen. All 78 + 59 tests stay green through the change.
   - **(f)** `docs/draft-day-runbook.md:202-213` teaches `--cargo temp/draft.json` (a **FILE**) so the
     seat comes from a fresh curl at go time, and warns the hourly inbox *"is guaranteed to be
     behind"* at exactly the moment `draft_order` flips. **The same flag value breaks the
     precomputer.** Either make its `--cargo` accept a file OR a dir (`os.path.isfile` → use it,
     `os.path.dirname` for the rest), or document the two-step `mkdir temp/cargo && curl … >
     temp/cargo/sleeper_draft.json`. Without this the derived seat is read from a possibly
     60-minute-stale file — and **60 min trips no staleness warning** (threshold 150 min,
     `watch_draft_state.py:53`).
   - **(g)** `reference_draft_id` already computes `freshness()` at `:430` and **holds back** a stale
     draft_id at `:432`; `run_engine` holds back a stale draft_id (`:225-228`) but derives the slot
     **unconditionally** (`:190-198`). Copying that silence prints a stale-cargo seat with the same
     confidence as a fresh one. Print the age beside it.

   🚨 **AND THE NEW COST THIS FIX INTRODUCES, which nothing recorded before 2026-08-18: deriving the
   seat from `draft_order` and then "verifying" it against `draft_order` is a TAUTOLOGY.** The
   `[checked] … my_slot=N against draft_order` line becomes self-confirming — green off the very file
   the seat was read from. **The only independent oracle is our own `picked_by` in `picks.json`, and
   it cannot arm until one of our picks lands**, so from pick #1 to our first the operator reads a
   `[checked]` line that has checked nothing. That is insight 005 in a new costume, and **it is worse
   than a typo because it reads as a guard.** Make the line say WHICH oracle confirmed the seat.
   ⚠️ Bare invocation also becomes MORE attractive in a **mock**, where it would derive the REAL
   league's seat against a mock whose `draft_order` is its own (`SKILL.md:337-342` already forbids
   bare runs there — keep that 🚨 and re-point it at the new behaviour).
   ⚠️ **This does NOT remove the pre-draft typing** — `draft_order` is null until go time (confirmed
   null again on the 2026-08-18 pull), so it removes the other fourteen, not the first.
   ✅ **What the typed-seat guard already catches, proved live:** `my_slot=5 but our own picked_by
   appears on draft_slot 3 in picks.json` — a hard refusal.
10. ✅ **DONE 2026-08-18 — `docs/draft-day-runbook.md` → `### If the draft was re-created`.** The
    detector had existed since 08-14 with no remedy; it has one now, plus the two code fixes the
    doc alone would have left open: `merge_picks.py` **stops telling you to retry a 404** (and makes
    you re-check the id first, because a typo 404s identically), and both watcher alerts stopped
    naming 1 of 10 files. **1009 tests** (+10), four mutants planted and killed.
    🚨 **THE LESSON, and it cost a rewrite: the first draft of that section was confidently wrong in
    nine places.** An adversarial pass caught them all. Three worth carrying:
    - **Its verify step was guaranteed to fail.** It said `watch_draft_state.py` "exits 0" after a
      correct fix — but `save()` writes the snapshot *after* the diff and the doc itself forbids
      touching `last_seen.json`, so the old id **must** be diffed away exactly once. **The documented
      success criterion printed the alarm meaning "the draft is gone."** Now: run it twice, and the
      SECOND run is the check. Proven by running it, not by reading it.
    - **It claimed `run_engine.py --dry-run` "closes the loop end to end."** It returns before
      starting `draft_engine.py`, so it never opens the board at all. `build_board.py --verify-only`
      is the only check that compares `meta.shape.draft_id` to live cargo.
    - **Its own line numbers had rotted before it was committed** — writing the section shifted four
      of them, and the arithmetic in the fix was off by ten on two more. **The section now anchors
      every hit by surrounding text and leads with grep.** ⚠️ *Do not reintroduce line numbers into
      a remedy doc, or into a runtime alert — the watcher briefly carried `feud_mule.ps1:169`.*
    ⚠️ **And two "already handled" claims were false, both about auto-pick fodder:**
    `ladder.json` is NOT self-healing (the divert guards the WRITE path; the stale file already on
    disk still gets piped into `ffQueueSync`), and `.last_good/` must be deleted **after**
    regenerating, never before — `emit()` copies the *current* surfaces in before replacing them, so
    **the rebuild is what creates the dead-id rollback copy.**

~~10. **WRITE THE RE-CREATED-DRAFT REMEDY LIST**~~ into `docs/draft-day-runbook.md` beside the watcher's
    alert. The detector exists (`watch_draft_state.py`); the remedy does not, and a dead id returns
    **HTTP 404**, so the board sits on `poll failed` forever at a 60s backoff. **Put it between
    `:165` and `:167`, directly under the watcher paragraph that names the alert**, as
    `### If the draft was re-created`.

    **1. LEAD WITH THE SYMPTOMS — it has to be reachable from what the operator SEES:**
    `DRAFT_ALERTS.md` carries **THE DRAFT WAS REPLACED** (`watch_draft_state.py:236` and `:328`) ·
    `merge_picks.py` prints `fetch failed: HTTP Error 404` **and then the word `retry`** — ⚠️ **ignore
    it, a 404 is an answer, not a blip** (`_is_transient:109` already returns False for 4xx) · the
    board reads `· poll failed (HTTP 404) — showing the last good state, retrying` and backs off
    12→24→48→60s **forever**. 🚨 **Nothing in that chain ever says the draft is gone**, and
    `start_time`/`draft_order` on the dead object stay null forever — so the whole repo reads
    *"nothing has happened yet"* right up to go time.
    **2. GET THE NEW ID FROM THE LEAGUE, NEVER FROM A DOC:**
    `curl -sL --max-time 15 "https://api.sleeper.app/v1/league/1390509993844809728?cb=$(date +%s%N)"`
    → read `.draft_id` (the same field `watch_draft_state.py:328` compares).
    **3. THE ORDERED EDIT LIST — re-grepped and CORRECTED 2026-08-18:**
    `newsletter/feud_mule.ps1:169` + `:177` — **FIRST, then run the mule**; everything generated flows
    from its cargo · `scripts/sleeper_draft_console.js:608` `REAL_DRAFT_ID` — ⚠️ **`:608`, not `:602`,
    and `tests/test_sleeper_draft_console.py:679` MUST move in the same commit** or `:731`/`:733` go
    red · `scripts/merge_picks.py:196` — ⚠️ this is the `USAGE` **help text**, not "the refusal
    message"; the refusals carry no id, so grepping for one finds nothing and you doubt the list ·
    **regenerate, never hand-edit:** `draft-kit/players_data.json:81` and
    `draft-kit/family-feud-draft-board.html:278` (both stamped by `build_board.py:981` from cargo —
    automatic once the mule re-runs) · docs `league.md:10,54` · `data-access.md:24,105` ·
    `draft-day-runbook.md:168,181` · **`TODO.md:1687,1854,1915` — this file carries it too and the
    old list omitted itself.**
    🚨 **DELETE, do not edit:** `draft-kit/.last_good/players_data.json:81` and
    `draft-kit/.last_good/family-feud-draft-board.html:278` — gitignored rollback copies; **left
    alone, a rollback silently restores a board pinned to the dead draft.** Also delete
    `draft-kit/picks.json` — it belongs to a draft that no longer exists.
    🚫 **DO NOT TOUCH:** `newsletter/data/state/last_seen.json:3` (the watcher's `prev` snapshot —
    editing it erases the detection that fired) · `newsletter/data/state/ladder.json:30` (already
    handled — `precompute_ladder.py:369-390` diverts a mismatched ladder with a `[held back]` note) ·
    `newsletter/data/inbox/*` and `archive/*` (mule-regenerated) · `docs/insights/016:15,17` and
    `docs/live-board-plan.md:53` (**history — that file's own header at `:4` says so**) · every other
    test constant (`tests/fixtures/sleeper_draft.json`, `sleeper_league.json`,
    `test_watch_draft_state.py:28`, `test_merge_picks.py:20`,
    `test_precompute_ladder.py:411,519,526,680,681,712,743`, `test_engine_matching.py:336-347`).
    ⚠️ **The old line "test fixtures carry it too and must NOT be changed" was flatly wrong for
    `test_sleeper_draft_console.py:679`** — that one is coupled to the `.js` constant.
    **4. VERIFY:** `grep -rIn "<old_id>" . | grep -v '^./.git/'` returns only the do-not-touch set,
    the suite is green, and `python scripts/watch_draft_state.py` exits 0.

    **⊕ THE DOC ALONE LEAVES TWO WRONG SIGNALS IN CODE — fix them in the same session:**
    - `scripts/watch_draft_state.py:242` and `:336` both end *"Update the pinned draft_id in
      newsletter/feud_mule.ps1."* — **one file of ten, and it does not even name the second line in
      that same file.** Re-point both at the new runbook section.
    - `scripts/merge_picks.py:230` exits *"retry, do not advise off stale state."* — **special-case
      the 404** (`_is_transient` already classifies it) to say **do NOT retry, the draft is gone**,
      and pin it with a test asserting no second attempt is made.
11. ✅ **DONE 2026-08-18 — `tests/test_render_html.py`, 33 tests, and it found TWO live defects.**
    Three mutants planted and killed. The shipping board is **byte-identical** after both fixes
    (sha256 compared against the committed HTML, and `render_html.py` re-run standalone) — **both
    bugs are dormant on this league's shape and fire only when the shape CHANGES**, which is the
    one moment a human reads these lines to see what changed.
    - 🚨 **`starters_line` hardcoded FLEX's position** — `parts.insert(4, …)`, correct only while
      all four of QB/RB/WR/TE are started. With `TE: 0` it rendered
      `QB · 2 RB · 2 WR · K · <b>2 FLEX</b> · DEF` — the flex between the kicker and the defense.
      Now derived from the count of started skill positions.
    - 🚨 **`kicker_line` would have printed "Full PPR" over a HALF-PPR league.** It decided the
      label with `"PPR" in str(meta.format)` — and `"PPR" in "Half PPR"` is True. Meanwhile
      `shape.format_line()` was doing it correctly one file away through `SCORING_LABEL`, under a
      comment saying never to invent a label. **Two derivations of one fact — the exact KTD-1
      duplicate `format_line`'s own docstring was written against.** `render_html` now imports the
      shared map, and a test asserts the two surfaces agree on every known code so the next edit to
      either is caught by the other.
    ⚠️ **The item's own prescription would have produced two tests that assert nothing** — see the
    struck text below: `kicker_line` takes the whole SOURCE (not a shape), and `flex` is read in
    exactly one place, so "feed each a shape with a moved FLEX slot" is a no-op for two of the three.
    ✅ **`probe_picks_cache.py`'s docstring now says it is deliberately untested**, with the reason.

~~11. **TEST `scripts/render_html.py`.**~~ **Zero *assertions*, not zero coverage** — `render()` already
    executes in four tests via `B.stage()` (`test_build_board.py:102,115,143,1102`), so a KeyError
    goes red today; what is unpinned is the **content** of all five functions. All six line numbers
    below re-verified 2026-08-18. New file `tests/test_render_html.py`, header copied from
    `test_run_engine.py`, `sys.path.insert(0, os.path.join(ROOT, "scripts"))`.

    🚨 **AND THE HUNT FOUND A LIVE DEFECT THE ITEM ONLY GESTURED AT.** `render_html.py:63` does
    `parts.insert(4, f"<b>{flex} FLEX</b>")` — **a hardcoded index instead of "after the last of
    QB/RB/WR/TE that is present."** Reproduced: with `TE: 0` it renders
    `QB · 2 RB · 2 WR · K · <b>2 FLEX</b> · DEF` — FLEX between K and DEF. ⚠️ **Dormant on the live
    8-team shape** (all four are non-zero, so 4 happens to be right), so it bites only if a starter
    slot goes to zero. **Fix the index; keep the live shape as a control so the fix cannot regress.**

    ⚠️ **TWO DRIFTS IN THE OLD PRESCRIPTION — following it literally produces broken or empty tests.**
    (1) *"feed each a shape"* is wrong for `kicker_line` (`:67`): it takes the **whole source** and
    does `source["meta"]["shape"]` itself at `:68` — a bare shape raises `KeyError('meta')`.
    (2) *"a moved FLEX slot"* only exercises `starters_line`. `flex` is read at exactly one place
    (`:61`); `kicker_line` reads league/teams/format/start_time and `playoff_line` (`:83`) reads
    teams/playoff_teams — **so a literal reading yields two green tests that assert nothing**, which
    is the failure this repo has already paid for twice.

    **VARY WHAT EACH ACTUALLY READS:** `starters_line` (`:52`) — the FLEX index above ·
    `playoff_line` — `playoff_teams` 6 / 0 / absent and `teams` 8 / 12 (⚠️ `shape["teams"]` is
    REQUIRED, KeyError otherwise) · `kicker_line` — `format` with and without `"PPR"`, `start_time`
    None vs epoch-**ms** (⚠️ `:74` uses `fromtimestamp` in **local time** — build the expected string
    with the same call or the test is machine-dependent) · `data_line` (`:41`) — one line, no space
    after separators, `ensure_ascii=False` survives, `json.loads(out) == source` · `synth_date`
    (`:46`) — `"2026-08-14"` → `"Aug 14, 2026"` **and** matches `validate_board.py:791`'s own regex
    `^[A-Z][a-z]+ \d+, \d{4}$`, which is the round-trip that gate depends on.

    **`scripts/probe_picks_cache.py` stays untested on purpose** — a live network probe; **append it
    to the docstring (ends `:23`)** so its absence reads as a decision, not an oversight.
    ⚠️ **Update `README.md:116`'s test count in the SAME pass, as the last edit before the commit.**

12. ✅ **DONE 2026-08-18 — all six surfaces corrected, re-measured first.** `data-access.md` (both
    halves + the by-name list), `nightly-feud.md:53,55`, `README.md:15` and the under-dated
    verification heading at `:237`, plus one the scan missed: the **"presence is not health"
    landmine still quoted `12/12 ok`**, a string the mule stopped printing on 08-17 — a landmine
    naming the wrong string is one you scroll past. Every corrected line now points at
    `mule_status.json` rather than restating a number. ⚠️ **Left as history on purpose:**
    `insights/020:181`, the 08-07 plan, and TODO's own dated 08-09 record — a closed plan's
    *decisions* bind, its *facts* expire.
    ~~🆕 **THE MULE'S SOURCE COUNT IS WRONG ON FOUR SURFACES AND SELF-CONTRADICTORY ON TWO OF THEM.**~~
    Found 2026-08-18 by a drift scan; **measured against live cargo** (`mule_status.json`, run_at
    18:29:02) and against `feud_mule.ps1` itself, not against another doc. **The truth: 14 entries in
    `mule_status.json`, 12 of them landing in the inbox, 7 Sleeper-family endpoints** —
    `Fetch-Source` at `feud_mule.ps1:167,168,169,177,178,179,180` (7 Sleeper) + `:187-191` (5 RSS) =
    12 into the inbox, plus `Run-Fetcher` at `:205-206` writing to `draft-kit/cache/`. All four
    surfaces predate the 2026-08-17 addition of `sleeper_traded` + `sleeper_rosters`.
    - **`docs/data-access.md:45`** — *"12 entries in mule_status.json; only 10 of them land in the
      inbox"* → **14 and 12**. 🚨 This is the one line the repo points operators at to reason about
      cargo without a network call, **and it is wrong in both halves**: an operator auditing it
      counts 14, concludes two sources are phantom, and distrusts good data under a clock.
    - **`docs/data-access.md:43`** — *"10 sources … five Sleeper endpoints plus five fantasy RSS"* →
      **12 sources, seven Sleeper endpoints.** ⚠️ CLAUDE.md names this file as the OWNER of what the
      mule carries. A doc that owns a truth and states it stale is worse than no doc.
    - **`docs/nightly-feud.md:53`** — says **10**; **`:10` of the same file says 14.** The file
      contradicts itself and offers no way to tell which is current. This is the repo's own landmine
      caught in the act — *"a stat updated mid-session is stale by the commit."*
    - **`docs/nightly-feud.md:55`** — the **by-name** list *"(league, users, draft, trending add,
      trending drop)"* omits `sleeper_traded` and `sleeper_rosters`. ⚠️ A by-name list is what a
      reader trusts to know a fetch exists before writing a consumer — and **`sleeper_traded` having
      zero readers is a defect this repo already shipped once.**
    - **`README.md:15`** implies 12 while **`:239` says 14** — and `:15` is in the opening feature
      table, so **the wrong number wins on every skim** and the right one sits 224 lines below.
    - **`README.md:237`** heads the block *"Verified on this machine 2026-08-08"* while the sentence
      it introduces carries the **08-17** number. ⚠️ Under-dating a fresh fact teaches the reader
      that the stamps are decorative.
    **THE FIX IS NOT JUST A NEW NUMBER — copy the hedge that already works.** `README.md:240` gets
    the volatile item counts right *and* says *"Item counts move daily; re-read `mule_status.json`
    rather than quoting these."* Every line above should point at the live file the same way.

~~**The "will he be there at my next pick?" indicator.**~~ 🚨 **BUILT, MEASURED, AND REFUSED
2026-08-17. Do not ship it — and do not rebuild it from the pooled number.**
`scripts/availability.py` exists and is the measurement, not the feature. The model is one line:
`slack = D − G`, where `D` is the still-available players the market ranks above him and `G` is the
opposing picks until our next turn. Scored on **7 distinct real human drafts** pulled full from
Sleeper, leave-one-draft-out, with a leakage control.
- **Pooled it looks shippable: +0.095 over the base rate on the top-24 available.** That number
  describes 10- and 12-team rooms, which are six of the seven drafts.
- 🚨 **In the ONLY 8-team room we hold it is negative at EVERY gap** (−0.006 to −0.046). The
  best-possible in-sample threshold there scores **0.648 against a 0.656 base rate** — a ceiling
  *below* guessing, handed the fit. Quoting the pooled column at ourselves is
  [insight 022](docs/insights/022-the-opponent-prior-lost-to-always-guess-wr.md)'s exact error.
- **The mechanism, and it is why this is not noise:** a 12-team room spends 192 picks on a
  ~206-deep list and consumes the board; an 8-team room spends 128 on the same list and leaves ~50
  of the top 180 undrafted. **The best available player comes back to us 47% of the time, against
  21% in a 12-team room.** Nothing is ever confidently gone, so no threshold can beat "assume he
  is there".
- ✅ **THE FINDING WORTH KEEPING:** standard draft advice — *"take him now, he'll never last"* — is
  written for 12-team rooms. **Ours is far more forgiving of waiting.** ⚠️ Direction only, one
  draft; never put a percentage on the board.
- `draft-kit/availability_calibration.json` reads **SILENT at every gap for all 8 seats** and the
  engine must render nothing where it says SILENT. **Re-open only with more 8-team feeds** (the
  room plays every year, so 2026 adds one) — never by loosening `MIN_EDGE`.
  Full write-up: [`insight 027`](docs/insights/027-the-availability-model-works-in-every-room-but-ours.md).

~~**Leg (d) — the off-clock doctrine terminals.**~~ 🚨 **DEAD AS DESIGNED, 2026-08-14. Do not build
it.** Its stated purpose was *"the only honest route to a validated opponent model."* It proposed
to reach that by **inventing** one opposing doctrine per terminal — which is a fabricated number
one level deeper than the enumeration [`021`](docs/insights/021-the-simulation-had-a-closed-form-and-was-measuring-its-own-sampler.md)
already deleted, and would have been the **fifth** tautology this project caught.
**The opponents are not hypothetical.** Sleeper serves every pick every one of them has ever made,
and `scripts/scout_opponents.py` now reads it: **37 leagues, 18 drafter-views of 7 DISTINCT
comparable 1QB redrafts, measured** (⚠️ the two counts are not the same thing — see insight 022).
Full profiles and their landmines: [`docs/opponents.md`](docs/opponents.md).
🚨 **AND THE MEASURED MODEL DID NOT SURVIVE ITS FLOOR CONTROL EITHER — see the opponent-profiles
entry in the ranked list above and
[`insight 022`](docs/insights/022-the-opponent-prior-lost-to-always-guess-wr.md).** Reading the
opponents was the right move and it produced real room-level base rates; **believing the
per-seat profiles would have been leg (d)'s own error committed with better data.** What is left
here is nothing — no simulator, no seat map, no prior.

**🚨 THE SINGLE MOST ACTIONABLE THING WE LEARNED (2026-08-14), and it corrects this file.**
`QB1` is worth **129.7** on this board against `RB1` **268.4** and `WR1` **242.7** — **an elite QB
is worth about half an elite RB or WR here**, and Josh Allen's `vorp` of 129.7 puts his value slot
near **pick 15-18 overall**.
- ⚠️ **The `Lamar Jackson +106.7` line elsewhere in this file is a VALUE-VS-ADP statement — that
  the market lets him fall ~21 spots past his price around pick 60. It is NOT an argument for
  drafting a QB early, and it was misread that way in session on 2026-08-14 before being caught.**
- **QBs appear to leave this room earlier than the market expects — a DIRECTION, not a count.**
  The first QB went before the ADP board's first QB (Josh Allen, overall **#29**; the top 24
  contain **no** QB) in **6 of 7 distinct drafts**, median pick **18**. ⚠️ **Two earlier framings
  of this line were wrong and are corrected here:** "two of seven opponents reliably" did not
  survive cross-validation, and "9 of 18 drafts" was counting drafter-views as drafts. ⚠️ **And
  the comparison is 2023-2025 behaviour against a 2026 price list, with six of the seven rooms
  larger than ours** — both confounds unremovable with what we hold. If it holds, elite RB/WR
  slide to us, which compounds with the board already being priced for 8-team replacement while
  the blended ADP is not. **Stay alert to it; do not plan a pick around it.**
- **The room waits on TE — `past R5` in 15 of 18 drafter-views**, only Kaeperni excepted. `TE1` is
  priced **134.7**, above QB1. ⚠️ ~~**and carries the largest measured spread on the board, sd
  30.5**~~ — **INVERTED AND CORRECTED 2026-08-14**: that ranked risk by the SMALLER of the two
  error terms. With the dominant term included (insight 023), **`TE1` has the LOWEST total spread
  of the four positional #1s — 60.6, against RB1's 145.1.** The elite TE is uncontested here *and*
  the least volatile premium pick. ⚠️ Its REALISED value is **76.0, not the 134.7 shown** — the
  board overstates every top slot ~2x.
- **Nobody takes a K before round 10, 18/18.** No edge here, only a way to lose one.

🚨 **THE BIGGEST FINDING OF 2026-08-14, AND IT NEEDS A DECISION: THE CURVE ANSWERS A QUESTION
NOBODY CAN DRAFT.** `curve[pos][k]` is *"what did the player who **finished** kth score"* — an
order statistic, selected after the fact for beating expectations. **You cannot draft a finish.**
`scripts/realized_value.py` (U17) measures what drafting the preseason #k actually returned, over
11 seasons of historical ADP joined to real scoring at **98-99% coverage**. Full write-up:
[`insight 023`](docs/insights/023-the-curve-answers-a-question-nobody-can-draft.md).

| slot | realised (2015-2025) | SEM | board ships | ratio |
|---|---|---|---|---|
| **QB1** | **10.2** | 26.6 | **129.7** | **12.7x** |
| RB1 | 105.2 | 42.2 | 268.4 | 2.55x |
| WR1 | 133.9 | 26.9 | 242.7 | 1.81x |
| TE1 | 76.0 | 20.1 | 134.8 | 1.77x |

- 🚨 **AN ELITE QB HAS BEEN WORTH NOTHING IN THIS FORMAT.** Preseason QB1-QB12 realised
  `10.2 · 63.4 · -14.6 · 18.6 · 9.0 · 4.7 · 2.6 · -38.8 · -26.7 · -31.0 · -10.3 · -15.3` — twelve
  cells, all at or below zero, eleven seasons. **Third independent line of evidence**, after the
  board's own arithmetic and the room's 2023 head-to-head results.
- ✅ **AND THE DECISION ITSELF WAS PUT ON TRIAL — the FOURTH line, and the only one that tests
  the choice rather than the valuation.** The first backtest could not settle this: `ORDER` and
  `REALISED` **both already decline** an early QB, so comparing them says nothing about timing.
  A `QB-EARLY` arm forces a round-2 quarterback (this room's reachers' measured behaviour).
  Over 12 held-out seasons: margin **−49.8 ± 25.6, 1.9σ below zero, negative in 9 of 12**, and it
  **loses to all three** other arms (+23.7 / +41.9 / +49.1). ⚠️ **Nothing clears 2σ at n=12** —
  quote it as four independent lines agreeing, never as proof.
  **Practical read for draft day: do not spend a top-3-round pick on a quarterback. The measured
  cost is ~25-50 starting-lineup points a season against a ~1900-point baseline — small, real,
  and free to avoid.**
- ⚠️ **The overstatement is NOT uniform** (12.7x at QB against 1.77x at TE), so the board's
  **cross-position ordering** is distorted, not just its scale. Stable across all three windows.
- ⚠️ **DO NOT SWAP THE CURVE FOR IT WHOLESALE.** The realised curve is the right *quantity*
  measured with the wrong *precision* — per-cell SEM 20-42, and it comes out **non-monotonic**
  (RB3 176.4 beats RB1 105.2; RB7 beats RB5). A straight swap ships a board asserting RB7 > RB1.
- ⚠️ **It also INVERTS the TE risk reading below.** Term (a) alone said `TE1` was the highest
  variance slot (sd 30.5); with the dominant term included **TE1 has the LOWEST total spread of
  the four positional #1s** (60.6 vs RB1's 145.1).
- ✅ **DECIDED BY MEASUREMENT, NOT BY VOTE — DO NOT REPRICE THE BOARD (2026-08-14).**
  **Reproduce with `python scripts/backtest_board.py` — bare, no flags** (the defaults ARE the
  published invocation as of 2026-08-14: `--years 2010-2025 --first-test 2014`). ⚠️ **Until today
  they were `2015-2025 / 2019`, which prints 11 seasons and `ORDER +35.7 ± 50.1` — POSITIVE, the
  opposite sign to every figure below — and the real invocation was written down nowhere.** The
  docs were right and the tool disagreed with them by default. Changing the year range changes the
  headline; do not narrow it casually.
  `scripts/backtest_board.py` (U18) held out 12 seasons, built every valuation from earlier
  seasons ONLY, ran real 8-team snake drafts at all 8 slots and scored the actual starting
  lineup against the seven opponents inside the same draft.
  | arm | margin over the room | |
  |---|---|---|
  | ORDER (what the board ships) | **−18.9** ± 36.7 | 0.5σ |
  | REALISED (insight 023's curve) | **+1.5** ± 47.2 | 0.0σ |
  | ORDER − REALISED | −25.4 ± 55.6 | 0.5σ |
  **Nothing is distinguishable.** The realised curve is not better — so it is not shipped.
  ⚠️ **It is not worse either**; an earlier "REALISED loses at 2.2σ" was an artifact of a
  strawman drafting bot and evaporated when the simulator was fixed.
  ⚠️ **AND THE BOARD'S OWN VBD LAYER IS NOT MEASURABLY BETTER THAN DRAFTING STRAIGHT DOWN ADP**
  (−18.9 ± 36.7). **That is UNRESOLVED, not EQUAL** — 12 seasons cannot resolve a difference this
  small, and the script prints that sentence every run. Do not quote it as "the board doesn't
  work", and do not quote it as "the board works".
  🚨 **FOUR modelling errors were found inside that simulator and EACH produced a confident,
  publishable-looking, DIFFERENT answer** — no baseline (QBs first), unforced starters (punished a
  model for its own conclusion), greedy value (six RBs in six rounds), marginal-over-empty-lineup
  (QBs first again). Read
  [`insight 024`](docs/insights/024-four-broken-simulators-four-confident-answers.md) **before
  trusting any simulation result in this repo**, including this one. They were caught only by
  printing what the arms actually DRAFTED, never by a score.

**📏 THE BOARD'S ERROR BARS ARE MEASURED NOW (2026-08-14).** The board prints `vorp` to one decimal,
which asserts a precision nobody had ever checked. ⚠️ **This section measures only the SMALLER of
the two error terms — see the block immediately above; term (b) is 1.4x to 25x larger.**
- **Spread of `vorp` at each rank, over the 4 seasons that build the curve:** `RB1` 19.3 · `RB2`
  **31.5** · `RB4` **35.9** · `WR1` 15.3 · `WR2` 25.3 · `QB1` 22.8 · **`TE1` 30.5** — against
  deep ranks at `WR20` **4.4** and `RB20` **4.7**. **The fog is concentrated at RB2-4 and TE1-4,
  which is exactly where picks 1.2 through 2.x land.**
- **76% of top-12 pairs (50 of 66) hold in ALL FOUR seasons.** The ordering is not mush.
- **The five pairs it splits on**, which are where the one-decimal precision is fake:
  Chase over Gibbs **2/4** (board gap **+17.0**) · Chase Brown over St. Brown 2/4 (+10.0) ·
  JSN over Jeanty 2/4 (+5.7) · Nacua over Taylor 2/4 (+4.1) · Cook over Lamb 2/4 (+1.0).
- ⚠️ **THIS IS A LOWER BOUND AND MUST ALWAYS BE QUOTED AS ONE.** It measures how much *"what the
  RB2 slot scores"* varies year to year. It does **not** measure whether the player the consensus
  ranks RB2 finishes RB2 — almost certainly the larger term, and it needs historical preseason ECR
  we do not hold. ~~**Probing for that source is the cheapest high-value item not on this list.**~~
  ✅ **PROBED AND ANSWERED 2026-08-14 by U17 — do not re-open it as an idea.** That larger term is
  measured in `scripts/realized_value.py` (insight 023), and it deliberately indexes on **FFC ADP,
  not ECR**: its docstring at :32-35 names the ECR archive and declines it — *"it publishes history
  back to 2010 and ECR history is a 102 MB archive… they are not the same list."* ⚠️ The residual
  is only that the measurement runs on ADP; **never describe its input as "the board's own rank."**

**✅ THE LONG-TD BONUS IS EXACTLY COMPUTABLE — this file said it was not (2026-08-14).**
The old claim: *"no TD-distance column exists on either release, so it needs play-by-play"*, with
~5% TD-attribution error attached. **The first half is true and the second is false.**
- `play_by_play_{year}.csv.gz` (nflverse `pbp` release, ~19 MB/season, **2022-2025 all cached**)
  carries `touchdown`, `td_player_id`, `yards_gained`, `pass_touchdown`, `rush_touchdown`.
- **Reconciled against the stat file's OWN td columns: passing 809/809, rushing 511/511, receiving
  809/809 on 2024, and 811/510/811 on 2025 — ZERO disagreements.** The ~5% figure describes
  rebuilding whole stat lines from pbp, not attributing touchdowns.
- 🚨 **ATTRIBUTE TO `td_player_id`, NOT `receiver_player_id`.** The catcher is not always the
  scorer. Using the catcher disagreed on **5 of 257 receivers** (Lions laterals plus a Josh Allen
  trick-play catch) **while the season TOTAL still matched at 809** — a pure misattribution, which
  is the failure mode a total-only check cannot see.
- **Measured worth, after the baseline cancels: ~nothing.** `QB12` gains **+7.0** against `QB1`'s
  +8.8, so elite QB nets **+1.8** and QB3-QB30 go NEGATIVE. RB/WR net looked big (+6.8 at RB2,
  +7.8 at WR2) — ⚠️ **and that is sampling noise**: `WR1`'s +5.2 is drawn from `[0.0, 4.0, 15.0,
  2.0]`, sd **5.8**, larger than the mean; `TE2` is `[0, 0, 0, 0]`. Long TDs are a rare event, so
  at a rank the bonus is a lottery over *which player* held the slot. **Only QB is structurally
  stable (`QB12` = `[6.0, 8.0, 7.0, 7.0]`, sd 0.7) and QB is where it cancels.**
- **Build it for correctness — `scoring.py`'s own rule, "silently omitting a rule that exists is
  how a number becomes a lie." Never sell it as edge.**
- ⚠️ **It cannot do what `league.md` claims for it.** A rank-based curve shifts the average at each
  rank, so a possession WR2 and a deep-threat WR2 get the identical bonus. Rewarding a specific
  boom player needs per-player projections — the entry KILLED on leakage in the ranked list.

**✅ SLEEPER SERVES STAT-LINE PROJECTIONS, AND THEY JOIN PERFECTLY (2026-08-14).**
`https://api.sleeper.app/projections/nfl/2026?season_type=regular&position[]=...` — 3,300 records,
`company: rotowire`, season totals with full components (`pass_yd/pass_td/pass_int/rush_yd/rush_td/
rec/rec_yd/rec_td/fum_lost/2pt`).
- **Keyed on `player_id` = the `sleeperId` U14 froze. 174 of 174 board rows join, zero misses.**
  No name matching anywhere in the chain.
- **ORACLE: `scoring.score()` reproduces their published `pts_ppr` on 556 of 557 skill
  projections.** The single miss is **us being right** — Travis Hunter carries `idp_int` and
  `idp_fum_rec` (he plays corner) and their total folds in IDP scoring worth exactly the 4.0 gap.
  Family Feud has no IDP. **Sleeper's default PPR also charges −1 per INT, same as this league.**
- 🚨 **THE STRUCTURAL FINDING, which matters more than the source.** `curve[WR][1] = 387.5` is an
  **order statistic** — what the player who *actually finished* WR1 scored, selected for beating
  expectations. **No individual player's expectation can equal it.** Rotowire's best WR is
  **311.1**. The curve overstates the top *as an expectation*; a projection understates the ceiling
  *as an outcome*. Mean |delta| across 149 skill players **24.5**, max **97.6**. Neither is wrong —
  they answer different questions, and VBD theory wants the expectation.
- ⚠️ **`gp` is 18.0 on all 557 projections.** Not one player is projected to miss a game, so
  availability carries **zero** information in this source. Do not use it as a denominator or as a
  fragility signal.
- **K and DEF cannot be scored from it** — kickers carry no sub-40 FG makes, DEF carries only the
  `pts_allow_0` bucket. Both Aug-8 decisions stand untouched.

**◀ 2. THE MOCK-DRAFT HARNESS.** Proven 2026-08-09 that the whole spine already runs against a
real Sleeper mock with **zero new code** — see the operating facts below. Legs **(b)** and **(c)**
are now both built and both wired into the runbook. **Leg (d) is dead as designed** (2026-08-14) —
the opponent model it existed to fake is now measured from Sleeper instead; see the DEAD AS
DESIGNED block under NEXT ACTION. **The harness is complete.**

**✅ LEG (b) IS BUILT — `scripts/precompute_ladder.py`, wired into runbook Step 3.4 and PRE-ARM
THE QUEUE.** One command, ~0.1s, run the moment your pick lands. It shells out to the real engine
(never a second ranking) and prints the queue order, one market scenario, and which tier cliffs
that scenario empties. **52 tests, 10 mutants planted and 10 killed.**

❓ **ONE OPEN QUESTION FOR BRIGGSY, ONE WORD — should QUEUE lead the precomputer's output?**
Today the market projection prints first and **QUEUE** sits under it. Under a 120s clock the queue is
the only *actionable* block (it is what you paste into Sleeper); the projection is the reasoning
behind it. **Recommendation: flip it — QUEUE first, projection under.** Not changed unilaterally
because it is the layout of the one thing you read under pressure, and that is your eye's call, not a
correctness question. Raised twice in the 2026-08-09 session and never answered, so it is written
down here instead of dying with the session. `scripts/precompute_ladder.py`, the print order at the
bottom of `main()`.

✅ **AND THE WHOLE SPINE IS PROVEN END-TO-END IN A LIVE ROOM — mock `1392338436949561355`,
2026-08-09, created and driven entirely from this repo with no human click.** Every link, in order:
- `ffStartDraft({iAmInAMock:true})` returned **`confirmsAnswered: 1`** and left `window.confirm`
  restored to the **same native function object** — the safety property, checked rather than
  assumed. Both guards were exercised first and both refused (no flag, and truthy-but-not-`true`).
- The seat came from `draft_order["1390750540631150592"]` = **5**, a seat deliberately chosen NOT
  to be 3 so the project's most attractive wrong answer could not pass by coincidence.
- **The seat oracle was positive- AND negative-controlled live.** With this draft's own cargo
  staged, `--slot 5` printed `[checked] teams=8 · rounds=15 · my_slot=5 against draft_order`;
  `--slot 3` was **hard-refused** by the engine (`my_slot=3 but draft_order[...] = 5`), **exit 1**.
- `merge_picks.py` **refused the first fetch** because `draft-kit/picks.json` still held 18 picks
  from a spent mock — the contamination gate firing for real, unprompted.
- The precomputer ran against the live feed, printed **ON THE CLOCK NOW** at pick #5 (gap 0), and
  mid-draft printed a real 5-pick projection with `LOST to the market: Cam Skattebo`.
- `ffQueue` loaded its top three **in the printed order**, each verified by the count incrementing
  (`empty->1`, `1->2`, `2->3`); `ffQueueList` agreed with the tab count; Sleeper labelled our
  queue-top **NEXT PICK**.
- 🚨 **With the queue loaded, auto-pick took OUR queue-top — Ja'Marr Chase — at pick #5 on slot 5**,
  then fell back to Sleeper's board (Omarion Hampton, #12) once the queue drained. Confirmed
  against `/picks`, never from the browser.
- ✅ ~~**The AUTO-PICK toggle still does not respond to synthetic events**~~ **CORRECTED 2026-08-15
  — it responds fine; we were clicking the wrong node.** `.autopick-toggle` is a bare wrapper with
  no handler; the `onClick` is on `span.slider` three levels below. Events bubble UP, never DOWN,
  so no sequence fired at an ancestor could ever reach it. Measured with a controlled pair (wrapper
  → no change, `.slider` → toggled, restored clean). Use `ffAutoPick(true|false)`.
- ⚠️ **The `+` on `/draftboards` opens the LEAGUE wizard, not the mock creator.** It created a real
  1-person league (`Ladder Test 0809`, `1392338161744490496`) sitting in the sidebar next to Family
  Feud. **The mock creator is the `NEW MOCK NFL DRAFT` button in the right-hand panel.**
  🚧 **BLOCKER, NOT A TASK — that league is still sitting there and only Briggsy can remove it.**
  Deleting data is outside what this project's automation is permitted to do, so it cannot be scripted
  away. It is harmless where it is (1 person, never drafted, its own draft id) and the only real cost
  is that it looks like Family Feud in a sidebar glance on draft morning. Sleeper → `Ladder Test 0809`
  → league settings → delete, whenever you feel like it. **Do not "clean it up" from a session.**

🚨 **AND THE FIRST VERSION OF IT WAS A TAUTOLOGY MACHINE — the fourth this project has caught, and
the largest.** It enumerated futures: sample `gap` players from a pool, run the real engine on each,
report how often each name tops BEST AVAILABLE and how often each tier empties. 495 engine
subprocesses. Both tables were then measured against their closed forms and **matched to the digit**:

| output | measured | closed form |
|---|---|---|
| tops BEST AVAILABLE, by board rank | 330 / 120 / 36 / 8 / 1 | `C(k-i-1, gap-i)` → 330 / 120 / 36 / 8 / 1 |
| tier empties (RB T3, 1 left · WR T4, 2 left) | 0.333 · 0.091 | `C(k-L, gap-L)/C(k,gap)` → 0.333 · 0.091 |

Neither number knows anything about football — both are functions of the pool size, the gap, and a
count the engine already prints **on the same line**. It is the *"survives 67%"* figure the file had
already deleted for exactly this reason, reprinted as BOTH headline blocks. **Widening the pool does
not rescue it: the closed form holds for any k.** Only a non-uniform opponent model would make
enumeration informative, and an unvalidated opponent model is a fabricated number one level deeper.
**The enumeration is gone**, and `test_the_enumeration_stays_dead` keeps it gone.
- ⚠️ **Its sampler was independently broken and nothing noticed.** SHA-256 is 32 bytes, so
  `h[b*4:(b+1)*4]` was **empty** for every draw past the 8th and `int.from_bytes(b"", "big")` is 0
  — forcing pool[0] into **60 of 60** sampled futures against a uniform expectation of 3.5. It only
  bites at gap ≥ 9, and with a 12-name pool the space is always exhaustive, so it was invisible.
  **Widening the pool would have made it live.** A dead code path is not a safe one.

⚠️ **THE ADP EDGE CLAIM WAS FALSIFIED, AND IT WAS LOAD-BEARING.** `market_order()` asserted that
ordering opponents by our own board "would explore the wrong futures entirely." Scored over 18 stops
of the committed 120-pick feed: **market ADP 29/84 (35%) · null model, our own board order, 28/84
(33%) · floor control 1/84 (1%)**. One player in 84. The floor proves the metric *can* tell
orderings apart — so this is "these two are equivalent", not "the instrument is blind".
**`--backtest` now reprints all three arms every run**, so it cannot quietly become folklore again.

⚠️ **THE POOL WAS CAPPED AT 12 AND `--pool` WAS A DEAD KNOB.** Candidates came from BEST AVAILABLE,
which `draft_engine.py:446` caps at `BEST_N = 12`, so `--pool 24` (the default) and the docstring's
`--pool 30` were both impossible. Measured against the real feed, **37% of the picks that actually
happen land outside those 12** (35% on our board but deeper, 2% off it entirely) — and every one of
them can still empty a tier, because `draft_engine.py:456` counts a cliff over the WHOLE tier.
Folding in the tier-cliff names takes the candidate set to **31-42** with every name still coming
from the engine's own output. That also lifts the projection's ceiling: it silently modelled at most
12 removals however far away our pick was, and **an 8-team snake turns a slot-1 or slot-8 seat around
with a gap of 14.**

⚠️ **THE SEAT WAS TAKEN ON TRUST AND THE ENGINE'S OWN WARNING WAS SWALLOWED.** `run_engine` uses a
temp cwd, and `draft_engine.py:207` resolves its cargo oracle relative to cwd — so the seat check
could never run and the `** my_slot=N IS UNVERIFIED **` banner fired on **every** run into a void.
`stage_cargo()` now puts the cargo where the engine looks, and the banner is surfaced verbatim.
- ⚠️ **The first version of that fix was a FALSE RED** — it raised the seat alarm on any
  `[unverified]` line, including the routine "cargo is pinned to a different draft" note that
  appears on runs whose seat the engine **did** confirm from our own `picked_by`. Insight 009: a
  false red is the more dangerous direction, because it teaches the operator to skip the gate.
  The three channels (`**` banner / `[unverified]` / `[checked]`) are parsed separately now.
- **Proven both ways:** `--slot 1` against a feed whose `picked_by` says slot 3 is REFUSED by the
  engine's fatal gate, through the precomputer; and with `picked_by` stripped, the banner fires.

⚠️ **TWO MUTANTS SURVIVED THE FIRST PASS — insight 019 again, both on axes I had not probed.**
- **M4** (price an unpriced player at ADP 9999): the test asserted the right output *for the wrong
  reason* — an unpriced player sorts last under the fiat too, so both implementations agreed. They
  diverge only in the order **among** unpriced players. A test now pins board order there.
- **M8** (never call `stage_cargo`, hardcode `staged`): the function had tests, its **call site had
  none** — insight 013 exactly. The proof had to come from the engine's own mouth: it can only name
  the fixture's `draft_id` if it really opened the file we staged, and a negative control asserts
  that id is absent when there is no cargo.

- **One terminal on the clock, never a fleet.** A draft is maximally coupled — one board, one
  clock, one decision, mutating every 120s. ✏️ **This line used to justify itself with "a live run
  proved the human-in-terminal loop is too slow: the 4.3 clock expired while the engine was being
  run in Bash." THAT GENERALISATION IS FALSIFIED — measured 2026-08-15, insight 026.** Seven picks
  on a live 120s clock used **24-61s**, the engine never exceeded **0.18s**, and 96-98% of the cost
  was round-trip latency rather than computation. The single-terminal rule still stands on
  *coupling*, which is the real reason; it no longer needs a speed claim that is not true.
- **The answer must exist BEFORE the clock starts.** Do the work offline where time is free; on the
  clock do a LOOKUP, not a deliberation. ✏️ **This line used to say "pre-compute the BRANCHES," and
  the branches turned out to be the one part that could not be pre-computed usefully** — enumerating
  futures uniformly produces `C(k-i-1, gap-i)`, a fact about the shape of the draw and not about this
  draft (insight 021). The *principle* is untouched and is exactly what `scripts/precompute_ladder.py`
  delivers; only the named mechanism was wrong. Reworded 2026-08-14 — **say so if you want the
  original wording back**. ⚠️ **This bullet used to end "a real branch precompute needs leg (d)
  first" — that route is now closed at both ends** (leg (d) killed as fabrication, and the
  measured replacement failed its floor control, insight 022). A branch precompute needs a
  predictive opponent model, and **we have measured that we do not have one.**
- **Keep a player queued at all times**, so a blown clock degrades to *our* board instead of
  Sleeper's. Measured cost of not doing this: auto-pick took Tetairoa McMillan (81.3) at 5.3 while
  **Lamar Jackson (~107) was still on the board and did not go until #40**.
- **Many terminals only OFF the clock**, one per opposing doctrine, and **forbidden to talk** —
  opponents that share a brain are not opponents.

⚠️ **OPERATING FACTS FOR ANY MOCK WORK — all measured 2026-08-09, none of them guessable:**
- **Mocks never appear in `/user/<id>/drafts`.** Only the real league does. ✅ **But the browser URL
  is NOT the only way to learn a mock's `draft_id`** — that claim was too strong. Sleeper drives the
  room over a **Phoenix WebSocket**, so there is no HTTP call to intercept and no id in the DOM, but
  the mock-draft CARD on `/draftboards` carries the id as its **React key**: walk
  `__reactFiber$*` up from the card and read the 18-19 digit key. Measured 2026-08-09; that is how
  `1391539007871012864` was found without a single click into the room.
- ⚠️ **`1390923383440424960` is NOT a "reusable pre_draft shell"** — this file said it was. All
  three documented mocks (`...923...`, `...830...`, `...789...`) re-pull as **`complete`**. The
  first of them is the room the 120-pick lab fixture came from, so of course it is spent.
- **A mock's `league_id` is `null`** — that is the signature that distinguishes it from the real draft.
- **A mock DOES populate `draft_order`** (`{"1390750540631150592": 3}` on all three). The real
  draft's is still null, so **a mock is the only way to rehearse `run_engine.py`'s seat read.**
- **`slot_to_roster_id` is the identity map on mocks too** — re-confirmed live, still the most
  attractive wrong answer in the project.
- **A mock's roster carries `slots_bn: None`.** `read_shape` handles it (bench → 0), and the shape
  banner correctly prints no bench.
- ✅ **START DRAFT runs unattended — `ffStartDraft({ iAmInAMock: true })`, 2026-08-09.**
  **The story here is the lesson.** This entry claimed *"✅ SOLVED"* for a `window.confirm` override
  that **existed in no file**, while `docs/draft-day-runbook.md:200` said the opposite — *"have
  Briggsy click START himself"*. An audit demoted this entry to NOT SOLVED on the grounds that no
  code existed; **Briggsy overruled it** — the technique had genuinely been worked out live, and the
  older runbook line was the stale one. Both were right about their own half and **neither was
  executable, so the disagreement could not be settled by running anything.** It is code now, and
  both docs point at it.
  - The confirm is neutralised **before** the click (a native dialog freezes the extension — every
    command times out and it looks like the bridge died) and restored in a **`finally`**.
  - ⚠️ **The restore puts back WHATEVER WAS THERE, not "the native one"** — a previous call may have
    left its own, and mutant S2 proves the difference. An auto-accept hook left armed silently
    accepts the next destructive dialog and nothing reports it.
  - **Two deliberately redundant guards:** the explicit `iAmInAMock` flag, and a hard refusal on the
    real draft id. The id guard **goes stale if the draft is ever re-created** (which
    `watch_draft_state.py` exists because of), and the flag does not — neither alone is enough.
  - Like `ffDraft`, it reports a **CLICK**. Confirm `status` left `pre_draft` on the draft object.
  - **6 mutants planted, 6 killed**, including "never restore" and "arm the override after the
    click".
  - ✅ **PROVEN IN A LIVE ROOM 2026-08-09.** It returned `confirmsAnswered: 1` — the dialog really
    was raised and really was answered by the override — the START control disappeared, and the API
    confirmed `status: drafting` with `start_time` populated. **No human clicked anything.**
  - ⚠️ **A real browser and the node stub disagree about what "restored" looks like.** In a
    browser `confirm` is ALWAYS an own property of `window`, so `hasOwnProperty` is true before and
    after and proves nothing; the real check is that `window.confirm.toString()` still reports
    `[native code]` and is the same function object. Both were verified live. The code is correct
    in both worlds because it branches on whether the property existed beforehand.
- **Miss your clock once and Sleeper puts you on auto-pick and LEAVES you there** for the rest of
  the draft. It drafted rounds 4-15 before this was noticed.
- **`picked_by` identifies the SEAT OWNER, not the agent.** Auto-pick on a claimed seat still
  stamps your user_id, so it cannot tell you whether a human chose.

⚠️ **DRIVING THE ROOM — `scripts/sleeper_draft_console.js` (`ffFind` / `ffDraft` / `ffQueue`),
all measured:**
- **NEVER click the draft room by screenshot coordinate.** Screenshot pixels are not CSS pixels
  and the scale drifts between captures: viewport is **1536×791 CSS** while successive screenshots
  came back **1568×750** and **1522×784**, putting a row that lives at CSS y=544 at y=562. **18px
  of error on a 26px row** — it cost a real pick (McBride, 2.6). Address the DOM instead.
- 🚨 ~~**The row's leftmost cell (`row.children[0]`, ~34px, holds an svg, no text) IS the draft
  button**~~ **WRONG, and this exact sentence is what broke `ffDraft`. Corrected 2026-08-15.**
  `row.children[0]` is `div.draft-button-wrapper`, which owns **no handler**; the draft button is
  its **child** `div.draft-button` (24×24). Clicking the wrapper drafts nobody and opens the player
  card. The shape test agreed with this line because `querySelectorAll('svg')` searches
  **descendants** — so it was satisfied by the wrapper while describing the button. Reach it as
  `row.children[0].querySelector('.draft-button')`. It is still NOT a queue button — that separate
  misread is what made the first mock look like queue-plus-auto-pick worked.
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
- ⚠️ **THE QUEUE MECHANISM IS PROVEN. ITS ORACLE WAS BROKEN UNTIL 2026-08-09 (later that day) —
  read this before trusting a `queued:true`.** What a live room proved is that **auto-pick drains
  your queue first** (the Dicker measurement below). What was NOT proven, and was in fact false, is
  this repo's ability to tell you whether a player made it in. `ffQueue`'s verdict was
  `before !== after || label !== null`, where before/after asked *"does the page say 'No players in
  your queue'"*. **Once the queue holds anybody, both are false**, so the verdict collapsed to
  *"is the string `QUEUE (n)` rendered anywhere on the page"* — true whenever the panel is open.
  **Every add after the first returned `queued:true` unconditionally, click or no click**, and with
  the panel closed a *successful* add returned `queued:false`. That is the exact ffDraft sin — the
  browser as oracle for its own action — reintroduced inside the control this file had just
  promoted to "the safety net", and the whole draft-day plan had been rebuilt on top of it.
  **FIXED:** the verdict is now the named function `queueVerdict()`, which requires the **count to
  increment by exactly one** and **refuses** on an unreadable count, a no-move, or a jump; the flat
  1200ms sleep became a poll. `tests/test_sleeper_draft_console.py` runs it in node — **28 tests,
  6 mutants planted, 6 killed.** ⚠️ **Mutant M6 — "read once instead of polling" — SURVIVED the
  first pass**, because every stub applied the click synchronously and so could not tell a poll
  from a single read. Insight 019 again: the mutants only probe the axis you already suspect. The
  stub now models an async re-render.
- ✅ **"KEEP THE QUEUE RANKED" IS EXECUTABLE NOW — `ffQueueList()` and `ffUnqueue()` exist, and
  the whole set was PROVEN IN A LIVE ROOM 2026-08-09** (mock `1391539007871012864`).
  Measured, not guessed: each queue entry carries an element whose **own text is exactly `REMOVE`**,
  and **two levels up** is the row `"Jahmyr Gibbs | RB | DET | ADP | 1.6 | PTS | 331.4 | REMOVE"`.
  Document order == visual order, and Sleeper labels the first entry **"NEXT PICK"**.
  The row is found **by shape, not by a fixed hop count** — one wrapper div would break a hop count,
  and mutant Q1 proves the difference.
  - **Live cycle verified 0 → 3 → 0**: three adds, a middle removal, removing the NEXT PICK entry,
    and the last-one-out `queue 1 -> empty` transition, each correctly reported.
  - **`ffQueue`'s new oracle was confirmed against the real panel**, including the failure case by
    **fault injection** — a click that lands on a real queue icon and does nothing returned
    `queued:false, "queue count did not move (still 3)"`. On that same page state the OLD expression
    evaluates to `true`. That is the lie, reproduced live and caught.
  - **`waitedMs` 104-113** against the old flat 1200ms sleep.
  - ⚠️ **A double-add never reaches the verdict**: Sleeper REMOVES `queue.png` from a queued
    player's row, so `ffQueue` refuses at the icon guard. An earlier draft of this entry claimed the
    old code would have said `true` there — it would not, it had the same guard. The verdict is only
    reachable when the icon is present and the click is inert.
  - ⚠️ **The icon boxes are 22×22 (star) and 16×16 (queue), NOT the 42×44 / 24×24 this file used
    to record.** The numbers rotted; matching on `src` is what survived them.
- **Three different controls live in a player row** and an earlier pass conflated two of them:
  | control | what it is |
  |---|---|
  | `row.children[0].querySelector('.draft-button')` (green `+`) | **DRAFTS immediately** when on the clock. 🚨 **The CHILD, not `row.children[0]` itself** — the parent `div.draft-button-wrapper` owns no handler and clicking it drafts nobody (corrected 2026-08-15) |
  | `img[src*="icon_watch_player.png"]` | the star — watchlist, not queue |
  | `img[src*="queue.png"]` | **the queue button.** A plain `.click()` works — it is an `<img>` *inside* `div.queue-action[onClick]`, i.e. a descendant, which is why it was never at risk |
  **Match on the image `src`, never on position** — the star's box is 42×44 and the queue icon's
  24×24, both inside `row.children[2]`; geometry selectors are the pixel problem again.
  **THE MEASUREMENT:** on a no-time-limit mock with **only Cameron Dicker (K, ADP 172.2)** queued,
  auto-pick spent **pick 1.3 on the kicker** while Bijan Robinson sat there and went 1.4. Once the
  queue emptied it reverted to Sleeper's board (Saquon 2.6, Rashee Rice 3.3). Therefore:
  **auto-pick drains YOUR queue first, in order, and only then falls back to Sleeper's ranks.**
  **What it changes:** miss a pick and Sleeper puts you on auto-pick for the REST of the draft.
  With a stocked queue that takes OUR next-best player. Keeping the queue correct has **no
  deadline**, so the draft-day job stops being "click inside 120 seconds" — which was measurably
  lost once this session — and becomes "keep the queue ranked". Sleeper even labels the top queue
  entry **"NEXT PICK"**. `ffQueue()` in `scripts/sleeper_draft_console.js`.
- ⚠️ **The earlier "the queue control will not fire" conclusion was WRONG, and the lesson is the
  detector.** Three attempts were called failures by a region-scoped DOM scan while Briggsy could
  *see* the player sitting in the queue. `document.body.innerText` is the reliable read. **When a
  human says they saw it work, believe the human and re-check the instrument first** — a broken
  oracle turns a working mechanism into a closed door.
- **Draft settings are reachable and scriptable:** the room's ⚙ menu → *Draft Settings* exposes
  **TIME PER PICK including `No Limit`** and a **CPU Autopick** switch. ⚠️ ~~the AUTO-PICK toggle
  does **not** respond to `.click()` — it needs a real click~~ **CORRECTED 2026-08-15: it responds
  fine; `.autopick-toggle` is a handler-less wrapper and the `onClick` is on `span.slider` three
  levels below.** Use `ffAutoPick(true|false)`. Full mechanics:
  [`.claude/skills/sleeper-draft-room/`](.claude/skills/sleeper-draft-room/SKILL.md).

~~The other open item is the 2025 season (below); it was parked by measurement, not by neglect.~~
✅ **CLOSED 2026-08-09 — 2025 IS IN THE BASIS AND THIS FILE SAYS OTHERWISE IN FOUR PLACES.**
`draft-kit/vorp_curve.json` reads `release: current`, `seasons: [2022, 2023, 2024, 2025]`
(re-verified 2026-08-18). The 404 that every "next accuracy gap" passage rests on describes only
the **frozen legacy `player_stats_*` release**, which is not what we build from. 🚨 **Three more
passages below still point at 2025 as the next unit of work — they are history. Do not rebuild it.**

**Standing work that is not a task:** the mule hauls hourly, the watcher watches, the newsletter
publishes nightly at 21:45, and `python scripts/build_board.py --verify-only` is the draft-morning
sanity check. None of that needs touching.

🚨 **THE CDN CACHE IS ON `/draft/<id>` TOO, AND THE MULE WAS FETCHING IT BARE (fixed 2026-08-09).**
Insight 020 measured Cloudflare staleness on `/picks` and hardened `merge_picks.picks_url()`. The
draft-object endpoint carries the **identical** policy — `s-maxage=30, stale-while-revalidate=300`
— and `feud_mule.ps1` hauled it with no nonce. Measured live seconds after START DRAFT: the
un-busted URL returned `status: pre_draft, draft_order: null` with `Age: 60,
cf-cache-status: UPDATING` while the busted URL returned `status: drafting, draft_order: {...: 5}`.
**Same second, opposite answers, and the stale one reads like a completed check.** That cargo is
what `read_shape()` and `run_engine.py` read for teams, rounds, roster and **the seat** — and
`draft_order` flips from null to populated near go time, so a stale copy keeps saying `null`
exactly when the oracle finally has something to say. **Fixed inside `Fetch-Source`**, not at the
call site, so all five Sleeper URLs and the next one added are covered; RSS is deliberately
untouched. Re-run: **12/12 ok.** ✅ *(That "the next one added is covered" claim was PAID OUT on
2026-08-17: `sleeper_traded` and `sleeper_rosters` joined and got the nonce for free — 7 Sleeper
URLs now. The 12/12 above is the 08-09 measurement and stays as written.)* Full write-up: the
2026-08-09 addendum to
[`020`](docs/insights/020-the-cdn-served-a-contiguous-prefix-and-every-gate-passed.md).

⚠️ **A RED `test_normalize` USUALLY MEANS A REVIEW FLEET LEFT SCRATCH IN THE REPO, not a real
regression.** On 2026-08-09 an adversarial fleet wrote `ctrl/` (as in *control*) into the project
root — a copy of `draft-kit/{normalize.py, picks.json, players_data.json}` plus staged cargo — to
reproduce the precomputer's environment. U3's one-normalizer guard fired on the stray
`normalize.py`, exactly as designed, and the suite went from a green run to one failure with no
source change. **Check `git status` for untracked scratch dirs before diagnosing.** Delete the
scratch; the guard is right, and it is the only thing standing between this repo and a second
normalizer.

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
**✅ THE 2025 PARK WAS VOID, AND THE SWAP IS APPLIED. ITS PREMISE WAS FALSE AND THE CAUSE WAS
ONE LINE IN OUR OWN REPO.**
Re-measured 2026-08-09. This entry used to say `player_stats_2025.csv` and
`stats_player_week_2025.csv` are **both 404**, leaving only play-by-play with ~5% TD-attribution
error. **The first is 404. The second is 200.**

`build_curves.py:83-84` says *"The plan named `stats_player_week_{year}.csv`. nflverse has since
renamed the asset; corrected"* and points `URL` at `player_stats/player_stats_{year}.csv`.
**That correction went the wrong way.** nflverse's **`stats_player` release (published
2025-07-31)** carries `stats_player_week_1999` … **`stats_player_week_2025`** — 27 seasons, four
shapes each (`week`/`reg`/`post`/`regpost`). `player_stats_*` is the **frozen legacy release** that
stops at 2024. The plan was right; the "fix" moved us onto a dead asset, and that single edit is
the entire reason 2025 was ever parked.

**What was measured, not assumed (all 2026-08-09):**
- `stats_player_week_2025.csv` — **8.4 MB, 19,422 rows, all 18 REG weeks + POST.** Complete season,
  nflverse's own stat-builder output. Not something we reimplement.
- **`scoring.score()` reproduces its published PPR exactly — 1,997 of 1,997 player-seasons on
  2024.** Zero residual. The oracle transfers intact.
- **Kicking is folded into the same file** (`fg_made_0_19` … `fg_made_60_`, `pat_made`,
  `pat_missed`). Against the legacy `player_stats_kicking_2024.csv`: **45 of 45 kickers, 0
  disagreements** on every bucket. The K curve extends to 2025 with **no new source**, still exact.
- **145 columns vs the legacy 53.**

**The three costs, also measured — this is the error budget the park demanded:**
1. ⚠️ **`scoring.py:65` reads `interceptions`; the new file calls it `passing_interceptions`.**
   A missing key is `_n(None)` → `0.0`, silently. Cost if unhandled: **58 of 1,997 player-seasons
   wrong, up to 32.0 points.** One alias restores 1,997/1,997. Also renamed: `sacks` →
   `sacks_suffered`, `sack_yards` → `sack_yards_lost`, `recent_team` → `team`.
2. ⚠️ **The new release RESTATES 2024.** On nflverse's own published PPR the two releases disagree
   on **9 of 607** common player-seasons, max **8.0 points**. So this is a basis change, not just an
   extension — every `vorp` on the board is subtracted from this table.
3. **The 40+/50+ long-TD bonus limit is UNCHANGED** — no TD-distance column exists.
   🚨 **Trap: `receiving_40` / `rushing_40` / `passing_40` are chunk-play counts, NOT 40-yard
   touchdowns.** They are exactly what a session under a clock would grab for `rec_td_40p`.

**Magnitude — raw REG season totals, a direction-and-order read, NOT the real build.** Swapping
2021 out for 2025 in a 4-season mean: `RB1 +10.9 · RB6 +11.7 · TE24 +6.2 · WR1 −16.1 · WR6 −6.9 ·
QB1 −10.7`, while the baselines barely move (`QB12 −0.9 · RB41 −1.2 · WR47 −3.3 · TE12 +1.5`).
Elite RB gains ~12 while elite WR loses ~16 — **a ~25-point swing in RB-vs-WR at the top**, on a
board where Chase is #1 and Bijan is RB1. That is the range that flips a 1.3 pick, not noise.

**✅ MEASURED, THEN APPLIED — 2026-08-09, Briggsy's call. THE BOARD NOW SHIPS ON
`current` / 2022-2025.**

`build_curves.py` carries a `SOURCES` table (`legacy` / `current`), a boundary adapter, and an
oracle. **`legacy` stays whole and stays tested** — `test_the_old_basis_is_still_reproducible`
rebuilds 2021-2024 and pins RB41 118.7 / WR47 148.0, because a swap whose predecessor cannot be
rebuilt is unauditable the moment it lands.

- **THE ORACLE NOW RUNS INSIDE EVERY BUILD, not just in a test.** `load_season` re-scores every row
  under `STANDARD_PPR` and compares to the source's own `fantasy_points_ppr`, and **hard-stops**
  naming the season if they disagree. This is the guard that makes a source swap safe at all: an
  alias table only covers the renames somebody thought of, and a rename this pipeline does not know
  about is not an error, it is a **zero**. Legacy re-passes at **2,469** player-seasons (655 + 619 +
  588 + 607) — the same 2469/2469 the project already documented. Current passes at **2,081 /
  2,006 / 1,942 / 1,996 / 2,019** for 2021-2025. **Zero residual on either release.**
- **The adapter lives at the BOUNDARY, not in `scoring.py`** — the JAC/JAX rule. `score()` is the
  executable form of league.md and must not grow a branch per upstream schema revision.
- **7 mutants planted, 7 killed.** ⚠️ **C5 survived the first pass**: deleting the
  `position != "K"` filter on the folded asset. On `current` the K loader reads a file where ~1,900
  of ~2,000 rows per season are **not kickers** — they carry no FG columns, score a perfectly real
  `0.0`, pass the bucket-sum guard, and flood the K curve's deep ranks. Nothing caught it because
  every other test of that path needs the gitignored season cache. Now fixture-tested.

**THE DECOMPOSITION — two variables moved, and they had to be separated.** Same board, same
baselines, only the curve swapped:

| change | curve ranks that move | max \|vorp\| | mean \|vorp\| | rows changing `vbdRank` |
|---|---|---|---|---|
| **release only** (legacy 21-24 → current 21-24) | QB 60/78 · TE 70/80 · WR 12/80 · RB 7/80 | **3.2** | 0.23 | 44 of 174 |
| **window only** (current 21-24 → current 22-25) | QB 70/78 · RB 78/80 · WR 80/80 · TE 78/80 | **19.8** | 2.98 | 128 of 174 |

The release restatement is **concentrated in QB and TE** — the legacy asset carried ~607 scoring
player-seasons a year against the current one's ~2,000, so the deep order statistics are taken over
a different population. RB and WR barely move.
⚠️ **The first attempt at this table reported "0 of 80 ranks differ" for all four positions.** The
comparison was `if r in C21` where `C21` is keyed by POSITION, not rank — always false, so it
filtered everything and printed a confident zero. Insight 008 exactly: a broken instrument returns
zero and zero reads like a finding. **The version in the repo carries a positive control.**

**WHAT IT DID TO THE BOARD — the top of it, which is where picks are decided.** Control before
applying: the legacy recompute reproduced the then-shipped board's `vorp` exactly.

```
        was (legacy 2021-2024)       AFTER THE SWAP (current 2022-2025, Aug 9)
  #1    Ja'Marr Chase   +256.1       Bijan Robinson  +268.4
  #2    Bijan Robinson  +254.4       Ja'Marr Chase   +242.7
  #4    Puka Nacua      +196.8       C. McCaffrey    +212.3
```
⚠️ **That right-hand column is the Aug-9 board and is NO LONGER what ships** — the 2026-08-14
re-rank moved Gibbs into RB1. Today it reads `Gibbs +268.4 · Chase +242.7 · Bijan +225.7`. The
column is kept because it is what the *curve swap* did, which is what this section is about; the
*ordering* has moved underneath it since. See the 1.01 block below.
**13 of the top 15 changed position. Mean vorp shift: RB +4.0, QB −3.4, WR −1.4, TE −1.2.**
Baselines moved `QB12 283.5→282.6 · RB41 118.7→117.5 · WR47 148.0→144.8 · TE12 146.9→148.8`, and K
depth went 41 → 39 ranks, which reaches K tiers through `rerank.value_bands`.
⚠️ **`old_value_sweep` caught this file quoting the pre-swap numbers as current** on the very
rebuild that applied the swap — which is the sweep doing exactly the job it was rewritten for.

🚨 **THE 1.01 ARGUMENT HAS CHANGED HANDS TWICE, AND THE CURRENT HOLDER IS GIBBS.**
⚠️ **The whole history below is kept because the direction reversed on a consensus move, not on a
discovery — which is the reason not to over-trust any of it.**
- ~~"1.1 is inside the noise — Chase and Bijan are 1.7 points apart"~~ described the **pre-swap**
  board (Chase 256.1 / Bijan 254.4) and was never re-measured after the swap.
- ~~"Bijan at 1.1 is supported… they are 25.7 apart (Bijan 268.4, Chase 242.7)"~~ was true of the
  **2026-08-08 synthesis** and is **STALE AS OF 2026-08-14**.
- **On the board that ships today** the top of the VORP order is **Gibbs 268.4 · Chase 242.7 ·
  Bijan 225.7 · McCaffrey 212.3.** Gibbs took RB1 off Bijan in the 2026-08-14 re-rank (board
  `r` 4 → 2, tier 2 → 1; Bijan 3 → 4, tier 1 → 2). **Chase is now ahead of Bijan by 17.0, not
  behind him by 25.7** — the sign flipped.
- ⚠️ **`vorp` IS A RANK→POINTS LOOKUP, SO "RB1 = 268.4" NEVER MOVED — ONLY WHO HOLDS IT DID.**
  Every `RB1 268.4` elsewhere in this file and in `docs/opponents.md` is a **slot** statement and
  is still correct. Only sentences naming a **player** went false. Do not "fix" the slot numbers.
- ⚠️ **NONE OF THIS CLEARS ITS OWN ERROR BARS.** `RB1` sd is **19.3** and `WR1` **15.3**, so the
  Gibbs-over-Chase gap of 25.7 is ~1.3 error bars — and insight 023 measures this curve as
  **2.55× overstated at RB1** with per-cell SEM 42.2. The consensus moved two players past each
  other inside the fog; it did not discover anything. **Quote the ordering, never the margin.**
- ⚠️ **The correction direction matters:** a stale "it's all noise" line invites ignoring the board
  exactly where it is most confident. Re-measure before re-quoting any gap in this file — this
  block has now been wrong in both directions.

**What is still open after the swap:** the long-TD bonus (+1 at 40+, +2 at 50+, stacking).
⚠️ **This file's claim that it is "not computable" is FALSE, measured 2026-08-14 — see
*THE LONG-TD BONUS IS EXACTLY COMPUTABLE* under NEXT ACTION.** DEF remains the only position with
no exact source at all.

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
gate went **13 findings → 0** by fixing surfaces. **1066 tests** *(re-measured at the END of the
2026-08-17 session. This line read 907, was "corrected" to 946 mid-session, and went stale again
within the same night as five later commits added tests — hence the rule: **update a count as the
LAST edit before the commit, never mid-session**)*, 0 skips on this machine
(`python -m unittest discover -s tests` from the root); on a clean clone it was 852 with **16 skips**
⚠️ *(that clean-clone pair belongs to the 907 era and has NOT been re-measured — treat it as
"roughly 55 fewer than local", not as a current number)*
— 2 live-cargo probes plus **9** that need the gitignored consensus/ADP caches
(`draft-kit/cache/fp_ecr.csv.gz`, `ffc_adp.json.gz`) plus **5** (`test_build_curves.TestTheCurveShape`)
that need the gitignored nflverse season CSVs. **Re-measured 2026-08-14 by hiding every gitignored
cache** (`fp_ecr`, `ffc_adp`, `adp_history/`, `opponents/`, the season CSVs and
`newsletter/data/inbox/`) — the skip count did NOT move, so U16/U17/U18's 50 new tests add **zero**
skips: they run on committed fixtures by design and never touch the caches. ⚠️ **`player_ids.csv.gz` is COMMITTED, not
gitignored** — `.gitignore:66-69` says so explicitly, and an older version of this line named it
as a cause of skips.
📌 **IT CHURNS, AND THE CHURN IS ALMOST ALWAYS INERT — check the BRIDGE, never the bytes.**
Measured 2026-08-14 across an Aug-8→Aug-14 refresh: the file's bytes and row count both moved
(12,471 → 12,473 rows, 405 rows changed), and **29 of our 174 board players had a changed row** —
which looks alarming and is not. The only column that moved for any of them was **`age`**, by exactly
+0.1, i.e. players aging a tenth of a year. **No code in this repo reads `age`.** `consensus.py`
uses the crosswalk for exactly one thing (line 47): `board.sleeperId → sleeper_id →
fantasypros_id → FP ECR.id`. Verified directly: **0 of 174 FP bridges changed** (159 of them bridge,
both before and after — the positive control; and corrupting one id on purpose makes the comparison
report exactly 1 — the negative control). So the check that settles it is a diff of
`crosswalk()`'s output restricted to our ids, **not** `git diff` on the gz.
⚠️ Two traps met while measuring this: `resolve_sleeper_ids.py --verify` prints the **Sleeper dump**
date (Aug 8), which is a *different artifact* and does not move when this file does — reading it as
"unchanged" is wrong; and grepping `'age'` in a source file matches the substring inside **`page`**,
which `consensus.py` uses constantly, so a naive "does the code read this column" grep returns a
false positive. Search `\[.age.\]`-style patterns, not the bare word. Re-measured 2026-08-09 by hiding `fp_ecr.csv.gz`, `ffc_adp.json.gz`,
`player_stats_*.csv`, `stats_player_week_*.csv`, `player_stats_kicking_*.csv` and
`newsletter/data/inbox/`, then naming every skip — never copied from the previous line, which had
aged to `628 / 10 / 8` and then to `750 / 15` and was wrong both times. **The K-curve group is 5,
not the 4 recorded on 2026-08-08** — that measurement did not hide `player_stats_kicking_*.csv`.
**The 52 precomputer tests add ZERO skips**: they inject their own cargo and ADP fixtures rather
than reading the hourly haul (review residue 1), and a test asserts that.
Verified by eye, not only by tests: the cheat sheet is **2 pages
— the whole 174-row board on page 1**, the plan on page 2 — and the HTML board renders shape-driven
round labels with no invented rounds.

**Everything below is detailed in**
[`docs/plans/2026-08-07-001-refactor-rebuild-the-machinery-plan.md`](docs/plans/2026-08-07-001-refactor-rebuild-the-machinery-plan.md).
The plan owns *what to build*; this file owns *what's next*.

**⏳ The draft date STILL does not exist — but the room is now FULL.** Live re-pull **2026-08-14**:
`status: pre_draft`, `start_time: null`, `draft_order: null`, **8 of 8 seats**, `type: snake`,
`reversal_round: 0`. **The 8th is `Cltchiefs` (`1393428034064748544`), caught by the watcher at
2026-08-12 21:35.** This line has now been stale **four times running** (4 → 6 → 7 → 8), which is the
whole argument for the rule: treat every count here as a timestamp, not a fact. The only honest read
is a re-pull; `newsletter/data/inbox/sleeper_users.json` is at most an hour old.
**And don't infer a date range when the watcher already logged the exact moment** —
`newsletter/data/state/DRAFT_ALERTS.md` had `kblizzy23` pinned to **2026-08-10 03:35** while this
file was guessing "between 08-09 and 08-12". The log is on disk, append-only, and free to read.
**⚠️ THE LEADING INDICATOR HAS TOPPED OUT.** "The room is filling" was the early-warning signal for
the draft date, and it can no longer move — a full room with `start_time: null` is the state
immediately *before* a date gets set, not a state with slack in it. `~Aug 29` is a handshake and it
can move **earlier**. Assume none.
**What being full unblocks:** all seven opponents are known by name, so opponent-model work
(harness leg (d)) is no longer waiting on the roster. **`draft_order` is still `null`** — the
*order* is a separate unknown and it is the one that still blocks seat-dependent reasoning.
⚠️ **A blind find-replace on "6 of 8" corrupts the PLAYOFF FORMAT** — `README.md`, `league.md`'s
*Playoffs* line and the runbook's *Ceiling over floor* bullet all say *"6 of 8 make the playoffs"*,
which is correct and unrelated. Find them by that phrase, not by line number. Only the seat count
moves.
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
   same fact. **24 arrows removed, 95 real ones kept** (82 at the time; the board has been rebuilt
   since — the 24 removed is still exact and still wired).
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

🚨 **Read [`025`](docs/insights/025-the-click-reported-success-and-drafted-nobody.md) before
touching the browser half.** `ffDraft` returned `{"clicked": true}` and drafted nobody.
✅ **RESOLVED 2026-08-15 — this section said UNRESOLVED until 2026-08-18 and was wrong.** The cause
was found and is named in 025's own header: the handler-less `div.draft-button-wrapper`. **There is
no experiment left to run.** Read it for the lesson, not as an open question.

**Twenty-nine insight docs now exist** (`001`–`029`, contiguous — verified 2026-08-18; this line
said twenty-five). Each has a documented wrong answer that looks right. Read them before designing,
not after debugging. ⚠️ Newest is [`029`](docs/insights/029-the-line-numbers-rotted-while-i-was-writing-the-doc.md)
— **a `file:line` citation is a cache with no invalidation**, and writing a doc full of them is
what shifts them. Cite by content. Its predecessor [`028`](docs/insights/028-writing-the-output-found-what-the-tests-could-not.md)
is the same family: writing the product's own output found what 975 green tests could not.

**Read [`021`](docs/insights/021-the-simulation-had-a-closed-form-and-was-measuring-its-own-sampler.md)
before building ANY simulation, sweep or enumeration over futures.** The branch precomputer ran 495
real engine subprocesses per invocation and both of its aggregates matched their **closed forms to
the digit** — it was an expensive way to evaluate `math.comb`, and its output read as evidence.
**Compute the closed form first; if it matches, the sampler is measuring itself, not your system.**
The same file had already deleted a `survives 67%` figure for this exact reason and did not apply
the lesson one level up. It also hid a sampler bug that could not fire at the current pool size and
would have gone live the moment the pool was widened.

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
  `newsletter/data/state/DRAFT_ALERTS.md` — **TRACKED since 2026-08-14**, because it is the only
  channel the STARTING GUN has. **Nothing to do here — but know it exists**,
  because it is what tells you the draft date appeared or moved. If it ever needs re-registering
  after a folder move: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\install-watcher.ps1`
  Four ways it could go deaf are now closed: a **lost baseline** (unreadable snapshot) alerted and
  exits 1 instead of silently re-baselining and eating the starting gun; a seat that **moves or
  vanishes** fires, not just one that appears; freshness is measured **per cargo file** (and against
  the mule's per-source result), not per run; and a **re-created draft** is caught by comparing
  `sleeper_league.json`'s `draft_id` against the pinned one the mule keeps hauling.
  **✅ PROVEN ON THE REAL WORLD, TWICE — not on a fixture (verified 2026-08-14).** `DRAFT_ALERTS.md`
  carries two entries nobody staged: `6 -> 7 joined kblizzy23` at **2026-08-10 03:35** and
  `7 -> 8 joined Cltchiefs` at **2026-08-12 21:35**, the second with its own editorial line *"The
  room is FULL. A date usually follows."* Both fired while no session was watching, both logged the
  cargo age, and `last_seen.json` advanced to the 8-name roster (re-read 12:38 today). So the
  **schedule, the cargo read, the diff and the writer are all live-proven.**
  ⚠️ **What is NOT live-proven is the `start_time` branch specifically** (lines 181-194 — null→set,
  set→moved, set→null). It shares the proven writer and schedule and it has unit tests, but the world
  has never yet handed it a non-null `start_time` to react to. That is the one branch draft prep
  actually depends on, so treat it as *tested-and-adjacent-to-proven*, not proven. ~~The honest
  positive control costs nothing: point the watcher at a mock draft that HAS a start_time and
  confirm the alert lands. Worth doing before Aug 29.~~
  ✅ **DONE 2026-08-14 — do not spend a mock on this.** The positive control was paid with a **real**
  Sleeper draft object carrying a populated `start_time` (`1391539007871012864`), committed as
  `tests/fixtures/sleeper_draft_started.json`. `tests/test_watch_draft_state.py` covers all four
  transitions — appears (:146), unchanged must not re-fire (:162), moved earlier (:167), cleared
  (:175) — with a negative control and mutants caught both directions. Verified still true
  2026-08-18.
- ~~**U3 normalizer**~~ ✅ **SHIPPED 2026-08-07** (`522843cd`). `draft-kit/normalize.py` owns the
  rules as data; `norm_spec.json` and the board's JS are generated from it. **Never fork it.**
- ~~**U14 `sleeperId`**~~ ✅ **SHIPPED 2026-08-07** (`c6379d78` + hardening). 174 ids frozen, 0
  unresolved, ledger at `draft-kit/sleeper_ids.json`, dump pinned at `draft-kit/cache/`. Standing
  check: `python scripts/resolve_sleeper_ids.py --verify` — exit 0 means the join key still holds.
  **A lone shared-token match is never auto-accepted** — it is routinely a same-position teammate
  (six such pairs on this board), so it proposes and hard-stops for a human.
- ~~**U4 gate**~~ ✅ **SHIPPED 2026-08-08.** `scripts/validate_board.py`, 42 tests as shipped (**88** today). `--fast`
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
  `render_pdf.py` + `scripts/templates/board.html`, 41 tests as shipped (**93** today). **The gate went 13 → 0.**
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
  `scripts/build_newsletter.py` + `newsletter/templates/edition.html.j2`, 41 tests as shipped (**48** today).
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
    comfortably. **Retired; ProFootballTalk replaces it.** Wire: **5 feeds, ~142 items/haul** (read `mule_status.json`, never this line).
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

**Board today:** 174 players + 8 derived `dst`, `meta.updated: 2026-08-09` (input freshness, NOT
rank staleness — read `meta.rankings.synthesized`, which is `2026-08-08`), **every row carrying
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

**K and DEF still carry flat per-tier constants** (`carried:kdef-tier-flat`) — but for DIFFERENT
reasons, and this paragraph used to get K wrong. `build_curves.py`
builds QB/RB/WR/TE only, so KTD-6's "K and DEF keep the historical curve" is not satisfiable from
the shipped curve. Labelled rather than invented.
⚠️ **CORRECTED 2026-08-09:** `build_curves.py` builds QB/RB/WR/TE **and K** — it ships a 39-rank
exact K curve *(re-verified against `vorp_curve.json` 2026-08-17; this said 41, which was the
pre-baseline-swap depth)*, and `rerank.value_bands` already derives K tiers
from it. What K lacks is a **baseline**, and that is a CLOSED DECISION (see *NO K BASELINE* above:
reopen only by re-running the sim), not an open gap. **DEF is the one with no exact source at all.**
The sentence that used to end this paragraph — "this is the next real accuracy gap" — invited
reopening something this file decides two hundred lines earlier. **The next real accuracy gap is the
2025 window.**

~~**Blocking prerequisite:** no lab-feed fixture exists**~~ ✅ **RESOLVED** — `tests/fixtures/lab_feed_120.json`
is committed and verified: 120 picks, `pick_no` contiguous 1→120, every pick carrying `player_id`,
all from draft `1390923383440424960`. "Replay the lab feed" now has something to replay.

~~**Install now, not in draft week:** `jinja2` and `reportlab` are both absent.~~ ✅ **RESOLVED** —
verified 2026-08-08 on Python 3.14.3: `jinja2`, `reportlab` and `defusedxml` all import. U6's PDF
and template paths have their dependencies.

---

## 3. Draft-morning checklist (cannot be closed early, by definition)

Re-pull and confirm — **never quote these from a doc**:

- `/league/1390509993844809728/users` — **8 of 8, full** (live pull 2026-08-14). Went 4 → 6 → 7 → 8
  across Aug 7–14. Confirm the count anyway: a *full* room is the precondition for a date, so a
  changed count here is no longer the thing to watch — `start_time` is
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

Full set in [`CLAUDE.md`](CLAUDE.md); [`docs/insights/`](docs/insights/) has the worked cases.
The ones that bite hardest under time pressure:

- 🚨 **A TEST CAN ASSERT THE HOLE, AND ITS DOCSTRING CAN ARGUE FOR IT.**
  `test_no_cargo_at_all_still_writes_the_live_ladder` pinned a MOCK ladder with no cargo going to
  the LIVE `ladder.json` — under a docstring that read *"this function's job is preventing an
  overwrite"*. It was defending a real principle (insight 009: refusing a clean clone is a false
  red) and had drawn the wrong boundary from it: **writing somewhere useful and writing to the live
  queue are different things.** When a test blocks a safety fix, read what it was DEFENDING before
  you either delete it or obey it — the answer here was a third path (`ladder.unarmed.json`).
- 🚨 **INSIGHT 013 FIRED FOUR TIMES IN ONE NIGHT: a function's tests say nothing about its CALL
  SITE.** `read_traded_picks` had eleven tests while the ladder never called it. `resolve_out` had
  ninety-six green tests while `main()` handed it the wrong argument. **Mutate the CALL SITE, not
  the function** — that is the only thing that surfaced either.
  ⚠️ **And an untestable call site is how both survived:** `def resolve_out(..., default_out=DEFAULT_OUT)`
  binds the module global at IMPORT time, so the only way to exercise `main()` was to let it write
  the real war-room ladder. **A default argument that captures a path makes the function untestable
  and the bug invisible.** Resolve it at call time.
- 🚨 **A REWRITE THAT "JUST CLEANS UP THE WORDING" CAN SMUGGLE IN A JUDGMENT CHANGE.** Caught twice
  on 2026-08-18. *"Streamable weeks 1-18"* nearly became *"Startable every week, matchup-proof"* — a
  STRONGER claim. *"you spent round 4 on an RB3"* nearly became *"on a bench back"* — **false in a
  league that starts 2 RB + 2 FLEX, where a third back is a flex STARTER.** Expand acronyms and
  describe mechanisms; never re-grade a player while editing prose. The generator's
  `rank changed: 0 · vorp changed: 0` is the receipt that a note edit really was a copy-edit.
- ⚠️ **`--cargo` MEANT OPPOSITE THINGS IN THE TWO SCRIPTS** — a FILE in `run_engine.py`, a DIR in
  `precompute_ladder.py`, same flag name, same doc. It made the runbook's go-time step work for one
  and silently misbehave for the other, and it made a written prescription for a change literally
  untypeable. **Both accept either form now.** Expect this shape wherever two scripts share a flag
  name; check what the constant actually points at before believing the name.

- 🚨 **A SCRIPTED EDIT REWRITES THE WHOLE FILE'S LINE ENDINGS, AND THE TEST SUITE CANNOT SEE IT.**
  This repo runs `core.autocrlf=false`, so the churn is real content and lands in the commit. Hit
  2026-08-17: a heredoc patch doing `open(p, "w", encoding="utf-8").write(s)` turned a **150-line**
  addition to `build_curves.py` into a committed **651 insertions / 501 deletions** — 150 lines of
  load-bearing scoring logic made unreviewable, and `git blame` for the file poisoned. Python text
  mode translates `\n` → `\r\n` on write; `sed -i` does the reverse. **999 green tests said nothing.**
  **Use `newline=""` or binary `open(f,'wb')`, and ALWAYS `git diff --stat` before staging** — a
  line count implausible for the edit is the only signal. Confirm with `git diff -w --stat`.
  ⚠️ **Before "fixing" one, check you caused it:** `git show <base>:<path> | file -b -`.
  `tests/test_engine_matching.py` was ALREADY CRLF and must be left alone.
- ⚠️ **A STAT UPDATED MID-SESSION IS STALE BY THE COMMIT.** The 2026-08-17 pass whose whole job was
  fixing stale counts shipped `946` on three surfaces and ended the night at `999`, because five
  later commits added tests. **Update every count as the LAST edit before the final commit.**
- ⚠️ **REVIEW/MUTATION FLEETS LEAVE WAR-ROOM SCRATCH BEHIND.** A read-only review agent left
  `draft-kit/picks.json` holding **29 picks from the dead lab draft** on 2026-08-17. It is the
  poisoned-picks landmine arriving by a road nobody watches. **Sweep `draft-kit/picks.json` and
  `newsletter/data/state/` after any fan-out**, and note the tell: the suite reports
  `OK (skipped=1)` instead of `OK`, because one test skips when a live picks.json exists.

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
- **Presence is not health.** `Last Result: 0`, `NumberOfMissedRuns`, and the mule's `14/14 ok` are
  all untrustworthy. Only the cargo timestamp in `mule_status.json` proves life. *(Said `12/12` until
  2026-08-18 — a landmine that quotes a string the machine no longer prints is a landmine you scroll
  past.)*
  ([`007`](docs/insights/007-presence-is-not-health-the-third-instance-of-one-pattern.md))
- **A foreign source's parameter can be decorative.** Fantasy Football Calculator accepts
  `teams=8`, echoes it into `meta.teams`, and returns **byte-identical ADP to `teams=12`** for all
  257 players — verified 2026-08-08 by diffing the two responses. Never trust a knob because the
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
  replaced it. The wire now carries **5 working feeds, ~142 items/haul** (2026-08-09; churns hourly). Do not restore the old URL:
  it is not broken, it was never a feed.
