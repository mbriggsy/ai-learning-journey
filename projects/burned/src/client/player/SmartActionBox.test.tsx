// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { act, type ComponentProps } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { LazyMotion, domMax } from 'motion/react'
import type { NopeWindowView } from '@shared/protocol'
import { SmartActionBox } from './SmartActionBox'

type SABProps = ComponentProps<typeof SmartActionBox>

// Insight 037 regression contract — the SmartActionBox `<button>` element
// must NOT unmount across `state.key` changes. The OLD architecture wrapped
// `<m.button>` / `<m.div>` inside `<AnimatePresence mode="wait">`, so any
// state transition (e.g. `target-direct-order` -> `draw`) unmounted the old
// node and mounted a new one. Playwright's MCP wrapper resolves a snapshot
// ref BEFORE the click, then verifies the element AFTER — when the click
// triggers the transition that unmounts the old button, the post-click
// verification throws "node was detached." The fix moves AnimatePresence
// inside the button so only the inner content span swaps.
//
// These tests verify the stable-DOM contract by capturing the button
// reference across renders and asserting object identity.

const noOp = () => {}

const BASE_PROPS: SABProps = {
  cardPlayState: { status: 'idle' },
  isMyTurn: false,
  subPhase: null,
  drawPileCount: 50,
  disabled: false,
  optimisticPending: false,
  nopeWindow: null,
  hasIntercept: false,
  isAlive: true,
  favorMode: null,
  onConfirm: noOp,
  onConfirmWithTarget: noOp,
  onDraw: noOp,
  onIntercept: noOp,
  onSurrender: noOp,
}

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

function render(root: Root, element: React.ReactElement): void {
  act(() => {
    root.render(<LazyMotion features={domMax} strict>{element}</LazyMotion>)
  })
}

describe('SmartActionBox stable-DOM contract (insight 037)', () => {
  it('keeps the same <button> across non-interactive -> interactive transition', () => {
    const { container, root } = mount()
    try {
      // Render 1: not my turn -> state.key = 'standby' (interactive: false)
      render(root,
        <SmartActionBox {...BASE_PROPS} isMyTurn={false} subPhase={null} />,
      )
      const firstButton = container.querySelector('button')
      expect(firstButton).not.toBeNull()
      expect(firstButton!.disabled).toBe(true)

      // Render 2: my turn + turn-active -> state.key = 'draw' (interactive: true)
      render(root,
        <SmartActionBox {...BASE_PROPS} isMyTurn={true} subPhase="turn-active" />,
      )
      const secondButton = container.querySelector('button')
      expect(secondButton).not.toBeNull()
      expect(secondButton).toBe(firstButton) // SAME DOM node — insight 037
      expect(secondButton!.disabled).toBe(false)
    } finally {
      teardown(container, root)
    }
  })

  it('keeps the same <button> across interactive -> interactive transition', () => {
    const { container, root } = mount()
    try {
      // Render 1: my turn idle -> state.key = 'draw' (interactive)
      render(root,
        <SmartActionBox {...BASE_PROPS} isMyTurn={true} subPhase="turn-active" />,
      )
      const firstButton = container.querySelector('button')
      expect(firstButton).not.toBeNull()

      // Render 2: same interactive but different state.key — pretend optimisticPending.
      // Sim a transition by changing drawPileCount which feeds intense-pulse branch.
      // 5 cards left -> drawIntense (still 'draw' state.key but different className).
      render(root,
        <SmartActionBox {...BASE_PROPS} isMyTurn={true} subPhase="turn-active" drawPileCount={5} />,
      )
      const secondButton = container.querySelector('button')
      expect(secondButton).toBe(firstButton)
    } finally {
      teardown(container, root)
    }
  })

  it('keeps the same <button> when interactive flips from true -> false (the insight 037 trigger)', () => {
    // The exact failure mode insight 037 documented: target-${cardType} -> draw
    // after a card plays. Today both states are interactive=true so we can't
    // hit the literal sequence here, but the harder case is interactive
    // BECOMING false (e.g. card consumed, no longer my turn). DOM identity
    // must hold either direction.
    const { container, root } = mount()
    try {
      // Render 1: my turn -> 'draw' state, interactive
      render(root,
        <SmartActionBox {...BASE_PROPS} isMyTurn={true} subPhase="turn-active" />,
      )
      const firstButton = container.querySelector('button')
      expect(firstButton).not.toBeNull()
      expect(firstButton!.disabled).toBe(false)

      // Render 2: not my turn -> 'standby', non-interactive
      render(root,
        <SmartActionBox {...BASE_PROPS} isMyTurn={false} subPhase={null} />,
      )
      const secondButton = container.querySelector('button')
      expect(secondButton).toBe(firstButton)
      expect(secondButton!.disabled).toBe(true)

      // Render 3: back to interactive — node still stable
      render(root,
        <SmartActionBox {...BASE_PROPS} isMyTurn={true} subPhase="turn-active" />,
      )
      const thirdButton = container.querySelector('button')
      expect(thirdButton).toBe(firstButton)
      expect(thirdButton!.disabled).toBe(false)
    } finally {
      teardown(container, root)
    }
  })

  it('always renders exactly one <button> regardless of state', () => {
    // Catches regressions where conditional rendering accidentally re-introduces
    // sibling div/button branches (the pre-insight-037 architecture).
    const { container, root } = mount()
    try {
      const cases: Array<{ label: string; props: Partial<SABProps> }> = [
        { label: 'standby', props: { isMyTurn: false, subPhase: null } },
        { label: 'draw', props: { isMyTurn: true, subPhase: 'turn-active' } },
        {
          label: 'favor-empty',
          props: {
            favorMode: { requesterName: 'Vera' },
            cardPlayState: { status: 'idle' },
          },
        },
      ]
      for (const c of cases) {
        render(root, <SmartActionBox {...BASE_PROPS} {...c.props} />)
        const buttons = container.querySelectorAll('button')
        expect(buttons.length, `case=${c.label}`).toBe(1)
      }
    } finally {
      teardown(container, root)
    }
  })

  it('disables the button when state is non-interactive (no clicks reach handler)', () => {
    const { container, root } = mount()
    try {
      let drawCount = 0
      render(root,
        <SmartActionBox
          {...BASE_PROPS}
          isMyTurn={false}
          subPhase={null}
          onDraw={() => { drawCount++ }}
        />,
      )
      const button = container.querySelector('button')!
      expect(button.disabled).toBe(true)
      // jsdom: <button disabled> swallows click events natively
      act(() => { button.click() })
      expect(drawCount).toBe(0)
    } finally {
      teardown(container, root)
    }
  })
})

// -----------------------------------------------------------------------------
// TODO #11 — chain-burn UX + reactive-card hint.
//
// Bug as reported by playtest agent (run 2026-04-26-1303-3p, seat-1 v1):
//   "Tried to counter-intercept my own Favor being intercepted. Staging
//    shows 'Can't play Intercepted'." → "ACTOR cannot counter-intercept
//    their own intercepted card. UI message opaque — 'Can't play
//    Intercepted' with no explanation."
//
// Engine actually allows ACTOR chain-intercept at chainDepth >= 1
// (engine.ts:980 only rejects self-nope at chainDepth === 0). Pre-fix
// the SmartActionBox check `nopeWindow && !myTurn && isAlive` hid the
// Intercept button from the ACTOR for the entire window — they'd try to
// stage Intercepted from hand and validation hit `single-intercepted`
// with a flat refusal.
//
// Fix: SmartActionBox now exposes the Intercept (Counter) button to the
// ACTOR when chainDepth >= 1. The "single-intercepted" invalid label
// becomes a two-line hint pointing to the right surface for cases where
// the user genuinely tries to play Intercepted outside any window.
// -----------------------------------------------------------------------------

const FAKE_NOW = 1_700_000_000_000

function nopeWindow(chainDepth: number): NopeWindowView {
  return {
    remainingMs: 10_000,
    deadlineMs: FAKE_NOW + 10_000,
    chainDepth,
    startedAtMs: FAKE_NOW,
    generation: chainDepth + 1,
  }
}

describe('SmartActionBox chain-burn UX (TODO #11)', () => {
  it('hides the Intercept button from ACTOR at chainDepth=0 (engine rejects self-nope)', () => {
    const { container, root } = mount()
    try {
      render(root,
        <SmartActionBox
          {...BASE_PROPS}
          isMyTurn={true}
          subPhase="turn-active"
          nopeWindow={nopeWindow(0)}
          hasIntercept={true}
          isAlive={true}
        />,
      )
      const button = container.querySelector('button')!
      // ACTOR at chainDepth=0 — Intercept must NOT be exposed; the
      // SmartActionBox falls through to its normal turn-active state.
      expect(button.textContent ?? '').not.toMatch(/Intercept|Counter/)
    } finally {
      teardown(container, root)
    }
  })

  it('exposes the Counter button to ACTOR at chainDepth>=1 with an Intercept in hand', () => {
    const { container, root } = mount()
    try {
      render(root,
        <SmartActionBox
          {...BASE_PROPS}
          isMyTurn={true}
          subPhase="turn-active"
          nopeWindow={nopeWindow(1)}
          hasIntercept={true}
          isAlive={true}
        />,
      )
      const button = container.querySelector('button')!
      // verb is "Counter" at chainDepth>0 (existing convention preserved)
      expect(button.textContent ?? '').toMatch(/Counter/)
      expect(button.disabled).toBe(false)
    } finally {
      teardown(container, root)
    }
  })

  it('shows the Counter waiting state to ACTOR at chainDepth>=1 without an Intercept', () => {
    const { container, root } = mount()
    try {
      render(root,
        <SmartActionBox
          {...BASE_PROPS}
          isMyTurn={true}
          subPhase="turn-active"
          nopeWindow={nopeWindow(1)}
          hasIntercept={false}
          isAlive={true}
        />,
      )
      const button = container.querySelector('button')!
      expect(button.textContent ?? '').toMatch(/Counter window/)
      expect(button.disabled).toBe(true)
    } finally {
      teardown(container, root)
    }
  })

  it('preserves non-actor Intercept button at chainDepth=0 (no regression)', () => {
    const { container, root } = mount()
    try {
      render(root,
        <SmartActionBox
          {...BASE_PROPS}
          isMyTurn={false}
          subPhase="turn-active"
          nopeWindow={nopeWindow(0)}
          hasIntercept={true}
          isAlive={true}
        />,
      )
      const button = container.querySelector('button')!
      expect(button.textContent ?? '').toMatch(/Intercept/)
      expect(button.disabled).toBe(false)
    } finally {
      teardown(container, root)
    }
  })

  it('fires onIntercept when ACTOR clicks the Counter button at chainDepth>=1', () => {
    const onIntercept = vi.fn()
    const { container, root } = mount()
    try {
      render(root,
        <SmartActionBox
          {...BASE_PROPS}
          isMyTurn={true}
          subPhase="turn-active"
          nopeWindow={nopeWindow(2)}
          hasIntercept={true}
          isAlive={true}
          onIntercept={onIntercept}
        />,
      )
      const button = container.querySelector('button')!
      act(() => { button.click() })
      expect(onIntercept).toHaveBeenCalledOnce()
    } finally {
      teardown(container, root)
    }
  })

  it('eliminated ACTOR sees no Intercept button even at chainDepth>=1', () => {
    // isAlive gate stays — eliminated actors can't act.
    const { container, root } = mount()
    try {
      render(root,
        <SmartActionBox
          {...BASE_PROPS}
          isMyTurn={true}
          subPhase="turn-active"
          nopeWindow={nopeWindow(1)}
          hasIntercept={true}
          isAlive={false}
        />,
      )
      const button = container.querySelector('button')!
      expect(button.textContent ?? '').not.toMatch(/Intercept|Counter/)
    } finally {
      teardown(container, root)
    }
  })
})

describe('SmartActionBox single-intercepted hint (TODO #11)', () => {
  it('renders the two-line "Intercepted is reactive" hint when staged alone', () => {
    const { container, root } = mount()
    try {
      render(root,
        <SmartActionBox
          {...BASE_PROPS}
          isMyTurn={true}
          subPhase="turn-active"
          cardPlayState={{
            status: 'selecting',
            selectedCardIds: ['c1'],
            validation: { valid: false, reason: 'single-intercepted' },
          }}
        />,
      )
      const button = container.querySelector('button')!
      // Primary line states the rule, secondary points at the surface.
      expect(button.textContent ?? '').toContain('Intercepted is reactive')
      expect(button.textContent ?? '').toContain('wait for the Intercept button')
      // No regression of the bare "Can't play Intercepted" copy.
      expect(button.textContent ?? '').not.toMatch(/Can't play Intercepted/)
      // Non-interactive — staging this combination should NOT click anything.
      expect(button.disabled).toBe(true)
    } finally {
      teardown(container, root)
    }
  })
})
