/**
 * app.js - 五子棋 UI 控制器
 *
 * 职责：Canvas 渲染、用户交互、UI 状态同步
 * 依赖：game.js (GomokuGame), ai.js (GomokuAI)
 */

(function () {
  'use strict';

  // ========================
  // 常量 & 配置
  // ========================
  if (typeof BOARD_SIZE === 'undefined') var BOARD_SIZE = 15;
  const CELL_SIZE = 40;            // 格子大小 (px)
  const PADDING = 30;              // 棋盘边距 (px)
  const STONE_RADIUS = 17;         // 棋子半径
  const DOT_RADIUS = 4;            // 星位点半径
  const CANVAS_SIZE = CELL_SIZE * (BOARD_SIZE - 1) + PADDING * 2;

  // 星位坐标（标准五子棋）
  const STAR_POINTS = [
    [3, 3], [3, 11], [11, 3], [11, 11], [7, 7]
  ];

  // ========================
  // ========================
  // DOM 引用
  // ========================
  let canvas, ctx;
  let $playerBlack, $playerWhite, $moveHistory, $statusText, $winOverlay, $winText;
  let $btnPvP, $btnPvE, $btnEve, $btnUndo, $btnRestart, $btnRestartOverlay;
  let $aiSettings, $eveSettings, $btnEveStart;
  let $diffButtons, $eveBlackButtons, $eveWhiteButtons, $eveSpeed;
  let $statBlack, $statWhite, $statDraw;

  // ========================
  // 状态
  // ========================
  let game = new GomokuGame();
  let ai = new GomokuAI('medium');
  let mode = 'pvp';          // 'pvp' | 'pve' | 'eve'
  let aiThinking = false;
  let hoverPos = null;        // 鼠标悬停位置 {row, col}
  let lastMovePos = null;     // 最后一步位置

  let stoneAnimStart = 0;
  const ANIM_DURATION = 150;

  // EVE 模式状态
  let eveBlackAI = new GomokuAI('medium');
  let eveWhiteAI = new GomokuAI('medium');
  let eveTimer = null;        // setTimeout ID
  let evePaused = false;
  let eveRunning = false;     // 是否已开始对弈

  let stats = { black: 0, white: 0, draw: 0 };

  // ========================
  // 初始化
  // ========================
  function init() {
    canvas = document.getElementById('board-canvas');
    if (!canvas) {
      console.error('[Gomoku] board-canvas element not found');
      return;
    }
    ctx = canvas.getContext('2d');

    $playerBlack = document.getElementById('player-black');
    $playerWhite = document.getElementById('player-white');
    $moveHistory = document.getElementById('move-history');
    $statusText = document.getElementById('status-text');
    $winOverlay = document.getElementById('win-overlay');
    $winText = document.getElementById('win-text');

    $btnPvP = document.getElementById('btn-pvp');
    $btnPvE = document.getElementById('btn-pve');
    $btnEve = document.getElementById('btn-eve');
    $btnUndo = document.getElementById('btn-undo');
    $btnRestart = document.getElementById('btn-restart');
    $btnRestartOverlay = document.getElementById('btn-restart-overlay');
    $aiSettings = document.getElementById('ai-settings');
    $eveSettings = document.getElementById('eve-settings');
    $btnEveStart = document.getElementById('btn-eve-start');
    $diffButtons = document.querySelectorAll('.btn-diff');
    $eveBlackButtons = document.querySelectorAll('.btn-eve-black');
    $eveWhiteButtons = document.querySelectorAll('.btn-eve-white');
    $eveSpeed = document.getElementById('eve-speed');

    $statBlack = document.getElementById('stat-black');
    $statWhite = document.getElementById('stat-white');
    $statDraw = document.getElementById('stat-draw');

    // 设置 Canvas 尺寸（含高分屏适配）
    const dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS_SIZE * dpr;
    canvas.height = CANVAS_SIZE * dpr;
    canvas.style.width = CANVAS_SIZE + 'px';
    canvas.style.height = CANVAS_SIZE + 'px';
    ctx.scale(dpr, dpr);

    // 绑定事件
    canvas.addEventListener('click', onCanvasClick);
    canvas.addEventListener('mousemove', onCanvasMouseMove);
    canvas.addEventListener('mouseleave', onCanvasMouseLeave);

    if ($btnPvP) $btnPvP.addEventListener('click', () => setMode('pvp'));
    if ($btnPvE) $btnPvE.addEventListener('click', () => setMode('pve'));
    if ($btnEve) $btnEve.addEventListener('click', () => setMode('eve'));
    if ($btnUndo) $btnUndo.addEventListener('click', onUndo);
    if ($btnRestart) $btnRestart.addEventListener('click', onRestart);
    if ($btnRestartOverlay) $btnRestartOverlay.addEventListener('click', onRestart);

    $diffButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        $diffButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        ai = new GomokuAI(btn.dataset.level);
      });
    });

    // EVE 难度按钮
    $eveBlackButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        $eveBlackButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        eveBlackAI = new GomokuAI(btn.dataset.level);
      });
    });
    $eveWhiteButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        $eveWhiteButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        eveWhiteAI = new GomokuAI(btn.dataset.level);
      });
    });

    // EVE 开始按钮
    if ($btnEveStart) {
      $btnEveStart.addEventListener('click', () => {
        if (game.gameOver) {
          onRestart();
        }
        eveRunning = true;
        evePaused = false;
        $btnEveStart.disabled = true;
        $btnEveStart.textContent = '对弈中...';
        eveStop();
        console.log('[EVE Started]', {
          blackAI: eveBlackAI.level,
          whiteAI: eveWhiteAI.level,
          speed: $eveSpeed ? $eveSpeed.value : 500
        });
        eveTimer = setTimeout(eveStep, 100);
      });
    }

    // 首次渲染
    render();
    updateUI();
  }

  // ========================
  // 事件处理
  // ========================
  function onCanvasClick(e) {
    // EVE 模式：点击切换暂停/继续
    if (mode === 'eve') {
      if (!eveRunning || game.gameOver) return;
      evePaused = !evePaused;
      console.log('[EVE Toggle Pause]', evePaused ? 'PAUSED' : 'RESUMED');
      if (!evePaused) eveStep();
      updateUI();
      return;
    }

    if (game.gameOver || aiThinking) return;

    const pos = canvasToBoard(e.offsetX, e.offsetY);
    if (!pos) return;

    const result = game.placeStone(pos.row, pos.col);
    if (!result.success) return;

    lastMovePos = { row: pos.row, col: pos.col };
    stoneAnimStart = performance.now();
    requestAnimationFrame(animLoop);
    updateUI();

    if (result.winner !== undefined) {
      onGameEnd(result);
      return;
    }

    // PvE 模式：轮到 AI
    if (mode === 'pve' && game.currentPlayer === WHITE) {
      aiThinking = true;
      updateUI();
      // 延迟以显示动画
      setTimeout(() => {
        const aiMove = ai.getMove(game);
        const aiResult = game.placeStone(aiMove.row, aiMove.col);
        lastMovePos = { row: aiMove.row, col: aiMove.col };
        aiThinking = false;
        
        stoneAnimStart = performance.now();
        requestAnimationFrame(animLoop);
        
        updateUI();
        if (aiResult.winner !== undefined) {
          onGameEnd(aiResult);
        }
      }, 300);
    }
  }

  function animLoop(now) {
    if (stoneAnimStart > 0 && now - stoneAnimStart <= ANIM_DURATION) {
      render(now);
      requestAnimationFrame(animLoop);
    } else {
      stoneAnimStart = 0;
      render(); // final render
    }
  }

  function onCanvasMouseMove(e) {
    const pos = canvasToBoard(e.offsetX, e.offsetY);
    if (pos && (!hoverPos || hoverPos.row !== pos.row || hoverPos.col !== pos.col)) {
      hoverPos = pos;
      render();
    }
  }

  function onCanvasMouseLeave() {
    hoverPos = null;
    render();
  }

  function onUndo() {
    if (mode === 'pve') {
      // PvE 悔棋需撤两步（AI + 玩家）
      game.undo();
      game.undo();
    } else {
      game.undo();
    }
    lastMovePos = game.moveHistory.length > 0
      ? game.moveHistory[game.moveHistory.length - 1]
      : null;
    render();
    updateUI();
  }

  function onRestart() {
    eveStop();
    game.reset();
    lastMovePos = null;
    hoverPos = null;
    evePaused = false;
    eveRunning = false;
    if ($btnEveStart) {
      $btnEveStart.disabled = false;
      $btnEveStart.textContent = '开始对战';
    }
    $winOverlay.classList.add('hidden');
    render();
    updateUI();
  }

  function setMode(newMode) {
    eveStop();
    mode = newMode;
    $btnPvP.classList.toggle('active', mode === 'pvp');
    $btnPvE.classList.toggle('active', mode === 'pve');
    $btnEve.classList.toggle('active', mode === 'eve');

    $aiSettings.classList.add('hidden');
    $eveSettings.classList.add('hidden');

    if (mode === 'pve') {
      $aiSettings.classList.remove('hidden');
      document.getElementById('black-name').textContent = '玩家 1';
      document.getElementById('white-name').textContent = 'AI';
    } else if (mode === 'eve') {
      $eveSettings.classList.remove('hidden');
      document.getElementById('black-name').textContent = 'AI (黑)';
      document.getElementById('white-name').textContent = 'AI (白)';
    } else {
      document.getElementById('black-name').textContent = '玩家 1';
      document.getElementById('white-name').textContent = '玩家 2';
    }

    onRestart();
  }

  // ========================
  // EVE 自动对弈
  // ========================
  function eveStep() {
    if (mode !== 'eve' || game.gameOver || evePaused) {
      console.log('[EVE Step Skipped]', { mode, gameOver: game.gameOver, evePaused });
      return;
    }

    try {
      const targetDelay = parseInt($eveSpeed.value) || 0;
      const timeBudget = targetDelay > 100 ? targetDelay - 50 : 0;

      const stepStart = Date.now();
      const currentAI = game.currentPlayer === BLACK ? eveBlackAI : eveWhiteAI;
      const move = currentAI.getMove(game, timeBudget);
      const aiElapsed = Date.now() - stepStart;

      console.log(`[EVE Step ${game.moveHistory.length + 1}]`,
        game.currentPlayer === BLACK ? 'BLACK' : 'WHITE',
        `move: (${move.row}, ${move.col})`,
        `elapsed: ${aiElapsed}ms`
      );

      const result = game.placeStone(move.row, move.col);
      if (!result.success) {
        console.error('[EVE Move Fail]', result, move);
        return;
      }

      lastMovePos = { row: move.row, col: move.col };
      stoneAnimStart = performance.now();
      requestAnimationFrame(animLoop);
      updateUI();

      if (result.winner !== undefined) {
        onGameEnd(result);
        return;
      }

      const remaining = Math.max(50, targetDelay - aiElapsed);
      eveTimer = setTimeout(eveStep, remaining);
    } catch (err) {
      console.error('[EVE Exception]', err);
    }
  }

  function eveStop() {
    if (eveTimer) {
      clearTimeout(eveTimer);
      eveTimer = null;
    }
  }

  function onGameEnd(result) {
    if (result.draw) {
      $winText.textContent = '平局！';
      $winText.style.color = 'var(--text-primary)';
      stats.draw++;
    } else if (result.winner === BLACK) {
      $winText.textContent = '🖤 黑方获胜！';
      $winText.style.color = 'var(--win-black)';
      stats.black++;
    } else {
      $winText.textContent = '🤍 白方获胜！';
      $winText.style.color = 'var(--win-white)';
      stats.white++;
    }

    $winOverlay.classList.remove('hidden');
    updateStats();
  }

  // ========================
  // Canvas 渲染
  // ========================
  function render(now) {
    let scale = 1;
    if (now && stoneAnimStart > 0) {
       const progress = Math.min((now - stoneAnimStart) / ANIM_DURATION, 1);
       scale = 1 - Math.pow(1 - progress, 3);
    }

    drawBoard();
    drawStones(now);
    drawHover();
    drawLastMove(scale);
    drawWinLine();
  }

  /** 绘制棋盘（木纹底色 + 网格线 + 星位） */
  function drawBoard() {
    // 背景
    ctx.fillStyle = '#dcb35c';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // 木纹渐变叠加
    const grad = ctx.createLinearGradient(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    grad.addColorStop(0, 'rgba(180, 140, 60, 0.15)');
    grad.addColorStop(0.5, 'rgba(220, 180, 90, 0.05)');
    grad.addColorStop(1, 'rgba(160, 120, 40, 0.15)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // 网格线
    ctx.strokeStyle = 'rgba(90, 74, 42, 0.6)';
    ctx.lineWidth = 1;

    for (let i = 0; i < BOARD_SIZE; i++) {
      const pos = PADDING + i * CELL_SIZE;

      // 横线
      ctx.beginPath();
      ctx.moveTo(PADDING, pos);
      ctx.lineTo(PADDING + (BOARD_SIZE - 1) * CELL_SIZE, pos);
      ctx.stroke();

      // 竖线
      ctx.beginPath();
      ctx.moveTo(pos, PADDING);
      ctx.lineTo(pos, PADDING + (BOARD_SIZE - 1) * CELL_SIZE);
      ctx.stroke();
    }

    // 星位
    ctx.fillStyle = 'rgba(74, 58, 26, 0.8)';
    for (const [r, c] of STAR_POINTS) {
      const x = PADDING + c * CELL_SIZE;
      const y = PADDING + r * CELL_SIZE;
      ctx.beginPath();
      ctx.arc(x, y, DOT_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }

    // 坐标标签
    ctx.fillStyle = 'rgba(90, 74, 42, 0.8)';
    ctx.font = '12px var(--font-family, sans-serif)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < BOARD_SIZE; i++) {
      // 列：A-O
      const colText = String.fromCharCode(65 + i);
      const x = PADDING + i * CELL_SIZE;
      ctx.fillText(colText, x, PADDING / 2);
      ctx.fillText(colText, x, CANVAS_SIZE - PADDING / 2);

      // 行：15-1
      const rowText = (BOARD_SIZE - i).toString();
      const y = PADDING + i * CELL_SIZE;
      ctx.fillText(rowText, PADDING / 2, y);
      ctx.fillText(rowText, CANVAS_SIZE - PADDING / 2, y);
    }
  }

  /** 绘制所有棋子 */
  function drawStones(now) {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const stone = game.board[r][c];
        if (stone === EMPTY) continue;
        
        let scale = 1;
        if (now && lastMovePos && lastMovePos.row === r && lastMovePos.col === c && stoneAnimStart > 0) {
          const progress = Math.min((now - stoneAnimStart) / ANIM_DURATION, 1);
          scale = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        }
        
        drawStone(r, c, stone, scale);
      }
    }
  }

  /** 绘制单个棋子 */
  function drawStone(row, col, player, scale = 1) {
    const x = PADDING + col * CELL_SIZE;
    const y = PADDING + row * CELL_SIZE;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    // 阴影
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = 6 * scale;
    ctx.shadowOffsetX = 2 * scale;
    ctx.shadowOffsetY = 2 * scale;

    if (player === BLACK) {
      const grad = ctx.createRadialGradient(-5, -5, 2, 0, 0, STONE_RADIUS);
      grad.addColorStop(0, '#555');
      grad.addColorStop(1, '#1a1a1a');
      ctx.fillStyle = grad;
    } else {
      const grad = ctx.createRadialGradient(-5, -5, 2, 0, 0, STONE_RADIUS);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(1, '#d8d4cc');
      ctx.fillStyle = grad;
    }

    ctx.beginPath();
    ctx.arc(0, 0, STONE_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /** 绘制悬停预览 */
  function drawHover() {
    if (!hoverPos || game.gameOver || aiThinking || mode === 'eve') return;
    if (game.board[hoverPos.row][hoverPos.col] !== EMPTY) return;

    const x = PADDING + hoverPos.col * CELL_SIZE;
    const y = PADDING + hoverPos.row * CELL_SIZE;

    ctx.save();
    ctx.globalAlpha = 0.35;

    if (game.currentPlayer === BLACK) {
      ctx.fillStyle = '#1a1a1a';
    } else {
      ctx.fillStyle = '#f0ece4';
    }

    ctx.beginPath();
    ctx.arc(x, y, STONE_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** 标记最后一步 */
  function drawLastMove(scale = 1) {
    if (!lastMovePos) return;

    const x = PADDING + lastMovePos.col * CELL_SIZE;
    const y = PADDING + lastMovePos.row * CELL_SIZE;
    const stone = game.board[lastMovePos.row][lastMovePos.col];

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    
    ctx.fillStyle = stone === BLACK ? '#d4a54a' : '#4a90d9';
    
    // 显示手数
    const moveNum = game.moveHistory.length;
    ctx.font = 'bold 13px var(--font-family, sans-serif)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(moveNum, 0, 1);
    
    ctx.restore();
  }

  /** 绘制获胜连线 */
  function drawWinLine() {
    if (game.winLine.length === 0) return;

    ctx.save();
    ctx.strokeStyle = game.winner === BLACK ? 'var(--win-black)' : 'var(--win-white)';
    ctx.strokeStyle = game.winner === BLACK ? '#d4a54a' : '#4a90d9';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.shadowColor = game.winner === BLACK
      ? 'rgba(212, 165, 74, 0.6)'
      : 'rgba(74, 144, 217, 0.6)';
    ctx.shadowBlur = 12;

    // 按坐标排序连线
    const sorted = [...game.winLine].sort((a, b) =>
      a.row !== b.row ? a.row - b.row : a.col - b.col
    );

    ctx.beginPath();
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    ctx.moveTo(PADDING + first.col * CELL_SIZE, PADDING + first.row * CELL_SIZE);
    ctx.lineTo(PADDING + last.col * CELL_SIZE, PADDING + last.row * CELL_SIZE);
    ctx.stroke();
    ctx.restore();
  }

  // ========================
  // 坐标转换
  // ========================
  function canvasToBoard(px, py) {
    const col = Math.round((px - PADDING) / CELL_SIZE);
    const row = Math.round((py - PADDING) / CELL_SIZE);
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return null;
    return { row, col };
  }

  // ========================
  // UI 同步
  // ========================
  function updateUI() {
    // 当前玩家高亮（EVE 模式下不闪烁）
    if (mode === 'eve') {
      if ($playerBlack) $playerBlack.classList.remove('active');
      if ($playerWhite) $playerWhite.classList.remove('active');
    } else {
      if ($playerBlack) $playerBlack.classList.toggle('active', game.currentPlayer === BLACK && !game.gameOver);
      if ($playerWhite) $playerWhite.classList.toggle('active', game.currentPlayer === WHITE && !game.gameOver);
    }

    // 状态文本
    if (!game.gameOver && $statusText) {
      if (mode === 'eve') {
        if (!eveRunning) {
          $statusText.textContent = '选好难度后点击「开始对战」';
        } else {
          const moveCount = game.moveHistory.length;
          const pauseHint = evePaused ? ' (已暂停，点击棋盘继续)' : '';
          $statusText.textContent = `第 ${moveCount} 手${pauseHint}`;
        }
      } else if (aiThinking) {
        $statusText.innerHTML = 'AI 思考中...<span class="ai-thinking-indicator"></span>';
      } else {
        $statusText.textContent = game.currentPlayer === BLACK ? '黑方执子' : '白方执子';
      }
    }

    // 悔棋按钮（EVE 模式禁用）
    if ($btnUndo) {
      $btnUndo.disabled = game.moveHistory.length === 0 || game.gameOver || mode === 'eve';
    }

    // 落子记录
    updateMoveHistory();
  }

  function updateMoveHistory() {
    if (!$moveHistory) return;
    $moveHistory.innerHTML = '';
    game.moveHistory.forEach((move, i) => {
      const li = document.createElement('li');
      const label = move.player === BLACK ? '⚫' : '⚪';
      const coord = `${String.fromCharCode(65 + move.col)}${BOARD_SIZE - move.row}`;
      li.textContent = `${i + 1}. ${label} ${coord}`;
      $moveHistory.appendChild(li);
    });

    // 滚动到底部
    if ($moveHistory.parentElement) {
      $moveHistory.parentElement.scrollTop = $moveHistory.parentElement.scrollHeight;
    }
  }

  function updateStats() {
    if ($statBlack) $statBlack.textContent = stats.black;
    if ($statWhite) $statWhite.textContent = stats.white;
    if ($statDraw) $statDraw.textContent = stats.draw;
  }

  // ========================
  // 启动
  // ========================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
