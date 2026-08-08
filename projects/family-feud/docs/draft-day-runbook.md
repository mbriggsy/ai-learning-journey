# DRAFT DAY RUNBOOK — Family Feud 2026
*Operational manual for any Claude session shadowing Briggsy's draft (mock or real). [`league.md`](league.md) has the identity and rules; this file is the machine's operating instructions. The draft arsenal — engine, board, cheat sheet — lives in [`../draft-kit/`](../draft-kit/).*

**The sections below are current doctrine — Mock #1's lessons (Aug 5), Mock #2's (Aug 6, first executor-mode run), and Mock #3's (Aug 6, first CLEAN executor run: 15/15 manual, zero misses) are already folded in.** The changelog at the bottom records what changed and why; it never overrides the instructions.

**Two operating modes.** *Advisor:* Claude computes THE CALL, Briggsy clicks. *Executor:* Claude also drives Briggsy's logged-in Chrome (claude-in-chrome tools) and clicks the picks himself — proven in Mock #2. Executor mode adds the "Executor mode" section's rules on top of everything else; the biggest difference is cadence math (see Step 3).

## Files you need — run the engine from inside `draft-kit/`

The engine opens its inputs by literal name from the **current working directory**, so `cd` into
`draft-kit/` and work there. (Under Cowork these had to be staged into a sandbox workspace; that
step is gone — the files are just local now.) Your `picks.json` and optional `slot_names.json`
get written there during the draft; both are gitignored scratch.

- `draft_engine.py` — the analysis engine (tier cliffs incl. K/DEF, run watch, diminutive-alias name matching)
- `players_data.json` — the board: **174 entries** (150 skill players + 10 K + 14 DEF), tiers, badges, `vorp`/`vbdRank`/`vbdDelta`, plus the frozen `sleeperId` and a `vorpMethod` on every row. VORP = pts/season over waiver replacement, baselines waiver QB12/RB41/WR47/TE12 and last starters QB8/RB21/WR27/TE8. **Skill values are recomputed from `vorp_curve.json` (seasons 2021-2024, exact scoring) on every build**; K and DEF keep flat per-tier constants and say so, because the curve builds QB/RB/WR/TE only. Engine expects this exact filename in cwd.
- This runbook.

Note: `draft_rankings_data_2026-08-05.json` **was deleted on 2026-08-08** — it was a date-stamped duplicate that had already drifted (its `dst` and `strategy` disagreed with the board) while having zero readers anywhere in the repo. Git is the archive; do not regenerate it. **Three surfaces, not four.** The old `family-feud-draft-board` desktop artifact died with Cowork, and the twin-maintenance rule with it; do not reintroduce it. See [`live-board-plan.md`](live-board-plan.md).

### 🚫 NEVER hand-edit a surface. Refreshing the board is ONE command *(changed 2026-08-08, U6)*

```bash
python scripts/build_board.py          # regenerates ALL THREE surfaces from players_data.json
python scripts/build_board.py --verify-only    # the draft-morning sanity check; writes nothing
```

This section previously told you to *"update every surface in one pass"* by hand. **That
instruction is now wrong and will actively hurt you**: `draft-kit/build_manifest.json` carries a
sha256 per surface, so a hand-edited file makes `--verify-only` go red — and it is the only
detector that covers the PDF, which has no comment channel to warn you.

- **To change the board**, edit the judgment fields in `players_data.json` — ranks, tiers, badges,
  notes — and re-run the generator. It recomputes `vorp`/`vbdRank`/`vbdDelta` from the curve,
  re-derives `dst`, restamps `meta.shape` from the live draft object, and re-renders the HTML and
  the PDF.
- It **refuses to emit** unless the schema gate passes on the staged set, and refuses to run at all
  if `draft-kit/` has uncommitted changes (pass `--allow-dirty` to override, which stamps
  `meta.build.dirty`).
- **One refresh = one commit** containing every surface. That is what makes "roll back one commit"
  the recovery a person can execute at 7am.
- `python scripts/validate_board.py --full` still exists and still proves the surfaces agree; the
  generator runs it for you against the staged set before anything is replaced.

⚠️ **Rankings are refreshed as of 2026-08-08 and are still a snapshot.** Re-research
rankings/injuries/ADP before the real draft, then run the generator. Check `meta.updated` before
you trust a single rank.

⚠️ **Nothing will remind you.** A Cowork one-shot trigger used to drop a `REFRESH_BRIEF` into the
draft kit on Aug 26 as the starting gun for this. That trigger did not survive the migration and
**no longer exists** — the refresh is now a `TODO.md` item and nothing else. Check the board's date
before you trust a single rank.

## Step 1 — Find the draft
- **Real league draft:** draft_id `1390509994847240192` (league `1390509993844809728`).
- **Mock draft:** `curl -sL --max-time 15 "https://api.sleeper.app/v1/user/1390750540631150592/drafts/nfl/2026"` — take the most recent entry with status `drafting` (or `pre_draft` about to start). **Expect this to come up empty and plan for it.** Checked live Aug 7: the endpoint returned exactly ONE draft — the real league's — and none of Mocks #1, #2 or #3, even though Briggsy created all three himself. So the old note that "mocks he creates himself may be the only reliable thing here" is optimistic; treat this endpoint as a bonus, not a method. **The reliable path is to ask him to paste the draft room URL** (`sleeper.com/draft/nfl/<draft_id>` — the id is right there in it). He often pre-creates the room hours early (Mock #2's was built ~5h before go time) — check the web app's Mock Drafts tab ("In progress" list) and the draft room URL: `sleeper.com/draft/nfl/<draft_id>`.
- **All Sleeper reads go through `curl`** — see [`data-access.md`](data-access.md). Always pass `--max-time 15`.

> **Obsolete since the Cowork migration — do not reintroduce.** This step used to mandate WebFetch
> and a `?cb=N` cache-buster, because Cowork's sandbox proxy-blocked curl and WebFetch cached for
> 15 minutes. Here curl works, has no cache, and returns raw JSON — while **WebFetch is banned
> outright** (no timeout, hangs agents; a hook blocks it). The old "never say *greater than N*, use
> inclusive ranges" rule was prompt-engineering aimed at WebFetch's small summarizer model and is
> equally moot. The *substance* underneath it is not moot — see Step 3 on merging and leapfrogging.

## Step 2 — Lock the config
`curl -sL --max-time 15 "https://api.sleeper.app/v1/draft/<draft_id>"`:
- `settings.teams`, `settings.rounds`, `settings.pick_timer` — **read rounds from the API, never assume 16** (Mocks #1 and #2 both ran 15; the real league is 16).
- `draft_order` — map of user_id → slot. Briggsy = user_id `1390750540631150592`. **His slot is the engine's first argument.** draft_order can be null until near start — re-verify ON draft day, before the first advisory. Slot changes strategy hard: turn slots (1/8) draft in pairs and plan 14 picks ahead; middle slots don't. Slot 2 (Mock #2) is a near-turn: picks come in loose pairs with 3 picks between (e.g. 15/18, 31/34) and 13-pick droughts after — plan both picks of a pair as one decision, including who the between-teams will eat (denial forecasting won Egbuka→Kyren and Skattebo→Daniels).
- Confirm scoring context (real league = full PPR; make mocks 8-team PPR to mirror it — verify `metadata.scoring_type` via API; Mock #1's lobby was accidentally created as Standard first, Mock #2 verified `ppr` ✓).
- **Slot names:** the draft object's `metadata.slot_name_<N>` fields name the human in each slot, and they populate even with `show_team_names: 0` (verified live on Mock #1: DIego/Hunter/Ryan in slots 2-4). Write them to `slot_names.json` in cwd as `{"2": "DIego", "3": "Hunter", ...}` — the engine then names every roster ("slot 3 (Hunter)"), which makes denial plays readable at a glance. Registered accounts appear in `draft_order` instead (Briggsy's slot comes from there). All-CPU mock rooms have no slot names — skip the file.

## Step 3 — The loop (repeat until draft complete)
1. **`python3 scripts/merge_picks.py <draft_id>`** — one command: fetches `/picks`, merges into
   `draft-kit/picks.json` keyed on `pick_no`, and reports the count, the latest pick, and whether
   there are gaps or duplicates. Run it every cycle, including "just checking" ones.
   **If it says `VANISHED`, stop and read it.** A union can only grow, so a pick removed upstream
   (a commissioner reversing one — ordinary) would otherwise stay forever as a phantom: contiguous
   pick_nos, integrity gate green, and the engine counting a drafted player who is actually
   available, with picks-until-you off by one for the rest of the draft. A reversal and a
   truncated fetch look identical from here, so the script does not choose. **Re-run once.** If
   the pick is still gone it really was reversed — then, and only then,
   `python3 scripts/merge_picks.py <draft_id> --rebuild` writes the feed verbatim.
2. It **unions** rather than overwrites, so a truncated response can never delete picks you already
   hold — a short read is a no-op instead of a silent regression. That discipline is why Mock #1's
   briefly-dropped pick 96 was recoverable.
   *Historical note: under Cowork, responses had to be trimmed with "from pick N onward" range
   prompts to fit through WebFetch, and leapfrogging N skipped picks 78-82 in Mock #3. **curl
   returns the whole cumulative array, so there is no range left to get wrong** — that failure
   mode is retired. The merge discipline and the integrity gate below are what caught it; both stay.*
   The engine now enforces this: it **hard-fails (exit 1) on interior gaps or duplicate pick_nos** in picks.json and refuses to emit board state. If it screams, re-fetch /picks, re-merge, rerun — NEVER advise off a screaming engine. (A missing *newest* pick is undetectable — a tail hole looks identical to "draft is only this far along" — but /picks is cumulative, so that's staleness bounded by poll cadence, not corruption.)
3. Run: `python3 draft_engine.py <briggsy_slot> <teams> <rounds> <draft_id>`
   **Read the first lines of the output before the advisory.** `[checked]` names what the engine
   confirmed against the draft itself. A `**` banner means the seat could NOT be confirmed —
   go get `draft_order` before acting. A `!!` block means an argument disagrees with the draft
   and nothing was computed.
4. Read the output; compose the advisory (format below); send it. In executor mode, execute the pick instead when it's our clock.

**Cadence — key it off ROOM SPEED, measured in round 1, not just pick distance** (the picks feed is cumulative, so you can never miss picks — only be late with advice):
- **FAST room** (picks landing ~15s apart or less — quick-click humans and/or CPU autopick): distance-based pacing fails; a 14-pick gap can evaporate in under a minute. The moment his pick(s) land: one sync → deliver the NEXT window's full pre-call immediately (with snipe ladder, see below) → then poll every ~15-20s continuously, tightening to **10-15s when ≤3 picks away** (Briggsy's calibration after Mock #2 — two picks came down to the wire at 20-25s). **Do not stretch to 45-60s "because the gap looks big" — that exact deviation cost pick 79 in Mock #2.** An all-CPU room (7 bots) is the fastest possible room: 12-pick gaps run ~60-90s. Note the bot-room quirk: the room PAUSES on our clock (bots can't pick past us), so wire-scrapes there are always self-inflicted — see "fire first, narrate after" in Executor mode.
- **SLOW room** (real-draft pace, humans actually using the 120s clock): after his pick lands, sync once → pre-call for his next window; ≥4 picks out, sync every ~60-90s; ≤3 away, burst every ~20-30s; on the clock, final sync and deliver THE CALL immediately — never eat more than ~30s of his 120.
- Rooms can change speed (humans step away → CPU autopick takes over). If two consecutive polls show a pace shift, switch modes.
- **HARD RULE (any mode): if the engine's output says the next pick is OURS — or 1 away — do NOT start a sleep/fetch/engine cycle. Act on the standing ladder first; sync afterward.** The ladder exists precisely so no round-trips are needed on the clock.

## Executor mode — driving the picks in the Sleeper web draft room *(added Aug 6 after Mock #2)*
Claude's hands are claude-in-chrome on Briggsy's logged-in Chrome; eyes stay on the API (poll + engine per Step 3); the browser is touched only to click picks. Mechanics, learned live:
- **Clock budget:** browser actions cost ~5-15s per round trip (search, click, verify screenshot). Treat a 120s clock as ~90s of decision time. With a standing ladder, execution needs ~15s total: filter, verify, fire.
- **Player-row icons, left to right (verified in the Aug 6 queue lab):** `+` = **INSTANT DRAFT while on the clock, no confirmation** (pre-draft it no-ops) · `☆` star = watchlist only · **blue document-plus `📄+` = ADD TO QUEUE — works pre-draft and any time.** The queue lives in the right panel's Queue tab (shows a count); each entry has a REMOVE button. The player-card modal has NO action buttons — never open it mid-draft, it's a time sink.
- **PRE-ARM THE QUEUE.** Before the draft starts, load the round-1 ladder into the queue via the `📄+` icons (top name first). At each window, refresh it to the current ladder's top 2-3 (REMOVE dead names, add new) — skip maintenance when the clock is tight; direct fire stays primary. A loaded queue makes every failure mode safe: missed clock, frozen bridge, native dialog — Sleeper's timeout autopick takes the queue TOP, i.e. OUR guy, not ADP's. (Mock #2 ran the whole draft with an empty queue because the affordance wasn't known; the pick-79 miss would have cost nothing with a loaded queue.) Keep the AUTO-PICK toggle OFF — with a loaded queue it insta-drafts queue-top the moment our turn starts, no judgment applied.
- **Fire sequence on our clock:** click the "Find player" search box → type the target's name (filters list to ~1 row, eliminates wrong-row risk) → screenshot to verify top row = target and the clock cell is ours → click `+` on the top row (y≈513-523) → screenshot confirms the board cell. Sleeper even prints "Projected pick" under the row — a free sanity check.
- **SECOND fire path — the queue-row green `⊕`:** each queue entry has REMOVE + a green `⊕` at its right edge; on our clock the `⊕` INSTANT-DRAFTS that player (verified twice in Mock #3: Egbuka, DeVonta). When queue-top is THE CALL it's one click with the name label right there — faster and safer than search. Zoom the queue row first if coordinates are in doubt; the `⊕` sits ~50px right of REMOVE.
- **Clearing the search box: TRIPLE-CLICK the box, then type (or Delete). NEVER ctrl+a.** The bridge drops the ctrl modifier intermittently — ctrl+a then becomes a literal "a" typed into the box (symptom: search shows "aSutton", zero rows match) or a page-wide select-all when the box click missed. This single bug killed three queue-arm attempts in Mock #3 and nearly ate pick 78. Triple-click selects the input's text with no modifiers; typing replaces it.
- **Screenshot capture-scale oscillation (the window is NOT moving):** Briggsy runs Chrome maximized and nobody resizes anything — yet screenshot dimensions oscillate between captures (1522x784 / 1536x735 / 1568x751 of the SAME maximized window in Mock #3). It's the capture pipeline re-scaling, so coordinates read off one screenshot land ±10-15px off in the next moment's click space. Rules: coordinates are only valid from the LATEST screenshot — re-screenshot before any high-stakes click; prefer refs (find tool) for one-off buttons like CLAIM; the search-filter→top-row-`+` flow tolerates it best (row 1 lands y≈509-523 at every scale, and the box/`+` are big targets). Long multi-player batches WILL lose clicks to a mid-batch scale flip — one player per batch when it matters, verify with a screenshot each time.
- **Queue-arm searches use the FULL "First Last" name — never surname-only.** The Gabe Nabers incident: "Nabers" was typed just as Malik Nabers got sniped at 5.1; Sleeper instantly hides drafted players, the fullback Gabe Nabers (ADP 999) floated to row 1, and a blind positional click queued him. A full-name filter goes to ZERO rows when the target dies mid-action, so the stray click no-ops instead of queueing a random fullback. Corollary: never click a row icon you haven't verified by content in the current screenshot — position alone lies during state changes.
- **On the clock with a stale ladder: the search box IS the availability check.** Type the top surviving ladder name (~5-10s) — the row appearing = he's alive = FIRE. Do NOT run a fetch+merge+engine cycle on your own clock to "re-rank for confidence"; engine re-ranks are for BETWEEN windows, or when the entire ladder is confirmed dead. Pick 62 anatomy: queue-arm had failed, ladder was Daniels→Burrow→Hurts with Burrow visibly gone on the board; the correct play was search-verify Daniels immediately (alive → fire, ~15s total); instead a full sync ran first and the fire landed at 0:13. Bot rooms pause on our clock so it cost nothing — a human room punishes that habit with a timeout.
- **Fire first, narrate after.** On our clock, the click comes BEFORE any chat message, recap, or non-essential screenshot. Mock #2's near-misses (pick 15 fired at 00:28) were caused by composing commentary inside the window, not by slow polling.
- **Clear the search filter immediately after every pick** — triple-click the box → Delete, per the clearing rule above. **Never ctrl+a.** A stale filter hides the board later. On the completion screen the search box is gone entirely — that's the tell the draft ended.
- **A missed clock silently flips the team to AUTO-PICK** (avatar chip literally reads "AUTO"; the queue panel's AUTO-PICK toggle goes green). Sleeper then autopicks ALL subsequent picks instantly. After ANY timeout: kill the toggle FIRST, then resume. (Mock #2: one missed clock at 79 → autos through 82/95/98/111/114 before the flip was caught. Bounded damage — see changelog — but pure luck the auto took the ladder-top Pollard at 82.)
- **Native browser dialogs freeze the extension completely** — every CDP command times out until a human dismisses the dialog; it looks like the bridge died. The web app throws exactly one: the START DRAFT confirm ("This action cannot be undone"). Have Briggsy click START (or click OK on the dialog) himself. In-room actions (picking, searching) never raise native dialogs.
- **Room setup:** creating/entering the room from a Claude-controlled tab in his profile works fine (same login/cookies). The room card in Mock Drafts opens the draft room in a NEW tab — use that tab's id for everything after.
- Announcements switch to past tense — "I took X, here's why" — with the same 5-line advisory shape. Briggsy heckles; a chat veto before the click is still honored.

## Advisory format (keep it to ~5 lines, he's mid-draft)
```
Pick 27 in: Hunter took D.Henry — his 3rd RB. RB run live (5 of last 8).
⚠ RB Tier 4 cliff: 2 left, and slot 5 needs one before you.
THE CALL: **Kyren Williams** — cliff position; WR T4 is fat and flows back to you.
Fallbacks: J.Love (same logic, more variance) · Egbuka if both RBs vanish.
```
- Bold THE CALL. One line of reasoning. Max two fallbacks *when he's on the clock*.
- **Pre-calls sent ahead of his window carry a 3-4 name ladder per pick slot** ("if X gone → Y → Z → W"). In Mock #1 a pre-call's primary AND first fallback both vanished in the 5 picks before his turn; the ladder makes snipes cost zero round-trips. In executor mode the ladder IS the execution plan: on the clock, fire the top surviving name with no recomputation.
- Briggsy holds the veto, always. If he overrides, adapt without sulking; recompute from his actual roster.
- Trash-talk garnish welcome (he's competing against his son, Hunter — likely `briggsy007`, the commissioner).

## Standing doctrine (from the strategy pillars — enforce these)
- Rounds 1-4: RB/WR (or elite TE). Allen/Lamar only as a falling steal — and a ~6-spot fall is NOT a steal in an 8-teamer (passed on it in Mock #1 at 16 and Mock #2 at 31, correctly both times). VBD fair price on Allen ≈ pick 17-24, so "steal" means past that.
- **Rounds 3-5 tie-breaker (VBD amendment, Aug 5):** when candidates sit in the same tier, lean RB over WR — mid-tier RB beats mid-tier WR over waiver replacement every year in this format (the wire always has a 10-ppg WR on it, never a 13-ppg RB). NEVER reach across tiers for it; WR volume comes rounds 5-8 where it's nearly free. The engine prints a "VBD LEANS" list and best-available now shows `vorp` + `VBD±` chips — use them as the tie-breaker, with badges/notes still deciding individual players.
- **Pair-window denial (near-turn slots):** when an opponent picks twice between our pair, read their needs and take the candidate they'd eat, banking the one they won't. Mock #2 proof: slot 1 needed WRs → took Egbuka at 31 (slot 1 then ate Nabers+Higgins), Kyren survived to 34; slot 1 had QB done → Skattebo at 47, Daniels survived to 50.
- QB rounds 6-9. K + DEF rounds 15-16 ONLY — physically restrain him if needed.
- Ceiling over floor (6 of 8 make playoffs). Bench = lottery tickets. 2 IR slots = stash arbitrage.
- Miami Rule: no MIA pass-catchers. Achane only at a heavy discount.
- Denial plays are real: if an opponent's roster screams a need and the last elite option sits at Briggsy's pick, sniping has value beyond rank — especially against Hunter.
- K/DEF are now ON the board with tiers (K tab / players_data): elite K trio Aubrey (DAL) / Fairbairn (HOU) / Dicker (LAC); DEF T1 = HOU/DEN/SEA/LAR. Take from the top tier still standing in the final two rounds; the engine's cliff display shows the run coming.

## After the draft
- Full-roster recap: his team, grade, best value, biggest reach avoided, waiver-watch names for week 1.
- **If this was a mock:** debrief what to tune, then **fold the lessons INTO the instruction sections above** (instructions stay current truth — never leave contradictions between a lesson and a step) and add a changelog entry. Edit this file directly and commit it.
- **If this was the real draft:** stand up the in-season cadence — Tuesday waiver report, Thursday and Sunday morning lineup checks, trade evaluation on demand. **The pre-written prompts for these did not survive Cowork** (they lived in a project doc that could not be exported); they need rebuilding as real scheduled scripts. Tracked in `TODO.md`.

## Engine quick-reference
`python3 draft_engine.py <my_slot> [teams=8] [rounds=16] [draft_id]` reading `picks.json` + `players_data.json` (+ optional `slot_names.json`) from cwd. **`my_slot` is required** — it used to default to 3, which meant a forgotten argument produced a complete, confident, wrong advisory that looked identical to a correct one. It now exits with usage instead. Get the real value from the draft's `draft_order` for user_id `1390750540631150592`.

**The input gate (added 2026-08-08).** Requiring `my_slot` stopped the *forgotten* argument; it did nothing about the *wrong* one, which is the likelier failure — every wrong seat 1..8 passed the only check there was, and `roster_id 3` sits one line from `draft_order` in `docs/league.md`, which makes `3` the most attractive wrong value in the project. The engine now cross-checks all four hand-supplied inputs against evidence already on disk, before computing any advice:

| Input | Checked against |
|---|---|
| `my_slot` | `draft_order["1390750540631150592"]` in the mule's cargo; failing that, the `draft_slot` of any pick carrying our `picked_by` |
| `teams` | the draft's `settings.teams`; and `picks.json` alone, which disproves a count that is too small (a seat above it cannot exist) **or** too large (once a full round has passed, the highest seat seen *is* the team count) |
| `rounds` | the draft's `settings.rounds`; and a pick number beyond `teams × rounds` |
| `slot_names.json` | `draft_order` + `sleeper_users.json`. Where they disagree the **draft's names win** and the disagreement is printed — that file is gitignored, so a spent mock's copy is invisible to `git status` and labels live seats with the wrong humans |

Three rules it obeys, each one load-bearing:
- **A missing oracle never exits.** A dead mule must not also cost the advisory. It prints `[unverified]`, loudly, and runs.
- **"I could not check" never prints like "I checked."** The seat gets a `**` banner of its own when nothing could confirm it.
- **An oracle for another draft is not evidence about this one.** The mule pins `draft_id` into its URL, so a re-created draft leaves stale cargo that still parses. Cargo is ignored unless its `draft_id` matches. Trusting it would refuse a *correct* seat — a false red, which [`insight 009`](insights/009-the-test-suite-was-red-against-source-that-no-longer-existed.md) records as the more dangerous direction, because it teaches the operator to skip the gate.

**This is why you pass `draft_id` as arg 4** — without it the engine cannot tie the cargo to this draft, so `teams`/`rounds` go unchecked whenever `picks.json` is empty.

**The frozen-id join (added 2026-08-08).** The engine reads `draft-kit/sleeper_ids.json` and matches each live pick to the board on Sleeper's `player_id` **before** falling back to the rendered name. The name is the one field that drifts; the id does not. Optional and self-reporting, same doctrine as the cargo — no ledger means the name join, and it says so.

Why it matters, reproduced against the real board: board #1 Jahmyr Gibbs taken at pick 1, rendered by Sleeper as `J. Gibbs`, and on a different team than the board records. Name join missed him. The `(team,pos)` escalation missed him too — board says DET, pick says NE. So the engine printed `not on our board`, added the all-clear `no unclaimed board row shares a team and position`, and left him at **#1 on BEST AVAILABLE**. The pick carried `player_id 9221` — his frozen id, in our own ledger, discarded.

Two consequences worth knowing at the table:
- **`--- N pick(s) matched by frozen id, not by name ---`** means the board's spelling has drifted from Sleeper's. Not an error; the join held. Worth noting for the next board rebuild.
- **The escalation's meaning has INVERTED.** It used to mean *"this might be the same man under a drifted name."* The id now catches that case first, so anything still reaching the escalation carries an id we do not hold — meaning he is **not on our board at all**, and a same-position suspect sharing a surname is a **teammate**. The engine says so explicitly now. Do not clear that board row.
Board state derives from **max(pick_no)**, with an integrity gate: exit 1 on interior gaps/duplicate pick_nos (see Step 3). `slot_names.json` = `{"<slot>": "<name>"}` → rosters/needs and the between-now-and-you line print names.
Outputs: board state, last picks, run watch, every roster's composition + open needs, who picks between now and Briggsy, tier cliffs for RB/WR/TE/QB/K/DEF (⚠ at ≤3 left), best available on our board (with `vorp` and `VBD±` chips when the JSON carries them), and a VBD LEANS section — available players VBD ranks ≥8 spots above board rank.
Name matching canonicalizes common diminutives (Kenny/Kenneth, Cam/Cameron, Mike/Michael, ...) on both board and picks — when adding board entries, still prefer Sleeper's spelling where known.
Badge glyphs: » = our target · + = breakout · ! = bust risk · † = injury watch · ° = rookie · ^ = riser · v = faller · § = IR-stash.

## Changelog
**Aug 8, 2026 — the advisory body is pinned, and the pins are proven by mutation.** Everything below the warning block had almost no assertions: the suite ran the full advisory only to check an exit code and two header strings, so the snake math, the roster/needs arithmetic, the between-now-and-you list and the BEST AVAILABLE ordering were all unpinned. Those are the numbers that decide reach-now-or-wait. 13 tests now cover them, every expected value derived by hand from the snake rule rather than copied from output.

**They were then verified the only way that counts.** Eight deliberate mutations were planted in a scratch copy of the engine — `STARTERS` RB 2→1 and QB 1→2, `slot_of` losing the snake, `my_picks` ignoring even rounds, `picks_until_me` off by one, `needs` dropping FLEX, `between` reversed, and BEST AVAILABLE sorted by `pr` instead of `r`. **All eight were caught** (2–4 tests red each), with the unmutated baseline confirmed green first so a broken harness could not masquerade as a clean result. Writing a test that passes proves nothing about whether it can fail; this project's most repeated defect is a check that cannot go red.

**Aug 8, 2026 — `merge_picks.py`: a phantom pick, and a duplicate gate that could never fire.** Two defects in the merge, both found by the same sweep. (1) The union can only GROW, so a pick reversed upstream stayed on disk forever — pick_nos contiguous, integrity gate green, engine counting a drafted player who is available. A reversal is indistinguishable from a truncated fetch, so the script now reports and refuses to decide, with `--rebuild` as the escape hatch once a re-run confirms it. (2) `picks` was rebuilt from a dict keyed on `pick_no`, so it could not physically contain a duplicate — making `dupes` provably empty and its branch unreachable, while a comment claimed parity with the engine's gate. The engine's copy CAN fire; this one never could. Duplicates are now checked on the FEED, before the dict destroys them.

Two things worth carrying beyond this file:
- **A test can encode a defect as a requirement.** `test_short_read_never_deletes` asserted exit 0 — so a fetch returning 3 picks against 120 on disk printed a healthy-looking line and exited clean. Its no-deletion intent was right and is unchanged; the exit code was the bug. Fixed the expectation, kept the test, wrote down why.
- **An escape hatch must not re-raise the alarm it answers.** The first cut of `--rebuild` still fired the VANISHED warning and exited 1, which made the flag useless for the one job it exists to do.

**Aug 8, 2026 — the engine joins picks on the frozen Sleeper id, not the rendered name.** U14 froze an id for all 174 board rows and **nothing read it** — the engine kept matching on the name, the one field that drifts. Reproduced against the real board: board #1 Jahmyr Gibbs, taken at pick 1, re-rendered as `J. Gibbs` and traded off the team the board records, was reported `not on our board`, given the explicit all-clear, and left at #1 on BEST AVAILABLE. **The engine named an already-drafted man as THE CALL** — the landmine `CLAUDE.md` records as closed, reached by a second unguarded road. The pick carried his frozen id.

Measured over the 120-pick lab feed: 116 picks join by both id and name with **zero disagreements**, 4 by neither (genuinely off our 174). The id join is not a different answer today — it is the same answer that survives a name drifting tomorrow. Doctrine in the Engine quick-reference above. Two notes:
1. **A warning must not echo a section heading.** The first wording of the no-ledger notice contained the literal string `BEST AVAILABLE`; tests (and eyes) split the advisory on those headings, so the message silently truncated everything after it. The output's own structure is part of its contract.
2. **Wiring a safety net can invert a neighbouring warning.** The `(team,pos)` escalation existed to catch a board player whose name drifted. Once the id catches that first, anything still reaching the escalation is provably *not* ours — so the old wording ("if that is the same man…") began asserting an identity the id had just disproved. A new guard changes what the old ones mean; re-read the neighbours.

**Aug 8, 2026 — the engine's four hand-typed inputs are now cross-checked (input gate).** Found by an adversarial sweep, not by a failure — which is the point, because this one had no failure mode that looks like a failure. `my_slot`, `teams`, `rounds` and `slot_names.json` were all accepted on the operator's word; the only check in the file was `1 <= my_slot <= teams`, which **every wrong seat passes**. A wrong seat produced a complete, plausible advisory for another manager's team, exit 0 — right down to which roster carried `<== YOU`. Reproduced on the real 120-pick lab feed: slot 3 and slot 5 both exit 0 and disagree on picks-until-you, on `Between now and you`, and on whose roster is ours.

The oracles were already on disk and being discarded: the cargo's `settings.teams`/`settings.rounds`/`draft_order`, and `picked_by` on every pick the operator made. Doctrine folded into the Engine quick-reference above. Two things worth carrying forward beyond this project:
1. **A live run found a hole the tests did not.** `max(draft_slot) > teams` disproves a team count that is too *small* and says nothing about one that is too *large*; with the cargo belonging to a different draft, `teams=10` sailed through green tests and a green suite. The second rule (once a full round has passed, the highest seat seen *is* the team count) only exists because the gate was run against real data rather than declared finished when the tests passed.
2. **The gate's own warning text is part of the gate.** A banner reading "No draft_order on disk" when a corrupt one *is* on disk is the same defect the gate exists to treat, one level up.

**Aug 6, 2026 — Mock #3, first CLEAN executor run** (lab room `1390923383440424960`, 8-team PPR ✓, 15 rds, 120s, slot 3, 7 CPU · Claude drove Chrome end-to-end). Result: **15/15 manual picks, zero clock misses, zero AUTO-PICK flips, roster VORP 1225.8 (Mock #2: 1084), 13 of 15 picks at/above board price.** Gibbs fell to 3 (bots took Chase/Bijan 1-2); denial doctrine cashed twice (Breece at 30 forced slot 1 onto Bucky Irving; DeVonta at 46 forced slot 2 onto Waddle); QB window rode out a 4-QB run and still landed Daniels at 62 (+12) — fired with 0:13 left, the run's only scrape. K/DEF: Aubrey + Vikings in the final two rounds while bots burned round-12/14 picks on DEFs. Pass criteria met 4.5/5 (mid-draft queue refreshes partially lost to viewport drift). **Live auto-updating board: GREEN-LIT.** Lessons folded above:
1. **ctrl+a modifier drops on the bridge** → stray "a" corrupts the search filter; three queue-arms died this way. Fix: triple-click to select box text. (→ Executor mode)
2. **Queue-row green `⊕` = one-click draft from the queue panel** — second fire path, used twice live. (→ Executor mode)
3. **Viewport drift** (three screenshot sizes in one draft) — fresh coordinates before high-stakes clicks, refs for one-offs, single-player batches. (→ Executor mode)
4. **Range-fetch leapfrog** skipped picks 78-82; integrity gate refused to advise until patched — gate's first live catch, worked exactly as designed. (→ Step 3)
5. Confirmed keepers: search→top-row-`+` fire survives all layouts; Sleeper QB cells render red/pink (QB runs visible at a glance); bot K/DEF runs come rounds 13-15 — T1 kickers survived to 110 because bots hoard skill players; engine + cb= discipline 120/120 again.

**Aug 6, 2026 — Mock #3 debrief addenda (Briggsy's film review).** Three corrections from the man himself, folded into Executor mode above:
1. **"Who's resizing the browser?" — nobody.** Window confirmed maximized the whole draft; the oscillation is screenshot capture SCALE, not window geometry. Bullet rewritten so future sessions don't blame the human. Same mitigations stand (fresh-screenshot coordinates, refs, single-player batches).
2. **Gabe Nabers post-mortem** → full-name searches + content-verified clicks for all queue-arms. A surname filter plus a mid-action snipe puts the wrong guy in row 1; a full-name filter fails safe to zero rows.
3. **The 0:13 scrape at pick 62** → on-clock protocol tightened: search-verify the surviving ladder top FIRST (the filtered row is the availability check); engine re-ranks belong between windows, never on our own clock.

**Aug 6, 2026 — Folder reorganization (Cowork session).** Draft files moved from the folder root into `Draft Kit\`; newsletter machinery lives in `Newsletter\` (now `newsletter/`; see [`nightly-feud.md`](nightly-feud.md) — the skill this originally pointed at was decomposed Aug 7). File-location references above updated; no doctrine changes. Old twice-daily league watcher retired the same day — league watch now rides in the nightly newsletter.

**Aug 6, 2026 — Mock #2, first EXECUTOR run** (draft `1390830278393479168`, 8-team PPR ✓ verified via API, 15 rds, 120s clock, slot 2, 7 CPU opponents · Claude drove Briggsy's Chrome and clicked the picks himself). Result: 9 manual picks, 9/9 on THE CALL (Bijan 2, McBride 15, Nico 18, Egbuka 31, Kyren 34, Skattebo 47, Daniels 50, McLaurin 63, Watson 66); roster VORP 1084. One failure with a cascade, fully folded into the sections above:
1. **Pick 79 missed the clock**: a sleep(60)+fetch+merge+engine cycle was started when the engine's own output already said "next is pick 79 = YOU." Sleeper autopicked Makai Lemon (wanted: Jadarian Price, VBD+21, went 84) AND silently flipped the team to AUTO-PICK, which ran picks 82/95/98/111/114 before it was caught. Net damage ~31 vorp — auto-82 happened to take ladder-top Pollard, and the CPU room's own K/DEF-last habit landed Dicker (K T1) + Patriots (DEF T2) on schedule. Luck, not process. (→ Step 3 cadence hard rule, Executor mode)
2. **Browser mechanics discovered live**: `+` = instant draft on the clock (no confirm); search-filter-then-fire sequence; missed clock → AUTO flag on avatar; queue affordance never found (pre-draft `+` clicks no-op'd) — ladders were the only real failsafe; START DRAFT throws the sole native dialog and native dialogs freeze the extension until a human clicks. (→ new Executor mode section)
3. **Pair-window denial validated twice** (Egbuka→Kyren, Skattebo→Daniels) — promoted from "denial plays are real" to an explicit doctrine bullet with the read-their-needs procedure. (→ Standing doctrine)
4. Confirmed keepers: engine + WebFetch cb= discipline flawless (120/120 picks, zero integrity screams); Sleeper's per-row "Projected pick" label is a free pre-fire sanity check; CPU rooms are the fastest possible rooms — 12-pick gaps in ~60-90s.
5. **Post-mock queue lab** (same day, throwaway pre-draft room `1390923383440424960` — left in pre_draft as a reusable shell): found the queue. Blue `📄+` row icon = add to queue (works pre-draft); Queue tab shows count; REMOVE per entry; star = watchlist only; player-card modal has zero action buttons. Doctrine added: pre-arm the queue with the ladder before the draft, refresh per window, AUTO-PICK stays off. Also adopted Briggsy's cadence calibration (10-15s when ≤3 away) and the fire-first-narrate-after rule. Lab also proved ref-based clicking (find → click by ref) survives window-size/zoom chaos that breaks coordinate clicking.

**Aug 5, 2026 — Mock #1** (draft `1390789083982229504`, 8-team PPR, 15 rds, slot 1 · full 120-pick run · grade A · THE CALL followed 13/13 incl. one live audible). All fixes folded into the sections above:
1. Cadence re-keyed to room speed — the mock's fast room compressed 14-pick gaps to <60s and nearly beat the old distance-only table twice. (→ Step 3)
2. Pre-call snipe ladders deepened to 3-4 names — Lemon AND fallback Sutton died in the 5 picks before his turn. (→ Advisory format)
3. WebFetch inclusive-range prompts + merge-every-fetch — a bare ">" filter returned a false empty; a skipped merge briefly dropped pick 96. (→ Steps 1 & 3)
4. Board gained 10 K + 14 DEF with tiers (FantasyPros consensus K 7/31, DST 7/24) and the engine now shows K/DEF cliffs — it was blind to a 7-DEF run in picks 98-110 and ad-libbed Steelers when Vikings (T2) was the right call. (→ Files, Doctrine, Engine)
5. Engine norm() aliases diminutives — Sleeper's "Kenny Gainwell" vs board "Kenneth Gainwell" silently broke taken-detection. (→ Engine quick-reference)
6. Confirmed keepers: double-tap pair advisories at the turn; tier-cliff framing drove every correct call (McBride@16, QB-window@48); THE CALL format clickable inside ~30s; cb= counter discipline (hit cb=11).

**Aug 5, 2026 — Engine integrity gate + named slots** (bug found by a Claude Code session reviewing the folder; patch verified and landed by Cowork). Engine derived board state from `len(picks)`, so a dropped interior pick silently shifted the whole clock — reproduced with Mock #1's exact failure (pick 96 missing at 104 picks): claimed "next is pick 104" while listing 104 as made, said 6-picks-away when truth was 5, and left the dropped player on the available board. Fix: `n = max(pick_no)` + hard-fail exit 1 on interior gaps/dupes; verified byte-identical output on clean files. Tail holes are undetectable by design (cumulative endpoint → staleness, covered by poll cadence). Bonus from the same review: `metadata.slot_name_<N>` on the draft object (verified live: DIego/Hunter/Ryan) → optional `slot_names.json` → engine names every roster. (→ Steps 2-3, Engine quick-reference)

**Aug 5, 2026 — VBD war game.** Built empirical VORP from 2022-25 nflverse data (our exact scoring; league-specific baselines — the 16 flex spots fill ~11 WR / 5 RB, so last starters are QB8/RB21/WR27/TE8; waiver replacement QB12/RB41/WR47/TE12). Thunderdome sim: 300 drafted rooms × 16 outcome-sampled seasons, 6 CPU personas incl. a QB-reacher. Result: pure-VBD bot edged doctrine **53.8% H2H (+33 pts/season ≈ one waiver pickup)**; both bots independently took QB in round 6; the QB-reacher CPU averaged 4.69/8 (~half a rank donated). Validated: QB rounds 6-9, K/DEF last, elite-heavy ceiling builds, elite-TE-at-fair-price. Adopted → Doctrine: rounds 3-5 same-tier RB tie-breaker. Adopted → Files/Engine: vorp/vbdRank/vbdDelta in both JSONs; engine vorp display + VBD LEANS; board artifact VORP column, ▲▼ chips, ⚖ VBD-order toggle; cheat sheet VORP column. Rejected: wholesale VBD ordering — no Miami rule, no badges/ceiling judgment, and the sim's scorer shares VBD's worldview, so its measured edge is an upper bound.
