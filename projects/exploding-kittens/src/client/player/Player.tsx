import { useState, useEffect, useCallback, Fragment } from 'react'
import { connect, disconnect, send, onMessage, onStatusChange, getStatus, getSessionToken, setSessionToken } from '@client/connection'
import type { ConnectionStatus } from '@client/connection'
import { gameStore, useGameState } from '@client/shared/gameStore'
import { useSendAction } from '@client/shared/hooks/useSendAction'
import { useGamePhase, usePlayerList, useDrawPileCount, usePendingPrompt } from '@client/shared/hooks/useSharedSelectors'
import { useHand, useIsMyTurn, useSubPhase, useMyPlayerId, useMyPlayer, usePrivateData } from './hooks/usePlayerSelectors'
import { deriveInteractionPermission } from './hooks/useInteractionPermission'
import { useCardPlay } from './hooks/useCardPlay'
import { deriveActiveBottomSheet } from './hooks/useActiveBottomSheet'
import { JoinScreen } from './JoinScreen'
import { Hand } from './Hand'
import { CardConfirmBar } from './CardConfirmBar'
import { DrawButton } from './DrawButton'
import { NopeButton } from './NopeButton'
import { ErrorToast } from './ErrorToast'
import { ConnectionOverlay } from './ConnectionOverlay'
import { EliminatedView } from './EliminatedView'
import { GameOver } from '@client/shared/GameOver'
import { BottomSheet } from '@client/shared/BottomSheet'
import { TargetSelect } from './sheets/TargetSelect'
import { DefusePlacement } from './sheets/DefusePlacement'
import { FuturePeek } from './sheets/FuturePeek'
import { FavorResponse } from './sheets/FavorResponse'
import { NameCard } from './sheets/NameCard'
import type { CardType } from '@shared/types'
import { PARTYKIT_HOST } from '@client/shared/config'
import '@client/shared/theme.css'

function getRoomCodeFromUrl(): string {
  const params = new URLSearchParams(window.location.search)
  return params.get('room') ?? ''
}

export function Player() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(getStatus())
  const [assignedColor, setAssignedColor] = useState<string | null>(null)
  const [roomCode] = useState(getRoomCodeFromUrl)

  useEffect(() => {
    if (!roomCode) return

    const unsubMsg = onMessage(msg => {
      gameStore.handleMessage(msg)
      if (msg.type === 'joined') {
        setSessionToken(roomCode, msg.payload.sessionToken)
        setAssignedColor(msg.payload.color)
      }
    })
    const unsubStatus = onStatusChange(setConnectionStatus)

    const unsubAutoJoin = onStatusChange(s => {
      if (s === 'connected') {
        const token = getSessionToken(roomCode)
        if (token) {
          send({ type: 'join', payload: { name: '', sessionToken: token } })
        }
      }
    })

    connect(roomCode, PARTYKIT_HOST)

    return () => {
      unsubMsg()
      unsubStatus()
      unsubAutoJoin()
      disconnect()
    }
  }, [roomCode])

  if (!roomCode) {
    return <div style={{ padding: 24, color: 'var(--text-primary)', background: 'var(--bg-primary)', minHeight: '100dvh' }}>
      <p>No room code. Scan the QR code on the TV screen.</p>
    </div>
  }

  const handleJoin = (name: string) => {
    const token = getSessionToken(roomCode)
    send({ type: 'join', payload: { name, sessionToken: token ?? undefined } })
  }

  return (
    <>
      <PhoneRouter
        connectionStatus={connectionStatus}
        assignedColor={assignedColor}
        onJoin={handleJoin}
        roomCode={roomCode}
      />
      <ConnectionOverlay status={connectionStatus} />
    </>
  )
}

// --- Phase Router ---

interface PhoneRouterProps {
  connectionStatus: ConnectionStatus
  assignedColor: string | null
  onJoin: (name: string) => void
  roomCode: string
}

function PhoneRouter({ connectionStatus, assignedColor, onJoin, roomCode }: PhoneRouterProps) {
  const state = useGameState()

  if (!state || state.phase === 'lobby') {
    return (
      <JoinScreen
        connectionStatus={connectionStatus}
        assignedColor={assignedColor}
        onJoin={onJoin}
        roomCode={roomCode}
      />
    )
  }

  if (state.phase === 'game_over') {
    const myId = 'myPlayerId' in state ? state.myPlayerId : undefined
    return (
      <Fragment key="game_over">
        <GameOver
          players={state.players}
          winnerId={state.winnerId}
          eliminationOrder={state.eliminationOrder}
          myPlayerId={myId}
        />
      </Fragment>
    )
  }

  return (
    <Fragment key="playing">
      <PlayingView />
    </Fragment>
  )
}

// --- Playing View ---

function PlayingView() {
  // ALL hooks must be called before any conditional returns (Rules of Hooks)
  const hand = useHand()
  const isMyTurn = useIsMyTurn()
  const subPhase = useSubPhase()
  const myPlayerId = useMyPlayerId()
  const myPlayer = useMyPlayer()
  const players = usePlayerList()
  const drawPileCount = useDrawPileCount()
  const pendingPrompt = usePendingPrompt()
  const privateData = usePrivateData()
  const phase = useGamePhase()
  const sendAction = useSendAction()

  const isAlive = myPlayer?.isAlive ?? false

  const { state: cardPlayState, selectedIds, toggleCard, reset: resetCardPlay } = useCardPlay(hand, isMyTurn, subPhase)

  // Local target select for pre-send actions (Favor, Targeted Attack)
  const [localTargetMode, setLocalTargetMode] = useState<{ cardIds: string[]; reason: 'targeted-attack' | 'favor' } | null>(null)

  // Bottom sheet derivation
  const activeSheet = deriveActiveBottomSheet(
    pendingPrompt, myPlayerId, players, hand, drawPileCount, privateData.futureCards,
  )

  // Reset localTargetMode when server state changes underneath
  useEffect(() => {
    setLocalTargetMode(null)
  }, [subPhase, isMyTurn, pendingPrompt])

  // Mutual exclusion: server-prompted sheets take priority over local target
  useEffect(() => {
    if (activeSheet) setLocalTargetMode(null)
  }, [activeSheet])

  const permission = deriveInteractionPermission(
    isMyTurn, subPhase, isAlive, phase, pendingPrompt, myPlayerId,
  )

  // --- Card Play confirm ---
  const handleConfirm = useCallback(() => {
    if (cardPlayState.status !== 'selecting' || !cardPlayState.validation.valid) return

    sendAction({
      type: 'play-card',
      cardIds: [...cardPlayState.selectedCardIds],
    })
    gameStore.applyOptimistic(s => {
      if (s.phase !== 'playing' || !('myHand' in s)) return s
      const removedIds = new Set(cardPlayState.selectedCardIds)
      return { ...s, myHand: s.myHand.filter(c => !removedIds.has(c.id)) }
    })
    resetCardPlay()
  }, [cardPlayState, sendAction, resetCardPlay])

  const handleConfirmWithTarget = useCallback(() => {
    if (cardPlayState.status !== 'selecting' || !cardPlayState.validation.valid) return
    const pt = cardPlayState.validation.playType
    if (pt.kind === 'single' && pt.requiresTarget) {
      setLocalTargetMode({
        cardIds: [...cardPlayState.selectedCardIds],
        reason: pt.cardType === 'favor' ? 'favor' : 'targeted-attack',
      })
    }
  }, [cardPlayState])

  // --- Prompted sheet actions ---
  const handleDefusePlace = useCallback((position: number) => {
    if (position === -1) {
      // "Random" — client picks a position, server validates range
      const randomPos = Math.floor(Math.random() * (drawPileCount + 1))
      sendAction({ type: 'defuse-place', position: randomPos })
    } else {
      sendAction({ type: 'defuse-place', position })
    }
  }, [sendAction, drawPileCount])

  const handleFavorGive = useCallback((cardId: string) => {
    sendAction({ type: 'favor-give', cardId })
  }, [sendAction])

  const handleFutureRearrange = useCallback((order: string[]) => {
    sendAction({ type: 'future-rearrange', order })
  }, [sendAction])

  const handleSelectTarget = useCallback((targetPlayerId: string) => {
    sendAction({ type: 'select-target', targetPlayerId })
  }, [sendAction])

  const handleNameCard = useCallback((cardType: CardType) => {
    sendAction({ type: 'name-card', cardType })
  }, [sendAction])

  const handleLocalTargetSelect = useCallback((targetPlayerId: string) => {
    if (!localTargetMode) return
    sendAction({
      type: 'play-card',
      cardIds: localTargetMode.cardIds,
      targetPlayerId,
    })
    setLocalTargetMode(null)
    resetCardPlay()
  }, [localTargetMode, sendAction, resetCardPlay])

  // --- Conditional render AFTER all hooks ---

  if (!isAlive) return <EliminatedView />

  const needsTarget = cardPlayState.status === 'selecting' &&
    cardPlayState.validation.valid &&
    cardPlayState.validation.playType.kind === 'single' &&
    cardPlayState.validation.playType.requiresTarget

  const eligibleTargets = players.filter(p => p.isAlive && p.id !== myPlayerId)

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100dvh', paddingBottom: '72px' }}>
      <Hand
        hand={hand}
        selectedIds={selectedIds}
        disabled={!permission.allowed}
        onCardClick={toggleCard}
      />

      <CardConfirmBar
        state={cardPlayState}
        onConfirm={needsTarget ? handleConfirmWithTarget : handleConfirm}
        onCancel={resetCardPlay}
      />

      <DrawButton
        visible={isMyTurn && subPhase === 'turn-active'}
        disabled={!permission.allowed || cardPlayState.status !== 'idle'}
      />

      {/* Local target select (pre-send: Favor, Targeted Attack) */}
      <BottomSheet
        open={localTargetMode !== null && !activeSheet}
        onDismiss={() => { setLocalTargetMode(null); resetCardPlay() }}
      >
        {localTargetMode && (
          <TargetSelect
            eligiblePlayers={eligibleTargets}
            onSelectTarget={handleLocalTargetSelect}
            title={localTargetMode.reason === 'favor' ? 'Choose who gives you a card' : 'Choose who to attack'}
          />
        )}
      </BottomSheet>

      {/* Server-prompted bottom sheets */}
      <BottomSheet open={activeSheet?.sheet === 'defuse-placement'}>
        {activeSheet?.sheet === 'defuse-placement' && (
          <DefusePlacement
            maxPosition={activeSheet.maxPosition}
            onPlace={handleDefusePlace}
          />
        )}
      </BottomSheet>

      <BottomSheet open={activeSheet?.sheet === 'favor-response'}>
        {activeSheet?.sheet === 'favor-response' && (
          <FavorResponse
            requesterName={activeSheet.requesterName}
            hand={activeSheet.hand}
            onGiveCard={handleFavorGive}
          />
        )}
      </BottomSheet>

      <BottomSheet open={activeSheet?.sheet === 'future-peek'}>
        {activeSheet?.sheet === 'future-peek' && (
          <FuturePeek
            cards={activeSheet.cards}
            canRearrange={activeSheet.canRearrange}
            onDismiss={() => { /* sheet auto-closes when futureCards clears */ }}
            onRearrange={handleFutureRearrange}
          />
        )}
      </BottomSheet>

      <BottomSheet open={activeSheet?.sheet === 'target-select-prompted'}>
        {activeSheet?.sheet === 'target-select-prompted' && (
          <TargetSelect
            eligiblePlayers={activeSheet.eligiblePlayers}
            onSelectTarget={handleSelectTarget}
          />
        )}
      </BottomSheet>

      <BottomSheet open={activeSheet?.sheet === 'name-card'}>
        {activeSheet?.sheet === 'name-card' && (
          <NameCard
            targetName={activeSheet.targetName}
            onNameCard={handleNameCard}
          />
        )}
      </BottomSheet>

      <NopeButton />
      <ErrorToast />
    </div>
  )
}
