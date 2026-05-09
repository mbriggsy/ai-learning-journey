# 015-withdiv-scn-call-in-favor-normal-01 — Tier-2 oracle false-positive: pendingPrompt sampled at stateVersion pre-nope-resolution

**Severity (triage):** P1
**Status:** ✅ RESOLVED
**Seed kind:** with-divergence-fire
**Source seats:** 3c5a0afb-52d0-4eb8-89a7-a72336a788fa
**Linked scenarios:** SCN-CALL-IN-FAVOR-NORMAL-01
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-05-08-2022-5p
**Candidate duplicate:** 002-withdiv-scn-falsify-intel-normal-01 (same root cause: oracle samples projection at terminal, transient-state assertion fails)
**Resolution:** Fix landed 2026-05-09. Implementation matches triage Option A: extended `ProjectionAssertion` with optional `afterEvent` (parsed as `after-event:` in catalog YAML); `tier2Match` walks `flat[firstIdx..lastIdx]` for the first event of the named type and samples projections from THAT god-event instead of the terminal. SCN-CALL-IN-FAVOR-NORMAL-01's TARGET + OTHER_ALIVE pendingPrompt assertions now carry `after-event: favor-requested`, so the snapshot lands at the moment the prompt is actually set instead of post-favor-give-clear. Engine + projection layer untouched (no game bug). Contracts pinned by 3 new scenario-detector tests covering happy/sad paths + bad-anchor diagnostics.

## Player-POV summary

> *Quoted from seat-2's scenario-fire log at 2026-05-09T00:43:06Z:*
> "Called in a favor from Seat3. Nope window opened (Intercept window 8s, disabled for me as ACTOR). Window expired without interception. Seat3 prompted to surrender a card. Seat3 gave Back Channel. Coercion Report alert appeared. Hand now 8 (regained count). Pile still 30."

> *Quoted from seat-3's scenario-fire log at 2026-05-09T00:43:00Z:*
> "Seat2 played Call in a Favor targeting Seat3. Nope window appeared (Intercept · 4s — missed again). Responded as TARGET: double-tapped Back Channel to stage, clicked 'Surrender this card to Seat2 →'. Surrender confirmed. Clicked Acknowledge on Coercion Report modal."

From both the ACTOR (Seat2 / 3c5a0afb) and TARGET (Seat3 / 16916130) perspectives the favor sequence played correctly end-to-end: nope window opened and expired without cancellation, the TARGET received a favor-response prompt with a card picker, surrendered Back Channel, and both sides saw the Coercion Report alert. No player-visible anomaly was reported.

## God-mode reality

From `server/events.jsonl` line 10 (stateVersion 10, nowMs=1778287327274):
- Triggered by: `nope-window-expired` (server action)
- Events in this batch end with: `card-played` (playerId: 3c5a0afb, cardType: call-in-a-favor)
- `subPhase`: `turn-active`
- `pendingPrompt`: `null` (for all viewers — this is correct; nope window is still resolving)
- `nopeWindow`: `{ remainingMs: 0, deadlineMs: 1778287327272 }` — expired but grace not yet processed

From `server/events.jsonl` line 11 (stateVersion 11, nowMs=1778287327584):
- Triggered by: `nope-grace-expired` (server action)
- Events in this batch include: `nope-window-resolved { cancelled: false }` then `favor-requested { requesterId: "3c5a0afb-52d0-4eb8-89a7-a72336a788fa", targetId: "16916130-adfe-4ed8-a896-4e05ffc2740f" }`
- `subPhase`: `favor-pending`
- `pendingPrompt` for every viewer (TARGET, OTHER_ALIVE, ACTOR, SPECTATOR, BOARD): `{ "type": "favor-response", "playerId": "16916130-adfe-4ed8-a896-4e05ffc2740f", "requesterId": "3c5a0afb-52d0-4eb8-89a7-a72336a788fa" }`

The server correctly set `pendingPrompt` at stateVersion 11 — the exact value the oracle expected — and all five seat projections received it correctly. `applyFavor` in `engine.ts:539-549` ran as part of the `nope-grace-expired` batch and set `pendingPrompt` at `engine.ts:543`.

## Diagnosis

This is a **harness false-positive**. The engine, projection, and game logic are all correct.

The root cause is an **oracle snapshot-timing mismatch** in the tier-2 projection assertion for SCN-CALL-IN-FAVOR-NORMAL-01.

The scenario's `projection-assertions` check `pendingPrompt` with the annotation `source: projection.ts:47 via state.pendingPrompt set at engine.ts:543`. That annotation is accurate — `engine.ts:543` sets `pendingPrompt` inside `applyFavor`, which runs during nope-grace expiry. However, the tier-2 oracle sampled the projection snapshot at **stateVersion 10** — the god-event triggered by `nope-window-expired`, which captures state after `card-played (call-in-a-favor)` but *before* `nope-grace-expired` runs `applyFavor`.

At stateVersion 10 `pendingPrompt` is correctly `null` because the nope grace window has not yet expired; the favor has not yet been applied. The oracle's expected value `{ type: 'favor-response', ... }` only materializes at stateVersion 11 (the `nope-grace-expired` god-event), when `nope-window-resolved + favor-requested` land together and `applyFavor` executes.

The fire detector correctly matched all four required events (`card-played`, `nope-window-resolved`, `favor-requested`, `favor-given`) and declared a fire. But the tier-2 projection oracle did not advance its snapshot reference past the nope-window processing step before checking `pendingPrompt`. As a result it read stateVersion 10's null value against stateVersion 11's expected value and declared a divergence.

The identical structural issue likely exists for SCN-DIRECT-ORDER-NORMAL-01 and any other scenario whose projection assertions reference state fields that are set during nope-resolution (stacking or pending-prompt transitions), since those also pass through the `nope-window-expired` / `nope-grace-expired` two-step.

No code fix is needed in the engine or projection layer. The fix belongs entirely in the harness oracle.

## Proposed fix paths

**Option A — Add per-assertion `after-event` anchor to the scenario catalog (small / low):** Extend the `projection-assertions` grammar to support an optional `after-event: <event-type>` field. The oracle would advance the snapshot reference to the first stateVersion whose events array contains the named event before sampling the projection field. For SCN-CALL-IN-FAVOR-NORMAL-01 the assertion would carry `after-event: favor-requested`. This is the most principled fix: it makes the oracle's sampling intent explicit in the catalog, generalizes to all similar multi-step scenarios (Direct Order stack, Falsify Intel future-rearrange, etc.), and keeps the scenario file as the single source of truth. The grammar change is additive (backward-compatible for assertions without `after-event`). Effort: one schema addition + oracle read-loop change; risk: low — no engine or projection code touched.

**Option B — Fix oracle to always sample at the stateVersion of the last matched event in the fire sequence (tiny / low):** Instead of sampling the projection snapshot at the stateVersion when the FIRST matched event fires, advance to the stateVersion containing the LAST event in the fire signature before running projection assertions. For SCN-CALL-IN-FAVOR-NORMAL-01 the last signature event is `favor-given` (or `favor-requested` when checking pendingPrompt in the intermediate state), so the oracle would read the stateVersion at which `favor-requested` is present. This is simpler to implement (no schema change) but is a global behavioral change to tier-2 assertion timing across ALL scenarios — could hide legitimate divergences where an intermediate snapshot is important. Risk: medium for unintended coverage gaps in other scenarios.

**Option C — Mark the pendingPrompt assertion as `timing: post-sequence` in the scenario catalog comment and suppress the tier-2 divergence for this field in the Favor scenario (tiny / low):** Add a prose comment to the catalog's `projection-assertions` block explaining that `pendingPrompt` is only valid after `nope-window-resolved`. The oracle suppresses divergence on `pendingPrompt` for Favor scenarios when the observed value is `null` and the stateVersion snapshot precedes `favor-requested`. This is narrowly scoped and protects other assertions, but is a special-case band-aid rather than a structural fix, and does not generalize to similar timing issues elsewhere.

## Recommended next step

Implement Option A — add `after-event: favor-requested` to the `pendingPrompt` projection-assertions in SCN-CALL-IN-FAVOR-NORMAL-01 and extend the tier-2 oracle to honor it, auditing SCN-DIRECT-ORDER-NORMAL-01 and other nope-window scenarios for the same pattern at the same time.

---

**Triage seed kind:** with-divergence-fire
**Triage agent session:** 015-withdiv-scn-call-in-favor-normal-01
