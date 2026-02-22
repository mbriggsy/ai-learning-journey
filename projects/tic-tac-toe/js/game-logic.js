'use strict';

const WINS = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6],
];

function checkWinner(board) {
  for (const [a,b,c] of WINS) {
    if (board[a] && board[a] === board[b] && board[a] === board[c])
      return { winner: board[a], combo: [a,b,c] };
  }
  if (board.every(v => v !== null)) return { winner: 'draw', combo: null };
  return null;
}

function minimax(board, depth, maxing, alpha, beta) {
  const r = checkWinner(board);
  if (r) {
    if (r.winner === 'O') return 10 - depth;
    if (r.winner === 'X') return depth - 10;
    return 0;
  }
  const empty = board.reduce((a,v,i) => v === null ? [...a,i] : a, []);
  if (maxing) {
    let best = -Infinity;
    for (const i of empty) {
      board[i] = 'O';
      best = Math.max(best, minimax(board, depth+1, false, alpha, beta));
      board[i] = null;
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const i of empty) {
      board[i] = 'X';
      best = Math.min(best, minimax(board, depth+1, true, alpha, beta));
      board[i] = null;
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

function bestMove(board) {
  let top = -Infinity, move = -1;
  const empty = board.reduce((a,v,i) => v === null ? [...a,i] : a, []);
  for (const i of empty) {
    board[i] = 'O';
    const v = minimax(board, 0, false, -Infinity, Infinity);
    board[i] = null;
    if (v > top) { top = v; move = i; }
  }
  return move;
}

function findWinningMove(board, player) {
  const empty = board.reduce((a,v,i) => v === null ? [...a,i] : a, []);
  for (const i of empty) {
    board[i] = player;
    const r = checkWinner(board);
    board[i] = null;
    if (r && r.winner === player) return i;
  }
  return -1;
}

function pickAiMove(board, difficulty) {
  const empty = board.reduce((a,v,i) => v === null ? [...a,i] : a, []);
  if (!empty.length) return -1;
  const rand = () => empty[Math.floor(Math.random() * empty.length)];
  if (difficulty === 'easy') return rand();
  if (difficulty === 'medium') {
    const win = findWinningMove([...board], 'O');
    if (win !== -1) return win;
    const block = findWinningMove([...board], 'X');
    if (block !== -1) return block;
    return rand();
  }
  return bestMove([...board]);
}

module.exports = { WINS, checkWinner, minimax, bestMove, findWinningMove, pickAiMove };
