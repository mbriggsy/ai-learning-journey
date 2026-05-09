---
aliases: [skills-2.0-build, skills-2-build]
tags: [research]
---

# Your First Skill

**Read time:** ~15 minutes. Hands-on: plan to spend 30–45 minutes building along.

You've read [00_START.md](00_START.md). You know what a skill is. Now build one.

We'll build a **release-notes generator** end-to-end using the Skill Creator. You'll draft it, test it against a baseline, evaluate the results, improve it, optimize the trigger description, and package it for distribution. By the end you'll have a working skill committed to `.claude/skills/` and — more importantly — the muscle memory for how Anthropic thinks skills should be engineered.

---

## What we're building

`release-notes` — a skill that generates a clean, structured release note from recent git activity. The user says *"generate release notes for v1.4"* (or types `/release-notes v1.4`), and Claude produces a markdown document grouped into Features / Fixes / Breaking Changes, with PR numbers and author credits, scoped to commits since the previous tag.

Why this example:

- **Every team needs one.** It'll actually get used.
- **It exposes the right machinery.** Dynamic context injection (pulling `git log` into the prompt), tool restrictions, realistic A/B measurement, non-trivial description work.
- **The baseline is genuinely weaker.** Ask raw Claude to generate release notes and you get something — but inconsistent, missing the canonical sections, with a coin-flip on whether PR numbers show up. Measurable lift means a meaningful A/B.

---

## Prereqs

One install, one minute. Inside a Claude Code session:

```
/plugin install skill-creator
```

(Or install it from the plugin marketplace UI — same result.) After install, `/skill-creator` shows up in your slash-command autocomplete. That's your signal it's ready.

You'll also want a repo with some real git history to point at. Any active repo works. If you don't have one handy, clone something that's been maintained for a while — the skill needs real commits to practice on.

---

## Phase 1: Capture intent

Start a fresh Claude Code session in your target repo, then invoke the Skill Creator:

```
/skill-creator
```

The Skill Creator will interview you. Answer plainly. Here's what I'd say for this skill:

> **What should this skill enable Claude to do?**
> Generate release notes from merged PRs and commits since the previous release tag. Group findings by type (features, fixes, breaking changes). Include PR numbers and author credits. Scope strictly to the diff window — no hallucinated changes.
>
> **When should it trigger?**
> When the user asks for release notes, a changelog entry, a changelog summary, or similar. Phrases like "what shipped this week" should also trigger. Should not trigger on unrelated git queries.
>
> **What's the expected output?**
> Markdown document, top-level heading is the target version, H2 sections for Features / Fixes / Breaking Changes / Internal. Each bullet includes the PR number and author. Terse — no filler prose.
>
> **Manual-only or auto-invoke?**
> Auto-invoke. Release notes generation doesn't have side effects, so letting Claude trigger on description match is fine.
>
> **Should we set up test cases?**
> Yes. Three realistic prompts, ranging from explicit ("/release-notes for v1.4") to casual ("what shipped this week?").

**Why this framing matters.** The Skill Creator uses your answers to draft the first version of the skill and to generate test prompts. Vague intent yields a vague skill. The more concrete you are about *exact output format*, *edge cases* ("no hallucinated changes"), and *when not to trigger*, the better the draft you get.

**Pro move:** if you already have a conversation where you talked Claude through making release notes manually, point the Skill Creator at that transcript and say "turn this into a skill." It'll extract the working pattern.

---

## Phase 2: The first draft

The Skill Creator produces a draft SKILL.md. Yours will vary, but expect something close to this:

```markdown
---
name: release-notes
description: "Generate release notes from merged PRs and commits since
  the previous release tag. Use when the user asks for release notes,
  a changelog entry, a changelog summary, what shipped in a time window,
  or a version summary. Also trigger on phrases like 'what landed this
  week' or 'summarize recent merges'. Do NOT use for generic git queries
  unrelated to release authoring."
allowed-tools: Bash(git *), Bash(gh *), Read
argument-hint: [version-tag]
---

# Release Notes Generator

Generate a structured release note for version $ARGUMENTS based on the
merged PRs and commits since the previous release tag.

## Context

- Target version: $ARGUMENTS
- Previous tag: !`git describe --tags --abbrev=0 HEAD^ 2>/dev/null || echo "none"`
- Commits since previous tag: !`git log --oneline $(git describe --tags --abbrev=0 HEAD^ 2>/dev/null)..HEAD 2>/dev/null || git log --oneline -50`
- Merged PRs (if gh available): !`gh pr list --state merged --limit 50 --json number,title,author,mergedAt 2>/dev/null || echo "gh not available"`

## Output format

Produce markdown with this structure:

​```markdown
# Release Notes — $ARGUMENTS

## Features
- PR title (#123) — @author

## Fixes
- PR title (#124) — @author

## Breaking Changes
- PR title (#125) — @author

## Internal
- PR title (#126) — @author
​```

## Rules

1. **Scope strictly to the diff window.** Only include PRs merged between the previous tag and HEAD. If a PR is older, exclude it.
2. **Categorize by conventional commit prefix.** `feat:` → Features. `fix:` → Fixes. `BREAKING CHANGE:` or `!` → Breaking Changes. Everything else → Internal.
3. **Include PR number and author.** If either isn't available, flag with `[TBD]` — don't guess.
4. **No prose filler.** Bullets only. No "this release brings..." intros.
5. **If no PRs are in scope, say so explicitly.** Don't fabricate.
```

**What to notice in this draft:**

- `allowed-tools` — skill can run `git` and `gh` without permission prompts. Good for auto-invoke UX.
- `argument-hint: [version-tag]` — shows in autocomplete when the user types `/release-notes`.
- `` !`git log ...` `` — dynamic context injection. The shell command runs **before** Claude sees the prompt, and the output is spliced in. Claude never has to hunt for the data; it's already there.
- **The "Rules" section uses reasoning, not caps.** Good skills say "*Scope strictly to the diff window because older PRs inflate the release and confuse readers*", not "**ALWAYS SCOPE TO DIFF WINDOW.**" Reasoning generalizes; caps-lock doesn't.
- **Negative boundaries in the description.** "Do NOT use for generic git queries" — prevents over-triggering.

Save the draft. The Skill Creator will have written it to a workspace directory.

---

## Phase 3: Test cases

The Skill Creator auto-drafts test prompts. For this skill, something like:

```json
{
  "skill_name": "release-notes",
  "evals": [
    {
      "id": 1,
      "prompt": "Generate release notes for the upcoming v1.4 release",
      "expected_output": "Structured markdown with Features/Fixes/Breaking/Internal sections"
    },
    {
      "id": 2,
      "prompt": "/release-notes v1.4.0",
      "expected_output": "Same structure, scoped to diff since previous tag"
    },
    {
      "id": 3,
      "prompt": "what landed this week? making a changelog entry",
      "expected_output": "Structured release note, scoped reasonably to recent activity"
    }
  ]
}
```

**Case 3 is the interesting one** — casual phrasing, abbreviated, with a typo-ish texture. Real engineers ask for real release notes this way. If the skill only triggers on formal requests, case 3 exposes that.

### Assertions

The Skill Creator also drafts assertions — things that should be true about each output:

```json
{
  "assertions": [
    {"text": "Output uses H2 sections: Features, Fixes, Breaking Changes, Internal", "type": "format"},
    {"text": "Each bullet includes a PR number in the form (#N)", "type": "format"},
    {"text": "Each bullet includes an author credit starting with @", "type": "format"},
    {"text": "No PRs included that predate the previous release tag", "type": "quality"},
    {"text": "Does not invent PRs or commits not in the context", "type": "quality"},
    {"text": "Does not include filler prose between sections", "type": "format"}
  ]
}
```

**A good assertion discriminates.** An assertion that passes regardless of whether the skill is active tells you nothing. "Output is in markdown" is useless — the baseline produces markdown too. "Output uses these exact H2 sections" is discriminating — the baseline won't land on that structure reliably.

Edit the assertions if they feel off. This is the moment to add team-specific ones ("Uses our internal component naming", "Separates breaking changes by migration complexity"). The Skill Creator drafts a generic baseline; you make it yours.

---

## Phase 4: Run the evals

In Claude Code, the Skill Creator spawns six subagents simultaneously — two per test case:

- **With-skill run** uses your `release-notes` skill on the prompt.
- **Baseline run** uses the same prompt with no skill active.

All six run in parallel. While they execute, the Skill Creator finalizes assertions.

Once they finish:

**Grading.** A Grader agent evaluates each assertion against each output — pass/fail with evidence. Programmatic checks ("output includes `(#N)` patterns") get a short script. Subjective checks use judgment.

**Benchmark.** You get `benchmark.json` and `benchmark.md` with pass rates, timings, and token usage per configuration, with mean ± stddev and the with-vs-without delta.

**Eval viewer.** A browser-based review UI opens. Two tabs:

- **Outputs** — one test case at a time. Prompt, both outputs side-by-side, formal grades with evidence, a feedback textbox that auto-saves.
- **Benchmark** — pass rates, timing comparison, token deltas, per-eval breakdowns, observations on non-discriminating assertions or flaky evals.

**What you're looking for:**

1. **Does with-skill beat baseline?** If pass rate is the same, the skill isn't adding value. Something's off — either the skill is weak or the assertions aren't discriminating. Fix one or the other before continuing.
2. **Do all three test cases pass?** If case 3 (casual phrasing) fails but 1 and 2 pass, your description is under-triggering. Note it for the description optimization phase.
3. **Any assertions the baseline *also* passes?** Drop or replace them. They're not measuring skill quality; they're measuring Claude quality.
4. **Any weird outputs?** The with-skill run should look like the baseline — just better-structured. If it's bizarrely different (adds fabricated sections, invents commits), that's a real bug in the skill.

Click through each test case. Leave feedback in the textboxes. Submit when done.

---

## Phase 5: Improve

Common first-iteration findings on a skill like this:

- **The skill categorized something as "Internal" when it was actually a feature.** Fix: make the categorization rules more specific. Add an example. Don't just add "MUST categorize correctly" — that's the same information in capslock form. Instead: *"When a commit message starts with `feat:` but doesn't add a user-visible capability (e.g. refactors, internal API changes), classify it as Internal even though the prefix says feat."*
- **The skill invented a PR number for a commit that didn't have one.** Fix: make the "no fabrication" rule concrete. *"If a commit doesn't correspond to a PR, omit the PR number entirely. Never invent one. If the PR number isn't resolvable from `git log` alone, use `[no PR]` as the marker."*
- **The skill included merge commits as standalone entries.** Fix: *"Exclude merge commits (starts with 'Merge pull request' or 'Merge branch') — they're duplicates of the underlying PR."*
- **The description matched too aggressively.** Case 3 triggered on prompts that weren't actually about release notes. Defer this to Phase 6.
- **The skill wasted tokens explaining what it was about to do.** Read the transcripts, not just the outputs. If Claude said "I'll now generate release notes by..." before every response, tell the skill to skip the preamble.

**Anthropic's three rules for improvements:**

1. **Generalize, don't overfit.** A fix that only helps *this specific test case* is probably making the skill more brittle, not more robust. Ask: *will this improvement help other realistic prompts?*
2. **Explain the why.** Reasoning generalizes; rules don't.
3. **Delete instructions that waste time.** If the transcripts show Claude doing something unproductive, cut the instruction that led there. Less is often more.

Apply your fixes. Re-run the evals. Compare iteration 2 to iteration 1 in the viewer (it shows them side-by-side if you pass `--previous-workspace`).

**Stop when:**

- All assertions pass consistently.
- Feedback fields come back empty on review.
- You're not making meaningful progress between iterations.

Most skills converge in 2–3 iterations. If you're on iteration 5 and still fighting the same issue, the problem is the skill's fundamental approach, not the wording. Back up and reconsider.

---

## Phase 6: Optimize the description

Once behavior is solid, tune the *trigger*. The description is how Claude decides whether to load your skill; getting it right is harder than it looks.

The Skill Creator generates 20 queries — a mix of should-trigger and should-not-trigger — and runs a train/test optimization loop. The mechanics:

1. **Generate eval set.** 8–10 positive queries, 8–10 negatives. Make the negatives tricky, not trivial.
   - Good negative: *"write a code review checklist for our wiki"* (shares the word "review" or "write" but isn't about releases)
   - Bad negative: *"what's the fibonacci sequence?"* (doesn't test anything)
2. **Review the eval set.** An HTML interface lets you edit, add, remove. Catch any negatives that are actually positives (or vice versa).
3. **Run the loop:**

```bash
python -m scripts.run_loop \
  --eval-set eval_set.json \
  --skill-path ./release-notes/ \
  --model claude-sonnet-4-6 \
  --max-iterations 5 \
  --verbose
```

The loop:
- Splits the eval set 60% train / 40% test.
- Evaluates the current description on both.
- Proposes improved descriptions based on failures.
- Iterates up to 5 times.
- **Selects by test score, not train score.** This is the anti-overfit mechanism. A description that scores 100% on training data but 70% on test data is overfit; the loop picks the description with the best held-out performance.

4. **Apply the best description.** The optimizer outputs `best_description`. Update your SKILL.md frontmatter. The before/after trigger accuracy numbers are in the report.

Most skills land at 85–95% trigger accuracy after one or two optimization runs. If you're stuck below 80%, the skill's *purpose* is probably fuzzy — sharpen the intent, not the description.

---

## Phase 7: Package and ship

Validate and package:

```bash
python -m scripts.package_skill ./release-notes/
```

This produces `release-notes.skill` — a ZIP archive you can:

- **Commit to the repo** at `.claude/skills/release-notes/` (don't commit the `.skill` file itself — commit the directory contents). This is the path for the POC.
- **Upload to Claude.ai** via Customize → Skills.
- **Distribute via a plugin** if you're shipping beyond this repo.

**Commit the evals alongside.** This is critical:

```
.claude/skills/release-notes/
├── SKILL.md
└── evals/
    ├── evals.json
    ├── benchmark.json
    └── iteration-N/   # latest iteration outputs for review
```

The evals ARE your tests. Commit them. The next person who touches this skill (maybe you in three months) needs to know what "working" looks like. Evals in Git also give you a regression test — future changes get benchmarked against the same test set.

See [03_SHIP.md](03_SHIP.md) for the full shipping discipline — pass-rate thresholds, ADR pattern, PR checklist.

---

## What you just did

You didn't just build a skill. You built the *habit* of building skills the right way:

1. **Captured intent crisply** before writing a line of Markdown.
2. **Let the Skill Creator draft** — faster than writing from scratch, and the drafts are reliably good.
3. **Ran A/B against baseline** — so you know the skill actually helps, not just exists.
4. **Used realistic, messy test prompts** — not polished ones.
5. **Wrote assertions that discriminate** — baseline fails them, skill passes them.
6. **Iterated until converged** — reading transcripts, not just outputs.
7. **Optimized the description with a held-out test set** — no overfitting.
8. **Committed evals alongside the skill** — so future changes are measurable.

That sequence is the difference between "shipped a skill" and "shipped a skill that works." Do this every time.

---

## Common gotchas

**"Claude doesn't trigger my skill even on obvious prompts."**
Claude under-triggers by default. Your description is too polite. Make it pushy — list explicit keywords and scenarios ("Triggers include: '...', '...', '...'"). Re-run the description optimizer.

**"My skill triggers on stuff it shouldn't."**
Your description is too broad. Add explicit negatives ("Do NOT use for ..."). Negatives are as important as positives.

**"My skill works in test runs but fails when I invoke it directly."**
Heads-up: `context: fork` and `agent:` frontmatter fields are ignored when a skill is invoked via the Skill tool directly (tracked in [anthropics/claude-code#17283](https://github.com/anthropics/claude-code/issues/17283)). Trigger via description match or `/skill-name` to exercise those fields. Don't rely on direct Skill tool invocation in tests if isolation matters.

**"My baseline A/B shows with-skill and baseline getting the same pass rate."**
Either your skill isn't adding value, or your assertions aren't discriminating. Fix one:
- If Claude's raw output already looks like your skill's output, the skill is redundant — maybe this capability doesn't need a skill.
- If both outputs look different but still pass all assertions, your assertions are too lenient. Make them more specific.

**"I'm on iteration 4 and still fighting the same issue."**
Back up. The problem is probably in the skill's fundamental approach, not the wording. Re-examine your intent capture — did you miss a constraint? Is the output format actually achievable with the inputs the skill has access to?

**"Claude wasted tokens in the transcript explaining its plan."**
Read the transcripts. Find the instruction that triggered the preamble. Delete it. Less is more.

**"I want to run this skill in a subagent so it doesn't pollute my main chat."**
Add `context: fork` to frontmatter. That's the next stop — see [02_SHARPEN.md](02_SHARPEN.md) for when this is the right move and when it isn't.

---

## Next

You have a working, tested, committed skill. Pick your next move:

- **Build another.** The reps are what builds intuition. Do three or four before reading further.
- **[02_SHARPEN.md](02_SHARPEN.md)** when you want to compose skills with subagents, MCP, and hooks.
- **[03_SHIP.md](03_SHIP.md)** when you're putting skills in teammates' hands and need the governance patterns.
- **[reference docs](reference/README.md)** when you hit something weird and need the authoritative answer.
