/*
 * scripts/icons/render-icons.mjs — rasterize public/icon.svg into the PWA/favicon set.
 *
 * COMMITTED, and it has to be. The five shipped binaries (public/icon-192.png, icon-512.png,
 * icon-512-maskable.png, apple-touch-icon.png, favicon.ico) have no other rasterizer anywhere, so
 * a clone that cannot re-cut them cannot honestly change the mark. This script spent its first
 * session in temp/ — gitignored, and cleared at squeaky without asking — which is the clean-clone
 * hole (AJS 008) the move into scripts/ closes.
 *
 * The SOURCE OF TRUTH is public/icon.svg — this script only reads it, never re-draws the mark, so
 * there is exactly one silhouette in the repo. Re-run: `node scripts/icons/render-icons.mjs` from
 * projects/the-back-nine. It rewrites the five binaries in public/ and the two eye artifacts
 * committed beside it here (preview.png at 1024, qa-sheet.png), plus contact-sheet.png, which is
 * deliberately not committed — it is a scratch read, not a reviewed artifact.
 *
 * A re-run rewrites bytes, so scripts/__tests__/pwa-icons.test.ts's sha256 pins go RED until they
 * are re-measured and bumped. That is the point of them: they are the only thing tying these
 * binaries to the SVG they were cut from, and the pixel arms beside them are what judge whatever
 * the new bytes turn out to be.
 *
 * Every ground here is OPAQUE house green (#0b3d2e): the tab/home-screen tile must read the same on
 * a light or dark shell, and apple-touch-icon.png is composited on white by iOS if it has alpha.
 * So `omitBackground` is deliberately NOT used anywhere in this script.
 *
 * ICO is written by hand (6-byte ICONDIR + one 16-byte ICONDIRENTRY per size + the PNG blobs).
 * PNG-in-ICO is accepted by every browser this project targets; no new dependency.
 */
/* Node + (inside page.evaluate) browser globals this file legitimately reads. Declared here rather
 * than in eslint.config.js because a .mjs under scripts/ gets no TS config to switch no-undef off,
 * and a blanket file-level disable would silence a real typo too. */
/* global Buffer, console, document, HTMLImageElement, Image */
import { chromium } from '@playwright/test'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..', '..')
const PUBLIC = join(ROOT, 'public')
const OUT_PREVIEW = HERE

const GROUND = '#0b3d2e'
const svg = readFileSync(join(PUBLIC, 'icon.svg'), 'utf-8')
const svgUri = `data:image/svg+xml;base64,${Buffer.from(svg, 'utf-8').toString('base64')}`

/**
 * `scale` = the fraction of the tile the 512-frame SVG is drawn at.
 *   1.00  — the "any" framing authored into icon.svg (art = 62% of the tile).
 *   0.86  — the maskable inset: every mark lands inside the 80%-diameter safe circle.
 *   1.06  — the favicon: a touch more ink so the 44/512 stroke clears 1.4 CSS px at 16 px.
 */
const TARGETS = [
  { file: join(PUBLIC, 'icon-192.png'), size: 192, scale: 1.0 },
  { file: join(PUBLIC, 'icon-512.png'), size: 512, scale: 1.0 },
  { file: join(PUBLIC, 'icon-512-maskable.png'), size: 512, scale: 0.86 },
  { file: join(PUBLIC, 'apple-touch-icon.png'), size: 180, scale: 1.0 },
  { file: join(OUT_PREVIEW, 'preview.png'), size: 1024, scale: 1.0 },
]
const ICO_SIZES = [16, 32, 48]

const page$ = (size, scale) => `
<style>
  html, body { margin: 0; padding: 0; background: ${GROUND}; }
  .tile {
    width: ${size}px; height: ${size}px; background: ${GROUND};
    position: relative; overflow: hidden;
  }
  .tile img {
    position: absolute; left: 50%; top: 50%;
    transform: translate(-50%, -50%);
    width: ${size * scale}px; height: ${size * scale}px; display: block;
  }
</style>
<div class="tile"><img src="${svgUri}" alt=""></div>`

/*
 * FAIL LOUD. An SVG that fails to parse renders as a broken-image glyph and screenshots as a plain
 * green square — no console error, no exception, a plausible-looking file on disk. (This actually
 * happened on the first run: a double hyphen inside the SVG's own XML comment.) So every shot
 * asserts the mark decoded AND that cream ink is actually on the tile before the bytes are kept.
 */
async function shoot(page, size, scale) {
  await page.setViewportSize({ width: Math.max(size, 16), height: Math.max(size, 16) })
  await page.setContent(page$(size, scale))
  const img = page.locator('.tile img')
  const probe = await img.evaluate(async (el) => {
    if (!(el instanceof HTMLImageElement)) throw new Error('.tile img is not an <img>')
    if (!el.complete) await new Promise((res, rej) => ((el.onload = res), (el.onerror = rej)))
    if (el.naturalWidth === 0) throw new Error('icon.svg failed to decode (naturalWidth 0)')
    // Rasterize at a fixed 128 so the ink fraction is comparable across every target size.
    const c = document.createElement('canvas')
    c.width = c.height = 128
    const g = c.getContext('2d')
    if (!g) throw new Error('no 2d context')
    g.drawImage(el, 0, 0, 128, 128)
    const px = g.getImageData(0, 0, 128, 128).data
    let ink = 0
    for (let i = 0; i < px.length; i += 4) if (px[i] > 200 && px[i + 1] > 200 && px[i + 2] > 200) ink++
    return { naturalWidth: el.naturalWidth, inkFraction: ink / (128 * 128) }
  })
  if (probe.inkFraction < 0.02)
    throw new Error(`icon.svg decoded but drew almost no ink (${(probe.inkFraction * 100).toFixed(2)}%) at ${size}px`)
  return await page.locator('.tile').screenshot({ type: 'png' })
}

/** ICO container: 6-byte ICONDIR, one 16-byte ICONDIRENTRY per image, then the PNG blobs. */
function packIco(entries) {
  const dir = Buffer.alloc(6)
  dir.writeUInt16LE(0, 0) // reserved
  dir.writeUInt16LE(1, 2) // type 1 = icon
  dir.writeUInt16LE(entries.length, 4)
  let offset = 6 + 16 * entries.length
  const table = []
  for (const { size, png } of entries) {
    const e = Buffer.alloc(16)
    e.writeUInt8(size >= 256 ? 0 : size, 0) // width  (0 encodes 256)
    e.writeUInt8(size >= 256 ? 0 : size, 1) // height
    e.writeUInt8(0, 2) // palette size (0 = no palette)
    e.writeUInt8(0, 3) // reserved
    e.writeUInt16LE(1, 4) // color planes
    e.writeUInt16LE(32, 6) // bits per pixel
    e.writeUInt32LE(png.length, 8)
    e.writeUInt32LE(offset, 12)
    offset += png.length
    table.push(e)
  }
  return Buffer.concat([dir, ...table, ...entries.map((x) => x.png)])
}

const browser = await chromium.launch()
const ctx = await browser.newContext({ deviceScaleFactor: 1 })
const page = await ctx.newPage()

mkdirSync(OUT_PREVIEW, { recursive: true })
for (const { file, size, scale } of TARGETS) {
  writeFileSync(file, await shoot(page, size, scale))
  console.log(`wrote ${file} (${size}px, scale ${scale})`)
}

const icoEntries = []
for (const size of ICO_SIZES) icoEntries.push({ size, png: await shoot(page, size, 1.06) })
writeFileSync(join(PUBLIC, 'favicon.ico'), packIco(icoEntries))
console.log(`wrote ${join(PUBLIC, 'favicon.ico')} (${ICO_SIZES.join('+')})`)

// A contact sheet for the human eye: the same mark at every size it must survive, side by side.
// Written beside this script but NOT committed (preview.png and qa-sheet.png are).
await page.setViewportSize({ width: 900, height: 220 })
await page.setContent(`
<style>
  html, body { margin: 0; background: #faf7f2; font: 12px system-ui; }
  .row { display: flex; align-items: flex-end; gap: 24px; padding: 28px; }
  figure { margin: 0; text-align: center; }
  figcaption { margin-top: 8px; color: #44584e; }
  img { display: block; image-rendering: auto; }
</style>
<div class="row">
  ${[16, 24, 32, 48, 64, 128].map((s) => `<figure><img src="${svgUri}" width="${s}" height="${s}"><figcaption>${s}px</figcaption></figure>`).join('')}
</div>`)
writeFileSync(join(OUT_PREVIEW, 'contact-sheet.png'), await page.locator('.row').screenshot({ type: 'png' }))
console.log('wrote contact-sheet.png')

// QA sheet for the human eye: the REAL favicon rasters magnified 8x with nearest-neighbour (so a
// judgement about 16 px legibility is made on the shipped pixels, not on a re-rendered vector), and
// the maskable tile under the 80%-diameter safe circle the spec reserves.
const asUri = (p) => `data:image/png;base64,${readFileSync(p).toString('base64')}`
const zoom = await Promise.all(ICO_SIZES.map(async (s) => ({ s, png: (await shoot(page, s, 1.06)).toString('base64') })))
await page.setViewportSize({ width: 1500, height: 560 })
await page.setContent(`
<style>
  html, body { margin: 0; background: #faf7f2; font: 13px system-ui; color: #44584e; }
  .sheet { padding: 24px; display: flex; gap: 32px; align-items: flex-start; }
  figure { margin: 0; text-align: center; }
  figcaption { margin-top: 8px; }
  .px { image-rendering: pixelated; display: block; }
  .mask { position: relative; width: 320px; height: 320px; }
  .mask img { width: 320px; height: 320px; display: block; }
  .mask .circle {
    position: absolute; left: 10%; top: 10%; width: 80%; height: 80%;
    border: 2px dashed #d55e00; border-radius: 50%; box-sizing: border-box;
  }
</style>
<div class="sheet">
  ${zoom.map(({ s, png }) => `<figure><img class="px" src="data:image/png;base64,${png}" width="${s * 8}" height="${s * 8}"><figcaption>${s}px favicon, 8x</figcaption></figure>`).join('')}
  <figure><div class="mask"><img src="${asUri(join(PUBLIC, 'icon-512-maskable.png'))}"><div class="circle"></div></div><figcaption>maskable + 80% safe circle</figcaption></figure>
</div>`)
writeFileSync(join(OUT_PREVIEW, 'qa-sheet.png'), await page.locator('.sheet').screenshot({ type: 'png' }))
console.log('wrote qa-sheet.png')

/*
 * READ THE BYTES BACK. The ICO container is hand-packed here, so "the file exists and is non-empty"
 * proves nothing — a wrong offset in an ICONDIRENTRY yields a plausible file a browser silently
 * refuses. Load every emitted artifact back into the same real Chromium as an <img> and require it
 * to decode at its declared size before this script is allowed to exit 0. `image-decode` on an .ico
 * exercises the container, not just the embedded PNG.
 */
const emitted = [
  ['icon.svg', 512],
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['icon-512-maskable.png', 512],
  ['apple-touch-icon.png', 180],
  ['favicon.ico', null], // Chromium reports the LARGEST frame it selected; assert only "decoded".
]
const mimeOf = (n) => (n.endsWith('.svg') ? 'image/svg+xml' : n.endsWith('.ico') ? 'image/x-icon' : 'image/png')
for (const [name, expect] of emitted) {
  const bytes = readFileSync(join(PUBLIC, name))
  const uri = `data:${mimeOf(name)};base64,${bytes.toString('base64')}`
  const dims = await page.evaluate(
    (u) =>
      new Promise((res, rej) => {
        const im = new Image()
        im.onload = () => res({ w: im.naturalWidth, h: im.naturalHeight })
        im.onerror = () => rej(new Error('decode failed'))
        im.src = u
      }),
    uri,
  )
  if (dims.w === 0 || dims.h === 0) throw new Error(`${name} decoded to 0x0`)
  if (expect !== null && (dims.w !== expect || dims.h !== expect))
    throw new Error(`${name} decoded ${dims.w}x${dims.h}, expected ${expect}x${expect}`)
  console.log(`verified ${name}: ${dims.w}x${dims.h}, ${bytes.length} bytes`)
}

await browser.close()
