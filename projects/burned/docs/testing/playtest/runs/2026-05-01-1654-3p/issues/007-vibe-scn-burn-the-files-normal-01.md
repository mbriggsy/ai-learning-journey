# 007-vibe-scn-burn-the-files-normal-01 — Phone gives zero feedback when burn-the-files shuffles the deck

**Severity (triage):** P2
**Status:** 🔴 OPEN
**Seed kind:** vibe-check
**Source seats:** seat-1
**Linked scenarios:** SCN-BURN-THE-FILES-NORMAL-01 (catalog ID: SCN-BURN-FILES-NORMAL-01 — see note)
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-05-01-1654-3p
**Candidate duplicate:** n/a

> **Catalog ID note:** The seed references `SCN-BURN-THE-FILES-NORMAL-01`; the catalog entry is `SCN-BURN-FILES-NORMAL-01` (no "THE"). The content is unambiguously the same scenario. This is a harness-side ID mismatch that should be corrected in the seed generator but does not affect this diagnosis.

## Player-POV summary

> *Quoted from seat-1's vibe-check at 2026-05-01T21:11:40Z (SCN-BURN-THE-FILES-NORMAL-01):*
> "From the phone (ACTOR) side there was no visible shuffle animation — the draw pile count stayed at 20 and the staging area just returned to normal. The board likely shows the shuffle visual. Without seeing the board reaction, the phone experience alone felt mechanical rather than cinematic, but no card identities were exposed."

Seat-1 played `burn-the-files` as ACTOR. After the 10-second nope window expired and the shuffle resolved server-side, the phone controller showed nothing: the staging area cleared (nope window closed), draw-pile count stayed at 20 (expected), and no animation or status-line change indicated the deck had been scrambled. The vibe-check returned `unsure`. The scenario catalog explicitly identifies Burn the Files as "THE Archer destroy-the-evidence beat" and its `ui-assertions` require both a phone-side shuffle animation ("cards visibly tumble") and a status-line flash ("FILES BURNED") — neither materialized.

## God-mode reality

From `server/events.jsonl` lines 15–17 (stateVersions 15–17):

- stateVersion 15 (`nowMs` 1777669889459) — `play-card` action: `card-played { playerId: Seat1 (26b21187), cardType: 'burn-the-files' }`. Nope window opened (`remainingMs: 10000, generation: 4`). `deck-shuffled` NOT yet in event list.
- stateVersion 16 (`nowMs` 1777669899469) — `nope-window-expired` action: nope window `remainingMs` → 0. Event list still ends at `card-played burn-the-files`. `deck-shuffled` still absent. Board `discardPile` shows `burn-the-files` on top.
- stateVersion 17 (`nowMs` 1777669899776) — `nope-grace-expired` action: event list now appends `nope-window-resolved { cancelled: false, chainDepth: 0 }` then `deck-shuffled { playerId: Seat1 }`. `nopeWindow: null`. `drawPileCount` remains 20 (correct — shuffle does not change pile size). All three player projections and board view include `deck-shuffled` in their event arrays.

The server correctly emitted `deck-shuffled` at stateVersion 17 (~307ms after the nope timer expired). Engine behavior (`applyShuffle` at `engine.ts:481–501`) is correct; `pendingFuture` was clear (no prior peek in this game instance). The mechanical invariants are satisfied.

## Diagnosis

The failure is entirely on the client rendering side. A code search across `src/client/` for `deck-shuffled` and `shuffle` returns exactly two locations: `src/client/board/events.ts:117` (COMMS ticker narrative text only — "shuffled the deck. All bets off." et al.) and `src/client/board/DrawPile.tsx` (zero matches — no shuffle animation). There are zero matches in `src/client/player/` and `src/client/shared/`.

This means:

1. **Phone controller view** — no component subscribes to or reacts to `deck-shuffled`. When the store broadcasts the stateVersion-17 update, the phone re-renders with an unchanged draw-pile count and a cleared staging area. No animation, no toast, no status-line change.
2. **Board view** — `src/client/board/DrawPile.tsx` also has no shuffle choreography, so the spec §8.7 "full Archer-tone shuffle — Krieger-lab incinerator, pile tumbles, folder bursts" is unimplemented on the board as well. The board's only feedback is the COMMS ticker text injected by `events.ts:117–122`.

The scenario catalog's `ui-assertions` for `SCN-BURN-FILES-NORMAL-01` require: "ACTOR's phone: shuffle animation plays on DrawPile — cards visibly tumble. Status line briefly reads 'FILES BURNED' (deck-shuffled event)." Both assertions fail. The board animation gap compounds this but is a separate surface.

Severity is P2 (vibe-check `unsure`, single seat) per the rubric. Upgrade to P1 is warranted if a second session confirms the board animation is also fully absent (COMMS ticker text alone does not satisfy spec §8.7), since Burn the Files is called out as load-bearing in the catalog.

## Proposed fix paths

**Option A — Phone status-line "FILES BURNED" flash (effort: tiny / risk: low):** Subscribe to `deck-shuffled` in the phone's event/status layer and emit a brief status-bar text change reading `// FILES BURNED` or equivalent when the event fires for any player, or a stronger variant when it fires for `myPlayerId`. This closes the catalog's "Status line briefly reads 'FILES BURNED'" assertion with minimal surface area. No new animation infrastructure required — the status strip's `mode="wait"` key-swap already handles transient text. The COMMS-ticker pattern in `src/client/board/events.ts` can serve as the reference for copy. Tradeoff: satisfies the text assertion but leaves the "cards visibly tumble" visual assertion unmet.

**Option B — Phone DrawPile shake/tumble animation on `deck-shuffled` (effort: small / risk: low):** In addition to Option A, add a Framer Motion `animate` variant on the phone's draw-pile element (or the numeric counter within it) that triggers a short shake/scale-pop keyframe when `deck-shuffled` is received. This closes the "cards visibly tumble" ui-assertion for the phone. The existing `breathe` animation pattern on the board's `.stack` element (DrawPile.module.css) provides a precedent for pile-level animation. Tradeoff: requires identifying the draw-pile DOM target on the phone view (currently no dedicated DrawPile component exists in `src/client/player/`) and ensuring the animation does not interfere with the layout axis (HEIGHT-constrained svh units per §3.4).

**Option C — Full board + phone implementation per spec §8.7 (effort: medium / risk: medium):** Implement Option B for the phone AND add the Archer-tone shuffle choreography to `src/client/board/DrawPile.tsx` — the COMMS ticker text alone does not satisfy "Krieger-lab incinerator, pile tumbles, folder bursts." This is the complete fix that makes both surfaces match spec, but scopes in the board's visual work which may need design alignment before implementation. Tradeoff: larger blast radius; two separate components to animate; board animation may need new keyframe assets or motion tokens. Recommended only if Briggsy confirms the board animation gap should be addressed in the same pass.

## Recommended next step

Land Option A (phone "FILES BURNED" status-bar flash) first as a one-line delta to close the catalog text assertion, then scope Option B as a follow-on once the phone draw-pile target is confirmed.

---

**Triage seed kind:** vibe-check
**Triage agent session:** playtest-triage / seed 007-vibe-scn-burn-the-files-normal-01
