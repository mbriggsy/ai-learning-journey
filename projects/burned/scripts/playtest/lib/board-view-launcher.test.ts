/**
 * Unit tests — board-view-launcher (Phase 6 Unit 2.6).
 *
 * Pure mocked-Playwright tests. Live-browser coverage is deferred to the
 * board-launcher smoke (`pnpm playtest:phase6-board-launcher-smoke`).
 *
 * Scenarios:
 *   1. Builds the canonical board URL from roomCode + viteBaseUrl.
 *   2. URL-encodes the room code defensively.
 *   3. Strips a trailing slash on viteBaseUrl.
 *   4. Rejects empty roomCode and viteBaseUrl synchronously (before launching).
 *   5. Drives the start sequence: launch → newContext → newPage → goto →
 *      waitFor(count) → waitFor("Cleared Hot") → click("Cleared Hot").
 *   6. Honors a custom waitForStartTimeoutMs (applied to the count wait).
 *   7. Honors a custom viewport (default 1920x1080).
 *   8. `started` rejects when the click fails; the handle is still returned
 *      and `close()` runs cleanly.
 *   9. `close()` is idempotent — second call is a no-op.
 *  10. `close()` survives when individual page/context/browser closes throw.
 *  11. Logger receives the start-sequence breadcrumbs.
 *  12. Defaults `expectedPlayerCount` to 2 (preserves prior behavior).
 *  13. Honors a custom `expectedPlayerCount` (TODO #6 unblock — wait for
 *      ALL configured seats, not just the product minimum).
 *  14. Rejects `expectedPlayerCount` outside [2, 10] synchronously.
 *  15. Selects player count BEFORE the start button (count gate is the
 *      slow wait; button gate is incidental once count is reached).
 */
import { describe, it, expect, vi } from 'vitest'
import type { Browser, BrowserContext, Page } from '@playwright/test'

import { launchBoardView } from './board-view-launcher'

// ---------------------------------------------------------------------------
// Mock Playwright surface
// ---------------------------------------------------------------------------

interface MockBundle {
  browser: Browser
  context: { newPage: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> }
  page: {
    goto: ReturnType<typeof vi.fn>
    locator: ReturnType<typeof vi.fn>
    close: ReturnType<typeof vi.fn>
  }
  locatorWaitFor: ReturnType<typeof vi.fn>
  locatorClick: ReturnType<typeof vi.fn>
  newContext: ReturnType<typeof vi.fn>
  browserClose: ReturnType<typeof vi.fn>
  launcher: () => Promise<Browser>
}

function makeMockBundle(opts: {
  waitForRejects?: Error
  clickRejects?: Error
  pageCloseRejects?: Error
  contextCloseRejects?: Error
  browserCloseRejects?: Error
} = {}): MockBundle {
  const locatorWaitFor = vi.fn(async () => {
    if (opts.waitForRejects) throw opts.waitForRejects
  })
  const locatorClick = vi.fn(async () => {
    if (opts.clickRejects) throw opts.clickRejects
  })

  const locator = vi.fn(() => ({
    waitFor: locatorWaitFor,
    click: locatorClick,
  }))

  const page = {
    goto: vi.fn().mockResolvedValue(undefined),
    locator,
    close: vi.fn(async () => {
      if (opts.pageCloseRejects) throw opts.pageCloseRejects
    }),
  }

  const context = {
    newPage: vi.fn().mockResolvedValue(page),
    close: vi.fn(async () => {
      if (opts.contextCloseRejects) throw opts.contextCloseRejects
    }),
  }

  const newContext = vi.fn().mockResolvedValue(context)
  const browserClose = vi.fn(async () => {
    if (opts.browserCloseRejects) throw opts.browserCloseRejects
  })

  const browser = {
    newContext,
    close: browserClose,
  } as unknown as Browser

  const launcher = async (): Promise<Browser> => browser

  return {
    browser,
    context: context as unknown as MockBundle['context'],
    page: page as unknown as MockBundle['page'],
    locatorWaitFor,
    locatorClick,
    newContext,
    browserClose,
    launcher,
  }
}

// ---------------------------------------------------------------------------
// 1-3. URL construction
// ---------------------------------------------------------------------------

describe('launchBoardView — URL construction', () => {
  it('builds the canonical board URL: <viteBaseUrl>/board.html#<ROOM>', async () => {
    const m = makeMockBundle()
    const handle = await launchBoardView({
      roomCode: 'ABCD',
      viteBaseUrl: 'http://localhost:5173',
      chromiumLauncher: m.launcher,
    })
    await handle.started
    expect(m.page.goto).toHaveBeenCalledWith(
      'http://localhost:5173/board.html#ABCD',
      expect.objectContaining({ waitUntil: 'domcontentloaded' }),
    )
    await handle.close()
  })

  it('URL-encodes the room code defensively (even though server only accepts [A-Z0-9])', async () => {
    const m = makeMockBundle()
    const handle = await launchBoardView({
      roomCode: 'A B&C',
      viteBaseUrl: 'http://localhost:5173',
      chromiumLauncher: m.launcher,
    })
    await handle.started
    expect(m.page.goto).toHaveBeenCalledWith(
      'http://localhost:5173/board.html#A%20B%26C',
      expect.anything(),
    )
    await handle.close()
  })

  it('strips a trailing slash on viteBaseUrl so we do not produce //board.html', async () => {
    const m = makeMockBundle()
    const handle = await launchBoardView({
      roomCode: 'XYZW',
      viteBaseUrl: 'http://localhost:5173/',
      chromiumLauncher: m.launcher,
    })
    await handle.started
    const calledWith = m.page.goto.mock.calls[0]![0] as string
    expect(calledWith).toBe('http://localhost:5173/board.html#XYZW')
    expect(calledWith).not.toContain('//board.html')
    await handle.close()
  })
})

// ---------------------------------------------------------------------------
// 4. Synchronous validation
// ---------------------------------------------------------------------------

describe('launchBoardView — input validation', () => {
  it('throws synchronously on empty roomCode (no chromium launched)', async () => {
    const m = makeMockBundle()
    const launcher = vi.fn(m.launcher)
    await expect(
      launchBoardView({
        roomCode: '',
        viteBaseUrl: 'http://localhost:5173',
        chromiumLauncher: launcher,
      }),
    ).rejects.toThrow(/roomCode must be non-empty/)
    expect(launcher).not.toHaveBeenCalled()
  })

  it('throws synchronously on empty viteBaseUrl (no chromium launched)', async () => {
    const m = makeMockBundle()
    const launcher = vi.fn(m.launcher)
    await expect(
      launchBoardView({
        roomCode: 'ABCD',
        viteBaseUrl: '',
        chromiumLauncher: launcher,
      }),
    ).rejects.toThrow(/viteBaseUrl must be non-empty/)
    expect(launcher).not.toHaveBeenCalled()
  })

  it.each([
    { value: 1, label: '< 2 (below product minimum)' },
    { value: 11, label: '> 10 (above MAX_PLAYERS)' },
    { value: 0, label: 'zero' },
    { value: -1, label: 'negative' },
    { value: 2.5, label: 'non-integer' },
    { value: Number.NaN, label: 'NaN' },
  ])('throws synchronously on expectedPlayerCount=$value ($label)', async ({ value }) => {
    const m = makeMockBundle()
    const launcher = vi.fn(m.launcher)
    await expect(
      launchBoardView({
        roomCode: 'ABCD',
        viteBaseUrl: 'http://localhost:5173',
        expectedPlayerCount: value,
        chromiumLauncher: launcher,
      }),
    ).rejects.toThrow(/expectedPlayerCount must be an integer/)
    expect(launcher).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// 5. Start sequence — call order
// ---------------------------------------------------------------------------

describe('launchBoardView — start sequence', () => {
  it('drives launch → newContext → newPage → goto → waitFor(count) → waitFor(button) → click in order', async () => {
    const order: string[] = []
    const launcher = vi.fn(async () => {
      order.push('launch')
      const locatorWaitFor = vi.fn(async () => {
        order.push('locator.waitFor')
      })
      const locatorClick = vi.fn(async () => {
        order.push('locator.click')
      })
      const locator = vi.fn(() => ({ waitFor: locatorWaitFor, click: locatorClick }))
      const page = {
        goto: vi.fn(async () => {
          order.push('page.goto')
        }),
        locator,
        close: vi.fn(),
      }
      const context = {
        newPage: vi.fn(async () => {
          order.push('context.newPage')
          return page
        }),
        close: vi.fn(),
      }
      const browser = {
        newContext: vi.fn(async () => {
          order.push('browser.newContext')
          return context
        }),
        close: vi.fn(),
      } as unknown as Browser
      return browser
    })

    const handle = await launchBoardView({
      roomCode: 'ABCD',
      viteBaseUrl: 'http://localhost:5173',
      chromiumLauncher: launcher,
    })
    await handle.started

    // Two waitFor calls — first for the lobby count selector, then for the
    // start button — followed by the single click.
    expect(order).toEqual([
      'launch',
      'browser.newContext',
      'context.newPage',
      'page.goto',
      'locator.waitFor',
      'locator.waitFor',
      'locator.click',
    ])
    await handle.close()
  })

  it('passes waitForStartTimeoutMs through to locator.waitFor', async () => {
    const m = makeMockBundle()
    const handle = await launchBoardView({
      roomCode: 'ABCD',
      viteBaseUrl: 'http://localhost:5173',
      waitForStartTimeoutMs: 12_345,
      chromiumLauncher: m.launcher,
    })
    await handle.started
    expect(m.locatorWaitFor).toHaveBeenCalledWith(
      expect.objectContaining({ state: 'visible', timeout: 12_345 }),
    )
    await handle.close()
  })

  it('defaults viewport to 1920x1080', async () => {
    const m = makeMockBundle()
    const handle = await launchBoardView({
      roomCode: 'ABCD',
      viteBaseUrl: 'http://localhost:5173',
      chromiumLauncher: m.launcher,
    })
    await handle.started
    expect(m.newContext).toHaveBeenCalledWith({
      viewport: { width: 1920, height: 1080 },
    })
    await handle.close()
  })

  it('honors a custom viewport', async () => {
    const m = makeMockBundle()
    const handle = await launchBoardView({
      roomCode: 'ABCD',
      viteBaseUrl: 'http://localhost:5173',
      viewport: { width: 1366, height: 1024 },
      chromiumLauncher: m.launcher,
    })
    await handle.started
    expect(m.newContext).toHaveBeenCalledWith({
      viewport: { width: 1366, height: 1024 },
    })
    await handle.close()
  })

  it('defaults expectedPlayerCount to 2 (preserves prior product-minimum behavior)', async () => {
    const m = makeMockBundle()
    const handle = await launchBoardView({
      roomCode: 'ABCD',
      viteBaseUrl: 'http://localhost:5173',
      chromiumLauncher: m.launcher,
    })
    await handle.started
    const locatorCalls = (m.page.locator as ReturnType<typeof vi.fn>).mock.calls
    expect(locatorCalls[0]![0]).toBe('[data-player-count="2"]')
    await handle.close()
  })

  it.each([3, 5, 8, 10])(
    'waits for [data-player-count="%i"] when expectedPlayerCount=%i',
    async (count) => {
      const m = makeMockBundle()
      const handle = await launchBoardView({
        roomCode: 'ABCD',
        viteBaseUrl: 'http://localhost:5173',
        expectedPlayerCount: count,
        chromiumLauncher: m.launcher,
      })
      await handle.started
      const locatorCalls = (m.page.locator as ReturnType<typeof vi.fn>).mock.calls
      expect(locatorCalls[0]![0]).toBe(`[data-player-count="${count}"]`)
      await handle.close()
    },
  )

  it('applies waitForStartTimeoutMs to the count gate, but a small fixed timeout to the button gate', async () => {
    // Two waitFor calls. The slow wait (count gate) gets the user-supplied
    // long timeout — that's the actual "wait for seats to arrive" budget.
    // The button gate is incidental: once count is reached the button is
    // already enabled, so a small fixed timeout is right (and doubling
    // the user budget across both waits would be surprising).
    const m = makeMockBundle()
    const handle = await launchBoardView({
      roomCode: 'ABCD',
      viteBaseUrl: 'http://localhost:5173',
      waitForStartTimeoutMs: 99_999,
      chromiumLauncher: m.launcher,
    })
    await handle.started
    const waitForCalls = m.locatorWaitFor.mock.calls
    expect(waitForCalls.length).toBe(2)
    expect(waitForCalls[0]![0]).toEqual(
      expect.objectContaining({ state: 'visible', timeout: 99_999 }),
    )
    // Button gate timeout is a small fixed constant (5000ms). Asserting
    // the literal value pins the contract — if a future change wants to
    // make this configurable, the test will fail and force the choice
    // to be deliberate.
    expect(waitForCalls[1]![0]).toEqual(
      expect.objectContaining({ state: 'visible', timeout: 5_000 }),
    )
    await handle.close()
  })

  it('clicks the same Cleared-Hot selector it waited for', async () => {
    const m = makeMockBundle()
    const handle = await launchBoardView({
      roomCode: 'ABCD',
      viteBaseUrl: 'http://localhost:5173',
      chromiumLauncher: m.launcher,
    })
    await handle.started
    const locatorCalls = (m.page.locator as ReturnType<typeof vi.fn>).mock.calls
    // Three locator calls: lobby count gate (waitFor), then the start button
    // (waitFor + click). The button selector for waitFor and click must
    // match — we don't want to wait for one element and click another.
    expect(locatorCalls.length).toBe(3)
    expect(locatorCalls[1]![0]).toBe('button:has-text("Cleared Hot")')
    expect(locatorCalls[2]![0]).toBe('button:has-text("Cleared Hot")')
    await handle.close()
  })
})

// ---------------------------------------------------------------------------
// 6. Failure handling — `started` rejects, handle still closeable
// ---------------------------------------------------------------------------

describe('launchBoardView — failure handling', () => {
  it('rejects `started` when waitFor times out; close() still runs cleanly', async () => {
    const m = makeMockBundle({ waitForRejects: new Error('timeout 60000ms exceeded') })
    const handle = await launchBoardView({
      roomCode: 'ABCD',
      viteBaseUrl: 'http://localhost:5173',
      chromiumLauncher: m.launcher,
    })
    await expect(handle.started).rejects.toThrow(/timeout/)
    // Handle still returned; close runs without throwing.
    await expect(handle.close()).resolves.toBeUndefined()
    expect(m.browserClose).toHaveBeenCalledTimes(1)
  })

  it('rejects `started` when click fails; close() still runs', async () => {
    const m = makeMockBundle({ clickRejects: new Error('not clickable') })
    const handle = await launchBoardView({
      roomCode: 'ABCD',
      viteBaseUrl: 'http://localhost:5173',
      chromiumLauncher: m.launcher,
    })
    await expect(handle.started).rejects.toThrow(/not clickable/)
    await expect(handle.close()).resolves.toBeUndefined()
    expect(m.browserClose).toHaveBeenCalledTimes(1)
  })

  it('does not produce an unhandled-rejection when `started` is never awaited', async () => {
    const m = makeMockBundle({ waitForRejects: new Error('boom') })
    let unhandled: unknown = null
    const onUnhandled = (err: unknown): void => {
      unhandled = err
    }
    process.on('unhandledRejection', onUnhandled)
    try {
      const handle = await launchBoardView({
        roomCode: 'ABCD',
        viteBaseUrl: 'http://localhost:5173',
        chromiumLauncher: m.launcher,
      })
      // Deliberately do NOT await handle.started.
      await new Promise<void>((r) => setTimeout(r, 10))
      await handle.close()
      // Allow the microtask queue to flush.
      await new Promise<void>((r) => setTimeout(r, 10))
      expect(unhandled).toBeNull()
    } finally {
      process.off('unhandledRejection', onUnhandled)
    }
  })
})

// ---------------------------------------------------------------------------
// 7. close() — idempotent + resilient
// ---------------------------------------------------------------------------

describe('launchBoardView — close()', () => {
  it('is idempotent: second call does not double-close', async () => {
    const m = makeMockBundle()
    const handle = await launchBoardView({
      roomCode: 'ABCD',
      viteBaseUrl: 'http://localhost:5173',
      chromiumLauncher: m.launcher,
    })
    await handle.started
    await handle.close()
    await handle.close()
    expect(m.browserClose).toHaveBeenCalledTimes(1)
  })

  it('survives when individual page/context/browser closes throw', async () => {
    const m = makeMockBundle({
      pageCloseRejects: new Error('page boom'),
      contextCloseRejects: new Error('context boom'),
      browserCloseRejects: new Error('browser boom'),
    })
    const handle = await launchBoardView({
      roomCode: 'ABCD',
      viteBaseUrl: 'http://localhost:5173',
      chromiumLauncher: m.launcher,
    })
    await handle.started
    // Should NOT throw — failures are best-effort by design.
    await expect(handle.close()).resolves.toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// 8. Logger
// ---------------------------------------------------------------------------

describe('launchBoardView — logger', () => {
  it('emits start-sequence breadcrumbs to the logger', async () => {
    const m = makeMockBundle()
    const logs: string[] = []
    const handle = await launchBoardView({
      roomCode: 'ABCD',
      viteBaseUrl: 'http://localhost:5173',
      chromiumLauncher: m.launcher,
      logger: (m) => logs.push(m),
    })
    await handle.started
    expect(logs.some((l) => /launching chromium/i.test(l))).toBe(true)
    expect(logs.some((l) => /navigating to/i.test(l))).toBe(true)
    expect(logs.some((l) => /waiting for "Cleared Hot"/i.test(l))).toBe(true)
    expect(logs.some((l) => /clicking "Cleared Hot"/i.test(l))).toBe(true)
    await handle.close()
  })

  it('logs the failure message when `started` rejects', async () => {
    const m = makeMockBundle({ waitForRejects: new Error('boom-reason') })
    const logs: string[] = []
    const handle = await launchBoardView({
      roomCode: 'ABCD',
      viteBaseUrl: 'http://localhost:5173',
      chromiumLauncher: m.launcher,
      logger: (m) => logs.push(m),
    })
    await handle.started.catch(() => {
      /* swallow for test */
    })
    expect(logs.some((l) => /start sequence failed/i.test(l) && /boom-reason/.test(l))).toBe(true)
    await handle.close()
  })
})

// Type-check the surface area: confirm imported types satisfy the public contract.
// (No-op tests; the import would fail if signatures drifted.)
const _typeCheck = (): void => {
  const _b: Browser | null = null
  const _c: BrowserContext | null = null
  const _p: Page | null = null
  void _b
  void _c
  void _p
}
void _typeCheck
