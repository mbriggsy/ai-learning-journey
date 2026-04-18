/**
 * Briefing-Room asset generation (Phase D).
 * Run all:   set -a && source .env && set +a && npx tsx scripts/generate-briefing-assets.ts
 * Run some:  ... scripts/generate-briefing-assets.ts <substring>   (matches target name)
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
    name: 'dossier-janet-portrait-v1',
    aspectRatio: '1:1',
    personGeneration: PersonGeneration.ALLOW_ADULT,
    prompt:
      STYLE_BASE +
      'operative personnel file portrait of an ice-cold female agency director in her early 50s, ' +
      'chest-up shoulders and head composition tightly cropped like a passport photo, ' +
      'silver-grey hair swept up in an elegant 1947 chignon, piercing ice-blue eyes, ' +
      'thin ruby-red lipstick tight close-mouthed expression, arched brows, strand of pearls around the neck, ' +
      'wearing a tailored charcoal designer blazer over cream silk blouse, holding a crystal bourbon glass, ' +
      'terrifyingly composed Mallory-Archer energy, imperious posture, ' +
      'plain teal-green flat background no texture no shadow no border, ' +
      'bold black outline around entire figure, character isolated cleanly against solid background, ' +
      'no text no letters no numbers no typography no watermark no logo',
  },
  {
    name: 'dossier-neal-portrait-v1',
    aspectRatio: '1:1',
    personGeneration: PersonGeneration.ALLOW_ADULT,
    prompt:
      STYLE_BASE +
      'operative personnel file portrait of an anxious male compliance auditor in his early 40s, ' +
      'chest-up shoulders and head composition tightly cropped like a passport photo, ' +
      'sandy-brown thinning hair neatly parted, tortoiseshell square spectacles, nervous apologetic expression, ' +
      'slightly flushed cheeks faint sweat sheen, tight worried mouth, ' +
      'wearing a beige cardigan over a white shirt and narrow olive tie, clutching a black three-ring binder to his chest, ' +
      '1947 mid-century-bureaucrat styling, ' +
      'plain teal-green flat background no texture no shadow no border, ' +
      'bold black outline around entire figure, character isolated cleanly against solid background, ' +
      'no text no letters no numbers no typography no watermark no logo',
  },
  {
    name: 'dossier-agent-x-portrait-v1',
    aspectRatio: '1:1',
    personGeneration: PersonGeneration.ALLOW_ADULT,
    prompt:
      STYLE_BASE +
      'operative personnel file portrait of a mysterious rival-agency operative in disguise, ' +
      'chest-up shoulders and head composition tightly cropped like a passport photo, ' +
      'obviously-fake black beard and moustache, oversized dark horn-rim glasses, fedora tilted low, ' +
      'smirking knowing expression, raised eyebrow visible over the glasses, ' +
      'wearing a trench coat collar turned up over a grey pinstripe suit and wide tie, ' +
      '1947 noir rival-spy styling, cartoonishly over-the-top disguise energy, ' +
      'plain teal-green flat background no texture no shadow no border, ' +
      'bold black outline around entire figure, character isolated cleanly against solid background, ' +
      'no text no letters no numbers no typography no watermark no logo',
  },
  {
    name: 'mahogany-horizontal-v1',
    aspectRatio: '16:9',
    prompt:
      'photorealistic horizontal mahogany wood plank surface, warm reddish-brown color, ' +
      'visible horizontal wood grain pattern running the entire length left to right, ' +
      'fine dark grain lines and tiny knot details, aged polished mid-century furniture finish, ' +
      'warm tungsten light catches the semi-gloss surface, flat top-down view, ' +
      'seamless tileable wood texture filling the entire frame edge to edge, ' +
      'no borders no text, horizontal grain orientation',
  },
  {
    name: 'mahogany-vertical-v1',
    aspectRatio: '9:16',
    prompt:
      'seamlessly tileable mahogany wood plank for a vertical frame edge, ' +
      'rich deep reddish-brown mahogany color, ' +
      'strictly VERTICAL wood grain flowing top to bottom across the entire frame, ' +
      'ALL grain lines parallel and aligned with the long vertical axis, fine dark grain and subtle knots, ' +
      'warm tungsten office lighting, aged polished mid-century office paneling standing upright, ' +
      'semi-gloss finish catches warm light, ' +
      'edge-to-edge wood texture fills 100 percent of frame, no borders no text no seams, ' +
      'photorealistic flat view, grain axis is vertical only',
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
    name: 'operative-silhouette-redacted-v1',
    aspectRatio: '1:1',
    personGeneration: PersonGeneration.ALLOW_ADULT,
    prompt:
      STYLE_BASE +
      'anonymous classified operative dossier photo, head and shoulders silhouette composition tightly cropped like a passport photo, ' +
      'generic androgynous figure in a mid-century suit and narrow tie, ' +
      'THICK BLACK HORIZONTAL CENSOR BAR completely covering the entire eye region from temple to temple (signature Archer redacted informant look), ' +
      'rest of face visible but nondescript no identifying features, ' +
      'charcoal-grey suit jacket, neutral skin tones, dark hair, ' +
      'plain warm cream background no texture no gradient no shadow no border, ' +
      'bold thick black outline around entire figure, character isolated cleanly against solid cream background, ' +
      'no text no letters no numbers no typography no watermark no logo',
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

  const filter = process.argv[2]
  const selected = filter
    ? TARGETS.filter((t) => t.name.includes(filter))
    : TARGETS
  if (filter && selected.length === 0) {
    console.error(`No targets match "${filter}". Available: ${TARGETS.map(t => t.name).join(', ')}`)
    process.exit(1)
  }
  if (filter) console.log(`Filter "${filter}" → ${selected.length} target(s)`)

  // Parallel generation — Imagen API is fine with concurrent calls.
  await Promise.all(selected.map((t) => generate(ai, t)))
  console.log(`\nDone. ${selected.length} image(s) in ${OUTPUT_DIR}`)
}

main().catch((err) => {
  console.error('Unhandled:', err)
  process.exit(1)
})
