/**
 * Per-player icon shapes — primary identity alongside color.
 * Shape is the truth-teller (CVD-safe), color is the emotion.
 *
 * 10 icons, one per player slot. Mapped by color string since
 * that's how players are identified in the protocol.
 */

const ICON_BY_COLOR: Record<string, (props: { size: number; color: string }) => React.JSX.Element> = {
  // 1: Star — #648FFF
  '#648FFF': ({ size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M12 2l2.9 6.3L22 9.3l-5 5.1L18.2 22 12 18.5 5.8 22 7 14.4 2 9.3l7.1-1z" />
    </svg>
  ),
  // 2: Diamond — #FE6100
  '#FE6100': ({ size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M12 2L22 12 12 22 2 12z" />
    </svg>
  ),
  // 3: Circle — #FFB000
  '#FFB000': ({ size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <circle cx="12" cy="12" r="9" />
    </svg>
  ),
  // 4: Heart — #DC267F
  '#DC267F': ({ size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  ),
  // 5: Hexagon — #785EF0
  '#785EF0': ({ size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M12 2l8.66 5v10L12 22 3.34 17V7z" />
    </svg>
  ),
  // 6: Triangle — #00B4A6
  '#00B4A6': ({ size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M12 3L22 21H2z" />
    </svg>
  ),
  // 7: Cross — #FF6B6B
  '#FF6B6B': ({ size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7z" />
    </svg>
  ),
  // 8: Leaf — #8FD14F
  '#8FD14F': ({ size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.71c.69.35 1.52.56 2.41.56C14.46 19.85 21 13 21 3c-2 0-6.5 1-4 5z" />
    </svg>
  ),
  // 9: Square — #C4C4C4
  '#C4C4C4': ({ size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  ),
  // 10: Moon — #FFDAC1
  '#FFDAC1': ({ size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M12 3a9 9 0 109 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 01-4.4 2.26 5.403 5.403 0 01-3.14-9.8C13.06 3.04 12.54 3 12 3z" />
    </svg>
  ),
}

interface PlayerIconProps {
  color: string
  size?: number
}

export function PlayerIcon({ color, size = 16 }: PlayerIconProps) {
  const IconComponent = ICON_BY_COLOR[color]
  if (!IconComponent) {
    // Fallback: filled circle
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <circle cx="12" cy="12" r="9" />
      </svg>
    )
  }
  return <IconComponent size={size} color={color} />
}
