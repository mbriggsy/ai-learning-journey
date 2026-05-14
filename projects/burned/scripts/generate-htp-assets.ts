/**
 * Imagen 4 generator for the HOW-TO-PLAY page assets.
 *
 * Run: set -a && source .env && set +a && pnpm tsx scripts/generate-htp-assets.ts
 *
 * Generates one asset per invocation (driven by the CREST_ONLY etc. flags below).
 * Each lives in temp/htp-assets/ until reviewed and copied into public/assets/howtoplay/.
 *
 * Single-test discipline (per docs/conventions/assets.md): generate ONE asset,
 * eyeball, align, then batch the rest.
 */
import { GoogleGenAI, PersonGeneration } from '@google/genai';
import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const MODEL = 'imagen-4.0-generate-001';
const OUTPUT_DIR = resolve('temp/htp-assets');
const INTER_CALL_DELAY_MS = 7_000;

interface AssetPrompt {
  name: string;
  filename: string;
  aspectRatio: '1:1' | '3:4' | '4:3' | '16:9' | '9:16';
  prompt: string;
}

const PROMPTS: AssetPrompt[] = [
  {
    name: 'Pendleton Agency crest seal',
    filename: 'pendleton-crest',
    aspectRatio: '1:1',
    prompt: [
      // Style block — mid-century vector + ink-stamp character
      'Mid-century modern governmental seal design, ink-stamped on aged manila paper,',
      'bold flat color illustration, thick black outlines, Saul Bass-inspired iconography,',
      'WARM color palette: deep teal #1e3f45, burnt orange #94 7226, rich cream #f6ebce, warm gold #c98a5c, charcoal black #1a1812,',
      'NOT photographic NOT realistic NOT 3D render NOT cartoon NOT anime,',
      // Subject
      'circular government-style agency seal, perfectly symmetric design,',
      'OUTER RING contains text arranged around the curve in elegant 1960s mono-spaced uppercase letters reading THE PENDLETON AGENCY at the top, and along the bottom EST. MCMLXII (Roman numerals),',
      'INNER RING is a decorative laurel wreath, two laurel branches curving up from each side meeting at a central medallion at the top,',
      'CENTER MEDALLION contains a stylized crossed pair of objects: a fountain pen and a martini olive pick crossed in an X shape, with a tiny olive on the pick, slightly off-axis like a hand-stamped seal,',
      'subtle ink-bleed texture on all linework like a rubber stamp impression on textured paper,',
      'aged cream background with faint paper grain,',
      'absolutely NO additional text NO words NO numbers beyond the ring text described,',
    ].join(' '),
  },
  {
    name: 'Operations Manual title plate',
    filename: 'operations-manual-plate',
    aspectRatio: '4:3',
    prompt: [
      'Mid-century 1960s spy movie title card design,',
      'Saul Bass inspired composition with bold flat geometric shapes,',
      'large block uppercase cream-colored letters spelling BURNED arranged horizontally as the dominant element,',
      'above the BURNED letters in smaller letters reads OPERATION,',
      'below the BURNED letters in elegant 1960s mono-spaced caps reads FIELD OPERATIONS MANUAL,',
      'two abstract horizontal bars (one above one below the title) in burnt orange and warm gold,',
      'background is a single solid deep teal with subtle paper texture,',
      'typography in rich cream paper white, accents in warm burnt orange and dim gold,',
      'subtle ink-bleed texture on type, like silkscreen printing,',
      'flat color fills, bold linework, NOT photographic NOT 3D render NOT realistic NOT cartoon,',
      'in the style of mid-century 1960s spy movie poster typography,',
      'absolutely NO additional text NO words NO numbers NO hex codes NO color codes beyond OPERATION BURNED FIELD OPERATIONS MANUAL,',
    ].join(' '),
  },
  {
    name: "M's desk scene (overhead)",
    filename: 'desk-scene',
    aspectRatio: '16:9',
    prompt: [
      'Overhead birds-eye view of a 1960s spy agency directors mahogany desk,',
      'mid-century modern illustration, bold flat color fills, thick black outlines, Saul Bass inspired,',
      'composition includes: open manila folder with redacted typewritten pages, a fountain pen, a brass paperclip, a small porcelain coffee cup with saucer, a half-burned match, a discreet revolver in the corner,',
      'WARM color palette: rich mahogany wood grain in deep ochres and ambers, manila folder in cream, charcoal black redaction bars, deep teal accent ribbon along one folder edge,',
      'paper has faint typewriter text rendered as abstract horizontal lines NOT readable text,',
      'flat color illustration NOT photographic NOT 3D NOT cartoon,',
      'cinematic composition with strong directional light from upper left casting subtle shadows,',
      'absolutely NO readable text NO words NO numbers NO letters anywhere in the image,',
    ].join(' '),
  },
];

const RUN_FILTER = process.env.HTP_ASSET ?? 'pendleton-crest';

async function main(): Promise<void> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('ERROR: GEMINI_API_KEY not set. Run: set -a && source .env && set +a && pnpm tsx scripts/generate-htp-assets.ts');
    process.exit(1);
  }

  await mkdir(OUTPUT_DIR, { recursive: true });
  const ai = new GoogleGenAI({ apiKey });

  const targets = PROMPTS.filter((p) =>
    RUN_FILTER === 'all' ? true : p.filename === RUN_FILTER,
  );

  if (targets.length === 0) {
    console.error(`No asset matching HTP_ASSET=${RUN_FILTER}. Available:`);
    PROMPTS.forEach((p) => console.error(`  - ${p.filename}`));
    process.exit(1);
  }

  console.log(`Generating ${targets.length} asset(s) at model ${MODEL}\n`);

  for (let i = 0; i < targets.length; i++) {
    const asset = targets[i];
    console.log(`[${i + 1}/${targets.length}] ${asset.name}`);
    console.log(`  filename: ${asset.filename}`);
    console.log(`  aspect:   ${asset.aspectRatio}`);

    try {
      const response = await ai.models.generateImages({
        model: MODEL,
        prompt: asset.prompt,
        config: {
          numberOfImages: 1,
          aspectRatio: asset.aspectRatio,
          personGeneration: PersonGeneration.ALLOW_ADULT,
        },
      });

      const image = response.generatedImages?.[0]?.image;
      if (!image?.imageBytes) {
        console.error(`  FAILED: No image bytes returned (safety filter? retrying once may help).`);
        continue;
      }

      const outPath = resolve(OUTPUT_DIR, `${asset.filename}.png`);
      await writeFile(outPath, Buffer.from(image.imageBytes, 'base64'));
      console.log(`  saved: ${outPath}\n`);

      if (i < targets.length - 1) {
        await new Promise((r) => setTimeout(r, INTER_CALL_DELAY_MS));
      }
    } catch (err) {
      console.error(`  ERROR: ${err instanceof Error ? err.message : err}`);
    }
  }
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
