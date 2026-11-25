---
title: A subagent that backgrounds its own long probe and ends its turn may never wake to report — two round-3 refuter seats said they would report when their full-solve probes finished; the probes passed at 11:53 and 11:56, and both seats sat idle about 50 minutes until a nudge, with no figure to cite, because vitest had printed none
date: 2026-11-25
phase: Act 6 milestone 2's whole-file review, round 3 (the harm-class gate, b9-1)
modules: [process]
tags: [agents, subagent, teammate, refuter, seat, orchestrator, background, run_in_background, monitor, task-notification, idle, idle-notification, wake, nudge, foreground, probe, vitest, console-log, writeFileSync, silence, deadline, abstention, insight-019, ultramode-review]
---

## Problem

Round 3 sent each finding to three refuter seats, spawned with the Agent tool as background teammates. The brief let a
seat run throwaway `zz-r3ref-*` vitest probes. Seat B on L1-1 started a full-solve probe at 11:48 with
`run_in_background`, its output redirected to `scratchpad/r3refB-L1-1-probe.txt`, and at 11:50 ended its turn on "The
probe is still running. I'll send the report to the team lead once it finishes." Seat B on L1-2 to L1-4 did the same
at 11:55 ("Still waiting on the L1-2 borderline solve probe"), with a Monitor armed on its log as well.

Both probes passed: at 11:53:29 (282 s) and 11:56:26 (210 s). Neither seat woke. The orchestrator had read both idle
notices, said "Still waiting on the two seat Bs" at 12:00, and set no deadline of its own. When Briggsy checked in at
12:45 it answered that nothing was stuck. Only when he said he saw nothing running did it read the two files'
timestamps and nudge both seats, at 12:46, about 50 minutes after the probes ended (it told him "about 15 minutes";
the timestamps say 50).

Neither seat could cite its probe once nudged. Both logs held only vitest's pass summary. The probes' `console.log`
printed nothing, and seat B on L1-2 got the same with `--silent=false`. Both votes went in as "Measured by probe: no"
and leaned on the hunter's figures.

## Root Cause

A seat that ends its turn while a background job runs needs the completion notice to start a new turn, and here the
notice did not. Each seat's transcript holds the notice stamped 11:53:29 (for the other seat, 11:56:26, plus the
Monitor's "probe log finished" at 11:56:27), but it is written after the nudge. The notice was queued and reached the
seat only when the nudge woke it. The same seat's first background run finished at 11:51:58 while the seat was still
working, and that notice arrived mid-turn as it should. The three seats that reported on their own never ended a turn
while a probe ran. Seat C on L1-1 ran its probe in the foreground. Seat A on L1-1 held its turn with a foreground wait
loop on the output file, then reran its 235-second probe in the foreground.

The brief carried neither rule. It said a seat "MAY run `pnpm vitest run <one file>`", but it did not say to run it in
the foreground, and it did not say that vitest here prints no `console.log`. That landmine is filed four times in
`docs/landmines.md`'s unit test suite section. Seats A and C on L1-1 each rediscovered it and switched to
`writeFileSync` into the scratchpad. Neither seat B did.

## Fix

No code change: the fix is in the brief and in the wait. A brief that lets a seat probe tells it to run the probe in
the foreground (the Bash tool allows ten minutes, and these took four to five), to write its readings to a named
scratchpad file with `writeFileSync` and read that file back, and never to end its turn while its own probe runs. An
orchestrator waiting on an idle seat that said "still running" sets a deadline of the probe's run time plus a margin.
At that deadline it checks the seat's probe files, their timestamps and last lines, and nudges the seat if they are
done. Both seat Bs voted within two minutes of their nudges.

## Key Insight

"I'll report when it finishes" holds only while the seat's turn is open. Once the seat is idle, a message wakes it, and
a background task's completion notice may not. The work can finish and the report never come, and from outside both
look the same: an idle seat. Silence is not progress. Read the files the seat said it was waiting on. This is insight
019's lesson on the waiting side. A vote that has not come in is unknown until someone checks why. It is neither a
verdict nor a vote on its way, and the check is a side channel (019's `failures` block; here, the probe's output
file).

## Also Applies To

- Any agent-team seat told it may run something long: a Playwright arm, a suite run, a CI wait.
- The orchestrator's own waits: a wait on teammates needs a deadline, the same as a CI poll.
- Insight 084's report file: the brief that names a seat's report file should also name its probe's readings file.
- Any vitest probe in this repo: write to a file, never to the console (`docs/landmines.md`, the unit test suite).
