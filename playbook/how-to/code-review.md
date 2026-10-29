# The ultramode code review

The deep review we run when a piece of work is done: whole files, several specialist reviewers, and every finding checked against the real code before anything is fixed. It needs no special mode switched on; Claude can run it any time.

## When to use it

- **At a milestone:** the end of a unit of work, a feature or a build, before merging or moving on. Claude runs it without being asked.
- **When you ask** for an "ultramode", "ultra", "deep", "thorough", "holistic" or "real" review, a review "before we move on" or "before merge", or say "review what we just built".
- **For sizable work it is required.** Claude may use a tool other than this skill to do it, but a whole-file review that tries to break the code always happens.

Not for:

- A one-line or trivial change. Just read it.
- Posting review comments on a GitHub pull request (a proposed change waiting to be accepted on GitHub). That is `/code-review`.

## How to ask

Say any of the phrases above, or type `/ultramode-code-review` followed by what to review:

- nothing: the work done since the last review
- a folder, like `src/engine`: only that part
- `base:<commit>`: everything from that saved point in history up to now
- a pull request number or link: that pull request's work

## What it does

1. **Reads whole files, not just the changed lines.** The changes show where to look; the whole file shows whether it is right. The worst bugs hide where new code meets old code.
2. **Writes a short brief first.** Ten to twenty lines drawn from the project's `CLAUDE.md` (its rules file for Claude), its `docs/insights/` folder (its record of past mistakes), and the work's own commit messages or plan: the rules a change must not break, the deliberate choices not to flag, and the known traps. Every reviewer gets the same brief, so each one judges against this project, not a generic checklist.
3. **Sends out specialist reviewers at once, each looking from one angle.** Specialists for security, reliability, speed, changes to saved data, timing bugs in screen code and a few more join only when the change calls for them, each with a stated reason. A risky change gets several attackers, each from a different angle. Seven always run:
   - correctness
   - the rules the whole system must always keep
   - tests: do they prove the right answer, or only that the code runs?
   - whether it reads the way a fluent programmer in that language would write it
   - simplicity and structure
   - the formats other code and saved files depend on
   - at least one attacker, who tries to make the code give a confidently wrong answer
4. **Has skeptics check every finding against the actual code.** A confident finding is a guess until it is checked. Each finding gets one to three skeptics, the number rising with how serious it is, and each skeptic answers five things separately: is it real, can it cause a wrong result or real harm, did existing tests or reviews already catch it, how serious is it really, and is the suggested fix itself right? Many reviewers agreeing on a fix does not prove the fix, so the fix gets checked as its own question. Most splits follow the majority. Claude reads the code itself and decides when the skeptics tie, when too few answer, or when even one says the problem is real and not already caught while the rest disagree. A skeptic that crashes counts as no vote, never as a no.
5. **Fixes only what is real, can cause harm, and was not already caught by existing tests or reviews,** with the smallest change that does the job, then runs the project's full checks: the type check (a quick automatic test that the code's pieces fit together), the tests, and whatever else its `CLAUDE.md` lists.
6. **Writes the lesson down** with `/distill`, as a new file in the project's `docs/insights/` folder, so the next review starts smarter.

House rules on every review:

- Every reviewer and skeptic runs on the Opus model. Claude sets that on each one, instead of letting it take whatever model the session itself is using.
- A reviewer that crashes counts as "not checked", never as "clean". It is re-run, or its area is named as a gap.
- Reviewers may not change files. Claude checks afterward that none did.

## Rounds, and when to stop

- A round is one full pass: review, check, fix. Fixes can open new holes, so the next round reviews the fixed code.
- The normal rule: keep going until a round finds nothing real that could cause a wrong result or harm, however small.
- Watch the trend. If each round finds about as many problems as the last, only smaller ones, and most of them come from the last round's fixes, more patching won't finish the job: the design itself is the problem.
- Then change when to stop: pick the one kind of damage that matters most (for a cleanup tool that commits, deletes files and ends running programs: "can it commit, delete or kill another session's work?") and stop when no serious problem of that kind is left, even if smaller ones remain. Write the smaller leftovers down, and put the next effort into a design change that removes their cause, not into one more patch round.
- When rounds keep finding holes in one area, write down the one rule that area must never break, and add it to the brief for the next round.
- Look hardest at recovery code: the "here is how to undo this" messages and the steps that undo a change. That code runs only in an emergency, so its tests are the only time it ever runs, and a test can bake in the wrong way back and still pass.

## What you see

- **Before it starts:** the reviewer team, with the reason for each extra specialist.
- **At the end:** which reviewers ran, and any that crashed (re-run, or named as not checked). Then three piles:
  - **Fixed:** real problems, fixed, with the project's full checks run after.
  - **Noted:** real, but harmless or already covered by existing tests. Kept as warnings for later work.
  - **Thrown out:** the false alarms the skeptics caught. They are reported on purpose; they show the review is honest. Claude reads this pile before calling any review clean.
- **The lesson:** the new insight file from `/distill`.

## How it differs from the built-in reviews

| | What it does | Who starts it |
|---|---|---|
| **Ultramode review** (this page) | Whole files, judged against this project's own rules, with skeptics checking every finding before anything is fixed. Fixes what is real, then writes the lesson down. | Claude at a milestone, or you, by asking |
| **`/code-review`** | Lighter. Reviews the current changes, or a pull request, branch (a line of work) or folder you name, for correctness bugs, at an effort level from low to max. Can post its findings as comments on a GitHub pull request (`--comment`). | You or Claude |
| **`/code-review ultra`** | A paid review in the cloud by several AI reviewers, of the current branch, or of a GitHub pull request with `/code-review ultra <number>`. `/ultrareview` does the same thing. | You only. Claude cannot launch it. |

## Where it lives

- The skill: [projects/skills/ultramode-code-review/](../../projects/skills/ultramode-code-review/). The rules are in [SKILL.md](../../projects/skills/ultramode-code-review/SKILL.md), the reasoning in [README.md](../../projects/skills/ultramode-code-review/README.md), and the ready-to-adapt review script in [references/workflow-template.md](../../projects/skills/ultramode-code-review/references/workflow-template.md).
- Claude loads it from `~/.claude/skills/ultramode-code-review`, a shortcut (a Windows junction) to that same folder, not a copy.
- Lessons behind the rules: [why a fix gets checked on its own](../../projects/skills/ultramode-code-review/docs/insights/001-lens-convergence-validates-the-finding-never-the-fix.md) and [when review rounds stop shrinking](../docs/insights/002-when-review-rounds-stop-shrinking-but-severity-falls-the-tail-belongs-to-the-method-gate-on-harm-class.md).
- `/distill` lives in [projects/skills/distill-and-brief/](../../projects/skills/distill-and-brief/).
