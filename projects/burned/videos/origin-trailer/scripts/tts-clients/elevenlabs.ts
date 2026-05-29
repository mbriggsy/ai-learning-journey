/**
 * ElevenLabs client — v2 voice pipeline (Janet-only).
 *
 * The v2 trailer has a single narrator, so none of v1's multi-voice /
 * scream / phrasing / adapter-JSON branching. Ports the proven v1 fixes:
 *   - Creator tier can't request PCM (silently downgrades to MP3, no error).
 *     Request mp3_44100_192 (Creator ceiling, transparent for voice) →
 *     convert to 48k mono PCM WAV via ffmpeg.
 *   - Linear backoff (5/10/15s + jitter, 30s budget); 401/403 fast-fail so
 *     a bad key doesn't burn the retry budget.
 *   - VOICE_DIRECTION discipline: ONLY spoken text (+ supported inline audio
 *     tags) goes in the payload. Stage directions ([dry], [beat],
 *     [turn — softer]) are stripped upstream — ElevenLabs reads prose aloud.
 */
import { Buffer } from 'node:buffer'
import { assertEnv } from '../lib/env.js'
import { mp3ToWav48kMono } from '../lib/ffmpeg.js'
import { JANET_VOICE } from '../voice/janet.js'

export interface GenerateArgs {
  /** Spoken text ONLY — no stage directions. Supported inline audio tags ok. */
  readonly text: string
}

/** Minimal voice shape the TTS call needs. JANET_VOICE + A/B candidates satisfy it. */
export interface VoiceConfig {
  readonly voiceId: string
  readonly modelId: string
  readonly settings: {
    readonly stability: number
    readonly similarity_boost: number
    readonly style: number
    readonly use_speaker_boost: boolean
    readonly speed: number
  }
}

export async function generateVoice(voice: VoiceConfig, args: GenerateArgs): Promise<Buffer> {
  const apiKey = assertEnv('ELEVENLABS_API_KEY')
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voice.voiceId}`

  const body = {
    text: args.text,
    voice_settings: voice.settings,
    model_id: voice.modelId,
    output_format: 'mp3_44100_192',
  }

  const MAX_RETRIES = 3
  const BASE_DELAY_MS = 5000
  const TOTAL_BUDGET_MS = 30_000
  let elapsedMs = 0

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      const mp3 = Buffer.from(await res.arrayBuffer())
      return mp3ToWav48kMono(mp3)
    }

    if (res.status === 401 || res.status === 403) {
      throw new Error(`ElevenLabs auth failure ${res.status}: ${await res.text()}`)
    }

    if (res.status === 429 || res.status >= 500) {
      const rawDelay = BASE_DELAY_MS * attempt + Math.floor(Math.random() * 1000)
      const delay = Math.min(rawDelay, TOTAL_BUDGET_MS - elapsedMs)
      if (delay <= 0 || attempt === MAX_RETRIES) {
        throw new Error(`ElevenLabs ${res.status} after ${attempt} attempts, retry budget exhausted.`)
      }
      console.warn(`ElevenLabs ${res.status}, retry ${attempt}/${MAX_RETRIES} in ${delay}ms`)
      await new Promise((r) => setTimeout(r, delay))
      elapsedMs += delay
      continue
    }

    throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`)
  }

  throw new Error('ElevenLabs retries exhausted')
}

/** The locked narrator (JANET_VOICE). Thin wrapper for callers that just want Janet. */
export const generateJanet = (args: GenerateArgs): Promise<Buffer> => generateVoice(JANET_VOICE, args)
