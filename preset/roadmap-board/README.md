# preset/roadmap-board —— 安装与启用

## 方式 A：动态插件（最快，适合试用）

本会话内把仓库文件内容粘贴进 cordis_define：

1. `code.host` ← `../../src/board-host.js` 的**内容**（该文件本身就是可执行函数体）；
2. `code.client` ← `../../src/board-client.js` 的**内容**；
3. `cordis_run` 激活，页面右下角出现「📋 执行路线图」。

此时请先设置项目根：编辑 `board-host.js` 顶部 `CONFIG`（defaultRoot / configFile），
或先在目标项目放好 `.progress/roadmap.json`，再用面板项目下拉/手动路径选择。

## 方式 B：本地插件包 + Agent Preset（推荐正式交付）

1. 将 `src/` 打成 npm/DSH 本地插件包（`package.json` main 指向导出 Cordis 插件对象的入口；
   Host 能力与 Client 悬浮层分别作为插件入口或随组合加载）。以实际加载器为准做一次装载验证；
2. 按 `agent.cordis.yml.example` 在 preset 组合中加入插件行；
3. 把本 preset 目录（含 `preset.yml` 与最终 `agent.cordis.yml`）放入
   `${DSH_HOME:-$HOME/.dsh}/.agent-presets/roadmap-board/`；
4. 用新会话选择该 preset，确认出现 `project_progress` 工具与右下角看板。

> 注意：不要写入部署自带的 `agent-presets`（升级会覆盖）。用户根下的 preset 可自由增删改。

## 数据约定（任何方式都一致）

```text
<项目根>/                 # CONFIG.defaultRoot / 手动选择的目录
├─ .progress/roadmap.json
├─ .progress/roadmap.seed.json   #（可选）空看板的项目专用种子
└─ .agents/skills/<name>/SKILL.md  # 该项目技能库
```

约定与 AI 规约分别见 `docs/schema.md`、`docs/agent-protocol.md`。
