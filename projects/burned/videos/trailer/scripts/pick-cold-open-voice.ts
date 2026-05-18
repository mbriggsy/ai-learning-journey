/**
 * Phase 0 Unit 0.3 iteration — Janet voice re-pick.
 *
 * Enumerates the ElevenLabs Voice Library and ranks against a
 * Janet-archetype filter (Malory-coded: tough/matriarch/mature
 * female with commanding edge — not warm/reassuring). Prints
 * the top-ranked candidates so Briggsy can pick 1-2 for re-render
 * via `pnpm cold-open:clip --candidate 4 --voice-id <id>`.
 *
 * Reader-A audition 2026-05-18 cleared Sarah (EXAVITQu4vr4xnSDxMaL —
 * "Mature, Reassuring, Confident") as too soft for Janet's
 * not-takes-shit-matriarch character voice. Iteration: swap the
 * voice TIMBRE while preserving line content + voice_settings +
 * Janet attribution.
 *
 * Filter rationale (Janet voice DNA brief):
 *   - mature but not OLD; mid-40s-to-60s register
 *   - tough, gravelly, commanding edge
 *   - loves Dash but doesn't take shit; built-in dry disdain
 *   - Jessica Walter as Malory analog
 *
 * Invoke from `videos/trailer/`:
 *   pnpm tsx scripts/pick-cold-open-voice.ts
 *
 * Output: stdout ranked list (top 10 + summary).
 */

import { config as loadEnv } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const BURNED_ROOT = resolve(SCRIPT_DIR, '../../..');
const ENV_PATH = resolve(BURNED_ROOT, '.env');

loadEnv({ path: ENV_PATH });

type ElevenLabsVoice = {
  voice_id: string;
  name: string;
  labels?: Record<string, string>;
  description?: string;
  category?: string;
};

const JANET_FILTER = {
  labels: {
    gender: 'female',
    // age targeting: mature, but not too old. ElevenLabs library uses
    // 'middle_aged' and 'old' — bias toward 'middle_aged' but accept
    // 'old' if other signals are strong.
    age_strong: 'middle_aged',
    age_weak: 'old',
    accent: 'american',
  },
  // Positive keywords — what we WANT in the voice
  pro_keywords: [
    'tough', 'gravelly', 'husky', 'commanding', 'authoritative',
    'stern', 'matriarch', 'no-nonsense', 'dry', 'sharp', 'edge',
    'mature', 'powerful', 'strong', 'leadership', 'executive',
    'cigarette', 'scotch', 'whiskey', 'noir', 'sardonic',
    'disdain', 'cutting', 'cold', 'firm',
  ],
  // Negative keywords — what we DON'T want (anti-picks)
  anti_keywords: [
    'soft', 'warm', 'reassuring', 'gentle', 'sweet', 'youthful',
    'breezy', 'upbeat', 'cheerful', 'friendly', 'pleasant',
    'soothing', 'calming', 'nurturing', 'motherly',
    'british', 'mid-atlantic', 'transatlantic', 'rp',
    'young', 'girlish', 'innocent',
  ],
} as const;

function scoreVoice(v: ElevenLabsVoice): { score: number; reasons: string[] } {
  const labelText = v.labels ? Object.values(v.labels).join(' ') : '';
  const blob = `${v.name} ${v.description ?? ''} ${labelText}`.toLowerCase();
  const reasons: string[] = [];
  let score = 0;

  // Gender filter — hard requirement, big weight
  if (v.labels?.['gender']?.toLowerCase() === JANET_FILTER.labels.gender) {
    score += 5;
    reasons.push('female:+5');
  } else if (v.labels?.['gender']?.toLowerCase() !== JANET_FILTER.labels.gender && v.labels?.['gender']) {
    score -= 20;
    reasons.push(`gender-mismatch(${v.labels['gender']}):-20`);
  }

  // Age — middle_aged > old > young
  const age = v.labels?.['age']?.toLowerCase() ?? '';
  if (age.includes(JANET_FILTER.labels.age_strong)) {
    score += 4;
    reasons.push(`age-${age}:+4`);
  } else if (age.includes(JANET_FILTER.labels.age_weak)) {
    score += 2;
    reasons.push(`age-${age}:+2`);
  } else if (age.includes('young')) {
    score -= 5;
    reasons.push(`age-${age}:-5`);
  }

  // Accent — american preferred
  const accent = v.labels?.['accent']?.toLowerCase() ?? '';
  if (accent.includes(JANET_FILTER.labels.accent)) {
    score += 2;
    reasons.push(`accent-american:+2`);
  }

  // Pro keywords — incremental positive
  for (const kw of JANET_FILTER.pro_keywords) {
    if (blob.includes(kw)) {
      score += 1;
      reasons.push(`pro:${kw}:+1`);
    }
  }

  // Anti keywords — incremental negative
  for (const anti of JANET_FILTER.anti_keywords) {
    if (blob.includes(anti)) {
      score -= 3;
      reasons.push(`anti:${anti}:-3`);
    }
  }

  return { score, reasons };
}

async function main(): Promise<void> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error(`ELEVENLABS_API_KEY missing from ${ENV_PATH}`);

  console.log('[janet-pick] enumerating ElevenLabs Voice Library...');
  const res = await fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': key } });
  if (!res.ok) {
    const body = await res.text().catch(() => '<unreadable>');
    throw new Error(`Voice Library enumeration failed: ${res.status} ${body.slice(0, 300)}`);
  }
  const body = (await res.json()) as { voices: ElevenLabsVoice[] };
  console.log(`[janet-pick] library size: ${body.voices.length} voices`);

  const ranked = body.voices
    .map((v) => {
      const { score, reasons } = scoreVoice(v);
      return { voice: v, score, reasons };
    })
    // Only show plausibly-female candidates
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);

  console.log(`\n[janet-pick] top 10 ranked Janet-archetype candidates:\n`);
  const TOP = Math.min(10, ranked.length);
  for (let i = 0; i < TOP; i++) {
    const r = ranked[i]!;
    const labels = r.voice.labels ? Object.entries(r.voice.labels).map(([k, v]) => `${k}=${v}`).join(' / ') : '<no-labels>';
    const desc = r.voice.description ? ` — ${r.voice.description.slice(0, 100)}` : '';
    console.log(`${(i + 1).toString().padStart(2, ' ')}. score=${r.score.toString().padStart(2, ' ')} | ${r.voice.name} (${r.voice.voice_id})`);
    console.log(`         labels: ${labels}${desc}`);
    console.log(`         signals: ${r.reasons.join(', ')}`);
    console.log('');
  }
}

main().catch((e) => {
  console.error('[janet-pick] FAIL');
  console.error(e instanceof Error ? (e.stack ?? e.message) : String(e));
  process.exit(1);
});
