// Re-export the claude-credit data contract for the site. TYPE-ONLY (`export type`):
//   1. isolatedModules (tsconfig) forbids re-exporting a type as a value.
//   2. CRITICAL: a value import from dist/ would drag claude-credit's node code
//      (fs, child_process, git) into the browser bundle. `export type` is erased
//      by esbuild → zero runtime import. NEVER change `export type` to `export`.
// Relative path: claude-credits/src/ → ../../.. = monorepo root → tools/claude-credit/dist.
export type {
  MultiProjectReport,
  ProjectReport,
  ArchiveCollective,
  TokenStats,
  EditorialContent,
  GitStats,
  ProxyStats,
  GrandTotals,
  TierReport,
  CategoryReport,
  SubcategoryStats,
  Tier,
} from '../../../tools/claude-credit/dist/taxonomy.js'
