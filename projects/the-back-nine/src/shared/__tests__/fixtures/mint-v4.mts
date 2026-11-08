/**
 * THE VERSION-4 MINT (build 2's KTD6, `docs/plans/features/working-year-surplus-build-spec.md`; insight 150).
 *
 * What a version-4 build wrote is a fact about code no longer in the tree, so these bytes were minted BY a
 * version-4 build: a `git archive` of `88a5d125`, a build that writes version 4 and whose `src` and build
 * configs the go-live commit's parent carries unchanged (checked by content at the go-live), run from inside
 * that archive, importing that build's own `devSeeds`, Keep writer, record
 * doctor, `scenarioFromDraft` and codec. Nothing here may be run from today's tree: today's mint writes
 * version 5, and a fixture minted by today's code agrees with today's code by construction.
 *
 * Re-derive (from the repo root's `projects/the-back-nine`):
 *   1. git archive --format=tar 88a5d1259a3d46ea26faa84db0464bb5b66cf97e -- . > ../v4.tar
 *   2. extract it into an empty folder; link `node_modules` to the checkout's (a junction on Windows),
 *      after `git diff --stat 88a5d125 HEAD -- package.json pnpm-lock.yaml vite.config.ts tsconfig.json`
 *      prints nothing;
 *   3. from inside that folder: ./node_modules/.bin/tsx <this file> <out-dir>
 * `savedAt` (and the record's `mintedAt`) read the wall clock, so a re-run on another day differs in those
 * stamps and nowhere else. The committed bytes were minted on 2026-11-05.
 *
 * The four households (KTD6):
 *  · scenario-v4-date.json — `date`, W confirmed at its own $84,000 quote and fresh, the $16,985 year-0 left
 *    over: the exact population a version-5 build reads as "unanswered".
 *  · scenario-v4-datecoststale-kept.json — `datecoststale` kept through this build's own Keep
 *    (`writeKeptWorkingYearCost`), so its W is an `entered` $84,000 carrying U5's `keptOverQuoteReal`.
 *  · scenario-v4-rec.json — the `?vault=rec` plant's household (`retired`, through `doctorRecordHolds`): a
 *    retired plan holding a saved recommendation and its goal, re-saved through the real save path.
 *  · scenario-v4-maximal.json — the Tier 4 register entry's maximal version-4 plan (*The frozen version-3
 *    fixtures are one seed…*): every income-stream kind, a budget, a Roth plan, Medicare extras, a custom
 *    drawdown order, the subsidy what-if, a state, an heir bracket, a kept W, ticker classifications of
 *    both kinds, every account kind, and a valid saved recommendation with its goal. After the bump no
 *    build writes version 4 again, so this is now or never.
 */
import { mkdirSync, writeFileSync } from 'node:fs'

const ROOT = process.cwd().split(String.fromCharCode(92)).join('/') + '/src'
const [outDir] = process.argv.slice(2)
if (!outDir) throw new Error('usage: tsx mint-v4.mts <out-dir>')
mkdirSync(outDir, { recursive: true })

const { DEV_SEEDS, doctorRecordHolds } = await import(`file:///${ROOT}/ui/devSeeds.ts`)
const { scenarioFromDraft, currentEpochDay } = await import(`file:///${ROOT}/ui/scenarioFromDraft.ts`)
const { draftFromScenario } = await import(`file:///${ROOT}/ui/draftFromScenario.ts`)
const { encodeScenario, decodeScenario } = await import(`file:///${ROOT}/shared/scenarioCodec.ts`)
const { writeKeptWorkingYearCost, isWorkingYearCostStale } = await import(`file:///${ROOT}/intake/workingYearQuote.ts`)
const { FIRST_UNAMBIGUOUS_SAVE_DAY } = await import(`file:///${ROOT}/engine/pricingVersion.ts`)

type Plan = Record<string, unknown>

/** This build's save path: the draft through `scenarioFromDraft`, nothing dropped. */
function save(draft: unknown, what: string): Plan {
  const saved = scenarioFromDraft(draft)
  if (!saved.ready) throw new Error(`${what}: the mint refused the draft: ${saved.detail}`)
  if (saved.droppedAtoms.length) throw new Error(`${what}: the mint dropped ${saved.droppedAtoms.join(', ')}`)
  return saved.scenario as Plan
}

/** A plan holding a saved recommendation, the way `?vault=rec` mints it (the plant's own `savedAt` floor and
 *  doctor), then re-saved through the real save path: hydrate, then `scenarioFromDraft`. */
function withRecord(base: Plan, what: string): Plan {
  const today: number = currentEpochDay()
  const floored = { ...base, savedAt: Math.max((base.savedAt as number | undefined) ?? FIRST_UNAMBIGUOUS_SAVE_DAY, FIRST_UNAMBIGUOUS_SAVE_DAY) }
  const doctored = doctorRecordHolds(floored, today)
  const hydrated = draftFromScenario(doctored)
  if (!hydrated.ok) throw new Error(`${what}: the doctored plan does not hydrate: ${hydrated.detail}`)
  const resaved = save(hydrated.draft, what)
  if (resaved.savedRecommendation === undefined) throw new Error(`${what}: the record did not survive the save`)
  return resaved
}

function write(name: string, plan: Plan, expect: { w: string | null; record: boolean }): void {
  const bytes: Uint8Array = encodeScenario(plan)
  const back = decodeScenario(bytes)
  if (!back.ok) throw new Error(`${name}: this build's codec refused its own mint: ${JSON.stringify(back)}`)
  if (back.droppedAtoms.length) throw new Error(`${name}: this build's codec dropped ${back.droppedAtoms.join(', ')}`)
  const s = back.scenario as Plan & { workingYearCost?: { kind: string; keptOverQuoteReal?: number } }
  if (s.schemaVersion !== 4) throw new Error(`${name}: minted version ${String(s.schemaVersion)}, not 4 — not a version-4 build`)
  const wKind = s.workingYearCost === undefined ? null : s.workingYearCost.keptOverQuoteReal !== undefined ? 'entered-kept' : s.workingYearCost.kind
  if (wKind !== expect.w) throw new Error(`${name}: W reads ${String(wKind)}, expected ${String(expect.w)}`)
  if ((s.savedRecommendation !== undefined) !== expect.record) throw new Error(`${name}: record presence is not ${expect.record}`)
  const file = `${outDir}/${name}`
  writeFileSync(file, bytes)
  console.log(JSON.stringify({ file: name, bytes: bytes.length, schemaVersion: s.schemaVersion, w: wKind, record: expect.record, savedAt: s.savedAt, keys: Object.keys(s) }))
}

// 1. `date` — W confirmed and fresh.
write('scenario-v4-date.json', save(DEV_SEEDS.date, 'date'), { w: 'confirmed', record: false })

// 2. `datecoststale`, kept through this build's own Keep: a stale confirmed $84,000 over today's $78,000.
if (!isWorkingYearCostStale(DEV_SEEDS.datecoststale)) throw new Error('datecoststale is not stale in this build')
const kept = writeKeptWorkingYearCost(DEV_SEEDS.datecoststale)
if (isWorkingYearCostStale(kept)) throw new Error('the Keep left datecoststale stale')
write('scenario-v4-datecoststale-kept.json', save(kept, 'datecoststale-kept'), { w: 'entered-kept', record: false })

// 3. The rec plant's household.
write('scenario-v4-rec.json', withRecord(save(DEV_SEEDS.retired, 'retired'), 'rec'), { w: null, record: true })

// 4. The maximal version-4 plan, on `budget`'s retired couple (its budget reconciles: lines at year 0 plus
//    the medical figure equal the spending figure).
const budget = DEV_SEEDS.budget as Plan & { enteredAccounts: Plan[]; health: Plan }
const blend = { kind: 'exact', stockPct: 60, bondPct: 30, cashPct: 10 }
const maximal = {
  ...budget,
  enteredAccounts: [
    ...budget.enteredAccounts,
    { ownerIndex: 1, kind: '401k', valueToday: 50_000, manualBlend: blend },
    { ownerIndex: 0, kind: '403b', valueToday: 40_000, manualBlend: blend },
    { ownerIndex: 1, kind: 'roth-401k', valueToday: 30_000, manualBlend: blend },
    { ownerIndex: 0, kind: 'brokerage', valueToday: 60_000, basis: 41_000, ticker: 'ZQXS' },
    { ownerIndex: 1, kind: 'hsa', valueToday: 12_000, ticker: 'ZQXE' },
  ],
  tickerClassifications: {
    ZQXS: { kind: 'simple', choice: 'stocks' },
    ZQXE: { kind: 'exact', stockPct: 50, bondPct: 40, cashPct: 10 },
  },
  incomeStreams: [
    { ownerIndex: 0, annualRealToday: 14_000, startAge: 60, colaMode: 'real-flat', survivorPct: 0.5, type: 'pension', taxableFraction: 1 },
    { ownerIndex: 1, annualRealToday: 9_000, startAge: 60, endAge: 80, colaMode: 'nominal-flat', survivorPct: 1, type: 'rental', taxableFraction: 0.8 },
    { ownerIndex: 1, annualRealToday: 6_000, startAge: 60, endAge: 70, colaMode: 'nominal-flat', survivorPct: 0, type: 'alimony', executedAfter2018: false, modifiedAdoptsPost2018Rules: false },
    { ownerIndex: 0, annualRealToday: 5_000, startAge: 70, colaMode: 'fixed-pct', colaPct: 0.02, survivorPct: 1, type: 'annuity', qualified: true },
    { ownerIndex: 1, annualRealToday: 4_000, startAge: 68, colaMode: 'nominal-flat', survivorPct: 0.5, type: 'annuity', qualified: false, exclusionFraction: 0.4 },
    { ownerIndex: 0, annualRealToday: 2_000, startAge: 60, endAge: 75, colaMode: 'real-flat', survivorPct: 0, type: 'other', taxableFraction: 0.5 },
  ],
  health: { ...budget.health, workingYearInvestmentByPerson: [0, 0], employerPlanCoversRetiredMember: false },
  medicareExtrasByPerson: [{ kind: 'entered', monthly: 180 }, { kind: 'unanswered' }],
  rothConversion: { annualAmountReal: 15_000, startYearOffset: 1, years: 3 },
  drawdownPolicy: 'custom',
  drawdownOrder: ['roth', 'pretax', 'taxable'],
  enhancedSubsidies: true,
  retirementState: 'PA',
  heirBracket: 0.32,
  workingYearCost: { kind: 'entered', amountReal: 70_000, entryPeriod: 'year', stateTaxReading: 'class-based', keptOverQuoteReal: 65_600 },
}
write('scenario-v4-maximal.json', withRecord(save(maximal, 'maximal'), 'maximal'), { w: 'entered-kept', record: true })
