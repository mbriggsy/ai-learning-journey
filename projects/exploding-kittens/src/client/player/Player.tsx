import { useState, useEffect, useCallback, useMemo, Fragment } from 'react'
import { connect, disconnect, send, onMessage, onStatusChange, onReconnect, getStatus, getSessionToken, setSessionToken } from '@client/connection'
import type { ConnectionStatus } from '@client/connection'
import { gameStore, useGameState, useProtocolMismatch, useIsOptimisticPending } from '@client/shared/gameStore'
import { useSendAction } from '@client/shared/hooks/useSendAction'
import { useGamePhase, usePlayerList, useDrawPileCount, usePendingPrompt } from '@client/shared/hooks/useSharedSelectors'
import { useHand, useIsMyTurn, useSubPhase, useMyPlayerId, useMyPlayer, usePrivateData } from './hooks/usePlayerSelectors'
import { deriveInteractionPermission } from './hooks/useInteractionPermission'
import { useCardPlay } from './hooks/useCardPlay'
import { deriveActiveBottomSheet } from './hooks/useActiveBottomSheet'
import { useWakeLock } from '@client/shared/hooks/useWakeLock'
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
import { useColorScheme } from '@client/shared/theme'
import '@client/shared/fonts.css'
import '@client/shared/theme.css'

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
  useColorScheme() // Force re-render on OS light/dark switch so cardAccent() picks up new values
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

    return (
      <JoinScreen
        connectionStatus={connectionStatus}
        assignedColor={assignedColor}
        onJoin={onJoin}
        roomCode={roomCode}
        playerName={lobbyName}
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
  const optimisticPending = useIsOptimisticPending()

  const isAlive = myPlayer?.isAlive ?? false

  const { state: cardPlayState, selectedIds, toggleCard, reset: resetCardPlay } = useCardPlay(hand, isMyTurn, subPhase)

  // Local target select for pre-send actions (Favor, Targeted Attack)
  const [localTargetMode, setLocalTargetMode] = useState<{ cardIds: string[]; reason: 'targeted-attack' | 'favor' } | null>(null)

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
    <div style={{ background: 'var(--bg-primary)', minHeight: '100svh', paddingBottom: '72px' }}>
      <Hand
        hand={hand}
        selectedIds={selectedIds}
        disabled={!permission.allowed || optimisticPending}
        onCardClick={toggleCard}
      />

      <CardConfirmBar
        state={cardPlayState}
        onConfirm={needsTarget ? handleConfirmWithTarget : handleConfirm}
        onCancel={resetCardPlay}
      />

      <DrawButton
        visible={isMyTurn && subPhase === 'turn-active'}
        disabled={!permission.allowed || cardPlayState.status !== 'idle' || optimisticPending}
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

      <NopeButton />
    </div>
  )
}
