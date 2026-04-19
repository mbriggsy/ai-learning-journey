/**
 * Launch Chrome pointed at the dev launcher with DevTools auto-open enabled
 * for every tab. Chrome inherits the flag process-wide, so when dev.html spits
 * out one board tab + N player tabs, each one boots with DevTools visible —
 * no manual F12 on every phone viewport.
 *
 * Uses a repo-local --user-data-dir so the dev profile is isolated (no shared
 * cookies/extensions with everyday browsing, and no conflict with an already-
 * running Chrome instance — you'd otherwise get a fresh window without the
 * flag taking effect). The directory is gitignored; delete it to reset.
 *
 * Run: pnpm dev:launch
 * Prereq: pnpm dev + pnpm dev:server already running in other terminals.
 */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { platform } from 'node:os'

const DEV_URL = 'http://localhost:5173/dev.html'
const PROFILE_DIR = resolve('.chrome-dev-profile')

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
  // Linux — let PATH resolve. spawn will ENOENT if missing.
  return 'google-chrome'
}

const chromePath = findChrome()
if (!chromePath) {
  console.error('Could not find Chrome executable. Install Chrome or set a PATH entry.')
  process.exit(1)
}

const args = [
  '--auto-open-devtools-for-tabs',
  `--user-data-dir=${PROFILE_DIR}`,
  DEV_URL,
]

console.log(`Launching: ${chromePath}`)
console.log(`Profile:   ${PROFILE_DIR}`)
console.log(`URL:       ${DEV_URL}`)
console.log(`Flags:     --auto-open-devtools-for-tabs\n`)

// detached + unref so this Node process exits immediately; Chrome keeps running.
const child = spawn(chromePath, args, { detached: true, stdio: 'ignore' })
child.unref()
