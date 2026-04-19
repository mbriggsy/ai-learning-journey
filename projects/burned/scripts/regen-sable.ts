/**
 * Regenerate Sable Ashworth — direct eye contact with the camera (matches
 * Dash/Vera/Janet framing). Zippo stays as iconic prop but no longer steals
 * her gaze. Prior pass had her staring at the flame; archived as
 * sable-ashworth-2026-04-19-flame-gaze.png.
 *
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
  'portrait of a stunningly beautiful unhinged woman in her late 20s, secretly a billionaire heiress working as a secretary at a spy agency, ' +
  'long auburn red hair slightly wild and voluminous, striking piercing green eyes, intense focused stare, full lips, ' +
  'eyes locked on the camera, direct frontal gaze at the viewer, head and face turned straight toward the camera, ' +
  'wearing an expensive fitted teal cashmere sweater with a deep V-neck that shows off a fuller bust, no collar no shirt underneath just the sweater, ' +
  'pin-up top-heavy hourglass silhouette, fuller bust narrow slim waist, classic feminine curves, ' +
  'holding a lit Zippo lighter down at her side in one hand, arm relaxed at her hip, held low and casually the way someone holds a cocktail glass at a party, flame visible but not her focus, ' +
  'slight knowing smirk that suggests she knows something terrible and finds it amusing, ' +
  'posing for a magazine cover, subject facing the camera head-on, ' +
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
