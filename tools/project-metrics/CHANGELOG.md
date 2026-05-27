# Changelog

## 0.2.1 — 2026-05-27

### Removed

- **`editorial.heroImage` + `editorial.gallery`** — dropped from `EditorialContent`,
  `validateEditorial`, the `report.ts` existence-check, and the `ALLOWED_KEY_PATHS`
  publish allowlist. The ai-journey-stats site went type-forward everywhere (project
  imagery was irreconcilably inconsistent across heterogeneous projects), so the image
  fields are no longer consumed or published. `assetBytesByKind` (media volume as data)
  is unaffected — it remains the on-thesis visual-output measurement.

## 0.2.0 — 2026-05-25

Phase 0 data contract for the ai-journey-stats showcase site. All changes are
additive; `0.1.x` `projects:`-only configs keep working unchanged.

### Added

- **GitStats temporal context** — `firstCommitISO`, `lastCommitISO`, `projectAgeDays`.
- **`linesByAuthor`** — Co-Authored-By-aware, additive attribution (rotation-immune;
  immune to the git author-vs-co-author inversion).
- **`timeline`** — `commitsByDay`, `activeDays`, `peakDay`, `largestSingleCommit`
  (no message text — privacy).
- **`assetBytesByKind`** — bytes-on-disk per asset family (images/audio/video/fonts/misc-media).
- **`topSubcategories`** — pre-computed top-5 subcategories by bytes.
- **`tokens` (session-tokens parser)** — privacy-by-construction 7-field pick-list,
  case-insensitive longest-prefix slug merging (worktree/subdir/nested), window-bounded
  floor, dual `tokensProcessed`/`tokensFresh`, sidechain subset, per-model breakdown,
  parseHealth counters. Never throws.
- **Static breadth counts** — `testCases` (definition scan, no execution), `testLines`,
  `planCount`, `planLines`.
- **`editorial`** — per-project config block (validated; absolute heroImage paths
  rejected; `metric:<key>` hookStat values resolved live).
- **Multi-config `meta:` + `archive:`** — `meta[]` totals-only (editorial forced null),
  `archive[]` rolled into one `archiveCollective`. Combined totals fold in projects +
  meta + archive (Invariants A/B/C).
- **`strip-for-publish.ts`** — shared `stripForPublish` + hand-curated `ALLOWED_KEY_PATHS`
  for public stats.json safety.
- CLI markdown + terminal renderers surface every new field (null → em-dash).
- Orphan session-slug warning (count only; names never surfaced).

### Testing

- Lit up the vitest harness (first tests): 44 across 6 files — git parsers, session-tokens
  privacy/slug-merge, editorial/multi-config, and 5 fixture-based integration tests
  (Zod schema, aggregation invariants, privacy round-trip, session merge, stats-shape allowlist).
- `tsconfig.build.json` emits production-only `dist`; `tsconfig.json` typechecks tests too.

## 0.1.0

Initial release — file classification, tier/category/subcategory tally, git stats,
iteration proxies, multi-project `--all`.
