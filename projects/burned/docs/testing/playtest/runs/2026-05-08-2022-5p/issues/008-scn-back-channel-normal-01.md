# 008-scn-back-channel-normal-01 — Back Channel normal-play: scenario fires clean; OTHER observer phone view lacks post-resolution drama beat

**Severity (triage):** P2
**Status:** 🔴 OPEN
**Seed kind:** scripted-scenario
**Source seats:** seat-2, seat-3
**Linked scenarios:** SCN-BACK-CHANNEL-NORMAL-01
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-05-08-2022-5p
**Candidate duplicate:** n/a

## Player-POV summary

> *Quoted from seat-3's suspicion log at 2026-05-09T00:39:52Z (medium severity, relatedScenario: SCN-BACK-CHANNEL-NORMAL-01):*
> "The Intercept button appeared with a 6-second countdown. My click attempt using an accessibility ref selector failed with 'Unknown engine ref'. By the next snapshot the window had closed. Is 6 seconds enough for a human or agent to react and tap the intercept button on a phone?"

> *Quoted from seat-3's vibe-check at 2026-05-09T00:39:52Z (feltLikeArcher: unsure, relatedScenario: SCN-BACK-CHANNEL-NORMAL-01):*
> "The toast notification 'Seat1 played Back Channel' appeared alongside the Intercept button. The window closed before I acted. From the OTHER player perspective there was no drama build — just a brief opportunity that vanished. Can't judge fully since the window expired before I experienced the resolution beat."

> *Quoted from seat-2's scenario-fire log at 2026-05-09T00:39:58Z (SCN-BACK-CHANNEL-NORMAL-01):*
> "Seat1 played Back Channel. Nope window appeared with 'Intercept · 1s' button. Alert: 'Seat1 played Back Channel.' Window expired before I could click. Turn passed to me. Pile now 30."

Both seats observed Seat1 play Back Channel during the first turn of the game. Seat-3 (polling when ~6s remained on the window) and seat-2 (polling when ~1s remained) each encountered the nope window and missed it before they could click. Both noted the turn advanced normally and the pile decremented. Neither received a phone-side toast or animation indicating that the Back Channel had resolved as a bottom-draw (only the generic "Seat1 played Back Channel" toast was visible). Seat-3 rated the OTHER-perspective drama as `unsure` because the resolution beat was never experienced — the nope window vanished before they could engage with it.

## God-mode reality

From `server/events.jsonl` lines 6-8:

- `stateVersion 6` / `nowMs=1778287190267` — `card-played` (Seat1 / playerId `e9a5ccd7`, cardType `back-channel`); `nopeWindow` opens: `remainingMs=10000`, `deadlineMs=1778287200267`, `chainDepth=0`, `generation=2`. Seat1 hand: 6 cards. Seat2/3/4/5 hands: unchanged.
- `stateVersion 7` / `nowMs=1778287200274` — action `nope-window-expired` (generation 2); `nopeWindow.remainingMs=0`. No intercept played by any seat.
- `stateVersion 8` / `nowMs=1778287200579` — action `nope-grace-expired` (generation 2). Events bundle: `nope-window-resolved {cancelled:false, chainDepth:0}`, `card-drawn {playerId: Seat1, safe:true, cardType:"go-dark"}`, `turn-started {playerId: Seat2, turnsRemaining:1}`. Seat1's projection carries `card-drawn.cardType="go-dark"` (drawer-visible). All other viewer projections carry `card-drawn {safe:true}` with `cardType` absent (correctly stripped by `stripPrivateEventFields`). Draw pile: 31→30. Turn advanced to Seat2.

The server ran the full SCN-BACK-CHANNEL-NORMAL-01 fire signature correctly. The nope window opened for 10 seconds (not 6s or 1s — those figures reflect the seats' polling positions within the countdown, not the actual window duration). Back Channel resolved uncancelled. Seat1 drew go-dark from the bottom of the pile. The projection privacy assertion passes: `card-drawn.cardType` is visible only to the drawer (Seat1) and stripped from every other viewer.

## Diagnosis

**The scenario fired cleanly — no engine bug, no rule violation, no projection privacy leak.**

All four fire signature events are present in strict order at stateVersion 6-8:
1. `card-played (Seat1, back-channel)` ✅
2. `nope-window-resolved (cancelled:false, chainDepth:0)` ✅
3. `card-drawn (Seat1, safe:true, cardType:go-dark)` ✅ — cardType drawer-private per `projection.ts:231-237 stripPrivateEventFields`
4. `turn-started (Seat2, turnsRemaining:1)` ✅

The nope window countdown discrepancy between the two seats ("Intercept · 6s" for seat-3 vs "Intercept · 1s" for seat-2) is a polling artifact — both seats polled different points within the same 10-second server-side window. Real players on WebSocket receive state pushes in real-time and see the full countdown live; this is exclusively a harness limitation.

The seat-3 suspicion about "6 seconds enough to react" is similarly a harness artifact: the actual window was 10 seconds. No product change is implied by that signal alone.

The substantive signal is the seat-3 vibe-check `unsure` on the OTHER-observer phone experience. Seat-3's complaint is that the Back Channel play produced no drama arc from an OTHER perspective — the nope window appeared and silently vanished, with no resolution beat confirming "ACTOR drew from the bottom." The scenario catalog Column 2 for the OTHER (alive) row specifies: "Per rules: public knows ACTOR pulled from bottom safely but not WHAT they got. Spec: board narrates 'ACTOR went off-channel and came back clean.'" The spec assigns the narrative resolution to the BOARD view, not the OTHER phone view. The current phone behavior (toast: "Seat1 played Back Channel" → nope window → expiry → turn advance) is consistent with the spec as written.

However, seat-3's `unsure` is partially harness-induced: because their polling missed the window opening, they never experienced the drama of "nope window visible + choice available + expires," which is the intended UX tension even for OTHER players. A real couch player watching the phone would see the full 10-second countdown, the Intercept button available, and then the turn advance. The missing experience is whether the phone delivers a post-resolution signal distinguishing "Back Channel resolved as bottom-draw" from "card played and resolved normally." Neither seat mentions seeing such a signal.

Root cause of the P2 gap: the OTHER-phone view does not surface a post-nope-resolution beat distinguishing Back Channel (bottom-draw) from any other card that opens a nope window and expires. The board narration is spec'd to do this; the phone view does not. Whether the board narration currently shows "went off-channel" language is not confirmed by these seat logs (no seat-agent was monitoring the board view during this play).

Severity P2: single-seat `unsure` vibe-check on a scenario where the catalog vibe-check question is primarily directed at the ACTOR experience and board animation, not the OTHER phone view. The spec's Column 2 spec for OTHER assigns narrative weight to the board. No rule violation, no engine fault.

## Proposed fix paths

**Option A — Add phone-side resolution toast for OTHER after Back Channel nope-window expires (effort: tiny / risk: low):** After `nope-window-resolved {cancelled:false}` when the preceding `card-played` was `back-channel`, emit a client-side toast on OTHER players' phones such as "Seat1 extracted via back channel" or "Seat1 went off-channel — came back clean." This is a client-only change: the `card-played.cardType` is already in the accumulated events that OTHER players receive; the client can derive the "back-channel resolved" fact from the sequence without any server change. Tradeoff: adds a toast where the spec currently doesn't require one, slightly increasing information density on the OTHER view. Low risk of breaking anything. Downside: if the board narration is already landing this beat, the phone toast would be redundant.

**Option B — Add a bottom-flash animation to the DrawPile component when Back Channel is played (effort: small / risk: low):** When the client observes `card-played.cardType === 'back-channel'` followed by `card-drawn {safe:true}`, trigger a brief animation on the phone DrawPile (or a dedicated visual indicator) showing the card emerging from the BASE of the pile rather than the top. This directly addresses the catalog's primary vibe-check question ("does the bottom-draw animation sell the bypass, or does it look like a normal draw?") for both ACTOR and OTHER phone views. Tradeoff: requires a new animation component and client event handling. The animation is the same spec'd beat the board should already show; adding it to the phone view ensures the couch drama reaches every seat without relying on everyone watching the TV.

**Option C — Accept current behavior; no change (effort: none / risk: none):** The board narration is spec'd to carry the "went off-channel" beat per the catalog's Column 2. The phone OTHER view showing only the interception opportunity is within spec. The `unsure` signal is from a single seat whose agent missed the window due to polling delay, making the vibe-check partially unreliable. Close as P2 / no-fix-needed pending Briggsy's review of the board narration implementation. If the board narration is confirmed working, the drama is already landing at the couch level — just not captured in the phone-agent log.

## Recommended next step

Confirm whether the board view currently surfaces a post-resolution "went off-channel" narration beat for Back Channel (the spec's Column 2 board row requires this); if that beat is absent or generic, pursue Option A to close the drama gap on both phone and board simultaneously.

---

**Triage seed kind:** scripted-scenario
**Triage agent session:** 008-scn-back-channel-normal-01
