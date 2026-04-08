# Documentation Audit Report: TaskFlow

**Project**: TaskFlow (lightweight task management API)
**Audit date**: 2026-04-08
**Documents audited**: 4 markdown files

---

## Summary

The TaskFlow project has 4 markdown documents and 1 `package.json`. The documentation has significant issues: 7 broken internal links pointing to files that do not exist, 1 factual contradiction about the Node.js version, substantial content duplication between README.md and setup.md, and several references to project infrastructure (Docker, CI/CD, VS Code config) that does not exist in the repository.

---

## Issues by Category

### 1. Broken Links (7 total)

| Source File | Link Target | Status |
|---|---|---|
| README.md | `.env.example` | **Missing** -- file does not exist |
| README.md | `docs/api-reference.md` | **Missing** -- file does not exist |
| README.md | `docs/auth.md` | **Missing** -- file does not exist |
| README.md | `CONTRIBUTING.md` | **Missing** -- file does not exist |
| docs/architecture.md | `schema.md` | **Missing** -- would resolve to `docs/schema.md`, does not exist |
| docs/architecture.md | `websocket.md` | **Missing** -- would resolve to `docs/websocket.md`, does not exist |
| docs/setup.md | `.vscode/settings.json` | **Missing** -- mentioned as existing, no `.vscode/` directory |

**Note**: `docs/deployment.md` links to `../README.md#environment-variables` -- the file exists and the heading anchor is valid.

### 2. Factual Contradictions (1 total)

| Issue | Location | Details |
|---|---|---|
| **Node.js version mismatch** | `docs/architecture.md` line 19 | States "Node.js 16.x (LTS)" as the runtime. README.md states "Node.js 18.x or higher", `docs/setup.md` states "Node.js 18.x or higher", and `package.json` engines field requires `>=18.0.0`. Architecture.md is the outlier and is wrong. |

### 3. Content Duplication (1 instance)

| Duplicated Content | Location A | Location B |
|---|---|---|
| Prerequisites list (Node.js 18.x, PostgreSQL 14+, Redis) | README.md lines 14-18 | docs/setup.md lines 4-7 |
| Installation steps (git clone, npm install, cp .env.example, npm run migrate, npm run dev) | README.md lines 22-30 | docs/setup.md lines 11-18 |
| Database creation (`createdb taskflow_dev`, `npm run migrate`) | README.md lines 53-58 | docs/setup.md lines 21-30 |
| Redis setup instructions | README.md lines 62-65 | docs/setup.md lines 39-44 |

The README "Quick Start" section and `docs/setup.md` contain nearly identical content. This creates a maintenance burden -- updates to one will likely not be reflected in the other (the Node.js version contradiction in architecture.md is evidence this already happens).

### 4. References to Non-Existent Infrastructure

| Document | Reference | What's Missing |
|---|---|---|
| docs/deployment.md | `docker-compose up -d` | No `docker-compose.yml` file exists in the project |
| docs/deployment.md | `.github/workflows/ci.yml` | No `.github/` directory exists |
| docs/setup.md | `.vscode/settings.json` | No `.vscode/` directory exists |
| README.md | `.env.example` | No `.env.example` file exists |
| docs/architecture.md | `src/` directory tree | No `src/` directory exists |

This may be expected if the fixture is documentation-only, but within the context of the documentation itself, these references promise artifacts that a reader would expect to find.

### 5. Structural / Coverage Gaps

| Issue | Details |
|---|---|
| **No cross-linking from setup.md** | `docs/setup.md` does not link back to README or to any other doc. A reader landing on this page has no navigation path. |
| **No cross-linking from deployment.md to setup.md** | Deployment assumes a working dev environment but doesn't reference setup instructions. |
| **Platform-specific Redis instructions** | `docs/setup.md` only covers macOS (Homebrew). No guidance for Linux (apt/systemd) or Windows (WSL/Docker). |
| **Incomplete monitoring docs** | `docs/deployment.md` admits Prometheus metrics are "not yet configured" but doesn't indicate a timeline or alternative. |
| **No API documentation** | README references `docs/api-reference.md` but it doesn't exist. There is no API documentation anywhere. |
| **No auth documentation** | README references `docs/auth.md` but it doesn't exist. Authentication configuration is undocumented. |
| **CloudWatch mentioned but undocumented** | `docs/deployment.md` mentions Winston logs "shipped to CloudWatch" but provides no configuration details. |
| **Branching strategy undocumented** | `docs/deployment.md` references a `develop` branch for staging deploys but no branching strategy is documented anywhere. |

### 6. Minor / Cosmetic Issues

| Issue | Location | Details |
|---|---|---|
| Missing `npm run seed` in README | README.md | `docs/setup.md` mentions `npm run seed` for dev data, but README's Quick Start omits it. A developer following only the README would miss seeding. |

---

## Document-by-Document Summary

### README.md
- **3 broken links**: `docs/api-reference.md`, `docs/auth.md`, `CONTRIBUTING.md`
- **1 broken file reference**: `.env.example`
- **Heavy duplication** with `docs/setup.md`
- Otherwise well-structured with clear sections

### docs/architecture.md
- **1 contradiction**: Node.js version listed as 16.x (should be 18.x)
- **2 broken links**: `schema.md`, `websocket.md`
- **References non-existent `src/` directory tree**
- Tech stack section is otherwise accurate against package.json

### docs/setup.md
- **1 reference to non-existent file**: `.vscode/settings.json`
- **Heavy duplication** with README.md
- **Platform-specific** (macOS only for Redis)
- No outbound links to other docs

### docs/deployment.md
- **References non-existent infrastructure**: `docker-compose.yml`, `.github/workflows/ci.yml`
- **Incomplete monitoring section** (Prometheus not configured)
- **Undocumented CloudWatch setup**
- Cross-link to README.md is valid

---

## Severity Ranking

1. **Critical**: Node.js version contradiction in architecture.md (could cause a developer to use the wrong version)
2. **High**: 7 broken links to non-existent documents (readers will hit dead ends)
3. **High**: No API documentation exists despite being referenced (core functionality undocumented)
4. **Medium**: Content duplication between README and setup.md (maintenance drift risk, already manifesting)
5. **Medium**: References to non-existent infrastructure files (Docker, CI, VS Code config)
6. **Low**: Platform-specific instructions, missing cross-links, incomplete monitoring docs
