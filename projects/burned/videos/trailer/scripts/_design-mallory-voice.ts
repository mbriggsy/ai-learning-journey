import { config as loadEnv } from 'dotenv';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { Buffer } from 'node:buffer';

const HERE = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(HERE, '../../../.env') });

const key = process.env.ELEVENLABS_API_KEY!;
const OUT_DIR = resolve(HERE, '../sample-eval/voice-pipeline/mallory-design');
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

const VOICE_DESCRIPTION = `A mature American female voice in her late seventies, native New York with mid-century Manhattan affectation. Mid-to-low alto, chest-resonant. A fine dry rasp underneath every line — decades of social drinking and chain-smoking — but never affecting articulation. Every consonant precise, theater-trained. Default register is sardonic deadpan with downward inflection at line ends, suggesting the exhaustion of explaining obvious things to people who should already know better. Emphasis lands as a quiet knife-edge, never raised volume. Drawn-out vowels on dismissive moments. Authority is the authority of someone who is correct and tired of being correct. Tonal reference: Jessica Walter as Mallory Archer and as Lucille Bluth. NOT: warm, breathy, sweet, theatrical, podcast-host, audiobook-narrator, soothing, motherly, British, slurred, shouty, youthful, perky, cheerful.`;

// Preview text needs to be 100-1000 chars. Cold-open line + a Mallory-flavored
// follow-up makes ~150 chars — enough to hear cadence + texture.
const PREVIEW_TEXT = "He's a machine, this kid. Honestly at this point I'm just impressed. Sterling, do NOT touch that. I swear to God, if you break one more piece of agency property I will have you returned to Sears.";

console.log(`prompt: ${VOICE_DESCRIPTION.length} chars`);
console.log(`preview: ${PREVIEW_TEXT.length} chars\n`);

const res = await fetch('https://api.elevenlabs.io/v1/text-to-voice/create-previews', {
  method: 'POST',
  headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    voice_description: VOICE_DESCRIPTION,
    text: PREVIEW_TEXT,
    model_id: 'eleven_v3',
    output_format: 'mp3_44100_192',
  }),
});

if (!res.ok) {
  console.error(`FAIL ${res.status}: ${await res.text()}`);
  process.exit(1);
}

const body = (await res.json()) as { previews: Array<{ audio_base_64: string; generated_voice_id: string; media_type: string; duration_secs: number }>; text: string };
console.log(`got ${body.previews.length} previews\n`);

const { mp3ToWav48kMono } = await import('./lib/ffmpeg.js');

for (let i = 0; i < body.previews.length; i++) {
  const p = body.previews[i]!;
  const mp3 = Buffer.from(p.audio_base_64, 'base64');
  const wav = mp3ToWav48kMono(mp3);
  const path = join(OUT_DIR, `design-${i + 1}.wav`);
  writeFileSync(path, wav);
  writeFileSync(path.replace('.wav', '.voice-id.txt'), p.generated_voice_id);
  console.log(`design-${i + 1}.wav  →  voice_id=${p.generated_voice_id}  duration=${p.duration_secs.toFixed(2)}s  (${wav.byteLength} bytes)`);
}

writeFileSync(join(OUT_DIR, 'description.txt'), VOICE_DESCRIPTION);
writeFileSync(join(OUT_DIR, 'preview-text.txt'), PREVIEW_TEXT);
console.log(`\nAuditions at: ${OUT_DIR}`);
