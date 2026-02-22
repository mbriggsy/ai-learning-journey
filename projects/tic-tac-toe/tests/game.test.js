const { checkWinner, minimax, bestMove, findWinningMove, pickAiMove } = require('../js/game-logic');

/* ── helpers ─────────────────────────────────── */
const empty = () => Array(9).fill(null);

/* ── checkWinner ─────────────────────────────── */
describe('checkWinner', () => {
  // All 8 winning combos for X
  const winCombos = [
    [0,1,2], [3,4,5], [6,7,8],  // rows
    [0,3,6], [1,4,7], [2,5,8],  // cols
    [0,4,8], [2,4,6],           // diags
  ];

  test.each(winCombos)('detects X win at [%i,%i,%i]', (a, b, c) => {
    const board = empty();
    board[a] = 'X'; board[b] = 'X'; board[c] = 'X';
    const r = checkWinner(board);
    expect(r).toEqual({ winner: 'X', combo: [a, b, c] });
  });

  test.each(winCombos)('detects O win at [%i,%i,%i]', (a, b, c) => {
    const board = empty();
    board[a] = 'O'; board[b] = 'O'; board[c] = 'O';
    const r = checkWinner(board);
    expect(r).toEqual({ winner: 'O', combo: [a, b, c] });
  });

  test('returns draw when board is full with no winner', () => {
    // X O X
    // X O O
    // O X X
    const board = ['X','O','X', 'X','O','O', 'O','X','X'];
    expect(checkWinner(board)).toEqual({ winner: 'draw', combo: null });
  });

  test('returns null for in-progress game', () => {
    const board = ['X', null, 'O', null, null, null, null, null, null];
    expect(checkWinner(board)).toBeNull();
  });

  test('returns null when only one cell is occupied', () => {
    const board = empty();
    board[4] = 'X';
    expect(checkWinner(board)).toBeNull();
  });
});

/* ── minimax ─────────────────────────────────── */
describe('minimax', () => {
  test('returns positive score when O is about to win', () => {
    // O can win on next move — board with O at 0,1 and empty at 2
    const board = ['O','O',null, 'X','X',null, null,null,null];
    const score = minimax(board, 0, true, -Infinity, Infinity);
    expect(score).toBeGreaterThan(0);
  });

  test('returns negative score when X is about to win', () => {
    // X has 0,1 — X will complete row on its turn
    const board = ['X','X',null, 'O','O',null, null,null,null];
    const score = minimax(board, 0, false, -Infinity, Infinity);
    expect(score).toBeLessThan(0);
  });

  test('returns 0 for a drawn position', () => {
    // One cell left, filling it produces a draw
    const board = ['X','O','X', 'X','O','O', 'O','X',null];
    const score = minimax(board, 0, true, -Infinity, Infinity);
    expect(score).toBe(0);
  });
});

/* ── bestMove ────────────────────────────────── */
describe('bestMove', () => {
  test('takes the winning move when O can win in one', () => {
    const board = ['X','X',null, 'O','O',null, null,null,null];
    expect(bestMove(board)).toBe(5); // O completes row 3,4,5
  });

  test('blocks X from winning', () => {
    // X at 0,1 — must block at 2
    const board = ['X','X',null, 'O',null,null, null,null,null];
    expect(bestMove(board)).toBe(2);
  });

  test('picks a valid move on an empty board', () => {
    const move = bestMove(empty());
    // On an empty board every first move leads to a draw with perfect play,
    // so bestMove returns the first index it evaluates (0). The important
    // thing is that it returns a valid cell index.
    expect(move).toBeGreaterThanOrEqual(0);
    expect(move).toBeLessThan(9);
  });
});

/* ── findWinningMove ─────────────────────────── */
describe('findWinningMove', () => {
  test('finds winning cell for X', () => {
    const board = ['X','X',null, 'O','O',null, null,null,null];
    expect(findWinningMove(board, 'X')).toBe(2);
  });

  test('finds winning cell for O', () => {
    const board = [null,'O','O', 'X','X',null, null,null,null];
    expect(findWinningMove(board, 'O')).toBe(0);
  });

  test('returns -1 when no winning move exists', () => {
    const board = ['X',null,null, null,'O',null, null,null,null];
    expect(findWinningMove(board, 'X')).toBe(-1);
  });
});

/* ── pickAiMove ──────────────────────────────── */
describe('pickAiMove', () => {
  test('easy mode returns a valid empty index', () => {
    const board = ['X',null,'O', null,null,null, null,null,null];
    const move = pickAiMove(board, 'easy');
    expect(board[move]).toBeNull();
    expect(move).toBeGreaterThanOrEqual(0);
    expect(move).toBeLessThan(9);
  });

  test('medium mode takes an immediate win', () => {
    const board = [null,'O','O', 'X','X',null, null,null,null];
    expect(pickAiMove(board, 'medium')).toBe(0); // O wins row 0,1,2
  });

  test('medium mode blocks immediate X win', () => {
    const board = ['X','X',null, 'O',null,null, null,null,null];
    expect(pickAiMove(board, 'medium')).toBe(2);
  });

  test('hard mode returns the best move (same as bestMove)', () => {
    const board = ['X',null,null, null,'O',null, null,null,null];
    expect(pickAiMove(board, 'hard')).toBe(bestMove([...board]));
  });

  test('returns -1 when board is full', () => {
    const board = ['X','O','X', 'X','O','O', 'O','X','X'];
    expect(pickAiMove(board, 'hard')).toBe(-1);
  });
});
