# Doc Audit Transcript — node-app fixture

## Phase 1: Discovery

Ran glob for `**/*.md` under the project root. Found 4 markdown files:

1. `README.md` (83 lines)
2. `docs/architecture.md` (56 lines)
3. `docs/setup.md` (70 lines)
4. `docs/deployment.md` (41 lines)

Also read `package.json` to cross-reference claims made in docs.

The full project contains only 5 files total (the 4 markdown files + package.json). No source code, no config files, no CI workflows, no Docker configs exist in this fixture.

## Phase 2: Parallel Audit Agents

### Agent 1: Link Validator

Read all 4 markdown files and extracted every link (both `[text](path)` markdown links and prose references).

**Links found and checked:**

| Source File | Link | Target | Status |
|---|---|---|---|
| README.md:34 | `[.env.example](.env.example)` | `.env.example` | BROKEN — file does not exist |
| README.md:45 | `[docs/architecture.md](docs/architecture.md)` | `docs/architecture.md` | OK |
| README.md:47 | `[docs/api-reference.md](docs/api-reference.md)` | `docs/api-reference.md` | BROKEN — file does not exist |
| README.md:70 | `[docs/auth.md](docs/auth.md)` | `docs/auth.md` | BROKEN — file does not exist |
| README.md:74 | `[docs/deployment.md](docs/deployment.md)` | `docs/deployment.md` | OK |
| README.md:78 | `[CONTRIBUTING.md](CONTRIBUTING.md)` | `CONTRIBUTING.md` | BROKEN — file does not exist |
| architecture.md:38 | `[schema.md](schema.md)` | `docs/schema.md` | BROKEN — file does not exist |
| architecture.md:51 | `[websocket.md](websocket.md)` | `docs/websocket.md` | BROKEN — file does not exist |
| deployment.md:18 | `[../README.md#environment-variables](../README.md#environment-variables)` | `README.md#environment-variables` | OK — file exists, heading `### Environment Variables` present |

**Result**: 6 broken links out of 9 total across 4 files.

### Agent 2: Stale Content Hunter

Read all files and cross-referenced claims against `package.json` and actual project contents.

**Findings:**

1. **architecture.md line 19 — Node.js version mismatch**: Doc says "Node.js 16.x (LTS)" but `package.json` engines field requires `>=18.0.0`, and both README.md and setup.md say "Node.js 18.x or higher". This is a direct contradiction. Severity: CRITICAL.

2. **README.md line 39 — `npm run test` script**: Doc says `npm run test`. package.json has `"test": "jest"` — this works, but the command is equivalent to `npm test`. Minor — script exists. Severity: LOW (not broken, just verbose).

3. **README.md line 40 — `npm run test:e2e` script**: Doc says `npm run test:e2e`. package.json has `"test:e2e": "jest --config jest.e2e.config.js"` — script exists. No issue.

4. **deployment.md line 19 — `npm run migrate:prod` script**: Doc says `npm run migrate:prod`. package.json has `"migrate:prod": "NODE_ENV=production sequelize db:migrate"` — script exists. No issue.

5. **setup.md line 33 — `npm run seed` script**: Doc says `npm run seed`. package.json has `"seed": "sequelize db:seed:all"` — script exists. No issue.

6. **deployment.md line 30 — "not yet configured"**: Prometheus metrics endpoint described as "not yet configured". This is a stale status marker — it may or may not still be accurate but it's a flag for review. Severity: MEDIUM.

7. **README.md lines 10-11 — Feature claims**: README claims WebSocket support, rate limiting, JWT auth. package.json does include socket.io, passport, passport-jwt, helmet. No express-rate-limit visible in dependencies though — rate limiting claim is unverifiable but potentially misleading (helmet is security headers, not rate limiting). Severity: MEDIUM.

8. **architecture.md line 23 — Sequelize version**: Doc says "Sequelize 6" — package.json has `"sequelize": "^6.35.0"`. Consistent. No issue.

9. **deployment.md line 24 — GitHub Actions CI**: References `.github/workflows/ci.yml` which doesn't exist in the project. Severity: MEDIUM (prose reference to non-existent file).

10. **setup.md line 53 — `.vscode/settings.json`**: References workspace settings file that doesn't exist. Severity: LOW (prose reference).

### Agent 3: Content Placement Auditor

**Classification table:**

| File | Category | Lines | Assessment |
|---|---|---|---|
| README.md | Overview | 83 | Issues — contains setup/install instructions that duplicate docs/setup.md |
| docs/architecture.md | Reference | 56 | Clean — appropriate content for its category |
| docs/setup.md | Setup | 70 | Clean — appropriate content for its category |
| docs/deployment.md | Setup (Production) | 41 | Clean — appropriate content for its category |

**Misplaced content:**

1. README.md lines 12-31 ("Quick Start > Prerequisites" + "Installation") — This is a full setup guide duplicating docs/setup.md. README should link to setup.md instead of duplicating it. The README also has a "Configuration" section (lines 49-67) covering Database Setup and Redis Setup, which again overlaps with setup.md.

**Missing docs:**

- `docs/api-reference.md` — referenced in README but doesn't exist. An API reference would be expected for a REST API project.
- `docs/auth.md` — referenced in README but doesn't exist. Auth configuration docs would be useful.
- `CONTRIBUTING.md` — referenced in README but doesn't exist.
- `docs/schema.md` — referenced in architecture.md but doesn't exist.
- `docs/websocket.md` — referenced in architecture.md but doesn't exist.

**Orphaned docs:** None. All docs are referenced from at least one other file.

**Structure assessment:** The doc structure is reasonable for a small project — a README plus a docs/ folder with architecture, setup, and deployment. However, the README tries to be both an overview AND a setup guide, which causes duplication with docs/setup.md. The bigger issue is that 5 referenced documents don't exist, creating a "swiss cheese" documentation surface where readers hit dead ends frequently.

### Agent 4: Duplication Detector

**Findings:**

1. **Prerequisites list — duplicated in README.md (lines 16-19) and docs/setup.md (lines 4-7)**
   - Content: Node.js 18.x+, PostgreSQL 14+, Redis requirements
   - Type: DUPLICATION
   - Source of truth: docs/setup.md (the dedicated setup doc)
   - Intentional: Partially — README often has a quick-start, but both are identically detailed
   - Drift risk: MEDIUM (if version requirements change, both need updating)
   - Fix: README should link to setup.md for prerequisites rather than duplicating them

2. **Installation steps — duplicated in README.md (lines 22-30) and docs/setup.md (lines 11-18)**
   - Content: git clone, npm install, cp .env.example, npm run migrate, npm run dev
   - Type: DUPLICATION
   - Source of truth: docs/setup.md
   - Intentional: NO — the steps are nearly identical
   - Drift risk: HIGH (any workflow change needs two updates)
   - Fix: README quick-start should be 2-3 lines linking to setup.md, or a genuinely abbreviated version

3. **Database setup — duplicated in README.md (lines 53-58) and docs/setup.md (lines 22-27)**
   - Content: createdb taskflow_dev, npm run migrate
   - Type: DUPLICATION
   - Source of truth: docs/setup.md
   - Intentional: NO
   - Drift risk: MEDIUM
   - Fix: Remove from README, it's already in setup.md

4. **Redis setup — duplicated in README.md (lines 62-66) and docs/setup.md (lines 39-44)**
   - Content: Redis running on port 6379
   - Type: DUPLICATION (partial — setup.md has brew commands, README just says `redis-server`)
   - Source of truth: docs/setup.md (more complete)
   - Intentional: NO
   - Drift risk: LOW
   - Fix: Remove from README, link to setup.md

5. **Node.js version — CONTRADICTION across architecture.md (line 19) and README.md (line 17) / setup.md (line 6) / package.json engines**
   - Content: architecture.md says "Node.js 16.x (LTS)" while all other sources say 18.x+
   - Type: CONTRADICTION
   - Source of truth: package.json `"node": ">=18.0.0"` (canonical)
   - Intentional: NO
   - Drift risk: HIGH (will mislead developers into using wrong Node version)
   - Fix: Update architecture.md line 19 from "Node.js 16.x (LTS)" to "Node.js 18.x"

## Phase 3: Aggregation

Deduplicated findings (Agent 2 finding #1 and Agent 4 finding #5 are the same Node version contradiction — merged). Agent 3's missing docs findings overlap with Agent 1's broken links — merged into single findings per file.

Grouped by file, severity assigned.

## Phase 4: Report

Report written to `report.md`.
