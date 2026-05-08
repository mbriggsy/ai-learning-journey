# 012-scn-go-dark-normal-01 — Go Dark ACTOR phone missing drama beat — play feels mechanical, not cinematic

**Severity (triage):** P2
**Status:** 🔴 OPEN
**Seed kind:** scripted-scenario
**Source seats:** seat-3
**Linked scenarios:** SCN-GO-DARK-NORMAL-01
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-04-29-2139-3p
**Candidate duplicate:** SCN-GO-DARK-NORMAL-01 — catalog entry shows `known-product-call: none`; clusterer candidate `(linked: B-04)` is a false-positive (B-04 = defuse-pending + disconnect, unrelated to Go Dark). Not a confirmed known product call — full diagnosis follows.

## Player-POV summary

> *Quoted from seat-3's vibe-check log at 2026-04-30T02:01:05Z:*
> "The turn skipped drawing cleanly and transitioned correctly, but from my vantage as ACTOR there was no visible drama beat, banner, or cinematic framing around the play. The card illustration itself is atmospheric (shadowy figure with venetian blinds), but the play felt mechanical — card removed, turn passed, nothing else visible. As OTHER in future rounds I cannot report what Seat1 or Seat2 saw on the board, which limits the vibe assessment."

Seat-3 played Go Dark on their first ACTOR turn (draw pile 20, turnsRemaining:1) using a double-click on the card's text to stage it, then confirmed via staging area. The play resolved correctly — draw pile remained 20, turn transitioned to Seat1 — but the ACTOR phone displayed no drama beat, toast, or cinematic framing to mark the moment. A separate suspicion at 2026-04-30T02:00:30Z noted that single-click on a hand card opens an enlarged preview with a backdrop that intercepts pointer events, requiring double-click to stage directly; this interaction friction was self-resolved by the seat and is not the primary finding here.

## God-mode reality

From `server/events.jsonl` lines 11-13:
- stateVersion 11, nowMs 1777514451287 — `card-played` (playerId: `06b7a96a` = Seat3, cardType: `go-dark`); nope window opened (generation 3, remainingMs: 10000)
- stateVersion 12, nowMs 1777514461304 — `nope-window-expired` (_server, windowGeneration: 3); nopeWindow `remainingMs: 0`; event log still ends at `card-played go-dark` (nope-window-resolved not yet appended)
- stateVersion 13, nowMs 1777514461612 — `nope-grace-expired` (_server, windowGeneration: 3); events now include `nope-window-resolved {cancelled: false, chainDepth: 0}` and `turn-started {playerId: 20f8d740 (Seat1), turnsRemaining: 1}`; draw pile: 20 (unchanged); `nopeWindow: null`

The scenario fire signature (strict shape) is fully satisfied: `card-played go-dark` → `nope-window-resolved cancelled:false` → `turn-started Seat1 turnsRemaining:1`. Draw pile unchanged at 20 confirms no draw occurred. Engine behavior is correct.

## Diagnosis

The engine processes Go Dark correctly via `applySkip` at `src/server/game/engine.ts:424-444`: with `turnsRemaining=1`, `remaining = turnsRemaining - 1 = 0` falls through to `advanceTurn` at `engine.ts:1217-1234`, which emits `turn-started` for the next alive player (Seat1) with `turnsRemaining: 1`. The draw pile is unchanged, confirming the ACTOR skipped their draw. No engine bug.

The gap is in the UI layer. The scenario catalog's `ui-assertions` block (SCENARIOS.md line 1681-1683) specifies: `ACTOR's phone: "you went dark" toast; turn hands off.` The vibe check section (line 1699-1701) describes: venetian blinds close, nameplate dims, a "we lost contact" line. Neither fired. The drama overlay system (`getDramaBeats`) currently registers beats for BURNED and EXTRACTED events; Go Dark (an action card resolving via the nope window) has no drama beat or toast entry. The ACTOR phone simply returned the staging area to "Stand by (disabled)" with no intermediate visual cue.

The vibe-check severity is P2: a single-seat `unsure` (not `no`) on a scenario that the spec does not explicitly call out as a "load-bearing moment" by name, and no corroborating seats in this session. Bias toward P2 is correct. However, the scenario catalog's own vibe check call-out is explicit — "If it reads like a generic skip, the theme has leaked out" — which signals this gap is known and expected to be addressed.

## Proposed fix paths

**Option A — ACTOR toast only (effort: tiny / risk: low):** When the phone client's event handler sees `nope-window-resolved {cancelled: false}` following a `card-played {cardType: 'go-dark'}` on `isMyTurn === true`, emit a `"YOU WENT DARK"` toast using the existing toast system. Requires no drama overlay changes — purely a client-side event-handler addition in the phone event processing path. Satisfies the catalog's `ui-assertions` minimum and removes the "mechanical skip" feel for the ACTOR. Risk: toast alone is less cinematic than the venetian-blinds moment the card illustration promises, but clears the P2 finding at minimal cost.

**Option B — Drama beat for Go Dark (effort: small / risk: medium):** Register `go-dark` in the drama overlay system — extend `getDramaBeats` to return a beat for `card-played {cardType: 'go-dark'}` resolved events: one beat on the ACTOR's phone ("GONE DARK") and one beat for the board and non-actor phones ("AGENT WENT DARK"). The drama overlay's existing two-beat queue infrastructure handles this. Risk: action cards resolved via the nope window follow a different event path than BURNED/EXTRACTED; care needed to gate the beat on the correct `nope-window-resolved` rather than `card-played`, to avoid triggering the beat if a Nope cancels the play.

**Option C — Toast for ACTOR + drama beat for board/observers (effort: medium / risk: low once Option B's gating is solved):** Implement both Option A's ACTOR toast and Option B's board-and-observer drama beat. This delivers the full Archer vocabulary for Go Dark: the ACTOR sees a "YOU WENT DARK" confirmation while the board and other phones see the "AGENT WENT DARK" beat with the venetian-blinds visual language the card illustration establishes. Matches the scenario catalog's vibe check description most closely. Effort is additive (A + B), but both changes are isolated to client event handling and the drama beat registry — no engine or protocol changes required.

## Recommended next step

Implement Option A as the immediate minimum fix (one client-side event handler addition clears the `ui-assertions` gap and removes the mechanical-skip feel), then schedule Option C as the aspirational Archer-vocabulary pass in the next visual polish pass.

---

**Triage seed kind:** scripted-scenario
**Triage agent session:** playtest-triage-012-scn-go-dark-normal-01
