import { config as loadEnv } from 'dotenv';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { Buffer } from 'node:buffer';

const HERE = dirname(fileURLToPath(import.meta.url));
const TRAILER_ROOT = resolve(HERE, '..');
const BURNED_ROOT = resolve(TRAILER_ROOT, '../..');
loadEnv({ path: resolve(BURNED_ROOT, '.env') });

const { mp3ToWav48kMono } = await import('./lib/ffmpeg.js');

const key = process.env.ELEVENLABS_API_KEY!;
const COLD_OPEN_LINE = "[sarcastic]He's a machine, this kid. Honestly at this point I'm just impressed.";

// Mallory profile: controlled smoker rasp + crisp precision, drinks
// constantly but you'd never know it from the delivery.
const VOICE_SETTINGS = {
  stability: 0.40,
  similarity_boost: 0.75,
  style: 0.45,
  use_speaker_boost: true,
  speed: 0.85,
};

const CANDIDATES = [
  { name: 'empress',  voice_id: 'MHPwHxLx0nmGIb5Jnbly', note: 'Empress — 60yo, smoky/strong/confident' },
  { name: 'apple',    voice_id: 'rhKGiHCLeAC5KPBEZiUq', note: 'Apple — crackle + sand texture' },
  { name: 'mora',     voice_id: 'YHcCpa6SBWnKDaCPZJQR', note: 'Mora — old, weathered, life in shadows' },
  { name: 'vanessa',  voice_id: 'TpIle0udG1y9a8xmjXsn', note: 'Vanessa — deep + raspy + antagonist' },
  { name: 'jarin',    voice_id: 'lRGgBdmdfHYNiqPVpbiS', note: 'Jarin — sarcastic + raspy' },
];

const OUT_DIR = resolve(TRAILER_ROOT, 'sample-eval/voice-pipeline/mallory-audition');
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

for (const c of CANDIDATES) {
  console.log(`GEN  ${c.name}.wav  (${c.note})`);
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${c.voice_id}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: COLD_OPEN_LINE,
      voice_settings: VOICE_SETTINGS,
      model_id: 'eleven_v3',
      output_format: 'mp3_44100_192',
    }),
  });
  if (!res.ok) {
    console.error(`  FAIL ${res.status}: ${(await res.text()).slice(0, 200)}`);
    continue;
  }
  const mp3 = Buffer.from(await res.arrayBuffer());
  const wav = mp3ToWav48kMono(mp3);
  writeFileSync(join(OUT_DIR, `${c.name}.wav`), wav);
  console.log(`  OK   ${wav.byteLength} bytes`);
  await new Promise((r) => setTimeout(r, 1500));
}

console.log(`\nAuditions at: ${OUT_DIR}`);
