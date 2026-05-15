# agent-html-app Development Status

本文件记录 `agent-html-app` 的当前开发进度、主要缺口和下一步推进方向。

它不是 app blueprint，也不是用户使用文档。它只回答三件事：

- app 现在已经做到哪一层
- 哪些部分是真实现，哪些仍是占位
- 下一阶段应继续补什么

## Product Shape

`agent-html-app` 是围绕 `ahtml` session 的本地优先桌面工作台。

当前 v1 目标仍然是先打通：

```txt
Source
  -> Build
  -> Preview
  -> Inspect
```

右侧 `Agent Shell` 继续保留协作入口和状态模型，但不把真正的 agent/provider
集成作为 v1 前提。

## Current Status

### Overall status

Status: First pass usable.

当前 app 已经不是 blueprint-only 或纯 UI 草图。仓库内已经存在可构建的 React +
Tauri + Rust 实现，并且当前 `npm run app:check` 可通过。

### Workbench UI

Status: First pass.

已实现：

- 固定三栏工作台：`Sessions` / `Workbench` / `Agent Shell`
- 中栏固定视图：`Preview` / `Source` / `Inspect`
- 顶部基础运行状态与 runtime check 入口
- `Agent Shell` 消息列表、输入框和上下文卡片占位

当前缺口：

- 视觉和交互已形成基本工作台，但还不是发布级 polish
- `Agent Shell` 仍是壳，不是可用 agent 面板

### Session and file-backed state

Status: First pass.

已实现：

- 本地 session 列表、创建、打开、重命名、删除、pin/unpin
- `source.agent.html`、`chat.jsonl`、`build/`、`logs/` 等文件落盘
- session 当前视图、状态和最近 build 时间的基本持久化

当前缺口：

- 仍是 v1 文件目录模型，没有更高阶同步或数据库层
- 当前重点仍是稳定本地会话流，而不是扩展额外数据系统

### CLI orchestration and runtime bridge

Status: First pass.

已实现：

- 通过稳定 CLI 边界调用 `ahtml`
- `build`、`inspect`、`doctor` 的 Tauri command 桥接
- `stdout` / `stderr` / exit code / preview 入口的基本采集
- 前端状态和 Rust 返回结构之间的共享类型面

当前缺口：

- 现在已能编排核心命令，但错误恢复和更完整的操作体验仍可继续增强
- 仍需持续证明 app 对 CLI 输出变化的适配稳定性

### Source / Preview / Inspect loop

Status: Partial.

已实现：

- `Source` 侧轻量即时校验
- 显式 `Build` 后刷新正式 preview
- `Inspect` 展示诊断摘要和最近运行结果
- build 失败时可转向 inspect，而不是只停留在抽象错误提示

当前缺口：

- `Inspect` 还不是完整分析工作台，更多是 first-pass 诊断面
- source diagnostics、build diagnostics、structure summary 仍有继续做深的空间

### Agent Shell

Status: Placeholder only.

已实现：

- UI 面板和消息数据结构
- `chat.jsonl` 持久化占位
- 用户消息与 placeholder 回复的最小流程

当前缺口：

- 没有真正可用的 agent/provider 集成
- 没有 proposal、patch、diff compare、批准应用等工作流
- 当前价值主要是锁定布局、状态模型和未来插槽

## Verification Snapshot

当前可确认的本地验证信号：

- `npm run app:build` 可通过前端类型检查和 Vite 构建
- `cargo check --manifest-path apps/agent-html-app/src-tauri/Cargo.toml` 可通过
- 根脚本 `npm run app:check` 已覆盖以上两项

这说明 app 当前至少具备：

- 可构建的前端实现
- 可检查的 Tauri / Rust 后端实现
- 基本可维持的 monorepo 开发入口

## Main Gaps

当前最主要的缺口不是“有没有 app”，而是 app 还没有进入更完整的产品化阶段：

- `Agent Shell` 仍是 placeholder，agent 协作能力未接入
- `Inspect` 仍偏 first-pass 诊断面，不是完整审查工作台
- workbench 整体还在 v1 收口阶段，不是发布级桌面产品
- 需要继续验证 app 与 `ahtml` CLI 边界的长期稳定性

## Next Steps

当前建议继续按以下顺序推进：

1. 先继续收紧 `Source -> Build -> Preview -> Inspect` 主闭环的稳定性。
2. 把 `Inspect` 从基础诊断面扩到更有用的 artifact / schema / proposal review 面。
3. 在不破坏 source-of-truth discipline 的前提下，补第一轮真正的 agent proposal 流。
4. 继续增强 CLI failure、preview 缺失、runtime mismatch 这类失败场景的可解释性。
5. 最后再考虑更高耦合能力，例如 provider 集成、补丁应用流或更复杂的同步模型。

## Acceptance Snapshot

当以下条件同时成立时，可以认为 app 从当前 first-pass 状态进入更稳的 v1：

- `Source -> Build -> Preview -> Inspect` 主闭环稳定可用
- session 文件流和 build/inspect 日志流不再频繁返工
- `Agent Shell` 至少具备第一轮真实 proposal 能力，而不只是 placeholder
- app 对 `ahtml` CLI 的核心命令边界已有持续可维护的验证覆盖
