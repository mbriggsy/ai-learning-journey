import { m, AnimatePresence } from 'motion/react'
import { MOTION } from '@client/shared/tokens/motion'
import styles from './StatusBar.module.css'

interface StatusBarProps {
  readonly isMyTurn: boolean
  readonly currentPlayerName: string | null
  readonly drawPileCount: number
  /**
   * Forced-draw count from the active turn's `currentTurn.turnsRemaining`,
   * relevant only on `isMyTurn`. When `>1`, an opponent's Direct Order or
   * Reassign has stacked draws on this seat — surface "Under attack" copy
   * so the player isn't surprised when the first draw doesn't end the
   * turn (triage #022). Pass `1` (or omit) for normal turns.
   */
  readonly myTurnsRemaining?: number
  /**
   * Resolved name pair for an in-flight favor exchange where THIS seat is
   * neither the requester nor the target. Phone reads "{requester} coerces
   * {target}" so OTHER-alive players don't mistake the silent ~minutes-long
   * favor-pending wait for a frozen game (triage #005).
   *
   * Pass `null` outside `subPhase: 'favor-pending'`, on the requester's seat,
   * or on the target's seat — they have dedicated affordances (waiting state
   * + staging banner respectively).
   */
  readonly favorOtherContext?: { requesterName: string; targetName: string } | null
  /**
   * Resolved actor name when subPhase is `future-rearrange-pending` and
   * THIS seat is an observer. Phone reads "{actor} is reviewing intel ·
   * rearranging" so OTHER players don't mistake the silent ~30s rearrange
   * phase for a frozen game (close 05-08-2022-5p #003 — observer status
   * strip silent during Falsify Intel rearrange).
   *
   * Pass `null` outside `subPhase: 'future-rearrange-pending'` or on the
   * actor's seat (they have the rearrange sheet itself).
   */
  readonly rearrangeOtherContext?: { actorName: string } | null
}

export function StatusBar({
  isMyTurn,
  currentPlayerName,
  drawPileCount,
  myTurnsRemaining,
  favorOtherContext,
  rearrangeOtherContext,
}: StatusBarProps) {
  const outerClass = `${styles.statusBar} ${isMyTurn ? styles.yourTurn : styles.waiting}`
  const { key, body } = bodyFor(
    isMyTurn,
    currentPlayerName,
    drawPileCount,
    myTurnsRemaining ?? 1,
    favorOtherContext ?? null,
    rearrangeOtherContext ?? null,
  )

  return (
    <div className={outerClass} data-diag="statusbar">
      {/* AnimatePresence with mode="wait" punches the text in/out on state
          change — flipping from "Sable is on deck" to "You're up" is the
          most important transition on the phone, so it gets dedicated motion
          instead of a silent class swap. initial={false} means the mount
          animation is owned by .statusBar's @starting-style, not Framer. */}
      <AnimatePresence mode="wait" initial={false}>
        <m.span
          key={key}
          className={styles.inner}
          initial={{ transform: 'translateY(6px) scale(0.96)', opacity: 0 }}
          animate={{ transform: 'translateY(0px) scale(1)', opacity: 1 }}
          exit={{ transform: 'translateY(-4px) scale(1)', opacity: 0 }}
          transition={MOTION.snappy}
        >
          {body}
        </m.span>
      </AnimatePresence>
    </div>
  )
}

function bodyFor(
  isMyTurn: boolean,
  currentPlayerName: string | null,
  drawPileCount: number,
  myTurnsRemaining: number,
  favorOtherContext: { requesterName: string; targetName: string } | null,
  rearrangeOtherContext: { actorName: string } | null,
): { key: string; body: React.ReactNode } {
  if (isMyTurn) {
    if (myTurnsRemaining > 1) {
      return {
        key: `attacked-${myTurnsRemaining}`,
        body: (
          <>
            Under attack
            <span className={styles.pileCount}> &middot; {myTurnsRemaining} draws</span>
          </>
        ),
      }
    }
    return { key: 'me', body: <>You&rsquo;re up</> }
  }
  // Favor-pending OTHER-alive — neither requester nor target. Replaces the
  // silent "[ACTOR] is on deck · N in the pile" status that read identical
  // to a frozen game during the favor exchange.
  if (favorOtherContext) {
    return {
      key: `favor-${favorOtherContext.requesterName}-${favorOtherContext.targetName}`,
      body: (
        <>
          {favorOtherContext.requesterName} coerces {favorOtherContext.targetName}
          <span className={styles.pileCount}> &middot; favor pending</span>
        </>
      ),
    }
  }
  // Falsify Intel rearrange-pending OTHER-alive — actor is privately
  // rearranging the top 3. Same shape as the favor branch: replaces the
  // silent "[ACTOR] is on deck" with a status that explicitly signals
  // the actor is doing something.
  if (rearrangeOtherContext) {
    return {
      key: `rearrange-${rearrangeOtherContext.actorName}`,
      body: (
        <>
          {rearrangeOtherContext.actorName} is reviewing intel
          <span className={styles.pileCount}> &middot; rearranging</span>
        </>
      ),
    }
  }
  if (currentPlayerName) {
    return {
      key: `wait-${currentPlayerName}`,
      body: (
        <>
          {currentPlayerName} is on deck
          <span className={styles.pileCount}> &middot; {drawPileCount} in the pile</span>
        </>
      ),
    }
  }
  return { key: 'standby', body: 'Standing by...' }
}
