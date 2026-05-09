# 024-scn-intel-briefing-normal-01 — Intel Briefing normal play: clean fire, privateData not captured in god-event snapshot

**Severity (triage):** P2
**Status:** 〰 LOW-SIGNAL
**Seed kind:** scripted-scenario
**Source seats:** seat-2, seat-3, seat-4
**Linked scenarios:** SCN-INTEL-BRIEFING-NORMAL-01
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-05-08-2022-5p
**Candidate duplicate:** n/a

## Player-POV summary

> *Quoted from seat-4 (ACTOR) scenario fire at 2026-05-09T00:52:26Z:*
> "Intel Briefing played. Nope window ('Intercept window · 7s') opened briefly — no interception. After window expired, dialog appeared titled 'Intel Briefing' showing top 3 cards: 1. Burn the Files (Draw 1 · next), 2. Neal Proctor (Draw 2), 3. Janet Broadside (Draw 3). All cards shown as disabled (read-only). 'Got it' button to dismiss."

> *Quoted from seat-4 vibe-check at 2026-05-09T00:52:55Z:*
> "The dialog titled 'Intel Briefing' with the three stacked card slots labeled 'Draw 1 · next', 'Draw 2', 'Draw 3' felt like reading a classified mission file. Seeing the specific card names and types with art felt earned. Kinetically: the peek appeared after the nope window cleared, which added a small delay-of-anticipation that worked well. 'Got it' dismiss is right-sized — not 'OK', not 'Close', exactly the briefing vocabulary."

> *Quoted from seat-2 (OTHER alive) scenario fire at 2026-05-09T00:52:43Z:*
> "Seat4 played Intel Briefing. From observer perspective: alert toast 'Seat4 played Intel Briefing' appeared, nope window showed 'Intercept · 2s'. I let it expire. Seat4 then had their private Intel Briefing prompt (not visible to me). Intel Briefing has no countdown — Seat4 took additional time to confirm. FuturePeek design confirmed working from observer perspective."

> *Quoted from seat-3 (OTHER alive) scenario fire at 2026-05-09T00:52:34Z:*
> "Seat4 played Intel Briefing (SCN-INTEL-BRIEFING-NORMAL-01). From OTHER perspective I received only a toast notification. No peek information visible to me, which is correct — the peek is private. No interception window was shown for this card (Intel Briefing may not be interruptible, or the window was too brief to catch)."

All three seats confirm the expected behavior: ACTOR saw private card identities via the FuturePeek dialog; observer seats received only a public toast with no card identity leakage. Seat4's subsequent draw of Burn the Files from the top of the pile validated that the peek data was accurate. Seat-3 missing the nope window is a seat-agent polling-lag artifact — the window opened at 10s (confirmed in server state at stateVersion 26) and seat-2 caught it at approximately 2s remaining; seat-3's polling interval simply did not land during the open window.

## God-mode reality

From `server/events.jsonl` lines 26-28 (stateVersions 26–28):

- stateVersion 26, nowMs 1778287945544 — `card-played` (playerId: `22a6a8fd` = Seat4, cardType: `intel-briefing`); `nopeWindow` opens with `remainingMs:10000`, `deadlineMs:1778287955544`, `generation:8`; `pendingPrompt:null` all viewers; intel-briefing card appears in board's `discardPile`
- stateVersion 27, nowMs 1778287955549 — action `nope-window-expired` (generation 8); `nopeWindow.remainingMs` drops to 0; nope-window-resolved event not yet emitted to event log; `pendingPrompt:null` all viewers
- stateVersion 28, nowMs 1778287955863 — action `nope-grace-expired` (generation 8); event log now includes `nope-window-resolved {cancelled:false, chainDepth:0}` followed by `future-peeked {playerId:"22a6a8fd"}` (Seat4); `nopeWindow:null`; `pendingPrompt:null` for all projections

Fire signature fully matched: `card-played intel-briefing` → `nope-window-resolved {cancelled:false}` → `future-peeked {playerId:$ACTOR}` in strict order (scenario catalog shape: strict).

The server correctly delivered the Intel Briefing as a non-cancelled play. The `future-peeked` event confirms `applySeeTheFuture` ran and set `pendingFuture` in server state. Seat4's reported card names (Burn the Files, Neal Proctor, Janet Broadside) match the subsequent draw (Burn the Files from top), confirming `pendingFuture.cardIds` was populated with the correct top-3.

One instrumentation observation: at stateVersion 28, the god-event projection snapshot for Seat4 does not include a `privateData` field. The scenario catalog's tier-2 projection assertion (`viewer: $ACTOR`, `field: privateData.futureCards`, `expect: array of length 3`) cannot be directly verified from `events.jsonl` alone, because `getPrivateData` is called dynamically at websocket-send time in `projection.ts:102-112` and is not stored in the accumulated projection object captured by the god-event recorder.

## Diagnosis

SCN-INTEL-BRIEFING-NORMAL-01 fired cleanly. All functional and privacy correctness checks pass:

1. **Fire signature:** matched strictly — `card-played intel-briefing` → `nope-window-resolved {cancelled:false}` → `future-peeked` at stateVersion 28.
2. **ACTOR card visibility:** Seat4 saw all 3 top cards with names, draw labels, and art. Accuracy confirmed by the subsequent draw. This validates `applySeeTheFuture` (`engine.ts:446-461`) set `pendingFuture` correctly and `getPrivateData` (`projection.ts:102-112`) served it to the ACTOR.
3. **Observer privacy:** seat-2 and seat-3 both received only the public toast — no card identities. This validates the `pendingFuture.playerId === viewerId` guard at `projection.ts:105`.
4. **FuturePeek no-countdown policy:** confirmed — seat-4 dismissed with "Got it" at their own pace with no auto-close timer.
5. **Nope window:** opened at 10s (stateVersion 26), observed by seat-2 at ~2s remaining. Seat-3 polled after expiry — this is agent polling lag, not a product defect.

The only actionable observation is a **harness instrumentation gap**: `privateData` (including `futureCards`) is not captured in the god-event projection snapshots at `events.jsonl`. The field is dynamically injected per-viewer at websocket-send time via `getPrivateData` in `projection.ts` and is therefore not present in the recorded god-event. The tier-2 oracle cannot validate `privateData.futureCards` contents from the event log alone; it currently relies on ACTOR self-reporting. This is not a product bug — the data was correct — but it is a gap in the automated assertion surface.

## Proposed fix paths

**Option A — Add per-player websocket message logging to the god-event recorder (effort: medium / risk: low):** Capture the full per-viewer projection (including dynamically-injected `privateData`) in a separate per-seat message log alongside `events.jsonl`. The tier-2 oracle could then assert `privateData.futureCards` length and presence against the actual message each seat received. Risk: increases log volume substantially (5 full projection objects per event already stresses the file; adding privateData-enriched per-seat copies doubles it). Tradeoff: most complete observability; enables future oracle assertions on Favor-give card type, Defuse-place position, and all other private-data fields.

**Option B — Record `pendingFuture` in the god-event server-state snapshot (effort: small / risk: low):** Add `pendingFuture: {playerId, cardIds}` to the god-event envelope's top-level server state (not per-viewer projection). This is sufficient to assert `futureCards` existence and card count for the ACTOR without recording full per-viewer payloads. The tier-2 oracle compares `pendingFuture.playerId === ACTOR` and `pendingFuture.cardIds.length === 3` (or `≤ drawPileCount`). Risk: low — `pendingFuture` is already in server state; just needs surfacing in the god-event schema. Tradeoff: does not confirm type-visibility at client (still relies on ACTOR report for art rendering), but confirms the data exists server-side.

**Option C — Accept current state; ACTOR self-report is sufficient for this scenario class (effort: tiny / risk: none):** The Intel Briefing peek is confirmed by two independent signals: the ACTOR's reported card names AND the subsequent draw-from-top matching the expected card. For scenario-validation purposes this is strong enough. No harness change needed. Tradeoff: leaves a systematic gap — any scenario that relies on `privateData` contents (Favor-give card type, future peek in deck-lt-3 edge case) cannot be automatically asserted, and a projection regression in `getPrivateData` would not be caught by the oracle unless the ACTOR notices.

## Recommended next step

Implement Option B (add `pendingFuture` to the god-event server-state snapshot) as a small, low-risk harness improvement that closes the tier-2 oracle gap for all `privateData.futureCards` scenario assertions without the log-volume cost of Option A.

---

**Triage seed kind:** scripted-scenario
**Triage agent session:** playtest-triage / 2026-05-08-2022-5p seed 024
