# Family Feud — Project Conventions

Fantasy football co-pilot for Briggsy's 8-team Sleeper league ("Family Feud", 2026).
Draft ~Aug 29, 2026. Mission: beat Hunter. [`README.md`](README.md) is the map.

## Where truth lives — read before acting

| File | Owns |
|---|---|
| [`docs/league.md`](docs/league.md) | League identity, IDs, scoring, roster, playoff format — verified against the live API |
| [`docs/data-access.md`](docs/data-access.md) | How to reach Sleeper, the mule, credentials policy |
| [`docs/draft-day-runbook.md`](docs/draft-day-runbook.md) | Draft-day operating instructions + changelog |
| [`docs/ranking-methodology.md`](docs/ranking-methodology.md) | Why the board ranks what it ranks |
| [`docs/live-board-plan.md`](docs/live-board-plan.md) | The live auto-updating board (next feature) |
| [`docs/nightly-feud.md`](docs/nightly-feud.md) | The newsletter — and which half of it has never run |
| [`docs/insights/`](docs/insights/) | Hard-won lessons, one per file. Read before debugging something that smells familiar. |
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
