# Documentation Audit Report — TaskFlow (node-app)

## Summary

Audited 4 markdown files in the TaskFlow project. The documentation has significant issues: 6 broken links to non-existent files, 1 version contradiction between files, substantial content duplication between README and setup guide, and an orphaned document with no inbound links.

**Files audited:**
| File | Lines |
|------|-------|
| `README.md` | 83 |
| `docs/setup.md` | 70 |
| `docs/architecture.md` | 56 |
| `docs/deployment.md` | 41 |

---

## Issues

### CRITICAL: Broken Links (6 instances)

Links that point to files that do not exist in the project.

| Source File | Link | Target | Status |
|---|---|---|---|
| `README.md` (L34) | `[.env.example](.env.example)` | `.env.example` | Missing |
| `README.md` (L47) | `[docs/api-reference.md](docs/api-reference.md)` | `docs/api-reference.md` | Missing |
| `README.md` (L70) | `[docs/auth.md](docs/auth.md)` | `docs/auth.md` | Missing |
| `README.md` (L78) | `[CONTRIBUTING.md](CONTRIBUTING.md)` | `CONTRIBUTING.md` | Missing |
| `docs/architecture.md` (L38) | `[schema.md](schema.md)` | `docs/schema.md` | Missing |
| `docs/architecture.md` (L50) | `[websocket.md](websocket.md)` | `docs/websocket.md` | Missing |

### CRITICAL: Version Contradiction

- **README.md (L16)** states: "Node.js 18.x or higher"
- **docs/architecture.md (L19)** states: "Node.js 16.x (LTS)"
- **package.json `engines`** field requires: `>=18.0.0`

The architecture doc's claim of "Node.js 16.x" contradicts both README and package.json. The architecture doc is stale.

### MODERATE: Content Duplication Between README.md and docs/setup.md

The following sections are duplicated nearly verbatim across both files:

1. **Prerequisites** -- identical list (Node.js 18.x, PostgreSQL 14+, Redis) appears in README.md (L15-18) and setup.md (L4-7).
2. **Installation steps** -- the clone/install/migrate/dev sequence appears in README.md (L22-30) and setup.md (L11-18).
3. **Database setup** -- `createdb taskflow_dev` + `npm run migrate` appears in README.md (L53-58) and setup.md (L22-30).
4. **Redis setup** -- Redis on port 6379 mentioned in README.md (L60-65) and setup.md (L38-44).

This creates a maintenance burden: updates must be made in two places, increasing the risk of drift. The README should link to `docs/setup.md` for details rather than duplicating it.

### MODERATE: Orphaned Document (docs/setup.md)

`docs/setup.md` is never linked from README.md or any other documentation file. Users have no navigation path to discover it. The README duplicates most of its content instead of linking to it.

### MINOR: Stale / Aspirational Content

- **docs/deployment.md (L31)**: Prometheus metrics endpoint described as "not yet configured." This is aspirational content presented alongside production instructions, which could confuse readers.
- **docs/architecture.md (L55)**: References `src/middleware/errorHandler.js` -- no source code exists in the repo to validate this path.
- **docs/deployment.md (L24)**: References `.github/workflows/ci.yml` -- file does not exist.
- **docs/deployment.md (L7-13)**: References Docker Compose usage but no `docker-compose.yml` exists.
- **docs/setup.md (L53)**: References `.vscode/settings.json` -- file does not exist.

Note: The absence of source code files (src/, .github/, docker-compose.yml, etc.) may be because this is a documentation-only fixture. However, the docs reference these files as if they exist, so they are flagged.

### MINOR: Implicit File References Without Links

Several files are mentioned by path in prose or code blocks but are not hyperlinked, making them harder to navigate:

- `src/middleware/errorHandler.js` in architecture.md (L55)
- `.github/workflows/ci.yml` in deployment.md (L24)
- `.vscode/settings.json` in setup.md (L53)
- `docker-compose.yml` implied by `docker-compose up -d` in deployment.md (L10)

### MINOR: README Links to Architecture and Deployment but Not Setup

README.md links to `docs/architecture.md` (L45) and `docs/deployment.md` (L74) but does not link to `docs/setup.md`. The setup guide is the most essential doc for new contributors but is unreachable from the entry point.

---

## Structural Overview

```
README.md
├── docs/architecture.md  (linked)
│   ├── docs/schema.md     (BROKEN)
│   └── docs/websocket.md  (BROKEN)
├── docs/api-reference.md  (BROKEN)
├── docs/auth.md           (BROKEN)
├── docs/deployment.md     (linked)
│   └── ../README.md#environment-variables  (valid anchor)
├── CONTRIBUTING.md        (BROKEN)
└── .env.example           (BROKEN)

docs/setup.md              (ORPHANED -- no inbound links)
```

---

## Recommendations

1. **Create or remove broken links.** Either create the 6 missing files (`api-reference.md`, `auth.md`, `schema.md`, `websocket.md`, `CONTRIBUTING.md`, `.env.example`) or remove the dead links. Dead links erode trust in documentation.

2. **Fix the Node.js version in architecture.md.** Change "Node.js 16.x (LTS)" to "Node.js 18.x" to match README and package.json.

3. **Eliminate duplication between README and setup.md.** Keep a brief Quick Start in README (3-4 lines max) and link to `docs/setup.md` for the full setup guide. This gives one source of truth for setup instructions.

4. **Link to docs/setup.md from README.** Add a prominent link in the Quick Start or a dedicated "Development Setup" section that points to `docs/setup.md`.

5. **Mark aspirational content clearly.** The Prometheus metrics note in deployment.md should be visually distinct (e.g., a callout/admonition) or removed until the feature is implemented.

6. **Add a docs index.** Consider a `docs/README.md` or a "Documentation" section in the root README that lists all available docs with one-line descriptions, so nothing is orphaned.
