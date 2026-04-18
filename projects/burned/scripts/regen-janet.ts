/**
 * Regenerate Janet Broadside — full-body, red-sole Louboutin heels visible, background dialed back.
 * Run: set -a && source .env && set +a && npx tsx scripts/regen-janet.ts
 *
 * Output: temp/roster/janet-broadside.png (review before moving to public/).
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
  'full-body illustration showing her entirely head to toe, a glamorous intimidating older woman in her early 60s who runs a spy agency, ' +
  'perfectly coiffed silver hair, sharp elegant features, immaculate makeup, pearl necklace, ' +
  'wearing an expensive deep teal designer blazer with a silk cream blouse and a fitted pencil skirt, ' +
  'sitting in a rich cognac-brown leather wingback chair like a throne, legs elegantly crossed, ' +
  'wearing expensive designer stiletto high heels with bright signature red-lacquered soles clearly visible, Louboutin style red bottoms, ' +
  'holding a crystal martini cocktail glass in one manicured hand, ' +
  'expression of ice-cold superiority and barely concealed disdain for everyone around her, ' +
  'the kind of woman who fires people while sipping bourbon at 10am, slim elegant terrifyingly composed, ' +
  'warm cream and gold background with bold geometric shapes arranged behind the chair, shapes in deep teal burnt orange amber and cream, ' +
  'geometric shapes positioned as backdrop framing only, shapes sit behind and around her without overlapping her figure, Saul Bass style abstract rectangles and circles, ' +
  'she dominates the composition, subject fills the frame vertically and takes up at least 70 percent of the image height, ' +
  'full-body portrait cartoon illustration, flat color not grayscale, ' +
  NO_TEXT;

async function main(): Promise<void> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('ERROR: GEMINI_API_KEY not set.');
    process.exit(1);
  }

  await mkdir(OUTPUT_DIR, { recursive: true });
  const ai = new GoogleGenAI({ apiKey });

  console.log(`\n=== Janet Broadside regen (full-body + red-sole heels) ===`);
  console.log(`Model: ${MODEL}`);
  console.log(`Output: ${OUTPUT_DIR}/janet-broadside.png\n`);

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
  const outPath = resolve(OUTPUT_DIR, 'janet-broadside.png');
  await writeFile(outPath, buffer);
  console.log(`Saved: ${outPath} (${buffer.length} bytes)`);
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
