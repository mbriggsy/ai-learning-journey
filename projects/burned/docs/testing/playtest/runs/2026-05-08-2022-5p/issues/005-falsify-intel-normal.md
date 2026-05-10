# 005-falsify-intel-normal — Falsify Intel rearrange UI is a tap-number form, not an espionage-weighted cinematic panel

**Severity (triage):** P2
**Status:** ✅ RESOLVED
**Resolution:** Falsify Intel design sprint shipped 2026-05-09 in `7c4b8f5d`. Tap-to-assign-number form replaced with a `Reorder.Group` drag-to-reorder dossier UI — each slot renders the canonical `MinimalCard`, redact-stamp priority markers (01/TOP, 02/MID, 03/BOTTOM) overlay with alternating hand-stamped rotation, full-bleed `BottomSheet` (`tall` prop), single-tap enlarges to detail view, "Commit File" CTA. Cinematic panel delivered via drag affordance + dossier framing + redact stamps — closes the espionage-weighted-cinematic-panel gap. See #004 for full sprint disposition. Implementation in `FalsifyIntelRearrange.tsx` behind a `lazy()` boundary to keep the ~27 KB `layout-*` chunk out of the always-loaded player entry.
**Original disposition (pre-fix):** Bundled with #004 + #006 as one Falsify Intel rearrange redesign sprint (drag-to-reorder UI, dossier vocabulary, motion). See #004 for full disposition.
**Seed kind:** scripted-scenario
**Source seats:** seat-1
**Linked scenarios:** FALSIFY-INTEL-NORMAL (SCN-FALSIFY-INTEL-NORMAL-01)
**Viewer role (if ui-spec-divergence):** ACTOR
**Session:** 2026-05-08-2022-5p
**Candidate duplicate:** n/a

## Player-POV summary

> *Quoted from seat-1's suspicion log at 2026-05-09T00:38:55Z:*
> "The tap-to-order mechanic was functional and responsive, cards numbered off cleanly. However I couldn't see what the final arrangement LOOKED like from a cinematic angle — the '#1/#2/#3' labels are clear but there's no sense of the cards sliding into place physically. The peek itself had no dramatic weight — it was a business form, not an intelligence briefing."

> *Quoted from seat-1's ui-spec-divergence entry at 2026-05-09T00:39:01Z:*
> "Tap-to-order list UI: cards shown as Card 1/Card 2/Card 3 slots, tap to assign #1/#2/#3 ordering. No drag-and-drop. No ghost slots observed (exactly 3 cards shown). The interaction model is a numbered-tap form, not a drag espionage panel."

The ACTOR (Seat1) played Falsify Intel, passed the nope window, and received the rearrange prompt. The mechanic resolved correctly — 3 cards appeared, an order was assigned, and the scenario fired. However, the interaction model delivered was a tap-to-number list (tap card to assign it position #1/#2/#3, then "Confirm Order"), whereas the scenario catalog Column 2 for ACTOR describes a "drag/redact/commit espionage UI, not a list." The player experienced this as a functional business form rather than a spy-doctoring-a-file cinematic moment.

## God-mode reality

From `server/events.jsonl` lines 1-4 (stateVersions 2-4):
- stateVersion 2, nowMs 1778287063700 — `card-played` (playerId: e9a5ccd7... = Seat1, cardType: `falsify-intel`). Nope window opened (10 000ms, generation 1). Seat1 hand drops 8 → 7. `subPhase: 'turn-active'`, `pendingPrompt: null`.
- stateVersion 3, nowMs 1778287073714 — `nope-window-expired` action (server). Events list still shows only card-played; `subPhase: 'turn-active'` still in effect, `nopeWindow.remainingMs: 0`. Nope-grace not yet resolved.
- stateVersion 4, nowMs 1778287074016 — `nope-grace-expired` action triggers `nope-window-resolved { cancelled: false, chainDepth: 0 }`. `subPhase` flips to `'future-rearrange-pending'`. `pendingPrompt: { type: 'future-rearrange', playerId: e9a5ccd7..., cardIds: [] }` for all viewers. Board view preserves `cardIds: []` (strip confirmed). ACTOR's `private` key carries `futureCards` (3 cards) via `getPrivateData()` at `room.ts:1154` — this field is NOT in the god-log projections by design (it is sent on the separate `player-update.payload.private` channel).

The server executed the scenario correctly: card-played → nope window → nope-grace-expired → future-rearrange-pending. Private card data was sent exclusively to the ACTOR via the `private` key in the `player-update` message. No projection leak to board or other players (cardIds stripped at `projection.ts:187-192`). The mechanical path is clean.

## Diagnosis

This is a UI implementation gap vs. the scenario catalog's Column 2 specification — not an engine bug and not a projection error.

**What the catalog says (Column 2, ACTOR row, SCN-FALSIFY-INTEL-NORMAL-01):** "ACTOR sees drag/redact/commit espionage UI, not a list. Rearrange shows EXACTLY remaining card count with no ghost slots."

**What the implemented UI delivers (`src/client/player/sheets/FuturePeek.tsx`):** A tap-to-assign-number form. Cards are rendered in a scrollable list (`styles.peekScroll`). Each card occupies a `peekSlot`. Tapping card N assigns it the next sequential badge (#1, #2, #3 in tap order). Cards do not physically reorder on screen — only the badge label updates. A "Clear" button resets the selection; "Confirm Order" submits when all cards are assigned. Title reads "Falsify Intel" with subtitle "Tap cards in desired order — top card first." No drag affordance, no redact-marker styling, no physical card-slide animation.

The interaction works mechanically: `onRearrange` receives the correct ordered `string[]` of card IDs and dispatches `{ type: 'future-rearrange', order }` to the server (`Player.tsx:481`). The server resolves this via `handleFutureRearrange` at `engine.ts:817-857`. End-to-end functional.

The gap is at the cinematic-weight layer: the Column 2 prose describes an aspirational Archer-tone "spy doctoring a folder" experience. The current implementation is pragmatic mobile-first tap-number interaction. The `privateData.futureCards` population path is correct (`projection.ts:102-112`, written before `notify()` at `gameStore.ts:140`); the write-order comment at `gameStore.ts:133-139` documents a previously fixed bug where `futureCards` arrived after `notify()` and the sheet briefly showed 0 cards.

The vibe-check verdict is `unsure` (not `no`) from a single seat, confirming the interaction is legible but not cinematic. Bias-up note: if this scenario produces `unsure` or `no` vibe-checks across multiple seats in future sessions, promote to P1 against the §2 Quality Bar ("Could this be a frame from an Archer episode?").

## Proposed fix paths

**Option A — Add Framer Motion drag-to-reorder to FuturePeek (medium / medium):** Replace the tap-to-number model with a physical drag-and-drop reorder list using Framer Motion's `Reorder` component (part of the existing `domMax` feature set, already lazy-loaded). Cards would animate to new positions on drop; the visual result matches "drag/redact/commit" Column 2 intent. The `onRearrange(order: string[])` interface is already compatible — no server changes needed. Risk: touch-drag disambiguation on phone viewports (drag vs scroll vs tap) requires careful pointer event management; the 360x640 minimum viewport constraint means card slots are compact. Testing on actual device required. Bundle impact: `Reorder` is already in the `domMax` chunk, so no new lazy-load boundary.

**Option B — Keep tap-to-number, add cinematic animation and spy-vocabulary framing (small / low):** Retain the tap-to-assign interaction model (mobile-safe, already functional) but layer on Archer-tone polish: (1) when a card is tapped and assigned, animate a number-stamp badge with a `scale(0 → 1)` or ink-stamp keyframe instead of plain text swap; (2) cards in assigned-order position could use a Framer Motion `layout` transition so they visually "slide" into a new stacked reading order below the title; (3) replace the title/subtitle with "// REDACTING FILE" spy vocabulary and a "COMMIT ORDER" CTA instead of "Confirm Order." This approach is low-risk for mobile touch, avoids drag disambiguation, and brings cinematic weight without restructuring the interaction model. The Column 2 prose would need to be updated to describe this model accurately.

**Option C — Align Column 2 prose to current implementation, no code change (tiny / low):** If Briggsy decides the tap-to-number model IS the intended interaction for mobile (given drag-on-phone UX risk), update `SCENARIOS.md` SCN-FALSIFY-INTEL-NORMAL-01 Column 2 ACTOR row to accurately describe the tap-to-number model and note which Archer-tone elements remain aspirational. This closes the ui-spec-divergence signal cleanly with no risk. Tradeoff: the §2 "Could this be a frame from an Archer episode?" bar may still be unmet on the cinematic-weight axis — a pure prose update without any polish work delays the quality gap rather than resolving it.

## Recommended next step

Option B delivers the highest Archer-tone return per unit of effort — it keeps the mobile-safe tap model while adding the stamp animation and spy-vocabulary framing that close the gap between the catalog Column 2 description and the player experience.

---

**Triage seed kind:** scripted-scenario
**Triage agent session:** 005-falsify-intel-normal
