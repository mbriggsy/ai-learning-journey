# 038-burn-files-invalidates-peek — Seat agent conflated falsify-intel with intel-briefing; actual ACTOR (Seat4) never self-reported

**Severity (triage):** P2
**Status:** 〰 LOW-SIGNAL
**Resolution:** 2026-05-09. Triage Option A applied: SCN-BURN-FILES-INVALIDATES-PEEK-01's recognition criteria now carry an explicit NOTE distinguishing intel-briefing (sets pendingFuture, emits future-peeked) from falsify-intel (reads + clears pendingFuture, emits future-rearranged). Future seats won't make seat-1's surface-similarity pattern-match. Triage confirms the engine + projection are correct (`applyShuffle` clears pendingFuture per CLAUDE.md landmine; tier-2 oracle verified absent post-burn). The detector-without-self coverage divergence in this run was caused entirely by (a) Seat4 not self-reporting their own legitimate fire and (b) seat-1 false-firing from the wrong role/trigger. Coverage-reporter logs `seat-without-detector` and `detector-without-self` divergences for these cases — the underlying mechanic worked.
**Seed kind:** scripted-scenario
**Source seats:** seat-1
**Linked scenarios:** BURN-FILES-INVALIDATES-PEEK
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-05-08-2022-5p
**Candidate duplicate:** n/a

## Player-POV summary

> *Quoted from seat-1's suspicion log at 2026-05-09T01:10:38Z (severity: medium):*
> "I played Falsify Intel on turn 1 (rearranged top 3 cards). I then played Burn the Files on turn 2. The Burn the Files shuffled the deck — so my Falsify Intel rearrangement is now invalid. I have no way to confirm from my phone that the peek indicator was cleared (I wasn't watching the board view). This is the BURN-FILES-INVALIDATES-PEEK scenario — the expected behavior is that any stale intel indicators clear. Cannot confirm from player phone alone."

Seat-1 observed their own falsify-intel play on turn 1 (which rearranged the top 3 via `future-rearranged`) followed by their own burn-the-files on turn 2 (which shuffled the deck). They self-identified this as the BURN-FILES-INVALIDATES-PEEK scenario and filed a medium-severity suspicion. Their key observation was that no visible peek indicator appeared on their phone before or after the shuffle — there was nothing to confirm had cleared. The seat-1 log entry at 01:10:10Z confirms: "Phone shows no peek indicator to clear (no UI element showing 'you have peek data'). Cannot confirm peek indicator cleared from player view alone."

## God-mode reality

From `server/events.jsonl` lines 30–35 (stateVersions 30–35, nowMs range 1778288053015–1778288182926):

- stateVersion 30 — `card-played` (`playerId: 22a6a8fd` = Seat4, `cardType: intel-briefing`), `nope-window-resolved` (cancelled: false), `future-peeked` (`playerId: 22a6a8fd`), then `card-played` (`playerId: 22a6a8fd`, `cardType: back-channel`), Seat2 noped at depth 1, `nope-window-resolved` (cancelled: true, chainDepth: 1).
- stateVersion 35 — `card-drawn` (`playerId: 22a6a8fd`, `cardType: burn-the-files`) from back-channel bottom-draw, `turn-started` (`playerId: ac7b6e52` = Seat5). Seat4's projection at stateVersion 35 shows 7 cards in hand (having drawn burn-the-files), `isMyTurn: false`.

The actual scenario BURN-FILES-INVALIDATES-PEEK fired later when Seat4 played the drawn burn-the-files card, emitting `deck-shuffled` and clearing `pendingFuture`. The coverage report confirms: `SCN-BURN-FILES-INVALIDATES-PEEK-01` matched **clean**, tier-1 **pass**, tier-2 **pass**. The tier-2 oracle validated that `privateData.futureCards` was absent from Seat4's projection after the shuffle — the engine invariant held.

The coverage.md self-vs-detector divergences section records: "SCN-BURN-FILES-INVALIDATES-PEEK-01 (detector-without-self): FireRecord matched but no seat self-reported."

## Diagnosis

The coverage divergence is a seat-agent recognition failure, not an engine or projection bug.

**Scenario trigger mismatch.** The BURN-FILES-INVALIDATES-PEEK fire signature requires `intel-briefing` → `future-peeked` → `burn-the-files` → `deck-shuffled` (SCENARIOS.md line 2707–2716). The actual ACTOR was Seat4 (player `22a6a8fd`), who played `intel-briefing` on their turn, generating `future-peeked`, drew `burn-the-files` via back-channel, and later played it triggering `deck-shuffled`. Seat4 did not file a self-report.

**Seat-1's false positive.** Seat-1 (player `e9a5ccd7`) was OTHER (alive) at the time the scenario fired. Their own earlier play was `falsify-intel` (which emits `future-rearranged`, not `future-peeked`) followed by `burn-the-files` on a subsequent turn. Seat-1 pattern-matched on the surface similarity — "peek card then shuffle" — without distinguishing `falsify-intel`/`future-rearranged` from `intel-briefing`/`future-peeked`. The harness did not accept seat-1's self-report as fulfilling the ACTOR role for this scenario because seat-1 was not the ACTOR seat.

**Engine and projection: correct.** `applyShuffle` at `engine.ts:494` clears `pendingFuture: undefined` when burn-the-files resolves. `projection.ts:105` guards `getPrivateData` so `privateData.futureCards` returns absent when `pendingFuture` is undefined. Tier-2 oracle verified this post-burn. No engine fix needed.

**UI finding: no bug.** Seat-1's observation "no peek indicator to clear" is accurate from their own perspective (they played falsify-intel, not intel-briefing, so no `privateData.futureCards` was ever set for them). Even for the actual ACTOR (Seat4), the FuturePeek overlay is user-dismissed and carries no persistent badge after dismissal — by design (per CLAUDE.md: "FuturePeek has NO countdown. User-triggered 'Got it' only"). The scenario's UI assertion is conditional: "if any UI element showed the peeked top-3, it MUST clear." No such element persists post-dismiss, so the condition is vacuously satisfied. This is correct behavior, not a gap.

**Net finding:** The `detector-without-self` coverage divergence is caused by (a) Seat4 failing to self-report the scenario they were ACTOR for, and (b) Seat-1 filing a false-positive self-report from the wrong role using the wrong trigger card. The scenario itself fired cleanly.

## Proposed fix paths

**Option A — Tighten BURN-FILES-INVALIDATES-PEEK recognition criteria in seat agent prompt (effort: small / risk: low):** Add explicit language to the scenario's "Agent recognition criteria" distinguishing `intel-briefing` (triggers `future-peeked`, sets `pendingFuture`) from `falsify-intel` (triggers `future-rearranged`, reads and clears `pendingFuture`). The current criteria ("Played intel-briefing → future-peeked. Played burn-the-files → deck-shuffled.") are correct but not present as a distinguishing note against falsify-intel. Adding "NOTE: falsify-intel is NOT the trigger — look for intel-briefing and future-peeked in your event log" removes the surface-similarity trap that led seat-1 to misfire.

**Option B — Add role-gating to self-reported scenario fires in the harness (effort: medium / risk: low):** The harness currently records any seat's self-report for a scenario ID without validating the reporting seat held the expected ACTOR/TARGET role at the scenario's stateVersion. Adding a role-match gate would reject seat-1's self-report (OTHER alive, not ACTOR) at recording time and give cleaner signal. This is a broader harness change touching the scenario-fire recording path, but the underlying logic is straightforward (compare reporting seat's role at fire stateVersion against scenario's expected ACTOR set).

**Option C — Accept as known harness artifact, no fix (effort: tiny / risk: low):** Mark the specific `detector-without-self` pattern for BURN-FILES-INVALIDATES-PEEK as a known recognition artifact in sessions where a non-ACTOR seat also played a peek-adjacent card on an earlier turn. No catalog or prompt changes. The tier-2 oracle pass is authoritative confirmation the engine invariant held; the coverage divergence carries no actionable signal. Leaves the seat agent confusion uncorrected for future runs.

## Recommended next step

Apply Option A — add a card-type disambiguation note to the BURN-FILES-INVALIDATES-PEEK scenario's "Agent recognition criteria" block in `docs/testing/playtest/SCENARIOS.md`, distinguishing `intel-briefing`/`future-peeked` from `falsify-intel`/`future-rearranged`, so seat agents in the OTHER role do not misfired this scenario when they played falsify-intel on a prior turn.

---

**Triage seed kind:** scripted-scenario
**Triage agent session:** 038-burn-files-invalidates-peek
