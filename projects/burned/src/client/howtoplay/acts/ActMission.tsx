import { DossierPage } from '../components/DossierPage'
import { EyebrowLabel } from '../components/EyebrowLabel'
import { Marginalia } from '../components/Marginalia'
import { RedactBar } from '../components/RedactBar'
import { Stamp } from '../components/Stamp'
import styles from './ActMission.module.css'

/**
 * Act I — The Mission.
 *
 * M's voice. Three short paragraphs of brief, written as if M is dictating
 * to a stenographer. Typewriter inks each line. The signoff is the first
 * Phrasing! beat of the document.
 */
export function ActMission() {
  return (
    <section className="act" aria-labelledby="mission-title">
      <DossierPage tilt={0.5} clip="paperclip">
        <Marginalia position="top-right" style="page-num">PG 02 / 10</Marginalia>

        <header className={styles.head}>
          <EyebrowLabel rule>Act I · Briefing — Originator: M.</EyebrowLabel>
          <h2 id="mission-title" className={styles.title}>
            <span aria-hidden="true" className={styles.titleKicker}>From M's desk</span>
            <span className={styles.titleMain}>The Mission.</span>
          </h2>
        </header>

        <article className={styles.brief}>
          <p className={styles.lede}>
            Good morning, operative. You are reading this because somebody
            with my clearance level — fine, <em>me</em> — decided you could
            be trusted with a card game. Try not to make me look foolish.
          </p>

          <ol className={styles.beats}>
            <li>
              <span className={styles.beatNum} aria-hidden="true">I.</span>
              <p>
                <strong>You are an operative of The Pendleton Agency.</strong>{' '}
                So is everyone else at this table — most of whom you don't
                trust and at least one of whom is{' '}
                <RedactBar reveal width="6.5em" label="actively trying to ruin your morning">
                  actively trying to ruin your morning
                </RedactBar>.
              </p>
            </li>

            <li>
              <span className={styles.beatNum} aria-hidden="true">II.</span>
              <p>
                <strong>The deck is a series of operations.</strong> On your
                turn, play any cards you like, then draw one. One of those
                cards — the one marked <em>Burned</em> — ends your career
                instantly. The rest of the deck exists to help you survive it,
                or to make sure your colleagues don't.
              </p>
            </li>

            <li>
              <span className={styles.beatNum} aria-hidden="true">III.</span>
              <p>
                <strong>The last operative standing wins.</strong> Possibly
                you. Probably Vera. Statistically not Neal, but Neal has had a
                rough year and we should let him have this.
              </p>
            </li>
          </ol>

          <div className={styles.signoff}>
            <Stamp ink="amber" size="sm" tilt={-3}>Approved</Stamp>
            <p className={styles.signoffText}>
              Good luck. Try to look like you've done this before.{' '}
              <span className={styles.phrasing}>…Phrasing.</span>
            </p>
            <p className={styles.signoffLine}>
              <span aria-hidden="true" className={styles.cursive}>— M.</span>{' '}
              <span className={styles.signoffMeta}>
                Director, Pendleton Agency · 13·V·26
              </span>
            </p>
          </div>
        </article>

        <Marginalia position="bottom-left" style="handwritten" tilt={-2}>
          (note: Janet says she's just &quot;M&quot; now)
        </Marginalia>
      </DossierPage>
    </section>
  )
}
