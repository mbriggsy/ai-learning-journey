/**
 * Regenerate Dash (background), Otto (Cheryl-ified), Neal (less scared), Agent X (clean badge).
 * Run: set -a && source .env && set +a && npx tsx scripts/regen-fixes2.ts
 */
import { GoogleGenAI, PersonGeneration } from '@google/genai';
import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const MODEL = 'imagen-4.0-generate-001';
const OUTPUT_DIR = resolve('temp/roster');
const INTER_CALL_DELAY_MS = 7_000;

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
    name: 'Dash Barlowe',
    filename: 'dash-barlowe',
    prompt:
      'illustration of an absurdly handsome tall male secret agent in his early 30s, ' +
      'chiseled jaw razor-sharp cheekbones thick dark hair perfectly swept back, ' +
      'wearing a slim-fit black turtleneck under an impeccably tailored grey suit, ' +
      'holding a martini glass with supreme unearned confidence, one eyebrow raised, ' +
      'smug self-satisfied expression of a man who thinks he is the greatest spy alive, ' +
      'broad shoulders athletic build, ' +
      'bold geometric abstract shapes in teal orange and cream behind him, ' +
      'half-body portrait, ' + NO_TEXT,
  },
  {
    name: 'Otto Prang',
    filename: 'otto-prang',
    prompt:
      'illustration of a beautiful unhinged woman in her late 20s, secretly a billionaire heiress working as a secretary at a spy agency, ' +
      'long auburn red hair slightly wild, wide manic eyes with a dreamy unfocused expression, ' +
      'wearing an expensive cashmere sweater that costs more than everyones salary, ' +
      'holding a lit lighter in one hand and staring at the flame with barely concealed delight, ' +
      'thin elegant figure, posture of someone who is not entirely present in reality, ' +
      'slight smirk that suggests she knows something terrible and finds it amusing, ' +
      'warm amber and orange background with bold geometric shapes, ' +
      'half-body portrait, ' + NO_TEXT,
  },
  {
    name: 'Neal Proctor',
    filename: 'neal-proctor',
    prompt:
      'illustration of an uptight nervous man in his late 30s, office accountant who keeps getting dragged into spy missions, ' +
      'wire-rimmed glasses, neatly parted hair, loosened tie, ' +
      'wearing a dress shirt with sleeves rolled up, trying to look more competent than he feels, ' +
      'holding a thick binder under one arm while adjusting his glasses with the other hand, ' +
      'expression of strained confidence masking deep anxiety, not terrified just perpetually stressed, ' +
      'thin build, decent posture, he is trying his best, ' +
      'muted teal green background with bold geometric shapes, ' +
      'half-body portrait, ' + NO_TEXT,
  },
  {
    name: 'Agent X',
    filename: 'agent-x',
    prompt:
      'illustration of a mysterious figure in an absurdly obvious disguise, ' +
      'wearing a clearly fake oversized curly wig and a ridiculous stick-on mustache over a sly knowing grin, ' +
      'long trench coat with upturned collar, holding up a blank white ID badge with no writing on it, ' +
      'one eye winking at the viewer with chaotic mischievous energy, ' +
      'this person is clearly in disguise and absolutely no one is going to stop them, ' +
      'theatrical dramatic pose with maximum confidence, ' +
      'rich magenta and teal background with bold geometric shapes, ' +
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

  console.log(`\n=== BURNED — Roster Fixes v2 (4 characters) ===\n`);

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
