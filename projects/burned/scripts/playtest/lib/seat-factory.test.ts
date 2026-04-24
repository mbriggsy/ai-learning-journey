/**
 * Unit 5 tests — seat-factory pure helpers + mocked integration.
 *
 * Live-browser coverage is deferred to Unit 8's smoke test. These tests
 * cover (a) URL + path construction, (b) name + room-code validation, and
 * (c) call-order + return-shape via a minimal Playwright `Browser` mock.
 *
 * Scenarios (from Phase 3 plan Unit 5 — mapped 1:1):
 *   1. buildPlayerUrl produces the canonical player URL.
 *   2. buildPlayerUrl URL-encodes the room code defensively.
 *   3. buildSeatPaths returns correct per-seat paths.
 *   4. Seat-name validation: valid accepts, invalid throws with actionable msg.
 *   5. Room-code validation: valid accepts, invalid throws with actionable msg.
 *   6. Returned SeatHandle has the right scenariosPath literal.
 *   7. Mocked createSeat: call order + SeatHandle shape.
 */
import { describe, it, expect, vi } from 'vitest'
import * as path from 'node:path'
import type { Browser } from '@playwright/test'
import {
  buildPlayerUrl,
  buildSeatPaths,
  assertValidSeatName,
  assertValidRoomCode,
  createSeat,
  SEAT_NAME_PATTERN,
  ROOM_CODE_PATTERN,
  DEFAULT_LOBBY_SELECTOR,
} from './seat-factory'
import type { RunDirPaths } from './run-directory'
import type { Viewport } from './types'

// --- Fixtures --------------------------------------------------------------

function fakeRunPaths(root = '/tmp/run'): RunDirPaths {
  return {
    root,
    serverDir: path.join(root, 'server'),
    seatsDir: path.join(root, 'seats'),
    suspicionsDir: path.join(root, 'suspicions'),
    eventsJsonl: path.join(root, 'server', 'events.jsonl'),
    connectionsJsonl: path.join(root, 'server', 'connections.jsonl'),
    sessionMd: path.join(root, 'session.md'),
    coverageMd: path.join(root, 'coverage.md'),
  }
}

const VIEWPORT: Viewport = { width: 390, height: 844, label: '390x844' }

// --- 1-2. buildPlayerUrl ---------------------------------------------------

describe('buildPlayerUrl', () => {
  it('builds the canonical /player.html?room=<CODE> URL', () => {
    expect(buildPlayerUrl('http://localhost:5173', 'ABCD')).toBe(
      'http://localhost:5173/player.html?room=ABCD',
    )
  })

  it('strips a trailing slash from baseUrl (idempotent)', () => {
    expect(buildPlayerUrl('http://localhost:5173/', 'ABCD')).toBe(
      'http://localhost:5173/player.html?room=ABCD',
    )
    expect(buildPlayerUrl('http://localhost:5173///', 'ABCD')).toBe(
      'http://localhost:5173/player.html?room=ABCD',
    )
  })

  it('URL-encodes the room code defensively (ampersand, hash, space)', () => {
    expect(buildPlayerUrl('http://localhost:5173', 'A&B')).toBe(
      'http://localhost:5173/player.html?room=A%26B',
    )
    expect(buildPlayerUrl('http://localhost:5173', 'A#B')).toBe(
      'http://localhost:5173/player.html?room=A%23B',
    )
    expect(buildPlayerUrl('http://localhost:5173', 'A B')).toBe(
      'http://localhost:5173/player.html?room=A%20B',
    )
  })
})

// --- 3. buildSeatPaths -----------------------------------------------------

describe('buildSeatPaths', () => {
  it('returns logPath and suspicionPath under the correct subdirs', () => {
    const runPaths = fakeRunPaths('/runs/2026-04-24-1030-3p')
    const { logPath, suspicionPath } = buildSeatPaths(runPaths, 'seat-1')
    expect(logPath).toBe(
      path.join('/runs/2026-04-24-1030-3p', 'seats', 'seat-1.log.md'),
    )
    expect(suspicionPath).toBe(
      path.join('/runs/2026-04-24-1030-3p', 'suspicions', 'seat-1.suspicions.md'),
    )
  })

  it('seat id is substituted verbatim (no munging)', () => {
    const { logPath } = buildSeatPaths(fakeRunPaths('/r'), 'seat-42')
    expect(logPath.endsWith(path.join('seats', 'seat-42.log.md'))).toBe(true)
  })
})

// --- 4. Seat name validation -----------------------------------------------

describe('assertValidSeatName', () => {
  it('accepts all names that match the canonical regex', () => {
    for (const name of ['Alice', 'Bob.1', 'vera_khan', 'A', 'ABCDEFGHIJKL', 'X-Y_Z 1.2!', 'z?']) {
      expect(() => assertValidSeatName(name)).not.toThrow()
    }
  })

  it('rejects empty, over-long, tag-bearing, emoji, and non-ASCII names', () => {
    // Note: whitespace-only names (e.g. '   ') DO match the server regex —
    // client trims before submission but the regex itself is permissive.
    // Server behavior is source of truth; we mirror it faithfully.
    const invalid = ['', 'nametoolong13c', 'has<tag>', '\u{1F600}', 'a\nb', 'café']
    for (const name of invalid) {
      expect(() => assertValidSeatName(name)).toThrow(/fails name regex/)
    }
  })

  it('error message names the regex (actionable)', () => {
    expect(() => assertValidSeatName('')).toThrow(SEAT_NAME_PATTERN.toString())
  })

  it('SEAT_NAME_PATTERN is exactly the shared name regex', () => {
    // This test calcifies the triple-source-of-truth contract. If the
    // client/server pattern ever changes, this fails loudly.
    expect(SEAT_NAME_PATTERN.source).toBe('^[a-zA-Z0-9 .!?_-]{1,12}$')
  })
})

// --- 5. Room code validation -----------------------------------------------

describe('assertValidRoomCode', () => {
  it('accepts 4-to-8-char uppercase alphanumeric codes', () => {
    for (const code of ['ABCD', 'ABCDEF', 'AB12', '12345678', 'QRST']) {
      expect(() => assertValidRoomCode(code)).not.toThrow()
    }
  })

  it('rejects empty, lowercase, too-short, too-long, and special chars', () => {
    const invalid = ['', 'abc', 'abcd', 'ABC', 'ABCDEFGHI', 'AB CD', 'A&B1', 'A\u{1F600}BC']
    for (const code of invalid) {
      expect(() => assertValidRoomCode(code)).toThrow(/fails regex/)
    }
  })

  it('ROOM_CODE_PATTERN is the defensive default', () => {
    expect(ROOM_CODE_PATTERN.source).toBe('^[A-Z0-9]{4,8}$')
  })
})

// --- 6-7. createSeat via mock Playwright Browser ---------------------------

describe('createSeat (mocked Browser)', () => {
  function makeMockBrowser() {
    const locatorFill = vi.fn().mockResolvedValue(undefined)
    const locatorClick = vi.fn().mockResolvedValue(undefined)

    const locator = vi.fn().mockImplementation((_sel: string) => ({
      fill: locatorFill,
      click: locatorClick,
    }))

    const page = {
      goto: vi.fn().mockResolvedValue(undefined),
      locator,
      waitForSelector: vi.fn().mockResolvedValue(undefined),
    }

    const context = {
      newPage: vi.fn().mockResolvedValue(page),
      close: vi.fn().mockResolvedValue(undefined),
    }

    const browser = {
      newContext: vi.fn().mockResolvedValue(context),
    } as unknown as Browser

    return { browser, context, page, locator, locatorFill, locatorClick }
  }

  it('validates name + room code BEFORE opening a context', async () => {
    const { browser } = makeMockBrowser()
    await expect(
      createSeat({
        browser,
        roomCode: 'ABCD',
        seatName: 'bad<tag>',
        seatId: 'seat-1',
        runPaths: fakeRunPaths(),
        viewport: VIEWPORT,
      }),
    ).rejects.toThrow(/fails name regex/)

    // Context was never opened.
    expect((browser as unknown as { newContext: ReturnType<typeof vi.fn> }).newContext)
      .not.toHaveBeenCalled()
  })

  it('rejects invalid room code before opening a context', async () => {
    const { browser } = makeMockBrowser()
    await expect(
      createSeat({
        browser,
        roomCode: 'too long and lowercase',
        seatName: 'Alice',
        seatId: 'seat-1',
        runPaths: fakeRunPaths(),
        viewport: VIEWPORT,
      }),
    ).rejects.toThrow(/fails regex/)
    expect((browser as unknown as { newContext: ReturnType<typeof vi.fn> }).newContext)
      .not.toHaveBeenCalled()
  })

  it('drives the join flow in the correct order', async () => {
    const { browser, context, page, locator, locatorFill, locatorClick } = makeMockBrowser()

    const handle = await createSeat({
      browser,
      roomCode: 'ABCD12',
      seatName: 'Alice',
      seatId: 'seat-1',
      runPaths: fakeRunPaths('/runs/test'),
      viewport: VIEWPORT,
    })

    // Call order assertions.
    expect((browser as unknown as { newContext: ReturnType<typeof vi.fn> }).newContext)
      .toHaveBeenCalledTimes(1)
    expect(context.newPage).toHaveBeenCalledTimes(1)
    expect(page.goto).toHaveBeenCalledWith(
      'http://localhost:5173/player.html?room=ABCD12',
      expect.objectContaining({ waitUntil: 'domcontentloaded' }),
    )
    expect(locator).toHaveBeenCalledWith('input[type="text"]')
    expect(locator).toHaveBeenCalledWith('button:has-text("Check In")')
    expect(locatorFill).toHaveBeenCalledWith('Alice')
    expect(locatorClick).toHaveBeenCalled()
    expect(page.waitForSelector).toHaveBeenCalledWith(
      DEFAULT_LOBBY_SELECTOR,
      expect.objectContaining({ timeout: expect.any(Number) }),
    )

    // Returned SeatHandle shape.
    expect(handle.seatId).toBe('seat-1')
    expect(handle.seatName).toBe('Alice')
    expect(handle.roomCode).toBe('ABCD12')
    expect(handle.viewport).toEqual(VIEWPORT)
    expect(handle.scenariosPath).toBe('docs/testing/playtest/SCENARIOS.md')
    expect(handle.logPath).toBe(path.join('/runs/test', 'seats', 'seat-1.log.md'))
    expect(handle.suspicionPath).toBe(
      path.join('/runs/test', 'suspicions', 'seat-1.suspicions.md'),
    )
    expect(handle.page).toBe(page)
  })

  it('passes through playerBaseUrl and lobbySelector overrides', async () => {
    const { browser, page } = makeMockBrowser()

    await createSeat({
      browser,
      roomCode: 'ABCD',
      seatName: 'Alice',
      seatId: 'seat-1',
      runPaths: fakeRunPaths(),
      viewport: VIEWPORT,
      playerBaseUrl: 'http://staging.example:9090',
      lobbySelector: '[data-testid="custom-ready"]',
      joinTimeoutMs: 1234,
    })

    expect(page.goto).toHaveBeenCalledWith(
      'http://staging.example:9090/player.html?room=ABCD',
      expect.objectContaining({ timeout: 1234 }),
    )
    expect(page.waitForSelector).toHaveBeenCalledWith(
      '[data-testid="custom-ready"]',
      expect.objectContaining({ timeout: 1234 }),
    )
  })

  it('passes the viewport override into newContext (not the device default)', async () => {
    const { browser } = makeMockBrowser()
    const vp: Viewport = { width: 360, height: 640, label: '360x640' }

    await createSeat({
      browser,
      roomCode: 'ABCD',
      seatName: 'Bob.1',
      seatId: 'seat-2',
      runPaths: fakeRunPaths(),
      viewport: vp,
    })

    const newContext = (browser as unknown as { newContext: ReturnType<typeof vi.fn> }).newContext
    const firstCallArg = newContext.mock.calls[0]![0] as { viewport: { width: number; height: number }; hasTouch: boolean }
    expect(firstCallArg.viewport).toEqual({ width: 360, height: 640 })
    expect(firstCallArg.hasTouch).toBe(true)
  })

  it('closes the context AND throws an actionable error when the lobby wait times out', async () => {
    const { browser, context, page } = makeMockBrowser()
    page.waitForSelector.mockRejectedValueOnce(new Error('Timeout 15000ms exceeded'))

    await expect(
      createSeat({
        browser,
        roomCode: 'ABCD',
        seatName: 'Alice',
        seatId: 'seat-1',
        runPaths: fakeRunPaths(),
        viewport: VIEWPORT,
      }),
    ).rejects.toThrow(/createSeat failed to join room=ABCD as seat=seat-1/)

    expect(context.close).toHaveBeenCalledTimes(1)
  })

  it('closes the context when goto fails', async () => {
    const { browser, context, page } = makeMockBrowser()
    page.goto.mockRejectedValueOnce(new Error('net::ERR_CONNECTION_REFUSED'))

    await expect(
      createSeat({
        browser,
        roomCode: 'ABCD',
        seatName: 'Alice',
        seatId: 'seat-1',
        runPaths: fakeRunPaths(),
        viewport: VIEWPORT,
      }),
    ).rejects.toThrow(/ERR_CONNECTION_REFUSED/)

    expect(context.close).toHaveBeenCalledTimes(1)
  })

  it('error message never contains URL query params (no token-shaped leakage)', async () => {
    const { browser, page } = makeMockBrowser()
    page.waitForSelector.mockRejectedValueOnce(new Error('timed out'))

    try {
      await createSeat({
        browser,
        roomCode: 'ABCD',
        seatName: 'Alice',
        seatId: 'seat-1',
        runPaths: fakeRunPaths(),
        viewport: VIEWPORT,
      })
      throw new Error('expected createSeat to throw')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      // Seat-factory handles no tokens, but double-check no URL-shaped
      // leakage (querystring, hash, port) sneaks into the error surface.
      expect(msg).not.toMatch(/\?room=/)
      expect(msg).not.toMatch(/localhost:\d+/)
    }
  })
})
