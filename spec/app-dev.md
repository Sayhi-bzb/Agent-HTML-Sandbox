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
- `agent-html-app` 现在已有 app-local `shadcn/Radix` 基础设施，包括
  `components.json`、`@/*` alias、tailwind v4 接入，以及首批
  `Button / Badge / Tabs / ScrollArea / Input / Alert / Card` primitives

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
- `src-tauri` 现在已开始用成熟 Rust crates 收紧基础设施层：当前已接入
  `thiserror`、`fs-err`、`tracing`、`tracing-subscriber` 和 `camino`，把大量
  手写 `AppError` / `std::fs` / `PathBuf + display().to_string()` 样板收进内部错误层、
  文件系统层、结构化观测层和 UTF-8 路径层

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
- `Inspect` summary 与右栏 `Diagnostics` chip 现在也会共用同一套 diagnostics 主动作语义，在可定位时直接 `Focus first issue`
- `Inspect` summary 与右栏 `Diagnostics` chip 现在也共用同一套 inspect-diagnostics view model，不再分别拼装 headline / count / main issue / 主动作
- 右栏 `Agent Shell` 现在也会在 diagnostics 非空时展示一块详细 diagnostics panel，而不只剩顶部 chip 入口
- `Inspect` summary 与右栏 diagnostics panel 现在也会列出前几条 diagnostics 并支持逐条 `Open in Source`，不再只停在单条 primary issue
- 右栏 `Agent Shell` 的 `Source validation / Source focus / Diagnostics` 三类顶部 review 入口现在也共用同一套 entry view model，不再各自拼 chip 与 detail panel
- proposal snapshot 里的 `Drift / Preview` 入口现在也收口到同一套 shared entry model；需要解释时会直接露出对应 detail panel，而不再分别手拼 chip 动作和状态文案
- proposal snapshot 顶部的 `Stage / Trend / Checklist` 现在也开始收口到同一套 shared entry model；其中 `Stage` 已能直接复用 readiness 的主动作，`Checklist` 也有了自己的状态 panel，而不再只是三枚内联静态 chip
- 最新 proposal 的 `Decision` 状态、最近几次 decision history，以及 `Approve / Needs changes` 动作现在也通过 shared entry panel 暴露，不再依赖顶部内联 history 区和独立按钮
- `Proposal readiness` 区里的 review path stage actions 和当前主 CTA 现在也走 shared readiness view，而不再在 JSX 里重复现算 workflow action
- proposal message card 里的 stale note、proposal compare 摘要、checklist status/context/focus/action 现在也走 shared proposal view model，不再在 `AgentShellMessageCard` 内联现算
- `Source focus` 现在也会显式标记 provenance，例如来自 proposal review target、saved compare 或 inspect diagnostic，三栏对源码焦点来源的解释更一致
- source focus provenance 现在优先依赖稳定的 `originKind` 协议，而不是散落在 UI 里的自由文本标签
- source focus provenance 现在也会显式区分 `checklist target` 与 `compare diff` 两类 review 来源实例，而不只是粗粒度的 review/compare 文案
- `Source` 侧的来源回跳现在也可覆盖 generic compare diff provenance，不再只在有 checklist target 时才露回跳入口
- generic compare diff provenance 现在也会被统一解析成稳定的 reveal target，三栏对 source origin 的回跳语义更一致
- `Source` / `Inspect` / `Agent Shell` 现在也共用同一套 source-focus provenance summary helper，不再各自拼接来源解释文案
- `Source` / `Inspect` / `Agent Shell` 现在也共用同一套 source-focus view model，不再各自拼接 selection / origin / summary / status 片段
- `Source` / `Inspect` / `Agent Shell` 现在也共用同一套 source-focus action model，不再各自分支判断 open / reveal / refresh 的显示条件
- 右栏 `Agent Shell` 的 source-focus 详细面板现在也完全复用 shared action model，不再重复拼主动作与次动作按钮
- 三栏现在也会展示统一的 provenance reference（如 `Ref review-0 · 5:7`），便于区分文案相近但来源实例不同的 source focus
- `inspect diagnostic` 来源的 source focus 现在也会参与 `Aligned / Moved / Missing` 状态计算，并在诊断行移动时支持 `Refresh focus`
- `source validation diagnostic` 现在也进入同一条 source focus provenance/state 流，并支持直接 `Open in Source` 与对齐状态判断
- `source validation` 现在也会提升到 `current stage / review timeline / proposal readiness / inspect summary` 这层，而不再只停留在 `Source` 局部
- 右栏 `Agent Shell` 现在也会把 `source validation` 作为顶层 review 输入展示，并支持直接打开源码或聚焦首个 validation issue
- 顶部 `Validation` chip 现在也会在 validation invalid 时直接聚焦首个 validation issue，而不只是机械地打开源码页
- `Inspect` 里的 source validation summary 现在也会复用同一套主动作语义，在 invalid 时直接聚焦首个 validation issue
- `Source` 面板自己的 validation 卡现在也会在 invalid 时直接露出 `Focus first issue`，不必先滚到具体诊断项再定位源码
- source validation 现在由 `App` 统一维护为 workbench 级状态，而不是只在 `SourcePanel` 挂载时才更新
- `Source` / `Inspect` / `Agent Shell` 现在也共用同一套 source-validation headline / summary / pill helper，不再各自分支解释状态
- `Source` / `Inspect` / `Agent Shell` 现在也共用同一套 source-validation view model，不再各自拼接主要诊断项与主动作
- `Inspect` 与右栏 `Agent Shell` 的 source validation 现在也会列出前几条 issue，并支持逐条 `Open in Source`，不再只停在“首个问题”级别
- source validation 现在会在 draft 变动后立即切到 `Validating`，而不是在 debounce 窗口里继续显示旧状态
- `Source` 面板现在已把原生 `textarea` 替换为 `CodeMirror 6` editor adapter，并通过 `SourcePanel` chunk 按需加载，继续复用现有 source focus / diagnostic jump 协议
- `Workbench` 顶部 view switch、`Source` 面板主要操作按钮、`Sessions` 列表滚动容器，以及 `Agent Shell` 消息流滚动容器现在已开始消费 app-local `shadcn/Radix` primitives
- `Inspect` 面板的主 CTA、review focus 操作、summary actions 和大部分状态 badge 现在也已开始消费 app-local `shadcn/Radix` primitives，而不再只依赖 `primary-button / mini-button / pill`
- `Agent Shell` 的 draft compare、proposal snapshot / readiness、proposal message card footer，以及 composer 输入框现在也已开始消费 app-local `shadcn/Radix` primitives，而不再只依赖 `primary-button / mini-button / pill / textarea`
- `Agent Shell` 里 `Saved source / Proposal snapshot` compare mode 和 checklist-derived compare focus 现在也已切到 `ToggleGroup`，不再继续手搓 active-button 单选项集
- `Inspect` 里的 review target 选择现在也已切到 `ToggleGroup`，不再继续手搓 active-button 单选项集
- `Sessions` 侧的搜索输入与状态 badge、`Preview` 面板的 artifact alert / artifact card / status badge 现在也已开始消费 app-local `shadcn/Radix` primitives
- `Sessions` 侧的 rename / delete 交互现在也已切到 app-local `Dialog / AlertDialog`，不再依赖浏览器原生 `window.prompt / window.confirm`
- `Source / Preview` 的主 workbench 卡，以及 `Agent Shell` 的 session context / review timeline / draft compare / proposal 这几块大容器现在也已开始通过 `SurfaceCard` 落到 `Card` 体系，而不再全部直接手拼 `context-card / workbench-card`
- `Sessions` 列表里的 `session-card` 与 `Agent Shell` 消息流里的 `message-card` 现在也已开始通过 `SurfaceCard` 落到 `Card` 体系，而不再只靠原生 `article/div + className` 壳层
- `SessionsSidebar / Workbench / Agent Shell` 三栏最外层现在也已通过 `PanelShell` 落到 `Card` 体系，而不再直接依赖原生 `aside/main + className=\"panel\"`
- `SessionsSidebar / Workbench / Agent Shell` 的 header 现在也已通过 `PanelShellHeader` 落到 `CardHeader` 体系，而不再继续手拼 `div.panel-header`
- `Source` 里的 validation/source-focus 区，以及 `Inspect` 里的 summary/audit/source-focus 状态卡现在也已继续通过 `SurfaceCard` 落到 `Card` 体系，而不再主要依赖手拼 `validation-card / inspect-summary-card / inspect-audit-block`
- `primary-button / ghost-button / mini-button / danger-button / pill / status-*` 这一批旧样式类现在已基本退出主路径，新的交互和状态展示默认改走 `Button / StatusBadge / ToggleGroup / SurfaceCard / PanelShell`
- app 顶层的 `topbar / runtime-banner / error-banner` 现在也已开始通过 `SurfaceCard` 与 `Alert` 落到库侧壳层，而不再只依赖手拼 banner 容器
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

## Library Migration Plan

当前 app 的主要“手搓债务”不在 review/workflow 业务模型本身，而在它们依赖的
UI primitives、编辑器壳层和样式基础设施。

迁移原则：

- 保留现有业务协议与纯逻辑模型，例如 `review-flow`、`source-focus`、
  `inspect-review`、`agent-shell-review-entry-view`、`proposal-message-view`
  等；它们继续表达 app 自己的 review / drift / focus 语义。
- 不再继续扩展 `textarea + styles.css + ad hoc button/panel classes`
  这条基础设施路线。
- 迁移目标是“把基础件标准化”，不是把 app 重写成另一套产品结构。

### Locked Decisions

- UI primitives 统一到 `shadcn/ui + Radix`，作为 app 内部的标准基础件层。
- `Source` 面板编辑器统一到 `CodeMirror 6`，不继续增强原生 `textarea`。
- `agent-html-app` 自身补齐需要的前端依赖与 app-local 组件目录，不再只依赖
  root workspace 已安装但未实际接入的 UI 相关库。
- 本轮不引入 `XState`、`Zustand`、`react-hook-form`、Monaco 或 provider
  集成；状态机、表单框架和富编辑器都不作为这次迁移前提。

### Migration Scope

本计划只迁移基础视图层与编辑器壳层：

- `Button` / `Card` / `Badge` / `Tabs` / `Separator` / `ScrollArea` /
  `Textarea` 等基础 UI primitives
- `Source` 面板的编辑器实现
- `Workbench`、`Inspect`、`Agent Shell`、`SessionsSidebar` 对这些 primitives
  的消费方式

本计划明确不迁移：

- `review-flow`、`source-focus`、`review-focus`、`inspect-review`、
  `proposal-message-view` 这些业务逻辑到第三方状态库
- patch apply / approve apply / provider 集成
- `spec/components-adoption.md` 中 artifact contract 的组件暴露决策

### Phased Rollout

1. UI foundation
   在 `apps/agent-html-app` 内建立 app-local `components/ui/*` 基础层，
   标准化 `Button`、`Card`、`Badge`、`Tabs`、`Separator`、`ScrollArea`、
   `Textarea`。`styles.css` 后续只保留 app layout、页面级结构和无法落入
   组件 token 的样式，不再继续承载 primitives 定义。

2. Source editor
   用 `CodeMirror 6` 替换 `SourcePanel` 的原生 `textarea`，新增 app-local
   editor adapter（例如 `SourceEditor`）。现有 source focus、diagnostic jump、
   selection refresh、save 前后草稿同步行为必须保持等价。

3. Workbench shell
   先迁移 `SessionsSidebar`、`Workbench` 顶部 view switch、通用 header
   actions 和 status pills，收掉 `.primary-button`、`.mini-button`、`.panel`
   这一类“样式即组件”的基础件债务。

4. Inspect and Agent Shell surfaces
   再迁移 `InspectPanel` 与 `Agent Shell` 的 snapshot entries、detail panels、
   readiness cards 和 proposal message card。继续复用现有 shared view models，
   只替换它们依赖的 primitives 与 editor shell，不重写业务规则。

5. Cleanup
   删除不再需要的重复样式和自定义 primitives，确保新 UI 代码默认走
   `components/ui/*` 和 editor adapter，而不是回到 ad hoc JSX + CSS。

### Implementation Defaults

- `shadcn/ui` 只作为 app 内部实现手段，不改变 `agent-html-app` 对外的产品边界。
- app 内部组件默认通过 app-local wrapper 暴露，不直接在业务组件里散落原始
  Radix primitives。
- `CodeMirror 6` 第一阶段只承担文本编辑、选区控制、按行聚焦、diagnostic
  跳转和 source focus 高亮；不在本计划里追加 LSP、复杂 diff editor 或 Monaco
  兼容层。

### Migration Gates

每个迁移批次至少满足：

- `npm --workspace agent-html-app run build`
- 对新增纯逻辑 adapter / view model 补窄测试
- 若涉及 `SourceEditor`，必须额外验证：
  `Open in Source`、diagnostic jump、focus refresh、save 前后草稿同步不回退

最终验收标准：

- `Source -> Build -> Preview -> Inspect` 主闭环行为不回退
- `Agent Shell` 的 snapshot entries、decision/review/readiness actions
  仍与现有 shared models 对齐
- app 不再继续扩大基础 UI 的“手搓面”，新增 UI 默认走 `shadcn/Radix` 与
  `CodeMirror 6`

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
