/**
 * Regenerate Vera Khan — re-race to Black (Lana Kane vocabulary from Archer).
 * All other features identical to the 2026-04-23 archived version: pose,
 * turtleneck, hair length, pistol, Saul Bass background.
 *
 * Run: set -a && source .env && set +a && npx tsx scripts/regen-vera.ts
 *
 * Output: temp/roster/vera-khan.png (review before moving to public/).
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
  'portrait of a stunningly beautiful tall Black woman secret agent in her early 30s, ' +
  'warm medium brown skin complexion, ' +
  'dark hair pulled back into a sleek high ponytail with curtain bangs framing the face, ' +
  'striking piercing dark eyes, full lips, ' +
  'medium-sized silver hoop earrings, ' +
  'wearing a cream-colored turtleneck sweater dress that ends at mid-thigh, ' +
  'paired with black thigh-high boots reaching up to just below the hem of the dress, ' +
  'narrow strip of warm brown skin visible between the dress hem and the boot tops, ' +
  'cartoon exaggerated pin-up silhouette with a voluptuous top-heavy bust, dramatically cinched narrow waist, slim narrow hips and slender legs, the dress hugs the body curves, ' +
  'humanly unrealistic hourglass proportions in the Archer cartoon tradition, ' +
  'one hand on hip the other holding a pistol pointed down, ' +
  'expression of withering contempt mixed with effortless sex appeal, ' +
  'she is clearly the most dangerous and most attractive person in any room, ' +
  'long legs confident powerful stance, supermodel who could kill you, ' +
  'deep burnt orange background with bold geometric shapes, Saul Bass style abstract rectangles in teal orange and cream, ' +
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

  console.log(`\n=== Vera Khan regen (Lana iter 9 — cream sweater dress + thigh boots + ponytail) ===`);
  console.log(`Model: ${MODEL}`);
  console.log(`Output: ${OUTPUT_DIR}/vera-khan.png\n`);

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
  const outPath = resolve(OUTPUT_DIR, 'vera-khan.png');
  await writeFile(outPath, buffer);
  console.log(`Saved: ${outPath} (${buffer.length} bytes)`);
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
