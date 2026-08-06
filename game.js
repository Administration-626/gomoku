/**
 * game.js - 五子棋核心游戏逻辑
 *
 * 职责：棋盘数据模型、落子校验、胜负判定、悔棋
 * 不涉及任何 DOM / Canvas 操作
 */

var BOARD_SIZE = 15; // 15×15 标准棋盘
var EMPTY = 0;
var BLACK = 1;
var WHITE = 2;

// 四个方向向量：水平、垂直、两条对角线
const DIRECTIONS = [
  [1, 0],  // →
  [0, 1],  // ↓
  [1, 1],  // ↘
  [1, -1], // ↗
];

class GomokuGame {
  constructor() {
    this.reset();
  }

  /** 重置棋局 */
  reset() {
    // board[row][col], 0=空, 1=黑, 2=白
    this.board = Array.from({ length: BOARD_SIZE }, () =>
      new Array(BOARD_SIZE).fill(EMPTY)
    );
    this.currentPlayer = BLACK; // 黑先
    this.moveHistory = [];     // [{row, col, player}]
    this.gameOver = false;
    this.winner = EMPTY;       // 0=无, 1=黑胜, 2=白胜
    this.winLine = [];         // 获胜连线坐标 [{row, col}, ...]
  }

  /**
   * 落子
   * @param {number} row
   * @param {number} col
   * @returns {{ success: boolean, winner?: number, winLine?: Array }}
   */
  placeStone(row, col) {
    if (this.gameOver) return { success: false, reason: 'game_over' };
    if (!this._inBounds(row, col)) return { success: false, reason: 'out_of_bounds' };
    if (this.board[row][col] !== EMPTY) return { success: false, reason: 'occupied' };

    const player = this.currentPlayer;
    this.board[row][col] = player;
    this.moveHistory.push({ row, col, player });

    // 检查胜负
    const winLine = this._checkWin(row, col, player);
    if (winLine) {
      this.gameOver = true;
      this.winner = player;
      this.winLine = winLine;
      return { success: true, winner: player, winLine };
    }

    // 检查平局（棋盘下满）
    if (this.moveHistory.length >= BOARD_SIZE * BOARD_SIZE) {
      this.gameOver = true;
      this.winner = EMPTY;
      return { success: true, winner: EMPTY, draw: true };
    }

    // 切换玩家
    this.currentPlayer = player === BLACK ? WHITE : BLACK;
    return { success: true };
  }

  /**
   * 悔棋：撤销最后一步
   * @returns {{ success: boolean, undone?: { row, col, player } }}
   */
  undo() {
    if (this.moveHistory.length === 0) return { success: false };

    const last = this.moveHistory.pop();
    this.board[last.row][last.col] = EMPTY;
    this.currentPlayer = last.player;
    this.gameOver = false;
    this.winner = EMPTY;
    this.winLine = [];
    return { success: true, undone: last };
  }

  /**
   * 检查是否五连
   * @returns {Array|null} 获胜连线坐标数组，或 null
   */
  _checkWin(row, col, player) {
    for (const [dx, dy] of DIRECTIONS) {
      const line = [{ row, col }];

      // 正方向
      for (let i = 1; i < 5; i++) {
        const r = row + dy * i;
        const c = col + dx * i;
        if (this._inBounds(r, c) && this.board[r][c] === player) {
          line.push({ row: r, col: c });
        } else break;
      }

      // 反方向
      for (let i = 1; i < 5; i++) {
        const r = row - dy * i;
        const c = col - dx * i;
        if (this._inBounds(r, c) && this.board[r][c] === player) {
          line.push({ row: r, col: c });
        } else break;
      }

      if (line.length >= 5) return line;
    }
    return null;
  }

  _inBounds(row, col) {
    return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
  }

  /** 获取指定位置的棋子 */
  getStone(row, col) {
    return this._inBounds(row, col) ? this.board[row][col] : EMPTY;
  }

  /** 获取所有空位 */
  getEmptyPositions() {
    const positions = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (this.board[r][c] === EMPTY) positions.push({ row: r, col: c });
      }
    }
    return positions;
  }
}

// 导出（浏览器环境挂到 window）
if (typeof window !== 'undefined') {
  window.GomokuGame = GomokuGame;
  window.BOARD_SIZE = BOARD_SIZE;
  window.EMPTY = EMPTY;
  window.BLACK = BLACK;
  window.WHITE = WHITE;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GomokuGame, BOARD_SIZE, EMPTY, BLACK, WHITE };
}
