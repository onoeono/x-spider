# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概览

X-Spider：一个面向 Windows 的推特媒体（图片 / 视频 / GIF）批量下载桌面应用，界面为中文。技术栈：**Tauri v1 + React 18 + TypeScript + Vite 5 + pnpm**（包管理严格为 pnpm 9），UI 为 antd 5（zh_CN）+ Tailwind。README 注明已停止维护，开源版之外存在付费版。

后端 Rust 极简，负责「发网络请求（带代理）」和「读系统代理」两件事；**媒体下载本身不经过 Rust**，而是由前端通过 WebSocket JSON-RPC 指挥内置的 aria2c 侧车进程完成。

注意：`src/` 里没有测试套件，前端大量依赖推特未公开的 GraphQL 私有接口（脆弱、需维护端点 ID 与 features 参数）。

## 常用命令

```bash
pnpm start        # = tauri dev：启动完整桌面开发窗口（Vite 5173 端口 + Rust），开发主路径
pnpm dev          # 仅 Vite，不加载 Rust/侧车，Tauri API 不可用
pnpm build        # = tsc && vite build：纯前端构建（tauri 的 beforeBuildCommand）
pnpm tauri build  # 完整桌面打包 → NSIS 安装包，externalBin 打包 aria2c 侧车
pnpm typeCheck    # tsc --noEmit
pnpm lint         # prettier --write + eslint --fix ./src（eslint 禁 console，见 .eslintrc）
pnpm precommit    # lint-staged + typeCheck（husky pre-commit 钩子）
pnpm build:icons  # 从 src-tauri/icons/icon.png 重新生成各尺寸图标
```

无 lint/prettier 之外的单测或集成测试。提交遵循 conventional commits（commitlint + husky + lint-staged）。

前置条件：Rust 工具链、Node 20+、pnpm 9。aria2c 侧车二进制已提交在 `src-tauri/binaries/aria2c-x86_64-pc-windows-msvc.exe`（tauri 按 target triple 后缀查找，勿随意改文件名）。

## 架构要点

整条数据流是：**React 页面 → zustand store → 推特 API（经 Rust IPC 请求）→ 解析媒体 → aria2 JSON-RPC 下载 → 状态回写 store → UI**。

### Rust 后端（`src-tauri/`，小而稳定）
- `src/main.rs` 仅注册两个 command，都定义在 `src/network.rs`：`network_fetch`（reqwest，按 `enable_proxy`/`proxy_url` 决定走系统代理、自定义代理或直连，`response_type` 支持 json/text/binary）和 `network_get_system_proxy_url`（读 Windows 注册表 Internet Settings 得到系统代理，返回 `{http, https}`）。
- 请求之所以走 Rust 而非浏览器 fetch，是为了绕开 WebView CORS 并复用代理。`Cargo.toml` 无 fork 依赖（曾有过 reqwest fork，已替换掉，见提交 342b9ff）。
- `tauri.conf.json` 的 shell allowlist 放行了 `binaries/aria2c` 侧车与 `explorer`；`custom-protocol` feature 与 `windows_subsystem` 注释声明不可删。版本号统一取自 `package.json`（`tauri.conf.json` 的 `package.version` 与 vite `define` 均引用它）。

### 前端分层
- **IPC 层** `src/ipc/network.ts`：`request()` 是全局唯一 HTTP 入口。它把 `settings.proxy` 拍平成参数调用 `network_fetch`，并自带指数退避重试（最多 16 次）；`getSystemProxy()` 调读注册表的 command。
- **推特数据层** `src/twitter/api.ts`：调用 `x.com` 首页（解析 HTML 取账号名/头像）与 GraphQL 私有端点 `UserByScreenName`、`UserMedia`、`UserTweets`（URL 里的 base64 型端点 ID 和超大 `features` JSON 是推特前端硬编码的，推特改版时需同步更新）。解析大量用 **Ramda point-free 管道** 抽取 timeline instructions / entries / cursor（`R.pipe`/`R.path`/`R.cond`），把原始载荷映射为 `TwitterPost`/`TwitterMedia`。鉴权用硬编码 guest Bearer token + 用户在 `app-state.cookieString` 里的 Cookie（须带 `ct0`，取自 Cookie）。`twitter/utils.ts` 把各媒体解析成最终可下载 URL：图片加 `?name=orig`、视频选最高码率 mp4、GIF 取 mp4。
- **下载引擎** `src/utils/aria2.ts`：导出单例 `aria2`。`bootstrap()` 用 `Command.sidecar('binaries/aria2c')` 以 **随机 RPC 端口（6800–6800+1000）+ 随机 `--rpc-secret`** 拉起进程（随机端口是为了多实例不冲突，勿改回固定端口），等 stdout 出现监听日志后连本地 `ws://127.0.0.1:PORT/jsonrpc`。用 `aria2.addUri` + `{dir, out}` 发起任务、`aria2.tellStatus` 查状态、`system.multicall` 批量；通过 `onDownloadStart/Pause/Stop/Complete/Error` 事件回推状态。实现用大量私有字段（`#`）。
- **文件名模板**：`constants/file-name-template.ts` 定义 `REPLACER_MAP`（`%POST_ID%`、`%USER_SCREEN_NAME%`、`%MEDIA_INDEX%` 等，可带 `,key=value` 参数），`utils/file-name-template.ts` 的 `resolveVariables()` 渲染；另走 `unicode.ts` 做安全化。示例数据（EXAMPLE_USER 等）用于设置页预览，改动字段时要同步。

### zustand store 与调度（核心逻辑）
- **`stores/settings.ts`**：整棵 `Settings`（`proxy`/`download`/`app`）persist 到 appDataDir 的 JSON，带 `CURRENT_SETTINGS_VERSION=2` 与 migrate（v1→v2 删 `download.savePath`）。读取 store 时用 `useSettingsStore.getState()` 而非 hook。
- **`stores/app-state.ts`**：Cookie 串、搜索历史、更新信息、系统代理 URL，同样持久化。
- **`stores/persist/tauri-file-storage.ts`**：为 zustand `persist` 自定义的存储适配器，把 state 写为 appDataDir 下 `<name>.json`（settings.json / app-state.json）。
- **`stores/download.ts`（最重的模块）**：`downloadTasks`（DownloadTask，携带 gid/post/media/路径/进度/`ariaRetryCountRemains`）+ `creationTasks`（「爬虫任务」：某个用户按 `DownloadFilter`——日期范围 + 媒体类型 + medias/tweets 来源——翻页拉取并批量建下载）。注意：文件底部有**两个模块级自调度循环**，`import` 该 store 即开始跑：`scheduleCreationTasks()`（同一时刻只跑一个 creation task，用 `requestIdleCallback` 自续）与 `scheduleAutoSyncTasks()`（每 500ms `aria2.tellStatus` 批量回写所有 autoSync gid）。`runCreationTask` 按 cursor 翻页直到越过 `since` 日期，遇 aria2 error 会自动用剩余重试次数重建任务，`sameFileSkip` 时跳过已存在文件。
- **`stores/homepage.ts`**：主页按用户名搜索（`loadUser`）+ 无限滚动媒体列表（`getUserMedias` 翻页），各自带 AbortController 防竞态。
- **后台任务**（`hooks/useRunBackgroundTasks.ts`，由 App 顶层执行）：系统代理轮询（每 1s，写回 app-state）、aria 事件与 store 绑定（`useAriaBinding`，同时把 `useResolvedProxyUrl()` 的代理结果 `aria2.updateProxy()`）、任务完成通知、自动检查更新。代理解析链在 `hooks/useResolvedProxyUrl.ts`：`!proxy.enable→''`，`useSystem→轮询到的系统代理`，否则用 `proxy.url`。

### 全局约定
- 全局类型与值（无 import 直接用）声明在 `src/vite-env.d.ts`：`log` / `window.log`（分类日志，见 `utils/log.ts`，`app.writeLogs` 开启时写文件）、`PACKAGE_JSON_VERSION`、`PACKAGE_JSON_LICENSE`（由 vite `define` 注入）。
- 跨平台：仅核心下载路径为 Windows（README 标注 Windows）；`utils/cross-platform.ts` 的 `createCrossPlatformInvoker` 提供按 OS 分派 + `UnavailableInCurrentOsError` 的模式。
- 代码内注释与 UI 文案均为中文；搜索/调试关键词常见为 `log.` 分类日志（ARIA / NET / DL / APP）。

### 改这块代码前必读
1. 动下载链路前先通读 `stores/download.ts` + `utils/aria2.ts` 里两处自调度循环与事件绑定关系，避免破坏状态同步时序。
2. 推特相关改动需回归端点 ID / features / cursor 解析——它们极度耦合推特前端实现，属于最脆弱的区域。
3. `homepage/`（GitHub Pages 落地页）是独立 pnpm 项目，与 `src/` 应用本体无关。
