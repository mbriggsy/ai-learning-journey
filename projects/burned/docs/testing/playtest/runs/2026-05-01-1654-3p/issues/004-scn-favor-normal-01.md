# 004-scn-favor-normal-01 — Normal favor exchange is clean; candidateDuplicate is a clusterer false-positive

**Severity (triage):** P2
**Status:** 〰 LOW-SIGNAL
**Seed kind:** scripted-scenario
**Source seats:** seat-1
**Linked scenarios:** SCN-FAVOR-NORMAL-01 (catalog: SCN-CALL-IN-FAVOR-NORMAL-01)
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-05-01-1654-3p
**Candidate duplicate:** SCN-CALL-IN-FAVOR-TARGET-DISCONNECT-01 / B-05 — CATALOG MISMATCH (see Diagnosis)

## Player-POV summary

> *Quoted from seat-1's suspicion log at 2026-05-01T21:07:20Z (vibe-check):*
> "The Coercion Report dossier overlay is a high-water mark — monospace typeface, tilted 'SURRENDERED' stamp, '// EYES ONLY · M.' footer. The full exchange (Seat2 demands, prompt landed before card moved, I chose Vera Khan, dossier confirmed the theft) had a clear cinematic arc. Felt like Malory requisitioning a field asset, not a form submission."

> *Quoted from seat-1's suspicion log at 2026-05-01T21:07:25Z (severity: low):*
> "Favor-TARGET experience: prompt landed cleanly before any card moved, coercion report dossier appeared after surrender — both felt correct and the design was high quality."

Seat-1 was the TARGET in a normal favor exchange initiated by Seat2. Both entries are positive confirmations — the prompt sequenced correctly before any card movement, the Coercion Report dossier presented after surrender, and the overall arc read as cinematic. No complaint was raised; the severity-low suspicion is an explicit positive attestation, not a concern flag.

## God-mode reality

From `server/events.jsonl` lines 5-8:
- stateVersion 5 (nowMs 1777669563341) — `card-played` (playerId: Seat2 / 2677bf78, cardType: `call-in-a-favor`, targetPlayerId: Seat1 / 26b21187)
- stateVersion 6 (nowMs 1777669573351) — `nope-window-expired` (generation 2)
- stateVersion 7 (nowMs 1777669573653) — `nope-grace-expired` resolves to `nope-window-resolved {cancelled:false, chainDepth:0}` + `favor-requested {requesterId:Seat2, targetId:Seat1}`; state transitions to `subPhase:'favor-pending'`; Seat1 projection shows `pendingPrompt:{type:'favor-response', playerId:Seat1, requesterId:Seat2}` with hand unchanged at 7 cards
- stateVersion 8 (nowMs 1777669623066) — `favor-give` dispatched by Seat1; events include `favor-given {giverId:Seat1, receiverId:Seat2, cardType:'vera-khan'}`; state returns to `subPhase:'turn-active'`, `pendingPrompt:null`; Seat1 drops 7→6 cards, Seat2 rises 7→8 cards

The server executed the complete SCN-CALL-IN-FAVOR-NORMAL-01 fire signature exactly as the catalog specifies. All projection assertions in the catalog pass at stateVersion 7: Seat1's `pendingPrompt` is `{type:'favor-response', playerId:Seat1, requesterId:Seat2}` (catalog expects `{type:'favor-response', playerId:$TARGET, requesterId:$ACTOR}`); Seat1's hand is unchanged until favor-give dispatches; the public `pendingPrompt` is visible to all viewers including Seat3 and the board. The `favor-given` event emits `cardType:'vera-khan'` to the giver and receiver projections, and correctly strips `cardType` from the Seat3 and board-view projections — consistent with the `stripPrivateEventFields` contract in `src/server/projection.ts`.

## Diagnosis

**No engine or UI bug found.** The normal favor scenario executed correctly end-to-end. Seat-1 reported a positive experience and the server log corroborates it.

The one actionable finding is a **clusterer false-positive** in the `candidateDuplicate` field. The triage spec received `candidateDuplicate = "KNOWN-PRODUCT-CALL → SCN-FAVOR-NORMAL-01 (linked: B-05)"`. Verifying against the catalog directly:

- The B-05 `known-product-call:` tag lives in `SCN-CALL-IN-FAVOR-TARGET-DISCONNECT-01` (the disconnect scenario, SCENARIOS.md line 3493), not in `SCN-CALL-IN-FAVOR-NORMAL-01` (the normal favor scenario, SCENARIOS.md line 3022).
- `SCN-CALL-IN-FAVOR-NORMAL-01` carries `known-product-call: none` (SCENARIOS.md line 3399).

The clusterer's duplicate-detection logic appears to have matched on a proximity or substring criterion — the B-05 tag appears in the section immediately following the normal-favor scenario in the markdown document, and both share the "Call in a Favor" heading hierarchy. The clusterer surfaced a cross-scenario tag leak rather than a true match. Per Ruling C / I3, the catalog's `known-product-call:` field is the authority; this seed is NOT a known-product-call candidate.

## Proposed fix paths

**Option A — Add scenario-ID guard to the clusterer's duplicate-detection lookup (small / low):** The clusterer should resolve a `known-product-call:` tag only when the tag is found inside the boundary of the exact scenario section matched by the fire-signature detector. Concretely: the tag lookup should be scoped to the YAML/frontmatter block directly under the matching `#### SCN-*` heading, not to any tag found within N lines of the scenario or in the sibling section. This is a harness-only change with no game-code impact and no risk of false negatives since each scenario section is clearly delimited by `####` headings.

**Option B — Add a scenario-ID assertion in the duplicate-check step of each triage agent (tiny / low):** When `candidateDuplicate` is populated, the triage agent verifies that the catalog entry for the linked scenario ID actually carries the claimed `known-product-call:` tag before writing `KNOWN-PRODUCT-CALL-CONFIRMED`. This is already the required process per the spec (Ruling C), so this option formalises what triage agents must do anyway. It does not fix the upstream clusterer false-positive but gives a safety net that surfaces the mismatch as an explicit note rather than silently filing a false CONFIRMED. Low effort, low risk, but treats the symptom rather than the cause.

**Option C — Tighten scenario-section parsing in the clusterer to use structured YAML blocks (medium / low):** Rather than relying on markdown proximity, the clusterer could parse each scenario section's structured YAML block (fire-signature, projection-assertions, etc.) into a typed object and read `knownProductCall` from that object. This would eliminate the entire class of cross-section tag leakage. Higher up-front effort but removes the root cause rather than adding guards. Appropriate as a Phase 6 harness hardening task.

## Recommended next step

Apply Option A as an immediate clusterer guard — scope the `known-product-call:` tag lookup to the matched scenario section boundary — then add an Option B assertion in the triage agent template as a belt-and-suspenders check for the next session.

---

**Triage seed kind:** scripted-scenario
**Triage agent session:** playtest-triage / 004-scn-favor-normal-01
