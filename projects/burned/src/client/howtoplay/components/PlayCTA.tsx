import styles from './PlayCTA.module.css'

/**
 * The "begin the operation" call-to-action — sits at the very end of the
 * dossier and routes the reader back to the live game. Styled as a final
 * page of the file: stamped, signed, ready for action.
 */
export function PlayCTA() {
  return (
    <aside className={styles.cta} aria-label="Play BURNED">
      <div className={styles.inner}>
        <span className={styles.eyebrow}>// Next Steps</span>
        <h2 className={styles.title}>You've Been Briefed.</h2>
        <p className={styles.sub}>
          Now find some operatives, point them at a screen, and see who's
          left at the end.
        </p>
        <a href="/" className={styles.button}>
          <span>Open the Agency</span>
          <span aria-hidden="true" className={styles.arrow}>→</span>
        </a>
        <p className={styles.fineprint}>
          You'll land at the lobby. Tap NEW GAME. The room code's on the screen
          the moment you do.
        </p>
      </div>
    </aside>
  )
}
