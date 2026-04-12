import { useState, useEffect, useCallback, useMemo, Fragment, lazy, Suspense } from 'react'
import { connect, disconnect, send, onMessage, onStatusChange, onReconnect, getStatus, getSessionToken, setSessionToken } from '@client/connection'
import type { ConnectionStatus } from '@client/connection'
import { gameStore, useGameState, useProtocolMismatch, useIsOptimisticPending } from '@client/shared/gameStore'
import { useSendAction } from '@client/shared/hooks/useSendAction'
import { useGamePhase, usePlayerList, useDrawPileCount, usePendingPrompt } from '@client/shared/hooks/useSharedSelectors'
import { useHand, useIsMyTurn, useSubPhase, useMyPlayerId, useMyPlayer, usePrivateData } from './hooks/usePlayerSelectors'
import { useSortedHand } from './hooks/useSortedHand'
import { useCurrentTurn } from '@client/shared/hooks/useSharedSelectors'
import { deriveInteractionPermission } from './hooks/useInteractionPermission'
import { useCardPlay } from './hooks/useCardPlay'
import { deriveActiveBottomSheet } from './hooks/useActiveBottomSheet'
import { useWakeLock } from '@client/shared/hooks/useWakeLock'
import { JoinScreen } from './JoinScreen'
import { Hand } from './Hand'
import { StagingArea } from './StagingArea'
import { FloatingActionButton } from './FloatingActionButton'
import { ErrorToast } from './ErrorToast'
import { ConnectionOverlay } from './ConnectionOverlay'
import { EliminatedView } from './EliminatedView'
import { TitleBar } from './TitleBar'
import { StatusBar } from './StatusBar'
import { GameOver } from '@client/shared/GameOver'
const DramaOverlay = lazy(() => import('@client/shared/DramaOverlay').then(m => ({ default: m.DramaOverlay })))
import { BottomSheet } from '@client/shared/BottomSheet'
import { TargetSelect } from './sheets/TargetSelect'
import { DefusePlacement } from './sheets/DefusePlacement'
import { FuturePeek } from './sheets/FuturePeek'
import { FavorResponse } from './sheets/FavorResponse'
import { NameCard } from './sheets/NameCard'
import { CardDetailSheet } from './CardDetailSheet'
import type { CardType } from '@shared/types'
import { PARTYKIT_HOST } from '@client/shared/config'
import playingStyles from './PlayingView.module.css'

function getRoomCodeFromUrl(): string {
  const params = new URLSearchParams(window.location.search)
  return params.get('room') ?? ''
}

function getNameFromUrl(): string {
  const params = new URLSearchParams(window.location.search)
  return params.get('name') ?? ''
}

export function Player() {
  useWakeLock()
  const protocolMismatch = useProtocolMismatch()
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(getStatus())
  const [assignedColor, setAssignedColor] = useState<string | null>(null)
  const [roomCode] = useState(getRoomCodeFromUrl)
  const [urlName] = useState(getNameFromUrl)

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
        if (urlName) {
          // Dev mode: name in URL always joins fresh, skip session token
          send({ type: 'join', payload: { name: urlName } })
        } else {
          const token = getSessionToken(roomCode)
          if (token) {
            send({ type: 'join', payload: { name: '', sessionToken: token } })
          }
        }
      }
    })

    const unsubReconnect = onReconnect(() => {
      gameStore.setReconnecting(true)
    })

    connect(roomCode, PARTYKIT_HOST)

    return () => {
      unsubMsg()
      unsubStatus()
      unsubAutoJoin()
      unsubReconnect()
      disconnect()
    }
  }, [roomCode])

  if (!roomCode) {
    return <div style={{ padding: 24, color: 'var(--text-primary)', background: 'var(--bg-primary)', minHeight: '100svh' }}>
      <p>No room code. Scan the QR code on the TV screen.</p>
    </div>
  }

  const handleJoin = (name: string) => {
    const token = getSessionToken(roomCode)
    send({ type: 'join', payload: { name, sessionToken: token ?? undefined } })
  }

  return (
    <>
      {protocolMismatch && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--bg-primary, #0c0a12)',
          color: 'var(--amber, #e8922a)', fontSize: 18, fontWeight: 700, textAlign: 'center',
        }}>
          Game updated — please refresh
        </div>
      )}
      <PhoneRouter
        connectionStatus={connectionStatus}
        assignedColor={assignedColor}
        onJoin={handleJoin}
        roomCode={roomCode}
      />
      <ErrorToast />
      <ConnectionOverlay status={connectionStatus} />
      <FloatingActionButton />
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
  const playerId = gameStore.getPlayerId()

  if (!state || state.phase === 'lobby') {
    // After Play Again, look up the player's name from the lobby state
    const lobbyName = state?.phase === 'lobby' && playerId
      ? state.players.find(p => p.id === playerId)?.name
      : undefined

    const lobbyPlayers = state?.phase === 'lobby' ? state.players : undefined

    return (
      <JoinScreen
        connectionStatus={connectionStatus}
        assignedColor={assignedColor}
        onJoin={onJoin}
        roomCode={roomCode}
        playerName={lobbyName}
        lobbyPlayers={lobbyPlayers}
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
      <PlayingView roomCode={roomCode} />
    </Fragment>
  )
}

// --- Playing View ---

function PlayingView({ roomCode }: { roomCode: string }) {
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
  const currentTurn = useCurrentTurn()
  const sendAction = useSendAction()
  const optimisticPending = useIsOptimisticPending()

  const currentPlayerName = currentTurn
    ? players.find(p => p.id === currentTurn.currentPlayerId)?.name ?? null
    : null

  const isAlive = myPlayer?.isAlive ?? false

  const { state: cardPlayState, selectedIds, toggleCard, reset: resetCardPlay } = useCardPlay(hand, isMyTurn, subPhase)

  // Card detail sheet (long-press)
  const [detailCardType, setDetailCardType] = useState<CardType | null>(null)

  const handleCardLongPress = useCallback((cardId: string) => {
    const card = hand.find(c => c.id === cardId)
    if (card) setDetailCardType(card.type)
  }, [hand])

  // Local target select for pre-send actions (Favor, Targeted Attack)
  const [localTargetMode, setLocalTargetMode] = useState<{ cardIds: string[]; reason: 'direct-order' | 'call-in-a-favor' } | null>(null)

  // Track dismissed See the Future peek (prevents sheet loop)
  const [futureDismissed, setFutureDismissed] = useState(false)

  // Reset dismissed flag when futureCards changes (new peek)
  const futureCards = privateData.futureCards
  useEffect(() => {
    if (futureCards && futureCards.length > 0) setFutureDismissed(false)
  }, [futureCards])

  // Bottom sheet derivation — pass undefined if dismissed
  const activeSheet = useMemo(
    () => deriveActiveBottomSheet(
      pendingPrompt, myPlayerId, players, hand, drawPileCount, futureDismissed ? undefined : futureCards,
    ),
    [pendingPrompt, myPlayerId, players, hand, drawPileCount, futureDismissed, futureCards],
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
        reason: pt.cardType === 'call-in-a-favor' ? 'call-in-a-favor' : 'direct-order',
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

  const eligibleTargets = players.filter(p => p.isAlive && p.id !== myPlayerId)

  // Sorted hand with staged cards filtered out
  const sortedHand = useSortedHand(hand)
  const displayHand = sortedHand.filter(c => !selectedIds.has(c.id))

  return (
    <div className={playingStyles.container}>
      <TitleBar roomCode={roomCode} />
      <StatusBar isMyTurn={isMyTurn} currentPlayerName={currentPlayerName} drawPileCount={drawPileCount} />

      <div className={playingStyles.workbench}>
        {/* Staging area — compose your play */}
        <div className={playingStyles.stagingSection}>
          <div className={playingStyles.sectionLabel}>Staging</div>
          <StagingArea
            hand={hand}
            cardPlayState={cardPlayState}
            isMyTurn={isMyTurn}
            subPhase={subPhase}
            drawPileCount={drawPileCount}
            disabled={!permission.allowed}
            optimisticPending={optimisticPending}
            onUnstageCard={toggleCard}
            onConfirm={handleConfirm}
            onConfirmWithTarget={handleConfirmWithTarget}
            onCardLongPress={handleCardLongPress}
          />
        </div>

        {/* Hand — large scrollable cards */}
        <div className={playingStyles.handSection} data-disabled={(!permission.allowed || optimisticPending) || undefined}>
          <div className={playingStyles.sectionLabel}>Hand ({hand.length})</div>
          <Hand
            hand={displayHand}
            disabled={!permission.allowed || optimisticPending}
            onStageCard={toggleCard}
            onCardLongPress={handleCardLongPress}
          />
        </div>
      </div>

      {/* Local target select (pre-send: Favor, Targeted Attack) */}
      <BottomSheet
        open={localTargetMode !== null && !activeSheet}
        onDismiss={() => { setLocalTargetMode(null); resetCardPlay() }}
      >
        {localTargetMode && (
          <TargetSelect
            eligiblePlayers={eligibleTargets}
            onSelectTarget={handleLocalTargetSelect}
            title={localTargetMode.reason === 'call-in-a-favor' ? 'Choose who gives you a card' : 'Choose who to reassign to'}
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
            onDismiss={() => setFutureDismissed(true)}
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

      {/* Card detail sheet (long-press) */}
      <BottomSheet open={detailCardType !== null} onDismiss={() => setDetailCardType(null)}>
        {detailCardType && <CardDetailSheet cardType={detailCardType} />}
      </BottomSheet>

      <Suspense><DramaOverlay /></Suspense>
    </div>
  )
}
