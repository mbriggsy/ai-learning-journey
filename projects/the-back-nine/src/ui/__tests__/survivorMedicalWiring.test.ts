/**
 * THE SURVIVOR-MEDICAL LEAN'S WIRING (council 2026-10-08, B1 — the register's Tier 1 entry "A budgetless
 * household's out-of-pocket medical shrinks at widowhood…", ⚑ RULED + ⚑ SHIP GATE 1's build notes).
 *
 * The engine half (the composition, the byte-identities, the clamp, R19, the HSA cap's argument) is
 * `src/engine/__tests__/survivorMedicalLean.test.ts`. This file proves the INTAKE half end to end on the
 * real dev seeds:
 *   · `buildParams` emits `survivorOopMedicalReal` exactly when the draft has no budget and an entered
 *     OOP medical — presence-keyed (no key at all otherwise), never beside a budget;
 *   · the field reaches every shipped consumer unaided (ship gate 1, measured): one DATE candidate
 *     (`buildCandidateParams`), one SOLVER candidate (`buildSolveRequest` → `applyCandidate`), one PREVIEW
 *     arm (`buildControlPreviewParams` → `buildArmParams`), on both routes — and through a REAL
 *     MessagePort to the pool's eval side (`serveEvalPort` ⇄ `portLane`);
 *   · it is LIFELONG where the overlay's `oopMedical` stream is window-gated on the date route;
 *   · the DATE-ROUTE TWIN (gate 3): `date65` + an entered M, budgetless, is byte-identical on the full
 *     track to its one-line `compileBudget` twin at every swept offset probed — the identity that holds
 *     only under a lifelong M (ship gate 1, read + measured);
 *   · the staleness exposure (`spending`, ledger v11) reads 'priced' on exactly the census ship gate 1
 *     named: `health`, `healthnc`, `healthgap` — and 'unpriced' wherever the run provably cannot move.
 */
import { describe, expect, it } from 'vitest'
import {
  buildControlPreviewParams,
  buildDateInput,
  buildSpineParams,
  missingRequiredFacts,
  survivorMedicalLeanForRun,
} from '@intake/intakeMap'
import { buildSolveRequest } from '@intake/solveDispatch'
import { buildCandidateParams, DATE_SEARCH_PATHS } from '@engine/dateSearch'
import { applyCandidate } from '@engine/solver/candidates'
import { buildArmParams } from '@engine/roth'
import { simulate, validateParams } from '@engine/simulate'
import { acaEnhancedSubsidyStatus } from '@engine/constants'
import { epochDayFromIsoDate } from '@engine/validation/oracleToken'
import { solverRunFingerprint } from '@engine/validation/solverRunFingerprint'
import { evaluateCall, type EvalCall } from '@engine/validation/evalSteps'
import { portLane, serveEvalPort } from '@engine/engineProtocol'
import { bitEqual } from '../../engine/solver/__tests__/bitIdentity'
import { anchorTarget } from '@budget/budgetToSpending'
import type { BudgetLineItem, SimulationParams } from '@shared/model'
import type { ScenarioDraft } from '@store/memoryModel'
import { DEV_SEEDS, type DevSeedKey } from '../devSeeds'
import { exposureForDraft } from '../stalenessExposure'

const TODAY = epochDayFromIsoDate(acaEnhancedSubsidyStatus.value.verifiedOn) + 5
const M = 4_000

const withOop = (d: ScenarioDraft, oop: number | undefined): ScenarioDraft => {
  const health = { ...d.health } as Record<string, unknown>
  if (oop === undefined) delete health.oopMedicalAnnual
  else health.oopMedicalAnnual = oop
  return { ...d, health: health as unknown as ScenarioDraft['health'] }
}
const spine = (d: ScenarioDraft): SimulationParams => {
  const p = buildSpineParams(d)
  if (p === null) throw new Error('expected spine params')
  return p
}
/** `date65` with an entered M — the date-route twin household ship gate 1 named (66 working / 65
 *  retired, $78,000, r 0.75, no OOP on the roster). */
const date65WithOop = withOop(DEV_SEEDS.date65, M)

describe('B1 — buildParams emits the field only for a budgetless draft with an entered OOP medical', () => {
  it('`health` (budgetless, M $4,000) carries it; the overlay stream is untouched beside it', () => {
    const p = spine(DEV_SEEDS.health)
    expect(p.survivorOopMedicalReal).toBe(M)
    expect(p.budget).toBeUndefined()
    expect(p.overlay?.oopMedical?.every((x) => x === M)).toBe(true)
    expect(validateParams(p)).toBeNull()
  })

  it('PRESENCE-KEYED: a blank OOP writes NO key (never an undefined-valued one, never a 0)', () => {
    const p = spine(withOop(DEV_SEEDS.health, undefined))
    expect('survivorOopMedicalReal' in p).toBe(false)
    expect('survivorOopMedicalReal' in spine(DEV_SEEDS.retired), '`retired` enters none').toBe(false)
    // An explicit 0 is an entered figure: it rides (and composes byte-identically — the engine arm).
    expect(spine(withOop(DEV_SEEDS.health, 0)).survivorOopMedicalReal).toBe(0)
  })

  it('NEVER beside a budget: `budget` (M $6,000 injected sticky by compileBudget) carries the budget and no field', () => {
    const p = spine(DEV_SEEDS.budget)
    expect(p.budget).toBeDefined()
    expect(DEV_SEEDS.budget.health.oopMedicalAnnual).toBe(6_000)
    expect('survivorOopMedicalReal' in p).toBe(false)
    expect(validateParams(p)).toBeNull()
  })
})

describe('the field reaches every shipped consumer unaided (ship gate 1)', () => {
  it('one SOLVER candidate — the solve base and EVERY applied candidate carry M', () => {
    const req = buildSolveRequest({ ...DEV_SEEDS.health, chosenGoal: 'pay-less-tax' }, TODAY)
    if (typeof req === 'string') throw new Error(`the builder refused (${req})`)
    expect(req.base.survivorOopMedicalReal).toBe(M)
    expect(req.candidates.length).toBeGreaterThan(10)
    for (const c of req.candidates) expect(applyCandidate(req.base, c).survivorOopMedicalReal).toBe(M)
  })

  it('the worker wire (structured clone) and the solver-run FINGERPRINT both carry it — a token minted at one M can never bless a solve at another (insight 029: a non-default value through each copying surface)', () => {
    const req = buildSolveRequest({ ...DEV_SEEDS.health, chosenGoal: 'pay-less-tax' }, TODAY)
    if (typeof req === 'string') throw new Error(`the builder refused (${req})`)
    expect(structuredClone(req.base).survivorOopMedicalReal).toBe(M)
    const fp = (base: SimulationParams) =>
      solverRunFingerprint(base, req.candidates, req.ranking, { seedA: req.seedA, tieTolerance: req.tieTolerance })
    const { survivorOopMedicalReal: _m, ...absent } = req.base
    const prints = [fp(req.base), fp(absent), fp({ ...req.base, survivorOopMedicalReal: M + 1 }), fp({ ...req.base, survivorOopMedicalReal: 0 })]
    expect(new Set(prints).size, 'M, absent, M + 1 and 0 are four different runs').toBe(4)
    expect(fp({ ...req.base }), 'and the identity is stable').toBe(prints[0])
  })

  it('the REQUEST side of a REAL MessagePort carries it: a `health` EvalCall sent through serveEvalPort ⇄ portLane answers bit-equal to the direct evaluation, and differs from the same call with M stripped', async () => {
    // The pool fixtures' fake lanes hand the coordinator's request objects over UNcloned, and the arm
    // above only calls structuredClone — so this is the one standing test that sends a base carrying M
    // through the eval worker's real port (insight 029: a non-default value through the copying surface).
    const req = buildSolveRequest({ ...DEV_SEEDS.health, chosenGoal: 'pay-less-tax' }, TODAY)
    if (typeof req === 'string') throw new Error(`the builder refused (${req})`)
    const base: SimulationParams = { ...req.base, paths: 400 }
    expect(base.survivorOopMedicalReal).toBe(M)
    const call: EvalCall = { base, candidates: req.candidates.slice(0, 3), seed: req.seedA, opts: {} }
    const { survivorOopMedicalReal: _m, ...stripped } = base
    const channel = new MessageChannel()
    serveEvalPort(channel.port1)
    const lane = portLane(channel.port2)
    try {
      const reply = await lane.evaluate(call)
      if (!reply.ok) throw new Error(`the eval port answered an engine error (${String(reply.message)})`)
      expect(reply.outcomes).toHaveLength(3)
      expect(bitEqual(reply.outcomes, evaluateCall(call)), 'the port moved no bit').toEqual({ ok: true })
      // Presence companion: M genuinely moves these outcomes (else a port that DROPPED the field would
      // pass the identity above unseen).
      expect(bitEqual(reply.outcomes, evaluateCall({ ...call, base: stripped })).ok, 'M moves the outcomes').toBe(false)
    } finally {
      lane.close()
      channel.port1.close()
    }
  }, 60_000)

  it('one PREVIEW arm — the spine preview params and both arms of every control kind carry M', () => {
    const base = buildControlPreviewParams(DEV_SEEDS.health, undefined)
    if (base === null) throw new Error('expected preview params')
    expect(base.survivorOopMedicalReal).toBe(M)
    const controls = [
      { kind: 'sequencing', policy: 'taxable-first' },
      { kind: 'conversion', plan: { annualAmountReal: 30_000, startYearOffset: 0, years: 3 } },
      { kind: 'subsidy-regime', enhanced: true },
    ] as const
    for (const control of controls) {
      for (const arm of ['with', 'without'] as const) {
        expect(buildArmParams(base, control, arm).survivorOopMedicalReal, `${control.kind} ${arm}`).toBe(M)
      }
    }
  })

  it('one DATE candidate — every probed offset carries the LIFELONG M while the overlay stream is window-gated to 0 before the work-stop', () => {
    const input = buildDateInput(date65WithOop)
    if (input === null) throw new Error('expected a date input')
    expect(input.params.survivorOopMedicalReal).toBe(M)
    for (const Y of [0, 2, 4]) {
      const c = buildCandidateParams(input, Y, DATE_SEARCH_PATHS.provisional)
      expect(c.survivorOopMedicalReal, `Y=${Y}`).toBe(M)
      // The HSA-cap stream is the window-gated one; the scalar is not (gate 1: B1's lifelong M ≡ the
      // budget arm's year-0 composition, never `overlay.oopMedical[t]`).
      if (Y > 0) expect(c.overlay?.oopMedical?.slice(0, Y).every((x) => x === 0), `Y=${Y}: stream gated`).toBe(true)
    }
    // …and the date-route preview (the crowned candidate's params) carries it too.
    expect(buildControlPreviewParams(date65WithOop, 2)?.survivorOopMedicalReal).toBe(M)
  })
})

describe('the DATE-ROUTE twin (gate 3): budgetless `date65` + M ≡ its one-line compileBudget twin, byte-identical on the full track', () => {
  // One scalable essentials line of S − M; compileBudget injects M sticky; the reconciled spend stays S.
  const S = DEV_SEEDS.date65.annualSpendingReal!
  const twinLine: BudgetLineItem = {
    category: 'food',
    label: 'Everything but medical',
    annualAmountReal: anchorTarget(S, M),
    tier: 'essentials',
    startYear: 0,
  }
  const twinDraft: ScenarioDraft = { ...date65WithOop, budget: [twinLine] }

  it.each([0, 2, 5])('offset Y=%i: survival, depletion years and terminals identical; the twin rides a budget, the budgetless run the field', (Y) => {
    const a = buildDateInput(date65WithOop)
    const b = buildDateInput(twinDraft)
    if (a === null || b === null) throw new Error('expected date inputs')
    const budgetless = buildCandidateParams(a, Y, 1_000)
    const twin = buildCandidateParams(b, Y, 1_000)
    expect(budgetless.survivorOopMedicalReal).toBe(M)
    expect(twin.budget).toBeDefined()
    expect('survivorOopMedicalReal' in twin).toBe(false)
    const seed = DEV_SEEDS.date65.seed!
    const x = simulate(budgetless, seed)
    const y = simulate(twin, seed)
    if (x.indeterminate || x.infeasible || y.indeterminate || y.infeasible) throw new Error('expected resolved runs')
    expect(x.distribution.depletionYears).toEqual(y.distribution.depletionYears)
    expect(x.distribution.terminalValuesReal).toEqual(y.distribution.terminalValuesReal)
    expect(x.distribution.survivalFraction).toBe(y.distribution.survivalFraction)
    // Presence companion: the lean is LIVE on this household — dropping M moves the survivor years.
    const flat = simulate({ ...budgetless, survivorOopMedicalReal: undefined }, seed)
    if (flat.indeterminate || flat.infeasible) throw new Error('expected a resolved run')
    expect(flat.distribution.terminalValuesReal).not.toEqual(x.distribution.terminalValuesReal)
  })
})

describe('the staleness exposure — the ledger v11 `spending` family read', () => {
  it('reads PRICED on exactly ship gate 1’s census of the 24 dev seeds: health, healthnc, healthgap', () => {
    const priced = (Object.keys(DEV_SEEDS) as DevSeedKey[]).filter((k) => survivorMedicalLeanForRun(DEV_SEEDS[k]))
    expect(priced).toEqual(['health', 'healthnc', 'healthgap'])
    for (const k of Object.keys(DEV_SEEDS) as DevSeedKey[]) {
      // `datesolo` builds no params (a missing fact by design) — its every read is 'unknown', never 'unpriced'.
      const buildable = missingRequiredFacts(DEV_SEEDS[k]).length === 0
      expect(exposureForDraft(DEV_SEEDS[k]).spending, k).toBe(!buildable ? 'unknown' : priced.includes(k) ? 'priced' : 'unpriced')
    }
    expect((Object.keys(DEV_SEEDS) as DevSeedKey[]).filter((k) => missingRequiredFacts(DEV_SEEDS[k]).length > 0)).toEqual(['datesolo'])
  })

  it('UNPRICED wherever the run provably cannot move — and PRICED for a date-route household that enters M', () => {
    expect(exposureForDraft(withOop(DEV_SEEDS.health, 0)).spending, 'M = 0').toBe('unpriced')
    expect(exposureForDraft(withOop(DEV_SEEDS.health, undefined)).spending, 'blank').toBe('unpriced')
    expect(exposureForDraft({ ...DEV_SEEDS.health, survivorSpendingRatio: 1 }).spending, 'r = 1').toBe('unpriced')
    // r > 1 is refused when committed, but a decoded vault can carry one into the build — and there the
    // lean moves the spend (downward), so it is priced, never silenced.
    expect(exposureForDraft({ ...DEV_SEEDS.health, survivorSpendingRatio: 1.2 }).spending, 'r = 1.2 from a vault').toBe('priced')
    expect(exposureForDraft(DEV_SEEDS.budget).spending, 'a budget holds M sticky already').toBe('unpriced')
    expect(exposureForDraft(date65WithOop).spending, 'date route + M').toBe('priced')
  })

  it('UNKNOWN on an unbuildable draft (silence must be earned)', () => {
    const unbuildable = { ...DEV_SEEDS.health, annualSpendingReal: undefined } as unknown as ScenarioDraft
    expect(exposureForDraft(unbuildable).spending).toBe('unknown')
  })
})
