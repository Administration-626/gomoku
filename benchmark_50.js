/**
 * benchmark_50.js
 * 50 轮五子棋AI对战基准测试 (中等 Baseline vs 困难 Minimax)
 */

const { GomokuGame, BLACK, WHITE } = require('./game.js');
const { GomokuAI } = require('./ai.js');

console.log('====================================================');
console.log('   50-ROUND TOURNAMENT: MEDIUM (BASELINE) vs HARD  ');
console.log('====================================================\n');

let mediumWins = 0;
let hardWins = 0;
let draws = 0;
let totalMoves = 0;

const startGlobalTime = Date.now();

for (let round = 1; round <= 50; round++) {
  const game = new GomokuGame();

  // 前 25 场：中等执黑，困难执白
  // 后 25 场：困难执黑，中等执白
  const isMediumBlack = round <= 25;
  const blackAI = isMediumBlack ? new GomokuAI('medium') : new GomokuAI('hard');
  const whiteAI = isMediumBlack ? new GomokuAI('hard') : new GomokuAI('medium');

  let moveCount = 0;
  while (!game.gameOver && moveCount < 225) {
    moveCount++;
    const currentAI = game.currentPlayer === BLACK ? blackAI : whiteAI;
    // 快速搜深预算 (15ms)
    const move = currentAI.getMove(game, 15);
    game.placeStone(move.row, move.col);
  }

  totalMoves += moveCount;

  let winnerStr = 'DRAW';
  if (game.winner === BLACK) {
    if (isMediumBlack) { mediumWins++; winnerStr = 'MEDIUM (⚫)'; }
    else { hardWins++; winnerStr = 'HARD (⚫)'; }
  } else if (game.winner === WHITE) {
    if (!isMediumBlack) { mediumWins++; winnerStr = 'MEDIUM (⚪)'; }
    else { hardWins++; winnerStr = 'HARD (⚪)'; }
  } else {
    draws++;
  }

  console.log(`Round ${round.toString().padStart(2, ' ')} / 50 | Black: ${isMediumBlack ? 'Medium' : 'Hard  '} | White: ${isMediumBlack ? 'Hard  ' : 'Medium'} | Winner: ${winnerStr.padEnd(14, ' ')} | Moves: ${moveCount}`);
}

const totalTimeSec = ((Date.now() - startGlobalTime) / 1000).toFixed(2);
const mediumWinRate = ((mediumWins / 50) * 100).toFixed(1);
const hardWinRate = ((hardWins / 50) * 100).toFixed(1);
const drawRate = ((draws / 50) * 100).toFixed(1);
const avgMoves = (totalMoves / 50).toFixed(1);

console.log('\n====================================================');
console.log('              FINAL TOURNAMENT RESULTS             ');
console.log('====================================================');
console.log(`Total Rounds Played : 50 (25 Medium-Black / 25 Hard-Black)`);
console.log(`Total Time Elapsed  : ${totalTimeSec} seconds`);
console.log(`Average Moves/Game  : ${avgMoves} moves`);
console.log('----------------------------------------------------');
console.log(`⭐ MEDIUM (Baseline) Wins : ${mediumWins} / 50 (${mediumWinRate}%)`);
console.log(`🔥 HARD (Minimax) Wins    : ${hardWins} / 50 (${hardWinRate}%)`);
console.log(`🤝 Draws                 : ${draws} / 50 (${drawRate}%)`);
console.log('====================================================\n');
