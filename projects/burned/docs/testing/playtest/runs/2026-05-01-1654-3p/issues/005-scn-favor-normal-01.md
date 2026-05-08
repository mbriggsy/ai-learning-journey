# 005-scn-favor-normal-01 — Normal Favor play — KNOWN-PRODUCT-CALL-CONFIRMED against B-05 (possible clusterer false positive — see diagnosis)

**Severity (triage):** P2
**Status:** ✅ KNOWN-PRODUCT-CALL-CONFIRMED
**Seed kind:** scripted-scenario
**Source seats:** seat-1
**Linked scenarios:** SCN-FAVOR-NORMAL-01
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-05-01-1654-3p
**Candidate duplicate:** SCN-FAVOR-NORMAL-01 (linked: B-05)

## Player-POV summary

> *Quoted from seat-1's scenario-fire log at 2026-05-01T21:10:22Z:*
> "Favor played → Seat2. Nope window passed. Waited for Seat2 to surrender. Received Vera Khan from Seat2. Hand went 5→6. Coercion Report dossier showed 'EXTRACTED' stamp. Toast: 'You squeezed Vera Khan from Seat2'. Card identity arrived clean — no ghost staging."

Seat-1 (ACTOR) staged a Call in a Favor targeting Seat2, who had 9 cards. The full ACTOR arc resolved without anomaly: stage → target select → nope window → favor-pending wait → card receipt + coercion report. The asymmetric EXTRACTED (actor) vs SURRENDERED (target) stamps were noted as a strong design detail. No disconnect event occurred and no suspicion was raised.

## God-mode reality

Full `events.jsonl` analysis was not performed per the KNOWN-PRODUCT-CALL-CONFIRMED process — a brief file is warranted. The seat-1 scenario-fire entry confirms the canonical `card-played` → `nope-window-resolved` → `favor-requested` → `favor-given` event sequence fired correctly with no anomalies self-reported by the seat agent. No seat suspicion entry was appended for this scenario.

## Diagnosis

The orchestrator's clusterer pre-populated the candidate duplicate field as:

`KNOWN-PRODUCT-CALL → SCN-FAVOR-NORMAL-01 (linked: B-05)`

Per the REQUIRED PROCESS (step 1), this populated field triggers **KNOWN-PRODUCT-CALL-CONFIRMED** status.

**However, a catalog discrepancy warrants flagging for harness review:**

1. **Scenario ID mismatch.** The seat agent logged `scenarioId: "SCN-FAVOR-NORMAL-01"`. The scenario catalog contains no entry with that exact ID. The canonical normal-favor scenario in the catalog is `SCN-CALL-IN-FAVOR-NORMAL-01`. This is a seat-agent naming divergence from the catalog.

2. **B-05 is not tagged on the normal-favor scenario.** Catalog entry `SCN-CALL-IN-FAVOR-NORMAL-01` carries `Known product call: none`. The `known-product-call: B-05` tag lives on `SCN-CONN-FAVOR-PENDING-DISCONNECT-01` — the scenario describing what happens when the favor TARGET disconnects mid-pending. B-05 in `docs/testing/E2E-ISSUE-LIST.md` is: "`favor-pending` + target disconnects → room frozen" (⏸ BLOCKED pending Briggsy's disconnect-wedge adjudication).

3. **The seat log shows no disconnect.** The normal favor play completed cleanly end-to-end. There is no disconnect event, no wedge condition, and no product-call-relevant behavior in the session artifact.

**Assessment:** This appears to be a clusterer false positive. The clusterer likely matched `SCN-FAVOR-NORMAL-01` against the `favor`-keyed B-05 entry by name proximity rather than by a true `known-product-call:` tag on the fired scenario. The underlying game behavior observed is correct. The issue here is harness-level (scenario ID used by seat agent does not match catalog canonical ID, which caused the clusterer to resolve a spurious B-05 match).

Linked E2E prose for B-05 (quoted for reference, per process step 4 — does not override the tag-based decision):
> "B-05 — `favor-pending` + target disconnects → room frozen (⏸). Options to present: (a) keep current policy, accept 15-min nuke; (b) introduce disconnect-only auto-resolve (confirmed disconnect triggers safe default — doesn't affect slow deciders); (c) host vote-to-kick a stalled seat. Recommending (b)."

## Proposed fix paths

Fix paths for the underlying B-05 product call are omitted — see `docs/testing/E2E-ISSUE-LIST.md` entry B-05 and the disconnect-wedge cluster (B-03/04/05/06/07/13). Adjudication is pending Briggsy.

For the **harness false positive**, two options:

**Option A — Align seat-agent scenario IDs to catalog (small / low):** Update the seat agent prompt template or scenario-recognition criteria to use the canonical `SCN-CALL-IN-FAVOR-NORMAL-01` ID rather than the abbreviated `SCN-FAVOR-NORMAL-01`. The clusterer's known-product-call lookup is keyed on the scenario ID; an exact-match discipline eliminates this class of false positive.

**Option B — Add clusterer guard: verify `known-product-call` tag on the matched catalog entry before populating candidate duplicate (small / low):** Before the clusterer emits `KNOWN-PRODUCT-CALL → <id> (linked: <e2e-id>)`, confirm the fired scenario's canonical catalog entry actually carries the referenced `known-product-call:` tag. If no exact-ID match is found or the matched entry carries `none`, emit `(n/a)` instead. This is a defense-in-depth complement to Option A.

## Recommended next step

Adopt Option A (canonical scenario ID alignment in seat-agent prompts) as the primary fix, with Option B as a defense-in-depth guard in the clusterer to prevent recurrence on any future ID-drift.

---

**Triage seed kind:** scripted-scenario
**Triage agent session:** 005-scn-favor-normal-01
