# 014-back-channel-normal — Back Channel scenario fires clean from ACTOR seat; low-severity presentation gap corroborates issue 012

**Severity (triage):** P2
**Status:** 🔴 OPEN
**Seed kind:** scripted-scenario
**Source seats:** seat-1
**Linked scenarios:** BACK-CHANNEL-NORMAL
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-05-08-2022-5p
**Candidate duplicate:** n/a

## Player-POV summary

> *Quoted from seat-1's suspicion log at 2026-05-09T00:40:25Z (severity: low, relatedScenario: BACK-CHANNEL-NORMAL):*
> "Intercept window was 7s for Back Channel vs 3s for Falsify Intel. No explanation of the difference visible to the player — is this intentional by card type or a fixed time? The 'draw from bottom' action was visually identical to a normal draw from the player perspective — no bottom-deck animation or distinct effect seen."

Seat1 (ACTOR) played Back Channel on turn 1 immediately after Falsify Intel. The mechanics executed without incident: the action button was labeled "draw from bottom," the nope window opened and expired without interception, and Go Dark arrived in hand. The player's suspicion captures two product observations: (1) the Intercept window duration appeared different between card types but was not explained, and (2) the drawn card appeared in hand with no visual distinction from a normal top-draw.

## God-mode reality

From `server/events.jsonl` lines 6-8:

- `stateVersion 6` / `nowMs=1778287190267` — action `play-card` (Seat1 / `e9a5ccd7`, cardId `c42517ea`). Event `card-played` (playerId: Seat1, cardType: `back-channel`). Nope window: `remainingMs=10000`, `deadlineMs=1778287200267`, `chainDepth=0`, `generation=2`. Seat1 hand: 6 cards. Draw pile: 31.
- `stateVersion 7` / `nowMs=1778287200274` — action `nope-window-expired` (generation=2). `nopeWindow.remainingMs=0`. No intercept played. Window ran full 10,007ms (7ms clock drift, normal).
- `stateVersion 8` / `nowMs=1778287200579` — action `nope-grace-expired` (generation=2). Events bundle: `nope-window-resolved {cancelled:false, chainDepth:0}`, `card-drawn {playerId: Seat1, safe:true, cardType:"go-dark"}`, `turn-started {playerId: Seat2, turnsRemaining:1}`. Seat1's projection carries `card-drawn.cardType="go-dark"` (drawer-visible). All other seat projections carry `card-drawn {safe:true}` with `cardType` absent — correctly stripped by `stripPrivateEventFields` at `projection.ts:231-237`. Draw pile: 31 → 30. Turn advanced to Seat2.

The server executed the complete SCN-BACK-CHANNEL-NORMAL-01 fire signature in strict order. The privacy assertion holds: `card-drawn.cardType` reaches only the drawer.

## Diagnosis

**The scenario fired cleanly — no engine bug, no rule violation, no projection privacy leak.**

All four SCN-BACK-CHANNEL-NORMAL-01 fire signature events are present in strict order at stateVersions 6-8:
1. `card-played` (Seat1, `back-channel`) ✅
2. `nope-window-resolved` (`cancelled:false, chainDepth:0`) ✅
3. `card-drawn` (Seat1, `safe:true, cardType:go-dark`) ✅ — cardType drawer-private per `projection.ts:231-237 stripPrivateEventFields`
4. `turn-started` (Seat2, `turnsRemaining:1`) ✅

**On the "7s vs 3s Intercept window" discrepancy:** The server issued a single production-default `NOPE_WINDOW_MS` (10 seconds) for both Falsify Intel (stateVersions 2-3) and Back Channel (stateVersions 6-8). Both windows ran approximately 10 seconds each. Seat1's perception of "7s" vs "3s" reflects observing each window at different points within the countdown — a timing-perception artifact, not an engine inconsistency. The underlying signal is real: nothing in the UI explains to any player why a countdown exists or what its duration means, which is a polish gap regardless of the root cause. Issue 012 (`012-vibe-back-channel-normal`) already documents this timer-confusion signal as part of its P1 finding.

**On the animation gap:** The `card-drawn` event carries no `from` field on the wire that the client could use to trigger a distinct bottom-draw animation. The client can infer a bottom-draw by detecting `card-played.cardType === 'back-channel'` in the accumulated events sequence preceding the `card-drawn` event, but no such inference path is currently implemented. This gap is fully diagnosed in issue 012 (presentation layer, not engine), which cites the SCN-BACK-CHANNEL-NORMAL-01 `ui-assertions` as the canonical animation spec and the DrawPile.module.css `topCardDrop` infrastructure as the starting point for a bottom-exit animation path.

**New value from this seed:** This ACTOR-POV scenario-fire confirms the mechanical path is intact from the drawer's side. Issues 008/009 confirmed the scenario from the OTHER (observer) perspective; this seed closes the ACTOR-POV confirmation loop. The low-severity suspicion is a corroborating signal for 012's P1 and does not introduce a new root cause.

## Proposed fix paths

**Option A — Subsume under issue 012 and close this seed as confirmatory (effort: tiny / risk: low):** Add a note to issue 012 that seed 014 provides ACTOR-POV corroboration of the presentation gap. No new work required from this seed. Tradeoff: this seed does not produce an independent fix path, which is appropriate given the scenario fires correctly. The risk is that 012 may be deprioritized relative to other P1 issues, in which case this corroborating signal is lost in the issue index — mitigated by the cross-reference in this file.

**Option B — Treat the timer-confusion signal as an independent P2 polish item and add a countdown tooltip or status-bar copy explaining the Intercept window (effort: small / risk: low):** The player's confusion about "why is this timer different" points to a teachability gap that exists regardless of Back Channel specifically. A one-line status-bar message at window open — e.g., "// INTERCEPT WINDOW OPEN · {N}s" with consistent copy per card-played type — would address the timer-confusion signal without requiring the full animation work in issue 012's Option A. Tradeoff: this addresses a secondary symptom of the presentation gap rather than the root cause (no bottom-draw visual). Low risk because StatusBar key-transition pattern is already built (`statusText || '__standby__'`); medium value because the timer confusion appeared across seat-1 and also implicitly in seats 2/3's intercept-window observations in issues 008 and 009.

## Recommended next step

Treat this seed as confirmatory evidence for issue 012. No independent fix required beyond what 012 already proposes; if 012's Option B (Archer-tone PlayerAlert toast + board StatusBar narration) is implemented, it will resolve the primary `no` vibe signal and incidentally address the timer-confusion gap through the narration copy.

---

**Triage seed kind:** scripted-scenario
**Triage agent session:** 014-back-channel-normal
