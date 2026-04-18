/**
 * Regenerate Dash Barlowe — bourbon in a lowball glass instead of a martini.
 * Run: set -a && source .env && set +a && npx tsx scripts/regen-dash.ts
 *
 * Output: temp/roster/dash-barlowe.png (review before moving to public/).
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
  'illustration of an absurdly handsome tall male secret agent in his early 30s, ' +
  'chiseled jaw razor-sharp cheekbones thick dark hair perfectly swept back, ' +
  'wearing a slim-fit black turtleneck under an impeccably tailored grey suit, ' +
  'holding a crystal lowball rocks glass filled with amber bourbon whiskey and a single large square ice cube, ' +
  'raising the glass at chest height with supreme unearned confidence, one eyebrow raised, ' +
  'smug self-satisfied expression of a man who thinks he is the greatest spy alive but is actually terrible at his job, ' +
  'broad shoulders athletic build, standing like he is posing for a magazine cover, ' +
  'warm cream and gold background with bold geometric shapes behind him, shapes in deep teal burnt orange amber and cream, Saul Bass style abstract rectangles, ' +
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

  console.log(`\n=== Dash Barlowe regen (bourbon instead of martini) ===`);
  console.log(`Model: ${MODEL}`);
  console.log(`Output: ${OUTPUT_DIR}/dash-barlowe.png\n`);

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
  const outPath = resolve(OUTPUT_DIR, 'dash-barlowe.png');
  await writeFile(outPath, buffer);
  console.log(`Saved: ${outPath} (${buffer.length} bytes)`);
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
