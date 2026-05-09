// @vitest-environment jsdom
//
// Pins the structural contract that fixes triage 001 + 023 (run
// 2026-05-08-2022-5p): a brief mid-game reconnect MUST NOT block the
// player's Intercept tap.
//
// Root cause: `<dialog>.showModal()` promotes the element to the
// browser's top layer, which captures all pointer events for the
// viewport regardless of CSS. Calling showModal() during transient
// reconnects swallowed Intercept taps mid-nope-window.
//
// The contract under test:
//   - status='connecting'   → non-blocking <div>, no open <dialog>
//   - status='disconnected' → non-blocking <div>, no open <dialog>
//   - status='gave-up'      → <dialog> opened via showModal()
//   - status='connected'    → neither rendered
//
// jsdom partially implements showModal() — it sets `open=true` and
// dispatches the dialog into `document.body` regardless of top-layer
// semantics. We assert on `dialog.open`, which is the same flag the
// browser uses to gate the top-layer promotion.
import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { ConnectionStatus } from '@client/connection'
import { ConnectionOverlay } from './ConnectionOverlay'

// jsdom doesn't implement HTMLDialogElement.showModal/close. Polyfill the
// minimum behavior we assert on: toggling the `open` reflected attribute.
// This is enough to verify the structural contract — top-layer pointer-event
// capture itself is a real-browser concern (covered separately via Playwright
// during integration runs).
beforeAll(() => {
  if (typeof HTMLDialogElement === 'undefined') return
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
      this.setAttribute('open', '')
    }
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
      this.removeAttribute('open')
    }
  }
})

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  return () => {
    act(() => { root.unmount() })
    container.remove()
  }
})

function render(status: ConnectionStatus) {
  act(() => { root.render(<ConnectionOverlay status={status} />) })
}

describe('ConnectionOverlay — top-layer guard (triage 001 + 023)', () => {
  it("renders a non-blocking <div role='status'> for 'connecting'", () => {
    render('connecting')
    const transient = container.querySelector('div[role="status"][aria-label="Connection status"]')
    expect(transient, 'transient <div> should render').not.toBeNull()
    const dialog = container.querySelector('dialog') as HTMLDialogElement | null
    expect(dialog?.open ?? false, 'dialog must NOT be opened via showModal').toBe(false)
  })

  it("renders a non-blocking <div role='status'> for 'disconnected'", () => {
    render('disconnected')
    const transient = container.querySelector('div[role="status"][aria-label="Connection status"]')
    expect(transient, 'transient <div> should render').not.toBeNull()
    const dialog = container.querySelector('dialog') as HTMLDialogElement | null
    expect(dialog?.open ?? false, 'dialog must NOT be opened via showModal').toBe(false)
  })

  it("opens the <dialog> via showModal for 'gave-up'", () => {
    render('gave-up')
    const dialog = container.querySelector('dialog') as HTMLDialogElement | null
    expect(dialog, 'dialog should be in tree').not.toBeNull()
    expect(dialog!.open, 'dialog should be open via showModal for terminal state').toBe(true)
    const transient = container.querySelector('div[role="status"][aria-label="Connection status"]')
    expect(transient, 'transient <div> should NOT render alongside terminal modal').toBeNull()
    expect(container.textContent).toContain('CHANNEL DOWN')
    expect(container.textContent).toContain('Refresh')
  })

  it("renders nothing visible for 'connected'", () => {
    render('connected')
    const dialog = container.querySelector('dialog') as HTMLDialogElement | null
    expect(dialog?.open ?? false, 'dialog must be closed').toBe(false)
    const transient = container.querySelector('div[role="status"][aria-label="Connection status"]')
    expect(transient, 'no transient overlay when connected').toBeNull()
  })

  it('closes the modal when transitioning gave-up → connected', () => {
    render('gave-up')
    const dialog = container.querySelector('dialog') as HTMLDialogElement
    expect(dialog.open).toBe(true)
    render('connected')
    expect(dialog.open, 'dialog should close on reconnect').toBe(false)
  })

  it('does not promote to top layer on disconnected → connecting transition', () => {
    // A drop followed by an immediate retry must never call showModal —
    // the transient <div> handles both states.
    render('disconnected')
    let dialog = container.querySelector('dialog') as HTMLDialogElement | null
    expect(dialog?.open ?? false).toBe(false)
    render('connecting')
    dialog = container.querySelector('dialog') as HTMLDialogElement | null
    expect(dialog?.open ?? false, 'connecting must remain non-blocking').toBe(false)
  })
})
