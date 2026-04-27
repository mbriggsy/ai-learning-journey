/**
 * Regenerate Agent X — Slater-style badass with an eye patch. Mysterious, dangerous, ambiguous.
 * Run: set -a && source .env && set +a && npx tsx scripts/regen-agent-x.ts
 *
 * Output: temp/roster/agent-x.png (review before moving to public/).
 */
import { GoogleGenAI, PersonGeneration } from '@google/genai';
import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const MODEL = 'imagen-4.0-generate-001';
const OUTPUT_DIR = resolve('temp/roster');

const STYLE_PREFIX =
  'Mid-century modern illustration, 1960s retro graphic art style, ' +
  'bold graphic linework, flat saturated color fills, angular geometric simplification, ' +
  'warm color palette with deep teals burnt oranges and rich creams, ' +
  'stylized illustration NOT a photograph NOT 3D NOT realistic, ' +
  'clean vector-like quality, Saul Bass inspired composition, ';

const NO_TEXT = 'the image contains no text and no writing';

const PROMPT =
  STYLE_PREFIX +
  'cartoon illustration in the style of the TV show Archer, flat color animation cel style, ' +
  'illustration of a dangerous rugged male special operative in his late 30s or early 40s, ' +
  'a single black leather eye patch over his left eye held by a thin strap across his forehead, ' +
  'square jaw light blonde stubble faint scar running down one cheek, cold hard expression, ' +
  'thick blonde hair slightly tousled visible beneath the hat, the visible eye piercing and unreadable, ' +
  'wearing a dark charcoal trench coat with the collar turned up high obscuring his lower face and jawline, ' +
  'a black fedora pulled low, shadow across the upper face adds mystery, ' +
  'half-body composition, facing the viewer straight on with tight controlled menace, ' +
  'hands partly in trench coat pockets, posture of someone who has killed people quietly and professionally, ' +
  'he looks like he could be friend or foe you genuinely cannot tell, wild card operative, ' +
  'rich magenta burnt orange and teal background with bold geometric shapes, Saul Bass style abstract rectangles, ' +
  // Framing match: other operatives (Dash, Vera, Sable, Janet, Neal) all
  // sit with visible background headroom above the hair / head. Without
  // this instruction Imagen frames Agent X tight to the top because
  // "fedora pulled low" + "trench coat collar high" reads as a vertical
  // subject and the model fills the canvas. Result: in the hand fan, the
  // figure looks larger than the operatives even though the card slots
  // are identical-sized. Keep ~12-15% of canvas height as background
  // ABOVE the hat — same visual breathing room as the other operatives.
  'wide framing with the figure occupying the lower three-quarters of the canvas, ' +
  'leave significant background headroom above the hat, ' +
  'twelve to fifteen percent of the canvas above the top of the fedora is geometric background NOT figure, ' +
  'figure does NOT touch the top edge of the frame, ' +
  'half-body portrait cartoon illustration, flat color not grayscale, ' +
  NO_TEXT;

async function main(): Promise<void> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('ERROR: GEMINI_API_KEY not set.');
    process.exit(1);
  }

  await mkdir(OUTPUT_DIR, { recursive: true });
  const ai = new GoogleGenAI({ apiKey });

  console.log(`\n=== Agent X regen (Slater-style + eye patch) ===`);
  console.log(`Model: ${MODEL}`);
  console.log(`Output: ${OUTPUT_DIR}/agent-x.png\n`);

  const response = await ai.models.generateImages({
    model: MODEL,
    prompt: PROMPT,
    config: {
      numberOfImages: 1,
      aspectRatio: '3:4',
      personGeneration: PersonGeneration.ALLOW_ADULT,
    },
  });

  const images = response.generatedImages;
  if (!images || images.length === 0) {
    console.error('FAILED: Safety filter or empty response. Retry.');
    process.exit(1);
  }

  const buffer = Buffer.from(images[0].image!.imageBytes!, 'base64');
  const outPath = resolve(OUTPUT_DIR, 'agent-x.png');
  await writeFile(outPath, buffer);
  console.log(`Saved: ${outPath} (${buffer.length} bytes)`);
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
