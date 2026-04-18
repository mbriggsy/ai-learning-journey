/**
 * Briefing-Room asset generation (Phase D).
 * Run: set -a && source .env && set +a && npx tsx scripts/generate-briefing-assets.ts
 */
import { GoogleGenAI, PersonGeneration } from '@google/genai'
import { writeFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const MODEL = 'imagen-4.0-generate-001'
const OUTPUT_DIR = resolve('temp/briefing-assets')

const STYLE_BASE =
  'Archer FX animated TV show illustration style (Dreamland season 8), bold thick graphic linework, ' +
  'flat saturated color fills no gradients no shading no photorealism, angular mid-century geometric simplification, ' +
  'warm palette: deep teal (#163338), burnt mahogany (#422818), cream (#f6ebce), cordovan red (#a33340), ochre amber (#b0754c), ' +
  'vector-like quality, 1947 noir spy agency aesthetic, '

type Target = {
  readonly name: string
  readonly prompt: string
  readonly aspectRatio: '1:1' | '3:4' | '4:3' | '16:9' | '9:16'
  readonly personGeneration?: PersonGeneration
}

const TARGETS: readonly Target[] = [
  {
    name: 'dossier-dash-portrait-v1',
    aspectRatio: '1:1',
    personGeneration: PersonGeneration.ALLOW_ADULT,
    prompt:
      STYLE_BASE +
      'operative personnel file portrait of a confident male spy in his early 30s, ' +
      'chest-up shoulders and head composition tightly cropped like a passport photo, ' +
      'strong jaw sharp cheekbones thick dark hair swept back, bright-blue eyes with cocky smirk, ' +
      'wearing a slim-fit charcoal turtleneck under a grey mid-century suit jacket, ' +
      'plain teal-green flat background no texture no shadow no border, ' +
      'bold black outline around entire figure, character isolated cleanly against solid background, ' +
      'no text no letters no numbers no typography no watermark no logo',
  },
  {
    name: 'dossier-vera-portrait-v1',
    aspectRatio: '1:1',
    personGeneration: PersonGeneration.ALLOW_ADULT,
    prompt:
      STYLE_BASE +
      'operative personnel file portrait of a dangerous female spy in her early 30s, ' +
      'chest-up shoulders and head composition tightly cropped like a passport photo, ' +
      'long wavy auburn red hair styled in 1947 waves, green cat-eye eyes intense look, ' +
      'ruby-red lipstick, wearing a tailored charcoal blazer over cream silk blouse, ' +
      'plain teal-green flat background no texture no shadow no border, ' +
      'bold black outline around entire figure, character isolated cleanly against solid background, ' +
      'no text no letters no numbers no typography no watermark no logo',
  },
  {
    name: 'dossier-otto-portrait-v1',
    aspectRatio: '1:1',
    personGeneration: PersonGeneration.ALLOW_ADULT,
    prompt:
      STYLE_BASE +
      'operative personnel file portrait of a nervous balding middle-aged male analyst, ' +
      'chest-up shoulders and head composition tightly cropped like a passport photo, ' +
      'thin comb-over hair wire-rim round glasses sweating slightly, worried expression, ' +
      'wearing a brown corduroy vest over wrinkled cream button-up shirt loose tie, ' +
      'plain teal-green flat background no texture no shadow no border, ' +
      'bold black outline around entire figure, character isolated cleanly against solid background, ' +
      'no text no letters no numbers no typography no watermark no logo',
  },
  {
    name: 'mahogany-tile-v1',
    aspectRatio: '1:1',
    prompt:
      'seamlessly tileable mahogany wood grain texture, rich deep reddish-brown color, ' +
      'horizontal grain flowing left to right, fine dark grain lines and knots, ' +
      'subtle warm lighting, aged polished surface, mid-century office paneling, ' +
      'no seams no borders no text, pure wood texture fills entire frame edge to edge, ' +
      'photorealistic wood photography, flat top-down view no perspective',
  },
  {
    name: 'mahogany-tile-v2',
    aspectRatio: '1:1',
    prompt:
      'seamlessly tileable aged mahogany wood plank texture, warm dark brown to burnt sienna, ' +
      'horizontal wood grain, subtle knot variations, vintage office desk surface 1947 era, ' +
      'semi-gloss finish catches warm tungsten lamp light, top-down flat view, ' +
      'no borders no text no seams, edge-to-edge tile, photorealistic',
  },
  {
    name: 'blotter-cream-paper-v1',
    aspectRatio: '4:3',
    prompt:
      'aged cream-colored briefing paper pad on a desk, warm ivory tone, ' +
      'subtle paper fiber texture, very faint horizontal rule lines visible, ' +
      'gentle warm directional lighting from upper right, one subtle dog-ear fold at top-right corner, ' +
      'slightly yellowed edges, tactile vintage stationery quality, ' +
      'no text no words no letters no handwriting, clean blank paper surface fills entire frame, ' +
      'photorealistic top-down flat view, 1940s classified dossier paper',
  },
  {
    name: 'blotter-cream-paper-v2',
    aspectRatio: '4:3',
    prompt:
      'vintage cream manila dossier paper, edge-to-edge flat top-down view, ' +
      'warm ivory color slight rosé undertone, subtle linen-weave paper fiber texture, ' +
      'faint ink-smudge highlights, warm tungsten ambient lighting, ' +
      'clean blank surface no text no printing no handwriting no logo, ' +
      'photorealistic stationery shot, the cream paper fills 100 percent of the image',
  },
  {
    name: 'classified-stamp-red-v1',
    aspectRatio: '4:3',
    prompt:
      'a red rubber stamp impression of the word CLASSIFIED on transparent white background, ' +
      'thick bold all-caps letters, rough uneven ink texture showing rubber-stamp imperfection, ' +
      'slight tilt 4 degrees, blood-red cordovan ink color, ' +
      'isolated on pure white background no shadow no border, ' +
      'authentic 1940s office stamp aesthetic, photorealistic ink texture',
  },
]

async function generate(ai: GoogleGenAI, target: Target): Promise<void> {
  console.log(`→ ${target.name} (${target.aspectRatio})`)
  const response = await ai.models.generateImages({
    model: MODEL,
    prompt: target.prompt,
    config: {
      numberOfImages: 1,
      aspectRatio: target.aspectRatio,
      ...(target.personGeneration ? { personGeneration: target.personGeneration } : {}),
    },
  })
  const image = response.generatedImages?.[0]?.image
  if (!image?.imageBytes) {
    console.error(`  ✗ ${target.name} — no image bytes (safety filter?)`)
    return
  }
  const buffer = Buffer.from(image.imageBytes, 'base64')
  const outPath = resolve(OUTPUT_DIR, `${target.name}.png`)
  await writeFile(outPath, buffer)
  console.log(`  ✓ ${target.name} — ${(buffer.length / 1024).toFixed(1)} KB`)
}

async function main(): Promise<void> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.error('ERROR: GEMINI_API_KEY not set.')
    process.exit(1)
  }
  await mkdir(OUTPUT_DIR, { recursive: true })
  const ai = new GoogleGenAI({ apiKey })

  // Parallel generation — Imagen API is fine with concurrent calls.
  await Promise.all(TARGETS.map((t) => generate(ai, t)))
  console.log(`\nDone. ${TARGETS.length} images in ${OUTPUT_DIR}`)
}

main().catch((err) => {
  console.error('Unhandled:', err)
  process.exit(1)
})
