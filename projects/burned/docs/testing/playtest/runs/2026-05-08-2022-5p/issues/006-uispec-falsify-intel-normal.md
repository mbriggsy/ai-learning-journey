# 006-uispec-falsify-intel-normal — Falsify Intel rearrange uses tap-to-order form, not drag/espionage UI

**Severity (triage):** P2
**Status:** ✅ RESOLVED
**Resolution:** Falsify Intel design sprint shipped 2026-05-09 in `7c4b8f5d`. Drag-to-reorder UI now matches the catalog spec call-out (`docs/testing/playtest/SCENARIOS.md:2268-2272` "drag-to-reorder affordance" + lines 2297-2300 vibe note "drag, redact-marker, commit"). `Reorder.Group` provides the drag affordance, redact-stamp priority markers (01/TOP, 02/MID, 03/BOTTOM) provide the redact-marker, "Commit File" CTA provides the commit verb. Column-2 ACTOR spec satisfied — no longer a divergence. See #004 for full sprint disposition. Implementation in `FalsifyIntelRearrange.tsx` behind a `lazy()` boundary to keep the ~27 KB `layout-*` chunk out of the always-loaded player entry.
**Original disposition (pre-fix):** Bundled with #004 + #005 as one Falsify Intel rearrange redesign sprint (drag-to-reorder UI, dossier vocabulary, motion). See #004 for full disposition.
**Seed kind:** ui-spec-divergence
**Source seats:** seat-1
**Linked scenarios:** FALSIFY-INTEL-NORMAL (catalog: SCN-FALSIFY-INTEL-NORMAL-01)
**Viewer role (if ui-spec-divergence):** ACTOR
**Session:** 2026-05-08-2022-5p
**Candidate duplicate:** n/a

## Player-POV summary

> *Quoted from seat-1's ui-spec-divergence entry at 2026-05-09T00:39:01Z:*
> "Tap-to-order list UI: cards shown as Card 1/Card 2/Card 3 slots, tap to assign #1/#2/#3 ordering. No drag-and-drop. No ghost slots observed (exactly 3 cards shown). The interaction model is a numbered-tap form, not a drag espionage panel."

> *Quoted from seat-1's vibe-check at 2026-05-09T00:38:55Z (feltLikeArcher: unsure):*
> "The tap-to-order mechanic was functional and responsive, cards numbered off cleanly. However I couldn't see what the final arrangement LOOKED like from a cinematic angle — the '#1/#2/#3' labels are clear but there's no sense of the cards sliding into place physically. The peek itself had no dramatic weight — it was a business form, not an intelligence briefing."

> *Quoted from seat-1's suspicion at 2026-05-09T00:38:58Z (severity: medium):*
> "The Falsify Intel dialog showed card names but the rearrange interaction used tap-to-assign-number. No drag-and-drop or visual reordering was present."

Seat-1 played Falsify Intel and reached the rearrange prompt. The rearrange UI rendered 3 cards with `Card 1`/`Card 2`/`Card 3` badges; tapping each card assigned it an ordinal (`#1`, `#2`, `#3`) in sequence. The interaction is mechanically correct and card count is exact (3 cards, no ghost slots). However the catalog Column 2 spec calls for a drag-to-reorder affordance with espionage chrome, and the seat rated the moment "unsure" on the Archer bar — describing it as a business form rather than a covert intelligence operation.

## God-mode reality

From `server/events.jsonl` line 5 (stateVersion 4), triggered by `nope-grace-expired` on windowGeneration 1:

- `card-played` — `playerId: e9a5ccd7` (Seat1), `cardType: 'falsify-intel'`
- `nope-window-resolved` — `cancelled: false`, `chainDepth: 0`
- Server state: `subPhase: 'future-rearrange-pending'`, `pendingPrompt: { type: 'future-rearrange', playerId: 'e9a5ccd7...', cardIds: [] }`
- ACTOR's projection: `pendingPrompt.cardIds: []` (correctly stripped per `projection.ts:185-192`); `myHand` length 7 (all types redacted by scrubber, expected)
- Board projection: `discard: [{ type: 'falsify-intel' }]`, `pendingPrompt.cardIds: []` (board also stripped)
- `privateData.futureCards` — absent from god-event snapshot (scrubber removes card-type-bearing fields; expected per scrubbed-field contract). Card count consistent with seat agent seeing 3 cards renders, confirming `privateData.futureCards` was populated correctly server-side.

The server is in exactly the correct state for SCN-FALSIFY-INTEL-NORMAL-01. Engine → projection path has no fault. The divergence is entirely at the UI presentation layer.

## Diagnosis

**Column 1 (projection):** Preserved and correct. `subPhase = 'future-rearrange-pending'`, `pendingPrompt.type = 'future-rearrange'`, `pendingPrompt.cardIds = []` (correctly stripped at `src/server/projection.ts:185-192` via `stripPrivatePromptFields`). The `privateData.futureCards` field is scrubbed from the god-event snapshot as expected (contains card-type identities); its population is confirmed indirectly by the seat agent seeing 3 cards in the UI. No projection bug.

**Column 2 (catalog spec):** `SCN-FALSIFY-INTEL-NORMAL-01` ui-assertions read: *"ACTOR's phone: Falsify Intel overlay shows 3 cards with drag-to-reorder affordance. All 3 card illustrations legible. Submit button confirms the new order."* The vibe-check prompt asks: *"Does the UI render it with weight — drag, redact-marker, commit — or as a drag-drop list? Espionage tone required."*

**Actual implementation (`src/client/player/sheets/FuturePeek.tsx`):** The rearrange flow uses a tap-to-assign-number model (`handleTap` at line 22 appends tapped card IDs to `tapOrder`). Cards render in a `peekScroll` container; each card's badge label is `Card ${i + 1}` before tapping and `#${orderIndex + 1}` after tapping (lines 76-78). There are no drag handles, no drag event listeners, and no espionage visual chrome (no redact markers, no dossier styling). The `canRearrange` path shows a `Clear` + `Confirm Order` button row. This is the complete interaction — a numbered tap form.

The `useActiveBottomSheet.ts:30-35` routing is correct: `case 'future-rearrange'` returns `{ sheet: 'future-peek', cards: futureCards ?? [], canRearrange: true }`. The issue is that `FuturePeek.tsx` implements tap-to-assign where the catalog spec intended drag-to-reorder.

The "no ghost slots" part of the agent observation matches expected behavior: `cards.map(...)` renders exactly the 3 cards from `privateData.futureCards`, with no phantom empty slots.

**Root cause:** The `FuturePeek` component was implemented with a tap-to-assign-number interaction model rather than the drag-to-reorder affordance the scenario catalog specifies. The card count display is correct; the interaction pattern and espionage chrome are absent. This is a product presentation gap — not a rule violation, not a privacy/projection leak, not a state corruption. The Archer bar is not met for this moment (rated "unsure" — "business form, not an intelligence briefing").

The vibe-check is `unsure` from a single seat, placing this at **P2** per rubric. The ui-spec-divergence entry (severity: medium) corroborates but does not upgrade; only 1 seat involved.

## Proposed fix paths

**Option A — Implement drag-to-reorder with espionage chrome (large / medium risk):** Replace `FuturePeek`'s tap model with a touch-compatible drag-to-reorder implementation. On mobile portrait, this requires pointer-event-based drag (either custom Framer Motion `drag` constraint on each `peekSlot`, or a library like `@dnd-kit/core`). Add espionage visual chrome: redact-marker slot indicators, Archer-vocabulary commit label ("Commit File Order" or "Lock Sequence"), a subtle card-slide animation when reorder commits. Update SCENARIOS.md Column 2 prose to reflect the shipped drag model. This fully closes both the ui-spec-divergence and the vibe-check gap. Risk: drag-and-drop on portrait phone is interaction-model complexity — needs thorough touch testing; @dnd-kit adds ~12-15KB gzipped to the player bundle (currently at 17.27KB — watch the 100KB budget). Framer Motion `drag` with reorder requires careful `layout` annotation to avoid reflash artifacts (see insights 015, 016).

**Option B — Layer espionage chrome on the existing tap model + update catalog prose (small / low risk):** Keep the tap-to-assign-number interaction (functional, responsive, no bundle cost). Add espionage visual treatment: rename badges from `Card 1`/`#1` to file-redaction language (e.g., `CLASSIFIED`/`SLOT 1`), add a CSS animation that slides the card visually into its assigned slot when tapped, rename the commit button to Archer-vocabulary ("Lock File Order" / "Commit Sequence"), and add a subtle "redacted stamp" overlay on assigned cards. Update SCENARIOS.md SCN-FALSIFY-INTEL-NORMAL-01 Column 2 prose to say "tap-to-assign with espionage chrome" rather than "drag-to-reorder," resolving the spec-detector divergence for future runs. This closes the vibe-check gap (adding cinematic weight to the tap) at a fraction of the drag implementation cost, and eliminates the false-positive spec divergence detection going forward. Main tradeoff: the physical "sliding into place" sensation the seat agent wanted requires drag; tap will still feel like form interaction even with chrome.

**Option C — Catalog prose update only; defer chrome to a later pass (tiny / low risk):** Update SCENARIOS.md SCN-FALSIFY-INTEL-NORMAL-01 Column 2 to reflect the tap model as intentional, removing the "drag-to-reorder" language. No code change. The vibe-check "unsure" (P2) from seat-1 remains tracked separately as product debt. This resolves the detector divergence signal so future playtests don't re-flag the same interaction, without committing engineering effort before Briggsy decides whether to pursue drag or polish-tap. Tradeoff: the Archer-bar gap is explicitly deferred, and the cinematic weight of this moment stays at "business form."

## Recommended next step

Take Option B — apply espionage chrome (slot language, slide animation, Archer-vocabulary commit button) to the existing `FuturePeek.tsx` tap model and update the SCN-FALSIFY-INTEL-NORMAL-01 Column 2 prose to match the intentional tap design, closing both the vibe-check gap and the spec-divergence detection in one small-scope pass.

---

**Triage seed kind:** ui-spec-divergence
**Triage agent session:** 006-uispec-falsify-intel-normal
