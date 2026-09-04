# Family Feud — Project Conventions

Fantasy football co-pilot for Briggsy's 8-team Sleeper league ("Family Feud", 2026).
Draft ~Aug 29, 2026. Mission: beat Hunter. [`README.md`](README.md) is the map.

## Where truth lives — read before acting

| File | Owns |
|---|---|
| [`docs/league.md`](docs/league.md) | League identity, IDs, scoring, roster, playoff format — verified against the live API |
| [`docs/opponents.md`](docs/opponents.md) | What each opponent actually DOES in a draft, measured from their Sleeper history. Identity is `league.md`; behaviour is here |
| [`docs/data-access.md`](docs/data-access.md) | How to reach Sleeper, the mule, credentials policy |
| [`docs/draft-day-runbook.md`](docs/draft-day-runbook.md) | Draft-day operating instructions + changelog |
| [`docs/ranking-methodology.md`](docs/ranking-methodology.md) | Why the board ranks what it ranks |
| [`docs/live-board-plan.md`](docs/live-board-plan.md) | The live auto-updating board (next feature) |
| [`docs/nightly-feud.md`](docs/nightly-feud.md) | The newsletter — both halves built, scheduled nightly at 21:45 |
| [`docs/in-season-plan.md`](docs/in-season-plan.md) | What happens after the draft. A STUB on purpose — read its un-stub trigger before building anything in-season |
| [`docs/insights/`](docs/insights/) | Hard-won lessons, one per file. Read before debugging something that smells familiar. |
| [`newsletter/data/state/DRAFT_ALERTS.md`](newsletter/data/state/DRAFT_ALERTS.md) | Everything `scripts/watch_draft_state.py` has ever fired — the draft date appearing or MOVING, your slot appearing/moving/vanishing, a re-created draft, dead cargo, and the T-7/T-48/T-6 countdown. Append-only, newest last. Push and email are dead account-wide, so this file IS the delivery — **open it at the start of a session, not when you go looking** |
| `TODO.md` | What's next, ranked |

**Precedence:** the runbook's instruction sections are current doctrine; its changelog is history
and never overrides them. Changelog entries quote pre-migration paths (`Draft Kit\`, WebFetch,
`?cb=`) — that is preserved history, not instruction.

## Conventions

- **Folders and docs are kebab-case.** `draft-kit/`, `docs/live-board-plan.md`.
- **Python and the files it opens by literal name stay snake_case** — `draft_engine.py`,
  `players_data.json`, `slot_names.json`. Renaming those means editing code; don't, for cosmetics.
- **`curl -sL --max-time 15`, never WebFetch.** WebFetch has no timeout and hangs agents; a hook
  blocks it. This reverses the Cowork-era rule still quoted in the runbook's changelog.
- **Never quote league membership, draft time, or slot from memory or from a doc.** Re-pull.
  The mule's cargo in `newsletter/data/inbox/` is at most an hour old and costs nothing.
- Mermaid for diagrams. Temp files and screenshots go in `temp/` (gitignored).

## Landmines

- **`draft_engine.py`'s integrity gate is not redundant. Do not "simplify" it.** (Lines 84-96 as
  of Aug 7; find it by the comment `# --- integrity gate:` rather than trusting that number.)
  It derives board state from `max(pick_no)`, not `len(picks)`, and hard-exits on interior gaps
  or duplicate pick_nos. Without it, one dropped pick silently shifts the clock, invents an
  impossible pick order, and leaves drafted players on the available list — it will name an
  already-drafted player as THE CALL. Reproduced and fixed Aug 5.
- **Never advise off a `picks.json` the engine refused.** Re-fetch, merge on `pick_no`, rerun.
- **The Sleeper picks feed is CDN-cached, and a stale response defeats every gate we own.**
  Measured 2026-08-09 on a live mock: the un-busted URL was behind on **76 of 77 observations, by
  up to 16 picks**, and served a `pre_draft` body of 0 picks for 30+ seconds after the draft began.
  A stale response is a **contiguous prefix**, so it passes the gap gate, the duplicate gate, the
  contamination gate and `draft_engine.py`'s integrity gate — all of which check shape or
  provenance, never freshness. `merge_picks.picks_url()` now appends a nonce that must be **unique
  per call** (a nonce fixed at startup is just a second cache key). A `Cache-Control: no-cache`
  request header does NOT work — Cloudflare ignores it. Full write-up: `docs/insights/020`.
- **`briggsy007` IS HUNTER, NOT BRIGGSY.** Briggsy is **PoppaBriggsy** (`1390750540631150592`,
  roster_id 3, *Saquon Deez Nuts*); `briggsy007` (`959308419154886656`, `is_owner: true`) is his son
  Hunter — **the opponent the whole project exists to beat.** The trap: Briggsy's own email is
  **briggsy007@gmail.com** and is injected into every session, so "the user is briggsy007@gmail.com
  → the `briggsy007` account is the user" reads as confirmation rather than a guess. It is wrong
  twice: it aims our advice at Hunter's seat and erases the rival. Confirmed by Briggsy 2026-08-09
  and re-verified live. Identity comes from [`docs/league.md`](docs/league.md)'s table; never from
  the email.
- **`slot_to_roster_id` is NOT the draft slot.** Live 2026-09-03 it reads `{1:2, 2:5, 3:1, 4:4,
  5:6, 6:3, 7:7, 8:8}` — it maps a **slot to a roster**, and the row `6: 3` is Briggsy: seat 6,
  roster 3. Before the order was set it was the identity map `{1:1 … 8:8}` and returned whatever
  you gave it. Either way, **`roster_id 3` is not a seat**, and `3` is now Hunter's slot, which
  makes "3" the most attractive wrong answer in the project. Read the seat from
  `draft_order["1390750540631150592"]` and nothing else. `scripts/run_engine.py` does exactly that:
  as of 2026-09-03 it derives **slot 6** with no argument, and it refuses rather than guessing if
  `draft_order` ever reads `null` again (a re-created draft would do that).
- **The real draft object has NO `metadata.slot_name_*`.** Its `metadata` carries exactly four keys:
  `description`, `league_type`, `name`, `scoring_type`. Those slot-name fields existed in **Mock #1's
  room** and were generalised into doctrine; do not go hunting for them under a clock.
- **`mule_status.json` is the ONE file that needs `utf-8-sig`, not `utf-8`.** PowerShell 5.1 wrote
  it with a BOM, so the project's blanket `encoding="utf-8"` rule is wrong for exactly this file and
  right for every other. `utf-8-sig` reads both, which is why the cargo readers use it.
- **Run the draft loop from the REPO ROOT, via `scripts/run_engine.py`.** The runbook used to say
  `cd draft-kit/`, which made its own Step 3 impossible: 3.1 only resolves from the root and 3.3
  only resolved from `draft-kit/`. The engine still opens its inputs from cwd — the wrapper handles
  that. Related: **`draft-kit/` is not a valid Python identifier**, so nothing under it is importable
  as a package; `scripts/` reaches it by `sys.path` insertion.
- **Anything in this project that reads a JSON file must pass `encoding="utf-8"`.** Windows
  Python defaults to cp1252 and `players_data.json` carries emoji badge icons; a bare `open()`
  dies on byte 0x8f. Printing the board is the same trap in reverse — `⚠` (U+26A0) cannot be
  *encoded* to cp1252, so stdout needs forcing too. The engine does both; anything new must too.
  (Fixed Aug 7 — the engine had never once run on this machine.)
- **"Last Result: 0" from the mule's scheduled task does not mean the mule works.** When the task
  pointed at a deleted script it still read 0, frozen at the last good run, and looked healthy for
  hours. **The cargo timestamp in `mule_status.json` is the only real signal.**
- **Absolute paths in scheduled tasks are how this project breaks.** Both known breakages were a
  hardcoded folder path. `scripts/install-mule.ps1` derives everything from its own location —
  re-run it after any move rather than hand-editing a path back in.
- **A folder cannot be renamed while a Claude session's working directory is inside it** (Windows
  pins the cwd; it is not Explorer, and closing other apps won't help). Subdirectories rename
  fine. Rename the project root from a session rooted elsewhere.
- **Imagen 4: role-nouns are identity anchors, not accessories.** "dark leather apron" produced a
  stock photo of a woman modeling an apron; "referee whistle" turned the subject into a referee.
  Describe the *object* ("a small silver whistle on a cord"), never the role. 2 of 4 rolls
  corrupted by one word. Working call: `imagen-4.0-generate-001`, `sampleImageSize: "2K"`,
  `aspectRatio: "1:1"`, `personGeneration: "allow_adult"`.
- **Anthropic push/email notifications are broken account-wide** — deliver output as files in this
  folder, never via notification.
