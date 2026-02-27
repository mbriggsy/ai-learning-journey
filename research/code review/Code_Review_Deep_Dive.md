# Code Review — Deep Dive

Parallel multi-agent PR review with confidence scoring. Official Anthropic plugin.

---

## What Is Code Review?

The Code Review plugin automates pull request review by launching multiple specialized AI agents in parallel. Five independent reviewers analyze your changes from different angles — CLAUDE.md compliance, bug detection, git history context, PR history, and code comments. Each finding is scored 0-100 for confidence, and only high-confidence issues (default 80+) are reported.

**By:** Anthropic (official plugin, ships with Claude Code)  
**GitHub:** [anthropics/claude-code/plugins/code-review](https://github.com/anthropics/claude-code/tree/main/plugins/code-review)

---

## The Problem It Solves

Single-pass code reviews miss things. Even experienced developers have blind spots — you'll catch security issues but miss a CLAUDE.md violation, or find the logic bug but miss the missing error handler. Running one agent once gives you one perspective.

Code Review runs 4-5 agents simultaneously, each looking at your diff through a different lens, then cross-validates every finding before reporting. The confidence scoring means you get high-signal feedback instead of a wall of noise and false positives.

---

## How It Works

### The Multi-Agent Pipeline

When you run `/code-review`, the plugin executes this pipeline:

**Step 1: Gather Context**  
A Haiku agent collects all relevant CLAUDE.md files (project root, parent directories, etc.)

**Step 2: Parallel Review (4 agents simultaneously)**

| Agent | Model | Focus |
|---|---|---|
| Agent 1 | Sonnet | CLAUDE.md compliance check (scoped to file paths) |
| Agent 2 | Sonnet | CLAUDE.md compliance check (parallel with Agent 1) |
| Agent 3 | Opus | Bug detection — scans diff only, no external context |
| Agent 4 | Opus | Security issues, incorrect logic, missing imports, type errors |

Each agent receives the PR title and description for intent context.

**Step 3: Validation**  
For every issue found in Step 2, parallel subagents validate the finding. A bug like "variable is not defined" gets verified against the actual code. A CLAUDE.md violation gets checked against the actual rule scope.

**Step 4: Confidence Scoring**  
Issues are scored 0-100. Only findings ≥80 survive (configurable). Below 80? Filtered out as likely false positives.

**Step 5: Output**  
Summary to terminal, or posted directly as PR comments with GitHub links containing full SHA hashes and line number ranges.

### What Gets Flagged

The plugin only flags HIGH SIGNAL issues:

- Code that will fail to compile or parse (syntax errors, type errors, missing imports)
- Code that will definitely produce wrong results (clear logic errors)
- Unambiguous CLAUDE.md violations (with the exact rule quoted)

From the source: *"If you are not certain an issue is real, do not flag it. False positives erode trust and waste reviewer time."*

---

## Key Features

- **5 Parallel Agents** — Multiple perspectives, multiple model tiers
- **Confidence Scoring** — 0-100 scale eliminates false positives
- **GitHub Integration** — Direct SHA-linked comments on PRs
- **Smart Filtering** — Auto-skips closed, draft, automated, or already-reviewed PRs
- **CLAUDE.md Awareness** — Checks compliance scoped to file hierarchy
- **Configurable Threshold** — Adjust from 80 to any 0-100 value

---

## Usage

```bash
# Local review (output to terminal)
/code-review

# Post review as PR comment
/code-review --comment
```

### Adjusting Confidence Threshold

Edit `commands/code-review.md`:
```
Filter out any issues with a score less than 80.
```
Change `80` to your preferred threshold. Lower = more findings, higher = fewer but more certain.

---

## Typical Workflow

```
1. Create PR with changes
2. Run /code-review (outputs to terminal)
3. Review the automated feedback
4. Make necessary fixes
5. Optionally post as PR comment: /code-review --comment
6. Merge when ready
```

### CI/CD Integration

```bash
# Trigger on PR creation or update
# Use --comment flag to post review comments
/code-review --comment
# Skip if review already exists
```

---

## When to Use It

**Always:** Before merging any non-trivial PR, especially in codebases with CLAUDE.md rules.

**Especially useful for:** Solo developers who lack peer reviewers, teams wanting consistent review standards, catching CLAUDE.md violations automatically.

**Skip when:** Trivial changes (README updates, version bumps), draft PRs still in progress.

---

## Tips

1. **Maintain clear CLAUDE.md files** — The more specific your rules, the better compliance checking works
2. **Trust the 80+ threshold** — It's tuned to filter false positives. Don't lower it unless you want noise.
3. **Use with Compound Engineering** — Let Code Review catch issues, then Compound Engineering captures the lessons

---

*Last updated: February 2026*
