import type {
  MultiProjectReport,
  ProjectReport,
  TierReport,
  CategoryReport,
  SubcategoryStats,
} from '@/types'

/**
 * The "WHAT GOT BUILT" composition inventory (Phase 5 Decision 3/4).
 *
 * Tells the BREADTH of an autonomous build — code, tests, plans, prompts, configs,
 * images, audio, video — each in its NATURAL unit so nothing lies (code in lines,
 * docs/configs/tests in files, media in counts). This is deliberately NOT the
 * authored-vs-pipeline PROVENANCE split (cut, ideation §11 / Decision 1-2) and NOT
 * `topSubcategories` (top-5-by-bytes reliably reads "video, images, more video").
 *
 * Pure + tested, mirroring grid-order.ts. Walks the published `report.tiers[]` tree;
 * the choice of WHICH kinds to show + their labels + units is a presentation decision
 * and lives here, not in the claude-credit CLI.
 */

export type CompositionUnit = 'lines' | 'files' | 'count'

export interface CompositionItem {
  /** Stable key for React lists + the selector identity. */
  key: string
  /** Evocative small-caps label rendered under the value. */
  label: string
  value: number
  unit: CompositionUnit
}

// --- tier-tree lookups (defensive: a missing node resolves to 0, never throws) ---

function findTier(report: ProjectReport, tier: string): TierReport | undefined {
  return report.tiers?.find((t) => t.tier === tier)
}

function findCategory(report: ProjectReport, tier: string, category: string): CategoryReport | undefined {
  return findTier(report, tier)?.categories.find((c) => c.category === category)
}

function findSubcategory(
  report: ProjectReport,
  tier: string,
  category: string,
  subcategory: string,
): SubcategoryStats | undefined {
  return findCategory(report, tier, category)?.subcategories.find((s) => s.subcategory === subcategory)
}

/**
 * The CURATED, ORDERED selector set (the editorial edit-point for the kind inventory).
 * Each resolves a single number from the tier tree; a missing node → 0 → omitted below.
 *
 * Label honesty (Decision 3): `pipeline-generated/assets/audio` is ALL audio — music
 * beds, SFX, royalty-free stems, TTS — so it is "audio files", never "voice lines".
 * `plans & docs` uses the pre-computed CategoryReport.totals (a summed SubcategoryStats),
 * not a hand-rolled subcategory sum.
 */
const SELECTORS: ReadonlyArray<{
  key: string
  label: string
  unit: CompositionUnit
  resolve: (r: ProjectReport) => number
}> = [
  { key: 'code', label: 'lines of code', unit: 'lines', resolve: (r) => findSubcategory(r, 'authored', 'code', 'source')?.totalLines ?? 0 },
  { key: 'tests', label: 'tests', unit: 'files', resolve: (r) => findSubcategory(r, 'authored', 'code', 'tests')?.files ?? 0 },
  { key: 'docs', label: 'plans & docs', unit: 'files', resolve: (r) => findCategory(r, 'authored', 'docs')?.totals.files ?? 0 },
  { key: 'prompts', label: 'generation prompts', unit: 'files', resolve: (r) => findSubcategory(r, 'authored', 'data', 'generation-prompts')?.files ?? 0 },
  { key: 'configs', label: 'config files', unit: 'files', resolve: (r) => findSubcategory(r, 'authored', 'code', 'config')?.files ?? 0 },
  { key: 'images', label: 'images', unit: 'count', resolve: (r) => findSubcategory(r, 'pipeline-generated', 'assets', 'images')?.files ?? 0 },
  { key: 'audio', label: 'audio files', unit: 'count', resolve: (r) => findSubcategory(r, 'pipeline-generated', 'assets', 'audio')?.files ?? 0 },
  { key: 'video', label: 'video renders', unit: 'count', resolve: (r) => findSubcategory(r, 'pipeline-generated', 'assets', 'video')?.files ?? 0 },
]

/**
 * Build the curated kind callouts for one project, in selector order, OMITTING any
 * kind whose resolved value is 0 (the inventory reflects THIS project's real breadth —
 * never "0 audio files"). Read-only; does not mutate the report.
 */
export function buildComposition(report: ProjectReport): CompositionItem[] {
  return SELECTORS.map(({ key, label, unit, resolve }) => ({ key, label, unit, value: resolve(report) })).filter(
    (item) => item.value > 0,
  )
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
