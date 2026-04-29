// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { LazyMotion, domMax } from 'motion/react'

// Controlled mock for useLastError so tests can drive server-error UI without
// poking the real singleton store between tests. The rest of the gameStore
// module is preserved via importActual — the mock only replaces this one hook.
const lastErrorRef: { current: { code: string; message: string } | null } = {
  current: null,
}

vi.mock('@client/shared/gameStore', async () => {
  const actual =
    await vi.importActual<typeof import('@client/shared/gameStore')>(
      '@client/shared/gameStore',
    )
  return {
    ...actual,
    useLastError: () => lastErrorRef.current,
  }
})

import { JoinScreen } from './JoinScreen'

beforeEach(() => {
  lastErrorRef.current = null
})

function mount(): { container: HTMLElement; root: Root } {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  return { container, root }
}

function teardown(container: HTMLElement, root: Root): void {
  act(() => {
    root.unmount()
  })
  container.remove()
}

function renderJoinForm(
  root: Root,
  overrides: Partial<React.ComponentProps<typeof JoinScreen>> = {},
): void {
  act(() => {
    root.render(
      <LazyMotion features={domMax} strict>
        <JoinScreen
          connectionStatus="connected"
          assignedColor={null}
          onJoin={() => {
            /* no-op */
          }}
          roomCode="ABCDEF"
          {...overrides}
        />
      </LazyMotion>,
    )
  })
}

function getErrorText(container: HTMLElement): string | null {
  const el = container.querySelector('p[class*="error"]')
  return el?.textContent ?? null
}

function setLastError(code: string, message: string): void {
  // Each call constructs a fresh object so React's effect dependency
  // (referential equality) re-fires for repeat refusals.
  lastErrorRef.current = { code, message }
}

// ---------------------------------------------------------------------------
// Server-error surfacing (TODO #6 follow-up)
//
// The player view has an existing ErrorToast that auto-dismisses after 2s.
// That's fine for in-game flashes ("too late — someone intercepted first"),
// but on the join form a 2s flash is too easy to miss when the user is
// looking at the input. These tests pin the inline-error contract: every
// server refusal during join surfaces below the input and stays until the
// user starts typing.
// ---------------------------------------------------------------------------

describe('JoinScreen — server error surfacing', () => {
  it('shows GAME_ALREADY_STARTED message inline after server refusal', () => {
    setLastError('GAME_ALREADY_STARTED', 'Game has already started')
    const { container, root } = mount()
    try {
      renderJoinForm(root)
      expect(getErrorText(container)).toBe('Game has already started')
    } finally {
      teardown(container, root)
    }
  })

  it('shows NAME_TAKEN message inline after server refusal', () => {
    setLastError('NAME_TAKEN', 'Name already taken')
    const { container, root } = mount()
    try {
      renderJoinForm(root)
      expect(getErrorText(container)).toBe('Name already taken')
    } finally {
      teardown(container, root)
    }
  })

  it('renders no error initially when lastError is null', () => {
    const { container, root } = mount()
    try {
      renderJoinForm(root)
      expect(getErrorText(container)).toBeNull()
    } finally {
      teardown(container, root)
    }
  })

  it('clears the inline error when the user types in the name input', () => {
    setLastError('GAME_ALREADY_STARTED', 'Game has already started')
    const { container, root } = mount()
    try {
      renderJoinForm(root)
      expect(getErrorText(container)).toBe('Game has already started')

      const input = container.querySelector('input')!
      act(() => {
        input.focus()
        // Set the controlled value via the React DOM input setter so React
        // sees the change and dispatches its synthetic onChange. A plain
        // assignment to .value bypasses React's mutation tracking.
        const setter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value',
        )!.set!
        setter.call(input, 'Bob')
        input.dispatchEvent(new Event('input', { bubbles: true }))
      })
      expect(getErrorText(container)).toBeNull()
    } finally {
      teardown(container, root)
    }
  })

  it('resurfaces a fresh error when the same refusal arrives again', () => {
    // First refusal — user dismisses by typing. Then they submit again, and
    // the server refuses again. The new error must surface even though the
    // code + message string are unchanged. Hinges on `lastError` being a
    // fresh object identity per server message.
    setLastError('GAME_ALREADY_STARTED', 'Game has already started')
    const { container, root } = mount()
    try {
      renderJoinForm(root)
      expect(getErrorText(container)).toBe('Game has already started')

      // User types — error clears.
      const input = container.querySelector('input')!
      act(() => {
        const setter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value',
        )!.set!
        setter.call(input, 'Bob')
        input.dispatchEvent(new Event('input', { bubbles: true }))
      })
      expect(getErrorText(container)).toBeNull()

      // Server refuses again — fresh object identity, effect re-fires.
      act(() => {
        setLastError('GAME_ALREADY_STARTED', 'Game has already started')
        // Trigger a re-render so the mocked hook returns the new value.
        renderJoinForm(root)
      })
      expect(getErrorText(container)).toBe('Game has already started')
    } finally {
      teardown(container, root)
    }
  })

  it('client validation errors still take precedence on submit', () => {
    // Empty submit fires the local "Enter a name" guard regardless of any
    // server error from a prior round. We don't want the previous server
    // error masking the user's most recent action.
    setLastError('GAME_ALREADY_STARTED', 'Game has already started')
    const onJoin = vi.fn()
    const { container, root } = mount()
    try {
      renderJoinForm(root, { onJoin })
      expect(getErrorText(container)).toBe('Game has already started')

      const form = container.querySelector('form')!
      act(() => {
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      })
      expect(getErrorText(container)).toBe('Enter a name')
      expect(onJoin).not.toHaveBeenCalled()
    } finally {
      teardown(container, root)
    }
  })
})
