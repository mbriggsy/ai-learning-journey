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
const LINE = "[sarcastic]He's a machine, this kid. Honestly at this point I'm just impressed.";
const SETTINGS = { stability: 0.40, similarity_boost: 0.75, style: 0.45, use_speaker_boost: true, speed: 0.85 };

const VOICE_ID = '2qQJWjw5XdG80GreshqG';  // Eleanor — Gracious and Authoritative
const OUT = resolve(TRAILER_ROOT, 'sample-eval/voice-pipeline/mallory-audition/eleanor.wav');
if (!existsSync(resolve(OUT, '..'))) mkdirSync(resolve(OUT, '..'), { recursive: true });

const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
  method: 'POST',
  headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: LINE, voice_settings: SETTINGS, model_id: 'eleven_v3', output_format: 'mp3_44100_192' }),
});
if (!res.ok) { console.error(`${res.status}: ${await res.text()}`); process.exit(1); }
const wav = mp3ToWav48kMono(Buffer.from(await res.arrayBuffer()));
writeFileSync(OUT, wav);
console.log(`OK ${OUT} (${wav.byteLength} bytes)`);
