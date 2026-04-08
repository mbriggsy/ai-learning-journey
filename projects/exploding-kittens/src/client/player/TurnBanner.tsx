import styles from './TurnBanner.module.css'

interface TurnBannerProps {
  readonly isMyTurn: boolean
  readonly currentPlayerName: string | null
}

export function TurnBanner({ isMyTurn, currentPlayerName }: TurnBannerProps) {
  if (isMyTurn) {
    return <div className={styles.yourTurn}>Your Turn</div>
  }

  return (
    <div className={styles.waiting}>
      {currentPlayerName ? `Waiting for ${currentPlayerName}...` : 'Waiting...'}
    </div>
  )
}
