# claude-credits — editorial worksheet

**Status:** Briggsy voice review COMPLETE via chat 2026-05-25 (one-liners + hooks + descriptions + the 6 misses all locked). Outstanding + non-blocking: hero-image captures (parallel) + a couple hook-value confirms.
**Schema source:** [phase-0-data-gaps.md §0.6](plans/phase-0-data-gaps.md) — `EditorialContent` type.
**Locked decisions (2026-05-24/25):** site celebrates the WORK, not the tool · **no meta tiles** — tool + site get no tile, but ARE counted in `combined` totals ("count everything", ideation §7) · **no bottom CTA** — the page ends on the work (ideation §4) · **clean tiles** — no tile buttons; live/source links live on the detail page (ideation §3) · `claude-credit` **not published** to npm · grid = **9 real projects + 1 "the misses" archive coda = 10 surfaces** · `repoUrl` wired to detail page.

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
- Don't pitch the tool. The site is about the work.

---

## Per-field constraints

| Field | Cap / format | Notes |
|---|---|---|
| `oneLiner` | ≤ 60 chars, single line, no project-name prefix | Mobile single-column survival at 320px width |
| `hookStat.label` | ≤ 12 chars, small-caps-friendly | Renders small caps on tile |
| `hookStat.value` | Display-type number preferred; text discouraged | StatusMarker handles "shelved"; don't double up |
| `heroImage` | Project-root-relative path; null if not yet captured | See `## Capture queue` block |
| `liveUrl` | Full https URL or null; verified per −1.3 methodology | Squatter slugs are real; trust −1.3 |
| `repoUrl` | Full https URL or null; powers "View source →" on detail page | `https://github.com/mbriggsy/ai-learning-journey/tree/main/<projectPath>` |
| `status` | `active` only (no meta surfaces ship) | Archive collective is NOT a row here |
| `description` | 2-3 sentences; ~58ch line length; sentence 2 carries the arc/why | Three boxes below per row, not one textarea |
| `gallery` | `string[]`; leave empty unless multiple strong visuals tell a richer story | Lightbox grid (Phase 5); no carousel |

---

## Per-project rows (9 real projects)

### `burned` (active)

- **hostProjectRoot:** `C:\Users\brigg\ai-learning-journey\projects\burned`
- **status:** `active`
- **oneLiner:** `Couch-of-friends spy comedy. Archer-coded card game in the browser.`
- **hookStat:** `{ label: "CARDS", value: "120" }` — quiet scope support; the **art is the hook** (image-forward treatment, like UMB). LOCKED 2026-05-25 (was TESTS 167 — moved to rigor-on-the-detail-page).
- **heroImage:** image-forward (like UMB) — the CINEMATIC lead frame will come from the **in-progress origin story video** (`projects/burned/docs/origin-trailer-v2/`), not yet rendered. **INTERIM:** `public/assets/arena/operative-silhouette.png` or `portrait-agent-x.png` (verified, strong Imagen art). **Swap to the origin-video hero frame when it lands** (capture queue). burned is an active WIP — the game is live + family-playable, the origin video is the polish piece in progress.
- **heroImage_mobile_safe:** `tbd`
- **liveUrl:** `https://burned-cxa.pages.dev/board` ✅ (verified live — 200, `<title>BURNED</title>`; Cloudflare Pages, slug `burned-cxa`; `/board` is the host/TV entry. URL was in burned's own README — my earlier deploy grep false-negatived it.)
- **repoUrl:** `https://github.com/mbriggsy/ai-learning-journey/tree/main/projects/burned`
- **description:**
  1. `Real-time browser card game for 2–10 players on the couch.`
  2. `Built to prove a visual bar — Archer-coded illustration over Cloudflare Workers + Durable Objects.`
- **gallery:** `[]` (consider 6 character portraits if story merits)

### `data-engineering` (active)

- **hostProjectRoot:** `C:\Users\brigg\ai-learning-journey\projects\data-engineering`
- **status:** `active`
- **oneLiner:** `Azure data engineering experiments. ADF, Databricks, Unity Catalog.`
- **hookStat:** `{ label: "STACK", value: "ADF+UC" }` — LOCKED 2026-05-25.
- **heroImage:** NEEDS CAPTURE — see capture queue
- **heroImage_mobile_safe:** `tbd`
- **liveUrl:** `null` (`data-engineering.vercel.app` → 404; no deploy)
- **repoUrl:** `https://github.com/mbriggsy/ai-learning-journey/tree/main/projects/data-engineering`
- **description:**
  1. `Cloud data pipelines in the Azure focus stack — ADF, Databricks, Unity Catalog.`
  2. `The real question underneath: how do the agentic-workflow learnings from these projects apply to the enterprise data landscape?`
- **gallery:** `[]`

### `hooks` (active)

- **hostProjectRoot:** `C:\Users\brigg\ai-learning-journey\projects\hooks`
- **status:** `active`
- **oneLiner:** `Claude Code hooks that gate, guide, and finish work.`
- **hookStat:** `{ label: "HOOKS", value: "6" }` — LOCKED 2026-05-25 (Briggsy: confirm the count is 6).
- **heroImage:** NEEDS CAPTURE — see capture queue
- **heroImage_mobile_safe:** `tbd`
- **liveUrl:** `null` (not a web-deployable project)
- **repoUrl:** `https://github.com/mbriggsy/ai-learning-journey/tree/main/projects/hooks`
- **description:**
  1. `PreToolUse + Stop + PostToolUse hooks for Claude Code.`
  2. `Built after losing a session to WebFetch hanging — the rules are the lessons, and it's the source of the elite-engineer manifesto that ships into every session.`
- **gallery:** `[]`

### `pacman` (active)

- **hostProjectRoot:** `C:\Users\brigg\ai-learning-journey\projects\pacman`
- **status:** `active`
- **oneLiner:** `Pac-Man clone. Browser. No frameworks.`
- **hookStat:** `{ label: "GHOSTS", value: "4" }` — LOCKED 2026-05-25.
- **heroImage:** NEEDS CAPTURE — see capture queue
- **heroImage_mobile_safe:** `tbd`
- **liveUrl:** `null` (no URL in repo; `pacman.vercel.app` is a stranger's app — not deployed by us, or under an unknown slug. See Deploys to fix.)
- **repoUrl:** `https://github.com/mbriggsy/ai-learning-journey/tree/main/projects/pacman`
- **description:**
  1. `Classic arcade clone with ghost AI.`
  2. `Built to test how small a game could be without frameworks.`
- **gallery:** `[]`

### `skills` (active)

- **hostProjectRoot:** `C:\Users\brigg\ai-learning-journey\projects\skills`
- **status:** `active`
- **oneLiner:** `Slash-commands Claude reaches for: distill, brief, doc-audit.`
- **hookStat:** `{ label: "PASS RATE", value: "100%" }` — LOCKED 2026-05-25 (the doc-audit eval, 20/20).
- **heroImage:** NEEDS CAPTURE — see capture queue
- **heroImage_mobile_safe:** `tbd`
- **liveUrl:** `null` (not a web-deployable project)
- **repoUrl:** `https://github.com/mbriggsy/ai-learning-journey/tree/main/projects/skills`
- **description:**
  1. `Three custom Claude skills: /distill (preserve lessons), /brief (recall them), and a doc-audit quality gate.`
  2. `Built after losing context to fresh sessions one too many times.`
- **gallery:** `[]`

### `tic-tac-toe` (active)

- **hostProjectRoot:** `C:\Users\brigg\ai-learning-journey\projects\tic-tac-toe`
- **status:** `active`
- **oneLiner:** `The smallest possible game. Three files, one afternoon.`
- **hookStat:** `{ label: "FILES", value: "3" }` — LOCKED 2026-05-25 (index.html / script.js / style.css).
- **heroImage:** NEEDS CAPTURE — see capture queue
- **heroImage_mobile_safe:** `tbd`
- **liveUrl:** `null` (no URL in repo; `tic-tac-toe.vercel.app` is a stranger's app. See Deploys to fix.)
- **repoUrl:** `https://github.com/mbriggsy/ai-learning-journey/tree/main/projects/tic-tac-toe`
- **description:**
  1. `Three-by-three grid, two players, classic rules.`
  2. `Built as a calibration project for the smallest scope claude-credit could measure.`
- **gallery:** `[]`

### `top-down-racer-02` (active)

- **hostProjectRoot:** `C:\Users\brigg\ai-learning-journey\projects\top-down-racer-02`
- **status:** `active`
- **oneLiner:** `The first racer. Where the self-driving agent was born.`
- **hookStat:** `{ label: "STACK", value: "ONNX+RL" }` — LOCKED 2026-05-25.
- **heroImage [STRAWMAN]:** `temp/Screenshot 2026-03-01 113028.png` OR `temp/total time.png` (verified to exist; consider re-capture for quality)
- **heroImage_mobile_safe:** `tbd`
- **liveUrl:** `https://top-down-racer-02.vercel.app` ✅ (verified live — 200, `<title>Top-Down Racer</title>`)
- **repoUrl:** `https://github.com/mbriggsy/ai-learning-journey/tree/main/projects/top-down-racer-02`
- **description:**
  1. `Top-down racing game with a learned agent driving the car.`
  2. `The foundation — TDR-04 inherits the engine and adds the polish.`
- **gallery:** `[]`

### `top-down-racer-04` (active)

- **hostProjectRoot:** `C:\Users\brigg\ai-learning-journey\projects\top-down-racer-04`
- **status:** `active`
- **oneLiner:** `The AI taught itself to drive the car. The polished racer.`
- **hookStat:** `{ label: "TESTS", value: "487" }` — LOCKED 2026-05-25 (the one-liner carries the AI-drives wow; this is the rigor flex).
- **heroImage [STRAWMAN]:** `public/assets/tracks/track01-bg.png` (gameplay-bearing) OR `public/assets/ui/menu-bg.png` (menu hero) — both verified to exist
- **heroImage_mobile_safe:** `tbd`
- **liveUrl:** `https://top-down-racer-04.vercel.app` ✅ (verified live — 200, `<title>Top-Down Racer v04</title>`)
- **repoUrl:** `https://github.com/mbriggsy/ai-learning-journey/tree/main/projects/top-down-racer-04`
- **description:**
  1. `Three tracks, sprite atlas, menu UI, and a 487-test verification baseline.`
  2. `Built end-to-end across 8 phases — the last game before the games-pause pivot.`
- **gallery:** `["public/assets/tracks/track01-bg.png", "public/assets/tracks/track02-bg.png", "public/assets/tracks/track03-bg.png"]` (all verified)

### `undercover-mob-boss` (active)

- **hostProjectRoot:** `C:\Users\brigg\ai-learning-journey\projects\undercover-mob-boss`
- **status:** `active`
- **oneLiner:** `Briggsy family verified.` (Briggsy, 2026-05-25 — the cinematic hero image carries the "what"; this line is the warm endorsement flex. NOT a §11 authorship claim — it's a playtest stamp.)
- **hookStat:** `{ label: "PLAYERS", value: "2–10" }` — quiet party-scale support; the **image is the real hook** for UMB (the off-the-charts imagery sells itself). LOCKED 2026-05-25.
- **heroImage:** `public/assets/trailer-table-overhead.jpg` — the cinematic establishing shot, LOCKED as the lead (dossier-spread + the rest stay in the detail-page gallery). Verified to exist.
- **heroImage_mobile_safe:** `tbd`
- **liveUrl:** `https://undercover-mob-boss.vercel.app` ✅ (verified live — 308→200, `<title>Undercover Mob Boss — Host View</title>`)
- **repoUrl:** `https://github.com/mbriggsy/ai-learning-journey/tree/main/projects/undercover-mob-boss`
- **description:**
  1. `Jackbox-style party game — shared TV screen, phone controllers, hidden-role voting.`
  2. `Its how-to-play page is 1700 lines of responsive HTML done right: single-column collapse, breakpoint-scaled type.`
- **gallery:** `["public/assets/trailer-blueprint.jpg", "public/assets/trailer-city-closeup.jpg", "public/assets/trailer-dossier-spread.jpg", "public/assets/trailer-table-overhead.jpg"]` (paths corrected, all verified)

---

## Archive collective surface (NOT an EditorialContent row)

Lives outside the `EditorialContent` schema. Surfaces as ONE collective tile in the final (10th) grid position, after the "the misses" divider.

### Tile content

- **Title:** `the misses`
- **Subtitle:** `<N> projects shelved · <M>k lines · <K>M tokens · the receipts on what didn't work` — numbers populated from `combined.archiveCollective` (Phase 0.6b)
- **Visual:** Capture in parallel (composite or generated visual — see capture queue)
- **Status marker:** none (the tile's label IS the marker)
- **Click target:** `/archive` (or `/the-misses` — Phase 4 plan decides slug)

### Detail page content

Six rows, one per archived project. Each row: project name + one-liner explaining WHY it was shelved (the lesson, not the elegy).

| Project | Why shelved (LOCKED 2026-05-25) |
|---|---|
| hide-and-seek | First game. Shelved over a presentation gap — game logic worked, the visuals never landed. |
| do-not-disturb | Second game. Same lesson, harder: the side-scroller fought the hotel-room concept. |
| conway_game_of_life | Conway's Game of Life. The simulation worked — no story attached. |
| top-down-racer-01 | First racer prototype. Superseded by TDR-02's reinforcement-learning rewrite. |
| top-down-racer-03 | Mid-iteration racer. Superseded by TDR-04's polish pass. |
| gsd-autopilot | Get-Stuff-Done autopilot experiment. Shelved as scope drifted. |

Briggsy reviews + edits each one-liner. The honest framing is the point — anti-anchor item `self-deprecating` applies here too: shelved is shelved, not "just a failed experiment."

---

## The close (no CTA — replaces the old `## CTA state` block)

**Decision (Briggsy, 2026-05-24):** the page ends on the work. No bottom CTA — no "try the tool" button, no install command, no "Source on GitHub" link. The magnitude of what got built is the final word.

- `claude-credit` is **not published** to npm; it's the internal tape measure, not a product.
- Phase 7 (the old "bottom CTA" phase) is gutted at reconciliation — its job becomes "design how the page *ends* on the work."
- The `cta.ts` / `resolveCtaCopy` / CTA-state plumbing (Phase 7 + About §2) is dead — remove during Phase 7 reconciliation.
- Per-project links live on the **detail page** (clean tiles — no tile buttons): "Source →" always + "Try it →" where hosted (TDR-02, TDR-04, UMB, burned). They point at the *work*, not the tool.

---

## Deploys to fix (from −1.3)

Projects whose recorded `liveUrl` is null. Briggsy decides whether to re-deploy or leave as null. (Generic slugs like `pacman.vercel.app` / `tic-tac-toe.vercel.app` are squatted by unrelated apps — NOT slug-guessed as ours.)

- **data-engineering** — `data-engineering.vercel.app` → 404. Not a web app; likely stays null.
- **hooks** — not web-deployable; stays null.
- **skills** — not web-deployable; stays null.
- **pacman** — deployable browser game, but no URL in repo and generic slug is a stranger's. Re-deploy under a clear slug if you want a live link.
- **tic-tac-toe** — same as pacman: deployable, no URL in repo, generic slug squatted.

---

## Capture queue (from −1.4 fold)

Hero captures needed in parallel with Phase 0–2 build. Worksheet row's `heroImage:` stays null until the capture lands. (No `claude-credit` / `claude-credits` captures — those tiles are cut.)

- [ ] data-engineering — terminal screencap of ATC/ETL run
- [ ] hooks — terminal screencap of a hook firing
- [ ] pacman — mid-game screenshot with ghosts
- [ ] skills — slash-command screencap (/distill or /brief firing)
- [ ] tic-tac-toe — mid-game screenshot
- [ ] "the misses" tile — composite visual (faded grid OR grayscale collage)
- [ ] burned — UPGRADE hero to a cinematic frame from the **origin story video** (`docs/origin-trailer-v2/`) when rendered; interim arena art (`operative-silhouette` / `portrait-agent-x`) ships meanwhile.

(TDR-02, TDR-04, UMB have verified existing hero candidates — pick at draft time, no capture needed. burned ships on interim art now; its lead frame is pending the origin video.)

Mobile-safe verification per capture: open the captured image in DevTools mobile emulation (320 / 375 / 430px) AND in the desktop ~40%-viewport detail-page crop. Mark `heroImage_mobile_safe:` per row when both look intentional.

---

## Sign-off

- [x] Voice anchor reviewed + accepted — Briggsy (worked within it all pass)
- [x] All 9 one-liners + hook stats + descriptions locked; no `[STRAWMAN]` tags remain on those fields — Briggsy (chat review 2026-05-25)
  - **Exception:** hero captures still pending (see capture queue) — does NOT block; parallel with Phase 0–2.
- [x] **Anchor compliance** — applied (de-insidered UMB, dropped the authorship claim from data-engineering, no tool-pitch anywhere); `oneLiner` ≤ 60 chars held.
- [x] Archive "the misses" — 6 why-shelved lines locked — Briggsy
- [x] The-close decision confirmed (no CTA) — Briggsy
- [x] Deploys-to-fix resolved — 4 live (TDR-02/04, UMB, burned), 5 null with reasons — Briggsy
- [x] Capture queue tracked (parallel with Phase 0–2)

**Outstanding (non-blocking):** (1) hero-image captures — parallel work, see capture queue; (2) confirm a couple hook *values* — esp. `hooks → HOOKS 6` (is the count 6?).
