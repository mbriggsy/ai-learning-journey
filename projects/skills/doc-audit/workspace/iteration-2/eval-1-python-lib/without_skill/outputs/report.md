# DataPipe Documentation Audit Report

**Audit date**: 2026-04-08
**Project**: DataPipe (python-lib fixture)
**Files audited**: 8 markdown files + pyproject.toml
**Source code**: src/ directory is empty (no implementation exists)

---

## Summary

The DataPipe documentation has significant issues across three categories: **contradictions** between docs and the actual project configuration, **broken links** to files that do not exist, and **stale content** that has not been updated as the project evolved. The most critical problem is a three-way contradiction on the Pydantic version -- the single most important dependency in the project.

**Issue counts**: 3 contradictions, 3 broken links, 4 non-linked references, 3 missing docs, 3 instances of duplicated content, 2 stale items, 4 undocumented features.

---

## Critical: Contradictions

### C-1: Pydantic Version -- Three-Way Conflict

| Source | Claims |
|--------|--------|
| README.md (line 61) | Pydantic v1 |
| docs/roadmap.md (lines 9, 46) | Pydantic v1 |
| docs/architecture/design-decisions.md (line 7) | Pydantic v1 |
| docs/architecture/overview.md (line 53) | Pydantic v2 |
| pyproject.toml (line 7) | pydantic>=2.0 |

The project requires Pydantic v2 per its dependency spec. Three documents still say v1. One document (overview.md) correctly says v2. The design decisions document (DD-001) explicitly says v1 -- it was never updated when the migration happened.

**Impact**: A user reading design-decisions.md or the README would believe v1 APIs are in use. Code written against Pydantic v1 patterns would break.

### C-2: Python Version Requirement

| Source | Claims |
|--------|--------|
| README.md (line 60) | Python 3.10+ |
| docs/guides/getting-started.md (line 11) | Python 3.10 or higher |
| docs/architecture/overview.md (line 52) | Python 3.10+ |
| docs/roadmap.md (line 45) | Python 3.10+ |
| pyproject.toml (line 5) | >=3.11 |
| pyproject.toml (line 28, ruff target) | py311 |

Every single documentation file says 3.10+. The actual project requires 3.11+. A user on Python 3.10 would follow the docs, install, and hit a confusing failure.

### C-3: Base Class Name

| Source | Name Used |
|--------|-----------|
| docs/architecture/overview.md (line 41) | Transform |
| docs/guides/custom-transforms.md (line 5) | BaseTransform |
| docs/architecture/plugin-system.md (line 35) | BaseTransform |

The architecture overview calls it Transform, while the guides and plugin docs call it BaseTransform. Since there is no source code, it is unclear which is correct, but the docs disagree with each other.

---

## High: Broken Links

### B-1: API Reference -- docs/api-reference.md

**Linked from**: README.md line 46
**Status**: File does not exist anywhere in the project.

### B-2: Changelog -- CHANGELOG.md

**Linked from**: README.md line 47
**Status**: File does not exist.

### B-3: Contributing Guide -- CONTRIBUTING.md

**Linked from**: README.md line 68
**Status**: File does not exist.

---

## Medium: Non-Linked References

These are plain-text file paths used instead of proper markdown links. They will not be navigable in any markdown renderer:

| Location | Text |
|----------|------|
| docs/guides/getting-started.md line 46 | See the configuration guide at docs/guides/configuration.md |
| docs/guides/getting-started.md line 63 | see docs/guides/custom-transforms.md |
| docs/guides/custom-transforms.md line 76 | See docs/architecture/plugin-system.md |
| docs/guides/configuration.md line 71 | See the architecture doc at docs/architecture/design-decisions.md |

Additionally, these use paths relative to the project root rather than paths relative to the current file. Even if converted to links, they would be broken from their current location.

---

## Medium: Stale Content

### S-1: README Current Status vs. Actual Version

The README shows Phase 3 (Streaming) as the next milestone. The roadmap says Phase 3 targets v1.0.0. But pyproject.toml shows the current version is 0.8.2 -- well past v0.5.0 (Phase 2). The status checkboxes and version numbers do not tell a coherent story about where the project actually is.

### S-2: Design Decision DD-001 Never Updated

DD-001 explicitly documents choosing Pydantic v1. The project has since migrated to Pydantic v2 (per pyproject.toml). The decision document should either be updated or a new decision (DD-005) should record the v1-to-v2 migration and rationale.

---

## Medium: Duplicated Content

### D-1: Tech Stack Block (3 copies)

The following block appears with minor variations in three files:
- README.md lines 59-65
- docs/architecture/overview.md lines 52-57
- docs/roadmap.md lines 44-49

These already contradict each other on Pydantic version. Having three copies guarantees they will drift further over time.

### D-2: Installation Instructions (2 copies)

README.md and docs/guides/getting-started.md both contain pip install datapipe instructions. Minor divergence already exists: README mentions datapipe[dev], getting-started does not.

### D-3: YAML Pipeline Example (2 copies)

docs/guides/getting-started.md and docs/guides/configuration.md both show nearly identical YAML pipeline definitions. If the config schema changes, both need updating.

---

## Low: Structural Issues

### ST-1: No Docs Landing Page

There is no docs/index.md or docs/README.md. The only entry point to the docs is through the README link list. A docs landing page would improve navigation.

### ST-2: Roadmap is an Orphan

docs/roadmap.md is not linked from any other document. It is discoverable only by browsing the file tree.

### ST-3: No Backlinks from Architecture to Guides

Architecture docs link to each other but never link back to the guides. A user reading overview.md has no path to the getting-started guide.

### ST-4: Badge URLs Are Placeholders

README.md lines 5-6 contain badge URLs pointing to github.com/example/datapipe and pypi.org/project/datapipe/. These appear to be placeholder/example URLs.

---

## Low: Undocumented Features

### U-1: CLI (click dependency)

pyproject.toml includes click>=8.0 as a dependency, indicating a CLI exists or is planned. No documentation mentions a CLI.

### U-2: Ruff Linter

pyproject.toml configures ruff with target-version py311 and includes it in dev dependencies. No docs mention linting, code style, or ruff.

### U-3: Hatchling Build System

The project uses hatchling as its build backend. This is not mentioned in any documentation -- relevant for contributors.

### U-4: mypy Strict Mode

pyproject.toml enables mypy strict mode. The architecture overview mentions mypy but no guide covers type-checking setup or expectations for contributors.

---

## File-by-File Summary

| File | Issues |
|------|--------|
| README.md | 3 broken links (B-1, B-2, B-3), wrong Python version (C-2), wrong Pydantic version (C-1), placeholder badges (ST-4), stale status (S-1) |
| docs/guides/getting-started.md | Wrong Python version (C-2), 2 non-linked references, duplicated content (D-2, D-3) |
| docs/guides/configuration.md | 1 non-linked reference, duplicated example (D-3) |
| docs/guides/custom-transforms.md | 1 non-linked reference |
| docs/architecture/overview.md | Wrong base class name (C-3), duplicated Tech Stack (D-1) -- but correctly says Pydantic v2 |
| docs/architecture/design-decisions.md | Stale Pydantic v1 claim (S-2, C-1) |
| docs/architecture/plugin-system.md | Clean -- no issues found |
| docs/roadmap.md | Orphan page (ST-2), duplicated Tech Stack (D-1), wrong Pydantic version (C-1), wrong Python version (C-2) |

---

## Recommended Priority

1. Fix the Pydantic version contradiction -- decide v1 or v2 and update all 4 affected files
2. Fix the Python version -- align all docs with pyproject.toml >=3.11
3. Remove or create the 3 missing files (api-reference.md, CHANGELOG.md, CONTRIBUTING.md)
4. Convert plain-text paths to proper relative markdown links
5. Consolidate Tech Stack into one canonical location and reference it elsewhere
6. Update design-decisions.md DD-001 or add DD-005 for the Pydantic migration
7. Document the CLI (click dependency) or remove it from dependencies
8. Add a docs landing page and link to the roadmap
