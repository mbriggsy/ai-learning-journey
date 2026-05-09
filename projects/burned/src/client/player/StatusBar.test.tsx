// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { LazyMotion, domMax } from 'motion/react'
import { StatusBar } from './StatusBar'

function mount(): { container: HTMLElement; root: Root } {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  return { container, root }
}

function teardown(container: HTMLElement, root: Root): void {
  act(() => { root.unmount() })
  container.remove()
}

function render(root: Root, element: React.ReactElement): void {
  act(() => {
    root.render(<LazyMotion features={domMax} strict>{element}</LazyMotion>)
  })
}

describe('StatusBar — under-attack branch (triage #022)', () => {
  it('renders "Under attack · 2 draws" when isMyTurn && myTurnsRemaining > 1', () => {
    const { container, root } = mount()
    try {
      render(root,
        <StatusBar
          isMyTurn={true}
          currentPlayerName="Me"
          drawPileCount={20}
          myTurnsRemaining={2}
        />,
      )
      const text = container.querySelector('[data-diag="statusbar"]')!.textContent ?? ''
      expect(text).toContain('Under attack')
      expect(text).toContain('2 draws')
    } finally {
      teardown(container, root)
    }
  })

  it('renders "You\'re up" when myTurnsRemaining === 1 (no regression)', () => {
    const { container, root } = mount()
    try {
      render(root,
        <StatusBar
          isMyTurn={true}
          currentPlayerName="Me"
          drawPileCount={20}
          myTurnsRemaining={1}
        />,
      )
      const text = container.querySelector('[data-diag="statusbar"]')!.textContent ?? ''
      expect(text).toMatch(/You.{1,3}re up/) // accept curly apostrophe rendering
      expect(text).not.toContain('Under attack')
    } finally {
      teardown(container, root)
    }
  })

  it('omitting myTurnsRemaining defaults to "You\'re up" (back-compat)', () => {
    const { container, root } = mount()
    try {
      render(root,
        <StatusBar isMyTurn={true} currentPlayerName="Me" drawPileCount={20} />,
      )
      const text = container.querySelector('[data-diag="statusbar"]')!.textContent ?? ''
      expect(text).not.toContain('Under attack')
    } finally {
      teardown(container, root)
    }
  })
})

describe('StatusBar — favor-pending OTHER-alive branch (triage #005)', () => {
  it('renders "{requester} coerces {target} · favor pending" for OTHER-alive seats', () => {
    const { container, root } = mount()
    try {
      render(root,
        <StatusBar
          isMyTurn={false}
          currentPlayerName="Vera"
          drawPileCount={22}
          favorOtherContext={{ requesterName: 'Vera', targetName: 'Janet' }}
        />,
      )
      const text = container.querySelector('[data-diag="statusbar"]')!.textContent ?? ''
      expect(text).toContain('Vera coerces Janet')
      expect(text).toContain('favor pending')
      // The default "Vera is on deck · 22 in the pile" copy must NOT win —
      // that's exactly the read-as-frozen state that triggered the seat-3
      // false suspicion.
      expect(text).not.toContain('on deck')
      expect(text).not.toContain('in the pile')
    } finally {
      teardown(container, root)
    }
  })

  it('falls back to "{name} is on deck" when favorOtherContext is null (no regression)', () => {
    const { container, root } = mount()
    try {
      render(root,
        <StatusBar
          isMyTurn={false}
          currentPlayerName="Vera"
          drawPileCount={22}
          favorOtherContext={null}
        />,
      )
      const text = container.querySelector('[data-diag="statusbar"]')!.textContent ?? ''
      expect(text).toContain('Vera')
      expect(text).toContain('on deck')
      expect(text).toContain('22 in the pile')
    } finally {
      teardown(container, root)
    }
  })

  it('defers to my-turn copy even if favorOtherContext is set (defense-in-depth)', () => {
    // Player.tsx never sets favorOtherContext for the requester or target,
    // but if a future caller bug routed both through, isMyTurn must still
    // win — your own turn copy is the more important read.
    const { container, root } = mount()
    try {
      render(root,
        <StatusBar
          isMyTurn={true}
          currentPlayerName="Me"
          drawPileCount={22}
          favorOtherContext={{ requesterName: 'Vera', targetName: 'Janet' }}
        />,
      )
      const text = container.querySelector('[data-diag="statusbar"]')!.textContent ?? ''
      expect(text).toMatch(/You.{1,3}re up/)
      expect(text).not.toContain('coerces')
    } finally {
      teardown(container, root)
    }
  })
})

describe('StatusBar — rearrange-pending OTHER-alive branch (close 05-08-2022-5p #003)', () => {
  it('renders "{actor} is reviewing intel · rearranging" for OTHER-alive seats during Falsify Intel', () => {
    const { container, root } = mount()
    try {
      render(root,
        <StatusBar
          isMyTurn={false}
          currentPlayerName="Vera"
          drawPileCount={22}
          rearrangeOtherContext={{ actorName: 'Vera' }}
        />,
      )
      const text = container.querySelector('[data-diag="statusbar"]')!.textContent ?? ''
      expect(text).toContain('Vera is reviewing intel')
      expect(text).toContain('rearranging')
      // The silent "Vera is on deck · 22 in the pile" must NOT win — that
      // was the exact read-as-frozen state that 003 surfaced.
      expect(text).not.toContain('on deck')
      expect(text).not.toContain('in the pile')
    } finally {
      teardown(container, root)
    }
  })

  it('falls back to default "{name} is on deck" when rearrangeOtherContext is null', () => {
    const { container, root } = mount()
    try {
      render(root,
        <StatusBar
          isMyTurn={false}
          currentPlayerName="Vera"
          drawPileCount={22}
          rearrangeOtherContext={null}
        />,
      )
      const text = container.querySelector('[data-diag="statusbar"]')!.textContent ?? ''
      expect(text).toContain('on deck')
      expect(text).not.toContain('reviewing intel')
    } finally {
      teardown(container, root)
    }
  })
})
