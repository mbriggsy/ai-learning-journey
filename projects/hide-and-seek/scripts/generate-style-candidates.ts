/**
 * One-off script: generate 5 style reference candidates for Briggsy to review.
 * Produces 5 wood floor tile variations at 1024x1024, plus downscaled 32x32 previews.
 *
 * Usage: pnpm tsx --env-file=.env scripts/generate-style-candidates.ts
 */
import { GoogleGenAI } from '@google/genai';
import sharp from 'sharp';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT_DIR = path.join(ROOT, 'assets', 'palette', 'style-candidates');

const STYLE_PREFIX =
  'Top-down view pixel art game sprite, 32-pixel grid style with large chunky pixels ' +
  'visible as distinct squares, stylized cartoon, bold 1-pixel dark outlines, solid ' +
  'magenta (#FF00FF) background, game asset, no anti-aliasing, no gradients, no ' +
  'dithering, clean grid-aligned edges, not isometric, not 3/4 view, strict top-down ' +
  'perspective, no text, no labels, no watermarks, ';

const CANDIDATES = [
  {
    name: 'candidate-01-wood-warm',
    prompt: STYLE_PREFIX +
      'seamless tileable texture, edges match when repeated in a grid, uniform overhead lighting from top-left, ' +
      'wooden plank flooring, warm wood brown #8B4513 with lighter #C19A6B grain lines, visible plank seams running horizontally, ' +
      'cozy mansion interior floor, each visible pixel should be approximately 32x32 real pixels at this 1024x1024 resolution',
  },
  {
    name: 'candidate-02-wood-dark',
    prompt: STYLE_PREFIX +
      'seamless tileable texture, edges match when repeated in a grid, uniform overhead lighting from top-left, ' +
      'dark mahogany wooden plank flooring, rich dark wood #5C3A21 with subtle #8B4513 highlights between planks, ' +
      'elegant mansion interior floor, each visible pixel should be approximately 32x32 real pixels at this 1024x1024 resolution',
  },
  {
    name: 'candidate-03-carpet-red',
    prompt: STYLE_PREFIX +
      'seamless tileable texture, edges match when repeated in a grid, uniform overhead lighting from top-left, ' +
      'plush carpet texture, rich carpet red #C41E3A, subtle woven fiber pattern, even texture across entire tile, ' +
      'luxury mansion carpet, each visible pixel should be approximately 32x32 real pixels at this 1024x1024 resolution',
  },
  {
    name: 'candidate-04-hider-south',
    prompt: STYLE_PREFIX +
      'single character facing downward (south) showing front of body, rounded compact slightly hunched silhouette ' +
      'hiding posture small cautious character, cool blue #2E86C1 body with teal #1ABC9C accents and green #27AE60 highlights ' +
      'dark shadow #1B5E20 shading, standing neutral pose arms at sides slight upright posture, ' +
      'chibi proportions head 10-16 pixels tall at 32x32 final size, grounding shadow 1-2 pixel dark ellipse under feet, ' +
      'on solid magenta #FF00FF background',
  },
  {
    name: 'candidate-05-seeker-south',
    prompt: STYLE_PREFIX +
      'single character facing downward (south) showing front of body, angular broad upright silhouette confident ' +
      'intimidating posture tall authoritative character, warm red #E74C3C body with orange #E67E22 accents ' +
      'dark red #922B21 shading, standing neutral pose arms at sides authoritative stance, ' +
      'chibi proportions head 10-16 pixels tall at 32x32 final size, grounding shadow 1-2 pixel dark ellipse under feet, ' +
      'on solid magenta #FF00FF background',
  },
];

async function main(): Promise<void> {
  const apiKey = process.env['GEMINI_API_KEY'];
  if (!apiKey) {
    console.error('GEMINI_API_KEY not set');
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log(`Generating ${CANDIDATES.length} style reference candidates...\n`);

  for (let i = 0; i < CANDIDATES.length; i++) {
    const c = CANDIDATES[i]!;
    console.log(`[${i + 1}/${CANDIDATES.length}] ${c.name}...`);

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: [{ role: 'user', parts: [{ text: c.prompt }] }],
        config: {
          responseModalities: ['IMAGE'],
          imageConfig: {
            aspectRatio: '1:1',
            imageSize: '1K',
          },
        },
      });

      const candidates = response.candidates;
      if (!candidates || candidates.length === 0) {
        console.log('  No candidates returned (safety filter?)');
        continue;
      }

      const parts = candidates[0]?.content?.parts;
      if (!parts) {
        console.log('  No parts in response');
        continue;
      }

      for (const part of parts) {
        if (part.inlineData?.data) {
          const rawBuffer = Buffer.from(part.inlineData.data, 'base64');

          // Save raw 1024x1024
          const rawPng = await sharp(rawBuffer).png().toBuffer();
          const rawPath = path.join(OUT_DIR, `${c.name}-1024.png`);
          fs.writeFileSync(rawPath, rawPng);

          // Two-stage downscale to 32x32 preview
          const intermediate = await sharp(rawBuffer)
            .resize(128, 128, { kernel: sharp.kernel.lanczos3 })
            .png()
            .toBuffer();
          const preview = await sharp(intermediate)
            .resize(32, 32, { kernel: sharp.kernel.nearest })
            .png()
            .toBuffer();
          const previewPath = path.join(OUT_DIR, `${c.name}-32.png`);
          fs.writeFileSync(previewPath, preview);

          // Also make a 4x upscale of the 32x32 for easier viewing (128x128)
          const viewable = await sharp(preview)
            .resize(128, 128, { kernel: sharp.kernel.nearest })
            .png()
            .toBuffer();
          const viewPath = path.join(OUT_DIR, `${c.name}-128-preview.png`);
          fs.writeFileSync(viewPath, viewable);

          const meta = await sharp(rawPng).metadata();
          console.log(`  OK — ${meta.width}x${meta.height} raw, ${(rawPng.length / 1024).toFixed(1)} KB`);
          console.log(`  Files: ${c.name}-1024.png, ${c.name}-32.png, ${c.name}-128-preview.png`);
          break;
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`  FAILED: ${msg}`);
    }

    // Rate limit
    if (i < CANDIDATES.length - 1) {
      console.log('  Waiting 7s...');
      await new Promise((r) => setTimeout(r, 7000));
    }
  }

  console.log(`\nDone! Review candidates in: ${OUT_DIR}`);
  console.log('Pick the winner and tell me which one to use as style-reference.png');
}

main().catch((e: unknown) => {
  console.error('Unhandled error:', e);
  process.exit(1);
});
