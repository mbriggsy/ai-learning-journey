---
name: doc-audit
description: Thorough documentation audit for any project. Finds all markdown docs, classifies them, checks for stale content, duplicated information, contradictions, misplaced content, broken links, and formatting issues. Produces a severity-rated report and waits for approval before making changes.
user-invocable: true
argument-hint: "[path (defaults to project root)]"
disable-model-invocation: true
---

Audit all markdown documentation in a project using parallel sub-agents. Each agent specializes in one audit dimension, works independently, and returns findings. The orchestrator aggregates, deduplicates, and presents a unified report.

## Phase 1: Discovery (inline — fast)

Find all markdown files, excluding generated/vendored content:

```bash
find <project-root> -name "*.md" \
  -not -path "*/node_modules/*" \
  -not -path "*/.agents/*" \
  -not -path "*/skills/*" \
  -not -path "*/.git/*" \
  -not -path "*/vendor/*" \
  -not -path "*/dist/*" \
  | sort
```

Count them and list them. This is the audit scope — pass the full file list to every agent.

## Phase 2: Spawn Parallel Audit Agents

Launch ALL FOUR agents in a SINGLE message (parallel tool calls). Each agent gets the file list from Phase 1 and works independently. Do NOT launch them sequentially.

Wait for ALL agents to complete before proceeding. If an agent was worth spawning, it's worth waiting for.

### Agent 1: Link Validator

```
You are auditing documentation for broken links.

Files to audit: <file list>
Project root: <path>

For every markdown file in the list:
1. Read the file completely
2. Find every internal markdown link: [text](path) and [text](./path)
3. For each link, verify the target file exists (use ls or find)
4. If the link targets a heading anchor (#section-name), verify that heading exists in the target file
5. Also check for references to files in prose (e.g., "see docs/setup.md") that aren't proper links

Report format — one entry per broken link:
- File: <source file>
- Line: <line number>
- Link: <the markdown link>
- Target: <resolved path>
- Status: BROKEN (file missing) | BROKEN (heading missing) | SUSPICIOUS (prose reference, not linked)
- Fix: <specific fix>

If all links are valid, report "All N links verified across M files."
```

### Agent 2: Stale Content Hunter

```
You are auditing documentation for stale or outdated content.

Files to audit: <file list>
Project root: <path>

For every markdown file:
1. Read the file completely
2. Check claims against reality:
   - Referenced file paths — do they exist? (ls/find to verify)
   - Commands — do they match package.json scripts / Makefile targets?
   - Version numbers — do they match package.json / Cargo.toml / pyproject.toml?
   - Status claims — "not yet configured", "will be done in Phase X", "TODO" items that may be done
   - Dates and timestamps — are they plausible?
   - Tech decisions — do they match what the codebase actually uses?
3. Cross-reference code examples — if the same function, method, or API appears in multiple docs, do the usage patterns match? For example, one doc showing a function as a Jest matcher and another documenting it as a regular method returning a value is a contradiction even if neither doc is "stale" on its own.
4. For each stale item, determine severity:
   - CRITICAL: actively misleading (wrong commands, wrong status, contradicting API usage across docs)
   - MEDIUM: outdated but not harmful (old dates, resolved TODOs)
   - LOW: minor drift (version bump, cosmetic)

Report format — one entry per stale finding:
- File: <file>
- Line: <line number>
- Claim: <what the doc says>
- Reality: <what's actually true>
- Severity: CRITICAL | MEDIUM | LOW
- Fix: <specific change>
```

### Agent 3: Content Placement Auditor

```
You are auditing documentation for misplaced content and structural issues.

Files to audit: <file list>
Project root: <path>

For every markdown file:
1. Read the file completely
2. Classify it dynamically into a category:
   Overview, Conventions, Setup, Workflow, Reference, Plan, Insight, Ideation, Config, Active Work
   (or create a new category if none fits)
3. Check: does ALL content in this file belong in this category?
   Signs of misplaced content:
   - Setup instructions in README (should be in SETUP.md)
   - Workflow/process docs in setup guides (should be in workflow/)
   - Architecture decisions scattered instead of consolidated
   - Tool configuration details in convention docs
   - Historical decisions in active work docs
4. Check for missing docs — based on what exists, are there gaps?
5. Check for orphaned docs — files nothing references and no obvious directory homes them
6. Assess overall structure — is the hierarchy clear? Are categories sensible?
7. Check formatting quality:
   - Heading hierarchy — no skipped levels (e.g., h1 → h3 with no h2)
   - Code blocks — all fenced blocks have a language tag
   - Tables — well-formed (consistent columns, alignment)
   - Empty sections — headings with no content beneath them
   - Inconsistent patterns — e.g., some lists use `-`, others use `*` in the same file

Report format:
- Classification table: file | category | line count | assessment (clean/issues)
- Misplaced content: file, lines, what's misplaced, where it should go, why
- Missing docs: what should exist, why it would help
- Orphaned docs: file, why it appears orphaned
- Formatting issues: file, line, what's wrong, fix
- Structure assessment: 2-3 sentences on overall doc organization quality
```

### Agent 4: Duplication & Contradiction Detector

```
You are auditing documentation for duplicated content across files.

Files to audit: <file list>
Project root: <path>

Read EVERY file completely. Then cross-reference for both duplication AND contradiction:

**Duplication** — same content in multiple places:
1. Same data in multiple tables (e.g., phase status in README AND roadmap)
2. Same instructions repeated (e.g., install steps in README and SETUP)
3. Same rules stated differently (e.g., conventions in CLAUDE.md and a plan doc)
4. Same tech stack / version info in multiple places
5. Same commands documented in multiple files

**Contradiction** — conflicting content across files:
6. Code examples showing different usage patterns for the same API (e.g., one doc uses a function as a Jest matcher, another documents it returning a plain object)
7. Parameter tables or return types that disagree across docs
8. Configuration options documented in one file but absent or different in another
9. Type references (e.g., SomeType[]) that are never defined anywhere in the docs

For each finding, determine:
- Which doc is the source of truth? (The more detailed/specific one usually wins)
- Is the duplication intentional? (e.g., plan doc repeats rules as implementation checklist — acceptable)
- What's the drift risk? (Will these get out of sync? How often does this data change?)
- For contradictions: which version is correct, or are both wrong?

Report format — one entry per finding:
- Content: <what's duplicated or contradicted — brief description>
- Type: DUPLICATION | CONTRADICTION
- Location A: <file, lines> (source of truth)
- Location B: <file, lines> (duplicate or conflicting version)
- Intentional: YES (implementation checklist, summary vs detail) | NO
- Drift risk: HIGH (data changes often) | LOW (stable content)
- Fix: <specific recommendation — link, delete, reconcile, or accept>
```

## Phase 3: Aggregate (inline)

Once all 4 agents report back, aggregate their findings:

1. **Deduplicate** — if two agents flag the same issue (e.g., stale content hunter finds a broken path that link validator also caught), merge into one finding
2. **Assign severity** — Critical > Medium > Low, using the highest severity any agent assigned
3. **Group by file** — reorganize findings so all issues for one file are together
4. **Count** — total issues by severity

## Phase 4: Report

Present the unified report:

```
## Doc Audit Report

### Summary
- Files audited: X
- Issues found: X (Y critical, Z medium, W low)
- Doc structure: [from Agent 3's assessment]

### Critical Issues
[Merged findings — actively misleading, broken links, wrong commands]

### Medium Issues
[Merged findings — misplaced content, duplicated data, notably stale info]

### Low Issues
[Merged findings — formatting, minor staleness, nice-to-haves]

### Structure Assessment
[Agent 3's hierarchy evaluation]
```

For each issue, include:
- **File** — which doc
- **Line(s)** — where
- **Issue** — what's wrong
- **Fix** — specific proposed change

## Phase 5: Fix

**Wait for user approval before making any changes.**

Present proposed fixes grouped by file. For content moves (one doc to another), show both the removal and addition. For new docs, show proposed content.

After applying approved fixes:
- Verify no broken links were introduced
- Quick re-scan of modified files to confirm fixes are clean

## Principles

- **Read before judging.** Every agent reads files completely — not headers only.
- **Detect conventions, don't impose them.** Match whatever the project already does.
- **Source of truth matters.** Duplication fix isn't always "delete one copy" — sometimes it's "add a link."
- **Don't invent work.** Only flag issues that would actually help someone.
- **Structural moves need justification.** Explain WHY the new location is better.
