# Documentation Audit Report -- TaskFlow

**Project**: TaskFlow (node-app fixture)
**Date**: 2026-04-08
**Scope**: All markdown documentation in the project root and `docs/` directory

---

## Summary

The project has 4 markdown files: `README.md`, `docs/architecture.md`, `docs/setup.md`, and `docs/deployment.md`. The documentation has significant issues: **6 out of 9 internal links are broken**, there is a **Node.js version contradiction** between architecture.md and every other source, **substantial content duplication** between README.md and setup.md, and **one doc (setup.md) is orphaned** with no link pointing to it.

---

## Issues Found

### CRITICAL: Broken Links (6 of 9 internal links are broken)

| # | Source | Broken Link | Expected Target |
|---|--------|------------|-----------------|
| 1 | README.md:34 | `.env.example` | `.env.example` file in project root -- does not exist |
| 2 | README.md:47 | `docs/api-reference.md` | API reference doc -- does not exist |
| 3 | README.md:70 | `docs/auth.md` | Authentication configuration doc -- does not exist |
| 4 | README.md:78 | `CONTRIBUTING.md` | Contributing guidelines -- does not exist |
| 5 | docs/architecture.md:38 | `schema.md` | Database schema doc (`docs/schema.md`) -- does not exist |
| 6 | docs/architecture.md:51 | `websocket.md` | WebSocket protocol doc (`docs/websocket.md`) -- does not exist |

**Impact**: Readers following these links hit dead ends. Five missing doc files suggest either planned docs that were never written or docs that were deleted without updating references.

### CRITICAL: Node.js Version Contradiction

- **docs/architecture.md line 19**: States "Node.js 16.x (LTS)" under Tech Stack
- **package.json**: Declares `"engines": { "node": ">=18.0.0" }`
- **README.md line 16**: States "Node.js 18.x or higher"
- **docs/setup.md line 5**: States "Node.js 18.x or higher"

Architecture.md is the outlier. Three sources agree on 18.x; architecture.md says 16.x. This will mislead anyone who reads architecture.md first and sets up Node 16, only to hit engine compatibility failures.

### HIGH: Content Duplication Between README.md and docs/setup.md

The following content is duplicated nearly verbatim between the two files:

1. **Prerequisites** (Node.js 18.x, PostgreSQL 14+, Redis) -- README lines 14-18, setup.md lines 4-7
2. **Installation/clone steps** (git clone, npm install, cp .env, migrate, dev) -- README lines 22-30, setup.md lines 10-18
3. **Database setup** (createdb + migrate) -- README lines 53-58, setup.md lines 22-30
4. **Redis setup** -- README lines 62-65, setup.md lines 39-43

**Impact**: Two sources of truth create drift risk. When one is updated and the other isn't, they contradict. README should link to setup.md for detailed setup rather than duplicating it.

### HIGH: Orphaned Document -- docs/setup.md

`docs/setup.md` is not linked from any other document. There is no path for a reader to discover it through navigation. README.md duplicates its content instead of linking to it, making setup.md essentially dead documentation.

### MEDIUM: Confusing API Reference Link

README.md line 47 says:
> API documentation is available at [docs/api-reference.md](docs/api-reference.md) when running locally.

This phrasing implies the file is dynamically generated when the server runs, but it is linked as a static markdown path. The file does not exist either way. If API docs are auto-generated (e.g., Swagger), the link should point to the running endpoint (e.g., `http://localhost:3000/api-docs`), not a markdown file.

### MEDIUM: Stale "Not Yet Configured" Note

`docs/deployment.md` line 31 states:
> Metrics: Prometheus endpoint at `/metrics` (not yet configured)

This reads as a to-do item frozen in time. Without a date or tracking reference, there is no way to know if this is still planned, abandoned, or already done. Documentation should reflect current state, not aspirational state.

### LOW: Undocumented npm Scripts

`package.json` defines these scripts that are not mentioned in any documentation:

- `lint` (`eslint src/`) -- not referenced anywhere
- `seed` -- referenced only in setup.md (which is orphaned), not in README

### LOW: MVC vs. Layered Architecture Inconsistency

- README.md line 45: "The app follows a standard MVC pattern"
- docs/architecture.md describes controllers + services + models, which is a **service-layer architecture**, not strict MVC (MVC does not have a service layer between controllers and models)

Minor, but could confuse developers familiar with the distinction.

### LOW: Missing Documentation Index

The `docs/` folder has no index or table of contents. With 3 docs (and 5 more referenced but missing), there is no map of available documentation. A `docs/README.md` or a docs section in the main README listing all available docs would help.

---

## Link Inventory (Complete)

| Source | Target | Status |
|--------|--------|--------|
| README.md | `.env.example` | BROKEN -- file missing |
| README.md | `docs/architecture.md` | OK |
| README.md | `docs/api-reference.md` | BROKEN -- file missing |
| README.md | `docs/auth.md` | BROKEN -- file missing |
| README.md | `docs/deployment.md` | OK |
| README.md | `CONTRIBUTING.md` | BROKEN -- file missing |
| docs/deployment.md | `../README.md#environment-variables` | OK (file exists, heading anchor valid) |
| docs/architecture.md | `schema.md` | BROKEN -- file missing |
| docs/architecture.md | `websocket.md` | BROKEN -- file missing |

---

## Document-by-Document Summary

### README.md
- **Role**: Project entry point and overview
- **Issues**: 4 broken links, duplicates setup.md content, does not link to setup.md, MVC terminology mismatch
- **Severity**: High -- this is the first file most readers see

### docs/architecture.md
- **Role**: Technical architecture overview
- **Issues**: Node.js version contradiction (says 16.x, should be 18.x), 2 broken links (schema.md, websocket.md)
- **Severity**: Critical -- version mismatch causes real setup failures

### docs/setup.md
- **Role**: Developer setup guide
- **Issues**: Orphaned (no inbound links), content duplicated in README
- **Severity**: High -- effectively invisible to readers

### docs/deployment.md
- **Role**: Production deployment guide
- **Issues**: Stale "not yet configured" note for Prometheus metrics
- **Severity**: Low -- the least problematic doc

---

## Recommendations (Priority Order)

1. **Fix the Node.js version in architecture.md** -- change "16.x" to "18.x" to match package.json and all other docs
2. **Create or remove broken link targets** -- either write the 5 missing docs (api-reference, auth, schema, websocket, CONTRIBUTING) and create the .env.example file, or remove the dead links
3. **De-duplicate README and setup.md** -- keep detailed setup instructions in setup.md, replace README duplicated sections with a link to setup.md
4. **Link to setup.md from README** -- add it to the Architecture section or create a Documentation section
5. **Clarify the API reference link** -- if auto-generated, link to the endpoint; if static, write the file
6. **Resolve the Prometheus metrics status** -- either mark it as a known gap with a tracking issue, or remove the aspirational note
7. **Document the lint script** -- add a linting section to setup.md or README
8. **Add a docs index** -- list available documentation in README or a docs/README.md
