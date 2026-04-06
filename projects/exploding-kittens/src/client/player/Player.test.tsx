// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { Player } from './Player'

describe('Player', () => {
  it('shows no-room-code message without URL param', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    const root = createRoot(container)
    act(() => {
      root.render(<Player />)
    })

    // No ?room= in URL → shows instructions
    expect(container.textContent).toContain('No room code')

    act(() => {
      root.unmount()
    })
    container.remove()
  })
})
