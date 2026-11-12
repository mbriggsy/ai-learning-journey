---
name: ultramode-plan
description: On trial, typed only. Plans one sizable job over two sessions (research, a written plan and a deepen; then a verified check in a fresh session) and commits the plan with a receipt after each. Never pick this skill for any request, a plan request included.
argument-hint: "<plan path> [brief <path>] <the request>"
disable-model-invocation: true
---

# ultramode-plan

Your argument: $ARGUMENTS

The first word is the plan's path: a `.md` file inside a project's own `docs/plans/` folder. The project is the folder that holds that `docs/`. `brief <path>` is optional. Everything after it is the request, word for word. No plan path or no request: say so and start nothing.

`<skill>` below is this skill's folder (the base directory named above). `<job>` is a new folder `ultramode-plan-job/` in this session's scratchpad. Write every path absolute, with forward slashes.

## Two sessions

The run takes two sessions, each started by the same typed line (Briggsy, 2026-11-11: the first real run's research, plan, two deepens and one check round took 45 points of one session's window, and its round 2 never ran). Which half this session runs depends on the plan's path:

- **No file there: session 1.** Steps 1 to 6, then step 8. The receipt's first line ends `; check next`.
- **A plan there:** read its receipts, newest first: `git log --format=%B -- "<plan>"`. A receipt is a commit message whose second paragraph opens with `planned`.
  - Newest receipt says `check next` or `check incomplete`: **session 2.** Steps 1 and 2, then 7 and 8. The new receipt copies that receipt's CE, research and deepen lines.
  - Newest receipt says `deepen incomplete`: steps 1, 2, 6 and 8, as session 1 ends, copying that receipt's CE and research lines.
  - No receipt, and the log lists no commit of the file: a session 1 that stopped before its commit. Steps 1, 2, 6 and 8, with the research line `research: not recorded (its session stopped before committing)`.
  - No receipt, but the log lists commits: another tool's plan. Say so and start nothing.
  - Newest receipt says `checked`: the plan is done. Say so and start nothing.

## Rules for the whole run

- **Ask Briggsy nothing.** A bet you had to make goes in the plan's assumptions. A stop is a report, never a question.
- **Before each Workflow launch, read the window:** `node "$HOME/.claude/skills/window/window.mjs" "$CLAUDE_CODE_SESSION_ID"`. When its line says no new fan-outs, or to wrap up, launch nothing more: report where the run stopped. Finish a fold already begun first.
- **Nothing resumes a run.** A session that dies or stops at the window is started over by the same typed line in a new session, which picks its half as above. A window stop after the plan is written still commits it as step 8 does, so the work is not left loose in a shared tree: the receipt's first line then reads `planned, deepen incomplete: <what did not run>` in session 1, or `planned, deepened, check incomplete: <what did not run>` in session 2.
- **Every helper is Opus with its effort set.** The three scripts do it themselves; the one Agent call in step 2 names `model: "opus"` and `effort: "xhigh"`.
- **These Workflows run more than ten helpers by design.** Typing this skill is the go for that.
- **Helpers also get the latest message Briggsy typed, above their task.** If he typed anything after this command that changes the job, add it to `request` in the facts before the next launch.
- **You write only the plan and files in `<job>`** (the `brief` skill's own correction of a stale lesson aside). A finding that some other file needs a change becomes a line in the plan.

## The steps

1. **The brief.** With no `brief <path>`, run the `brief` skill on the request's subject, naming the project. Save the brief, as printed, to `<job>/brief.md`.

2. **The facts and the contract brief.** Write `<job>/facts.json` with the Write tool: `project`, `request`, `brief`, `plan`, and `contractBrief` set to `<job>/contract-brief.txt`. Every later step adds its facts to this one file. Run `node "<skill>/lib/inputs.mjs" contract-brief "<job>/facts.json"` and send the printed text, unchanged, to one Agent (`subagent_type: "general-purpose"`). Save its 10 to 20 lines, word for word, to `<job>/contract-brief.txt`.

3. **Launch a script (steps 4, 6 and 7 use this).** Each launch has a name: its stage, with the run or round when there can be more than one (`research`, `deepen-1`, `deepen-2`, `check-1`, `check-2`). Read the window. Run `node "<skill>/lib/inputs.mjs" <stage> "<job>/facts.json" "<job>/<name>.workflow.js"`: it writes the stage's script with this launch's args baked in, so you never type them. A refusal on stderr names the fact to fix. Call the Workflow tool with `scriptPath` set to that file and no `args`. End the turn. When the completion notice arrives, run `node "<skill>/lib/digest.mjs" "<the output file the notice names>" > "<job>/<name>.digest.md"` and Read the digest: the summary, then a block per confirmed and hand-verify entry, with the text to fold whole, the rest cut to 300 characters, and an ACT line, the vote law's call on the fix. An id it lists as NOT IN THE LEDGER is a coverage hole for the receipt. `node "<skill>/lib/digest.mjs" "<output file>" <id> ...` prints entries whole, stopping under 25,000 characters and naming any id left for another call. A script that refuses its args names each problem: fix the fact and launch again.

4. **Research** (stage `research`). First read CE's `research.md` (run `node "<skill>/lib/resolve-ce.mjs" resolve` and take the `path` of the key `research`; a key marked `missing` has no file, and you go by this page alone). Add to the facts: `dossiers` (`<job>/dossiers`); `depth` (`Lightweight`, `Standard` or `Deep`); `agentNative` (true or false, by that file's agent-native triage); and `external` (by its "Decide on External Research" stages: `null`, or `{ "intent": "implementation" | "landscape" | "mixed", "reason": "<what to find out>" }`). Launch.

5. **Write the plan.** Read every gist (the research digest prints them whole), and each dossier whose gist says it changes a decision. Read CE's `plan-sections.md` (key `plan-sections`) for the plan's shape, front matter included; the project's own convention wins where its `CLAUDE.md` names one. Write the first section with Write and add each further section with Edit. A decision that is Briggsy's, in his words, is quoted as his.

6. **Deepen** (stage `deepen`). Add `focus` (the external call's reason) only when research ran an external call. Launch, then go by `summary.outcome`:
   - `blocked`: stop and report `summary.reason`.
   - `premise`: a verified finding says the plan's goal is wrong. Rewrite the plan to answer it and launch the deepen once more. A second `premise`, or a finding against a decision Briggsy made in his own words, stops the run: report the finding and leave the plan uncommitted (the same typed line will then deepen it again).
   - `passed` or `deepen`: fold (below) every id in `summary.amendments.confirmed` and every finding in `summary.premise.carried` (one whose status is `hand-verify` after your trace), and when anything was folded, add `deepened: <today>` to the front matter with Edit.

   Session 1 ends here, with step 8.

7. **Check** (stage `check`, session 2). Round 1 facts: `round` 1; `highRisk` (from the deepen line of session 1's receipt: true when it names a risk signal, false when it reads `risk: none`, and true when it has no `risk:` at all, as a receipt from before 2026-11-12 does not); `lenses` (a list of `product`, `security`, `design`, picked by the activation signals in CE's `persona-selection.md`, key `persona-selection`; often empty); `noCode` (`null`, or the reason when no unit of the plan names a code or test file). Launch, then fold every id in `summary.confirmed` and every hand-verify id you traced as real.
   - **Round 2** only when `<job>/changes-2.json` lists a change. Facts: `round` 2, `roster` (round 1's `summary.roster`) and `changes` set to `<job>/changes-2.json`. Launch. Fold its confirmed ids in two applies: first everything but the P0 and P1 fixes, naming no changes file; then the P0 and P1 fixes (`summary.p0p1Ids`, and any pending one you traced as real), naming `<job>/changes-3.json`. A line both touch goes in that last apply, as one edit carrying both ids, so the changes file holds the plan's final text.
   - **Round 3** only when round 2 confirmed a P0 or P1 (`summary.p0p1` above 0, or one you traced as real). Facts: `round` 3, `changes` set to `<job>/changes-3.json`. It folds nothing: what it confirms is named in the receipt as open.

8. **Commit.** With Edit, set the plan's front matter line `receipt:` to the receipt's first line in double quotes (add the line when it is missing), so the commit always changes the plan and the next session's `git log -- "<plan>"` lists it. Then `git add -- "<plan>"` and `git commit -F "<job>/message.txt" -- "<plan>"`: that path and nothing else. The message is `plan: <the plan's title>`, a blank line, the receipt, then the attribution lines this session's instructions ask for. Report the plan's path, the commit and the receipt. Session 1's report ends with the line that starts session 2, to type in a fresh session: `/ultramode-plan <plan path> <the request>`.

## Folding

- **Fold each entry as its ACT line says.** `apply`: its FIX or CHANGE as written, weighing each N line (a note from a voter who judged the change right). `apply-better`: its B line. `hand-verify`: trace it first. A D line is a minority's fix, not the fold.
- **A hand-verify id is yours to trace** (`summary.handVerify`, `summary.amendments.handVerify`, `summary.p0p1Pending`, and every entry whose ACT is `hand-verify`): print the entry whole with the digest, open the plan lines and the source it cites, and fold it only when it is real, matters, and the plan does not already cover it. Advisory and rejected ids are not folded. The receipt names what you left out and why.
- **One fold is one apply.** Write a new edits file in `<job>` (`<job>/check-1.edits.json`, say): a list of edits, each `{ "ids": [the ids it folds], "old": "<text copied exactly from the plan>", "new": "<its replacement>" }`. Add `"olds"`, the phrases an edit retires (a renamed ID, a changed number, and an amendment's OLD values), so the fold looks for them on every other line; one under 3 characters, such as `U7` or `5%`, is matched as a whole word. Add `"seats"` for other check seats whose ground it touches, taken from round 1's `summary.roster` (on a high-risk run the `adv-*` seats, never `adversarial`). Each old text is in the plan exactly once and overlaps no other: copy enough of its line to make it so, and make two fixes to one sentence one edit carrying both ids. An old text that ends its line keeps that line break in its new text. Run `node "<skill>/lib/fold.mjs" apply "<plan>" "<edits file>"`, with that round's changes file as a fourth argument: every apply of check round 1 (the confirmed ids, the traced hand-verify ids, a drift fix) names `<job>/changes-2.json`, and round 2's P0 and P1 apply names `<job>/changes-3.json`. Never rewrite the whole plan with Write, and fix a drift line through apply too, never Edit. Two findings that pull apart: the repo's own evidence beats general advice, and the tradeoff is said in the section.
- **What apply answers.** Exit 0: the plan is written, and the changes file gains the fold's changed lines. Exit 2: edits refused, each named, nothing written: fix the edits file and run it again. Exit 1: the fold would drop a numbered item (a requirement, a unit, a decision) or leave a code fence open, nothing written: keep the item or close the fence (for an item removed on purpose, write its note: `### U7. removed: <reason>`), and run it again. Never run an edits file again after exit 0: an edit that adds after an anchor would add twice. Judge each line its drift list prints: an old phrase still standing somewhere else.

## The receipt

Plain lines, each stated from a result you read, never from memory (in session 2, the CE, research and deepen lines are session 1's, read from its receipt):

```
planned, deepened and checked            (session 1: planned and deepened; check next. Or: planned, confidence check passed, checked; add ", N P0/P1 open")
CE: <version> <commit, 7 characters>; seats without their CE file: <none, or each>
research: <answered> of <asked> helpers; outside research: <intent, or none>
deepen: <outcome>; risk: <the deepen's risk signals, or none>; <n> amendments folded, <n> left out
check: round 1 <n> seats, <n> confirmed, <n> folded; round 2 ...; round 3 ...
coverage holes: <none, or each seat and what it missed>
left out after a trace: <none, or each id and why>
```

Session 1's receipt has no check line. In session 2, when the check's CE version differs from session 1's, the CE line names both: `CE: research and deepen <version> <commit>; check <version> <commit>; seats without their CE file: ...`. "Checked" is said only when an adversary seat answered in round 1 (`summary.adversary.ran`); otherwise the line reads "check incomplete: no adversary".
