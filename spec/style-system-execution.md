# Style System Execution Spec

本文记录当前样式系统改造的实施节奏、阶段边界和验收口径。

它是 execution spec，不是 blueprint authority，也不是新的 public contract。
架构权威仍以 `blueprint/` 为准；当前状态与分层主说明仍以 `spec/map.md`
为准；本文件只回答“这一轮样式系统改造如何分阶段推进”。

## Purpose

本轮改造的目标是把当前这条偏薄的配置链：

```txt
style-ref
  -> theme / density / tone / width
  -> runtime shell class and data attributes
```

演进为：

```txt
style-ref
  -> complete style profile
  -> global style layer + component style layer
  -> runtime token projection + internal component treatments
  -> shadcn/native artifact
```

这里的 `complete style profile` 仍然是内部配置层对象，不是新的 agent-facing
语法。公开视觉入口继续只通过 `style-ref` 暴露。

## Current Gap

当前仓库里的实现事实是：

- `packages/core/src/render-config.ts` 仍把 `style-ref` 解析成
  `theme`、`density`、`tone`、`width` 四项 resolved tokens。
- `packages/ahtml/src/cli/runtime-template/src/app.tsx` 仍把这四项写到
  `<main>` 的 `data-*` attributes，并用 `density`、`tone`、`width`
  拼 shell class。

这条路径足以支撑当前 artifact-focused pass，但还不足以承接：

- 以 shadcn official theming 为基线的全局 token 面；
- 完整 style profile 的 builtin / user 管理；
- 更稳定的 global style layer 与 component style layer 分离；
- 未来视觉编辑器所需的 profile 数据模型与生成入口。

因此，本轮改造不是扩写 agent-facing config surface，而是补厚配置层内部模型。

## Target Shape

实施完成后，目标形态应满足以下条件：

- Public input 继续只接收 `style-ref`。
- 每个 `style-ref` 指向一份完整 style profile。
- style profile 同时包含：
  - global style layer
  - component style layer
- global style layer 的 token 规范基线来自 shadcn official theming：
  semantic color pairs、light/dark token sets、radius scale、CSS variable
  mapping、字体和相关派生规则。
- component style layer 只记录内部 treatment mapping，不进入
  `.agent.html`、schema 或 prompt vocabulary。
- runtime 消费的是 resolved style profile 或其 token projection，
  而不是把旧四项 resolved tokens 当成样式系统事实来源。

## Out Of Scope

本轮 execution spec 明确不包含以下目标：

- 不新增 public config syntax。
- 不把 global theme tokens 直接暴露到 schema、prompt 或 `.agent.html`。
- 不开放 component-level visual knobs、raw shadcn props、Tailwind class、
  `className` 或自由 CSS passthrough。
- 不把 overlay、menu、navigation、app-shell semantics 并入本轮。
- 不把完整 tweakcn 风格视觉编辑器 UI 实现并入本轮。
- 不要求在本轮删除所有旧兼容字段；旧字段允许作为过渡桥接层短期存在。

## Phases

### Phase A — Style Profile Contract

Goal:

- 定义完整 style profile 的内部 contract。
- 明确 profile 由 global style layer 与 component style layer 组成。
- 保持 public input 仍只有 `style-ref`。

Required outcomes:

- `style-ref` 被定义为完整 style profile 的引用 id，而不是四项旧 token 的别名。
- builtin profiles 与 user profiles 的来源边界被写清。
- profile 是完整成品，不采用 inheritance 或 runtime merge。
- unresolved `style-ref` 回退 default profile。

Done when:

- spec 中不再把 `theme / density / tone / width` 写成全局样式层主模型。
- 后续实现可以围绕 profile 建模，而不需要再重开配置层 contract。

### Phase B — Global Token Alignment

Goal:

- 让 global style layer 明确对齐 shadcn official theming token convention。
- 把旧四项从“规范层 token”降级为过渡兼容层或派生字段。

Required outcomes:

- profile 能表达 semantic color pairs、light/dark token sets、radius scale、
  CSS variables、字体和必要派生规则。
- `tweakcn` 的定位被限制为 theme model、preset organization 和 generator
  engineering reference，不形成平行 token canon。
- 旧四项若仍保留，只能作为 compatibility bridge 或 runtime projection input，
  不能继续充当全局样式层正式模型。

Done when:

- global style layer 的 spec 已能独立成立，不再依赖旧四项定义自身。

### Phase C — Runtime Consumption Migration

Goal:

- runtime 从消费旧四项切换为消费 resolved style profile 或 token projection。

Required outcomes:

- runtime template、artifact shell 和 runtime verification 改为围绕 profile
  projection 工作。
- layout / density / width posture 如仍需保留，改为 profile 派生结果，而不是
  profile 的上位定义。
- `doctor`、runtime surface checks 和 renderer verification 开始把 token
  surface 与 profile 解析结果纳入 proof path。

Done when:

- runtime 主路径不再把 `theme / density / tone / width` 视为样式系统事实来源。

### Phase D — Component Treatment Internalization

Goal:

- 把高价值组件的视觉 treatment 明确收进 component style layer 的内部映射。

Required outcomes:

- 先覆盖高价值面：`alert`、`badge`、`card`、`table`、`input`、`tabs`。
- treatment 继续只属于 config / renderer / runtime path。
- schema、prompt 和 `.agent.html` 不新增 component visual config keys。

Done when:

- renderer 可以消费 component style layer 的 internal mappings，而不需要
  扩写 public contract。

### Phase E — Editor Readiness

Goal:

- 为未来视觉编辑器预埋 profile 数据模型、preset 组织和生成入口。

Required outcomes:

- 未来编辑器读写的 profile shape、builtin / user 存储边界、generator 接线点
  和 runtime consumption boundary 被写清。
- 可参考 `D:\codes\tweakcn-main` 的 theme state、preset organization 和
  generator ideas，但不承诺复制其 UI、协议或自由编辑面。

Done when:

- 后续视觉编辑器实现只需要在既定 profile 模型上接 UI 与 persistence，
  不需要再重开样式系统 contract。

## Phase Order And Pacing

- Phase A 完成前，不开始新的 profile-dependent runtime migration。
- Phase B 完成前，不把 runtime 主路径切到新的 token projection。
- Phase C 稳定前，不扩大 component treatment 覆盖面。
- Phase D 只在主链路已经围绕 profile 稳定后推进。
- Phase E 是 readiness lane，不阻塞主链路收口。

每个阶段都按同一节奏推进：

1. 先补最小 contract / spec truth。
2. 再补最小解析或映射证明。
3. 再补 runtime 或 renderer proof。
4. 最后才跑更重的 CLI artifact gate。

## Cross-Cutting Guardrails

- shadcn official theming convention 是 global style layer 的唯一规范基线。
- `tweakcn` 只作为工程参考，不成为 public contract 来源。
- public visual entry 继续只通过 `style-ref` 暴露。
- schema、prompt、CLI help 不新增 global token keys 或 component visual knobs。
- old pre-`style-ref` render-config input 继续保持 rejected。
- component treatment mapping 继续留在内部配置 / 渲染路径，不升级成
  agent-facing syntax。
- style profile 继续要求完整成品，不采用 inheritance 或 runtime merge。
- runtime 继续以 shadcn-native managed runtime 为 UI surface source of truth，
  不引入平行 UI kit 或手写 base theme path。

## Verification Plan

### Phase A

- Contract and schema lane:
  `packages/core/src` 和 `packages/ahtml/src/config` 相关测试继续证明
  `style-ref` 是唯一 public key。
- 重点证明 profile contract 扩充没有扩写 public surface。

### Phase B

- 优先跑最小 profile parsing / token projection tests。
- 再跑 runtime surface checks，证明 required CSS token surface 与 shadcn
  theming-aligned variables 对齐。

### Phase C

- 优先跑 runtime template / renderability tests。
- 再跑 `doctor`、runtime surface 和 artifact workflow proof。

### Phase D

- 优先跑 renderer mapping tests，证明 component treatments 仍是 internal
  concern。
- 再跑 representative artifact tests，证明高价值组件仍通过 shared
  semantic-to-runtime path 渲染。

### Phase E

- 以 spec completeness review 为主，不要求本轮落完整 editor UI test。
- 只要求 profile model、preset organization、generator boundary 和 future
  editor handoff point 足够清晰。

## Acceptance Snapshot

本轮样式系统 execution lane 可认为完成，当以下条件同时成立：

- `ahtml schema --format prompt` 仍只暴露 `style-ref`。
- spec 已把 `style-ref` 定义为完整 style profile 引用，而不是旧四项 token 的
  公开别名。
- runtime 主路径已围绕 resolved style profile 或 token projection 工作。
- `theme / density / tone / width` 不再被 spec 描述为 global style layer 的
  正式模型。
- shadcn official theming token convention 已成为 spec 中明确、唯一的
  global token baseline。
- `tweakcn` 在 spec 中只保留 engineering reference 角色。
- component style treatments 仍是 internal config / renderer concern，不进入
  agent-facing vocabulary。
