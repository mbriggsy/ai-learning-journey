import { useSendAction } from '@client/shared/hooks/useSendAction'
import { haptic } from '@client/shared/haptics'
import styles from './DrawButton.module.css'

interface DrawButtonProps {
  readonly visible: boolean
  readonly disabled: boolean
}

export function DrawButton({ visible, disabled }: DrawButtonProps) {
  const sendAction = useSendAction()

  if (!visible) return null

  return (
    <button
      className={styles.drawBtn}
      disabled={disabled}
      onClick={() => {
        haptic('light')
        sendAction({ type: 'draw-card' })
      }}
    >
      Draw Card
    </button>
  )
}
