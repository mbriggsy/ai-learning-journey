/**
 * Phase 0 Unit 0.3 iteration — Janet voice re-pick renderer.
 *
 * Renders Candidate #4's locked line through alternate ElevenLabs
 * voices + tuned voice_settings to dial in Janet's
 * tough-matriarch-not-takes-shit character. Reader-A audition 2026-05-18
 * cleared Sarah voice as too "reassuring" for Janet's character (per
 * Briggsy direction: "her voice needs to be toughened up - in a
 * matriach kinda way").
 *
 * Output:
 *   sample-eval/r14-cold-open/clips/candidate-4-janet-{variant}.mp3
 *
 * Invoke from `videos/trailer/`:
 *   pnpm tsx scripts/generate-janet-iteration.ts --variant matilda-tuned
 *
 * Voice/settings variant table:
 *   - matilda-default — Matilda + Unit 0.2 Roger default settings
 *   - matilda-tuned   — Matilda + high stability (0.85) + low style (0.05)
 *                       + slow speed (0.92) to strip "upbeat" + push
 *                       deliberate-weighty matriarch register
 *   - sloane-tuned    — Sloane (Shared Library — "Bold and Polished" /
 *                       "commanding yet approachable tone with a sleek,
 *                       professional delivery that exudes authority
 *                       without feeling distant") + same matriarch-tuned
 *                       settings as matilda-tuned for apples-to-apples
 *                       A/B (isolates VOICE not SETTINGS).
 *   - sarah-edged     — Sarah baseline + low stability (0.50) + bump
 *                       style (0.45) to add expressive edge (last-resort
 *                       same-voice variant before escalating to Voice
 *                       Design mint)
 *
 * Bracket-tag treatment matches the original Candidate #4 render:
 * [deadpan] leading + [sarcastic] before "Honestly".
 */

import { config as loadEnv } from 'dotenv';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CANDIDATE_4 } from './cold-open-prototype.js';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const TRAILER_ROOT = resolve(SCRIPT_DIR, '..');
const BURNED_ROOT = resolve(SCRIPT_DIR, '../../..');
const ENV_PATH = resolve(BURNED_ROOT, '.env');

const CLIPS_DIR = resolve(TRAILER_ROOT, 'sample-eval/r14-cold-open/clips');
const BUDGET_PATH = resolve(TRAILER_ROOT, 'sample-eval/r4-dash/char-budget.json');

const MODEL_ID = 'eleven_v3';

type Variant = {
  voiceId: string;
  voiceName: string;
  voiceSettings: {
    stability: number;
    similarity_boost: number;
    style: number;
    use_speaker_boost: boolean;
    speed: number;
  };
  rationale: string;
};

const VARIANTS: Record<string, Variant> = {
  'matilda-default': {
    voiceId: 'XrExE9yKIg1WjnnlVkGX',
    voiceName: 'Matilda - Knowledgable, Professional',
    voiceSettings: {
      stability: 0.70,
      similarity_boost: 0.75,
      style: 0.15,
      use_speaker_boost: true,
      speed: 0.95,
    },
    rationale: 'Matilda + Unit 0.2 Roger default settings — baseline read for comparison',
  },
  'matilda-tuned': {
    voiceId: 'XrExE9yKIg1WjnnlVkGX',
    voiceName: 'Matilda - Knowledgable, Professional',
    voiceSettings: {
      stability: 0.85,
      similarity_boost: 0.75,
      style: 0.05,
      use_speaker_boost: true,
      speed: 0.92,
    },
    rationale:
      'Matilda + matriarch-tuned: high stability (0.85) kills F0 wander → flat declarative; ultra-low style (0.05) strips engine-default expressive swelling that creates upbeat feel; slow speed (0.92) pushes deliberate-weighty register',
  },
  'sloane-tuned': {
    voiceId: 'm8AHWg36LJTQWKmfeGVv',
    voiceName: 'Sloane - Bold and Polished (Shared Library)',
    voiceSettings: {
      stability: 0.85,
      similarity_boost: 0.75,
      style: 0.05,
      use_speaker_boost: true,
      speed: 0.92,
    },
    rationale:
      'Sloane (Shared Library — "commanding yet approachable tone with a sleek, professional delivery that exudes authority without feeling distant") + same matriarch-tuned settings as matilda-tuned for A/B parity. Tests whether Sloane\'s commanding baseline carries Janet better than Matilda\'s alto-professional baseline.',
  },
  'kristen-tuned': {
    voiceId: 'OIadkU6YLviNhuekXGly',
    voiceName: 'Kristen - Authoritative E-Learning Expert (Shared Library)',
    voiceSettings: {
      stability: 0.85,
      similarity_boost: 0.75,
      style: 0.05,
      use_speaker_boost: true,
      speed: 0.92,
    },
    rationale:
      'Kristen (Shared Library — "TED-style Professional Narration. Optimized for High-Volume Podcasts and Audiobooks. Expertise: True Crime, Tech History, Documentaries, Video Essays, Computer Science...") + same matriarch-tuned settings as sloane-tuned for A/B parity. Tests whether Kristen\'s true-crime/documentary weighty-weary register lands Malory better than Sloane\'s polished-commanding baseline.',
  },
  'sarah-edged': {
    voiceId: 'EXAVITQu4vr4xnSDxMaL',
    voiceName: 'Sarah - Mature, Reassuring, Confident',
    voiceSettings: {
      stability: 0.50,
      similarity_boost: 0.75,
      style: 0.45,
      use_speaker_boost: true,
      speed: 0.92,
    },
    rationale:
      'Sarah baseline + edged: low stability (0.50) allows F0 variability for character grit; bump style (0.45) for expressive edge; slow speed (0.92) for weight. Last-resort same-voice variant.',
  },
};

loadEnv({ path: ENV_PATH });

function parseArgs(): { variant: string } {
  const argv = process.argv.slice(2);
  let variant = '';
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--variant' && i + 1 < argv.length) {
      variant = argv[++i]!;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!variant || !VARIANTS[variant]) {
    throw new Error(`--variant required and must be one of: ${Object.keys(VARIANTS).join(', ')}`);
  }
  return { variant };
}

/**
 * Inline-tag insertion — matches generate-cold-open-clip.ts buildPayload
 * for Candidate #4 (deadpan + sarcastic before "Honestly").
 */
function buildPayload(): string {
  const anchor = 'Honestly';
  if (!CANDIDATE_4.includes(anchor)) {
    throw new Error(`CANDIDATE_4 missing "${anchor}" anchor — inline-tag insertion would fail silently.`);
  }
  const tagged = CANDIDATE_4.replace(anchor, `[sarcastic] ${anchor}`);
  return `[deadpan] ${tagged}`;
}

async function main(): Promise<void> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error(`ELEVENLABS_API_KEY missing from ${ENV_PATH}`);

  const { variant } = parseArgs();
  const v = VARIANTS[variant]!;
  const payload = buildPayload();

  console.log(`[janet-iter] variant: ${variant}`);
  console.log(`[janet-iter] rationale: ${v.rationale}`);
  console.log(`[janet-iter] voice: ${v.voiceName} (${v.voiceId})`);
  console.log(`[janet-iter] voice_settings: ${JSON.stringify(v.voiceSettings)}`);
  console.log(`[janet-iter] payload (${payload.length} chars):`);
  console.log(`[janet-iter]   "${payload}"`);

  const started = Date.now();
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${v.voiceId}`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: payload,
      model_id: MODEL_ID,
      voice_settings: v.voiceSettings,
      output_format: 'mp3_44100_128',
    }),
  });
  const latencyMs = Date.now() - started;

  if (!res.ok) {
    const body = await res.text().catch(() => '<unreadable>');
    throw new Error(`ElevenLabs TTS failed: ${res.status} ${res.statusText} — ${body.slice(0, 500)}`);
  }

  const bytes = await res.arrayBuffer();
  const buf = Buffer.from(bytes);
  if (buf.length < 1000) {
    const peek = buf.toString('utf8', 0, Math.min(buf.length, 200));
    throw new Error(`TTS returned suspiciously small payload (${buf.length} bytes). Peek: ${peek}`);
  }

  const sha256Hex = createHash('sha256').update(buf).digest('hex');
  mkdirSync(CLIPS_DIR, { recursive: true });
  const outPath = resolve(CLIPS_DIR, `candidate-4-janet-${variant}.mp3`);
  writeFileSync(outPath, buf);

  console.log(`[janet-iter] output: ${outPath}`);
  console.log(`[janet-iter]   bytes: ${buf.length.toLocaleString()}`);
  console.log(`[janet-iter]   sha256: ${sha256Hex}`);
  console.log(`[janet-iter]   latency: ${latencyMs}ms`);

  if (existsSync(BUDGET_PATH)) {
    const budget = JSON.parse(readFileSync(BUDGET_PATH, 'utf8')) as {
      month: string;
      elevenlabs_chars_used: number;
      elevenlabs_chars_cap: number;
      tripwire_50pct: boolean;
      tripwire_80pct: boolean;
    };
    budget.elevenlabs_chars_used += payload.length;
    if (budget.elevenlabs_chars_used >= budget.elevenlabs_chars_cap * 0.5) budget.tripwire_50pct = true;
    if (budget.elevenlabs_chars_used >= budget.elevenlabs_chars_cap * 0.8) budget.tripwire_80pct = true;
    writeFileSync(BUDGET_PATH, JSON.stringify(budget, null, 2));
    console.log(`[janet-iter]   char-budget: +${payload.length} → ${budget.elevenlabs_chars_used.toLocaleString()} / ${budget.elevenlabs_chars_cap.toLocaleString()}`);
  }
}

main().catch((e) => {
  console.error('[janet-iter] FAIL');
  console.error(e instanceof Error ? (e.stack ?? e.message) : String(e));
  process.exit(1);
});
