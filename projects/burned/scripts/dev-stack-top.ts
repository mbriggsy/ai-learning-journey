/**
 * Dev cheat: stack one or more cards on top of a running room's draw
 * pile so eye-in-loop tests can trigger specific scenarios without
 * waiting for random play.
 *
 * Usage:
 *   pnpm dev:stack <room> <cardType> [cardType ...]
 *
 * Example — make the next draw a Burned card in room "1234":
 *   pnpm dev:stack 1234 burned
 *
 * Example — stack a Falsify Intel then a Burned (next draw is Falsify
 * Intel; the player must then play it through to expose Burned at top):
 *   pnpm dev:stack 1234 falsify-intel burned
 *
 * Loads `.env` (PLAYTEST_TOKEN). Connects to localhost:8787 as a god
 * connection. Wrangler dev must be running with PLAYTEST_MODE=1 +
 * PLAYTEST_TOKEN set in `.env` (see `.env.example`).
 */

import WebSocket from 'ws'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnv(): Record<string, string> {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env'), 'utf-8')
    const out: Record<string, string> = {}
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
    }
    return out
  } catch {
    return {}
  }
}

const room = process.argv[2]
const cards = process.argv.slice(3)

if (!room || cards.length === 0) {
  console.error('Usage: pnpm dev:stack <room> <cardType> [cardType ...]')
  console.error('Example: pnpm dev:stack 1234 burned')
  process.exit(1)
}

const env = loadEnv()
const token = env.PLAYTEST_TOKEN ?? process.env.PLAYTEST_TOKEN
if (!token) {
  console.error('PLAYTEST_TOKEN not found in .env or process env.')
  console.error('Add PLAYTEST_TOKEN=<32-byte hex> to .env and restart wrangler.')
  process.exit(1)
}

const url = `ws://127.0.0.1:8787/parties/game-room/${encodeURIComponent(room)}?role=god&token=${encodeURIComponent(token)}`
const ws = new WebSocket(url, { headers: { Origin: 'http://localhost:5173' } })

let acked = false

ws.on('open', () => {
  ws.send(JSON.stringify({ type: 'dev-stack-deck', cards }))
})

ws.on('message', (raw: Buffer | string) => {
  const text = raw.toString()
  let msg: { type?: string; ok?: boolean; code?: string; stackedCount?: number }
  try {
    msg = JSON.parse(text)
  } catch {
    return
  }
  if (msg.type !== 'dev-action-ack') return
  acked = true
  if (msg.ok) {
    console.log(`Stacked ${msg.stackedCount} card(s) on top of room ${room}: ${cards.join(', ')}`)
    console.log('Next player draw will be the first card listed.')
  } else {
    console.error(`Dev action rejected: ${msg.code}`)
    process.exitCode = 1
  }
  ws.close()
})

ws.on('close', (code, reason) => {
  if (!acked) {
    const reasonText = reason?.toString() || ''
    console.error(`WebSocket closed before ack — code ${code}${reasonText ? ` (${reasonText})` : ''}`)
    if (code === 4003) console.error('Origin rejected — check the dev WS is on localhost:8787 and PLAYTEST_GOD_ORIGINS allows your origin.')
    if (code === 4004) console.error('Auth failed — check PLAYTEST_MODE=1 and PLAYTEST_TOKEN match in .env.')
    process.exitCode = 1
  }
  process.exit()
})

ws.on('error', (err: Error) => {
  console.error('WebSocket error:', err.message)
  process.exit(1)
})
