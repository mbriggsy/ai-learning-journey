/**
 * Dev cheat: empty a named player's hand. Discarded cards vanish (not
 * routed to the discard pile) — this is god-mode scenario setup, not
 * in-rules play. Mirrors `dev-give-card.ts` shape.
 *
 * Usage:
 *   pnpm dev:take <room> <playerName>
 *
 * Example — empty Vera's hand in room "1234":
 *   pnpm dev:take 1234 vera
 *
 * Player name match is case-insensitive. Loads `.env` for
 * PLAYTEST_TOKEN. Wrangler dev must be running with PLAYTEST_MODE=1.
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
const playerName = process.argv[3]

if (!room || !playerName) {
  console.error('Usage: pnpm dev:take <room> <playerName>')
  console.error('Example: pnpm dev:take 1234 vera')
  process.exit(1)
}

const env = loadEnv()
const token = env.PLAYTEST_TOKEN ?? process.env.PLAYTEST_TOKEN
if (!token) {
  console.error('PLAYTEST_TOKEN not found in .env or process env.')
  process.exit(1)
}

const url = `ws://127.0.0.1:8787/parties/game-room/${encodeURIComponent(room)}?role=god&token=${encodeURIComponent(token)}`
const ws = new WebSocket(url, { headers: { Origin: 'http://localhost:5173' } })

let acked = false

ws.on('open', () => {
  ws.send(JSON.stringify({ type: 'dev-take-card', playerName }))
})

ws.on('message', (raw: Buffer | string) => {
  const text = raw.toString()
  let msg: { type?: string; ok?: boolean; code?: string; message?: string; count?: number }
  try {
    msg = JSON.parse(text)
  } catch {
    return
  }
  if (msg.type !== 'dev-action-ack') return
  acked = true
  if (msg.ok) {
    console.log(`Took ${msg.count} card(s) from ${playerName} in room ${room}.`)
  } else {
    console.error(`Dev action rejected: ${msg.code}${msg.message ? ` — ${msg.message}` : ''}`)
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
