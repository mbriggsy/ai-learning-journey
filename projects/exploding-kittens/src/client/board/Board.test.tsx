// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { Board } from './Board'

describe('Board', () => {
  it('renders "Exploding Kittens Digital"', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    const root = createRoot(container)
    act(() => {
      root.render(<Board />)
    })

    expect(container.textContent).toContain('Exploding Kittens Digital')

    act(() => {
      root.unmount()
    })
    container.remove()
  })
})
