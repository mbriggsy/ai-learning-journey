## Doc Audit Report

### Summary
- Files audited: 8
- Issues found: 16 (7 critical, 5 medium, 4 low)
- Doc structure: Reasonable hierarchy (guides/, architecture/, roadmap) but suffers from tech stack duplication across 3 files with conflicting data, and 3 broken links to non-existent files.

### Critical Issues

**1. README.md, line 46 -- Broken link: API Reference**
- Link: `[API Reference](docs/api-reference.md)`
- Target `docs/api-reference.md` does not exist.
- Fix: Either create the file or remove the link from the documentation list.

**2. README.md, line 47 -- Broken link: Changelog**
- Link: `[Changelog](CHANGELOG.md)`
- Target `CHANGELOG.md` does not exist.
- Fix: Either create the file or remove the link.

**3. README.md, line 68 -- Broken link: Contributing**
- Link: `[CONTRIBUTING.md](CONTRIBUTING.md)`
- Target `CONTRIBUTING.md` does not exist.
- Fix: Either create the file or remove the link.

**4. README.md, line 60 -- Wrong Python version**
- Claim: "Python 3.10+"
- Reality: `pyproject.toml` specifies `requires-python = ">=3.11"`
- Fix: Change to "Python 3.11+"

**5. README.md, line 61 -- Wrong Pydantic version**
- Claim: "Pydantic v1"
- Reality: `pyproject.toml` specifies `pydantic>=2.0`
- Fix: Change to "Pydantic v2"

**6. docs/guides/getting-started.md, line 11 -- Wrong Python version**
- Claim: "You'll also need Python 3.10 or higher."
- Reality: `pyproject.toml` specifies `requires-python = ">=3.11"`
- Fix: Change to "Python 3.11 or higher."

**7. docs/architecture/overview.md, line 53 -- Wrong Python version**
- Claim: "Python 3.10+" in Tech Stack section
- Reality: `pyproject.toml` specifies `requires-python = ">=3.11"`
- Fix: Change to "Python 3.11+"

### Medium Issues

**8. docs/roadmap.md, lines 43-49 -- Stale Tech Stack**
- The Tech Stack section says "Python 3.10+" and "Pydantic v1".
- Reality: Python requirement is 3.11+ and Pydantic is v2 per `pyproject.toml`.
- Fix: Update both values, or remove the Tech Stack section entirely (it's duplicated from README and overview.md).

**9. docs/architecture/design-decisions.md, line 7 -- Stale Pydantic version in DD-001**
- Claim: "Use Pydantic v1 for schema validation"
- Reality: Project now uses Pydantic v2 per `pyproject.toml`.
- This is a historical decision record, so the original decision text could stay, but it needs an update note indicating the project has since migrated to v2.
- Fix: Add a note like "**Update**: Migrated to Pydantic v2 in v0.8.x" or update the decision text.

**10. Tech Stack duplicated across 3 files with conflicting data**
- Location A: README.md, lines 58-65 (says Pydantic v1)
- Location B: docs/architecture/overview.md, lines 50-57 (says Pydantic v2)
- Location C: docs/roadmap.md, lines 43-49 (says Pydantic v1)
- These three copies disagree on the Pydantic version, proving the drift risk.
- Fix: Keep Tech Stack in one canonical location (overview.md or README.md). Other files should link to it instead of duplicating.

**11. docs/guides/configuration.md, line 71 -- Prose path reference instead of relative link**
- Text: "See the architecture doc at docs/architecture/design-decisions.md"
- This uses a project-root-relative path in prose, not a working markdown link.
- Fix: Change to `See the [architecture doc](../architecture/design-decisions.md)` (proper relative link).

**12. docs/guides/custom-transforms.md, line 76 -- Prose path reference instead of relative link**
- Text: "See docs/architecture/plugin-system.md for the plugin spec."
- Same issue as above -- prose path, not a working link.
- Fix: Change to `See the [plugin spec](../architecture/plugin-system.md)`.

### Low Issues

**13. README.md, lines 49-57 -- Phase status duplicated from roadmap**
- README has a summary checklist of phases; roadmap.md has the full breakdown.
- Currently in sync, but if phases change, both files need updating.
- Drift risk: MEDIUM (phases don't change often, but status does).
- Fix: Consider linking to roadmap.md for current status instead of maintaining a separate checklist.

**14. Installation instructions duplicated**
- README.md (lines 17-27) and getting-started.md (lines 3-11) both have `pip install datapipe`.
- This is acceptable for a getting-started guide (users may land there directly), but creates minor drift risk.
- Fix: Acceptable as-is, but ensure both stay in sync.

**15. docs/roadmap.md, line 9 -- "Pydantic v1" in Phase 1 completed checklist**
- This refers to what was used when Phase 1 shipped. As a historical record it's technically accurate, but could confuse readers into thinking v1 is still in use.
- Fix: Add parenthetical "(since migrated to v2)" or leave as-is with the Tech Stack section corrected.

**16. overview.md contradicts README on Pydantic version**
- overview.md line 34 says "Pydantic v2" (for Stage schema validation).
- overview.md line 53 says "Pydantic v2" in Tech Stack.
- README.md line 61 says "Pydantic v1" in Tech Stack.
- overview.md is correct per pyproject.toml. README is wrong.
- Fix: Already covered by issue #5 (fix README). Noted here for completeness of the contradiction.

### Structure Assessment

The project has a sensible documentation hierarchy: `docs/guides/` for user-facing how-tos, `docs/architecture/` for internal design docs, and a top-level roadmap. The main structural weakness is the Tech Stack section being copy-pasted into 3 separate files (README.md, overview.md, roadmap.md) with conflicting data -- this is the textbook case for "single source of truth with links." The three broken links in README.md (API Reference, Changelog, Contributing) suggest docs were planned but never created, leaving dead navigation. Overall, the hierarchy is clean but needs deduplication and link hygiene.
