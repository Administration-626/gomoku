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
  // DOM 引用
  // ========================
  let canvas, ctx;
  let $playerBlack, $playerWhite, $moveHistory, $statusText, $winOverlay, $winText;
  let $btnPvP, $btnPvE, $btnEve, $btnStudy, $btnUndo, $btnRestart, $btnRestartOverlay;
  let $aiSettings, $eveSettings, $studyCard, $btnEveStart, $btnPvEStart;
  let $diffButtons, $playerColorButtons, $eveBlackButtons, $eveWhiteButtons, $eveSpeed, $pveSpeed;
  let $chkFoul, $foulToast, foulToastTimer, $btnExportDebug;
  let $statBlack, $statWhite, $statDraw;

  let $btnStartReplay, $btnViewBoard;
  let $replayCard, $btnReplayPrev, $btnReplayPlay, $btnReplayNext, $replayProgress;

  // 学习模式 DOM
  let $btnTabMentor, $btnTabPuzzle, $btnTabOpening;
  let $studyTabMentor, $studyTabPuzzle, $studyTabOpening;
  let $winRateVal, $winRateBarFill, $chkShowHints, $chkShowFoulRadar, $btnGetHint, $btnAnalyzeGame;
  let $puzzleSelect, $puzzleTitle, $puzzleDesc, $btnPuzzleHint, $btnPuzzleReset;
  let $openingSelect, $openingName, $openingDesc, $btnOpeningDemo;
  let $aiReviewContainer, $aiReviewList;

  // ========================
  // 状态
  // ========================
  let game = new GomokuGame();
  let ai = new GomokuAI('medium');
  let mode = 'pve';          // 'pvp' | 'pve' | 'eve' | 'study'
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

  // 复盘与回放状态
  let isReplaying = false;
  let replayStep = 0;           // 当前复盘步数
  let replayPlaying = false;    // 是否处于自动回放中
  let replayTimer = null;       // 自动播放定时器 ID
  let savedHistory = [];        // 终局时保存的全部落子历史

  // 学习模式状态
  let studySubTab = 'mentor';   // 'mentor' | 'puzzle' | 'opening'
  let activePuzzle = null;
  let activePuzzleStep = 0;
  let activeOpening = null;
  let openingDemoTimer = null;
  let studyHints = [];          // [{row, col, rank, reason, score}]
  let activeReviewData = [];    // AI 全局复盘数据
  let selectedReviewStep = null;

  let playerColor = BLACK; // 默认玩家执黑先手 (BLACK | WHITE)
  let globalFoulPreference = false; // 用户全局禁手规则勾选记忆（切换模式时绝不重置）
  let stats = { black: 0, white: 0, draw: 0 };

  function updateStats() {
    if ($statBlack) $statBlack.textContent = stats.black;
    if ($statWhite) $statWhite.textContent = stats.white;
    if ($statDraw) $statDraw.textContent = stats.draw;
  }

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
    $btnStudy = document.getElementById('btn-study');
    $btnUndo = document.getElementById('btn-undo');
    $btnRestart = document.getElementById('btn-restart');
    $btnRestartOverlay = document.getElementById('btn-restart-overlay');
    $aiSettings = document.getElementById('ai-settings');
    $eveSettings = document.getElementById('eve-settings');
    $studyCard = document.getElementById('study-card');
    $btnEveStart = document.getElementById('btn-eve-start');
    $btnPvEStart = document.getElementById('btn-pve-start');
    $diffButtons = document.querySelectorAll('.btn-diff');
    $playerColorButtons = document.querySelectorAll('.btn-player-color');
    $eveBlackButtons = document.querySelectorAll('.btn-eve-black');
    $eveWhiteButtons = document.querySelectorAll('.btn-eve-white');
    $eveSpeed = document.getElementById('eve-speed');
    $pveSpeed = document.getElementById('pve-speed');

    $chkFoul = document.getElementById('chk-foul');
    $foulToast = document.getElementById('foul-toast');
    $btnExportDebug = document.getElementById('btn-export-debug');

    $btnStartReplay = document.getElementById('btn-start-replay');
    $btnViewBoard = document.getElementById('btn-view-board');
    $replayCard = document.getElementById('replay-card');
    $btnReplayPrev = document.getElementById('btn-replay-prev');
    $btnReplayPlay = document.getElementById('btn-replay-play');
    $btnReplayNext = document.getElementById('btn-replay-next');
    $replayProgress = document.getElementById('replay-progress');

    // 学习模式 DOM
    $btnTabMentor = document.getElementById('btn-tab-mentor');
    $btnTabPuzzle = document.getElementById('btn-tab-puzzle');
    $btnTabOpening = document.getElementById('btn-tab-opening');
    $studyTabMentor = document.getElementById('study-tab-mentor');
    $studyTabPuzzle = document.getElementById('study-tab-puzzle');
    $studyTabOpening = document.getElementById('study-tab-opening');
    $winRateVal = document.getElementById('win-rate-val');
    $winRateBarFill = document.getElementById('win-rate-bar-fill');
    $chkShowHints = document.getElementById('chk-show-hints');
    $chkShowFoulRadar = document.getElementById('chk-show-foul-radar');
    $btnGetHint = document.getElementById('btn-get-hint');
    $btnAnalyzeGame = document.getElementById('btn-analyze-game');
    $puzzleSelect = document.getElementById('puzzle-select');
    $puzzleTitle = document.getElementById('puzzle-title');
    $puzzleDesc = document.getElementById('puzzle-desc');
    $btnPuzzleHint = document.getElementById('btn-puzzle-hint');
    $btnPuzzleReset = document.getElementById('btn-puzzle-reset');
    $openingSelect = document.getElementById('opening-select');
    $openingName = document.getElementById('opening-name');
    $openingDesc = document.getElementById('opening-desc');
    $btnOpeningDemo = document.getElementById('btn-opening-demo');
    $aiReviewContainer = document.getElementById('ai-review-container');
    $aiReviewList = document.getElementById('ai-review-list');

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
    if ($btnStudy) $btnStudy.addEventListener('click', () => setMode('study'));
    if ($btnUndo) $btnUndo.addEventListener('click', onUndo);
    if ($btnRestart) $btnRestart.addEventListener('click', onRestart);
    if ($btnRestartOverlay) $btnRestartOverlay.addEventListener('click', onRestart);

    if ($btnViewBoard) $btnViewBoard.addEventListener('click', onViewBoard);
    if ($btnStartReplay) $btnStartReplay.addEventListener('click', onStartReplay);
    if ($btnReplayPrev) $btnReplayPrev.addEventListener('click', onReplayPrev);
    if ($btnReplayPlay) $btnReplayPlay.addEventListener('click', onReplayTogglePlay);
    if ($btnReplayNext) $btnReplayNext.addEventListener('click', onReplayNext);

    if ($btnExportDebug) $btnExportDebug.addEventListener('click', onExportDebug);

    if ($chkFoul) {
      globalFoulPreference = $chkFoul.checked;
      $chkFoul.addEventListener('change', () => {
        globalFoulPreference = $chkFoul.checked;
        game.enableFoul = globalFoulPreference;
      });
    }

    // 学习模式 DOM 事件绑定
    if ($btnTabMentor) $btnTabMentor.addEventListener('click', () => switchStudyTab('mentor'));
    if ($btnTabPuzzle) $btnTabPuzzle.addEventListener('click', () => switchStudyTab('puzzle'));
    if ($btnTabOpening) $btnTabOpening.addEventListener('click', () => switchStudyTab('opening'));

    if ($btnGetHint) {
      $btnGetHint.addEventListener('click', () => {
        fetchAIHints();
      });
    }

    if ($btnAnalyzeGame) {
      $btnAnalyzeGame.addEventListener('click', () => {
        runFullGameReview();
      });
    }

    if ($chkShowHints) {
      $chkShowHints.addEventListener('change', () => {
        if ($chkShowHints.checked) fetchAIHints();
        else studyHints = [];
        render();
      });
    }

    if ($chkShowFoulRadar) {
      $chkShowFoulRadar.addEventListener('change', () => {
        render();
      });
    }

    initStudyMode();

    $diffButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        $diffButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        ai = new GomokuAI(btn.dataset.level);
        updateUI(); // 立即刷新左侧 AI 名称中的难度标注
      });
    });

    // 玩家持子选边按钮
    $playerColorButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        $playerColorButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        playerColor = btn.dataset.color === 'white' ? WHITE : BLACK;
        onRestart();
      });
    });

    // EVE 难度按钮
    $eveBlackButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        $eveBlackButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        eveBlackAI = new GomokuAI(btn.dataset.level);
        updateUI(); // 立即刷新左侧 AI 名称中的难度标注
      });
    });
    $eveWhiteButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        $eveWhiteButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        eveWhiteAI = new GomokuAI(btn.dataset.level);
        updateUI(); // 立即刷新左侧 AI 名称中的难度标注
      });
    });

    // PvE 让 AI 下第一步按钮
    if ($btnPvEStart) {
      $btnPvEStart.addEventListener('click', () => {
        triggerAIMoveIfNeeded();
      });
    }

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

    // 首次初始化为缺省人机模式
    setMode('pve');
    render();
    updateUI();
  }

  // ========================
  // 学习模式功能初始化与处理
  // ========================
  function initStudyMode() {
    // AI 导师难度选择器
    const $mentorDiffSelect = document.getElementById('mentor-diff-select');
    if ($mentorDiffSelect) {
      $mentorDiffSelect.value = 'medium'; // 学习模式默认缺省为中等难度！
      ai = new GomokuAI('medium');
      $mentorDiffSelect.addEventListener('change', (e) => {
        ai = new GomokuAI(e.target.value);
      });
    }

    // 导师模式执子选边按钮
    const $mentorColorBtns = document.querySelectorAll('.btn-mentor-color');
    $mentorColorBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        $mentorColorBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        playerColor = btn.dataset.color === 'white' ? WHITE : BLACK;
        onRestart();
      });
    });

    // 填充残局下拉列表
    if ($puzzleSelect && window.STUDY_PUZZLES) {
      $puzzleSelect.innerHTML = '';
      window.STUDY_PUZZLES.forEach((p, idx) => {
        const opt = document.createElement('option');
        opt.value = idx;
        opt.textContent = `[${p.difficulty}] ${p.title}`;
        $puzzleSelect.appendChild(opt);
      });
      $puzzleSelect.addEventListener('change', (e) => {
        loadPuzzle(parseInt(e.target.value));
      });
    }

    // 填充开局定式下拉列表
    if ($openingSelect && window.OPENING_BOOK_LESSONS) {
      $openingSelect.innerHTML = '';
      window.OPENING_BOOK_LESSONS.forEach((o, idx) => {
        const opt = document.createElement('option');
        opt.value = idx;
        opt.textContent = `${o.name} (${o.type})`;
        $openingSelect.appendChild(opt);
      });
      $openingSelect.addEventListener('change', (e) => {
        loadOpening(parseInt(e.target.value));
      });
    }

    if ($btnPuzzleReset) {
      $btnPuzzleReset.addEventListener('click', () => {
        if (activePuzzle) loadPuzzle(window.STUDY_PUZZLES.indexOf(activePuzzle));
      });
    }

    if ($btnPuzzleHint) {
      $btnPuzzleHint.addEventListener('click', () => {
        if (!activePuzzle) return;
        const sol = activePuzzle.solution[activePuzzleStep];
        if (sol) {
          const coordStr = `${String.fromCharCode(65 + sol.col)}${15 - sol.row}`;
          showFoulToast(`💡 提示：下一步推荐落子位置为 ${coordStr}`);
          studyHints = [{ row: sol.row, col: sol.col, rank: 1, reason: activePuzzle.hint || '推荐突破点' }];
          render();
        }
      });
    }

    if ($btnOpeningDemo) {
      $btnOpeningDemo.addEventListener('click', () => {
        demoOpening();
      });
    }
  }

  function switchStudyTab(tabName) {
    studySubTab = tabName;
    if ($btnTabMentor) $btnTabMentor.classList.toggle('active', tabName === 'mentor');
    if ($btnTabPuzzle) $btnTabPuzzle.classList.toggle('active', tabName === 'puzzle');
    if ($btnTabOpening) $btnTabOpening.classList.toggle('active', tabName === 'opening');

    if ($studyTabMentor) $studyTabMentor.classList.toggle('hidden', tabName !== 'mentor');
    if ($studyTabPuzzle) $studyTabPuzzle.classList.toggle('hidden', tabName !== 'puzzle');
    if ($studyTabOpening) $studyTabOpening.classList.toggle('hidden', tabName !== 'opening');

    studyHints = [];
    stopOpeningDemo();

    if (tabName === 'puzzle') {
      if (window.STUDY_PUZZLES && window.STUDY_PUZZLES.length > 0) {
        loadPuzzle(0);
      }
    } else if (tabName === 'opening') {
      if (window.OPENING_BOOK_LESSONS && window.OPENING_BOOK_LESSONS.length > 0) {
        loadOpening(0);
      }
    } else if (tabName === 'mentor') {
      ai = new GomokuAI('medium');
      const $mentorDiffSelect = document.getElementById('mentor-diff-select');
      if ($mentorDiffSelect) $mentorDiffSelect.value = 'medium';
      // 如果盘面上已有对局落子，保持当前盘面，决不主动清空！
      if (game.moveHistory.length === 0) {
        onRestart();
      } else {
        render();
        updateUI();
      }
      updateWinRateUI();
    }
  }

  function loadPuzzle(index) {
    if (!window.STUDY_PUZZLES || !window.STUDY_PUZZLES[index]) return;
    activePuzzle = window.STUDY_PUZZLES[index];
    activePuzzleStep = 0;
    studyHints = [];
    stopOpeningDemo();

    if ($puzzleTitle) $puzzleTitle.textContent = activePuzzle.title;
    if ($puzzleDesc) $puzzleDesc.textContent = activePuzzle.description;

    game.reset();
    game.enableFoul = activePuzzle.enableFoul;

    // 加载初始棋子
    activePuzzle.initialMoves.forEach(m => {
      game.board[m.row][m.col] = m.player;
      game.moveHistory.push(m);
    });

    game.currentPlayer = activePuzzle.player;
    lastMovePos = game.moveHistory.length > 0 ? game.moveHistory[game.moveHistory.length - 1] : null;

    render();
    updateUI();
    showFoulToast(`🧩 已载入特训残局：${activePuzzle.title}`);
  }

  function loadOpening(index) {
    if (!window.OPENING_BOOK_LESSONS || !window.OPENING_BOOK_LESSONS[index]) return;
    activeOpening = window.OPENING_BOOK_LESSONS[index];
    studyHints = [];
    stopOpeningDemo();

    if ($openingName) $openingName.textContent = `${activeOpening.name} (${activeOpening.type})`;
    if ($openingDesc) $openingDesc.textContent = activeOpening.description;

    game.reset();
    activeOpening.moves.forEach(m => {
      game.board[m.row][m.col] = m.player;
      game.moveHistory.push(m);
    });

    lastMovePos = game.moveHistory.length > 0 ? game.moveHistory[game.moveHistory.length - 1] : null;
    render();
    updateUI();
  }

  function demoOpening() {
    if (!activeOpening) return;
    stopOpeningDemo();

    game.reset();
    render();
    updateUI();

    let stepIdx = 0;
    openingDemoTimer = setInterval(() => {
      if (stepIdx < activeOpening.moves.length) {
        const m = activeOpening.moves[stepIdx];
        game.placeStone(m.row, m.col);
        lastMovePos = { row: m.row, col: m.col };
        stoneAnimStart = performance.now();
        requestAnimationFrame(animLoop);
        updateUI();
        stepIdx++;
      } else {
        stopOpeningDemo();
      }
    }, 700);
  }

  function stopOpeningDemo() {
    if (openingDemoTimer) {
      clearInterval(openingDemoTimer);
      openingDemoTimer = null;
    }
  }

  function fetchAIHints() {
    if (game.gameOver) return;
    const topMoves = ai.getTopMoves(game, 3);
    studyHints = topMoves;
    render();
  }

  function updateWinRateUI() {
    if (!ai || typeof ai.evaluateWinRate !== 'function') return;
    const blackRate = ai.evaluateWinRate(game, BLACK);
    const whiteRate = 100 - blackRate;

    const $winRateBlackVal = document.getElementById('win-rate-black-val');
    const $winRateWhiteVal = document.getElementById('win-rate-white-val');

    if ($winRateBlackVal) $winRateBlackVal.textContent = `${blackRate}%`;
    if ($winRateWhiteVal) $winRateWhiteVal.textContent = `${whiteRate}%`;
    if ($winRateBarFill) $winRateBarFill.style.width = `${blackRate}%`;
  }

  function runFullGameReview() {
    if (game.moveHistory.length === 0 && savedHistory.length === 0) {
      showFoulToast('⚠️ 当前无任何落子记录可复盘');
      return;
    }
    const history = savedHistory.length > 0 ? savedHistory : game.moveHistory;
    activeReviewData = ai.analyzeHistory(history, game.enableFoul);

    if ($aiReviewContainer) $aiReviewContainer.classList.remove('hidden');
    if ($replayCard) $replayCard.classList.remove('hidden');
    isReplaying = true;

    renderReviewList();
    showFoulToast('🔍 全局 AI 复盘诊断完成！点击左侧步骤可详细拆解。');
  }

  function renderReviewList() {
    if (!$aiReviewList) return;
    $aiReviewList.innerHTML = '';

    activeReviewData.forEach(item => {
      const div = document.createElement('div');
      div.className = `review-item ${item.quality}`;
      const playerStr = item.player === BLACK ? '⚫' : '⚪';
      const coordStr = `${String.fromCharCode(65 + item.col)}${15 - item.row}`;

      div.innerHTML = `
        <span class="review-step">第${item.step}手 ${playerStr} ${coordStr}</span>
        <span class="review-comment">${item.comment}</span>
      `;

      div.addEventListener('click', () => {
        selectedReviewStep = item;
        showReplayStep(item.step);
      });

      $aiReviewList.appendChild(div);
    });
  }

  // ========================
  // 事件处理
  // ========================
  function triggerAIMoveIfNeeded() {
    const isPvEorMentor = (mode === 'pve' || (mode === 'study' && studySubTab === 'mentor'));
    if (!isPvEorMentor || game.gameOver || aiThinking) return;
    const aiColor = playerColor === BLACK ? WHITE : BLACK;
    if (game.currentPlayer !== aiColor) return;

    aiThinking = true;
    updateUI();

    const delay = game.moveHistory.length === 0 ? 300 : (ANIM_DURATION + 30);
    setTimeout(() => {
      const pveStart = Date.now();
      const pveBudget = $pveSpeed ? parseInt($pveSpeed.value) || 0 : 500;
      const aiMove = ai.getMove(game, pveBudget);
      const elapsed = Date.now() - pveStart;

      const MIN_DELAY = 300;
      const remainDelay = Math.max(0, MIN_DELAY - elapsed);

      setTimeout(() => {
        const aiResult = game.placeStone(aiMove.row, aiMove.col);
        lastMovePos = { row: aiMove.row, col: aiMove.col };
        aiThinking = false;

        stoneAnimStart = performance.now();
        requestAnimationFrame(animLoop);

        updateUI();
        updateWinRateUI();

        if ($chkShowHints && $chkShowHints.checked) {
          fetchAIHints();
        }

        if (aiResult.winner !== undefined) {
          onGameEnd(aiResult);
        }
      }, remainDelay);
    }, delay);
  }

  function showFoulToast(msg) {
    if (!$foulToast) return;
    $foulToast.textContent = msg;
    $foulToast.classList.remove('hidden');

    if (foulToastTimer) clearTimeout(foulToastTimer);
    foulToastTimer = setTimeout(() => {
      $foulToast.classList.add('hidden');
    }, 2200);
  }

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
    // 如果轮到 AI 走，拒绝玩家手防
    const aiColor = playerColor === BLACK ? WHITE : BLACK;
    const isPvEorMentor = (mode === 'pve' || (mode === 'study' && studySubTab === 'mentor'));
    if (isPvEorMentor && game.currentPlayer === aiColor) return;

    const pos = canvasToBoard(e.offsetX, e.offsetY);
    if (!pos) return;

    // 学习模式 —— 残局闯关解题逻辑
    if (mode === 'study' && studySubTab === 'puzzle' && activePuzzle) {
      const expectedSol = activePuzzle.solution[activePuzzleStep];
      if (expectedSol && pos.row === expectedSol.row && pos.col === expectedSol.col) {
        // 先尝试落子，并严格校验返回值
        const res = game.placeStone(pos.row, pos.col);
        if (!res.success) {
          if (res.reason === 'foul' && res.message) showFoulToast(res.message);
          return;
        }

        lastMovePos = { row: pos.row, col: pos.col };
        stoneAnimStart = performance.now();
        requestAnimationFrame(animLoop);

        const currentStep = activePuzzleStep;
        activePuzzleStep++;
        updateUI();

        if (activePuzzleStep >= activePuzzle.solution.length) {
          showFoulToast('🎉 恭喜通关！你成功解开了本关杀局！');
          onGameEnd({ winner: activePuzzle.player });
        } else {
          // 检查是否有对手 responses 回应
          if (activePuzzle.responses && activePuzzle.responses[currentStep]) {
            const oppResp = activePuzzle.responses[currentStep];
            showFoulToast('✅ 答对了！对手防御回应中...');
            setTimeout(() => {
              const oppColor = activePuzzle.player === BLACK ? WHITE : BLACK;
              game.board[oppResp.row][oppResp.col] = oppColor;
              game.moveHistory.push({ row: oppResp.row, col: oppResp.col, player: oppColor });
              lastMovePos = { row: oppResp.row, col: oppResp.col };
              stoneAnimStart = performance.now();
              requestAnimationFrame(animLoop);
              updateUI();
              showFoulToast('🛡️ 对手已强行封堵，请接着做出绝杀！');
            }, 500);
          } else {
            showFoulToast('✅ 回答正确！请继续走下一步...');
          }
        }
      } else {
        showFoulToast('❌ 此步并非最佳杀法解，请点击「提示」重试！');
      }
      return;
    }

    const result = game.placeStone(pos.row, pos.col);
    if (!result.success) {
      if (result.reason === 'foul' && result.message) {
        showFoulToast(result.message);
      }
      return;
    }

    lastMovePos = { row: pos.row, col: pos.col };
    stoneAnimStart = performance.now();
    requestAnimationFrame(animLoop);

    updateUI();
    updateWinRateUI();

    if ($chkShowHints && $chkShowHints.checked) {
      fetchAIHints();
    }

    if (result.winner !== undefined) {
      onGameEnd(result);
      return;
    }

    // 尝试触发 AI 落子
    triggerAIMoveIfNeeded();
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

  function onExportDebug() {
    const historyNotation = game.moveHistory.map((m, idx) => {
      const playerStr = m.player === BLACK ? '⚫' : '⚪';
      const colStr = String.fromCharCode(65 + m.col);
      const rowStr = 15 - m.row;
      return `${idx + 1}. ${playerStr} ${colStr}${rowStr} (${m.row}, ${m.col})`;
    });

    const debugData = {
      timestamp: new Date().toISOString(),
      mode: mode,
      playerColor: playerColor === BLACK ? 'BLACK' : 'WHITE',
      enableFoul: game.enableFoul,
      aiLevel: ai ? ai.level : 'medium',
      pveSpeedBudget: $pveSpeed ? $pveSpeed.value : '500',
      gameOver: game.gameOver,
      winner: game.winner,
      moveCount: game.moveHistory.length,
      moveHistory: game.moveHistory,
      formattedMoves: historyNotation
    };

    const jsonStr = JSON.stringify(debugData, null, 2);

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(jsonStr).then(() => {
        showFoulToast('📋 已成功复制对局调试 JSON 到剪贴板！');
      }).catch(err => {
        console.log('[Gomoku Debug Export]\n' + jsonStr);
        showFoulToast('📋 已输出对局数据到控制台 (F12)');
      });
    } else {
      console.log('[Gomoku Debug Export]\n' + jsonStr);
      showFoulToast('📋 已输出对局数据到控制台 (F12)');
    }
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
    studyHints = [];
    render();
    updateUI();
    updateWinRateUI();
  }

  function onRestart() {
    stopReplayAutoPlay();
    stopOpeningDemo();
    isReplaying = false;
    savedHistory = [];
    studyHints = [];
    activeReviewData = [];
    selectedReviewStep = null;

    if ($replayCard) $replayCard.classList.add('hidden');
    if ($aiReviewContainer) $aiReviewContainer.classList.add('hidden');

    eveStop();
    game.reset();
    game.enableFoul = globalFoulPreference; // 重置对局时完美继承玩家显式勾选的禁手配置！
    lastMovePos = null;
    hoverPos = null;
    evePaused = false;
    eveRunning = false;
    if ($btnEveStart) {
      $btnEveStart.disabled = false;
      $btnEveStart.textContent = '开始对战';
    }
    if ($winOverlay) $winOverlay.classList.add('hidden');
    render();
    updateUI();
    updateWinRateUI();
  }

  function setMode(newMode) {
    if (mode === newMode) return; // 重复点击当前模式按钮时保持已有局势，决不清空对局

    eveStop();
    stopOpeningDemo();
    mode = newMode;
    $btnPvP.classList.toggle('active', mode === 'pvp');
    $btnPvE.classList.toggle('active', mode === 'pve');
    $btnEve.classList.toggle('active', mode === 'eve');
    if ($btnStudy) $btnStudy.classList.toggle('active', mode === 'study');

    $aiSettings.classList.add('hidden');
    $eveSettings.classList.add('hidden');
    if ($studyCard) $studyCard.classList.add('hidden');

    if (mode === 'pve') {
      $aiSettings.classList.remove('hidden');
    } else if (mode === 'eve') {
      $eveSettings.classList.remove('hidden');
    } else if (mode === 'study') {
      if ($studyCard) $studyCard.classList.remove('hidden');
      switchStudyTab(studySubTab);
      return;
    }

    updatePlayerNames();
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

  function stopReplayAutoPlay() {
    if (replayTimer) {
      clearInterval(replayTimer);
      replayTimer = null;
    }
    replayPlaying = false;
    if ($btnReplayPlay) $btnReplayPlay.textContent = '▶ 自动播放';
  }

  function onViewBoard() {
    stopReplayAutoPlay();
    if ($winOverlay) $winOverlay.classList.add('hidden');
    if ($replayCard) $replayCard.classList.remove('hidden');
    isReplaying = true;
    replayStep = savedHistory.length;
    showReplayStep(replayStep);
  }

  function onStartReplay() {
    onViewBoard();
    replayStep = 0;
    showReplayStep(0);
    onReplayTogglePlay();
  }

  function onReplayTogglePlay() {
    if (replayPlaying) {
      stopReplayAutoPlay();
    } else {
      if (replayStep >= savedHistory.length) {
        replayStep = 0;
      }
      replayPlaying = true;
      if ($btnReplayPlay) $btnReplayPlay.textContent = '⏸ 暂停';
      replayTimer = setInterval(() => {
        if (replayStep < savedHistory.length) {
          replayStep++;
          showReplayStep(replayStep);
        } else {
          stopReplayAutoPlay();
        }
      }, 500);
    }
  }

  function onReplayPrev() {
    stopReplayAutoPlay();
    if (replayStep > 0) {
      replayStep--;
      showReplayStep(replayStep);
    }
  }

  function onReplayNext() {
    stopReplayAutoPlay();
    if (replayStep < savedHistory.length) {
      replayStep++;
      showReplayStep(replayStep);
    }
  }

  function showReplayStep(step) {
    if (!savedHistory) return;
    step = Math.max(0, Math.min(step, savedHistory.length));
    replayStep = step;

    // 清空当前棋盘并重放前 step 步
    game.board = Array.from({ length: BOARD_SIZE }, () => new Array(BOARD_SIZE).fill(EMPTY));
    for (let i = 0; i < step; i++) {
      const m = savedHistory[i];
      game.board[m.row][m.col] = m.player;
    }

    lastMovePos = step > 0 ? savedHistory[step - 1] : null;

    if ($replayProgress) {
      $replayProgress.textContent = `第 ${step} / ${savedHistory.length} 手`;
    }

    render();
    updateMoveHistory(step);
  }

  function onGameEnd(result) {
    savedHistory = [...game.moveHistory];
    replayStep = savedHistory.length;

    if (result.draw) {
      $winText.textContent = '握手言和 (平局)';
      $winText.style.color = 'var(--text-primary)';
      stats.draw++;
    } else if (result.winner === BLACK) {
      $winText.textContent = '🏆 黑方获胜！';
      $winText.style.color = 'var(--win-black)';
      stats.black++;
    } else {
      $winText.textContent = '🏆 白方获胜！';
      $winText.style.color = 'var(--win-white)';
      stats.white++;
    }

    if ($winOverlay) $winOverlay.classList.remove('hidden');
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
    drawStudyHighlights(now);
    drawLastMove(scale);
    drawWinLine();
  }

  /** 绘制学习模式的各种交互高亮（导师推荐点、禁手雷达、复盘诊断标记） */
  function drawStudyHighlights() {
    const pulse = 0.5; // 采用静态高对比度光晕，彻底消除闪烁与抖动感

    // 1. 绘制导师推荐点（全屏高对比醒目指引）
    if (studyHints && studyHints.length > 0) {
      studyHints.forEach(h => {
        if (game.board[h.row][h.col] !== EMPTY) return;
        const x = PADDING + h.col * CELL_SIZE;
        const y = PADDING + h.row * CELL_SIZE;

        ctx.save();

        const rank = h.rank; // 1, 2, 3
        const isTop1 = rank === 1;
        const isTop2 = rank === 2;

        // 主主题色：1=亮金, 2=闪耀蓝, 3=炫彩紫
        const mainColor = isTop1 ? '#fbbf24' : (isTop2 ? '#38bdf8' : '#c084fc');
        const glowColor = isTop1 ? 'rgba(251, 191, 36, 0.9)' : (isTop2 ? 'rgba(56, 189, 248, 0.85)' : 'rgba(192, 132, 252, 0.8)');
        const bgBadgeColor = isTop1 ? '#78350f' : (isTop2 ? '#0c4a6e' : '#581c87'); // 深色质感底盘

        // A. 绘制底衬超大半透明光束波纹 (Radial Light Beacon)
        const beaconRadius = STONE_RADIUS * (isTop1 ? (1.6 + pulse * 0.35) : (1.35 + pulse * 0.2));
        const bgGrad = ctx.createRadialGradient(x, y, 2, x, y, beaconRadius);
        bgGrad.addColorStop(0, glowColor);
        bgGrad.addColorStop(0.6, glowColor.replace('0.9', '0.4').replace('0.85', '0.35').replace('0.8', '0.3'));
        bgGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = bgGrad;
        ctx.beginPath();
        ctx.arc(x, y, beaconRadius, 0, Math.PI * 2);
        ctx.fill();

        // B. 绘制双层虚线/实线光环
        ctx.beginPath();
        ctx.arc(x, y, STONE_RADIUS * (1.1 + pulse * 0.15), 0, Math.PI * 2);
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = isTop1 ? 3 : 2;
        ctx.shadowColor = mainColor;
        ctx.shadowBlur = isTop1 ? 18 + pulse * 10 : 10;
        if (isTop1) ctx.setLineDash([4, 3]); // 第一推荐点带虚线圈
        ctx.stroke();
        ctx.setLineDash([]); // 还原线型

        // C. 中心高对比度实体圆盘徽章
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.fillStyle = bgBadgeColor;
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, STONE_RADIUS * 0.88, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // D. 绘制标号/奖牌 (大号醒目图标)
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px var(--font-family, sans-serif)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const medalIcon = rank === 1 ? '🥇' : (rank === 2 ? '🥈' : '🥉');
        ctx.fillText(medalIcon, x, y);

        // E. 彻底解决与建议棋子重合：大间距错位气泡 (Non-Overlapping Spaced Tooltip)
        const coordText = `${String.fromCharCode(65 + h.col)}${15 - h.row}`;
        const cardTitle = `${medalIcon} ${rank}. ${coordText}`;
        const cardReason = h.reason || (isTop1 ? '绝杀/攻杀' : (isTop2 ? '防守' : '拓广'));
        const fullText = `${cardTitle} ${cardReason}`;

        ctx.font = 'bold 11px var(--font-family, sans-serif)';
        const metrics = ctx.measureText(fullText);
        const cardW = metrics.width + 12;
        const cardH = 20;

        let cardX = x - cardW / 2;
        let cardY = y - STONE_RADIUS - 34; // Top 1 向上留出 34px 安全间距，彻底避开建议棋子！

        if (rank === 2) {
          // Top 2 气泡向下留出 18px 间距避开棋子
          cardY = y + STONE_RADIUS + 18;
        } else if (rank === 3) {
          // Top 3 气泡向右侧拉开 16px 间距
          cardX = x + STONE_RADIUS + 16;
          cardY = y - cardH / 2;
        }

        // 边界吸附约束：保证绝不出界
        cardX = Math.max(6, Math.min(CANVAS_SIZE - cardW - 6, cardX));
        cardY = Math.max(6, Math.min(CANVAS_SIZE - cardH - 6, cardY));

        // 绘制到建议棋子中心的微型指示线 (Connecting Pointer Line)
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(cardX + cardW / 2, cardY + (rank === 2 ? 0 : (rank === 3 ? cardH / 2 : cardH)));
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.45;
        ctx.stroke();
        ctx.restore();

        // 气泡阴影与实体漆黑高对比背景
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
        ctx.shadowBlur = 8;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.96)';
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = isTop1 ? 2 : 1.5;

        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(cardX, cardY, cardW, cardH, 4);
        } else {
          ctx.rect(cardX, cardY, cardW, cardH);
        }
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // 气泡高亮文字
        ctx.fillStyle = mainColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(fullText, cardX + cardW / 2, cardY + cardH / 2);

        ctx.restore();
      });
    }

    // 2. 绘制黑棋禁手雷达（仅搜索盘面上已有棋子周边 2 格空位，提升性能）
    if ($chkShowFoulRadar && $chkShowFoulRadar.checked && game.enableFoul && game.currentPlayer === BLACK && !game.gameOver) {
      const candidates = ai._getNearbyEmpty(game, 2);
      for (const pos of candidates) {
        const foul = game.checkFoul(pos.row, pos.col, BLACK);
        if (foul) {
          const x = PADDING + pos.col * CELL_SIZE;
          const y = PADDING + pos.row * CELL_SIZE;
          ctx.save();
          ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
          ctx.font = '12px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('⚠️', x, y);
          ctx.restore();
        }
      }
    }

    // 3. 绘制选中的复盘诊断标记
    if (selectedReviewStep && isReplaying) {
      const step = selectedReviewStep;
      if (step.bestMove && (step.bestMove.row !== step.row || step.bestMove.col !== step.col)) {
        // 高亮 AI 认为的最佳着法点
        const bx = PADDING + step.bestMove.col * CELL_SIZE;
        const by = PADDING + step.bestMove.row * CELL_SIZE;
        ctx.save();
        ctx.beginPath();
        ctx.arc(bx, by, STONE_RADIUS, 0, Math.PI * 2);
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🌟', bx, by);
        ctx.restore();
      }
    }
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

    // 显示手数：复盘模式显示当前复盘步数 replayStep，对局模式显示当前总手数
    const moveNum = isReplaying ? replayStep : game.moveHistory.length;
    if (moveNum > 0) {
      ctx.font = 'bold 13px var(--font-family, sans-serif)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(moveNum, 0, 1);
    }

    ctx.restore();
  }

  /** 绘制获胜连线 */
  function drawWinLine() {
    if (game.winLine.length === 0) return;
    // 复盘模式下，只有回放到最后一手才显示获胜连线
    if (isReplaying && savedHistory && replayStep < savedHistory.length) return;

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
  /** 将 AI 难度等级映射为中文显示名 */
  function aiLevelLabel(level) {
    const map = { easy: '简单', medium: '中等', hard: '困难' };
    return map[level] || level || '中等';
  }

  /** 生成 AI 玩家名称：对局开始后显示难度，开始前只显示 AI */
  function aiName(color, level) {
    const base = `AI (${color === BLACK ? '黑' : '白'})`;
    if (game.moveHistory.length === 0) return base;
    return `${base} · ${aiLevelLabel(level)}`;
  }

  function updatePlayerNames() {
    const $blackName = document.getElementById('black-name');
    const $whiteName = document.getElementById('white-name');
    if (!$blackName || !$whiteName) return;

    if (mode === 'pve') {
      if (playerColor === BLACK) {
        $blackName.textContent = '玩家 1 (黑)';
        $whiteName.textContent = aiName(WHITE, ai.level);
      } else {
        $blackName.textContent = aiName(BLACK, ai.level);
        $whiteName.textContent = '玩家 1 (白)';
      }
    } else if (mode === 'eve') {
      $blackName.textContent = aiName(BLACK, eveBlackAI.level);
      $whiteName.textContent = aiName(WHITE, eveWhiteAI.level);
    } else if (mode === 'study') {
      $blackName.textContent = '学员 / 黑方';
      $whiteName.textContent = '导师 / 白方';
    } else {
      $blackName.textContent = '玩家 1 (黑)';
      $whiteName.textContent = '玩家 2 (白)';
    }
  }

  let syncTimer = null;
  function autoSyncGameState() {
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      const historyNotation = game.moveHistory.map((m, idx) => {
        const playerStr = m.player === BLACK ? '⚫' : '⚪';
        const colStr = String.fromCharCode(65 + m.col);
        const rowStr = 15 - m.row;
        return `${idx + 1}. ${playerStr} ${colStr}${rowStr} (row:${m.row}, col:${m.col})`;
      });

      const data = {
        updatedAt: new Date().toISOString(),
        mode: mode,
        playerColor: playerColor === BLACK ? 'BLACK' : 'WHITE',
        enableFoul: game.enableFoul,
        aiLevel: ai ? ai.level : 'medium',
        pveSpeed: $pveSpeed ? $pveSpeed.value : '500',
        gameOver: game.gameOver,
        winner: game.winner,
        moveCount: game.moveHistory.length,
        moveHistory: game.moveHistory,
        formattedMoves: historyNotation
      };

      fetch('/api/sync-game-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data, null, 2)
      }).catch(() => {});
    }, 150);
  }

  function updateUI() {
    updatePlayerNames();
    autoSyncGameState();

    const isPlaying = (game.moveHistory.length > 0 && !game.gameOver) || eveRunning;

    // 1. 禁手规则复选框
    if ($chkFoul) {
      $chkFoul.checked = globalFoulPreference;
      $chkFoul.disabled = isPlaying;
    }

    // 2. 模式与难度/执子按钮锁死（对局进行中不允许切换难度或对战模式）
    if ($btnPvP) $btnPvP.disabled = isPlaying;
    if ($btnPvE) $btnPvE.disabled = isPlaying;
    if ($btnEve) $btnEve.disabled = isPlaying;
    if ($btnStudy) $btnStudy.disabled = isPlaying;
    $playerColorButtons.forEach(btn => btn.disabled = isPlaying);
    $diffButtons.forEach(btn => btn.disabled = isPlaying);
    $eveBlackButtons.forEach(btn => btn.disabled = isPlaying);
    $eveWhiteButtons.forEach(btn => btn.disabled = isPlaying);
    if ($pveSpeed) $pveSpeed.disabled = isPlaying;

    // 3. 人机模式与导师模式让 AI 先手按钮控制
    if ($btnPvEStart) {
      const isPvEorMentor = (mode === 'pve' || (mode === 'study' && studySubTab === 'mentor'));
      const showAiStartBtn = (isPvEorMentor && playerColor === WHITE && game.moveHistory.length === 0 && !aiThinking);
      $btnPvEStart.classList.toggle('hidden', !showAiStartBtn);
    }

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
      } else if (mode === 'pve' && game.moveHistory.length === 0 && playerColor === WHITE) {
        $statusText.textContent = '选好规则后，点击「🚀 让 AI 下第一步」';
      } else if (mode === 'study') {
        if (studySubTab === 'puzzle') {
          $statusText.textContent = '🧩 正在进行残局特训，寻找最佳杀招落子';
        } else if (studySubTab === 'opening') {
          $statusText.textContent = '📚 正在学习连珠开局定式';
        } else {
          $statusText.textContent = '💡 学习模式：开启 AI 导师，掌握最强对局策略';
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

  function updateMoveHistory(highlightStep) {
    if (!$moveHistory) return;
    $moveHistory.innerHTML = '';
    const historyList = isReplaying && savedHistory.length > 0 ? savedHistory : game.moveHistory;

    historyList.forEach((move, i) => {
      const stepNum = i + 1;
      const li = document.createElement('li');
      const label = move.player === BLACK ? '⚫' : '⚪';
      const coord = `${String.fromCharCode(65 + move.col)}${BOARD_SIZE - move.row}`;
      li.textContent = `${stepNum}. ${label} ${coord}`;
      li.style.cursor = 'pointer';

      if (highlightStep && highlightStep === stepNum) {
        li.style.color = 'var(--accent-gold)';
        li.style.fontWeight = 'bold';
        li.style.background = 'rgba(212, 165, 74, 0.2)';
      }

      li.addEventListener('click', () => {
        if (savedHistory.length === 0) savedHistory = [...game.moveHistory];
        onViewBoard();
        showReplayStep(stepNum);
      });

      $moveHistory.appendChild(li);
    });

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
