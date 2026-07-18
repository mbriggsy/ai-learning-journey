/**
 * The per-run CONSUMED-CONSTANT derivation (U14 S0.2 — the council's Attack-5 fold; the Act-4
 * reconciliation supersession item 5, insights 080/081/088).
 *
 * The oracle-cleared token's pinning clause evaluates over **the constants the graded run
 * actually consumes** — never the whole registry (a coarse whole-registry read would let a
 * directional NC out-year rate block a Florida household) and never a hand-maintained list
 * (which forks from the engine the first time an overlay gains or drops a constant read).
 * The set is DERIVED from the run's own built `SimulationParams`/`OverlayParams` — the
 * producer's-output shape: the features present on the params select the constant families
 * the engine (or the intake step that baked those features) reads.
 *
 * SOURCE-BINDING (the fold's second half): `consumedConstants.test.ts` greps the live
 * src tree for every registry entry's references and asserts this module's per-entry
 * inclusion agrees with reality — a mapping row that drifts from the engine's actual
 * consumption goes red there, so the mapping cannot silently rot into a hand list.
 *
 * TWO deliberate postures, both documented:
 *  - INTAKE-BAKED constants (the ACA age-rating curve behind the premium streams, the
 *    Medicare-extras typical behind resolved extras dollars, the contribution ceilings
 *    behind accumulation streams): the engine never sees provenance (model.ts pins this),
 *    so presence of the baked FEATURE includes the constant. This can over-include (a
 *    household that hand-entered every dollar still counts the typical as consumed) —
 *    over-inclusion can only over-BLOCK/over-disclose, the conservative direction.
 *  - `solver.*` calibration entries are EXCLUDED from this walk: they are consumed by the
 *    validation harness itself, and their enforcement is the token's own
 *    `epsilon-uncalibrated` clause — including them here would double-report one fact.
 */
import type { SimulationParams } from '@shared/model'
import { ALL_CONSTANTS, isPricedState } from '@engine/constants'
import { isUnsourced, type ConstantEntry } from '@engine/constants/types'
import { productionMarket, survivorSpendingRatio } from '../reference/methodology'

/** One consumed entry: the registry key (or `methodology.*` pseudo-key) + the entry itself. */
export interface ConsumedConstant {
  readonly key: string
  readonly entry: ConstantEntry
}

/**
 * Registry entries with NO run-layer consumer (import-audited against src 2026-07-18; the
 * source-bind test re-asserts every row against the live tree): doc/meta/parked entries whose
 * VALUES price nothing in any run — the rule they describe is either code-embodied (the
 * mfj→single flip, deemed filing, the HSA spend rules), a vintage-stamp text (legalBasis), a
 * deliberately-OUT record (niit — supersession item 1 keeps NIIT out-but-disclosed), or a
 * parked reference figure (partA2026, acaPtc, magiDefinitions, obbbaHsa2026). A doc entry
 * that later goes directional must never falsely block a household — and if one ever GAINS a
 * run-layer importer, the source-bind test forces this set to shrink in the same change.
 *
 * `health.acaEnhancedSubsidyStatus` is excluded for a DIFFERENT reason: it is enforced by the
 * token's own ACA-freshness clause (one fact, one clause — including it here would
 * double-report it through the pinning walk).
 */
const NOT_RUN_CONSUMED: ReadonlySet<string> = new Set([
  'tax.legalBasis',
  'tax.mfjToSingleTransition',
  'tax.niit',
  'tax.inOutRule',
  'socialSecurity.deemedFilingDobCutoff',
  'health.acaPtc',
  'health.partA2026',
  'health.magiDefinitions',
  'health.hsaFourthBucketRules',
  'health.obbbaHsa2026',
  'health.acaEnhancedSubsidyStatus',
])

/**
 * Derive the constants a run consumes, from its own built params/overlay.
 *
 * Family rules (each refined per-entry where the run's flags select within a family):
 *  - `tax.*` — consumed iff the tax overlay is ON (`overlay.taxEnabled`).
 *  - `state.*` — consumed iff `overlay.retirementState` is a PRICED state; only that state's
 *    entries (key prefix `state.<code>`), never a sibling state's.
 *  - `health.*` — consumed iff `overlay.healthcareEnabled`; the applicable-% table follows the
 *    run's regime flag (`enhancedSubsidies` selects the enhanced table, else the statutory
 *    cliff table — one regime per run); `medicareExtrasTypical` requires the priced extras
 *    stream to be present (intake-baked); `Unsourced` sentinels are excluded — they enforce
 *    themselves (`.value` throws in any run that truly consumes one) and the Medicare-trend
 *    block is the token's own S0.4 clause, keyed to the candidate set, not to a run.
 *  - `contributions.*` — consumed iff the accumulation construct is present (the intake's
 *    per-runway-year ceilings baked the contribution streams).
 *  - `socialSecurity.*` — consumed iff any person carries a positive PIA (the pre-loop
 *    benefit sub-engine runs; the FRA tables resolve through every person's birth year).
 *  - `methodology.productionMarket` — consumed iff the run's market moments are byte-equal to
 *    the production default (a user override severs the constant from the run);
 *    `methodology.survivorSpendingRatio` — likewise on the ratio.
 */
export function consumedConstantEntries(params: SimulationParams): readonly ConsumedConstant[] {
  const out: ConsumedConstant[] = []
  const o = params.overlay

  const includeFamily = (prefix: string, perEntry?: (key: string) => boolean): void => {
    for (const [key, entry] of Object.entries(ALL_CONSTANTS)) {
      if (!key.startsWith(prefix)) continue
      if (NOT_RUN_CONSUMED.has(key)) continue // doc/meta/parked — see the set's contract
      if (isUnsourced(entry)) continue // self-enforcing; see the header
      if (perEntry !== undefined && !perEntry(key)) continue
      out.push({ key, entry })
    }
  }

  if (o?.taxEnabled === true) {
    includeFamily('tax.')
  }

  const state = o?.retirementState
  if (state !== undefined && isPricedState(state)) {
    includeFamily(`state.${state.toLowerCase()}`)
  }

  if (o?.healthcareEnabled === true) {
    const enhanced = o.enhancedSubsidies === true
    const extrasPriced = o.medicareExtrasMonthly !== undefined
    includeFamily('health.', (key) => {
      if (key === 'health.acaApplicablePercentage') return !enhanced
      if (key === 'health.acaApplicablePercentageEnhanced') return enhanced
      if (key === 'health.medicareExtrasTypical') return extrasPriced
      return true
    })
  }

  if (o?.accumulation !== undefined) {
    includeFamily('contributions.')
  }

  if (params.people.some((p) => p.pia > 0)) {
    includeFamily('socialSecurity.')
  }

  // Methodology substrate (reference layer — not in ALL_CONSTANTS): consumed only when the
  // run's params still carry the default's own bytes (a user override severs it).
  if (JSON.stringify(params.market) === JSON.stringify(productionMarket.value)) {
    out.push({ key: 'methodology.productionMarket', entry: productionMarket })
  }
  if (params.survivorSpendingRatio === survivorSpendingRatio.value) {
    out.push({ key: 'methodology.survivorSpendingRatio', entry: survivorSpendingRatio })
  }

  return out
}
