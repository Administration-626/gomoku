# 🎯 智弈五子棋 (Gomoku Master)

> 一个基于 HTML5 Canvas + 原生 JavaScript 构建的现代、高颜值、高战力 Web 五子棋应用。集成了 **6层 Minimax 博弈树**、**10步 VCF 算杀引擎**、**经典连珠开局定式库** 与 **竞技级禁手规则**。

---

## ✨ 核心特性

### 🎮 三大对战模式
- **人机对弈 (PvE)**：挑战内置的高性能 AI 算法，支持自由选择【执黑先手】或【执白后手】。
- **双人对战 (PvP)**：同屏面对面双人博弈。
- **AI 对战 (EVE)**：观看两个 AI 自行观摩对弈，支持自定义黑白两方的 AI 难度与对局速度。

### 🧠 强悍的 AI 算法架构
- **Minimax 极小化极大算法 + Alpha-Beta 剪枝**：深度达 6 Ply 的前瞻博弈树推演。
- **10 步 VCF (Victory by Continuous Four) 算杀引擎**：快速检索连续冲四/活四绝杀连招，实现毫秒级必胜攻势与强制防守。
- **启发式候选点动态评估 (Heuristic Sorting)**：按进攻分、防守封堵系数（100x 爆杀防守高权）与中心距离加成综合排序。
- **连珠开局定式库 (Opening Book)**：收录花月局 (Kagetsu)、浦月局 (Pogetsu) 等经典前 5 手必胜攻防阵型。
- **AI 思考预算控制**：提供 300ms (极速) / 500ms (标准) / 800ms (深度) / 不限时 4 档思考时间预算控制。

### 🛡️ 竞技级禁手规则
- 可选 **黑棋禁手规则**（连珠 Renju 竞技标准）：
  - **三三禁手 (Double Three)**：单步形成 2 个或以上活三
  - **四四禁手 (Double Four)**：单步形成 2 个或以上冲四/活四
  - **长连禁手 (Overline)**：单步形成 6 个或以上连续黑子
  *(注：恰好形成五连享受五连豁免权，直接判定获胜；白棋无禁手限制)*
- **兜底误触提醒**：下在禁手点时自动拒绝落子，并弹出动画 Toast 提醒框。
- **In-Game Lock 对局锁死机制**：对局开始后自动锁定右侧控制面板与禁手开关，防止中途篡改规则。

### 🎬 对局复盘与回放系统
- 终局后提供 **🎬 对局回放** 与 **🔍 查看盘面** 模式。
- 支持上一步/下一步手动步进、自动播放复盘、动态显示历史手序与高亮获胜连线。
- 侧边栏交互式落子记录列表，点击任意历史步数直接跳转对应盘面。

---

## 🛠️ 技术栈

- **前端**：HTML5 Canvas, Vanilla CSS3 (CSS Variables, Flexbox/Grid, Dark Mode 视觉), Native JavaScript (ES6+)
- **后端 / 运维**：Node.js 内置 HTTP Static Server
- **自动化测试**：Node.js Assert 单元测试套件 (`test_suite.js`)

---

## 🚀 本地运行与开发

### 1. 启动本地开发服务
```bash
# 进入项目目录
cd /home/tan/playground/gomoku

# 启动本地服务
node server.js
```
启动后在浏览器访问 `http://localhost:8080` 即可开始对局。

### 2. 运行自动化测试套件
```bash
npm test
```
测试套件包含 11 项全自动化校验：
- 棋盘引擎初始化与胜负判定测试
- AI 攻防与天元开局策略测试
- EVE 60 步对局模拟
- Frontend DOM 控件完整性集成测试

---

## 📂 项目结构

```
gomoku/
├── index.html        # 主界面结构 (Canvas 挂载点与控制面板)
├── style.css         # 全局视觉样式与暗黑高端风设计系统
├── game.js           # 五子棋核心游戏引擎 (棋盘模型/胜负判断/禁手算法)
├── ai.js             # GomokuAI 模块 (Minimax/VCF算杀/开局库/启发评估)
├── app.js            # 视图控制器 (Canvas 渲染/DOM 事件处理/回放系统)
├── server.js         # 简易 Node.js 静态 HTTP 服务器
└── test_suite.js     # 自动化单元与集成测试脚本
```

---

## 📜 许可协议

MIT License
