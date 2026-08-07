/**
 * benchmark_hard_medium.js
 * 困难 vs 中等 双边对战测试
 * 每边各执黑 GAMES 轮；预算 budgetMs 可调
 */
const { GomokuGame, BLACK, WHITE } = require('./game.js');
const { GomokuAI } = require('./ai.js');

const GAMES_PER_SIDE = parseInt(process.argv[2] || '15', 10);
const BUDGET_MS = parseInt(process.argv[3] || '500', 10);

console.log('========================================================');
console.log(`  HARD vs MEDIUM · 每边 ${GAMES_PER_SIDE} 轮 · 思考预算 ${BUDGET_MS}ms/步`);
console.log('========================================================\n');

function playGame(blackLevel, whiteLevel) {
  const game = new GomokuGame();
  const blackAI = new GomokuAI(blackLevel);
  const whiteAI = new GomokuAI(whiteLevel);

  let moveCount = 0;
  while (!game.gameOver && moveCount < 225) {
    moveCount++;
    const currentAI = game.currentPlayer === BLACK ? blackAI : whiteAI;
    const move = currentAI.getMove(game, BUDGET_MS);
    game.placeStone(move.row, move.col);
  }
  return { winner: game.winner, moves: moveCount };
}

let hardWins = 0, mediumWins = 0, draws = 0;
let hardAsBlack = { w: 0, d: 0, l: 0 };
let hardAsWhite = { w: 0, d: 0, l: 0 };
let totalMoves = 0;
let totalGames = 0;

const startAll = Date.now();

for (let round = 1; round <= GAMES_PER_SIDE * 2; round++) {
  const hardIsBlack = round <= GAMES_PER_SIDE;
  const blackLevel = hardIsBlack ? 'hard' : 'medium';
  const whiteLevel = hardIsBlack ? 'medium' : 'hard';

  const { winner, moves } = playGame(blackLevel, whiteLevel);
  totalMoves += moves;
  totalGames++;

  let resultStr;
  const side = hardIsBlack ? 'HARD⚫ vs MEDIUM⚪' : 'MEDIUM⚫ vs HARD⚪';
  if (winner === BLACK) {
    if (hardIsBlack) { hardWins++; hardAsBlack.w++; resultStr = 'HARD 胜'; }
    else { mediumWins++; hardAsWhite.l++; resultStr = 'MEDIUM 胜 (困难负)'; }
  } else if (winner === WHITE) {
    if (hardIsBlack) { mediumWins++; hardAsBlack.l++; resultStr = 'MEDIUM 胜 (困难负)'; }
    else { hardWins++; hardAsWhite.w++; resultStr = 'HARD 胜'; }
  } else {
    draws++;
    if (hardIsBlack) hardAsBlack.d++; else hardAsWhite.d++;
    resultStr = '平局';
  }

  console.log(`第 ${round.toString().padStart(2)} 局 | ${side} | ${resultStr.padEnd(16)} | ${moves} 手`);
}

const elapsed = ((Date.now() - startAll) / 1000).toFixed(1);
console.log('\n========================================================');
console.log('              最终结果');
console.log('========================================================');
console.log(`总对局 : ${totalGames} 场 (预算 ${BUDGET_MS}ms/步)`);
console.log(`耗时   : ${elapsed}s · 平均 ${(totalMoves / totalGames).toFixed(1)} 手/局`);
console.log('--------------------------------------------------------');
console.log(`🔥 困难胜 : ${hardWins} (${((hardWins / totalGames) * 100).toFixed(1)}%)`);
console.log(`⭐ 中等胜 : ${mediumWins} (${((mediumWins / totalGames) * 100).toFixed(1)}%)`);
console.log(`🤝 平局  : ${draws} (${((draws / totalGames) * 100).toFixed(1)}%)`);
console.log('--------------------------------------------------------');
console.log(`困难执黑 : 胜 ${hardAsBlack.w} / 平 ${hardAsBlack.d} / 负 ${hardAsBlack.l}`);
console.log(`困难执白 : 胜 ${hardAsWhite.w} / 平 ${hardAsWhite.d} / 负 ${hardAsWhite.l}`);
console.log('========================================================');