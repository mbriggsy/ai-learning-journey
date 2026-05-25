// Defense-in-depth: refuse to publish stats.json if a string leaks PII or a secret.
// Two tiers, BOTH scanned on every string value, EVERYWHERE (no carve-outs):
//   HARD   — unambiguous path / PII leaks. The real vector: machine-derived absolute
//            paths, home dirs, drive-letter session slugs, UUIDs.
//   SECRET — real API-key / token fingerprints. They never appear in legitimate published
//            stats (the refresh pipeline reads git + JSONL + editorial yaml, never .env) and
//            never false-positive on English prose — so they need no editorial exemption.
//
// ATC 2026-05-25: chose key-shapes over an english-word list (secret/password/username/email).
// Words were noisy on the author's own showcase copy (his name, "secret sauce", an SSH
// repoUrl) AND missed the actual dangerous thing — a leaked key. Key-shapes catch the real
// risk with zero false-positives, so there's no .editorial. carve-out to maintain.
//
// Field NAMES are never checked, only string VALUES. ASSUMPTION: every object key in the
// published JSON is a statically-defined schema field, never derived from path/user input.
// If a future schema adds a dynamically-keyed object, this assumption must be revisited.
export const HARD_PATTERNS: ReadonlyArray<{ name: string; re: RegExp }> = [
  { name: 'win-abs-backslash', re: /C:\\/i },
  { name: 'win-abs-forwardslash', re: /C:\//i },
  { name: 'posix-home', re: /\/Users\// },
  { name: 'linux-home', re: /\/home\// }, // Phase 8 GH Action would run on a Linux runner
  { name: 'win-users-fragment', re: /\\Users\\/i },
  { name: 'appdata', re: /AppData/i },
  { name: 'node-modules', re: /node_modules/ },
  { name: 'private-path', re: /[/\\]private[/\\]/i },
  { name: 'drive-letter-slug', re: /^[A-Za-z]--[A-Za-z]/ }, // c--Users-..., C--Development-...
  { name: 'uuid', re: /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i },
]

// Real secret/key fingerprints. Each is specific enough to never collide with stats data
// (model names, labels, ISO dates, URLs, author names, numbers).
export const SECRET_PATTERNS: ReadonlyArray<{ name: string; re: RegExp }> = [
  { name: 'anthropic-key', re: /sk-ant-[A-Za-z0-9_-]{20,}/ },
  { name: 'openai-key', re: /sk-(proj-)?[A-Za-z0-9]{20,}/ },
  { name: 'google-api-key', re: /AIza[0-9A-Za-z_-]{35}/ }, // Gemini / Google — most relevant to this .env
  { name: 'github-token', re: /gh[posru]_[A-Za-z0-9]{20,}/ }, // ghp_/gho_/ghs_/ghr_/ghu_
  { name: 'aws-access-key', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'slack-token', re: /xox[baprs]-[A-Za-z0-9-]{10,}/ },
  { name: 'pem-private-key', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
]

const ALL_PATTERNS = [...HARD_PATTERNS, ...SECRET_PATTERNS]

export function assertPublishSafe(value: unknown, path = '$'): void {
  if (typeof value === 'string') {
    for (const { name, re } of ALL_PATTERNS) {
      if (re.test(value)) {
        throw new Error(
          `publish-guard: forbidden pattern "${name}" at ${path}: ` +
            `${value.slice(0, 60)}${value.length > 60 ? '…' : ''}`,
        )
      }
    }
    return
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => assertPublishSafe(v, `${path}[${i}]`))
    return
  }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) assertPublishSafe(v, `${path}.${k}`)
  }
  // numbers / booleans / null — safe leaves
}
