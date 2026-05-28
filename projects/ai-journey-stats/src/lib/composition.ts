import type { MultiProjectReport, ProjectReport, TierReport, CategoryReport } from '@/types'

/**
 * The "CODE METRICS" breakdown of an autonomous build (Phase 5 / Phase 9 reframe).
 *
 * Four authored buckets, each in LINES with a supporting FILE count: application code,
 * test code, implementation-planning docs, and config. This is deliberately NOT the
 * authored-vs-pipeline PROVENANCE split (cut, ideation §11) and NOT `topSubcategories`
 * (top-5-by-bytes reads "video, images, more video"). Generated media lives in the
 * AssetDonut ("Audio & visuals"), not here.
 *
 * Bucket definitions (Briggsy-locked 2026-05-27):
 *   - Application LOC = authored code source + styles + markup (the running product;
 *     build/tooling scripts are NOT the application, so they're excluded).
 *   - Test lines     = authored code tests + test-fixtures.
 *   - Planning       = authored docs plans (implementation planning specifically — NOT
 *     all docs; README/triage/narrative/insights are not "planning").
 *   - Config         = authored code config.
 *
 * Pure + tested, mirroring grid-order.ts. Walks the published `report.tiers[]` tree;
 * the choice of WHICH buckets + their labels is a presentation decision, lives here.
 */

export interface CodeMetric {
  /** Stable key for React lists. */
  key: string
  /** Small-caps label rendered under the line count. */
  label: string
  /** The headline number — total lines across this bucket's subcategories. */
  lines: number
  /** Supporting count — files across this bucket's subcategories. */
  files: number
}

// --- tier-tree lookups (defensive: a missing node resolves to 0, never throws) ---

function findTier(report: ProjectReport, tier: string): TierReport | undefined {
  return report.tiers?.find((t) => t.tier === tier)
}

function findCategory(report: ProjectReport, tier: string, category: string): CategoryReport | undefined {
  return findTier(report, tier)?.categories.find((c) => c.category === category)
}

/** Sum {lines, files} across a set of subcategories within one tier/category. Missing → 0. */
function sumSubcategories(
  report: ProjectReport,
  tier: string,
  category: string,
  subcategories: readonly string[],
): { lines: number; files: number } {
  const cat = findCategory(report, tier, category)
  let lines = 0
  let files = 0
  for (const name of subcategories) {
    const s = cat?.subcategories.find((x) => x.subcategory === name)
    if (s) {
      lines += s.totalLines ?? 0
      files += s.files ?? 0
    }
  }
  return { lines, files }
}

/**
 * The CURATED, ORDERED bucket set (the editorial edit-point). Each sums one or more
 * subcategories from the tier tree; a bucket with 0 lines AND 0 files is omitted below.
 */
const BUCKETS: ReadonlyArray<{
  key: string
  label: string
  tier: string
  category: string
  subcategories: readonly string[]
}> = [
  { key: 'app', label: 'application LOC', tier: 'authored', category: 'code', subcategories: ['source', 'styles', 'markup'] },
  { key: 'tests', label: 'lines of testing', tier: 'authored', category: 'code', subcategories: ['tests', 'test-fixtures'] },
  { key: 'plans', label: 'lines of implementation planning', tier: 'authored', category: 'docs', subcategories: ['plans'] },
  { key: 'config', label: 'lines of config', tier: 'authored', category: 'code', subcategories: ['config'] },
]

/**
 * Build the code-metric buckets for one project, in bucket order, OMITTING any bucket
 * with 0 lines AND 0 files (so a data-sparse toy never renders "0 config lines"). The
 * line count is the headline; the file count supports it. Read-only; no mutation.
 */
export function buildCodeMetrics(report: ProjectReport): CodeMetric[] {
  return BUCKETS.map(({ key, label, tier, category, subcategories }) => {
    const { lines, files } = sumSubcategories(report, tier, category, subcategories)
    return { key, label, lines, files }
  }).filter((m) => m.lines > 0 || m.files > 0)
}

/**
 * Resolve ONE project report by name for the `/project/:name` route. Searches only the
 * 9 active `projects` (detail pages are active-only — ideation §7); `meta[]` is totals-only
 * and archive entries live in `archiveCollective` (no per-project report), so a meta name,
 * a shelved name, and a typo all return `null` → the deliberate not-found fork (Decision 8).
 */
export function findProject(report: MultiProjectReport, name: string | undefined): ProjectReport | null {
  if (!name) return null
  return report.projects.find((p) => p.projectName === name) ?? null
}
