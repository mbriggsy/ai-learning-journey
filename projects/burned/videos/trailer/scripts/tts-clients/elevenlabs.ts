/**
 * ElevenLabs v3 TTS client.
 *
 * Single source of truth (model + voice + voice_settings):
 *   - model_id: `eleven_v3` (PHASE-0-EXIT.md locked)
 *   - dash voice: PHASE-0-EXIT.md Section 1 Voice ID / Roger
 *   - janet voice: Eleanor (`2qQJWjw5XdG80GreshqG`, Shared Library) per Phase 2 Unit 2.3 re-lock (Phase 0 PHASE-0-EXIT.md §Section 2 originally locked Sloane; cunty canary rejected as too polished)
 *
 * Voice settings resolution:
 *   - dash:   `cadenceAdapter.voice_settings` (Roger defaults — adapter JSON)
 *   - janet:  `COLD_OPEN_SPEAKER.voiceSettings` (matriarch-tuned override —
 *             cold-open-prototype.ts, LANDMINE: must NOT use Roger defaults)
 *
 * Bracket-tag handling:
 *   - Per-cue `cadencePrefixTag` (`[shouts]`, `[deadpan]`) is prepended to
 *     the text payload at API call time. Tags are SELF-CLOSING in v3
 *     (`[shouts]VEEEEEEEERAAAA!!!` — no `[/shouts]`).
 *   - `[pause:Xms]` DOES NOT EXIST in v3. Precision intra-line beats
 *     route through Unit 2.6 FFmpeg silence stitch.
 *
 * VOICE_DIRECTION guard: ElevenLabs reads free prose mixed into the text
 * payload aloud verbatim. Cadence-spec lives in `voice_settings` numbers
 * + sparse inline `[bracket]` tags — NEVER in the text. The cadence-spec
 * adapter JSON is parsed for voice_settings; its prose explanations are
 * NOT prepended to the script.
 *
 * Output: `pcm_48000` raw bytes → pcmToWav wrap at 48kHz.
 *
 * Backoff: linear 5s / 10s / 15s + jitter, total budget 30s. 401/403
 * fast-fail (don't burn money on a bad key).
 */
import { Buffer } from 'node:buffer';

import { assertEnv } from '../lib/env.js';
import { mp3ToWav48kMono } from '../lib/ffmpeg.js';
import { COLD_OPEN_SPEAKER } from '../cold-open-prototype.js';

interface ElevenLabsAdapter {
  voice_settings: {
    stability: number;
    similarity_boost: number;
    style: number;
    use_speaker_boost: boolean;
    speed?: number;
  };
}

type VoiceCell = 'dash' | 'sable' | 'janet' | 'vera';

export interface GenerateElevenLabsArgs {
  text: string;
  voice: VoiceCell;
  voiceId: string;
  cadenceAdapter: string;
  cadencePrefixTag?: string;
  modelId: string;
  contextPrimingPrevious?: string;
  contextPrimingNext?: string;
}

/**
 * Phase 0 Unit 0.6 audited scream profile — Sterling-LANA shape locked
 * at the ORIGINAL Roger defaults that cleared the V3 audition. The
 * Phase 2 Unit 2.3 arrogant-briefer retune (stab 0.55 / style 0.35)
 * propagates to other Dash cues but MUST NOT touch the scream — the
 * audited acoustic shape was tuned at these specific values. If you
 * change these, you re-litigate the Phase 0 Unit 0.6 audition.
 */
const SCREAM_AUDITED_SETTINGS = {
  stability: 0.70,
  similarity_boost: 0.75,
  style: 0.15,
  use_speaker_boost: true,
  speed: 0.95,
} as const;

/**
 * Phrasing! interjective profile — Sterling-CODED callback cadence.
 *
 * Sterling's "Phrasing." is REFLEXIVE not declarative — a quick
 * intonational contour (rise on "Phra-", fall on "-sing.") rather than
 * the flat arrogant-briefer deadpan that suits the rest of Dash's
 * cues. Lower stability gives the model room to land that rise/fall;
 * higher style buys expressiveness; faster speed gives the snap.
 *
 * Inferred direction (no primary-source phonetic analysis exists —
 * Gemini lit search 2026-05-21 turned up zero canonical voice-director
 * notes on the catchphrase). Tunable from here on Briggsy's ear.
 *
 * Tagged in `script.ts` via `cadenceAdapter.prefixTag = '[excited]'`
 * — this resolver detects the tag + Dash voice and returns the
 * interjective profile instead of the adapter defaults.
 */
const PHRASING_INTERJECTIVE_SETTINGS = {
  stability: 0.30,
  similarity_boost: 0.75,
  style: 0.65,
  use_speaker_boost: true,
  speed: 1.05,
} as const;

function resolveVoiceSettings(args: GenerateElevenLabsArgs): unknown {
  // Scream cue: locked Phase 0 Unit 0.6 audited profile (do NOT inherit
  // the Phase 2 Unit 2.3 arrogant-briefer retune — different beat).
  if (args.cadencePrefixTag === '[shouts]') return SCREAM_AUDITED_SETTINGS;

  // Phrasing! interjective override (Dash only — same Roger voice ID,
  // different cadence shape for the callback catchphrase).
  if (args.cadencePrefixTag === '[excited]' && args.voice === 'dash') {
    return PHRASING_INTERJECTIVE_SETTINGS;
  }

  // Janet/Mallory: cunty-tuned override from COLD_OPEN_SPEAKER —
  // contract test in `cold-open-prototype.test.ts` pins the shape.
  if (args.voice === 'janet') return COLD_OPEN_SPEAKER.voiceSettings;

  // Dash: arrogant-Sterling Roger defaults from the per-engine cadence
  // adapter (Phase 2 Unit 2.3 retune).
  const adapter = JSON.parse(args.cadenceAdapter) as ElevenLabsAdapter;
  return adapter.voice_settings;
}

export async function generateElevenLabs(args: GenerateElevenLabsArgs): Promise<Buffer> {
  const apiKey = assertEnv('ELEVENLABS_API_KEY');
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${args.voiceId}`;

  // Tag prepend — self-closing per v3
  const scriptText = args.cadencePrefixTag
    ? `${args.cadencePrefixTag}${args.text}`
    : args.text;

  // Creator-tier-eligible format. PCM variants silently downgrade to MP3
  // on Creator (per ElevenLabs docs: PCM 44.1kHz requires Pro tier).
  // 192kbps MP3 is the Creator-tier ceiling — transparent for voice.
  // The buffer is FFmpeg-converted to 48kHz mono PCM WAV below so the
  // on-disk artifact matches Phase 2's design lock + Phase 4 expectation.
  const body: Record<string, unknown> = {
    text: scriptText,
    voice_settings: resolveVoiceSettings(args),
    model_id: args.modelId,
    output_format: 'mp3_44100_192',
  };

  // Context priming via previous_text / next_text is NOT supported on
  // eleven_v3 yet (API returns 400 unsupported_model). The priming map
  // in context-priming-overrides.json is preserved for future re-enable
  // once v3 supports the params, but we don't send them today.
  if (args.modelId !== 'eleven_v3') {
    if (args.contextPrimingPrevious) body.previous_text = args.contextPrimingPrevious;
    if (args.contextPrimingNext) body.next_text = args.contextPrimingNext;
  }

  const MAX_RETRIES = 3;
  const BASE_DELAY_MS = 5000;
  const TOTAL_BUDGET_MS = 30_000;
  let elapsedMs = 0;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const mp3 = Buffer.from(await res.arrayBuffer());
      return mp3ToWav48kMono(mp3);
    }

    if (res.status === 401 || res.status === 403) {
      throw new Error(`ElevenLabs auth failure ${res.status}: ${await res.text()}`);
    }

    if (res.status === 429 || res.status >= 500) {
      const rawDelay = BASE_DELAY_MS * attempt + Math.floor(Math.random() * 1000);
      const clampedDelay = Math.min(rawDelay, TOTAL_BUDGET_MS - elapsedMs);
      if (clampedDelay <= 0 || attempt === MAX_RETRIES) {
        throw new Error(
          `ElevenLabs ${res.status} after ${attempt} attempts, retry budget exhausted.`,
        );
      }
      console.warn(`ElevenLabs ${res.status}, retry ${attempt}/${MAX_RETRIES} in ${clampedDelay}ms`);
      await new Promise((r) => setTimeout(r, clampedDelay));
      elapsedMs += clampedDelay;
      continue;
    }

    throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
  }

  throw new Error('ElevenLabs retries exhausted');
}
