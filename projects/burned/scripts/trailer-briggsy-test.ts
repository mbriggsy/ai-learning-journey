/**
 * Origin Trailer v2 — ONE test image: "our Briggsy" character anchor.
 * imagen-budget rule: one image, align on style, THEN batch.
 *
 * Concept: NOT Dash (the in-game super-spy). The real human — the everyman
 * data engineer who bets the machine can build the game. Seen from BEHIND /
 * three-quarter so his face never shows; recognizable by the spiky blonde
 * silhouette. Setting lifts Beat 1's own words: bourbon, a folding table, late
 * night, one warm lamp. Same Archer / Saul Bass house style + teal/amber palette
 * as the roster so he sits inside the game's world. 16:9 for the trailer frame.
 *
 * Run: set -a && source .env && set +a && npx tsx scripts/trailer-briggsy-test.ts
 * Output: temp/trailer/briggsy-test.png (eyeball before anything downstream).
 */
import { GoogleGenAI, PersonGeneration } from '@google/genai'
import { writeFile, mkdir, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const MODEL = 'imagen-4.0-generate-001'
const OUTPUT_DIR = resolve('temp/trailer')

const STYLE_PREFIX =
  'Mid-century modern illustration, 1960s retro graphic art style, ' +
  'cartoon illustration in the style of the TV show Archer, flat color animation cel style, ' +
  'bold graphic linework, flat saturated color fills, angular geometric simplification, ' +
  'warm color palette with deep teals burnt oranges ambers and rich creams, ' +
  'stylized illustration NOT a photograph NOT 3D NOT realistic, ' +
  'clean vector-like quality, Saul Bass inspired composition, '

const NO_TEXT = 'the image contains absolutely no text no words no letters no numbers no typography no watermark'

const PROMPT =
  STYLE_PREFIX +
  'rear view from directly behind of an ordinary everyman, the back of his head fully toward the viewer, ' +
  'his face is completely hidden and NOT visible at all, head turned fully away, ' +
  'distinctive short spiky tousled bright golden-blonde hair sticking up in messy spikes, the blonde hair clearly catching the warm lamplight, ' +
  'sitting alone at a simple folding card table late at night, ' +
  'the dominant light source is one warm desk lamp throwing a large rich golden pool of warm light that floods the whole table and his back and hair, ' +
  'in that warm pool of lamplight on the table in clear lit foreground: a crystal lowball rocks glass of glowing amber bourbon with a single large ice cube, and a loose fanned scatter of playing cards, both catching the warm light as hero foreground details, ' +
  'a smaller cool glow from the open laptop screen as a secondary accent only, not the main light, ' +
  'deep teal midnight darkness surrounding and framing the warm golden pool of light, strong warm-versus-cool contrast with warmth winning at the center, ' +
  'wearing a plain casual untucked button shirt, relaxed unglamorous everyman posture, an ordinary guy NOT a suave secret agent, ' +
  'bold Saul Bass geometric shapes in the dark background in deep teal burnt orange and amber, ' +
  'cinematic wide establishing composition, flat color not grayscale, ' +
  NO_TEXT

async function main(): Promise<void> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.error('ERROR: GEMINI_API_KEY not set. Run: set -a && source .env && set +a')
    process.exit(1)
  }

  await mkdir(OUTPUT_DIR, { recursive: true })
  const ai = new GoogleGenAI({ apiKey })

  console.log('\n=== Origin Trailer — "our Briggsy" test image ===')
  console.log(`Model: ${MODEL}  ·  16:9  ·  Output: ${OUTPUT_DIR}/briggsy-test.png\n`)

  const response = await ai.models.generateImages({
    model: MODEL,
    prompt: PROMPT,
    config: {
      numberOfImages: 1,
      aspectRatio: '16:9',
      personGeneration: PersonGeneration.ALLOW_ADULT,
    },
  })

  const images = response.generatedImages
  if (!images || images.length === 0) {
    console.error('FAILED: safety filter or empty response. Retry once (insight: filter is inconsistent).')
    process.exit(1)
  }

  const buffer = Buffer.from(images[0].image!.imageBytes!, 'base64')
  // Auto-version: never overwrite a prior take, so we can compare every regen.
  const existing = await readdir(OUTPUT_DIR)
  const nextN =
    existing
      .map((f) => /^briggsy-anchor-v(\d+)\.png$/.exec(f)?.[1])
      .filter(Boolean)
      .reduce((max, n) => Math.max(max, Number(n)), 0) + 1
  const outPath = resolve(OUTPUT_DIR, `briggsy-anchor-v${nextN}.png`)
  await writeFile(outPath, buffer)
  console.log(`Saved: ${outPath} (${buffer.length} bytes)`)

  await buildContactSheet()
  console.log(`Viewer: ${resolve(OUTPUT_DIR, 'index.html')}  (open once, refresh after each regen)`)
}

/**
 * Regenerates temp/trailer/index.html — a dark contact sheet of every PNG in the
 * folder, newest first. Briggsy opens it once and refreshes to see new takes.
 */
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
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>BURNED — Origin Trailer Assets</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; background: #08181a; color: #cfe6e6;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace; padding: 32px; }
  h1 { letter-spacing: 0.18em; font-weight: 700; font-size: 20px; margin: 0 0 4px; }
  p.sub { opacity: 0.55; margin: 0 0 28px; font-size: 13px; }
  .grid { display: grid; gap: 24px;
    grid-template-columns: repeat(auto-fill, minmax(420px, 1fr)); }
  figure { margin: 0; background: #0c2024; border: 1px solid #16333880;
    border-radius: 10px; overflow: hidden; }
  img { display: block; width: 100%; height: auto; }
  figcaption { padding: 10px 14px; font-size: 12px; letter-spacing: 0.08em;
    color: #f4e4c1; border-top: 1px solid #16333880; }
</style>
</head>
<body>
  <h1>BURNED · ORIGIN TRAILER ASSETS</h1>
  <p class="sub">${files.length} image${files.length === 1 ? '' : 's'} · newest first · refresh to update</p>
  <div class="grid">
${cards}
  </div>
</body>
</html>
`
  await writeFile(resolve(OUTPUT_DIR, 'index.html'), html)
}

main().catch((err) => {
  console.error('Unhandled error:', err)
  process.exit(1)
})
