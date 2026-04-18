import { useNopeWindow, useStateVersion } from '@client/shared/hooks/useSharedSelectors'
import { useNopeCountdown } from '@client/shared/hooks/useNopeCountdown'
import styles from './NopeCountdownBar.module.css'

export function NopeCountdownBar() {
  const nopeWindow = useNopeWindow()
  const stateVersion = useStateVersion()
  const { barRef, secondsLeft, isActive } = useNopeCountdown(nopeWindow, stateVersion)

  if (!isActive) return null

  return (
    <div>
      <div className={styles.container}>
        <div ref={barRef} className={styles.fill} />
      </div>
      <div className={styles.text}>INTERCEPT? {secondsLeft}s</div>
    </div>
  )
}
