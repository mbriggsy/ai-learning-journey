## Doc Audit Report

### Summary
- Files audited: 8
- Issues found: 17 (7 critical, 4 medium, 6 low)
- Doc structure: Well-organized hierarchy (guides/ vs architecture/) but suffering from tech stack drift across 3 duplicated blocks and 3 broken links to non-existent files

### Critical Issues

**1. README.md — Broken link: API Reference**
- Line: 46
- Link: `[API Reference](docs/api-reference.md)`
- Issue: Target file `docs/api-reference.md` does not exist.
- Fix: Either create `docs/api-reference.md` or remove the link from the documentation list.

**2. README.md — Broken link: Changelog**
- Line: 47
- Link: `[Changelog](CHANGELOG.md)`
- Issue: Target file `CHANGELOG.md` does not exist.
- Fix: Either create `CHANGELOG.md` or remove the link.

**3. README.md — Broken link: Contributing**
- Line: 68
- Link: `[CONTRIBUTING.md](CONTRIBUTING.md)`
- Issue: Target file `CONTRIBUTING.md` does not exist.
- Fix: Either create `CONTRIBUTING.md` or remove the link and the "Contributing" section.

**4. README.md — Wrong Pydantic version**
- Line: 61
- Claim: "Schema validation: Pydantic v1"
- Reality: `pyproject.toml` requires `pydantic>=2.0`. Architecture overview.md also says Pydantic v2.
- Fix: Change "Pydantic v1" to "Pydantic v2".

**5. README.md / overview.md / roadmap.md / getting-started.md — Wrong Python version (4 locations)**
- Lines: README.md:60, overview.md:52, roadmap.md:45, getting-started.md:11
- Claim: "Python 3.10+" (all four files)
- Reality: `pyproject.toml` specifies `requires-python = ">=3.11"` and ruff targets `py311`.
- Fix: Change "Python 3.10+" to "Python 3.11+" in all four files. Change "Python 3.10 or higher" to "Python 3.11 or higher" in getting-started.md.

**6. docs/roadmap.md — Wrong Pydantic version (2 locations)**
- Lines: 9, 47
- Claim: "Pydantic v1" (Phase 1 completion item and tech stack)
- Reality: `pyproject.toml` requires `pydantic>=2.0`.
- Fix: Update both references from "Pydantic v1" to "Pydantic v2".

**7. docs/architecture/design-decisions.md — Stale decision record**
- Line: 7
- Claim: "Use Pydantic v1 for schema validation at pipeline stages."
- Reality: Project now uses Pydantic v2 (per pyproject.toml and overview.md).
- Fix: Update to "Pydantic v2" and add a note that the project migrated from v1 to v2, or mark the original decision as superseded.

### Medium Issues

**8. README.md — Phase status listed out of order**
- Lines: 51-57
- Issue: Phases listed as 3, 4, 1, 2 instead of sequential order. Completed phases are buried at the bottom.
- Fix: Reorder to 1, 2, 3, 4 (completed first, then in-progress/planned).

**9. docs/guides/custom-transforms.md — Prose file reference not linked**
- Line: 76
- Text: "See docs/architecture/plugin-system.md for the plugin spec."
- Issue: File path mentioned in prose but not a proper markdown link.
- Fix: Change to `See [Plugin System](../architecture/plugin-system.md) for the plugin spec.`

**10. docs/guides/configuration.md — Prose file reference not linked**
- Line: 71
- Text: "See the architecture doc at docs/architecture/design-decisions.md for why we chose Pydantic"
- Issue: File path in prose, not a proper markdown link. Also uses project-root-relative path instead of relative path.
- Fix: Change to `See [Design Decisions](../architecture/design-decisions.md) for why we chose Pydantic for configuration validation.`

**11. Tech stack duplicated in 3 files with drift**
- Locations: README.md:59-65, overview.md:52-57, roadmap.md:44-50
- Issue: The same tech stack block is repeated in three files. They have already drifted (Pydantic v1 vs v2, overview includes mypy but others don't). High drift risk — any dependency change must be updated in 3 places.
- Fix: Maintain the canonical tech stack in `docs/architecture/overview.md` only. In README.md and roadmap.md, replace with a brief mention and link to the overview.

### Low Issues

**12. docs/architecture/overview.md — Code block missing language tag**
- Line: 7
- Issue: Fenced code block uses bare triple-backtick without a language tag.
- Fix: Add `text` language tag.

**13. docs/architecture/overview.md — Code block missing language tag**
- Line: 61
- Issue: Same issue, second code block.
- Fix: Add `text` language tag.

**14. README.md — Tech stack missing click dependency**
- Line: 59-65
- Issue: `click>=8.0` is a core dependency in pyproject.toml but not mentioned in the tech stack.
- Fix: Add "CLI: click" to the tech stack (if the tech stack block is kept here).

**15. README.md / overview.md — Tech stack missing ruff**
- Lines: README.md:59-65, overview.md:52-57
- Issue: `ruff>=0.1.0` is a dev dependency in pyproject.toml but not listed in tech stack. Only mypy is mentioned in overview.md.
- Fix: Add "Linting: ruff" to the tech stack alongside mypy.

**16. Phase status duplicated across README and roadmap**
- Locations: README.md:51-57, roadmap.md:1-41
- Issue: Phase completion status is tracked in both files at different levels of detail.
- Drift risk: Medium (status changes are infrequent but high-stakes if missed).
- Fix: Acceptable duplication if intentional (summary vs. detail). Consider adding a note in README pointing to roadmap.md as the authoritative source.

**17. Installation instructions duplicated**
- Locations: README.md:19-21, getting-started.md:7-9
- Issue: `pip install datapipe` appears in both files.
- Drift risk: Low (stable content).
- Fix: Acceptable — standard practice to have install in both README and getting-started guide.

### Structure Assessment

The documentation is organized into a sensible hierarchy: `docs/guides/` for user-facing how-tos (getting started, configuration, custom transforms) and `docs/architecture/` for internal design (overview, decisions, plugin system). The roadmap sits at the docs root, which is appropriate.

The primary structural weakness is **tech stack drift**: the same block of technology information is maintained in three separate files and has already diverged (Pydantic v1 vs v2 across files). This should be consolidated into a single authoritative location.

The second weakness is **three broken links** in README.md pointing to files that were never created (api-reference.md, CHANGELOG.md, CONTRIBUTING.md). These create a poor first impression for anyone reading the README.

Content placement is otherwise clean — no setup instructions buried in architecture docs, no architectural decisions scattered through guides. Each file stays in its lane.
