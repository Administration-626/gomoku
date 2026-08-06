/**
 * test_suite.js
 * 五子棋项目自动化单元测试与算法集成测试套件 (包含 DOM 端到端 UI 点击测试)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { GomokuGame, BOARD_SIZE, EMPTY, BLACK, WHITE } = require('./game.js');
const { GomokuAI } = require('./ai.js');

let totalTests = 0;
let passedTests = 0;

function runTest(name, testFn) {
  totalTests++;
  try {
    testFn();
    passedTests++;
    console.log(`  ✓ PASSED: ${name}`);
  } catch (err) {
    console.error(`  ✗ FAILED: ${name}`);
    console.error(`    Error: ${err.message}`);
    console.error(err.stack);
  }
}

console.log('==============================================');
console.log('       GOMOKU AUTOMATED TEST SUITE           ');
console.log('==============================================\n');

// --------------------------------------------------
// 1. 游戏引擎逻辑测试 (GomokuGame)
// --------------------------------------------------
console.log('[Group 1] Game Engine Tests (game.js)');

runTest('Initialization state is correct', () => {
  const game = new GomokuGame();
  assert.strictEqual(game.currentPlayer, BLACK);
  assert.strictEqual(game.gameOver, false);
  assert.strictEqual(game.moveHistory.length, 0);
  assert.strictEqual(game.board.length, 15);
  assert.strictEqual(game.board[0].length, 15);
});

runTest('Valid stone placement and turn switching', () => {
  const game = new GomokuGame();
  const res1 = game.placeStone(7, 7);
  assert.strictEqual(res1.success, true);
  assert.strictEqual(game.getStone(7, 7), BLACK);
  assert.strictEqual(game.currentPlayer, WHITE);

  const res2 = game.placeStone(7, 8);
  assert.strictEqual(res2.success, true);
  assert.strictEqual(game.getStone(7, 8), WHITE);
  assert.strictEqual(game.currentPlayer, BLACK);
});

runTest('Reject occupied or out-of-bounds moves', () => {
  const game = new GomokuGame();
  game.placeStone(7, 7);

  const resOccupied = game.placeStone(7, 7);
  assert.strictEqual(resOccupied.success, false);
  assert.strictEqual(resOccupied.reason, 'occupied');

  const resOutOfBounds = game.placeStone(-1, 0);
  assert.strictEqual(resOutOfBounds.success, false);
  assert.strictEqual(resOutOfBounds.reason, 'out_of_bounds');
});

runTest('Horizontal win detection (Five in a row)', () => {
  const game = new GomokuGame();
  game.placeStone(7, 0); // B
  game.placeStone(8, 0); // W
  game.placeStone(7, 1); // B
  game.placeStone(8, 1); // W
  game.placeStone(7, 2); // B
  game.placeStone(8, 2); // W
  game.placeStone(7, 3); // B
  game.placeStone(8, 3); // W
  const winRes = game.placeStone(7, 4); // B win!

  assert.strictEqual(winRes.success, true);
  assert.strictEqual(winRes.winner, BLACK);
  assert.strictEqual(game.gameOver, true);
  assert.strictEqual(game.winLine.length, 5);
});

runTest('Undo functionality', () => {
  const game = new GomokuGame();
  game.placeStone(7, 7); // B
  game.placeStone(7, 8); // W

  const undoRes = game.undo();
  assert.strictEqual(undoRes.success, true);
  assert.strictEqual(game.getStone(7, 8), EMPTY);
  assert.strictEqual(game.currentPlayer, WHITE);
  assert.strictEqual(game.moveHistory.length, 1);
});

console.log('');

// --------------------------------------------------
// 2. AI 估值与决策算法测试 (GomokuAI)
// --------------------------------------------------
console.log('[Group 2] AI Algorithm Tests (ai.js)');

runTest('Opening move: AI takes center (7, 7) on empty board', () => {
  const game = new GomokuGame();
  const ai = new GomokuAI('medium');
  const move = ai.getMove(game);
  assert.strictEqual(move.row, 7);
  assert.strictEqual(move.col, 7);
});

runTest('AI Attack: AI completes five-in-a-row when having four', () => {
  const game = new GomokuGame();
  const ai = new GomokuAI('medium');

  game.board[7][1] = BLACK;
  game.board[7][2] = BLACK;
  game.board[7][3] = BLACK;
  game.board[7][4] = BLACK;
  game.currentPlayer = BLACK;

  const move = ai.getMove(game);
  const isWinningMove = (move.row === 7 && move.col === 0) || (move.row === 7 && move.col === 5);
  assert.strictEqual(isWinningMove, true, `AI should complete five-in-a-row, got (${move.row}, ${move.col})`);
});

runTest('AI Defense: AI blocks opponent four-in-a-row', () => {
  const game = new GomokuGame();
  const ai = new GomokuAI('medium');

  game.board[7][1] = BLACK;
  game.board[7][2] = BLACK;
  game.board[7][3] = BLACK;
  game.board[7][4] = BLACK;
  game.currentPlayer = WHITE;

  const move = ai.getMove(game);
  const isBlockMove = (move.row === 7 && move.col === 0) || (move.row === 7 && move.col === 5);
  assert.strictEqual(isBlockMove, true, `AI should block opponent four, got (${move.row}, ${move.col})`);
});

console.log('');

// --------------------------------------------------
// 3. EVE 对战稳定度测试 (60步无报错跑通)
// --------------------------------------------------
console.log('[Group 3] EVE Simulation Match (60 moves)');

runTest('EVE match runs 60 steps smoothly without error', () => {
  const game = new GomokuGame();
  const blackAI = new GomokuAI('medium');
  const whiteAI = new GomokuAI('medium');

  let steps = 0;
  while (!game.gameOver && steps < 60) {
    steps++;
    const currentAI = game.currentPlayer === BLACK ? blackAI : whiteAI;
    const move = currentAI.getMove(game, 0);
    assert.ok(move && typeof move.row === 'number' && typeof move.col === 'number');
    const res = game.placeStone(move.row, move.col);
    assert.strictEqual(res.success, true);
  }
  assert.ok(steps > 0);
});

console.log('');

// --------------------------------------------------
// 4. 前端 DOM 与 UI 点击事件端到端测试
// --------------------------------------------------
console.log('[Group 4] Frontend DOM & UI Click Integration Tests');

runTest('HTML document contains all required UI element IDs', () => {
  const htmlContent = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  const requiredIds = [
    'board-canvas', 'player-black', 'player-white', 'move-history',
    'status-text', 'win-overlay', 'win-text', 'btn-pvp', 'btn-pve',
    'btn-eve', 'btn-undo', 'btn-restart', 'ai-settings', 'eve-settings',
    'btn-eve-start', 'eve-speed', 'stat-black', 'stat-white', 'stat-draw'
  ];

  for (const id of requiredIds) {
    assert.ok(htmlContent.includes(`id="${id}"`), `Missing element id="${id}" in index.html`);
  }
});

runTest('Simulated DOM initialization and mode button clicks', () => {
  // 简易伪造 Web Browser 环境以全流程测试 app.js
  const listeners = {};
  const mockElements = {};

  const createMockElement = (id, tagName = 'div') => {
    const el = {
      id,
      tagName,
      classList: {
        contains: (c) => el._classes ? el._classes.has(c) : false,
        add: (c) => { el._classes = el._classes || new Set(); el._classes.add(c); },
        remove: (c) => { if (el._classes) el._classes.delete(c); },
        toggle: (c, force) => {
          el._classes = el._classes || new Set();
          if (force !== undefined) force ? el._classes.add(c) : el._classes.delete(c);
          else el._classes.has(c) ? el._classes.delete(c) : el._classes.add(c);
        }
      },
      style: {},
      dataset: {},
      addEventListener: (evt, fn) => {
        listeners[id + ':' + evt] = listeners[id + ':' + evt] || [];
        listeners[id + ':' + evt].push(fn);
      },
      click: () => {
        const fns = listeners[id + ':click'] || [];
        fns.forEach(fn => fn({ offsetX: 100, offsetY: 100 }));
      },
      getContext: () => ({
        scale: () => {},
        fillRect: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        stroke: () => {},
        arc: () => {},
        fill: () => {},
        fillText: () => {},
        save: () => {},
        restore: () => {},
        translate: () => {},
        createLinearGradient: () => ({ addColorStop: () => {} }),
        createRadialGradient: () => ({ addColorStop: () => {} }),
      }),
      appendChild: () => {},
      parentElement: { scrollTop: 0, scrollHeight: 100 }
    };
    mockElements[id] = el;
    return el;
  };

  const elementIds = [
    'board-canvas', 'player-black', 'player-white', 'move-history',
    'status-text', 'win-overlay', 'win-text', 'btn-pvp', 'btn-pve',
    'btn-eve', 'btn-undo', 'btn-restart', 'btn-restart-overlay',
    'ai-settings', 'eve-settings', 'btn-eve-start', 'eve-speed',
    'stat-black', 'stat-white', 'stat-draw', 'black-name', 'white-name'
  ];
  elementIds.forEach(id => createMockElement(id));

  // Mock 全局 window & document
  global.window = global;
  global.document = {
    readyState: 'complete',
    getElementById: (id) => mockElements[id] || createMockElement(id),
    querySelectorAll: (sel) => [createMockElement('mock-btn')],
    addEventListener: (evt, fn) => {}
  };
  global.BOARD_SIZE = 15;
  global.EMPTY = 0;
  global.BLACK = 1;
  global.WHITE = 2;
  global.GomokuGame = GomokuGame;
  global.GomokuAI = GomokuAI;

  // 加载 app.js 并触发 DOM 环境测试
  let appError = null;
  try {
    require('./app.js');
  } catch (err) {
    appError = err;
  }
  assert.strictEqual(appError, null, `app.js throw error during DOM init: ${appError ? appError.message : ''}`);

  // 模拟点击各个模式按钮
  mockElements['btn-pve'].click();
  mockElements['btn-eve'].click();
  mockElements['btn-pvp'].click();
  mockElements['btn-restart'].click();
});

console.log('\n==============================================');
console.log(`  TEST RESULTS: ${passedTests} / ${totalTests} PASSED`);
console.log('==============================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
