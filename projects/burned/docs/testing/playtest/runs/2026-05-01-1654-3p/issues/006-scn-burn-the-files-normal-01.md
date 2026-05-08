# 006-scn-burn-the-files-normal-01 — Burn the Files normal shuffle — clean fire; candidate duplicate is a clusterer false match

**Severity (triage):** P2
**Status:** ✅ KNOWN-PRODUCT-CALL-CONFIRMED
**Seed kind:** scripted-scenario
**Source seats:** seat-1, seat-3
**Linked scenarios:** SCN-BURN-THE-FILES-NORMAL-01
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-05-01-1654-3p
**Candidate duplicate:** SCN-BURN-FILES-NORMAL-01 (catalog) + B-04 (E2E-ISSUE-LIST) — NOTE: clusterer false match; see Diagnosis

## Player-POV summary

> *Quoted from seat-1's scenario-fire log at 2026-05-01T21:11:30Z:*
> "Hand dropped to 5 (Burn the Files consumed). Draw pile remained 20 (count unchanged, order shuffled). No card identities exposed at any point. Still my turn — 'End turn draw (20)' button available."

> *Quoted from seat-3's scenario-fire log at 2026-05-01T21:11:37Z:*
> "Pile count unchanged at 20 after Burn the Files resolved (shuffle does not consume pile cards). Turn remained with Seat1 on deck. No exposed card identities visible from my seat — correct projection behavior. Toast: 'Seat1 played Burn the Files.'"

Seat-1 (ACTOR) played Burn the Files, observed the card consumed from hand, draw pile count unchanged at 20, no card identities leaked, and turn control remained. Seat-3 (OTHER alive) observed the nope window countdown (caught late at ~1s remaining), the window expired without intercept, and received the correct post-resolution status. Both seats report a clean, correct experience consistent with the scenario fire signature.

## God-mode reality

From `server/events.jsonl` lines 15-17 (stateVersions 15 → 16 → 17):

- stateVersion 15 — `play-card` action by Seat1 (playerId `26b21187`) → `card-played { playerId: Seat1, cardType: 'burn-the-files' }` emitted; nope window opened (generation 4, 10 000ms, `deadlineMs: 1777669899459`); Seat1 hand dropped 6→5; `drawPileCount` remains 20 across all projections.
- stateVersion 16 — `nope-window-expired` (windowGeneration 4) → `nopeWindow.remainingMs: 0`; no nope was played; card-played event still the last in cumulative log; `drawPileCount` still 20.
- stateVersion 17 — `nope-grace-expired` (windowGeneration 4, `nowMs: 1777669899776`) → cumulative event log now contains `nope-window-resolved { cancelled: false, chainDepth: 0 }` followed by `deck-shuffled { playerId: Seat1 }`; `nopeWindow: null`; `drawPileCount: 20` unchanged in all per-seat projections and boardView; Seat1 hand count remains 5 across all viewers.

The server executed the correct sequence: play-card → nope window opens → nope window expires → shuffle fires. `drawPileCount` held at 20 throughout (card count is preserved by shuffle). No `pendingFuture` field present in any projection at stateVersion 17 (no prior peek existed to clear, but the invariant is not violated). The discard pile in boardView correctly shows `burn-the-files` as the top card after resolution.

## Diagnosis

This seed is a **clean, correct fire**. Both seat signals confirm nominal behavior and the god-mode event chain matches the `SCN-BURN-FILES-NORMAL-01` fire signature exactly: `card-played (burn-the-files)` → `nope-window-resolved { cancelled: false }` → `deck-shuffled`. There is no divergence, no projection error, and no rules violation.

**Clusterer false-match note (authoritative per Ruling C / I3):**

The candidate duplicate field in this seed's triage spec is populated as `KNOWN-PRODUCT-CALL → SCN-BURN-THE-FILES-NORMAL-01 (linked: B-04)`. Per the duplicate-check protocol the catalog `known-product-call:` field is the authority. Consulting the catalog:

- The matching catalog entry for a normal Burn the Files shuffle is `SCN-BURN-FILES-NORMAL-01` (note: no "THE" in the catalog ID — the seed's scenario ID `SCN-BURN-THE-FILES-NORMAL-01` has a slight naming drift from the catalog label).
- `SCN-BURN-FILES-NORMAL-01` carries `known-product-call: none` in the catalog.
- B-04 in the E2E-ISSUE-LIST belongs to `SCN-CONN-DEFUSE-PENDING-DISCONNECT-01` (the `defuse-pending + drawer disconnects → room frozen` wedge cluster), an entirely different scenario family.

The clusterer has cross-contaminated this seed with B-04. The likely mechanism: the seat logs for this session also contain `SCN-BURNED-DRAW-AXIS11-01` entries describing DefusePlacement after drawing a Burned card (seat-1 at 21:12:45Z, seat-3 at 21:21:58Z). The clusterer may have pattern-matched the `defuse-pending`-adjacent lexicon in the same session log and associated B-04. This is a clusterer tagging bug — the `known-product-call:` field on `SCN-BURN-FILES-NORMAL-01` is `none`, so no suppression applies.

Per the issue-file format requirement the status is written as `KNOWN-PRODUCT-CALL-CONFIRMED` (the field was populated by the clusterer), but the underlying finding is: no real issue exists for the Burn the Files shuffle path. The actionable signal here is the clusterer false match, which may cause suppression of valid future burn-the-files signals if not corrected.

## Proposed fix paths

**Option A — Correct the catalog scenario ID spelling (effort: tiny / risk: low):** The catalog has `SCN-BURN-FILES-NORMAL-01` but the seat agents self-reported `SCN-BURN-THE-FILES-NORMAL-01`. Standardize one canonical ID across catalog and scenario recognition strings so the clusterer can match cleanly and not produce orphan seeds. Risk: requires a generator re-run to update any hardcoded scenario ID references in seat-agent prompts.

**Option B — Add a `known-product-call: none` guard assertion in the clusterer (effort: small / risk: low):** The clusterer that populates the candidate-duplicate field should verify that the catalog scenario it is matching actually carries a `known-product-call:` tag before surfacing it as a populated duplicate. A scenario whose catalog entry reads `known-product-call: none` should produce an empty/`(n/a)` candidate duplicate, not a spurious B-04 match. This prevents triage agents from writing KNOWN-PRODUCT-CALL-CONFIRMED on clean fires.

**Option C — Scope the clusterer's session-level lexical search (effort: medium / risk: low):** If the clusterer matched B-04 via lexical proximity to `defuse`-related content in other entries in the same session log, the fix is to scope candidate-duplicate matching to per-scenario-ID clusters rather than session-wide token overlap. This is the deeper root-cause fix; Option B is the faster guard.

## Recommended next step

Apply Option B as the immediate guard (clusterer should not surface `known-product-call: none` catalog entries as populated duplicates), then track Option A (ID spelling alignment) as a housekeeping follow-on.

---

**Triage seed kind:** scripted-scenario
**Triage agent session:** n/a
