# 011-scn-intercepted-single-at-depth-0-01 — Interceptor sees no toast describing what combo is being played during nope window

**Severity (triage):** P2
**Status:** ✅ RESOLVED
**Resolution:** Fix landed 2026-05-09. Implementation matches triage Option A: removed the combo-suppression filter (`if (event.comboSize !== undefined) break`) in PlayerAlert's `card-played` case and replaced it with a combo-aware text branch — `<Name> played a <Operative> pair.` (comboSize===2) and `<Name> played a <Operative> triple.` (comboSize===3). The persistent-until-nope-window-resolved behavior carries over unchanged. Observers/interceptors during the nope window now know what they're potentially blocking. Same commit also adds the noper-side post-cancel toast (closes 027 + the rest of 022) so fast-clickers get confirmation of what they cancelled.
**Seed kind:** scripted-scenario
**Source seats:** seat-2
**Linked scenarios:** SCN-INTERCEPTED-SINGLE-AT-DEPTH-0-01
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-05-08-2022-5p
**Candidate duplicate:** n/a

## Player-POV summary

> *Quoted from seat-2's suspicion log at 2026-05-09T00:49:55Z:*
> "When I intercepted Seat3's play, I never saw what card Seat3 had played. No toast appeared showing 'Seat3 played [card name]' before or alongside the intercept confirmation. Is this by design for OTHER players, or is the card identity supposed to be shown?"

> *Quoted from seat-2's scenario-fire log at 2026-05-09T00:49:36Z:*
> "Note: I never saw what card Seat3 played — no toast was visible in the snapshot when I intercepted. The interception used 1 Intercepted card."

Seat-2 successfully intercepted during a 9-second nope window but had no visible indicator of what they were spending an Intercepted card to cancel. The Intercept button was active and clickable, the interception resolved correctly (hand 8→7, counter window "Counter · 7s" opened and expired, Seat3's play was cancelled), but throughout the decision window the phone showed only the countdown with no description of the play being contested.

**Scenario-fire mislabel note:** Seat-2 filed this fire as SCN-INTERCEPTED-SINGLE-AT-DEPTH-0-01 (intercept of a targeted single card). Coverage.md confirms that scenario is UNFIRED this session. The actual play, corroborated by seat-3's log at 2026-05-09T00:49:27Z, was a pair combo (Neal Proctor x2, SCN-PAIR-OPERATIVES-HIT-01). Seat-2 hit the correct Intercept mechanic but against a different scenario variant than the label implies. The UX finding is real; only the scenario label is wrong.

## God-mode reality

From seat-3's log at 2026-05-09T00:49:27Z (corroborating the server-side sequence — events.jsonl exceeds direct read budget):

- Seat-3 staged Neal Proctor x2 (pair combo). Action: "Steal a random card →". Target: Seat4. Nope window opened.
- Seat-3 log: "Intercept window · 7s disabled for me. Someone intercepted. Counter window appeared (Counter · 2s). I was too slow to counter. Steal was cancelled."
- Seat-3 scenario-fire at 2026-05-09T00:49:41Z: "Intercept resolved successfully against my pair steal. From ACTOR perspective, the Intercepted mechanic worked correctly — I lost my pair cards and gained no stolen card."

The server emitted a `card-played` event with `cardType: 'neal-proctor'` and `comboSize: 2` (per engine.ts combo dispatch conventions documented in CLAUDE.md). The nope window opened after this event. A `nope-played` event followed (seat-2's dispatch), then `nope-window-resolved` with `cancelled: true`. The sequence is mechanically correct.

## Diagnosis

The root cause is a deliberate suppression filter in `src/client/player/PlayerAlert.tsx` at the `card-played` case branch (line 126):

```
if (event.comboSize !== undefined) break
```

When a combo (pair or triple) is played, `card-played` is emitted with `comboSize` set. The suppression was designed to prevent misleading toasts like "Seat3 played Vera Khan" when the semantically meaningful event is `combo-steal` (which carries `stealerId`, `targetId`, and result). The design intent is documented in the code: "the bare card-played would over-announce a 3-of-a-kind as just '[Name] played Vera'."

However, `combo-steal` fires AFTER the nope window resolves — it is the outcome event, not the announcement event. During the nope window (the interception decision window), the only event available is `card-played`. For non-combo plays, the `card-played` toast persists through the nope window via `persistUntil: ['nope-window-resolved']`, giving the observer context to decide whether to intercept. For combo plays, that toast is suppressed, leaving the observer with only the countdown button and no description of what is being contested.

The consequence: an observer holding Intercepted cards must decide whether to burn one with zero information about whether the play is a combo steal, a direct order, a favor, or something else. The strategic decision quality is degraded, and a player who does intercept (as seat-2 did) learns what they cancelled only after the counter window expires, when the `combo-steal` result event arrives.

This is not a privacy leak — `card-played.cardType` for combos is not a hand-identity field and `stripPrivateEventFields` in `src/server/projection.ts:224-257` does not strip it. The event is available client-side; the UI just suppresses displaying it.

The scenario-fire mislabel (SCN-INTERCEPTED-SINGLE-AT-DEPTH-0-01 vs an unnamed "intercept of pair combo" scenario) is a secondary finding: the catalog does not yet have a catalogued scenario for the interceptor's POV during a pair combo. SCN-PAIR-OPERATIVES-HIT-01 covers the pair steal from the TARGET's POV; no scenario covers the interceptor's experience of blocking a pair combo.

## Proposed fix paths

**Option A — Combo-aware toast variant (effort: small / risk: low):** Extend the `card-played` branch in `PlayerAlert.tsx` to emit a different toast when `comboSize` is set, instead of suppressing entirely. Text could be "Seat3 is playing a pair steal." or "Seat3 played a pair combo." This keeps the suppressions for `extraction`, `burn-the-files`, and `falsify-intel` intact while giving observers the context they need during the nope window. The `persistUntil: ['nope-window-resolved']` logic applies unchanged. Risk: text must be generic enough not to reveal the named card on triple steals before the name commit; for pair combos this is straightforward since no name is committed yet.

**Option B — Annotate the nope window UI with pending action context (effort: medium / risk: medium):** Augment `NopeWindowView` in `src/shared/protocol.ts` to carry an optional `pendingActionKind` field (e.g., `'pair-steal' | 'triple-steal' | 'single'`) that the server populates in `projectNopeWindow`. The Intercept button or window header in `SmartActionBox` would render "Intercept pair steal (9s)" instead of "Intercept (9s)". This is richer and screen-reader accessible, but requires a server-side projection change + protocol bump and more UI work than Option A. It also avoids coupling to the event feed (which has its own persistence timing).

**Option C — Accept the gap; add a catalog scenario entry (effort: tiny / risk: low):** Document "intercept of pair combo from interceptor's POV" as a new scenario (a sibling of SCN-INTERCEPTED-SINGLE-AT-DEPTH-0-01 covering combo plays). The existing behavior is architecturally coherent — the suppression is intentional. Flag as P2 wontfix on the UX gap and treat the catalog gap as the actionable item. The interceptor not knowing the combo type is mild information asymmetry consistent with the spy-agency tone (operatives react under fire, not with full briefings). This unblocks the coverage gap with zero code change.

## Recommended next step

Option A (combo-aware toast variant in PlayerAlert.tsx) closes the observer info gap with minimal risk and directly resolves the seat-2 suspicion — the comment scaffold for this path is already adjacent to the suppression filter that needs loosening.

---

**Triage seed kind:** scripted-scenario
**Triage agent session:** 011-scn-intercepted-single-at-depth-0-01
