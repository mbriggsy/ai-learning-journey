// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { act, type ComponentProps } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { LazyMotion, domMax } from 'motion/react'
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
