# Documentation Audit Report — DataPipe (python-lib)

**Audited**: 2026-04-08
**Files audited**: 8 markdown files + pyproject.toml (ground truth)
**Verdict**: Documentation has significant accuracy issues. Multiple contradictions between docs and pyproject.toml, three broken links to nonexistent files, and duplicated content that has drifted out of sync.

---

## Summary of Findings

| Category | Count |
|----------|-------|
| Broken links (file does not exist) | 3 |
| Factual contradictions | 2 (each appears in multiple files) |
| Stale/non-clickable internal references | 3 |
| Duplicated content (drifted) | 1 pattern across 3 files |
| Structural/ordering issues | 1 |
| Undocumented features | 1 |
| Total issues | 11 |

---

## Issue 1: Python Version Contradiction (HIGH)

**Ground truth** (`pyproject.toml`):
```toml
requires-python = ">=3.11"
```
`[tool.ruff] target-version = "py311"` also confirms 3.11.

**Contradicting docs** (all say Python 3.10+):
- `README.md` line 60: `Python 3.10+`
- `docs/guides/getting-started.md` line 11: `Python 3.10 or higher`
- `docs/architecture/overview.md` line 52: `Python 3.10+`
- `docs/roadmap.md` line 45: `Python 3.10+`

**Impact**: Users on Python 3.10 will attempt to install and hit version errors. Four files need updating.

---

## Issue 2: Pydantic Version Contradiction (HIGH)

**Ground truth** (`pyproject.toml`):
```toml
"pydantic>=2.0"
```

**Docs claiming Pydantic v1**:
- `README.md` line 61: `Pydantic v1`
- `docs/architecture/design-decisions.md` line 7 (DD-001): `Use Pydantic v1 for schema validation`
- `docs/roadmap.md` line 9 (Phase 1): `Schema validation with Pydantic v1`
- `docs/roadmap.md` line 46: `Pydantic v1`

**Docs claiming Pydantic v2**:
- `docs/architecture/overview.md` line 37: `Pydantic v2`

**Impact**: This is a material contradiction. Pydantic v1 and v2 have different APIs (v2 was a breaking change). Users writing custom transforms or schemas will follow the wrong API if they read the wrong doc. The architecture overview was updated to v2 but the other files were not.

---

## Issue 3: Broken Link — `docs/api-reference.md` (HIGH)

**Location**: `README.md` line 46
```markdown
- [API Reference](docs/api-reference.md)
```

**Problem**: The file `docs/api-reference.md` does not exist. This is a dead link in the project's main documentation index.

---

## Issue 4: Broken Link — `CHANGELOG.md` (MEDIUM)

**Location**: `README.md` line 47
```markdown
- [Changelog](CHANGELOG.md)
```

**Problem**: The file `CHANGELOG.md` does not exist in the project root.

---

## Issue 5: Broken Link — `CONTRIBUTING.md` (MEDIUM)

**Location**: `README.md` line 68
```markdown
See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.
```

**Problem**: The file `CONTRIBUTING.md` does not exist in the project root.

---

## Issue 6: Non-Clickable Internal References (LOW)

Three docs reference other files using project-root-relative paths in prose text instead of proper relative markdown links:

1. **`docs/guides/getting-started.md` line 46**:
   > See the configuration guide at docs/guides/configuration.md for details.

   Should be a clickable link like `[configuration guide](configuration.md)`.

2. **`docs/guides/getting-started.md` line 63**:
   > For custom transforms, see docs/guides/custom-transforms.md.

   Should be `[custom transforms](custom-transforms.md)`.

3. **`docs/guides/configuration.md` line 71**:
   > See the architecture doc at docs/architecture/design-decisions.md for why we chose Pydantic for configuration validation.

   Should be `[design decisions](../architecture/design-decisions.md)`.

**Note**: The "Next Steps" section at the bottom of `getting-started.md` (lines 79-81) does use proper relative links, making the inconsistency within the same file even more apparent.

---

## Issue 7: Duplicated "Tech Stack" Section (MEDIUM)

The "Tech Stack" block appears in three separate files:
1. `README.md` lines 59-65
2. `docs/architecture/overview.md` lines 51-57
3. `docs/roadmap.md` lines 44-49

These copies have already drifted apart: the architecture overview says Pydantic v2, while the README and roadmap say Pydantic v1. The architecture overview also lists mypy (strict mode) which the other two do not mention. Having the same information in three places guarantees future drift.

---

## Issue 8: Roadmap Checklist Order in README (LOW)

**Location**: `README.md` lines 53-57
```markdown
- [ ] Phase 3: Streaming support for large datasets
- [ ] Phase 4: Distributed execution via Dask
- [x] Phase 1: Core pipeline engine
- [x] Phase 2: Plugin system and built-in transforms
```

Phases are listed out of numerical order (3, 4, 1, 2). This appears intentional to show incomplete items first, but it reads oddly. Conventional ordering would be 1, 2, 3, 4, with completed items naturally appearing first.

---

## Issue 9: Undocumented CLI Dependency (MEDIUM)

**Ground truth** (`pyproject.toml`):
```toml
dependencies = [
    "pydantic>=2.0",
    "pyyaml>=6.0",
    "click>=8.0",
]
```

`click>=8.0` is a core dependency (not a dev dependency), indicating DataPipe has a CLI interface. However, no documentation anywhere mentions a CLI. The README, getting-started guide, and architecture overview all describe only the Python API and YAML configuration. This is either:
- An undocumented feature (the CLI exists but has no docs), or
- A stale dependency (click was added for a planned CLI that has not been built yet)

Either way, the docs are incomplete.

---

## Issue 10: Version Not Mentioned in Docs (LOW)

`pyproject.toml` shows `version = "0.8.2"`, but this version number appears nowhere in the documentation. The roadmap mentions `v0.1.0` (Phase 1) and `v0.5.0` (Phase 2) but does not mention the current version. Users have no way to know what version the docs correspond to without checking pyproject.toml directly.

---

## Issue 11: Configuration Guide Pydantic Reference (LOW)

**Location**: `docs/guides/configuration.md` line 69
> Configuration is validated at load time using Pydantic.

This is vague about which Pydantic version, which matters given the v1/v2 contradiction elsewhere. The design decisions doc (DD-001) referenced on line 71 says Pydantic v1, but pyproject.toml requires v2.

---

## Recommendations (Priority Order)

1. **Resolve the Pydantic version contradiction.** Determine whether the project actually uses v1 or v2, update all 4-5 affected files to match pyproject.toml.
2. **Fix the Python version requirement** in all 4 docs to say 3.11+ (matching pyproject.toml and ruff config).
3. **Create or remove broken-linked files**: Either create `docs/api-reference.md`, `CHANGELOG.md`, and `CONTRIBUTING.md`, or remove the links from README.md.
4. **Consolidate the Tech Stack section** into a single source of truth (architecture overview) and link to it from README and roadmap, eliminating the duplication.
5. **Document the CLI** (if it exists) or remove the click dependency.
6. **Convert prose file references** to proper markdown links in getting-started.md and configuration.md.
