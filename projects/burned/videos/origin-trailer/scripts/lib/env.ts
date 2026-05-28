/**
 * Env-key plumbing for the v2 voice pipeline.
 *
 * The BURNED-root .env is shell-sourced before running
 * (`set -a && source ../../.env && set +a`), so keys live in process.env.
 * assertEnv fails fast with a clear message if a key is missing, and falls
 * back to a case-insensitive lookup (the .env uses mixed-case keys like
 * `ElevenLabs_API_KEY`; Windows env is case-insensitive, bash is not).
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
