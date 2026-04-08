---
name: doc-audit
description: Thorough documentation audit for any project. Finds all markdown docs, classifies them, checks for stale content, duplicated information, misplaced content, broken links, and formatting issues. Produces a severity-rated report and waits for approval before making changes.
user-invocable: true
argument-hint: "[path (defaults to project root)]"
context: fork
disable-model-invocation: true
---

Audit all markdown documentation in a project. Read everything, cross-reference everything, report what's wrong, fix what's approved.

## Phase 1: Discovery

Find all markdown files in the project, excluding generated/vendored content:

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

Count them and list them. This is the audit scope.

## Phase 2: Read and Classify

Read EVERY markdown file completely — not just headers, full content. For each file, dynamically classify it into one of these categories (or create a new one if none fits):

| Category | Examples | What belongs here |
|----------|----------|-------------------|
| **Overview** | README.md | Project summary, getting started links, tech stack |
| **Conventions** | CLAUDE.md | Rules, patterns, constraints for tools/developers |
| **Setup** | SETUP.md, INSTALL.md | Prerequisites, install steps, run commands, troubleshooting |
| **Workflow** | CODE-REVIEW.md, CONTRIBUTING.md | How work gets done — review process, tooling, CI/CD |
| **Reference** | RULES-REFERENCE.md, API.md | Canonical specs, rules, API docs |
| **Plan** | phase-1-foundation.md, roadmap.md | Implementation plans, roadmaps, task breakdowns |
| **Insight** | 001-some-lesson.md | Hard-won lessons, postmortems, decision records |
| **Ideation** | brainstorm.md | Design exploration, rationale, early decisions |
| **Config** | compound-engineering.local.md | Tool/plugin configuration files |
| **Active work** | TODO.md | Current task queue, known issues |

Classification drives the audit — a setup doc has different quality criteria than a plan doc.

## Phase 3: Audit

For each file, check these dimensions. Not every dimension applies to every doc type — use judgment.

### Content Placement
The most valuable check. Ask: "Does this content belong in THIS doc, or would a reader expect to find it somewhere else?"

Signs of misplaced content:
- Setup instructions in README (should be in SETUP.md)
- Workflow/process docs in setup guides (should be in workflow/)
- Architecture decisions scattered across multiple plan docs instead of one architecture doc
- Tool configuration instructions in convention docs
- Historical decisions in active work docs

### Stale Content
Check claims against reality:
- Do referenced files/paths actually exist? (`ls` or `find` to verify)
- Do commands still work? (check package.json scripts, Makefiles, etc.)
- Are version numbers current? (check package.json, Cargo.toml, etc.)
- Are status claims accurate? ("Phase 6 not yet started" when it's done)
- Are assumptions still valid? (tech decisions that changed during execution)

### Duplication
Find content that appears in multiple docs:
- Same data in two tables (e.g., phase status in README AND roadmap)
- Same instructions repeated (e.g., install steps in README and SETUP)
- Same rules stated differently (e.g., conventions in CLAUDE.md and a plan doc)

For each duplicate, determine: which doc is the source of truth? The other should link to it, not copy it.

### Link Validity
For every internal link (`[text](path)` or `[text](./path)`):
- Does the target file exist?
- If linking to a heading, does that heading exist in the target?

Report broken links with the source file, line, and target path.

### Formatting Consistency
- Heading hierarchy: H1 for title, H2 for major sections, H3 for subsections. No skipped levels.
- Table formatting: consistent column alignment
- Code blocks: language hints present (```bash, ```typescript, etc.)
- Consistent naming: kebab-case files, Title Case headings (or whatever the project uses — detect the convention, don't impose one)

### Missing Docs
Based on what exists, are there gaps?
- Is there a README? (every project needs one)
- Is there a setup guide? (if the project has dependencies)
- Are there docs referenced but not created?
- Are there doc categories with only one file that should have more?

Don't invent docs for the sake of it. Only flag genuine gaps that would help a new session or contributor.

### Orphaned Docs
Are there docs that nothing references?
- Not linked from README
- Not linked from any other doc
- Not in an obvious directory structure

Orphaned docs might be important but undiscoverable, or they might be stale and should be removed.

## Phase 4: Report

Present findings in this format, sorted by severity:

```
## Doc Audit Report

### Summary
- Files audited: X
- Issues found: X (Y critical, Z medium, W low)
- Doc structure: [description of hierarchy quality]

### Critical Issues
Content that is actively misleading, broken, or causing confusion.

### Medium Issues
Content in the wrong place, duplicated, or notably stale.

### Low Issues
Formatting inconsistencies, minor staleness, nice-to-haves.

### Structure Assessment
[Is the doc hierarchy clear? Are categories sensible? Any structural improvements?]
```

For each issue, include:
- **File** — which doc has the problem
- **Line(s)** — where in the file
- **Issue** — what's wrong
- **Fix** — specific proposed change (not vague "update this")

## Phase 5: Fix

**Wait for user approval before making any changes.**

Present the proposed fixes grouped by file. For moves (content from one doc to another), show both the removal and the addition. For new docs, show the proposed content.

Apply approved changes using Edit/Write tools. After all fixes:
- Verify no broken links were introduced by the changes
- Run a quick re-scan of modified files to confirm the fixes are clean

## Principles

- **Read before judging.** Read every file completely. Don't assess based on filenames or headers alone.
- **Detect conventions, don't impose them.** If the project uses Title Case headings, don't flag them as wrong because you prefer sentence case. Match whatever the project already does.
- **Source of truth matters.** When you find duplication, the fix isn't always "delete one copy." Sometimes the fix is "add a link from the duplicate to the source."
- **Don't invent work.** Only flag issues that would actually help someone. "This README could have a badges section" is not an issue. "This README says Phase 5 is next when all 6 phases are done" is.
- **Structural moves need justification.** When proposing to move content between docs, explain WHY the new location is better — what reader expectation does it serve?
