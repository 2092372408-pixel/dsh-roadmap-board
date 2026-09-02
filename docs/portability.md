# 移植与参数化（Portability）

本插件自 v49/v50 起按“项目根”工作，仍保留少量部署相关常量。发布到通用环境前请按本文处理：

## 唯一必须配置：默认项目根

`src/board-host.js` 顶部 `CONFIG`：

```js
const CONFIG = {
  // 选填：默认项目根（绝对路径）。null = 自动
  // 自动顺序：① board-project.json 里的 root → ② 运行时 sandboxPolicy.workspaceRoot → ③ 插件 fs 默认 cwd
  defaultRoot: null,
  // 选填：开启目录扫描（自动发现候选项目）。形如 ['D:/']；不设则不扫描
  discoverRoots: null,
  // 选填：额外的技能扫描根（部署级技能目录），如 ['/opt/dsh/config/agent-presets']
  presetSkillRoots: [],
  // 选填：持久化“当前项目”选择到哪个配置文件；null = 随当前项目根存 <root>/.progress/board-project.json
  configFile: null,
}
```

发布者可在 preset 组合或插件入口处把 `CONFIG` 替换为宿主环境提供的值（workspace 根、DSH 安装路径等）。

## 移除的机器相关硬编码（相对 v51 会话版）

| 原常量 | 处理 |
|---|---|
| `DEF_ROOT = 'D:/deepseek_harness'` | → `CONFIG.defaultRoot`（null = 自动） |
| `DRIVE_BASE = 'D:/'` | → `CONFIG.discoverRoots`（默认关闭） |
| `PRESET_BASE = 'D:/dsh/...'` | → `CONFIG.presetSkillRoots` |
| `CONFIG_ABS = 'D:/.progress/board-project.json'` | → `CONFIG.configFile`，缺省随项目根 |

## 跨平台注意

- 所有路径统一正斜杠化后再拼接/比较；
- 不含任何 OS 专属 API；文件访问仅用 `ctx.get('fs')` 的 `resolve/readText/writeText/listDir`；
- 看板与技能目录相对项目根，因此换机器只影响 `CONFIG` 与项目目录本身。

## 已参数化且无需改动

- 面板标题、阶段、步骤、分支、技能、全局技能全部来自数据文件 → 天然按项目替换；
- 项目切换下拉 + 手动路径输入；空项目自动写通用种子；
- 技能下拉读取 `<项目根>/.agents/skills` + `CONFIG.presetSkillRoots`。
