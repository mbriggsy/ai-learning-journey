import type { GitStats } from '@/types'

/**
 * The honesty gate for the detail page's cadence sparkline (Phase 5 Movement 5).
 *
 * WHY THIS EXISTS (insight 005 — docs/insights/005-monorepo-git-dates-are-not-project-duration.md):
 * This is a monorepo. A single 2026-02-21 commit titled "Initial commit - Tic-Tac-Toe,
 * PacMan, and OpenClaw" bulk-imported several ALREADY-FINISHED projects at once. So any
 * project whose path-scoped history includes that day carries a false multi-thousand-line
 * origin spike on the repo's birthday — its commitsByDay is NOT a real build rhythm. The
 * age ribbon was already cut for exactly this reason (commit 1ea658b3); rendering a cadence
 * sparkline on the same polluted dates would tell the same lie (e.g. tic-tac-toe — ~1 hour
 * of work — would show one giant Feb-21 burst).
 *
 * THE GATE (ATC-locked 2026-05-26): show the cadence only where the git history is a genuine
 * rhythm; omit the whole movement otherwise. A project is trustworthy iff:
 *   - its history does NOT include the bulk-import day, AND
 *   - it has enough active days to BE a rhythm (≤4 active days is a handful of dots, not a story).
 * Every genuinely-iterated project (burned 38d, undercover 10d, both racers 8-11d) is
 * bulk-import-free and clears the bar; the bulk-imported toys (tic-tac-toe 3d, pacman 4d)
 * are filtered on both counts.
 */

/** The monorepo bulk-import day — the repo's birthday, not any single project's start. */
export const MONOREPO_BULK_IMPORT_DAY = '2026-02-21'

/** A cadence needs at least this many active days to read as a rhythm rather than dots. */
const MIN_CADENCE_ACTIVE_DAYS = 5

export function isCadenceTrustworthy(timeline: GitStats['timeline'] | null | undefined): boolean {
  if (!timeline) return false
  if (timeline.activeDays < MIN_CADENCE_ACTIVE_DAYS) return false
  if (timeline.commitsByDay.some((d) => d.date === MONOREPO_BULK_IMPORT_DAY)) return false
  return true
}
