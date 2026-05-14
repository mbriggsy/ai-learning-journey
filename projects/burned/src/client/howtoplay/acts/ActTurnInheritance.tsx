import { DossierPage } from '../components/DossierPage'
import { EyebrowLabel } from '../components/EyebrowLabel'
import { Marginalia } from '../components/Marginalia'
import { Card, type CardKey } from '../components/Card'
import { Stamp } from '../components/Stamp'
import styles from './ActTurnInheritance.module.css'

/**
 * Act VI — Turn Inheritance.
 *
 * Reassign and Direct Order STACK. Each pass adds two more turns to
 * whatever is already owed. Briefly: this is the most-played dynamic
 * at the table, and the most likely to spark "wait, how many turns do
 * I have now?" disputes. Pattern parallels the Intercept Chain act
 * (which follows this one) — a card-by-card chain visualization with
 * per-step "now N turns" stamps, then a summary box.
 *
 * Source rule: `docs/RULES-REFERENCE.md` §10 — formula
 *   new_target_turns = victim_remaining_turns + 2
 */

interface ChainStep {
  /** Who acts in this step. */
  who: string
  /** Which card lands on the table for this step. */
  card: CardKey
  /** Free-form explanatory line. */
  note: string
  /** Turns owed to the receiving player AFTER this step resolves. */
  owed: number
}

const CHAIN: ChainStep[] = [
  {
    who: 'Dash plays Reassign',
    card: 'reassign',
    note: 'Dash ends his turn without drawing. Vera (next in line) inherits the burden.',
    owed: 2,
  },
  {
    who: 'Vera plays Reassign — on turn 1 of 2',
    card: 'reassign',
    note: 'Vera punts to the next in line — Sable. The math: 1 remaining + 2 new = 3.',
    owed: 3,
  },
  {
    who: 'Sable plays Direct Order on Neal — on turn 1 of 3',
    card: 'direct-order',
    note: "Sable jumps the chain. Targeted Attack picks anyone — even across the table. Neal: 2 remaining + 2 new = 4.",
    owed: 4,
  },
  {
    who: 'Neal plays Go Dark — on turn 1 of 4',
    card: 'go-dark',
    note: 'Go Dark ends ONE turn, not the whole stack. Neal still has 3 to take. He has feelings about this.',
    owed: 3,
  },
]

export function ActTurnInheritance() {
  return (
    <section className="act" aria-labelledby="inheritance-title">
      <DossierPage tilt={0.3} clip="paperclip">
        <Marginalia position="top-right" style="page-num">PG 07 / 10</Marginalia>

        <header className={styles.head}>
          <EyebrowLabel rule>Act VI · Turn Inheritance</EyebrowLabel>
          <h2 id="inheritance-title" className={styles.title}>
            <span aria-hidden="true" className={styles.titleKicker}>Stack discipline</span>
            <span className={styles.titleMain}>Inheritance.</span>
          </h2>
          <p className={styles.lede}>
            <em>Reassign</em> and <em>Direct Order</em> end your turn
            without drawing — the cost is whoever you punt to takes{' '}
            <strong>two turns in a row</strong>. The catch: if they hold a{' '}
            <em>Reassign</em> or <em>Direct Order</em> of their own, they can
            punt the burden forward. Each pass{' '}
            <strong>adds two more</strong>. By the time it lands, someone is
            taking five turns in a row.{' '}
            <span className={styles.phrasing}>…Phrasing.</span>
          </p>
        </header>

        <ol className={styles.chain}>
          {CHAIN.map((step, i) => (
            <li key={i} className={styles.step}>
              <div className={styles.stepIndex} aria-hidden="true">
                <span>{String(i + 1).padStart(2, '0')}</span>
              </div>
              <div className={styles.stepCard}>
                <Card card={step.card} size="sm" />
              </div>
              <div className={styles.stepBody}>
                <p className={styles.stepWho}>{step.who}</p>
                <p className={styles.stepNote}>{step.note}</p>
                <p className={styles.stepOutcome}>
                  <span className={styles.outcomeLabel}>Owed</span>
                  <Stamp ink="red" size="sm" tilt={-2}>
                    {step.owed} {step.owed === 1 ? 'turn' : 'turns'}
                  </Stamp>
                </p>
              </div>
            </li>
          ))}
        </ol>

        <div className={styles.summary}>
          <EyebrowLabel tone="cream">Summary · Operational</EyebrowLabel>
          <ul role="list">
            <li>
              <strong>Formula:</strong> inheritance = <em>remaining turns</em>{' '}
              + 2. New turns piggyback on what's already owed; they don't
              reset the counter.
            </li>
            <li>
              <strong>Reassign vs Direct Order:</strong> Reassign passes to
              the next operative in line. Direct Order picks any target —
              cross the table, break a chain coming back to you, or saddle
              the operative who already had it coming.
            </li>
            <li>
              <strong>Go Dark cancels one turn,</strong> not the whole
              stack. Two Go Darks cancel two. Hoard accordingly.
            </li>
            <li>
              <strong>The stack is interceptable.</strong> Any card in the
              chain — including the original Reassign — can be cancelled by
              an <em>Intercepted</em>. See the next page.
            </li>
          </ul>
        </div>

        <Marginalia position="bottom-left" style="handwritten" tilt={-1}>
          (Neal has been taking five turns in a row since 1998.)
        </Marginalia>
      </DossierPage>
    </section>
  )
}
