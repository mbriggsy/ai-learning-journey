# 004-vibe-falsify-intel-normal — Falsify Intel rearrange feels like a form, not espionage

**Severity (triage):** P2
**Status:** ✅ RESOLVED
**Resolution:** Falsify Intel design sprint shipped 2026-05-09 in `7c4b8f5d`. Tap-to-assign-number form replaced with a vertical `Reorder.Group` drag-to-reorder dossier UI — each slot renders the canonical `MinimalCard` (compact padding shifts the `@container (max-width: 114)` threshold so name chrome stays visible at smaller card sizes). Redact-stamp priority markers (01/TOP, 02/MID, 03/BOTTOM) overlay each card's bottom-right corner with alternating hand-stamped rotation. Full-bleed `BottomSheet` (new `tall` prop) so the dossier dominates as a briefing rather than reads as a modal. Single-tap enlarges to detail view with description visible (8px movement threshold discriminates tap from drag). "Commit File" CTA pinned at sheet bottom. Espionage tone delivered via vocabulary + drag affordance + redact stamps + dossier framing — closes the "business form, not intelligence briefing" gap. Implementation in `FalsifyIntelRearrange.tsx` behind a `lazy()` boundary so the ~27 KB `layout-*` chunk doesn't blow the player entry bundle budget; rearrange UI + drag/layout chunks prefetched at idle from `player/main.tsx`.
**Original disposition (pre-fix):** All three Falsify Intel rearrange UX vibe checks (#004, #005, #006) describe the same gap: the tap-to-order mechanic is functional but feels like a business form, not espionage. The substantive fix is a drag-to-reorder UI built around dossier vocabulary (e.g. case-file cards in a manila folder, drop-zones with intelligence-officer markup). That is multi-hour design + motion craft that needs eye-in-loop iteration on the phone — autonomous agents can ship "shape" but not "feel" for this kind of beat (per Briggsy's `feedback-eye-in-loop-beats-calibration-for-motion.md`). Tracking with #005, #006 as a single Falsify Intel rearrange redesign sprint. Engine + projection + #003 status-strip + #030 stale-pendingFuture clear are all already in place — the rearrange surface itself is what needs the cinematic pass.
**Seed kind:** vibe-check
**Source seats:** seat-1
**Linked scenarios:** FALSIFY-INTEL-NORMAL
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-05-08-2022-5p
**Candidate duplicate:** n/a

## Player-POV summary

> *Quoted from seat-1's suspicion log at 2026-05-09T00:38:55Z:*
> "The tap-to-order mechanic was functional and responsive, cards numbered off cleanly. However I couldn't see what the final arrangement LOOKED like from a cinematic angle — the '#1/#2/#3' labels are clear but there's no sense of the cards sliding into place physically. The peek itself had no dramatic weight — it was a business form, not an intelligence briefing."

> *Quoted from seat-1's suspicion log at 2026-05-09T00:38:58Z:*
> "The Falsify Intel dialog showed card names but the rearrange interaction used tap-to-assign-number. No drag-and-drop or visual reordering was present. Spec says 'drag/redact/commit espionage UI, not a list. Rearrange shows EXACTLY remaining card count with no ghost slots.' Got a list with numbered slots — investigating if drag was meant to be there."

Seat-1 played Falsify Intel as their first action on turn 1 and successfully rearranged the top 3 cards (Dash Barlowe, Janet Broadside, Burn the Files) before playing Back Channel. The mechanic worked — but the interaction model (tap to assign #1/#2/#3 number badges) read as a numbered-slot form rather than the "spy doctoring a classified folder" Archer moment the spec targets. The absence of any settling animation or physical reorder feedback compounded the flat tone.

## God-mode reality

From `server/events.jsonl` lines 1-3 (stateVersions 2-3):
- stateVersion 2 — `card-played` (`playerId: e9a5ccd7` / Seat1, `cardType: 'falsify-intel'`); nope window opens `remainingMs: 10000` (10s), `pendingPrompt: null` (rearrange prompt lands in next stateVersion after window resolves)
- stateVersion 3 — `nope-window-expired` (`windowGeneration: 1`); `remainingMs: 0`; all projections confirm `pendingPrompt: null` at this snapshot (rearrange subPhase activates on the subsequent state transition)

The server processed the falsify-intel play correctly: card left Seat1's hand (cardCount 8 → 7), nope window opened and expired without interception, and the seat log confirms the rearrange dialog appeared and the committed order was accepted (hand stayed at 7, draw pile stayed at 31, turn continued). No engine error. The god-mode confirms this is purely a UI/UX finding — the engine path through `applyAlterTheFuture` (`engine.ts:463-479`) and `handleFutureRearrange` (`engine.ts:817-857`) completed cleanly.

## Diagnosis

The interaction gap lives entirely in `src/client/player/sheets/FuturePeek.tsx`. The component implements a **tap-to-assign-number** model:

- `handleTap` (lines 22-28) appends a card ID to `tapOrder` on each successive tap.
- The badge label logic (lines 75-78) renders `Card 1` / `Card 2` / `Card 3` until tapped, then `#1` / `#2` / `#3` in tap sequence.
- The subtitle (line 54) reads "Tap cards in desired order — top card first."
- No drag affordance, no positional reordering animation, no physical rearrangement metaphor is present.

The scenario catalog (`docs/testing/playtest/SCENARIOS.md` lines 2268-2272) explicitly calls for: "ACTOR's phone: Falsify Intel overlay shows 3 cards with **drag-to-reorder affordance**. All 3 card illustrations legible. Submit button confirms the new order." The catalog vibe note (lines 2297-2300) states: "Falsify Intel IS the Archer act of a spy doctoring a folder. Does the UI render it with weight — drag, redact-marker, commit — or as a drag-drop list? Espionage tone required."

The tap-to-assign model satisfies the functional contract but delivers a numbered-form UX rather than a drag-espionage UX. The player's "business form, not an intelligence briefing" description is accurate. The interaction does not convey the spy-doctoring-a-folder metaphor the spec requires.

Severity held at P2: single seat reporting `unsure` (not `no`), Falsify Intel rearrange is not named as a top-tier dramatic beat in spec §8 (unlike burned→extracted or named-steal reveal). If a second seat reports `no` on this same moment it should be promoted to P1.

## Proposed fix paths

**Option A — Implement drag-to-reorder in FuturePeek (large / medium):** Replace the tap-to-assign model with a Framer Motion drag-reorder list on the 3 card slots. Each card is draggable; dropping it repositions the list order visually, then Confirm Order submits the final sequence. This is the "right" fix — matches the catalog spec and delivers the folder-doctoring metaphor. Risk: drag-and-drop on mobile touch requires careful `dragListener` + `reorder` implementation with Framer's `Reorder` component; ordering bugs and touch-drag feel are the main hazard. The existing `m` import discipline (LazyMotion strict mode) applies — use `m` and import `Reorder` from `framer-motion/dist/cjs/components/Reorder` or the `motion/react` barrel carefully.

**Option B — Add settling/spring animations to existing tap-to-assign (small / low):** Keep the tap model but add Framer Motion layout animations to the card slots. When a card is assigned #1, it animates to the top slot (physical reorder via `layout` prop); subsequent assignments cascade. The badge changes from `Card N` to `#N` with a stamp-style scale-pop (brief `scale: 1.2 → 1` on badge text). This does NOT introduce drag complexity but adds physical feedback that the order is being set, not just labelled. Lower implementation risk, lower cinematic payoff than Option A.

**Option C — Redesign sheet with classified-document visual skin (medium / medium):** Keep tap-to-assign interaction but reframe the visual metaphor: cards appear as dossier pages, assigning #1 stamps a "PRIORITY-1 / CLASSIFIED" marker over the card face (using a `::after` overlay with stamp-style typography), and the confirmation button becomes "FILE ORDER" instead of "Confirm Order." No drag required; the spy-doctoring metaphor is carried by the visual language rather than the physical gesture. Risk: requires CSS design work and copy pass; doesn't address the absence of physical movement the player noticed.

## Recommended next step

Pursue Option B as the immediate polish pass — it closes the "no sense of cards sliding into place" complaint with low risk — and backlog Option A (drag-to-reorder) as a follow-on once the simpler motion fix confirms the metaphor lands.

---

**Triage seed kind:** vibe-check
**Triage agent session:** 004-vibe-falsify-intel-normal
