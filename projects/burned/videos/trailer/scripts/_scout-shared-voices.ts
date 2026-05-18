/**
 * One-shot scout: ElevenLabs shared/community Voice Library for
 * Janet-archetype voices (mature American female, tough/matriarch/
 * commanding edge). Throwaway script.
 *
 * Endpoint: /v1/shared-voices (returns the public community catalog
 * separate from /v1/voices which is the user's local library).
 */
import { config as loadEnv } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const BURNED_ROOT = resolve(SCRIPT_DIR, '../../..');
loadEnv({ path: resolve(BURNED_ROOT, '.env') });

const key = process.env.ELEVENLABS_API_KEY;
if (!key) throw new Error('ELEVENLABS_API_KEY missing');

// Use shared-voices endpoint with filters
const url = new URL('https://api.elevenlabs.io/v1/shared-voices');
url.searchParams.set('gender', 'female');
url.searchParams.set('age', 'middle_aged');
url.searchParams.set('language', 'en');
url.searchParams.set('page_size', '100');

console.log(`scouting: ${url.toString()}`);
const res = await fetch(url.toString(), { headers: { 'xi-api-key': key } });
if (!res.ok) {
  const body = await res.text().catch(() => '<unreadable>');
  console.error(`shared-voices failed: ${res.status}`);
  console.error(body.slice(0, 500));
  process.exit(1);
}
const body = (await res.json()) as { voices: Array<{
  voice_id: string;
  name: string;
  description?: string;
  labels?: Record<string, string>;
  accent?: string;
  age?: string;
  gender?: string;
  category?: string;
  use_case?: string;
  descriptive?: string;
  preview_url?: string;
  free_users_allowed?: boolean;
  liked_by_count?: number;
  cloned_by_count?: number;
}> };

console.log(`shared library: ${body.voices.length} voices matching gender=female + age=middle_aged + en`);

// Score for Janet archetype
type Scored = { v: typeof body.voices[number]; score: number; reasons: string[] };
const pro = ['tough','gravelly','husky','commanding','authoritative','stern','matriarch','no-nonsense','dry','sharp','edge','powerful','strong','leadership','executive','cigarette','scotch','whiskey','noir','sardonic','disdain','cutting','cold','firm','smoky','raspy','deep','low','alto','contralto'];
const anti = ['soft','warm','reassuring','gentle','sweet','youthful','breezy','upbeat','cheerful','friendly','pleasant','soothing','calming','nurturing','motherly','british','mid-atlantic','transatlantic','rp','young','girlish','innocent','sweet'];

const scored: Scored[] = body.voices.map((v) => {
  const labelText = v.labels ? Object.values(v.labels).join(' ') : '';
  const blob = `${v.name} ${v.description ?? ''} ${labelText} ${v.descriptive ?? ''} ${v.use_case ?? ''} ${v.accent ?? ''} ${v.category ?? ''}`.toLowerCase();
  const reasons: string[] = [];
  let score = 0;

  // Hard filter: American accent preferred
  const accent = (v.accent ?? v.labels?.accent ?? '').toLowerCase();
  if (accent.includes('american') || accent.includes('us')) { score += 4; reasons.push('accent-american:+4'); }
  else if (accent && (accent.includes('british') || accent.includes('rp') || accent.includes('mid-atlantic'))) { score -= 8; reasons.push(`accent-${accent}:-8`); }

  for (const kw of pro) if (blob.includes(kw)) { score += 2; reasons.push(`pro:${kw}:+2`); }
  for (const a of anti) if (blob.includes(a)) { score -= 3; reasons.push(`anti:${a}:-3`); }

  // Popularity signal (small boost — popular community voices are often higher quality)
  if (typeof v.liked_by_count === 'number' && v.liked_by_count > 500) { score += 1; reasons.push(`liked-by-${v.liked_by_count}:+1`); }

  return { v, score, reasons };
}).filter((s) => s.score > 0).sort((a, b) => b.score - a.score);

console.log(`\ntop 15 Janet-archetype candidates (shared library):\n`);
const TOP = Math.min(15, scored.length);
for (let i = 0; i < TOP; i++) {
  const s = scored[i]!;
  const v = s.v;
  const labels = v.labels ? Object.entries(v.labels).map(([k,val]) => `${k}=${val}`).join(' / ') : '';
  console.log(`${(i+1).toString().padStart(2,' ')}. score=${s.score.toString().padStart(2,' ')} | ${v.name} (${v.voice_id})`);
  console.log(`         accent=${v.accent ?? '?'} / age=${v.age ?? '?'} / category=${v.category ?? '?'} / use_case=${v.use_case ?? '?'} / descriptive=${v.descriptive ?? '?'}`);
  if (labels) console.log(`         labels: ${labels}`);
  if (v.description) console.log(`         desc: ${v.description.slice(0, 180)}`);
  if (v.preview_url) console.log(`         preview: ${v.preview_url}`);
  console.log(`         signals: ${s.reasons.join(', ')}`);
  console.log('');
}
