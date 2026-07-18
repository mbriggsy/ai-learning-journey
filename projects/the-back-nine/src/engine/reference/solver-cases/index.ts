/** The committed oracle-fixture roster (U14 S2) — the five plan cases + the two
 *  state-dimension companions. Order is the documentation order, not a ranking. */
export { caseConstantRate } from './caseConstantRate'
export { caseBracketFill, CASE_II_HEIR_BRACKET } from './caseBracketFill'
export { caseAcaCliff, CASE_III_HEIR_BRACKET, CASE_III_OVER_AMOUNT, CASE_III_UNDER_AMOUNT } from './caseAcaCliff'
export { caseLeaveMore, CASE_IV_HEIR_BRACKET } from './caseLeaveMore'
export { caseNoChange } from './caseNoChange'
export { caseStateNc, caseStatePa } from './caseStateCompanions'
export { solverCandidateId, type FixturePreconditions, type FixtureState, type SolverCaseFixture } from './types'
export { handBandTop, handMarginalRate, handOrdinaryTax, handProgressiveTax, handStandardDeduction } from './handTax'

import { caseConstantRate } from './caseConstantRate'
import { caseBracketFill } from './caseBracketFill'
import { caseAcaCliff } from './caseAcaCliff'
import { caseLeaveMore } from './caseLeaveMore'
import { caseNoChange } from './caseNoChange'
import { caseStateNc, caseStatePa } from './caseStateCompanions'
import type { SolverCaseFixture } from './types'

export const SOLVER_CASES: readonly SolverCaseFixture[] = [
  caseConstantRate,
  caseBracketFill,
  caseAcaCliff,
  caseLeaveMore,
  caseNoChange,
  caseStateNc,
  caseStatePa,
]
