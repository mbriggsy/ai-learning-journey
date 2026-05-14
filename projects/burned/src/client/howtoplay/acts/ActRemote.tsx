import { DossierPage } from '../components/DossierPage'
import { EyebrowLabel } from '../components/EyebrowLabel'
import { Marginalia } from '../components/Marginalia'
import styles from './ActRemote.module.css'

/**
 * Act VIII — Remote Briefing.
 *
 * Spec §8.3 requires remote-play instructions. Short, dispatcher-tone.
 * "Same-room is intent. Remote works."
 */
export function ActRemote() {
  return (
    <section className="act" aria-labelledby="remote-title">
      <DossierPage tilt={0.4} clip="paperclip">
        <Marginalia position="top-right" style="page-num">PG 09 / 10</Marginalia>

        <header className={styles.head}>
          <EyebrowLabel rule>Act VIII · Remote Operations</EyebrowLabel>
          <h2 id="remote-title" className={styles.title}>
            <span aria-hidden="true" className={styles.titleKicker}>Off-site operatives</span>
            <span className={styles.titleMain}>Remote Briefing.</span>
          </h2>
          <p className={styles.lede}>
            BURNED is built for one couch and ten loud humans. It also works
            if your loud humans are elsewhere.
          </p>
        </header>

        <ol className={styles.steps}>
          <li>
            <span className={styles.stepNum} aria-hidden="true">i.</span>
            <div>
              <h3>Host the table.</h3>
              <p>
                Whoever opens the game on a TV, laptop, or iPad{' '}
                <em>is</em> the table. Their screen is the shared board —
                every operative watches it.
              </p>
            </div>
          </li>
          <li>
            <span className={styles.stepNum} aria-hidden="true">ii.</span>
            <div>
              <h3>Share the room code.</h3>
              <p>
                The board displays a six-character code (and a QR). Send it
                in a group chat. Operatives type it into{' '}
                <span className={styles.mono}>burned.pages.dev</span> on their
                phones and join the room.
              </p>
            </div>
          </li>
          <li>
            <span className={styles.stepNum} aria-hidden="true">iii.</span>
            <div>
              <h3>Share your face.</h3>
              <p>
                Open a video call however you usually do it. Point the host
                screen at the camera so remote operatives can see the board.
                BURNED itself does not host chat or video — talking to the
                table is{' '}
                <em>still part of the game</em>, and we won't replace it with
                an inferior chat box.
              </p>
            </div>
          </li>
        </ol>

        <aside className={styles.aside}>
          <EyebrowLabel tone="cream">Lag advisory</EyebrowLabel>
          <p>
            The intercept window is ten seconds. Slow networks burn that
            budget on transit. If a remote operative consistently misses
            their intercept, it isn't strategy — it's latency. Be charitable.
          </p>
        </aside>

        <Marginalia position="bottom-left" style="handwritten" tilt={-2}>
          (preferred over flying back to HQ for a card game)
        </Marginalia>
      </DossierPage>
    </section>
  )
}
