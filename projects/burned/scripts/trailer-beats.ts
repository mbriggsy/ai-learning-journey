/**
 * Origin Trailer v2 — beat establishing-visual batch (storyboard pass).
 *
 * Generates one illustrated establishing image per beat against the LOCKED
 * anchor's style language (src/assets/briggsy-anchor.png): Archer cel, deep
 * teal / burnt-orange / amber, warm lamp-pool light, Saul Bass geometry,
 * everyman seen from behind (face never shows).
 *
 * TEXT POLICY: no baked-in words/numbers. The scale cascade (43K/29K/62K),
 * the 1326 counter, and the BURNED title are rendered as crisp Remotion
 * overlays — image-gen garbles type, and we want those controllable. Scenes
 * are generated clean; charts/title-cards are generated as backgrounds only.
 *
 * Run: set -a && source ../../.env && set +a && npx tsx scripts/trailer-beats.ts [slug]
 *   - no arg: generate the whole set (sequential, rate-limit-friendly delay)
 *   - slug arg (e.g. "beat-3-formfactors"): regenerate just that one
 * Output: temp/trailer/<slug>.png + rebuilt index.html contact sheet.
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

const NO_TEXT =
  'the image contains absolutely no text no words no letters no numbers no typography no watermark'

interface BeatShot {
  slug: string
  scene: string
}

const SHOTS: BeatShot[] = [
  {
    slug: 'beat-1-gamenight',
    scene:
      'a warm late-night card game on a simple folding table, three or four ordinary friends seen from behind and from the side gathered around the table mid-game, ' +
      'hands tossing and drawing playing cards, a few cards caught in mid-air over the table, crystal lowball glasses of amber bourbon, ' +
      'one warm desk lamp throwing a rich golden pool of light over the whole scene, deep teal midnight room surrounding the warm light, ' +
      'easy camaraderie and laughter, no faces clearly visible, bold Saul Bass geometric shapes in the dark background in deep teal burnt orange and amber, ' +
      'cinematic warm establishing composition, flat color not grayscale, ',
  },
  {
    slug: 'burned-card',
    scene:
      'a single dramatic playing card face-up in close-up on a dark table lit by warm lamplight, ' +
      'the card face shows a bold stylized graphic emblem of an explosion and flames in burnt orange amber and cream against a deep teal card, ' +
      'an iconic Saul Bass danger emblem, the one card you do not want to draw, ' +
      'dramatic warm rim light, deep teal background, flat cartoon Archer illustration style, no words or letters on the card only the graphic emblem, ',
  },
  {
    slug: 'beat-2-bet',
    scene:
      'an ordinary everyman seen from directly behind with his face fully hidden, short spiky golden-blonde hair, ' +
      'sitting alone at the simple folding card table at night, now turned toward a dark blank computer laptop screen showing a single small lonely blinking cursor in an empty void, ' +
      'the warm bourbon-and-lamplight table behind him giving way to the cold blue glow of the dark empty screen ahead, the daunting quiet moment of making a bet, ' +
      'strong warm-to-cool tonal contrast, deep teal darkness, bold Saul Bass geometric shapes, cinematic composition, flat color not grayscale, ',
  },
  {
    slug: 'beat-3-formfactors',
    scene:
      'a single large glowing television screen at the center flanked by a radiating fan-shaped arc of ten small smartphones spreading outward symmetrically like a fanned hand of cards, ' +
      'each phone glowing warmly showing a hidden private hand of cards, the devices arranged as a bold symmetrical Saul Bass starburst, ' +
      'a polished premium studio-grade presentation, ambition and scale made literal, warm amber and cream glow against deep teal darkness with burnt orange accents, ' +
      'dramatic geometric symmetry, flat color not grayscale, ',
  },
  {
    slug: 'beat-4-bars',
    scene:
      'three bold solid ascending vertical bars of a stylized bar chart standing in a row, the leftmost bar short, the middle bar taller, the rightmost bar the tallest towering over the others, ' +
      'clean geometric flat mid-century data visualization, the bars in deep teal burnt orange and warm amber against a dark teal background, ' +
      'bold Saul Bass geometric composition conveying escalation and scale, dramatic and clean, only the plain bars no labels, ' +
      NO_TEXT +
      ', ',
  },
  {
    slug: 'beat-5-swarm',
    scene:
      'a chaotic swarm of many small smartphone screens scattered and tilted at wild angles across a dark void, the phones glitching and under relentless attack, ' +
      'sharp angular menacing geometric shards of burnt orange and deep red slashing diagonally through deep teal darkness, ' +
      'a sense of relentless adversarial assault and controlled chaos, dramatic Saul Bass composition with strong diagonal tension, dark and frantic but stylish and graphic, flat color not grayscale, ',
  },
  {
    slug: 'beat-6-victory',
    scene:
      'a single clean calm glowing screen floating serenely in deep teal darkness after chaos, a simple bold reassuring shield or checkmark emblem in warm amber glowing at its center, ' +
      'resolved and steady and quiet, minimal balanced Saul Bass geometric composition, warm amber glow radiating against deep teal, a held perfect stillness, ' +
      'flat color not grayscale, no words or numbers, ' +
      NO_TEXT +
      ', ',
  },
  {
    slug: 'beat-7-celebration',
    scene:
      'NIGHT scene, a warm joyful celebration around a large glowing television in a dark cozy living room late at night, ' +
      'a group of ordinary friends seen ENTIRELY FROM BEHIND as dark silhouettes, the backs of their heads and shoulders toward the viewer, NO faces visible at all, ' +
      'they are playing a card game shown on the glowing TV, each holding a small glowing smartphone casting warm light on their hands, raised arms and playful body language of laughter and friendly betrayal, ' +
      'the television glow and one warm amber lamp are the only light sources, throwing strong warm golden light across the silhouettes against deep teal midnight darkness, ' +
      'strong warm-amber-versus-deep-teal contrast, bold heavy graphic Archer cartoon cel linework, flat saturated color fills NOT soft pencil shading, bold Saul Bass geometric shapes in the dark background, cinematic warm payoff composition, ',
  },
  {
    slug: 'beat-7-titlecard',
    scene:
      'a bold dramatic empty title-card background in mid-century Saul Bass poster style, a stark angular radial composition of deep teal burnt orange and amber geometric shards radiating outward from a darker calm central area reserved for a title, ' +
      'iconic graphic spy-noir mood, dramatic and clean, no text no title yet just the background, ' +
      NO_TEXT +
      ', ',
  },
]

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

async function generate(ai: GoogleGenAI, shot: BeatShot): Promise<boolean> {
  const prompt = STYLE_PREFIX + shot.scene + NO_TEXT
  process.stdout.write(`  ${shot.slug} … `)
  const response = await ai.models.generateImages({
    model: MODEL,
    prompt,
    config: {
      numberOfImages: 1,
      aspectRatio: '16:9',
      personGeneration: PersonGeneration.ALLOW_ADULT,
    },
  })
  const img = response.generatedImages?.[0]?.image?.imageBytes
  if (!img) {
    console.log('FAILED (safety filter / empty) — retry this slug alone')
    return false
  }
  const buffer = Buffer.from(img, 'base64')
  await writeFile(resolve(OUTPUT_DIR, `${shot.slug}.png`), buffer)
  console.log(`ok (${buffer.length} bytes)`)
  return true
}

async function buildContactSheet(): Promise<void> {
  const files = (await readdir(OUTPUT_DIR)).filter((f) => f.toLowerCase().endsWith('.png'))
  const anchors = files
    .filter((f) => f.startsWith('briggsy-anchor'))
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
  const beats = files
    .filter((f) => !f.startsWith('briggsy-anchor'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

  const section = (title: string, list: string[]): string =>
    list.length === 0
      ? ''
      : `  <h2>${title}</h2>\n  <div class="grid">\n` +
        list
          .map(
            (f) => `    <figure><img src="./${f}" alt="${f}" /><figcaption>${f}</figcaption></figure>`,
          )
          .join('\n') +
        '\n  </div>\n'

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>BURNED — Origin Trailer Assets</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; background: #08181a; color: #cfe6e6;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace; padding: 32px; }
  h1 { letter-spacing: 0.18em; font-weight: 700; font-size: 20px; margin: 0 0 4px; }
  h2 { letter-spacing: 0.14em; font-size: 14px; color: #f4e4c1; margin: 32px 0 12px;
    border-bottom: 1px solid #16333880; padding-bottom: 6px; }
  p.sub { opacity: 0.55; margin: 0 0 8px; font-size: 13px; }
  .grid { display: grid; gap: 24px; grid-template-columns: repeat(auto-fill, minmax(420px, 1fr)); }
  figure { margin: 0; background: #0c2024; border: 1px solid #16333880; border-radius: 10px; overflow: hidden; }
  img { display: block; width: 100%; height: auto; }
  figcaption { padding: 10px 14px; font-size: 12px; letter-spacing: 0.06em; color: #f4e4c1; border-top: 1px solid #16333880; }
</style></head>
<body>
  <h1>BURNED · ORIGIN TRAILER ASSETS</h1>
  <p class="sub">${files.length} images · refresh to update</p>
${section('CHARACTER ANCHOR (locked = v5)', anchors)}
${section('BEAT STORYBOARD (first pass)', beats)}
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
  await mkdir(OUTPUT_DIR, { recursive: true })
  const ai = new GoogleGenAI({ apiKey })

  const only = process.argv[2]
  const shots = only ? SHOTS.filter((s) => s.slug === only) : SHOTS
  if (shots.length === 0) {
    console.error(`No shot matches slug "${only}". Known: ${SHOTS.map((s) => s.slug).join(', ')}`)
    process.exit(1)
  }

  console.log(`\n=== Origin Trailer — beat storyboard (${shots.length} shot${shots.length === 1 ? '' : 's'}) ===`)
  const failed: string[] = []
  for (let i = 0; i < shots.length; i++) {
    const ok = await generate(ai, shots[i])
    if (!ok) failed.push(shots[i].slug)
    if (i < shots.length - 1) await sleep(3000) // rate-limit safety
  }

  await buildContactSheet()
  console.log(`\nViewer: ${resolve(OUTPUT_DIR, 'index.html')}`)
  if (failed.length) console.log(`Retry failed slugs alone: ${failed.join(', ')}`)
}

main().catch((err) => {
  console.error('Unhandled error:', err)
  process.exit(1)
})
