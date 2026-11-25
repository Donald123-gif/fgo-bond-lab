# 迦勒底 · 牵绊编队

Fate/Grand Order 国服与日服的非官方牵绊计算器。给定关卡基础牵绊、持有从者和礼装、编队 Cost 及固定位置，网页在浏览器中比较组合，将结果直接填回六个编队槽位。首次使用请先把演示候选改为自己持有的卡。

[打开计算器（GitHub Pages）](https://donald123-gif.github.io/fgo-bond-lab/#workspace) · [打开 ChatGPT Sites 版](https://chaldea-bond-lab-iamuf.divinecoot35.chatgpt.site/#workspace) · **[用户使用指南](docs/USER_GUIDE.md)**

## 能计算什么

- 在最多五名自有从者与一名助战的编队中，可选择「全队总牵绊最大」或「必选从者牵绊优先」。支持固定从者、礼装、站位和灵基，也可留空让计算器补全。
- 根据助战是否首发和自有站位调整基础牵绊，再结算条件礼装、绊15、固定点数和茶壶。每张自有从者卡可展开逐项明细。助战普通槽和冠位报酬槽可以留空自动选优，也可指定礼装或不装备。条件礼装按各战斗形态的特性判定。
- 戴冠战按出击职阶组限制候选，区分普通礼装、免费报酬槽和自身十绊礼装专用槽。普通礼装目录还可用于保留输出礼装的槽位与费用。
- 桌面和手机均可选卡、换位和保存命名方案。国服与日服分别读取各自的数据和本地存档。

「最优」的范围是当前候选、固定条件和已建模效果。页面不模拟伤害、周回或通关；活动专属效果和其他特殊机制不能从礼装说明文字自动折算。对全队统一生效的额外百分比可手动输入。

## 本地运行与测试

仓库里的 `dist/` 就是可运行的网站。页面使用原生 HTML、CSS、JavaScript 和 Web Worker；没有 `package.json`，无须安装 npm 包或编译。以下命令在仓库根目录执行。

1. 用 Python 3 启动静态 HTTP 服务。

   ```sh
   python -m http.server 5173 --directory dist
   ```

2. 打开 [本地编队页面](http://localhost:5173/#workspace)。请通过 HTTP 访问，页面需要加载服务器数据、头像索引并启动计算线程。
3. 用 Node.js 运行仓库自带的测试。

   ```sh
   node test.cjs
   ```

测试使用 Node.js 内置断言，包含小规模穷举对照、前后排及位置锁、冠位槽、真实灵基差异、筛选排序、区域数据及绊15收益。国服与日服还各有实战结算样例，核对逐人收益、取整、固定点数和加成上限。

## 仓库导览

| 路径 | 职责 |
| --- | --- |
| `dist/index.html`、`dist/style.css` | 主界面、选择与筛选弹窗、手机布局 |
| `dist/region.js`、`dist/app.js` | 服务器切换与资源加载；编队状态、输入校验和计算入口 |
| `dist/picker.js`、`dist/selection.js` | 选卡与候选池、别名匹配、筛选和排序 |
| `dist/board.js`、`dist/placement.js`、`dist/results.js` | 拖拽与位置锁、队伍汇总、结果回填及形态说明 |
| `dist/worker.js`、`dist/solver.js` | 后台计算。枚举候选礼装组合，再按人数、开场前排人数、Cost 和绊15人数比较从者组合 |
| `dist/teams.js` | 保存、载入和删除当前服务器的命名编队 |
| `dist/data.js`、`dist/data-jp.js`、`dist/portraits-*.json` | 国服、日服数据快照与各服头像索引 |
| `prepare_data.py`、`portraits.py`、`aliases.json` | 导入 Atlas 数据、提取头像选项、维护检索别名 |
| `test.cjs`、`.github/workflows/pages.yml`、`AGENTS.md` | 测试、GitHub Pages 工作流及本项目的双站发布约定 |

## 数据与配置

页面启动时读取随站发布的快照。页首显示所选服的数据日期和目录数量。卡面与头像使用 Atlas Academy 的远程图片。

| 服务器 | 快照日期 | 从者记录 | 礼装目录 | 可参与牵绊优化的礼装 |
| --- | --- | ---: | ---: | ---: |
| 国服 | 2026-11-17 | 447 | 2,508 | 34 |
| 日服 | 2026-11-19 | 475 | 2,719 | 59 |

**维护者更新快照**时可执行以下命令。脚本使用 Python 3.9+ 标准库；日服导入会读取国服数据，为共有条目添加中文检索名。

```sh
python prepare_data.py --region CN
python prepare_data.py --region JP
```

每次导入会重写相应服务器的数据 JS 与头像 JSON。可用 `--cache-dir` 指向已有 Atlas 导出目录，例如国服文件名为 `CN-nice_servant_lore.json`、`CN-nice_equip.json`、`CN-NiceUserLevel.json`。缺少的文件会从 Atlas 下载。完成后核对变更并运行测试。

前端无必填环境变量或 API 密钥。入口支持 `?region=CN`、`?region=JP`；没有有效参数时读取上次选择，首次默认国服。编队和选择器偏好保存在当前站点的浏览器 `localStorage`。

## 部署

- **GitHub Pages**：在仓库 **Settings → Pages** 选择 **GitHub Actions**。推送到 `main` 或从 Actions 手动运行 **Publish FGO Bond Lab**，工作流执行 `node test.cjs`，通过后上传并部署 `dist/`。发布结果见 [Actions 记录](https://github.com/Donald123-gif/fgo-bond-lab/actions/workflows/pages.yml)。
- **ChatGPT Sites**：使用现有 Sites 项目的工作副本，其 `.openai/hosting.json` 标识站点，`static.directory` 为 `dist`。向该站点同步源文件后，通过 Sites 保存并部署同一份静态目录，核对部署状态。仓库中的 GitHub Actions 工作流只负责 GitHub Pages。
- **其他静态主机**：将 `dist/` 的完整内容按原有相对路径部署到同一站点目录，以 `index.html` 为入口。数据、头像索引和 Worker 脚本都需要能通过 HTTP(S) 访问。

数据源及具体规则参考见网页底部「计算口径与数据来源」。角色与礼装素材版权归 TYPE-MOON / FGO PROJECT。
