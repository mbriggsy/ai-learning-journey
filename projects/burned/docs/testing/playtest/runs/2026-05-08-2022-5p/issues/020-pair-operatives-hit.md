# 020-pair-operatives-hit — StealReport shows card name only; no card art rendered for either principal

**Severity (triage):** P2
**Status:** 🔴 OPEN
**Seed kind:** scripted-scenario
**Source seats:** seat-1
**Linked scenarios:** PAIR-OPERATIVES-HIT (SCN-PAIR-OPERATIVES-HIT-01)
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-05-08-2022-5p
**Candidate duplicate:** n/a

## Player-POV summary

> *Quoted from seat-1's suspicion log at 2026-05-09T00:47:28Z:*
> "Steal report showed card name (Neal Proctor) specifically — good. No card art visible in the alertdialog from this TARGET perspective. ACTOR perspective unknown."

> *Quoted from seat-1's vibe-check at 2026-05-09T00:47:25Z (feltLikeArcher: yes):*
> "The alert dialog said 'Operative Seat3 has lifted // Asset Neal Proctor from your burn bag.' — spy vocabulary ('lifted', 'burn bag', '// Asset'), case file framing ('Case 47-B'), and the 'Eyes Only · M.' signature created a cinematic beat. The stolen card name was specific. Felt like a proper debriefing moment."

The steal resolved cleanly and the Incident Report dialog landed with correct spy vocabulary. Seat1 (TARGET) confirmed the card name was specific and the moment read as cinematic — vibe-check passed. The one open observation: no card illustration appeared in the `// Asset` section of the dialog, from the TARGET side. ACTOR perspective was not observed during the session.

## God-mode reality

From `server/events.jsonl` line 20 (stateVersion 20, nowMs 1778287635828):

- `card-played` — playerId: Seat3 (`16916130-adfe-4ed8-a896-4e05ffc2740f`), cardType: `sable-ashworth`, comboSize: 2
- `nope-window-resolved` — cancelled: false, chainDepth: 0
- `combo-steal` — stealerId: Seat3, targetId: Seat1 (`e9a5ccd7-6150-4dbd-8c4f-1989df7d5af4`), found: true, cardType: `neal-proctor`

Projection at stateVersion 20:
- **Seat1 (TARGET)**: `events[combo-steal].cardType = "neal-proctor"` — PRESENT. Correct per `projection.ts:229-231` (viewer === targetId is allowed).
- **Seat3 (ACTOR)**: `events[combo-steal].cardType = "neal-proctor"` — PRESENT. Correct (viewer === stealerId).
- **Seat2, Seat4, Seat5, boardView**: `events[combo-steal]` has no `cardType` field — correctly stripped by `stripPrivateEventFields` at `projection.ts:224-236`.
- Seat1's `cardCount` dropped from 7 → 6, confirming the transfer. Hand at stateVersion 20 shows 6 cards (was 8 at game-start, 7 after prior plays).

The engine, nope-window resolution, and projection privacy boundary all executed correctly. The `cardType` data was correctly available to both principals.

## Diagnosis

The StealReport component (`src/client/player/StealReport.tsx`) renders a text-only Incident Report dialog. The `// Asset` section (lines 217-220) renders `cardName` as a text span (`styles.cardName`) but includes no card illustration or image element. This is consistent across ALL viewer roles — neither ACTOR nor TARGET receives card art in the StealReport dialog.

The scenario spec (SCN-PAIR-OPERATIVES-HIT-01, `ui-assertions`) explicitly requires:
- ACTOR: "StealReport surfaces the stolen card's art + name ('you took Go Dark from TARGET')"
- TARGET: "StealReport surfaces what left ('TARGET took your Go Dark')"

The ACTOR assertion says "art + name." The TARGET assertion implies name specificity. Neither is currently delivered with card art.

The data required to render art IS present in both principals' projections: `event.cardType` survives `stripPrivateEventFields` for viewer === stealerId and viewer === targetId. `CARD_DEF_BY_TYPE` is already imported in `StealReport.tsx` (line 10) and used to derive `cardName` from `cardType`. The lookup infrastructure for card art is already in place; it simply isn't rendered in the JSX.

The seat's vibe-check was `yes` — the text-only Incident Report was still cinematic enough to pass the Archer quality bar on this play. The gap is polish (P2), not a rules violation, privacy leak, or mechanical breakage.

The `cardType` field is correctly populated in the `Report` interface (line 23: `readonly cardType: CardType | null`) and set at line 45 for the `lifted` case. The path from data to render exists; the render step just stops at the text label rather than also showing an illustration.

## Proposed fix paths

**Option A — Add card illustration to `styles.cardFrame` in StealReport (small / low):** Inside the existing `styles.cardFrame` div, conditionally render a card image element when `current.cardType` is non-null. The card def lookup (`CARD_DEF_BY_TYPE`) is already imported. Add an `<img>` or the project's card illustration component beneath the `// Asset` label, sized appropriately within the paper layout. No engine or projection changes required. Risk is low — the `cardType` field is reliably present for both principals' `lifted` reports, and `null`-guarding is already established. CSS adjustment to `styles.cardFrame` likely needed to accommodate the illustration dimensions within the paper.

**Option B — Treat text-only as intentional UX design; add a spec note (tiny / no risk):** The Incident Report intentionally reads as a classified text dispatch — dossier aesthetic, not a card-game UI. The spy-fiction tone is served by the terse "// Asset Neal Proctor" label without visual card chrome. Update the scenario spec's `ui-assertions` to clarify "card name" rather than "card art + name," and document the deliberate separation between the StealReport format (text dispatch) and the Hand/StagingArea format (card art). No code changes. Risk: future iterations that DO want art would need to re-open this.

**Option C — Add card art AND a brief reveal animation to the asset section (medium / medium):** Show the illustration with a brief flip-in or fade-in animation timed to land as the paper settles. This makes the "what they took" moment more cinematic — Archer-style "here's the dossier photo" reveal. Risk: adds motion complexity; must be gated through `MOTION` tokens and tested against the existing paper slam-in animation (translateY/rotate/scale). Also needs the drama-active gate (`useDramaActive()`) already present in the component — the reveal animation should not race the BURNED → EXTRACTED sequence.

## Recommended next step

Confirm design intent with Briggsy — if the Incident Report is deliberately a text-only classified dispatch (Option B), close this as by-design; if card art is wanted (consistent with the spec's "art + name" ACTOR assertion), implement Option A as the smallest-scope fix.

---

**Triage seed kind:** scripted-scenario
**Triage agent session:** playtest-triage/020-pair-operatives-hit
