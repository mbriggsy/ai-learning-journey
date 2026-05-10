---
title: Seat-agent bug suspicions are hypotheses — verify against the engine event log before treating as a defect
date: 2026-05-08
modules: [docs/testing/playtest, src/server/game/engine]
tags: [playtest-harness, agent-blind-spots, ground-truth, engine-verification, false-positive, multi-turn-memory]
---

## Problem

The 2026-05-08-0935-3p harness run (3-player, production timings) produced
a HIGH-suspicion finding from seat-3:

> *"Played Intel Briefing → top 3 cards revealed at positions 1/2/3
> (Burned at pos 2 → drew the top → Burned now at pos 1 of 6-card deck).
> Played Back Channel (bottom-draw → should be position 6 of 6). **Got
> Burned.** Possible Back Channel bug."*

Symptom is real (S3 drew Burned via Back Channel). But the proposed
mechanism — "Back Channel doesn't draw from the bottom of the pile" —
does not survive contact with the engine event log.

## Root Cause

3-player BURNED games seed the deck with **playerCount − 1 = 2 Burned
cards** (`src/server/game/engine.ts:197`). Each Extraction reinserts the
drawn Burned at a player-chosen position. A single "Burned card" in the
agent's mental model is therefore unsound.

Tracing the actual run via `docs/testing/playtest/runs/2026-05-08-0935-3p/server/events.jsonl`:

| god-event | actor | action | pile | result |
|---|---|---|---|---|
| 51 | S3 | play burn-the-files | 13 | (shuffles deck) |
| 54 | S3 | draw-card | 13→12 | drew Burned, Extraction triggered |
| **55** | **S3** | **defuse-place pos=12** | **12→13** | **places own Burned at index 12 (bottom of 13-card pile)** |
| 56–85 | mixed | various plays + draws | 13→6 | **NO shuffle** between 55 and 88 |
| 86 | S2 | draw-card | 6→5 | drew Burned (the OTHER one), Extraction |
| 87 | S2 | defuse-place pos=4 | 5→6 | inserts at index 4; S3's earlier Burned shifts from index 4 to **index 5 (still bottom)** |
| 88 | S3 | play back-channel | 6 | begins bottom-draw |
| 90 | server | nope-grace-expired | 6→5 | **Burned drawn (S3's own placement from g.e. 55)**, S3 ELIMINATED |

S3's Back Channel pulled the **bottom** card. The bottom card was the
Burned **S3 themselves had placed there 33 god-events earlier** (their
Turn 4 in the seat-3 narrative). No shuffle had occurred between
placement and Back Channel; bottom-draws hadn't fired; the Burned simply
sat undisturbed.

Engine `applyDrawFromBottom` is a one-line wrapper around `performDraw`
with `from='bottom'`, which executes `drawPile.pop()`. With index 0 = top
and last index = bottom, this is correct.

## What the agent missed

1. **Their own Turn 4 Extraction placement.** The DefusePlacement UI
   exposes the position choice; the information was on-screen at the
   moment of the placement.
2. **N − 1 Burned cards in the deck.** "Burned" is not a singleton.
3. **No shuffle between placement and Back Channel.** Without a shuffle,
   bottom-of-deck cards persist.

The agent's mental model collapsed three independent facts (their own
placement, deck size, no intervening shuffle) into a single faulty
inference about Back Channel mechanics.

## Key Insight

**Treat seat-agent bug suspicions as hypotheses, not findings.** Verify
against the engine event log (`runs/<id>/server/events.jsonl`) before
opening a fix path. The harness produces these via god-event capture
specifically to enable post-hoc ground-truth audits.

Symmetric to insight 050 (agent verification misses perceptual
continuities) and the eye-in-loop-beats-calibration memory: agents
operating across many turns degrade on multi-step state tracking that
requires carrying specific facts forward (a placement decision N turns
ago, deck composition rules, shuffle history). They report the symptom
faithfully but propose mechanisms that don't survive trace-level review.

When triaging a HIGH suspicion from a seat agent:

1. **Do the trace first.** Extract the relevant god-events around the
   event in question. Reconstruct deck state by walking placements and
   shuffles.
2. **Cross-reference with seat narrative.** The agent's own log usually
   contains the contradicting fact (in this case, "Placed Burned at
   bottom. Survived" five turns earlier).
3. **Only edit code after the trace either confirms a real defect or
   clearly diagnoses a memory lapse.** A 1× HIGH suspicion in a single
   run carries less weight than a multi-run pattern (compare §2.1
   pair-steal, confirmed 4×).

## Sister case: §2.7 (observer Extraction drama beat "weak")

Same run, same audit pattern, different agent-blind-spot.

Seat agent: *"Observers see only 'EXTRACTED' briefly (~4s) in the status
bar. No cinematic overlay visible on observer's phone."*

Trace via `__testInjectEvent({type:'burned-drawn'})` then
`__testInjectEvent({type:'extraction-played'})` on the observer's phone,
with a per-frame opacity sampler installed on the DramaOverlay
(`[role="status"]`) for 12 seconds:

| Block | Slot | Window | Duration |
|---|---|---|---|
| 1 | flipSlot (burned-drawn cinematic with victim name) | 19–3136ms | 3117ms |
| 2 | text (EXTRACTED on teal scrim) | 3286–5386ms | 2100ms |

Total ~5.4 seconds of cinematic visible on observer's phone. Both beats
reach opacity 1 with sustained peaks. Frozen-state screenshots
(`temp/observer-flip-truly-frozen.png` showing the full Burned card flip
with "BURNED" header + illustration; `temp/observer-extracted-frozen-2.png`
showing the giant EXTRACTED text on teal scrim) verify the cinematic
content paints to the compositor.

The agent's perception missed it. Two contributing factors:

1. **Per-tick DOM polling samples brief states.** Agents that poll the
   DOM state at intervals (rather than continuously sampling per-rAF)
   read overlay opacity 0 most of the time — beats are sub-second-rate
   transients between long opacity-0 quiescent periods. The 5.4s
   cinematic window is ~10% of the total observation time at most.
2. **Status bar EXTRACTED was a separate, longer signal that captured
   attention.** StatusBar's status-strip update for `extraction-played`
   stays visible for the full nope-window-resolved period — that's the
   "EXTRACTED ~4s" the agent reported. The DramaOverlay beat is
   shorter and easier to miss when there's a competing concurrent
   surface that *is* persistent.

Same class as insight 050 (agent-eye verification misses perceptual
continuities) at the harness level: agents read discretizable signals
(StatusBar text persistence) but miss continuous beats (DramaOverlay
peak-and-fade).

## Resolution

§2.4 and §2.7 in TODO.md (run 2026-05-08-0935-3p) both closed as
**resolved-no-fix — correct system behavior, agent perception/memory
limitations**. No code change for either.

For the operator running future harness runs: a HIGH suspicion that a
"cinematic isn't visible" or "X doesn't fire" should trigger a sampler
verification BEFORE a fix path opens. The sampler pattern from
`tests/e2e/drama-beat-timing.spec.ts` ports cleanly to
chrome-devtools-mcp's `evaluate_script` — install a per-rAF opacity
sampler, inject the event via `__testInjectEvent`, read the trace.
Takes ~30 seconds; saves hours of misdirected investigation.
