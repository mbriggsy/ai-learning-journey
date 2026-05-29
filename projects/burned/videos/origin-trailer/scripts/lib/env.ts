/**
 * Env-key plumbing for the v2 voice pipeline.
 *
 * Shared API secrets (GEMINI/ELEVENLABS/OPENAI/ANTHROPIC) live in the
 * REPO-ROOT .env — one gitignored source of truth across all projects.
 * Project-specific config (PLAYTEST_*) stays in the BURNED-local .env.
 * On import we load repo-root first, then burned-local, without overriding
 * anything the shell already exported (shell-source still wins). Dependency-
 * free on purpose — v2 carries no dotenv. Keys are canonical UPPER_SNAKE
 * (insight 055); the case-insensitive fallback in assertEnv is belt-and-braces.
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
// lib → scripts → origin-trailer → videos → burned → projects → repo-root
const REPO_ROOT = resolve(HERE, '../../../../../..')
const BURNED_ROOT = resolve(HERE, '../../../..')

function loadEnvFile(path: string): void {
  if (!existsSync(path)) return
  for (const raw of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const envKey = line.slice(0, eq).trim()
    if (envKey in process.env) continue // never override a shell-exported value
    let val = line.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    process.env[envKey] = val
  }
}

loadEnvFile(resolve(REPO_ROOT, '.env')) // shared secrets (canonical source)
loadEnvFile(resolve(BURNED_ROOT, '.env')) // project-local config (fills gaps)

export function assertEnv(key: string): string {
  const direct = process.env[key]
  if (direct) return direct

  const lower = key.toLowerCase()
  for (const [k, v] of Object.entries(process.env)) {
    if (k.toLowerCase() === lower && v) return v
  }

  throw new Error(
    `Missing required env key '${key}'. It should live in the repo-root .env ` +
      `(shared secrets) or the BURNED-local .env (project config), both loaded ` +
      `automatically on import. Check the key exists and is spelled UPPER_SNAKE.`,
  )
}
