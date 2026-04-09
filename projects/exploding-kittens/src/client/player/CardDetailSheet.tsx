import { CARD_DEF_BY_TYPE } from '@shared/card-defs'
import type { CardType } from '@shared/types'
import { CardIcon } from '@client/shared/card-icons'
import styles from './CardDetailSheet.module.css'

interface CardDetailSheetProps {
  readonly cardType: CardType
}

const PLAY_HINTS: Partial<Record<CardType, string>> = {
  'reassign': 'Ends your turn immediately. The next operative must take 2 turns. Stacks with other reassigns.',
  'direct-order': 'Choose any operative for 2 turns. Stacks. Ends your turn.',
  'go-dark': 'Simply ends your turn — you don\'t draw a card.',
  'intel-briefing': 'Privately peek at the top 3 cards of the mission stack.',
  'falsify-intel': 'Peek at top 3 cards, then rearrange them however you want.',
  'burn-the-files': 'Randomly scrambles the entire mission stack.',
  'back-channel': 'Draw from the bottom of the pile instead of the top. Triggers immediately.',
  'call-in-a-favor': 'Pick an operative — they must give you one card of their choice.',
  'intercepted': 'Counter-intel. Cancels any action card. Can be played on anyone\'s turn, any time.',
  'extraction': 'When you draw a Burned card, play this to survive. Reinsert the card secretly.',
  'agent-x': 'Wild card. Counts as any operative type for pairs and triples.',
  'dash-barlowe': 'Powerless alone. Play 2 matching operatives to steal a random card. Play 3 to name and steal.',
  'vera-khan': 'Powerless alone. Play 2 matching operatives to steal a random card. Play 3 to name and steal.',
  'otto-prang': 'Powerless alone. Play 2 matching operatives to steal a random card. Play 3 to name and steal.',
  'janet-broadside': 'Powerless alone. Play 2 matching operatives to steal a random card. Play 3 to name and steal.',
  'neal-proctor': 'Powerless alone. Play 2 matching operatives to steal a random card. Play 3 to name and steal.',
  'burned': 'If you draw this, your cover is blown and you\'re out — unless you have an Extraction.',
}

export function CardDetailSheet({ cardType }: CardDetailSheetProps) {
  const def = CARD_DEF_BY_TYPE[cardType]
  const hint = PLAY_HINTS[cardType]

  return (
    <div className={styles.sheet}>
      <div className={styles.iconWrap}>
        <CardIcon type={cardType} />
      </div>
      <div className={styles.name}>{def.name}</div>
      <div className={styles.category}>{def.category}</div>
      {hint && <div className={styles.hint}>{hint}</div>}
    </div>
  )
}
