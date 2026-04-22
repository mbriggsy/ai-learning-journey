import { m, AnimatePresence } from 'motion/react'
import { usePendingPrompt, usePlayerList } from '@client/shared/hooks/useSharedSelectors'
import { MOTION } from '@client/shared/tokens/motion'
import { playerName } from './playerName'
import type { BoardPlayer, PendingPromptView } from '@shared/protocol'
import styles from './PendingPromptBanner.module.css'

function getBannerText(prompt: PendingPromptView, players: readonly BoardPlayer[]): string {
  const name = playerName(players, prompt.playerId)
  switch (prompt.type) {
    case 'defuse': return `${name} is reinserting the Burned file…`
    case 'favor-response': return `${name} is handing over a card…`
    case 'future-rearrange': return `${name} is rearranging the intel…`
    case 'name-card': return `${name} is calling the shot…`
  }
}

export function PendingPromptBanner() {
  const prompt = usePendingPrompt()
  const players = usePlayerList()

  // Keyed on playerId:type so a prompt-to-prompt swap (e.g. defuse → favor
  // during the same pause) crossfades via mode="wait" instead of reusing
  // the same DOM node and snapping text mid-read.
  const key = prompt ? `${prompt.playerId}:${prompt.type}` : null

  return (
    <AnimatePresence mode="wait">
      {prompt && (
        <m.div
          key={key}
          className={styles.banner}
          initial={{ opacity: 0, transform: 'translateY(-6px)' }}
          animate={{ opacity: 1, transform: 'translateY(0px)' }}
          exit={{ opacity: 0, transform: 'translateY(-6px)' }}
          transition={MOTION.quickFade}
        >
          {getBannerText(prompt, players)}
        </m.div>
      )}
    </AnimatePresence>
  )
}
