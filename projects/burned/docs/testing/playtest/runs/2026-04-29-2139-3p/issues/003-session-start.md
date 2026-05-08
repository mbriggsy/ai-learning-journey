# 003-session-start — Uncatalogued scenario ID "SESSION-START" fired by seat-3; no catalog definition exists

**Severity (triage):** P2
**Status:** ✅ RESOLVED (2026-05-08)
**Seed kind:** scripted-scenario
**Source seats:** seat-3
**Linked scenarios:** SESSION-START
**Viewer role (if ui-spec-divergence):** n/a
**Session:** 2026-04-29-2139-3p
**Candidate duplicate:** n/a

## Player-POV summary

> *Quoted from seat-3's scenario-fire log at 2026-04-30T01:46:10Z:*
> "Page loaded. Seat1 is on deck. Draw pile has 22 cards. My hand has 8 cards: Dash Barlowe, Sable Ashworth, Janet Broadside, Neal Proctor x2, Direct Order, Go Dark, Extraction."
> "Role: OTHER (alive). Waiting for Seat1 to complete their turn."

Seat-3 navigated to the player URL and joined room CALSWF, observing a consistent initial game state: draw pile at 22, an 8-card starting hand, and role correctly shown as OTHER (alive) with Seat1 on deck. The seat agent logged this as a `scenario-fire` against scenario ID `SESSION-START`. A related suspicion (01:50:25Z, medium, `relatedScenario: null`) noted the game was idle on Seat1's turn for approximately 3 minutes before any action was taken — eventually resolving after ~10 minutes — but that suspicion was not linked to SESSION-START.

## God-mode reality

From `server/events.jsonl` (file confirmed present at `docs/testing/playtest/runs/2026-04-29-2139-3p/server/events.jsonl`):

Note: events.jsonl could not be directly grepped for this seed. The file contains 29 records, each a single wide JSON line exceeding the grep tool's per-line processing limit. Direct line-number citations are unavailable from this triage pass. Based on `session.md` (session started at `2026-04-29T21:39:06` local / approx `2026-04-30T01:39:06Z`), the server would have emitted a `game-started` event approximately 7 minutes before the seat-3 fire timestamp, consistent with seat agent initialization time. No divergence from expected initial state is visible in the seat log.

## Diagnosis

The root cause is a harness-level catalog gap: scenario ID `SESSION-START` does not exist in `docs/testing/playtest/SCENARIOS.md`. Two independent grep passes against the catalog (patterns `SESSION-START`, `SESSION.START`, `session.start`, and broader session/join/lobby variants) returned no matches. The catalog covers axis-11 scenarios keyed on card types and information-asymmetry moments; there is no scenario entry with this ID, no fire signature, no info-gap table, and no `known-product-call:` tag.

The seat agent (seat-3, and by parallel construction seat-1 per triage seed 001) was scripted to emit a `scenario-fire` entry with `scenarioId: "SESSION-START"` upon successfully navigating to the player URL and observing the initial game state. Because the ID has no catalog definition, the tier-1/2/3 detector cannot evaluate the fire — it simply goes unmatched. This is consistent with the coverage report (`fired 0 / threshold 1`) and the absence of any self-vs-detector divergence note in `coverage.md` for this scenario ID: the detector never sees it as a candidate, so there is no divergence to record.

The underlying game state at session start was internally consistent per the seat-3 observation (8-card starting hand, draw pile at 22, correct role, correct on-deck player). No engine bug, projection leak, or rule violation is visible from this seed. The 3-to-10-minute Seat1 idle delay noted in the related suspicion is an operational harness timing concern, not a game engine issue (per product policy: "game waits for you" — no prompt timeouts exist outside the Nope window).

## Proposed fix paths

**Option A — Add SESSION-START to the scenario catalog as an axis-14 scenario (small / low):** Draft a formal SESSION-START scenario with a fire signature keyed on the `game-started` server event, covering initial state legibility for each seat role (correct hand count, correct draw pile count, correct on-deck player, correct role label). This makes the self-report machine-verifiable and integrates session initialization into the coverage matrix. Tradeoff: SESSION-START has no meaningful information-asymmetry axis (axis 11) to exercise — it is a structural observation, not a decision-point — so the scenario would contribute to coverage metrics without testing the class of bug the harness was built to catch. Also adds catalog maintenance burden for a low-signal moment.

**Option B — Remove SESSION-START from seat agent scripts (tiny / low):** Treat session join as operational infrastructure (like browser navigation) rather than a scenario observation. Seat agents stop emitting `scenario-fire` entries for `scenarioId: "SESSION-START"`. The triage queue stops receiving seeds for an uncatalogued ID in future runs. Coverage counts are unaffected (the ID was already excluded from the denominator). The initial-state consistency signal is captured implicitly by the first legitimate scenario fire (e.g., the TURN-TRANSITION or first card-play fire). Tradeoff: any future regression in initial-state rendering (role wrong, hand count wrong on first load) would not be caught by the harness until the first card-play scenario fires.

**Option C — Add a clusterer suppression annotation for SESSION-START (tiny / low):** Without modifying seat agent scripts or the catalog, add `SESSION-START` to a known-uncatalogued-scenarios suppression list in the clusterer so future runs do not generate triage seeds for this ID. The seat agent continues emitting the fire entry; the clusterer silently drops it before triage. Tradeoff: this is a duct-tape fix — the underlying mismatch (seat agent reports a scenario ID that doesn't exist in the catalog) persists, and the suppression list itself becomes a secondary maintenance surface. The root cause (undefined ID in seat agent script) is masked rather than resolved.

## Recommended next step

Apply Option B — remove the SESSION-START `scenario-fire` emission from seat agent scripts, treating it as an operational navigation step rather than a catalogued gameplay scenario, and update the harness documentation to note this distinction.

## Resolution — 2026-05-08

Closed — same root cause and same fix as sibling seed #001. The
schema-validator catalog gate (Option B in this seed's recommended
fix paths) landed in commit `afff4181` on 2026-05-01 — commit
subject explicitly cites #001/002/003/011/018. `SESSION-START` now
parse-errors at log-read time and never reaches the clusterer.

The recommended next step in the body (Option B — remove SESSION-START
from seat agent scripts) is the agent-side complement to the
parser-side fix; the agent-prompt update lives in
`scripts/playtest/agents/seat-scripted.md` (line 437) and
`seat-free-play.md` (line 372) which already restrict
`relatedScenario` to `null` or a catalog SCN-* ID. The agent prompt
update for `scenarioId` itself is partially covered there but could
be tightened — flagged in the closure-bundle commit body.

Citation: `scripts/playtest/lib/log-parser.ts:52-70` + `:207-219` +
`scripts/playtest/lib/triage-pipeline.ts:107`.

---

**Triage seed kind:** scripted-scenario
**Triage agent session:** n/a (no subagent session ID surfaced)
