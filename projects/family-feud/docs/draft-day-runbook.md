# DRAFT DAY RUNBOOK — Family Feud 2026
*Operational manual for any Claude session shadowing Briggsy's draft (mock or real). [`league.md`](league.md) has the identity and rules; this file is the machine's operating instructions. The draft arsenal — engine, board, cheat sheet — lives in [`../draft-kit/`](../draft-kit/).*

**The sections below are current doctrine — Mock #1's lessons (Aug 5), Mock #2's (Aug 6, first executor-mode run), and Mock #3's (Aug 6, first CLEAN executor run: 15/15 manual, zero misses) are already folded in.** The changelog at the bottom records what changed and why; it never overrides the instructions.

**Two operating modes.** *Advisor:* Claude computes THE CALL, Briggsy clicks. *Executor:* Claude also drives Briggsy's logged-in Chrome (claude-in-chrome tools) and clicks the picks himself — proven in Mock #2. Executor mode adds the "Executor mode" section's rules on top of everything else; the biggest difference is cadence math (see Step 3).

## Files you need — run EVERYTHING from the repo root *(changed 2026-08-08, U15)*

**Stand in the repo root and never leave it.** Every command in this runbook runs from there.

This section used to say "`cd` into `draft-kit/` and work there," and that made the draft loop in
Step 3 **impossible to execute as written**: Step 3.1 (`python scripts/merge_picks.py`) only
resolves from the repo root, and Step 3.3 (`python draft_engine.py`) only resolved from
`draft-kit/`. Following the instructions literally meant one of the two commands failed, and
finding that out at 8am with a clock running is exactly the wrong time.

The conflict was real and it is now gone. `scripts/run_engine.py` runs from the root and enters
`draft-kit/` on your behalf, because the engine still opens `players_data.json`, `picks.json` and
the optional `slot_names.json` by literal name from the current directory. That constraint did not
go away — it stopped being yours to manage.

Your `picks.json` and optional `slot_names.json` are written into `draft-kit/` during the draft;
both are gitignored scratch. (Under Cowork these had to be staged into a sandbox workspace; that
step is gone — the files are just local now.)

- `draft_engine.py` — the analysis engine (tier cliffs incl. K/DEF, run watch, diminutive-alias name matching)
- `players_data.json` — the board: **174 entries** (150 skill players + 10 K + 14 DEF), tiers, badges, `vorp`/`vbdRank`/`vbdDelta`, plus the frozen `sleeperId` and a `vorpMethod` on every row. VORP = pts/season over waiver replacement, baselines waiver QB12/RB41/WR47/TE12 and last starters QB8/RB21/WR27/TE8. **Skill values are recomputed from `vorp_curve.json` (seasons **2022-2025**, exact scoring) on every build**; K and DEF keep flat per-tier constants, for different reasons — the curve builds QB/RB/WR/TE **and K**, so K has a curve but no BASELINE (a closed decision), while DEF has no exact source at all. Engine expects this exact filename in cwd.
- This runbook.

Note: `draft_rankings_data_2026-08-05.json` **was deleted on 2026-08-08** — it was a date-stamped duplicate that had already drifted (its `dst` and `strategy` disagreed with the board) while having zero readers anywhere in the repo. Git is the archive; do not regenerate it. **Three surfaces, not four.** The old `family-feud-draft-board` desktop artifact died with Cowork, and the twin-maintenance rule with it; do not reintroduce it. See [`live-board-plan.md`](live-board-plan.md).

### 🚫 NEVER hand-edit a surface. Rebuilding is one command — **RE-RANKING IS A DIFFERENT ONE**

🚨 **`build_board.py` CANNOT MOVE A RANK, AND RUNNING IT ALONE IS THE MOST LIKELY WAY THIS PROJECT
FAILS ON DRAFT DAY.** *(corrected 2026-08-14; the heading above used to read "Refreshing the board
is ONE command".)* The generator derives `vorp` from `pr`, and **`scripts/rerank.py` is the only
writer of `r`/`pr`/`tier` in the repo.** With `pr` untouched the generator re-stamps byte-identical
data, `--verify-only` then prints `every check passed`, and you draft off a stale ordering with
three green lights agreeing it was refreshed. The word `rerank` appeared **nowhere in this file**
until this correction.

**THE REAL REFRESH, in order.** Run it the week of the draft and again ~48h before:

```bash
python scripts/consensus.py --refresh            # RE-FETCH FIRST. Do not trust the mule's cache
python scripts/rerank.py                         # DRY RUN — prints every move, writes nothing
python scripts/rerank.py --write                 # rewrites r/pr/tier in players_data.json
python scripts/build_board.py --allow-dirty --rankings-synthesized <the scrape date rerank printed>
python scripts/build_board.py --verify-only      # gate + a sha256 per surface
python scripts/board_diff.py                     # what moved vs the previous synthesis — the eyeball receipt
python scripts/injury_check.py                   # READ-ONLY. 23 blind rows on 2026-08-17
python -m unittest discover -s tests             # from the root
git add draft-kit/ && git commit                 # ONE refresh = ONE commit, every surface
```

- 🚨 **`--allow-dirty` IS REQUIRED HERE AND THIS BLOCK OMITTED IT UNTIL 2026-08-18 — the sequence
  as written could not run.** `rerank.py --write` edits `players_data.json`, which IS one of the
  three surfaces, so `draft-kit/` is dirty by definition at step 4 and the bare generator refuses:
  *"draft-kit/ has uncommitted changes, so a rebuild would destroy work that is not in git."* Found
  by running it, not by reading it. **Do not "fix" this by committing between steps** — a commit
  holding new ranks with old surfaces is exactly the inconsistent state the one-refresh-one-commit
  rule exists to prevent, and it is what the 7am rollback would land on.
- ⚠️ **The build stamps `meta.build.dirty: true` when you do this.** That is honest and expected on
  a refresh — it records that the build read an uncommitted source. It is not a defect to chase.

🚨 **PASSING A NEW DATE IS A CLAIM. Do not make it for a wording change.** `--rankings-synthesized`
records **when a human made the judgment**, and `JUDGMENT_KEYS` is `r · pr · tier · badges · note` —
so **editing a note trips the gate even when no rank moved.** If you only reworded a note, re-pass
**the date already in `meta.rankings.synthesized`**: the digest updates, the date stays true, and
the board keeps telling you how old its ordering really is. Moving the date on a copy-edit would
hide that the ordering is still from the previous scrape — the same trap as `meta.updated`, and the
docstring on `judgment_sha` already names it (the JAC→JAX fix would have "made the date lie").
**Done for real on 2026-08-18:** three notes reworded, rebuilt with `--rankings-synthesized
2026-08-14` (unchanged), and the generator reported **`rank changed: 0 · vorp changed: 0`** — which
is the receipt that it was a copy-edit.

- 🚨 **`--refresh` IS NOT OPTIONAL, and step 1 used to omit it.** *(Added 2026-08-17.)* A bare
  `consensus.py` reads whatever the mule last left on disk — and the whole point of this pass is
  that the consensus has MOVED. If the mule has been dead for a week, the bare form prints
  `0 change position` and **looks exactly like a board that is already current.** That is the
  project's own landmine ("Last Result: 0 does not mean the mule works") reached through a
  different door. **Read the `scraped <date>` both scripts print.** If it still equals the board's
  `meta.rankings.synthesized`, the consensus genuinely has not moved — say so out loud rather than
  committing a byte-identical rebuild.
- 🚨 **`injury_check.py` BELONGS IN THIS BLOCK and was only ever written down in `TODO.md`.**
  *(Added 2026-08-17.)* This runbook is the surface actually followed at 7am, so a step that lives
  only in the TODO is a step that does not happen. It is the ONLY thing that catches a note that
  healed or a player hurt after the synthesis, it is strictly read-only, and the count is moving:
  **19 blind rows on 2026-08-14 → 23 on 2026-08-17**, including **McCaffrey at board 8
  (Questionable)** and **Jordyn Tyson at 84 (Doubtful, hamstring)**.
- **`rerank.py` refuses to `--write` while any note asserts a board position**, and it will not
  rewrite that prose itself — the notes are Briggsy's voice. Exactly **one** row carries such a
  note today (Jayden Daniels), so this costs one human glance per refresh, which is the gate
  working rather than a false red.
  **Two routes past it, and the second is usually the right one** *(the escape hatch existed in
  `rerank.py` since it was written and this file never named it — added 2026-08-17)*:
  - **(a)** the claim is now FALSE at the new rank → fix the sentence and re-run.
  - **(b)** the claim is STILL TRUE at the new rank → acknowledge it by name:
    `python scripts/rerank.py --write --notes-reviewed "Jayden Daniels"`.
    Naming the player IS the acknowledgement, and it goes stale on its own the next time that
    row moves. **Never edit prose that was not wrong** — `rerank.py`'s own header calls that the
    worse of the two options, alongside weakening the gate.
- ~~Commit `draft-kit/` between `--write` and the generator~~ **KILLED 2026-08-19 — it directly
  contradicted the 🚨 `--allow-dirty` bullet above.** A mid-sequence commit holds new ranks with
  old surfaces — the exact inconsistent state the one-refresh-one-commit rule exists to prevent.
  `--allow-dirty` with its honest `meta.build.dirty: true` stamp IS the designed path on a refresh.
- ⚠️ **`meta.updated` DOES NOT REPORT RANK STALENESS.** It is `max()` over input mtimes
  (`build_board.py:432-441`) and the ECR is not one of them, so it reads the same on draft morning
  no matter how far the consensus has moved. **The field that answers "how old is my ordering" is
  `meta.rankings.synthesized`.** Every place this file used to say "check `meta.updated` before you
  trust a rank" was pointing at the wrong number.

Rebuilding the *surfaces* from an unchanged source really is one command:

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

### 🔙 Rollback — the literal commands, because you will not want to browse git history at 7am

A refresh that goes wrong at draft time needs a restore you can execute without thinking. This is
it. **One refresh = one commit containing every surface**, which is what makes this work at all.

```bash
git log --oneline -- draft-kit/            # find the last commit you trust
git checkout <sha> -- draft-kit/           # restore ALL surfaces together, never one file
python scripts/build_board.py --verify-only  # prove the restored set is self-consistent
```

**Restore the whole directory, never a single surface.** The three surfaces are only meaningful as
a set; `build_manifest.json` carries a sha256 per surface, so restoring the HTML alone leaves the
manifest describing a board that no longer exists and `--verify-only` will correctly go red.

`--verify-only` is the confirmation step, not a formality — it is the **only** detector that covers
the PDF, which has no comment channel and cannot warn you it is stale.

### Two path conventions live in this repo, deliberately

Both are load-bearing and mixing them up is the same family as the "absolute paths in scheduled
tasks" landmine:

- **`draft-kit/` is not a valid Python identifier**, so nothing under it can be imported as a
  package. `scripts/` modules reach it by `sys.path` insertion, never by `import draft_kit`.
- **`normalize.py` finds its spec by `__file__`; `draft_engine.py` opens its inputs relative to
  `cwd`** — on purpose. The engine must follow the operator to whatever directory holds this
  draft's scratch files; the normalizer must always find its own rules. `run_engine.py` is what
  keeps those two conventions from becoming your problem.
- **`mule_status.json` carries a BOM** (PowerShell 5.1 wrote it), so it is the one file in this
  project where the blanket `encoding="utf-8"` rule is wrong — it needs `utf-8-sig`. Every other
  JSON read here passes `encoding="utf-8"` and must.

⚠️ **Rankings are a snapshot and they expire.** Re-research rankings/injuries/ADP before the real
draft, then run **THE REAL REFRESH above — `rerank.py --write` and then the generator.** The
generator alone cannot move a rank.
**Read `meta.rankings.synthesized`, NOT `meta.updated`,** before you trust a single rank: the
second is input-mtime freshness and does not move when the consensus does. Measured 2026-08-14 —
the board's synthesis was `2026-08-08` while `meta.updated` read `2026-08-09` and the live ECR had
moved **101 of 174 rows**, 20 of them across a tier.

⚠️ **Something WILL remind you now — but it writes a file, it does not tap you on the shoulder.**
*(changed 2026-08-08, U9.)* The Cowork one-shot that used to drop a `REFRESH_BRIEF` on a hardcoded
Aug 26 is gone, and good riddance: the draft date is a handshake between eight people and **it can
move earlier**, so a fixed date was the wrong shape. `scripts/watch_draft_state.py` runs hourly at
:35 and fires on the actual transition — `start_time` going non-null, `draft_order` populating,
`status` leaving `pre_draft`, a seat moving or vanishing, or the draft being re-created. It writes
to `newsletter/data/state/DRAFT_ALERTS.md` (**tracked in git since 2026-08-14** — it is the only
channel the STARTING GUN has, and the nightly newsletter now surfaces it too), **never a
notification** — Anthropic push
and email are broken account-wide for this account, so an alert that needs one does not exist.

**Read that file; it will not come to you.** And still check `meta.updated` before trusting a rank.

### If the draft was re-created

*(Written 2026-08-18, then corrected the same night by an adversarial review that found nine real
defects in the first draft — including a verify step that was guaranteed to fail. Every claim below
was re-read from source after that.)*

🚨 **The commissioner re-creating the room is an ordinary pre-draft act, and this project reads it
as "nothing has happened yet" right up to go time.**

**THE MECHANISM, because the first draft of this section got it wrong.** It is not that the API
keeps answering `null` — it is that **the mule's cargo FREEZES.** `Fetch-Source`'s catch
(`newsletter/feud_mule.ps1:96`) records `FAIL: fetch failed -- …` and **returns without touching the
destination file**, so `newsletter/data/inbox/sleeper_draft.json` keeps its last good copy. Every
downstream reader then sees a dead draft's `start_time: null` and `draft_order: null` off a file
nothing is refreshing — under a **fresh `run_at` timestamp**, which is what makes it look alive.

⚠️ **AND THERE ARE TWO WORLDS. Work out which one you are in before doing anything.**

- **The old draft still resolves (HTTP 200).** Sleeper keeps the abandoned object. **Nothing 404s,
  nothing errors, the board polls happily and greys nobody out.** The *only* thing that can catch
  this is the league-vs-cargo comparison in `watch_draft_state.py`'s `main()` — the
  `str(league_draft) != str(cargo["draft_id"])` check. **This is the silent case and it is the
  likely one.**
- **The old draft is gone (HTTP 404).** Now the mule FAILs, `merge_picks.py` refuses, and the board
  shows `poll failed`. Louder, and easier.

**1 — THE SYMPTOMS. None of them says "the draft was re-created."**

| You see | Where | What it means |
|---|---|---|
| **THE DRAFT WAS REPLACED** | `DRAFT_ALERTS.md` | ✅ The real signal, and the only one that fires in the silent case. It is a *file*, not a notification. |
| the board stays **LIVE**, greys nobody out, `merge_picks` exits 0 with **"0 new"** | everywhere | 🚨 **THE SILENT CASE. There is no error to notice.** A draft that never seems to start is this until proven otherwise. |
| `sleeper_draft: FAIL: fetch failed -- … [kept previous cargo, N min old]` | `mule_status.json` | The mule is pinned to a draft the API no longer serves — **and it kept the old file.** |
| **CARGO IS STALE — THIS WATCHER IS BLIND** | `DRAFT_ALERTS.md` (`watch_draft_state.py`, the cargo-age check) | If `sleeper_draft.json` is stale while `sleeper_users.json` is fresh, suspect a re-created draft **before** suspecting the scheduled task. |
| `fetch failed: HTTP Error 404` | `merge_picks.py` | ✅ Since 2026-08-18 this says **do NOT retry** and points here. |
| `· poll failed (HTTP 404) — showing the last good state, retrying` | the board | ⚠️ **Backs off 12→24→48→60s and retries forever.** It never says the draft is gone, and it keeps showing a plausible frozen board. |

⚠️ **A 404 here is an answer, not a blip — do not wait it out.** If the board is stuck on
`poll failed` for more than one cycle, or the room simply never starts, run
`python scripts/watch_draft_state.py` and read `DRAFT_ALERTS.md` before anything else.

**2 — CONFIRM THE ID BEFORE YOU BELIEVE ANY OF THIS.**

🚨 **A mistyped draft id 404s identically to a deleted one.** The remedy below is a ten-file edit;
it is the wrong move if you simply pasted the wrong id. Check what you typed against the draft-room
URL first. Then ask the **league**, never a doc (this file included):

```bash
curl -sL --max-time 15 "https://api.sleeper.app/v1/league/1390509993844809728?cb=$(date +%s%N)"
```

Read `.draft_id`. That is the same field the watcher compares. The **league** id is stable across a
re-created draft — only the draft is replaced.

**3 — THE ORDERED EDIT LIST. Order matters; step 4 undoes step 6 if you swap them.**

🚨 **GREP IS THE METHOD.** Run `grep -rIl "<old_id>" . | grep -v '^\./\.git/'` and work from *its*
output. **It returns 44 files. Ten of them get changed; the other 34 must be left alone** — that is
the whole reason this list exists. Identify hits by the surrounding text, **never by line number**:
the numbers in the first draft of this section had already rotted by the time it was committed.

1. **`newsletter/feud_mule.ps1`** — two lines, `sleeper_draft` and `sleeper_traded`. **Do this
   FIRST, then run the mule.** Everything generated flows from its cargo, so regenerating before
   this just re-stamps the dead id.
2. **`scripts/sleeper_draft_console.js`** — the `REAL_DRAFT_ID` constant behind the `ffStartDraft`
   guard. 🚨 **`tests/test_sleeper_draft_console.py`'s `REAL` URL must move in the SAME commit** —
   it is coupled to that constant and the suite goes red otherwise. **This is the one test constant
   that is not a self-consistent synthetic.**
3. **`scripts/merge_picks.py`** — the `USAGE` help text. Cosmetic. ⚠️ It is *help text*, not a
   refusal message; the refusals carry no id, so do not hunt for one.
4. **REGENERATE THE BOARD — RUN IT YOURSELF. NOTHING ELSE WILL.** ⚠️ The mule does **not** run
   `build_board.py`; the first draft of this section claimed the board "corrects itself" and that
   was false. After the mule has re-run:
   ```bash
   git status draft-kit/                      # build_board refuses on a dirty draft-kit/
   python scripts/build_board.py
   python scripts/build_board.py --verify-only  # the ONLY check comparing meta.shape.draft_id to live cargo
   ```
   Then **commit `draft-kit/` as one commit.** One refresh = one commit is what makes the rollback
   above land on a live board instead of a dead one.
5. **`draft-kit/.last_good/` — DELETE IT, AND ONLY AFTER STEP 4.** ⚠️ **Order is the whole point.**
   `emit()` does `rmtree` then copies the **current** surfaces in *before* replacing them, so a
   rebuild is what *creates* a dead-id rollback copy — and `emit()` restores from it automatically
   if a later build throws. Deleting it before step 4 accomplishes nothing.
6. **`draft-kit/picks.json` — DELETE.** It belongs to a draft that no longer exists. The
   contamination gate will refuse on it anyway; delete it so that refusal never has to fire on the
   clock. (Gitignored — `git status` will never show it to you.)
7. **RE-RUN THE LADDER, AND DO NOT SKIP THIS.** 🚨 `newsletter/data/state/ladder.json` is **not**
   self-healing. `resolve_out`'s divert only stops a foreign ladder from being **written** over that
   path — **it does nothing about the stale one already sitting there**, and Step 3.5 tells you to
   pipe exactly that file's `queue` into `ffQueueSync`, where **auto-pick drains it top-down on a
   blown clock.** Re-run `scripts/precompute_ladder.py` for the new draft and confirm the file's
   `draft_id` is the new one *before* loading it. The new Sleeper room's queue also starts **empty**.
8. **Docs:** `docs/league.md` (2) · `docs/data-access.md` (2) · **this file's Step 1 pin** — the
   `- **Real league draft:** draft_id …` bullet · `TODO.md` (3).
   ⚠️ **NOT this file's other hit** — the one inside the blockquote beginning
   *"Half obsolete, half CORRECTED 2026-08-14"*, in the sentence *"three bare fetches … returned
   `cf-cache-status: HIT`"*. **That measurement was actually taken against that draft; rewriting the
   id there falsifies it.** Identify it by that sentence, never by a line number.

🚫 **THE 34 TO LEAVE ALONE:**
- `newsletter/data/state/last_seen.json` — the watcher's `prev` snapshot. **Editing it erases the
  very detection that fired**, and step 4 of VERIFY depends on it still holding the old id.
- `newsletter/data/inbox/*` and the ten `newsletter/data/archive/*` days — mule-regenerated and
  historical.
- `docs/insights/016-*.md` and `docs/live-board-plan.md` — **history.** That plan's own header says
  it is a historical record. Editing history to match today destroys the audit trail.
- Every remaining test constant — `tests/fixtures/sleeper_{draft,league}.json`,
  `tests/test_watch_draft_state.py`, `test_merge_picks.py`, `test_precompute_ladder.py`,
  `test_engine_matching.py`. Self-consistent synthetics; changing them tests nothing.

**4 — VERIFY. Run all five; the last two are the ones people skip.**

```bash
grep -rIl "<old_id>" . | grep -v '^\./\.git/'   # only the 34 do-not-touch files may remain
python -m unittest discover -s tests            # green
python scripts/watch_draft_state.py             # 1st run: fires THE DRAFT WAS REPLACED, exit 1
python scripts/watch_draft_state.py             # 2nd run: quiet, exit 0  <-- THIS is the check
python scripts/build_board.py --verify-only     # the board's id vs the live cargo
```

🚨 **THE FIRST WATCHER RUN IS SUPPOSED TO FAIL, and the first draft of this section got this
wrong — it said "exits 0", which would have had you undoing correct work at 7am.** `save()` writes
the new snapshot *after* the diff, and `last_seen.json` is on the do-not-touch list, so the old id
**must** be diffed away exactly once. That first alert is the remedy's own echo. **Anything the
SECOND run says is real.** (If the hourly task already fired, your first manual run is quiet.)

🚨 **AND RELOAD THE BOARD TAB FROM DISK — no edit can reach it.** `PICKS_URL` is baked from
`SHAPE.draft_id` at **page load**, and the greyed-out rows are in-memory state from the dead draft.
Close the tab, reopen `draft-kit/family-feud-draft-board.html`, **click `▶ Go live` again** — a
reopened board comes back **paused**, so a fresh tab reads `Polling paused`, never `LIVE`, unless
you opened the `?live=1` URL (see Step 2's monitor-2 section) — then confirm the live bar reads
`LIVE · N picks in` with no `poll failed`.

⚠️ **`run_engine.py --dry-run` is NOT a check on the board.** It returns before it ever starts
`draft_engine.py`, so it never opens `players_data.json` and cannot see a stale board — it only
re-reads the cargo you just fixed. Use `build_board.py --verify-only` for that. *(The first draft of
this section called `--dry-run` "the only check that closes the loop end to end." It was false.)*


## Step 0 — Arm the room (BOTH modes)

*(Added 2026-08-19. It is **Step 0** so nothing below renumbers — `CLAUDE.md` pins the names
"Step 3.1" and "Step 3.3".)* 🚨 **THIS INSTRUCTION USED TO LIVE ONLY INSIDE "Executor mode" — the
one section an advisor-mode session is told it does not need**, since executor mode "adds the
Executor mode section's rules **on top of** everything else" (top of this file). But Step 3.5's
queue re-arm is **mandatory every cycle in both modes** and it calls `window.ffQueueSync`, which
does not exist until this paste happens. An advisor-mode session following this file in order
therefore reached a mandatory step with an unarmed bridge, and the failure reads like a dead
extension rather than a skipped step.

**Advisor mode needs the queue as much as executor mode does.** Sleeper's timeout autopick takes
the queue **TOP**, so a loaded queue is what turns a missed clock into *our* guy instead of ADP's.
Briggsy clicking the picks himself does not change that; it only changes whose hands do the
clicking.

**WHAT TO PASTE.** The whole of `scripts/sleeper_draft_console.js`, evaluated in the draft-room tab.
It is a single IIFE (`scripts/sleeper_draft_console.js:45` → `:715`) that hangs **13** helpers off
`window`: the eight you drive — `ffFind` · `ffDraft` · `ffQueue` · `ffQueueList` · `ffUnqueue` ·
**`ffQueueSync`** · `ffAutoPick` · `ffStartDraft` — plus five to assert with: `ffSyncPlan`,
`ffQueueVerdict`, `ffUnqueueVerdict`, `ffReadQueue`, `ffHandlerProps`. **A partial paste installs
nothing** — measured 2026-08-19 by evaluating the file truncated at three different points: every
one threw `SyntaxError` with **zero** `ff*` on `window`. There is no half-armed state to diagnose.
- *Executor mode:* Claude evaluates it in the room's tab through claude-in-chrome.
- *Advisor mode:* it goes in the draft-room tab's own DevTools console (F12 → Console).
- The paste mechanics — why it must go in **inline** rather than be fetched, the comment-stripping
  command, and the byte-count check that catches an empty file `node --check` would pass — live in
  `.claude/skills/sleeper-draft-room/SKILL.md` under *Pasting the console*. **Invoke that skill
  before any browser work on sleeper.com**; its own self-test runs this check first.

**HOW TO CONFIRM IT TOOK — CHECK THE NEWEST HELPER, NOT THE OLDEST.** A stale paste from an older
copy of the file has `ffFind` and lacks the rest:

```js
typeof window.ffQueueSync === "function"     // must be "function" before you trust any of it
```

🚨 **DO NOT READ THE INSTALL BANNER AS CONFIRMATION.** The IIFE's return value is the literal
string `ffFind(), ffDraft(), ffQueue() and ffAutoPick() installed`
(`scripts/sleeper_draft_console.js:714`) — **`ffQueueSync` is not in it**, and neither are
`ffQueueList`, `ffUnqueue` or `ffStartDraft`. That sentence is prose that drifted behind its own
file; the `typeof` above is the oracle.

⚠️ **RE-INSTALL AFTER ANY RELOAD OR SAME-TAB NAVIGATION** — both wipe every `ff*` helper, and the
failure looks exactly like the bridge being dead. Sleeper's **`NEW MOCK NFL DRAFT`** button
navigates the *same* tab, so budget a re-paste immediately after creating a mock; clicking an
*existing* mock card opens a new tab, where the paste survives.

## Step 1 — Find the draft
- **Real league draft:** draft_id `1390509994847240192` (league `1390509993844809728`).
- **Mock draft:** `curl -sL --max-time 15 "https://api.sleeper.app/v1/user/1390750540631150592/drafts/nfl/2026?cb=$(date +%s%N)"` — take the most recent entry with status `drafting` (or `pre_draft` about to start). **Expect this to come up empty and plan for it.** Checked live Aug 7: the endpoint returned exactly ONE draft — the real league's — and none of Mocks #1, #2 or #3, even though Briggsy created all three himself. So the old note that "mocks he creates himself may be the only reliable thing here" is optimistic; treat this endpoint as a bonus, not a method. **The reliable path is to ask him to paste the draft room URL** (`sleeper.com/draft/nfl/<draft_id>` — the id is right there in it). He often pre-creates the room hours early (Mock #2's was built ~5h before go time) — check the web app's Mock Drafts tab ("In progress" list) and the draft room URL: `sleeper.com/draft/nfl/<draft_id>`.
- **All Sleeper reads go through `curl`** — see [`data-access.md`](data-access.md). Always pass `--max-time 15`.

> **Half obsolete, half CORRECTED 2026-08-14 — read both halves.** This step used to mandate
> WebFetch *and* a `?cb=N` cache-buster, because Cowork's sandbox proxy-blocked curl and WebFetch
> cached for 15 minutes. **WebFetch is still banned outright** (no timeout, hangs agents; a hook
> blocks it) and the old "never say *greater than N*, use inclusive ranges" rule was
> prompt-engineering aimed at WebFetch's summarizer model and is moot.
>
> 🚨 **But "curl works, has no cache" was WRONG, and it was the reason the cache-buster got
> deleted.** The cache is **Cloudflare's edge, not curl's** — curl having no cache of its own says
> nothing about it. Measured on this machine 2026-08-14: three bare fetches of
> `/v1/draft/1390509994847240192` returned `cf-cache-status: HIT` under
> `cache-control: public, s-maxage=30, stale-while-revalidate=300, stale-if-error=600`; the same
> URL with a **unique** nonce returned `MISS` every time. `stale-while-revalidate=300` means it can
> hand you a five-minute-old answer.
>
> **Append `?cb=<unique nonce>` to EVERY Sleeper read in this file.** Insight 020 measured what it
> costs not to, seconds after START DRAFT: the bare URL said `status: pre_draft, draft_order: null`
> while the busted URL said `status: drafting, draft_order: {"1390750540631150592": 5}` — same
> second, opposite answers, **and the stale one reads exactly like a completed check**. The nonce
> must be unique **per call**; one fixed at startup is just a second cache key. A
> `Cache-Control: no-cache` request header does NOT work — Cloudflare ignores it.
> This matters most at Step 2's **seat read**, because `draft_order` flips from null to populated
> at go time — precisely when a stale copy keeps saying `null`.

## Step 2 — Lock the config
`curl -sL --max-time 15 "https://api.sleeper.app/v1/draft/<draft_id>?cb=$(date +%s%N)"`
— **the nonce is not optional and must be unique per call**; see the CORRECTED note under Step 1.
This is the read `draft_order` comes from, and a stale copy says `null` exactly when it stops
being null:

🚨 **SEND THAT CURL SOMEWHERE — `--cargo` IS THE FLAG, and it was documented nowhere until
2026-08-17.** By default `run_engine.py` and `precompute_ladder.py` read the draft object from the
mule's **hourly** cargo (`newsletter/data/inbox/sleeper_draft.json`). `draft_order` flips
null → populated **at go time**, which is precisely the moment that file is guaranteed to be
behind — and the staleness warning does not help, because the watcher's threshold is 150 minutes,
so a 60-minute-old file prints nothing and reads healthy. Step 2 told you to curl the draft object
and gave the output nowhere to go. It goes here:

```bash
curl -sL --max-time 15 "https://api.sleeper.app/v1/draft/<draft_id>?cb=$(date +%s%N)" > temp/draft.json
python scripts/run_engine.py --cargo temp/draft.json --dry-run    # confirm the seat, launch nothing
python scripts/run_engine.py --cargo temp/draft.json              # then for real
python scripts/precompute_ladder.py --cargo temp/draft.json       # SAME FLAG, same file
```

🚨 **AND THE FIRST VERSION OF THAT FLAG PUT A HOLE UNDER THIS EXACT COMMAND — and the first FIX
of the hole shipped a deeper copy of it, so this paragraph has now been wrong once and is written
by the third pass.** `--cargo <file>` made `cargo_draft_id` join `sleeper_draft.json` onto a path
that was already a file, find nothing, and return `""` — and the ladder-overwrite divert read
`if real and draft_id and …`, so an empty id **short-circuited straight to the live
`ladder.json`**. The 2026-08-18 "fix" handed the FILE to the identity read — which let a mock's
own draft object **vouch for itself** (`real == draft_id`, both read from the same file), and the
2026-08-20 lunch mock wrote the live ladder **twice**, once bare ("gate NOT armed", then wrote it
anyway) and once with `--draft-id` (armed, "equal", wrote it). Step 3.5 then pipes that file into
`ffQueueSync`, where auto-pick drains it top-down. **Fixed for real 2026-08-21, split by owner:
the ARMING id may come from the passed file** (an independent check of the feed is still an
independent check — `run_engine.py`'s own behaviour), **but IDENTITY — which draft is this
league's — only ever comes from the mule's inbox.** A mock therefore diverts to
`ladder.<draft_id>.json`, and an unarmed run writes `ladder.unarmed.json` and says so — an empty
arming id can no longer skip the divert. Pinned at the `main()` wiring level
(`test_A_MOCKS_OWN_DRAFT_OBJECT_CANNOT_VOUCH_FOR_ITSELF` + the positive control), because ⚠️
**1057 green tests sat over the first hole and 1179 over the second** — every earlier
`--cargo FILE` test passed `--out` or `--draft-id`-matching-the-file, the exact flags that
disable the guards the form broke.

✅ **`precompute_ladder.py --cargo` accepts that same file as of 2026-08-18, and it did not before.**
Its `--cargo` had always meant a **directory** while `run_engine.py`'s meant a **file** — same flag
name, same doc, opposite meanings — so the go-time technique above worked for one script and
silently did the wrong thing for the other. It now takes either, and stages a file under the name
the engine opens by literal name.

**Do this once at go time and you never type a seat again.** With `draft_order` populated the
wrapper derives the seat itself and says which oracle confirmed it. Until then, a typed seat now
prints **`🚨 NOTHING HAS CHECKED IT`** rather than the old line, which claimed the engine
cross-checks a typed seat against `draft_order` and your own picks — **both of those oracles are
structurally empty before your first pick lands**, so that reassurance was unearned at exactly the
pick where a wrong seat costs the most.

⚠️ **RUN IT TODAY AND IT REFUSES — THAT IS THE CORRECT ANSWER, NOT A BROKEN COMMAND.** Verified
2026-08-17 against a live 729-byte curl: with no seat argument it exits 2 with `!! NO SEAT ...
draft_order holds no entry for user_id 1390750540631150592 (it stays null until near go time —
that is normal, not a fault)`. Pre-draft, pass the seat positionally and read the 🚨 line as the
true statement it is. **The first thing to do when the room goes live is re-run this with no seat
and watch it derive one** — that is the moment the guesswork ends.
- `settings.teams`, `settings.rounds`, `settings.pick_timer` — **read rounds from the API, never assume 16** (Mocks #1 and #2 both ran 15; the real league is 16).
- `draft_order` — map of user_id → slot. Briggsy = user_id `1390750540631150592`. **His slot is the engine's first argument.** draft_order can be null until near start — re-verify ON draft day, before the first advisory. Slot changes strategy hard: turn slots (1/8) draft in pairs and plan 14 picks ahead; middle slots don't. Slot 2 (Mock #2) is a near-turn: picks come in loose pairs with 3 picks between (e.g. 15/18, 31/34) and 13-pick droughts after — plan both picks of a pair as one decision, including who the between-teams will eat (denial forecasting won Egbuka→Kyren and Skattebo→Daniels).
- Confirm scoring context (real league = full PPR; make mocks 8-team PPR to mirror it — verify `metadata.scoring_type` via API; Mock #1's lobby was accidentally created as Standard first, Mock #2 verified `ppr` ✓).
- **Slot names — and the real draft does NOT have them.** Re-measured against the live draft object
  2026-08-08: `metadata` carries **exactly four keys — `description`, `league_type`, `name`,
  `scoring_type` — and zero `slot_name_*`.** This runbook used to teach `metadata.slot_name_<N>` as
  a live source; that was true of **Mock #1's room** and was generalised to the real league, where
  it is simply absent. Do not go hunting for those fields on draft morning. Registered accounts
  appear in `draft_order` and the humans behind them in `/league/<id>/users` — that pair is the
  real source, and the engine already reads it. `slot_names.json` remains an optional hand-authored
  override (`{"2": "DIego", "3": "Hunter", ...}`, written into `draft-kit/`) and the engine prints
  a disagreement rather than trusting it. All-CPU mock rooms have no names at all — skip the file.
- 🚨 **`slot_to_roster_id` IS NOT YOUR SLOT.** It is the identity map `{1:1 … 8:8}` on this draft
  (verified live 2026-08-08), so it will hand back whatever you put in and look like a confirmation.
  There are **three unrelated "3"s** in this league — Briggsy's user slot, his `roster_id`, and this
  map's `3` — and `roster_id 3` sits one line away in [`league.md`](league.md), which makes "3" the
  most attractive wrong answer in the project. Read the seat from
  `draft_order["1390750540631150592"]` and **from nothing else**. `run_engine.py` does exactly that
  and refuses rather than guessing when `draft_order` is still null.
- 🚨 **TRADED PICKS — checked automatically since 2026-08-17, and you should still glance at it.**
  Every pick-slot computation in this repo assumes each seat owns the picks its snake position
  implies. **One traded pick falsifies "your next pick is #N" and "picks until you" for the rest of
  the draft** — silently, exit 0, integrity gate green. It has been `[]` since 2026-08-07, which is
  exactly why nothing read it until now. The mule hauls it hourly
  (`newsletter/data/inbox/sleeper_traded_picks.json`), so `run_engine.py` costs no fetch, and it
  does not treat all trades alike:
  - a pick **we** traded away or acquired → **hard refusal, exit 2.** There is no honest advisory.
  - a trade **between two other teams** → the run continues with a `!!` warning. Our pick numbers
    are still exact; what is now wrong is which roster to attribute those picks to, so **do not
    read a denial play off ROSTERS/NEEDS at those slots.**
  - **cargo absent** → the run continues and says `[unknown] ... NOT checked`. A dead mule must not
    also cost the advisory — but silence would be the gate that could never fire.
  To check it by hand: `curl -sL --max-time 15 "https://api.sleeper.app/v1/draft/<draft_id>/traded_picks?cb=$(date +%s%N)"`.
  Our `roster_id` is **derived** from `newsletter/data/inbox/sleeper_rosters.json` (the roster whose
  `owner_id` is `1390750540631150592`) and never quoted from prose — same reason as the seat above.

### 📺 Also in Step 2 — PUT THE BOARD ON MONITOR 2

*(Added 2026-08-17. The board is the display Briggsy reads all night and this file — "the machine's
operating instructions" — never once told anyone to open it. The only mention was a note about a
**deleted** Cowork artifact with a similar name.)* It is deliberately a **display, never a control
surface**: the terminal drives, the board shows, and **no pick ever depends on a click landing
here.** *(Corrected 2026-08-19. This used to read "it must never need a click to be useful," which
is false of the one click that arms it — see step 1 below. It needs exactly **one**, at setup, and
none thereafter; served with `?live=1` it needs none at all.)*

`draft-kit/family-feud-draft-board.html` — all 174 rows with notes and badges, greys out the
drafted, stamps `#pick · seat`, and **once live** polls `/picks` every 12s, backing off
12→24→48→60s on failure (`const POLL_MS = 12000, POLL_MAX_MS = 60000;`). It starts **paused** —
`let pollTimer = null, isLive = false, …` — in both the template and the built board.

**Open it, then read the live bar. That is the whole self-test:**
- `Polling paused · click Go live to grey players out as the picks land` → **it is open and it is
  NOT polling.** This is what a double-clicked board says, every time, and it is a *correct* state,
  not a fault — click `▶ Go live`. *(This bullet was missing until 2026-08-19, which left the only
  state you actually see first unaccounted for.)*
- `LIVE · N picks in · next is #M, seat S · updated <time>` → it is polling. Done. (Between the
  click and the first response it reads `LIVE · waiting for the first response…` — the click fires
  a fetch immediately, so that text should be gone in about a second, not in 12.)
- `poll failed (HTTP …) — showing the last good state, retrying` → it is not. Use the fallback below.

One more state exists and means the board, not the network, is wrong: `This board carries no draft
id, so there is nothing to poll…` with `▶ Go live` **disabled** — a board built while the draft
object was unreadable. Rebuild it. Today's board carries `draft_id 1390509994847240192`, so you
should never see it.

1. **Double-click the file, then click `▶ Go live`** (top-left of the live bar; it becomes
   `⏸ Pause`). 🚨 **DOUBLE-CLICKING ALONE NEVER STARTS POLLING, AND THIS STEP SAID IT DID UNTIL
   2026-08-19** — it read *"`?live=1` is not needed — it starts itself when opened as a wall
   display."* It arms itself **only** off the query string, in the **last executable line of the
   file** — byte-identical in the template and in the built board you actually double-click:
   ```js
   if (PICKS_URL && new URLSearchParams(location.search).get('live') === '1') setLive(true);
   else renderLive();
   ```
   ```bash
   grep -n "live') === '1'" scripts/templates/board.html draft-kit/family-feud-draft-board.html
   ```
   *(Grep it rather than trusting a line number — the board is regenerated and those rot.)*

   **A `file://` URL has no query string**, so it takes the `else renderLive()` branch and sits at
   `Polling paused` for as long as you leave it there — which is what you would be reading all
   night while the board silently showed nobody drafted.
   **The button is the design, not a workaround:** the comment above that line says a laptop
   opened to read the board "does not poll until asked — silently reaching the network because a
   file was opened is a surprise, and this file gets opened a lot."
   ⚠️ **The FETCH half of this path is still NOT PROVEN.** The server half is fine — measured
   2026-08-17, Sleeper returns `access-control-allow-origin: *` even for `Origin: null`, which is
   what a `file://` page sends — but **Chrome's own `file://` fetch behaviour was never tested**
   (Playwright refuses the `file:` protocol, and the browser extension was unavailable). So after
   clicking `▶ Go live`, believe the live bar, not this paragraph: if it does not reach
   `LIVE · N picks in` within ~15 seconds, go to 2.
2. **If the bar does not go LIVE within ~15 seconds, serve it — this path IS proven:**
   ```bash
   cd draft-kit && python -m http.server 8765 --bind 127.0.0.1
   # then open http://127.0.0.1:8765/family-feud-draft-board.html?live=1
   ```
   Verified end to end 2026-08-17 against the **real** draft: `LIVE · 0 picks in · next is #1,
   seat 1`, 174 rows rendered, polling confirmed by the timestamp advancing between reads. The only
   console error is a favicon 404 from the bare server — harmless.
   ⚠️ **That terminal must stay open all night.** Start it before the draft, not during it.

## Step 3 — The loop (repeat until draft complete)

> 🚨 **RUN STEPS 1-4 AS ONE CHAINED SHELL CALL, AND GREP THE OUTPUT.** *(Added 2026-08-17 —
> `insight 026` prescribed this on 2026-08-15 and it never reached this file, which is the repo's
> own meta-lesson: an insight nobody propagates to the surface that states the rule is a note, not
> a fix.)*
>
> **96-98% of every on-clock second is round-trip and agent latency, not Python.** All 23 script
> invocations of the live rehearsal totalled **5.28s** and `run_engine.py` never exceeded **0.18s**.
> So the only two levers are **FEWER ROUND TRIPS** and **SHORTER OUTPUT** — never faster code.
>
> ```bash
> python scripts/merge_picks.py <draft_id> \
>   && python scripts/run_engine.py \
>   && python scripts/precompute_ladder.py
> ```
> ✅ **THE SEAT IS NO LONGER TYPED IN THIS CHAIN (2026-08-18).** Both scripts derive it from
> `draft_order` and **refuse rather than default** when it is still null. That removes ~15 typings
> of a number whose most attractive wrong answer is `3` — Briggsy's slot, his `roster_id`, and
> `slot_to_roster_id`'s identity-map `3` are three unrelated 3s.
> ⚠️ **PRE-DRAFT YOU STILL TYPE IT** (`run_engine.py <slot>` / `--slot <n>`): `draft_order` is null
> until near go time, so this removes the other fourteen, not the first.
> 🚨 **AND READ THE `[!]` LINE WHEN THE SEAT IS DERIVED.** A derived seat makes the engine's
> `[checked] … against draft_order` self-confirming — it compared the value against the file it
> came from. The precomputer now says so and names the one oracle that IS independent (our own
> `picked_by`), which cannot arm until one of our picks has landed.
> - **Measured saving: ~16s per pick** vs the same three as separate calls. Re-timed 2026-08-17
>   against the real draft with the output grepped: **the whole chain ran in 0.617 s.**
> - **`&&`, not `;`** — a failed merge must stop the chain, not feed a stale `picks.json` to the
>   engine.
> - **GREP IT.** Reading the full dump cost **19s** once. `grep -A6 "BEST AVAILABLE"` and
>   `grep -A4 "QUEUE THIS ORDER"` are the two blocks you act on; add
>   `grep -E "THE WAIT|Between this pick|Their open needs|⚠ CLIFF|RUN WATCH"` for line four.
>   ⚠️ **ADVISOR MODE needs a wider net — two gaps measured composing at #51 and #83 in the
>   2026-08-20 lab pre-rehearsal:** (a) the `-A4` queue grep returns only TWO names, because the
>   ladder's own two-line explanation paragraph eats the window — use `grep -A10 "QUEUE THIS
>   ORDER"`; (b) **nothing above captures YOUR roster**, and line 3 of the four lines is Risk *in
>   roster terms* — add `grep -F "<== YOU"` (the engine's own `slot N: [...] needs: ... <== YOU`
>   row). Without it both stops were composed by inferring the roster from the queue's
>   construction — exactly the derived-number habit the banned list exists to stop. *(The badge
>   legend also doesn't survive the greps; the `^`/`+` glyphs at #51/#83 arrived unglossed. Minor —
>   no advisory line needed them — but know the full dump has the key if one ever matters.)*
>   ⚠️ **Read the `[source]`/`!!` preamble on the FIRST cycle of the night in full** — grepping it
>   away every time is how an unarmed contamination gate goes unnoticed.
> - 🚫 **DO NOT RE-MERGE WHILE ON THE CLOCK.** The feed cannot move: nobody else can pick while it
>   is your turn. A second merge buys nothing and costs a whole round trip out of ~90 usable
>   seconds. Merge when a pick lands, not when you are deciding.
> - 🚨 **ON HIS CLOCK, THE ADVISORY GOES OUT BEFORE ANY BROWSER CALL — queue maintenance lives
>   between windows only.** *(Added 2026-08-21 from the 08-20 lunch mock, where a queue-sync that
>   hung 45s on his clock cost the advisory, blew the clock, and flipped the seat to AUTO for the
>   rest of the draft.)* claude-in-chrome CDP timed out 45s twice that day, and one loss was
>   reply-only — the sync had actually landed, so verify by READING the queue back (insight 007's
>   shape), never by the call's own result. **After 2 timeouts in a session: declare the bridge
>   dead, keep advising API-only, and say so out loud.** The queue is the blown-clock net, but a
>   stale queue plus a delivered advisory beats a fresh queue plus a missed clock every time.
> - **On a MOCK add `--rounds 15 --draft-id <mock_id>` to steps 3 and 4** — see step 3's warning.

1. **`python scripts/merge_picks.py <draft_id>`** — one command: fetches `/picks`, merges into
   `draft-kit/picks.json` keyed on `pick_no`, and reports the count, the latest pick, and whether
   there are gaps or duplicates. Run it every cycle, including "just checking" ones.
   **If it says `VANISHED`, stop and read it.** A union can only grow, so a pick removed upstream
   (a commissioner reversing one — ordinary) would otherwise stay forever as a phantom: contiguous
   pick_nos, integrity gate green, and the engine counting a drafted player who is actually
   available, with picks-until-you off by one for the rest of the draft. A reversal and a
   truncated fetch look identical from here, so the script does not choose. **Re-run once.** If
   the pick is still gone it really was reversed — then, and only then,
   `python scripts/merge_picks.py <draft_id> --rebuild` writes the feed verbatim.
2. It **unions** rather than overwrites, so a truncated response can never delete picks you already
   hold — a short read is a no-op instead of a silent regression. That discipline is why Mock #1's
   briefly-dropped pick 96 was recoverable.
   *Historical note: under Cowork, responses had to be trimmed with "from pick N onward" range
   prompts to fit through WebFetch, and leapfrogging N skipped picks 78-82 in Mock #3. **curl
   returns the whole cumulative array, so there is no range left to get wrong** — that failure
   mode is retired. The merge discipline and the integrity gate below are what caught it; both stay.*
   The engine now enforces this: it **hard-fails (exit 1) on interior gaps or duplicate pick_nos** in picks.json and refuses to emit board state. If it screams, re-fetch /picks, re-merge, rerun — NEVER advise off a screaming engine. (A missing *newest* pick is undetectable — a tail hole looks identical to "draft is only this far along" — but /picks is cumulative, so that's staleness bounded by poll cadence, not corruption.)
3. Run: **`python scripts/run_engine.py`** — from the repo root, same directory as step 1.
   *(changed 2026-08-08, U15)*
   Pass the seat as `run_engine.py <slot>` while `draft_order` is still null; once it populates,
   the wrapper reads the seat itself. It also reads `teams`, `rounds` and the whole roster from the
   draft object, and **arms the contamination gate for you** when the mule's cargo is fresh — that
   flag used to be optional and forgettable, and forgetting it is how a spent mock's `picks.json`
   advises a live draft. Overrides are `--teams`, `--rounds`, `--draft-id`; each wins and says so.
   🚨 **AGAINST A MOCK, BARE IS WRONG — and neither this file nor the skill said so until
   2026-08-17** (it lived only in `docs/insights/026`). Bare, both `run_engine.py` and
   `precompute_ladder.py` read the **REAL league's** draft object — `rounds: 16`, while mocks here
   have run 15 — and arm the contamination gate with the **REAL** draft id. Required form on a
   mock: `python scripts/run_engine.py <slot> --rounds 15 --draft-id <mock_id>`, and the same two
   flags on the ladder at step 4. The seat goes positionally; a mock has its own `draft_order`.
   **`--dry-run` prints every value and where it came from without starting the engine.**
4. **The moment your pick lands — BEFORE you relax — run
   `python scripts/precompute_ladder.py --slot <slot>`.** *(added 2026-08-09)*
   This is the standing ladder, derived instead of guessed. It costs ~0.1s, it runs the real engine
   (never a second ranking), and it prints the three things the next window needs: **the queue
   order** to load into Sleeper, **one market scenario** for who is likely gone by your turn, and
   **which tier cliffs empty** under it. Whatever it prints is the answer you execute at Step 3's
   hard rule — on the clock you do a LOOKUP, not a deliberation.
   - **It will not model your opponents for you, and it says so.** The market scenario backtests at
     **35%** against the committed 120-pick feed — against a **33%** null model that uses no ADP at
     all, and a **1%** floor control that proves the metric can tell orderings apart. Read
     `assumes gone` as *one scenario*, never a forecast. `--backtest` reprints all three arms.
   - **A name it expects gone is still worth queueing.** Auto-pick skips the dead and takes your
     top surviving queue entry, so those names are *marked*, not reordered — reordering a real
     board rank on a 35% guess is a bad trade.
   - **The `!!` seat banner: STOP means STOP *once the draft is live*. Before it starts, the
     banner is unavoidable and is NOT a red.** *(Corrected 2026-08-17 — this bullet used to say
     "STOP" unconditionally.)* A wrong seat really does yield a complete, confident ladder for
     another team, so the banner earns its size. But both of its oracles are **structurally
     empty** before your first pick lands: `draft_order` is null until near go time, and no pick
     carries our `picked_by` yet. Run the precomputer tonight and it fires **every time** —
     verified 2026-08-17 against the real draft, and note what else was true of that run:
     **the full ladder printed underneath it and the exit code was 0.** The tool does not think
     this is fatal, and neither should you.
     - **Pre-draft:** expected. Confirm the seat by another route, then use the ladder.
     - **Once the draft is live:** the banner should be GONE — it self-clears the moment
       `draft_order` populates or our first pick lands. **If it still fires then, that IS a stop.**
     - Either way the seat comes from `draft_order["1390750540631150592"]` and from nothing else.
     ⚠️ Treating an unavoidable banner as a red is how an operator learns to skip the gate — the
     same false-red shape as the skill's cold-load self-test. The fix is a stated exception, never
     a quieter banner.

   It **hard-refuses** a non-snake or third-round-reversal draft rather than computing a pick order
   this repo does not model. Missing cargo is different: it degrades to what you typed and says so.

   **Read the first lines of the output before the advisory.** The wrapper's block names the source
   of every number; then `[checked]` names what the engine confirmed against the draft itself. A
   `**` banner means the seat could NOT be confirmed — go get `draft_order` before acting.

   🚨 **`!!` DOES NOT MEAN ONE THING, AND THIS LINE USED TO CLAIM IT DID.** *(Corrected
   2026-08-17; it read "a `!!` block means an argument disagrees with the draft and nothing was
   computed", which is false of two of the four cases below.)* Read the TEXT, not the glyph:
   | `!!` block | exit | computed anything? | what to do |
   |---|---|---|---|
   | `THE ENGINE'S INPUTS DISAGREE WITH THE DRAFT ITSELF` | **1** | no | **STOP.** Fix the arguments, rerun |
   | `picks.json IS MISSING / HAS DUPLICATE pick(s)` | **1** | no | **STOP.** Re-fetch, re-merge, rerun |
   | `my_slot=N IS UNVERIFIED` *(the precomputer re-badges the engine's `**` as `!!`)* | 0 | **yes — full ladder** | pre-draft: expected. Live: stop |
   | `THE QUEUE CANNOT FILL A MANDATED SLOT` | 0 | **yes — full ladder** | act on it; the block names both remedies |
   **The two glyphs are not one contract across two tools:** `draft_engine.py` prints the seat
   warning as `**`, and `precompute_ladder.py` prints the same condition as `!!`. Do not go hunting
   for the other glyph under a clock — verified in both sources 2026-08-17.

   *The bare `python draft_engine.py <slot> <teams> <rounds> <draft_id>` from inside `draft-kit/`
   still works and is the fallback if the wrapper ever misbehaves — but run it bare and the roster
   shape falls back to constants inside the file that nothing checks against this draft.*

5. 🚨 **RE-ARM THE QUEUE IN THE SAME BREATH — every cycle, not just before the draft.**
   *(Added 2026-08-17.)* **The queue drains and nothing refills it.** The 2026-08-15 rehearsal
   pre-armed six names; it was **empty by ~pick 21**, and **picks #28, #37 and #44 were fired with
   no safety net at all** — while `ffQueueList()` returned the same reassuring word it returns for
   a healthy queue. That is fixed, but nothing re-arms itself. This step is the re-arm.

   ⚠️ **`window.ffQueueSync` exists only if `Step 0 — Arm the room` was done — and Step 0 is owed in
   BOTH modes.** If it reads `undefined`, that is a skipped Step 0, not a dead bridge; go back and
   paste the console.

   Feed step 4's own order into ONE call — never a hand-rolled `ffQueue` loop:
   ```js
   await window.ffQueueSync(["<1st>", "<2nd>", "<3rd>"])
   await window.ffQueueList()
   ```
   The names are the numbered list `precompute_ladder.py` just printed under **QUEUE THIS ORDER**;
   top 3-5 is the working size. The identical array is on disk as the `"queue"` key of
   `newsletter/data/state/ladder.json`, so it can be piped rather than retyped.

   - ✅ **THE ONLY ACCEPTED ORACLE IS `"synced": true` PLUS A TRAILING `ffQueueList()` SHOWING
     `"empty": false` AND THE NAMES IN ORDER.** `ffQueueSync` decides `synced` by reading the queue
     back from Sleeper — never from the per-call `queued: true`, which once credited Jayden
     Daniels for an add he was not present for (he had been drafted mid-loop and an unrelated add
     saw the `+1`). A count can be right about a **number** and wrong about an **identity**.
   - ⚠️ **`"empty": true` means NO SAFETY NET — re-arm before the clock starts.** It ships a `note`
     naming this call. **`"agrees": false` with `entries: []` is a different problem**: the queue
     is fine and the *reader* is blind (panel collapsed or mid-render). **Do not "fix" that with
     `{rebuild:true}`** — you would destroy a correct queue. Re-read instead.
   - **It refuses a destructive reorder rather than clearing your net on its own authority.**
     `synced:false` + a plan means appending would not produce the target; pass `{rebuild:true}`
     only when you mean it.
   - **Budget from the measurement, not the old estimate: a full 3-name sync is under ~1.2s**, and
     all four paths together measured **2.3s** in a live room. The hand-rolled loop it replaced
     cost ~2s *per name*.
   - **A name the projection expects gone is still worth queueing** — auto-pick skips the dead and
     takes your top survivor, so those names are marked, not reordered.
   - 🆕 **THE QUEUE NEVER OFFERS A SECOND QUARTERBACK (2026-08-20, Briggsy's D-B call: "no
     multiple QBs unless extreme value").** With QB1 rostered, every further QB is a bench body
     that can never start or flex here, yet the zero-delta tail orders by board rank — the
     torture chamber measured unattended queues benching 4-6 QBs in ADP-shaped rooms, and the
     08-19 mock's queue offered a second QB live. The engine now filters QBs from LINEUP DELTAS
     once the slot is filled. **The extreme-value exception is YOURS, not the queue's:** a
     falling QB still shows in BEST AVAILABLE and VBD LEANS; taking him is a deliberate override,
     never an auto-pick outcome.
   - ⚠️ **UNATTENDED SAFETY PAST THE ARMED QUEUE IS UNVERIFIED (insight 031).** In pinned-auto-pick
     simulations the 12-name queue covered only 1-6 of the unattended picks; everything after
     rides Sleeper's own fallback, observed exactly once (Mock #2: Dicker, the Patriots).
     Working hypothesis (Briggsy 2026-08-20): **pure best-available — off Sleeper's own list**,
     which slots K/DEF at sane late spots and would explain Mock #2 without any need-awareness.
     The next mock deliberately blows one clock with the queue emptied to measure it (D-A,
     campaign 1). Until that datum lands: attended is proven, a blown clock is a bounded bet.

6. Read the output; compose the advisory (format below); send it. In executor mode, execute the pick instead when it's our clock.
   *(Renumbered 2026-08-14 — this was a SECOND "4." and, following the indented block above it with
   no blank line, it rendered as literal text inside step 4 rather than as its own step. Steps 1-4
   are deliberately untouched: `CLAUDE.md` pins the names "Step 3.1" and "Step 3.3". Renumbered
   again 2026-08-17 when the queue re-arm became step 5 — still nothing above step 5 moved.)*

**Cadence — key it off ROOM SPEED, measured in round 1, not just pick distance** (the picks feed is cumulative, so you can never miss picks — only be late with advice):
- **FAST room** (picks landing ~15s apart or less — quick-click humans and/or CPU autopick): distance-based pacing fails; a 14-pick gap can evaporate in under a minute. The moment his pick(s) land: one sync → deliver the NEXT window's full pre-call immediately (with snipe ladder, see below) → then poll every ~15-20s continuously, tightening to **10-15s when ≤3 picks away** (Briggsy's calibration after Mock #2 — two picks came down to the wire at 20-25s). **Do not stretch to 45-60s "because the gap looks big" — that exact deviation cost pick 79 in Mock #2.** An all-CPU room (7 bots) is the fastest possible room: 12-pick gaps run ~60-90s. Note the bot-room quirk: the room PAUSES on our clock (bots can't pick past us), so wire-scrapes there are always self-inflicted — see "fire first, narrate after" in Executor mode.
- **SLOW room** (real-draft pace, humans actually using the 120s clock): after his pick lands, sync once → pre-call for his next window; ≥4 picks out, sync every ~60-90s; ≤3 away, burst every ~20-30s; on the clock, final sync and deliver THE CALL immediately — never eat more than ~30s of his 120.
- Rooms can change speed (humans step away → CPU autopick takes over). If two consecutive polls show a pace shift, switch modes.
- 📏 **The COLD-COMPOSE penalty is now MEASURED (2026-08-20 lab pre-rehearsal, 3 fresh stops —
  #14 / #51 / #83 against `lab_feed_120.json`, deliberately not the worked-example stops): composing
  all four lines from scratch on the clock, no pre-call staged, took 61.3s (full-output read) /
  43.4s / 54.7s (grepped) from chain-exit to advisory-delivered.** Upper bounds — each bracket also
  carried rehearsal narration and one extra tool round-trip — but the direction is settled: **a cold
  compose does not fit the ~30s budget above.** That budget describes the WARM path (pre-call staged
  during the wait; on-clock = final sync + lookup + delta) and the warm number is still unmeasured —
  the advisor-mode mock owns it. Mitigations when a cold compose happens anyway: THE CALL is the
  first line out, so the actionable name lands well before the rest — and the queue is already armed
  in Sleeper, so a blown compose degrades to OUR queue-top, never to Sleeper's board. The chain
  itself re-confirmed at ~0.6-0.8s per stop: the scripts remain never the cost (insight 026).
- **HARD RULE (any mode): if the engine's output says the next pick is OURS — or 1 away — do NOT start a sleep/fetch/engine cycle. Act on the standing ladder first; sync afterward.** The ladder exists precisely so no round-trips are needed on the clock.

## Executor mode — driving the picks in the Sleeper web draft room *(added Aug 6 after Mock #2)*
Claude's hands are claude-in-chrome on Briggsy's logged-in Chrome; eyes stay on the API (poll + engine per Step 3); the browser is touched only to click picks. Mechanics, learned live:
- **Clock budget:** browser actions cost ~5-15s per round trip (search, click, verify screenshot). Treat a 120s clock as ~90s of decision time. With a standing ladder, execution needs ~15s total: filter, verify, fire.
- **Player-row icons, left to right (verified in the Aug 6 queue lab):** `+` = **INSTANT DRAFT while on the clock, no confirmation** (pre-draft it no-ops) · `☆` star = watchlist only · **blue document-plus `📄+` = ADD TO QUEUE — works pre-draft and any time.** The queue lives in the right panel's Queue tab (shows a count); each entry has a REMOVE button.
  - 🚨 **"the `+`" MEANS `div.draft-button`, NOT `row.children[0]`. Corrected 2026-08-15.** `row.children[0]` is `div.draft-button-wrapper` — an unstyled **24×24**-content wrapper that owns **no handler**, and clicking it drafts nobody while *opening the player card*. The instant-draft behaviour is true of the child and false of the parent. Reach it as `row.children[0].querySelector('.draft-button')`, never `document.querySelector('.draft-button')` — that class is **not unique** (7 occurrences, 4 contexts, including an auction variant whose handler calls `_hoverPlayer` and never drafts).
  - ✏️ **RETRACTED: "The player-card modal has NO action buttons."** It carries a lone `Cancel`. ✅ **MAPPED 2026-08-15: to close it synthetically, click `.modal-item-underlay`** — that node owns an `onClick`. The `Cancel` `<button>` owns **no** handler and no ancestor within 6 hops owns one, which is exactly why the 2026-08-14 synthetic click on it did nothing. Third instance of the same law. ⚠️ Whatever native listener `Cancel` itself uses is still unmapped and probably always will be — page script cannot enumerate native listeners (`getEventListeners` is DevTools-only). **Use the underlay.** Still avoid opening the card mid-draft; it is a time sink even when closable.
- **PRE-ARM THE QUEUE.** The ladder to load is the one `scripts/precompute_ladder.py --slot <slot>` prints under **QUEUE THIS ORDER** — since 2026-08-19 it is the engine's **LINEUP DELTAS** order: what each candidate adds to OUR starting lineup, replacement-prefilled, K/DEF deferred to the endgame, must-fill forced when every remaining pick is spoken for. The judgment the old board-order queue needed overlaid by hand is IN the number now (replayed against the recorded 08-19 mock: **+391.8 startable VORP** over board order, which drafted nine receivers and five quarterbacks unattended — `scripts/replay_mock.py` is the gate). No second ranking exists to drift from it. *(Board order before 2026-08-19; originally added 2026-08-09; `ffQueue` / `ffQueueList` / `ffUnqueue` in `scripts/sleeper_draft_console.js` are what put it in and keep it ranked.)* 🚨 **USE `ffQueueSync(<the queue array>)` — ONE CALL, both directions.** *(Corrected 2026-08-17. This bullet used to say "load the round-1 ladder with `ffQueue('<full name>')`, top name first" and "at each window, refresh to the current ladder's top 2-3 (`ffUnqueue` the dead, `ffQueue` the new)". That hand-rolled loop cost ~2s **per name**; `ffQueueSync` ran all four paths in **2.3s total** and, unlike the loop, decides success by **reading the queue back** rather than trusting per-call results — the loop once credited Jayden Daniels for an add he was not present for.)* Still *not* by clicking `📄+` icons, which is the pixel path this file deleted on 2026-08-14. The trailing `ffQueueList()` is the only accepted check that the load took — read **`"empty": false`** and the names in order; document order == visual order, and Sleeper labels the first entry **NEXT PICK**. Skip maintenance when the clock is tight; direct fire stays primary. **Full re-arm procedure and its failure modes: Step 3.5 above.** A loaded queue makes every failure mode safe: missed clock, frozen bridge, native dialog — Sleeper's timeout autopick takes the queue TOP, i.e. OUR guy, not ADP's. (Mock #2 ran the whole draft with an empty queue because the affordance wasn't known; the pick-79 miss would have cost nothing with a loaded queue.) Keep the AUTO-PICK toggle OFF — with a loaded queue it insta-drafts queue-top the moment our turn starts, no judgment applied.
- 🚨 **THE CONSOLE MUST ALREADY BE INSTALLED, AND THAT IS NOW `Step 0 — Arm the room (BOTH modes)`,
  above Step 1. Nothing in this section runs without it.** *(Moved there 2026-08-19.)* What to
  paste, the `typeof window.ffQueueSync === "function"` check, why the install banner is not that
  check, and the reload rule all live in Step 0 — **deliberately not restated here.** This bullet
  being the only copy is precisely the defect Step 0 fixes: advisor mode is told this whole section
  sits *on top of* everything else, so it skipped the one paste Step 3.5 depends on.

> ✅ **DIAGNOSED 2026-08-15 — `ffDraft` WAS CLICKING THE EMPTY BOX AROUND THE BUTTON, AND THE
> SELECTOR IS FIXED. The diagnosis is settled; the FIX IS STILL UNFIRED IN A LIVE ROOM.**
> On the first live exercise in this environment it returned `{"clicked": true}` and **drafted
> nobody** — `/picks` still read 3 picks, and what the click opened was the player-card modal.
>
> **The cause was neither of the two this section used to name.** `draftButton()` returned
> `row.children[0]` = `div.draft-button-wrapper`, a layout div owning **no handler at all**; the
> `onClick` is on its **child** `div.draft-button`. Events bubble **up, never down**, so the click
> could not reach it and bubbled *up* into the row's `onPlayerSelected` — which is the player card.
> ⚠️ **This paragraph used to read "the element it found was correct; the actuation is what
> failed." That was exactly inverted and it aimed a full day of work at synthetic-vs-real.**
> - *"synthetic `.click()` does not actuate this build"* — **FALSIFIED.** `isTrusted` appears
>   **zero** times in Sleeper's 12.1 MB bundle. Proven positively with a controlled pair: a
>   synthetic click on `.autopick-toggle .slider` toggled AUTO-PICK while the identical click on
>   its wrapper did nothing.
> - *"the button was inert because our clock had not started"* — **a real gate, but not this
>   failure.** `_onClickDraft` runs `stopPropagation()` *before* testing the disabled flag, so a
>   click on a disabled button cannot open the modal. The modal opened.
>
> Full write-up: [`insights/025`](insights/025-the-click-reported-success-and-drafted-nobody.md).
>
> ✅ **AND IT IS NOW LIVE-PROVEN — API-CONFIRMED PICK, mock `1394132992183517184`, 2026-08-15.**
> Baseline `/picks` = **0**. `ffDraft("Ja'Marr Chase")` → `{clicked:true, handlerRan:true}` in 9 ms.
> `/picks` cache-busted immediately after → **`pick_no=1, draft_slot=1, Ja'Marr Chase,
> picked_by=1390750540631150592`**. The live DOM matched the prediction exactly: wrapper **34×40**
> with `[]` handlers, child `.draft-button` **24×24** with `["onClick"]`.
> **Every other control was swept in the same run and all passed** — `ffFind`, `ffQueue`
> (empty→1, 106 ms), `ffQueueList`, `ffUnqueue` (1→empty), and the new `ffAutoPick` both
> directions plus idempotent. `ffStartDraft`'s three guards all refused first and `window.confirm`
> came back native.
>
> 🚨 **AND SET "No Limit" FOR A BETTER REASON THAN TIME: it is what makes `picked_by` trustworthy.**
> Auto-pick fires **only on timeout**, so at `pick_timer: 0` it has no trigger and *cannot* be the
> thing that stamped our id — which is the one confound `/picks` alone cannot rule out. Corroborated
> three ways in this run: AUTO-PICK read `checked:false`, the queue was empty, and **Sleeper ranked
> Chase RK 3 while picks #2/#3 took Gibbs and Bijan — auto-pick takes RK 1, so it would never have
> chosen Chase.** Our click picked a player Sleeper's own board would not have.
> ✏️ **RETRACTED:** this block used to say the queue's own `.click()` was "under the same
> suspicion". It never was — `ffQueue` clicks an `<img>` **inside** `div.queue-action[onClick]`,
> i.e. a descendant, which is structurally correct. That suspicion was an inference from `ffDraft`
> with no measurement behind it, and it contradicted this file's own line 49 lines below.
> **KEEP the `/picks` verification rule regardless** — it is unaffected, and it is what caught the
> lie in the first place. The one thing measured working end-to-end that night was Sleeper's own
> auto-pick, which filled K at #109 and DEF at #116 on schedule from an empty queue.

- **Fire sequence on our clock — `ffFind` then `ffDraft`, and NEVER a screenshot coordinate.**
  ```js
  ffFind('Ja\'Marr Chase')     // what WOULD be drafted. Touches nothing. ALWAYS first.
  ffDraft('Ja\'Marr Chase')    // fires
  ```
  Then, off the clock, `python scripts/merge_picks.py <draft_id>` and confirm the player landed on
  **our** `draft_slot`.
  🚨 **`ffDraft` REPORTS A CLICK, NOT A PICK — this is the single most important line in this
  section.** It returned `drafted: true` for Chase while the API showed our slot got Puka Nacua and
  Chase went to slot 4: the clock had expired and the click hit a stale un-re-rendered row. **The
  browser cannot be the oracle for its own action** (insight 007). The API is.
  - It drives the search box itself, through React's own value setter. **Do not interleave
    keystrokes and JS calls** — executing JS moves focus, so a `ctrl+u` → type → run-JS sequence
    lands the keystrokes nowhere; measured, the box read empty afterwards.
  - It **polls rather than sleeping.** A fixed 700ms wait reported "no exact match" mid-re-render,
    which is indistinguishable from "he's already gone". Polling resolved the same lookup in 219ms.
  - It **matches names exactly and folds apostrophes**, and **refuses on ambiguity rather than
    guessing** — `Chase` matches Chase Brown as readily as Ja'Marr Chase.

- **Queue maintenance is `ffQueue` / `ffQueueList` / `ffUnqueue`, also DOM-addressed.**
  `ffQueue` verifies by the count **incrementing by exactly one** and refuses on an unreadable
  count, a no-move or a jump. That oracle was broken until 2026-08-09 — the old verdict collapsed
  to "is the string `QUEUE (n)` rendered anywhere", so every add after the first returned
  `queued: true` unconditionally. Do not accept a `true` from anything but the current code.

> 🗑️ **DELETED 2026-08-14 — the two fire paths that used to live here were both
> SCREENSHOT-COORDINATE methods**, and this repo has measured that method as broken since
> 2026-08-09: viewport 1536×791 CSS while successive screenshots came back 1568×750 and 1522×784,
> putting a row that lives at CSS y=544 at y=562. **18px of error on a 26px row, and it cost a real
> pick (Trey McBride, 2.6.)** The old primary said *"click `+` on the top row (y≈513-523)"*; the old
> secondary said the queue-row `⊕` *"sits ~50px right of REMOVE"*. `scripts/sleeper_draft_console.js`
> existed and was live-proven when those bullets were written — the fold was simply never finished
> (the runbook's last commit landed 26 minutes before the console's final one). **Do not restore
> them.** The `+` icon itself is still real and still instant-drafts; what is banned is reaching it
> by pixel. Match on the image `src`, never on position or geometry.
- **Clearing the search box — MOOT on the console path, still true on the fallback.** `ffFind` /
  `ffDraft` / `ffQueue` set and clear the box through React's own value setter, so no keystroke is
  ever sent and none of the below can happen. **If you are ever typing by hand: TRIPLE-CLICK the
  box, then type (or Delete). NEVER ctrl+a.** The bridge drops the ctrl modifier intermittently —
  ctrl+a becomes a literal "a" in the box (symptom: search reads "aSutton", zero rows match) or a
  page-wide select-all when the box click missed. That one bug killed three queue-arm attempts in
  Mock #3 and nearly ate pick 78. Triple-click selects with no modifiers; typing replaces.
- **Screenshot capture-scale oscillation (the window is NOT moving):** Briggsy runs Chrome maximized and nobody resizes anything — yet screenshot dimensions oscillate between captures (1522x784 / 1536x735 / 1568x751 of the SAME maximized window in Mock #3, and 1568x750 / 1522x784 against a 1536x791 CSS viewport on 2026-08-09). It's the capture pipeline re-scaling, so coordinates read off one screenshot land ±10-18px off in the next moment's click space.
  🚨 **THE ONLY RULE IS: DO NOT CLICK THE DRAFT ROOM BY COORDINATE. Address the DOM.** *(rewritten 2026-08-14.)* This bullet used to end by recommending the `search-filter→top-row-+` flow because *"row 1 lands y≈509-523 at every scale"* — **a claim that refutes itself in its own sentence**, since the same paragraph puts the error at ±10-15px on a 26px row. That flow is exactly the one that lost Trey McBride at 2.6. `scripts/sleeper_draft_console.js` derives no coordinate from an image at all, which is the actual fix; the mitigations below are for the residue only.
  - For a one-off control the console does not wrap (CLAIM, the ⚙ menu), use a **ref from the find tool**, never a pixel.
  - ✅ **The AUTO-PICK toggle responds to a synthetic click fine — we were aiming at the wrong node. Corrected 2026-08-15; use `ffAutoPick(true|false)`.** `.autopick-toggle` is a bare wrapper with **no handler**; the `onClick` lives on `span.slider` **three levels below it** (`.autopick-toggle > .custom-switch > .switch > span.slider`). Nothing dispatched at an ancestor can reach a descendant, which is why even a full pointerdown/mousedown/pointerup/mouseup sequence was futile — the sequence was never the problem, **the target was**. A real click only ever worked because a human clicks a *coordinate* and the browser hit-tests to the topmost node there, which is the span. **Measured with a controlled pair:** wrapper click → no change; `.slider` click → toggled; restored clean. ⚠️ **This bullet previously said the toggle "does NOT respond to synthetic events… find it by class" — that diagnosis was wrong and the prescription named the handler-less node.** The queue icon takes a plain `.click()` fine for the same structural reason: it is an `<img>` *inside* `div.queue-action[onClick]`.
  - ⚠️ **Icon box sizes rot and have already been wrong once** — they are 22×22 (star) and 16×16 (queue) today, not the 42×44 / 24×24 this file used to record. **Match on the image `src`.** Geometry selectors are the pixel problem wearing a different hat.
- **Queue-arm searches use the FULL "First Last" name — never surname-only.** The Gabe Nabers incident: "Nabers" was typed just as Malik Nabers got sniped at 5.1; Sleeper instantly hides drafted players, the fullback Gabe Nabers (ADP 999) floated to row 1, and a blind positional click queued him. A full-name filter goes to ZERO rows when the target dies mid-action, so the stray click no-ops instead of queueing a random fullback. Corollary: never click a row icon you haven't verified by content — position alone lies during state changes. **`ffFind`/`ffDraft`/`ffQueue` enforce this for you**: they match the full name exactly, fold apostrophes, and **refuse on ambiguity rather than guessing**, so a Gabe-Nabers substitution cannot pass them. Type the full name into them for the same reason you would have typed it into the box.
- **On the clock with a stale ladder: the search box IS the availability check.** Type the top surviving ladder name (~5-10s) — the row appearing = he's alive = FIRE. Do NOT run a fetch+merge+engine cycle on your own clock to "re-rank for confidence"; engine re-ranks are for BETWEEN windows, or when the entire ladder is confirmed dead. Pick 62 anatomy: queue-arm had failed, ladder was Daniels→Burrow→Hurts with Burrow visibly gone on the board; the correct play was search-verify Daniels immediately (alive → fire, ~15s total); instead a full sync ran first and the fire landed at 0:13. Bot rooms pause on our clock so it cost nothing — a human room punishes that habit with a timeout.
- **Fire first, narrate after.** On our clock, the click comes BEFORE any chat message, recap, or non-essential screenshot. Mock #2's near-misses (pick 15 fired at 00:28) were caused by composing commentary inside the window, not by slow polling.
- **Clear the search filter immediately after every pick** — triple-click the box → Delete, per the clearing rule above. **Never ctrl+a.** A stale filter hides the board later. On the completion screen the search box is gone entirely — that's the tell the draft ended.
- **A missed clock silently flips the team to AUTO-PICK** (avatar chip literally reads "AUTO"; the queue panel's AUTO-PICK toggle goes green). Sleeper then autopicks ALL subsequent picks instantly. After ANY timeout: kill the toggle FIRST, then resume. (Mock #2: one missed clock at 79 → autos through 82/95/98/111/114 before the flip was caught. Bounded damage — see changelog — but pure luck the auto took the ladder-top Pollard at 82.)
- **Native browser dialogs freeze the extension completely** — every CDP command times out until a human dismisses the dialog; it looks like the bridge died. The web app throws exactly one: the START DRAFT confirm ("This action cannot be undone"). In-room actions (picking, searching) never raise native dialogs. ✅ **This no longer needs a human** (2026-08-09): `ffStartDraft({ iAmInAMock: true })` in `scripts/sleeper_draft_console.js` neutralises the confirm *before* the click and restores whatever was there in a `finally`. ⚠️ **The restore is the safety property, not a nicety** — an auto-accept hook left armed silently accepts the next destructive dialog and nothing reports it. Two guards, deliberately redundant: the explicit `iAmInAMock` flag, and a hard refusal on the real draft id (which goes stale if the draft is ever re-created, which is why the flag exists too). *This bullet said the opposite until 2026-08-09, while `TODO.md` said it was solved — neither was executable, so the disagreement could not be settled by running anything. It can now: `tests/test_sleeper_draft_console.py`, 6 mutants killed including "never restore".*
- **Room setup:** creating/entering the room from a Claude-controlled tab in his profile works fine (same login/cookies). The room card in Mock Drafts opens the draft room in a NEW tab — use that tab's id for everything after.
- Announcements switch to past tense — "I took X, here's why" — with the same **four lines** (see *Advisory format* below), `THE CALL` becoming what was taken. *(Corrected 2026-08-17: this said "the same 5-line advisory shape", which was the format this file replaced.)* Briggsy heckles; a chat veto before the click is still honored.

## Advisory format — THE FOUR LINES

> **This is the product.** Briggsy drafts; the terminal drives; the board on monitor 2 is a display
> he reads. The engine already emits a rich state — **what he actually consumes is these four
> lines.** Agreed with Briggsy 2026-08-17, and explicitly *"we can play with it and tweak it if
> needed"*: his eye is the oracle here, not a test.
> ✅ **AND THAT ORACLE HAS NOW FIRED — RATIFIED BY BRIGGSY 2026-08-19: *"worked examples look
> good."*** All three examples have had his eye. **This is the shipping format; do not redesign the
> shape on a later session's taste.** Tweaks stay welcome by his own standing note; a rewrite does
> not. ⚠️ **What his read does NOT cover is the shape under a clock** — he approved these at rest,
> not at two minutes a pick. That is what the advisor-mode mock is for, and it is still unrun.
> *(This section REPLACED an older ~5-line format
> on 2026-08-17. There is one format. If you find a second one anywhere, this is the live one.)*

```
THE CALL: **<Name>** — <one clause of why>
Passed on: **<Name>** — <what would flip it>
Risk: <what it costs if I'm wrong, in roster terms>
Before #<next> (<n> picks): <what to watch>
```

**Why this shape and not the old one:** the old format opened with *"Pick 27 in: Hunter took
D.Henry"* — state Briggsy is already looking at on two other monitors. Under a clock the answer
goes first and the context goes last. He reads left-to-right and can stop after line 1.

### What each line owes him

| Line | Must be | Must never be |
|---|---|---|
| **THE CALL** | ONE name, bolded, first thing on the line. One clause of why, taken from the board's own `↳` note or a measured fact. | A shortlist. Two names here is not a call. |
| **Passed on** | The real runner-up **plus the trigger that flips it** — the condition, not a hedge. This is the line that lets him override *intelligently* instead of just overruling. | "…but either is fine." If they were equal, say so and pick on the tie-breaker. |
| **Risk** | The concrete cost **in roster terms** — what he is short of, and when. | "He might underperform." Every player might. |
| **Before #N** | Forward-looking only: the gap from `THE WAIT`, who picks between (`Between now and you` + `Their open needs`), and the one cliff that could move. | A recap of what just happened. |

### 🚨 Banned in all four lines — each of these is a measured landmine, not a style note

- **Never quote a margin as if it were precise.** Quote the *ordering*. `RB1` sd is **19.3**, and
  insight 023 measures this curve **2.55× overstated at RB1** — the board ships RB1 at 268.4 against
  a realised **105.2**. "He's the better player" survives that. "He's worth 40 more points" does not.
- **Never put a percentage on availability.** `availability.py` was built, measured against 7 real
  drafts, and **refused**: it is negative at *every* gap in the only 8-team room we hold
  (insight 027). `draft-kit/availability_calibration.json` reads SILENT at every gap for all 8 seats.
- **Never say "take him now, he'll never last."** That is 12-team advice. In an 8-team room the best
  available player comes back to us **47%** of the time against **21%** in a 12-team room — 128 picks
  over a ~206-deep list leaves ~50 of the top 180 undrafted. **Ours is far more forgiving of
  waiting.** *(Direction only, one draft — never a number on the board.)*
- **Never present the no-early-QB rule as proof.** It is **four independent lines agreeing** (board
  arithmetic · 11 seasons of realised QB value ≈ 0 · the room's 2023 head-to-head · the QB-EARLY
  backtest arm at −49.8 ± 25.6). **None clears 2σ.** Say "four lines agree", never "it's proven".
- 🚨 **Never use a piece of fantasy jargon these four lines have not spelled out.** Briggsy has
  **120 seconds**; a word he has to decode is a stall, and the stall lands on the line whose whole
  job is letting him override *intelligently*. **Found by Briggsy himself on 2026-08-18**, reading
  the #94 example below: *"what is a 'stream'?"* — the Passed-on line said Herbert was *"only worth
  it as a stream, and this roster has no bench room to stream from."* True, unreadable, and now
  rewritten in plain terms. ⚠️ **This is the one banned-list rule a test can never catch**, because
  the sentence is perfectly correct — it fails on the reader, and the reader is the oracle.
  **Write the mechanism, not the term:** *"bench him and swap by matchup week to week"*, never
  *"stream him"*. Same for *handcuff*, *zero-RB*, *bell-cow*, *smash spot*, *target share*,
  *alpha*, *hold-in*, *committee* — say what it means.
  **And if the `↳` note already carries the gloss, the advisory carries the GLOSS, not the term.**
  Gibbs' note reads *"Contract hold-in at camp (not practicing as of 8/4)"* — **the parenthetical
  IS the line**; the two words in front of it are not. ⚠️ **Gloss BEFORE the term or instead of it,
  never after.** The #30 Risk line explained *committee* one sentence too late — after he had
  already stopped reading.
- 🚨 **Never use `RB3` / `TE1` / `WR2` as a QUALITY label — that token means three different things
  on one screen.** In BEST AVAILABLE it is a positional RANK (`Christian McCaffrey RB3` = the third
  best RB alive); inside the roster block `[RB2 WR1]` it is a COUNT of men you own; and in loose
  talk it means a quality grade. Say **"your third back"**, **"a startable TE"**, **"your second
  receiver"**. ⚠️ **And know the roster before you grade one:** this league starts **2 RB + 2 FLEX**,
  so a third back is a **FLEX starter**, not a bench player — an earlier draft of the #30 Risk line
  was going to call him exactly that.
- 🚨 **`slot` means a draft SEAT and nothing else in these four lines.** A roster opening is a
  **roster spot**. The engine prints `slot 1, slot 2` for seats and `DEFx1, Kx1` for openings; the
  #94 line used both senses **twenty words apart**, on the line whose whole job is the override
  decision. This is the project's most dangerous word — CLAUDE.md already records **three unrelated
  "3"s** in this league.
- 🚨 **Quote the opponent numbers in the unit `scout_opponents.py` actually measures.**
  [`docs/opponents.md`](opponents.md) is explicit that **18 drafter-views are 7 distinct drafts**,
  and *"any room-level rate quoted out of this file must say which unit it is counting."* Both
  worked examples got this wrong in opposite directions — one said *"drafter-views"* (a word that
  exists nowhere he can see), the other said *"18 of 18 measured drafts"* (the claim opponents.md
  forbids). Write it out: *"we watched these managers draft 18 times across 7 different leagues."*
- ⚠️ **Every pick reference is the engine's own `#N`, or a spelled-out "round N".** Never `1.03` —
  the product prints that notation nowhere, and the same four-line block already says `#14` two
  lines later.
- ⚠️ **Never coin a metaphor and capitalise it.** *"it's the SHELF underneath that differs"* reads
  as established project vocabulary he is expected to already own; nothing prints the word. Say
  **"the next tier down"**, which maps onto the TIER CLIFFS block he is looking at.
- ✅ **THE BOARD'S OWN NOTES WERE SWEPT TO MATCH THIS RULE (2026-08-18).** They are THE CALL's only
  legal source, so a banned term surviving in a note reaches him through the board no matter how
  carefully the advisory is written — the two rules below collide otherwise. 30 strings across 26
  notes plus `roundPlan` and `slotNotes`: *handcuff · bell-cow · alpha · hold-in · committee ·
  target share · TD-dependent · TE1-upside · arbitrage · punting*, and the acronyms *PUP · ADP ·
  aDOT · YAC · MASH · CMC*. **Zero remain on the shipped board or the PDF.** ⚠️ **Deliberately
  KEPT:** `PPR` (the league's own format, printed in the header), and *Breakout / Bust risk / IR
  stash* — those are **badge labels with a legend on the page**, so they are glossed where he reads
  them. Over-sanitising the notes would flatten his voice for no gain.
- **Never invent a player fact.** The `↳` note under each of the top 5 in BEST AVAILABLE is the
  sourced material. If the note does not say it, do not say it. *(This rule has already earned its
  place: a draft of the worked example below called Breece Hall an injury risk. His note reads
  "Freshly extended and healthy" — the risk is a **committee**.)*

### Worked examples — real engine output, real stops

> ⚠️ **All three are real `run_engine.py` output against `tests/fixtures/lab_feed_120.json`, seat 3.**
> An earlier draft of the #30 example asserted "slots 4 and 6 pick before you" from memory — the
> real answer is **slot 2, slot 1, slot 1, slot 2**. That is the banned-list's last rule catching
> its own author, and it is also why the engine now prints the between-seats line *while you are on
> the clock*, which it never used to.
>
> 🚨 **AND "re-read line by line" WAS ITSELF A CLAIM THIS BLOCK COULD NOT CASH — an adversarial
> pass found two more errors after it was written, both in numbers quoted from the engine's own
> output:** #30 said *"Smith's TIER is 21 deep"* when 21 is **WR T5 + T6 combined** and his own
> tier held **five**; and #94's Risk line said *"spend three on skill and the last two are forced"*
> out of four picks, which is arithmetically impossible. Both corrected. **The lesson is the one
> this section already teaches: a number that does not appear verbatim in the block quoted above it
> is a number you are inventing** — which is exactly how *"WR T5/T6 hold 21 between them"*, true one
> line earlier, became false the moment it was attached to one man's tier.

<details><summary><b>#3 — round 1, on the clock, and the wait is the longest of the night</b></summary>

State: Chase and Bijan gone. `RB T1: 1 left — Jahmyr Gibbs ⚠ CLIFF` · `WR T2: 2 left ⚠` ·
`WR T3: 2 left ⚠` · `THE WAIT: after #3 you pick again at #14 — 10 opposing picks in between`.

```
THE CALL: **Jahmyr Gibbs** — last man in RB T1, and that tier empties with him.
Passed on: **Puka Nacua** — flip only if you'd rather carry a suspension question than a contract
  one; his note has league discipline still under review. Four men sit across WR T2/T3, one across
  RB T1.
Risk: Gibbs is at camp refusing to practise until he gets paid — no practice as of 8/4. If it runs
  long you spent #3 on a man who debuts in week 4, and you still owe two WRs and a TE.
Before #14 (10 picks): the longest gap you'll have all night — slots 4-8, then 8-4 back. Both
  ⚠ WR tiers are two deep, so the realistic question at #14 is which of those four is left, not
  whether one is.
```
**Why it reads this way:** one name, one clause. "Passed on" carries a *trigger* — and an honest
one, because Nacua's note has its own risk rather than being the safe alternative. The risk line is
roster-shaped ("you still owe two WRs and a TE"), not "he might bust". Only the last line looks
forward, and it names the gap and the seats rather than predicting who survives.
</details>

<details><summary><b>#30 — round 4, an RB run is live, and two teams pick twice before you</b></summary>

State: `RUN WATCH (last 8): RB:5` · our roster `[RB2 WR1]` · `TE T3: 3 left ⚠ CLIFF` ·
`THE WAIT: after #30 you pick again at #35 — 4 opposing picks in between` ·
`Between this pick and #35: slot 2, slot 1, slot 1, slot 2` · `Their open needs: ... TE(4) ...` ·
VBD LEANS is six RBs deep.

```
THE CALL: **Breece Hall** — the six best values left on the board are all RBs, and five of the
  last eight picks were RBs; RB T5 is down to four while WR T5/T6 still hold 21 between them.
Passed on: **DeVonta Smith** — higher board rank, and A.J. Brown's exit makes him the first read in
  Philly. Flip if you'd rather bank a receiver you know gets thrown to constantly. Their tiers are
  NEARLY the same size (WR T5 five, RB T5 four) — what differs is the next tier down: 16 receivers
  left in WR T6 against 9 backs in RB T6.
Risk: Hall's note is about splitting carries between several backs, not about his health — he's
  freshly extended. If that split happens you spent round 4 on your third back, a FLEX filler
  rather than one of your two starting RBs, and still owe two receivers.
Before #35 (4 picks): only slots 1 and 2 pick, twice each — and BOTH still need a TE while TE T3 is
  down to three, with Loveland the only one among the 12 best players left. We watched these
  managers draft 18 times across 7 leagues; in 15 of the 18 their first TE came after round 5 —
  these two are the exception that would break it.
```
**The judgement:** *rounds 3-5, same-tier candidates → lean RB* — and the live run makes it more
than a tie-breaker. Note what is NOT said: no point margins, no "Hall won't last". Note also what
the corrected seat list bought: "two teams, both needing TE, picking four times" is a far sharper
read than the wrong "slots 4 and 6 need WR" ever was.
</details>

<details><summary><b>#94 — round 12, on the clock, and the two seats behind you need exactly what you need</b></summary>

State: our roster `[QB1 RB5 WR4 TE1]` — `needs: DEFx1, Kx1` and nothing else, holding **#94, #99,
#110, #115**. ⚠️ **That is seat 3's tail in the fixture's FIFTEEN rounds. The real league is
sixteen**, where seat 3 also owns **#126** — so on draft night count one more.
`Between this pick and #99: slot 2, slot 1, slot 1, slot 2` ·
**`Their open needs: DEF(4), K(4)`** · `DEF T1: 3 left` (Rams gone) · `K T1: 3 left`.

```
THE CALL: **Michael Pittman Jr.** — one of only two picks left that are yours to spend; traded to
  Pittsburgh as Rodgers' possession guy.
Passed on: **Justin Herbert** — ranks higher, but you already have your QB and this league starts
  one. A second QB only pays if you can bench him and swap by matchup week to week; with four
  picks left and DEF + K owed, you have no bench room to do that.
Risk: none at this pick — the risk is the ROUND. Four picks left, and two are already spoken for by
  the DEF and K your roster must start, so only TWO are free. Spend a third on another RB/WR/TE
  and you cannot fill both.
Before #99 (4 picks): 🚨 slots 1 and 2 pick twice each and BOTH need DEF and K — the same two roster
  spots you need. DEF T1 is already down to three (HOU/DEN/SEA). Nobody has taken a kicker, and in
  all 18 of those manager-drafts nobody took one before round 10, so K is safe; **DEF is the one
  that can actually be taken from you.** Take the top DEF at #99, kicker at #110 or #115.
```
**What changes when you're NOT on the clock:** a pre-call carries a **3-4 name ladder** per pick
("if X gone → Y → Z"), because in Mock #1 a pre-call's primary *and* first fallback both vanished in
the five picks before his turn. The ladder is `precompute_ladder.py`'s own output — on the clock you
do a lookup, not a deliberation.

⚠️ **This is the example that shows why line 4 exists.** `Their open needs: DEF(4), K(4)` is the
whole pick. Without it the obvious call is "grab a kicker, you need one" — and it would be wrong,
because kickers are the one thing nobody is competing for and defenses are.
</details>

### Standing rules that outlive the format

- **Bold THE CALL.** It is the one thing he must be able to find without reading.
- **Pre-calls carry a 3-4 name ladder per pick slot.** In executor mode the ladder IS the execution
  plan: fire the top surviving name with no recomputation.
- **Announcements after the fact switch to past tense** — "I took X, here's why" — same four lines,
  `THE CALL` becoming what was taken.
- **Briggsy holds the veto, always.** If he overrides, adapt without sulking and recompute from his
  actual roster. A chat veto before the click is honoured even in executor mode.
- **Trash-talk garnish welcome.** He is drafting against his son Hunter — who is **`briggsy007`**,
  the commissioner, **roster_id 1**, and **not** Briggsy. *(Briggsy is `PoppaBriggsy`,
  `1390750540631150592`, roster_id 3. His own email is briggsy007@gmail.com, which is exactly why
  this trap keeps getting sprung — see `CLAUDE.md`.)*

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
- **If this was the real draft:** 🚨 **DO NOT START BUILDING THE IN-SEASON CADENCE.** It is not this
  file's to hand out. [`in-season-plan.md`](in-season-plan.md) owns all three deliverables — the
  Tuesday waiver report, the Thursday/Sunday lineup check, and trade evaluation on demand — and it
  is **a STUB on purpose**, because "a design written against imagined payloads is a design that
  gets thrown away." Its un-stub trigger is one live read:
  ```bash
  curl -sL --max-time 15 "https://api.sleeper.app/v1/state/nfl?cb=$(date +%s%N)"
  ```
  It un-stubs when `season_type` flips **`"pre"` → `"regular"`** (measured `"pre"` on 2026-08-08;
  `/state/nfl` is still **not** hauled by the mule — `newsletter/feud_mule.ps1` has no
  `Fetch-Source` for it — so this is a live curl, not a cargo read). Until that flip: read that
  doc, build nothing. Then start with what it names first — the mule sources, then the waiver
  report, which additionally needs one completed week of transactions behind it.
  *(Rewritten 2026-08-19. This bullet used to say the pre-Cowork prompts "need rebuilding as real
  scheduled scripts. Tracked in `TODO.md`" — an instruction the owning doc forbids twice: "nothing
  here is worth building before that flip," and its **What NOT to build** list bans a second
  scheduled task per deliverable outright, since "every breakage this project has had was a
  scheduled task with a path in it." A weekly report is a branch inside the existing nightly
  newsletter job, not a fourth Task Scheduler entry.)*

## Engine quick-reference
`python draft_engine.py <my_slot> [teams=8] [rounds=16] [draft_id]` reading `picks.json` + `players_data.json` (+ optional `slot_names.json`) from cwd. **`my_slot` is required** — it used to default to 3, which meant a forgotten argument produced a complete, confident, wrong advisory that looked identical to a correct one. It now exits with usage instead. Get the real value from the draft's `draft_order` for user_id `1390750540631150592`.

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

**The frozen-id join (added 2026-08-08, repointed the same day).** The engine matches each live pick to the board on Sleeper's `player_id` **before** falling back to the rendered name. The name is the one field that drifts; the id does not.

It reads that id from **the board's own rows**. Every row carries `sleeperId` and the generator refuses to emit a board where one does not, so the id arrives with the board rather than from a second file that had to be in the same directory. **What you need in `draft-kit/` is `players_data.json`, `normalize.py` and `picks.json`.** `sleeper_ids.json` is still the resolver's ledger and still what `resolve_sleeper_ids.py --verify` re-asserts, and it is the fallback for a board built before the generator — but it is no longer the engine's join key, so the two can no longer disagree with the engine silently preferring the older one. With neither source the engine falls back to the name join and says so; the `[checked]` line names which source it used.

Why it matters, reproduced against the real board: board #1 Jahmyr Gibbs taken at pick 1, rendered by Sleeper as `J. Gibbs`, and on a different team than the board records. Name join missed him. The `(team,pos)` escalation missed him too — board says DET, pick says NE. So the engine printed `not on our board`, added the all-clear `no unclaimed board row shares a team and position`, and left him at **#1 on BEST AVAILABLE**. The pick carried `player_id 9221` — his frozen id, in our own ledger, discarded.

Two consequences worth knowing at the table:
- **`--- N pick(s) matched by frozen id, not by name ---`** means the board's spelling has drifted from Sleeper's. Not an error; the join held. Worth noting for the next board rebuild.
- **The escalation's meaning has INVERTED.** It used to mean *"this might be the same man under a drifted name."* The id now catches that case first, so anything still reaching the escalation carries an id we do not hold — meaning he is **not on our board at all**, and a same-position suspect sharing a surname is a **teammate**. The engine says so explicitly now. Do not clear that board row.
Board state derives from **max(pick_no)**, with an integrity gate: exit 1 on interior gaps/duplicate pick_nos (see Step 3). `slot_names.json` = `{"<slot>": "<name>"}` → rosters/needs and the between-now-and-you line print names.
Outputs: board state, last picks, run watch, every roster's composition + open needs, who picks between now and Briggsy, tier cliffs for RB/WR/TE/QB/K/DEF (**⚠ CLIFF needs BOTH halves: ≤3 left AND at least one of them in BEST AVAILABLE** — a tier that is thin but not yet in play prints `· thin, none in the top 12 yet` and no ⚠, so **a 1-left tier can legitimately carry no warning**; reproduced 2026-08-17 on the lab feed at pick 40: `RB T5: 1 left — Cam Skattebo · thin, none in the top 12 yet`. The second half was added deliberately to stop the badge crying wolf on K/DEF in round 2 — it is scale-free and hardcodes no round threshold. Nothing is hidden: every thin tier still prints its count and says why it is quiet), best available on our board (with `vorp` and `VBD±` chips when the JSON carries them), and a VBD LEANS section — available players VBD ranks ≥8 spots above board rank.
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
