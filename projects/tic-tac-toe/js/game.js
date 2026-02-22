/**
 * TIC-TAC-TOE ARCADE
 * Single-player vs AI — minimax with alpha-beta pruning
 */
;(function () {
  'use strict';

  /* ── Constants ──────────────────────────────── */
  const WINS = [
    [0,1,2],[3,4,5],[6,7,8],   // rows
    [0,3,6],[1,4,7],[2,5,8],   // cols
    [0,4,8],[2,4,6],           // diagonals
  ];

  /* ── State ──────────────────────────────────── */
  const state = {
    board:      Array(9).fill(null),
    active:     true,   // accepting player clicks?
    difficulty: 'easy',
    scores:     { player: 0, cpu: 0, draws: 0 },
  };

  /* ── DOM refs ───────────────────────────────── */
  const $ = id => document.getElementById(id);
  const cells      = [...document.querySelectorAll('.cell')];
  const statusEl   = $('status-text');
  const btnNew       = $('btn-new');
  const btnPlayAgain = $('btn-play-again');
  const overlay      = $('go-overlay');
  const goTitle      = $('go-title');
  const goResult     = $('go-result');
  const goScore      = $('go-score');
  const diffBtns     = [...document.querySelectorAll('.diff-btn')];      // all: main + overlay
  const mainDiffBtns = [...document.querySelectorAll('.diff-row .diff-btn')];
  const goDiffBtns   = [...document.querySelectorAll('.go-diff-btn')];
  const scoreEls   = {
    player: $('score-player'),
    cpu:    $('score-cpu'),
    draws:  $('score-draws'),
  };
  const canvas = $('win-canvas');
  const ctx    = canvas.getContext('2d');

  /* ── Web-Audio helpers ──────────────────────── */
  let audioCtx = null;
  function ac() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }

  function beep(freq, dur, type = 'square', vol = 0.13) {
    try {
      const A = ac();
      const osc  = A.createOscillator();
      const gain = A.createGain();
      osc.connect(gain); gain.connect(A.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, A.currentTime);
      gain.gain.setValueAtTime(vol, A.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, A.currentTime + dur);
      osc.start(A.currentTime);
      osc.stop(A.currentTime + dur);
    } catch (_) {}
  }

  function sfxPlace(isX) { beep(isX ? 480 : 320, 0.09); }
  function sfxWin()    { [523,659,784,1047].forEach((f,i) => setTimeout(() => beep(f,.15,'square',.15), i*110)); }
  function sfxLose()   { [440,330,220,165] .forEach((f,i) => setTimeout(() => beep(f,.2,'sawtooth',.12), i*140)); }
  function sfxDraw()   { beep(330,.25,'triangle',.1); setTimeout(() => beep(260,.3,'triangle',.1), 280); }
  function sfxStart()  { [220,440,880].forEach((f,i) => setTimeout(() => beep(f,.06,'square',.1), i*80)); }

  /* ── Canvas / win-line ──────────────────────── */
  function resizeCanvas() {
    const wrap = canvas.parentElement;
    canvas.width  = wrap.offsetWidth;
    canvas.height = wrap.offsetHeight;
  }

  function cellCenter(idx) {
    const W = canvas.width, H = canvas.height;
    const cw = W / 3, ch = H / 3;
    return {
      x: (idx % 3) * cw + cw / 2,
      y: Math.floor(idx / 3) * ch + ch / 2,
    };
  }

  function animateWinLine(combo) {
    resizeCanvas();
    const s = cellCenter(combo[0]);
    const e = cellCenter(combo[2]);
    let t = 0;
    const id = setInterval(() => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      t = Math.min(t + 0.07, 1);
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x + (e.x - s.x) * t, s.y + (e.y - s.y) * t);
      ctx.strokeStyle    = '#ffe600';
      ctx.lineWidth      = 5;
      ctx.lineCap        = 'round';
      ctx.shadowColor    = '#ffe600';
      ctx.shadowBlur     = 24;
      ctx.stroke();
      if (t >= 1) clearInterval(id);
    }, 16);
  }

  function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  /* ── Game logic ─────────────────────────────── */
  function checkWinner(board) {
    for (const [a,b,c] of WINS) {
      if (board[a] && board[a] === board[b] && board[a] === board[c])
        return { winner: board[a], combo: [a,b,c] };
    }
    if (board.every(v => v !== null)) return { winner: 'draw', combo: null };
    return null;
  }

  /* Minimax with alpha-beta pruning */
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
        best  = Math.max(best, minimax(board, depth+1, false, alpha, beta));
        board[i] = null;
        alpha = Math.max(alpha, best);
        if (beta <= alpha) break;
      }
      return best;
    } else {
      let best = Infinity;
      for (const i of empty) {
        board[i] = 'X';
        best  = Math.min(best, minimax(board, depth+1, true, alpha, beta));
        board[i] = null;
        beta  = Math.min(beta, best);
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

  /* Check if a given player can win in one move; returns that index or -1 */
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

  function pickAiMove() {
    const board = state.board;
    const empty = board.reduce((a,v,i) => v === null ? [...a,i] : a, []);
    if (!empty.length) return -1;
    const rand = () => empty[Math.floor(Math.random() * empty.length)];

    if (state.difficulty === 'easy') {
      // Purely random — never blocks, never hunts wins.
      // Player can win reliably with basic strategy.
      return rand();
    }

    if (state.difficulty === 'medium') {
      // Heuristic: take the win if available, block the player's win,
      // otherwise pick randomly. No look-ahead beyond one move.
      const win   = findWinningMove([...board], 'O');
      if (win !== -1) return win;
      const block = findWinningMove([...board], 'X');
      if (block !== -1) return block;
      return rand();
    }

    // Hard: perfect minimax — unbeatable.
    return bestMove([...board]);
  }

  /* ── Rendering ──────────────────────────────── */
  function status(msg) { statusEl.textContent = msg; }

  function placeSymbol(idx, player, isWinCell) {
    const cell = cells[idx];
    cell.innerHTML = '';
    cell.classList.add('taken');
    if (isWinCell) cell.classList.add('win-cell');
    const span = document.createElement('span');
    span.className = `sym ${player}`;
    span.textContent = player;
    span.setAttribute('aria-label', player === 'X' ? 'X' : 'O');
    cell.appendChild(span);
    cell.setAttribute('aria-label', `Cell ${idx+1}: ${player}`);
  }

  function bumpScore(key) {
    const el = scoreEls[key];
    el.textContent = state.scores[key];
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  }

  function showOverlay(result) {
    goTitle.textContent  = result === 'draw' ? 'DRAW GAME' : 'GAME OVER';
    goResult.className   = 'go-result ' + result;
    goResult.textContent = result === 'win' ? 'YOU WIN!' : result === 'lose' ? 'CPU WINS!' : 'DRAW!';
    goScore.textContent  = `YOU ${state.scores.player}  \u2014  ${state.scores.cpu} CPU`;
    // Reflect current difficulty in overlay buttons
    setDifficulty(state.difficulty);
    overlay.setAttribute('aria-hidden', 'false');
    overlay.classList.add('show');
    // Focus the play-again button so keyboard users can act immediately
    setTimeout(() => btnPlayAgain.focus(), 50);
  }

  function hideOverlay() {
    overlay.classList.remove('show');
    overlay.setAttribute('aria-hidden', 'true');
  }

  /* ── End-of-game handling ───────────────────── */
  function endGame(result) {
    state.active = false;
    if (result.winner === 'draw') {
      state.scores.draws++;
      bumpScore('draws');
      status('DRAW! WELL MATCHED!');
      sfxDraw();
      setTimeout(() => showOverlay('draw'), 700);

    } else if (result.winner === 'X') {
      state.scores.player++;
      bumpScore('player');
      result.combo.forEach(i => cells[i].classList.add('win-cell'));
      animateWinLine(result.combo);
      status('YOU WIN! EXCELLENT!');
      sfxWin();
      setTimeout(() => showOverlay('win'), 1100);

    } else {
      state.scores.cpu++;
      bumpScore('cpu');
      result.combo.forEach(i => cells[i].classList.add('win-cell'));
      animateWinLine(result.combo);
      status('CPU WINS! TRY AGAIN!');
      sfxLose();
      setTimeout(() => showOverlay('lose'), 1100);
    }
  }

  /* ── Player move ─────────────────────────────── */
  function playerMove(idx) {
    if (!state.active || state.board[idx] !== null) return;
    state.active = false;           // lock board
    state.board[idx] = 'X';
    placeSymbol(idx, 'X', false);
    sfxPlace(true);

    const r = checkWinner(state.board);
    if (r) { endGame(r); return; }

    // AI's turn
    status('CPU IS THINKING\u2026');
    const delay = 380 + Math.random() * 260;
    setTimeout(aiMove, delay);
  }

  function aiMove() {
    const idx = pickAiMove();
    if (idx === -1) return;
    state.board[idx] = 'O';
    placeSymbol(idx, 'O', false);
    sfxPlace(false);

    const r = checkWinner(state.board);
    if (r) { endGame(r); return; }

    state.active = true;
    status('YOUR TURN \u2014 CHOOSE A SQUARE');
  }

  /* ── New game ────────────────────────────────── */
  function newGame() {
    state.board  = Array(9).fill(null);
    state.active = true;
    clearCanvas();
    hideOverlay();
    cells.forEach((cell, i) => {
      cell.innerHTML = '';
      cell.className = 'cell';
      cell.setAttribute('aria-label', `Cell ${i+1}`);
    });
    status('YOUR TURN \u2014 CHOOSE A SQUARE');
    sfxStart();
  }

  /* ── Events ──────────────────────────────────── */
  cells.forEach((cell, idx) => {
    cell.addEventListener('click',   () => playerMove(idx));
    cell.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); playerMove(idx); }
    });
  });

  btnNew.addEventListener('click', newGame);
  btnPlayAgain.addEventListener('click', newGame);

  /* Sync difficulty across both sets of buttons (main controls + overlay) */
  function setDifficulty(diff) {
    state.difficulty = diff;
    diffBtns.forEach(b => {
      const match = b.dataset.diff === diff;
      b.classList.toggle('active', match);
      b.setAttribute('aria-pressed', String(match));
    });
  }

  diffBtns.forEach(btn => {
    btn.addEventListener('click', () => setDifficulty(btn.dataset.diff));
  });

  window.addEventListener('resize', resizeCanvas);

  /* ── Boot ─────────────────────────────────────── */
  resizeCanvas();
  status('YOUR TURN \u2014 CHOOSE A SQUARE');

})();
