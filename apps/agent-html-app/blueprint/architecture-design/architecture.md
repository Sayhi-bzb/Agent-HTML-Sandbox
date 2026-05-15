# agent-html-app Architecture

## Product Shape

`agent-html-app` 采用固定三栏工作台：

- 左栏 `Sessions`
- 中栏 `Workbench`
- 右栏 `Agent Shell`

中栏不是纯预览面，而是当前 session 的主工作区，包含 3 个固定视图：`Preview`、`Source`、`Inspect`。

## UX Intent

视觉取向：Notion 式阅读感。

交互取向：Zed 式效率感。

落地要求：

- 默认阅读友好，不压迫。
- 所有核心动作都可见、可追踪、可中断。
- 出错后优先把用户带回 source 或 inspect，而不是停留在抽象提示。

## Workbench Layout

### Left: Sessions

负责 session 浏览与切换。

最少能力：

- 列表展示 session 标题、最近修改时间、状态徽标。
- 搜索 session。
- pin / unpin。
- 创建新 session。
- 切换当前 session。

状态枚举至少包含：`draft`、`dirty`、`building`、`error`、`ready`。

### Center: Workbench

负责当前 session 的核心工作。

#### Preview

- 展示最近一次成功 build 的 artifact。
- 当本次 build 失败时，继续显示上一次成功结果。
- 明确标注 preview 对应的 build 时间和 build 状态。

#### Source

- 使用结构化代码编辑器编辑 `source.agent.html`。
- 提供轻量即时校验。
- 支持从 diagnostics 快速定位到 source 位置。

#### Inspect

- 展示 diagnostics。
- 展示结构/节点信息。
- 展示最近 build 的 stdout、stderr、exit code 和关键元信息。
- 为未来 schema 视图和 proposal 对比预留面板位。

### Right: Agent Shell

v1 只做壳，不接模型功能。

保留以下 UI 面：

- 消息列表占位。
- 输入框占位。
- 当前 session 上下文卡片。
- 建议区占位。

该面板的存在是为了锁定未来布局和状态模型，而不是提前引入 AI 集成复杂度。

## System Boundaries

### Rust / Tauri Responsibilities

Rust 负责：

- 窗口与桌面壳。
- session 根目录管理。
- 本地文件系统读写。
- build / inspect 任务编排。
- 调用 `ahtml` CLI。
- 日志采集、错误码归一化、任务状态回传。

### TSX / React Responsibilities

前端负责：

- 三栏工作台 UI。
- session 列表与当前 session 状态展示。
- `Source` 编辑器。
- `Preview` 容器。
- `Inspect` 视图。
- `Agent Shell` 壳层。
- 命令面板、状态栏、通知等交互层。

## Data Flow

```txt
source.agent.html
  -> light validation in Source
  -> explicit Build action
  -> tauri command
  -> ahtml CLI
  -> build output + logs + diagnostics
  -> Preview / Inspect refresh
```

约束如下：

- source 改动先落文件，再更新内存态。
- 正式 preview 只能从最近一次成功 build 目录读取。
- inspect 可以同时消费 source 侧轻量诊断和 build 侧运行结果。

## Session Lifecycle

```txt
create session
  -> write session directory skeleton
  -> open Source or Preview
  -> edit source
  -> mark dirty
  -> build
  -> ready or error
```

每个 session 都是独立目录，可单独备份、迁移和恢复。

## Preview Update Policy

采用混合模式：

- 编辑时做轻量即时校验。
- 用户显式触发 `Build` 后更新正式 preview。
- 自动轻量校验不冒充 build 成功。

这样可以避免每次按键都跑完整 build，同时让用户始终知道当前 preview 是否新鲜。

## Error Model

错误按层分为：

- `ui-validation`: 前端轻量校验问题。
- `session-io`: session 文件读写问题。
- `cli-launch`: CLI 无法启动或不可用。
- `build-failed`: build 退出码非零。
- `inspect-failed`: inspect 命令失败。
- `preview-missing`: 没有可展示的成功 build 结果。

错误展示原则：

- 左栏显示 session 状态。
- 中栏 `Inspect` 展示详细错误与日志。
- 状态栏显示当前任务结果。
- 不用聊天式 toast 掩盖真实失败原因。

## v1 Non-goals

v1 明确不做：

- 真正可用的 agent provider 集成。
- Notion 式块编辑器。
- SQLite 或同步数据库。
- Web 端和桌面端同步首发。
- 直接依赖 `agent-html` 源码内部模块。
