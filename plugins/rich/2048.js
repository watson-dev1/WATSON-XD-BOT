import { AIRich } from '../../lib/messagebuilder.js';
import { sendFakeQuoted } from '../../lib/fakequoted.js';

const htmlPayload = String.raw`<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>2048 Neon</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; -webkit-tap-highlight-color: transparent; -webkit-touch-callout: none; }
  body {
    background: #0a0a0f;
    font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: #fff;
    display: flex; justify-content: center; align-items: center;
    min-height: 100vh;
  }
  .wrap { width: 100%; max-width: 500px; padding: 16px; }
  .card {
    background: rgba(15, 18, 28, 0.95); border: 1px solid rgba(0, 243, 255, 0.2);
    border-radius: 16px; padding: 16px; box-shadow: 0 8px 32px rgba(0, 243, 255, 0.1);
  }
  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
  .title { font-size: 28px; font-weight: 900; color: #00f3ff; text-shadow: 0 0 10px rgba(0, 243, 255, 0.5); }
  .scores { display: flex; gap: 8px; }
  .score-box { background: rgba(0,0,0,0.5); padding: 6px 12px; border-radius: 8px; text-align: center; border: 1px solid rgba(255,255,255,0.1); min-width: 70px; }
  .score-label { font-size: 10px; color: #8892b0; font-weight: 700; text-transform: uppercase; }
  .score-val { font-size: 18px; font-weight: 900; color: #fff; }
  .controls { display: flex; justify-content: space-between; margin-bottom: 12px; align-items: center; }
  .btn { background: rgba(0, 243, 255, 0.1); border: 1px solid #00f3ff; color: #00f3ff; padding: 8px 16px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.2s; font-size: 14px; }
  .btn:active { background: #00f3ff; color: #000; }
  
  .board {
    position: relative;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 8px;
    width: 100%;
  }
  .board-inner {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    grid-template-rows: repeat(4, 1fr);
    gap: 8px;
    width: 100%;
    padding-top: 100%;
    position: relative;
  }
  .grid-overlay {
    position: absolute; top: 8px; left: 8px; right: 8px; bottom: 8px;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    grid-template-rows: repeat(4, 1fr);
    gap: 8px;
  }
  .cell {
    display: flex; justify-content: center; align-items: center;
    border-radius: 8px; font-weight: 900; font-size: 26px;
    background: rgba(255, 255, 255, 0.05);
  }
  
  .t-2    { background: #1a1a2e; color: #00f3ff; border: 1px solid #00f3ff; }
  .t-4    { background: #16213e; color: #4cc9f0; border: 1px solid #4cc9f0; }
  .t-8    { background: #0f3460; color: #9d4edd; border: 1px solid #9d4edd; }
  .t-16   { background: #533483; color: #f72585; border: 1px solid #f72585; }
  .t-32   { background: #e94560; color: #fff; border: 1px solid #fff; }
  .t-64   { background: #ff9f1c; color: #000; border: 1px solid #ff9f1c; }
  .t-128  { background: #ffbf00; color: #000; border: 1px solid #ffbf00; box-shadow: 0 0 15px #ffbf00; }
  .t-256  { background: #32ff7e; color: #000; border: 1px solid #32ff7e; box-shadow: 0 0 15px #32ff7e; }
  .t-512  { background: #00f3ff; color: #000; border: 1px solid #00f3ff; box-shadow: 0 0 20px #00f3ff; }
  .t-1024 { background: #ff007f; color: #fff; border: 1px solid #ff007f; box-shadow: 0 0 25px #ff007f; }
  .t-2048 { background: #fff; color: #000; border: 2px solid #fff; box-shadow: 0 0 30px #fff; font-size: 22px; }

  /* D-PAD Kontrol */
  .dpad {
    display: grid;
    grid-template-columns: repeat(3, 60px);
    grid-template-rows: repeat(3, 60px);
    gap: 6px;
    justify-content: center;
    margin-top: 16px;
  }
  .dpad-btn {
    background: rgba(0, 243, 255, 0.1);
    border: 1px solid rgba(0, 243, 255, 0.4);
    color: #00f3ff;
    border-radius: 10px;
    display: flex; justify-content: center; align-items: center;
    font-size: 24px; font-weight: 900;
    cursor: pointer;
    transition: 0.15s;
    font-family: inherit;
  }
  .dpad-btn:active { background: #00f3ff; color: #000; transform: scale(0.95); }
  .dpad-up { grid-column: 2; grid-row: 1; }
  .dpad-left { grid-column: 1; grid-row: 2; }
  .dpad-center { grid-column: 2; grid-row: 2; background: transparent; border: none; font-size: 14px; color: #8892b0; }
  .dpad-right { grid-column: 3; grid-row: 2; }
  .dpad-down { grid-column: 2; grid-row: 3; }

  .overlay {
    position: absolute; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(10, 10, 15, 0.95); border-radius: 12px;
    display: flex; flex-direction: column; justify-content: center; align-items: center;
    opacity: 0; pointer-events: none; transition: 0.3s; z-index: 20;
  }
  .overlay.show { opacity: 1; pointer-events: auto; }
  .overlay h2 { font-size: 28px; color: #ff007f; text-shadow: 0 0 15px #ff007f; margin-bottom: 8px; }
  .overlay p { font-size: 15px; color: #fff; margin-bottom: 16px; }
  .overlay .btn { font-size: 16px; padding: 10px 20px; background: #ff007f; color: #fff; border: none; }
</style>
</head>
<body>
<div class="wrap">
  <div class="card">
    <div class="header">
      <div class="title">2048</div>
      <div class="scores">
        <div class="score-box"><div class="score-label">Skor</div><div class="score-val" id="score">0</div></div>
        <div class="score-box"><div class="score-label">Best</div><div class="score-val" id="best">0</div></div>
      </div>
    </div>
    <div class="controls">
      <button class="btn" id="restart">Ulangi</button>
      <div style="font-size: 11px; color: #8892b0;">Pakai tombol / swipe</div>
    </div>
    <div class="board" id="gameArea">
      <div class="board-inner"></div>
      <div class="grid-overlay" id="board">
        <div class="cell" id="c-0-0"></div>
        <div class="cell" id="c-0-1"></div>
        <div class="cell" id="c-0-2"></div>
        <div class="cell" id="c-0-3"></div>
        <div class="cell" id="c-1-0"></div>
        <div class="cell" id="c-1-1"></div>
        <div class="cell" id="c-1-2"></div>
        <div class="cell" id="c-1-3"></div>
        <div class="cell" id="c-2-0"></div>
        <div class="cell" id="c-2-1"></div>
        <div class="cell" id="c-2-2"></div>
        <div class="cell" id="c-2-3"></div>
        <div class="cell" id="c-3-0"></div>
        <div class="cell" id="c-3-1"></div>
        <div class="cell" id="c-3-2"></div>
        <div class="cell" id="c-3-3"></div>
      </div>
      <div class="overlay" id="overlay">
        <h2 id="overlayTitle">Game Over!</h2>
        <p id="overlayDesc">-</p>
        <button class="btn" id="overlayBtn">Coba Lagi</button>
      </div>
    </div>

    <!-- KONTROL D-PAD (Tombol Panah) -->
    <div class="dpad">
      <button class="dpad-btn dpad-up" id="btnUp">↑</button>
      <button class="dpad-btn dpad-left" id="btnLeft">←</button>
      <div class="dpad-btn dpad-center">2048</div>
      <button class="dpad-btn dpad-right" id="btnRight">→</button>
      <button class="dpad-btn dpad-down" id="btnDown">↓</button>
    </div>
  </div>
</div>

<script>
(function() {
  const N = 4;
  let board = [];
  let score = 0;
  let best = 0;
  try { best = parseInt(localStorage.getItem('2048_best') || '0', 10) || 0; } catch(e) {}
  let isGameOver = false;
  let isWon = false;

  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlayTitle');
  const overlayDesc = document.getElementById('overlayDesc');

  bestEl.textContent = best;

  const cells = [];
  for (let r = 0; r < N; r++) {
    cells[r] = [];
    for (let c = 0; c < N; c++) {
      cells[r][c] = document.getElementById('c-' + r + '-' + c);
    }
  }

  function initBoard() {
    board = [];
    for (let r = 0; r < N; r++) {
      board[r] = [];
      for (let c = 0; c < N; c++) board[r][c] = 0;
    }
    score = 0;
    isGameOver = false;
    isWon = false;
    overlay.classList.remove('show');
    updateScoreUI();
    addRandomTile();
    addRandomTile();
    render();
  }

  function addRandomTile() {
    let empty = [];
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (board[r][c] === 0) empty.push([r, c]);
      }
    }
    if (!empty.length) return;
    let spot = empty[Math.floor(Math.random() * empty.length)];
    board[spot[0]][spot[1]] = Math.random() < 0.9 ? 2 : 4;
  }

  function render() {
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const cell = cells[r][c];
        const val = board[r][c];
        cell.className = 'cell';
        if (val !== 0) {
          cell.textContent = String(val);
          cell.classList.add('t-' + val);
        } else {
          cell.textContent = '';
        }
      }
    }
  }

  function updateScoreUI() {
    scoreEl.textContent = String(score);
    if (score > best) {
      best = score;
      bestEl.textContent = String(best);
      try { localStorage.setItem('2048_best', String(best)); } catch(e) {}
    }
  }

  function slide(row) {
    let arr = row.filter(v => v !== 0);
    while (arr.length < N) arr.unshift(0);
    return arr;
  }

  function combine(row) {
    for (let i = N - 1; i > 0; i--) {
      if (row[i] !== 0 && row[i] === row[i - 1]) {
        row[i] = row[i] * 2;
        row[i - 1] = 0;
        score += row[i];
        if (row[i] === 2048 && !isWon) {
          isWon = true;
          showOverlay('Kamu Menang!', 'Kamu mencapai 2048!', 'Main Lagi');
        }
      }
    }
    return row;
  }

  function operate(row) {
    row = slide(row);
    row = combine(row);
    row = slide(row);
    return row;
  }

  function move(dir) {
    if (isGameOver || isWon) return;
    const old = JSON.stringify(board);

    if (dir === 'left') {
      for (let r = 0; r < N; r++) board[r] = operate(board[r].slice());
    } else if (dir === 'right') {
      for (let r = 0; r < N; r++) board[r] = operate(board[r].slice().reverse()).reverse();
    } else if (dir === 'up') {
      for (let c = 0; c < N; c++) {
        let col = [];
        for (let r = 0; r < N; r++) col.push(board[r][c]);
        col = operate(col);
        for (let r = 0; r < N; r++) board[r][c] = col[r];
      }
    } else if (dir === 'down') {
      for (let c = 0; c < N; c++) {
        let col = [];
        for (let r = 0; r < N; r++) col.push(board[r][c]);
        col = operate(col.reverse()).reverse();
        for (let r = 0; r < N; r++) board[r][c] = col[r];
      }
    }

    if (JSON.stringify(board) !== old) {
      addRandomTile();
      render();
      updateScoreUI();
      checkGameOver();
    }
  }

  function checkGameOver() {
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (board[r][c] === 0) return;
        if (c < N - 1 && board[r][c] === board[r][c + 1]) return;
        if (r < N - 1 && board[r][c] === board[r + 1][c]) return;
      }
    }
    isGameOver = true;
    showOverlay('Game Over!', 'Skor: ' + score, 'Coba Lagi');
  }

  function showOverlay(title, desc, btnText) {
    overlayTitle.textContent = title;
    overlayDesc.textContent = desc;
    document.getElementById('overlayBtn').textContent = btnText;
    overlay.classList.add('show');
  }

  // ─── KONTROL UTAMA: TOMBOL D-PAD ───
  document.getElementById('btnUp').addEventListener('click', function(e) {
    e.preventDefault();
    move('up');
  });
  document.getElementById('btnDown').addEventListener('click', function(e) {
    e.preventDefault();
    move('down');
  });
  document.getElementById('btnLeft').addEventListener('click', function(e) {
    e.preventDefault();
    move('left');
  });
  document.getElementById('btnRight').addEventListener('click', function(e) {
    e.preventDefault();
    move('right');
  });

  // ─── KONTROL KEYBOARD (Opsional) ───
  document.addEventListener('keydown', function(e) {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'a', 'd', 'w', 's'].indexOf(e.key) !== -1) {
      e.preventDefault();
    }
    if (e.key === 'ArrowLeft' || e.key === 'a') move('left');
    if (e.key === 'ArrowRight' || e.key === 'd') move('right');
    if (e.key === 'ArrowUp' || e.key === 'w') move('up');
    if (e.key === 'ArrowDown' || e.key === 's') move('down');
  });

  // ─── KONTROL SWIPE (Opsional) ───
  let startX = 0, startY = 0;
  const gameArea = document.getElementById('gameArea');
  gameArea.addEventListener('touchstart', function(e) {
    startX = e.changedTouches[0].screenX;
    startY = e.changedTouches[0].screenY;
  }, { passive: true });
  gameArea.addEventListener('touchend', function(e) {
    const dx = e.changedTouches[0].screenX - startX;
    const dy = e.changedTouches[0].screenY - startY;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 30) move('right');
      else if (dx < -30) move('left');
    } else {
      if (dy > 30) move('down');
      else if (dy < -30) move('up');
    }
  }, { passive: true });

  document.getElementById('restart').addEventListener('click', initBoard);
  document.getElementById('overlayBtn').addEventListener('click', initBoard);

  initBoard();
})();
</script>
</body>
</html>`;

export default {
    command: ['2048'],
    category: 'rich',
    execute: async (denn, m) => {
        try {
            const rich = new AIRich(denn, {
                dynamic: true,
                unsupportedTypeAlert: false
            });

            rich.addSection({
                view_model: {
                    primitive: {
                        __typename: 'GenAIaeacdsnwHtmlPrimitive',
                        payload: htmlPayload,
                        trusted_sources: ['lumnztyz.dev']
                    },
                    __typename: 'GenAISingleLayoutViewModel'
                }
            });

            await rich.send(m.chat, {
                quoted: m,
                includesUnifiedResponse: true,
                includesSubmessages: false,
                forwarded: true,
                notification: false
            });

            console.log('[2048] Game berhasil dikirim!');

        } catch (err) {
            console.error('[2048 Error]', err);
            sendFakeQuoted(denn, m, 
                `❌ *Gagal memuat game 2048:*\n${err.message}\n\n_Pastikan HP kamu sudah mendukung fitur WhatsApp AI (versi beta/terbaru)._`, 
                { title: '2048 Gagal', body: 'Fitur HTML Rich tidak didukung' }
            );
        }
    }
};