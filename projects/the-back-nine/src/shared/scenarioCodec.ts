/**
 * The plaintext scenario codec (P1·U4) — the restore SEMANTIC-validation half of R19
 * (strategic review P2: GCM integrity proves the bytes are ours; it proves nothing
 * about their shape. A decoded blob is UNTRUSTED until this codec passes it).
 *
 * DIVISION OF LABOR (deliberate, drift-proof): this codec proves SHAPE — JSON
 * well-formedness, the schemaVersion ladder, field types, enum membership
 * (single-sourced vocab arrays from model.ts), finiteness-FIRST (insight 010: a null
 * or NaN in a number slot is named corruption, never silently coerced), and the
 * integer fields whose integer-ness IS the persistence contract (schemaVersion; seed —
 * the bit-identical reproduction field). The engine's R19 `validateParams` proves
 * SEMANTICS (ranges, sums, age ordering) and remains in the path of every decoded
 * scenario before an answer renders — the codec never re-implements a domain rule,
 * so the two gates cannot disagree.
 *
 * VERSION LADDER: `schemaVersion` is judged BEFORE any other field (the migration
 * enabler). v1/v2/v3 decode today (v3 is the forward-written shape — its arm landed at
 * P2·U8); an INTEGER version above the ladder (now `> 3`) surfaces the calm "saved by a
 * newer version" state. A non-integer version is corruption, not a branch.
 *
 * TOLERANT READER: unknown extra fields pass through untouched — the additive-within-
 * version pattern (hsa, contributions) depends on an older reader accepting a newer
 * sibling's additive optional fields under the SAME schemaVersion.
 */
import {
  ACCOUNT_KINDS,
  BUDGET_CATEGORIES,
  BUDGET_TIERS,
  COLA_MODES,
  DRAWDOWN_POLICIES,
  FILING_STATUSES,
  INCOME_TYPES,
  SEXES,
  SPEND_ENTRY_PERIODS,
  TICKER_CLASSIFICATION_CHOICES,
  WORK_STATUSES,
  type AnyScenario,
  type Scenario,
  type ScenarioV2,
  type ScenarioV3,
} from './model'
import { COLA_PCT_MAX, COLA_PCT_MIN, colaRateInRange } from './incomeBounds'

export type ScenarioDecode =
  | { readonly ok: true; readonly scenario: AnyScenario }
  | { readonly ok: false; readonly reason: 'corrupt'; readonly detail: string }
  | { readonly ok: false; readonly reason: 'newer-version'; readonly got: number }

const utf8Encoder = new TextEncoder()
const utf8Decoder = new TextDecoder()

/** Plaintext bytes for the vault/export: JSON, `schemaVersion` first by construction
 *  (the interfaces declare it first; JSON.stringify preserves declaration order). */
export function encodeScenario(scenario: AnyScenario): Uint8Array<ArrayBuffer> {
  return utf8Encoder.encode(JSON.stringify(scenario)) as Uint8Array<ArrayBuffer>
}

// --- structural check plumbing (exception-based so the first failure names its path) ---

class Corrupt extends Error {
  constructor(readonly detail: string) {
    super(detail)
  }
}

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

function needFinite(o: Obj, field: string, path: string): void {
  if (!isFiniteNumber(o[field])) throw new Corrupt(`${path}.${field}: expected a finite number`)
}

function needInteger(o: Obj, field: string, path: string): void {
  if (!isFiniteNumber(o[field]) || !Number.isInteger(o[field])) {
    throw new Corrupt(`${path}.${field}: expected an integer`)
  }
}

function needString(o: Obj, field: string, path: string): void {
  if (typeof o[field] !== 'string') throw new Corrupt(`${path}.${field}: expected a string`)
}

function needVocab(o: Obj, field: string, vocab: readonly string[], path: string): void {
  const v = o[field]
  if (typeof v !== 'string' || !vocab.includes(v)) {
    throw new Corrupt(`${path}.${field}: expected one of [${vocab.join(', ')}]`)
  }
}

function needArray(v: unknown, path: string): asserts v is readonly unknown[] {
  if (!Array.isArray(v)) throw new Corrupt(`${path}: expected an array`)
}

function needObject(v: unknown, path: string): asserts v is Obj {
  if (!isObj(v)) throw new Corrupt(`${path}: expected an object`)
}

function needBoolean(o: Obj, field: string, path: string): void {
  if (typeof o[field] !== 'boolean') throw new Corrupt(`${path}.${field}: expected a boolean`)
}

/** An OPTIONAL number field: absent passes (the additive contract); present must be finite (insight
 *  010 — a null/NaN in a present number slot is named corruption, never silently coerced). */
function optFinite(o: Obj, field: string, path: string): void {
  if (o[field] !== undefined) needFinite(o, field, path)
}

/** A fraction ∈ [0, 1] (finite FIRST). The income-stream entity scalars (survivorPct / taxableFraction
 *  / exclusionFraction) are multiplied away at compile, so the engine's `validateParams` NEVER receives
 *  them to range-check (KTD-4). By the model's own contract (model.ts IncomeStream doc; sanity.ts) the
 *  restore codec is the THIRD [0,1] gate (with the intake form + the sanity rules), and on the restore
 *  path it is the ONLY one that runs — so an out-of-range-but-finite fraction here is a calm-but-wrong
 *  OPTIMISTIC load (survivorPct > 1 ⇒ the survivor "inherits" >100% of a benefit, inflating a POSITIVE
 *  per-year vector the engine's `finiteNonNeg` backstop cannot catch). NOT engine-domain duplication —
 *  the engine has no such check to drift from. Mirrors sanity.ts's income-*-range rules. */
function needUnitFraction(o: Obj, field: string, path: string): void {
  needFinite(o, field, path)
  const n = o[field] as number
  if (n < 0 || n > 1) throw new Corrupt(`${path}.${field}: expected a fraction in [0, 1]`)
}

/** A fixed-pct COLA rate within the GROUNDED band [COLA_PCT_MIN, COLA_PCT_MAX] (finite FIRST — a NaN
 *  passes every relational compare, insights 008/010). Unlike a [0,1] fraction, a COLA is a RATE with
 *  no definitional bound, so the ceiling is a grounded plausibility bound (src/shared/incomeBounds.ts,
 *  council 2026-07-01). This codec is the SOLE restore-path gate for this multiplied-away overlay
 *  (KTD-4 sibling of needUnitFraction): the compile is deterministic + seedless, so the confidence fan
 *  is structurally blind to an over-optimistic in-range COLA — an out-of-range value here is the
 *  calm-but-wrong never-deplete sin (~$689M/yr from a fat-fingered 0.30), decoded as 'corrupt'. */
function needColaRate(o: Obj, field: string, path: string): void {
  needFinite(o, field, path)
  const n = o[field] as number
  // Reuse the ONE shared predicate the two intake gates use (sanity.ts:414, OtherIncomeEntry.tsx:201)
  // so all THREE gates run byte-identical range logic — the band's inclusivity can never silently
  // desync via a hand-copied comparison (insight 020). needFinite ran first (colaRateInRange assumes a
  // finite caller — a NaN passes every relational compare, insights 008/010).
  if (!colaRateInRange(n)) {
    throw new Corrupt(`${path}.${field}: expected a COLA rate in [${COLA_PCT_MIN.value}, ${COLA_PCT_MAX.value}]`)
  }
}

/** Every present entry of an array of real $ must be finite (a null entry is the JSON shadow of
 *  NaN/Infinity — corruption). */
function checkFiniteArray(v: unknown, path: string): void {
  needArray(v, path)
  v.forEach((entry, i) => {
    if (!isFiniteNumber(entry)) throw new Corrupt(`${path}[${i}]: expected a finite number`)
  })
}

/** Validates a v1/v2 persisted person = the FROZEN {@link PersonInputsLegacy} shape (carries
 *  `socialSecurityReal`, never the live `pia`/`birthYear`). KEEP `socialSecurityReal` here — a
 *  v1/v2 blob never had `pia`; swapping it would mis-validate every legacy blob (plan §10).
 *  U8 (the first v3 writer) adds a SEPARATE `checkPersonV3` that `needFinite(v,'pia')` +
 *  `needInteger(v,'birthYear')` on each people[] entry — it does NOT mutate this legacy validator. */
function checkPerson(v: unknown, path: string): void {
  needObject(v, path)
  needVocab(v, 'sex', SEXES, path)
  needFinite(v, 'currentAge', path)
  needFinite(v, 'retirementAge', path)
  needFinite(v, 'earnedIncomeReal', path)
  needFinite(v, 'socialSecurityReal', path)
  needFinite(v, 'socialSecurityClaimAge', path)
}

/** A contribution stream is AUXILIARY per-year real $ — every present entry must be a
 *  finite number (a null entry is the JSON shadow of NaN/Infinity — corruption). */
function checkContributionStreams(v: unknown, path: string): void {
  needObject(v, path)
  for (const stream of ['taxable', 'pretax', 'roth', 'hsa', 'employerMatch'] as const) {
    const arr = v[stream]
    if (arr === undefined) continue
    needArray(arr, `${path}.${stream}`)
    arr.forEach((entry, i) => {
      if (!isFiniteNumber(entry)) throw new Corrupt(`${path}.${stream}[${i}]: expected a finite number`)
    })
  }
}

function checkAccounts(v: unknown, peopleCount: number, path: string): void {
  needArray(v, path)
  if (v.length !== peopleCount) {
    throw new Corrupt(`${path}: expected exactly ${peopleCount} entries (index-aligned to people)`)
  }
  v.forEach((entry, i) => {
    const p = `${path}[${i}]`
    needObject(entry, p)
    needInteger(entry, 'birthYear', p)
    needFinite(entry, 'taxable', p)
    needFinite(entry, 'taxableBasis', p)
    needFinite(entry, 'pretax', p)
    needFinite(entry, 'roth', p)
    if (entry.hsa !== undefined && !isFiniteNumber(entry.hsa)) {
      throw new Corrupt(`${p}.hsa: expected a finite number`)
    }
    if (entry.contributions !== undefined) checkContributionStreams(entry.contributions, `${p}.contributions`)
  })
}

/** The v1 spine fields (shared verbatim by v2 — additive versioning). */
function checkV1Fields(o: Obj): void {
  needFinite(o, 'initialPortfolio', 'scenario')
  needFinite(o, 'annualSpendingReal', 'scenario')
  needFinite(o, 'stockWeight', 'scenario')
  needFinite(o, 'survivorSpendingRatio', 'scenario')
  needVocab(o, 'drawdownPolicy', DRAWDOWN_POLICIES, 'scenario')
  // The persisted seed carries the bit-identical reproduction contract — a
  // non-integer here means the writer violated it: corruption, not a value.
  needInteger(o, 'seed', 'scenario')
  needArray(o.people, 'scenario.people')
  if (o.people.length === 0) throw new Corrupt('scenario.people: must not be empty')
  o.people.forEach((p, i) => checkPerson(p, `people[${i}]`))
}

function checkV2Fields(o: Obj): void {
  checkV1Fields(o)
  checkAccounts(o.accounts, (o.people as readonly unknown[]).length, 'accounts')
  needVocab(o, 'filing', FILING_STATUSES, 'scenario')
  needInteger(o, 'startCalendarYear', 'scenario')
  needString(o, 'taxVintage', 'scenario')
  needString(o, 'appDefaultVersion', 'scenario')
}

// --- v3 (the forward-written persist shape — P2·U8 · the FIRST v3 writer) --------------------
// The account-level intake truth. SEPARATE validators from the v1/v2 arm (the field shapes differ —
// the live `pia`/`birthYear` person, entered accounts, two discriminated unions); the legacy
// `checkPerson` is NEVER reused or mutated (plan §10). Same finiteness-first / vocab discipline.

/** The v3 live person ({@link PersonInputsV3} = {@link PersonInputs} + name + workStatus). Carries
 *  `pia` + `birthYear` (the live SS fields), NEVER the legacy `socialSecurityReal` — a SEPARATE
 *  validator from {@link checkPerson} so the field-set difference can never be mis-applied (plan §10). */
function checkPersonV3(v: unknown, path: string): void {
  needObject(v, path)
  needVocab(v, 'sex', SEXES, path)
  needFinite(v, 'currentAge', path)
  needInteger(v, 'birthYear', path) // the FRA-lookup key — integer year is the contract
  needVocab(v, 'workStatus', WORK_STATUSES, path) // the discriminant — read BEFORE the field it gates
  // `retirementAge` is a BICONDITIONAL of `workStatus` (council 2026-06-30 — Option B, STRICT form).
  // A retired person's ENTERED stop age is required; a still-working person genuinely HAS no
  // retirement age (the swept fuck-off-date is the ANSWER, never an input — field-fidelity §264), so
  // it must be ABSENT. Present-on-working is the Option-A masquerade artifact: a synthetic value that
  // `questions.tsx`'s flip-to-retired would surface as the user's "entered" age. We REJECT it here at
  // the SOLE restore gate (insight 046) — `optFinite` is deliberately NOT used (it would let a retired
  // person decode with no stop age, weakening the retired invariant; and it would ACCEPT the working
  // masquerade). This is a divergence within an UN-shipped v3 (read+write land atomically at this U8),
  // not a relaxation of a field any shipped reader trusts — tolerant-reader buys ADDING optionals.
  if (v.workStatus === 'retired') {
    needFinite(v, 'retirementAge', path)
  } else if (v.retirementAge !== undefined) {
    throw new Corrupt(`${path}.retirementAge: a still-working person carries no retirement age`)
  }
  needFinite(v, 'earnedIncomeReal', path)
  needFinite(v, 'pia', path) // the live SS field (v3) — never socialSecurityReal
  needFinite(v, 'socialSecurityClaimAge', path)
  needString(v, 'name', path)
}

/** The ticker-classification discriminated union ({@link TickerClassification}): the calm 3-choice
 *  (`simple`) or the exact %-split (`exact`). The `kind` discriminant is a structural literal pair
 *  (no model-exported array), so it is the one inline vocab here. */
function checkTickerClassification(v: unknown, path: string): void {
  needObject(v, path)
  needVocab(v, 'kind', ['simple', 'exact'], path)
  if (v.kind === 'simple') {
    needVocab(v, 'choice', TICKER_CLASSIFICATION_CHOICES, path)
  } else {
    needFinite(v, 'stockPct', path)
    needFinite(v, 'bondPct', path)
    needFinite(v, 'cashPct', path)
    // The exact blend is collapsed downstream by stockWeightForBlend (tickerBlend.ts:1596), which
    // THROWS on any negative component or a zero sum — an UNCAUGHT throw in the hydrate/render builder,
    // never a calm typed failure. The codec is the SOLE restore-path gate, so mirror that exact
    // invariant here (insight 027: derive the guard from the hazard-creator's own domain) → a damaged
    // blend decodes as calm 'corrupt', never a downstream crash. Shares need not sum to 1 (the collapse
    // renormalizes by the actual sum); only ≥ 0 and a positive sum are load-bearing.
    const stockPct = v.stockPct as number
    const bondPct = v.bondPct as number
    const cashPct = v.cashPct as number
    if (stockPct < 0 || bondPct < 0 || cashPct < 0) {
      throw new Corrupt(`${path}: blend components must be ≥ 0`)
    }
    if (stockPct + bondPct + cashPct <= 0) {
      throw new Corrupt(`${path}: blend must not sum to zero`)
    }
  }
}

/** One {@link EnteredAccount} — the entered truth (R35/R36). `ownerIndex` must index into people
 *  (a dangling owner is a fold-time crash); `manualBlend`, when present, is the ticker union. */
function checkEnteredAccount(v: unknown, peopleCount: number, path: string): void {
  needObject(v, path)
  needInteger(v, 'ownerIndex', path)
  const owner = v.ownerIndex as number
  if (owner < 0 || owner >= peopleCount) {
    throw new Corrupt(`${path}.ownerIndex: expected an index into people [0, ${peopleCount})`)
  }
  needVocab(v, 'kind', ACCOUNT_KINDS, path)
  if (v.ticker !== undefined) needString(v, 'ticker', path)
  if (v.manualBlend !== undefined) checkTickerClassification(v.manualBlend, `${path}.manualBlend`)
  needFinite(v, 'valueToday', path)
  optFinite(v, 'basis', path)
  optFinite(v, 'annualContribution', path)
  optFinite(v, 'employerMatchAnnual', path)
  optFinite(v, 'hsaEmployerAnnual', path)
}

/** The household health entry ({@link HealthIntakeV3}) — every field optional (its absence is a
 *  modeled state); a present scalar must be finite, a present MAGI array all-finite. */
function checkHealthIntakeV3(v: unknown, path: string): void {
  needObject(v, path)
  optFinite(v, 'enrolledPremiumMonthlyToday', path)
  optFinite(v, 'slcspMonthlyToday', path)
  optFinite(v, 'oopMedicalAnnual', path)
  if (v.irmaaMagiSeed !== undefined) checkFiniteArray(v.irmaaMagiSeed, `${path}.irmaaMagiSeed`)
  if (v.workingYearInvestmentByPerson !== undefined) {
    checkFiniteArray(v.workingYearInvestmentByPerson, `${path}.workingYearInvestmentByPerson`)
  }
}

/** One {@link IncomeStream} = the common fields + the `type`-keyed tax-treatment union (KTD-6). The
 *  union is erased at restore (`JSON.parse + as`), so this re-validates the FULL arm: each `type`'s
 *  required scalars, and `colaPct` REQUIRED-and-finite under `fixed-pct` (absent ≠ 0 — DND-009, the
 *  optimistic-erosion direction). `ownerIndex` is bounded to people (the type's `0 | 1` reflects the
 *  married-couple precondition; bounding to `peopleCount` is the stricter dangling-reference guard). */
function checkIncomeStreamV3(v: unknown, peopleCount: number, path: string): void {
  needObject(v, path)
  needInteger(v, 'ownerIndex', path)
  const owner = v.ownerIndex as number
  if (owner < 0 || owner >= peopleCount) {
    throw new Corrupt(`${path}.ownerIndex: expected an index into people [0, ${peopleCount})`)
  }
  needFinite(v, 'annualRealToday', path)
  needFinite(v, 'startAge', path)
  optFinite(v, 'endAge', path) // absent ≡ lifetime — never an Infinity/NaN sentinel (DND-009)
  needVocab(v, 'colaMode', COLA_MODES, path)
  if (v.colaMode === 'fixed-pct') needColaRate(v, 'colaPct', path)
  else optFinite(v, 'colaPct', path)
  needUnitFraction(v, 'survivorPct', path) // ∈ [0,1] — the codec is the sole [0,1] gate on restore (KTD-4)
  // The type-keyed tax-treatment union (KTD-6): each arm's required scalars.
  needVocab(v, 'type', INCOME_TYPES, path)
  const type = v.type
  if (type === 'pension' || type === 'rental' || type === 'other') {
    if (v.taxableFraction !== undefined) needUnitFraction(v, 'taxableFraction', path)
  } else if (type === 'alimony') {
    needBoolean(v, 'executedAfter2018', path)
    if (v.modifiedAdoptsPost2018Rules !== undefined) needBoolean(v, 'modifiedAdoptsPost2018Rules', path)
  } else if (type === 'annuity') {
    needBoolean(v, 'qualified', path)
    if (v.qualified === false) needUnitFraction(v, 'exclusionFraction', path) // qualified ⇒ no exclusion field
  }
}

/** One {@link BudgetLineItem} (P3·U9) — shape only (the two-gate rule: domain ranges like
 *  non-negative amounts are the engine/intake gates' job — a bad value compiles into a
 *  profile `validateParams` rejects to a calm indeterminate). The WINDOW relation is
 *  structural (the ownerIndex-bounds precedent): a reversed window has no meaning any
 *  layer can compute on, so it is named corruption here. `endYear` ABSENT = lifelong
 *  (DND-009 — a null/Infinity in the slot is corruption, never coerced). */
function checkBudgetLineItemV3(v: unknown, path: string): void {
  needObject(v, path)
  needVocab(v, 'category', BUDGET_CATEGORIES, path)
  needString(v, 'label', path)
  needFinite(v, 'annualAmountReal', path)
  needVocab(v, 'tier', BUDGET_TIERS, path)
  needInteger(v, 'startYear', path)
  const start = v.startYear as number
  if (start < 0) throw new Corrupt(`${path}.startYear: expected a year offset ≥ 0`)
  if (v.endYear !== undefined) {
    needInteger(v, 'endYear', path)
    if ((v.endYear as number) < start) {
      throw new Corrupt(`${path}.endYear: must be ≥ startYear (a reversed window has no meaning)`)
    }
  }
}

function checkV3Fields(o: Obj): void {
  needArray(o.people, 'scenario.people')
  if (o.people.length === 0) throw new Corrupt('scenario.people: must not be empty')
  o.people.forEach((p, i) => checkPersonV3(p, `people[${i}]`))
  const peopleCount = o.people.length
  needArray(o.enteredAccounts, 'scenario.enteredAccounts')
  o.enteredAccounts.forEach((a, i) => checkEnteredAccount(a, peopleCount, `enteredAccounts[${i}]`))
  needObject(o.tickerClassifications, 'scenario.tickerClassifications')
  for (const [k, val] of Object.entries(o.tickerClassifications)) {
    checkTickerClassification(val, `tickerClassifications.${k}`)
  }
  checkHealthIntakeV3(o.health, 'scenario.health')
  needFinite(o, 'annualSpendingReal', 'scenario')
  needVocab(o, 'spendEntryPeriod', SPEND_ENTRY_PERIODS, 'scenario')
  needFinite(o, 'survivorSpendingRatio', 'scenario')
  needVocab(o, 'drawdownPolicy', DRAWDOWN_POLICIES, 'scenario')
  needVocab(o, 'filing', FILING_STATUSES, 'scenario')
  needInteger(o, 'startCalendarYear', 'scenario')
  needString(o, 'taxVintage', 'scenario')
  needString(o, 'appDefaultVersion', 'scenario')
  // The persisted seed carries the bit-identical reproduction contract — a non-integer means the
  // writer violated it: corruption, not a value (same rule as v1/v2).
  needInteger(o, 'seed', 'scenario')
  needArray(o.incomeStreams, 'scenario.incomeStreams')
  o.incomeStreams.forEach((s, i) => checkIncomeStreamV3(s, peopleCount, `incomeStreams[${i}]`))
  // P3·U9 budget — ADDITIVE-OPTIONAL within v3 (the hsa/contributions tolerant-reader
  // precedent): a pre-U9 vault simply lacks the field and passes; a PRESENT field must
  // be a fully-valid line-item array (an unvalidated field passing the tolerant reader
  // silently is the one place shape drift can hide — burned/063).
  if (o.budget !== undefined) {
    needArray(o.budget, 'scenario.budget')
    o.budget.forEach((b, i) => checkBudgetLineItemV3(b, `budget[${i}]`))
  }
}

/**
 * Decode + structurally validate plaintext vault/export bytes. Never throws: every
 * failure is a typed result the store maps to its calm states ("data damaged" /
 * "saved by a newer version").
 */
export function decodeScenario(bytes: Uint8Array): ScenarioDecode {
  let parsed: unknown
  try {
    parsed = JSON.parse(utf8Decoder.decode(bytes))
  } catch {
    return { ok: false, reason: 'corrupt', detail: 'plaintext is not valid JSON' }
  }
  if (!isObj(parsed)) return { ok: false, reason: 'corrupt', detail: 'plaintext is not a JSON object' }

  // The ladder discriminant — judged before ANY other field is trusted.
  const version = parsed.schemaVersion
  if (!isFiniteNumber(version) || !Number.isInteger(version)) {
    return { ok: false, reason: 'corrupt', detail: 'scenario.schemaVersion: expected an integer' }
  }

  try {
    if (version === 1) {
      checkV1Fields(parsed)
      return { ok: true, scenario: parsed as unknown as Scenario }
    }
    if (version === 2) {
      checkV2Fields(parsed)
      return { ok: true, scenario: parsed as unknown as ScenarioV2 }
    }
    if (version === 3) {
      checkV3Fields(parsed)
      return { ok: true, scenario: parsed as unknown as ScenarioV3 }
    }
  } catch (e) {
    if (e instanceof Corrupt) return { ok: false, reason: 'corrupt', detail: e.detail }
    throw e
  }

  if (version > 3) return { ok: false, reason: 'newer-version', got: version }
  return { ok: false, reason: 'corrupt', detail: `scenario.schemaVersion: ${version} is not a valid version` }
}
