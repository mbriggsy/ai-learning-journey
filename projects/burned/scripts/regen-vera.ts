/**
 * Regenerate Vera Khan — tiny bit more voluptuous, everything else identical.
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
  'portrait of a stunningly beautiful tall woman secret agent in her early 30s, ' +
  'long dark hair flowing over shoulders, striking piercing dark eyes, full lips, ' +
  'wearing a fitted black tactical turtleneck that shows off a fuller bust, narrow slim waist and narrow slim hips, pin-up top-heavy hourglass silhouette, ' +
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

  console.log(`\n=== Vera Khan regen (tiny bit more voluptuous) ===`);
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
