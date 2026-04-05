import type { UIComponent } from '../types/common.js'
import type { PatternDefinition } from '../patterns/types.js'
import { PATTERNS } from '../patterns/library.js'
import { ELECTRIC_BLUE, AMBER_GOLD, FONT_STACK, PANEL_BG, VOID_BLACK } from './styles.js'

export class PatternSelector implements UIComponent {
  private readonly overlay = document.createElement('div')
  private readonly ac = new AbortController()
  private readonly selectCallbacks: ((pattern: PatternDefinition) => void)[] = []
  private isOpen = false

  mount(parent: HTMLElement): void {
    const o = this.overlay
    o.style.position = 'fixed'
    o.style.inset = '0'
    o.style.background = 'rgba(5, 5, 8, 0.92)'
    o.style.backdropFilter = 'blur(12px)'
    o.style.zIndex = '20'
    o.style.display = 'none'
    o.style.justifyContent = 'center'
    o.style.alignItems = 'center'
    o.style.pointerEvents = 'auto'

    const list = document.createElement('div')
    list.style.display = 'flex'
    list.style.flexDirection = 'column'
    list.style.gap = '8px'
    list.style.maxHeight = '80vh'
    list.style.overflowY = 'auto'
    list.style.padding = '24px'
    list.style.maxWidth = '500px'
    list.style.width = '90vw'

    for (const pattern of PATTERNS) {
      const item = document.createElement('button')
      item.style.display = 'block'
      item.style.width = '100%'
      item.style.textAlign = 'left'
      item.style.background = PANEL_BG
      item.style.border = '1px solid rgba(79, 195, 247, 0.2)'
      item.style.borderRadius = '8px'
      item.style.padding = '12px 16px'
      item.style.cursor = 'pointer'
      item.style.transition = 'border-color 0.15s, background 0.15s'
      item.style.outline = 'none'

      const name = document.createElement('div')
      name.style.color = ELECTRIC_BLUE
      name.style.fontFamily = FONT_STACK
      name.style.fontSize = '16px'
      name.style.fontWeight = '600'
      name.textContent = pattern.cinematicName

      const subtitle = document.createElement('div')
      subtitle.style.color = AMBER_GOLD
      subtitle.style.fontFamily = FONT_STACK
      subtitle.style.fontSize = '12px'
      subtitle.style.opacity = '0.7'
      subtitle.textContent = pattern.conwayName

      const desc = document.createElement('div')
      desc.style.color = '#aaa'
      desc.style.fontFamily = FONT_STACK
      desc.style.fontSize = '13px'
      desc.style.marginTop = '4px'
      desc.textContent = pattern.description

      item.append(name, subtitle, desc)

      item.addEventListener('pointerenter', () => {
        item.style.borderColor = ELECTRIC_BLUE
        item.style.background = 'rgba(79, 195, 247, 0.1)'
      }, { signal: this.ac.signal })
      item.addEventListener('pointerleave', () => {
        item.style.borderColor = 'rgba(79, 195, 247, 0.2)'
        item.style.background = PANEL_BG
      }, { signal: this.ac.signal })
      item.addEventListener('click', () => {
        this.close()
        for (const cb of this.selectCallbacks) cb(pattern)
      }, { signal: this.ac.signal })

      list.appendChild(item)
    }

    o.appendChild(list)

    // Click backdrop to close
    o.addEventListener('click', (e) => {
      if (e.target === o) this.close()
    }, { signal: this.ac.signal })

    parent.appendChild(o)
  }

  open(): void {
    this.isOpen = true
    this.overlay.style.display = 'flex'
  }

  close(): void {
    this.isOpen = false
    this.overlay.style.display = 'none'
  }

  toggle(): void {
    if (this.isOpen) this.close()
    else this.open()
  }

  getIsOpen(): boolean {
    return this.isOpen
  }

  onPatternSelected(cb: (pattern: PatternDefinition) => void): () => void {
    this.selectCallbacks.push(cb)
    return () => {
      const idx = this.selectCallbacks.indexOf(cb)
      if (idx !== -1) this.selectCallbacks.splice(idx, 1)
    }
  }

  dispose(): void {
    this.ac.abort()
    this.overlay.remove()
  }
}
