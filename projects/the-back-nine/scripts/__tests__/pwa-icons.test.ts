import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { inflateSync } from 'node:zlib'
import { join } from 'node:path'

/*
 * scripts/__tests__/pwa-icons.test.ts — the app mark's regression guard.
 *
 * The icon set is spread across FIVE surfaces — nine files — that nothing links together at build
 * time: public/icon.svg (the one silhouette source); the five rasters cut from it (icon-192.png,
 * icon-512.png, icon-512-maskable.png, apple-touch-icon.png, favicon.ico); the `icons` array in
 * public/manifest.webmanifest; the <link rel="icon"> tags in index.html; and the `globPatterns` in
 * vite.config.ts that decides whether an installed PWA has its icon OFFLINE. Every one of those can
 * be edited alone and every failure mode is SILENT: a manifest entry pointing at a deleted file
 * makes the app quietly uninstallable, a narrowed glob (or a widened `globIgnores`) quietly drops
 * the icons out of the precache, a `sizes` that disagrees with the real pixels quietly makes the
 * browser pick the wrong frame, and an SVG that fails to parse rasterizes as a plain green square
 * with no error anywhere. `pnpm build` is green for all of it. So this reads the REAL BYTES of each
 * file and pins them against each other.
 *
 * Two kinds of arm here, and the split is the point:
 *   · The sha256 pins fix THESE EXACT BYTES to each other. Move the silhouette and every raster pin
 *     reds until the whole set is re-cut (`node scripts/icons/render-icons.mjs`) and every literal
 *     re-measured in one pass — which is what makes "edit the silhouette, forget the rasters"
 *     impossible to ship quietly. index.html serves icon.svg straight to the browser tab, so that
 *     mistake means the tab wears the NEW mark while every installed tile wears the OLD one. (A
 *     re-run that changes nothing reds nothing: the render is deterministic, and these shipped
 *     bytes were reproduced from this silhouette byte-for-byte on 2026-09-08.)
 *   · The PIXEL arms judge whatever the new bytes turn out to be — real ink on a house-green
 *     ground, every maskable mark inside the safe circle. They are what survives a deliberate bump,
 *     and they are the only arms that can see the green-square failure at all.
 *
 * Sibling of csp-headers.test.ts: same shape (parse the shipped config, assert the whole table,
 * authored failure messages), same reason (a load-bearing file that may not drift silently).
 * The one-time proof that the precache actually carries the icons is `grep url: dist/sw.js` after a
 * build; this test is the standing gate, because a manual grep is not a gate.
 */

const ROOT = process.cwd()
const PUBLIC = join(ROOT, 'public')

interface ManifestIcon {
  src: string
  sizes: string
  type: string
  purpose?: string
}
interface WebManifest {
  icons?: ManifestIcon[]
  background_color?: string
  theme_color?: string
}

const manifest = JSON.parse(readFileSync(join(PUBLIC, 'manifest.webmanifest'), 'utf-8')) as WebManifest
const indexHtml = readFileSync(join(ROOT, 'index.html'), 'utf-8')
const viteConfig = readFileSync(join(ROOT, 'vite.config.ts'), 'utf-8')

/** A manifest/link href is site-absolute ("/icon-192.png"); the file lives in public/. */
const publicPathOf = (href: string) => join(PUBLIC, href.replace(/^\//, ''))

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

/** Real dimensions, bit depth, colour type and interlace straight out of the PNG IHDR chunk — never
 *  the filename, never the manifest's own claim (that is the value under test). PNG colour types:
 *  0 greyscale, 2 truecolour (RGB, NO alpha channel), 3 palette, 4 greyscale+alpha, 6
 *  truecolour+alpha. Takes BYTES, not a path, because the ICO's frames are PNGs embedded inside
 *  another container and must be read the same way. */
function pngHeaderIn(
  b: Buffer,
  label: string,
): { width: number; height: number; depth: number; colourType: number; interlace: number } {
  if (!b.subarray(0, 8).equals(PNG_SIG)) throw new Error(`${label} is not a PNG (bad signature)`)
  if (b.subarray(12, 16).toString('ascii') !== 'IHDR') throw new Error(`${label}: first chunk is not IHDR`)
  return {
    width: b.readUInt32BE(16),
    height: b.readUInt32BE(20),
    depth: b.readUInt8(24),
    colourType: b.readUInt8(25),
    interlace: b.readUInt8(28),
  }
}
const pngHeader = (file: string) => pngHeaderIn(readFileSync(file), file)

/** PNG colour type 2: truecolour with no alpha channel, so the image CANNOT carry transparency. */
const RGB_NO_ALPHA = 2

interface Raster {
  width: number
  height: number
  channels: number
  /** Unfiltered 8-bit samples, `channels` per pixel, row-major. */
  pixels: Buffer
  stride: number
}

/** Decode a PNG to raw samples BY HAND — node:zlib plus the five PNG filter types, no new
 *  dependency. (Clean-clone law: a pixel gate that needs `pngjs` or `sharp` is a gate that needs an
 *  install, and this file must run wherever `pnpm test` runs.) Only what these rasters actually are
 *  is handled — bit depth 8, non-interlaced, colour type 2 or 6 — and anything else THROWS rather
 *  than being silently mis-read as a wall of ink or a wall of ground. */
function decodePng(bytes: Buffer, label: string): Raster {
  const { width, height, depth, colourType, interlace } = pngHeaderIn(bytes, label)
  if (depth !== 8) throw new Error(`${label}: PNG bit depth ${depth}; this decoder reads depth 8 only`)
  if (interlace !== 0) throw new Error(`${label}: interlaced PNG; this decoder reads interlace 0 only`)
  if (colourType !== 2 && colourType !== 6)
    throw new Error(`${label}: PNG colour type ${colourType}; this decoder reads 2 (RGB) and 6 (RGBA) only`)
  const channels = colourType === RGB_NO_ALPHA ? 3 : 4

  // One PNG's zlib stream may be split across any number of IDAT chunks; concatenate in order.
  const parts: Buffer[] = []
  let p = 8
  while (p + 8 <= bytes.length) {
    const len = bytes.readUInt32BE(p)
    const type = bytes.subarray(p + 4, p + 8).toString('ascii')
    if (type === 'IDAT') parts.push(bytes.subarray(p + 8, p + 8 + len))
    p += 12 + len // 4 length + 4 type + data + 4 CRC
    if (type === 'IEND') break
  }
  if (parts.length === 0) throw new Error(`${label}: PNG carries no IDAT chunk`)

  const raw = inflateSync(Buffer.concat(parts))
  const stride = width * channels
  if (raw.length < height * (stride + 1)) throw new Error(`${label}: PNG data is short (${raw.length} bytes)`)

  const pixels = Buffer.alloc(height * stride)
  let r = 0
  for (let y = 0; y < height; y++) {
    const filter = raw[r++]!
    const row = y * stride
    const prev = (y - 1) * stride
    for (let x = 0; x < stride; x++) {
      const v = raw[r + x]!
      const a = x >= channels ? pixels[row + x - channels]! : 0 // left
      const b = y > 0 ? pixels[prev + x]! : 0 // up
      const c = y > 0 && x >= channels ? pixels[prev + x - channels]! : 0 // up-left
      let out: number
      switch (filter) {
        case 0:
          out = v
          break
        case 1:
          out = v + a
          break
        case 2:
          out = v + b
          break
        case 3:
          out = v + ((a + b) >> 1)
          break
        case 4: {
          // Paeth: pick whichever neighbour the linear predictor a+b-c is nearest to.
          const pred = a + b - c
          const pa = Math.abs(pred - a)
          const pb = Math.abs(pred - b)
          const pc = Math.abs(pred - c)
          out = v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)
          break
        }
        default:
          throw new Error(`${label}: PNG scanline ${y} uses filter type ${filter}`)
      }
      pixels[row + x] = out & 0xff
    }
    r += stride
  }
  return { width, height, channels, pixels, stride }
}

/** #0b3d2e — the house ink every tile is grounded on, as the RGB triple a decoded sample gives. */
const GROUND = [0x0b, 0x3d, 0x2e] as const
/** The mark is cream #faf7f2. A pixel above this on all three channels is ink; below it is ground
 *  or the antialiased edge between the two. Same test scripts/icons/render-icons.mjs uses in its
 *  own fail-loud probe (`px[i] > 200` on r, g and b), so the numbers below are comparable to what
 *  the generator refuses to write. */
const CREAM_MIN = 200
/** The shipped tiles carry up to 1/255 of encoder jitter on their flat ground (measured: 879 px of
 *  icon-512-maskable.png read 10,60,45 rather than 11,61,46), so "is the ground" cannot mean "is
 *  byte-exact". 8 is a generous ceiling for that jitter and still two orders below real ink — the
 *  cream sits 239 units off the ground on the red channel. */
const GROUND_JITTER = 8

interface Ink {
  /** Cream pixels as a fraction of the tile. A blank tile is 0; a drowned one is ~1. */
  fraction: number
  /** Distance from the tile's centre to the farthest CORNER of any cream pixel's cell — the corner,
   *  not the centre, so a mark that merely grazes a boundary counts as crossing it. */
  farthestCorner: number
  /** Pixels lying WHOLLY outside the maskable safe circle that are not the ground colour. */
  strays: number
  strayWitness: string | null
}

/** Every measurement the pixel arms need, in one pass over the decoded samples. The safe circle is
 *  the centre 80 % of the tile's DIAMETER — the region an Android adaptive-icon mask is guaranteed
 *  to keep — so its radius is 0.4 × width. */
function inkOf(img: Raster): Ink {
  const { width, height, channels, pixels, stride } = img
  const cx = width / 2
  const cy = height / 2
  const safeRadius = 0.4 * width
  let cream = 0
  let farthestCorner = 0
  let strays = 0
  let strayWitness: string | null = null
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * stride + x * channels
      const r = pixels[i]!
      const g = pixels[i + 1]!
      const b = pixels[i + 2]!
      if (r > CREAM_MIN && g > CREAM_MIN && b > CREAM_MIN) {
        cream++
        const far = Math.hypot(
          Math.max(Math.abs(x - cx), Math.abs(x + 1 - cx)),
          Math.max(Math.abs(y - cy), Math.abs(y + 1 - cy)),
        )
        if (far > farthestCorner) farthestCorner = far
      }
      // Nearest point of this pixel's cell to the centre: beyond the safe radius, the WHOLE cell is
      // outside the mask's guaranteed region, so nothing but ground may be painted there.
      const near = Math.hypot(Math.max(0, Math.abs(x + 0.5 - cx) - 0.5), Math.max(0, Math.abs(y + 0.5 - cy) - 0.5))
      if (near > safeRadius) {
        const off = Math.max(Math.abs(r - GROUND[0]), Math.abs(g - GROUND[1]), Math.abs(b - GROUND[2]))
        if (off > GROUND_JITTER) {
          strays++
          strayWitness ??= `(${x},${y}) is ${r},${g},${b} at ${near.toFixed(1)} px from centre`
        }
      }
    }
  }
  return { fraction: cream / (width * height), farthestCorner, strays, strayWitness }
}

interface IcoFrame {
  /** The ICONDIRENTRY's own width byte (0 encodes 256) — a CLAIM about the blob, not a reading. */
  declared: number
  kind: 'png' | 'other'
  /** The blob's own IHDR: the independent second reading the claim above must agree with. */
  header: { width: number; height: number; colourType: number } | null
  /** dwBytesInRes — the directory's claim about the blob's length. */
  length: number
  /** Where the blob's PNG chunk chain ends — meaningful only once `sawIend` is true, since a walk
   *  off the end of a truncated blob also has to stop somewhere. */
  chunkSpan: number
  /** Did the chunk chain actually reach IEND inside the bytes the directory handed it? */
  sawIend: boolean
  bytes: Buffer
}

/** The ICO container, parsed the way a browser must: 6-byte ICONDIR, then one 16-byte ICONDIRENTRY
 *  per frame carrying the frame's declared size plus the byte range of its image blob. The
 *  directory byte and the embedded PNG are two INDEPENDENT claims about the same frame and nothing
 *  but this test compares them: the container is hand-packed by scripts/icons/render-icons.mjs, so
 *  no encoder ever validates it. */
function icoFrames(file: string): IcoFrame[] {
  const b = readFileSync(file)
  if (b.readUInt16LE(0) !== 0) throw new Error(`${file}: ICONDIR reserved field is not 0`)
  if (b.readUInt16LE(2) !== 1) throw new Error(`${file}: ICONDIR type is not 1 (icon)`)
  const count = b.readUInt16LE(4)
  const frames: IcoFrame[] = []
  for (let i = 0; i < count; i++) {
    const o = 6 + 16 * i
    const len = b.readUInt32LE(o + 8)
    const off = b.readUInt32LE(o + 12)
    if (off + len > b.length) throw new Error(`${file}: frame ${i} runs past EOF (${off}+${len} > ${b.length})`)
    const blob = b.subarray(off, off + len)
    const isPng = blob.subarray(0, 8).equals(PNG_SIG)
    const declared = b.readUInt8(o) === 0 ? 256 : b.readUInt8(o)
    // Walk the blob's chunk chain to IEND. Where the image really ends is where IEND lands, so a
    // truncated blob (or a dwBytesInRes that over- or under-claims) stops agreeing with the
    // directory: a short one never reaches IEND at all, a long one reaches it early.
    let chunkSpan = 0
    let sawIend = false
    if (isPng) {
      let p = 8
      while (p + 8 <= blob.length) {
        const clen = blob.readUInt32BE(p)
        const type = blob.subarray(p + 4, p + 8).toString('ascii')
        p += 12 + clen
        if (type === 'IEND') {
          sawIend = true
          break
        }
      }
      chunkSpan = p
    }
    frames.push({
      declared,
      kind: isPng ? 'png' : 'other',
      header: isPng ? pngHeaderIn(blob, `${file} frame ${i}`) : null,
      length: len,
      chunkSpan,
      sawIend,
      bytes: blob,
    })
  }
  return frames
}

/** Every `href` on a <link rel="icon"|"apple-touch-icon"> in index.html, with its `sizes` if given. */
function iconLinks(): { rel: string; href: string; sizes?: string }[] {
  const out: { rel: string; href: string; sizes?: string }[] = []
  for (const m of indexHtml.matchAll(/<link\b[^>]*>/g)) {
    const tag = m[0]
    const rel = tag.match(/\brel="([^"]+)"/)?.[1]
    if (rel !== 'icon' && rel !== 'apple-touch-icon') continue
    const href = tag.match(/\bhref="([^"]+)"/)?.[1]
    if (href === undefined) throw new Error(`index.html: <link rel="${rel}"> has no href`)
    out.push({ rel, href, sizes: tag.match(/\bsizes="([^"]+)"/)?.[1] })
  }
  return out
}

/** Every icon as the path it lands on in dist/ — public/ is copied to the dist ROOT, so "/icon.svg"
 *  becomes "icon.svg" and that is the path a workbox glob is matched against. */
function iconDistPaths(): string[] {
  const all = [...manifest.icons!.map((i) => i.src), ...iconLinks().map((l) => l.href)]
  return [...new Set(all.map((h) => h.replace(/^\//, '')))].sort()
}

// Every pattern in vite.config.ts's workbox `globPatterns` array — ALL of them, not just the first.
// Parsed rather than string-matched so a REORDER stays green and a REMOVAL reds.
function precacheGlobs(): string[] {
  const arr = viteConfig.match(/globPatterns:\s*\[([\s\S]*?)\]/)?.[1]
  if (arr === undefined)
    throw new Error(
      "vite.config.ts: could not find a `globPatterns: ['…']` array. If its shape changed, re-derive this parser — do not delete the arm.",
    )
  const patterns = [...arr.matchAll(/'([^']+)'/g)].map((m) => m[1]!)
  if (patterns.length === 0) throw new Error('vite.config.ts: `globPatterns` is empty — nothing is precached at all')
  return patterns
}

// Same, for `globIgnores`. workbox-build hands it straight to globSync's `ignore`, so it SUBTRACTS
// from the patterns above — it can un-precache anything they matched, silently, long after the
// extension arm is satisfied. vite.config.ts's own rule beside it: it is for dead font subsets
// only, and no image belongs in it. That rule had no gate until this parser.
function precacheIgnores(): string[] {
  const arr = viteConfig.match(/globIgnores:\s*\[([\s\S]*?)\]/)?.[1]
  if (arr === undefined)
    throw new Error(
      "vite.config.ts: could not find a `globIgnores: ['…']` array. If it was renamed or removed, re-derive this parser — do not delete the arm.",
    )
  return [...arr.matchAll(/'([^']+)'/g)].map((m) => m[1]!)
}

// A minimal glob matcher: `**` spans directories (and `**` + slash also matches ZERO directories,
// which is exactly why a root-level `icon-192.png` is precached today), `*` stops at a slash,
// everything else is literal. Enough for every shape either array has ever held.
function globToRegExp(pattern: string): RegExp {
  let out = ''
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i]!
    if (c === '*') {
      if (pattern[i + 1] === '*') {
        i++
        if (pattern[i + 1] === '/') {
          i++
          out += '(?:.*/)?'
        } else out += '.*'
      } else out += '[^/]*'
    } else out += c.replace(/[.+^${}()|[\]\\?]/g, '\\$&')
  }
  return new RegExp(`^${out}$`)
}

// One globPatterns entry split into the two halves that matter: the PATH (does it reach the dist
// root, where everything in public/ lands?) and the TAIL (which extensions does it carry?). The
// tail is the only half the parser before this one read, which is exactly how a path narrowing goes
// unseen. An unreadable TAIL throws — re-derive the parser, never delete the arm — while an
// unreachable PATH is just reported, because that is the failure being guarded. Every entry is
// parsed BEFORE any is tested, so which entry throws never depends on the order they sit in.
function parseGlob(pattern: string): { pattern: string; reachesDistRoot: boolean; exts: string[] } {
  const slash = pattern.lastIndexOf('/')
  const dir = slash === -1 ? '' : pattern.slice(0, slash)
  const tail = pattern.slice(slash + 1).match(/^\*\.(?:\{([^}]+)\}|([A-Za-z0-9]+))$/)
  if (tail === null)
    throw new Error(
      `vite.config.ts: globPatterns entry '${pattern}' has no '*.ext' or '*.{ext,ext}' tail this arm can read — re-derive the parser, do not delete the arm.`,
    )
  const exts = tail[1] !== undefined ? tail[1].split(',').map((s) => s.trim()) : [tail[2]!]
  return { pattern, reachesDistRoot: dir === '' || dir === '**', exts }
}

/** The four PNG tiles plus the three frames inside the ICO, decoded, each under the name the pixel
 *  tables below key on. Everything the app ships as pixels, in one list. */
function everyRaster(): { name: string; img: Raster }[] {
  const out: { name: string; img: Raster }[] = []
  for (const file of ['icon-192.png', 'icon-512.png', 'icon-512-maskable.png', 'apple-touch-icon.png'])
    out.push({ name: file, img: decodePng(readFileSync(join(PUBLIC, file)), file) })
  for (const frame of icoFrames(join(PUBLIC, 'favicon.ico'))) {
    const name = `favicon.ico#${frame.declared}`
    out.push({ name, img: decodePng(frame.bytes, name) })
  }
  return out
}

/** The cream ink each raster carries as a fraction of its own pixels, MEASURED off the shipped
 *  bytes (2026-09-08) with the `> 200` cream test above. The ±25 % band is wide enough that
 *  antialiasing drift cannot red it — the 16 px favicon frame is by far the most quantized, 17 lit
 *  pixels out of 256, and the band still leaves it four pixels of slack either way — and narrow
 *  enough to red every failure this arm exists for: a blank tile (0), a drowned one (~1), and the
 *  0.86 maskable inset lost to a 1.0 re-render (0.0919 → 0.1250, past the 0.1149 ceiling).
 *  Re-measure off the new bytes; never nudge a literal to make a red go away. */
const INK_FRACTION: Record<string, number> = {
  'icon-192.png': 0.1222,
  'icon-512.png': 0.125,
  'icon-512-maskable.png': 0.0919,
  'apple-touch-icon.png': 0.1203,
  'favicon.ico#16': 0.0664,
  'favicon.ico#32': 0.1152,
  'favicon.ico#48': 0.1285,
}
const INK_TOLERANCE = 0.25

/** sha256 of the silhouette and of every raster cut from it, measured 2026-09-08 on the shipped
 *  bytes. BUMP THESE ONLY WITH A RE-RENDER OF EVERY RASTER via `node scripts/icons/render-icons.mjs`
 *  — all of them, re-measured in the same pass, never one literal at a time. That coupling IS the
 *  gate: it is the only thing that makes an edited silhouette with stale tiles fail loudly.
 *
 *  icon.svg is hashed as TEXT with its line endings normalised to LF; the binaries are hashed raw.
 *  No .gitattributes normalises anything today (so the two readings are the same value here), but a
 *  clone whose git checks the SVG out as CRLF must not red a gate about a mark that did not move.
 *
 *  A comment-only edit to icon.svg reds this too, and that is accepted: the hash cannot tell a
 *  comment byte from a path byte, and the cost of the false red (re-run the generator, confirm the
 *  rasters come back identical, bump one literal) is far below the cost of a silent drift. */
const SHA256: Record<string, string> = {
  'icon.svg': '5590a1ff648c6b8716efcaaa79a89e8ed8c5c42306eeaadcb272cf58b00bdeeb',
  'icon-192.png': '5122d2f66048ae25e561e3ebbd2b877149caa7addab186e2e80a6129d17e4d95',
  'icon-512.png': '97e13a61c59304b60984843b00046879ff80f11c76326e3239671d95dfbc66ab',
  'icon-512-maskable.png': 'a053881fa81228adf17baa884b010f5958e0a3240639af66beee4517a3bb9f6c',
  'apple-touch-icon.png': '74e12aa91fdfabb7ac016b03b62325698dc28eca3c8ee1b380ceceb1ceed45ee',
  'favicon.ico': '5ae2880058168e2cce112ee928b7135e7baac9a2ff755f344b8f87c7016f89dc',
}
function sha256Of(file: string): string {
  const bytes = readFileSync(file)
  const body = file.endsWith('.svg') ? Buffer.from(bytes.toString('utf-8').replace(/\r\n/g, '\n'), 'utf-8') : bytes
  return createHash('sha256').update(body).digest('hex')
}

describe('the app mark — manifest icons', () => {
  it('declares an icons array', () => {
    expect(
      manifest.icons,
      'public/manifest.webmanifest has no `icons` — without it the PWA is uninstallable no matter what is precached',
    ).toBeDefined()
    expect(manifest.icons!.length).toBeGreaterThan(0)
  })

  it('every icon file exists in public/ and its declared `sizes` matches its REAL pixels', () => {
    for (const icon of manifest.icons!) {
      const file = publicPathOf(icon.src)
      expect(existsSync(file), `manifest icon "${icon.src}" does not exist at ${file}`).toBe(true)
      expect(icon.type, `manifest icon "${icon.src}" declares type "${icon.type}"`).toBe('image/png')
      const { width, height, colourType } = pngHeader(file)
      expect(
        `${width}x${height}`,
        `manifest says "${icon.src}" is ${icon.sizes}; the file's PNG header says ${width}x${height}`,
      ).toBe(icon.sizes)
      // Every tile is FULL-BLEED house green, never a transparent-cornered mark. A maskable icon
      // with transparent corners shows the launcher's own background through the mask, and an "any"
      // icon with them gets shrunk onto a white plate by Android. Colour type 2 has no alpha channel
      // at all, so the file cannot be transparent — a stronger claim than sampling one pixel.
      expect(colourType, `${icon.src} carries an alpha channel (PNG colour type ${colourType})`).toBe(RGB_NO_ALPHA)
    }
  })

  it('ships exactly the three declared tiles: a 192 and a 512 `any`, plus a 512 `maskable`', () => {
    // The 192 and the 512 fill the install prompt's icon slots; the `maskable` copy is what lets an
    // Android adaptive-icon mask crop the GROUND instead of the mark. Pinning the exact set (not a
    // "contains" check) means adding or dropping a tile is a decision someone made, never a drift.
    const have = manifest.icons!.map((i) => `${i.sizes}/${i.purpose ?? 'any'}`).sort()
    expect(have).toEqual(['192x192/any', '512x512/any', '512x512/maskable'])
  })

  it('paints the tile on the same house green the splash uses', () => {
    // index.html's theme-color meta, the manifest's two color fields and the mark's own ground are
    // one value. A drift between them shows up as a flash of the wrong green on launch.
    expect(manifest.background_color).toBe('#0b3d2e')
    expect(manifest.theme_color).toBe('#0b3d2e')
    expect(indexHtml).toContain('<meta name="theme-color" content="#0b3d2e" />')
    expect(readFileSync(join(PUBLIC, 'icon.svg'), 'utf-8')).toContain('fill="#0b3d2e"')
  })
})

describe('the app mark — index.html links', () => {
  it('links the .ico, the .svg and the apple-touch-icon, and every href resolves', () => {
    const links = iconLinks()
    expect(links.map((l) => l.href).sort()).toEqual(['/apple-touch-icon.png', '/favicon.ico', '/icon.svg'])
    for (const l of links)
      expect(existsSync(publicPathOf(l.href)), `index.html <link rel="${l.rel}" href="${l.href}"> resolves to nothing`).toBe(
        true,
      )
  })

  it('the apple-touch-icon is a real 180×180 PNG that cannot be transparent', () => {
    // A home-screen tile is drawn on whatever ground the OS supplies, so any alpha here would let
    // that ground through around the mark. The tile paints its own #0b3d2e instead: colour type 2
    // has no alpha channel at all, which proves opacity from the header rather than sampling a
    // pixel and hoping. Depth and interlace ride along because the pixel arms below decode this
    // file, and a re-encode that changed either would be a silent change of format.
    expect(pngHeader(join(PUBLIC, 'apple-touch-icon.png'))).toEqual({
      width: 180,
      height: 180,
      depth: 8,
      colourType: RGB_NO_ALPHA,
      interlace: 0,
    })
  })

  it('the favicon.ico is a well-formed multi-frame ICO whose frames match the declared `sizes`', () => {
    // The container is hand-packed (scripts/icons/render-icons.mjs); a wrong offset yields a
    // plausible file a browser silently refuses. Read the directory and require every blob in
    // bounds + PNG — then require each blob's OWN IHDR to agree with the byte advertising it, and
    // its chunk chain to end exactly where dwBytesInRes says it does. Without those two, an entry
    // repointed at another frame's blob, or a truncated blob, reads perfectly from the directory
    // alone: the sizes still say 16/32/48 while the browser quietly refuses the frame.
    const frames = icoFrames(join(PUBLIC, 'favicon.ico'))
    expect(frames.map((f) => f.declared)).toEqual([16, 32, 48])
    expect(frames.every((f) => f.kind === 'png')).toBe(true)
    for (const f of frames) {
      expect(
        `${f.header?.width}x${f.header?.height}`,
        `favicon.ico declares a ${f.declared} px frame; the blob it points at is a ${f.header?.width}x${f.header?.height} PNG`,
      ).toBe(`${f.declared}x${f.declared}`)
      expect(
        f.sawIend,
        `favicon.ico's ${f.declared} px entry hands the browser ${f.length} bytes whose PNG chunk chain never reaches an IEND — the blob is truncated, or dwBytesInRes is short`,
      ).toBe(true)
      expect(
        f.chunkSpan,
        `favicon.ico's ${f.declared} px entry claims ${f.length} bytes; that blob's PNG chunks end at ${f.chunkSpan}`,
      ).toBe(f.length)
    }
    const declared = iconLinks().find((l) => l.href === '/favicon.ico')?.sizes
    expect(declared, 'index.html must declare the sizes favicon.ico really carries').toBe('16x16 32x32 48x48')
  })
})

describe('the app mark — the shipped pixels', () => {
  it('every raster carries the mark in cream ink on a house-green ground', () => {
    // The regression this arm exists for ALREADY HAPPENED, and public/icon.svg's own comment
    // records it: the first cut of these icons screenshot as a plain green square. The SVG failed
    // to parse (a double hyphen inside its own XML comment), rendered as a broken-image glyph, and
    // produced perfectly well-formed PNGs — right dimensions, right colour type, right ground.
    // Every header-only arm above passes on those files. The only guard against it lived in the
    // generator (render-icons.mjs throws below 2 % ink) and the generator does not run in CI, so
    // the shipped bytes need their own reading.
    const rasters = everyRaster()
    expect(
      rasters.map((r) => r.name),
      'the set of shipped rasters changed — add or remove its INK_FRACTION entry deliberately',
    ).toEqual(Object.keys(INK_FRACTION))
    for (const { name, img } of rasters) {
      const corner = [img.pixels[0]!, img.pixels[1]!, img.pixels[2]!]
      expect(
        corner,
        `${name}'s top-left pixel is ${corner.join(',')}, not the house green #0b3d2e (${GROUND.join(',')}) every tile is grounded on`,
      ).toEqual([...GROUND])
      const want = INK_FRACTION[name]!
      const { fraction } = inkOf(img)
      const pct = (v: number) => `${(v * 100).toFixed(2)} %`
      const said = `${name} carries ${pct(fraction)} cream ink; this gate was measured at ${pct(want)} ± ${INK_TOLERANCE * 100} %.`
      expect(fraction, `${said} Near zero means the silhouette did not draw at all.`).toBeGreaterThan(
        want * (1 - INK_TOLERANCE),
      )
      expect(fraction, `${said} Far above means the mark is drowning the tile.`).toBeLessThan(want * (1 + INK_TOLERANCE))
    }
  })

  it('the maskable tile keeps every mark inside the 80 % safe circle', () => {
    // An Android adaptive icon is cropped by a mask the LAUNCHER chooses; only the centre 80 % of
    // the tile's diameter is guaranteed to survive it. That inset is the only thing separating
    // icon-512-maskable.png from icon-512.png — the generator draws this one target at 0.86 while
    // four of its five draw at 1.0 — and nothing else in this file can see it: size, colour type
    // and `purpose` all stay true when the inset is lost.
    //
    // Measured today: the farthest cream pixel's outer corner sits 180.6 px from centre against the
    // 204.8 px safe radius. (public/icon.svg's comment quotes 195 px for the same inset. That is
    // the corner of the ink's BOUNDING BOX — a deliberately conservative bound; this reads the
    // farthest LIT pixel, which is nearer. Both are inside, and neither is the other's error.) The
    // same silhouette drawn at 1.0 reaches 210.3 px, which is outside — the mutant this arm reds.
    const maskable = manifest.icons!.filter((i) => i.purpose?.split(/\s+/).includes('maskable'))
    expect(maskable.length, 'the manifest declares no `purpose: "maskable"` icon at all').toBeGreaterThan(0)
    for (const icon of maskable) {
      const img = decodePng(readFileSync(publicPathOf(icon.src)), icon.src)
      const safeRadius = 0.4 * img.width
      const { farthestCorner, strays, strayWitness } = inkOf(img)
      expect(
        farthestCorner,
        `${icon.src} paints ink ${farthestCorner.toFixed(1)} px from centre; a mask may crop everything past ${safeRadius} px. Draw it at a smaller scale in scripts/icons/render-icons.mjs.`,
      ).toBeLessThanOrEqual(safeRadius)
      expect(
        strays,
        `${icon.src} paints ${strays} non-ground pixels wholly outside the ${safeRadius} px safe circle — first at ${strayWitness}. Outside that circle only the ground may show, because that is all a launcher mask promises to keep.`,
      ).toBe(0)
    }
  })
})

describe('the app mark — the shipped bytes', () => {
  it('pins the silhouette and every raster cut from it to each other', () => {
    for (const [name, digest] of Object.entries(SHA256)) {
      const file = join(PUBLIC, name)
      expect(existsSync(file), `public/${name} is pinned by this gate but does not exist`).toBe(true)
      expect(
        sha256Of(file),
        `public/${name} is not the artifact this gate was pinned to. If you changed the mark: re-run \`node scripts/icons/render-icons.mjs\` and re-measure EVERY literal in SHA256, in one pass. If you changed nothing, something else did.`,
      ).toBe(digest)
    }
  })
})

describe('the app mark — offline', () => {
  it('vite.config.ts precaches every extension the icon set uses, from the dist ROOT', () => {
    // `manifest: false` means vite-plugin-pwa never sees an icon list and precaches none of them on
    // its own — the glob is the ONLY mechanism putting the mark in the offline cache. Narrow it and
    // an installed PWA opened offline shows a blank tile, with a green build.
    //
    // The PATH half of each pattern matters as much as the extension half, and reading only the
    // extension group is how a narrowing goes unseen: public/ is copied to the ROOT of dist/, so
    // 'assets/**' + the same extension list precaches not one of these files while every extension
    // the icons use is still "listed". Both halves, and every pattern in the array, not the first.
    const globs = precacheGlobs().map(parseGlob)
    const used = new Set(iconDistPaths().map((p) => p.split('.').pop()!))
    for (const ext of [...used].sort())
      expect(
        globs.some((g) => g.reachesDistRoot && g.exts.includes(ext)),
        `public/ ships a .${ext} icon at the root of dist/, but no vite.config.ts globPatterns entry reaches it: [${globs.map((g) => g.pattern).join(', ')}]`,
      ).toBe(true)
  })

  it('globIgnores subtracts no icon back out of the precache', () => {
    const ignores = precacheIgnores()
    for (const file of iconDistPaths())
      for (const pattern of ignores)
        expect(
          globToRegExp(pattern).test(file),
          `vite.config.ts globIgnores '${pattern}' matches ${file}. globIgnores is for dead font subsets only — an image in it is subtracted from the precache after globPatterns matched it, and the installed PWA opens offline with a blank tile.`,
        ).toBe(false)
  })
})
