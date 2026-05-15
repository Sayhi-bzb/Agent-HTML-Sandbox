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
- `Agent Shell` 消息列表、输入框、上下文卡片和 proposal 入口

当前缺口：

- 视觉和交互已形成基本工作台，但还不是发布级 polish
- `Agent Shell` 仍不是 provider 面板，proposal 仍是本地 first-pass 流

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
- `Inspect` 展示诊断摘要、artifact/build 状态、review focus 和最近运行结果
- build 失败时可转向 inspect，而不是只停留在抽象错误提示

当前缺口：

- `Inspect` 还不是完整分析工作台，但已经不再只是原始日志堆叠
- source diagnostics、build diagnostics、structure summary 仍有继续做深的空间

### Agent Shell

Status: First local proposal pass.

已实现：

- UI 面板和消息数据结构
- `chat.jsonl` 持久化
- 用户消息可作为 session 笔记持久化
- 可基于当前 source/build/preview/log 状态生成 session-backed proposal 卡片
- build / inspect 结果会以 context card 形式回写到右栏消息流，便于回看最近事件
- source 保存结果也会以 context card 形式回写到右栏消息流
- 右栏可对未保存 draft 给出轻量 compare 摘要，并可直接触发保存
- compare 摘要已能展示前几处 changed lines 的 before/after 片段，开始接近轻量 patch preview
- changed-line preview 现已支持展开查看更多差异片段，但仍不是完整 patch apply 流
- proposal 卡片上方已能汇总 readiness / blockers，帮助判断是否先保存、inspect 或 build
- readiness 区已给出对应 next action，能直接跳到 save / inspect / build / preview / redraft proposal
- 最新 proposal 卡片已能感知当前 unsaved draft 的变化量，并可直接跳到 draft diff review
- proposal 现在会携带生成时的 source snapshot，因此 compare 不再只依赖当前已保存 source
- compare 现已支持在 `Saved source` 与 `Proposal snapshot` 两个基线之间切换
- 右栏已新增 review timeline，把 source saved / build / inspect / proposal 四步压成高信号总览
- review timeline 各阶段现在也可直接触发对应动作，例如 save / build / open inspect / draft proposal / review diff
- proposal bullet 项已开始带 workflow checklist 状态，例如 save / build / inspect / review
- checklist 项现在也可直接触发对应动作，例如 save / build / inspect / review diff
- checklist 项已能展示上下文摘要，并在可用时附上首条相关 diff 片段
- checklist 项的 diff 上下文已扩到小范围 focused diff group，而不只是一条线索
- save / review 这类 checklist 项的 focused diff 已开始按连续变化段聚合，而不是纯逐行堆叠
- checklist 项现在也能把 compare 卡聚焦到自身对应的 diff group
- focused compare 现在会明确显示当前聚焦的是哪条 checklist 项
- compare 卡现在也支持在多个带 diff 的 checklist 项之间切换导航
- proposal 卡头部已开始汇总 checklist progress，例如 done / pending / review 的完成度

当前缺口：

- 没有真正可用的 agent/provider 集成
- 还没有 patch、diff compare、批准应用等后续工作流
- 当前 proposal 仍是 deterministic 的本地建议，不是更完整的协作系统
- 还没有 proposal item 与具体 source-range 的精确绑定，也还没有真正的 patch apply / approve 流

## Verification Snapshot

当前可确认的本地验证信号：

- `npx tsc --noEmit -p apps/agent-html-app/tsconfig.json` 可通过
- `npm --workspace agent-html-app run build` 可通过前端类型检查和 Vite 构建
- `cargo check --manifest-path apps/agent-html-app/src-tauri/Cargo.toml` 可通过
- `cargo test --manifest-path apps/agent-html-app/src-tauri/Cargo.toml` 可通过，覆盖当前 Rust helper 单测
- `npm run app:check` 可通过，覆盖 app 前端 build 与 Tauri/Rust check
- `npm run test:run -- apps/agent-html-app/src/lib/source-comparison.test.ts` 可通过，覆盖 proposal snapshot compare 的核心纯逻辑
- `npm run test:run -- apps/agent-html-app/src/lib/review-flow.test.ts` 可通过，覆盖 review timeline / readiness 的核心纯逻辑

这说明 app 当前至少具备：

- 可构建的前端实现
- 可检查的 Tauri / Rust 后端实现
- 基本可维持的 monorepo 开发入口

## Main Gaps

当前最主要的缺口不是“有没有 app”，而是 app 还没有进入更完整的产品化阶段：

- `Agent Shell` 已有第一轮 proposal 能力，但离真正协作流还很远
- `Inspect` 仍偏 first-pass 诊断面，不是完整审查工作台
- workbench 整体还在 v1 收口阶段，不是发布级桌面产品
- 需要继续验证 app 与 `ahtml` CLI 边界的长期稳定性

## Next Steps

当前建议继续按以下顺序推进：

1. 先继续收紧 `Source -> Build -> Preview -> Inspect` 主闭环的稳定性。
2. 把 `Inspect` 从基础诊断面扩到更有用的 artifact / schema / proposal review 面。
3. 在不破坏 source-of-truth discipline 的前提下，把当前本地 proposal 流扩到 proposal compare / patch review。
4. 继续增强 CLI failure、preview 缺失、runtime mismatch 这类失败场景的可解释性。
5. 最后再考虑更高耦合能力，例如 provider 集成、补丁应用流或更复杂的同步模型。

## Acceptance Snapshot

当以下条件同时成立时，可以认为 app 从当前 first-pass 状态进入更稳的 v1：

- `Source -> Build -> Preview -> Inspect` 主闭环稳定可用
- session 文件流和 build/inspect 日志流不再频繁返工
- `Agent Shell` 至少具备第一轮真实 proposal 能力，而不只是 placeholder
- app 对 `ahtml` CLI 的核心命令边界已有持续可维护的验证覆盖
