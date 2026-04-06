import type { GameEvent } from '@shared/types'
import { TIMING } from '@shared/constants'
import type { AnimationTrigger, RevealPhase } from './types'
import { deriveAnimationTrigger } from './types'

export interface SequencerCallbacks {
  onEkRevealStart(playerId: string): void
  onEkRevealTensionHold(playerId: string): void
  onEkRelief(playerId: string): void
  onEkElimination(playerId: string): void
  onNopeImpact(playerId: string, chainDepth: number): void
  onCardPlay(playerId: string, cardType: string): void
  onTurnChange(playerId: string): void
  onShuffle(): void
  onVictory(winnerId: string): void
  onSequenceComplete(): void
}

/**
 * AnimationSequencer — owns all dramatic animations on the TV board.
 * Receives GameEvent arrays, enqueues triggers, plays as async loop.
 * State guards between steps: if game advances past current animation,
 * the sequencer fast-forwards to current state.
 */
export class AnimationSequencer {
  private queue: AnimationTrigger[] = []
  private running = false
  private revealPhase: RevealPhase = 'idle'
  private disposed = false
  private callbacks: SequencerCallbacks
  private checkState: () => boolean // returns true if game has moved past current animation

  constructor(callbacks: SequencerCallbacks, checkState: () => boolean) {
    this.callbacks = callbacks
    this.checkState = checkState
  }

  /** Feed new events from the store. Derives triggers and enqueues. */
  enqueueEvents(events: readonly GameEvent[]): void {
    for (const event of events) {
      const trigger = deriveAnimationTrigger(event)
      if (trigger) {
        this.queue.push(trigger)
      }
    }
    if (!this.running) {
      void this.processQueue()
    }
  }

  /** Resolve the EK reveal externally (server sent defuse or elimination). */
  resolveReveal(outcome: 'relief' | 'elimination', playerId: string): void {
    if (this.revealPhase === 'tension-hold') {
      if (outcome === 'relief') {
        this.revealPhase = 'relief'
        this.callbacks.onEkRelief(playerId)
      } else {
        this.revealPhase = 'elimination'
        this.callbacks.onEkElimination(playerId)
      }
    }
  }

  dispose(): void {
    this.disposed = true
    this.queue.length = 0
    this.revealPhase = 'idle'
  }

  private async processQueue(): Promise<void> {
    if (this.running || this.disposed) return
    this.running = true

    while (this.queue.length > 0 && !this.disposed) {
      const trigger = this.queue.shift()!

      // State guard: if game has moved on, skip stale animations
      if (this.checkState()) {
        continue
      }

      await this.playTrigger(trigger)
    }

    this.running = false
    if (!this.disposed) {
      this.callbacks.onSequenceComplete()
    }
  }

  private async playTrigger(trigger: AnimationTrigger): Promise<void> {
    switch (trigger.kind) {
      case 'ek-reveal':
        await this.playEkReveal(trigger.playerId)
        break
      case 'nope-impact':
        this.callbacks.onNopeImpact(trigger.playerId, trigger.chainDepth)
        await this.delay(TIMING.NOPE_SHAKE_MS)
        break
      case 'card-play':
        this.callbacks.onCardPlay(trigger.playerId, trigger.cardType)
        await this.delay(TIMING.CARD_PLAY_FLY_MS)
        break
      case 'turn-change':
        this.callbacks.onTurnChange(trigger.playerId)
        await this.delay(TIMING.TURN_PULSE_MS)
        break
      case 'shuffle':
        this.callbacks.onShuffle()
        await this.delay(TIMING.SHUFFLE_MS)
        break
      case 'victory':
        this.callbacks.onVictory(trigger.winnerId)
        break
      case 'defuse-relief':
        // Handled via resolveReveal during EK sequence
        break
      case 'elimination':
        // Handled via resolveReveal during EK sequence
        break
      case 'card-draw':
        await this.delay(TIMING.CARD_DRAW_MS)
        break
      case 'favor-transfer':
        await this.delay(TIMING.FAVOR_TRANSFER_MS)
        break
    }
  }

  private async playEkReveal(playerId: string): Promise<void> {
    this.revealPhase = 'revealing'
    this.callbacks.onEkRevealStart(playerId)

    // Steps 1-5: 2.5s build
    await this.delay(TIMING.EK_REVEAL_MS)

    // Check if game already advanced (reconnection, rapid resolution)
    if (this.checkState() || this.disposed) {
      this.revealPhase = 'idle'
      return
    }

    // Tension hold — wait for resolveReveal() or timeout
    this.revealPhase = 'tension-hold'
    this.callbacks.onEkRevealTensionHold(playerId)

    // Wait up to 30s for resolution, checking periodically
    const start = performance.now()
    while (
      this.revealPhase === 'tension-hold' &&
      !this.disposed &&
      performance.now() - start < 30_000
    ) {
      await this.delay(100)
      if (this.checkState()) {
        this.revealPhase = 'idle'
        return
      }
    }

    // Resolution animation duration
    // Cast required: TS narrows from the assignment above the while loop
    // and doesn't model external mutations via resolveReveal()
    const outcome = this.revealPhase as RevealPhase
    if (outcome === 'relief') {
      await this.delay(TIMING.EK_RELIEF_MS)
    } else if (outcome === 'elimination') {
      await this.delay(TIMING.EK_ELIMINATION_MS)
    }

    this.revealPhase = 'idle'
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
