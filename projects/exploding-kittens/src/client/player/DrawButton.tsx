import { useSendAction } from '@client/shared/hooks/useSendAction'
import { haptic } from '@client/shared/haptics'
import styles from './DrawButton.module.css'

interface DrawButtonProps {
  readonly visible: boolean
  readonly disabled: boolean
  readonly drawPileCount: number
}

export function DrawButton({ visible, disabled, drawPileCount }: DrawButtonProps) {
  const sendAction = useSendAction()

  if (!visible) return null

  // Intensify when 5 or fewer cards remain — every draw is life or death
  const intense = drawPileCount <= 5

  return (
    <button
      className={`${styles.drawBtn} ${intense ? styles.intense : ''}`}
      disabled={disabled}
      onClick={() => {
        haptic('medium')
        sendAction({ type: 'draw-card' })
      }}
    >
      Draw
    </button>
  )
}
