# Doc Audit Transcript -- TaskFlow (node-app fixture)

## Step 1: Discover all markdown files

Globbed for `**/*.md` under the project root. Found 4 files:

- `README.md`
- `docs/architecture.md`
- `docs/setup.md`
- `docs/deployment.md`

## Step 2: Inventory the full project tree

Listed every file in the project. The project contains exactly 5 files:

- `README.md`
- `package.json`
- `docs/architecture.md`
- `docs/setup.md`
- `docs/deployment.md`

No source code (`src/`), no config files (`.env.example`, `docker-compose.yml`, `.vscode/`), no CI config (`.github/`), and no additional docs (`CONTRIBUTING.md`, `docs/auth.md`, `docs/api-reference.md`, `docs/schema.md`, `docs/websocket.md`).

## Step 3: Read every markdown file in full

Read all four markdown files plus `package.json` to understand stated features, dependencies, and cross-references.

## Step 4: Extract all internal links

Used regex search for markdown link syntax `[...](...)` across all `.md` files. Found 9 internal links:

| Source file | Link target | Exists? |
|---|---|---|
| README.md | `.env.example` | NO |
| README.md | `docs/architecture.md` | YES |
| README.md | `docs/api-reference.md` | NO |
| README.md | `docs/auth.md` | NO |
| README.md | `docs/deployment.md` | YES |
| README.md | `CONTRIBUTING.md` | NO |
| docs/deployment.md | `../README.md#environment-variables` | YES (file exists, heading anchor valid) |
| docs/architecture.md | `schema.md` (resolves to `docs/schema.md`) | NO |
| docs/architecture.md | `websocket.md` (resolves to `docs/websocket.md`) | NO |

6 out of 9 links point to files that do not exist.

## Step 5: Cross-reference docs against package.json

- `package.json` declares `"engines": { "node": ">=18.0.0" }` -- matches README and setup.md prerequisites ("Node.js 18.x or higher").
- `docs/architecture.md` states "Node.js 16.x (LTS)" under Tech Stack -- **contradicts** both `package.json` and the other docs.
- `package.json` lists `express ^4.18.2` -- architecture.md says "Express 4.x" (consistent).
- `package.json` lists `sequelize ^6.35.0` -- architecture.md says "Sequelize 6" (consistent).
- Scripts in `package.json`: `dev`, `start`, `test`, `test:e2e`, `migrate`, `migrate:prod`, `seed`, `lint`.
- README references `npm run test` and `npm run test:e2e` (match). Also `npm run migrate` and `npm run dev` (match).
- setup.md references `npm run seed` (matches package.json).
- deployment.md references `npm run migrate:prod` and `npm start` (both match).
- `package.json` has a `lint` script not mentioned in any doc.

## Step 6: Check for content duplication

README.md and docs/setup.md duplicate:
- Prerequisites section (identical content: Node.js 18.x, PostgreSQL 14+, Redis)
- Installation steps (nearly identical clone/install/migrate/dev commands)
- Database setup (createdb + migrate)
- Redis setup instructions

## Step 7: Check for stale or contradictory content

- **Node.js version contradiction**: architecture.md says "Node.js 16.x (LTS)" but package.json requires `>=18.0.0`, and README.md + setup.md both say "Node.js 18.x or higher".
- **Prometheus metrics**: deployment.md says metrics endpoint is "not yet configured" -- unclear if this is still the case or was written long ago and forgotten.
- **MVC claim**: README says "standard MVC pattern" but architecture.md describes a "layered architecture" with controllers/services/models -- this is closer to a service-layer pattern than strict MVC. Minor inconsistency.
- **"API documentation is available at docs/api-reference.md when running locally"**: Confusing phrasing -- implies the file is generated at runtime, but it's linked as a static markdown file. The file doesn't exist either way.

## Step 8: Structural analysis

- `docs/setup.md` is not linked from README.md. The README duplicates setup content instead of linking to it.
- No table of contents or index for the docs folder.
- No CHANGELOG or version history referenced.
- architecture.md references `src/middleware/errorHandler.js` but no `src/` directory exists (expected for a fixture, but the doc presumes it).

## Step 9: Compile findings into report
