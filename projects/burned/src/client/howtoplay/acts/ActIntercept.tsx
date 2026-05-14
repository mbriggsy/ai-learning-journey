import { DossierPage } from '../components/DossierPage'
import { EyebrowLabel } from '../components/EyebrowLabel'
import { FileTab } from '../components/FileTab'
import { Marginalia } from '../components/Marginalia'
import { Card } from '../components/Card'
import { Stamp } from '../components/Stamp'
import styles from './ActIntercept.module.css'

interface ChainStep {
  who: string
  card: 'play' | 'intercepted'
  outcome: 'cancelled' | 'proceeds'
  note: string
}

const CHAIN: ChainStep[] = [
  { who: 'Dash plays',     card: 'play',        outcome: 'cancelled', note: 'Direct Order on Vera. Two turns coming.' },
  { who: 'Vera intercepts', card: 'intercepted', outcome: 'cancelled', note: '— it never happened.' },
  { who: 'Sable intercepts', card: 'intercepted', outcome: 'proceeds', note: '— intercepting the intercept. Vera now takes the turns.' },
  { who: 'Neal intercepts',  card: 'intercepted', outcome: 'cancelled', note: '— and now it never happened. Again.' },
]

export function ActIntercept() {
  return (
    <section className="act" aria-labelledby="intercept-title">
      <DossierPage tilt={-0.4} clip="paperclip">
        <FileTab tone="green" top="6%">Intercepts</FileTab>

        <Marginalia position="top-right" style="page-num">PG 07 / 09</Marginalia>

        <header className={styles.head}>
          <EyebrowLabel rule>Act VI · The Intercept Chain</EyebrowLabel>
          <h2 id="intercept-title" className={styles.title}>
            <span aria-hidden="true" className={styles.titleKicker}>Defense doctrine</span>
            <span className={styles.titleMain}>Interception.</span>
          </h2>
          <p className={styles.lede}>
            The <em>Intercepted</em> card is the only operation you may play
            on someone else's turn. Any Intercepted negates the prior card
            outright — even another Intercepted. The chain is{' '}
            <strong>odd-depth: cancelled. Even-depth: proceeds.</strong> Most
            of the table will start counting on their fingers.{' '}
            <span className={styles.phrasing}>…Phrasing.</span>
          </p>
        </header>

        <ol className={styles.chain}>
          {CHAIN.map((step, i) => (
            <li key={i} className={`${styles.step} ${styles[step.outcome]}`}>
              <div className={styles.stepIndex} aria-hidden="true">
                <span>{String(i + 1).padStart(2, '0')}</span>
              </div>
              <div className={styles.stepCard}>
                {step.card === 'play' ? (
                  <Card card="direct-order" size="sm" />
                ) : (
                  <Card card="intercepted" size="sm" treatment="glow" />
                )}
              </div>
              <div className={styles.stepBody}>
                <p className={styles.stepWho}>{step.who}</p>
                <p className={styles.stepNote}>{step.note}</p>
                <p className={styles.stepOutcome}>
                  <span className={styles.outcomeLabel}>Net</span>
                  <Stamp
                    ink={step.outcome === 'cancelled' ? 'red' : 'amber'}
                    size="sm"
                    tilt={-2}
                  >
                    {step.outcome === 'cancelled' ? 'Cancelled' : 'Proceeds'}
                  </Stamp>
                </p>
              </div>
            </li>
          ))}
        </ol>

        <div className={styles.summary}>
          <EyebrowLabel tone="cream">Summary · Operational</EyebrowLabel>
          <ul role="list">
            <li><strong>What can be intercepted:</strong> any action card or combo currently resolving — including another Intercepted.</li>
            <li><strong>What can't:</strong> drawing the Burned card, playing an Extraction, the Extraction's reinsertion, or your own card play (no self-intercepts).</li>
            <li><strong>Window:</strong> a hard 10-second countdown after each card hits the table. When it runs out, the chain resolves. If you didn't see it, you didn't intercept it.</li>
          </ul>
        </div>

        <Marginalia position="bottom-left" style="handwritten" tilt={-1.5}>
          (the deck has 9 of these. there will be enough drama.)
        </Marginalia>
      </DossierPage>
    </section>
  )
}
