/**
 * Launch Chrome with board + N player tabs pre-opened, each with DevTools
 * auto-attached. URLs are passed as positional args to chrome.exe so there's
 * no popup-blocker involvement — the isolated --user-data-dir profile has
 * default Chrome settings (popup blocker ON), and the old `window.open` loop
 * in dev.html only got one tab through.
 *
 * Uses a repo-local --user-data-dir so the dev profile is isolated from
 * everyday browsing. Directory is gitignored; delete to reset.
 *
 * Run: pnpm dev:launch                 (4 players, default)
 *      pnpm dev:launch --players=6     (6 players)
 *      pnpm dev:launch --dev-html      (old in-browser launcher flow)
 * Prereq: pnpm dev + pnpm dev:server already running in other terminals.
 */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { resolve } from 'node:path'
import { platform } from 'node:os'

const ORIGIN = 'http://localhost:5173'
const PROFILE_DIR = resolve('.chrome-dev-profile')

// Mirrors NAMES in dev.html. Duplicated rather than shared because dev.html
// is standalone (no module system). If you change one, change the other.
const NAMES = [
  'Mittens', 'Pickles', 'Biscuit', 'Nibbles', 'Pawdrey',
  'Smudge!', 'Cupcake', 'Whiskrs', 'Midnite', 'Meowza!',
]

function findChrome(): string | null {
  const os = platform()
  if (os === 'win32') {
    const candidates = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
    ]
    return candidates.find(p => p && existsSync(p)) ?? null
  }
  if (os === 'darwin') {
    const p = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    return existsSync(p) ? p : null
  }
  return 'google-chrome'
}

function parsePlayerCount(argv: readonly string[]): number {
  const arg = argv.find(a => a.startsWith('--players='))
  if (!arg) return 4
  const n = Number.parseInt(arg.split('=')[1] ?? '', 10)
  if (!Number.isFinite(n) || n < 2 || n > NAMES.length) {
    console.error(`--players must be 2..${NAMES.length}; got ${arg.split('=')[1]}`)
    process.exit(1)
  }
  return n
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const limit = 256 - (256 % chars.length)
  const buf = randomBytes(64)
  let code = ''
  let i = 0
  while (code.length < 6) {
    const v = buf[i++ % buf.length]!
    if (v < limit) code += chars[v % chars.length]
  }
  return code
}

const argv = process.argv.slice(2)
const useDevHtml = argv.includes('--dev-html')
const playerCount = parsePlayerCount(argv)

const chromePath = findChrome()
if (!chromePath) {
  console.error('Could not find Chrome executable. Install Chrome or set a PATH entry.')
  process.exit(1)
}

const urls: string[] = []
let room: string | null = null

if (useDevHtml) {
  urls.push(`${ORIGIN}/dev.html`)
} else {
  room = generateRoomCode()
  urls.push(`${ORIGIN}/board.html#${room}`)
  for (let i = 0; i < playerCount; i++) {
    const name = NAMES[i]!
    urls.push(`${ORIGIN}/player.html?room=${room}&name=${encodeURIComponent(name)}`)
  }
}

const args = [
  '--auto-open-devtools-for-tabs',
  `--user-data-dir=${PROFILE_DIR}`,
  ...urls,
]

console.log(`Launching: ${chromePath}`)
console.log(`Profile:   ${PROFILE_DIR}`)
if (room) {
  console.log(`Room:      ${room}`)
  console.log(`Players:   ${playerCount} (${NAMES.slice(0, playerCount).join(', ')})`)
}
console.log(`Tabs:`)
for (const u of urls) console.log(`  - ${u}`)
console.log(`Flags:     --auto-open-devtools-for-tabs\n`)

const child = spawn(chromePath, args, { detached: true, stdio: 'ignore' })
child.unref()
