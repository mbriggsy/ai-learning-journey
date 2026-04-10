import styles from './StatusBar.module.css'

interface StatusBarProps {
  readonly isMyTurn: boolean
  readonly currentPlayerName: string | null
  readonly drawPileCount: number
}

export function StatusBar({ isMyTurn, currentPlayerName, drawPileCount }: StatusBarProps) {
  if (isMyTurn) {
    return <div className={styles.yourTurn}>Your Turn</div>
  }

  return (
    <div className={styles.waiting}>
      {currentPlayerName
        ? `Waiting for ${currentPlayerName}`
        : 'Waiting...'}
      <span className={styles.pileInfo}> — {drawPileCount} in pile</span>
    </div>
  )
}
