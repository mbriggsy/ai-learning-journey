# Insight 042 — Calibration catalog drifts from engine event shapes; `coverage: fired 0` is field-name mismatch, not prompt-tuning

**Date:** 2026-04-30
**Discovered while:** Investigating TODO item #17 (`fired 0 / threshold 1` in `runs/2026-04-29-2139-3p` despite agents observably exercising 4 distinct catalog scenarios).
**Status:** CLOSED 2026-04-30 morning. Catalog renames + agent-launcher role-primary fix landed; `detectFires` replay against the prior run's saved `events.jsonl` reports `fired 4 / threshold 1` (was 0). The "judgment call" framing was a false dichotomy — both scenarios kept, renamed to match engine card types (`SCN-SKIP-NORMAL-01` → `SCN-GO-DARK-NORMAL-01`; old `SCN-GO-DARK-NORMAL-01` → `SCN-BURN-THE-FILES-NORMAL-01`).

## Symptom

`docs/testing/playtest/runs/2026-04-29-2139-3p/coverage.md`:
```
Fired: 0 / target: 1 — UNDER-COVERED
```

Agents' suspicions and seat logs reference `SCN-FAVOR-NORMAL-01`,
`SCN-GO-DARK-NORMAL-01`, `SCN-SKIP-NORMAL-01`, `SCN-BURNED-DRAW-AXIS11-01`
in `vibe-check` and `ui-spec-divergence` entries. Triage clustering
correctly grouped them into 22 seeds with proper scenario IDs. But
`coverage-reporter` says nothing fired.

## TODO's diagnosis was wrong layer

TODO item #17 framed the issue as: *"agents log scenario references in
vibe-check / ui-spec-divergence entries, NOT formal `scenario-fire`
entryType. Fix path: clarify in `seat-scripted.md` template that every
catalog-scenario observation MUST start with a `scenario-fire` entry."*

That diagnosis would not have helped. `coverage-reporter`'s `firedIds`
set comes from `detectFires(catalogPath, eventsJsonlPath, …)` — a
pure-disk reader of `events.jsonl` (god-event broadcast stream),
NOT a reader of seat-log `scenario-fire` entries. The only consumer of
seat-log `scenario-fire` entries is the triage clusterer
(`cluster-suspicions.ts:828`). Whether agents write `scenario-fire`
entries or not is **independent** of the coverage gate.

`scripts/playtest/lib/scenario-detector.ts:1161-1178` (`detectFires`)
takes `_seatLogPaths` as an underscore-prefixed unused parameter — the
matcher doesn't read seat logs at all.

## Real root cause

`scripts/playtest/fixtures/mini-catalog.md`'s fire signatures use
field names and event names that don't exist in the actual engine.

### Confirmed drifts (cross-checked against `src/shared/types.ts:35-65`
and `events.jsonl` from the run):

**SCN-FAVOR-NORMAL-01:**
- Catalog: `favor-requested where { playerId: $ACTOR, targetId: $TARGET }`
- Engine: `favor-requested { requesterId, targetId }` — field rename
- Catalog: `favor-given where { playerId: $TARGET, recipientId: $ACTOR }`
- Engine: `favor-given { giverId, receiverId }` — both fields renamed

**SCN-COMBO-TRIPLE-NAMED-STEAL-NORMAL-01:**
- Catalog: `combo-steal where { playerId: $ACTOR, targetId: $TARGET }`
- Engine: `combo-steal { stealerId, targetId, found, cardType? }` — `playerId` should be `stealerId`

**SCN-SKIP-NORMAL-01:**
- Catalog: `card-played where { cardType: skip }` — there is **no `skip`
  card type**. Card-defs (`src/shared/card-defs.ts`) has `go-dark`
  ("End your turn without drawing" — the BURNED rename of Skip),
  `reassign` (Attack), `direct-order` (Targeted Attack),
  `burn-the-files` (Shuffle).
- Catalog: `turn-ended` event — **engine never emits `turn-ended`**.
  Closest signal is the next player's `turn-started`.

**SCN-GO-DARK-NORMAL-01:**
- The scenario title and prose ("Go Dark stack-shuffle with no exposed
  identities", "ACTOR plays a `go-dark` (Shuffle) card") describe
  Shuffle behavior, but `go-dark` in the engine is Skip-without-draw,
  not Shuffle. `burn-the-files` is the actual Shuffle card.
- Catalog: `shuffle-applied` event — **engine never emits
  `shuffle-applied`**. Real event: `deck-shuffled { playerId }`.

**SCN-INTERCEPT-CHAIN-BURN-01:** field shapes match. The scenario
simply didn't fire this run (no `nope-played` events in the stream;
no chain-burn was attempted).

**SCN-BURNED-DRAW-AXIS11-01:** field shapes match. May have been
blocked by `shape: strict` semantics — needs confirmation.

### Secondary drift in `agent-launcher.ts`

`isRolePrimaryInFireSignature` (lines 174-191) determines whether a
seat gets the **full scenario block** (vs a one-line pointer) injected
into its catalog text. It checks for `where.playerId === '$ACTOR'`
and `where.playerId === '$TARGET'`. Even after fixing the catalog
field names (e.g., `requesterId: $ACTOR`), this function would no
longer recognize the seat as ACTOR-primary, and the scenario would
get a one-line pointer instead of the full block. So the catalog fix
needs a parallel fix here: scan ALL `where` field values for `$ACTOR`
/ `$TARGET` sigils, not just `playerId`.

## The general lesson

**"The TODO told me what was wrong" is a hypothesis, not a finding.**
The real diagnosis lives in the actual artifacts (events.jsonl,
engine source, catalog source). Re-read the artifact, don't just
re-read the TODO.

Three signals that the TODO was misdiagnosing:
1. The fix it proposed (prompt edit) targeted seat-log behavior, but
   the failing thing (coverage gate) doesn't read seat logs.
2. The "agents observed firing 4 scenarios" claim was treated as
   evidence the harness should have credited fires — but agents'
   observations and the matcher's god-event matching are independent
   signals. Either could be wrong.
3. The catalog wasn't open in the trace path. Anyone reading the catalog
   alongside `events.jsonl` would have spotted the field-name
   mismatch in <1 minute.

## Why it took a session to surface

The calibration retry attempt #3 was the FIRST end-to-end successful
calibration. Before this run, the matcher never had real
`events.jsonl` content to chew on — earlier runs failed at
seat-join, board-launcher, or god-observer-disconnect, leaving
events.jsonl empty or truncated. So the catalog-vs-engine drift had
no opportunity to surface. The first real run produced real events,
which exposed real field-name divergences, which produced 0 fires.

## Fix scope (NOT yet decided)

Two layers need touching, with a judgment-call element:

1. **Catalog field names** (`scripts/playtest/fixtures/mini-catalog.md`):
   - Mechanical: rename `playerId` → engine field name in each `where`
     clause (favor: `requesterId`/`giverId`/`receiverId`; combo-steal:
     `stealerId`).
   - Mechanical: rename `shuffle-applied` → `deck-shuffled`.
   - Mechanical: drop `turn-ended` (engine doesn't emit it).
   - Judgment call: **SCN-GO-DARK-NORMAL-01's scenario intent** —
     the title and prose describe Shuffle, but `go-dark` is
     Skip-without-draw. Either rename the scenario to test Shuffle
     (`burn-the-files`) or rewrite the scenario to test
     Skip-without-draw. Two different scenarios; pick which one we
     want.
   - Judgment call: **SCN-SKIP-NORMAL-01's cardType** — what BURNED
     calls "Skip" is `go-dark` per the card-defs, but that conflicts
     with SCN-GO-DARK-NORMAL-01's own naming. Need to harmonize the
     scenario IDs vs the card-type IDs.

2. **`agent-launcher.ts` role-primary detection**: scan all `where`
   field values for `$ACTOR` / `$TARGET` sigils, not just
   `where.playerId`. Otherwise renamed catalogs lose the full-scenario-
   block injection for the role that's actually primary.

3. **Verify** with calibration retry #4. Coverage should show
   `fired ≥ 1` after the catalog fix.

## Why NOT to fix this autonomously while Briggsy sleeps

The judgment calls in (1) — the Go-Dark vs Burn-the-Files / Skip
naming — are content decisions that affect what the playtest harness
is **measuring**. Renaming SCN-GO-DARK-NORMAL-01 to test Shuffle vs
Skip changes the calibration's coverage profile. That's a Briggsy
call, not a code-cleanup call.

The mechanical drifts (favor field names, combo-steal field name,
shuffle-applied → deck-shuffled, drop turn-ended) are safe to apply
mechanically once Briggsy decides the judgment-call elements.
