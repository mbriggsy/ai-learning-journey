# Documentation Audit Report: DataPipe

**Project**: DataPipe (Python data transformation pipeline library)
**Audit date**: 2026-04-08
**Files audited**: 8 markdown files + pyproject.toml (source of truth)

---

## Summary

The documentation has **19 distinct issues** across 4 categories: broken links, factual contradictions between docs and source of truth, structural problems, and staleness. The most critical problem is a **three-way Pydantic version contradiction** -- pyproject.toml requires v2, some docs say v1, and the architecture overview says v2 -- meaning at least two of the three surfaces are wrong.

---

## Critical Issues

### C-1: Pydantic version contradiction (3-way conflict)

The project has three different claims about which Pydantic version is used:

| Source | Claims |
|--------|--------|
| `pyproject.toml` (source of truth) | `pydantic>=2.0` |
| `README.md` line 61 | Pydantic v1 |
| `docs/roadmap.md` lines 9, 46 | Pydantic v1 |
| `docs/architecture/design-decisions.md` line 7 | Pydantic v1 |
| `docs/architecture/overview.md` lines 35, 53 | Pydantic v2 |

Only `overview.md` agrees with `pyproject.toml`. The README, roadmap, and design-decisions doc all say v1 -- which directly contradicts the actual dependency. This is dangerous because Pydantic v1 and v2 have incompatible APIs.

### C-2: Python version requirement contradiction

| Source | Claims |
|--------|--------|
| `pyproject.toml` (source of truth) | `requires-python = ">=3.11"` |
| `README.md` line 60 | Python 3.10+ |
| `docs/guides/getting-started.md` line 11 | Python 3.10 or higher |
| `docs/architecture/overview.md` line 52 | Python 3.10+ |
| `docs/roadmap.md` line 45 | Python 3.10+ |
| `pyproject.toml` ruff config | `target-version = "py311"` |

Every single markdown file says 3.10+. The actual requirement is 3.11+. Users following the docs could set up Python 3.10 and hit failures.

---

## Broken Links

### B-1: `docs/api-reference.md` -- file does not exist

`README.md` line 46 links to `docs/api-reference.md`. This file does not exist anywhere in the project.

### B-2: `CHANGELOG.md` -- file does not exist

`README.md` line 47 links to `CHANGELOG.md`. This file does not exist.

### B-3: `CONTRIBUTING.md` -- file does not exist

`README.md` line 68 links to `CONTRIBUTING.md`. This file does not exist.

### B-4: Plain-text paths used instead of relative links (not navigable)

Several docs reference other docs using project-root-relative paths in plain text (not clickable markdown links). These don't work from the file's own location:

- `docs/guides/getting-started.md` line 46: `docs/guides/configuration.md` (plain text, should be `configuration.md` or a proper link)
- `docs/guides/getting-started.md` line 63: `docs/guides/custom-transforms.md` (plain text, should be `custom-transforms.md` or a proper link)
- `docs/guides/configuration.md` line 71: `docs/architecture/design-decisions.md` (plain text, should be `../architecture/design-decisions.md` or a proper link)
- `docs/guides/custom-transforms.md` line 76: `docs/architecture/plugin-system.md` (plain text, should be `../architecture/plugin-system.md` or a proper link)

---

## Staleness / Stale Content

### S-1: README "Current Status" is stale and misordered

`README.md` lines 51-57 list phases out of order (Phase 3, Phase 4, Phase 1, Phase 2). Phases 1 and 2 are listed after 3 and 4. The project version is 0.8.2, which is well past v0.5.0 (Phase 2 release per roadmap), yet the README doesn't reflect Phase 3's "in progress" status beyond a checkbox. The roadmap.md has better detail.

### S-2: Design decisions document records a decision that was already superseded

`docs/architecture/design-decisions.md` DD-001 says the decision was to use "Pydantic v1." If the project has migrated to Pydantic v2 (per pyproject.toml and overview.md), this ADR should be updated to record the migration decision, not still state v1 as the current choice.

### S-3: Roadmap tech stack says Pydantic v1

`docs/roadmap.md` line 46 still lists Pydantic v1 in its Tech Stack section, contradicting the actual dependency.

### S-4: Badge URLs use placeholder org

`README.md` lines 5-6 use `github.com/example/datapipe` -- a placeholder URL that will never resolve to a real CI badge or PyPI package.

---

## Structural Issues

### ST-1: Tech Stack section duplicated in 3 files with conflicting content

The "Tech Stack" section appears in three places:
1. `README.md` lines 58-65
2. `docs/architecture/overview.md` lines 50-57
3. `docs/roadmap.md` lines 43-49

These are not identical -- overview.md says Pydantic v2 and includes mypy; README.md and roadmap.md say Pydantic v1 and omit mypy. This is a maintenance burden and a contradiction source. Tech stack should live in one canonical location with others linking to it.

### ST-2: Undocumented dependency: `click`

`pyproject.toml` lists `click>=8.0` as a core dependency, implying a CLI interface exists. No documentation mentions a CLI, click, or any command-line usage. Either the dependency is vestigial or the CLI is undocumented.

### ST-3: Undocumented tools: `ruff`

`pyproject.toml` includes `ruff>=0.1.0` in dev dependencies with a `[tool.ruff]` config section. No documentation mentions ruff as a linting/formatting tool. The README tech stack lists only "pytest + hypothesis" for testing but omits linting tools entirely.

### ST-4: DAG configuration mentioned but never documented

`docs/architecture/overview.md` line 67 states: "Stages can also branch (fan-out) or merge (fan-in) using the DAG configuration." This feature is not documented anywhere -- no guide, no configuration reference, no examples. It is unclear if this feature exists or is aspirational.

### ST-5: No docs index or navigation page

The `docs/` directory has no `index.md` or top-level navigation file. The only way to discover docs is through the README links. If someone browses the `docs/` folder directly, there is no table of contents.

### ST-6: Getting-started.md Quick Example inconsistency with README

`README.md` line 36: `result = pipeline.run(input_data)` (passes `input_data` argument)
`docs/guides/getting-started.md` line 40: `result = pipeline.run()` (no arguments)

These show different API signatures for the same operation. One takes input data, the other does not.

---

## Issue Count by Severity

| Severity | Count |
|----------|-------|
| Critical (contradicts source of truth) | 2 |
| Broken links | 4 |
| Stale content | 4 |
| Structural | 6 |
| **Total** | **16 distinct issues (19 individual occurrences)** |

---

## Recommendations (Priority Order)

1. **Resolve the Pydantic version contradiction immediately.** Determine the actual version in use (pyproject.toml says v2), then update README.md, roadmap.md, and design-decisions.md to match.
2. **Fix the Python version requirement.** Update all docs from "3.10+" to "3.11+" to match pyproject.toml, or change pyproject.toml if 3.10 is genuinely supported.
3. **Create or remove the three broken-link targets.** Either create `docs/api-reference.md`, `CHANGELOG.md`, and `CONTRIBUTING.md`, or remove the links to them.
4. **Consolidate the Tech Stack section** to one canonical location (architecture/overview.md) and link from README and roadmap.
5. **Convert plain-text doc paths to proper relative markdown links** so they are navigable from each file's location.
6. **Document the CLI** (click dependency) or remove it from dependencies.
7. **Document or remove the DAG feature claim** in overview.md.
8. **Reconcile the `pipeline.run()` API** between README and getting-started guide.
