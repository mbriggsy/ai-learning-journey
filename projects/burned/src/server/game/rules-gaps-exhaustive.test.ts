/**
 * Rule-validation gaps flagged by `TODO.md` (G1, G3) plus other
 * `docs/rules/RULES-REFERENCE.md` cases that weren't yet locked by a test.
 *
 * Scope: behaviors that a silent refactor could regress without any existing
 * suite catching it. Every test here ties back to a specific rules-reference
 * section.
 */
import { describe, it, expect } from 'vitest'
import { act, makeCtx, startGameWith, giveCard, removeCardType, resolveNopeWindow } from './test-helpers'
import type { PlayingState } from './types'
import type { CardInstance } from '@shared/types'

/** Overlay a known card on the top of the draw pile. */
function seedTop(state: PlayingState, card: CardInstance): PlayingState {
  return { ...state, drawPile: [card, ...state.drawPile] }
}

describe('Rules §11 — Attack + Defuse multi-turn continuation (TODO gap G3)', () => {
  it('player under Reassign who defuses a Burned still has remaining attack turns', () => {
    // Setup: p1 attacks p2 (fresh turn → p2 gets 2 turns). On turn 1 p2 draws
    // a Burned and plays Extraction. Rules §11: "your current turn ends. You
    // still have remaining turns from the Attack and must continue taking them."
    let state = startGameWith(3)
    state = giveCard(state, 'p1', 'reassign', 'atk-1')

    let result = act(state, { type: 'play-card', playerId: 'p1', cardIds: ['atk-1'] })
    expect(result.ok).toBe(true)
    result = resolveNopeWindow(result.state as PlayingState, makeCtx(99999))
    expect(result.ok).toBe(true)

    let s = result.state as PlayingState
    expect(s.currentTurn.currentPlayerId).toBe('p2')
    expect(s.currentTurn.turnsRemaining).toBe(2)

    // Force top of deck = Burned and ensure p2 has an Extraction.
    s = seedTop(s, { id: 'ek-under-atk', type: 'burned' })
    if (!s.players.find(p => p.id === 'p2')!.hand.some(c => c.type === 'extraction')) {
      s = giveCard(s, 'p2', 'extraction', 'def-p2')
    }

    result = act(s, { type: 'draw-card', playerId: 'p2' })
    expect(result.ok).toBe(true)
    const defuseState = result.state as PlayingState
    expect(defuseState.subPhase).toBe('defuse-pending')

    // Place EK back at position 0 (top) — turn ends, but NOT the attack.
    result = act(defuseState, { type: 'defuse-place', playerId: 'p2', position: 0 })
    expect(result.ok).toBe(true)

    const after = result.state as PlayingState
    // Per rules §11 worked example: B still has 1 remaining turn after defusing
    // on turn 1 of 2. p2 stays the current player with turnsRemaining === 1.
    expect(after.currentTurn.currentPlayerId).toBe('p2')
    expect(after.currentTurn.turnsRemaining).toBe(1)
  })
})

describe('Rules §6 — Intel Briefing mid-turn (TODO gap G1)', () => {
  it('pendingFuture is populated during the play turn, before the player draws', () => {
    let state = startGameWith(3)
    state = giveCard(state, 'p1', 'intel-briefing', 'intel-1')

    let result = act(state, { type: 'play-card', playerId: 'p1', cardIds: ['intel-1'] })
    expect(result.ok).toBe(true)
    result = resolveNopeWindow(result.state as PlayingState, makeCtx(99999))
    expect(result.ok).toBe(true)

    const s = result.state as PlayingState
    // Peek was processed — pendingFuture should hold the top-3 card IDs while
    // the player is still choosing what to do next.
    expect(s.subPhase).toBe('turn-active')
    expect(s.pendingFuture).toBeDefined()
    expect(s.pendingFuture!.cardIds).toHaveLength(3)
    // Turn hasn't rotated.
    expect(s.currentTurn.currentPlayerId).toBe('p1')
  })

  // Regression lock for the shuffle-invalidates-peek fix in `applyShuffle`
  // (engine.ts). If `pendingFuture` still lives after a shuffle, its IDs
  // must still match the current top 3. Current behavior clears the peek,
  // which also satisfies this test.
  it('pendingFuture is cleared (or still valid) when Burn the Files follows Intel Briefing', () => {
    let state = startGameWith(3)
    state = giveCard(state, 'p1', 'intel-briefing', 'intel-a')
    state = giveCard(state, 'p1', 'burn-the-files', 'btf-a')

    let result = act(state, { type: 'play-card', playerId: 'p1', cardIds: ['intel-a'] })
    result = resolveNopeWindow(result.state as PlayingState, makeCtx(99999))
    const afterPeek = result.state as PlayingState
    const peekIds = afterPeek.pendingFuture?.cardIds ?? []
    expect(peekIds).toHaveLength(3)

    result = act(afterPeek, { type: 'play-card', playerId: 'p1', cardIds: ['btf-a'] })
    result = resolveNopeWindow(result.state as PlayingState, makeCtx(99999))
    const afterShuffle = result.state as PlayingState

    // If pendingFuture still exists, its IDs MUST still be the current top 3.
    if (afterShuffle.pendingFuture) {
      const actualTop3 = afterShuffle.drawPile.slice(0, 3).map(c => c.id)
      expect(afterShuffle.pendingFuture.cardIds).toEqual(actualTop3)
    }
  })
})

describe('Rules §9 — Nope chain depth semantics', () => {
  it('depth 3 (triple Nope) cancels the original action', () => {
    // A plays Skip. B Nopes (1). A Nopes (2, "Yup"). B Nopes (3, cancel again).
    let state = startGameWith(2)
    state = giveCard(state, 'p1', 'go-dark', 'skip-chain')
    state = giveCard(state, 'p2', 'intercepted', 'nope-b1')
    state = giveCard(state, 'p1', 'intercepted', 'nope-a1')
    state = giveCard(state, 'p2', 'intercepted', 'nope-b2')

    let result = act(state, { type: 'play-card', playerId: 'p1', cardIds: ['skip-chain'] })
    let s = result.state as PlayingState

    result = act(s, { type: 'nope', playerId: 'p2' })
    s = result.state as PlayingState
    expect(s.nopeWindow!.chainDepth).toBe(1)

    result = act(s, { type: 'nope', playerId: 'p1' })
    s = result.state as PlayingState
    expect(s.nopeWindow!.chainDepth).toBe(2)

    result = act(s, { type: 'nope', playerId: 'p2' })
    s = result.state as PlayingState
    expect(s.nopeWindow!.chainDepth).toBe(3)

    result = resolveNopeWindow(s, makeCtx(99999))
    const final = result.state as PlayingState
    // Depth 3 is odd → original Skip cancelled → p1 still current, turn-active.
    expect(final.subPhase).toBe('turn-active')
    expect(final.currentTurn.currentPlayerId).toBe('p1')
  })

  it('depth 4 (quadruple Nope) allows the original action through', () => {
    let state = startGameWith(2)
    state = giveCard(state, 'p1', 'go-dark', 'skip-quad')
    state = giveCard(state, 'p2', 'intercepted', 'nb1')
    state = giveCard(state, 'p1', 'intercepted', 'na1')
    state = giveCard(state, 'p2', 'intercepted', 'nb2')
    state = giveCard(state, 'p1', 'intercepted', 'na2')

    let result = act(state, { type: 'play-card', playerId: 'p1', cardIds: ['skip-quad'] })
    let s = result.state as PlayingState

    for (const [pid] of [['p2'], ['p1'], ['p2'], ['p1']] as const) {
      result = act(s, { type: 'nope', playerId: pid })
      s = result.state as PlayingState
    }
    expect(s.nopeWindow!.chainDepth).toBe(4)

    result = resolveNopeWindow(s, makeCtx(99999))
    const final = result.state as PlayingState
    // Even depth → Skip resolves → turn passes to p2.
    expect(final.currentTurn.currentPlayerId).toBe('p2')
  })
})

describe('Rules §7 — combo effects override individual card effects', () => {
  it('two Go Dark played as a pair produces a steal, NOT a skipped turn', () => {
    let state = startGameWith(3)
    state = giveCard(state, 'p1', 'go-dark', 'gd-a')
    state = giveCard(state, 'p1', 'go-dark', 'gd-b')

    let result = act(state, {
      type: 'play-card', playerId: 'p1', cardIds: ['gd-a', 'gd-b'], targetPlayerId: 'p2',
    })
    expect(result.ok).toBe(true)

    const pending = result.state as PlayingState
    expect(pending.pendingSteal).toBeDefined()
    expect(pending.pendingSteal?.comboSize).toBe(2)

    result = resolveNopeWindow(pending, makeCtx(99999))
    const final = result.state as PlayingState
    // Combo resolves → steal occurred; turn is still p1's (their turn didn't
    // end, because combo effect — not individual Go Dark skip — applies).
    expect(final.currentTurn.currentPlayerId).toBe('p1')
    expect(final.currentTurn.turnsRemaining).toBe(1)
    // Both Go Dark cards went to discard.
    expect(final.discardPile.some(c => c.id === 'gd-a')).toBe(true)
    expect(final.discardPile.some(c => c.id === 'gd-b')).toBe(true)
  })
})

describe('Rules §10.3 — Back Channel during Attack ends one turn only', () => {
  it('under 2-turn Reassign, Back Channel consumes one turn, leaves one', () => {
    // Reassign from p1 → p2 (turnsRemaining = 2). p2 plays Back Channel.
    let state = startGameWith(3)
    state = giveCard(state, 'p1', 'reassign', 'atk-bc')

    let result = act(state, { type: 'play-card', playerId: 'p1', cardIds: ['atk-bc'] })
    result = resolveNopeWindow(result.state as PlayingState, makeCtx(99999))
    let s = result.state as PlayingState
    expect(s.currentTurn.currentPlayerId).toBe('p2')
    expect(s.currentTurn.turnsRemaining).toBe(2)

    s = giveCard(s, 'p2', 'back-channel', 'bc-1')
    // Force the bottom of the draw pile to be a safe card so the test doesn't
    // race a random Burned — otherwise Back Channel would flip us into
    // defuse-pending instead of a clean turn consumption.
    s = { ...s, drawPile: [...s.drawPile, { id: 'safe-bc-bottom', type: 'go-dark' as const }] }

    result = act(s, { type: 'play-card', playerId: 'p2', cardIds: ['bc-1'] })
    expect(result.ok).toBe(true)
    result = resolveNopeWindow(result.state as PlayingState, makeCtx(99999))

    const final = result.state as PlayingState
    // Draw happened (from bottom), turn consumed. Still p2, 1 turn remaining.
    expect(final.subPhase).toBe('turn-active')
    expect(final.currentTurn.currentPlayerId).toBe('p2')
    expect(final.currentTurn.turnsRemaining).toBe(1)
    // The safe card we seeded at the bottom should now be in p2's hand.
    expect(final.players.find(p => p.id === 'p2')!.hand.some(c => c.id === 'safe-bc-bottom')).toBe(true)
  })
})

describe('Rules §6 — Call in a Favor on 0-card target', () => {
  it('target with literally empty hand auto-resolves, no card moves', () => {
    let state = startGameWith(3)
    state = giveCard(state, 'p1', 'call-in-a-favor', 'fav-empty')
    // Empty p2's hand entirely.
    state = {
      ...state,
      players: state.players.map(p => (p.id === 'p2' ? { ...p, hand: [] } : p)),
    }

    let result = act(state, {
      type: 'play-card', playerId: 'p1', cardIds: ['fav-empty'], targetPlayerId: 'p2',
    })
    expect(result.ok).toBe(true)
    result = resolveNopeWindow(result.state as PlayingState, makeCtx(99999))
    expect(result.ok).toBe(true)

    const final = result.state as PlayingState
    // No favor-pending entered (target has nothing to give).
    expect(final.subPhase).toBe('turn-active')
    expect(final.players.find(p => p.id === 'p2')!.hand).toHaveLength(0)
    // Favor itself still in discard.
    expect(final.discardPile.some(c => c.id === 'fav-empty')).toBe(true)
  })
})

describe('Rules §9 — Burned / Extraction are NOT Nopeable', () => {
  it('drawing a Burned does NOT open a nope window', () => {
    let state = startGameWith(2)
    state = seedTop(state, { id: 'ek-not-nopeable', type: 'burned' })
    if (!state.players[0]!.hand.some(c => c.type === 'extraction')) {
      state = giveCard(state, 'p1', 'extraction', 'def-not-nope')
    }

    const result = act(state, { type: 'draw-card', playerId: 'p1' })
    expect(result.ok).toBe(true)

    const s = result.state as PlayingState
    // Engine enters defuse-pending directly. No nope window between draw and
    // defuse — per rules §9 "drawing a card is not Nopeable".
    expect(s.subPhase).toBe('defuse-pending')
    expect(s.nopeWindow).toBeNull()
  })

  it('playing Extraction to survive a Burned does NOT re-open a nope window', () => {
    let state = startGameWith(2)
    state = seedTop(state, { id: 'ek-def-nope', type: 'burned' })
    if (!state.players[0]!.hand.some(c => c.type === 'extraction')) {
      state = giveCard(state, 'p1', 'extraction', 'def-save')
    }

    let result = act(state, { type: 'draw-card', playerId: 'p1' })
    const defuseState = result.state as PlayingState

    result = act(defuseState, { type: 'defuse-place', playerId: 'p1', position: 0 })
    expect(result.ok).toBe(true)
    const after = result.state as PlayingState
    // Per §9 + §11: "Defuse and its reinsertion are Nope-immune."
    expect(after.nopeWindow).toBeNull()
  })
})

describe('Rules §5 — multiple plays per turn before drawing', () => {
  it('player can chain several non-turn-ending plays before taking the mandatory draw', () => {
    // Intel Briefing (peek) + Burn the Files (shuffle) + draw.
    let state = startGameWith(3)
    state = giveCard(state, 'p1', 'intel-briefing', 'chain-ib')
    state = giveCard(state, 'p1', 'burn-the-files', 'chain-btf')

    let result = act(state, { type: 'play-card', playerId: 'p1', cardIds: ['chain-ib'] })
    result = resolveNopeWindow(result.state as PlayingState, makeCtx(99999))
    let s = result.state as PlayingState
    expect(s.currentTurn.currentPlayerId).toBe('p1')

    result = act(s, { type: 'play-card', playerId: 'p1', cardIds: ['chain-btf'] })
    result = resolveNopeWindow(result.state as PlayingState, makeCtx(99999))
    s = result.state as PlayingState
    expect(s.currentTurn.currentPlayerId).toBe('p1')
    // Drawing ends the turn.
    result = act(s, { type: 'draw-card', playerId: 'p1' })
    expect(result.ok).toBe(true)
    const final = result.state as PlayingState
    // If a Burned wasn't drawn, turn should rotate to p2.
    if (final.subPhase !== 'defuse-pending') {
      expect(final.currentTurn.currentPlayerId).toBe('p2')
    }
  })
})

describe('Rules §12 — eliminated player card disposal', () => {
  it('eliminated cards go to deadCards, NOT the discard pile (§12 correction)', () => {
    let state = startGameWith(3)
    state = seedTop(state, { id: 'ek-elim-2', type: 'burned' })
    state = removeCardType(state, 'p1', 'extraction')
    const discardBefore = state.discardPile.length
    const p1HandBefore = state.players[0]!.hand.length

    const result = act(state, { type: 'draw-card', playerId: 'p1' })
    expect(result.ok).toBe(true)
    const s = result.state as PlayingState
    const p1 = s.players.find(p => p.id === 'p1')!

    expect(p1.isAlive).toBe(false)
    expect(p1.hand).toHaveLength(0)
    // Dead cards land in deadCards, not discard. This is the §12 correction
    // that the PDF disagreed with several web sources on.
    expect(p1.deadCards.length).toBe(p1HandBefore)
    // Discard pile should only gain the Burned card (at most) — not the rest
    // of the dead player's hand. Accept either 0 or 1 new discards depending
    // on where the engine lands the fatal Burned.
    expect(s.discardPile.length - discardBefore).toBeLessThanOrEqual(1)
  })
})

// E2E audit 2026-04-23 A-02/05/06/07/08 — test coverage locks for
// behaviors that are currently correct by construction but untested.
// Silent refactors would regress them without any suite tripping.

describe('Rules §10 — elimination mid-attack collapses remaining turns (A-02)', () => {
  it('when attacked player explodes, remaining attack turns do NOT transfer to next player', () => {
    // p1 Reassigns p2 (2 turns). Stack to 4 turns by faking the state.
    let state = startGameWith(3)
    state = removeCardType(state, 'p2', 'extraction')
    state = { ...state, currentTurn: { currentPlayerId: 'p2', turnsRemaining: 4 } }
    state = seedTop(state, { id: 'ek-mid-atk', type: 'burned' })

    const result = act(state, { type: 'draw-card', playerId: 'p2' })
    expect(result.ok).toBe(true)
    const s = result.state as PlayingState

    // p2 eliminated. Remaining turns on the SEAT evaporate. Next player gets
    // a fresh 1-turn slot. If a future refactor accidentally forwards the
    // residual turns, this test trips — rules ambiguity is locked here.
    expect(s.players.find(p => p.id === 'p2')!.isAlive).toBe(false)
    expect(s.currentTurn.turnsRemaining).toBe(1)
    expect(s.currentTurn.currentPlayerId).not.toBe('p2')
  })
})

describe('Rules §9 — 2-of-a-kind Noped cleanup clears pendingSteal (A-05)', () => {
  it('after a pair is Noped, pendingSteal returns to undefined — no stale context', () => {
    let state = startGameWith(3)
    state = giveCard(state, 'p1', 'reassign', 'pair-a')
    state = giveCard(state, 'p1', 'reassign', 'pair-b')
    state = giveCard(state, 'p3', 'intercepted', 'nope-1')

    let result = act(state, {
      type: 'play-card', playerId: 'p1', cardIds: ['pair-a', 'pair-b'], targetPlayerId: 'p2',
    })
    expect(result.ok).toBe(true)
    let s = result.state as PlayingState
    expect(s.pendingSteal).toBeDefined()

    // p3 Nopes the pair.
    result = act(s, { type: 'nope', playerId: 'p3' })
    expect(result.ok).toBe(true)

    // Resolve to cancellation.
    result = resolveNopeWindow(result.state as PlayingState, makeCtx(99999))
    expect(result.ok).toBe(true)
    s = result.state as PlayingState

    // pendingSteal must be cleared; subPhase back to turn-active.
    expect(s.pendingSteal).toBeUndefined()
    expect(s.subPhase).toBe('turn-active')
  })
})

describe('Rules §7 — 3-of-a-kind cancel-then-reselect works end-to-end (A-06)', () => {
  it('cancel returns cards, SAME triple can be re-played and committed', () => {
    let state = startGameWith(3)
    state = giveCard(state, 'p1', 'reassign', 'triple-a')
    state = giveCard(state, 'p1', 'reassign', 'triple-b')
    state = giveCard(state, 'p1', 'reassign', 'triple-c')

    // Play triple → name-card-pending
    let result = act(state, {
      type: 'play-card', playerId: 'p1', cardIds: ['triple-a', 'triple-b', 'triple-c'], targetPlayerId: 'p2',
    })
    expect(result.ok).toBe(true)
    expect((result.state as PlayingState).subPhase).toBe('name-card-pending')

    // Cancel
    result = act(result.state as PlayingState, { type: 'cancel-name-card', playerId: 'p1' })
    expect(result.ok).toBe(true)
    const afterCancel = result.state as PlayingState
    expect(afterCancel.subPhase).toBe('turn-active')
    expect(afterCancel.pendingNameCard).toBeUndefined()
    const p1Hand = afterCancel.players.find(p => p.id === 'p1')!.hand
    expect(p1Hand.some(c => c.id === 'triple-a')).toBe(true)
    expect(p1Hand.some(c => c.id === 'triple-b')).toBe(true)
    expect(p1Hand.some(c => c.id === 'triple-c')).toBe(true)

    // Re-play the SAME triple, different target this time.
    result = act(afterCancel, {
      type: 'play-card', playerId: 'p1', cardIds: ['triple-a', 'triple-b', 'triple-c'], targetPlayerId: 'p3',
    })
    expect(result.ok).toBe(true)
    expect((result.state as PlayingState).subPhase).toBe('name-card-pending')

    // Commit a name — must land in open nope window.
    result = act(result.state as PlayingState, {
      type: 'name-card', playerId: 'p1', cardType: 'skip',
    } as unknown as Parameters<typeof act>[1])
    expect(result.ok).toBe(true)
    expect((result.state as PlayingState).nopeWindow).toBeDefined()
  })
})

describe('Rules §9 — Favor cannot be Noped after target gives card (A-07)', () => {
  it('favor-give completes without opening a new nope window; late Nope rejected', () => {
    let state = startGameWith(3)
    state = giveCard(state, 'p1', 'call-in-a-favor', 'fav-1')
    state = giveCard(state, 'p3', 'intercepted', 'late-nope')

    let result = act(state, {
      type: 'play-card', playerId: 'p1', cardIds: ['fav-1'], targetPlayerId: 'p2',
    })
    expect(result.ok).toBe(true)
    result = resolveNopeWindow(result.state as PlayingState, makeCtx(99999))
    expect(result.ok).toBe(true)
    const s = result.state as PlayingState
    expect(s.subPhase).toBe('favor-pending')
    expect(s.nopeWindow).toBeNull()

    // p3 tries to Nope at this point — must reject (window closed).
    const lateResult = act(s, { type: 'nope', playerId: 'p3' })
    expect(lateResult.ok).toBe(false)

    // p2 gives a card.
    const p2Card = s.players.find(p => p.id === 'p2')!.hand[0]!
    const giveResult = act(s, { type: 'favor-give', playerId: 'p2', cardId: p2Card.id })
    expect(giveResult.ok).toBe(true)
    const after = giveResult.state as PlayingState

    // No nope window opened after the give.
    expect(after.nopeWindow).toBeNull()
  })
})

describe('Rules §7 — pair of Intercepteds is legal (if silly) (A-08)', () => {
  it('two Intercepteds form a valid pair that performs a random steal', () => {
    let state = startGameWith(3)
    state = giveCard(state, 'p1', 'intercepted', 'nope-pair-a')
    state = giveCard(state, 'p1', 'intercepted', 'nope-pair-b')
    const p2HandBefore = state.players.find(p => p.id === 'p2')!.hand.length

    let result = act(state, {
      type: 'play-card', playerId: 'p1', cardIds: ['nope-pair-a', 'nope-pair-b'], targetPlayerId: 'p2',
    })
    expect(result.ok).toBe(true)
    result = resolveNopeWindow(result.state as PlayingState, makeCtx(99999))
    expect(result.ok).toBe(true)

    const final = result.state as PlayingState
    const p2After = final.players.find(p => p.id === 'p2')!
    // Either the steal succeeded (hand shrunk) or the target was empty. Either
    // way, no error. Future refactor that adds intercepted to combo-excluded
    // categories trips this.
    expect(p2After.hand.length).toBeLessThanOrEqual(p2HandBefore)
  })
})
