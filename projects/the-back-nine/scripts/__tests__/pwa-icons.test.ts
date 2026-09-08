import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

/*
 * scripts/__tests__/pwa-icons.test.ts — the app mark's regression guard.
 *
 * The icon set is spread across FOUR files that nothing links together at build time:
 * public/icon.svg (the one silhouette source), the rasters cut from it, the `icons` array in
 * public/manifest.webmanifest, the <link rel="icon"> tags in index.html, and the `globPatterns` in
 * vite.config.ts that decides whether an installed PWA has its icon OFFLINE. Every one of those can
 * be edited alone and every failure mode is SILENT: a manifest entry pointing at a deleted file
 * makes the app quietly uninstallable, a narrowed glob quietly drops the icons out of the precache,
 * a `sizes` that disagrees with the real pixels quietly makes the browser pick the wrong frame.
 * `pnpm build` is green for all of it. So this reads the REAL BYTES of each file and pins them
 * against each other.
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

/** Real dimensions and colour type straight out of the PNG IHDR chunk — never the filename, never
 *  the manifest's own claim (that is the value under test). PNG colour types: 0 greyscale,
 *  2 truecolour (RGB, NO alpha channel), 3 palette, 4 greyscale+alpha, 6 truecolour+alpha. */
function pngHeader(file: string): { width: number; height: number; colourType: number } {
  const b = readFileSync(file)
  const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  if (!b.subarray(0, 8).equals(SIG)) throw new Error(`${file} is not a PNG (bad signature)`)
  if (b.subarray(12, 16).toString('ascii') !== 'IHDR') throw new Error(`${file}: first chunk is not IHDR`)
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20), colourType: b.readUInt8(25) }
}
/** PNG colour type 2: truecolour with no alpha channel, so the image CANNOT carry transparency. */
const RGB_NO_ALPHA = 2

/** The ICO container, parsed the way a browser must: 6-byte ICONDIR, then one 16-byte ICONDIRENTRY
 *  per frame carrying the frame's declared size plus the byte range of its image blob. */
function icoFrames(file: string): { size: number; kind: string }[] {
  const b = readFileSync(file)
  if (b.readUInt16LE(0) !== 0) throw new Error(`${file}: ICONDIR reserved field is not 0`)
  if (b.readUInt16LE(2) !== 1) throw new Error(`${file}: ICONDIR type is not 1 (icon)`)
  const count = b.readUInt16LE(4)
  const frames: { size: number; kind: string }[] = []
  for (let i = 0; i < count; i++) {
    const o = 6 + 16 * i
    const len = b.readUInt32LE(o + 8)
    const off = b.readUInt32LE(o + 12)
    if (off + len > b.length) throw new Error(`${file}: frame ${i} runs past EOF (${off}+${len} > ${b.length})`)
    const sig = b.subarray(off, off + 8)
    const isPng = sig.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    frames.push({ size: b.readUInt8(o) === 0 ? 256 : b.readUInt8(o), kind: isPng ? 'png' : 'other' })
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

/** The extension list inside vite.config.ts's workbox `globPatterns` brace group. Parsed rather
 *  than string-matched so a REORDER stays green and a REMOVAL reds. */
function precachedExtensions(): string[] {
  const pattern = viteConfig.match(/globPatterns:\s*\[\s*'([^']+)'/)?.[1]
  if (pattern === undefined)
    throw new Error(
      "vite.config.ts: could not find a `globPatterns: ['…']` literal. If its shape changed, re-derive this parser — do not delete the arm.",
    )
  const group = pattern.match(/\{([^}]+)\}/)?.[1]
  if (group === undefined) throw new Error(`vite.config.ts: globPatterns '${pattern}' has no {ext,ext} group to read`)
  return group.split(',').map((s) => s.trim())
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
    // pixel and hoping.
    expect(pngHeader(join(PUBLIC, 'apple-touch-icon.png'))).toEqual({
      width: 180,
      height: 180,
      colourType: RGB_NO_ALPHA,
    })
  })

  it('the favicon.ico is a well-formed multi-frame ICO whose frames match the declared `sizes`', () => {
    // The container is hand-packed (temp/icons/render-icons.mjs); a wrong offset yields a plausible
    // file a browser silently refuses. Read the directory and require every blob in bounds + PNG.
    const frames = icoFrames(join(PUBLIC, 'favicon.ico'))
    expect(frames.map((f) => f.size)).toEqual([16, 32, 48])
    expect(frames.every((f) => f.kind === 'png')).toBe(true)
    const declared = iconLinks().find((l) => l.href === '/favicon.ico')?.sizes
    expect(declared, 'index.html must declare the sizes favicon.ico really carries').toBe('16x16 32x32 48x48')
  })
})

describe('the app mark — offline', () => {
  it('vite.config.ts precaches every extension the icon set uses', () => {
    // `manifest: false` means vite-plugin-pwa never sees an icon list and precaches none of them on
    // its own — the glob is the ONLY mechanism putting the mark in the offline cache. Narrow it and
    // an installed PWA opened offline shows a blank tile, with a green build.
    const exts = precachedExtensions()
    const used = new Set(
      [...manifest.icons!.map((i) => i.src), ...iconLinks().map((l) => l.href)].map((h) => h.split('.').pop()!),
    )
    for (const ext of [...used].sort())
      expect(exts, `public/ ships a .${ext} icon but vite.config.ts's globPatterns does not precache .${ext}`).toContain(
        ext,
      )
  })
})
