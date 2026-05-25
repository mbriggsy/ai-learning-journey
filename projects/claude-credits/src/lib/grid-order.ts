import type { MultiProjectReport, ProjectReport, ArchiveCollective } from '@/types'

/**
 * Sort project tiles by AUTHORED SUBSTANCE — `grandTotals.authoredLines` descending,
 * tie-broken by `projectName` ascending (Phase 4 Decision 4). Returns a NEW array;
 * never mutates the input.
 *
 * Why this key (not allBytes, not tokens):
 *   - `authoredLines` is file-classification-derived from a full scan, so it is permanent
 *     AND immune to the Co-Authored-By git-attribution inversion (it never asks "who" wrote
 *     a line, only "what tier" the file is). NEVER re-derive it from `linesByAuthor`.
 *   - `allBytes` is dominated by pipeline media → ranks by "biggest trailer."
 *   - tokens are 30-day-window-bounded (JSONL rotation) → ranks by "recently active."
 * The `projectName` tie-break makes equal-rank tiles diff-stable (no reshuffle on refresh).
 * A 0-authored (pure-pipeline) project sinks to the bottom of the group, then alphabetical.
 */
export function sortBySize(reports: ProjectReport[]): ProjectReport[] {
  return [...reports].sort((a, b) => {
    const diff = b.grandTotals.authoredLines - a.grandTotals.authoredLines
    if (diff !== 0) return diff
    return a.projectName.localeCompare(b.projectName)
  })
}

export interface GridModel {
  active: ProjectReport[]
  archive: ArchiveCollective | null
  showMissesDivider: boolean
  isEmpty: boolean
}

/**
 * Build the grid's render model from the report. Sorts the active projects, passes the
 * archive collective through, and derives two booleans that are the testable seams:
 *   - `showMissesDivider` — never render the "the misses" divider over a null archive.
 *   - `isEmpty` — lets ProjectGrid render nothing (hero stands alone) instead of an empty
 *     <section>. Non-null `MultiProjectReport` does NOT mean non-empty.
 * Phase 4 reads ONLY `projects` + `archiveCollective` — `report.meta` is totals-only (no
 * tiles, ideation §7).
 */
export function buildGridModel(report: MultiProjectReport): GridModel {
  const active = sortBySize(report.projects)
  const archive = report.archiveCollective
  return {
    active,
    archive,
    showMissesDivider: archive !== null,
    isEmpty: active.length === 0 && archive === null,
  }
}
