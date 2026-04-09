/**
 * Generate all 6 BURNED operative character card art via Imagen 4.
 * Run: set -a && source .env && set +a && npx tsx scripts/generate-roster.ts
 *
 * Rate limit: 7s between calls. ~42s total for 6 images.
 */
import { GoogleGenAI, PersonGeneration } from '@google/genai';
import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const MODEL = 'imagen-4.0-generate-001';
const OUTPUT_DIR = resolve('temp/roster');
const INTER_CALL_DELAY_MS = 7_000;

const STYLE_PREFIX =
  'Mid-century modern illustration, 1960s retro style, ' +
  'bold graphic linework, flat saturated color fills, angular geometric simplification, ' +
  'warm color palette with deep teals burnt oranges and rich creams, ' +
  'stylized NOT photographic NOT 3D render NOT realistic, ' +
  'clean vector-like quality, Saul Bass inspired composition, ' +
  'ABSOLUTELY NO TEXT NO WORDS NO LETTERS NO NUMBERS NO TYPOGRAPHY NO TITLES NO CAPTIONS NO LOGOS NO WATERMARKS NO SIGNATURES NO WRITING OF ANY KIND, ';

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
      'portrait of an absurdly handsome tall male secret agent in his early 30s, ' +
      'chiseled jaw razor-sharp cheekbones thick dark hair perfectly swept back, ' +
      'wearing a slim-fit black turtleneck under an impeccably tailored grey suit, ' +
      'holding a martini glass with supreme unearned confidence, one eyebrow raised, ' +
      'smug self-satisfied expression of a man who thinks he is the greatest spy alive but is actually terrible at his job, ' +
      'broad shoulders athletic build, standing like he is posing for a magazine cover, ' +
      'warm teal background with bold geometric shapes, ' +
      'half-body portrait composition',
  },
  {
    name: 'Vera Khan',
    filename: 'vera-khan',
    prompt:
      'portrait of a stunningly beautiful tall woman secret agent in her early 30s, ' +
      'long dark hair flowing over shoulders, striking piercing dark eyes, full lips, ' +
      'wearing a fitted black tactical turtleneck that shows off athletic curves, ' +
      'one hand on hip the other holding a pistol pointed down, ' +
      'expression of withering contempt mixed with effortless sex appeal, ' +
      'she is clearly the most dangerous and most attractive person in any room, ' +
      'long legs confident powerful stance, supermodel who could kill you, ' +
      'deep burnt orange background with bold geometric shapes, ' +
      'half-body portrait composition',
  },
  {
    name: 'Otto Prang',
    filename: 'otto-prang',
    prompt:
      'portrait of an enthusiastic eccentric male mad scientist in his 40s, ' +
      'enormous bushy mustache, lab goggles pushed up on forehead, wild eager eyes, ' +
      'wearing a rumpled lab coat over a vest with too many pockets full of tools, ' +
      'holding up a bizarre sparking gadget with manic pride, wires sticking out everywhere, ' +
      'grin of a man who just made something explode on purpose and cannot wait to do it again, ' +
      'stocky build, messy hair, burn marks on lab coat, ' +
      'warm amber gold background with bold geometric shapes, ' +
      'half-body portrait composition',
  },
  {
    name: 'Janet Broadside',
    filename: 'janet-broadside',
    prompt:
      'portrait of a glamorous intimidating older woman in her early 60s who runs a spy agency, ' +
      'perfectly coiffed silver hair, sharp elegant features, immaculate makeup, ' +
      'wearing an expensive designer blazer with pearls and a silk blouse, holding a crystal cocktail glass, ' +
      'expression of ice-cold superiority and barely concealed disdain for everyone around her, ' +
      'the kind of woman who fires people while sipping bourbon at 10am, ' +
      'slim elegant terrifyingly composed, sitting in a leather chair like a throne, ' +
      'warm cream and gold background with bold geometric shapes, ' +
      'half-body portrait composition',
  },
  {
    name: 'Neal Proctor',
    filename: 'neal-proctor',
    prompt:
      'portrait of a nervous anxious thin man in his late 30s, office accountant accidentally caught up in spy missions, ' +
      'wire-rimmed glasses slightly askew, receding hairline, loosened tie with sweat stains, ' +
      'wearing a wrinkled short-sleeve dress shirt with a pocket protector, ' +
      'clutching a thick three-ring binder to his chest like a shield, ' +
      'expression of someone who is always about two seconds from a panic attack, ' +
      'slight hunch, visible worry lines, allergic to everything including danger, ' +
      'muted teal green background with bold geometric shapes, ' +
      'half-body portrait composition',
  },
  {
    name: 'Agent X',
    filename: 'agent-x',
    prompt:
      'portrait of a mysterious figure in an absurdly obvious disguise, ' +
      'wearing a clearly fake oversized curly wig and a ridiculous stick-on mustache over a sly knowing grin, ' +
      'long trench coat with upturned collar, flashing someone elses stolen ID badge, ' +
      'one eye winking at the viewer with chaotic mischievous energy, ' +
      'this person is clearly in disguise and absolutely no one is going to stop them, ' +
      'theatrical dramatic pose with maximum confidence, ' +
      'rich magenta and teal background with bold geometric shapes, ' +
      'half-body portrait composition',
  },
];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('ERROR: GEMINI_API_KEY not set.');
    process.exit(1);
  }

  await mkdir(OUTPUT_DIR, { recursive: true });
  const ai = new GoogleGenAI({ apiKey });

  console.log(`\n=== BURNED — Roster Generation ===`);
  console.log(`Model: ${MODEL}`);
  console.log(`Characters: ${CHARACTERS.length}`);
  console.log(`Output: ${OUTPUT_DIR}\n`);

  const results: Array<{ name: string; status: string }> = [];

  for (let i = 0; i < CHARACTERS.length; i++) {
    const char = CHARACTERS[i];
    const fullPrompt = STYLE_PREFIX + char.prompt;

    console.log(`[${i + 1}/${CHARACTERS.length}] Generating ${char.name}...`);

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
        results.push({ name: char.name, status: 'FAILED' });
      } else {
        const buffer = Buffer.from(images[0].image!.imageBytes!, 'base64');
        const outPath = resolve(OUTPUT_DIR, `${char.filename}.png`);
        await writeFile(outPath, buffer);
        console.log(`  Saved: ${outPath} (${buffer.length} bytes)`);
        results.push({ name: char.name, status: 'OK' });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`  ERROR: ${msg}`);
      results.push({ name: char.name, status: 'ERROR' });
    }

    if (i < CHARACTERS.length - 1) {
      console.log(`  Waiting ${INTER_CALL_DELAY_MS / 1000}s...`);
      await delay(INTER_CALL_DELAY_MS);
    }
  }

  console.log('\n=== Results ===');
  console.table(results);

  const failed = results.filter((r) => r.status !== 'OK').length;
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
