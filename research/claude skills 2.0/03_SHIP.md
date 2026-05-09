---
aliases: [skills-2.0-ship, skills-2-ship]
tags: [research]
---

# Shipping With Discipline

**Read time:** ~10 minutes. Read this before your first skill hits a teammate's hands.

The thesis: **skills are code. Test them like code. Review them like code. Ship them like code.**

This doc is the engineering craft for putting skills in front of real users — teammates, the rest of your team, the org. Not a compliance checklist. A practitioner's guide. If you skip it, skills degrade as they accumulate; follow it, and every new skill makes the library stronger.

---

## Why "vibes-based" breaks at scale

One engineer building skills for themselves? Vibes work. Write a SKILL.md, try it twice, ship it. You'll catch your own regressions because you use the thing.

Four engineers building skills for a shared POC? Vibes collapse. Here's how:

- Engineer A ships a skill that works for their phrasing. Engineer B uses different phrasing; the skill doesn't trigger. B writes a second skill that overlaps. Now two skills fight.
- Engineer C modifies A's skill to handle an edge case. Didn't run the tests (there are no tests). A's original use case now produces worse output. Nobody notices for three weeks.
- The team rolls to a new Claude version. Four skills silently degrade. Nobody has a benchmark to compare against. The POC gets blamed for "AI being unreliable."

All of those are fixable with discipline. None of them are fixable without it.

---

## The commit bar

A skill enters `.claude/skills/` with the following artifacts, every time:

```
.claude/skills/my-skill/
├── SKILL.md              # The skill itself
├── README.md             # Human-facing: what it does, when to use it
├── DECISIONS.md          # Brief ADR — why a skill, not something else
└── evals/
    ├── evals.json        # Test cases + assertions
    ├── eval_set.json     # Description optimizer eval set
    ├── benchmark.json    # Latest benchmark results
    └── iteration-N/      # Latest iteration artifacts
```

Each piece has a job:

- **SKILL.md** — the skill. Obvious.
- **README.md** — so a teammate browsing `.claude/skills/` knows what this thing does without reading the SKILL.md body. Three paragraphs, max: what it does, when it triggers, what it's *not* for.
- **DECISIONS.md** — the ADR. See the next section.
- **evals/** — the tests. Also see below.

A skill PR without these artifacts gets bounced. Not because the bureaucracy says so — because the next person to touch it can't do their job without them.

---

## The DECISIONS.md pattern

A skill ADR is three short sections. Takes ten minutes to write.

```markdown
# DECISIONS — release-notes

## Why a skill (not a subagent, not a hook, not an Agent SDK build)

This is a rubric + workflow applied to git context. Skills are the right
primitive: portable, composable, doesn't need its own runtime. Considered
a subagent definition — rejected because there's no need for tool
restrictions or parallel execution. Considered a hook on `PostToolUse(git
push)` — rejected because this is user-invoked, not event-driven.

## Why the frontmatter looks the way it does

- `allowed-tools: Bash(git *), Bash(gh *), Read` — scoped to read-only
  git and GitHub operations. No Write access needed; the skill produces
  Markdown to stdout for the user to paste.
- `auto-invoke enabled` — no side effects, so letting Claude trigger on
  description match is fine.
- No `context: fork` — output is lightweight; main chat can handle it.

## What the evals measure

Three test cases covering explicit invocation, natural-language request,
and casual phrasing. Assertions check output structure (H2 sections, PR
numbers, author credits), scope correctness (no PRs outside the diff
window), and hallucination resistance (no invented PRs). Baseline A/B
confirms with-skill lifts pass rate from 33% to 100%.
```

That's it. Three sections. Reads in 60 seconds. Saves hours of "why did we build it this way?" arguments later. Critical when someone new joins the POC or when a reviewer says "why didn't you use an Agent SDK build for this?" — the answer is right there, written down.

---

## Pass-rate thresholds

Every skill ships with a pass rate on its committed eval set. The threshold depends on what the skill does:

| Skill type | Threshold | Rationale |
|-----------|-----------|-----------|
| **Reference / preference** (style guide, brand, conventions) | **70%** | Subjective quality. Human judgment dominates; the pass rate is a sanity check, not a gate. |
| **Default workflow** (release-notes, meeting-notes, triage) | **80%** | Standard bar. Below this, the skill is probably unreliable enough to confuse more than help. |
| **Side-effect workflow** (deploy, commit, post-to-Slack, ticket creation) | **90%** | Anything that takes action on the world. The cost of a bad invocation is real. |
| **Safety-critical** (access control, security auditing, financial ops) | **95%+** | Rare in a POC but worth naming. These skills are tested like production code. |

Pass rate is checked on the latest iteration's benchmark.json. Commit the benchmark. If a skill doesn't meet its threshold, it doesn't ship.

**How to pick the right row** — ask three questions in order and stop at the first yes:

1. **Does the skill take action on the outside world** (write files the user didn't ask about, post to Slack, create tickets, run deploys, touch prod)? → side-effect workflow, **90%**. If a bad invocation is irreversible or safety-relevant (access control, financial ops), bump to **95%+**.
2. **Is the skill a default workflow** the team will run routinely (release-notes, meeting-notes, triage, standup summary)? → **80%**.
3. **Is the skill reference content or preference encoding** (style guide, brand rules, naming conventions)? → **70%**.

If it doesn't fit any row, default to **80%**. Write the choice in DECISIONS.md so reviewers don't re-litigate it.

**The common objection:** "But the threshold is arbitrary." Yes. Pick one, write it down, enforce it. An arbitrary bar enforced consistently beats a thoughtful bar enforced never.

---

## The PR checklist

Every skill PR hits this list. Check every item:

```
[ ] SKILL.md exists with frontmatter including name, description, allowed-tools.
[ ] README.md explains what the skill does, when to trigger, and when NOT to.
[ ] DECISIONS.md documents why this is a skill vs. alternative primitives.
[ ] evals/ directory committed with evals.json, benchmark.json, and latest iteration.
[ ] Pass rate meets the threshold for this skill's category.
[ ] Baseline A/B shows the skill lifts pass rate above no-skill.
[ ] Description optimized — trigger accuracy >= 85% on held-out test set.
[ ] Description includes explicit negatives ("Do NOT use for...").
[ ] No secrets, credentials, or internal hostnames in SKILL.md or supporting files.
[ ] Supporting scripts (if any) reviewed for safety — no arbitrary code exec,
    no data exfil paths.
[ ] If the skill uses `context: fork`, the frontmatter justifies it.
[ ] If the skill preloads into a subagent, the subagent definition is in the PR.
```

Twelve lines. Two minutes to check. If any line fails, the PR goes back.

Reviewers aren't grading the skill's *quality* in isolation — that's what the evals are for. Reviewers are grading whether **the evidence is attached**. Pass rate below threshold? Evidence says don't merge. Baseline A/B missing? Evidence incomplete.

---

## Regression checks for skill updates

When modifying an existing skill, the question isn't "does my change work?" — it's "does my change not break anything?"

Before the PR:

1. **Run the committed eval set** against the modified skill. Save new benchmark.
2. **Compare to previous benchmark.** Specifically:
   - Did pass rate go down? If yes, the change is a regression even if it fixes the case you cared about.
   - Did any assertion that used to pass now fail? Same story.
   - Did token usage explode? Might be fine, might be bloat.
3. **Add new eval cases for the bug you fixed** or the feature you added. The case that motivated the change should now be in the permanent eval set.
4. **Re-run description optimization** if you changed the description or the skill's scope. A change that shifts what the skill does should shift what triggers it.

Commit the new benchmark alongside the changes. Reviewers compare before/after; no-regression is the default bar.

**Special case: baseline changes.** Claude model updates can shift the baseline. If your skill's lift over baseline drops because baseline got better, that's not a regression — that's the skill becoming less necessary. Capability-uplift skills are *supposed* to retire as models improve. Note it in DECISIONS.md and decide whether the skill still pulls its weight.

---

## The maturity model

Where teams actually sit, and what "level up" means:

| Level | Practice | Reality check |
|-------|----------|--------------|
| **0: Vibes** | Write skill, try it, ship it. No tests. | Works for one engineer on one project. Collapses at team scale. |
| **1: Spot checks** | Run 2-3 test cases manually each time. | Better than nothing. Stops regressions you'd catch in a minute of manual testing. Misses everything you wouldn't. |
| **2: Structured evals** | Formal test cases, assertions, A/B vs. baseline. Skill Creator. | Serious practice. Skills get measurably better over iterations. Reasonable bar for a POC. |
| **3: Gated deployment** | Evals in PR. Pass-rate threshold enforced. Regression checks. | Where this POC lives. Every skill ships with evidence; reviewers enforce the bar. |
| **4: Continuous monitoring** | Production skill metrics. Auto-alert on degradation. Cross-model evals. | Enterprise-scale. Not needed yet; worth knowing exists. |

**For this POC, aim for Level 3.** Level 4 requires infrastructure we don't have and don't need yet. Level 2 isn't enough — without the PR gate, the discipline decays. Level 3 is the sweet spot: discipline enforced through process, not tooling we'd have to build.

---

## When can you actually skip evals?

Short answer: almost never.

Slightly longer answer: there are three cases where you can get away with it, and each is a trap if you're not careful.

**1. Pure reference skills.** A skill that's just "here are our brand colors" — no task, no behavior to test. Assertions have nothing to grade. You can skip the A/B benchmark, but you should still:
- Have a description optimizer run so the skill triggers reliably.
- Commit a README with the reference content inline, so a human can verify correctness at review.

**2. Disposable personal skills.** Something you built for yourself that'll never leave your `~/.claude/skills/`. No evals needed — you'll notice if it breaks. But the moment you share it with someone, it's no longer disposable. Promote it: evals, DECISIONS, PR, the works.

**3. Skills that literally aren't shipping yet.** A draft in a branch nobody uses. Of course no evals. Don't merge it to a shared branch until it's evaluated.

**Everything else:** evals. Including the ones where you're "pretty sure it works." That's exactly where the silent regressions hide.

---

## The governance conversation that matters

When a teammate asks "why are we making such a big deal out of evals for a POC?", the answer is not *"because Anthropic says so."* The answer is:

> Because the POC's credibility depends on skills that actually work. If we ship a skill that fails 30% of the time, the feedback isn't "this one skill has bugs" — it's "this agentic approach doesn't work." We're not evaluating individual skills; we're evaluating the approach through them. A shitty skill takes down the whole pitch.

Write that down somewhere. Pin it. When discipline feels tedious, re-read it.

The people who've done this at scale — Anthropic, Microsoft, OpenAI, the platforms shipping skills to real users — are all operating at Level 3 or higher. Not because it's fun. Because anything less doesn't compound.

---

## A last-mile checklist

Before the skill goes to a teammate:

- [ ] Read SKILL.md end-to-end as a stranger would. Does it make sense without the conversation that built it?
- [ ] Pull the repo on a different machine, invoke the skill fresh. Does it work outside your local quirks?
- [ ] Ask a teammate who didn't build it to run it on a realistic task. Watch them. Note every moment of confusion.
- [ ] If the skill has side effects (deploy, commit, Slack), run it in a safe environment first. Don't discover the bug in production.
- [ ] Update the team's skills catalog (wherever that lives) so people can find it.

---

## Next

You've read the whole fast lane. START → BUILD → SHARPEN → SHIP. Now go build. Specifically:

1. **Build your POC skills.** Apply the discipline. Every one.
2. **Pair-review each other's skills** using the PR checklist above. This is faster than it sounds and catches more than you'd expect.
3. **When you hit something weird** — a flag that doesn't behave like the docs say, a subagent that won't preload, a description that won't stabilize — hit the [reference docs](reference/README.md):
   - [Skills, Agents, and Subagents — Oh My!](reference/Skills_Agents_and_Subagents_Oh_My.md) for architectural questions.
   - [Claude Skills 2.0 — User Guide](reference/Claude_Skills_2.0_User_Guide.md) for the full manual.
   - [Skill Creator Practitioner's Guide](reference/Skill_Creator_Practitioners_Guide.md) for deeper eval methodology.

Skills first. Evals before ship. Write the decision down. That's the whole game.
