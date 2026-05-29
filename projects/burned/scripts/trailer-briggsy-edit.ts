/**
 * Origin Trailer v2 — surgical hair recolor on the "our Briggsy" anchor.
 *
 * Briggsy picked v3's composition (painterly warm pool, lamp at left, lit
 * bourbon + cards) but its hair came back brown. Imagen's generate path won't
 * reliably reproduce that exact composition, so instead we EDIT v3 directly
 * with Nano Banana Pro: change ONLY the hair to spiky golden-blonde, preserve
 * everything else. Same API shape as scripts/edit-burned-door-nbp.ts.
 *
 * Run: set -a && source ../../.env && set +a && npx tsx scripts/trailer-briggsy-edit.ts
 * Output: temp/trailer/briggsy-anchor-v{N}.png (auto-versioned) + rebuilt index.html.
 */
import { GoogleGenAI } from '@google/genai'
import { readFileSync } from 'node:fs'
import { readdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const MODEL = 'gemini-3-pro-image-preview'
const OUTPUT_DIR = resolve('temp/trailer')
// Base image to recolor: pass a filename as the first arg, else default to v3.
const BASE_FILE = process.argv[2] ?? 'briggsy-anchor-v3.png'
const BASE_PATH = resolve(OUTPUT_DIR, BASE_FILE)

const EDIT_PROMPT = `Edit this 1960s Archer-style flat illustration. Change ONE thing only: the man's hair.

Recolor his hair to a bright, saturated golden-blonde, and restyle it as short, spiky, tousled, sticking up in messy spikes. The blonde hair should clearly catch the warm golden lamplight. He must remain seen from directly behind with his face fully hidden and turned away.

Preserve EVERYTHING ELSE about the image exactly as it is:
- the exact same composition, framing, and camera angle
- the warm desk lamp at the left throwing a large rich golden pool of warm light across the table
- the crystal lowball glass of amber bourbon and the scattered playing cards as lit foreground props on the table
- the open laptop's cool secondary glow
- the deep teal midnight darkness and bold Saul Bass geometric background shapes
- his plain casual untucked button shirt, posture, the folding table and chair
- the flat cel-shaded mid-century Archer illustration style and the teal/amber palette

The ONLY change is the hair: brown becomes spiky golden-blonde. All else stays identical. No text, no words, no letters anywhere in the image.`

async function nextVersionPath(): Promise<string> {
  const existing = await readdir(OUTPUT_DIR)
  const nextN =
    existing
      .map((f) => /^briggsy-anchor-v(\d+)\.png$/.exec(f)?.[1])
      .filter(Boolean)
      .reduce((max, n) => Math.max(max, Number(n)), 0) + 1
  return resolve(OUTPUT_DIR, `briggsy-anchor-v${nextN}.png`)
}

async function buildContactSheet(): Promise<void> {
  const files = (await readdir(OUTPUT_DIR))
    .filter((f) => f.toLowerCase().endsWith('.png'))
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
  const cards = files
    .map(
      (f) => `    <figure>
      <img src="./${f}" alt="${f}" />
      <figcaption>${f}</figcaption>
    </figure>`,
    )
    .join('\n')
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>BURNED — Origin Trailer Assets</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; background: #08181a; color: #cfe6e6;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace; padding: 32px; }
  h1 { letter-spacing: 0.18em; font-weight: 700; font-size: 20px; margin: 0 0 4px; }
  p.sub { opacity: 0.55; margin: 0 0 28px; font-size: 13px; }
  .grid { display: grid; gap: 24px; grid-template-columns: repeat(auto-fill, minmax(420px, 1fr)); }
  figure { margin: 0; background: #0c2024; border: 1px solid #16333880; border-radius: 10px; overflow: hidden; }
  img { display: block; width: 100%; height: auto; }
  figcaption { padding: 10px 14px; font-size: 12px; letter-spacing: 0.08em; color: #f4e4c1; border-top: 1px solid #16333880; }
</style></head>
<body>
  <h1>BURNED · ORIGIN TRAILER ASSETS</h1>
  <p class="sub">${files.length} image${files.length === 1 ? '' : 's'} · newest first · refresh to update</p>
  <div class="grid">
${cards}
  </div>
</body></html>
`
  await writeFile(resolve(OUTPUT_DIR, 'index.html'), html)
}

async function main(): Promise<void> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.error('ERROR: GEMINI_API_KEY not set. Run: set -a && source ../../.env && set +a')
    process.exit(1)
  }

  console.log('\n=== Origin Trailer — "our Briggsy" hair recolor (v3 → blonde) ===')
  const inputBase64 = readFileSync(BASE_PATH).toString('base64')
  const ai = new GoogleGenAI({ apiKey })

  console.log(`Editing ${BASE_PATH} with Nano Banana Pro (${MODEL})...`)
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: 'user',
        parts: [
          { text: EDIT_PROMPT },
          { inlineData: { mimeType: 'image/png', data: inputBase64 } },
        ],
      },
    ],
    config: {
      responseModalities: ['IMAGE'],
      imageConfig: { aspectRatio: '16:9', imageSize: '2K' },
    },
  })

  const parts = response.candidates?.[0]?.content?.parts ?? []
  let saved = false
  for (const part of parts) {
    if (part.text) console.log(`Model text: ${part.text}`)
    if (part.inlineData?.data) {
      const outPath = await nextVersionPath()
      const buffer = Buffer.from(part.inlineData.data, 'base64')
      await writeFile(outPath, buffer)
      console.log(`Saved: ${outPath} (${buffer.length} bytes)`)
      saved = true
    }
  }
  if (!saved) {
    console.error('No image data in response:', JSON.stringify(response, null, 2))
    process.exit(1)
  }

  await buildContactSheet()
  console.log(`Viewer: ${resolve(OUTPUT_DIR, 'index.html')} (refresh to see it)`)
}

main().catch((err) => {
  console.error('Unhandled error:', err)
  process.exit(1)
})
