/**
 * One-off: generate character style candidates with Among Us / Overcooked energy.
 * 3 hider variants + 3 seeker variants.
 */
import { GoogleGenAI } from '@google/genai';
import sharp from 'sharp';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT_DIR = path.join(ROOT, 'assets', 'palette', 'style-candidates');
const STYLE_REF = path.join(ROOT, 'assets', 'palette', 'style-reference.png');

const STYLE_PREFIX =
  'Top-down view pixel art game sprite, 32-pixel grid style with large chunky pixels ' +
  'visible as distinct squares, stylized cartoon, bold 1-pixel dark outlines, solid ' +
  'magenta (#FF00FF) background, game asset, no anti-aliasing, no gradients, no ' +
  'dithering, clean grid-aligned edges, not isometric, not 3/4 view, strict top-down ' +
  'perspective, no text, no labels, no watermarks, ';

const CANDIDATES = [
  {
    name: 'hider-v2a-bean',
    prompt: STYLE_PREFIX +
      'single cute bean-shaped character facing downward (south), Among Us crewmate style, ' +
      'small stubby legs, no arms visible from top-down, oversized round head taking up half the body, ' +
      'cool blue #2E86C1 body with teal #1ABC9C visor/backpack detail, ' +
      'adorable and round, slight hunch like sneaking, tiny and compact, ' +
      'chibi proportions, grounding shadow 2-pixel dark ellipse under feet, ' +
      'on solid magenta #FF00FF background',
  },
  {
    name: 'hider-v2b-hoodie',
    prompt: STYLE_PREFIX +
      'single cute chibi character facing downward (south), Overcooked chef proportions, ' +
      'wearing oversized hoodie that makes silhouette blob-like and round, hood up for hiding, ' +
      'cool blue #2E86C1 hoodie with teal #1ABC9C drawstrings, green #27AE60 shoes, ' +
      'nervous posture shoulders up, tiny stubby proportions, cute not threatening, ' +
      'chibi proportions head is 60% of body, grounding shadow dark ellipse under feet, ' +
      'on solid magenta #FF00FF background',
  },
  {
    name: 'hider-v2c-critter',
    prompt: STYLE_PREFIX +
      'single cute round critter character facing downward (south), pill-shaped body like Fall Guys, ' +
      'big round eyes on top of head visible from above, stubby little feet, no visible arms, ' +
      'cool blue #2E86C1 body with teal #1ABC9C belly spot, green #27AE60 feet, ' +
      'looks like a cute toy, harmless and round, slightly hunched forward, ' +
      'chibi proportions, grounding shadow dark ellipse under feet, ' +
      'on solid magenta #FF00FF background',
  },
  {
    name: 'seeker-v2a-guard',
    prompt: STYLE_PREFIX +
      'single cute but menacing bean-shaped character facing downward (south), Among Us impostor style, ' +
      'slightly taller and wider than normal crewmate, small pointy details on top like antenna, ' +
      'warm red #E74C3C body with orange #E67E22 visor detail, dark red #922B21 shadow, ' +
      'upright confident posture but still cute and cartoony, not realistic, ' +
      'chibi proportions, grounding shadow dark ellipse under feet, ' +
      'on solid magenta #FF00FF background',
  },
  {
    name: 'seeker-v2b-flashlight',
    prompt: STYLE_PREFIX +
      'single cute chibi security guard character facing downward (south), Overcooked style proportions, ' +
      'wearing tiny cap on oversized head, round body slightly wider than hider, ' +
      'warm red #E74C3C uniform with orange #E67E22 badge detail, dark red #922B21 cap, ' +
      'confident waddle stance, cute but authoritative, cartoon security guard, ' +
      'chibi proportions head is 55% of body, grounding shadow dark ellipse under feet, ' +
      'on solid magenta #FF00FF background',
  },
  {
    name: 'seeker-v2c-hunter',
    prompt: STYLE_PREFIX +
      'single cute round character facing downward (south), pill-shaped body like Fall Guys but slightly angular, ' +
      'bigger than the hider character, has small angry eyebrows visible from above, ' +
      'warm red #E74C3C body with orange #E67E22 stripe across middle, dark red #922B21 feet, ' +
      'stomping forward pose, cute but determined, cartoon villain energy not scary, ' +
      'chibi proportions, grounding shadow dark ellipse under feet, ' +
      'on solid magenta #FF00FF background',
  },
];

async function main(): Promise<void> {
  const apiKey = process.env['GEMINI_API_KEY'];
  if (!apiKey) { console.error('GEMINI_API_KEY not set'); process.exit(1); }

  const ai = new GoogleGenAI({ apiKey });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Load style reference
  let styleRefBase64: string | undefined;
  if (fs.existsSync(STYLE_REF)) {
    styleRefBase64 = fs.readFileSync(STYLE_REF).toString('base64');
    console.log('Using style reference from candidate-01\n');
  }

  for (let i = 0; i < CANDIDATES.length; i++) {
    const c = CANDIDATES[i]!;
    console.log(`[${i + 1}/${CANDIDATES.length}] ${c.name}...`);

    try {
      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
      if (styleRefBase64) {
        parts.push({ inlineData: { mimeType: 'image/png', data: styleRefBase64 } });
        parts.push({ text: 'Use this image as a style reference. Match its chunky pixel art visual style exactly. ' });
      }
      parts.push({ text: c.prompt });

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: [{ role: 'user', parts }],
        config: {
          responseModalities: ['IMAGE'],
          imageConfig: { aspectRatio: '1:1', imageSize: '1K' },
        },
      });

      const resParts = response.candidates?.[0]?.content?.parts;
      if (!resParts) { console.log('  No response parts'); continue; }

      for (const part of resParts) {
        if (part.inlineData?.data) {
          const rawBuffer = Buffer.from(part.inlineData.data, 'base64');
          const rawPng = await sharp(rawBuffer).png().toBuffer();
          fs.writeFileSync(path.join(OUT_DIR, `${c.name}-1024.png`), rawPng);

          // 128px preview
          const inter = await sharp(rawBuffer).resize(128, 128, { kernel: sharp.kernel.lanczos3 }).png().toBuffer();
          const prev32 = await sharp(inter).resize(32, 32, { kernel: sharp.kernel.nearest }).png().toBuffer();
          const prev128 = await sharp(prev32).resize(128, 128, { kernel: sharp.kernel.nearest }).png().toBuffer();
          fs.writeFileSync(path.join(OUT_DIR, `${c.name}-128-preview.png`), prev128);
          fs.writeFileSync(path.join(OUT_DIR, `${c.name}-32.png`), prev32);

          const meta = await sharp(rawPng).metadata();
          console.log(`  OK — ${meta.width}x${meta.height}`);
          break;
        }
      }
    } catch (e: unknown) {
      console.error(`  FAILED: ${e instanceof Error ? e.message : String(e)}`);
    }

    if (i < CANDIDATES.length - 1) {
      console.log('  Waiting 7s...');
      await new Promise((r) => setTimeout(r, 7000));
    }
  }

  console.log('\nDone! Check the style-candidates folder for v2 character options.');
}

main().catch((e: unknown) => { console.error(e); process.exit(1); });
