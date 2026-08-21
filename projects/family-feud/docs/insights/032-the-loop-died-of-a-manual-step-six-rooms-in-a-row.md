# 032 — The loop died of a manual step, six rooms in a row

**Date:** 2026-08-21 · **Where:** the advisor-mode mock gauntlet (8 rooms in one afternoon)
**Cost:** five abandoned mock drafts, ~2 hours of Briggsy's day, three wrong theories confidently stated

## What happened

The advisor loop — wake when a pick lands, run the chain, deliver four lines — failed in
five consecutive live rooms, each time reported by Briggsy as "fail." Postmortem found FOUR
distinct defects stacked on top of each other, which is why each fix produced a new failure
instead of a success:

1. **The one-shot watcher needed a manual re-arm after every wake, and the re-arm was
   forgotten three separate times** — including once *immediately after writing down the
   rule* "re-arm before compose." A background process that exits to wake the session
   wakes it ONCE; someone must relaunch it, and that someone is a model under a
   name-first deadline. Rooms 1, 4 and 5 died of this alone: first advisory delivered,
   then permanent silence.
2. **The watcher's conditions were edge-triggered, so a pause blinded it.** It evaluated
   "is it his turn" only when the pick count INCREASED. Pause/resume restarts his clock
   with zero new picks — the condition was true the whole time and never checked.
3. **5-second polling in a bot room skips states.** Bots pick ~every 5-10s, so the sampled
   count jumped 18 → 22 → 27 and the "his pick is next" state at 19/20 was never observed.
   Detection must be state-based ("is the NEXT pick his, right now"), not transition-based,
   because his-clock states persist for minutes while bot states last seconds.
4. **Sleeper flips the seat to AUTO-PICK when a clock expires, and auto drains the rest of
   the draft in seconds.** One missed advisory therefore doesn't cost one pick — it costs
   the room. This is the amplifier that turned every small bug above into a total loss.

## The fix that held (room 8: 13 advised picks, zero misses)

- **The persistent `Monitor` tool replaced the one-shot watcher.** One process, armed once,
  emits an event per occurrence for the whole session. The forgettable step no longer
  exists — which is the only kind of fix that survives contact with a deadline
  (CLAUDE.md's own rule: what can't be automated is a blocker, not a manual step).
- Conditions are **evaluated every poll against current state** (`slot(next_pick) == his`),
  with per-pick dedup keys instead of count deltas. Pause-proof and skip-proof by shape.
- **Room preconditions became a gated checklist** — verify via API before saying GO:
  5:00 timer (a 120s bot room has no warm window — measured for the third time, see the
  handoff of 2026-08-20 which already knew this), seat from `draft_order`, monitor armed.
- After any deliberate or accidental blown clock: **flip AUTOPICK off before the next
  window** or the draft plays itself out.

## The transferable lessons

- **A loop whose continuation depends on the model remembering a step is not a loop.**
  It's a promise. Three drops in one afternoon by a session that had literally just
  written the rule down. Structure beats discipline every time the clock is running.
- **Watch conditions must be level-triggered, not edge-triggered,** whenever the watched
  state can appear without the trigger event (pause/resume) or between samples (fast
  actors). Ask: "if this became true while I wasn't looking, would I still fire?"
- **Count the amplifier in the cost of a miss.** The advisory being 30s late was never
  worth one pick — auto-flip made it worth the whole room. Sizing the failure correctly
  is what justified stopping mid-mock to rebuild instead of patching again.

Related: [026](026-the-loop-fits-and-the-scripts-were-never-the-cost.md) (the scripts were
never the cost — this saga re-proved it: every failure was orchestration, 0 were Python),
[033](033-the-advisory-that-was-posted-but-never-rendered.md) (the fifth defect, found the
same day).
