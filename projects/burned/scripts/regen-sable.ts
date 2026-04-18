/**
 * Regenerate Sable Ashworth — more voluptuous, V-neck sweater.
 * Run: set -a && source .env && set +a && npx tsx scripts/regen-sable.ts
 *
 * Output: temp/roster/sable-ashworth.png (review before moving to public/).
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
  'a beautiful unhinged woman in her late 20s, secretly a billionaire heiress working as a secretary at a spy agency, ' +
  'long auburn red hair slightly wild, wide manic eyes with a dreamy unfocused expression, ' +
  'wearing an expensive teal cashmere sweater with a V-neck collar, ' +
  'curvy hourglass figure with classic pin-up proportions, feminine silhouette, ' +
  'holding a lit Zippo lighter in one hand and staring at the flame with barely concealed delight, ' +
  'posture of someone who is not entirely present in reality, ' +
  'slight smirk that suggests she knows something terrible and finds it amusing, ' +
  'warm amber and orange background with bold geometric shapes, teal and orange and cream color palette, ' +
  'half-body portrait illustration, cartoon not photograph, flat color not grayscale, ' +
  NO_TEXT;

async function main(): Promise<void> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('ERROR: GEMINI_API_KEY not set.');
    process.exit(1);
  }

  await mkdir(OUTPUT_DIR, { recursive: true });
  const ai = new GoogleGenAI({ apiKey });

  console.log(`\n=== Sable Ashworth regen (voluptuous + V-neck) ===`);
  console.log(`Model: ${MODEL}`);
  console.log(`Output: ${OUTPUT_DIR}/sable-ashworth.png\n`);

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
    console.error('FAILED: Safety filter or empty response. Retry (Imagen safety is flaky).');
    process.exit(1);
  }

  const buffer = Buffer.from(images[0].image!.imageBytes!, 'base64');
  const outPath = resolve(OUTPUT_DIR, 'sable-ashworth.png');
  await writeFile(outPath, buffer);
  console.log(`Saved: ${outPath} (${buffer.length} bytes)`);
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
