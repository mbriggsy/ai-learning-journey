import styles from './StatusBar.module.css'

interface StatusBarProps {
  readonly isMyTurn: boolean
  readonly currentPlayerName: string | null
  readonly drawPileCount: number
}

export function StatusBar({ isMyTurn, currentPlayerName, drawPileCount }: StatusBarProps) {
  if (isMyTurn) {
    return <div className={`${styles.statusBar} ${styles.yourTurn}`} data-diag="statusbar">You&rsquo;re up</div>
  }

  return (
    <div className={`${styles.statusBar} ${styles.waiting}`} data-diag="statusbar">
      {currentPlayerName
        ? `${currentPlayerName} is on deck`
        : 'Standing by...'}
      <span className={styles.pileCount}> &middot; {drawPileCount} in the pile</span>
    </div>
  )
}
