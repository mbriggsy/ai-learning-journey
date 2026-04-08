# doc-audit

A Claude Code skill that audits markdown documentation using 4 parallel sub-agents, each specialized in one audit dimension. Produces a severity-rated report and waits for approval before making changes.

## How It Works

The skill runs in 5 phases:

1. **Discovery** — finds all markdown files, excluding generated/vendored content
2. **Parallel Audit** — spawns 4 agents simultaneously:
   - **Link Validator** — verifies every internal link target exists (files + heading anchors)
   - **Stale Content Hunter** — checks doc claims against source files (package.json, pyproject.toml, etc.) and cross-references code examples across docs for consistency
   - **Content Placement Auditor** — classifies each file, flags misplaced content, identifies gaps and orphans, checks formatting quality
   - **Duplication & Contradiction Detector** — finds duplicated content AND conflicting information across files (e.g., different API usage patterns, disagreeing parameter tables)
3. **Aggregate** — deduplicates findings, assigns severity, groups by file
4. **Report** — presents unified findings: Critical > Medium > Low
5. **Fix** — waits for user approval, then applies changes

## Usage

```text
/doc-audit [path]
```

Path defaults to the project root. The skill is slash-command only (`disable-model-invocation: true`) — it won't trigger automatically.

## Eval Results

Evaluated at 100% pass rate across 3 test fixtures (20 assertions). See `workspace/RESULTS.md` for eval results and iteration history.
