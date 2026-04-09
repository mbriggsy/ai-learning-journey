/**
 * One-shot Imagen 4 test — Dash Barlowe character card art.
 * Run: set -a && source .env && set +a && npx tsx scripts/test-imagen.ts
 */
import { GoogleGenAI, PersonGeneration } from '@google/genai';
import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const MODEL = 'imagen-4.0-generate-001';
const OUTPUT_DIR = resolve('temp');

const STYLE_PREFIX =
  'Mid-century modern illustration in the style of 1960s spy movie title sequences, ' +
  'bold graphic linework, flat saturated color fills, angular geometric simplification, ' +
  'warm color palette with deep teals burnt oranges and rich creams, ' +
  'stylized NOT photographic NOT 3D render NOT realistic NOT cartoon NOT anime, ' +
  'clean vector-like quality, Saul Bass inspired composition, ';

const DASH_PROMPT =
  STYLE_PREFIX +
  'portrait of a tall handsome male spy in his early 30s, ' +
  'strong jaw sharp cheekbones thick dark hair swept back, no sunglasses, visible eyes with cocky expression, ' +
  'wearing a slim-fit black turtleneck under a perfectly tailored grey suit jacket, ' +
  'one eyebrow slightly raised with a self-satisfied smirk, ' +
  'holding a martini glass casually like he was born with it, ' +
  'broad shoulders athletic build, impossibly confident posture, ' +
  'warm teal background with geometric abstract shapes, ' +
  'personnel file illustration style, half-body portrait composition, ' +
  'no text no words no letters no typography no watermark';

async function main(): Promise<void> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('ERROR: GEMINI_API_KEY not set. Run: set -a && source .env && set +a');
    process.exit(1);
  }

  await mkdir(OUTPUT_DIR, { recursive: true });

  const ai = new GoogleGenAI({ apiKey });

  console.log('Generating Dash Barlowe test image...');
  console.log(`Model: ${MODEL}`);
  console.log(`Prompt: ${DASH_PROMPT.slice(0, 120)}...`);

  const response = await ai.models.generateImages({
    model: MODEL,
    prompt: DASH_PROMPT,
    config: {
      numberOfImages: 1,
      aspectRatio: '3:4',
      personGeneration: PersonGeneration.ALLOW_ADULT,
    },
  });

  const images = response.generatedImages;
  if (!images || images.length === 0) {
    console.error('FAILED: Safety filter or empty response. Try adjusting the prompt.');
    process.exit(1);
  }

  const imageData = images[0].image;
  if (!imageData?.imageBytes) {
    console.error('FAILED: No image bytes in response.');
    process.exit(1);
  }

  const buffer = Buffer.from(imageData.imageBytes, 'base64');
  const outPath = resolve(OUTPUT_DIR, 'dash-barlowe-test.png');
  await writeFile(outPath, buffer);

  console.log(`\nSaved: ${outPath} (${buffer.length} bytes)`);
  console.log('Open it up and see if the style lands.');
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
