# Card-Art Curation (Phase 3 Unit 3.2)

Per-card selection rationale for the 17 BURNED card-art webps at
`public/assets/cards/`. Source of truth for trailer roles is
`videos/trailer/src/lib/card-roster.ts`; cascade halo geometry is in
`cascade-halo-column.json`. This doc explains the WHY.

## Curation contract

- **No new Imagen runs.** All 17 webps already shipped during BURNED
  card-art generation (`feedback-imagen-budget.md`).
- **No file copies, no symlinks.** Phase 4 reads via
  `staticFile('assets/cards/<filename>')` through Phase 0 ADR #8
  `setPublicDir('../../public')`.
- **Otto has no card art** (roster-only per spec §1) — Phase 4
  composes a 7th S03 slot from `public/assets/arena/portrait-otto.png`
  with classification chrome ("RESEARCH BUDGET" treatment via vendored
  `ClassificationBanner.tsx`). Phase 3 ensures both asset surfaces
  exist; the composition decision lives in Phase 4.
- **Dolores Grieves has no separate card** — she's the figure depicted
  on the `intercepted.webp` artwork (per
  `project-burned-dolores-grieves` memory). No separate slide-in
  role.

## S01 cold-open card flash trio

Three operative cards flash in S01 (frames 0–210) to seed cast density
before the briefing-room sequence:

| Frames | Operative | Why |
|---|---|---|
| 30–90 | **Janet Broadside** | Cold-open speaker (Phase 0 EXIT §2 lock — voice ID `2qQJWjw5XdG80GreshqG`, Eleanor matriarch-tuned). Vera/Sable were alternate candidates during Phase 0 deepening; Phase 0 close narrowed to Janet. They retain S03 + cascade-halo roles but NOT the cold-open flash. |
| 90–150 | **Dash Barlowe** | The briefer — narrator portrait. Carries through S02/S03. |
| 150–210 | **Neal Proctor** | Default 3rd pick per plan Step 3 — maximum visual DNA distinctness against Janet (silver hair) + Dash (mid-tone hair). Neal's sandy thinning hair + anxious-bureaucrat composition reads as a third type without overlapping either anchor. Phase 4 may override at composite review if a different operative reads cleaner in S01 motion. |

Agent X with REDACTED-bar overlay was considered for the 3rd slot but
its wild-card narrative is better held for S03 roster reveal (where
the redaction tells the "rival agency" story explicitly).

## S03 roster reveal (frames 750–1050)

Six operative card-arts slide in from the right edge, mapped to the
narration *"Seven on the roster. Six in the deck. One on the research
budget. Don't ask."*

- **Dash Barlowe** — slot 1
- **Vera Khan** — slot 2
- **Sable Ashworth** — slot 3
- **Janet Broadside** — slot 4
- **Neal Proctor** — slot 5
- **Agent X** — slot 6, with `RedactBar.tsx` overlay (vendored at
  Unit 3.0). Face obscured per wild-card narrative.

**Otto's exclusion is the joke.** Phase 4 composes a 7th visual slot
with classification-style chrome (`ClassificationBanner.tsx` red-tone
or heavy redaction over `arena/portrait-otto.png`) — the joke needs
SOMETHING in slot 7, just not Otto's face. Phase 3 ensures both asset
surfaces are available; Phase 4 picks the treatment.

## S04 cascade halo (frames 1560–1572)

Right-edge column at x=1560–1880, 40% opacity throughout. Same 6
operatives as S03 roster reveal. Geometry locked in
`cascade-halo-column.json`.

**Why operatives, not action cards:** the cascade payoff at frame
1950 ("They WERE the operation.") needs the right-edge halo to be the
visual antecedent of *"they."* Operative portraits in the column
establish *"they = the team"* before the VO lands. Action cards in
the column would point at game mechanics instead, weakening the
payoff's emotional landing.

**Why 6 cards, not 17:** Phase 1 Unit 1.5 Step 2 storyboard lock — the
17-card 360° mosaic was the pre-deepening AI-slop shape Phase 1
designed the lock to prevent. *"Sequential revelation with focal
hierarchy, NOT layered-simultaneous"* — the 1950 stamp-slap is the
trailer's only "everything at once" moment. The 6-card column reads as
texture beneath the cascade chrome, not as a competing focal element.

**Filename note:** the JSON ships as `cascade-halo-column.json`, NOT
`cascade-ring-layout.json` (the legacy name from the pre-deepening
ring concept). A file named "ring-layout" that ships column geometry
is a code smell — the next reader trusts the filename first and the
shape second. Renamed at Phase 3 close to match the actual geometry.

## Action cards (11)

`back-channel`, `burn-the-files`, `burned`, `call-in-a-favor`,
`direct-order`, `extraction`, `falsify-intel`, `go-dark`,
`intel-briefing`, `intercepted`, `reassign`.

These have `roles: []` in `card-roster.ts` — no fixed surface. Phase
4 may sample them from `cascade-halo-column.json#offscreenVarietyPool`
for one-frame cold-open flashes or other ad-hoc compositions.

Two action cards carry `tier: 'hero'` so Phase 4 can elevate them
when their narrative weight matters:

- **`burn-the-files.webp`** — mechanic-namesake card. The trailer is
  themed around the BURN-THE-FILES action; this artwork can land as
  an inset on payoff stamps if Phase 4 wants the weight.
- **`burned.webp`** — game-namesake card (the lose-condition card the
  game is named for). Phase 4 may elevate at S05 scream beat or
  payoff inset.

All other action cards carry `tier: 'texture'` — they're available
for variety pool sampling but Phase 4 should not elevate them above
the operatives or chrome.

## Drift gates

`card-roster.test.ts` ships three invariants:

1. **Roster → disk presence.** Every `CARD_ROSTER[i].filename` exists
   at `public/assets/cards/<filename>`. Catches removal/rename
   regressions.
2. **Disk → roster presence.** Every `*.webp` at
   `public/assets/cards/` appears in `CARD_ROSTER`. Catches BURNED
   adding new card art the trailer didn't notice (insight #027
   presence-companion).
3. **Roster ↔ cascade-halo-column.json bidirectional.** The JSON's
   `entries[].filename` + `offscreenVarietyPool.cards` together equal
   the exact 17-card set from `CARD_ROSTER`. Catches drift between
   the two declarations of the same logical set (insight #063
   sync-pair-declarations corrective).

Run via `pnpm test` from `videos/trailer/`. CI gate.

## Maintenance ritual

If BURNED adds a new card-art:

1. `card-roster.test.ts` fails on the "disk → roster" check at next
   CI run.
2. Add entry to `CARD_ROSTER` in `card-roster.ts` with appropriate
   `type` / `roles` / `tier`. Default to `roles: []` and
   `tier: 'texture'` for a new action card; consult Phase 1 lock for
   role assignments if the new card has trailer-visible weight.
3. If the new card belongs in the cascade halo or variety pool,
   update `cascade-halo-column.json` (add to `entries` if it
   replaces an operative slot, or to `offscreenVarietyPool.cards`
   otherwise).
4. Update this doc's relevant section with the rationale.
5. Re-run `pnpm test` — all three invariants green.

If BURNED removes a card-art:

1. `card-roster.test.ts` fails on the "roster → disk" check.
2. Remove the entry from `CARD_ROSTER` AND from any role/pool
   reference in `cascade-halo-column.json`.
3. Verify no Phase 4 scene imported the removed card (typecheck
   would catch this at the import site, but a grep through `src/`
   is the cheap belt-and-suspenders check).
