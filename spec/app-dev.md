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
- `Inspect` 现在也会把 source/build/proposal/log 信号压成一张 review audit，直接给出 current gate、proposal state、recovery path 和 key evidence
- `Inspect` review audit 现在也可直接触发 save / build / inspect / preview / proposal / diff review 等 workflow 动作，而不只是停在解释层
- `Inspect` 与右栏 compare 现在有共享的 review focus 状态，当前已聚焦的 compare 目标会回流到 `Inspect`，并支持一键 revisit 同一 review target
- shared review focus 现在也会保留精确的 diff group target，而不只是 compare 模式和标签
- `Inspect` 现在也可直接 clear / switch review focus target，不必回到右栏内部先解除再重选
- 当最新 proposal 带 checklist focus 线索时，`Inspect` 现在也会优先露出 checklist-derived review targets，而不是只回退到通用 drift 标签
- checklist-derived review targets 现在也会携带稳定 target identity 和行范围标签，便于跨面板保持同一审查对象
- `Inspect` 在当前 active review target 下也会直接展示小范围 focused diff preview，减少每次都必须切去右栏 compare 才能看见对象
- focused diff preview 现在也可直接跳到 `Source` 里的对应行范围，并在编辑器中选中该段 source
- 右栏 `Agent Shell` 的 draft compare 与 checklist diff 现在也可直接 `Open in Source`，不再只有 `Inspect` 能发起源码聚焦
- `Source focus` 现在也会保留来源 review target，并可直接反向 reveal 到右栏对应的 compare target
- `Source` 侧现在会在 focus banner 中显示来源 review target 的类型和范围，并提供 `Reveal review target` 回跳入口
- `Source` 侧现在也会反馈当前选中的 source focus 是否仍与来源 review target 对齐，并在 review segment 移位时提供 `Refresh focus`
- `Inspect` 里的 linked review 区现在也会回流当前 source focus 的 `Aligned / Moved / Missing` 状态，并可直接打开或刷新 source focus
- 右栏 `Agent Shell` 现在也会显示当前 source focus 的状态与回跳动作，三栏对同一 review target 已有基本一致的 drift 反馈
- `Agent Shell` 现在也把 source focus 状态压进 proposal 顶部摘要区，不再依赖单独的中继卡才能看见这条信号
- source focus drift 现在也会进入 `Proposal readiness` 的 warnings，避免顶部摘要与实际 review object 漂移状态脱节
- proposal snapshot 中的 `Source` chip 现在也会根据 `Aligned / Moved / Missing` 自动切换到打开源码、刷新焦点或回显 review target 的主动作，并避免在 readiness 列表里重复同一条 source-focus warning
- `Inspect` 的 diagnostics 列表现在也可在带行号时直接 `Open in Source`，把异常定位直接落到源码行段
- build 失败时可转向 inspect，而不是只停留在抽象错误提示

当前缺口：

- `Inspect` 还不是完整分析工作台，但已经不再只是原始日志堆叠或纯 diagnostics 面
- review audit 与右栏 compare 已有共享 focus / revisit / clear / switch 能力，但整体仍不是完整统一的 review control surface
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
- review timeline 会高亮当前最该看的阶段，而不只是平铺状态卡
- readiness / current stage 区现在承担主 CTA，timeline 更偏总览而不是重复按钮区
- readiness 区的主文案现在更偏阶段摘要，而不只是重复 blocked / needs review 标签
- proposal 区现在直接显示一条紧凑的 review path，而不只用单个 current stage 文案提示
- 紧凑的 review path 现在也可直接点击跳到对应阶段动作
- readiness 区会过滤掉与当前阶段完全重复的提示，只保留 secondary warnings
- proposal bullet 项已开始带 workflow checklist 状态，例如 save / build / inspect / review
- checklist 项现在也可直接触发对应动作，例如 save / build / inspect / review diff
- checklist 项已能展示上下文摘要，并在可用时附上首条相关 diff 片段
- checklist 项的 diff 上下文已扩到小范围 focused diff group，而不只是一条线索
- save / review 这类 checklist 项的 focused diff 已开始按连续变化段聚合，而不是纯逐行堆叠
- checklist 项现在也能把 compare 卡聚焦到自身对应的 diff group
- focused compare 现在会明确显示当前聚焦的是哪条 checklist 项
- compare 卡现在也支持在多个带 diff 的 checklist 项之间切换导航
- proposal 卡头部已开始汇总 checklist progress，例如 done / pending / review 的完成度
- proposal 入口区现在会直接露出 pending / review 数量，减少在 checklist 中来回数状态
- proposal 卡现在也支持记录 `Approve` / `Needs changes` 结论，并回写到右栏消息流
- latest proposal decision 也已接入 proposal 区摘要、timeline 和 stage guidance
- proposal 区现在可直接回看最近几次 decision 结论，而不只显示 latest decision
- recent proposal decisions 现在也会汇总成一个 compact trend，提示是在收敛还是反复
- proposal readiness 现在在满足条件时会直接进入 `Approved` 状态，而不只是 `Ready`
- decision history 现在默认保持紧凑，需要时再展开完整记录
- proposal 区已增加一行 one-glance review snapshot，汇总 stage / checklist / diagnostics / drift / preview
- one-glance proposal snapshot 现在也直接露出 recent decision trend
- one-glance proposal snapshot 中的 diagnostics / drift / preview 已可直接跳到对应动作
- `Approve` / `Needs changes` 已上移到 snapshot 行，减少 proposal 卡内重复入口

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
- `npm run test:run -- apps/agent-html-app/src/lib/inspect-review.test.ts` 可通过，覆盖 inspect audit / recovery path / evidence 提炼逻辑

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
2. 把 `Inspect` 从基础诊断面继续扩到更有用的 artifact / schema / proposal review 面，并补更直接的操作联动。
3. 在不破坏 source-of-truth discipline 的前提下，把当前本地 proposal 流扩到 proposal compare / patch review。
4. 继续增强 CLI failure、preview 缺失、runtime mismatch 这类失败场景的可解释性。
5. 最后再考虑更高耦合能力，例如 provider 集成、补丁应用流或更复杂的同步模型。

## Acceptance Snapshot

当以下条件同时成立时，可以认为 app 从当前 first-pass 状态进入更稳的 v1：

- `Source -> Build -> Preview -> Inspect` 主闭环稳定可用
- session 文件流和 build/inspect 日志流不再频繁返工
- `Agent Shell` 至少具备第一轮真实 proposal 能力，而不只是 placeholder
- app 对 `ahtml` CLI 的核心命令边界已有持续可维护的验证覆盖
