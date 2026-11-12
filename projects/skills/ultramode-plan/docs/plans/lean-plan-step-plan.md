---
title: Lean Plan Step - Plan
type: feat
date: 2026-11-11
execution: code
---

# Lean Plan Step - Plan

This plan replaces the remaining units (U6 to U11, both reviews, the head-to-head) of `hybrid-plan-step-plan.md`. That plan's sections for U1 to U5 stay as the record of what is built. Nothing else in it is built. That file carries no note saying so, because a test pins its section index line by line: its status lives here and in `playbook/TODO.md`.

## Why this plan exists (Briggsy, 2026-11-11)

The remaining work had grown to an estimated 12 to 22 sessions, most of it a blind head-to-head that proves the skill against ce-plan. He ruled it out in these words:

- "I'm not spending 20 sessions on how to build."
- "My expectation was that we would cherry pick ce's process (plan, deepen, review, code, review, brief/distill). At the same time, I don't want dozens and dozens of safety checks for hypothetical situations that we don't face."
- On proof: "having a bench read it without going overboard is good ... we're not building a nuclear reactor."
- On crashes: "No need to build for sessions that may crash. We'll start over if that happens."

## Goal

The playbook's process has CE's shape, each step ours or CE's, whichever fits. Brief, build, code review and distill are already ours. This plan finishes the one step still CE's: plan, deepen and the plan check, as one typed skill that runs in one session and asks Briggsy nothing. ce-plan stays the playbook's plan step until the trial below says otherwise.

## What is already built and reviewed (U1 to U5)

- The three Workflow scripts in `workflows/` (research, deepen, check), generated from `src/` and held fresh by a test.
- What they are made of: the prompts and seat charters (`lib/prompts.mjs`), the vote law (`lib/vote-law.mjs`), the whole-plan reading check (`lib/reads.mjs`), section selection, caps, the fold check (`lib/fold.mjs`).
- The CE resolver (`lib/resolve-ce.mjs`) and the run record (`lib/run-record.mjs`), which also holds crash recovery this plan does not use.
- `bench/` (U1): built, and not used by this plan. It stays in the tree untouched.

## The rule for every choice in the build

One test, his: does this ever happen to us, or does it change his day? A guard goes in only with the incident that earned it. When a step can use an existing command as it is, it does; it adds no command for recovery, and it does not extend the run record. Whether `SKILL.md` drives the scripts directly or through a thin slice of the run record's commands is decided in Step 1, by which is less to write and to read.

## Steps

Each build session opens with `/brief` on its step. Tests are written first for any code. Commits are path-scoped.

1. **Read what exists, and pick the wiring.** Read the three sources in `src/` for the inputs each script needs, and the usage headers of `lib/run-record.mjs` and `lib/flow.mjs`. Decide direct or thin-slice by the rule above and write the decision here in one line.
   **Decided 2026-11-11: direct.** `SKILL.md` launches the three scripts itself on the inputs Step 2's helper builds, and uses `lib/fold.mjs` as it is; it runs none of the run record's commands. The run record is one chain, not a kit: `launch` refuses without a window gate recorded in the same session, and `advance` refuses without a finished launch, its sweep and a landed fold (`lib/run-record.mjs`, `launch` and `advance`), so no slice of it stands alone, and the whole chain is seven commands a stage (`gate`, `launch`, `launched`, `complete`, `fold-start`, `fold-land`, `advance`) against one. The helper calls `flow.mjs`'s `planIndex` and `roundSeats` and `resolve-ce.mjs`'s `resolveCe` as functions. An update run (deepen and check a committed plan) is not wired: every launch says `update: false`.
2. **The inputs helper.** One small command that builds a launch's inputs for each of the three scripts from plain facts (the project, the request, the brief, the plan's path, the round) and prints them as JSON. Tested by running each built set through the generated script in the stub, so the script's own input check passes it.
3. **`SKILL.md` and `README.md`.** `SKILL.md` is one page, typed-only (`disable-model-invocation: true`): research, then the main loop writes the plan, then the deepen, then the check and its fixes, then one commit of the plan's own path with a short receipt of what ran. It copies each script into the session's scratchpad before launch. A run that dies or hits the window line is started over from its stage; nothing is built to resume it. `README.md` says in plain words what it does, how to run it and what comes back.
4. **One real run.** The skill plans one real, sizable job from a project's own queue, end to end. What breaks is fixed. This is the smoke test.
5. **One code review** of the files Steps 2 and 3 added (`ultramode-code-review`), every finding verified before it changes anything.
6. **The trial, with a light bench.** On the next real sizable job after that, ce-plan plans the same job. Three skeptical readers get both plans unlabeled, in one Workflow, and say which plan they would build from and why; Briggsy reads both. His read decides. If ours is not clearly better, the skill is shelved as it stands and ce-plan stays.
7. **Close.** On a win: the playbook's README and TODO name the new plan step. Either way: one `/distill` on the candidates in `playbook/TODO.md`, and START HERE rewritten.

## Guards kept, each with what happened

All but the last two are already in the built scripts. Those two are one sentence each in `SKILL.md`.

| Guard | What happened to us |
|---|---|
| A reviewer proves it read the whole plan | One Read of a 153 KB plan returned lines 1 to 269 of 1,059 |
| Every helper on Opus with its effort set | 24 helpers inherited another model on 2026-09-03 |
| A finding is verified by vote before it changes the plan | Plausible, wrong findings in every review we have run |
| CE's files are found through the plugin registry | One CE update broke every ultramode lens |
| The commit names the plan's own path and nothing else | The git index is shared by every session |
| The window is read before a fan-out | Sessions reach the wrap line |

## Cut, and what would bring a piece back

- The head-to-head and everything it needed: the harness, the cost gate, parity and leak checks, the anonymizer, the scorer, the judging panel, the bar. Back only if the trial's two plans are too close for readers and Briggsy to call.
- Surviving across sessions: restart hardening, hand-back lines, stray-file sweeps, the index take-back. Back only when a lost run has cost us real work twice.
- The smoke-run driver with its killed sessions, the stage-cost file, the pick check.
- The six build recipes written on 2026-11-11 for the old remaining units. They were never committed; they and the check that reviewed them (94 findings, 73 standing, all seven P1s in the head-to-head) sit in the playbook job folder as a quarry.

## Done means

- A typed command plans a real job in one session and commits the plan with its receipt.
- The suite and CI are green.
- The one code review ran and its confirmed findings are fixed.
- The trial ran, Briggsy read both plans, and the playbook's plan step matches his call.
