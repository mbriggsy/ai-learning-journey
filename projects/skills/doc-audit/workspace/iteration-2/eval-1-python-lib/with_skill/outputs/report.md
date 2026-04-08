# Doc Audit Report

## Summary

- **Files audited:** 8 markdown files + pyproject.toml (source of truth)
- **Issues found:** 16 (7 critical, 6 medium, 3 low)
- **Doc structure:** Well-organized hierarchy (architecture/, guides/, roadmap) but undermined by 3 broken links to non-existent docs and tech stack copy-pasted into 3 files with contradictory values.

---

## Critical Issues

### C1. Pydantic version wrong in 3 of 4 docs

- **Files:** README.md (line 61), docs/architecture/design-decisions.md (line 7), docs/roadmap.md (lines 9, 46)
- **Issue:** These docs say "Pydantic v1" but pyproject.toml declares pydantic>=2.0. Only docs/architecture/overview.md (line 53) correctly says "Pydantic v2". Actively misleading -- someone reading the README or design decisions would believe the project uses Pydantic v1 APIs.
- **Fix:** Change all references to "Pydantic v2" to match pyproject.toml. Update design-decisions.md DD-001 rationale to reflect v2 migration.

### C2. Python version wrong in all 4 docs

- **Files:** README.md (line 60), docs/architecture/overview.md (line 52), docs/roadmap.md (line 43), docs/guides/getting-started.md (line 11)
- **Issue:** All docs say "Python 3.10+" but pyproject.toml declares requires-python = ">=3.11" and ruff targets py311. Someone on Python 3.10 would install and fail.
- **Fix:** Change all "Python 3.10+" / "Python 3.10 or higher" to "Python 3.11+".

### C3. Broken link -- API Reference

- **File:** README.md (line 46)
- **Link:** [API Reference](docs/api-reference.md)
- **Issue:** docs/api-reference.md does not exist. Users clicking this get a 404.
- **Fix:** Either create the file or remove the link from the documentation index.

### C4. Broken link -- CHANGELOG.md

- **File:** README.md (line 47)
- **Link:** [Changelog](CHANGELOG.md)
- **Issue:** CHANGELOG.md does not exist in the project root.
- **Fix:** Either create the file or remove the link.

### C5. Broken link -- CONTRIBUTING.md

- **File:** README.md (line 68)
- **Link:** [CONTRIBUTING.md](CONTRIBUTING.md)
- **Issue:** CONTRIBUTING.md does not exist in the project root.
- **Fix:** Either create the file or remove the link.

### C6. Transform base class name contradiction

- **File:** docs/architecture/overview.md (line 41)
- **Issue:** Overview describes the base class as "Transform" with method signature execute(data, params?). But docs/guides/custom-transforms.md (line 6) and docs/architecture/plugin-system.md (line 35) both import from datapipe.transforms.BaseTransform. The name Transform vs BaseTransform is a contradiction that would confuse anyone reading the architecture doc then trying to implement a transform.
- **Fix:** Change overview.md to reference BaseTransform consistently with the other docs.

### C7. Pydantic version contradiction between docs

- **Files:** docs/architecture/overview.md (line 53) says "Pydantic v2"; README.md (line 61), design-decisions.md (line 7), roadmap.md (line 46) all say "Pydantic v1"
- **Issue:** The docs actively contradict each other. A reader who consults the overview sees v2; a reader who checks the README sees v1. Most dangerous type of documentation error -- both versions look authoritative.
- **Fix:** Consolidate to "Pydantic v2" everywhere (overview.md is correct per pyproject.toml). Define the tech stack in ONE canonical location and link from elsewhere.

---

## Medium Issues

### M1. Tech stack duplicated in 3 files

- **Locations:** README.md (lines 59-65), docs/architecture/overview.md (lines 52-57), docs/roadmap.md (lines 43-49)
- **Issue:** The same tech stack table appears in three places with slight variations (overview includes mypy/ruff, others do not; Pydantic version differs). High drift risk -- any change to the stack requires updating three files.
- **Fix:** Pick one canonical location (overview.md is most detailed). In README and roadmap, replace with a one-liner linking to the overview. Or keep a brief version in README and remove from roadmap entirely.

### M2. Installation instructions duplicated

- **Locations:** README.md (lines 17-27), docs/guides/getting-started.md (lines 4-11)
- **Issue:** Both explain pip install datapipe. Low drift risk (install command is stable), but the Python version requirement is already wrong in both, demonstrating the hazard.
- **Fix:** README quick install is fine to keep (convention). Getting-started should be the detailed version. Ensure they stay in sync, especially the Python version floor.

### M3. Phase status duplicated

- **Locations:** README.md (lines 51-57), docs/roadmap.md (lines 1-41)
- **Issue:** README has a checkbox summary; roadmap has the detailed breakdown. Intentional duplication (summary vs. detail), but drift risk is medium -- when Phase 3 completes, both need updating.
- **Fix:** Acceptable as-is, but consider having README link to roadmap instead of maintaining a separate checklist.

### M4. Prose reference not formatted as link

- **File:** docs/guides/custom-transforms.md (line 76)
- **Issue:** "See docs/architecture/plugin-system.md for the plugin spec." -- prose reference to a file path, not a clickable markdown link.
- **Fix:** Change to: See [Plugin System](../architecture/plugin-system.md) for the plugin spec.

### M5. Prose reference not formatted as link

- **File:** docs/guides/configuration.md (line 71)
- **Issue:** "See the architecture doc at docs/architecture/design-decisions.md" -- prose file path, not a clickable link.
- **Fix:** Change to: See [Design Decisions](../architecture/design-decisions.md) for why we chose Pydantic.

### M6. README missing ruff and click from tech stack

- **File:** README.md (lines 59-65)
- **Issue:** pyproject.toml includes click>=8.0 as a core dependency and ruff>=0.1.0 as a dev dependency. Neither appears in README tech stack. Overview.md mentions mypy but not click or ruff either.
- **Fix:** Add click (CLI framework) and ruff (linter) to the tech stack, or document them in the appropriate section.

---

## Low Issues

### L1. Current version not documented anywhere

- **Issue:** pyproject.toml shows version 0.8.2, but no markdown doc mentions this. Roadmap mentions v0.1.0 (Phase 1), v0.5.0 (Phase 2), and target v1.0.0 (Phase 3), but never the current version.
- **Fix:** Consider adding current version to README or linking to PyPI badge (which already exists but shows the published version, not the repo version).

### L2. Roadmap phase order in README is non-sequential

- **File:** README.md (lines 51-57)
- **Issue:** Phases are listed 3, 4, 1, 2 instead of 1, 2, 3, 4. The completed items are at the bottom. While this puts active work first, it reads oddly.
- **Fix:** Reorder to 1, 2, 3, 4 for consistency with roadmap.md, or add a note explaining the ordering.

### L3. Empty src/ directory

- **Issue:** The src/ directory exists but contains no files. If this is a fixture project this may be intentional, but if it is meant to contain the actual library code, something is missing.
- **Fix:** Either populate with source code or remove the empty directory.

---

## Structure Assessment

The documentation hierarchy is well-designed: docs/architecture/ for design-level docs (overview, decisions, plugin system), docs/guides/ for user-facing tutorials (getting started, configuration, custom transforms), and docs/roadmap.md for project planning. README serves as the entry point with a documentation index.

The main structural weaknesses are: (1) three broken links to docs that were never created (API reference, changelog, contributing guide), suggesting the doc index was written aspirationally; (2) the tech stack being copy-pasted into three files instead of defined once and referenced, which has already caused the Pydantic v1/v2 contradiction; and (3) two prose file references that should be proper markdown links.

Overall, the content is well-written and the organization is sound, but the factual accuracy issues (wrong Python version everywhere, Pydantic version contradictions) are serious and would mislead users.
