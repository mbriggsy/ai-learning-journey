# Family Feud — TODO

> **Actionable next-actions only.** No session history — `git log` has that.
> Re-ranked every session, so never cite "item N" anywhere; cite the title.

## ▶ WHERE WE ARE — read this first, update it when it changes

```
plan  ✅ → deepen  ✅ → work  ◀ YOU ARE HERE → ultramode ⬜ (at the Phase 1 boundary, after U6)
```

**Units shipped:** U1, U2 (Phase 0 gates) · **U9** (draft-state watcher) · **U3** (one normalizer,
proven equal in two runtimes) · **U14** (`sleeperId` frozen — 174 ids, 0 unresolved) — all four
verified green on 2026-08-07.

**Next action: `/ce-work` on
[`docs/plans/2026-08-07-001-refactor-rebuild-the-machinery-plan.md`](docs/plans/2026-08-07-001-refactor-rebuild-the-machinery-plan.md),
at `{ U4 gate ∥ U5 VORP }` — the two that run in parallel. U4 is **born red** and that is correct.**

**The planning phase is CLOSED.** The plan was deepened 2026-08-07 and does not get another pass.
If something in it turns out to be wrong, fix it inside `/ce-work` — do not reopen a deepening
cycle. Reopening is how this project loses its thread: analysis that spawns analysis has no
stopping condition, and the plan still outweighs the code (**13 commits, 5 of which changed code;
15 units planned, 3 built**).

**Ultramode fires once, after U6** — one review of a working spine, not six reviews of fragments.

**State:** both silent paths to advising an already-drafted player are closed, the hauler has its
first consumer, and the board now joins to Sleeper on a frozen id instead of a name. **168 tests**,
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

Eight insight docs now exist and five landed on 2026-08-07. Three of them
([`004`](docs/insights/004-name-similarity-could-not-separate-the-two-populations-at-any-threshold.md),
[`006`](docs/insights/006-four-verification-steps-that-could-silently-do-nothing.md),
[`007`](docs/insights/007-presence-is-not-health-the-third-instance-of-one-pattern.md)) directly
constrain how the next three units get built — the normalizer, the schema gate, and the mule's
health check each have a documented wrong answer that looks right. Read them before designing, not
after debugging.

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

- ~~**U9 draft-state watcher**~~ ✅ **SHIPPED 2026-08-07.** Scheduled task *Family Feud Draft Watcher*
  runs hourly at :35, six minutes behind the mule. Writes to `newsletter/data/state/DRAFT_ALERTS.md`
  (gitignored). **Nothing to do here — but know it exists**, because it is what tells you the draft
  date appeared or moved. If it ever needs re-registering after a folder move:
  `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\install-watcher.ps1`
- ~~**U3 normalizer**~~ ✅ **SHIPPED 2026-08-07** (`522843cd`). `draft-kit/normalize.py` owns the
  rules as data; `norm_spec.json` and the board's JS are generated from it. **Never fork it.**
- ~~**U14 `sleeperId`**~~ ✅ **SHIPPED 2026-08-07** (`c6379d78` + hardening). 174 ids frozen, 0
  unresolved, ledger at `draft-kit/sleeper_ids.json`, dump pinned at `draft-kit/cache/`. Standing
  check: `python scripts/resolve_sleeper_ids.py --verify` — exit 0 means the join key still holds.
  **A lone shared-token match is never auto-accepted** — it is routinely a same-position teammate
  (six such pairs on this board), so it proposes and hard-stops for a human.
- **U4 gate ∥ U5 VORP** ◀ **NEXT.** U5 never depended on U4; the gate consumes its output. U4 is
  **born red** and that's correct: two cross-surface checks fail on today's drifted surfaces.
- **U6 generator** — staged emit, `.last_good/`, `--verify-only`, one-refresh-one-commit.
- **U15 engine wrapper** (NEW) — KTD-8's missing owner. Reads shape from the draft object; hard-refuses
  non-snake drafts.

**Board today:** 174 players + 8 dst, `meta.updated: 2026-08-05`. **The ids are frozen in
`draft-kit/sleeper_ids.json`, NOT on the board rows** — every row still has no `sleeperId` field.
Stamping them onto the board is U6's job, as the generator's output. Until U6 runs, any consumer
must join through the ledger.

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

Full set in [`CLAUDE.md`](CLAUDE.md); [`docs/insights/`](docs/insights/) has the eight worked cases.
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
