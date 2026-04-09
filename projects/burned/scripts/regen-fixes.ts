/**
 * Regenerate only the 3 failed characters from roster v2.
 * Run: set -a && source .env && set +a && npx tsx scripts/regen-fixes.ts
 */
import { GoogleGenAI, PersonGeneration } from '@google/genai';
import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const MODEL = 'imagen-4.0-generate-001';
const OUTPUT_DIR = resolve('temp/roster');
const INTER_CALL_DELAY_MS = 7_000;

// Softened negative — don't scream it, just state it clearly at the end
const STYLE_PREFIX =
  'Mid-century modern illustration, 1960s retro graphic art style, ' +
  'bold graphic linework, flat saturated color fills, angular geometric simplification, ' +
  'warm color palette with deep teals burnt oranges and rich creams, ' +
  'stylized illustration NOT a photograph NOT 3D NOT realistic, ' +
  'clean vector-like quality, Saul Bass inspired composition, ';

const NO_TEXT = 'the image contains no text and no writing';

interface CharacterPrompt {
  name: string;
  filename: string;
  prompt: string;
}

const CHARACTERS: CharacterPrompt[] = [
  {
    name: 'Vera Khan',
    filename: 'vera-khan',
    prompt:
      'illustration of a stunningly beautiful tall woman secret agent in her early 30s, ' +
      'long flowing dark hair, striking piercing eyes, full lips, high cheekbones, ' +
      'wearing a fitted black tactical turtleneck showing athletic curves, ' +
      'one hand on hip the other holding a pistol pointed down casually, ' +
      'expression of withering contempt mixed with effortless glamour, ' +
      'she is the most dangerous and most attractive person in any room, ' +
      'long legs confident powerful stance, ' +
      'deep burnt orange background with bold geometric shapes, ' +
      'half-body portrait, ' + NO_TEXT,
  },
  {
    name: 'Otto Prang',
    filename: 'otto-prang',
    prompt:
      'illustration of an enthusiastic eccentric male mad scientist in his 40s, ' +
      'enormous bushy mustache, lab goggles on forehead, wild eager eyes, ' +
      'wearing a rumpled lab coat over a vest with too many pockets, ' +
      'holding up a bizarre sparking gadget with manic pride, wires everywhere, ' +
      'grin of a man who just made something explode on purpose, ' +
      'stocky build, messy hair, burn marks on coat, ' +
      'warm amber gold background with bold geometric shapes, ' +
      'half-body portrait, ' + NO_TEXT,
  },
  {
    name: 'Neal Proctor',
    filename: 'neal-proctor',
    prompt:
      'illustration of a nervous anxious thin man in his late 30s, ' +
      'wire-rimmed glasses slightly askew, receding hairline, loosened tie, ' +
      'wearing a wrinkled short-sleeve dress shirt with a pocket protector, ' +
      'clutching a thick binder to his chest like a shield, ' +
      'expression of perpetual mild panic mixed with resignation, ' +
      'slight hunch, visible worry lines, looks like he needs allergy medication, ' +
      'muted teal green background with bold geometric shapes, ' +
      'half-body portrait, ' + NO_TEXT,
  },
];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) { console.error('ERROR: GEMINI_API_KEY not set.'); process.exit(1); }

  await mkdir(OUTPUT_DIR, { recursive: true });
  const ai = new GoogleGenAI({ apiKey });

  console.log(`\n=== BURNED — Roster Fixes (3 characters) ===\n`);

  for (let i = 0; i < CHARACTERS.length; i++) {
    const char = CHARACTERS[i];
    const fullPrompt = STYLE_PREFIX + char.prompt;

    console.log(`[${i + 1}/${CHARACTERS.length}] Regenerating ${char.name}...`);

    try {
      const response = await ai.models.generateImages({
        model: MODEL,
        prompt: fullPrompt,
        config: {
          numberOfImages: 1,
          aspectRatio: '3:4',
          personGeneration: PersonGeneration.ALLOW_ADULT,
        },
      });

      const images = response.generatedImages;
      if (!images || images.length === 0) {
        console.error(`  FAILED: Safety filter or empty response.`);
      } else {
        const buffer = Buffer.from(images[0].image!.imageBytes!, 'base64');
        const outPath = resolve(OUTPUT_DIR, `${char.filename}.png`);
        await writeFile(outPath, buffer);
        console.log(`  Saved: ${outPath} (${buffer.length} bytes)`);
      }
    } catch (e) {
      console.error(`  ERROR: ${e instanceof Error ? e.message : String(e)}`);
    }

    if (i < CHARACTERS.length - 1) {
      console.log(`  Waiting ${INTER_CALL_DELAY_MS / 1000}s...`);
      await delay(INTER_CALL_DELAY_MS);
    }
  }

  console.log('\nDone.');
}

main().catch((err) => { console.error('Unhandled error:', err); process.exit(1); });
