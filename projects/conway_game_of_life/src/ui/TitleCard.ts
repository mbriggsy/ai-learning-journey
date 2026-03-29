import type { UIComponent } from '../types/common.js'
import type { PatternDefinition } from '../patterns/types.js'
import { ELECTRIC_BLUE, AMBER_GOLD, FONT_STACK } from './styles.js'

export class TitleCard implements UIComponent {
  private readonly overlay = document.createElement('div')
  private readonly ac = new AbortController()
  private currentAnimation: Animation | null = null
  private currentResolve: (() => void) | null = null

  mount(parent: HTMLElement): void {
    const o = this.overlay
    o.style.position = 'fixed'
    o.style.inset = '0'
    o.style.zIndex = '30'
    o.style.display = 'none'
    o.style.justifyContent = 'center'
    o.style.alignItems = 'center'
    o.style.textAlign = 'center'
    o.style.pointerEvents = 'auto'
    o.style.background = 'rgba(5, 5, 8, 0.7)'
    o.style.cursor = 'pointer'

    // Click to dismiss
    o.addEventListener('click', () => this.dismiss(), { signal: this.ac.signal })

    parent.appendChild(o)
  }

  show(pattern: PatternDefinition): Promise<void> {
    return new Promise((resolve) => {
      this.currentResolve = resolve
      const o = this.overlay

      // Clear previous content safely
      while (o.firstChild) o.removeChild(o.firstChild)

      const container = document.createElement('div')

      const name = document.createElement('div')
      name.style.color = ELECTRIC_BLUE
      name.style.fontFamily = FONT_STACK
      name.style.fontSize = '48px'
      name.style.fontWeight = '700'
      name.style.textShadow = `0 0 40px ${ELECTRIC_BLUE}`
      name.textContent = pattern.cinematicName

      const subtitle = document.createElement('div')
      subtitle.style.color = AMBER_GOLD
      subtitle.style.fontFamily = FONT_STACK
      subtitle.style.fontSize = '18px'
      subtitle.style.marginTop = '8px'
      subtitle.style.opacity = '0.8'
      subtitle.textContent = pattern.conwayName

      const desc = document.createElement('div')
      desc.style.color = '#aaa'
      desc.style.fontFamily = FONT_STACK
      desc.style.fontSize = '14px'
      desc.style.marginTop = '12px'
      desc.textContent = pattern.description

      container.append(name, subtitle, desc)
      o.appendChild(container)
      o.style.display = 'flex'

      // Animate: fade in → hold → fade out
      this.currentAnimation = o.animate([
        { opacity: 0 },
        { opacity: 1, offset: 0.14 },  // 300ms in
        { opacity: 1, offset: 0.86 },  // hold until 1800ms
        { opacity: 0 },                 // fade out by 2100ms
      ], { duration: 2100, fill: 'forwards' })

      this.currentAnimation.onfinish = () => {
        o.style.display = 'none'
        this.currentAnimation = null
        this.currentResolve?.()
        this.currentResolve = null
      }
    })
  }

  private dismiss(): void {
    if (this.currentAnimation) {
      this.currentAnimation.cancel()
      this.currentAnimation = null
    }
    this.overlay.style.display = 'none'
    this.overlay.style.opacity = '0'
    this.currentResolve?.()
    this.currentResolve = null
  }

  dispose(): void {
    this.ac.abort()
    if (this.currentAnimation) this.currentAnimation.cancel()
    this.overlay.remove()
  }
}
