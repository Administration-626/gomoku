/**
 * ai.js - 五子棋 AI 模块
 *
 * 职责：根据当前棋盘状态计算最佳落子
 * 策略：修复评估函数 bug + 跳活棋型识别 + 迭代加深 + 启发式排序
 */

if (typeof BOARD_SIZE === 'undefined') var BOARD_SIZE = 15;
if (typeof EMPTY === 'undefined') var EMPTY = 0;
if (typeof BLACK === 'undefined') var BLACK = 1;
if (typeof WHITE === 'undefined') var WHITE = 2;

class GomokuAI {
  /**
   * @param {string} level - 难度等级: 'medium' | 'hard'
   */
  constructor(level = 'medium') {
    this.level = level;
    // 棋型分数定义
    this.SCORES = {
      FIVE: 100000,
      LIVE_FOUR: 10000,
      RUSH_FOUR: 5000,
      LIVE_THREE: 1000,
      SLEEP_THREE: 100,
      LIVE_TWO: 100,
      SLEEP_TWO: 10
    };

    // 预计算棋盘 72 条线（15行 + 15列 + 21正斜 + 21反斜）
    this._initBoardLines();
  }

  /**
   * 预计算棋盘所有长度 >= 5 的直线坐标
   */
  _initBoardLines() {
    this._linesIndices = [];

    // 15 行
    for (let r = 0; r < BOARD_SIZE; r++) {
      const line = [];
      for (let c = 0; c < BOARD_SIZE; c++) {
        line.push({ r, c });
      }
      this._linesIndices.push(line);
    }

    // 15 列
    for (let c = 0; c < BOARD_SIZE; c++) {
      const line = [];
      for (let r = 0; r < BOARD_SIZE; r++) {
        line.push({ r, c });
      }
      this._linesIndices.push(line);
    }

    // 正斜线 (↘)
    for (let k = 0; k <= 2 * (BOARD_SIZE - 1); k++) {
      const line = [];
      for (let r = 0; r < BOARD_SIZE; r++) {
        const c = k - r;
        if (c >= 0 && c < BOARD_SIZE) {
          line.push({ r, c });
        }
      }
      if (line.length >= 5) this._linesIndices.push(line);
    }

    // 反斜线 (↙)
    for (let k = -(BOARD_SIZE - 1); k < BOARD_SIZE; k++) {
      const line = [];
      for (let r = 0; r < BOARD_SIZE; r++) {
        const c = r - k;
        if (c >= 0 && c < BOARD_SIZE) {
          line.push({ r, c });
        }
      }
      if (line.length >= 5) this._linesIndices.push(line);
    }
  }

  /**
   * 计算 AI 的下一步落子
   * @param {GomokuGame} game - 当前游戏实例
   * @param {number} [timeBudget=0] - 时间预算(ms)，0=不限时
   * @returns {{ row: number, col: number }}
   */
  getMove(game, timeBudget = 0) {
    this._deadline = timeBudget > 0 ? Date.now() + timeBudget : 0;
    this._timedOut = false;

    switch (this.level) {
      case 'medium':
        return this._mediumMove(game);
      case 'hard':
        return this._hardMove(game);
      default:
        return this._mediumMove(game);
    }
  }

  /** 检查是否超时 */
  _isTimeUp() {
    if (!this._deadline) return false;
    if (Date.now() >= this._deadline) {
      this._timedOut = true;
      return true;
    }
    return false;
  }

  // =============================================
  // 中等：基于启发式评分函数的单步贪心算法
  // =============================================
  _mediumMove(game) {
    const candidates = this._getNearbyEmpty(game, 2);
    if (candidates.length === 0) {
      return { row: Math.floor(BOARD_SIZE / 2), col: Math.floor(BOARD_SIZE / 2) };
    }

    let bestMove = candidates[0];
    let maxScore = -Infinity;

    const me = game.currentPlayer;
    const opponent = me === BLACK ? WHITE : BLACK;

    for (const pos of candidates) {
      // 进攻分：我下这里形成的最高棋型分
      const attackScore = this._evaluatePosition(game, pos.row, pos.col, me);
      // 防守分（1.1倍偏重防守：对手下这里能形成的棋型，优先堵对手）
      const defenseScore = this._evaluatePosition(game, pos.row, pos.col, opponent);

      // 中心倾向微调分 (0~14)，防止平分时随机选点
      const centerBonus = 14 - (Math.abs(pos.row - 7) + Math.abs(pos.col - 7));

      const totalScore = attackScore + defenseScore * 1.1 + centerBonus;

      if (totalScore > maxScore) {
        maxScore = totalScore;
        bestMove = pos;
      }
    }

    return bestMove;
  }

  // =============================================
  // 困难：迭代加深 Minimax + Alpha-Beta 剪枝
  // =============================================
  _hardMove(game) {
    const me = game.currentPlayer;
    const opponent = me === BLACK ? WHITE : BLACK;
    const candidates = this._getNearbyEmpty(game, 2);

    if (candidates.length === 0) {
      return { row: Math.floor(BOARD_SIZE / 2), col: Math.floor(BOARD_SIZE / 2) };
    }
    if (candidates.length === 1) return candidates[0];

    // 1. 优先检索我方 VCF (连续冲四必胜) 杀局
    const myVCF = this._findVCF(game, me, 10);
    if (myVCF) {
      return myVCF;
    }

    // 2. 检索对手 VCF 必胜点，若有则强行阻断起手式
    const oppVCF = this._findVCF(game, opponent, 10);
    if (oppVCF) {
      return oppVCF;
    }

    // 初始候选点按攻防启发式排序
    let sortedCandidates = this._sortCandidates(game, candidates, me).slice(0, 15);

    let globalBestMove = sortedCandidates[0].pos;
    let globalBestScore = -Infinity;

    // 迭代加深：从 depth 2 搜索到 depth 6
    const maxDepth = 6;
    for (let currentDepth = 2; currentDepth <= maxDepth; currentDepth += 2) {
      if (this._isTimeUp()) break;

      let depthBestMove = null;
      let depthBestScore = -Infinity;
      let alpha = -Infinity;
      let beta = Infinity;

      for (let i = 0; i < sortedCandidates.length; i++) {
        if (this._isTimeUp()) break;

        const pos = sortedCandidates[i].pos;
        game.board[pos.row][pos.col] = me;

        const winLine = game._checkWin(pos.row, pos.col, me);
        let score;
        if (winLine) {
          score = this.SCORES.FIVE + currentDepth * 1000;
        } else {
          score = this._minimax(game, currentDepth - 1, alpha, beta, false, me);
        }

        game.board[pos.row][pos.col] = EMPTY;

        if (score > depthBestScore) {
          depthBestScore = score;
          depthBestMove = pos;
        }
        alpha = Math.max(alpha, score);

        if (depthBestScore >= this.SCORES.FIVE) {
          break; // 发现必胜直接终止
        }
      }

      // 未超时或发现必胜时更新全局最优
      if (depthBestMove && (!this._timedOut || depthBestScore >= this.SCORES.FIVE)) {
        globalBestMove = depthBestMove;
        globalBestScore = depthBestScore;

        // 将当前层找到的最佳着法提前至下一次迭代的搜索首位（PV着法启发）
        sortedCandidates = sortedCandidates.filter(c => c.pos.row !== globalBestMove.row || c.pos.col !== globalBestMove.col);
        sortedCandidates.unshift({ pos: globalBestMove, score: globalBestScore });
      }

      if (globalBestScore >= this.SCORES.FIVE) {
        break; // 必胜分支无需更深搜索
      }
    }

    return globalBestMove || this._mediumMove(game);
  }

  /**
   * Minimax 递归搜索 + Alpha-Beta 剪枝
   */
  _minimax(game, depth, alpha, beta, isMaximizing, me) {
    if (depth === 0 || this._timedOut || this._isTimeUp()) {
      return this._evaluateBoard(game, me);
    }

    const opponent = me === BLACK ? WHITE : BLACK;
    const currentPlayer = isMaximizing ? me : opponent;

    const candidates = this._getNearbyEmpty(game, 2);
    if (candidates.length === 0) return this._evaluateBoard(game, me);

    const sortedCandidates = this._sortCandidates(game, candidates, currentPlayer).slice(0, 12);

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const item of sortedCandidates) {
        if (this._timedOut) break;

        const pos = item.pos;
        game.board[pos.row][pos.col] = me;

        const winLine = game._checkWin(pos.row, pos.col, me);
        let ev;
        if (winLine) {
          ev = this.SCORES.FIVE + depth * 1000;
        } else {
          ev = this._minimax(game, depth - 1, alpha, beta, false, me);
        }

        game.board[pos.row][pos.col] = EMPTY;

        maxEval = Math.max(maxEval, ev);
        alpha = Math.max(alpha, ev);
        if (beta <= alpha) break; // Alpha 剪枝
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const item of sortedCandidates) {
        if (this._timedOut) break;

        const pos = item.pos;
        game.board[pos.row][pos.col] = opponent;

        const winLine = game._checkWin(pos.row, pos.col, opponent);
        let ev;
        if (winLine) {
          ev = -this.SCORES.FIVE - depth * 1000;
        } else {
          ev = this._minimax(game, depth - 1, alpha, beta, true, me);
        }

        game.board[pos.row][pos.col] = EMPTY;

        minEval = Math.min(minEval, ev);
        beta = Math.min(beta, ev);
        if (beta <= alpha) break; // Beta 剪枝
      }
      return minEval;
    }
  }

  // =============================================
  // 棋型评估与启发式工具方法
  // =============================================

  /**
   * 启发式排序：按（进攻分 + 动态防守分 + 中心加成）降序排列候选点
   * 绝对优先封堵对手的任何冲四/活四/五连点
   */
  _sortCandidates(game, candidates, player) {
    const opponent = player === BLACK ? WHITE : BLACK;
    return candidates.map(pos => {
      const attack = this._evaluatePosition(game, pos.row, pos.col, player);
      const defense = this._evaluatePosition(game, pos.row, pos.col, opponent);
      const centerBonus = 14 - (Math.abs(pos.row - 7) + Math.abs(pos.col - 7));
      
      // 面对冲四/活四/五连爆杀威胁，赋予 100 倍绝对防守优先极
      const defWeight = defense >= 5000 ? 100.0 : (defense >= 1000 ? 10.0 : 1.1);

      return {
        pos,
        score: attack + defense * defWeight + centerBonus
      };
    }).sort((a, b) => b.score - a.score);
  }

  /**
   * 获取已有棋子周围 range 格内的空位
   */
  _getNearbyEmpty(game, range) {
    const set = new Set();
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (game.board[r][c] !== EMPTY) {
          for (let dr = -range; dr <= range; dr++) {
            for (let dc = -range; dc <= range; dc++) {
              const nr = r + dr;
              const nc = c + dc;
              if (game._inBounds(nr, nc) && game.board[nr][nc] === EMPTY) {
                set.add(`${nr},${nc}`);
              }
            }
          }
        }
      }
    }
    return Array.from(set).map(s => {
      const [r, c] = s.split(',').map(Number);
      return { row: r, col: c };
    });
  }

  /**
   * 评估单点落子后在 4 个方向上形成的棋型得分
   */
  _evaluatePosition(game, row, col, player) {
    const original = game.board[row][col];
    game.board[row][col] = player;

    let score = 0;
    const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];

    for (const [dx, dy] of dirs) {
      let lineStr = 'X';
      for (let i = -4; i <= 4; i++) {
        const r = row + dy * i;
        const c = col + dx * i;
        if (game._inBounds(r, c)) {
          const val = game.board[r][c];
          if (val === player) {
            lineStr += '1';
          } else if (val === EMPTY) {
            lineStr += '0';
          } else {
            lineStr += 'X';
          }
        } else {
          lineStr += 'X';
        }
      }
      lineStr += 'X';
      score += this._scoreDirStr(lineStr);
    }

    game.board[row][col] = original;
    return score;
  }

  /**
   * 全局棋盘评估函数：扫描所有 72 条线计算总得分差
   */
  _evaluateBoard(game, me) {
    const opponent = me === BLACK ? WHITE : BLACK;
    let myScore = 0;
    let oppScore = 0;

    for (let l = 0; l < this._linesIndices.length; l++) {
      const lineCoords = this._linesIndices[l];
      let myLineStr = 'X';
      let oppLineStr = 'X';

      for (let i = 0; i < lineCoords.length; i++) {
        const val = game.board[lineCoords[i].r][lineCoords[i].c];
        myLineStr += (val === me ? '1' : (val === EMPTY ? '0' : 'X'));
        oppLineStr += (val === opponent ? '1' : (val === EMPTY ? '0' : 'X'));
      }
      myLineStr += 'X';
      oppLineStr += 'X';

      const sMe = this._scoreDirStr(myLineStr);
      const sOpp = this._scoreDirStr(oppLineStr);

      myScore += sMe;
      // 若敌方留有活四或活三，极大化惩罚分数（防止地平线效应漏防）
      if (sOpp >= 10000) oppScore += sOpp * 3.0;
      else if (sOpp >= 1000) oppScore += sOpp * 2.0;
      else oppScore += sOpp;
    }

    return myScore - oppScore * 1.25;
  }

  /**
   * 单方向棋型匹配：优先级从高到低互斥返回，精准识别包括跳棋在内的所有棋型
   * 1 = 己子/拟落子，0 = 空位，X = 敌子/边界墙
   */
  _scoreDirStr(s) {
    if (s.includes('11111')) return 100000;
    if (s.includes('011110')) return 10000;

    // 冲四 / 跳活四 / 嵌心四
    if (/X11110|01111X|10111|11011|11101/.test(s)) return 5000;

    // 活三 / 跳活三
    if (/01110|010110|011010/.test(s)) return 1000;

    // 眠三 / 跳眠三
    if (/X11100|00111X|X10110|01101X|X11010|01011X|10011|11001/.test(s)) return 100;

    // 活二 / 跳活二
    if (/001100|01010|010010/.test(s)) return 100;

    // 眠二
    if (/X11000|00011X|X10100|00101X/.test(s)) return 10;

    return 0;
  }

  /**
   * VCF (Victory by Continuous Four) 算杀引擎
   * 搜索深达 10 步的连续冲四必胜连招
   */
  _findVCF(game, attacker, maxDepth = 10) {
    const defender = attacker === BLACK ? WHITE : BLACK;
    const candidates = this._getNearbyEmpty(game, 2);

    for (const pos of candidates) {
      const attackScore = this._evaluatePosition(game, pos.row, pos.col, attacker);
      // 只搜索能形成冲四/活四的分支
      if (attackScore >= this.SCORES.RUSH_FOUR) {
        game.board[pos.row][pos.col] = attacker;

        // 如果直接形成五连或活四，必然连胜获胜
        if (game._checkWin(pos.row, pos.col, attacker) || attackScore >= this.SCORES.LIVE_FOUR) {
          game.board[pos.row][pos.col] = EMPTY;
          return pos;
        }

        // 找出对手必须强行封堵的所有解
        const defBlocks = [];
        for (const defPos of candidates) {
          if (defPos.row === pos.row && defPos.col === pos.col) continue;
          if (game.board[defPos.row][defPos.col] !== EMPTY) continue;
          if (this._evaluatePosition(game, defPos.row, defPos.col, attacker) >= this.SCORES.FIVE) {
            defBlocks.push(defPos);
          }
        }

        let isVCF = true;
        if (defBlocks.length === 0 || maxDepth <= 1) {
          isVCF = false;
        } else {
          for (const blockPos of defBlocks) {
            game.board[blockPos.row][blockPos.col] = defender;
            const subVCF = this._findVCF(game, attacker, maxDepth - 2);
            game.board[blockPos.row][blockPos.col] = EMPTY;

            if (!subVCF) {
              isVCF = false;
              break;
            }
          }
        }

        game.board[pos.row][pos.col] = EMPTY;

        if (isVCF) {
          return pos;
        }
      }
    }

    return null;
  }
}

if (typeof window !== 'undefined') {
  window.GomokuAI = GomokuAI;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GomokuAI };
}
