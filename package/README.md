# package/ —— 本地插件包骨架（实验性）

把 `src/board-host.js`（与 Client 半部，如你的 web profile 需要）封装为 DSH 可加载的本地插件包。

- `index.js` 目前用一个最小包装把 `../src/board-host.js` 内容作为函数体加载——**请先对照你所用 DSH 的插件加载契约**（入口模块形态、是否要求独立 descriptor、Client 半部如何随包发布）调整后再 `dsh plugin add ./package`。
- 封装验证通过后，回到 `../preset/roadmap-board/agent.cordis.yml.example` 的说明把一行插件行加进 preset。

已知边界：真正的“开箱即用 preset”以本包通过装载校验为前提；在那之前，开发期用动态插件路径（cordis_define + cordis_run）即可完整体验全部功能。
