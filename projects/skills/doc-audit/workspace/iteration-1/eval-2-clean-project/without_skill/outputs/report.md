# Documentation Audit Report: Snapgrid

**Project:** Snapgrid (CSS grid snapshot testing utility)
**Audit date:** 2026-04-08
**Files audited:** 3 markdown files (README.md, docs/how-it-works.md, docs/api.md)

---

## Summary

The Snapgrid documentation is small (3 files), well-organized, and mostly consistent. No broken links were found. However, the audit identified several content inconsistencies and gaps that could confuse users, ranging from a contradictory API usage pattern in the README to undocumented configuration options.

**Findings by severity:**

| Severity | Count |
|----------|-------|
| High | 1 |
| Medium | 4 |
| Low | 3 |

---

## High Severity

### H1. `toMatchBaseline()` usage contradicts API docs

**Files:** README.md (line 23), docs/api.md (lines 30-38)

The README shows a Jest matcher pattern:

```javascript
expect(snapshot).toMatchBaseline();
```

But the API docs define `.toMatchBaseline()` as a regular method on the `GridSnapshot` object that returns `{ match: boolean, diff?: DiffReport }`. These are fundamentally different usage patterns. The Jest `expect()` pattern implies a custom matcher has been registered, but nothing in the docs explains how or whether that happens.

Either the README example is wrong (should be `snapshot.toMatchBaseline()`) or the API docs are incomplete (should document a Jest matcher integration).

---

## Medium Severity

### M1. Configuration options are fragmented and incomplete

**Files:** README.md (lines 28-41), docs/api.md (lines 9-15, 61-63)

The config file example in the README mentions options that are never documented in the API reference:

- `baselineDir` -- only appears in the config example, never explained
- `diffDir` -- only appears in the config example, never explained
- `viewports` (plural array) -- config uses an array of named viewports; API only documents singular `viewport`

Conversely, these API options have no equivalent in the config file example:

- `baseUrl` -- documented in API but absent from config file
- `waitForIdle` -- documented in API but absent from config file

The api.md Configuration section (line 63) just links back to the README, creating a circular reference where neither document fully covers all options.

### M2. How-it-works omits how pages are loaded

**File:** docs/how-it-works.md (line 10)

Step 2 of the capture process says "Navigate -- Load the page containing the grid container" but never explains the mechanism. The API documents a `baseUrl` option and the `selector` parameter, but how-it-works.md doesn't mention how the tool knows what page to load. Does it need a URL? A file path? Is the selector enough? This is a gap in the technical explanation.

### M3. No documentation of how `snapGrid` receives its page context

**Files:** README.md (lines 13-24), docs/api.md (lines 3-26)

The API signature is `snapGrid(selector, options?)` -- it takes a CSS selector and optional options. But neither the README usage example nor the API docs explain how the function knows which page to load. The `baseUrl` option in the API table hints at this, but the README example has no `baseUrl` and doesn't show any HTML file reference. A new user would not know how to point `snapGrid` at their actual page.

### M4. `DiffReport` references undocumented types

**File:** docs/api.md (lines 52-59)

The `DiffReport` table references `GridItem[]` and `ChangedItem[]` types, but neither type is defined anywhere in the documentation. A user consulting the API reference would not know the shape of these objects.

---

## Low Severity

### L1. `how-it-works.md` has no cross-references to other docs

**File:** docs/how-it-works.md

This file is self-contained with no links to the API reference or README. When it mentions the `waitForIdle` option (line 46), it doesn't link to the API docs where that option is formally specified. Adding a cross-reference would help users navigate.

### L2. No version mentioned in documentation

**Files:** All markdown files

The package.json declares version 1.2.0, but no documentation mentions version requirements, changelog, or what version the docs apply to. For a testing utility where behavior may change between versions, noting the applicable version in the docs would be helpful.

### L3. Only CommonJS syntax shown

**File:** README.md (lines 14, 31)

All code examples use `require()` / `module.exports` (CommonJS). The package.json has no `"type"` field, confirming CommonJS is the default. However, since the project uses TypeScript (`"build": "tsc"`), ESM import syntax (`import { snapGrid } from 'snapgrid'`) may also be supported but is never shown.

---

## Structural Assessment

### What works well

- **Clean heading hierarchy:** All three files follow proper H1 > H2 > H3 nesting with no skipped levels.
- **All internal links resolve:** README links to both doc files; api.md links back to README's Configuration section. No broken links.
- **Code blocks are language-tagged:** Every fenced code block specifies its language (bash, javascript, json).
- **Consistent naming:** "Snapgrid" (capital S) is used consistently in prose; `snapGrid` (camelCase) is used consistently for the function name; `snapgrid` (lowercase) for the package name.
- **API tables are well-formed:** All markdown tables have correct alignment and consistent formatting.
- **No duplicated content:** Each file covers a distinct concern (overview/setup, internals, API reference) with minimal overlap.

### Navigation and discoverability

The documentation has a simple hub-and-spoke structure:

```
README.md (hub)
  +-- docs/how-it-works.md (technical internals)
  +-- docs/api.md (API reference)
        +-- back to README.md#configuration
```

This works well for a small project. The only gap is that how-it-works.md is a dead-end with no outbound links.

---

## File-by-File Notes

### README.md (54 lines)
- Well-structured with standard sections (Installation, Usage, Configuration, links to docs, License)
- The usage example is concise and shows the core workflow
- The config example shows options (baselineDir, diffDir, viewports) that are never formally documented elsewhere

### docs/how-it-works.md (47 lines)
- Clear 5-step capture process explanation
- Good snapshot format example with realistic JSON
- Comparison algorithm (fast path / slow path) is well explained
- Limitations section is honest and useful
- No outbound links to other docs

### docs/api.md (64 lines)
- Thorough parameter tables for the main function
- GridSnapshot methods and DiffReport are documented
- References undocumented types (GridItem, ChangedItem)
- Configuration section is a one-line redirect back to README

---

## Recommendations (Priority Order)

1. **Fix the `toMatchBaseline()` contradiction** (H1) -- Either change the README example to `snapshot.toMatchBaseline()` or document the Jest matcher integration.
2. **Consolidate configuration documentation** (M1) -- Document all config file options in one place (api.md or a dedicated config section) and ensure the README example and API options are consistent.
3. **Explain page loading** (M2, M3) -- Add a clear explanation of how `snapGrid` loads the target page, connecting `baseUrl`, the selector, and the capture process.
4. **Document `GridItem` and `ChangedItem` types** (M4) -- Add type definitions to api.md.
5. **Add cross-references from how-it-works.md** (L1) -- Link to api.md when referencing options like `waitForIdle`.
