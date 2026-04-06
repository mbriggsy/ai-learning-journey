/**
 * Minimal haptic feedback — progressive enhancement, silent no-op when unsupported.
 * Only triggers from user-initiated events (tap/click). Server-push events CANNOT vibrate.
 */

const supported = typeof navigator !== 'undefined' && 'vibrate' in navigator

const PRESETS = {
  light: [10],
  medium: [20],
  heavy: [40],
  success: [10, 50, 20],
} as const

type HapticPreset = keyof typeof PRESETS

let enabled = true

export function setHapticsEnabled(value: boolean): void {
  enabled = value
}

export function getHapticsEnabled(): boolean {
  return enabled
}

export function haptic(preset: HapticPreset): void {
  if (supported && enabled) {
    navigator.vibrate(PRESETS[preset])
  }
}
