/**
 * Env-key plumbing for the v2 voice pipeline.
 *
 * The BURNED-root .env is shell-sourced before running
 * (`set -a && source ../../.env && set +a`), so keys live in process.env.
 * assertEnv fails fast with a clear message if a key is missing, and keeps a
 * case-insensitive lookup as defense. The .env keys are canonical UPPER_SNAKE
 * as of 2026-05-28 (e.g. `ELEVENLABS_API_KEY`), so the fallback rarely fires —
 * it only mattered back when the file used mixed-case keys (see insight 055).
 */
export function assertEnv(key: string): string {
  const direct = process.env[key]
  if (direct) return direct

  const lower = key.toLowerCase()
  for (const [k, v] of Object.entries(process.env)) {
    if (k.toLowerCase() === lower && v) return v
  }

  throw new Error(
    `Missing required env key '${key}'. Source the BURNED-root .env first:\n` +
      `  set -a && source ../../.env && set +a`,
  )
}
