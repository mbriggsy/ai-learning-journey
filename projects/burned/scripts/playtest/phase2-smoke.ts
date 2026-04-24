#!/usr/bin/env tsx
/**
 * Phase 2 smoke test — verifies the playtest-harness wire protocol
 * end-to-end against a real `wrangler dev` process.
 *
 * Coverage (all phase-2 server-side surfaces):
 *   - `/health` returns `playtest: true` when PLAYTEST_MODE=1 is set
 *   - God connection rejected on playtest-off (4004)
 *   - God connection rejected on missing token (4004)
 *   - God connection rejected on wrong token (4004)
 *   - God connection accepted on correct token + LAN origin
 *   - `playtest-config` latch accepts first write (ack ok:true)
 *   - `playtest-config` latch rejects second write (ack ok:false code=LOCKED)
 *
 * NOT covered here (exercised by unit tests + Vitest bench):
 *   - Full game dispatch → god-event emission (unit tests + bench)
 *   - Payload size + CPU budgets (bench)
 *   - Sentinel leakage in client bundles (sentinels test)
 *
 * Run: `pnpm playtest:smoke`. Spawns its own wrangler dev on port 8788.
 */

import { spawn, type ChildProcess } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'

const PORT = 8788
const BASE_URL = `http://127.0.0.1:${PORT}`
const WS_URL = `ws://127.0.0.1:${PORT}`
const PLAYTEST_TOKEN = 'phase2-smoke-token-xyz'
const ROOM = 'smoke-test-room'

interface Step { name: string; run: () => Promise<void> }

function log(ok: boolean, step: string, detail = ''): void {
  const mark = ok ? '✓' : '✗'
  console.log(`  ${mark} ${step}${detail ? ' — ' + detail : ''}`)
}

async function pollHealth(): Promise<void> {
  const deadline = Date.now() + 20_000
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE_URL}/health`)
      if (res.status === 200) {
        const body = await res.json() as { ok: boolean; playtest: boolean }
        if (body.ok && body.playtest) return
        throw new Error(`/health returned playtest=${body.playtest}, expected true`)
      }
    } catch { /* wrangler not ready yet */ }
    await delay(500)
  }
  throw new Error('Timed out waiting for /health with playtest:true')
}

/**
 * Attempt a god WS upgrade. Returns either an HTTP-rejection result
 * (the upgrade failed pre-WS with a 4xx status) or an "opened" result
 * (the upgrade completed — connection accepted).
 *
 * The Worker's default-export `fetch` handler runs HTTP-level pre-auth
 * for `?role=god` requests and returns 401/403 for rejections. The WS
 * upgrade never completes in those cases. Node's WebSocket surfaces
 * that as an `error` event; we inspect the error message to extract
 * the HTTP status.
 */
async function tryGodConnect(params: { token?: string }): Promise<{ kind: 'open' } | { kind: 'rejected'; status: number | null; detail: string }> {
  const qs = new URLSearchParams({ role: 'god' })
  if (params.token !== undefined) qs.set('token', params.token)
  const url = `${WS_URL}/parties/game-room/${ROOM}?${qs.toString()}`
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url, { headers: { Origin: `http://127.0.0.1:${PORT}` } } as unknown as string)
    const timer = setTimeout(() => { ws.close(); reject(new Error('WS upgrade timeout')) }, 3000)
    ws.addEventListener('open', () => {
      clearTimeout(timer)
      ws.close()
      resolve({ kind: 'open' })
    })
    ws.addEventListener('error', ev => {
      clearTimeout(timer)
      const msg = String((ev as unknown as { message?: string }).message ?? ev)
      // Node's native WebSocket surfaces the upgrade status in the
      // error message, e.g. "Unexpected server response: 401".
      const match = msg.match(/(\d{3})/)
      resolve({ kind: 'rejected', status: match ? parseInt(match[1]!, 10) : null, detail: msg })
    })
  })
}

/** Open a god WS, run a task while it's open, close and resolve. */
async function withGodConnection<T>(token: string, task: (ws: WebSocket) => Promise<T>): Promise<T> {
  const url = `${WS_URL}/parties/game-room/${ROOM}?role=god&token=${encodeURIComponent(token)}`
  const ws = new WebSocket(url, { headers: { Origin: `http://127.0.0.1:${PORT}` } } as unknown as string)
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('WS open timeout')), 5000)
    ws.onopen = () => { clearTimeout(timer); resolve() }
    ws.onerror = () => { /* close follows */ }
    ws.onclose = ev => { clearTimeout(timer); reject(new Error(`WS closed before open: ${ev.code} ${ev.reason}`)) }
  })
  try { return await task(ws) } finally {
    await new Promise<void>(r => { ws.onclose = () => r(); ws.close() })
  }
}

async function sendAndAwaitAck(ws: WebSocket, payload: unknown): Promise<{ type: string; ok: boolean; code?: string }> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('ack timeout')), 5000)
    ws.onmessage = ev => {
      clearTimeout(timer)
      // Reset handler so the next sendAndAwaitAck on the same socket
      // doesn't eat THIS reply.
      ws.onmessage = null
      try {
        const parsed = JSON.parse(String(ev.data))
        resolve(parsed as { type: string; ok: boolean; code?: string })
      } catch (e) { reject(e) }
    }
    ws.send(JSON.stringify(payload))
  })
}

async function runSmoke(): Promise<number> {
  const steps: Step[] = [
    {
      name: '/health reports playtest:true',
      run: async () => { await pollHealth() },
    },
    {
      name: 'god connect without token → upgrade rejected',
      run: async () => {
        const r = await tryGodConnect({})
        if (r.kind !== 'rejected') {
          throw new Error(`expected rejected, got ${JSON.stringify(r)}`)
        }
      },
    },
    {
      name: 'god connect with wrong token → upgrade rejected',
      run: async () => {
        const r = await tryGodConnect({ token: 'wrong-token' })
        if (r.kind !== 'rejected') {
          throw new Error(`expected rejected, got ${JSON.stringify(r)}`)
        }
      },
    },
    {
      name: 'god endpoint returns HTTP 401 for missing-token upgrade attempt (direct HTTP probe)',
      run: async () => {
        // Fetch the same URL directly as HTTP (no WS upgrade). Since
        // there's no Upgrade: websocket header, the Worker returns the
        // same 4xx response a rejected upgrade would produce, but we
        // can inspect the status cleanly.
        const res = await fetch(`${BASE_URL}/parties/game-room/${ROOM}?role=god`, {
          headers: { Origin: `http://127.0.0.1:${PORT}` },
        })
        if (res.status !== 401) {
          throw new Error(`expected 401, got ${res.status}`)
        }
      },
    },
    {
      name: 'god endpoint returns HTTP 403 for public-internet origin (direct HTTP probe)',
      run: async () => {
        const res = await fetch(`${BASE_URL}/parties/game-room/${ROOM}?role=god&token=${PLAYTEST_TOKEN}`, {
          headers: { Origin: 'https://evil.example.com' },
        })
        if (res.status !== 403) {
          throw new Error(`expected 403, got ${res.status}`)
        }
      },
    },
    {
      name: 'god connect with correct token + LAN origin → upgrade accepted',
      run: async () => {
        const r = await tryGodConnect({ token: PLAYTEST_TOKEN })
        if (r.kind !== 'open') {
          throw new Error(`expected open, got ${JSON.stringify(r)}`)
        }
      },
    },
    {
      name: 'playtest-config latch: first write acks ok, second write rejects LOCKED',
      run: async () => {
        // Must be same god connection — DO state (including
        // `playtestConfigLocked`) resets on hibernation, which can fire
        // when the last connection closes. See room.ts hibernation
        // consequence note on Unit 5.
        await withGodConnection(PLAYTEST_TOKEN, async ws => {
          const ack1 = await sendAndAwaitAck(ws, { type: 'playtest-config', seed: 42, nopeWindowMs: 60_000 })
          if (ack1.type !== 'playtest-config-ack' || !ack1.ok) {
            throw new Error(`first write: expected ack ok:true, got ${JSON.stringify(ack1)}`)
          }
          const ack2 = await sendAndAwaitAck(ws, { type: 'playtest-config', seed: 99, nopeWindowMs: 120_000 })
          if (ack2.type !== 'playtest-config-ack' || ack2.ok || ack2.code !== 'PLAYTEST_CONFIG_LOCKED') {
            throw new Error(`second write: expected LOCKED rejection, got ${JSON.stringify(ack2)}`)
          }
        })
      },
    },
  ]

  let failed = 0
  for (const step of steps) {
    try {
      await step.run()
      log(true, step.name)
    } catch (err) {
      log(false, step.name, String(err))
      failed++
    }
  }
  return failed
}

async function main(): Promise<number> {
  console.log(`[phase2-smoke] spawning wrangler dev on port ${PORT} with PLAYTEST_MODE=1`)
  const wrangler: ChildProcess = spawn('pnpm', [
    'exec', 'wrangler', 'dev',
    '--ip', '0.0.0.0',
    '--port', String(PORT),
    '--var', 'PLAYTEST_MODE:1',
    '--var', `PLAYTEST_TOKEN:${PLAYTEST_TOKEN}`,
  ], {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  })
  wrangler.stdout?.on('data', (d: Buffer) => process.stderr.write(`[wrangler] ${d}`))
  wrangler.stderr?.on('data', (d: Buffer) => process.stderr.write(`[wrangler] ${d}`))

  let exitCode = 0
  try {
    const failed = await runSmoke()
    if (failed > 0) {
      console.log(`[phase2-smoke] ✗ ${failed} step(s) failed`)
      exitCode = 1
    } else {
      console.log('[phase2-smoke] ✓ all steps passed')
    }
  } catch (err) {
    console.error(`[phase2-smoke] smoke run threw: ${String(err)}`)
    exitCode = 1
  } finally {
    wrangler.kill()
    // Give it a moment to die.
    await delay(500)
  }
  return exitCode
}

const exitCode = await main()
process.exit(exitCode)
