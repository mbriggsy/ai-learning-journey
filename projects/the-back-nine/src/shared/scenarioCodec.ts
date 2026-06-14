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
 * enabler). v1/v2 decode today; an INTEGER version above the ladder surfaces the calm
 * "saved by a newer version" state — which is exactly what makes deferring ScenarioV3
 * (it lands with its first producer, P2 intake) safe. A non-integer version is
 * corruption, not a branch.
 *
 * TOLERANT READER: unknown extra fields pass through untouched — the additive-within-
 * version pattern (hsa, contributions) depends on an older reader accepting a newer
 * sibling's additive optional fields under the SAME schemaVersion.
 */
import {
  DRAWDOWN_POLICIES,
  FILING_STATUSES,
  SEXES,
  type AnyScenario,
  type Scenario,
  type ScenarioV2,
} from './model'

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
  } catch (e) {
    if (e instanceof Corrupt) return { ok: false, reason: 'corrupt', detail: e.detail }
    throw e
  }

  if (version > 2) return { ok: false, reason: 'newer-version', got: version }
  return { ok: false, reason: 'corrupt', detail: `scenario.schemaVersion: ${version} is not a valid version` }
}
