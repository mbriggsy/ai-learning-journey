## Doc Audit Report

### Summary
- Files audited: 3 (README.md, docs/how-it-works.md, docs/api.md)
- Issues found: 1 (1 critical, 0 medium, 0 low)
- Internal links: 3 verified, 0 broken
- Doc structure: Clean and well-organized. README serves as entry point with installation, usage, and configuration. Detailed docs are properly separated into `docs/` with clear purpose separation (technical explanation vs API reference). Cross-linking is correct and bidirectional where appropriate.

### Critical Issues

#### 1. `toMatchBaseline()` API contradiction between README and API reference

- **Files:** README.md (line 23) and docs/api.md (lines 31-38)
- **Issue:** README shows `toMatchBaseline()` used as a Jest matcher assertion:
  ```javascript
  expect(snapshot).toMatchBaseline();
  ```
  But docs/api.md documents it as a regular method on `GridSnapshot` that returns a result object:
  ```
  Returns: { match: boolean, diff?: DiffReport }
  ```
  These are incompatible usage patterns. A Jest matcher is called on `expect()` and throws on failure (no return value used). A method returning `{ match, diff }` is called directly on the snapshot object and requires the caller to check the result. A user copying the README example would write completely different code than a user following the API reference.
- **Fix:** Decide which pattern is canonical and update the other file. If `toMatchBaseline()` is a regular method (per api.md), change README line 23 to:
  ```javascript
  const result = snapshot.toMatchBaseline();
  console.log(result.match); // true if layout matches baseline
  ```
  If it is a Jest matcher (per README), update api.md to document it as a matcher that throws on mismatch rather than returning a result object.

### Medium Issues

None.

### Low Issues

None.

### Structure Assessment

The documentation is well-structured for a small library:

- **README.md** (Overview) -- Appropriate entry point with install, usage, configuration, and pointers to detailed docs. No misplaced content.
- **docs/how-it-works.md** (Technical Reference) -- Focused explanation of internals. Clean heading hierarchy, no empty sections.
- **docs/api.md** (API Reference) -- Complete parameter tables, return types, and type definitions. Links back to README for config file docs (single source of truth pattern).

Heading hierarchy is clean across all files (no skipped levels). All code blocks have language tags. Tables are well-formed. No orphaned documents. No formatting inconsistencies. The only gap is the API contradiction noted above.
