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
 * so the two gates cannot disagree. It moves no field, and it changes the parsed object in
 * exactly two ways: it relabels a version-3, -4, -5, -6, -7, -8 or -9 plan (the steps below), and it deletes a
 * savedRecommendation that fails its checks — the one tolerated atom, reported on
 * `droppedAtoms` (the bottom of `checkV3Fields`, and the 5 → 6 step). Anything else it returns is the disk's.
 *
 * VERSION LADDER: `schemaVersion` is judged BEFORE any other field (the migration
 * enabler). An integer above {@link CURRENT_SCHEMA_VERSION} surfaces the calm "saved by a
 * newer version" state, judged first, before any arm runs. Then each version has its own arm:
 *   · 1 and 2 decode as-is (legacy ladder members; the hydrate gate refuses them).
 *   · 3 is a LABEL-ONLY step: since the schema-v4 bump (2026-10-31) versions 3 and 4 carry the
 *     identical field set, so the step relabels the parsed plan to its LITERAL successor, 4, in
 *     place, and hands it to the next arm. It names the successor, never the current constant,
 *     so a later bump's own step can never be skipped. It reads version 3 FOREVER: a backup keeps
 *     the version of the save it was cut from, and a copy older than the bump can still make a
 *     real first save. Nothing after the relabel can tell which label the disk held, so nothing
 *     may key provenance on the in-memory `schemaVersion` (key it on the plan's shape).
 *   · 4 is a LABEL-ONLY step too (the schema-v5 bump, build 2's go-live): version 5 adds ONE
 *     OPTIONAL field, the left-over answer, which no version-3 or version-4 build ever writes, so
 *     a relabeled older plan lacks a key its type already calls optional — honest without a
 *     default (`docs/architecture.md` §7.3's added-optional-field case). It refuses first a plan
 *     whose disk label is 3 or 4 and that carries the answer: no build that writes those labels
 *     writes it, so it is a writer bug, named. Then it relabels to its LITERAL successor, 5, and
 *     reads version 4 forever, for the reasons above.
 *   · 5 is a LABEL-ONLY step too (the schema-v6 bump, the workbench plan's KTD16): version 6 adds
 *     three OPTIONAL shapes — a stable id on each entered account and budget line, the kept what-ifs
 *     list, and the saved recommendation's Roth plan — which no build writing 3 to 5 writes, so a
 *     relabeled older plan lacks keys its type already calls optional, and the step MINTS NOTHING (ids
 *     are minted where a draft enters, `draftFromScenario`). It refuses first a plan whose disk label
 *     is 3 to 5 and that carries an id or the list (a writer bug, named), and drops a record carrying
 *     the Roth plan under such a label (the record's own tolerated path). Then it relabels to its
 *     LITERAL successor, 6, and reads version 5 forever.
 *   · 6 → 7 (gap 3's saved shapes: the inherited-IRA kind, its facts and its pace lever), LABEL ONLY: it
 *     refuses first a plan whose disk label is 3 to 6 and that carries any of the three (a writer bug,
 *     named), then relabels to its LITERAL successor, 7, and reads version 6 forever.
 *   · 7 → 8 (gap 4's U2: a budget line's repeat and its own rate), LABEL ONLY: it refuses first a plan
 *     whose disk label is 3 to 7 and that carries either field on a plan line or on a kept what-if's
 *     added or replacing line (a writer bug, named), then relabels to its LITERAL successor, 8, and
 *     reads version 7 forever.
 *   · 8 → 9 (gap 5's U1: the one-time money list), LABEL ONLY: it refuses first a plan whose disk label is
 *     3 to 8 and that carries the list (a writer bug, named), then relabels to its LITERAL successor, 9, and
 *     reads version 8 forever.
 *   · 9 → 10 (gap 5's U7: the home-sale kind on that list), LABEL ONLY: it refuses first a plan whose disk
 *     label is 3 to 9 and that carries a home sale (a writer bug, named), then relabels to its LITERAL
 *     successor, 10, and reads version 9 forever.
 *   · {@link CURRENT_SCHEMA_VERSION} runs the field checks (`checkV3Fields` — they name the v3
 *     field GENERATION, which versions 4 to 10 carry, plus the fields versions 5 to 10 added).
 * A non-integer version, or one below 1, is corruption, not a branch.
 *
 * TOLERANT READER: unknown extra fields pass through untouched — the additive-within-
 * version pattern (hsa, contributions) depends on an older reader accepting a newer
 * sibling's additive optional fields under the SAME schemaVersion. Which new fields may
 * stay additive and which must bump the version is ruled once, in `docs/architecture.md`
 * §7.3 (from the older reader's side: would it answer differently, refuse the value, or drop
 * it on save?).
 */
import {
  ACCOUNT_KINDS,
  BUDGET_CATEGORIES,
  BUDGET_TIERS,
  COLA_MODES,
  DRAWDOWN_ORDER_KEYS,
  DRAWDOWN_POLICIES,
  FILING_STATUSES,
  INCOME_TYPES,
  MEDICARE_EXTRAS_KINDS,
  RECOMMENDATION_GOALS,
  ROTH_CONVERSION_CHOICE_KINDS,
  SAVED_AT_EPOCH_DAY_MAX,
  SAVED_AT_EPOCH_DAY_MIN,
  SAVED_RECOMMENDATION_GRADES,
  SEXES,
  SPEND_ENTRY_PERIODS,
  STATE_ROSTER,
  TICKER_CLASSIFICATION_CHOICES,
  WHAT_IF_LEVER_KINDS,
  WHAT_IF_SPENDING_OPS,
  WORK_STATUSES,
  WORKING_YEAR_COST_KINDS,
  WORKING_YEAR_LEFT_OVER_KINDS,
  WORKING_YEAR_STATE_TAX_READINGS,
  INHERITED_ASKED_FIGURE_KINDS,
  INHERITED_LEFT_TO,
  INHERITED_PACE_KINDS,
  ONE_TIME_INFLOW_KINDS,
  CURRENT_SCHEMA_VERSION,
  type OneTimeInflowKind,
  type AnyScenario,
  type Scenario,
  type ScenarioV2,
  type CurrentScenario,
  type WhatIfLeverKind,
  type WhatIfSpendingOp,
} from './model'
import { COLA_PCT_MAX, COLA_PCT_MIN, colaRateInRange } from './incomeBounds'
import { EVERY_YEARS_MAX, EVERY_YEARS_MIN, GROWTH_RATE_MAX, GROWTH_RATE_MIN, everyYearsInRange, growthRateInRange } from './spendingBounds'

/**
 * The generous real-$ magnitude ceiling for the amount fields the codec is the SOLE restore gate for
 * (a budget line item + the Roth-conversion plan amount — the insight-046 summed/derived-away class the
 * engine never sees RAW). MIRRORS the engine's computable-domain cap `ENGINE_MAX_DOLLAR`
 * (src/engine/simulate.ts): every real-$ input the engine can compute on is ≤ that cap — its
 * `finiteNonNeg` gate rejects a larger `initialPortfolio`/`annualSpendingReal` and every per-year
 * vector — so a single field above it is corruption the engine would reject downstream ANYWAY, named
 * LOUD here instead of clamped silent. Re-declared (not imported) because src/shared is a leaf that must
 * NOT import engine (the eslint layer ban); a source-bind test asserts the two are EQUAL so the mirror
 * can never silently drift (the incomeBounds COLA_PCT_MAX precedent). Contract: reject corruption loudly,
 * generous enough that no real household is ever rejected ($1e12 in a single budget line / conversion
 * year is unreachable for a real couple).
 */
export const MAX_REAL_DOLLAR = 1e12

export type ScenarioDecode =
  | {
      readonly ok: true
      readonly scenario: AnyScenario
      /**
       * WHAT THE DECODE THREW AWAY TO STAY OPEN — the NON-FATAL DROP, made VISIBLE (U17 F-pass).
       *
       * EMPTY ARRAY when nothing was dropped: an empty list IS the absence (the `incomeStreams`
       * precedent), never `undefined`/optional — an optional field here would let a caller
       * `if (decoded.droppedAtoms)` its way past the check on the exact codepath where a drop had
       * happened, which is how a silent drop gets re-introduced.
       *
       * WHY IT EXISTS AT ALL. The tolerated drop (today: `savedRecommendation`) was charter'd for
       * the READ side — "a household's whole plan must never become unopenable because its
       * recommendation memory went bad". But `scenarioFromDraft` runs
       * `decodeScenario(encodeScenario(candidate))` as its SAVE gate, so on the WRITE side the
       * same tolerance silently DELETED a freshly-minted-but-invalid record and still reported
       * `ready: true` — the household is told "Saved" about a record the vault does not have.
       * Nothing in the read-side charter justifies that. The drop is now REPORTED and each caller
       * rules on it (write side: a minter defect, refuse; read side: ignore, deliberately — see
       * the comments at those sites).
       *
       * FORMAT: one entry per dropped atom, `"<field>: <the codec's own named reason>"`. The atom
       * name leads so a caller can name WHICH memory was lost; the codec's detail rides along so
       * the refusal can say WHY without a second validation pass.
       */
      readonly droppedAtoms: readonly string[]
    }
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

/** An OPTIONAL boolean field: absent passes (the additive contract); present must be a real
 *  boolean. Deliberately NOT truthiness — a persisted `"false"`/`0` would coerce to the WRONG
 *  arm on a field where `false` is the answer that withholds an answer
 *  (`health.employerPlanCoversRetiredMember`), so a non-boolean is named corruption. */
function optBoolean(o: Obj, field: string, path: string): void {
  if (o[field] !== undefined) needBoolean(o, field, path)
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
  // Reuse the ONE shared predicate the two intake gates use (sanity.ts:603, incomeForm.ts:124)
  // so all THREE gates run byte-identical range logic — the band's inclusivity can never silently
  // desync via a hand-copied comparison (insight 020). needFinite ran first (colaRateInRange assumes a
  // finite caller — a NaN passes every relational compare, insights 008/010).
  if (!colaRateInRange(n)) {
    throw new Corrupt(`${path}.${field}: expected a COLA rate in [${COLA_PCT_MIN.value}, ${COLA_PCT_MAX.value}]`)
  }
}

/** A real-$ amount that must not exceed {@link MAX_REAL_DOLLAR} (the computable-domain ceiling). The
 *  restore codec is the SOLE gate for amounts summed/derived away before the engine (insight 046); an
 *  absurd magnitude is corruption the engine's own domain gate would reject downstream — named LOUD
 *  here. Assumes needFinite ran first (a NaN passes every relational compare — insights 008/010). */
function needAtMostMaxDollar(o: Obj, field: string, path: string): void {
  if ((o[field] as number) > MAX_REAL_DOLLAR) {
    throw new Corrupt(`${path}.${field}: exceeds the ${MAX_REAL_DOLLAR} real-$ computable-domain ceiling (corruption)`)
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

// --- v3 (the current field set — first written at P2·U8 as version 3; written as version 4, 5, 6, 7 and 8
// since the schema-v4, -v5, -v6, -v7 and -v8 bumps, each label-only, so these checks judge them all) ---
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
    // The exact blend is collapsed downstream by stockWeightForBlend (tickerBlend.ts:1608), which
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

/** A stable id (schema version 6): a non-empty string. Returns it. */
function needId(o: Obj, field: string, path: string): string {
  needString(o, field, path)
  const id = o[field] as string
  if (id.length === 0) throw new Corrupt(`${path}.${field}: expected a non-empty id`)
  return id
}

/** Ids are unique within their kind (schema version 6): two accounts, or two budget lines, sharing an
 *  id would let one kept what-if's lever name two entries at once. An absent id is skipped — a
 *  version-5 plan relabeled to 6 carries none until `draftFromScenario` mints them at open. */
function needUniqueIds(entries: readonly unknown[], path: string): void {
  const seen = new Set<string>()
  entries.forEach((e, i) => {
    const id = (e as Obj).id
    if (id === undefined) return
    if (seen.has(id as string)) {
      throw new Corrupt(`${path}[${i}].id: "${String(id)}" is already another entry's id (ids are unique within their kind)`)
    }
    seen.add(id as string)
  })
}

/** One {@link EnteredAccount} — the entered truth (R35/R36). `ownerIndex` must index into people
 *  (a dangling owner is a fold-time crash); `manualBlend`, when present, is the ticker union.
 *  `id` (schema version 6, optional): a non-empty string, unique among the accounts (checked by the
 *  caller). §7.3, from a version-5 copy's side: (a) no — no params builder reads an id, so the answer
 *  never moves; (b) no — a version-5 codec passes an unknown key nested in an account; (c) YES — a
 *  version-5 copy's account editor rebuilds the account from its form without the id, and its Add mints
 *  none, so one save there strips the target a kept what-if's deposits lever names. That is the bump's
 *  own case: version 6, which such a copy refuses calmly. */
function checkEnteredAccount(v: unknown, peopleCount: number, path: string): void {
  needObject(v, path)
  if (v.id !== undefined) needId(v, 'id', path)
  needInteger(v, 'ownerIndex', path)
  const owner = v.ownerIndex as number
  if (owner < 0 || owner >= peopleCount) {
    throw new Corrupt(`${path}.ownerIndex: expected an index into people [0, ${peopleCount})`)
  }
  needVocab(v, 'kind', ACCOUNT_KINDS, path)
  // The inherited-IRA kind and its facts (schema version 7, U13): present exactly together, both directions (as a
  // custom withdrawal order is checked against its order). The kind takes no basis and no deposits (KTD20): a stored
  // one would be a writer bug the account form refuses (`buildAccount`).
  if (v.kind === 'inherited-ira') {
    refuseFields(v, ['basis', 'annualContribution', 'employerMatchAnnual', 'hsaEmployerAnnual'], path, 'an inherited IRA takes no basis and no deposits')
    checkInheritedIraV7(v.inherited, peopleCount, `${path}.inherited`)
  } else {
    refuseFields(v, ['inherited'], path, "only an 'inherited-ira' account carries inherited facts")
  }
  if (v.ticker !== undefined) needString(v, 'ticker', path)
  if (v.manualBlend !== undefined) checkTickerClassification(v.manualBlend, `${path}.manualBlend`)
  // P3·U11 (the filed insight-046 follow-up): every account dollar gets the full RANGE gate,
  // not finiteness alone — a negative or absurd-magnitude balance/contribution is corruption
  // (the engine sees only the SUMMED initialPortfolio, so a negative entry hiding inside a
  // positive sum escapes its non-negativity backstop — the multiplied-away class).
  needFinite(v, 'valueToday', path)
  needNonNegativeDollar(v, 'valueToday', path)
  for (const field of ['basis', 'annualContribution', 'employerMatchAnnual', 'hsaEmployerAnnual'] as const) {
    if (v[field] !== undefined) {
      needFinite(v, field, path)
      needNonNegativeDollar(v, field, path)
    }
  }
}

/** A finite real-$ amount ≥ 0 within the computable-domain ceiling (insight 046), in one call. */
function needDollar(o: Obj, field: string, path: string): void {
  needFinite(o, field, path)
  needNonNegativeDollar(o, field, path)
}

/**
 * An inherited IRA's saved facts ({@link InheritedIraV7}, schema version 7, U13): their SHAPES. Every year is an integer
 * and every dollar finite, ≥ 0 and inside the computable domain (insight 046: a computed figure's December balance is
 * divided away before the engine sees it, so the codec is its only range gate on restore). The owner was born no later
 * than the death. The optional answers are real booleans, and the ten-years-younger answer is stored only as `true`
 * (a "no" is refused at intake, never saved). Each asked-figure kind carries exactly its own fields. The earlier
 * withdrawals run in strictly ascending calendar years, all before the asked year. Who gets the account if the heir dies
 * first is required for a couple and absent for one person (the engine's own gate). The pace is in its vocabulary, with
 * a chosen last year exactly on `even-to-year`.
 *
 * What the codec does NOT judge: whether each optional answer is present exactly where the rule asks it, a death
 * before 2020, or the cross-check. Those read the law's required beginning date and the heir's age (the engine's
 * producer, `src/engine/inheritedRmd.ts`), which this leaf layer cannot import; intake's inherited-IRA rules re-check
 * the stored facts on every read (`src/intake/inheritedIra.ts`), and a plan that fails them is refused by name there,
 * never called damaged here.
 */
function checkInheritedIraV7(v: unknown, peopleCount: number, path: string): void {
  needObject(v, path)
  needInteger(v, 'ownerBirthYear', path)
  needInteger(v, 'ownerDeathYear', path)
  if ((v.ownerDeathYear as number) < (v.ownerBirthYear as number)) {
    throw new Corrupt(`${path}.ownerDeathYear: the owner cannot die before being born`)
  }
  optBoolean(v, 'ownerBornFirstHalf', path)
  optBoolean(v, 'ownerDiedBeforeApril1', path)
  if (v.heirMoreThanTenYearsYounger !== undefined && v.heirMoreThanTenYearsYounger !== true) {
    throw new Corrupt(`${path}.heirMoreThanTenYearsYounger: stored only as true (a "no" is refused at intake, never saved)`)
  }
  needInteger(v, 'askedYear', path)
  const askedYear = v.askedYear as number
  needObject(v.askedFigure, `${path}.askedFigure`)
  const figure = v.askedFigure
  const fp = `${path}.askedFigure`
  needVocab(figure, 'kind', INHERITED_ASKED_FIGURE_KINDS, fp)
  const FIGURE_FIELDS = { 'not-asked': [], custodian: ['figure', 'decemberBalance'], computed: ['decemberBalance'], 'death-year': ['untaken'] } as const
  const own: readonly string[] = FIGURE_FIELDS[figure.kind as keyof typeof FIGURE_FIELDS]
  for (const f of own) needDollar(figure, f, fp)
  refuseFields(figure, ['figure', 'decemberBalance', 'untaken'].filter((f) => !own.includes(f)), fp, `not part of a '${String(figure.kind)}' figure`)
  needDollar(v, 'takenInAskedYear', path)
  if (v.deathYearUntaken !== undefined) needDollar(v, 'deathYearUntaken', path)
  needArray(v.earlierWithdrawals, `${path}.earlierWithdrawals`)
  let before = -Infinity
  v.earlierWithdrawals.forEach((e, i) => {
    const ep = `${path}.earlierWithdrawals[${i}]`
    needObject(e, ep)
    needInteger(e, 'calendarYear', ep)
    const year = e.calendarYear as number
    if (year <= before) throw new Corrupt(`${ep}.calendarYear: the earlier withdrawals run in strictly ascending years`)
    if (year >= askedYear) throw new Corrupt(`${ep}.calendarYear: an earlier withdrawal is for a year before the asked year ${askedYear}`)
    before = year
    needDollar(e, 'amount', ep)
  })
  if (peopleCount > 1) needVocab(v, 'leftTo', INHERITED_LEFT_TO, path)
  else refuseFields(v, ['leftTo'], path, 'who gets it if the heir dies first is asked of a couple only')
  checkInheritedPaceV7(v.pace, `${path}.pace`)
}

/** The fields only a home sale carries ({@link OneTimeHomeSale}): refused on an inheritance or gift. */
const HOME_SALE_FIELDS = ['soldForReal', 'paidDollars', 'mainHome', 'closed'] as const

/** One piece of one-time money in ({@link OneTimeInflow}, schema versions 9 and 10; gap 5's plan, KTD10): its SHAPE
 *  only. Common to both kinds: the id a non-empty string (unique across the list, checked by the caller); the kind in
 *  the vocabulary (a version-9 plan carrying a home sale is refused before this, by the 9 → 10 step); the name a
 *  string; the year an integer, with no floor or ceiling against `startCalendarYear` (intake re-asks a year out of
 *  range and the engine refuses one by name: gap 4's KTD9 precedent); the amount finite, at least $0 and inside the
 *  computable domain (insight 046: the year-end credit adds it away before the engine's own range gate). Then each
 *  kind's own arm: {@link checkOneTimeGiftV9} or {@link checkOneTimeHomeSaleV10}, each refusing the other kind's fields.
 *  Returns the id. §7.3, from an older copy's side: (a) yes at both bumps — a version-8 copy would run the plan
 *  without the money, and a version-9 copy refuses the home-sale kind as damaged (read as a gift it would count the
 *  kept money with no tax on the gain), so the plan must not open there; hence each bump and its step's refusal. */
function checkOneTimeInflowV9(v: unknown, peopleCount: number, path: string): string {
  needObject(v, path)
  const id = needId(v, 'id', path)
  needVocab(v, 'kind', ONE_TIME_INFLOW_KINDS, path)
  needString(v, 'name', path)
  needInteger(v, 'year', path)
  needDollar(v, 'amountReal', path)
  const kind = v.kind as OneTimeInflowKind
  switch (kind) {
    case 'gift':
      checkOneTimeGiftV9(v, peopleCount, path)
      break
    case 'homeSale':
      checkOneTimeHomeSaleV10(v, path)
      break
    default: {
      const _exhaustive: never = kind
      return _exhaustive
    }
  }
  return id
}

/** An inheritance or gift's own arm ({@link OneTimeGift}, version 9): the amount above $0; no home-sale field; the
 *  heir fields (KTD12) as a pair on a couple's plan, the heir an index into `people`, and never on a one-person plan
 *  (gap 3's `leftTo` rule). */
function checkOneTimeGiftV9(v: Obj, peopleCount: number, path: string): void {
  if ((v.amountReal as number) <= 0) {
    throw new Corrupt(`${path}.amountReal: an inheritance or gift is above $0 (an item with none is deleted, never saved)`)
  }
  refuseFields(v, HOME_SALE_FIELDS, path, 'only a home sale carries what it sells for, what was paid, whether it was the main home and whether it closed')
  if (peopleCount > 1) {
    if (v.heirIndex !== undefined) {
      needInteger(v, 'heirIndex', path)
      const heir = v.heirIndex as number
      if (heir < 0 || heir >= peopleCount) throw new Corrupt(`${path}.heirIndex: expected an index into people (0 to ${peopleCount - 1})`)
      needVocab(v, 'leftTo', INHERITED_LEFT_TO, path)
    } else {
      refuseFields(v, ['leftTo'], path, 'who it goes to if the heir dies first is asked only of an item that is one person’s')
    }
  } else {
    refuseFields(v, ['heirIndex', 'leftTo'], path, 'whose it is is asked of a couple only')
  }
}

/** A home sale's own arm ({@link OneTimeHomeSale}, version 10; R4, R17): what it sells for, finite, above $0 and inside
 *  the computable domain; what was paid, finite, at least $0 and inside it; the main-home answer a boolean; what is
 *  kept at most what it sells for; `closed` only as the literal `true` (absent is not closed) and only with $0 kept;
 *  no heir fields, on any plan (a home is the household's). */
function checkOneTimeHomeSaleV10(v: Obj, path: string): void {
  needDollar(v, 'soldForReal', path)
  if ((v.soldForReal as number) <= 0) {
    throw new Corrupt(`${path}.soldForReal: a home sale sells for above $0`)
  }
  needDollar(v, 'paidDollars', path)
  needBoolean(v, 'mainHome', path)
  if ((v.amountReal as number) > (v.soldForReal as number)) {
    throw new Corrupt(`${path}.amountReal: what is kept from a home sale is at most what it sells for`)
  }
  if (v.closed !== undefined) {
    if (v.closed !== true) throw new Corrupt(`${path}.closed: expected the literal true (a sale not closed carries no key)`)
    if ((v.amountReal as number) !== 0) {
      throw new Corrupt(`${path}.amountReal: a sale saved as closed keeps $0 (its money is in the balances already)`)
    }
  }
  refuseFields(v, ['heirIndex', 'leftTo'], path, 'a home is the household’s, so a home sale names no heir')
}

/** An inherited IRA's pace ({@link InheritedPace}): the kind in its vocabulary, and a chosen last year (an integer)
 *  exactly on `even-to-year`, both directions. Read by the account's facts and by the pace lever. */
function checkInheritedPaceV7(v: unknown, path: string): void {
  needObject(v, path)
  needVocab(v, 'kind', INHERITED_PACE_KINDS, path)
  if (v.kind === 'even-to-year') needInteger(v, 'lastYear', path)
  else refuseFields(v, ['lastYear'], path, "only an 'even-to-year' pace carries a chosen last year")
}

/** A real-$ amount that must be ≥ 0 AND within the computable-domain ceiling (assumes
 *  needFinite ran first — insights 008/010). The negative arm is the insight-046 sibling of
 *  {@link needAtMostMaxDollar}: a negative entry inside a positive SUM escapes the engine's
 *  non-negativity backstop, silently shrinking a sibling's contribution to the total. */
function needNonNegativeDollar(o: Obj, field: string, path: string): void {
  if ((o[field] as number) < 0) {
    throw new Corrupt(`${path}.${field}: expected a non-negative real-$ amount (corruption)`)
  }
  needAtMostMaxDollar(o, field, path)
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
  // Additive-optional within v3 (no version bump): absent ⇒ unanswered, and unanswered is a
  // MISSING FACT for a mixed pre-65 household, never a silent "covered".
  optBoolean(v, 'employerPlanCoversRetiredMember', path)
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

/** One {@link BudgetLineItem} (P3·U9) — shape PLUS the one amount-domain rule the engine
 *  cannot backstop: NON-NEGATIVITY is checked HERE because the engine's gate sees only
 *  the POST-SUMMATION profile — an offsetting pair (+200/−100, same tier + window) nets
 *  to a positive slot and sails past `validateParams`, silently UNDERSTATING spend (the
 *  optimistic cardinal direction). That is insight 046's netted-away class, which the
 *  two-gate rule assigns to the codec (the sole restore gate for values multiplied/summed
 *  away before the engine). The WINDOW relation is structural (the ownerIndex-bounds
 *  precedent): a reversed window has no meaning any layer can compute on. `endYear`
 *  ABSENT = lifelong (DND-009 — a null/Infinity in the slot is corruption, never coerced).
 *  `id` (schema version 6, optional): a non-empty string, unique among the plan's lines (checked by
 *  the caller). §7.3, from a version-5 copy's side: (a) no — the budget compile reads no id; (b) no —
 *  an unknown key nested in a line passes; (c) partly — a version-5 budget editor carries a line's
 *  unknown keys through an edit, but its Add mints a line with none. It rides the account id's bump.
 *  `everyYears` and `growthRate` (schema version 8, gap 4's U2, both optional): each in its band from
 *  `spendingBounds.ts`, the restore path's only range gate on the raw value (insights 046 and 050: the compile
 *  turns them into windows and factors the engine sees only as dollars). §7.3, from a version-7 copy's side:
 *  (a) yes — its compile would charge the line every year at prices, so the plan must not open there; hence
 *  the bump and the 7 → 8 step's refusal. Both run through this one check on a plan line and on a kept
 *  lever's `line` alike. */
function checkBudgetLineItemV3(v: unknown, path: string): void {
  needObject(v, path)
  if (v.id !== undefined) needId(v, 'id', path)
  needVocab(v, 'category', BUDGET_CATEGORIES, path)
  needString(v, 'label', path)
  needFinite(v, 'annualAmountReal', path)
  if ((v.annualAmountReal as number) < 0) {
    throw new Corrupt(`${path}.annualAmountReal: must be ≥ 0 (an offsetting negative nets past the engine's post-summation gate)`)
  }
  needAtMostMaxDollar(v, 'annualAmountReal', path)
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
  if (v.everyYears !== undefined) {
    needInteger(v, 'everyYears', path)
    if (!everyYearsInRange(v.everyYears as number)) {
      throw new Corrupt(
        `${path}.everyYears: expected a repeat of ${EVERY_YEARS_MIN.value} to ${EVERY_YEARS_MAX.value} years (every year is written as absence)`,
      )
    }
  }
  if (v.growthRate !== undefined) {
    // Finite FIRST: the predicate assumes it (a NaN passes every relational compare, insights 008/010).
    needFinite(v, 'growthRate', path)
    if (!growthRateInRange(v.growthRate as number)) {
      throw new Corrupt(
        `${path}.growthRate: expected a yearly rate in [${GROWTH_RATE_MIN.value}, ${GROWTH_RATE_MAX.value}] (with prices is written as absence)`,
      )
    }
  }
}

/** P3·U10 — the Roth-conversion lever's persisted inputs. The codec is the SOLE restore
 *  gate for these (the per-year vector they expand into is derived downstream, so the
 *  engine's `validateParams` never sees the RAW plan — the insight-046 multiplied-away
 *  class, assigned to the codec by the two-gate rule). Finiteness FIRST, then range:
 *  a present plan must be MEANINGFUL (amount > 0 — a "no conversions" state is written
 *  as ABSENCE, so present-but-zero is a writer bug, named as corruption), the window
 *  integers non-negative / ≥ 1 (DND-009: no Infinity/NaN can hide in a JSON slot). */
function checkRothConversionPlanV3(v: unknown, path: string): void {
  needObject(v, path)
  needFinite(v, 'annualAmountReal', path)
  if ((v.annualAmountReal as number) <= 0) {
    throw new Corrupt(`${path}.annualAmountReal: must be > 0 (a zero/negative plan is written as absence, never persisted)`)
  }
  needAtMostMaxDollar(v, 'annualAmountReal', path)
  needInteger(v, 'startYearOffset', path)
  if ((v.startYearOffset as number) < 0) {
    throw new Corrupt(`${path}.startYearOffset: expected a sim-year offset ≥ 0`)
  }
  needInteger(v, 'years', path)
  if ((v.years as number) < 1) {
    throw new Corrupt(`${path}.years: expected ≥ 1 active year`)
  }
}

/** P3·U10 — the custom bucket order: EXACTLY the three general buckets, each once (a
 *  permutation — a short/duplicated/unknown-key order has no allocation meaning any
 *  layer can compute on; `hsa` is excluded by the vocabulary itself, the M5 laundering
 *  guard's persisted half). */
function checkDrawdownOrderV3(v: unknown, path: string): void {
  needArray(v, path)
  if (v.length !== DRAWDOWN_ORDER_KEYS.length) {
    throw new Corrupt(`${path}: expected exactly [${DRAWDOWN_ORDER_KEYS.join(', ')}] in some order`)
  }
  for (const key of v) {
    if (typeof key !== 'string' || !(DRAWDOWN_ORDER_KEYS as readonly string[]).includes(key)) {
      throw new Corrupt(`${path}: ${String(key)} is not a general drawdown bucket`)
    }
  }
  if (new Set(v).size !== DRAWDOWN_ORDER_KEYS.length) {
    throw new Corrupt(`${path}: each bucket must appear exactly once`)
  }
}

// --- schema version 6: the kept what-ifs and the Roth choice (the workbench plan's KTD16, KTD18) ------

/** The other arms' fields, refused (the extras biconditional idiom): no writer emits them. */
function refuseFields(o: Obj, fields: readonly string[], path: string, why: string): void {
  for (const f of fields) {
    if (o[f] !== undefined) throw new Corrupt(`${path}.${f}: ${why} (writer bug)`)
  }
}

/** A Roth conversion choice ({@link RothConversionChoiceV6}): the plan itself — the plan field's own
 *  check, amount > 0 included, since "converts nothing" is the explicit none, never a zero plan — or
 *  `none`, which carries no plan (both directions). */
function checkRothConversionChoiceV6(v: unknown, path: string): void {
  needObject(v, path)
  needVocab(v, 'kind', ROTH_CONVERSION_CHOICE_KINDS, path)
  if (v.kind === 'plan') checkRothConversionPlanV3(v.plan, `${path}.plan`)
  else refuseFields(v, ['plan'], path, "only meaningful when kind is 'plan'")
}

/** The tolerance a mix's three figures may miss 100 by: the intake's own allocation rule
 *  (`classifyLegs`, `src/intake/AllocationEntry.tsx`, refuses a sum at least 0.001 away), re-declared
 *  because `src/shared` may not import intake. Typed percentages like 33.3 / 33.3 / 33.4 do not always
 *  sum to exactly 100 in floating point. */
const MIX_SUM_TOLERANCE = 0.001

/** One spending op's arm: checks the op's own fields, refuses the others', returns the lever's target. */
function spendingLineTarget(v: Obj, path: string): string {
  refuseFields(v, ['lineId', 'annualSpendingReal'], path, 'a line lever carries its whole line, whose id is the target')
  checkBudgetLineItemV3(v.line, `${path}.line`)
  // Required here, unlike on a plan line: an added line lands in the plan with the id it was kept under.
  return `line:${needId(v.line as Obj, 'id', `${path}.line`)}`
}
const SPENDING_OP_ARMS: Record<WhatIfSpendingOp, (v: Obj, path: string) => string> = {
  add: spendingLineTarget,
  replace: spendingLineTarget,
  remove: (v, p) => {
    refuseFields(v, ['line', 'annualSpendingReal'], p, 'a remove names its line by lineId alone')
    return `line:${needId(v, 'lineId', p)}`
  },
  // The plan's own `annualSpendingReal` check: finite, and the engine's gate judges the range (the total
  // reaches it raw, through the plan's own builders).
  total: (v, p) => {
    refuseFields(v, ['line', 'lineId'], p, 'a total carries the one figure alone')
    needFinite(v, 'annualSpendingReal', p)
    return 'total'
  },
}

/**
 * Each lever kind's arm (the table in model.ts, `WhatIfLeverFieldsV6`): checks that kind's fields and
 * returns the lever's TARGET, so a bundle holding two levers of one kind on one target is refused by
 * the caller. An exhaustive Record (insight 147): a kind added to the vocabulary fails to compile here.
 * No arm checks that a target still exists in the plan — a kept what-if may outlive the account or line
 * it names (deleted after the keep), and refusing it here would call a good plan "damaged" after an
 * ordinary edit; what a dangling target means is the apply arm's call (U14).
 */
type LeverArm = (v: Obj, path: string, peopleCount: number) => string
const LEVER_ARMS: Record<WhatIfLeverKind, LeverArm> = {
  // A calendar year (the bundle's one calendar value, KTD18); each run refuses one outside the date
  // window by name, so the codec checks the shape.
  'stop-year': (v, p) => {
    needInteger(v, 'calendarYear', p)
    return 'household'
  },
  spending: (v, p) => {
    needVocab(v, 'op', WHAT_IF_SPENDING_OPS, p)
    return SPENDING_OP_ARMS[v.op as WhatIfSpendingOp](v, p)
  },
  // The account dollars' own gate (finite, ≥ 0, ≤ the ceiling — insight 046): a deposit is summed away
  // into a contribution stream before the engine sees it. The employer overrides are optional, absent
  // meaning the plan's own fact.
  deposits: (v, p) => {
    const accountId = needId(v, 'accountId', p)
    needFinite(v, 'annualContribution', p)
    needNonNegativeDollar(v, 'annualContribution', p)
    for (const field of ['employerMatchAnnual', 'hsaEmployerAnnual'] as const) {
      if (v[field] !== undefined) {
        needFinite(v, field, p)
        needNonNegativeDollar(v, field, p)
      }
    }
    return `account:${accountId}`
  },
  // Its own rule (KTD16), stricter than an account mix's positive-sum check: each a finite percentage
  // ≥ 0, the three summing to 100.
  mix: (v, p) => {
    let sum = 0
    for (const field of ['stockPct', 'bondPct', 'cashPct'] as const) {
      needFinite(v, field, p)
      const pct = v[field] as number
      if (pct < 0) throw new Corrupt(`${p}.${field}: expected a percentage ≥ 0`)
      sum += pct
    }
    if (Math.abs(sum - 100) >= MIX_SUM_TOLERANCE) {
      throw new Corrupt(`${p}: the stock, bond and cash percentages must sum to 100 (got ${sum})`)
    }
    return 'household'
  },
  roth: (v, p) => {
    checkRothConversionChoiceV6(v.conversion, `${p}.conversion`)
    return 'household'
  },
  // The plan's own biconditional (custom ⟺ an order), both directions.
  'withdrawal-order': (v, p) => {
    needVocab(v, 'policy', DRAWDOWN_POLICIES, p)
    if (v.policy === 'custom') checkDrawdownOrderV3(v.drawdownOrder, `${p}.drawdownOrder`)
    else refuseFields(v, ['drawdownOrder'], p, "only meaningful when policy is 'custom' (it would not govern)")
    return 'household'
  },
  // An index into people (a dangling person is a crash at apply), and the plan's own claim-age check
  // (finite; the engine's gate judges the range — the age reaches it raw on the copy's person).
  'claim-age': (v, p, peopleCount) => {
    needInteger(v, 'personIndex', p)
    const person = v.personIndex as number
    if (person < 0 || person >= peopleCount) {
      throw new Corrupt(`${p}.personIndex: expected an index into people [0, ${peopleCount})`)
    }
    needFinite(v, 'claimAge', p)
    return `person:${person}`
  },
  'aca-subsidy': (v, p) => {
    needBoolean(v, 'enhanced', p)
    return 'household'
  },
  // Schema version 7 (U13; offered by U17's tray row): per inherited IRA, by id, the pace the account's own facts carry
  // (the same check). Its target never collides with a deposits lever's on the same id: the kind prefixes the key.
  'inherited-pace': (v, p) => {
    const accountId = needId(v, 'accountId', p)
    checkInheritedPaceV7(v.pace, `${p}.pace`)
    return `account:${accountId}`
  },
}

/** One kept what-if ({@link KeptWhatIfV6}): a non-empty id (returned, for the caller's uniqueness
 *  check), a name, and its bundle — every lever of a known kind, at most one per kind and target, and
 *  never a total beside a line lever (each line lever re-reconciles the very total a total lever sets,
 *  so the pair is two levers on one figure). An empty bundle passes: it is the plan itself. */
function checkKeptWhatIfV6(v: unknown, peopleCount: number, path: string): string {
  needObject(v, path)
  const id = needId(v, 'id', path)
  needString(v, 'name', path)
  needArray(v.levers, `${path}.levers`)
  const targets = new Set<string>()
  v.levers.forEach((lever, i) => {
    const p = `${path}.levers[${i}]`
    needObject(lever, p)
    needVocab(lever, 'kind', WHAT_IF_LEVER_KINDS, p)
    const kind = lever.kind as WhatIfLeverKind
    const target = `${kind} ${LEVER_ARMS[kind](lever, p, peopleCount)}`
    if (targets.has(target)) throw new Corrupt(`${p}: a second ${kind} lever on the same target (one lever per kind and target)`)
    targets.add(target)
  })
  const lineLever = [...targets].some((t) => t.startsWith('spending line:'))
  if (targets.has('spending total') && lineLever) {
    throw new Corrupt(`${path}.levers: a spending total beside a line lever (the line lever re-reconciles the total it would set)`)
  }
  return id
}

// --- the vintage-stamp validators (ONE home each) --------------------------------------------
// Extracted at U17·S3 because the saved-recommendation record carries the SAME four stamp
// objects as its frozen era snapshot. Two hand-copied validators for one shape is the drift the
// repo refuses (insight 022's per-figure-provenance sibling: a second copy that silently accepts
// a shape the first rejects makes the two gates disagree). Each keeps its atomic-object contract
// verbatim: a PARTIAL stamp set is meaningless, so every non-additive field is required when the
// object is present, and the additive members stay optional (absent = not-comparable, quiet).

/** P3·U11 — the healthcare vintage stamp. TWO additive-optional members ride inside it (the
 *  extras-typical vintage and the Part-B-trend vintage) — a pre-unit stamp legitimately lacks
 *  each, and absence reads not-comparable, never "unchanged". */
function checkHealthcareVintageV3(v: unknown, path: string): void {
  needObject(v, path)
  needInteger(v, 'coverageYear', path)
  needString(v, 'acaStatus', path)
  needString(v, 'acaVerifiedOn', path)
  needInteger(v, 'fplGuidelineYear', path)
  needInteger(v, 'irmaaTopTierFrozenThrough', path)
  needFinite(v, 'partBStandardMonthly', path)
  if (v.medicareExtrasTypicalVintage !== undefined) needString(v, 'medicareExtrasTypicalVintage', path)
  if (v.partBTrendVintage !== undefined) needString(v, 'partBTrendVintage', path)
}

/** P3·U13 — the structured tax vintage (one atomic object — the healthcareVintage precedent). */
function checkTaxVintageV3(v: unknown, path: string): void {
  needObject(v, path)
  needInteger(v, 'taxYear', path)
  needString(v, 'legalBasis', path)
}

/** P3·U13 — the date-surface vintage (same atomic-object contract). ONE additive-optional member
 *  rides inside it: the working-years table's vintage (the pay check's U13) — a stamp minted before
 *  that table existed legitimately lacks it, and absence reads not-comparable (the clock stays
 *  quiet), never "unchanged" (the healthcare sub-vintage precedent above). */
function checkDateVintageV3(v: unknown, path: string): void {
  needObject(v, path)
  needInteger(v, 'contributionYear', path)
  needString(v, 'blendSnapshotAsOf', path)
  if (v.workingYearsVintage !== undefined) needString(v, 'workingYearsVintage', path)
}

/** The state-tax vintage stamp. Each field is a serialized per-state profile (a plain string);
 *  the staleness reader diffs the household's own state's string. */
function checkStateTaxVintageV3(v: unknown, path: string): void {
  needObject(v, path)
  needString(v, 'ncProfile', path)
  needString(v, 'paProfile', path)
  needString(v, 'flProfile', path)
}

/**
 * Act-4 · U17 — the saved-recommendation record (the spec's Q5 payload; model.ts
 * {@link SavedRecommendationV3}). Written in this file's NORMAL throwing idiom — every failure is
 * a named `Corrupt` — because the TOLERANCE is the CALLER's decision, not this validator's: the
 * v3 arm wraps it in a local try/catch that DELETES the atom and continues (the one deliberate
 * divergence from the file's loud-over-silent discipline; see the call site).
 *
 * Every gate here answers a specific way the record could lie if it decoded:
 *  - `mintedAt` gets the SAME epoch-day RANGE gate as `savedAt` (insight 046): an epoch-MS value
 *    is a finite integer that silently reads as year ~55000, and "your recommendation is from
 *    the year 55000" is in-range garbage, worse than a reject.
 *  - `fingerprint` must be a NON-EMPTY string. An empty one is not a fingerprint any minter
 *    produces; leaving it would persist a value that can only ever mismatch, i.e. a record that
 *    is silently un-re-presentable forever with no named reason.
 *  - `solverCodeVersion` must be an integer ≥ 1 — the engine's own shape contract (a monotone
 *    integer, never a float/sentinel). A 0 or a float means the writer violated it.
 *  - the action's custom-order BICONDITIONAL is enforced in BOTH directions (the
 *    `scenario.drawdownOrder` precedent): 'custom' with no order names no strategy, and an order
 *    riding a named policy would silently NOT govern.
 *  - `subTenthCollapse` rides a SECOND biconditional, on `grade`, also in both directions. It
 *    lives inside the engine's `GradeResult`, so a qualifier with no grade is UNPRODUCIBLE — and
 *    requiring it unconditionally would force the withheld-grade writer to invent a `false`, the
 *    structurally-dormant disclosure fed from an empty default that solve.ts's phasing law names.
 *  - `noDollarRegister` is REQUIRED and un-derivable record-side (model.ts spells out why): it is
 *    the only carrier of "the live surface refused to make a dollar claim at all", so a decoder
 *    that defaulted it would let a card re-tell a refusal as an active switch.
 *  - ALL FIVE ERA FIELDS ARE REQUIRED — no presence guard anywhere in the era block. The
 *    scenario-level stamps' absent-is-quiet contract does NOT transplant (model.ts
 *    {@link SavedRecommendationEraV3} names the premise and where it fails): a record is born
 *    after all four stamps exist, so absence is a minter bug that would pin `rulesMoved: false`
 *    forever. Refusing it here is the fail-CLOSED direction — the record drops, the plan opens.
 */
function checkSavedRecommendationV3(v: unknown, path: string): void {
  needObject(v, path)
  needInteger(v, 'mintedAt', path)
  const mintedAt = v.mintedAt as number
  if (mintedAt < SAVED_AT_EPOCH_DAY_MIN || mintedAt > SAVED_AT_EPOCH_DAY_MAX) {
    throw new Corrupt(
      `${path}.mintedAt: ${mintedAt} outside the epoch-day range [${SAVED_AT_EPOCH_DAY_MIN}, ${SAVED_AT_EPOCH_DAY_MAX}] (an epoch-ms value silently reads as a far-future year)`,
    )
  }
  needString(v, 'fingerprint', path)
  if ((v.fingerprint as string).length === 0) {
    throw new Corrupt(`${path}.fingerprint: expected a non-empty solver-run identity (an empty one can only ever mismatch)`)
  }
  needInteger(v, 'solverCodeVersion', path)
  if ((v.solverCodeVersion as number) < 1) {
    throw new Corrupt(`${path}.solverCodeVersion: expected the engine's monotone integer ≥ 1`)
  }
  needVocab(v, 'goal', RECOMMENDATION_GOALS, path)

  const actionPath = `${path}.action`
  const action = v.action
  needObject(action, actionPath)
  needString(action, 'candidateId', actionPath)
  if ((action.candidateId as string).length === 0) {
    throw new Corrupt(`${actionPath}.candidateId: expected a non-empty solver candidate id`)
  }
  needVocab(action, 'policy', DRAWDOWN_POLICIES, actionPath)
  if (action.policy === 'custom' && action.drawdownOrder === undefined) {
    throw new Corrupt(`${actionPath}.drawdownOrder: required when policy is 'custom'`)
  }
  if (action.drawdownOrder !== undefined) {
    if (action.policy !== 'custom') {
      throw new Corrupt(`${actionPath}.drawdownOrder: only meaningful when policy is 'custom' (it would not govern)`)
    }
    checkDrawdownOrderV3(action.drawdownOrder, `${actionPath}.drawdownOrder`)
  }
  // Schema version 6: the winner's Roth plan, so the rail can run the recommendation (R22). OPTIONAL —
  // a record minted before version 6 lacks it, and absence means "not recorded", never "converts
  // nothing" (that is the explicit none). §7.3, from a version-5 copy's side: (a) no — no version-5
  // reader re-enacts a conversion from the record (its one reader compares `candidateId`); (b) no — an
  // unknown action key passes; (c) no — the record rides `...draft`, minted once. Additive alone; it
  // rides the ids' bump. (Under a disk label below 6 the 5 → 6 step drops the record before this runs.)
  if (action.rothConversion !== undefined) {
    checkRothConversionChoiceV6(action.rothConversion, `${actionPath}.rothConversion`)
  }

  const verdictPath = `${path}.verdict`
  const verdict = v.verdict
  needObject(verdict, verdictPath)
  // ABSENT grade = WITHHELD (the B-floor refusal / no runner-up) — the burned/062 sentinel.
  // A PRESENT one must be in the mirrored vocabulary; an out-of-vocab letter is corruption, never
  // coerced to the conservative 'coin-flip' (a fabricated reading the run never made).
  if (verdict.grade !== undefined) needVocab(verdict, 'grade', SAVED_RECOMMENDATION_GRADES, verdictPath)
  // THE QUALIFIER'S BICONDITIONAL, both directions (the drawdownOrder-iff-'custom' idiom above).
  if (verdict.grade !== undefined) {
    needBoolean(verdict, 'subTenthCollapse', verdictPath)
  } else if (verdict.subTenthCollapse !== undefined) {
    throw new Corrupt(
      `${verdictPath}.subTenthCollapse: only meaningful when a grade is present (it lives inside the engine's GradeResult — a qualifier with nothing to qualify is unproducible)`,
    )
  }
  needBoolean(verdict, 'noChange', verdictPath)
  needBoolean(verdict, 'surplusRegime', verdictPath)
  needBoolean(verdict, 'noDollarRegister', verdictPath)

  const eraPath = `${path}.era`
  const era = v.era
  needObject(era, eraPath)
  // ALL FIVE, NO PRESENCE GUARD (see the header). An absent stamp here is not a pre-unit vault —
  // it is a minter that failed to snapshot the era, and tolerating it would pin every rulebook
  // clock quiet forever on a record that then re-presents as CURRENT.
  needString(era, 'appDefaultVersion', eraPath)
  checkTaxVintageV3(era.taxVintageDetail, `${eraPath}.taxVintageDetail`)
  checkStateTaxVintageV3(era.stateTaxVintage, `${eraPath}.stateTaxVintage`)
  checkHealthcareVintageV3(era.healthcareVintage, `${eraPath}.healthcareVintage`)
  checkDateVintageV3(era.dateVintage, `${eraPath}.dateVintage`)
}

/**
 * VALIDATE A RECORD AT THE MINT — the seam that keeps an invalid record out of the draft entirely.
 *
 * THE PROBLEM IT SOLVES. The record is the ONE atom `decodeScenario` drops non-fatally, and that
 * tolerance is charter'd for the READ side ("a household's plan must never become unopenable
 * because its recommendation memory went bad"). On the WRITE side the same tolerance is a trap:
 * whatever `scenarioFromDraft` does about a dropped atom, it is already choosing between two bad
 * outcomes — save the plan and lose the record silently, or refuse the save and strand the
 * household's real edits over a defect in OUR minting code. Neither is good, because BOTH are
 * downstream of the actual mistake.
 *
 * The actual mistake is letting an invalid record onto the draft in the first place. S5's save
 * gesture mints this record from a solve payload we control, so it can — and per the obligation
 * recorded on {@link SaveReady} MUST — validate its own mint HERE, before the record ever touches
 * the draft. Then the write-side drop is unreachable by construction rather than handled by a
 * consolation prize.
 *
 * Same validator as the decode path (never a parallel copy that could drift — the whole reason
 * `scenarioFromDraft` round-trips the codec instead of hand-rolling a save gate), just returned
 * rather than thrown, because a mint-time refusal is a control-flow decision at the caller and not
 * a corrupt-vault event.
 */
export function validateSavedRecommendation(
  record: unknown,
): { readonly ok: true } | { readonly ok: false; readonly detail: string } {
  try {
    checkSavedRecommendationV3(record, 'savedRecommendation')
    return { ok: true }
  } catch (e) {
    if (e instanceof Corrupt) return { ok: false, detail: e.detail }
    throw e
  }
}

/** Returns the NON-FATAL DROPS (`ScenarioDecode.droppedAtoms`) — empty when the whole payload was
 *  accepted intact. Everything else still throws {@link Corrupt}; only the atoms enumerated at the
 *  bottom of this function are ever tolerated, and each one REPORTS itself on the way out. */
function checkV3Fields(o: Obj): string[] {
  const droppedAtoms: string[] = []
  needArray(o.people, 'scenario.people')
  if (o.people.length === 0) throw new Corrupt('scenario.people: must not be empty')
  o.people.forEach((p, i) => checkPersonV3(p, `people[${i}]`))
  const peopleCount = o.people.length
  needArray(o.enteredAccounts, 'scenario.enteredAccounts')
  o.enteredAccounts.forEach((a, i) => checkEnteredAccount(a, peopleCount, `enteredAccounts[${i}]`))
  needUniqueIds(o.enteredAccounts, 'enteredAccounts')
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
    needUniqueIds(o.budget, 'budget')
  }
  // P3·U10 — the Roth-conversion lever (additive-optional, same precedent).
  if (o.rothConversion !== undefined) {
    checkRothConversionPlanV3(o.rothConversion, 'scenario.rothConversion')
  }
  // P3·U10 — the custom-order biconditional (the retirementAge-biconditional precedent:
  // both directions, so a mismatched pair is unrepresentable-persisted). 'custom' with no
  // order would reach the engine only to be rejected as indeterminate; an order riding a
  // named policy would silently NOT govern — both are writer bugs, named here.
  if (o.drawdownPolicy === 'custom' && o.drawdownOrder === undefined) {
    throw new Corrupt("scenario.drawdownOrder: required when drawdownPolicy is 'custom'")
  }
  if (o.drawdownOrder !== undefined) {
    if (o.drawdownPolicy !== 'custom') {
      throw new Corrupt("scenario.drawdownOrder: only meaningful when drawdownPolicy is 'custom' (it would not govern)")
    }
    checkDrawdownOrderV3(o.drawdownOrder, 'scenario.drawdownOrder')
  }
  // P3·U11 — the enhanced-subsidy regime toggle (additive-optional). PRESENCE-KEYED with the
  // literal `true`: the writer strips the key on revert, so a persisted `false` (or any other
  // value) is a writer bug named loud — never a silently-ignored slot that would desync the
  // sheet's face from the engine's regime.
  if (o.enhancedSubsidies !== undefined && o.enhancedSubsidies !== true) {
    throw new Corrupt('scenario.enhancedSubsidies: expected the literal true (absence IS the reverted regime — false is written as absence)')
  }
  // The ask-for-Medicare-extras payment fork (wf_efc6ece2-675 — additive-optional). WHEN
  // PRESENT: exactly one entry per person, each kind-discriminated with BOTH biconditionals
  // enforced in BOTH directions (monthly iff 'entered'; adoptionVintage iff 'typical') — a
  // mismatched pair is unrepresentable-persisted (the drawdownOrder precedent). The 'entered'
  // dollar runs the STRICT gate (needFinite → needNonNegativeDollar): a negative extras
  // premium inside the funding sum is the insight-046 optimistic class the engine cannot
  // backstop; the siblings' optFinite / finite-only checkFiniteArray are deliberately NOT
  // reused (the spec's ship gate names this trap).
  if (o.medicareExtrasByPerson !== undefined) {
    const path = 'scenario.medicareExtrasByPerson'
    needArray(o.medicareExtrasByPerson, path)
    if (o.medicareExtrasByPerson.length !== peopleCount) {
      throw new Corrupt(`${path}: expected exactly ${peopleCount} entries (one per person)`)
    }
    o.medicareExtrasByPerson.forEach((e, i) => {
      const p = `${path}[${i}]`
      needObject(e, p)
      needVocab(e, 'kind', MEDICARE_EXTRAS_KINDS, p)
      if (e.kind === 'entered') {
        needFinite(e, 'monthly', p)
        needNonNegativeDollar(e, 'monthly', p)
      } else if (e.monthly !== undefined) {
        throw new Corrupt(`${p}.monthly: only meaningful when kind is 'entered' (it would not price — writer bug)`)
      }
      if (e.kind === 'typical') {
        needString(e, 'adoptionVintage', p)
      } else if (e.adoptionVintage !== undefined) {
        throw new Corrupt(`${p}.adoptionVintage: only meaningful when kind is 'typical' (no adoption occurred — writer bug)`)
      }
    })
  }
  // The retirement state (the state-tax unit; additive-optional). needVocab against the SINGLE-
  // SOURCED STATE_ROSTER (model.ts) inside the tolerant-reader guard: a pre-unit vault lacks the
  // key and passes unchanged. An out-of-vocab string is corruption named LOUD (never silently
  // treated as 'elsewhere' — a typo'd 'NC' silently unpriced would UNDERSTATE tax for a household
  // that meant a priced state, the calm-but-wrong direction). 'elsewhere' is an EXPLICIT member —
  // a chosen "somewhere else" persists as a fact, distinct from never-asked ABSENT (not a
  // strip-on-revert field: it is never collapsed to absence).
  if (o.retirementState !== undefined) {
    needVocab(o, 'retirementState', STATE_ROSTER, 'scenario')
  }
  // P3·U11 — the healthcare vintage stamp (additive-optional; one atomic object — a partial
  // stamp set is meaningless, so every field is required when the object is present; TWO
  // additive-optional members ride inside it — the extras-typical vintage (the extras unit)
  // and the Part-B-trend vintage (the trend unit) — a pre-unit stamp legitimately lacks each,
  // and absence reads not-comparable, never "unchanged").
  if (o.healthcareVintage !== undefined) {
    checkHealthcareVintageV3(o.healthcareVintage, 'scenario.healthcareVintage')
  }
  // P3·U13 — the save wall-time anchor (additive-optional). RANGE-gated, not merely
  // finite (insight 046): an epoch-MILLISECOND value here is a finite integer that would
  // silently read as year ~55000 — in-range garbage is worse than a reject.
  if (o.savedAt !== undefined) {
    const sa = o.savedAt
    if (!isFiniteNumber(sa) || !Number.isInteger(sa)) {
      throw new Corrupt('scenario.savedAt: expected an integer epoch-day')
    }
    if (sa < SAVED_AT_EPOCH_DAY_MIN || sa > SAVED_AT_EPOCH_DAY_MAX) {
      throw new Corrupt(
        `scenario.savedAt: ${sa} outside the epoch-day range [${SAVED_AT_EPOCH_DAY_MIN}, ${SAVED_AT_EPOCH_DAY_MAX}] (an epoch-ms value silently reads as a far-future year)`,
      )
    }
  }
  // P3·U13 — the structured tax vintage (additive-optional; one atomic object — a partial
  // stamp set is meaningless, the healthcareVintage precedent).
  if (o.taxVintageDetail !== undefined) {
    checkTaxVintageV3(o.taxVintageDetail, 'scenario.taxVintageDetail')
  }
  // P3·U13 — the date-surface vintage (additive-optional; same atomic-object contract).
  if (o.dateVintage !== undefined) {
    checkDateVintageV3(o.dateVintage, 'scenario.dateVintage')
  }
  // The state-tax vintage stamp (the state-tax unit; additive-optional; one atomic object — a
  // partial stamp set is meaningless, so every field is required when the object is present; the
  // healthcareVintage/taxVintageDetail precedent). Each field is a serialized per-state profile
  // (a plain string); the staleness reader diffs the household's own state's string.
  if (o.stateTaxVintage !== undefined) {
    checkStateTaxVintageV3(o.stateTaxVintage, 'scenario.stateTaxVintage')
  }
  // Act-4 · U15 — the recommender's chosen Tier-2 goal (additive-optional). needVocab against the
  // SINGLE-SOURCED RECOMMENDATION_GOALS (model.ts) inside the tolerant-reader guard: a pre-U15
  // vault lacks the key and passes unchanged (ABSENCE is the explicit unset sentinel — burned/062,
  // never a default goal). An out-of-vocab string is corruption named LOUD — never silently coerced
  // to a default goal (fabricating a goal the user never picked is the calm-but-wrong shape).
  if (o.chosenGoal !== undefined) {
    needVocab(o, 'chosenGoal', RECOMMENDATION_GOALS, 'scenario')
  }
  // The assumed heir bracket (additive-optional; absence = took our default, never a seeded 0.24).
  // RANGE-GATED, not merely finite, and the upper bound is EXCLUSIVE: `afterTaxBequestPerPath`
  // throws outside [0, 1), and a persisted `24` — a percent where a fraction belongs — is finite
  // and would pass a finiteness check, then detonate inside the engine one beat later. This codec
  // is the ONLY [0,1) gate on the restore path (the panel's closed vocabulary cannot express an
  // out-of-range value, so intake never needs a sanity rule for it). `needUnitFraction` is
  // deliberately NOT reused: it admits 1, which throws.
  if (o.heirBracket !== undefined) {
    needFinite(o, 'heirBracket', 'scenario')
    const hb = o.heirBracket as number
    if (hb < 0 || hb >= 1) {
      throw new Corrupt(`scenario.heirBracket: expected a fraction in [0, 1) (got ${hb})`)
    }
  }
  // The pay check's W, what a year costs while someone still works (`docs/plans/features/
  // working-year-pay-check-build-spec.md` KTD4; it landed additive-optional within version 3, the
  // heirBracket precedent, and the schema-v4 bump of 2026-10-31 is what makes a copy built before W
  // refuse a plan carrying it — the header). One kind-discriminated object over a CLOSED vocabulary. On the restore path
  // every check below is this codec's alone: the engine's `validateParams` sees only the figure
  // (through `buildDateInput`), never the kind, the period or the reading.
  //  · `stateTaxReading` is required on BOTH kinds: it is what makes a change of state stale the
  //    answer (R4), so a missing one would read "never stale" forever. Its vocabulary is the
  //    persisted one, never the engine's `StateBaseSystem` names (`federal-agi-derived` is refused).
  //  · The kind's figure (confirmed → `quotedReal`, entered → `amountReal`, both ANNUAL real $) runs
  //    finite FIRST, then > 0, then ≤ the ceiling — the `checkRothConversionPlanV3` shape, NOT the
  //    extras' `needNonNegativeDollar`, which admits 0. KTD4 refuses ≤ 0: intake never commits an
  //    entered $0 (`working-cost-zero`) and never mints a confirmed $0 quote, so a present ≤ 0 figure
  //    is a writer bug. The ceiling is insight 046 (finiteness is not range): the engine's own W bound
  //    (R19) would otherwise throw at run time instead of this decode failing calm.
  //  · The other kind's fields are refused (the extras biconditional, both directions): a `confirmed`
  //    carrying `amountReal` or `entryPeriod`, or an `entered` carrying `quotedReal`, is a mismatched
  //    pair no writer emits. An UNKNOWN extra key still passes (the tolerant reader, header).
  //  · `entered` requires its `entryPeriod`, the unit the figure was typed in (display only, KTD4).
  //  · The keep stamp `keptOverQuoteReal` (build 2's KTD10, R13) is OPTIONAL on `entered` — absent is a
  //    typed figure, a real population — and refused on `confirmed`, where no writer mints it. Present,
  //    it runs finite, then > 0, then ≤ the ceiling, like the figures: it records the quote a stale
  //    yes was kept over, and a keep never mints one off a $0 quote. Added inside label 4 under a new
  //    name, so a copy built before it reads the key as unknown (the line above) and opens the plan.
  if (o.workingYearCost !== undefined) {
    const p = 'scenario.workingYearCost'
    const w = o.workingYearCost
    needObject(w, p)
    needVocab(w, 'kind', WORKING_YEAR_COST_KINDS, p)
    needVocab(w, 'stateTaxReading', WORKING_YEAR_STATE_TAX_READINGS, p)
    const confirmed = w.kind === 'confirmed'
    const figure = confirmed ? 'quotedReal' : 'amountReal'
    needFinite(w, figure, p)
    if ((w[figure] as number) <= 0) {
      throw new Corrupt(`${p}.${figure}: must be > 0 (a $0 answer is refused at intake, never persisted)`)
    }
    needAtMostMaxDollar(w, figure, p)
    if (confirmed) {
      if (w.amountReal !== undefined) {
        throw new Corrupt(`${p}.amountReal: only meaningful when kind is 'entered' (writer bug)`)
      }
      if (w.entryPeriod !== undefined) {
        throw new Corrupt(`${p}.entryPeriod: only meaningful when kind is 'entered' (writer bug)`)
      }
      if (w.keptOverQuoteReal !== undefined) {
        throw new Corrupt(`${p}.keptOverQuoteReal: only meaningful when kind is 'entered' (writer bug)`)
      }
    } else {
      if (w.quotedReal !== undefined) {
        throw new Corrupt(`${p}.quotedReal: only meaningful when kind is 'confirmed' (writer bug)`)
      }
      needVocab(w, 'entryPeriod', SPEND_ENTRY_PERIODS, p)
      if (w.keptOverQuoteReal !== undefined) {
        needFinite(w, 'keptOverQuoteReal', p)
        if ((w.keptOverQuoteReal as number) <= 0) {
          throw new Corrupt(`${p}.keptOverQuoteReal: must be > 0 (a keep never stamps a $0 quote)`)
        }
        needAtMostMaxDollar(w, 'keptOverQuoteReal', p)
      }
    }
  }
  // Build 2's left-over answer (`docs/plans/features/working-year-surplus-build-spec.md` R1, R2, KTD1),
  // the field the schema-v5 bump exists for. One kind-discriminated object over a CLOSED vocabulary,
  // optional, and ABSENT is the unanswered state: the codec writes nothing for it and reads nothing
  // into it (never a token, never `?? 'spent'`).
  //  · `saved` requires `quotedReal`, the whole-dollar year-0 Left over the reply was given against:
  //    finite FIRST (insight 010), then an INTEGER (the face prints whole dollars and stores what it
  //    printed), then at least 1 (the question is never asked below a printed $1, R5), then at most the
  //    ceiling (insight 046 — the engine's own `validateParams` refusal would otherwise fire at run
  //    time instead of this decode failing calm).
  //  · `spent` and `not-sure` refuse a `quotedReal` (the biconditional, both directions): no writer
  //    stores a figure with them.
  //  · Accepted whether or not W is present (R2): the answer is held through a W clear and stays inert
  //    until W is fresh again (U7), so a plan without W carrying it is a real shape.
  //  · An UNKNOWN extra key still passes (the tolerant reader, header).
  if (o.workingYearLeftOver !== undefined) {
    const p = 'scenario.workingYearLeftOver'
    const a = o.workingYearLeftOver
    needObject(a, p)
    needVocab(a, 'kind', WORKING_YEAR_LEFT_OVER_KINDS, p)
    if (a.kind === 'saved') {
      needInteger(a, 'quotedReal', p)
      if ((a.quotedReal as number) < 1) {
        throw new Corrupt(`${p}.quotedReal: must be at least 1 (the question is never asked below a printed $1)`)
      }
      needAtMostMaxDollar(a, 'quotedReal', p)
    } else if (a.quotedReal !== undefined) {
      throw new Corrupt(`${p}.quotedReal: only meaningful when kind is 'saved' (writer bug)`)
    }
  }
  // The kept what-ifs (schema version 6; the workbench plan's KTD16, KTD18), optional, ABSENT meaning
  // none kept. Every kept what-if passes `checkKeptWhatIfV6`, and no two share an id. Loud, like every
  // field but the record: a kept what-if is the household's own work, never a disposable memory.
  // §7.3, from a version-5 copy's side: (a) no — the plan's own answer never reads them (a what-if runs
  // on a copy, KTD10); (b) no — an unknown top-level key passes the tolerant reader; (c) a version-5
  // copy carries the list through `...draft` untouched, but its levers name account and line ids that
  // copy does not keep (the account check above), so the ids' bump covers them.
  if (o.keptWhatIfs !== undefined) {
    needArray(o.keptWhatIfs, 'scenario.keptWhatIfs')
    const ids = new Set<string>()
    o.keptWhatIfs.forEach((k, i) => {
      const id = checkKeptWhatIfV6(k, peopleCount, `keptWhatIfs[${i}]`)
      if (ids.has(id)) throw new Corrupt(`keptWhatIfs[${i}].id: "${id}" is already another kept what-if's id`)
      ids.add(id)
    })
  }
  // One-time money in (schema version 9, the home sale at 10; gap 5's plan, KTD10), optional, ABSENT meaning none. Every item passes
  // `checkOneTimeInflowV9`, and no two share an id. An EMPTY list decodes as none (gap 4's KTD9 accepted an empty
  // `loans` list on purpose): refusing it would send the whole saved plan to the damaged-data screen over one writer
  // slip. The writer never writes one, and the engine still refuses an empty list (its own arm, KTD2). Loud, like
  // every field but the record: an item is the household's own money.
  if (o.oneTimeInflows !== undefined) {
    needArray(o.oneTimeInflows, 'scenario.oneTimeInflows')
    const ids = new Set<string>()
    o.oneTimeInflows.forEach((item, i) => {
      const id = checkOneTimeInflowV9(item, peopleCount, `oneTimeInflows[${i}]`)
      if (ids.has(id)) throw new Corrupt(`oneTimeInflows[${i}].id: "${id}" is already another item's id`)
      ids.add(id)
    })
  }
  // ─────────────────────────────────────────────────────────────────────────────────────────
  // Act-4 · U17 — the saved-recommendation record: THE FIRST AND ONLY TOLERATED DROP IN THIS
  // CODEC, a DELIBERATE, spec-named divergence from the file's loud-over-silent discipline
  // (U17 build spec, Q5: "a corrupt/unknown record DROPS THE ATOM and keeps the model").
  //
  // WHY THE DIVERGENCE IS RIGHT HERE AND NOWHERE ELSE. Every other field in this codec is part
  // of the ANSWER: a bad `people[0].pia` or a bad budget line means the plan we would recompute
  // is not the plan that was saved, so refusing loudly (→ the terminal "data damaged" door,
  // session.ts:437-441 / 516-520) is the honest outcome. This record is a MEMORY OF A PAST
  // RECOMMENDATION — nothing in the household's plan depends on it. Bouncing the entire vault,
  // and with it every balance, budget line and date the household entered, because their saved
  // recommendation went bad would be a catastrophic over-reaction: the plan is the asset, the
  // record is a note about it.
  //
  // THE DELETE MUST MUTATE `o`, NOT MERELY "IGNORE" THE FIELD. `o` IS the object `decodeScenario`
  // casts and returns (`{ ok: true, scenario: parsed as … }`) — this codec constructs nothing. An
  // atom that is validated-and-ignored would still ride the returned scenario into
  // draftFromScenario's `...rest`, into the draft, and back onto disk at the next save: a
  // corrupt record that survives forever and re-poisons every future read. Deleting it here is
  // what makes "drops the atom" true rather than aspirational.
  //
  // ONLY `Corrupt` IS CAUGHT. A TypeError (or anything else) from a real defect in the validator
  // must stay LOUD and propagate to decodeScenario's outer catch, which re-throws it — a
  // programming error laundered into a calm dropped atom is exactly the silent-wrongness this
  // whole file exists to prevent.
  //
  // BOTH RE-THROWS ARE PINNED (2026-08-01) — this one and the outer `throw e` in decodeScenario,
  // by the single arm "a NON-Corrupt throw from INSIDE a validator ESCAPES decodeScenario" in
  // `__tests__/scenarioCodec.test.ts`; they chain, so one arm kills both mutants. They had been
  // filed as untestable ("seam-less") on the reasoning that the input is a `JSON.parse` product
  // with no getters — TRUE of the input, but the modelled failure is a defect in the VALIDATOR,
  // and `needInteger` calls `Number.isInteger`, which a value-targeted spy can make throw.
  // Do NOT re-file this branch as unreachable.
  //
  // AND THE DROP IS REPORTED, NEVER SILENT (the F-pass fix). "Tolerated" is a READ-side charter;
  // this same function is `scenarioFromDraft`'s SAVE gate, where a dropped atom means the MINTER
  // emitted an invalid record and the household would otherwise be told "Saved" about a record
  // that is not on disk. The atom name + the codec's own reason ride out on `droppedAtoms`; each
  // caller rules on it (ScenarioDecode's doc).
  if (o.savedRecommendation !== undefined) {
    try {
      checkSavedRecommendationV3(o.savedRecommendation, 'scenario.savedRecommendation')
    } catch (e) {
      if (!(e instanceof Corrupt)) throw e
      delete o.savedRecommendation
      droppedAtoms.push(`savedRecommendation: ${e.detail}`)
    }
  }
  return droppedAtoms
}

/** The path of the first plan-level field only version 6 writes (an account's or a line's id, the kept
 *  what-ifs list) — `undefined` when the plan carries none. Read by the 5 → 6 step BEFORE any field is
 *  checked, so every access is guarded; the arms judge the shapes afterwards. */
function versionSixFieldIn(o: Obj): string | undefined {
  if (o.keptWhatIfs !== undefined) return 'scenario.keptWhatIfs'
  const firstWithId = (list: unknown, path: string): string | undefined => {
    if (!Array.isArray(list)) return undefined
    const i = list.findIndex((e) => isObj(e) && e.id !== undefined)
    return i === -1 ? undefined : `${path}[${i}].id`
  }
  return firstWithId(o.enteredAccounts, 'enteredAccounts') ?? firstWithId(o.budget, 'budget')
}

/** The path of the first field only version 7 writes (an `inherited-ira` account, an account's `inherited` facts, an
 *  `inherited-pace` lever in a kept what-if) — `undefined` when the plan carries none. Read by the 6 → 7 step BEFORE any
 *  field is checked, so every access is guarded; the arms judge the shapes afterwards. */
function versionSevenFieldIn(o: Obj): string | undefined {
  if (Array.isArray(o.enteredAccounts)) {
    const i = o.enteredAccounts.findIndex((a) => isObj(a) && (a.kind === 'inherited-ira' || a.inherited !== undefined))
    if (i !== -1) {
      const a = o.enteredAccounts[i] as Obj
      return a.kind === 'inherited-ira' ? `enteredAccounts[${i}].kind` : `enteredAccounts[${i}].inherited`
    }
  }
  if (Array.isArray(o.keptWhatIfs)) {
    for (let k = 0; k < o.keptWhatIfs.length; k++) {
      const kept = o.keptWhatIfs[k]
      if (!isObj(kept) || !Array.isArray(kept.levers)) continue
      const j = kept.levers.findIndex((l) => isObj(l) && l.kind === 'inherited-pace')
      if (j !== -1) return `keptWhatIfs[${k}].levers[${j}].kind`
    }
  }
  return undefined
}

/** A budget line's two version-8 fields, in the order the 7 → 8 step looks for them. */
const BUDGET_LINE_V8_FIELDS = ['everyYears', 'growthRate'] as const

/** The path of the first field only version 8 writes (a budget line's `everyYears` or `growthRate`, on a plan line or
 *  on a kept what-if's spending `add` or `replace` lever's `line`) — `undefined` when the plan carries none. Read by
 *  the 7 → 8 step BEFORE any field is checked, so every access is guarded; the arms judge the shapes afterwards. */
function versionEightFieldIn(o: Obj): string | undefined {
  const fieldOn = (line: unknown, path: string): string | undefined => {
    if (!isObj(line)) return undefined
    const f = BUDGET_LINE_V8_FIELDS.find((name) => line[name] !== undefined)
    return f === undefined ? undefined : `${path}.${f}`
  }
  if (Array.isArray(o.budget)) {
    for (let i = 0; i < o.budget.length; i++) {
      const hit = fieldOn(o.budget[i], `budget[${i}]`)
      if (hit !== undefined) return hit
    }
  }
  if (Array.isArray(o.keptWhatIfs)) {
    for (let k = 0; k < o.keptWhatIfs.length; k++) {
      const kept = o.keptWhatIfs[k]
      if (!isObj(kept) || !Array.isArray(kept.levers)) continue
      for (let j = 0; j < kept.levers.length; j++) {
        const lever = kept.levers[j]
        if (!isObj(lever) || lever.kind !== 'spending' || (lever.op !== 'add' && lever.op !== 'replace')) continue
        const hit = fieldOn(lever.line, `keptWhatIfs[${k}].levers[${j}].line`)
        if (hit !== undefined) return hit
      }
    }
  }
  return undefined
}

/** The path of the field only version 9 writes (the one-time money list) — `undefined` when the plan carries none.
 *  Read by the 8 → 9 step BEFORE any field is checked; the list arm judges its shape afterwards. */
function versionNineFieldIn(o: Obj): string | undefined {
  return o.oneTimeInflows !== undefined ? 'scenario.oneTimeInflows' : undefined
}

/** The path of the first item only version 10 writes (a home sale on the one-time list) — `undefined` when the plan
 *  carries none. Read by the 9 → 10 step BEFORE any field is checked, so it reads the raw list with care (a list that
 *  is not an array, or an item that is not an object, is the list arm's to name afterwards). */
function versionTenFieldIn(o: Obj): string | undefined {
  if (!Array.isArray(o.oneTimeInflows)) return undefined
  const at = o.oneTimeInflows.findIndex((item) => isObj(item) && item.kind === 'homeSale')
  return at === -1 ? undefined : `scenario.oneTimeInflows[${at}]`
}

/**
 * Decode + structurally validate plaintext vault/export bytes. Never throws on bad DATA:
 * every data failure is a typed result the store maps to its calm states ("data damaged" /
 * "saved by a newer version"). A defect inside a validator (a throw that is not `Corrupt`)
 * propagates on purpose — pinned in the codec suite (the note above the tolerated drop).
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
  const onDisk = parsed.schemaVersion
  if (!isFiniteNumber(onDisk) || !Number.isInteger(onDisk)) {
    return { ok: false, reason: 'corrupt', detail: 'scenario.schemaVersion: expected an integer' }
  }
  // "Newer" is judged first, before any arm (the `backup.ts` format-check order): the output is
  // the same for every input, and the threshold reads the one constant.
  if (onDisk > CURRENT_SCHEMA_VERSION) return { ok: false, reason: 'newer-version', got: onDisk }

  // The version each step hands on. A label-only step moves it (and the parsed object's own label)
  // to its literal successor; the next arm then judges it exactly as if the disk had said so.
  let version = onDisk
  // A record the 5 → 6 step drops (the record's own tolerated path), reported ahead of the field checks'.
  const stepDrops: string[] = []
  try {
    // The legacy ladders carry no tolerated atom — every field is fatal-or-fine, so their
    // `droppedAtoms` is the EMPTY LIST (the absence, spelled; never `undefined`).
    if (version === 1) {
      checkV1Fields(parsed)
      return { ok: true, scenario: parsed as unknown as Scenario, droppedAtoms: [] }
    }
    if (version === 2) {
      checkV2Fields(parsed)
      return { ok: true, scenario: parsed as unknown as ScenarioV2, droppedAtoms: [] }
    }
    // 3 → 4, LABEL ONLY (the schema-v4 bump, 2026-10-31): the two carry the identical field set, so
    // only the discriminant moves, in place — every stamp the staleness reader diffs at unlock stays
    // as written. The LITERAL successor, never `CURRENT_SCHEMA_VERSION`: a later bump adds its own
    // 4 → 5 step after this one, and a step that jumped straight to "current" would skip it. Read
    // forever (the header). Never call such a plan "legacy" — that word already means a plan missing
    // optional fields (`staleness.ts`, `resultSave.ts`).
    if (version === 3) {
      parsed.schemaVersion = 4
      version = 4
    }
    // 4 → 5, LABEL ONLY (the schema-v5 bump, build 2's go-live, KTD6): version 5 adds one OPTIONAL
    // field, the left-over answer, so a version-4 plan is a version-5 plan with that key absent —
    // nothing is written into it (no default, no token, never `?? 'spent'`). Before the relabel, a
    // plan whose DISK label is 3 or 4 and that carries the answer is refused: no build writing those
    // labels writes it, and a copy at those labels would ignore a "saved" answer (§7.3's rule (a)),
    // so such a plan is a writer bug, named. The LITERAL successor again, never
    // `CURRENT_SCHEMA_VERSION` (the 3 → 4 note above). Read forever.
    if (version === 4) {
      if (parsed.workingYearLeftOver !== undefined) {
        throw new Corrupt(
          `scenario.workingYearLeftOver: a plan saved as version ${onDisk} cannot carry it — no build that writes version ${onDisk} writes it (writer bug)`,
        )
      }
      parsed.schemaVersion = 5
      version = 5
    }
    // 5 → 6, LABEL ONLY (the schema-v6 bump, the workbench plan's KTD16, U9): version 6 adds three
    // OPTIONAL shapes — a stable id on each entered account and budget line, the kept what-ifs list, and
    // the saved recommendation's Roth plan — so a version-5 plan is a version-6 plan with those keys
    // absent, and the step MINTS NOTHING (ids are minted where a draft enters, `draftFromScenario`).
    // Before the relabel, a plan whose DISK label is 3 to 5 and that carries an id or the list is
    // refused: no build writing those labels writes either, so it is a writer bug, named (§7.3). A
    // record carrying the Roth plan under such a label drops instead, through the record's own
    // tolerated path (a memory never makes the plan unopenable). The LITERAL successor again, never
    // `CURRENT_SCHEMA_VERSION` (the 3 → 4 note above). Read forever.
    if (version === 5) {
      const newer = versionSixFieldIn(parsed)
      if (newer !== undefined) {
        throw new Corrupt(
          `${newer}: a plan saved as version ${onDisk} cannot carry it — no build that writes version ${onDisk} writes it (writer bug)`,
        )
      }
      const record = parsed.savedRecommendation
      if (isObj(record) && isObj(record.action) && record.action.rothConversion !== undefined) {
        delete parsed.savedRecommendation
        stepDrops.push(
          `savedRecommendation: scenario.savedRecommendation.action.rothConversion: a record saved as version ${onDisk} cannot carry it — no build that writes version ${onDisk} writes it (writer bug)`,
        )
      }
      parsed.schemaVersion = 6
      version = 6
    }
    // 6 → 7, LABEL ONLY (the schema-v7 bump, the workbench plan's U13 — gap 3's saved shapes): version 7 adds three
    // NESTED shapes — the `inherited-ira` account kind, an account's `inherited` facts, and the `inherited-pace` lever
    // kind — so a version-6 plan is a version-7 plan holding none of them, and the step writes nothing into it. Before
    // the relabel, a plan whose DISK label is 3 to 6 and that carries any of the three is refused: no build writing
    // those labels writes one, and after the relabel the kind vocabularies would accept it, so such a plan is a writer
    // bug, named (§7.3). The LITERAL successor again, never `CURRENT_SCHEMA_VERSION` (the 3 → 4 note above). Read forever.
    if (version === 6) {
      const newer = versionSevenFieldIn(parsed)
      if (newer !== undefined) {
        throw new Corrupt(
          `${newer}: a plan saved as version ${onDisk} cannot carry it — no build that writes version ${onDisk} writes it (writer bug)`,
        )
      }
      parsed.schemaVersion = 7
      version = 7
    }
    // 7 → 8, LABEL ONLY (the schema-v8 bump, gap 4's U2): version 8 adds two OPTIONAL fields on a budget line — its
    // repeat (`everyYears`) and its own rate (`growthRate`), on a plan line and on a kept what-if's added or replacing
    // line — so a version-7 plan is a version-8 plan holding neither, and the step writes nothing into it. Before the
    // relabel, a plan whose DISK label is 3 to 7 and that carries either is refused: no build writing those labels writes
    // one, and a copy at those labels would charge the line every year at prices (§7.3's rule (a)), so such a plan is a
    // writer bug, named. The LITERAL successor again, never `CURRENT_SCHEMA_VERSION` (the 3 → 4 note above). Read forever.
    if (version === 7) {
      const newer = versionEightFieldIn(parsed)
      if (newer !== undefined) {
        throw new Corrupt(
          `${newer}: a plan saved as version ${onDisk} cannot carry it — no build that writes version ${onDisk} writes it (writer bug)`,
        )
      }
      parsed.schemaVersion = 8
      version = 8
    }
    // 8 → 9, LABEL ONLY (gap 5's U1): version 9 adds one OPTIONAL top-level field, the one-time money list, so a
    // version-8 plan is a version-9 plan holding none, and the step writes nothing into it. Before the relabel, a plan
    // whose DISK label is 3 to 8 and that carries the list is refused: no build writing those labels writes it, and a
    // copy at those labels would run the plan without the money (§7.3's rule (a)), so such a plan is a writer bug,
    // named. The LITERAL successor again, never `CURRENT_SCHEMA_VERSION` (the 3 → 4 note above). Read forever.
    if (version === 8) {
      const newer = versionNineFieldIn(parsed)
      if (newer !== undefined) {
        throw new Corrupt(
          `${newer}: a plan saved as version ${onDisk} cannot carry it — no build that writes version ${onDisk} writes it (writer bug)`,
        )
      }
      parsed.schemaVersion = 9
      version = 9
    }
    // 9 → 10, LABEL ONLY (gap 5's U7): version 10 adds one KIND to the one-time money list, the home sale, with its own
    // flat fields, so a version-9 plan is a version-10 plan holding no home sale, and the step writes nothing into it.
    // Before the relabel, a plan whose DISK label is 3 to 9 and that carries a home sale is refused: no build writing
    // those labels writes one, and after the relabel the kind vocabulary would accept it, so such a plan is a writer bug,
    // named (§7.3). (A list at labels 3 to 8 is refused by the 8 → 9 step first.) The LITERAL successor again, never
    // `CURRENT_SCHEMA_VERSION` (the 3 → 4 note above). Read forever.
    if (version === 9) {
      const newer = versionTenFieldIn(parsed)
      if (newer !== undefined) {
        throw new Corrupt(
          `${newer}: a plan saved as version ${onDisk} cannot carry it — no build that writes version ${onDisk} writes it (writer bug)`,
        )
      }
      parsed.schemaVersion = 10
      version = 10
    }
    if (version === CURRENT_SCHEMA_VERSION) {
      const droppedAtoms = [...stepDrops, ...checkV3Fields(parsed)]
      return { ok: true, scenario: parsed as unknown as CurrentScenario, droppedAtoms }
    }
  } catch (e) {
    if (e instanceof Corrupt) return { ok: false, reason: 'corrupt', detail: e.detail }
    throw e
  }

  // Reached by 0 and below, or by a version no arm takes — the latter only if a bump raised the
  // constant without adding its step (the ladder pin in the codec suite reds on exactly that).
  return { ok: false, reason: 'corrupt', detail: `scenario.schemaVersion: ${onDisk} is not a valid version` }
}
