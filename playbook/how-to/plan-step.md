# The plan step

The second play on the [front door](../README.md#2-plan-deepen-check-then-read-the-plan): the compound-engineering plugin's `ce-plan` writes, deepens and checks the plan, then three blind readers read it cold. Sizable work gets it before any build.

## When it runs

- **For sizable work** (new logic, or work that takes more than one session: [the full line](../principles.md#how-we-work)), after the brief and before the build. Claude starts it without being asked, and START HERE names it until it has run.
- **When you ask:** "plan <the work>".
- **In a fresh session.** A session keeps the plugin version it started with, and the plugin updates itself ([landmines: the CE plugin](../docs/landmines.md#the-ce-plugin)).

## What Claude asks `ce-plan` for, every time

- **The plan's path,** inside the project's own `docs/plans/`. Otherwise the plugin puts its plans folder at the top of the whole repo, not in the project.
- **Opus for every helper,** because otherwise the plugin sends some of them to cheaper models; and an effort level for each: xhigh for the reviewers, high for the researchers.
- **The whole plan for the reviewers who hunt contradictions and ways it could break.** By default each reviewer gets only the sections for its angle, and the check has to cover the plan as a whole.
- **The full team of reviewers, the one who tries to break the plan included:** `depth:full` on its `ce-doc-review` call, and `adversarial-document-reviewer` named on the team. Why: since plugin version 3.36.0, a plan whose text calls in none of the product, design, security or adversarial reviewers otherwise gets a "lite" check, one reviewer covering three angles at once with no one trying to break it. The check's result says which ran: a "lite review" line there means the ask was dropped, and the check runs again. Both asks held on their first run (2026-11-12).
- **No scope question to you before it starts** (`confirm:auto`), because you judge the result. A real fork that is yours still comes to you from Claude.
- **A stop after the check,** and never "build it" or "then implement it" in the request. When a request already says what comes after the plan, `ce-plan` does that without asking (its `references/plan-handoff.md`, section 5.4), and its build skill moves the work off main.

## Never start ce-work

When `ce-plan` offers its next steps, Claude never picks "Start ce-work". The plugin's `ce-work` build skill puts the work on a new branch before its first edit, without asking, and every session shares one copy of this repo on main. The build is Claude's own ([front door, step 3](../README.md#3-build)).

## The three blind readers

After the check, three helpers who never saw the planning each read the whole plan cold, through one lens:

- **The builder:** could I build this alone, and where would I take a wrong turn?
- **The rules:** are its rules, facts and cited code right?
- **The owner:** is it the right size, with your calls put to you with a recommended answer, and is the problem real? A plan written from a brief names the brief as its origin, and the plugin's own check skips "is the problem real?" for any plan with an origin ([insight 027](../docs/insights/027-ces-plan-check-turns-off-its-own-is-the-problem-real-challenge-for-any-plan-with-an-origin-such-as-a-brief.md)), so the owner reader asks it.

Each opens the code the plan cites and returns the plan's faults with their line numbers and a grade (`blocks`, `misleads` or `minor`), and says whether it would build from the plan.

How Claude launches them:

1. Copies [plan-readers.workflow.js](../plan-readers.workflow.js) into the session's scratchpad. The Workflow tool runs a script only from there or from the folder the session started in.
2. Makes sure the last message you typed holds nothing that would steer the readers: every Workflow helper is shown it.
3. Launches it with `{ request, plan: { path, lastLine }, entry, brief }`: the job word for word as the planner got it, the plan's absolute path and its last line with text, and, when there are any, where the job comes from and the brief the planner was given.

The result opens with an index, one line per fault, because the completion notice shows only the start of a long result. The first run (2026-11-12, on a 753-line plan) took 13 minutes and 0.74M helper tokens and returned 34 faults to check.

## What happens to the faults

Claude checks every fault against the code, then sorts them ([insight 028](../docs/insights/028-a-plans-builder-reads-only-the-plan-a-finding-left-in-a-commit-message-is-invisible-and-one-folded-into-an-existing-test-costs-less.md)):

- **The real ones a builder would hit get fixed in the plan:** those graded `blocks` (the build can't go on as written) or `misleads` (a builder who follows it builds the wrong thing). A fault left only in a commit message is invisible to the builder, who reads the plan.
- **The `minor` ones are listed in the plan,** not folded into its units. Folding every finding into the unit it touches packs the unit until its builder misreads it.
- **A unit that fixes crowd is rewritten as numbered steps,** instead of growing its paragraph.

The plan's commit message names the fixes and says what ran: "planned, deepened, checked and read", or "planned, confidence check passed, checked and read" when no section needed deepening. The build starts only once the plan's history shows it.

## Where it lives

- `ce-plan` and `ce-doc-review`: skills of the compound-engineering plugin, under `~/.claude/plugins/`. The TODO's start check names the live version. The plugin's settings for this repo, with its review pass by another company's model switched off, are in [.compound-engineering/config.yaml](../../.compound-engineering/config.yaml).
- The readers: [plan-readers.workflow.js](../plan-readers.workflow.js) in the playbook folder.
- The plugin's traps: [landmines, the CE plugin](../docs/landmines.md#the-ce-plugin).
- Lessons behind the rules: [why the readers](../docs/insights/029-thirteen-times-the-helpers-bought-a-plan-that-lost-the-faults-that-decided-it-were-found-by-a-few-close-reads-of-the-code-and-the-whole-plan.md) (insight 029), [why the owner asks "is the problem real?"](../docs/insights/027-ces-plan-check-turns-off-its-own-is-the-problem-real-challenge-for-any-plan-with-an-origin-such-as-a-brief.md) (insight 027) and [why the faults are sorted](../docs/insights/028-a-plans-builder-reads-only-the-plan-a-finding-left-in-a-commit-message-is-invisible-and-one-folded-into-an-existing-test-costs-less.md) (insight 028).
