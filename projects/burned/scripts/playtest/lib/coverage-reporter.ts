/**
 * Coverage reporter — renders coverage.md (7×2 info-gap grid + absolute
 * ≥50 gate per PRD §8.2).
 *
 * Implementation: Unit 10. Unit 1 ships the signature only.
 */
import type { CoverageReport, FreePlayBudget } from './types'
import type { ScenarioFire } from './scenario-detector'

export function buildCoverageReport(
  _fires: readonly ScenarioFire[],
  _freePlay: FreePlayBudget,
): CoverageReport {
  throw new Error('not implemented')
}

export function renderCoverageMd(_report: CoverageReport): string {
  throw new Error('not implemented')
}
