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
 * LANDMINE: a `?seed` mutates only the in-memory `appModel` (same as a normal
 * intake) — nothing persists to IndexedDB. The ONE deliberate exception is
 * `plantDevVault` below (reached at `?vault=<key>`), which DOES write an encrypted
 * vault — the dev shortcut for exercising decrypt-on-return without re-driving the
 * intake AND the Save ceremony every time. It is equally DEV-gated + DCE'd.
 */
import type { ScenarioDraft } from '@store/memoryModel'
import { scenarioFromDraft } from './scenarioFromDraft'

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
    // C3 → B (simplified): only working-year investment income is stored; the pay half derives
    // from earnedIncomeReal at the boundary. Alex's IRMAA-MAGI = $150k earned + $30k investment
    // = $180k; retired Sam contributes 0. Override unchanged → byte-identical seeded outcome.
    workingYearInvestmentByPerson: [30_000, 0],
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

/**
 * A BORDERLINE already-retired couple — the SPINE route, for the two-pane HONESTY cold-read (D2d):
 * the projection band must draw its $0 depletion-to-ruin tail honestly in the promoted right pane,
 * beside a calm verdict word. 68/70, a single $520k Traditional IRA at 55/35/10 + a $70k Roth, LOW
 * Social Security (PIA 24k/16k) against a ~$71.6k spend, so the SS floor doesn't cover the gap and the
 * downside paths deplete. Lands "borderline, ~7 of 10" (survival ≈ 0.65, verified live against the
 * engine) — most couples make it, but the band's lower percentiles honestly descend toward $0. Older
 * than `retired` on purpose: the shorter horizon keeps the p90 plume from squashing the ruin tail.
 */
const retiredBorderline: ScenarioDraft = {
  people: [
    {
      name: 'Alex',
      sex: 'female',
      birthYear: 1958,
      currentAge: 68,
      workStatus: 'retired',
      retirementAge: 64,
      earnedIncomeReal: 0,
      pia: 24_000,
      socialSecurityClaimAge: 67,
    },
    {
      name: 'Sam',
      sex: 'male',
      birthYear: 1956,
      currentAge: 70,
      workStatus: 'retired',
      retirementAge: 66,
      earnedIncomeReal: 0,
      pia: 16_000,
      socialSecurityClaimAge: 67,
    },
  ],
  enteredAccounts: [
    {
      ownerIndex: 0,
      kind: 'traditional-ira',
      valueToday: 520_000,
      manualBlend: { kind: 'exact', stockPct: 55, bondPct: 35, cashPct: 10 },
    },
    {
      ownerIndex: 1,
      kind: 'roth-ira',
      valueToday: 70_000,
      manualBlend: { kind: 'exact', stockPct: 70, bondPct: 25, cashPct: 5 },
    },
  ],
  incomeStreams: [],
  tickerClassifications: {},
  health: { irmaaMagiSeed: [40_000, 40_000] },
  annualSpendingReal: 71_600,
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
 * A BORDERLINE still-working couple — the DATE route's analog for the honesty cold-read: a confirmed
 * fuck-off date whose projection band STILL touches $0 in its lower percentiles (the council's point:
 * even an on-track date honestly draws the ruin tail). 58/59 both working, a marginal $800k 401(k)-
 * style Traditional IRA + $140k Roth against a $74k spend, so the crowned date (≈ 7 years out, "9 of
 * 10") carries a fan whose p10/p25 descend to $0. CAVEAT for the cold-read: the long decumulation
 * horizon gives a ~$5.7M p90 plume that squashes the ruin tail toward the axis (the parked
 * long-horizon band-scale item) — `borderline` (spine) is the cleaner ruin-tail render. The non-
 * monotone ACA-cliff "doesn't hold" dip is NOT reachable here: v1's proportional drawdown never
 * straddles the 400%-FPL cliff non-monotonically (16 candidates swept) — it needs Act 3's conversion
 * controls to manufacture, so the live cliff dip stays a parked D2c item.
 */
const stillWorkingBorderline: ScenarioDraft = {
  people: [
    {
      name: 'Alex',
      sex: 'female',
      birthYear: 1968,
      currentAge: 58,
      workStatus: 'working',
      earnedIncomeReal: 95_000,
      pia: 26_000,
      socialSecurityClaimAge: 67,
    },
    {
      name: 'Sam',
      sex: 'male',
      birthYear: 1967,
      currentAge: 59,
      workStatus: 'working',
      earnedIncomeReal: 85_000,
      pia: 22_000,
      socialSecurityClaimAge: 67,
    },
  ],
  enteredAccounts: [
    {
      ownerIndex: 0,
      kind: 'traditional-ira',
      valueToday: 800_000,
      manualBlend: { kind: 'exact', stockPct: 65, bondPct: 30, cashPct: 5 },
    },
    {
      ownerIndex: 1,
      kind: 'roth-ira',
      valueToday: 140_000,
      manualBlend: { kind: 'exact', stockPct: 80, bondPct: 15, cashPct: 5 },
    },
  ],
  incomeStreams: [],
  tickerClassifications: {},
  health: {
    enrolledPremiumMonthlyToday: 1_300,
    slcspMonthlyToday: 1_150,
    // C3 → B (simplified): only investment income is stored; pay derives from earnedIncomeReal
    // at the boundary. Both work, pure wages — IRMAA-MAGI = earned ($95k, $85k) + investment
    // ($0, $0). Override unchanged → byte-identical seeded outcome.
    workingYearInvestmentByPerson: [0, 0],
  },
  annualSpendingReal: 74_000,
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
 * A DOA already-FAILING household — the SPINE route's grimmest honest reading, built to cold-read the
 * lever-agnostic figure-LESS "rethink" verdict clause (Council 2026-06-29). Both retired and UNDERWATER
 * from year one: a single $60k Traditional IRA against a $96k spend with low Social Security (PIA 16k/8k
 * ⇒ ~$24k/yr), so the SS floor leaves a ~$72k/yr draw on $60k — every market path depletes inside the
 * first year. Lands "already-failing, 0 of 10": survival ≈ 0 AND median depletion ≤ 2yr (selectOutcome
 * State's early-death reservation), so the verdict renders the figure-less rethink clause, never a
 * sufficient-sounding trim. Old + tiny on purpose: NO market path rescues it, so the state is structural
 * (devSeeds.test.ts pins outcomeState='already-failing' against the REAL engine, not just the validator).
 */
const retiredFailing: ScenarioDraft = {
  people: [
    {
      name: 'Alex',
      sex: 'female',
      birthYear: 1954,
      currentAge: 72,
      workStatus: 'retired',
      retirementAge: 66,
      earnedIncomeReal: 0,
      pia: 16_000,
      socialSecurityClaimAge: 67,
    },
    {
      name: 'Sam',
      sex: 'male',
      birthYear: 1953,
      currentAge: 73,
      workStatus: 'retired',
      retirementAge: 65,
      earnedIncomeReal: 0,
      pia: 8_000,
      socialSecurityClaimAge: 67,
    },
  ],
  enteredAccounts: [
    {
      ownerIndex: 0,
      kind: 'traditional-ira',
      valueToday: 60_000,
      manualBlend: { kind: 'exact', stockPct: 40, bondPct: 40, cashPct: 20 },
    },
  ],
  incomeStreams: [],
  tickerClassifications: {},
  health: { irmaaMagiSeed: [20_000, 20_000] },
  annualSpendingReal: 96_000,
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
  borderline: retiredBorderline,
  dateborder: stillWorkingBorderline,
  failing: retiredFailing,
} satisfies Record<string, ScenarioDraft>

export type DevSeedKey = keyof typeof DEV_SEEDS

/** Resolve a raw `?seed` value to its draft, or null for an unknown key. */
export function resolveDevSeed(key: string): ScenarioDraft | null {
  return key in DEV_SEEDS ? DEV_SEEDS[key as DevSeedKey] : null
}

// ---------------------------------------------------------------------------
// `?vault=<key>` — the decrypt-on-return dev shortcut (DEV-only, DCE'd).
// ---------------------------------------------------------------------------

/** The fixed dev credentials a planted vault is minted with — chosen to clear the real passphrase
 *  floor (verified in `vaultRoundTrip.test.ts`), so `plantDevVault` never trips the KDF gate. The
 *  daily passphrase is what `?vault=<key>` PRE-FILLS on the unlock screen (App), so opening a planted
 *  vault is one click — no typing. Distinct daily/recovery (the `firstSave` negative-pairing gate). */
export const DEV_VAULT_PASSPHRASE = 'plinth otter vivid casket 92 lampoon'
export const DEV_VAULT_RECOVERY = 'lattice harbor cinder vellum 48 thicket'

/**
 * DEV-only: plant an encrypted vault from a dev seed with {@link DEV_VAULT_PASSPHRASE}, so the
 * decrypt-on-return flow (probe → UnlockScreen → hydrate) can be exercised WITHOUT re-driving the
 * intake and the Save ceremony. Idempotent — locks + clears any existing vault first, so reloading
 * `?vault=<key>` re-plants cleanly. The crypto/store graph is DYNAMICALLY imported so this module's
 * static top level stays light (and the whole thing is DEV-gated + DCE'd from prod, like the seeds).
 * Returns the seed's `ScenarioV3` on success (App pre-fills the passphrase + shows the unlock screen)
 * or a reason string for the (dev-only) failure log.
 */
type PlantResult = 'ok' | 'unknown-seed' | 'not-ready' | 'floor-fail' | 'write-failed'

// Memoize the in-flight plant per key so React StrictMode's dev double-invoke of the `?vault` effect
// runs the plant exactly ONCE. Two concurrent plants race the session epoch (the second's lock()
// cancels the first's mid-derive firstSave) and the clear→firstSave window → a spurious write-failed.
// A full page reload re-evaluates this module → fresh memo → re-plants cleanly.
let plantInFlight: { readonly key: string; readonly promise: Promise<PlantResult> } | null = null

export function plantDevVault(key: string): Promise<PlantResult> {
  if (plantInFlight && plantInFlight.key === key) return plantInFlight.promise
  const promise = runPlantDevVault(key)
  plantInFlight = { key, promise }
  return promise
}

async function runPlantDevVault(key: string): Promise<PlantResult> {
  const draft = resolveDevSeed(key)
  if (draft === null) return 'unknown-seed'
  const built = scenarioFromDraft(draft)
  if (!built.ready) return 'not-ready'
  const [{ getVaultSession }, { checkPassphraseFloor }, { clearVault, openVaultDb }] = await Promise.all([
    import('./vaultSession'),
    import('@crypto/kdf'),
    import('@store/db'),
  ])
  const pass = await checkPassphraseFloor(DEV_VAULT_PASSPHRASE)
  const rec = await checkPassphraseFloor(DEV_VAULT_RECOVERY)
  if (!pass.ok || !rec.ok) return 'floor-fail'
  const session = await getVaultSession()
  await session.lock().catch(() => {}) // ensure 'locked' (drop any resident keys from a prior plant)
  await clearVault(await openVaultDb()) // idempotent replace — a prior planted vault would else block firstSave
  const r = await session.firstSave(built.scenario, pass.passphrase, rec.passphrase)
  if (!r.ok) return 'write-failed'
  // firstSave leaves the session UNLOCKED. Lock it so the planter leaves a clean ON-DISK vault the
  // unlock screen can re-open — else unlock() sees status 'unlocked' and refuses ('not-locked'),
  // which is exactly the decrypt-on-return path `?vault` exists to exercise.
  await session.lock()
  return 'ok'
}
