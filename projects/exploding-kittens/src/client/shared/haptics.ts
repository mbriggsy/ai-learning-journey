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

export function haptic(preset: HapticPreset): void {
  if (supported) {
    navigator.vibrate(PRESETS[preset])
  }
}
