# 006-scn-favor-normal-01 — Favor target single-tap path broken; dual-seat vibe-check "no"; B-05 stall did not fire

**Severity (triage):** P1
**Status:** ✅ RESOLVED 2026-05-01 — Finding 1 = RESOLVED-NOT-A-BUG (gesture vocabulary lock); Finding 2 = closed by #010 cinematic; B-05 dimension still ⏸ BLOCKED separately

## Resolution (2026-05-01)

**Finding 1 — single-tap interaction bug → RESOLVED-NOT-A-BUG (commit `0b9a5cd9`).**
Initial fix (commit `57a7d799`) shipped Option A (single-tap on enlarged
card = stage), but Briggsy's review caught that the change broke BURNED's
universal gesture vocabulary: single-tap = inspect (reversible peek),
double-tap = commit. That's the same discriminator the hand uses for
preview-vs-stage and the StagingArea uses for preview-vs-unstage. The
"fix" inverted single-tap to commit on the enlarged surface only, breaking
consistency. The original triage misframed this as a bug; reclassified as
first-time discoverability friction with a coherent gesture vocabulary,
not a gesture defect. Hand.tsx restored, regression contract added at
`tests/e2e/hand-enlarged-tap-stage.spec.ts` to lock the gesture against
future "fixes" under the same triage pressure.

**Finding 2 — dual-seat vibe-check "no" → CLOSED by issue #010 fix series.**
- Gap A (TARGET hint copy): explicitly skipped — adding a "double-tap"
  gesture qualifier contradicts the gesture-vocabulary lock above.
- Gap B-equivalent (ACTOR waiting state): commit `901ab99f` — SmartActionBox
  derives `favor-waiting` branch when actor is mid-`favor-pending`, surfaces
  "Waiting for [TARGET] / to surrender a card" instead of stale hint.
- Gap C-equivalent (TARGET drama beat / ACTOR drama beat): commit
  `38d4c7f0` — FavorReport hero overlay on BOTH phones with named card
  asset, EXTRACTED stamp for ACTOR (receiver), SURRENDERED stamp for
  TARGET (giver). favor-given event extended with private cardType,
  visible only to giver+receiver via projection allowlist. PROTOCOL_VERSION
  bumped 3→4.
- Receiver-side toast (interim Gap 3 in the original triage): ridden into
  the cinematic — PlayerAlert favor-given branches retired so toast +
  cinematic don't compete for attention.

**B-05 disconnect-wedge dimension** still ⏸ BLOCKED pending Briggsy's
adjudication of options (a) 15-min nuke / (b) confirmed-disconnect
auto-resolve / (c) host vote-to-kick. That's `SCN-CALL-IN-FAVOR-TARGET-DISCONNECT-01`
and the wedge cluster B-03/04/05/06/07/13 — not part of this issue's
closure.

---
**Seed kind:** scripted-scenario
**Source seats:** seat-1, seat-2
**Linked scenarios:** SCN-FAVOR-NORMAL-01 (catalog: SCN-CALL-IN-FAVOR-NORMAL-01)
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-04-29-2139-3p
**Candidate duplicate:** SCN-CALL-IN-FAVOR-NORMAL-01 / B-05 (known-product-call: favor-pending + target disconnects → room frozen)

---

## Player-POV summary

> *Quoted from seat-1's suspicion log at 2026-04-30T01:52:30Z (severity: medium):*
> "Played Call in a Favor targeting Seat2 at ~01:48 UTC. My staging area locked to 'Double-tap a card to stage it (disabled)' immediately after confirming the target. Waited ~4.5 minutes for Seat2 to respond to the favor prompt. No response received. Game remains blocked on my turn pending Seat2's favor-response action. The UI shows no indication of what is happening — no pending message, no countdown, no spinner beyond the locked staging area. As ACTOR, there is no visibility into whether Seat2 has received the prompt."

> *Quoted from seat-2's suspicion log at 2026-04-30T01:53:00Z (severity: high):*
> "Clicked hand card once — opened enlarged preview, card became [active], but staging button remained [disabled] throughout. Clicked enlarged card inside _enlargeBackdrop_1ugbg_5 — dismissed the selection/preview entirely without staging the card. Attempted to click staging button while card was active — button genuinely has HTML disabled attribute, not aria-disabled. RESOLVED: Double-click (dblclick) on a hand card stages it directly and shows 'Surrender this card to Seat1 →' confirmation button."

> *Quoted from seat-2's ui-spec-divergence entry at 2026-04-30T01:53:30Z:*
> "Prompt appeared correctly. Single-tap on hand card opens enlarged preview but staging button stays [disabled] (HTML disabled attr). Clicking enlarged card dismisses selection without staging. Double-click on hand card stages directly and shows confirmation button — that path works. Single-tap-then-confirm path is broken."

> *Quoted from seat-1's vibe-check at 2026-04-30T01:55:35Z (feltLikeArcher: no):*
> "The exchange resolved correctly and the card arrived clean with no ghost staging, but the ~7 minute wait with a silent locked staging area felt like submitting a web form and refreshing to check if it processed. There was no drama, no tension, no Archer beat — just opacity about what was happening on the other end."

> *Quoted from seat-2's vibe-check at 2026-04-30T01:55:30Z (feltLikeArcher: no):*
> "The interaction was too mechanical — I had no idea double-click was needed, and the nope window expired without any drama registered on my screen. The 'Card sent to Seat1' toast appeared but there was no cinematic beat acknowledging the coercion or my card leaving my hand. The favor resolution felt like a silent database transaction."

The ~7-minute stall seat-1 observed was NOT caused by a target disconnect (B-05). Seat-2 was connected throughout; the stall occurred because seat-2 could not stage a card via the single-tap → enlarged-preview → confirm path. Seat-2 eventually resolved it via double-click (dblclick), which bypassed the broken path. Both seats independently issued `feltLikeArcher: no` vibe-checks on the same scenario moment.

---

## God-mode reality

No events.jsonl read performed — per the KNOWN-PRODUCT-CALL-CONFIRMED branch, full god-mode read is not required. The player-POV signals are sufficient to characterize the distinct findings. Key observable: the favor exchange eventually resolved (seat-1 received the card), confirming the server-side mechanics functioned correctly. The stall was purely UX-origin (broken interaction path on seat-2's phone), not engine-origin.

---

## Diagnosis

**KNOWN-PRODUCT-CALL-CONFIRMED dimension (B-05):**
The clusterer matched this seed against `known-product-call: B-05` — `favor-pending + target disconnects → room frozen` — which is ⏸ BLOCKED pending Briggsy's disconnect-wedge adjudication (options: (a) 15-min nuke, (b) confirmed-disconnect auto-resolve, (c) host vote-to-kick). See `docs/testing/E2E-ISSUE-LIST.md` B-05 and the full wedge cluster B-03/04/05/06/07/13. **Note: the B-05 scenario did NOT fire in this session.** Seat-2 remained connected throughout. The clusterer matched because the session involved a Favor stall, but the stall was UX-caused, not connectivity-caused.

---

**Distinct finding 1 — Single-tap interaction path broken for favor-target response (P1):**
Seat-2's ui-spec-divergence entry and suspicion corroborate: the favor-target card picker's single-tap path is broken. First tap opens the enlarged preview (card enters [active] state). The `_enlargeBackdrop_1ugbg_5` div intercepts all subsequent pointer events — clicking the enlarged card INSIDE the backdrop closes the preview and deselects the card rather than staging it. The staging button remains `disabled` (HTML attribute, not aria-disabled) throughout the preview state.

Root cause: the enlarged-preview backdrop's click handler treats any tap on itself as a dismiss, rather than distinguishing a second tap on the previewed card as a confirm/stage action. `useCardPlay` with `maxStaged=1` (favor-mode) is designed for "auto-swap on second tap" per `CLAUDE.md`, but the backdrop's pointer-event capture prevents the second tap from reaching the card element's handler. The dblclick event fires before the backdrop intercepts (mousedown → mousedown → dblclick fires on the card before pointerdown propagates to the backdrop), which is why double-click works as a workaround.

On a real touch device this manifests as: first tap previews, second tap on the enlarged preview area dismisses without staging. Users must double-tap quickly (fast enough to fire `dblclick` on the card before the backdrop handler) — unintuitive and undiscoverable.

This is a P1 interaction bug: rule-correct behavior exists (double-click works, card is transferred correctly) but the expected single-tap interaction path is broken, and there is no affordance explaining the double-click workaround. The scenario catalog's ui-assertions for TARGET state "favor-response prompt opens with card-picker" — the card-picker's primary interaction pattern fails.

---

**Distinct finding 2 — Dual-seat vibe-check "no" on Favor exchange (P1):**
Both seat-1 (ACTOR) and seat-2 (TARGET) independently filed `feltLikeArcher: no` at the same scenario moment. The scenario catalog explicitly identifies this as a high-vibe-risk moment: "Favor-request is Archer-office politics. Does the target's phone convey obligation (boss calling it in), or does it feel like a menu?" Both seats reported the exchange felt mechanical and transactional. Specific gaps:

- ACTOR has no visibility into whether the target has received the prompt (silent locked staging area with no status copy).
- TARGET receives no cinematic acknowledgment when surrendering the card — the toast "Card sent to Seat1" is functional but not Archer-tone.
- The nope window expired silently on TARGET's phone with no drama beat.

Per the vibe-check severity rubric: reproducible `no` on a moment the spec explicitly flags as load-bearing → P1. Two seats corroborating on the same moment confirms P1 (would be P1 even for a single `no` on a load-bearing scenario moment).

---

## Proposed fix paths

**Option A — Fix backdrop dismiss behavior to stage on second tap (small / low):** In the favor-response card picker, change the enlarged-preview backdrop's click handler: instead of always dismissing, detect if the click target IS the enlarged card element and treat it as a confirm-stage action. The backdrop dismisses only if the click is outside the enlarged card bounds. This preserves the single-tap preview experience while making the second tap functional. Lowest risk — localized to favor-response mode; dblclick path remains as a fallback.

**Option B — Remove preview step in favor-response mode; first tap stages directly (small / medium):** When `pendingPrompt.type === 'favor-response'`, suppress the enlarged-preview open on first tap and stage the card immediately. Since `maxStaged=1` with auto-swap is already the favor design, eliminating the intermediate preview step makes the interaction one-tap-to-stage. Risk: slightly reduces discoverability of which card is being surrendered; loses the "preview before committing" affordance. Mitigated by the "Surrender this card to [NAME]" confirmation CTA.

**Option C — Add ACTOR-facing waiting state + TARGET-facing drama beat, independently of the interaction fix (medium / low):** For the vibe-check P1 finding: (a) when `pendingPrompt.type === 'favor-response'` and ACTOR is waiting, show Archer-tone copy in the staging area placeholder — e.g., "Waiting for [TARGET] to comply..." instead of the silent disabled placeholder. (b) When `favor-given` resolves on TARGET's phone, show a brief drama beat acknowledging the transfer — e.g., "INTEL SURRENDERED" overlay with Archer vocabulary. Neither change touches interaction mechanics; both are additive. Fix paths for finding 1 (interaction bug) and finding 2 (vibe) are orthogonal and can land independently.

---

## Recommended next step

Fix the enlarged-preview backdrop behavior (Option A) to make the single-tap path functional for favor-target response, then layer Option C's ACTOR-waiting and TARGET-drama copy on top to address the dual-seat vibe-check P1 in the same PR.

---

**Triage seed kind:** scripted-scenario
**Triage agent session:** 006-scn-favor-normal-01 / 2026-04-29-2139-3p
