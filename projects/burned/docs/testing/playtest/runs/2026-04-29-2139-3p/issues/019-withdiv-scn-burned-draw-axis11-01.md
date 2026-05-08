# 019-withdiv-scn-burned-draw-axis11-01 — Burned-draw auto-defuse scenario: known product call, tier-2 oracle failures are harness false negatives

**Severity (triage):** P2
**Status:** KNOWN-PRODUCT-CALL-CONFIRMED
**Seed kind:** with-divergence-fire
**Source seats:** 743313fe-cb8f-4962-9569-2ce9a644ec3a
**Linked scenarios:** SCN-BURNED-DRAW-AXIS11-01
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-04-29-2139-3p
**Candidate duplicate:** SCN-BURNED-DRAW-AXIS11-01 (linked: B-03)

## Player-POV summary

No seat log entries or suspicion entries were raised for this scenario. The fire record
originates from the harness coverage oracle, not from seat agent observations.

Seat2 (743313fe-cb8f-4962-9569-2ce9a644ec3a) drew the Burned card on their turn, held an
Extraction card, and entered the auto-defuse path. The game paused at defuse-pending awaiting
their placement. The scenario fired correctly at tier 1 (event shape matched). The tier-2
projection assertions then reported two failures — both are harness false negatives, not game
bugs (see Diagnosis).

## God-mode reality

From `server/events.jsonl` line 20 (stateVersion 20):
- action: `draw-card` — playerId: `743313fe-cb8f-4962-9569-2ce9a644ec3a` (Seat2 / ACTOR)
- new events emitted: `burned-drawn` (playerId: Seat2), then `extraction-played` (playerId: Seat2)
- resulting state: `subPhase: 'defuse-pending'`
- Seat2 projection: `pendingPrompt: {"type":"defuse","playerId":"743313fe-cb8f-4962-9569-2ce9a644ec3a"}`
- Seat2 projection: `myHand` — 7 cards, all types `"<redacted>"` per scrubber
- All other seats' projections: `pendingPrompt` identical (non-private field), `subPhase: 'defuse-pending'`

The engine correctly processed the auto-defuse path: Burned card drawn, Extraction auto-played
(Extraction lands in the board discard pile visible at `boardView.discardPile`), Burned card
stays in ACTOR's hand for placement, and `pendingPrompt.type = 'defuse'` is set with ACTOR's
UUID. Engine behavior is correct per `engine.ts` burned-draw path.

## Diagnosis

**The scenario fire is a known product call (SCN-BURNED-DRAW-AXIS11-01 suppressed per
`coverage.md` "Known product calls" section). The linked E2E issue is B-03 (disconnect-wedge
cluster). See B-04 specifically for the defuse-pending + drawer-disconnects sub-case.**

**The tier-2 oracle divergence is a harness false negative on two independent assertions:**

**Assertion 1 — `pendingPrompt.playerId` mismatch:**
The oracle's expected value was `{"type":"defuse","playerId":"$ACTOR"}`. The `$ACTOR`
placeholder was not substituted with the actual seat UUID before comparison. The projection
correctly returned `{"type":"defuse","playerId":"743313fe-cb8f-4962-9569-2ce9a644ec3a"}`,
which is the ACTOR. The failure is `"$ACTOR" !== "743313fe-cb8f-4962-9569-2ce9a644ec3a"` — a
template substitution gap in the tier-2 assertion runner, not a projection bug.

**Assertion 2 — `myHand contains card where type === 'burned'`:**
The scrubber (phase-3 Unit 4b) replaces every `myHand[*].type` with the literal
`"<redacted>"` per the scrubbed-field contract (phase-5 I4). The oracle assertion checks
`type === 'burned'` against a field that is ALWAYS redacted at triage time. This assertion
can never pass in its current form regardless of engine correctness — it is structurally
untestable against scrubbed artifacts.

Neither failure indicates an engine or projection bug. The engine state is correct.
These two defects affect any tier-2 assertion that (a) uses `$ACTOR`/`$TARGET`-style
placeholders that require UUID substitution, or (b) checks `myHand[*].type` against a
specific card type value.

## Proposed fix paths

**Option A — Suppress tier-2 oracle failures for known-product-call scenarios (tiny / low):**
Add a harness gate that skips tier-2 oracle evaluation when a scenario carries a
`known-product-call:` tag. The two defects below would be silenced automatically for
all suppressed scenarios. Tradeoff: real tier-2 regressions inside known-product-call
scenarios would also be silenced — may hide legitimate defects.

**Option B — Fix the two oracle defects independently (small / low):**
(b1) In the tier-2 assertion runner, substitute `$ACTOR`, `$TARGET`, and similar
role-placeholder tokens with resolved seat UUIDs before comparison. This is a one-site
fix in the assertion evaluation code. (b2) Replace `myHand contains card where type ===
'burned'` style assertions with scrubber-safe alternatives: check hand count delta
(`myHand.length === priorCount + 1`) or check `subPhase === 'defuse-pending'` as a proxy
for Burned-card-in-hand. Both (b1) and (b2) eliminate the false negatives without
suppressing tier-2 coverage generally. Tradeoff: requires updating assertion DSL in the
scenario catalog for any row that uses redacted fields or UUID placeholders.

**Option C — Flag these assertion classes as "scrubber-incompatible" and emit a separate
oracle quality warning (tiny / low):** Rather than silently failing, have the tier-2
runner detect `$ACTOR` un-substituted tokens and `myHand[*].type` assertions and emit a
`HARNESS-WARN: assertion-untestable-under-scrubber` signal instead of a pass/fail result.
This distinguishes harness-structural failures from real projection divergences and avoids
polluting the tier-2 failure count. Tradeoff: requires a new oracle signal class and
orchestrator handling.

## Recommended next step

Fix Option B (both b1 and b2) as the most complete resolution — substitute UUID
placeholders in the assertion runner and replace `myHand[*].type` checks with
scrubber-safe proxies — so that tier-2 oracle results are meaningful across all scenarios,
not just suppressed ones.

---

**Triage seed kind:** with-divergence-fire
**Triage agent session:** 019-withdiv-scn-burned-draw-axis11-01
