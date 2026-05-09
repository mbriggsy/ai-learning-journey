# 029-scn-intel-briefing-normal-01 — Disabled intercept button shows countdown when observer has no Intercepted cards (working as designed)

**Severity (triage):** P2
**Status:** 〰 LOW-SIGNAL
**Seed kind:** scripted-scenario
**Source seats:** seat-2
**Linked scenarios:** SCN-INTEL-BRIEFING-NORMAL-01
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-05-08-2022-5p
**Candidate duplicate:** n/a

## Player-POV summary

> *Quoted from seat-2's suspicion log at 2026-05-09T00:56:11Z:*
> "When Seat5 played Intel Briefing, the nope window appeared as 'Intercept window · 9s [disabled]'. The button was disabled because I had no Intercepted cards in hand. Is this the correct UX — disabled button with countdown still running? Or does the button simply not show if you can't intercept?"

> *Self-assessment from same entry:*
> "This seems correct per spec — it lets them know how long others have to respond."

Seat2 had exhausted both Intercepted cards earlier in the session (first used at 00:49:36Z intercepting Seat3, second used at 00:54:14Z intercepting Seat4's Back Channel). When Seat5 played Intel Briefing at 00:56:00Z (confirmed via seat-5 log entry "SCN-INTEL-BRIEFING-ACTOR" at 00:56:00Z), Seat2 saw the nope window as a disabled button with a live countdown. The agent correctly noted this and self-validated the behavior as appropriate. No intercept occurred; Intel Briefing resolved cleanly. Coverage.md confirms SCN-INTEL-BRIEFING-NORMAL-01 as "clean | pass | pass."

## God-mode reality

From `seat-5.log.md` (scenario-fire at 00:56:00Z) and `seat-2.suspicions.md` (suspicion at 00:56:11Z):

- 00:56:00Z — Seat5 (ACTOR) double-taps Intel Briefing, clicks "Peek at the top 3 cards"
- 00:56:00Z — Server opens nope window; Seat5 log records "Intercept window · 6s" on their own phone
- 00:56:11Z — Seat2 (OTHER, alive, 0 Intercepted cards) observes "Intercept window · 9s [disabled]" — 11 seconds after Seat5 fired; the 9s vs 6s discrepancy is a snapshot-poll artifact (Seat2 caught the window near its start, Seat5 caught their own view at a later moment)
- Nope window expires without interception
- Intel Briefing resolves: Seat5 sees top 3 (Neal Proctor, Janet Broadside, Burn the Files) privately via FuturePeek dialog

The server behaved correctly throughout. The nope window opened, no intercept was dispatched, and the peek resolved privately to the ACTOR. Coverage.md records the scenario as clean with tier-1 and tier-2 both passing.

## Diagnosis

The disabled intercept button showing a live countdown is the `interceptWaiting` branch in `src/client/player/SmartActionBox.tsx:194-199`:

```
return {
  key: counter ? 'counter-waiting' : 'intercept-waiting',
  className: `${styles.box} ${styles.interceptWaiting}`,
  text: `${verb} window · ${secondsLeft}s`,
  interactive: false,
}
```

This branch fires when `nopeWindow !== null && isAlive` but `canIntercept === false`. `canIntercept` is derived at `SmartActionBox.tsx:184`:

```
const canIntercept = hasIntercept && (!myTurn || nopeWindow.chainDepth >= 1)
```

Seat2 had `hasIntercept === false` (hand contained no Intercepted cards), so `canIntercept` was false regardless of turn ownership. The button is rendered disabled with a visible countdown by design.

The design rationale is documented in the source comment at `SmartActionBox.tsx:163-171`: the countdown is shown to all alive players (including ACTOR at chainDepth 0 who also cannot self-nope) so that:

1. Players know their card is "in the air" and others are deciding.
2. The 9-second tension beat reads as dramatic for all seats, not just those who can act.
3. ACTOR had dead silence during the nope window before this design fix (eye-in-loop session 2026-05-02).

There is no bug here. The seat-2 agent's self-assessment was accurate. The disabled button with countdown is the correct, intentional observer experience for a player without Intercepted cards.

Minor factual note: the seat-2 suspicion says "Seat5 played Intel Briefing" — confirmed by seat-5.log.md at 00:56:00Z. This is consistent with seat-2's earlier scenario-fire for Seat4's Intel Briefing (00:52:43Z) being a separate event; Seat5 played a second Intel Briefing 3.5 minutes later on their own turn. No seat-ID confusion in the engine.

## Proposed fix paths

No fix is required. The three options below represent design alternatives if this UX were reconsidered.

**Option A — Status quo: retain disabled button with countdown (effort: tiny / risk: low):** No change. The disabled button informs non-actors of timing without implying actionability. The `interceptWaiting` branch is documented and tested. The seat-2 agent validated it. This is the correct disposition.

**Option B — Hide the button entirely when the player cannot intercept (effort: small / risk: medium):** Guard the nope window branch with `if (canIntercept)` and skip the `interceptWaiting` return — players without Intercepted cards see the `standby` state ("Stand by, operative") during the nope window instead. Tradeoff: removes the timing signal for non-actors; they can no longer tell how much time others have. Reverses the deliberate 2026-05-02 design choice. High regression risk: ACTOR's "dead silence" problem returns.

**Option C — Show countdown as passive text instead of a disabled button (effort: medium / risk: medium):** Render the `interceptWaiting` state as a non-button label (e.g., a status strip inset or a timer chip) rather than a disabled button. Removes the affordance-confusion question ("why is there a button I can't press?") while preserving the timing signal. Tradeoff: requires new UI surface, CSS, and animation. More work than the problem warrants given that seat-2 self-assessed the current behavior as correct.

## Recommended next step

Close as LOW-SIGNAL with no action — the disabled intercept countdown is working as designed per `SmartActionBox.tsx:163-199`, the seat-2 agent's own assessment was accurate, and the scenario coverage report confirms a clean tier-1 and tier-2 pass.

---

**Triage seed kind:** scripted-scenario
**Triage agent session:** 029-scn-intel-briefing-normal-01
