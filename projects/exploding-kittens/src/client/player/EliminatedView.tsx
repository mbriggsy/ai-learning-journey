import { useMyPlayer, useMyPlayerId } from './hooks/usePlayerSelectors'
import { usePlayerList } from '@client/shared/hooks/useSharedSelectors'
import styles from './EliminatedView.module.css'

export function EliminatedView() {
  const myPlayer = useMyPlayer()
  const players = usePlayerList()
  const myId = useMyPlayerId()
  const alive = players.filter(p => p.isAlive).length
  const total = players.length

  // Calculate rank (alive count + 1 since I just died)
  return (
    <div className={styles.container}>
      <div className={styles.title}>You Exploded!</div>
      <div className={styles.subtitle}>
        Watch the TV for the rest of the game.
        <br />
        {alive} of {total} players remaining.
      </div>
    </div>
  )
}
