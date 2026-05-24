---
created: 2026-05-24T09:46:48-04:00
deepened: 2026-05-24T11:56:12-04:00
doc-reviewed:
---

# Phase −1 — Pre-flight verifications

**Prereq:** Read [README.md](README.md) first — the bar, locked decisions, and visual system live there. This file is the executable recipe for the five gates.

Five gates resolve before Phase 0 code work starts:

- **−1.1** — `claude-credit` publishability + CTA copy
- **−1.2** — Project config edit (`~/.claude-credit-projects.yaml`)
- **−1.3** — Per-project deploy verification (corrected methodology — slug-guessing produces false positives)
- **−1.4** — Visual asset inventory (folded into −1.5 as `heroImage` column; pointer only)
- **−1.5** — Editorial + inventory worksheet (`docs/editorial.md`) — single combined source of truth

Locked decisions from the brainstorm/review pass that this recipe respects:
- **`repoUrl` is wired to the detail page** (Phase 5 gets a "View source →" affordance per project).
- **Voice anchor** for editorial copy: `terse · sharp · specific · knowing · matter-of-fact`. Anti-anchor: `aspirational · evangelical · breathless · jargon-heavy · self-deprecating`.
- **Shelved projects roll into totals, no individual tiles.** They surface as ONE collective tile in last grid position labeled **"the misses"** with a click-through detail page that names each.
- **Final grid count: 12 tiles** (9 active + 2 meta + 1 archive collective). Was 11 before this deepening.

---

## −1.1 `claude-credit` tool publishability + CTA gates

Drives the verbatim CTA copy in [Phase 7](phase-7-cta.md). Three terminal states (A / B / C) determined here; the CTA copy block at the bottom of `projects/claude-credits/docs/editorial.md` records which state landed so Phase 7 reads from one source.

### Current state (verified at deepening, 2026-05-24)

Read of `C:\Users\brigg\ai-learning-journey\tools\claude-credit\package.json` confirms:
- `name`: `claude-credit` (unscoped)
- `private`: **missing** → defaults to publishable
- `publishConfig`: **missing**
- `repository`: **missing** (add before publish — npm best practice + lets registry link to GitHub)
- `version`: `0.1.0`
- `bin`: `{ "claude-credit": "./bin/claude-credit.mjs" }` (exposes the global command)
- `scripts`: `dev`, `build`, `typecheck`, `test` — no `prepublishOnly`, no `prepare`

Monorepo is **public** on GitHub (verified `https://api.github.com/repos/mbriggsy/ai-learning-journey` returns 200). The "Source on GitHub" CTA in Phase 7 works directly; no repo-visibility action needed.

`tools/claude-credit/README.md` carries a contradictory `pnpm add claude-credit` snippet implying the package is published. **Must be fixed before or at publish.**

### Recipe

**Step 1 — verify npm name availability.** Generic name "claude-credit" may already be owned.

```bash
npm view claude-credit version
```

| Outcome | Action |
|---|---|
| Exit 0, version string printed | Name **TAKEN.** Fall back to scoped name (see Step 2 Path B). Land STATE C. |
| Exit 1 with `E404` | Name **AVAILABLE.** Proceed with unscoped publish (Step 2 Path A). |
| Network error / other | Record + retry with `--registry=https://registry.npmjs.org/` explicit. Do not proceed until resolved. |

**Step 2 — prep package.json.**

*Path A (unscoped, name available):* Edit `C:\Users\brigg\ai-learning-journey\tools\claude-credit\package.json` — add the `repository` block under `description`:

```json
"repository": {
  "type": "git",
  "url": "git+https://github.com/mbriggsy/ai-learning-journey.git",
  "directory": "tools/claude-credit"
}
```

*Path B (scoped, name taken):* Same `repository` block as Path A, AND change `name` from `claude-credit` to `@mbriggsy/claude-credit`, AND add `publishConfig` block:

```json
"publishConfig": {
  "access": "public"
}
```

**Step 3 — fix README contradiction.** Edit `C:\Users\brigg\ai-learning-journey\tools\claude-credit\README.md`:
- Find the `pnpm add claude-credit` snippet (under the `logGeneration()` section per Agent 1 report)
- Replace with `# After publish: pnpm add claude-credit` until Step 4 lands
- If Path B (scoped name), also update install snippets at the top of README from `claude-credit` to `@mbriggsy/claude-credit`

**Step 4 — publish OR fallback.**

*If publish path chosen (preferred — lands STATE A or C):*
```bash
cd C:/Users/brigg/ai-learning-journey/tools/claude-credit
pnpm install
pnpm build
pnpm typecheck
pnpm test
# verify dist/ + bin/ + README.md are all that ships (per package.json "files" array)
npm publish              # Path A
# OR
npm publish --access=public   # Path B (scoped)
# verify
npm view claude-credit version              # Path A — should match local
npm view @mbriggsy/claude-credit version    # Path B
```

If `npm publish` fails (auth, registry, anything): record exact stderr, do NOT proceed to STATE A copy. Re-evaluate as STATE B.

*If publish deferred (lands STATE B):* Skip Step 4 entirely. Re-read the README contradiction edit from Step 3 and ensure it's harmless ("after publish" framing).

**Step 5 — record CTA state.** Append a `## CTA state` block to `projects/claude-credits/docs/editorial.md` (file created in −1.5; if running these gates out of order, create the file with just this block first):

```markdown
## CTA state (from −1.1)

- **State:** [A | B | C]
- **Install command (verbatim):** <one line>
- **First-run command (verbatim):** <one line>
- **GitHub source URL (verbatim):** https://github.com/mbriggsy/ai-learning-journey
```

Verbatim CTA copy for each state (Phase 7 reads this directly):

*STATE A — unscoped, published:*
```
Install: npm i -g claude-credit
First-run: claude-credit --all --json > stats.json
```

*STATE B — not yet published:*
```
Install: # `claude-credit` ships alongside this site — watch the repo
First-run: (none until published)
```

*STATE C — scoped, published:*
```
Install: npm i -g @mbriggsy/claude-credit
First-run: claude-credit --all --json > stats.json
```

### Commit point

After Step 3 (README edit) and Step 4 (publish OR fallback decision) land:

- `tools/claude-credit/package.json` + `tools/claude-credit/README.md` → one commit. Message style: `chore(claude-credit): add repository field + clarify install path` (Path A) or `chore(claude-credit): publish as @mbriggsy/claude-credit, fix README` (Path B).
- `projects/claude-credits/docs/editorial.md` CTA-state block → committed with the rest of −1.5 (one combined commit at end of −1.5).

---

## −1.2 Project config edit — `~/.claude-credit-projects.yaml`

Adds 2 meta-projects + a new `archive:` array (locked-in: the misses roll into totals, surface as collective tile).

### Current state (verified at deepening, 2026-05-24)

File at `C:\Users\brigg\.claude-credit-projects.yaml`. 9 entries under `projects:` key. Format is `- path: <Windows absolute path with backslashes>`. README of the CLI documents tilde-form, but the actual file uses Windows absolutes — match the existing convention.

Cross-checked against `C:/Users/brigg/ai-learning-journey/projects/` directory listing: clean 1-to-1 match, no drift. `archive/` subdirectory contains the 6 shelved projects, none currently in any config.

### Recipe

**Step 1 — back up the current file** (rollback safety):
```bash
cp C:/Users/brigg/.claude-credit-projects.yaml C:/Users/brigg/.claude-credit-projects.yaml.bak.2026-05-24
```

**Step 2 — verify archive paths exist on disk** (sanity check before YAML write):
```bash
for d in hide-and-seek do-not-disturb conway_game_of_life top-down-racer-01 top-down-racer-03 gsd-autopilot; do
  test -d "C:/Users/brigg/ai-learning-journey/projects/archive/$d" && echo "OK: $d" || echo "MISSING: $d"
done
```

Outcomes:
- All 6 OK → proceed to Step 3 with the exact 6 names
- Any MISSING → list of present-on-disk archive dirs is the canonical set; adjust Step 3 YAML accordingly and note discrepancy in the commit message

**Step 3 — rewrite the file.** Final file contents (exact YAML to write — preserve the leading comments + add two new top-level keys after `projects:`):

```yaml
# claude-credit project list
# Add or remove projects to control what `claude-credit --all` scans.
# Tilde (~) expands to your home directory. Absolute paths also supported.
projects:
  - path: C:\Users\brigg\ai-learning-journey\projects\burned
  - path: C:\Users\brigg\ai-learning-journey\projects\data-engineering
  - path: C:\Users\brigg\ai-learning-journey\projects\hooks
  - path: C:\Users\brigg\ai-learning-journey\projects\pacman
  - path: C:\Users\brigg\ai-learning-journey\projects\skills
  - path: C:\Users\brigg\ai-learning-journey\projects\tic-tac-toe
  - path: C:\Users\brigg\ai-learning-journey\projects\top-down-racer-02
  - path: C:\Users\brigg\ai-learning-journey\projects\top-down-racer-04
  - path: C:\Users\brigg\ai-learning-journey\projects\undercover-mob-boss

# Meta-projects — the tools that built/measured this site.
# Render as individual tiles AFTER the 9 active projects, under a divider "the tools".
meta:
  - path: C:\Users\brigg\ai-learning-journey\tools\claude-credit
  - path: C:\Users\brigg\ai-learning-journey\projects\claude-credits

# Archive — shelved projects ("the misses").
# Metrics roll into combined totals. No individual tiles.
# Surface as ONE collective tile at the end of the grid, under a divider "the misses".
archive:
  - path: C:\Users\brigg\ai-learning-journey\projects\archive\hide-and-seek
  - path: C:\Users\brigg\ai-learning-journey\projects\archive\do-not-disturb
  - path: C:\Users\brigg\ai-learning-journey\projects\archive\conway_game_of_life
  - path: C:\Users\brigg\ai-learning-journey\projects\archive\top-down-racer-01
  - path: C:\Users\brigg\ai-learning-journey\projects\archive\top-down-racer-03
  - path: C:\Users\brigg\ai-learning-journey\projects\archive\gsd-autopilot
```

**Step 4 — schema decisions handed off to Phase 0.** The CLI parser today only knows `projects:`. The new `meta:` and `archive:` keys are inert until Phase 0 extends the parser. **Add a new sub-item to [phase-0-data-gaps.md](phase-0-data-gaps.md):** "0.6b — Extend `loadProjectConfig` to recognize `meta:` and `archive:` arrays. `meta` entries scan + report with `kind: 'meta'`. `archive` entries scan, contribute to `combined.totalTokens` / `combined.totalLines` / `combined.totalBytes`, but emit a single rolled-up `ArchiveCollective` instead of individual `ProjectReport` entries. Schema: `MultiProjectReport.archiveCollective: ArchiveCollective | null`."

**Step 5 — sanity-test the YAML loads.** After the Phase 0.6b parser extension lands (NOT this phase), running `claude-credit --all --json | head -30` should show:
- 9 entries under `projects` (each with editorial null for now)
- 2 entries under `meta`
- 1 `archiveCollective` block with 6 contributing project names + rolled-up totals
- No errors, no warnings about unknown YAML keys

Since the parser extension is Phase 0 work, the only verification possible inside −1.2 is YAML validity:
```bash
node -e "console.log(JSON.stringify(require('js-yaml').load(require('fs').readFileSync('C:/Users/brigg/.claude-credit-projects.yaml', 'utf8')), null, 2))" | head -30
```
Exit 0 + parseable JSON = YAML is valid. Errors → re-check indentation (YAML cares).

### Final grid math after this edit

- 9 active project tiles (sorted by `grandTotals.allBytes` desc)
- Divider: "the tools"
- 2 meta project tiles
- Divider: "the misses"
- 1 collective archive tile
- **Total: 12 grid positions**

### Commit point

After Step 3 + Step 5 (YAML valid). One commit. The file lives in user home, NOT inside the repo, so this commit is the Phase 0 sub-item add (the new −1.4 entry doesn't get a commit until that sub-item is added to phase-0-data-gaps.md). Single commit message: `docs(claude-credits): add 0.6b parser extension for meta + archive arrays`.

YAML file itself is uncommitted (lives at `~/.claude-credit-projects.yaml`, not in repo). Rollback if needed via the `.bak.2026-05-24` from Step 1.

---

## −1.3 Deploy verification per project — corrected methodology

**Critical correction from original plan.** The slug-guessing approach (curl `<projectname>.vercel.app`, treat 200 as deployed) produces FALSE POSITIVES because generic slugs are squatted by unrelated apps on Vercel. Verified at deepening time:

| Slug | Status | Body fingerprint |
|---|---|---|
| `burned.vercel.app` | 200 | "Welcome to Burned" — Next.js login/signup app, unrelated |
| `pacman.vercel.app` | 200 | "Pac-Man with Styled Components" by someone else |
| `hooks.vercel.app` | 200 | Default "React App" — unrelated |
| `skills.vercel.app` | 200 | Russian-language Yandex.Dialog Flask app |
| `tic-tac-toe.vercel.app` | 200 | "Program by Sanjay Puri" — unrelated |
| `data-engineering.vercel.app` | 404 | not deployed |
| `undercover-mob-boss.vercel.app` | 308 → 200 | KNOWN-LIVE; requires `curl -sIL` (capital L) to follow redirect |
| `top-down-racer-02.vercel.app` | 200 | KNOWN-LIVE |
| `top-down-racer-04.vercel.app` | 200 | KNOWN-LIVE |

The original "200 + Server: Vercel" rule would have recorded **5 false positives** as Briggsy's deploys. Corrected methodology: three-step verify.

### Recipe — per project (run for all 11 individual-tile projects: 9 active + 2 meta)

**Step 1 — discover the deployed URL by reading INSIDE the project.** Check sources in priority order:

```bash
# Run per project. Replace PROJ with the project name.
PROJ=burned
PROJDIR=C:/Users/brigg/ai-learning-journey/projects/$PROJ
echo "=== $PROJ ==="
echo "--- .vercel/project.json ---"
cat "$PROJDIR/.vercel/project.json" 2>/dev/null || echo "(none)"
echo "--- vercel.json ---"
cat "$PROJDIR/vercel.json" 2>/dev/null || echo "(none)"
echo "--- package.json homepage ---"
grep -E '"homepage"' "$PROJDIR/package.json" 2>/dev/null || echo "(none)"
echo "--- README + CLAUDE.md vercel.app refs ---"
grep -hoE 'https?://[a-z0-9-]+\.vercel\.app[^"'\'' ]*' "$PROJDIR/README.md" "$PROJDIR/CLAUDE.md" 2>/dev/null | sort -u || echo "(none)"
```

For meta-projects, paths differ:
- `tools/claude-credit` → no deploy (CLI tool, no URL)
- `projects/claude-credits` → URL not yet known (own deploy in Phase 8) — record `liveUrl: null` for now

Outcomes per project:
- One URL discovered → proceed to Step 2 with that URL
- Multiple URLs (aliases) → use the canonical one from `.vercel/project.json` if present, else the shortest. Record both in worksheet as `liveUrl` (canonical) and `liveUrlAliases` (others).
- Zero URLs discovered → mark `liveUrl: null`. Add to `## Deploys to fix` block in editorial.md so Briggsy can re-deploy if desired. Done for this project.

**Step 2 — confirm URL serves a 200 (after redirects).**

```bash
URL=https://<discovered-url>
curl -sIL --max-time 10 "$URL" | head -10
```

Read the LAST `HTTP/` status line (after any 30x chain). Outcomes:
- Last status `200 OK` → proceed to Step 3 (content fingerprint)
- Last status `404 Not Found` / `5xx` → URL stale or deploy down. Mark `liveUrl: null`. Add to `## Deploys to fix` block with the URL + status code.
- `curl: (28)` timeout / connection refused → Mark `liveUrl: null` + add to fix block with note "timeout".

**Step 3 — fingerprint the body — confirm it's Briggsy's content, not a squatter.**

```bash
curl -sL --max-time 10 "$URL" > /tmp/fp-$PROJ.html
```

Then grep for project-identifying strings. Per-project fingerprint patterns:

| Project | Required string match (case-insensitive, at least ONE) |
|---|---|
| burned | `pendleton` OR `agent-x` OR (`dash` AND `vera`) OR `BURNED` (as logo/title text, not the random word) |
| data-engineering | `data engineering` OR `azure` OR `databricks` OR `ETL` |
| hooks | `pretooluse` OR `posttooluse` OR `claude code hook` |
| pacman | (No reliable fingerprint — Briggsy's pacman may match generic pacman copy. Cross-reference: does the URL hostname include `briggsy` or `mbriggsy`? If yes, accept. If no, mark suspect.) |
| skills | `distill` OR `brief` OR `doc-audit` OR `slash command` |
| tic-tac-toe | (Same caveat as pacman — needs hostname check OR specific Briggsy text) |
| top-down-racer-02 | `top-down racer` OR `top down racer` (version 02 implicit if URL contains `-02`) |
| top-down-racer-04 | `top-down racer` OR `top down racer` (version 04 implicit if URL contains `-04`) |
| undercover-mob-boss | `undercover mob boss` OR `mob boss` OR `policy-good` OR `nominate` |

For pacman + tic-tac-toe (no reliable text fingerprint), the URL discovery in Step 1 is the primary signal — if the URL was found INSIDE the project's own files, it's almost certainly Briggsy's. Accept based on Step 1 evidence + a 200 in Step 2, even without unique body text.

Outcomes:
- Match found → URL confirmed. Record in editorial worksheet `liveUrl` column.
- No match found + URL was discovered from Briggsy's own project files → Suspect but acceptable; mark with `liveUrlSuspect: true` in worksheet and proceed (Briggsy resolves during review).
- No match found + URL was guessed → reject as squatter. Mark `liveUrl: null`. Add to fix block.

### Known-live URLs (pre-verified at deepening time)

These start as accepted but still go through Steps 2+3 in case content moved between deepening and execution:

| Project | URL | Note |
|---|---|---|
| undercover-mob-boss | `https://undercover-mob-boss.vercel.app` | 308 redirect — `-L` required |
| top-down-racer-02 | `https://top-down-racer-02.vercel.app` | Clean 200 |
| top-down-racer-04 | `https://top-down-racer-04.vercel.app` | Clean 200 |

### Output

Per project, record into the editorial worksheet (`projects/claude-credits/docs/editorial.md`) at the corresponding row's `liveUrl:` field. Build the `## Deploys to fix` block at the bottom of the worksheet with any rows that resolved to null.

### Commit point

After all 11 projects resolved. Single commit to `projects/claude-credits/docs/editorial.md`. Bundled with the −1.5 final commit (don't commit a half-built editorial.md mid-stream).

---

## −1.4 Visual asset inventory — folded into −1.5

The original Phase −1.4 (inventory) IS the `heroImage` column on the editorial+inventory worksheet. Same join key (project name), same review pass, no value in keeping them as separate files.

This section is retained as a pointer; the inventory work happens inside [−1.5](#15-editorial--inventory-worksheet-docseditorialmd).

### Capture-needed summary (verified at deepening time)

7 of 12 surfaces have zero existing hero candidates and need capture work in PARALLEL with Phase 0–2 build (do not block Phase 0 on captures; the editorial draft can be written with `heroImage: null` placeholders and updated as captures land):

| Surface | What to capture | Notes |
|---|---|---|
| data-engineering | Terminal screencap of an ATC/ETL run with output | No `docs/` or `public/`. Hero = code-or-CLI aesthetic |
| hooks | Terminal screencap of a hook firing + the elite-engineer manifesto file | No assets dir. Hero = invisible-but-essential automation |
| pacman | Gameplay screenshot (mid-game with ghosts visible) | `tests.html` exists; pick gameplay over tests |
| skills | Slash-command screencap (e.g., `/distill` or `/brief` firing in a real session) | No project-root assets; lives across three skill subdirs |
| tic-tac-toe | Mid-game screenshot, board with X/O moves visible | Honesty: smallest project; hook stat should reflect |
| claude-credit | Terminal screencap of `claude-credit --all` output (ASCII table or hero numbers) | README has ASCII art at lines 5-15 — also viable |
| claude-credits | Self-referential: site's own hero screenshot, POST-deploy | Chicken-and-egg — `heroImage` stays null until after Phase 8 ships, then captured |

5 surfaces have rich existing hero candidates (no capture needed; pick best at editorial draft time):

| Surface | Candidates available |
|---|---|
| burned | Arena PNGs (`projects/burned/public/assets/arena/*.png`), card art (`public/assets/cards/*.webp`), Briefing Room SVGs, trailer outputs |
| undercover-mob-boss | Trailer hero shots (`projects/undercover-mob-boss/public/trailer-*.jpg`), role iconography, htp-fullpage |
| top-down-racer-04 | Gameplay shots, track BGs, UI menu, sprite atlas under `public/assets/` |
| top-down-racer-02 | 2 temp screenshots — acceptable but consider re-capture for higher quality |
| "the misses" collective tile | Composite or generated visual (e.g., a faded-out grid of 6 project-name typographic cards, or a single grayscale collage) — capture in parallel |

### Mobile capture note

Per "mobile must shine" — for TILE heroes, the same 16:9 image works at 320px and 600px+. For DETAIL-PAGE heroes (full-width on mobile, ~40% viewport on desktop), verify the image looks intentional in both crops. The worksheet (−1.5) carries a `heroImage_mobile_safe:` boolean per row.

---

## −1.5 Editorial + inventory worksheet — `projects/claude-credits/docs/editorial.md`

The single combined source of truth. Briggsy reviews + edits the voice. Claude pre-fills strawman content + every constraint so the review is targeted, not blank-page.

**Schema source:** `EditorialContent` interface proposed in [phase-0-data-gaps.md](phase-0-data-gaps.md) section 0.6, lines 220–229. Type does not yet exist in `tools/claude-credit/src/taxonomy.ts` — Phase 0 lands it. Modifications locked in this deepening:
- `repoUrl` RETAINED and WIRED to detail page (Phase 5 plan adds "View source →" affordance — also a Phase 5 follow-up sub-item).
- `status` enum simplifies to `active | meta`. (Shelved removed — the archive collective is a separate surface, not an EditorialContent row.)

**Downstream readers** (so the template knows what every column feeds):
- `oneLiner`, `hookStat`, `heroImage`, `liveUrl`, `status` → `ProjectTile.tsx` (Phase 4)
- `heroImage`, `description`, `gallery`, `repoUrl` → `ProjectDetail.tsx` (Phase 5)
- `combined` totals (including archive collective rollup) → Hero counter (Phase 3)

### Recipe

**Step 1 — create the file** at `projects/claude-credits/docs/editorial.md` with the EXACT structure below. Pre-fill all 12 row blocks with Claude strawman content + hookStat candidates. Leave fields requiring Briggsy taste tagged `[STRAWMAN]`.

**Step 2 — populate `liveUrl` column** from −1.3 outputs.

**Step 3 — populate `heroImage` column** from −1.4 inventory (paths for the 5 stocked projects; `null` for the 7 capture-needed projects; capture queue listed at bottom of file).

**Step 4 — populate `## CTA state` block** from −1.1 outputs.

**Step 5 — surface to Briggsy** for review. Briggsy edits voice/hook picks/descriptions in-place. He checks off the sign-off boxes at the bottom when done.

**Step 6 — commit** the completed worksheet. Single commit. Message: `docs(claude-credits): draft editorial worksheet for all 12 surfaces`.

### Exact file structure for `projects/claude-credits/docs/editorial.md`

```markdown
# claude-credits — editorial worksheet

**Status:** draft (Claude pre-fill complete · Briggsy review pending)
**Schema source:** [phase-0-data-gaps.md §0.6](plans/phase-0-data-gaps.md) — `EditorialContent` type.
**Locked decisions:** `repoUrl` wired to detail page · `status: active | meta` (archive is a separate surface) · 12-tile grid (9 active + 2 meta + 1 archive collective).

---

## Voice anchor

Builder-to-builder. Audience is AI-curious peer developers.

**Voice descriptors — every row drafts against these:**
> terse · sharp · specific · knowing · matter-of-fact

**Anti-anchor — every row checks against this list:**
> aspirational · evangelical · breathless · jargon-heavy · self-deprecating

**Hard rules:**
- Site voice ≠ BURNED voice. BURNED's row is written in claude-credits voice ABOUT a project that uses Archer/Sterling cadence — NOT in Archer/Sterling cadence itself.
- No "water beads" metaphors in copy. That's the visual bar, not the voice bar.
- No project-name prefix in one-liners — the tile already shows the title.

---

## Per-field constraints

| Field | Cap / format | Notes |
|---|---|---|
| `oneLiner` | ≤ 60 chars, single line, no project-name prefix | Mobile single-column survival at 320px width |
| `hookStat.label` | ≤ 12 chars, small-caps-friendly | Renders small caps on tile |
| `hookStat.value` | Display-type number preferred; text discouraged | StatusMarker handles "shelved"; don't double up |
| `heroImage` | Project-root-relative path; null if not yet captured | See `## Capture queue` block |
| `liveUrl` | Full https URL or null; verified per −1.3 methodology | Squatter slugs are real; trust −1.3 |
| `repoUrl` | Full https URL or null; powers "View source →" on detail page | Auto-derivable: `https://github.com/mbriggsy/ai-learning-journey/tree/main/<projectPath>` |
| `status` | `active` or `meta` only | Archive collective is NOT a row here |
| `description` | 2-3 sentences; ~58ch line length; sentence 2 carries the arc/why | Three boxes below per row, not one textarea |
| `gallery` | `string[]`; leave empty unless multiple strong visuals tell a richer story | Lightbox grid (Phase 5); no carousel |

---

## Per-project rows (12 surfaces)

### `burned` (active)

- **hostProjectRoot:** `C:\Users\brigg\ai-learning-journey\projects\burned`
- **status:** `active`
- **oneLiner [STRAWMAN]:** `Couch-of-friends spy comedy. Archer-coded card game in the browser.`
- **hookStat candidates:**
  - `{ label: "TESTS", value: "167" }`
  - `{ label: "CARDS", value: "120" }`
  - `{ label: "PHASES", value: "6" }`
- **heroImage:** `public/assets/arena/<pick at draft time>` — multiple candidates, see −1.4
- **heroImage_mobile_safe:** `tbd`
- **liveUrl:** [populate from −1.3]
- **repoUrl:** `https://github.com/mbriggsy/ai-learning-journey/tree/main/projects/burned`
- **description (3 sentences) [STRAWMAN]:**
  1. `Real-time browser card game for 2–10 players on the couch.`
  2. `Built to prove a visual bar — Archer-coded illustration over Cloudflare Workers + Durable Objects.`
  3. `Friends-and-family product on top of an engineering proving ground.`
- **gallery:** `[]` (consider populating with 6 character portraits if story merits)

### `data-engineering` (active)

- **hostProjectRoot:** `C:\Users\brigg\ai-learning-journey\projects\data-engineering`
- **status:** `active`
- **oneLiner [STRAWMAN]:** `Azure data engineering experiments. ADF, Databricks, Unity Catalog.`
- **hookStat candidates:**
  - `{ label: "PIPELINES", value: "<count once Briggsy weighs in>" }`
  - `{ label: "STACK", value: "ADF+UC" }`
  - `{ label: "ETL JOBS", value: "<count>" }`
- **heroImage:** NEEDS CAPTURE — see capture queue
- **heroImage_mobile_safe:** `tbd`
- **liveUrl:** [populate from −1.3 — likely null per data-engineering.vercel.app 404]
- **repoUrl:** `https://github.com/mbriggsy/ai-learning-journey/tree/main/projects/data-engineering`
- **description (3 sentences) [STRAWMAN]:**
  1. `Cloud data pipelines in Briggsy's declared focus stack.`
  2. `Reverse-engineering ETL patterns ATC-style — no code Briggsy didn't review.`
  3. `[OMIT — pending project survey]`
- **gallery:** `[]`

### `hooks` (active — status confirmable during Briggsy review; `meta` is also plausible)

- **hostProjectRoot:** `C:\Users\brigg\ai-learning-journey\projects\hooks`
- **status:** `active` (Briggsy: flip to `meta` if you consider this tools-not-product)
- **oneLiner [STRAWMAN]:** `Claude Code hooks that gate, guide, and finish work.`
- **hookStat candidates:**
  - `{ label: "HOOKS", value: "6" }`
  - `{ label: "GATES", value: "<count of PreToolUse>" }`
  - `{ label: "RECOVERED", value: "<count of sessions saved>" }`
- **heroImage:** NEEDS CAPTURE — see capture queue
- **heroImage_mobile_safe:** `tbd`
- **liveUrl:** [populate from −1.3 — likely null]
- **repoUrl:** `https://github.com/mbriggsy/ai-learning-journey/tree/main/projects/hooks`
- **description (3 sentences) [STRAWMAN]:**
  1. `PreToolUse + Stop + PostToolUse hooks for Claude Code.`
  2. `Built after losing a session to WebFetch hanging — the rules are the lessons.`
  3. `Source for the elite-engineer manifesto that ships across every project session.`
- **gallery:** `[]`

### `pacman` (active)

- **hostProjectRoot:** `C:\Users\brigg\ai-learning-journey\projects\pacman`
- **status:** `active`
- **oneLiner [STRAWMAN]:** `Pac-Man clone. Browser. No frameworks.`
- **hookStat candidates:**
  - `{ label: "LINES", value: "<count from claude-credit>" }`
  - `{ label: "GHOSTS", value: "4" }`
  - `{ label: "TESTS", value: "<count>" }`
- **heroImage:** NEEDS CAPTURE — see capture queue
- **heroImage_mobile_safe:** `tbd`
- **liveUrl:** [populate from −1.3]
- **repoUrl:** `https://github.com/mbriggsy/ai-learning-journey/tree/main/projects/pacman`
- **description (3 sentences) [STRAWMAN]:**
  1. `Classic arcade clone with ghost AI.`
  2. `Built to test how small a game could be without frameworks.`
  3. `[OPTIONAL — drop if it pads]`
- **gallery:** `[]`

### `skills` (active OR meta — Briggsy decides)

- **hostProjectRoot:** `C:\Users\brigg\ai-learning-journey\projects\skills`
- **status:** `active` (Briggsy: flip to `meta` if this counts as tools)
- **oneLiner [STRAWMAN]:** `Slash-commands Claude reaches for: distill, brief, doc-audit.`
- **hookStat candidates:**
  - `{ label: "SKILLS", value: "3" }`
  - `{ label: "ASSERTIONS", value: "20" }` (doc-audit eval per memory)
  - `{ label: "PASS RATE", value: "100%" }`
- **heroImage:** NEEDS CAPTURE — see capture queue
- **heroImage_mobile_safe:** `tbd`
- **liveUrl:** [populate from −1.3]
- **repoUrl:** `https://github.com/mbriggsy/ai-learning-journey/tree/main/projects/skills`
- **description (3 sentences) [STRAWMAN]:**
  1. `Three custom Claude skills: /distill (preserve lessons), /brief (recall them), doc-audit (5-agent quality gate).`
  2. `Built after losing context to fresh sessions one too many times.`
  3. `[OPTIONAL]`
- **gallery:** `[]`

### `tic-tac-toe` (active)

- **hostProjectRoot:** `C:\Users\brigg\ai-learning-journey\projects\tic-tac-toe`
- **status:** `active`
- **oneLiner [STRAWMAN]:** `The smallest possible game. Three files, one afternoon.`
- **hookStat candidates:**
  - `{ label: "FILES", value: "3" }` (index.html / script.js / style.css)
  - `{ label: "LINES", value: "<count from claude-credit>" }`
  - `{ label: "TESTS", value: "<count>" }`
- **heroImage:** NEEDS CAPTURE — see capture queue
- **heroImage_mobile_safe:** `tbd`
- **liveUrl:** [populate from −1.3]
- **repoUrl:** `https://github.com/mbriggsy/ai-learning-journey/tree/main/projects/tic-tac-toe`
- **description (3 sentences) [STRAWMAN]:**
  1. `Three-by-three grid, two players, classic rules.`
  2. `Built as a calibration project for the smallest scope claude-credit could measure.`
  3. `[OMIT]`
- **gallery:** `[]`

### `top-down-racer-02` (active)

- **hostProjectRoot:** `C:\Users\brigg\ai-learning-journey\projects\top-down-racer-02`
- **status:** `active`
- **oneLiner [STRAWMAN]:** `First racer. Reinforcement-learning agent learns the track.`
- **hookStat candidates:**
  - `{ label: "STACK", value: "ONNX+RL" }`
  - `{ label: "TRAINING", value: "<duration>" }`
  - `{ label: "EVIDENCE", value: "PPTX+DOCX" }`
- **heroImage:** `temp/Screenshot 2026-03-01 113028.png` OR `temp/total time.png` (consider re-capture for quality)
- **heroImage_mobile_safe:** `tbd`
- **liveUrl:** `https://top-down-racer-02.vercel.app` (pre-verified known-live)
- **repoUrl:** `https://github.com/mbriggsy/ai-learning-journey/tree/main/projects/top-down-racer-02`
- **description (3 sentences) [STRAWMAN]:**
  1. `Top-down racing game with a learned agent driving the car.`
  2. `Foundation project — TDR-04 inherits the engine and adds polish.`
  3. `[OPTIONAL]`
- **gallery:** `[]`

### `top-down-racer-04` (active)

- **hostProjectRoot:** `C:\Users\brigg\ai-learning-journey\projects\top-down-racer-04`
- **status:** `active`
- **oneLiner [STRAWMAN]:** `Top-down racer, polished. 487 tests, 8 phases.`
- **hookStat candidates:**
  - `{ label: "TESTS", value: "487" }`
  - `{ label: "PHASES", value: "8" }`
  - `{ label: "RUNTIME", value: "Python 3.12" }`
- **heroImage:** `public/assets/tracks/track01-bg.png` (gameplay-bearing) OR `public/assets/ui/menu-bg.png` (menu hero)
- **heroImage_mobile_safe:** `tbd`
- **liveUrl:** `https://top-down-racer-04.vercel.app` (pre-verified known-live)
- **repoUrl:** `https://github.com/mbriggsy/ai-learning-journey/tree/main/projects/top-down-racer-04`
- **description (3 sentences) [STRAWMAN]:**
  1. `Second racer. Three tracks, sprite atlas, menu UI, 487-test verification baseline.`
  2. `Built end-to-end across 8 phases — last game shipped before the games-pause pivot.`
  3. `[OPTIONAL]`
- **gallery:** `["public/assets/tracks/track01-bg.png", "public/assets/tracks/track02-bg.png", "public/assets/tracks/track03-bg.png"]`

### `undercover-mob-boss` (active)

- **hostProjectRoot:** `C:\Users\brigg\ai-learning-journey\projects\undercover-mob-boss`
- **status:** `active`
- **oneLiner [STRAWMAN]:** `Voting game with hidden roles. Phones as controllers, TV as the stage.`
- **hookStat candidates:**
  - `{ label: "HOWPLAY", value: "1700 lines" }` (the responsive masterpiece — UMB IS this site's mobile bar reference)
  - `{ label: "ROLES", value: "3" }` (citizen / mob soldier / mob boss)
  - `{ label: "POWERS", value: "4" }`
- **heroImage:** `public/trailer-table-overhead.jpg` OR `public/trailer-dossier-spread.jpg` (trailer-quality)
- **heroImage_mobile_safe:** `tbd`
- **liveUrl:** `https://undercover-mob-boss.vercel.app` (pre-verified — 308 redirect → 200)
- **repoUrl:** `https://github.com/mbriggsy/ai-learning-journey/tree/main/projects/undercover-mob-boss`
- **description (3 sentences) [STRAWMAN]:**
  1. `Jackbox-style party game. Shared TV screen, phone controllers, hidden-role voting.`
  2. `Its how-to-play page is the mobile bar this whole site is measured against — 1700 lines of responsive HTML done right.`
  3. `[OPTIONAL]`
- **gallery:** `["public/trailer-blueprint.jpg", "public/trailer-city-closeup.jpg", "public/trailer-dossier-spread.jpg", "public/trailer-table-overhead.jpg"]`

### `claude-credit` (meta)

- **hostProjectRoot:** `C:\Users\brigg\ai-learning-journey\tools\claude-credit`
- **status:** `meta`
- **oneLiner [STRAWMAN]:** `The CLI that measured this site. Self-referential.`
- **hookStat candidates:**
  - `{ label: "PROJECTS", value: "11" }` (or 12 if counting the archive collective as a surface)
  - `{ label: "FIELDS", value: "<count of EditorialContent fields once Phase 0 lands>" }`
  - `{ label: "VERSION", value: "0.1.0" }` (or post-publish version)
- **heroImage:** NEEDS CAPTURE — terminal screencap of `claude-credit --all` output
- **heroImage_mobile_safe:** `tbd`
- **liveUrl:** `null` (CLI tool, no URL)
- **repoUrl:** `https://github.com/mbriggsy/ai-learning-journey/tree/main/tools/claude-credit`
- **description (3 sentences) [STRAWMAN]:**
  1. `Project-agnostic CLI that tallies every byte of authored, pipeline-generated, and tool-generated work in a project.`
  2. `Built to settle the "how much did Claude actually do" question with receipts, not vibes.`
  3. `Drives this site — every number on every tile traces back to claude-credit output.`
- **gallery:** `[]`

### `claude-credits` (meta — this site)

- **hostProjectRoot:** `C:\Users\brigg\ai-learning-journey\projects\claude-credits`
- **status:** `meta`
- **oneLiner [STRAWMAN]:** `The showcase you're looking at. Honesty as content.`
- **hookStat candidates:**
  - `{ label: "PHASES", value: "11" }` (preflight + 0-9)
  - `{ label: "PLANS", value: "11" }`
  - `{ label: "ROWS", value: "12" }` (this worksheet)
- **heroImage:** `null` — chicken-and-egg; captured POST-deploy (after Phase 8)
- **heroImage_mobile_safe:** `tbd`
- **liveUrl:** `null` for now; populated to `https://claude-credits.vercel.app` (or fallback) after Phase 8
- **repoUrl:** `https://github.com/mbriggsy/ai-learning-journey/tree/main/projects/claude-credits`
- **description (3 sentences) [STRAWMAN]:**
  1. `Vercel-hosted, GSAP-driven web showcase that visualizes claude-credit's data across every project in this monorepo.`
  2. `Built to a bar Briggsy named "so slick water beads off it" — surface treatment, not particle effects.`
  3. `If you reacted "wow this product is slick" — bar hit. If you reacted "wow Claude built this" — bar missed.`
- **gallery:** `[]`

---

## Archive collective surface (NOT an EditorialContent row)

Lives outside the `EditorialContent` schema. Surfaces as ONE collective tile in the 12th grid position, after the "the misses" divider.

### Tile content

- **Title:** `the misses`
- **Subtitle:** `<N> projects shelved · <M>k lines · <K>M tokens · the receipts on what didn't work` — numbers populated from `combined.archiveCollective` (Phase 0.6b)
- **Visual:** Capture in parallel (composite or generated visual — see −1.4 capture queue)
- **Status marker:** none (the tile's label IS the marker)
- **Click target:** `/archive` (or `/the-misses` — Phase 4 plan decides slug)

### Detail page content (`projects/claude-credits/src/pages/Archive.tsx`)

Six rows, one per archived project. Each row: project name + one-liner explaining WHY it was shelved (the lesson, not the elegy).

| Project | One-liner [STRAWMAN] |
|---|---|
| hide-and-seek | First game. Shelved over a presentation gap — game logic worked, the visuals never landed. |
| do-not-disturb | Second game. Same lesson, harder: side-scroller fought the hotel-room concept. |
| conway_game_of_life | Conway's Game of Life. Shelved — the simulation worked, no story attached. |
| top-down-racer-01 | First racer prototype. Superseded by TDR-02's reinforcement-learning rewrite. |
| top-down-racer-03 | Mid-iteration racer. Superseded by TDR-04's polish pass. |
| gsd-autopilot | Get-Stuff-Done autopilot experiment. Shelved as scope drifted. |

Briggsy reviews + edits each one-liner. The honest framing is the point — anti-anchor item `self-deprecating` applies here too: shelved is shelved, not "just a failed experiment."

---

## CTA state (from −1.1)

- **State:** [A | B | C] — populated when −1.1 publish gate resolves
- **Install command (verbatim):** `<one line>`
- **First-run command (verbatim):** `<one line>`
- **GitHub source URL (verbatim):** `https://github.com/mbriggsy/ai-learning-journey`

---

## Deploys to fix (from −1.3)

Projects whose recorded `liveUrl` returned 404 or fingerprinted as squatter. Briggsy decides whether to re-deploy or leave as null.

- (populate from −1.3 outputs)

---

## Capture queue (from −1.4 fold)

Hero captures needed in parallel with Phase 0–2 build. Worksheet row's `heroImage:` stays null until the capture lands.

- [ ] data-engineering — terminal screencap of ATC/ETL run
- [ ] hooks — terminal screencap of a hook firing
- [ ] pacman — mid-game screenshot with ghosts
- [ ] skills — slash-command screencap (/distill or /brief firing)
- [ ] tic-tac-toe — mid-game screenshot
- [ ] claude-credit — terminal screencap of `claude-credit --all`
- [ ] claude-credits — site hero screenshot (POST-Phase 8 deploy)
- [ ] "the misses" tile — composite visual (faded grid OR grayscale collage)

Mobile-safe verification per capture: open the captured image in DevTools mobile emulation (320px / 375px / 430px widths) AND in the desktop ~40%-viewport detail-page crop. Mark `heroImage_mobile_safe:` per row when both look intentional.

---

## Sign-off

- [ ] Voice anchor reviewed and accepted (or edited) — Briggsy
- [ ] All 12 row blocks edited; no `[STRAWMAN]` tags remaining — Briggsy
- [ ] Archive collective tile copy + 6 detail one-liners edited — Briggsy
- [ ] CTA state block populated — from −1.1
- [ ] Deploys-to-fix block resolved (each entry either re-deployed or marked null with reason) — from −1.3
- [ ] Capture queue tracked (work runs in parallel with Phase 0–2) — from −1.4
```

### Commit point

Single commit at the end of the worksheet draft. Message: `docs(claude-credits): draft editorial worksheet — all 12 surfaces + voice anchor + capture queue`. This commit includes the −1.3 `liveUrl` populations and the −1.1 `## CTA state` block (one combined commit, not three).

---

## Phase −1 → Phase 0 handoff

When all five gates are green:

- −1.1 → CTA state landed in `editorial.md`; package.json + README possibly edited & committed
- −1.2 → `~/.claude-credit-projects.yaml` updated (not in repo); new sub-item 0.6b added + committed in `phase-0-data-gaps.md`
- −1.3 → every project has a `liveUrl` (URL or null); deploys-to-fix list resolved
- −1.4 → folded into worksheet; capture queue tracking work in parallel
- −1.5 → worksheet fully drafted by Claude; Briggsy review/edit complete; sign-off boxes checked

Then open [phase-0-data-gaps.md](phase-0-data-gaps.md) and start. Capture work continues in parallel; missing captures land as worksheet edits (rebuild Phase 2 `refresh` after each).

---

← [Index](README.md) | Next → [Phase 0 — Fill data gaps](phase-0-data-gaps.md)
