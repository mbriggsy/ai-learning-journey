/**
 * Generate all 11 BURNED action/utility card illustrations via Imagen 4.
 * Run: set -a && source .env && set +a && npx tsx scripts/generate-cards.ts
 *
 * Roster portraits already exist — this covers every non-operative card type.
 * Rate limit: 7s between calls. ~77s total for 11 images.
 *
 * Use --only=burned,extraction to regenerate specific cards.
 */
import { GoogleGenAI, PersonGeneration } from '@google/genai';
import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const MODEL = 'imagen-4.0-generate-001';
const OUTPUT_DIR = resolve('temp/cards');
const INTER_CALL_DELAY_MS = 7_000;

const STYLE_PREFIX =
  'Mid-century modern illustration, 1960s retro spy-agency style, ' +
  'bold graphic linework, flat saturated color fills, angular geometric simplification, ' +
  'warm color palette with deep teals burnt oranges and rich creams, ' +
  'stylized NOT photographic NOT 3D render NOT realistic NOT cartoon, ' +
  'clean vector-like quality, Saul Bass inspired composition, ' +
  'iconic object centered in frame like a classified dossier stamp, ' +
  'ABSOLUTELY NO TEXT NO WORDS NO LETTERS NO NUMBERS NO TYPOGRAPHY NO TITLES NO CAPTIONS NO LOGOS NO WATERMARKS NO SIGNATURES NO WRITING OF ANY KIND, ';

interface CardPrompt {
  type: string;
  name: string;
  prompt: string;
}

const CARDS: CardPrompt[] = [
  {
    type: 'burned',
    name: 'Burned',
    prompt:
      'a dramatic explosion with a spy ID badge being consumed by flames, ' +
      'bold radiating lines emanating from center, shattered glass fragments flying outward, ' +
      'alarm red and bright orange color scheme against deep charcoal, ' +
      'danger and urgency feeling, the moment a cover is blown, ' +
      'geometric abstract style with sharp angular shapes, ' +
      'square composition centered object',
  },
  {
    type: 'extraction',
    name: 'Extraction',
    prompt:
      'a helicopter extraction rope ladder descending from above with a hand reaching up to grab it, ' +
      'cool blue and teal color scheme suggesting relief and safety, ' +
      'dramatic spotlight from above, geometric clouds and wind lines, ' +
      'the moment of rescue and escape, bold simplified shapes, ' +
      'square composition centered object',
  },
  {
    type: 'reassign',
    name: 'Reassign',
    prompt:
      'a bold rubber stamp pressing down with force lines radiating outward, ' +
      'official transfer order document underneath, ' +
      'warm amber and gold color scheme on deep teal background, ' +
      'bureaucratic authority meets spy drama, angular geometric shapes, ' +
      'the weight of reassignment orders coming down hard, ' +
      'square composition centered object',
  },
  {
    type: 'direct-order',
    name: 'Direct Order',
    prompt:
      'a pointing hand in a military command gesture with a target crosshair behind it, ' +
      'bold amber and gold rays radiating from the pointing finger, ' +
      'authoritative and commanding, chain of command energy, ' +
      'deep teal background with geometric angular shapes, ' +
      'square composition centered object',
  },
  {
    type: 'go-dark',
    name: 'Go Dark',
    prompt:
      'a spy silhouette stepping through a doorway into shadow and disappearing, ' +
      'half the figure dissolved into geometric darkness, ' +
      'muted teal and charcoal color scheme, mysterious and stealthy, ' +
      'the moment of vanishing off the grid, bold angular shadows, ' +
      'venetian blind light strips across the figure, ' +
      'square composition centered object',
  },
  {
    type: 'intel-briefing',
    name: 'Intel Briefing',
    prompt:
      'a spy peering through venetian blinds at classified documents spread on a desk, ' +
      'one eye visible through the slats with knowing expression, ' +
      'warm amber glow on the documents, cool teal shadows, ' +
      'surveillance and secrecy, peeking at what you should not see, ' +
      'bold geometric composition with strong horizontal lines, ' +
      'square composition centered object',
  },
  {
    type: 'falsify-intel',
    name: 'Falsify Intel',
    prompt:
      'a hand with a fountain pen altering a classified document, crossing out and rewriting, ' +
      'red ink editing marks over official blue text, ' +
      'shadowy manipulation energy, warm amber and deep red color scheme, ' +
      'the art of disinformation and deception, geometric angular style, ' +
      'rubber stamps and redaction bars in background, ' +
      'square composition centered object',
  },
  {
    type: 'burn-the-files',
    name: 'Burn the Files',
    prompt:
      'a filing cabinet with documents flying out and catching fire mid-air, ' +
      'papers scattering in a geometric spiral pattern, ' +
      'warm orange flames consuming classified folders against deep teal, ' +
      'frantic evidence destruction energy, bold angular shapes, ' +
      'the scramble to destroy everything before they arrive, ' +
      'square composition centered object',
  },
  {
    type: 'back-channel',
    name: 'Back Channel',
    prompt:
      'a rotary telephone with a coiled cord leading under a closed door, ' +
      'secret communication through unofficial channels, ' +
      'warm amber highlights on the phone, cool teal shadows, ' +
      'mysterious back-room dealings energy, bold geometric composition, ' +
      'the phone you use when the official lines are compromised, ' +
      'square composition centered object',
  },
  {
    type: 'call-in-a-favor',
    name: 'Call in a Favor',
    prompt:
      'two hands in a firm handshake with a playing card being secretly passed between the palms, ' +
      'one hand in an expensive suit cuff the other in tactical gear, ' +
      'warm gold and amber color scheme suggesting a debt being collected, ' +
      'the unspoken agreement between spies, geometric angular style, ' +
      'deep teal background, bold simplified shapes, ' +
      'square composition centered object',
  },
  {
    type: 'intercepted',
    name: 'Intercepted',
    prompt:
      'a bold hand slamming down on a table and stopping a chess piece mid-move, ' +
      'radiating impact lines from the point of contact, ' +
      'sharp teal and electric blue color scheme, ' +
      'the decisive moment of counter-intelligence, geometric angular style, ' +
      'authority and denial energy, blocking and cancelling, ' +
      'square composition centered object',
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

  // Parse --only flag
  const onlyArg = process.argv.find((a) => a.startsWith('--only='));
  const onlyTypes = onlyArg
    ? new Set(onlyArg.replace('--only=', '').split(','))
    : null;

  const cards = onlyTypes
    ? CARDS.filter((c) => onlyTypes.has(c.type))
    : CARDS;

  if (cards.length === 0) {
    console.error('ERROR: No matching card types found.');
    process.exit(1);
  }

  await mkdir(OUTPUT_DIR, { recursive: true });
  const ai = new GoogleGenAI({ apiKey });

  console.log(`\n=== BURNED — Card Illustration Generation ===`);
  console.log(`Model: ${MODEL}`);
  console.log(`Cards: ${cards.length}${onlyTypes ? ` (filtered: ${[...onlyTypes].join(', ')})` : ''}`);
  console.log(`Output: ${OUTPUT_DIR}\n`);

  const results: Array<{ type: string; name: string; status: string }> = [];

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const fullPrompt = STYLE_PREFIX + card.prompt;

    console.log(`[${i + 1}/${cards.length}] Generating ${card.name}...`);

    try {
      const response = await ai.models.generateImages({
        model: MODEL,
        prompt: fullPrompt,
        config: {
          numberOfImages: 1,
          aspectRatio: '1:1',
          personGeneration: PersonGeneration.ALLOW_ADULT,
        },
      });

      const images = response.generatedImages;
      if (!images || images.length === 0) {
        console.error(`  FAILED: Safety filter or empty response.`);
        results.push({ type: card.type, name: card.name, status: 'FAILED' });
      } else {
        const buffer = Buffer.from(images[0].image!.imageBytes!, 'base64');
        const outPath = resolve(OUTPUT_DIR, `${card.type}.png`);
        await writeFile(outPath, buffer);
        console.log(`  Saved: ${outPath} (${buffer.length} bytes)`);
        results.push({ type: card.type, name: card.name, status: 'OK' });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`  ERROR: ${msg}`);
      results.push({ type: card.type, name: card.name, status: 'ERROR' });
    }

    if (i < cards.length - 1) {
      console.log(`  Waiting ${INTER_CALL_DELAY_MS / 1000}s...`);
      await delay(INTER_CALL_DELAY_MS);
    }
  }

  console.log('\n=== Results ===');
  console.table(results);

  const failed = results.filter((r) => r.status !== 'OK').length;
  if (failed > 0) {
    console.log(`\n${failed} failed. Re-run with: --only=${results.filter(r => r.status !== 'OK').map(r => r.type).join(',')}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
