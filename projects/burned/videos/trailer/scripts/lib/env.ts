/**
 * Phase 2 env-key plumbing.
 *
 * Loads BURNED_ROOT/.env once (matching the existing
 * `check-tts-readiness.ts` pattern — cwd-independent), exposes
 * `assertEnv(key)` + `assertEngineEnv(engine)` for fail-fast preflight.
 *
 * Windows env vars resolve case-insensitively in Node, so the .env
 * keys `ElevenLabs_API_KEY` / `OpenAI_KEY` answer to the canonical
 * uppercase lookups used throughout the Phase 2 scripts.
 */
import { config as loadDotenv } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const BURNED_ROOT = resolve(HERE, '../../../..'); // scripts/lib → trailer → videos → burned
const ENV_PATH = resolve(BURNED_ROOT, '.env');
loadDotenv({ path: ENV_PATH });

export { ENV_PATH };

/**
 * Per-engine required env keys. Voice-actor (Path D) has no API calls
 * and therefore no required keys.
 */
const REQUIRED_BY_ENGINE: Readonly<Record<string, readonly string[]>> = {
  'elevenlabs-v3': ['ELEVENLABS_API_KEY'],
  'gemini-tts': ['GEMINI_API_KEY'],
  'openai-tts': ['OPENAI_API_KEY'],
  'voice-actor': [],
} as const;

export function assertEnv(key: string): string {
  const v = process.env[key];
  if (!v) {
    throw new Error(
      `Preflight: missing required env key '${key}'.\n` +
        `Expected in ${ENV_PATH}.\n` +
        `See PHASE-0-EXIT.md §Voice Cast Lock for locked engine + voice IDs.`,
    );
  }
  return v;
}

export function assertEngineEnv(engine: string): void {
  const required = REQUIRED_BY_ENGINE[engine];
  if (!required) {
    throw new Error(
      `Preflight: unknown engine '${engine}'. Known: ${Object.keys(REQUIRED_BY_ENGINE).join(', ')}.`,
    );
  }
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(
      `Preflight: missing .env keys for engine '${engine}': ${missing.join(', ')}.\n` +
        `Set in ${ENV_PATH}.`,
    );
  }
}

import type { Phase0ExitConfig } from './phase-0-exit.js';

/**
 * Free-metadata-endpoint check that the locked model is callable on
 * the locked engine BEFORE any paid TTS call. Catches alpha-access
 * gaps + sunset snapshots + invalid keys early.
 */
export async function verifyEngineAvailability(cfg: Phase0ExitConfig): Promise<void> {
  if (cfg.engine === 'voice-actor') return;

  if (cfg.engine === 'elevenlabs-v3') {
    const apiKey = assertEnv('ELEVENLABS_API_KEY');
    const res = await fetch('https://api.elevenlabs.io/v1/models', {
      headers: { 'xi-api-key': apiKey },
    });
    if (!res.ok) {
      throw new Error(
        `Preflight: ElevenLabs /v1/models returned ${res.status}. Check ELEVENLABS_API_KEY validity.`,
      );
    }
    const models = (await res.json()) as ReadonlyArray<{ model_id: string }>;
    const locked = models.find((m) => m.model_id === cfg.modelId);
    if (!locked) {
      const available = models.map((m) => m.model_id).join(', ');
      throw new Error(
        `Preflight: ElevenLabs model "${cfg.modelId}" not in account's available models.\n` +
          `Available: ${available}\n` +
          `If targeting "eleven_v3" (alpha): apply for alpha access at https://elevenlabs.io/blog/eleven-v3.`,
      );
    }
  } else if (cfg.engine === 'openai-tts') {
    const apiKey = assertEnv('OPENAI_API_KEY');
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error(`Preflight: OpenAI /v1/models returned ${res.status}`);
    const data = (await res.json()) as { data: ReadonlyArray<{ id: string }> };
    if (!data.data.find((m) => m.id === cfg.modelId)) {
      throw new Error(
        `Preflight: OpenAI model snapshot "${cfg.modelId}" not in account's available models.`,
      );
    }
  } else if (cfg.engine === 'gemini-tts') {
    const apiKey = assertEnv('GEMINI_API_KEY');
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Preflight: Gemini /v1beta/models returned ${res.status}`);
    const data = (await res.json()) as { models?: ReadonlyArray<{ name: string }> };
    if (!data.models?.find((m) => m.name.endsWith(cfg.modelId))) {
      throw new Error(
        `Preflight: Gemini model "${cfg.modelId}" not in available models. Preview models can lapse.`,
      );
    }
  }
}
