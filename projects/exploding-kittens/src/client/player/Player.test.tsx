// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { Player } from './Player'

describe('Player', () => {
  it('renders "Join"', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    const root = createRoot(container)
    act(() => {
      root.render(<Player />)
    })

    expect(container.textContent).toContain('Join')

    act(() => {
      root.unmount()
    })
    container.remove()
  })
})
