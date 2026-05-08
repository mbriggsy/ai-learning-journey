# 013-scn-skip-normal-01 — SCN-SKIP-NORMAL-01 fire matched to B-13 disconnect-wedge known product call

**Severity (triage):** P2
**Status:** ✅ KNOWN-PRODUCT-CALL-CONFIRMED
**Seed kind:** scripted-scenario
**Source seats:** seat-2
**Linked scenarios:** SCN-SKIP-NORMAL-01
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-04-29-2139-3p
**Candidate duplicate:** SCN-SKIP-NORMAL-01 + linked E2E-ISSUE-LIST ID B-13

## Player-POV summary

> *Quoted from seat-2's log at 2026-04-30T02:01:00Z:*
> "Seat3 played a skip/end-turn card during their turn. Nope window opened (Intercept · 10s). Window expired with no intercept. Turn passed to Seat1. Draw pile unchanged at 20."

Seat-2 observed Seat3 execute what it labeled `SCN-SKIP-NORMAL-01`: a skip-type card play (consistent with Go Dark) that resolved cleanly — nope window ran 10 s, expired without intercept, turn advanced to Seat1, draw pile unchanged at 20 confirming no draw was made. Seat-2's role was OTHER (alive) throughout this window.

Separately, at 02:09 UTC (8 minutes later), the session ended with a server-down connection failure while Seat1 was the active player — pile at 18, Seat1 on deck — consistent with B-13 behavior (active player mid-`turn-active`, turn never advances because the server is gone).

## God-mode reality

The `server/events.jsonl` file was too large to page in full (348 KB); grep for `go-dark` and `reassign` returned no matches at the card-type literal level (the event encoding uses a different field format). The seat-2 log entry at 02:01:00Z self-describes the fire signature: `card-played{go-dark}` → nope window 10 s → `nope-window-resolved{cancelled:false}` → `turn-started{Seat1, turnsRemaining:1}`. Draw pile count corroborated by both pre- and post-observation (20 → 20). The scenario appears to have fired correctly. No god-mode divergence is apparent from the seat-log evidence.

Coverage.md lists SCN-SKIP-NORMAL-01 as **unfired** by the detector despite seat-2's self-report of a fire. The coverage report also records "Self-vs-detector divergences: None this run." These two facts are contradictory — the divergence was either silently suppressed or the detector uses a different canonical scenario ID (`SCN-GO-DARK-NORMAL-01`) for the same fire shape, causing seat-2's custom `SCN-SKIP-NORMAL-01` label to miss the match.

## Diagnosis

The clusterer populated the candidate duplicate field with `KNOWN-PRODUCT-CALL → SCN-SKIP-NORMAL-01 (linked: B-13)`. Per triage protocol, this is **KNOWN-PRODUCT-CALL-CONFIRMED**.

**B-13** (E2E-ISSUE-LIST.md, status ⏸): "Active player mid-`turn-active` disconnects → turn never advances." This is part of the disconnect-wedge cluster (B-03 through B-07 + B-13), all ⏸ BLOCKED pending Briggsy's disconnect-wedge adjudication. Per SCENARIOS.md known-product-call ledger, B-13 has no dedicated scenario ("Adjacent to `SCN-CONN-NAME-CARD-PENDING-DISCONNECT-01`. No dedicated scenario. Unit 7 gap check.").

The most plausible clusterer reasoning: the session ended at 02:09 with Seat1 as the active player when the server crashed — a classic B-13 trigger (turn never advances). The clusterer attached this to the SCN-SKIP-NORMAL-01 seed because the two are close in the event timeline and because the seed's own fire observation left Seat1 as the next active player in the turn rotation.

Two secondary anomalies worth flagging for Briggsy:

1. **SCN-SKIP-NORMAL-01 is not in SCENARIOS.md.** Searches for "SCN-SKIP" and "SKIP-NORMAL" return no matches in the 394 KB catalog file. The coverage system tracks it as an axis-11 scenario, but the scenario document does not define it under that ID. Either the coverage manifest uses a name that diverges from the catalog document, or this is a catalog gap that predates Unit 7 completion.

2. **Self-vs-detector divergence not surfaced.** Seat-2 self-reported a fire at 02:01; the detector listed SCN-SKIP-NORMAL-01 as unfired; coverage.md records no self-vs-detector divergences. This three-way inconsistency suggests the detection layer either mapped the fire to a different scenario ID (likely `SCN-GO-DARK-NORMAL-01`) or silently dropped the seat self-report.

## Proposed fix paths

Fix paths are omitted for KNOWN-PRODUCT-CALL-CONFIRMED findings per protocol. See linked E2E entry **B-13** for the three disconnect-wedge resolution options: (a) accept 15-min nuke, (b) disconnect-only auto-resolve with safe defaults (recommended in E2E entry), (c) host vote-to-kick.

For the secondary anomalies:

**Option A — Catalog audit (tiny / low):** Search SCENARIOS.md for the section that should define SCN-SKIP-NORMAL-01 (possibly a section covering generic skip/turn-end mechanics independent of Go Dark). If missing, add a stub. Reconcile the coverage manifest's scenario list against the catalog document as a Unit 7 gap check.

**Option B — Scenario ID normalization (small / low):** If SCN-SKIP-NORMAL-01 is intentionally a distinct scenario (covering Reassign's skip effect separately from Go Dark's), add the scenario to the catalog. If it aliases SCN-GO-DARK-NORMAL-01, delete the alias and update the coverage manifest. Either way, the seat-agent recognition criteria should produce the canonical ID, not a local label.

## Recommended next step

Treat the core B-13 finding as ⏸ per the existing known-product-call ruling; separately, audit whether SCN-SKIP-NORMAL-01 is a catalog gap or a naming divergence between the coverage manifest and the scenario document (Option A).

---

**Triage seed kind:** scripted-scenario
**Triage agent session:** 013-scn-skip-normal-01
