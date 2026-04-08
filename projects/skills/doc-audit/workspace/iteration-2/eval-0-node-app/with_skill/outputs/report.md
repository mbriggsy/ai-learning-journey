# Doc Audit Report

## Summary

- **Files audited:** 4 (README.md, docs/architecture.md, docs/setup.md, docs/deployment.md)
- **Issues found:** 15 (4 critical, 6 medium, 5 low)
- **Doc structure:** Reasonable skeleton (README + docs/ folder) but the README duplicates setup.md extensively, and 5 out of 9 internal links point to documents that don't exist, creating a "swiss cheese" documentation surface.

---

## Critical Issues

### 1. Node.js version contradiction — architecture.md vs all other sources

- **File:** docs/architecture.md
- **Line:** 19
- **Issue:** Tech stack section claims "Node.js 16.x (LTS)" but package.json requires `>=18.0.0`, README.md (line 17) says "Node.js 18.x or higher", and setup.md (line 6) says the same. A developer following architecture.md would install the wrong Node version.
- **Fix:** Change line 19 of docs/architecture.md from `Node.js 16.x (LTS)` to `Node.js 18.x`.

### 2. Broken link to docs/api-reference.md — README.md

- **File:** README.md
- **Line:** 47
- **Issue:** Link `[docs/api-reference.md](docs/api-reference.md)` points to a file that does not exist. Readers clicking this hit a dead end.
- **Fix:** Either create `docs/api-reference.md` or remove the link and the sentence referencing it.

### 3. Broken link to docs/auth.md — README.md

- **File:** README.md
- **Line:** 70
- **Issue:** Link `[docs/auth.md](docs/auth.md)` points to a file that does not exist. The Authentication section references configuration details that are inaccessible.
- **Fix:** Either create `docs/auth.md` or remove the link and rewrite the section with inline auth configuration info.

### 4. Broken link to .env.example — README.md

- **File:** README.md
- **Line:** 34
- **Issue:** Link `[.env.example](.env.example)` points to a file that does not exist. This is particularly harmful because setup instructions tell users to `cp .env.example .env`, and they can't inspect what variables are needed.
- **Fix:** Create the `.env.example` file, or remove the link and document environment variables inline.

---

## Medium Issues

### 5. Broken link to schema.md — docs/architecture.md

- **File:** docs/architecture.md
- **Line:** 38
- **Issue:** Link `[schema.md](schema.md)` points to `docs/schema.md` which does not exist. The database schema section references it for "the full database schema."
- **Fix:** Either create `docs/schema.md` or remove the link and expand the inline schema description.

### 6. Broken link to websocket.md — docs/architecture.md

- **File:** docs/architecture.md
- **Line:** 51
- **Issue:** Link `[websocket.md](websocket.md)` points to `docs/websocket.md` which does not exist. The WebSocket section references it for "protocol details."
- **Fix:** Either create `docs/websocket.md` or remove the link and expand the inline WebSocket documentation.

### 7. Broken link to CONTRIBUTING.md — README.md

- **File:** README.md
- **Line:** 78
- **Issue:** Link `[CONTRIBUTING.md](CONTRIBUTING.md)` points to a file that does not exist.
- **Fix:** Either create `CONTRIBUTING.md` or remove the Contributing section.

### 8. Stale status claim — deployment.md "not yet configured"

- **File:** docs/deployment.md
- **Line:** 30
- **Issue:** Prometheus metrics endpoint described as "(not yet configured)" — this may be stale if metrics have since been implemented, or accurately reflects current state. Either way, it's a maintenance flag that should be reviewed.
- **Fix:** Verify whether Prometheus metrics are implemented. If yes, remove "(not yet configured)". If no, consider whether this line belongs in docs (documenting unbuilt features is misleading).

### 9. Rate limiting claim unverifiable — README.md

- **File:** README.md
- **Line:** 10
- **Issue:** README claims "Rate limiting and request validation" as a feature. package.json includes `joi` (validation) and `helmet` (security headers), but no dedicated rate-limiting package (e.g., `express-rate-limit`). The architecture doc mentions rate limiting in the middleware chain (line 32). The claim may be accurate (custom implementation or helmet config), but it's unverifiable from the documentation alone.
- **Fix:** Clarify what provides rate limiting — is it a custom middleware, or is a dependency missing from package.json?

### 10. GitHub Actions CI reference to non-existent file — deployment.md

- **File:** docs/deployment.md
- **Line:** 24
- **Issue:** References `.github/workflows/ci.yml` in prose, but this file does not exist. Not a markdown link, but still a broken reference.
- **Fix:** Either create the CI workflow file or remove the CI/CD section.

---

## Low Issues

### 11. Duplicated prerequisites — README.md and docs/setup.md

- **File:** README.md (lines 16-19) and docs/setup.md (lines 4-7)
- **Issue:** Identical prerequisites list (Node.js 18.x+, PostgreSQL 14+, Redis) appears in both files. If version requirements change, both need updating.
- **Fix:** README quick-start should link to docs/setup.md for prerequisites instead of duplicating the list.

### 12. Duplicated installation steps — README.md and docs/setup.md

- **File:** README.md (lines 22-30) and docs/setup.md (lines 11-18)
- **Issue:** Nearly identical installation commands in both files. High drift risk — any workflow change requires two updates.
- **Fix:** README should provide a 2-3 line quick-start that links to docs/setup.md for the full procedure, or vice versa.

### 13. Duplicated database setup — README.md and docs/setup.md

- **File:** README.md (lines 53-58) and docs/setup.md (lines 22-27)
- **Issue:** `createdb` and `npm run migrate` commands duplicated across both files.
- **Fix:** Remove the Database Setup section from README.md and link to docs/setup.md.

### 14. Duplicated Redis setup — README.md and docs/setup.md

- **File:** README.md (lines 62-66) and docs/setup.md (lines 39-44)
- **Issue:** Redis instructions in both files, with setup.md being more complete (includes brew commands).
- **Fix:** Remove the Redis Setup section from README.md and link to docs/setup.md.

### 15. `.vscode/settings.json` prose reference — docs/setup.md

- **File:** docs/setup.md
- **Line:** 53
- **Issue:** References "Workspace settings are in `.vscode/settings.json`" but this file does not exist.
- **Fix:** Either create the settings file or remove the reference.

---

## Structure Assessment

The documentation follows a sensible pattern: a top-level README.md for project overview plus a `docs/` directory for detailed guides (architecture, setup, deployment). This is a common and discoverable structure for Node.js projects.

However, two structural problems undermine it:

1. **The README tries to be both overview and setup guide.** Sections 49-67 (Configuration > Database Setup, Redis Setup) duplicate what's already in docs/setup.md. The README should link to the dedicated setup doc rather than maintaining a parallel copy. This creates unnecessary drift risk.

2. **Five out of nine internal links are broken**, pointing to documents that were planned but never created (api-reference.md, auth.md, schema.md, websocket.md, CONTRIBUTING.md) plus a config file (.env.example). This makes the documentation feel incomplete and erodes trust — readers learn to expect dead ends.

The fix path is straightforward: consolidate setup content into docs/setup.md (making README a signpost), update architecture.md's Node version, and either create the missing referenced docs or remove the dead links.
