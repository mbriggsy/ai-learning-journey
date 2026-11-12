---
name: ultramode-plan
description: On trial, typed only. Plans one sizable job in one session (research, a written plan, a deepen, a verified check) and commits the plan with a receipt. Never pick this skill for any request, a plan request included.
argument-hint: "<plan path> [brief <path>] <the request>"
disable-model-invocation: true
---

# ultramode-plan

Your argument: $ARGUMENTS

The first word is the plan's path: a `.md` file that does not exist yet, inside a project's own `docs/plans/` folder. The project is the folder that holds that `docs/`. `brief <path>` is optional. Everything after it is the request, word for word. No plan path or no request: say so and start nothing.

`<skill>` below is this skill's folder (the base directory named above). `<job>` is a new folder `ultramode-plan-job/` in this session's scratchpad. Write every path absolute, with forward slashes.

## Rules for the whole run

- **Ask Briggsy nothing.** A bet you had to make goes in the plan's assumptions. A stop is a report, never a question.
- **Before each of the Workflow launches, read the window:** `node "$HOME/.claude/skills/window/window.mjs" "$CLAUDE_CODE_SESSION_ID"`. When its line says no new fan-outs, or to wrap up, launch nothing more: report where the run stopped. Finish a fold already begun first.
- **Nothing resumes a run.** A run that dies or stops at the window is started over from its stage in a new session: with the plan already at its path, that is the deepen or the check, after steps 1 and 2 again.
- **Every helper is Opus with its effort set.** The three scripts do it themselves; the one Agent call in step 2 names `model: "opus"` and `effort: "xhigh"`.
- **These Workflows run more than ten helpers by design.** Typing this skill is the go for that.
- **Helpers also get the latest message Briggsy typed, above their task.** If he typed anything after this command that changes the job, add it to `request` in the facts before the next launch.
- **You write only the plan and files in `<job>`** (the `brief` skill's own correction of a stale lesson aside). A finding that some other file needs a change becomes a line in the plan.

## The steps

1. **The brief.** With no `brief <path>`, run the `brief` skill on the request's subject, naming the project. Save the brief, as printed, to `<job>/brief.md`.

2. **The facts and the contract brief.** Write `<job>/facts.json` with the Write tool: `project`, `request`, `brief`, `plan`, and `contractBrief` set to `<job>/contract-brief.txt`. Every later step adds its facts to this one file. Run `node "<skill>/lib/inputs.mjs" contract-brief "<job>/facts.json"` and send the printed text, unchanged, to one Agent (`subagent_type: "general-purpose"`). Save its 10 to 20 lines, word for word, to `<job>/contract-brief.txt`.

3. **Launch a script (steps 4, 6 and 7 use this).** Copy `<skill>/workflows/<stage>.workflow.js` into `<job>` once. Read the window. Run `node "<skill>/lib/inputs.mjs" <stage> "<job>/facts.json" > "<job>/<stage>.args.json"`. A refusal on stderr names the fact to fix. Read the args file and call the Workflow tool with `scriptPath` (the copy) and the file's JSON as `args`, as a JSON value, never as text. End the turn. When the completion notice arrives, read the result from the output file the notice names, in pages: the `summary` first, then only the entries you act on. A script that refuses its args names each problem: fix the fact and launch again.

4. **Research** (stage `research`). First read CE's `research.md` (run `node "<skill>/lib/resolve-ce.mjs" resolve` and take the `path` of the key `research`; a key marked `missing` has no file, and you go by this page alone). Add to the facts: `dossiers` (`<job>/dossiers`); `depth` (`Lightweight`, `Standard` or `Deep`); `agentNative` (true or false, by that file's agent-native triage); and `external` (by its "Decide on External Research" stages: `null`, or `{ "intent": "implementation" | "landscape" | "mixed", "reason": "<what to find out>" }`). Launch.

5. **Write the plan.** Read every gist, and each dossier whose gist says it changes a decision. Read CE's `plan-sections.md` (key `plan-sections`) for the plan's shape, front matter included; the project's own convention wins where its `CLAUDE.md` names one. Write the first section with Write and add each further section with Edit. A decision that is Briggsy's, in his words, is quoted as his.

6. **Deepen** (stage `deepen`). Add `focus` (the external call's reason) only when research ran an external call. Launch, then go by `summary.outcome`:
   - `blocked`: stop and report `summary.reason`.
   - `premise`: a verified finding says the plan's goal is wrong. Rewrite the plan to answer it and launch the deepen once more. A second `premise`, or a finding against a decision Briggsy made in his own words, stops the run: report the finding and leave the plan uncommitted.
   - `passed` or `deepen`: fold (below) every id in `summary.amendments.confirmed` and every finding in `summary.premise.carried` (one whose status is `hand-verify` after your trace), and set `deepened: <today>` in the front matter when anything was folded.

7. **Check** (stage `check`). Round 1 facts: `round` 1; `highRisk` (true when the deepen's `summary.risk` names any signal); `lenses` (a list of `product`, `security`, `design`, picked by the activation signals in CE's `persona-selection.md`, key `persona-selection`; often empty); `noCode` (`null`, or the reason when no unit of the plan names a code or test file). Launch, then fold every id in `summary.confirmed`.
   - **Round 2** only when round 1's fold changed the plan. Facts: `round` 2, `roster` (round 1's `summary.roster`) and `changes`: for each folded id, `{ "id", "kind": "edit" | "add" | "delete", "classes": [the finding's own seat, and any other roster seat whose ground the change touches], "text": the new text (for a delete, what was removed), "was": the text it replaced (an edit only) }`. Launch and fold as round 1.
   - **Round 3** only when round 2 confirmed a P0 or P1 (`summary.p0p1` above 0, or one you traced as real). Facts: `round` 3 and `changes`, round 2's fixes of those findings. It folds nothing: what it confirms is named in the receipt as open.

8. **Commit.** `git add -- "<plan>"`, then `git commit -F "<job>/message.txt" -- "<plan>"`: that path and nothing else. The message is `plan: <the plan's title>`, a blank line, the receipt, then the attribution lines this session's instructions ask for. Report the plan's path, the commit and the receipt.

## Folding

- **A hand-verify id is yours to trace** (`summary.handVerify`, `summary.amendments.handVerify`, `summary.p0p1Pending`): read the entry and its votes, open the plan lines and the source it cites, and fold it only when it is real, matters, and the plan does not already cover it. Advisory and rejected ids are not folded. The receipt names what you left out and why.
- **Fold by section:** copy the plan to `<job>/before.md`, then change it with Edit, one finding at a time, using the verifiers' better fix where they agree on one. Never rewrite the whole plan with Write. Two findings that pull apart: the repo's own evidence beats general advice, and the tradeoff is said in the section.
- **Then run the fold check:** write `<job>/fold.json`, one `{ "id", "old_values": [each short value the edit replaced] }` per folded id, and run `node "<skill>/lib/fold.mjs" "<job>/before.md" "<plan>" "<job>/fold.json"`. Exit 1 means the fold dropped a numbered item (a requirement, a unit, a decision): restore it and run it again. Judge each leftover old value it prints.

## The receipt

Plain lines, each stated from a result you read, never from memory:

```
planned, deepened and checked            (or: planned, confidence check passed, checked; add ", N P0/P1 open")
CE: <version> <commit, 7 characters>; seats without their CE file: <none, or each>
research: <answered> of <asked> helpers; outside research: <intent, or none>
deepen: <outcome>; <n> amendments folded, <n> left out
check: round 1 <n> seats, <n> confirmed, <n> folded; round 2 ...; round 3 ...
coverage holes: <none, or each seat and what it missed>
left out after a trace: <none, or each id and why>
```

"Checked" is said only when an adversary seat answered in round 1 (`summary.adversary.ran`); otherwise the line reads "check incomplete: no adversary".
