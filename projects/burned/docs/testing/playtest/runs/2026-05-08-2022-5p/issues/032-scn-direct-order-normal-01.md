# 032-scn-direct-order-normal-01 — Direct Order target not surfaced to observers during nope window; actor dialog title uses Reassign language

**Severity (triage):** P2
**Status:** 🔴 OPEN
**Seed kind:** scripted-scenario
**Source seats:** seat-2
**Linked scenarios:** SCN-DIRECT-ORDER-NORMAL-01
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-05-08-2022-5p
**Candidate duplicate:** n/a

## Player-POV summary

> *Quoted from seat-2's scenario-fire log at 2026-05-09T00:59:49Z:*
> "Seat5 played Direct Order. Toast: 'Seat5 played Direct Order.' Nope window: 'Intercept window · 1s' (disabled — no Intercepted cards). Window expired. Seat4 becomes 'on deck'. Pile still at 27."
> "Direct Order appears to redirect who goes next without drawing (or Seat5 drew separately). Seat4 now up without Seat5 having drawn."

Seat-2 (OTHER alive) observed Seat5 play Direct Order and saw the nope window fire and resolve with Seat4 taking the next turn. The toast identified the card name but not the target, and seat-2 was left to infer the target from observing which player became "on deck" after the nope window expired. Seat-2 raised no vibe-check failure but the scenario catalog's explicit requirement — that Direct Order feel "personal" and observers know "ACTOR picked TARGET on purpose" — was not met during the window.

A secondary signal comes from the ACTOR's seat (seat-5, SCN-DIRECT-ORDER-ACTOR log at 2026-05-09T00:59:09Z): the target-selection dialog was titled "Choose who to reassign to" — borrowing Reassign's vocabulary, which directly undermines the card's distinct identity.

## God-mode reality

From `server/events.jsonl` lines 42–43:

- stateVersion 42, nowMs 1778288380374 — `card-played` (`playerId: ac7b6e52 [Seat5]`, `cardType: "direct-order"`) — nope window open (`generation: 13`, `remainingMs: 0` at snapshot). No `targetId` present in the event.
- stateVersion 42 (Seat2 projection) — `currentTurn: { currentPlayerId: ac7b6e52, turnsRemaining: 1 }`, `nopeWindow: { remainingMs: 0, chainDepth: 0, generation: 13 }` — target identity NOT visible in any projection field.
- stateVersion 43, nowMs 1778288380678 — `nope-grace-expired` action. Events added: `nope-window-resolved { cancelled: false, chainDepth: 0 }`, `turn-started { playerId: 22a6a8fd [Seat4], turnsRemaining: 2 }`. All projections update to `currentTurn: { currentPlayerId: 22a6a8fd, turnsRemaining: 2 }`.

The fire signature for SCN-DIRECT-ORDER-NORMAL-01 is fully satisfied: `card-played(direct-order)` + `nope-window-resolved(cancelled:false)` + `turn-started(Seat4, turnsRemaining:2)`. The engine formula `(turnsRemaining - 1) + 2 = (1 - 1) + 2 = 2` is correct per `engine.ts:410`. The mechanical outcome is clean. The gap is that the target identity is visible to no one (including the Seat2 projection) until `turn-started` fires — after the nope window has already closed.

## Diagnosis

Two coupled findings, both P2:

**Finding 1 — `card-played` event carries no `targetId` for targeted cards.**
`src/shared/types.ts:32` defines the `card-played` GameEvent as:
```
{ type: 'card-played'; playerId: string; cardType: CardType; comboSize?: number }
```
There is no `targetId` field — optional or otherwise. In `src/server/game/engine.ts:322-324`, `handleSingleCard` emits this event before opening the nope window:
```typescript
const events: GameEvent[] = [
  { type: 'card-played', playerId: action.playerId, cardType: card.type },
]
```
`action.targetPlayerId` is available at this point (it is passed through to `createNopeWindow` at `engine.ts:329` and ultimately consumed by `applyTargetedAttack` at `engine.ts:391-422`), but is not emitted in the public event. Consequently, from the moment the `card-played` event fires until `turn-started` fires after the nope window resolves, NO player (actor or observer) can see who was targeted from the event stream or any projection field. The scenario catalog Column 2 for OTHER (alive) requires: "Narrative: 'ACTOR picked TARGET on purpose.'" — this narrative cannot be surfaced until after the nope window closes, and it is only implicit (inferred from which player `turn-started` names), never explicit.

Compare: `favor-requested` at `src/shared/types.ts:40` carries `{ requesterId, targetId }` — clients know the favor target immediately and can display "Seat2 is calling in a favor from Seat3" during the nope window. Direct Order has no equivalent.

**Finding 2 — Actor target-selection dialog title uses Reassign's vocabulary.**
Seat-5 (ACTOR) observed the target-picker dialog labeled "Choose who to reassign to." The scenario catalog's vibe check for SCN-DIRECT-ORDER-NORMAL-01 explicitly asks: "Does Direct Order feel personal in a way Reassign doesn't?" Using the word "reassign" in the Direct Order dialog directly inverts this requirement. The UI string is almost certainly a copy-paste from Reassign's target-picker sheet and was never updated for Direct Order's distinct identity. The relevant client component is the target-selection sheet, likely in `src/client/player/` (TargetSelect or similar). No source read performed — finding is based on the observed dialog text.

## Proposed fix paths

**Option A — Add `targetId?: string` to `card-played` event type and emit it for `direct-order` (small / low):** Extend `src/shared/types.ts:32` with an optional `targetId` field on `card-played`. In `engine.ts:322-324`, conditionally include `targetId: action.targetPlayerId` when the card being played has a target (i.e., when `action.targetPlayerId` is set). Client toast handlers then have access to the target name during the nope window and can display "Seat5 played Direct Order — targeting Seat4." This addresses Finding 1 completely and is additive and backwards-compatible. Bundle with a fix to the actor dialog title string (Finding 2) in the same pass. Tradeoff: requires a protocol minor bump per CLAUDE.md convention if `card-played` is considered a breaking shape change (technically additive, so may not require bump — Briggsy to decide).

**Option B — Emit a dedicated `targeted-attack-resolved` event after `nope-window-resolved` for `direct-order` and `reassign` (small-medium / low-medium):** Rather than enriching `card-played`, add a new GameEvent type `{ type: 'targeted-attack-resolved'; actorId: string; targetId: string; turnsAssigned: number }` emitted from `applyTargetedAttack` alongside `turn-started`. This is semantically cleaner — a separate event for the resolution moment — and avoids retrofitting `card-played`. However, it still does not surface the target DURING the nope window (observers only learn the target when the nope window resolves), so it does not fully close the narrative gap. It does fix the toast framing at resolution time. Also requires client update to consume the new event. Tradeoff: higher complexity, and the during-window gap remains.

**Option C — Fix only the actor dialog title string for Direct Order (tiny / low):** Change the target-picker sheet title from "Choose who to reassign to" to "Choose who to direct" (or "Select your target operative") in the relevant client component. This is a one-line string fix that addresses Finding 2 without touching the protocol at all. It does not address Finding 1 (observer info gap during nope window). Appropriate as a standalone fix if Finding 1 is deferred to a later polish pass.

## Recommended next step

Take Option A to close Finding 1 (add optional `targetId` to `card-played`, emit it for targeted cards), and bundle the dialog title string fix from Option C in the same commit — they are independent changes but share a logical scope (Direct Order narrative distinctiveness).

---

**Triage seed kind:** scripted-scenario
**Triage agent session:** 032-scn-direct-order-normal-01
