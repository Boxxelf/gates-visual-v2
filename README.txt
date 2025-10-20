# ETS Gates Visualization（CSV-only）

在线访问（GitHub Pages）
- https://boxxelf.github.io/gates-visual-v2/web/

项目说明
- 本项目通过前端（D3 + 原生 JS）读取 CSV 实现交互可视化。
- 所有数据均来自仓库根目录下的 `data/*.csv`，无需后端。

目录结构
- `web/`：网页前端（`index.html`、样式与脚本）
- `data/`：CSV 数据文件（供前端直接读取）
- `tools/`：数据校验等辅助脚本

本地运行（推荐）
- 进入 `web/` 并启动本地 HTTP 服务：
  - Python: `cd web && python3 -m http.server 8000` 然后访问 http://localhost:8000
- 注意：不要用 `file://` 直接双击 `index.html`，浏览器会阻止读取本地 CSV。

如何更新数据
- 直接替换仓库根目录下的 `data/` 中这 4 个文件（列名保持不变）：
  - `calculus_topics.csv`
  - `cs_topics.csv`
  - `connections.csv`
  - `prerequisites.csv`
- 刷新页面即可生效（前端已加防缓存参数）。

部署到 GitHub Pages 的方式
1) 将本仓库推送到 GitHub，保持根目录下同时有 `web/` 与 `data/`。
2) 仓库 Settings → Pages：
   - Source: Deploy from a branch
   - Branch: `main / root`
3) 部署完成后，使用 `https://<用户名>.github.io/<仓库名>/web/` 访问。

常见问题
- 页面能打开但数据不显示：
  - 确认访问的是 `/web/` 子路径（前端从 `../data/` 加载 CSV）。
  - 确认仓库根存在 `data/` 目录（不是在 `web/` 里且不要使用符号链接）。
- Chrome 仍显示旧数据：
  - 打开开发者工具 Network 勾选 "Disable cache"，再强制刷新（Cmd+Shift+R）。

数据校验
- 可选：运行简单校验脚本
  - `python tools/validate.py /path/to/ets-viz`

许可证
- 本仓库未明确指定许可证。如需开放或限制使用，请在根目录添加 `LICENSE`。
