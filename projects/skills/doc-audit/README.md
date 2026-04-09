# doc-audit

A Claude Code skill that audits markdown documentation using 5 parallel sub-agents, each specialized in one audit dimension. Produces a severity-rated report and waits for approval before making changes.

## How It Works

The skill runs in 5 phases:

1. **Discovery** — finds all markdown files, excluding generated/vendored content
2. **Parallel Audit** — spawns 5 agents simultaneously:
   - **Link Validator** — verifies every internal link target exists (files + heading anchors)
   - **Stale Content Hunter** — checks doc claims against source files (package.json, pyproject.toml, etc.) and cross-references code examples across docs for consistency
   - **Content Placement Auditor** — classifies each file, flags misplaced content, identifies gaps and orphans, checks formatting quality
   - **Duplication Detector** — finds repeated content across files, identifies source of truth, assesses drift risk
   - **Consistency Checker** — finds contradictions and presentation mismatches across files
3. **Aggregate** — deduplicates findings, assigns severity, groups by file
4. **Report** — presents unified findings: Critical > Medium > Low
5. **Fix** — waits for user approval, then applies changes

## Install

1. Create a folder called `doc-audit` inside `~/.claude/skills/` (create `skills/` too if it doesn't exist)
2. Download [SKILL.md](https://github.com/mbriggsy/ai-learning-journey/blob/main/projects/skills/doc-audit/SKILL.md) and save it into that folder
3. Restart Claude Code — `/doc-audit` is now available in any project

## Usage

```text
/doc-audit [path]
```

Path defaults to the project root. The skill is slash-command only (`disable-model-invocation: true`) — it won't trigger automatically.

## Eval Results

See [workspace/RESULTS.md](workspace/RESULTS.md) for eval results and iteration history.
