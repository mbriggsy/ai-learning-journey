import type { MultiProjectReport } from '@/types'
import { formatWindowClause } from './format'

/**
 * The close's layered null-degrade display model (Phase 7, ideation §4). Pure — the testable
 * core of the close's render decisions, lifted out of the component's inline JSX so each branch
 * can be pinned by a unit test (the rest of the site tests its logic this way; the close's gates
 * were the lone untested predicate set — code review F10, 2026-05-27).
 *
 * Mirrors the hero's predicates (Phase 3) so the two surfaces degrade identically:
 *   • projects — the structural FLOOR; always present (the site can't render without it).
 *   • tokens + window — iff `tokenWindowDays !== null` (the "did we measure tokens" signal; a
 *     clean clone / CI has no JSONLs → null. NOT `totalTokensProcessed > 0`, which would conflate
 *     a genuine measured-zero with unmeasured).
 *   • authored lines — iff `totalAuthoredLines > 0` (a CI tarball with no git reads 0; never a
 *     "0 lines" beat).
 */
export interface CloseModel {
  projectCount: number
  projectLabel: 'project' | 'projects'
  hasTokens: boolean
  hasAuthored: boolean
  /** Retention-window honesty (ideation §2): the token tally is a window-bounded floor, never a
   *  bare "lifetime" claim. `null` when tokens are unmeasured (the tokens figure is suppressed). */
  windowLine: string | null
}

// Only the fields the gates actually read — keeps the contract (and the tests) narrow.
type CloseInputs = Pick<MultiProjectReport['combined'], 'tokenWindowDays' | 'totalAuthoredLines'>

export function deriveCloseModel(combined: CloseInputs, projectCount: number): CloseModel {
  const windowDays = combined.tokenWindowDays

  return {
    projectCount,
    projectLabel: projectCount === 1 ? 'project' : 'projects',
    hasTokens: windowDays !== null,
    hasAuthored: combined.totalAuthoredLines > 0,
    // Shared honest clause (code review F5) — one wording across Hero/TokensBlock/Close.
    windowLine: formatWindowClause(windowDays),
  }
}
