/**
 * study.js - 五子棋残局特训与开局定式数据库
 */

(function () {
  'use strict';

  if (typeof BLACK === 'undefined') var BLACK = 1;
  if (typeof WHITE === 'undefined') var WHITE = 2;

  /**
   * 精选五子棋攻防与杀局关卡
   */
  const STUDY_PUZZLES = [
    {
      id: 'p1',
      title: '关卡 1：冲四必杀 (入门)',
      category: '杀招入门',
      difficulty: '⭐',
      description: '黑棋行动。盘面上黑棋已形成冲四，请找到最佳一步完成五连胜利！',
      player: BLACK,
      enableFoul: false,
      initialMoves: [
        { row: 7, col: 7, player: BLACK }, // H8
        { row: 7, col: 8, player: BLACK }, // I8
        { row: 7, col: 9, player: BLACK }, // J8
        { row: 7, col: 10, player: BLACK },// K8
        { row: 6, col: 7, player: WHITE },
        { row: 8, col: 8, player: WHITE }
      ],
      solution: [
        { row: 7, col: 6 } // G8 形成 5 连
      ],
      hint: '关注黑棋在第 8 行的横向 4 连阵型，两端均可落子！'
    },
    {
      id: 'p2',
      title: '关卡 2：防守关键点 (入门)',
      category: '防守特训',
      difficulty: '⭐',
      description: '白棋行动。黑棋已形成冲四威胁，白棋必须立即封堵，阻止黑棋胜局！',
      player: WHITE,
      enableFoul: false,
      initialMoves: [
        { row: 7, col: 6, player: BLACK },
        { row: 7, col: 7, player: BLACK },
        { row: 7, col: 8, player: BLACK },
        { row: 7, col: 9, player: BLACK },
        { row: 5, col: 5, player: WHITE },
        { row: 6, col: 6, player: WHITE }
      ],
      solution: [
        { row: 7, col: 5 } // F8 封堵
      ],
      hint: '找出黑棋冲四两端的空位，抢先一步拦截！'
    },
    {
      id: 'p3',
      title: '关卡 3：三步 VCF 杀局 (进阶)',
      category: 'VCF连杀',
      difficulty: '⭐⭐',
      description: '黑棋行动。利用连续冲四 (VCF) 逼迫对手，在 3 步内锁定胜局！',
      player: BLACK,
      enableFoul: false,
      initialMoves: [
        { row: 7, col: 7, player: BLACK },
        { row: 7, col: 8, player: BLACK },
        { row: 7, col: 9, player: BLACK },
        { row: 6, col: 8, player: BLACK },
        { row: 5, col: 8, player: BLACK },
        { row: 8, col: 7, player: WHITE },
        { row: 8, col: 8, player: WHITE },
        { row: 8, col: 9, player: WHITE }
      ],
      solution: [
        { row: 7, col: 10 }, // 1. 横向冲四 7,7-7,8-7,9-7,10
        { row: 7, col: 6 }   // 2. 白封堵 7,11 后，反向五连绝杀！
      ],
      responses: [
        { row: 7, col: 11 }  // 白棋封堵右端 7,11
      ],
      hint: '第一步先横向冲四，逼白棋防守，随后反向绝杀！'
    },
    {
      id: 'p4',
      title: '关卡 4：双活三与四三胜局 (进阶)',
      category: '战术构筑',
      difficulty: '⭐⭐',
      description: '黑棋行动。请找到能同时形成“活三”和“冲四”的关键交叉要点！',
      player: BLACK,
      enableFoul: false,
      initialMoves: [
        { row: 7, col: 7, player: BLACK },
        { row: 7, col: 8, player: BLACK },
        { row: 7, col: 9, player: BLACK },
        { row: 5, col: 7, player: BLACK },
        { row: 6, col: 7, player: BLACK },
        { row: 8, col: 5, player: WHITE },
        { row: 9, col: 6, player: WHITE }
      ],
      solution: [
        { row: 7, col: 6 } // 四三胜要点
      ],
      hint: '寻找纵横交叉点，一子双杀！'
    },
    {
      id: 'p5',
      title: '关卡 5：以冲四破解三三禁手 (高阶)',
      category: '禁手识别',
      difficulty: '⭐⭐⭐',
      description: '开启黑棋禁手规则。若直接落子 (7,8) 会形成【三三禁手】。请先在 (7,5) 形成活三逼白棋封堵，将横向转为冲四后再落子 (7,8) 完美破局！',
      player: BLACK,
      enableFoul: true,
      initialMoves: [
        { row: 7, col: 6, player: BLACK },
        { row: 7, col: 7, player: BLACK },
        { row: 5, col: 8, player: BLACK },
        { row: 6, col: 8, player: BLACK },
        { row: 8, col: 9, player: WHITE },
        { row: 9, col: 10, player: WHITE }
      ],
      solution: [
        { row: 7, col: 5 }, // 1. 先落子 (7,5) 形成活三
        { row: 7, col: 8 }  // 2. 横向转为冲四后，下 (7,8) 解禁破局！
      ],
      responses: [
        { row: 7, col: 4 }  // 白棋封堵左端 (7,4)
      ],
      hint: '先下 (7,5) 形成活三逼对方封堵，横向变为冲四后下 (7,8) 即可解禁！'
    },
    {
      id: 'p6',
      title: '关卡 6：五步精彩 VCF 绝杀 (大师)',
      category: '大师算杀',
      difficulty: '⭐⭐⭐',
      description: '黑棋行动。盘面错综复杂，请通过严密计算的连续冲四 (VCF) 破解防线！',
      player: BLACK,
      enableFoul: false,
      initialMoves: [
        { row: 7, col: 7, player: BLACK },
        { row: 7, col: 8, player: BLACK },
        { row: 7, col: 9, player: BLACK },
        { row: 5, col: 7, player: BLACK },
        { row: 6, col: 7, player: BLACK },
        { row: 9, col: 7, player: BLACK },
        { row: 8, col: 6, player: WHITE },
        { row: 8, col: 8, player: WHITE },
        { row: 8, col: 10, player: WHITE }
      ],
      solution: [
        { row: 7, col: 10 }, // 1. 横向冲四
        { row: 4, col: 7 }   // 2. 纵向五连贯穿
      ],
      responses: [
        { row: 7, col: 11 }  // 白棋封堵右端
      ],
      hint: '先横向逼应，再纵向贯穿！'
    }
  ];

  /**
   * 连珠 26 经典开局定式
   */
  const OPENING_BOOK_LESSONS = [
    {
      id: 'kagetsu',
      name: '花月局 (Kagetsu)',
      type: '直止开局 · 黑棋必胜',
      description: '连珠二十六局中最著名的黑棋必胜局之一。第1手天元，第2手直止防守，第3手形成斜三。黑棋空间极大，进攻绵密无瑕。',
      moves: [
        { row: 7, col: 7, player: BLACK, label: '1 (天元)' },
        { row: 7, col: 8, player: WHITE, label: '2 (直止)' },
        { row: 8, col: 8, player: BLACK, label: '3 (斜三)' },
        { row: 6, col: 6, player: WHITE, label: '4 (常见防守)' },
        { row: 8, col: 6, player: BLACK, label: '5 (展开攻势)' }
      ]
    },
    {
      id: 'pogetsu',
      name: '浦月局 (Pogetsu)',
      type: '直止开局 · 黑棋必胜',
      description: '同样为著名的黑棋必胜开局。第3手于天元正下方构成直三，变化简明，黑棋极易展开多重四三攻势。',
      moves: [
        { row: 7, col: 7, player: BLACK, label: '1 (天元)' },
        { row: 7, col: 8, player: WHITE, label: '2 (直止)' },
        { row: 8, col: 7, player: BLACK, label: '3 (直三)' },
        { row: 6, col: 8, player: WHITE, label: '4 (防守拦截)' },
        { row: 8, col: 9, player: BLACK, label: '5 (控制外势)' }
      ]
    },
    {
      id: 'kansei',
      name: '寒星局 (Kansei)',
      type: '斜止开局 · 黑棋大优',
      description: '斜止代表开局。第2手白棋占斜角，第3手黑棋做活二，布局对称庄严，黑棋保持强劲主动权。',
      moves: [
        { row: 7, col: 7, player: BLACK, label: '1 (天元)' },
        { row: 8, col: 8, player: WHITE, label: '2 (斜止)' },
        { row: 7, col: 8, player: BLACK, label: '3 (活二)' },
        { row: 9, col: 9, player: WHITE, label: '4 (跟进)' },
        { row: 6, col: 8, player: BLACK, label: '5 (拓展)' }
      ]
    },
    {
      id: 'ugetsu',
      name: '雨月局 (Ugetsu)',
      type: '斜止开局 · 攻守兼备',
      description: '斜止第二局，第3手与天元成角。变化多端，对白棋的防守精准度要求极高。',
      moves: [
        { row: 7, col: 7, player: BLACK, label: '1 (天元)' },
        { row: 8, col: 8, player: WHITE, label: '2 (斜止)' },
        { row: 8, col: 7, player: BLACK, label: '3 (角形)' },
        { row: 6, col: 7, player: WHITE, label: '4 (拦截)' },
        { row: 9, col: 8, player: BLACK, label: '5 (反击)' }
      ]
    }
  ];

  // 挂载全局 (浏览器 & Node)
  if (typeof window !== 'undefined') {
    window.STUDY_PUZZLES = STUDY_PUZZLES;
    window.OPENING_BOOK_LESSONS = OPENING_BOOK_LESSONS;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { STUDY_PUZZLES, OPENING_BOOK_LESSONS };
  }
})();
