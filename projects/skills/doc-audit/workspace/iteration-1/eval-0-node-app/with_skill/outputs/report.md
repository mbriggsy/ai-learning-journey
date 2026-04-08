## Doc Audit Report

### Summary
- Files audited: 4 (README.md, docs/architecture.md, docs/deployment.md, docs/setup.md)
- Issues found: 16 (8 critical, 5 medium, 3 low)
- Doc structure: Reasonable top-level layout with README + docs/ directory, but significant content duplication between README and docs/setup.md, and numerous broken links to files that don't exist.

### Critical Issues

**1. README.md, Line 47 -- Broken link to docs/api-reference.md**
- Link: `[docs/api-reference.md](docs/api-reference.md)`
- Target file does not exist.
- Fix: Remove the link or create the referenced file.

**2. README.md, Line 70 -- Broken link to docs/auth.md**
- Link: `[docs/auth.md](docs/auth.md)`
- Target file does not exist.
- Fix: Remove the link or create the referenced file.

**3. README.md, Line 76 -- Broken link to CONTRIBUTING.md**
- Link: `[CONTRIBUTING.md](CONTRIBUTING.md)`
- Target file does not exist.
- Fix: Remove the link or create the referenced file.

**4. README.md, Line 34 -- Broken link to .env.example**
- Link: `[.env.example](.env.example)`
- Target file does not exist.
- Fix: Create the .env.example file or remove the reference.

**5. docs/architecture.md, Line 38 -- Broken link to schema.md**
- Link: `[schema.md](schema.md)`
- Target file `docs/schema.md` does not exist.
- Fix: Remove the link or create the referenced file.

**6. docs/architecture.md, Line 51 -- Broken link to websocket.md**
- Link: `[websocket.md](websocket.md)`
- Target file `docs/websocket.md` does not exist.
- Fix: Remove the link or create the referenced file.

**7. docs/architecture.md, Line 19 -- Node.js version mismatch**
- Claim: "Node.js 16.x (LTS)" in the Tech Stack section.
- Reality: package.json `engines` field requires `>=18.0.0`. README and docs/setup.md both say "Node.js 18.x or higher."
- Fix: Change to "Node.js 18.x" in the architecture doc to match package.json.

**8. README.md, Lines 20-65 -- Setup instructions duplicated in README**
- The README contains full installation, database setup, and Redis setup instructions that are duplicated nearly verbatim in docs/setup.md, creating two sources of truth that will drift.
- Fix: Keep the Quick Start in README minimal (link to docs/setup.md for details) and keep the full setup instructions in docs/setup.md only.

### Medium Issues

**9. docs/deployment.md, Line 31 -- Stale status claim: "not yet configured"**
- Claim: Prometheus metrics endpoint "not yet configured."
- Reality: Cannot verify against code (no src/ directory in fixture), but the parenthetical "(not yet configured)" may be stale if metrics have since been implemented. Flagged for manual verification.
- Fix: Verify whether `/metrics` is implemented; update the claim accordingly.

**10. docs/deployment.md, Lines 24-25 -- References to CI/CD files that don't exist**
- Claim: "The pipeline is defined in `.github/workflows/ci.yml`."
- Reality: No `.github/` directory exists in the project.
- Fix: Either create the CI configuration or remove/update the reference.

**11. docs/setup.md, Line 53 -- Reference to .vscode/settings.json that doesn't exist**
- Claim: "Workspace settings are in `.vscode/settings.json`."
- Reality: No `.vscode/` directory exists.
- Fix: Either create the settings file or remove the reference.

**12. docs/deployment.md, Lines 9-10 -- Reference to docker-compose that doesn't exist**
- Claim: `docker-compose up -d` starts the full stack.
- Reality: No `docker-compose.yml` (or `docker-compose.yaml` or `compose.yml`) exists.
- Fix: Either create the Docker Compose file or note it as a future addition.

**13. README.md, Line 29 / docs/setup.md, Line 15 -- npm run migrate before .env is configured**
- Claim: Installation steps list `npm run migrate` before mentioning editing `.env` with credentials (README line 28 says "Edit .env" as a comment but setup.md omits it entirely).
- Reality: Migration will fail without database credentials configured first. The setup.md installation section has no step for editing `.env`.
- Fix: In both files, make editing `.env` an explicit numbered step before `npm run migrate`.

### Low Issues

**14. docs/architecture.md, Line 55 -- Reference to src/ directory structure**
- Claim: Lists `src/` directory tree with controllers, models, middleware, services, utils, config subdirectories.
- Reality: No `src/` directory exists in the fixture (though this is likely a fixture limitation, not a real project issue).
- Fix: If this were a real project, verify the directory structure matches what's documented.

**15. README.md / docs/setup.md -- Duplicate prerequisites sections**
- Both files list identical prerequisites (Node.js 18.x, PostgreSQL 14+, Redis).
- Drift risk is LOW since prerequisites change infrequently, but it's still two places to update.
- Fix: README could link to docs/setup.md for prerequisites, or accept the minor duplication.

**16. docs/architecture.md, Line 20 -- Express version stated as 4.x**
- Claim: "Express 4.x"
- Reality: package.json has `"express": "^4.18.2"` -- this is accurate but could be more specific.
- Severity is low because the claim is technically correct.
- Fix: No action needed, or optionally update to "Express 4.18".

### Structure Assessment

The project has a sensible top-level layout: a README.md for orientation and a `docs/` directory with architecture, deployment, and setup guides. However, the README tries to do too much -- it contains full setup instructions (installation, database, Redis) that are duplicated in `docs/setup.md`, creating a maintenance burden. The README should be a landing page that links to `docs/setup.md` for details rather than duplicating them.

There are 6 broken internal links pointing to files that don't exist (api-reference.md, auth.md, schema.md, websocket.md, CONTRIBUTING.md, .env.example), which suggests either these docs were planned but never created, or the project was partially set up. The architecture doc has a critical version mismatch (Node 16 vs Node 18) that could mislead developers setting up their environment.

**Classification table:**

| File | Category | Lines | Assessment |
|------|----------|-------|------------|
| README.md | Overview + Setup | 83 | Issues -- duplicated setup content, 4 broken links |
| docs/architecture.md | Reference | 56 | Issues -- stale Node.js version, 2 broken links |
| docs/deployment.md | Operations | 41 | Issues -- references nonexistent infra files, stale status |
| docs/setup.md | Setup | 70 | Issues -- duplicates README, references missing .vscode config |
