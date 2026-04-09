# How to Play (Evaluator Cheat Sheet)

You are evaluating the UI, not trying to win. Play enough turns to experience all major states.

## Setup
1. Open board: `http://localhost:5173/board.html?room=GAUNTLET`
2. Note the room code from the URL hash (e.g., `#ABC123`) — use THIS code for players
3. Open player 1: `http://localhost:5173/player.html?room={CODE}&name=Alice`
4. Open player 2: `http://localhost:5173/player.html?room={CODE}&name=Bob`
5. On board tab, click "Start Game"

## Turn Flow
- Active player sees "YOUR TURN" banner and a "Draw" button
- Inactive player sees "Waiting for {name}..."
- On your turn: play a card OR draw a card
- Playing a card: tap the card → confirm bar appears → tap "Play {CardName}" → card is played
- Drawing: tap "Draw" button → card is added to your hand → turn passes

## Key States to Screenshot
1. **Lobby** — both views before game starts
2. **Your turn** — hand visible, draw button present
3. **Not your turn** — waiting state
4. **Card selected** — confirm bar with description
5. **After card played** — board shows discard, turn changes
6. **Low draw pile** — if reachable, draw pile count < 5

## Card Types You'll See
- **Skip** — ends turn without drawing (safe to play, good test)
- **Attack** — ends turn, next player takes 2 turns
- **See the Future** — opens a peek sheet (good for testing bottom sheets)
- **Extraction** — only matters if you draw a Burned card
- **Operative cards** — powerless alone, pairs/triples steal cards

## Tips
- Play Skip cards to safely cycle turns without complex side effects
- Play See the Future to test the bottom sheet UI
- If you draw a Burned card and have an Extraction, you'll see the extraction placement sheet
- Use phone viewport (390x844) for player tabs, TV viewport (1920x1080) for board
