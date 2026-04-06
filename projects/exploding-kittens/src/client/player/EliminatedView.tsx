import { usePlayerList } from '@client/shared/hooks/useSharedSelectors'
import styles from './EliminatedView.module.css'

export function EliminatedView() {
  const players = usePlayerList()
  const alive = players.filter(p => p.isAlive).length
  const total = players.length

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
