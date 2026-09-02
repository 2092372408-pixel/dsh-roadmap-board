# dsh-roadmap-board

**DSH（DeepSeek Harness）上的人机共享“执行路线图”看板插件 v0.1**

让 AI 在多轮落地中不跑偏、且可被随时看见/接管：把目标拆成 **横向阶段 → 步骤** 的可执行图；人可在面板**增删改未来项、排序、给步骤绑技能**；AI 执行前读图、执行时点亮状态、返工走分支、完成即写回；页面 1.5s 内实时同步。

灵感对应：LangGraph 式的非线性编排（主线 + 并行/分支 + 状态机），而非 LangChain 式死链。

## 特性

- 横向执行链条：`根标题 → 阶段0 → 阶段1 → …`，阶段内步骤顺序 ↓ 串联；
- 编辑模式：增删改「未完成」步骤、**▲▼ 排序**、重命名、删除、加阶段；已完成只读（进度由 AI 推进）；
- **步骤↔技能绑定**：下拉选择项目真实技能（读 `<项目根>/.agents/skills` + 平台技能库），绑定步骤加高并第二行显示 `⚙ 技能`；
- **全局技能**：每步执行前都加载；
- **返工/完善侧栏**：`branches` 挂在所属步骤、右侧独立展示，不破坏主线；
- **实时状态**：AI 把步骤标为 `doing` 后，状态条显示“▶ 当前执行：…”，节点高亮；`write/edit` 文件更新都实时上屏；
- **跨项目复用**：数据/技能按项目根隔离；面板可切换项目（下拉 + 手动路径）；新项目自动通用种子。

## 快速开始

两种使用方式（详见 `docs/`）：

1. **动态插件（推荐开发期）**：把 `src/board-host.js` 与 `src/board-client.js` 作为 `code.host` / `code.client` 用 `cordis_define` 注册，`cordis_run` 激活，即在本会话出现右下角「📋 执行路线图」。
2. **Agent Preset（推荐交付）**：按 `preset/roadmap-board/` 模板把看板封装为 preset（见该目录 README），放入 `$DSH_HOME/.agent-presets/`，新建会话即可用。

数据：

```text
<项目根>/
├─ .progress/roadmap.json      # 看板数据（唯一事实源）
├─ .progress/roadmap.seed.json #（可选）空项目专用种子
└─ .agents/skills/<name>/SKILL.md  # 该项目可用技能
```

## 文档

- `docs/schema.md` — roadmap.json 结构与语义（阶段/步骤/分支/技能/globals）
- `docs/agent-protocol.md` — AI 使用规约（先读图→只做 doing→先加载技能→岔路分支→写回）
- `docs/portability.md` — 部署参数化（默认项目根/技能根/扫描开关）

## 示例

- `examples/edu/roadmap.json` — 教育智能体路线（K12 辅导，绑 tutor-loop）
- `examples/website/roadmap.json` — 官网重构路线（演示自定义标题/流程/技能 deploy-check）

## 路线图（v0.2+ 候选）

依赖与并行边线、步骤验收/备注、清单视图、按 preset 内置的协议化技能、将 Host 逻辑打成 npm 插件包以便一行安装。

## License

MIT（见 `LICENSE`）。示例数据与教育技能仅作演示。
