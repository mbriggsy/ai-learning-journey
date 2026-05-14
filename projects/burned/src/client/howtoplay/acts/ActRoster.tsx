import { DossierPage } from '../components/DossierPage'
import { EyebrowLabel } from '../components/EyebrowLabel'
import { Marginalia } from '../components/Marginalia'
import { Stamp } from '../components/Stamp'
import styles from './ActRoster.module.css'

interface OperativeDef {
  codename: string
  legal: string
  threat: 'green' | 'amber' | 'red' | 'unknown'
  portrait: string
  lastSeen: string
  blurb: string
  /** Optional final beat that hangs off the dossier — usually a Phrasing! pivot. */
  flourish?: string
}

const OPERATIVES: OperativeDef[] = [
  {
    codename: 'Dash Barlowe',
    legal: 'Sterling D. Barlowe-Cox III',
    threat: 'amber',
    portrait: '/assets/roster/dash-barlowe.png',
    lastSeen: 'The bar. Always the bar.',
    blurb:
      "Pendleton's top-rated field operative, by which we mean he has the highest expense report and survives most of it. Fluent in seven languages, three of which are martini orders.",
    flourish: "Tell him you read his file. He's been waiting. …Phrasing.",
  },
  {
    codename: 'Vera Khan',
    legal: 'Veronika S. Khan',
    threat: 'red',
    portrait: '/assets/roster/vera-khan.png',
    lastSeen: 'Returning Dash to extraction. Again.',
    blurb:
      "Single mother. Black belt. Sniper-qualified. The only operative in the building who has never lost a file, missed a debrief, or had a feeling about it. Dash thinks they're partners.",
  },
  {
    codename: 'Sable Ashworth',
    legal: 'Sabine A. Ashworth-Tunt',
    threat: 'unknown',
    portrait: '/assets/roster/sable-ashworth.png',
    lastSeen: 'Allegedly the supply closet.',
    blurb:
      "Pendleton heiress. Hired against everyone's better judgment. Has set the supply closet on fire on three separate occasions and refuses to discuss any of them.",
    flourish: 'Do not let her near the deck. Or the matches. …Phrasing.',
  },
  {
    codename: 'Janet Broadside',
    legal: 'M.',
    threat: 'red',
    portrait: '/assets/roster/janet-broadside.png',
    lastSeen: 'Her office. The door is open. It is not an invitation.',
    blurb:
      "Director of The Pendleton Agency. Trained operatives in four different decades. Fires people while sipping bourbon at ten in the morning. Wrote this manual. Don't tell her you skimmed it.",
  },
  {
    codename: 'Neal Proctor',
    legal: 'Neal H. Proctor',
    threat: 'green',
    portrait: '/assets/roster/neal-proctor.png',
    lastSeen: 'Accounting. Reconciling Dash’s expense report.',
    blurb:
      "Comptroller. Field-qualified, technically. Once defused a hostile situation with a spreadsheet. Largely overlooked, which is exactly how he prefers it, and exactly why you should stop overlooking him.",
  },
  {
    codename: 'Agent X',
    legal: '— unknown —',
    threat: 'unknown',
    portrait: '/assets/roster/agent-x.png',
    lastSeen: 'Three places at once. None of them ours.',
    blurb:
      "Wild card. Loyalty unverified. Photograph captured by a security camera that briefly malfunctioned the moment of exposure. Pendleton officially denies Agent X exists; unofficially, half the deck is rigged in their favor.",
  },
]

const THREAT_LABEL: Record<OperativeDef['threat'], string> = {
  green: 'Low',
  amber: 'Moderate',
  red: 'Severe',
  unknown: '— Classified —',
}

export function ActRoster() {
  return (
    <section className="act" aria-labelledby="roster-title">
      <DossierPage tilt={-0.3} clip="paperclip">
        <Marginalia position="top-right" style="page-num">PG 03 / 10</Marginalia>

        <header className={styles.head}>
          <EyebrowLabel rule>Act II · Personnel Dossiers</EyebrowLabel>
          <h2 id="roster-title" className={styles.title}>
            <span aria-hidden="true" className={styles.titleKicker}>Active operatives</span>
            <span className={styles.titleMain}>The Roster.</span>
          </h2>
          <p className={styles.lede}>
            These are the operatives in the deck. You will play as one. You
            will be hunted by the others. You will, at some point, be asked
            to favor one of them — and at some point, to leave one to burn.
            Knowing the file is the first half of the job.
          </p>
        </header>

        <ul className={styles.grid} role="list">
          {OPERATIVES.map((op) => (
            <li key={op.codename} className={styles.card}>
              <div className={styles.photoFrame}>
                <span aria-hidden="true" className={styles.tape} />
                <img
                  src={op.portrait}
                  alt={`Operative portrait, ${op.codename}`}
                  className={styles.photo}
                  loading="lazy"
                />
                <Stamp ink="red" size="sm" tilt={-6} className={styles.photoStamp}>
                  File 47-B
                </Stamp>
              </div>

              <div className={styles.cardBody}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.codename}>{op.codename}</h3>
                  <p className={styles.legalName}>{op.legal}</p>
                </div>

                <dl className={styles.facts}>
                  <div className={styles.factRow}>
                    <dt>Threat</dt>
                    <dd>
                      <span
                        aria-hidden="true"
                        className={`${styles.threatDot} ${styles[`threat-${op.threat}`]}`}
                      />
                      {THREAT_LABEL[op.threat]}
                    </dd>
                  </div>
                  <div className={styles.factRow}>
                    <dt>Last Seen</dt>
                    <dd>{op.lastSeen}</dd>
                  </div>
                </dl>

                <p className={styles.blurb}>{op.blurb}</p>

                {op.flourish ? <p className={styles.flourish}>{op.flourish}</p> : null}
              </div>
            </li>
          ))}
        </ul>

        <aside className={styles.aside}>
          <EyebrowLabel tone="cream">Footnote · Personnel</EyebrowLabel>
          <p>
            Otto, our resident scientist, is on the roster but{' '}
            <strong>not in the deck.</strong> He's busy with the{' '}
            <span className={styles.parenthetical}>(unsanctioned, off-books, almost certainly illegal)</span>{' '}
            research budget. We'll see him in a later case file.
          </p>
        </aside>

        <Marginalia position="bottom-right" style="handwritten" tilt={-2}>
          (Dash insists he is &quot;Severe.&quot; He is not.)
        </Marginalia>
      </DossierPage>
    </section>
  )
}
