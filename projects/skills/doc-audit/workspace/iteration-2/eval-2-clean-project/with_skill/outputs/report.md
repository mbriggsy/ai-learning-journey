## Doc Audit Report

### Summary
- Files audited: 3
- Issues found: 1 (1 critical, 0 medium, 0 low)
- Doc structure: Clean and well-organized. README serves as entry point with cross-references to detailed docs in docs/. No misplaced content, no orphaned files, no missing docs for a library of this scope.

### Critical Issues

**1. Contradictory `toMatchBaseline` usage across README and API docs**

- **Files:** `README.md` (line 23) and `docs/api.md` (lines 30-38)
- **Issue:** README uses `toMatchBaseline()` as a Jest custom matcher via `expect(snapshot).toMatchBaseline()`. The API reference documents `GridSnapshot.toMatchBaseline(name?)` as a regular method that returns `{ match: boolean, diff?: DiffReport }`. These two patterns are mutually exclusive — a Jest matcher assertion does not return a value to the caller, while a method returning an object is not usable inside `expect().toX()` syntax without a custom Jest matcher wrapper.
- **Fix:** Decide which pattern is canonical. If `toMatchBaseline` is a Jest matcher, update the API docs to reflect that (returns void, throws on mismatch). If it is a method on `GridSnapshot` returning an object, update the README example to use it correctly, e.g.:
  ```javascript
  const result = snapshot.toMatchBaseline();
  expect(result.match).toBe(true);
  ```
  Alternatively, if both modes are supported (standalone method + Jest matcher integration), document both explicitly.

### Medium Issues

None.

### Low Issues

None.

### Structure Assessment

The documentation is well-organized with a clear three-file hierarchy: README.md as the entry point and overview, docs/api.md as the complete API reference, and docs/how-it-works.md as the technical explainer. Cross-references between files are correct and bidirectional (README links to both docs, api.md links back to README). Content is appropriately placed — no setup instructions leaked into reference docs, no reference material crammed into the overview. For a library of this scope, the structure is lean and sufficient.
