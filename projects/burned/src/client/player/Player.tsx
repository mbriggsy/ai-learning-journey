import { useState, useEffect, useCallback, useMemo, useRef, Fragment, lazy, Suspense, type ComponentType } from 'react'
import { PROTOCOL_VERSION } from '@shared/protocol'
import { connect, disconnect, send, onMessage, onStatusChange, onReconnect, getStatus, getSessionToken, setSessionToken } from '@client/connection'
import type { ConnectionStatus } from '@client/connection'
import { gameStore, useGameState, useProtocolMismatch, useIsOptimisticPending } from '@client/shared/gameStore'
import { useSendAction } from '@client/shared/hooks/useSendAction'
import { useGamePhase, usePlayerList, useDrawPileCount, usePendingPrompt, useNopeWindow } from '@client/shared/hooks/useSharedSelectors'
import { useHand, useIsMyTurn, useSubPhase, useMyPlayerId, useMyPlayer, usePrivateData } from './hooks/usePlayerSelectors'
import { useSortedHand } from './hooks/useSortedHand'
import { useCurrentTurn } from '@client/shared/hooks/useSharedSelectors'
import { deriveInteractionPermission } from './hooks/useInteractionPermission'
import { useCardPlay } from './hooks/useCardPlay'
import { deriveActiveBottomSheet } from './hooks/useActiveBottomSheet'
import { useWakeLock } from '@client/shared/hooks/useWakeLock'
import { haptic } from '@client/shared/haptics'
import { JoinScreen } from './JoinScreen'
import { Hand } from './Hand'
import { StagingArea } from './StagingArea'
import { ErrorToast } from './ErrorToast'
import { PlayerAlert } from './PlayerAlert'
import { StealReport } from './StealReport'
import { FavorReport } from './FavorReport'
import { IncomingSteal } from './IncomingSteal'
import { ConnectionOverlay } from './ConnectionOverlay'
import { EliminatedView } from './EliminatedView'
import { TitleBar } from './TitleBar'
import { StatusBar } from './StatusBar'
import { GameOver } from '@client/shared/GameOver'
const DramaOverlay = lazy(() => import('@client/shared/DramaOverlay').then(m => ({ default: m.DramaOverlay })))
import { useDramaActive } from '@client/shared/dramaState'
import { BottomSheet } from '@client/shared/BottomSheet'
import { TargetSelect } from './sheets/TargetSelect'
import { DefusePlacement } from './sheets/DefusePlacement'
import { FuturePeek } from './sheets/FuturePeek'
import { NameCard } from './sheets/NameCard'
import { CardDetailSheet } from './CardDetailSheet'
import type { CardType } from '@shared/types'
import { PARTYKIT_HOST } from '@client/shared/config'
import playingStyles from './PlayingView.module.css'

// Dev-only diagnostic overlay — tree-shaken in production
const DiagOverlay: ComponentType = import.meta.env.DEV
  ? lazy(() => import('./DiagOverlay'))
  : () => null

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

  // Per-tab flag: have we already completed our initial 'join' handshake?
  // Localstorage is shared across tabs on the same origin, so a blind
  // "prefer the stored token" strategy would make every dev-launcher tab
  // try to reconnect as whichever player claimed that room first and evict
  // each other via SESSION_REPLACED. We use this ref to ensure the FIRST
  // join in a tab's lifetime always uses ?name= (fresh-join), and only
  // later RECONNECTS within the same tab use the stored token.
  const initialJoinDoneRef = useRef(false)

  useEffect(() => {
    if (!roomCode) return

    const unsubMsg = onMessage(msg => {
      gameStore.handleMessage(msg)
      if (msg.type === 'joined') {
        setSessionToken(roomCode, msg.payload.sessionToken)
        setAssignedColor(msg.payload.color)
        initialJoinDoneRef.current = true
      }
    })
    const unsubStatus = onStatusChange(setConnectionStatus)

    const attemptAutoJoin = () => {
      // Reconnect within this tab: server has a live session for us, use the
      // token we received on first join. Required for mid-game WS reconnects
      // — without it the server rejects by name (game already started), the
      // connection never gets role: 'player', and every subsequent action
      // fails with "Not connected as player".
      if (initialJoinDoneRef.current) {
        const token = getSessionToken(roomCode)
        if (token) send({ type: 'join', payload: { name: '', sessionToken: token, protocolVersion: PROTOCOL_VERSION } })
        return
      }
      // First load in this tab. Prefer a tab-scoped sessionStorage token if
      // one is present — that means this is a refresh (or BFCache restore)
      // of a tab that had already joined. Reconnecting transparently is the
      // slick path and avoids forcing the player through the Check In screen
      // during a live game.
      const token = getSessionToken(roomCode)
      if (token) {
        send({ type: 'join', payload: { name: '', sessionToken: token, protocolVersion: PROTOCOL_VERSION } })
        return
      }
      // No stored token in this tab. Dev-launcher tabs carry ?name=X and
      // fresh-join so every tab gets its own player identity. Real player
      // tabs with no ?name= fall through to the JoinScreen's manual entry.
      if (urlName) {
        send({ type: 'join', payload: { name: urlName, protocolVersion: PROTOCOL_VERSION } })
      }
    }

    const unsubAutoJoin = onStatusChange(s => {
      if (s === 'connected') attemptAutoJoin()
    })

    const unsubReconnect = onReconnect(() => {
      gameStore.setReconnecting(true)
    })

    connect(roomCode, PARTYKIT_HOST)

    // If the socket was already 'connected' before this effect subscribed
    // (StrictMode re-mount, fast WS handshake), the status-change listener
    // never fires 'connected'. Trigger the join explicitly in that case.
    if (getStatus() === 'connected') attemptAutoJoin()

    return () => {
      unsubMsg()
      unsubStatus()
      unsubAutoJoin()
      unsubReconnect()
      disconnect()
    }
  }, [roomCode])

  if (!roomCode) {
    return <div style={{ padding: 24, color: 'var(--color-fg-primary)', background: 'var(--color-bg-app)', minHeight: '100svh' }}>
      <p>No room code. Scan the QR code on the shared screen.</p>
    </div>
  }

  const handleJoin = (name: string) => {
    const token = getSessionToken(roomCode)
    send({ type: 'join', payload: { name, sessionToken: token ?? undefined, protocolVersion: PROTOCOL_VERSION } })
  }

  return (
    <>
      {protocolMismatch && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--color-bg-app)',
          color: 'var(--color-accent-drama)', fontSize: 18, fontWeight: 700, textAlign: 'center',
        }}>
          Game updated — please refresh
        </div>
      )}
      <PhoneRouter
        connectionStatus={connectionStatus}
        assignedColor={assignedColor}
        onJoin={handleJoin}
        roomCode={roomCode}
        urlName={urlName}
      />
      {/* DramaOverlay lives at Player root, NOT inside PhoneRouter. The
          phase-keyed Fragments (`key="playing"` / `key="game_over"`) force
          full subtree re-mount on phase change. If DramaOverlay lived in
          the playing fragment, the playing → game_over transition (which
          fires burned-drawn + player-eliminated + game-over events in one
          tick) would unmount it before the queue could process. The
          fresh game_over instance would seed lastProcessedRef to the
          tail and skip the very events that just fired. Result: no
          BURNED card-flip, no ELIMINATION beat, no WINS ceremony — the
          game's biggest moments rendered as silent. Hoisting here keeps
          one DramaOverlay alive across the transition so the queue
          drains cleanly. Surfaced 2026-05-02 by Briggsy on the GAME
          OVER WINS spot-check ("no burned treatment"). */}
      <Suspense><DramaOverlay /></Suspense>
      <ErrorToast />
      <PlayerAlert />
      <ConnectionOverlay status={connectionStatus} />
      <Suspense><DiagOverlay /></Suspense>
    </>
  )
}

// --- Phase Router ---

interface PhoneRouterProps {
  connectionStatus: ConnectionStatus
  assignedColor: string | null
  onJoin: (name: string) => void
  roomCode: string
  urlName: string
}

function PhoneRouter({ connectionStatus, assignedColor, onJoin, roomCode, urlName }: PhoneRouterProps) {
  const state = useGameState()
  const playerId = gameStore.getPlayerId()

  if (!state || state.phase === 'lobby') {
    // After Play Again, look up the player's name from the lobby state
    const lobbyName = state?.phase === 'lobby' && playerId
      ? state.players.find(p => p.id === playerId)?.name
      : undefined

    const lobbyPlayers = state?.phase === 'lobby' ? state.players : undefined
    const hostConnected = state?.phase === 'lobby' ? state.hostConnected : undefined

    return (
      <JoinScreen
        connectionStatus={connectionStatus}
        assignedColor={assignedColor}
        onJoin={onJoin}
        roomCode={roomCode}
        playerName={lobbyName}
        defaultName={urlName || undefined}
        lobbyPlayers={lobbyPlayers}
        hostConnected={hostConnected}
      />
    )
  }

  if (state.phase === 'game_over') {
    const myId = 'myPlayerId' in state ? state.myPlayerId : undefined
    // B-11: phones get a "Run It Back" button too. The host has one on
    // the TV, but if the host tab is closed at the victory screen the
    // room would otherwise be wedged — players couldn't recover. Server
    // accepts return-to-lobby from any player in game_over phase.
    const handlePlayAgain = myId
      ? () => send({ type: 'return-to-lobby', payload: {} })
      : undefined
    return (
      <Fragment key="game_over">
        <GameOver
          players={state.players}
          winnerId={state.winnerId}
          eliminationOrder={state.eliminationOrder}
          myPlayerId={myId}
          onPlayAgain={handlePlayAgain}
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
  const nopeWindow = useNopeWindow()
  const sendAction = useSendAction()
  const optimisticPending = useIsOptimisticPending()

  const currentPlayerName = currentTurn
    ? players.find(p => p.id === currentTurn.currentPlayerId)?.name ?? null
    : null

  const isAlive = myPlayer?.isAlive ?? false

  // Favor-target mode — the one prompt where the target interacts with their
  // real hand + staging area instead of a dedicated sheet. Drives the banner,
  // the staging cap, and the SmartActionBox "surrender" state.
  const isFavorTarget =
    pendingPrompt?.type === 'favor-response' && pendingPrompt.playerId === myPlayerId
  const favorRequesterName = isFavorTarget
    ? players.find(p => p.id === pendingPrompt.requesterId)?.name ?? 'Someone'
    : null

  // ACTOR-side mirror: I played Call in a Favor and the target is choosing
  // what to surrender. Drives the SmartActionBox "Waiting for X..." state
  // so the requester isn't staring at the misleading default hand-stage hint
  // during favor-pending (triage #010 / Gap 2).
  const isFavorRequester =
    pendingPrompt?.type === 'favor-response' && pendingPrompt.requesterId === myPlayerId
  const favorTargetName = isFavorRequester
    ? players.find(p => p.id === pendingPrompt.playerId)?.name ?? 'them'
    : null

  // OTHER-alive context — neither requester nor target. Without this branch
  // the StatusBar reads "[ACTOR] is on deck · 22 in the pile" identical to
  // the pre-play state across the entire favor exchange (~7 minutes in
  // calibration), which seat-3 mistook for a frozen game. Triage #005.
  const favorOtherContext =
    pendingPrompt?.type === 'favor-response' && !isFavorTarget && !isFavorRequester
      ? {
          requesterName: players.find(p => p.id === pendingPrompt.requesterId)?.name ?? 'Someone',
          targetName: players.find(p => p.id === pendingPrompt.playerId)?.name ?? 'someone',
        }
      : null

  // Falsify Intel rearrange OTHER-alive. Without this branch the StatusBar
  // reads "[ACTOR] is on deck · N in the pile" identical to the pre-play
  // state for the entire ~30s rearrange phase — observers can't tell the
  // game from frozen (close 05-08-2022-5p #003). subPhase is public so
  // observers can derive it without server-side projection changes.
  const rearrangeOtherContext =
    subPhase === 'future-rearrange-pending' && !isMyTurn && currentPlayerName !== null
      ? { actorName: currentPlayerName }
      : null

  const { state: cardPlayState, selectedIds, toggleCard, reset: resetCardPlay } = useCardPlay(
    hand, isMyTurn, subPhase, isFavorTarget ? 1 : 3,
  )

  // Card detail sheet (long-press)
  const [detailCardType, setDetailCardType] = useState<CardType | null>(null)

  const handleCardLongPress = useCallback((cardId: string) => {
    const card = hand.find(c => c.id === cardId)
    if (card) setDetailCardType(card.type)
  }, [hand])

  const hasIntercept = hand.some(c => c.type === 'intercepted')
  const handleIntercept = useCallback(() => {
    haptic('medium')
    // Read the Nope window's generation at tap-time. Server rejects with
    // NOPE_NOT_ACTIVE if the generation has advanced (another player
    // already Noped this window). Prevents D-03 race where a late-
    // arriving Nope accidentally lands as a counter-Nope.
    const snap = gameStore.getServerSnapshot()
    const gen = (snap && snap.phase === 'playing' && snap.nopeWindow) ? snap.nopeWindow.generation : 0
    sendAction({ type: 'nope', windowGeneration: gen })
    // Optimistic hand removal: flip optimisticPending → true so the
    // button locks until the next state-update arrives. Without this,
    // rapid taps sent every ~50ms burn one Intercept per tap because
    // 'nope' is exempt from server stateVersion (race-correct by design).
    // The server is authoritative — if the Nope is rejected, state-update
    // rolls the card back into hand. E2E audit 2026-04-23 D-01.
    gameStore.applyOptimistic(s => {
      if (s.phase !== 'playing' || !('myHand' in s)) return s
      const idx = s.myHand.findIndex(c => c.type === 'intercepted')
      if (idx === -1) return s
      const newHand = [...s.myHand]
      newHand.splice(idx, 1)
      return { ...s, myHand: newHand }
    })
  }, [sendAction])

  // Local target select for pre-send actions — targetPlayerId is bundled
  // INTO the play-card action so the nope window opens with full info
  // (target visible to opponents). Reasons: Targeted Attack, Favor,
  // and both Two-of-a-Kind / Three-of-a-Kind combos.
  const [localTargetMode, setLocalTargetMode] = useState<
    { cardIds: string[]; reason: 'direct-order' | 'call-in-a-favor' | 'combo-pair' | 'combo-triple' } | null
  >(null)

  // Track dismissed See the Future peek (prevents sheet loop). Compare by
  // CONTENTS (card-id key) rather than array reference — `privateData.
  // futureCards` is rebuilt on every projection, so a reference-only
  // dependency would re-open the dismissed sheet on every state push
  // (close 05-08-2022-5p #025 Gap 2: dismissed FuturePeek re-displayed
  // after a cancelled nope window because the projection rebuild gave
  // futureCards a new identity even though the contents were unchanged).
  const [futureDismissed, setFutureDismissed] = useState(false)
  const dismissedFutureKeyRef = useRef<string | null>(null)
  const futureCards = privateData.futureCards
  const futureCardsKey = futureCards && futureCards.length > 0
    ? futureCards.map(c => c.id).join('|')
    : null
  useEffect(() => {
    if (futureCardsKey !== null && futureCardsKey !== dismissedFutureKeyRef.current) {
      setFutureDismissed(false)
    }
  }, [futureCardsKey])
  const handleFutureDismiss = useCallback(() => {
    setFutureDismissed(true)
    dismissedFutureKeyRef.current = futureCardsKey
  }, [futureCardsKey])

  // Bottom sheet derivation — pass undefined if dismissed
  const activeSheet = useMemo(
    () => deriveActiveBottomSheet(
      pendingPrompt, myPlayerId, players, hand, drawPileCount, futureDismissed ? undefined : futureCards,
    ),
    [pendingPrompt, myPlayerId, players, hand, drawPileCount, futureDismissed, futureCards],
  )

  // Gate server-prompted sheets behind the drama overlay queue so prompts
  // (e.g. Defuse placement after a Burned draw) don't obscure the BURNED →
  // EXTRACTED animation on the phone.
  const dramaActive = useDramaActive()
  const showServerSheet = !dramaActive

  // Reset localTargetMode when server state changes underneath
  useEffect(() => {
    setLocalTargetMode(null)
  }, [subPhase, isMyTurn, pendingPrompt])

  // DEV/test hook for the BottomSheet runtime gate
  // (`tests/e2e/framer-bottom-sheet-shape.spec.ts`). Lets the harness drive
  // the local-target sheet open/close without staging a target-required card
  // through the full game flow. Mirrors the `__testInjectEvent` pattern in
  // `gameStore.ts` — guarded by DEV/test mode, tree-shaken from prod, and
  // verified by `verify-prod-bundle.ts`.
  useEffect(() => {
    if (!(import.meta.env.DEV || import.meta.env.MODE === 'test')) return
    const w = window as unknown as Record<string, unknown>
    w.__testForceLocalTarget = (reason: 'direct-order' | 'call-in-a-favor' | 'combo-pair' | 'combo-triple' | null) => {
      if (reason === null) {
        setLocalTargetMode(null)
      } else {
        setLocalTargetMode({ cardIds: [], reason })
      }
    }
    return () => {
      delete w.__testForceLocalTarget
    }
  }, [])

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
      return
    }
    if (pt.kind === 'pair') {
      setLocalTargetMode({
        cardIds: [...cardPlayState.selectedCardIds],
        reason: 'combo-pair',
      })
      return
    }
    if (pt.kind === 'triple') {
      setLocalTargetMode({
        cardIds: [...cardPlayState.selectedCardIds],
        reason: 'combo-triple',
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

  // Favor-target confirm path — pulls the single staged card out of state,
  // sends favor-give, and resets staging so the view returns to its normal
  // hand rendering when the server transitions out of favor-pending.
  const handleSurrender = useCallback(() => {
    if (cardPlayState.status !== 'selecting') return
    const [cardId] = cardPlayState.selectedCardIds
    if (!cardId) return
    sendAction({ type: 'favor-give', cardId })
    resetCardPlay()
  }, [cardPlayState, sendAction, resetCardPlay])

  const handleFutureRearrange = useCallback((order: string[]) => {
    sendAction({ type: 'future-rearrange', order })
  }, [sendAction])

  const handleNameCard = useCallback((cardType: CardType) => {
    sendAction({ type: 'name-card', cardType })
  }, [sendAction])

  const handleCancelNameCard = useCallback(() => {
    sendAction({ type: 'cancel-name-card' })
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

  // Sorted hand — must run BEFORE the conditional return below to satisfy
  // Rules of Hooks. When isAlive flips true → false the early return changes
  // hook count between renders; running this hook before the return keeps the
  // count stable and avoids ErrorBoundary catching a "rendered fewer hooks
  // than expected" error on every elimination.
  const sortedHand = useSortedHand(hand)

  // --- Conditional render AFTER all hooks ---

  if (!isAlive) return <EliminatedView />

  // Direct Order self-target is legal per RULES-REFERENCE §13.8 (engine
  // pinned by rules-gaps-exhaustive.test.ts:220-244): "Allow it — equivalent
  // to taking your turns normally. Could be funny for trolling." Card flavor
  // says ANY operative; UI must mirror. Other target reasons (favor, pair,
  // triple) don't accept self — engine semantics mean self-target is either
  // nonsensical or a no-op, so we keep the exclusion there.
  const eligibleTargets = players.filter(p => {
    if (!p.isAlive) return false
    if (p.id !== myPlayerId) return true
    return localTargetMode?.reason === 'direct-order'
  })

  // Display hand = sortedHand minus staged ids.
  const displayHand = sortedHand.filter(c => !selectedIds.has(c.id))

  return (
    <div className={playingStyles.view} data-diag="view">
      <TitleBar roomCode={roomCode} />
      <StatusBar
        isMyTurn={isMyTurn}
        currentPlayerName={currentPlayerName}
        drawPileCount={drawPileCount}
        myTurnsRemaining={isMyTurn ? currentTurn?.turnsRemaining ?? 1 : 1}
        favorOtherContext={favorOtherContext}
        rearrangeOtherContext={rearrangeOtherContext}
      />

      <div className={playingStyles.workbench}>
        {isFavorTarget && favorRequesterName && (
          <div className={playingStyles.favorBanner} role="status" aria-live="polite">
            <span className={playingStyles.favorBannerPrimary}>
              {favorRequesterName} demands a card
            </span>
            <span className={playingStyles.favorBannerSecondary}>· pick one to surrender</span>
          </div>
        )}

        {/* Staging area — compose your play. data-empty flips true when no
            cards are staged so the container collapses and the hand claims
            the reclaimed vertical space. */}
        <div className={playingStyles.staging} data-empty={selectedIds.size === 0 || undefined}>
          <div className={playingStyles.sectionLabel}>{isFavorTarget ? 'Surrender' : 'Staging'}</div>
          <StagingArea
            hand={hand}
            cardPlayState={cardPlayState}
            isMyTurn={isMyTurn}
            subPhase={subPhase}
            drawPileCount={drawPileCount}
            disabled={!permission.allowed}
            optimisticPending={optimisticPending}
            nopeWindow={nopeWindow}
            hasIntercept={hasIntercept}
            isAlive={isAlive}
            favorMode={isFavorTarget ? { requesterName: favorRequesterName! } : null}
            favorWaitingFor={isFavorRequester ? { targetName: favorTargetName! } : null}
            onUnstageCard={toggleCard}
            onConfirm={handleConfirm}
            onConfirmWithTarget={handleConfirmWithTarget}
            onCardLongPress={handleCardLongPress}
            onIntercept={handleIntercept}
            onSurrender={handleSurrender}
          />
        </div>

        {/* Hand — large scrollable cards */}
        <div className={playingStyles.handSection} data-disabled={(!permission.allowed || optimisticPending) || undefined}>
          <div className={playingStyles.sectionLabel}>Hand ({displayHand.length})</div>
          <Hand
            hand={displayHand}
            disabled={!permission.allowed || optimisticPending}
            onStageCard={toggleCard}
            onCardLongPress={handleCardLongPress}
          />
        </div>
      </div>

      {/* Local target select — every target pick is pre-send. Cancel
          restores the hand and unstages. */}
      <BottomSheet
        open={localTargetMode !== null && !activeSheet}
        onDismiss={() => { setLocalTargetMode(null); resetCardPlay() }}
      >
        {localTargetMode && (
          <TargetSelect
            eligiblePlayers={eligibleTargets}
            onSelectTarget={handleLocalTargetSelect}
            onCancel={() => { setLocalTargetMode(null); resetCardPlay() }}
            title={
              localTargetMode.reason === 'call-in-a-favor' ? 'Choose who gives you a card'
              : localTargetMode.reason === 'direct-order' ? 'Direct your orders to...'
              : localTargetMode.reason === 'combo-pair' ? 'Choose who to steal from'
              : 'Choose who to steal from'
            }
          />
        )}
      </BottomSheet>

      {/* Server-prompted bottom sheets — gated on drama queue so the BURNED
          → EXTRACTED overlay sequence finishes before a Defuse (or any other)
          prompt slides up. */}
      <BottomSheet open={showServerSheet && activeSheet?.sheet === 'defuse-placement'}>
        {activeSheet?.sheet === 'defuse-placement' && (
          <DefusePlacement
            maxPosition={activeSheet.maxPosition}
            onPlace={handleDefusePlace}
          />
        )}
      </BottomSheet>

      <BottomSheet
        open={showServerSheet && activeSheet?.sheet === 'future-peek'}
        // Rearrange branch (Falsify Intel) goes tall — the dossier UX wants
        // to dominate the screen so the photos read at full presence.
        // Read-only Intel Briefing keeps the default 80vh cap.
        tall={activeSheet?.sheet === 'future-peek' && activeSheet.canRearrange}
      >
        {activeSheet?.sheet === 'future-peek' && (
          <FuturePeek
            cards={activeSheet.cards}
            canRearrange={activeSheet.canRearrange}
            onDismiss={handleFutureDismiss}
            onRearrange={handleFutureRearrange}
          />
        )}
      </BottomSheet>

      <BottomSheet
        open={showServerSheet && activeSheet?.sheet === 'name-card'}
        // Escape key cancels (BottomSheet wires onDismiss to the native
        // <dialog> cancel event). Matches the explicit "Call off the raid"
        // button — keyboard users get parity with taps, and the cancel
        // is blocked server-side post-commit anyway so no hazard.
        // E2E audit 2026-04-23 D-20.
        onDismiss={handleCancelNameCard}
      >
        {activeSheet?.sheet === 'name-card' && (
          <NameCard
            targetName={activeSheet.targetName}
            onNameCard={handleNameCard}
            onCancel={handleCancelNameCard}
          />
        )}
      </BottomSheet>

      {/* Card detail sheet (long-press) */}
      <BottomSheet open={detailCardType !== null} onDismiss={() => setDetailCardType(null)}>
        {detailCardType && <CardDetailSheet cardType={detailCardType} />}
      </BottomSheet>

      {/* DramaOverlay was hoisted to Player root (above PhoneRouter) so it
          survives the playing → game_over phase transition and the WINS /
          ELIMINATED / BURNED beats actually fire. See comment at that
          mount site. */}

      {/* State-driven banner that rises on the TARGET's phone during a
          3-of-a-kind named-steal intercept window. Gives Mittens the card
          name + stealer so she can decide whether to burn an Intercept
          before the window closes. Pre-resolution counterpart to the
          post-resolution incident report below. */}
      <IncomingSteal />

      {/* Persistent classified-dispatch for combo-steal victims. Gated by
          dramaActive so BURNED → EXTRACTED plays first. */}
      <StealReport />

      {/* Coercion report — same dispatch vocabulary, fired on BOTH the
          ACTOR's and TARGET's phones when a Call in a Favor exchange
          resolves. Closes triage #010 Gap C — the favor exchange used to
          read as a silent database transaction; this is the cinematic
          counterpart to StealReport's combo-steal incident report. */}
      <FavorReport />
    </div>
  )
}
