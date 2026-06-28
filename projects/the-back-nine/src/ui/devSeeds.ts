/**
 * devSeeds — DEV-only intake seeds (reached at `?seed=<key>`). Jump straight to a
 * worded result without hand-driving the ~8 intake screens — the ATC-friendly way
 * to cold-read any band/result change.
 *
 * DCE CONTRACT (exactly like the `?preview` harness): IntakeApp gates the read
 * behind `import.meta.env.DEV` and reaches this module by DYNAMIC import, so the
 * whole file — and every value below — is dead-code-eliminated from the prod
 * bundle (proven by grepping `dist/`). It never ships and never counts against
 * the entry-JS budget.
 *
 * EACH EXPORT IS A COMPLETE `ScenarioDraft`: `missingRequiredFacts` is empty and
 * `validateParams(build…)` ACCEPTS (proven by `devSeeds.test.ts` against the REAL
 * engine validator), so a seed always lands on a CONFIDENT — never indeterminate —
 * answer. The fixed `seed` makes the percentile fan REPRODUCIBLE across drives: a
 * render change shows as a render change, never a fresh random draw.
 *
 * LANDMINE: a seed only mutates the in-memory `appModel` (same as a normal
 * intake) — nothing persists to IndexedDB (U8 owns the first Save).
 */
import type { ScenarioDraft } from '@store/memoryModel'

/** A fixed dev CRN seed → the same fan every drive (a reproducible cold-read).
 *  Any uint32 satisfies the engine's integer-seed gate; `ensureSeed` REUSES a
 *  pre-set seed (only mints when absent), so this holds across every recompute. */
const DEV_CRN_SEED = 0xbada55

/**
 * The all-retired, on-track couple Briggsy drove live (2026-06-28) — the SPINE
 * route (both `retired` ⇒ the confidence statement + spine band). 66/65, a single
 * $1M Traditional IRA at 60/30/10, both claiming Social Security at 67. At 66/65
 * nobody is pre-65 (no ACA quote required), but both are ≥ 64 (the IRMAA seed IS
 * required) — the draft carries it.
 */
const retiredOnTrack: ScenarioDraft = {
  people: [
    {
      name: 'Alex',
      sex: 'male',
      birthYear: 1960,
      currentAge: 66,
      workStatus: 'retired',
      retirementAge: 65,
      earnedIncomeReal: 0,
      pia: 30_000,
      socialSecurityClaimAge: 67,
    },
    {
      name: 'Sam',
      sex: 'female',
      birthYear: 1961,
      currentAge: 65,
      workStatus: 'retired',
      retirementAge: 63,
      earnedIncomeReal: 0,
      pia: 24_000,
      socialSecurityClaimAge: 67,
    },
  ],
  enteredAccounts: [
    {
      ownerIndex: 0,
      kind: 'traditional-ira',
      valueToday: 1_000_000,
      // A no-ticker account requires the per-account manual blend (burned/062 —
      // never a silent default). 60/30/10 stocks/bonds/cash.
      manualBlend: { kind: 'exact', stockPct: 60, bondPct: 30, cashPct: 10 },
    },
  ],
  incomeStreams: [],
  tickerClassifications: {},
  health: { irmaaMagiSeed: [80_000, 80_000] },
  annualSpendingReal: 78_000,
  spendEntryPeriod: 'month',
  survivorSpendingRatio: 0.75,
  drawdownPolicy: 'proportional',
  filing: 'mfj',
  startCalendarYear: 2026,
  taxVintage: 'OBBBA-2025',
  appDefaultVersion: 'p2-dev-seed',
  seed: DEV_CRN_SEED,
}

/**
 * A mixed, still-working household — the DATE route (one `working` ⇒ the
 * fuck-off-date surface). Clones the proven `completeDateDraft` shape
 * (intakeMap.test.ts): 58 working / 60 retired, a 401(k) (with contribution +
 * match) and a Roth IRA, a pre-65 retiree so the ACA quote IS required, and the
 * per-person working-year IRMAA MAGI the date route needs.
 */
const stillWorking: ScenarioDraft = {
  people: [
    {
      name: 'Alex',
      sex: 'female',
      birthYear: 1968,
      currentAge: 58,
      workStatus: 'working',
      earnedIncomeReal: 150_000,
      pia: 28_000,
      socialSecurityClaimAge: 67,
    },
    {
      name: 'Sam',
      sex: 'male',
      birthYear: 1966,
      currentAge: 60,
      workStatus: 'retired',
      retirementAge: 58,
      earnedIncomeReal: 0,
      pia: 24_000,
      socialSecurityClaimAge: 67,
    },
  ],
  enteredAccounts: [
    {
      ownerIndex: 0,
      kind: '401k',
      ticker: 'VTI',
      valueToday: 900_000,
      annualContribution: 20_000,
      employerMatchAnnual: 8_000,
    },
    { ownerIndex: 1, kind: 'roth-ira', ticker: 'VFIFX', valueToday: 200_000 },
  ],
  incomeStreams: [],
  tickerClassifications: {},
  health: {
    enrolledPremiumMonthlyToday: 1_100,
    slcspMonthlyToday: 1_000,
    workingYearIrmaaMagiByPerson: [180_000, 0],
  },
  annualSpendingReal: 84_000,
  spendEntryPeriod: 'month',
  survivorSpendingRatio: 0.75,
  drawdownPolicy: 'proportional',
  filing: 'mfj',
  startCalendarYear: 2026,
  taxVintage: 'OBBBA-2025',
  appDefaultVersion: 'p2-dev-seed',
  seed: DEV_CRN_SEED,
}

/** The seed registry — `?seed=<key>` selects one. */
export const DEV_SEEDS = {
  retired: retiredOnTrack,
  date: stillWorking,
} satisfies Record<string, ScenarioDraft>

export type DevSeedKey = keyof typeof DEV_SEEDS

/** Resolve a raw `?seed` value to its draft, or null for an unknown key. */
export function resolveDevSeed(key: string): ScenarioDraft | null {
  return key in DEV_SEEDS ? DEV_SEEDS[key as DevSeedKey] : null
}
