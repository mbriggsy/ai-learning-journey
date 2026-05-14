import { DossierPage } from '../components/DossierPage'
import { EyebrowLabel } from '../components/EyebrowLabel'
import { Stamp } from '../components/Stamp'
import { Crest } from '../components/Crest'
import { Marginalia } from '../components/Marginalia'
import { ClassificationBanner } from '../components/ClassificationBanner'
import { RedactBar } from '../components/RedactBar'
import styles from './ActSignoff.module.css'

/**
 * Act IX — Sign-off.
 *
 * M's closing line + final stamps + Pendleton crest as bookend.
 * Phrasing! lands one last time.
 */
export function ActSignoff() {
  return (
    <section className="act" aria-labelledby="signoff-title">
      <DossierPage tilt={-0.3} clip="paperclip">
        <Marginalia position="top-right" style="page-num">PG 10 / 10</Marginalia>

        <ClassificationBanner position="top" tone="red">
          Top Secret // SCI // Operative Eyes Only // No Foreign Nationals
        </ClassificationBanner>

        <header className={styles.head}>
          <EyebrowLabel rule>Act IX · End of File</EyebrowLabel>
        </header>

        <div className={styles.hero}>
          <Crest size="md" className={styles.crest} />

          <div className={styles.signature}>
            <p className={styles.dictation}>
              You've reached the end of the brief. If you remembered any of
              it, I'll consider this a successful Tuesday. If you didn't, do
              try not to embarrass yourself on the first turn.
            </p>
            <p className={styles.dictationTwo}>
              Good luck, operative. Don't burn.{' '}
              <span className={styles.phrasing}>…Phrasing.</span>
            </p>
            <p className={styles.sign}>
              <span aria-hidden="true" className={styles.cursive}>— M.</span>
              <span className={styles.signMeta}>
                Director, The Pendleton Agency
              </span>
            </p>
          </div>

          <div className={styles.closingStamp}>
            <Stamp ink="red" size="lg" tilt={-6} animate="static" caption="13·V·26">
              Case Closed
            </Stamp>
          </div>
        </div>

        <footer className={styles.meta}>
          <p>
            File 47-B archived in the{' '}
            <RedactBar reveal={false} width="6.5em" label="Archive location redacted" />{' '}
            on {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.
          </p>
          <p className={styles.disclaimer}>
            BURNED is an internal training document of The Pendleton Agency.
            Mechanics adapted from Exploding Kittens: Party Pack
            <sup>™</sup> under fair use for educational simulation. No
            operatives were eliminated in the making of this manual. Several
            were almost certainly compromised, but that's a different file.
          </p>
        </footer>

        <ClassificationBanner position="bottom" tone="red">
          Top Secret // SCI // Operative Eyes Only // No Foreign Nationals
        </ClassificationBanner>

        <Marginalia position="bottom-left" style="handwritten" tilt={-2}>
          (Dash insists he co-wrote this. He did not.)
        </Marginalia>
      </DossierPage>
    </section>
  )
}
