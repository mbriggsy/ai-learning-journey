/**
 * BIT identity for engine payloads — the comparator behind the solve-time builds' identity gate
 * (`src/ui/__tests__/solvePayloadIdentity.test.ts`). A test HELPER (no `.test.` in the name, so vitest
 * never collects it), shared by the engine lever proofs and the ui-level gate.
 *
 * WHY NOT `toEqual`. A perf refactor that reorders a sum moves the LAST ulp of a figure; `toEqual`
 * (`Object.is` on numbers) catches that, but it also treats an own `undefined` key as absent, ignores
 * key ORDER, and walks typed arrays loosely. Every one of those is a way two payloads can differ on
 * the wire or in a serialized record while the assertion stays green. This walk refuses all of them:
 *
 *  - numbers compare by their IEEE-754 bit pattern (`-0` ≠ `0`, NaN payloads compare by bits);
 *  - an object's OWN keys compare in ORDER, and an own key holding `undefined` ≠ an absent key;
 *  - arrays and typed arrays compare element-wise, typed arrays also by constructor;
 *  - anything the walk cannot vouch for (a function, a symbol key, a Map/Set, a class instance other
 *    than a typed array / ArrayBuffer) THROWS — an unsupported shape must never compare "equal".
 *
 * `bitDigest` folds the SAME walk into a 64-bit FNV-1a hex digest: a same-machine anchor across
 * commits (never a committed CI pin — Node 24 locally vs Node 22 in CI makes a cross-version
 * transcendental digest a possible flake; CLAUDE.md's cross-engine contract).
 */

export type BitDiff = { readonly ok: true } | { readonly ok: false; readonly path: string; readonly a: string; readonly b: string }

const f64 = new Float64Array(1)
const u32 = new Uint32Array(f64.buffer)
const numberBits = (n: number): string => {
  f64[0] = n
  return `${u32[1]!.toString(16).padStart(8, '0')}${u32[0]!.toString(16).padStart(8, '0')}`
}

const describe = (v: unknown): string => {
  if (typeof v === 'number') return `${String(v)} (bits ${numberBits(v)})`
  if (typeof v === 'string') return JSON.stringify(v.length > 80 ? `${v.slice(0, 80)}…` : v)
  if (Array.isArray(v)) return `Array(${v.length})`
  if (ArrayBuffer.isView(v)) return `${v.constructor.name}(${(v as unknown as ArrayLike<number>).length})`
  if (v !== null && typeof v === 'object') return `{${Object.keys(v).slice(0, 8).join(', ')}}`
  return String(v)
}

const isPlainObject = (v: object): boolean => {
  const proto = Object.getPrototypeOf(v)
  return proto === Object.prototype || proto === null
}

function unsupported(path: string, v: unknown): never {
  throw new Error(`[bitIdentity] ${path}: unsupported value shape (${typeof v} ${String((v as object)?.constructor?.name)}) — extend the walk, never compare it loosely`)
}

/** Walk `a` and `b` in lockstep; the first differing path, or ok. */
export function bitEqual(a: unknown, b: unknown, path = '$'): BitDiff {
  const fail = (): BitDiff => ({ ok: false, path, a: describe(a), b: describe(b) })
  if (typeof a !== typeof b) return fail()
  switch (typeof a) {
    case 'number':
      return numberBits(a) === numberBits(b as number) ? { ok: true } : fail()
    case 'string':
    case 'boolean':
    case 'undefined':
      return a === b ? { ok: true } : fail()
    case 'bigint':
      return a === b ? { ok: true } : fail()
    case 'object':
      break
    default:
      unsupported(path, a)
  }
  if (a === null || b === null) return a === b ? { ok: true } : fail()
  const ao = a as object
  const bo = b as object

  if (ao instanceof ArrayBuffer || bo instanceof ArrayBuffer) {
    if (!(ao instanceof ArrayBuffer && bo instanceof ArrayBuffer)) return fail()
    return bitEqual(new Uint8Array(ao), new Uint8Array(bo), path)
  }
  if (ArrayBuffer.isView(ao) || ArrayBuffer.isView(bo)) {
    if (!ArrayBuffer.isView(ao) || !ArrayBuffer.isView(bo) || ao.constructor !== bo.constructor) return fail()
    const x = ao as unknown as ArrayLike<number>
    const y = bo as unknown as ArrayLike<number>
    if (x.length !== y.length) return { ok: false, path: `${path}.length`, a: String(x.length), b: String(y.length) }
    for (let i = 0; i < x.length; i++) {
      const d = bitEqual(x[i], y[i], `${path}[${i}]`)
      if (!d.ok) return d
    }
    return { ok: true }
  }
  if (Array.isArray(ao) || Array.isArray(bo)) {
    if (!Array.isArray(ao) || !Array.isArray(bo)) return fail()
    if (ao.length !== bo.length) return { ok: false, path: `${path}.length`, a: String(ao.length), b: String(bo.length) }
    for (let i = 0; i < ao.length; i++) {
      // A HOLE is not `undefined` — compare presence too.
      if (i in ao !== i in bo) return { ok: false, path: `${path}[${i}]`, a: i in ao ? 'present' : 'hole', b: i in bo ? 'present' : 'hole' }
      const d = bitEqual(ao[i], bo[i], `${path}[${i}]`)
      if (!d.ok) return d
    }
    return { ok: true }
  }
  if (!isPlainObject(ao)) unsupported(path, ao)
  if (!isPlainObject(bo)) unsupported(path, bo)
  if (Object.getOwnPropertySymbols(ao).length > 0) unsupported(path, ao)
  if (Object.getOwnPropertySymbols(bo).length > 0) unsupported(path, bo)
  const ak = Object.keys(ao)
  const bk = Object.keys(bo)
  if (ak.join('\u0000') !== bk.join('\u0000')) {
    return { ok: false, path: `${path} (own keys, in order)`, a: ak.join(', '), b: bk.join(', ') }
  }
  for (const k of ak) {
    const d = bitEqual((ao as Record<string, unknown>)[k], (bo as Record<string, unknown>)[k], `${path}.${k}`)
    if (!d.ok) return d
  }
  return { ok: true }
}

/** The same walk folded into a 64-bit FNV-1a digest (two 32-bit lanes) — a same-machine anchor. */
export function bitDigest(v: unknown): string {
  // Two INDEPENDENT 32-bit lanes. Each multiplier must be ODD: an even one shifts low bits out on
  // every byte, and a long walk flushes that lane to a constant (the first cut did exactly that).
  let h1 = 0x811c9dc5
  let h2 = 0x9747b28c
  const feed = (s: string): void => {
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i)
      h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0
      h2 = Math.imul(h2 ^ c, 0x5bd1e995) >>> 0
    }
  }
  const walk = (x: unknown, path: string): void => {
    switch (typeof x) {
      case 'number':
        feed(`n${numberBits(x)}`)
        return
      case 'string':
        feed(`s${x.length}:${x}`)
        return
      case 'boolean':
        feed(x ? 'T' : 'F')
        return
      case 'undefined':
        feed('u')
        return
      case 'bigint':
        feed(`b${x.toString(16)}`)
        return
      case 'object':
        break
      default:
        unsupported(path, x)
    }
    if (x === null) return feed('z')
    if (x instanceof ArrayBuffer) return walk(new Uint8Array(x), path)
    if (ArrayBuffer.isView(x)) {
      const arr = x as unknown as ArrayLike<number>
      feed(`t${x.constructor.name}${arr.length}[`)
      for (let i = 0; i < arr.length; i++) walk(arr[i], `${path}[${i}]`)
      return feed(']')
    }
    if (Array.isArray(x)) {
      feed(`a${x.length}[`)
      for (let i = 0; i < x.length; i++) {
        if (!(i in x)) feed('h')
        else walk(x[i], `${path}[${i}]`)
      }
      return feed(']')
    }
    if (!isPlainObject(x) || Object.getOwnPropertySymbols(x).length > 0) unsupported(path, x)
    feed('{')
    for (const k of Object.keys(x)) {
      feed(`k${k.length}:${k}`)
      walk((x as Record<string, unknown>)[k], `${path}.${k}`)
    }
    feed('}')
  }
  walk(v, '$')
  return `${h1.toString(16).padStart(8, '0')}${h2.toString(16).padStart(8, '0')}`
}
