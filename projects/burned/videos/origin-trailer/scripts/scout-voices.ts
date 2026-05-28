/**
 * Janet voice scout — ElevenLabs Shared (community) Voice Library.
 *
 * Runs several targeted queries against /v1/shared-voices, dedupes, and
 * re-scores for the Janet archetype: American, older-but-not-ancient,
 * authoritative MEAN matriarch with cigarette-and-scotch grit. Weights
 * rasp/grit/attitude heavily; penalizes clean/calm/smooth/warm/British
 * (the "too lovely" trap that sank Eleanor).
 *
 * Research tool — prints a ranked shortlist with voice_id + preview_url.
 * Run:  set -a && source ../../.env && set +a && pnpm tsx scripts/scout-voices.ts
 */
import { assertEnv } from './lib/env.js'

interface SharedVoice {
  voice_id: string
  name: string
  description?: string
  labels?: Record<string, string>
  accent?: string
  age?: string
  gender?: string
  category?: string
  use_case?: string
  descriptive?: string
  preview_url?: string
  liked_by_count?: number
}

const KEY = assertEnv('ELEVENLABS_API_KEY')

// Targeted at Janet: white American New Yorker, ~50s, very rich, slightly
// always annoyed, drinker + former smoker (a worn edge, not heavy gravel).
// The archetype = Jessica-Walter-CODED (Malory Archer / Lucille Bluth): dry,
// imperious, martini-soaked matriarch. Coded, never cloned — vibe, not dupe.
const QUERIES: ReadonlyArray<Record<string, string>> = [
  { gender: 'female', search: 'jessica walter', language: 'en', page_size: '50' },
  { gender: 'female', search: 'malory archer', language: 'en', page_size: '50' },
  { gender: 'female', search: 'lucille bluth', language: 'en', page_size: '50' },
  { gender: 'female', search: 'imperious matriarch', language: 'en', page_size: '50' },
  { gender: 'female', search: 'haughty wealthy dowager', language: 'en', page_size: '50' },
  { gender: 'female', age: 'middle_aged', use_cases: 'characters_animation', language: 'en', page_size: '100' },
]

async function fetchQuery(params: Record<string, string>): Promise<SharedVoice[]> {
  const url = new URL('https://api.elevenlabs.io/v1/shared-voices')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url.toString(), { headers: { 'xi-api-key': KEY } })
  if (!res.ok) {
    console.error(`  query ${JSON.stringify(params)} -> ${res.status}`)
    return []
  }
  const body = (await res.json()) as { voices: SharedVoice[] }
  return body.voices ?? []
}

const PRO = [
  // New York / east-coast identity
  'new york', 'new yorker', 'nyc', 'manhattan', 'brooklyn', 'east coast', 'northeast', 'queens', 'bronx',
  // rich / refined-but-jaded
  'sophisticated', 'posh', 'wealthy', 'rich', 'socialite', 'aristocratic', 'refined', 'dignified',
  'classy', 'elegant', 'executive', 'glamorous', 'high society',
  // the slightly-always-annoyed contempt register (the cunty core)
  'sarcastic', 'sardonic', 'dry', 'deadpan', 'jaded', 'cynical', 'condescending', 'snobby', 'snooty',
  'entitled', 'unimpressed', 'annoyed', 'bored', 'world-weary', 'cutting', 'cold', 'disdain', 'biting', 'blunt',
  // Jessica-Walter / Malory / Lucille-Bluth archetype (coded, not cloned)
  'imperious', 'haughty', 'withering', 'aloof', 'patrician', 'dowager', 'contemptuous', 'regal', 'queenly',
  'domineering', 'overbearing', 'scathing', 'disdainful', 'snide', 'catty', 'icy', 'arch', 'prim', 'martini',
  // authority / matriarch
  'commanding', 'authoritative', 'powerful', 'stern', 'no-nonsense', 'bossy', 'firm', 'matriarch', 'mature',
  // drinker / former-smoker texture (a worn edge — NOT heavy gravel)
  'raspy', 'husky', 'smoky', 'whiskey', 'low', 'deep', 'alto', 'textured',
]
const ANTI = [
  // the "too lovely" trap (sank Eleanor)
  'soft', 'warm', 'reassuring', 'gentle', 'sweet', 'youthful', 'young', 'girlish', 'innocent', 'breezy',
  'upbeat', 'cheerful', 'friendly', 'pleasant', 'pleasing', 'soothing', 'calming', 'calm', 'nurturing',
  'motherly', 'bubbly', 'perky', 'inspirational', 'inspiring', 'uplifting', 'bright',
  // wrong region / accent
  'british', 'english', 'rp', 'mid-atlantic', 'transatlantic', 'australian', 'irish', 'scottish', 'southern',
  // cartoon / fantasy / seductive noise the character pool drags in — Janet is grounded, not a villainess or a vamp
  'witch', 'evil', 'halloween', 'vampire', 'demon', 'monster', 'fantasy', 'creature', 'ghost', 'haunting',
  'sultry', 'flirty', 'seductive', 'teasing', 'alluring', 'sensual', 'sexy', 'breathy', 'asmr',
]

function scoreVoice(v: SharedVoice): { score: number; reasons: string[] } {
  const labelText = v.labels ? Object.values(v.labels).join(' ') : ''
  const blob = `${v.name} ${v.description ?? ''} ${labelText} ${v.descriptive ?? ''} ${v.use_case ?? ''} ${v.accent ?? ''} ${v.category ?? ''}`.toLowerCase()
  const reasons: string[] = []
  let score = 0

  const accent = (v.accent ?? v.labels?.accent ?? '').toLowerCase()
  if (accent.includes('new york') || accent.includes('northeast')) { score += 7; reasons.push(`${accent}:+7`) }
  else if (accent.includes('southern')) { score -= 6; reasons.push('southern:-6') }
  else if (accent.includes('american') || accent.includes('us')) { score += 4; reasons.push('american:+4') }
  if (accent.includes('british') || accent.includes('english') || accent.includes('rp') || accent.includes('australian') || accent.includes('irish') || accent.includes('scottish')) { score -= 8; reasons.push(`${accent}:-8`) }

  for (const kw of PRO) if (blob.includes(kw)) { score += 2; reasons.push(`+${kw}`) }
  for (const a of ANTI) if (blob.includes(a)) { score -= 2; reasons.push(`-${a}`) }

  if (v.use_case === 'characters_animation') { score += 2; reasons.push('character:+2') }
  return { score, reasons }
}

const seen = new Map<string, SharedVoice>()
for (const q of QUERIES) {
  const voices = await fetchQuery(q)
  for (const v of voices) if (!seen.has(v.voice_id)) seen.set(v.voice_id, v)
  await new Promise((r) => setTimeout(r, 300)) // rate-limit courtesy
}

console.log(`\naggregated ${seen.size} unique voices across ${QUERIES.length} queries\n`)

const ranked = [...seen.values()]
  .map((v) => ({ v, ...scoreVoice(v) }))
  .filter((r) => r.score > 2)
  .sort((a, b) => b.score - a.score)
  .slice(0, 20)

console.log(`top ${ranked.length} Janet candidates (American mean matriarch, grit-weighted):\n`)
for (let i = 0; i < ranked.length; i++) {
  const { v, score, reasons } = ranked[i]!
  console.log(`${(i + 1).toString().padStart(2)}. score=${score.toString().padStart(2)} | ${v.name} (${v.voice_id})`)
  console.log(`        accent=${v.accent ?? '?'} / age=${v.age ?? '?'} / use_case=${v.use_case ?? '?'} / descriptive=${v.descriptive ?? '?'}`)
  if (v.description) console.log(`        desc: ${v.description.slice(0, 160)}`)
  if (v.preview_url) console.log(`        preview: ${v.preview_url}`)
  console.log(`        ${reasons.join(' ')}`)
  console.log('')
}
