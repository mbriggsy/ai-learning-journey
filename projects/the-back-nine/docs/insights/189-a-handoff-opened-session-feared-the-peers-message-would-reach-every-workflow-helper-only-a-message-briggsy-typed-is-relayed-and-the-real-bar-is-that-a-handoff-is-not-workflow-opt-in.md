---
title: A session opened by a peer's handoff believed every Workflow helper would be shown the handoff, and wrote that into the distill list from a memory it never opened — Claude Code relays only a message Briggsy typed, never a peer's; the real bar to a Workflow there was that a handoff is not his opt-in
date: 2026-11-27
phase: The RightCapital mandate, gap 4 (spending lines that repeat or grow at their own rate): the plan read (b9-14, `579b5530`)
modules: [playbook/how-to/plan-step.md, playbook/plan-readers.workflow.js, playbook/docs/landmines.md]
tags: [workflow, workflow-relay, handoff, peer-message, session-chain, blind-readers, plan-readers, opt-in, ultracode, agent-calls, helper-transcript, memory-index, unread-source, verify-the-premise]
---

## Problem

b9-14 was opened by b9-13's handoff, and its first job was the three blind readers on gap 4's plan (the monorepo's
`playbook/how-to/plan-step.md`). The handoff named the plan's review state ("27 fixes applied" by its check), which
blind readers must not see. b9-14 decided the handoff was the session's latest "user" turn and that every Workflow
helper is shown that turn word for word, so it ran the readers without the Workflow tool. It wrote that belief into
TODO's distill list, citing the memory `reference-workflow-relays-latest-user-message` by name.

The belief is wrong. The playbook's landmines file records the measured rule (`playbook/docs/landmines.md`, the
"Every Workflow helper is shown the session's latest typed message" bullet): only a message Briggsy typed is relayed,
a peer session's message never is, and a Workflow launched from a notification turn relays nothing. b9-18, the session
running this distill, shows it again. Briggsy typed one line, then b9-17's handoff arrived, and three Workflow runs
started after it: one in the turn the handoff opened, two in turns opened by task notifications. All 20 helpers' first
turn was the computed task alone. Neither the handoff nor Briggsy's earlier line was relayed.

## Root Cause

b9-14 cited the memory without opening it. In its transcript, the memory's name appears only in the memory index
loaded at start and in the distill line b9-14 wrote. Nothing on the record measured a peer's message being relayed.
The step was a guess from "the latest user turn" to "whatever sent it".

The part of b9-14's reasoning that held was the second one. The Workflow tool's own rule allows it only on Briggsy's
explicit opt-in: ultracode confirmed on by a system message, his own words asking for a workflow or a fan-out, a skill
he invoked that calls it, or a named workflow he asked for. b9-14 had none of these: no system message confirmed
ultracode, and he typed nothing in that session. A handoff can't approve what only he can approve
(`playbook/how-to/session-chains.md`, "What the successor sees and does").

## Fix

The three readers ran as three Agent calls (Opus, xhigh, in the background: the builder, rules and owner lenses). Each
prompt was `playbook/plan-readers.workflow.js`'s prompt word for word, and the JSON verdict the script asks for through
its `agent()` schema was asked for in the prompt's words. They returned 34 faults (0 blocks, 6 misleads, 28 minor),
every reader read to the plan's line 496, and the cost was about 0.9M helper tokens by the b9-14 close's count. The six
misleads were fixed in the plan (`579b5530`). This distill corrects the distill line's false first premise.

## Key Insight

- **A peer's handoff never reaches a Workflow helper.** The only thing that can is a message Briggsy typed, and only
  in a turn he opened. Before a blind fan-out, check his latest typed message. If you doubt what a helper received,
  read the first user row of that helper's own transcript.
- **A handoff is not Workflow opt-in.** In a session a handoff opened, with no opt-in, run a playbook workflow's seats
  as one Agent call each, with the script's model, effort and prompt word for word, and the verdict's shape asked for
  in words. The plan-step how-to's launch steps name only the Workflow route.
- **A source cited by name is not a source read.** b9-14's line put the opposite of the measured rule into the queue
  under the memory's name. Open the source before building on it or writing a lesson from it.

## Also Applies To

- Any blind seat a handoff-opened session launches (Caddie readers, council seats, review hunters). The relay can't
  leak the handoff to them. The prompt the lead writes can, so guard what you paste.
- `playbook/how-to/plan-step.md`'s "How Claude launches them" covers the Workflow route alone. The Agent route belongs
  beside it.
- [[164]]: what the blind readers catch in a checked plan; `playbook/docs/insights/029-thirteen-times-the-helpers-bought-a-plan-that-lost-the-faults-that-decided-it-were-found-by-a-few-close-reads-of-the-code-and-the-whole-plan.md`: why the readers exist.
