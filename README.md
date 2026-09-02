<div align="center">

# 📋 dsh-roadmap-board

**人机共享的执行路线图看板 · Human-AI Shared Execution Roadmap for DSH**

让多轮落地的 AI **不跑偏、被看见、可接管**：目标 → 横向阶段 → 步骤，形成一棵“可执行图”。
人随时增删改未来项、排序、给步骤绑技能；AI 执行前读图、执行时点亮、返工走分支、完成即写回。

`MIT` · Cordis Plugin / Agent Preset · v0.1

</div>

---

## ✨ 它在解决什么

| 问题 | 本看板的答案 |
|---|---|
| AI 多轮“跑偏” | 路线文件 = 唯一事实源，AI 每轮**先读图只做唯一 doing**（`docs/agent-protocol.md`） |
| 你看不到 AI 干到哪 | 面板 **1.5s 实时同步**：状态条 `▶ 当前执行：…` + 节点点亮，`write/edit` 都触发 |
| 人是旁观者 | 编辑模式随时**增删改未完成项、▲▼ 排序**；已完成只读（进度归 AI） |
| 非线性编排 | 阶段→步骤 顺序主线 + 右侧「返工/完善」分支 + 并行 todo，类 LangGraph 而非死链 |
| 每步该用什么能力 | 步骤可**绑定技能**（`⚙ 技能：…` 第二行显示），执行前自动加载；另有全局技能 |
| 换一个项目就要重写 | **按项目根隔离**：数据在 `<项目根>/.progress/roadmap.json`，技能在 `.agents/skills`，一键切换 |

## 🗺️ 一眼看懂

主线自左向右：`阶段0 → 阶段1 → 阶段2 → 阶段3 → …`；阶段内步骤自上而下按顺序执行（↓）。
下面是看板界面示意（表格形式，展示结构与状态语义）：

| 顶部 | 内容 |
|---|---|
| 大标题 | 📋 教育智能体 · 执行路线　（编辑中 / 执行中徽标） |
| 状态条 | ▶ 当前执行：试讲 5 题跑协议+打分 |
| 图例+项目 | ○待办 ▶进行中 ✓完成 ↻修改中 ⊘受阻　·　项目：deepseek_harness ▾ |

| 阶段0 · 范围与地基 | 阶段1 · 教学协议 | 阶段2 · 知识层 | 阶段3 · 原型工程化 |
|---|---|---|---|
| ✓ 确认范围 | ✓ pedagogy 主体 | ○ knowledge 规范 | ○ 查证 preset |
| ✓ PLAN v1 | ▶ 试讲 5 题 | ○ 单元讲义 | ○ 写 Agent 人设 |
| ✓ 重规划 | ⚙ tutor-loop ↓ | ○ 例题库 20 题 | ○ 技能1 辅导… |
| ○ 回顾修复代码 | ○ 修订协议 | ○ … | ○ … |
| ○ 完整执行检测 | | | |

| 右侧栏（独立，不打断主线） | 内容 |
|---|---|
| 修复 / 完善 | ✓ 修复：动态工具不可调用 → 文件通道　·　✓ 完善：PLAN §7 主线规约　·　… |

> 要点：① 阶段间箭头=主线顺序；② 阶段内步骤按顺序 ↓ 执行；③ 返工/完善只在右侧栏，绝不插入主线；④ 绑定技能的步骤会加高并在第二行显示 `⚙ 技能名`（如上方 `试讲 5 题`）。

## 🚀 两分钟上手

**方式 A：动态插件（试用）** — 本会话注册即可

```js
// code.host  ← src/board-host.js 内容；code.client ← src/board-client.js 内容
// 然后用 cordis_run 激活；右下角出现「📋 项目路线 ›」
```

**方式 B：Agent Preset（交付）** — 见 `preset/roadmap-board/README.md`（先按你的 DSH 插件契约打本地包，再在组合加一行并装载校验）。

**项目数据结构**

```text
<项目根>/
├─ .progress/roadmap.json          # 看板数据 = 唯一事实源
├─ .progress/roadmap.seed.json     # （可选）空看板专用种子
└─ .agents/skills/<name>/SKILL.md  # 该项目可用技能
```

**人 ↔ AI 协作流**

```text
人在面板编辑(结构/技能/顺序)          AI 读文件 → 加载技能 → 推进 doing
        └──────────► roadmap.json ◄──────────────┘
              （双向同步：write/edit 均实时上屏）
```

## 📚 文档

| 文档 | 内容 |
|---|---|
| `docs/schema.md` | roadmap.json 完整结构：阶段/步骤/分支/技能/globals |
| `docs/agent-protocol.md` | AI 规约：先读图 → 只做 doing → 先加载技能 → 岔路分支 → 写回 |
| `docs/portability.md` | 部署参数化：`defaultRoot / configFile / presetSkillRoots / discoverRoots` |

## 🧪 示例

- `examples/edu/roadmap.json` — 教育智能体路线（K12 辅导，绑 `tutor-loop`）
- `examples/website/roadmap.json` — 官网重构路线（自定义标题/流程/技能 `deploy-check`）

## 🗒️ 路线图

依赖与并行边线 · 步骤验收/备注 · 清单视图 · 正式 npm 打包一键装载 · 效果动图

## 📄 License

MIT © dsh-roadmap-board contributors
