# Document Style Config Migration

本文记录 `ahtml` 主链路下一轮重构优化的执行方案。

它只回答一件事：当 configuration lane 重开时，如何把当前 compatibility
`profile` surface 收束到 blueprint 已经确定的 document style config
reference 模型。

它不是 blueprint，也不是当前 pass 的状态快照。当前稳定态仍以
`spec/map.md`、`spec/roadmap.md` 和 `spec/phase-checklist.md` 为准。

## Goal

下一轮主链路重构只做这一条迁移：

```txt
compatibility profile-first public wording
  -> document style config reference-first contract wording
  -> checked RenderConfig
  -> renderer/runtime internal tokens
```

目标是让：

- `DocumentStyleConfigReference` 成为主架构、type surface 和 contract 的主语。
- `profile` 明确降级为 compatibility alias，而不是长期唯一视觉入口。
- 公开视觉配置继续只停留在 document level，不引入 component-level public
  styling knobs。
- renderer/runtime 继续只消费 checked visual config 与 resolved tokens，不感知
  agent-facing header 词汇。

## Locked Decisions

- 本轮不扩展新组件语义，不重开 overlay、menu、navigation 或 app-shell lane。
- 本轮不开放 component-level public style config。
- 本轮不把 `theme`、`density`、`tone`、`width` 提升为 agent-facing config key。
- 本轮不要求立刻引入新的序列化 header key。
  当前 `<meta-agent profile="...">` 可以继续作为唯一序列化 compatibility
  syntax，直到单独的产品决策批准新的 public syntax。
- 因此，本轮迁移的核心是：
  - contract / type / schema wording 先 reference-first
  - serialized syntax 仍可暂时 profile-first
  - core 负责把 compatibility alias 归一为 checked RenderConfig

## Execution Phases

### Phase A. Contract Freeze

先冻结下一轮不能再摇摆的边界：

- `DocumentStyleConfigReference` 是长期首选的文档级视觉配置入口。
- `PresentationProfile` 只保留兼容 alias / 简化档位角色。
- `RenderConfig` 的职责是解析 approved visual choice，不是自由视觉参数包。
- component-level visual mapping 只属于 internal config / renderer，不属于 public
  schema。
- 当前 serialized syntax 若仍使用 `profile`，必须在文档里被称为 compatibility
  alias，而不是长期主模型。

完成定义：

- blueprint、type surface、contracts、spec 对以上 5 条表述一致。

### Phase B. Type And Contract Promotion

把目标架构从“方向叙事”推进成“实现前边界”：

- `type-surface` 中以 `DocumentStyleConfigReference` 作为视觉入口主语。
- `PresentationProfile`、`PresentationProfileRegistry` 明确为兼容层。
- `RenderConfig` 明确记录 checked visual choice 与解析结果，而不是 raw public
  header 的原样透传。
- `CliSchemaOutput` 与 `CliConfigView` 明确：
  - 概念主语是 document style config reference
  - concrete syntax 在兼容期仍可经由 `profile` alias 序列化
- `component-schema-to-agent-html` contract 明确 schema/prompt 默认讲 reference
  模型，而不是把 `profile` 当独立长期系统。
- `engine-to-renderer-adapter` 与 `agent-html-to-renderer` contract 明确 core 拥有
  alias normalization 责任；renderer 不分辨 public header 原始 spelling。

完成定义：

- blueprint contracts 和 type surface 已能直接指导实现者修改 core/CLI，而不再需要
  自行推断 `profile` 与 reference 的主次关系。

### Phase C. Schema And Core Alignment

在不引入新 public syntax 的前提下，对齐 core/CLI 实现：

- `packages/core` 中的 public render config contract 继续允许当前 compatibility
  `profile` surface，但语义上将其解释为 approved style config alias。
- parse / validate / sanitize 继续只接受有限 visual config selection；`profile`
  仍可作为 serialized input，但内部必须归一到统一的 checked RenderConfig。
- CLI schema / prompt / help：
  - 保持当前 example syntax 可运行
  - 同时把 `profile` 说明为 compatibility alias
  - 不把 internal tokens 或 per-component visual knobs 暴露给 agent
- renderer adapter、runtime template、inspect summary 只消费 checked
  RenderConfig 与 resolved tokens，不新增对 raw header vocabulary 的分支。

完成定义：

- schema、sanitize、CLI wording、renderer consumption 对“reference-first /
  profile-compat”模型一致。
- 当前 artifact 构建、preview、inspect、doctor 不因 wording 迁移出现双轨配置语义。

### Phase D. Compatibility Cleanup Gate

只有在 Phase C 稳定后，才允许讨论下一步公开语法切换。

这一 gate 只决定两件事：

- 是否需要新增独立于 `profile` 的 public serialized config syntax。
- 若新增，何时把 schema/prompt/examples 的默认写法切到新 syntax。

在此 gate 之前：

- `profile` 继续存在。
- docs/examples 可继续使用 `<meta-agent profile="...">`。
- 不把“是否更换 public key 名称”混入当前 contract cleanup。

完成定义：

- 若决定继续保留 `profile`，则把它正式定义为长期 alias。
- 若决定切换 syntax，则单独开新执行 spec，不与当前 lane 混做。

## Work Surfaces

下一轮真正实施时，按这个顺序改：

1. `blueprint/architecture-design/type-surface.md`
2. `blueprint/architecture-design/contracts/*.md`
3. `packages/core` render config / public contract / parse-sanitize
4. `packages/ahtml` CLI schema / prompt / inspect wording
5. docs/examples/tests

不要反过来先改 runtime 或 examples，再倒推 contract。

## Acceptance Gates

必须同时满足：

- architecture、type surface、contracts、spec 对 visual config 主语一致。
- public contract 继续只暴露 document-level visual choice。
- `profile` 若存在，只能表现为 compatibility alias，不重新膨胀成 token bag。
- parse / sanitize 继续拒绝旧的 free-form token input 与任意样式逃逸。
- renderer/runtime 只消费 checked RenderConfig，不消费 raw header spelling。
- dev preview、build artifact、inspect、doctor 继续共用同一 visual config 解析链路。

## Verification

实施这一轮时，至少覆盖这些验证：

- core render config tests
  - approved config selection 仍能解析
  - 未知 key / value 仍被拒绝
- sanitize tests
  - `<meta-agent profile="...">` 继续通过
  - legacy token bag 继续失败
- public agent contract / CLI schema tests
  - visual config wording 与 spec 一致
  - internal tokens 不外泄
- CLI heavy / artifact tests
  - build、preview、inspect、doctor 继续走同一条 checked config 路径

## Non-goals

- 不在这一轮引入 component-level public config。
- 不在这一轮新增 style token 自由输入。
- 不在这一轮重开 overlay/menu/navigation。
- 不在这一轮把 app/workbench 重构混入主链路方案。
