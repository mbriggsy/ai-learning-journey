# 015-vibe-scn-skip-normal-01 — Observer phone shows no card-played announcement during Go Dark skip beat

**Severity (triage):** P2
**Status:** 🔴 OPEN
**Seed kind:** vibe-check
**Source seats:** seat-2
**Linked scenarios:** SCN-SKIP-NORMAL-01
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-04-29-2139-3p
**Candidate duplicate:** n/a

## Player-POV summary

> *Quoted from seat-2's suspicion log at 2026-04-30T02:01:15Z:*
> "As an observer, all I saw was the nope window opening and closing, then the turn indicator flipping from Seat3 to Seat1. No card-played announcement was visible on my phone, so I couldn't tell what Seat3 actually played. The skip was silent from my perspective — no banner, no drama, just the turn changed."

The vibe-check prompt asked whether the skip "read as a tactical maneuver — operative ducks out cleanly — or just a turn marker ticking over." Seat-2 answered `unsure`. As an observer (OTHER alive), they saw the Intercept countdown appear and expire, then the turn transfer from Seat3 to Seat1, but received no indication on their phone that Go Dark had been played. The draw-pile count remained at 20 (confirming no draw), but the card identity was invisible.

## God-mode reality

From `server/events.jsonl` lines 11-13:

- stateVersion 11, nowMs=1777514451287 — `card-played { playerId: Seat3 (06b7a96a), cardType: 'go-dark' }` — nope window opened (generation 3, 10s, deadlineMs=1777514461287)
- stateVersion 12, nowMs=1777514461304 — `nope-window-expired { windowGeneration: 3 }` — window closed with `remainingMs: 0`, no intercept
- stateVersion 13, nowMs=1777514461612 — `nope-grace-expired { windowGeneration: 3 }` — `nope-window-resolved { cancelled: false, chainDepth: 0 }` + `turn-started { playerId: Seat1 (20f8d740), turnsRemaining: 1 }`

The server correctly emitted `card-played { cardType: 'go-dark' }` and all projections include this event in their `events[]` array (visible to seat-2's projection). The draw pile remained at 20 after the turn transition, confirming Go Dark's skip effect fired as intended. Engine behavior is correct; this is purely a phone-observer presentation gap.

## Diagnosis

The phone's `PlayingView` (`src/client/player/Player.tsx`) has no component that surfaces `card-played` events from other players to the observer. The `PlayerAlert` component (`src/client/player/PlayerAlert.tsx:22-109`) handles only four event types — `combo-steal` (stealer-side only), `card-drawn` (self only), `favor-given` (self only), and `nope-played` (skipped entirely). A comment at `PlayerAlert.tsx:113-116` explicitly notes: "Board-side COMMS feed already announces these events publicly — this gives the affected phone a dedicated, tactile heads-up since the player isn't looking at the TV."

The `StatusBar` (`src/client/player/StatusBar.tsx`) shows only whose turn it is ("Seat3 is on deck · 20 in the pile" → "Seat1 is on deck · 20 in the pile"). It has no slot for the card that caused the turn transition.

The board's `AnnouncementFeed` (`AnnouncementFeed.tsx`, listed in `docs/PRODUCT-SPECIFICATION.md §6.2`) is the intended public-event channel, but it is a board-only component. Players watching from their phones receive no equivalent — the current architecture treats card-play narration as entirely TV-side.

This creates a vibe failure for ANY card play observed on the phone: the nope window is the only signal that something happened, and when it closes, there is no phoneside confirmation of what card was played or what effect is in motion. The Go Dark / skip scenario makes this particularly obvious because the effect (no draw) is subtle and the card's cinematic "operative ducks out cleanly" beat has zero phone-side expression for observers.

The vibe-check is `unsure` from one seat. Per the rubric, this is P2. The underlying architecture gap is broader — it affects every non-actor for every card play — but the single-seat `unsure` signal does not elevate this to P1 in isolation.

Note: The mini-catalog entry for `SCN-SKIP-NORMAL-01` carries `known-product-call: B-13`. B-13 covers the disconnect-wedge case (active player disconnects mid-skip resolve), not the observer card-announcement gap. The clusterer correctly did not suppress this vibe-check finding via B-13 suppression — the finding is distinct from B-13's surface.

## Proposed fix paths

**Option A — Phone mini-toast for opponent card-played events (medium / medium):** Add a `card-played` case to `PlayerAlert.alertFor()` (`src/client/player/PlayerAlert.tsx:32`) that emits a brief `info`-tone toast ("Seat3 went dark") when `event.playerId !== myId`. The card's human-readable name would come from `CARD_DEF_BY_TYPE[event.cardType]?.name`. Risk: toast overload during fast multi-play turns; needs z-index and timing coordination with `DramaOverlay` (dramaActive gate is already in the component) and `StealReport`. Benefit: directly targets the "I had no idea what was played" observer gap across all card types.

**Option B — StatusBar card-play annotation (small / low):** Extend `StatusBar` (`src/client/player/StatusBar.tsx:38-58`) to accept an optional `lastPlayedCardName` prop and display it inline in the waiting state — e.g., "Seat3 played Go Dark · Seat1 is on deck · 20 in the pile." The card name clears on the next `turn-started` event. This requires threading one more piece of state from `useEventFeed` into the StatusBar. Lowest risk of the three options; fits the existing motion convention (AnimatePresence key changes on state update). Does not address the drama/vibe gap for mid-turn plays but does cover turn-ending skip-type cards.

**Option C — Accept phone as hand-focused; board owns narration (tiny / low):** Declare by product decision that card-play announcements are a board responsibility. The TV screen is the "game narrator" per the Jackbox/shared-screen pattern; phones are personal control surfaces. This is consistent with the EliminatedView's already-shipped "Watch the TV for the action" prompt and with `PlayerAlert.tsx:113-116`'s comment. Document the observer phone-silence as intentional, and direct Briggsy's attention to the TV-side AnnouncementFeed quality instead (ensuring the board's feed is legible from across the room). No code change; closes this seed as a deliberate product call.

## Recommended next step

Pursue Option B — it is the lowest-risk incremental change (one prop addition + one derived value from the event feed) and directly addresses the concrete observer complaint without the toast-overload risk of Option A, while keeping the product debate about "phone vs. TV narration" open for Briggsy to decide separately.

---

**Triage seed kind:** vibe-check
**Triage agent session:** 015-vibe-scn-skip-normal-01
