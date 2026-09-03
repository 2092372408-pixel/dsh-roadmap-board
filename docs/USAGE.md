# 使用指南（中文快速上手）

> 目标：3 分钟内让「执行路线图」出现在你页面并开始工作。完整协议见 `docs/agent-protocol.md`。

## 第 0 步：准备你的项目数据

在项目根目录建文件（可先复制 `examples/website/roadmap.json` 改改）：

```text
<你的项目根>/
└─ .progress/
   └─ roadmap.json        # 看板数据（title/note/globals/lanes…结构见 docs/schema.md）
```

（可选）项目技能：`<你的项目根>/.agents/skills/<技能名>/SKILL.md`。

## 第 1 步：注册插件（动态方式，最快）

打开一个 DSH 会话，在对话里要求加载插件（或手动执行等价操作）：

1. 取 `src/board-host.js` 全文 → 作为 `code.host`；
2. 取 `src/board-client.js` 全文 → 作为 `code.client`；
3. 运行激活（`cordis_run`）。

**若你的环境能拿到“当前项目根”，什么都不用改**（插件自动按 workspaceRoot 定位）。
否则先改一处：打开 `src/board-host.js` 顶部 `CONFIG`，把 `defaultRoot` 设成项目绝对路径：

```js
const CONFIG = {
  defaultRoot: 'D:/my-project',   // ← 改成你的项目根
  discoverRoots: null,            // 可选：['D:/'] 开启目录扫描
  presetSkillRoots: [],           // 可选：部署级技能目录
  configFile: null,               // 可选：记住“当前项目”的配置文件绝对路径
}
```

改完后重新激活。

## 第 2 步：使用面板

| 我要… | 怎么做 |
|---|---|
| 打开看板 | 点右下角淡蓝胶囊「📋 … ›」（可先拖动位置） |
| 看 AI 干到哪 | 顶部状态条 `▶ 当前执行：…`；该步骤蓝色高亮 |
| 自己改计划 | 点 `✎ 编辑`：悬停未完成步骤 → `▲▼`排序 / `✎`改名 / `⚙`绑技能 / `✕`删除；阶段尾 `＋ 添加步骤`；底栏可加阶段 |
| 绑技能 | 编辑态点步骤 `⚙` → 下拉选该项目的真实技能（读 `<项目根>/.agents/skills`） |
| 全局技能 | 编辑态在顶部“全局技能”栏添加（每一步执行前都加载） |
| 切项目 | 图例栏右侧「项目」下拉（或「＋ 手动输入项目路径…」输入绝对路径） |
| 收起来 | 点 `—`；再点胶囊展开 |

> 已完成(done)步骤只读——进度由 AI 推进，避免人机互相覆盖。

## 第 3 步：让 AI 按路线执行

把以下规约（或 `docs/agent-protocol.md` 全文）放进你的 agent preset / 项目说明：

> 每轮开始先读 `<项目根>/.progress/roadmap.json`；只推进唯一 doing；
> 步骤带 skill/globals 时先加载技能；发现问题在对应步骤下加 fix 分支（不打断主线）；
> 每步完成立即整文件写回（write 或 edit 均可，面板 1.5s 内实时高亮）。

## 常见问题

- **面板空/通用模板**：还没选择项目。用「项目」下拉或手动路径选 `<你的项目根>`；
- **看不到自己的技能**：确认 `<项目根>/.agents/skills/<name>/SKILL.md` 存在且 frontmatter 含 `name`；
- **想换项目但读不到目录**：文件权限问题——把项目放在同一授权根，或用 `defaultRoot/configFile` 显式指定；
- **重新打开后丢了项目选择**：设置 `CONFIG.configFile` 指向一个可写 json 文件（如 `D:/dsh/.board-config.json`），选择会持久化。
