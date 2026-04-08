## Doc Audit Report

### Summary
- Files audited: 4 (README.md, docs/architecture.md, docs/setup.md, docs/deployment.md)
- Issues found: 16 (6 critical, 6 medium, 4 low)
- Doc structure: Reasonable skeleton (README + docs/ subfolder) but 6 referenced files are missing, and the README duplicates setup content that belongs solely in docs/setup.md. The documentation reads as a template that was never fully populated.

### Critical Issues

**1. Broken link: docs/api-reference.md does not exist**
- File: README.md
- Line: 47
- Link: `[docs/api-reference.md](docs/api-reference.md)`
- Fix: Either create docs/api-reference.md or remove the link. If the API docs are auto-generated at runtime, clarify that (e.g., "available at localhost:3000/docs when running locally").

**2. Broken link: docs/auth.md does not exist**
- File: README.md
- Line: 70
- Link: `[docs/auth.md](docs/auth.md)`
- Fix: Create docs/auth.md with Passport.js + JWT configuration details, or remove the reference and fold auth notes into an existing doc.

**3. Broken link: schema.md does not exist**
- File: docs/architecture.md
- Line: 38
- Link: `[schema.md](schema.md)`
- Fix: Create docs/schema.md with the database schema, or remove the link and document the schema inline.

**4. Broken link: websocket.md does not exist**
- File: docs/architecture.md
- Line: 51
- Link: `[websocket.md](websocket.md)`
- Fix: Create docs/websocket.md with Socket.io protocol details, or remove the link and expand the inline description.

**5. Broken link: CONTRIBUTING.md does not exist**
- File: README.md
- Line: 78
- Link: `[CONTRIBUTING.md](CONTRIBUTING.md)`
- Fix: Create CONTRIBUTING.md or remove the Contributing section.

**6. Node.js version contradiction across docs**
- File: docs/architecture.md
- Line: 19
- Claim: "Node.js 16.x (LTS)" in the Tech Stack section
- Reality: README.md says "Node.js 18.x or higher", package.json engines field requires `>=18.0.0`. The architecture doc is actively misleading — someone reading it would think Node 16 is sufficient.
- Fix: Change line 19 of docs/architecture.md from `Node.js 16.x (LTS)` to `Node.js 18.x (LTS)`.

### Medium Issues

**7. Broken link: .env.example does not exist**
- File: README.md
- Line: 34
- Link: `[.env.example](.env.example)`
- Fix: Create a .env.example file with documented environment variables, or remove the reference and list variables directly in the README.

**8. Installation instructions diverge between README and setup.md**
- Type: CONTRADICTION
- Location A: README.md lines 22-29 (includes `cp .env.example .env` and comment about editing credentials)
- Location B: docs/setup.md lines 11-17 (omits the .env copy step entirely)
- Fix: Make docs/setup.md the single source of truth for installation. Add the missing .env step to setup.md, and replace the README's Quick Start with a brief pointer: "See [docs/setup.md](docs/setup.md) for installation instructions."

**9. Prerequisites duplicated in README and setup.md**
- Type: DUPLICATION
- Location A: README.md lines 14-18
- Location B: docs/setup.md lines 3-6
- Drift risk: HIGH — version requirements change and one copy will fall behind (the Node.js version contradiction in architecture.md proves this risk is real).
- Fix: Keep prerequisites in docs/setup.md only. README Quick Start should link to setup.md.

**10. Database setup instructions duplicated**
- Type: DUPLICATION
- Location A: README.md lines 51-57 (`createdb` + `npm run migrate`)
- Location B: docs/setup.md lines 22-30 (same commands plus seed step)
- Drift risk: HIGH — setup.md has the more complete version (includes seeding). README's copy is already behind.
- Fix: Remove the Database Setup section from README. Link to docs/setup.md instead.

**11. Redis setup instructions duplicated with different content**
- Type: DUPLICATION + minor CONTRADICTION
- Location A: README.md lines 61-65 (says `redis-server`)
- Location B: docs/setup.md lines 39-44 (says `brew install redis` + `brew services start redis`)
- The two give different commands for the same task. README's approach is generic; setup.md is macOS-specific.
- Fix: Consolidate into docs/setup.md with platform-specific instructions. Remove from README.

**12. docs/deployment.md references docker-compose but no docker-compose.yml exists**
- File: docs/deployment.md
- Line: 9
- Claim: `docker-compose up -d` will start the API, PostgreSQL, and Redis
- Reality: No docker-compose.yml file exists in the project.
- Fix: Create docker-compose.yml, or mark the Docker section as "planned" / remove it.

### Low Issues

**13. docs/setup.md references .vscode/settings.json which does not exist**
- File: docs/setup.md
- Line: 53
- Claim: "Workspace settings are in `.vscode/settings.json`."
- Reality: No .vscode directory exists.
- Fix: Create the .vscode/settings.json file, or remove the reference.

**14. docs/deployment.md references .github/workflows/ci.yml which does not exist**
- File: docs/deployment.md
- Line: 24
- Claim: "The pipeline is defined in `.github/workflows/ci.yml`."
- Reality: No .github directory exists.
- Fix: Create the CI workflow file, or mark CI/CD as planned.

**15. Code block missing language tag in architecture.md**
- File: docs/architecture.md
- Line: 7
- Issue: Fenced code block uses bare triple backticks with no language identifier for the directory tree.
- Fix: Add a language tag, e.g., ` ```text ` or ` ```plaintext `.

**16. Code block missing language tag in setup.md**
- File: docs/setup.md
- Line: 60
- Issue: The `PORT=3001` code block has no language identifier.
- Fix: Add ` ```bash ` or ` ```env ` or ` ```text `.

### Structure Assessment

The project has the right idea — a top-level README with a docs/ subfolder for deeper topics. However, the execution falls short in two ways:

1. **Phantom documentation.** Six files are referenced but don't exist (api-reference.md, auth.md, schema.md, websocket.md, CONTRIBUTING.md, .env.example). This makes the docs feel like a template that was never filled in. Every broken link erodes trust in the remaining content.

2. **README as a setup guide.** The README duplicates substantial setup content (prerequisites, installation, database config, Redis config) that already lives in docs/setup.md. This creates maintenance burden and has already caused drift (the .env step is in README but missing from setup.md). The README should be a concise overview that links to docs/setup.md for the full setup flow.

Overall, the documentation structure is reasonable but needs the missing files created and the duplicated content consolidated to be trustworthy.
