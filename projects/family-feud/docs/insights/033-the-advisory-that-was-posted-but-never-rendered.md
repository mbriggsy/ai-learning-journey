# 033 — The advisory that was posted but never rendered

**Date:** 2026-08-21 · **Where:** mock room 6, pick #12 · **Cost:** one room, plus two
wrong theories that each survived a round of fixes

## What happened

The #12 advisory was composed and posted **24 seconds** into Briggsy's 5-minute clock —
and he sat through the full five minutes seeing nothing, clock expired, seat flipped to
auto, room lost. The message existed in the transcript the whole time. It was never
rendered on his phone.

The cause is a documented harness rule that got violated under pressure: **text written
between tool calls may not be shown to the user; only the final message of a turn is
guaranteed to render.** That turn's shape was: chain → **four lines** → one more tool call
(a `Get-Date` for a timing stat) → a short stats note. The trailing tool call demoted the
advisory to mid-turn text. The user-visible turn was a cryptic "24 seconds!" with no
player in it.

## Why it took two dead theories to find

- Theory 1: *"the phone only syncs when he interacts."* Killed by Briggsy himself: the
  first advisory of every room arrived with zero interaction, and he routinely sees
  unsolicited workflow narration. **His refutation was the measurement** — the theory
  never explained why advisory #1 always worked, and a theory that doesn't explain the
  working case is a guess wearing a lab coat.
- Theory 2: *"compose latency."* Killed by the timestamp: 24 seconds into a 300-second
  window.
- The distinguishing variable was never latency or sync — it was **turn shape**: every
  advisory that arrived was the final text of its turn; the one that vanished had a tool
  call after it. One structural difference, visible in the transcript the whole time.

## The rule

**On-clock advisories are the final message of their turn. Nothing follows them — no
timestamp calls, no stats, no watcher housekeeping.** Timing instrumentation goes INSIDE
the chain call (append `Get-Date` to the same PowerShell invocation) so it lands in the
tool result, not after the advisory. Housekeeping that must happen goes BEFORE the
advisory only if it cannot wait — and with a persistent monitor (insight 032) none of it
is on the clock anymore.

## The transferable lesson

When a deliverable "didn't arrive," diff the SHAPE of the turn that worked against the
turn that didn't before theorizing about the channel. And when the user refutes a theory
with an observation ("the first one always comes through"), that observation is the
strongest instrument in the room — the next theory must explain it, not route around it.

Related: [032](032-the-loop-died-of-a-manual-step-six-rooms-in-a-row.md) (the other four
defects in the same saga), [007](007-presence-is-not-health-the-third-instance-of-one-pattern.md)
(same family: what you sent is not what landed).
