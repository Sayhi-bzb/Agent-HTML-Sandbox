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

右侧 `Agent Shell` 保留协作入口和 review / proposal 状态模型，但不把真正的
agent/provider 集成作为 v1 前提。

## Current Status

### Overall status

Status: First pass usable.

仓库内已经存在可构建的 React + Tauri + Rust 实现；当前 app 已不是 blueprint-only
或纯 UI 草图。

### Workbench UI

Status: First pass usable.

当前已具备：

- 固定三栏工作台：`Sessions` / `Workbench` / `Agent Shell`
- 中栏固定视图：`Preview` / `Source` / `Inspect`
- 顶部基础运行状态与 runtime health 入口
- `Source` / `Inspect` / `Agent Shell` 之间共享的 review focus / source focus /
  diagnostics / proposal 状态面

当前主要缺口：

- 视觉和交互已成型，但还不是发布级 polish
- 顶层布局和页面级样式仍有继续收口空间

### Session and file-backed state

Status: First pass.

当前已具备：

- 本地 session 列表、创建、打开、重命名、删除、pin/unpin
- `source.agent.html`、`chat.jsonl`、`build/`、`logs/` 等文件落盘
- session 当前视图、状态和最近 build 时间的基本持久化

当前主要缺口：

- 仍是 v1 文件目录模型，没有更高阶同步或数据库层
- 重点仍是稳定本地会话流，而不是扩展额外数据系统

### CLI orchestration and runtime bridge

Status: First pass.

当前已具备：

- 通过稳定 CLI 边界调用 `ahtml`
- `build`、`inspect`、`doctor` 的 Tauri command 桥接
- `stdout` / `stderr` / exit code / preview 入口的基本采集
- 前端状态和 Rust 返回结构之间的共享类型面
- Rust 基础设施层已经开始用成熟 crate 收口：当前已接入
  `thiserror`、`fs-err`、`tracing`、`tracing-subscriber`、`camino`、`time`

当前主要缺口：

- 命令编排已能工作，但错误恢复和操作体验仍可继续增强
- `src-tauri` 仍偏单文件实现，后续适合继续模块化
- 仍需持续证明 app 对 CLI 输出变化的适配稳定性

### Source / Preview / Inspect loop

Status: Partial but real.

当前已具备：

- `Source` 侧轻量即时校验
- 显式 `Build` 后刷新正式 preview
- `Inspect` 展示诊断摘要、artifact/build 状态、review focus 和最近运行结果
- source focus / review focus / diagnostics / proposal drift 已形成可用的跨面板 review surface
- `Source` 编辑器已切到 `CodeMirror 6`

当前主要缺口：

- `Inspect` 还不是完整分析工作台
- structure summary、artifact review、日志解释仍偏 first-pass
- source / build / inspect 失败场景还有继续做深的空间

### Agent Shell

Status: First local proposal pass.

当前已具备：

- `chat.jsonl` 持久化和 session-backed 消息流
- 基于当前 source/build/preview/log 状态生成 proposal 卡片
- 右栏 compare / readiness / review timeline / decision capture
- proposal / drift / diagnostics / source focus 等状态已压成可操作的 review surface

当前主要缺口：

- 没有真正可用的 agent/provider 集成
- 还没有 patch、diff apply、批准应用等后续工作流
- 当前 proposal 仍是 deterministic 的本地建议，不是更完整的协作系统

## Development Defaults

`agent-html-app` 后续开发默认优先使用成熟外部库，不再继续扩展 ad hoc
基础设施。

前端默认方向：

- UI primitives 优先使用 `shadcn/ui + Radix`
- app 内部继续通过 `components/ui/*` 和 app-local wrappers 暴露基础件
- 状态 badge、卡片壳层、面板壳层优先复用 `StatusBadge`、`SurfaceCard`、
  `PanelShell`
- 编辑器默认使用 `CodeMirror 6`

Rust / Tauri 默认方向：

- 错误层优先复用 `thiserror`
- 文件系统层优先复用 `fs-err`
- 观测层优先复用 `tracing` / `tracing-subscriber`
- 路径层优先复用 `camino`

只有在以下情况才继续手写：

- 需求本身是 app 特有的 workflow / domain logic
- 现有库层无法清晰表达该行为
- 为接入新库带来的复杂度明显高于当前问题本身

## Verification Snapshot

当前可确认的本地验证信号：

- `npx tsc --noEmit -p apps/agent-html-app/tsconfig.json` 可通过
- `npm --workspace agent-html-app run build` 可通过前端类型检查和 Vite 构建
- `cargo check --manifest-path apps/agent-html-app/src-tauri/Cargo.toml` 可通过
- `cargo test --manifest-path apps/agent-html-app/src-tauri/Cargo.toml` 可通过
- `npm run app:check` 可通过，覆盖 app 前端 build 与 Tauri/Rust check
- `npm run test:run -- apps/agent-html-app/src/lib/source-comparison.test.ts`
  可通过
- `npm run test:run -- apps/agent-html-app/src/lib/review-flow.test.ts`
  可通过
- `npm run test:run -- apps/agent-html-app/src/lib/inspect-review.test.ts`
  可通过

这说明 app 当前至少具备：

- 可构建的前端实现
- 可检查的 Tauri / Rust 后端实现
- 基本可维持的 monorepo 开发入口

## Main Gaps

当前最主要的缺口不是“有没有 app”，而是 app 还没有进入更完整的产品化阶段：

- `Agent Shell` 已有第一轮 proposal 能力，但离真正协作流还很远
- `Inspect` 仍偏 first-pass 诊断面，不是完整审查工作台
- workbench 整体还在 v1 收口阶段，不是发布级桌面产品
- Rust/Tauri 侧虽然已开始用成熟 crate 收口基础设施，但模块边界仍可继续整理
- 需要继续验证 app 与 `ahtml` CLI 边界的长期稳定性

## Next Steps

当前建议继续按以下顺序推进：

1. 继续收紧 `Source -> Build -> Preview -> Inspect` 主闭环的稳定性。
2. 把 `Inspect` 从基础诊断面继续扩到更有用的 artifact / schema / proposal review 面，并补更直接的操作联动。
3. 在不破坏 source-of-truth discipline 的前提下，把当前本地 proposal 流扩到 proposal compare / patch review。
4. 继续增强 CLI failure、preview 缺失、runtime mismatch 这类失败场景的可解释性。
5. 继续减少剩余的单文件实现和页面级手搓壳层，但前提仍是优先复用已有成熟库和 app-local wrapper。

## Acceptance Snapshot

当以下条件同时成立时，可以认为 app 从当前 first-pass 状态进入更稳的 v1：

- `Source -> Build -> Preview -> Inspect` 主闭环稳定可用
- session 文件流和 build/inspect 日志流不再频繁返工
- `Agent Shell` 至少具备第一轮真实 proposal 能力，而不只是 placeholder
- app 对 `ahtml` CLI 的核心命令边界已有持续可维护的验证覆盖
- 新的 UI / Tauri 基础设施默认优先走成熟库，而不是重新扩展手搓 primitives
