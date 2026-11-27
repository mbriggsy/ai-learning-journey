/**
 * The per-seed identity recorder (the Act 5 plan's Verification Contract, gap 3). Records every dev household the
 * app can open, through the app's own calls, as digests per arm, so `compare.mjs` can say key by key whether an
 * engine or `intakeMap` commit moved anything. `run.mjs` is the one entry (`pnpm engine:identity`); this file is
 * run by it twice, once in a frozen `git archive` copy of the base commit and once in the tree.
 *
 * Run alone: `pnpm exec tsx scripts/engine-sweep/record.ts --out=<file> [--keys=a,b] [--plant=<key>]`, from a
 * project root (the live project or a frozen copy). The `@…` aliases resolve through the CWD's `tsconfig.json`, so in
 * a frozen copy they bind to the copy's own `src`.
 *
 * Keys: every `DEV_SEEDS` entry and every `AGED_PLANTS` entry, sorted. A plant is built the way the app plants it
 * (`runPlantDevVault`, with the harness's clock pinned to the plant's view day): a save by this build, `savedAt`
 * pinned to the view day (never the wall clock, which `scenarioFromDraft` reads), the doctor, the codec round trip,
 * the unlock hydrate.
 *
 * Arms per key, each the app's own call (`src/store/memoryModel.ts`'s `recompute`, the table lane):
 *   - `inputs`: `buildSpineParams` / `buildDateInput`, so an `intakeMap` move shows even where outputs agree;
 *   - all retired: `spine` (the engine run with the band fan, the survivor reading and the health readout, the whole
 *     wire) and `spend` (the spend solve, only where the app dispatches it);
 *   - anyone working: `provisional` and `final` (the date search at each tier), `picture` (the money picture),
 *     `deep` (the crowned run: `buildTableBase`'s candidate at the band's offset, or the window top when no date was
 *     found, run in full with the same observers as the spine);
 *   - both routes: `table` (the year-by-year table's two one-path runs with ledger rows, and its meta).
 * A plain-object arm is digested per top-level field (`final.lifestyle`, `spine.taxAware`, …) plus its key list
 * (`final.$keys`), so a moved arm names the field that moved. A refusal, a `null` or a throw is recorded as a value.
 *
 * Output: deterministic JSON (no wall-clock field, no path); progress and timings go to stderr only, so two runs of
 * one tree come out byte-equal. One key at a time, each output digested and dropped. Never beside the suite or a fit
 * run (`docs/landmines.md`: low memory reaps background shells).
 *
 * `--plant=<key>` adds $1 to that key's first account, on a copy of its draft: the vacuity witness. Compared against
 * an unplanted record, exactly that key must move.
 */
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { AGED_PLANTS, DEV_SEEDS, GATE_DAY } from '@ui/devSeeds'
import { scenarioFromDraft } from '@ui/scenarioFromDraft'
import { draftFromScenario } from '@ui/draftFromScenario'
import { tableRequestsOn } from '@ui/workbench/tableRun'
import {
  buildDateInput,
  buildSpineParams,
  buildTableBase,
  workingYearLedgerForRun,
  workingYearLeftOverShownState,
} from '@intake/intakeMap'
import { runEngine } from '@engine/engineProtocol'
import { runDateSearch } from '@engine/dateSearch'
import { solveSpend } from '@engine/spendSolve'
import { FIRST_UNAMBIGUOUS_SAVE_DAY } from '@engine/pricingVersion'
import { decodeScenario, encodeScenario } from '@shared/scenarioCodec'
import type { ScenarioDraft } from '@store/memoryModel'
import { CURRENT_SCHEMA_VERSION, type CurrentScenario, type DateSearchOutcome, type DateTrackOutcome } from '@shared/model'

// ---------------------------------------------------------------------------------------------
// The digest: a canonical walk into SHA-256. Numbers by their IEEE bits (so -0 and 0 differ), typed arrays by
// constructor and bytes, own keys in order (so a reordered or newly present key moves the digest), `undefined`
// distinct from absent. Anything else (a Map, a class instance, a function) throws: an unsupported shape is a
// recorder fault, never a silent skip.
// ---------------------------------------------------------------------------------------------

const f64 = new DataView(new ArrayBuffer(8))
function numberBits(x: number): string {
  if (Number.isNaN(x)) return 'nan'
  f64.setFloat64(0, x)
  return f64.getBigUint64(0).toString(16)
}

function digest(value: unknown): string {
  const h = createHash('sha256')
  const walk = (x: unknown, path: string): void => {
    switch (typeof x) {
      case 'number':
        h.update(`n${numberBits(x)};`)
        return
      case 'string':
        h.update(`s${x.length}:${x};`)
        return
      case 'boolean':
        h.update(x ? 'T;' : 'F;')
        return
      case 'undefined':
        h.update('u;')
        return
      case 'bigint':
        h.update(`b${x.toString(16)};`)
        return
      case 'object':
        break
      default:
        throw new Error(`digest: unsupported ${typeof x} at ${path}`)
    }
    if (x === null) {
      h.update('z;')
      return
    }
    if (ArrayBuffer.isView(x)) {
      h.update(`A${x.constructor.name}:${x.byteLength}:`)
      h.update(new Uint8Array(x.buffer, x.byteOffset, x.byteLength))
      h.update(';')
      return
    }
    if (Array.isArray(x)) {
      h.update(`[${x.length};`)
      for (let i = 0; i < x.length; i++) walk(x[i], `${path}[${i}]`)
      h.update(']')
      return
    }
    const proto = Object.getPrototypeOf(x)
    if (proto !== Object.prototype && proto !== null) {
      throw new Error(`digest: unsupported ${(x as object).constructor?.name ?? 'object'} at ${path}`)
    }
    if (Object.getOwnPropertySymbols(x).length > 0) throw new Error(`digest: symbol key at ${path}`)
    const keys = Object.keys(x)
    h.update(`{${keys.length};`)
    for (const k of keys) {
      h.update(`k${k.length}:${k};`)
      walk((x as Record<string, unknown>)[k], `${path}.${k}`)
    }
    h.update('}')
  }
  walk(value, '$')
  return h.digest('hex').slice(0, 32)
}

const isPlainObject = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null && !Array.isArray(x) && !ArrayBuffer.isView(x) &&
  (Object.getPrototypeOf(x) === Object.prototype || Object.getPrototypeOf(x) === null)

/** One arm into the record: per top-level field plus the key list for a plain object, else the whole value. */
function putArm(arms: Record<string, string>, name: string, value: unknown): void {
  if (isPlainObject(value)) {
    const keys = Object.keys(value)
    arms[`${name}.$keys`] = digest(keys)
    for (const k of keys) arms[`${name}.${k}`] = digest(value[k])
    return
  }
  arms[name] = digest(value)
}

// ---------------------------------------------------------------------------------------------
// The keys and their drafts
// ---------------------------------------------------------------------------------------------

type Built =
  | { readonly kind: 'seed'; readonly draft: ScenarioDraft }
  | { readonly kind: 'plant'; readonly draft: ScenarioDraft; readonly base: string; readonly viewDay: number }
  | { readonly kind: 'plant-refused'; readonly base: string; readonly viewDay: number; readonly reason: string }

function buildKey(key: string): Built {
  const plant = Object.hasOwn(AGED_PLANTS, key) ? AGED_PLANTS[key] : undefined
  if (plant === undefined) return { kind: 'seed', draft: DEV_SEEDS[key as keyof typeof DEV_SEEDS] }
  const viewDay = plant.viewDay ?? GATE_DAY
  const refused = (reason: string): Built => ({ kind: 'plant-refused', base: plant.base, viewDay, reason })
  const built = scenarioFromDraft(DEV_SEEDS[plant.base])
  if (!built.ready) return refused(`not-ready: ${built.detail}`)
  // The harness pins the page clock to the view day before planting, so the plant's save is stamped then.
  const save: CurrentScenario = { ...built.scenario, savedAt: Math.max(viewDay, FIRST_UNAMBIGUOUS_SAVE_DAY) }
  const round = decodeScenario(encodeScenario(plant.doctor(save, viewDay)))
  if (!round.ok) return refused('doctored-corrupt')
  if (round.droppedAtoms.length > 0) return refused(`record-dropped: ${round.droppedAtoms.join(',')}`)
  if (round.scenario.schemaVersion !== CURRENT_SCHEMA_VERSION) return refused(`schema ${round.scenario.schemaVersion}`)
  const hydrated = draftFromScenario(round.scenario)
  if (!hydrated.ok) return refused(`hydrate: ${hydrated.detail}`)
  return { kind: 'plant', draft: hydrated.draft, base: plant.base, viewDay }
}

/** The vacuity witness: $1 more in the first account, on a copy (the registry's draft is shared by the plants). */
function plantDollar(draft: ScenarioDraft): ScenarioDraft {
  const [first, ...rest] = draft.enteredAccounts ?? []
  if (first === undefined) throw new Error('--plant: the key has no entered account')
  return { ...draft, enteredAccounts: [{ ...first, valueToday: first.valueToday + 1 }, ...rest] }
}

// ---------------------------------------------------------------------------------------------
// One key's arms
// ---------------------------------------------------------------------------------------------

const OBSERVERS = { bandFan: true, survivorConditioned: true, healthReadout: true } as const

interface KeyRecord {
  route: 'spine' | 'date' | 'refused'
  base?: string
  viewDay?: number
  arms: Record<string, string>
  readable: Record<string, string>
  threw?: string[]
}

const trackWords = (t: DateTrackOutcome): string =>
  t.kind === 'no-date-in-window' ? t.kind : `${t.kind}@${t.offsetYears} (survival ${t.grade.survivalFraction})`

function crownWords(o: DateSearchOutcome): string {
  if (o.kind !== 'dates') return o.kind
  const band = o.band === undefined ? 'no band' : `band ${o.band.track}@${o.band.offsetYears}`
  return `floor ${trackWords(o.floor)}, lifestyle ${trackWords(o.lifestyle)}, ${band}`
}

async function recordKey(key: string, planted: boolean): Promise<KeyRecord> {
  const built = buildKey(key)
  const rec: KeyRecord = { route: 'refused', arms: {}, readable: {} }
  if (built.kind !== 'seed') {
    rec.base = built.base
    rec.viewDay = built.viewDay
  }
  if (built.kind === 'plant-refused') {
    putArm(rec.arms, 'plant', built.reason)
    rec.readable.plant = built.reason
    return rec
  }
  const draft = planted ? plantDollar(built.draft) : built.draft
  // Each arm in its own guard: a throw is recorded as a value (the app shows its calm error), and named on stderr.
  const arm = async (name: string, f: () => unknown): Promise<unknown> => {
    try {
      const v = await f()
      putArm(rec.arms, name, v)
      return v
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      putArm(rec.arms, name, { threw: msg })
      ;(rec.threw ??= []).push(`${name}: ${msg}`)
      return undefined
    }
  }

  // The app mints a random seed for a draft with none (`ensureSeed`): such a record could never reproduce.
  const seed = draft.seed
  if (seed === undefined) throw new Error(`${key}: the draft carries no seed`)
  if (!draft.people.every((p) => p.workStatus !== undefined)) {
    putArm(rec.arms, 'route', 'work status unanswered')
    return rec
  }

  if (draft.people.some((p) => p.workStatus === 'working')) {
    const input = buildDateInput(draft)
    putArm(rec.arms, 'inputs', input)
    if (input === null) return rec
    rec.route = 'date'
    const prov = (await arm('provisional', () => runDateSearch(input, seed, { tier: 'provisional' }))) as DateSearchOutcome | undefined
    const fin = (await arm('final', () => runDateSearch(input, seed, { tier: 'final' }))) as DateSearchOutcome | undefined
    if (prov !== undefined) rec.readable.provisional = crownWords(prov)
    if (fin !== undefined) rec.readable.final = crownWords(fin)
    await arm('picture', () => workingYearLedgerForRun(draft))
    if (fin === undefined) return rec
    const base = buildTableBase(draft, fin)
    if (base.kind !== 'run') {
      putArm(rec.arms, 'deep', { withheld: base.reason })
      putArm(rec.arms, 'table', { withheld: base.reason })
      return rec
    }
    const deep = (await arm('deep', () => runEngine(base.params, seed, OBSERVERS))) as { kind: string; survivalFraction?: number } | undefined
    if (deep?.survivalFraction !== undefined) rec.readable.deep = `survival ${deep.survivalFraction}`
    await recordTable(rec, arm, draft, base)
    return rec
  }

  const params = buildSpineParams(draft)
  putArm(rec.arms, 'inputs', params)
  if (params === null) return rec
  rec.route = 'spine'
  const wire = (await arm('spine', () => runEngine(params, seed, OBSERVERS))) as ReturnType<typeof runEngine> | undefined
  if (wire?.kind === 'resolved') {
    rec.readable.spine = `survival ${wire.survivalFraction}, ${wire.dollar.direction}`
    // The app's spend dispatch (`recompute`'s final spine commit): a room or trim verdict on a budgetless plan.
    if ((wire.dollar.direction === 'room' || wire.dollar.direction === 'trim') && params.budget === undefined) {
      const spend = (await arm('spend', () => solveSpend(params, seed))) as { kind: string; monthlyReal?: number } | undefined
      if (spend !== undefined) rec.readable.spend = spend.monthlyReal === undefined ? spend.kind : `${spend.kind} ${spend.monthlyReal}`
    }
  }
  const base = buildTableBase(draft, undefined)
  if (base.kind !== 'run') putArm(rec.arms, 'table', { withheld: base.reason })
  else await recordTable(rec, arm, draft, base)
  return rec
}

/** The table lane: the two views' one-path runs with ledger rows (`runLanes.ts`), and the meta beside them. */
async function recordTable(
  rec: KeyRecord,
  arm: (name: string, f: () => unknown) => Promise<unknown>,
  draft: ScenarioDraft,
  base: Extract<ReturnType<typeof buildTableBase>, { kind: 'run' }>,
): Promise<void> {
  const held: { reqs?: ReturnType<typeof tableRequestsOn> } = {}
  await arm('table.meta', () => {
    held.reqs = tableRequestsOn(draft, base, workingYearLeftOverShownState(draft))
    return held.reqs.meta
  })
  const reqs = held.reqs
  if (reqs === undefined) return
  for (const view of ['steady', 'rough'] as const) {
    const v = reqs.views[view]
    if (v.kind === 'refused') putArm(rec.arms, `table.${view}`, { refused: v.reason })
    else await arm(`table.${view}`, () => runEngine(v.request.params, v.request.seed, v.request.options))
  }
}

// ---------------------------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------------------------

function argOf(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit === undefined ? undefined : hit.slice(name.length + 3)
}

async function main(): Promise<void> {
  const out = argOf('out')
  if (out === undefined) throw new Error('usage: record.ts --out=<file> [--keys=a,b] [--plant=<key>]')
  const plant = argOf('plant')
  const seedKeys = Object.keys(DEV_SEEDS)
  const plantKeys = Object.keys(AGED_PLANTS)
  const clash = seedKeys.filter((k) => plantKeys.includes(k))
  if (clash.length > 0) throw new Error(`a key is both a seed and a plant: ${clash.join(', ')}`)
  const all = [...seedKeys, ...plantKeys].sort()
  const filter = argOf('keys')?.split(',').filter((k) => k !== '')
  const keys = filter === undefined ? all : all.filter((k) => filter.includes(k))
  if (filter !== undefined) for (const k of filter) if (!all.includes(k)) process.stderr.write(`[record] no such key here: ${k}\n`)
  if (plant !== undefined && !keys.includes(plant)) throw new Error(`--plant=${plant} is not among the recorded keys`)

  // The recorder's own digest (LF-normalized): `compare.mjs` refuses two records made by different recorders.
  const self = readFileSync(fileURLToPath(import.meta.url), 'utf8').replace(/\r\n/g, '\n')
  const record: {
    meta: { recorder: string; node: string; keys: string[]; filter: string[] | null; plant: string | null }
    keys: Record<string, KeyRecord>
  } = {
    meta: { recorder: digest(self), node: process.version, keys, filter: filter ?? null, plant: plant ?? null },
    keys: {},
  }
  const t0 = Date.now()
  for (const [i, key] of keys.entries()) {
    const t = Date.now()
    const rec = await recordKey(key, key === plant)
    record.keys[key] = rec
    const threw = rec.threw === undefined ? '' : `  THREW ${rec.threw.join(' | ')}`
    process.stderr.write(`[record] ${i + 1}/${keys.length} ${key} (${rec.route}) ${((Date.now() - t) / 1000).toFixed(1)}s${threw}\n`)
  }
  writeFileSync(out, `${JSON.stringify(record, null, 1)}\n`)
  process.stderr.write(`[record] ${keys.length} keys in ${((Date.now() - t0) / 60000).toFixed(1)} min -> ${out}\n`)
}

main().catch((e: unknown) => {
  process.stderr.write(`[record] FAILED: ${e instanceof Error ? (e.stack ?? e.message) : String(e)}\n`)
  process.exit(1)
})
