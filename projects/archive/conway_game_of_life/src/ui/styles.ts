// Spec colors
export const VOID_BLACK = '#050508'
export const ELECTRIC_BLUE = '#4FC3F7'
export const AMBER_GOLD = '#FFB300'
export const DEEP_PURPLE = '#CE93D8'
export const PANEL_BG = 'rgba(5, 5, 8, 0.85)'
export const BUTTON_BG = 'rgba(79, 195, 247, 0.15)'
export const BUTTON_HOVER = 'rgba(79, 195, 247, 0.3)'
export const BUTTON_ACTIVE = 'rgba(79, 195, 247, 0.5)'
export const FONT_STACK = 'system-ui, -apple-system, sans-serif'

export function applyButtonStyle(el: HTMLButtonElement): void {
  el.style.background = BUTTON_BG
  el.style.color = ELECTRIC_BLUE
  el.style.border = `1px solid rgba(79, 195, 247, 0.3)`
  el.style.borderRadius = '4px'
  el.style.padding = '6px 12px'
  el.style.fontFamily = FONT_STACK
  el.style.fontSize = '13px'
  el.style.cursor = 'pointer'
  el.style.transition = 'background 0.15s'
  el.style.outline = 'none'

  el.addEventListener('pointerenter', () => { el.style.background = BUTTON_HOVER })
  el.addEventListener('pointerleave', () => {
    el.style.background = el.dataset['active'] === 'true' ? BUTTON_ACTIVE : BUTTON_BG
  })
}

export function setButtonActive(el: HTMLButtonElement, active: boolean): void {
  el.dataset['active'] = String(active)
  el.style.background = active ? BUTTON_ACTIVE : BUTTON_BG
}

export function applyPanelStyle(el: HTMLElement): void {
  el.style.background = PANEL_BG
  el.style.backdropFilter = 'blur(8px)'
  el.style.borderRadius = '8px'
  el.style.padding = '8px'
  el.style.display = 'flex'
  el.style.gap = '6px'
  el.style.alignItems = 'center'
}

export function isMobile(): boolean {
  return window.matchMedia('(max-width: 768px)').matches
}
