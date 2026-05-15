# Shadcn Component Adoption Status

本文记录当前对 shadcn 官方常见组件家族的接入判断，服务于后续 spec 和实现决策。

它不是 agent-facing schema，也不是 runtime capability data 的替代品。权威边界仍以
blueprint 和 contracts 为准；本文只回答一个问题：哪些组件已经接入，哪些可以直接
标准化接入，哪些需要先补通用 archetype，哪些不应进入当前 public contract。

## Scope And Reading Rules

- 范围只覆盖 shadcn 官方常见基础组件家族，不覆盖 blocks、community registry、
  `chart`、`sidebar`、`sonner`、`data-table`、utility hooks 或 marketing 样例。
- “安装了 shadcn 组件”不等于“已经成为 agent-facing 组件能力”。
- `GeneratedShadcnIntrospection`、`render-capabilities`、renderer mapping 和 slot
  metadata 只属于 internal verification，不属于公开 contract。
- 新组件只有在 schema、renderer、runtime verification、doctor 和 tests 都对齐后，
  才能从 planned 变成 supported。

## Direct Adoption Criteria

只有同时满足以下条件，才算“可直接标准化接入”：

1. 组件有稳定语义，而不是主要服务于视觉技巧、应用壳层或自由交互。
2. 组件能映射到现有 renderer archetype，而不需要新增运行时协议。
3. 组件不依赖额外 trigger、portal、open state、focus trap 或复杂 fallback 规则。
4. 对外 props 可以收敛成少量语义字段，而不是暴露 raw shadcn props。
5. 组件能在 static artifact 和 preview/build 共线路径下保持可解释行为。

## Current Renderer Archetypes

当前 renderer 主路径已经有以下 archetype：

- `primitive`: 单根导出、少量语义 props、无复杂 slots。
- `compound`: 标题/内容或容器/内容类结构。
- `collection`: 原生集合类结构，如 `ul` / `ol`。
- `table`: header/body/row/cell 明确分层的表格结构。
- `tabs`: trigger/content 配对的受限切换结构。
- `interactive-collection`: item/trigger/content 配对的受限交互集合。

接入新组件的默认工程路径是复用这些 archetype，或新增一个通用 archetype；不是
为单个 shadcn 组件长期手写专属 adapter。

## Status Legend

- `supported`: 已经接入当前 public contract，并有 renderer/runtime support。
- `direct-candidate`: 可直接标准化接入，不需要新增 archetype。
- `needs-archetype`: 需要先补通用 archetype 或 contract，再成批接入。
- `defer`: 技术上可做，但当前产品语义或优先级不值得先接。
- `do-not-expose`: 不应进入当前 agent-facing public contract。

## Supported Today

| Component | Status | Why | Required contract/archetype | Next step |
| --- | --- | --- | --- | --- |
| `alert` | `supported` | 语义稳定，属于 callout/callout-danger，已映射到 title/content 结构。 | 现有 `compound`。 | 继续只暴露语义 `tone`，不外泄 raw `variant`。 |
| `badge` | `supported` | 语义稳定，属于短状态标签，公开 props 已收敛。 | 现有 `primitive`。 | 保持 `tone` 到内部 `variant` 的 safe mapping。 |
| `card` | `supported` | 内容分组语义稳定，标题/内容边界清晰。 | 现有 `compound`。 | 继续限制为固定结构，不暴露完整卡片自由组合。 |
| `separator` | `supported` | 纯语义分隔符，结构稳定。 | 现有 `primitive`。 | 保持无子节点、无额外视觉 props。 |
| `table` | `supported` | 结构化证据展示语义稳定，row/cell 层次明确。 | 现有 `table`。 | 继续保持 header/body 由语义节点驱动。 |
| `tabs` | `supported` | 受限切换结构已被 archetype 吸收，并有 noscript fallback。 | 现有 `tabs`。 | 保持 `tab` 语义层，不把 shadcn `variant` 暴露给 agent。 |
| `accordion` | `supported` | 可折叠分组语义稳定，已被共享 trigger/content 结构覆盖。 | 现有 `interactive-collection`。 | 保持 item 级语义 props 和 readable fallback。 |

## Direct Candidate

| Component | Status | Why | Required contract/archetype | Next step |
| --- | --- | --- | --- | --- |
| `progress` | `direct-candidate` | 只读进度展示语义稳定，不依赖复杂 trigger 或 portal，适合 static artifact。 | 现有 `primitive`，公开 props 可收敛为 `value`、`max`、`label`。 | 先定义最小语义 contract，再补 runtime requirements、tests 和 artifact coverage。 |

## Needs New Archetype

### Field / Control

| Component | Status | Why | Required contract/archetype | Next step |
| --- | --- | --- | --- | --- |
| `input` | `needs-archetype` | 不是简单 primitive；需要 value、label、description、required、disabled、invalid 的统一 contract。 | 新增 `field/control` archetype。 | 先定义只读/可交互边界，再决定是否暴露输入能力。 |
| `textarea` | `needs-archetype` | 与 `input` 同族，但还带 multiline 文本语义。 | 新增 `field/control` archetype。 | 与 `input` 共用 field contract，不单独发明协议。 |
| `checkbox` | `needs-archetype` | 需要 checked/unchecked、label、grouping 和 validation 规则。 | 新增 `field/control` archetype。 | 与 field contract 一起定义布尔值语义。 |
| `switch` | `needs-archetype` | 需要 on/off 语义，但不应退化为任意视觉 toggle。 | 新增 `field/control` archetype。 | 先定义与 `checkbox` 的语义区分，再考虑公开。 |
| `radio-group` | `needs-archetype` | 需要 option model、group label 和 selected value model。 | 新增 `field/control` archetype，或与 `option-set` 协调。 | 先统一单选字段 contract。 |
| `slider` | `needs-archetype` | 需要 numeric value contract、range 规则和可读 fallback。 | 新增 `field/control` archetype。 | 先定义数值字段 contract，再决定是否允许交互。 |

### Option Set

| Component | Status | Why | Required contract/archetype | Next step |
| --- | --- | --- | --- | --- |
| `select` | `needs-archetype` | 需要 option list、selected value、trigger/content 和 fallback 语义。 | 新增 `option-set` archetype。 | 先统一 options contract，不直接暴露 Radix `Select` 结构。 |
| `combobox` | `needs-archetype` | 除 option list 外，还带搜索/过滤行为，复杂度高于 `select`。 | 新增 `option-set` archetype。 | 在 `select` contract 成熟前，不单独接入。 |
| `toggle-group` | `needs-archetype` | 适合少量互斥或多选选项，但本质仍是 option-set。 | 新增 `option-set` archetype。 | 把“2-7 个选项切换”收敛为语义 option set。 |

### Triggered Overlay

这组组件只有在 public contract 明确需要“触发器 + 浮层内容 + fallback 策略”时才应
考虑接入；在那之前，不要把它们作为普通组件暴露。

| Component | Status | Why | Required contract/archetype | Next step |
| --- | --- | --- | --- | --- |
| `dialog` | `needs-archetype` | 需要 trigger ownership、open state、focus trap 和 artifact fallback。 | 新增 `triggered-overlay` archetype。 | 只有在 artifact 明确需要 modal 语义时再立项。 |
| `alert-dialog` | `needs-archetype` | 除 overlay 外，还带 destructive confirmation 语义。 | 新增 `triggered-overlay` archetype。 | 先证明 public contract 需要确认流，而不是应用交互。 |
| `sheet` | `needs-archetype` | 本质是 dialog 变体，仍依赖 overlay 协议。 | 新增 `triggered-overlay` archetype。 | 不单独接入；跟随 `dialog` 统一判断。 |
| `drawer` | `needs-archetype` | 依赖 overlay 和 mobile interaction 语义，对 artifact 价值弱。 | 新增 `triggered-overlay` archetype。 | 默认不优先。 |
| `popover` | `needs-archetype` | 需要 trigger/content 配对和位置语义。 | 新增 `triggered-overlay` archetype。 | 未明确需要前不进入 public contract。 |
| `hover-card` | `needs-archetype` | 依赖 hover 行为，static artifact 语义弱。 | 新增 `triggered-overlay` archetype。 | 默认不优先。 |
| `tooltip` | `needs-archetype` | 依赖 hover/focus，信息密度和 artifact 价值都弱。 | 新增 `triggered-overlay` archetype。 | 保持 planned only，不作为近期待接入项。 |

## Defer

| Component | Status | Why | Required contract/archetype | Next step |
| --- | --- | --- | --- | --- |
| `button` | `defer` | 结构简单，但公开语义最不稳定：action、link、submit、CTA 都可能混在一起。 | 若接入，仍可落到 `primitive`，但先要有明确 action contract。 | 在 artifact 是否允许业务动作这件事定清前不接。 |
| `avatar` | `defer` | 需要 image source、fallback、alt/resource policy，跨到外部资源边界。 | 可能需要独立 media/resource contract。 | 先决定 artifact 是否允许受控图片资源。 |
| `breadcrumb` | `defer` | 更像页面导航壳层，不是内容组件。 | 若接入，需要 link/navigation contract。 | 只有 public contract 引入导航语义后再评估。 |
| `pagination` | `defer` | 应用分页导航价值高于 artifact 内容表达价值。 | 若接入，需要 link/navigation contract。 | 默认不进入当前内容型组件目录。 |

## Do Not Expose In The Current Public Contract

| Component | Status | Why | Required contract/archetype | Next step |
| --- | --- | --- | --- | --- |
| `skeleton` | `do-not-expose` | 只是加载占位，不是 artifact 语义。 | 不需要。 | 保持 runtime/internal only。 |
| `scroll-area` | `do-not-expose` | 属于布局/滚动机制，不是语义组件。 | 不需要。 | 不进入 agent-facing contract。 |
| `resizable` | `do-not-expose` | 属于应用布局交互机制，不适合作为 artifact 语义。 | 不需要。 | 不进入 agent-facing contract。 |
| `toggle` | `do-not-expose` | 单个 toggle 容易退化为视觉按钮变体，语义不稳定。 | 若未来强需求出现，应先走 action/value contract。 | 当前不接。 |
| `dropdown-menu` | `do-not-expose` | 以应用菜单交互为主，不适合当前 artifact public contract。 | 若重评，需 overlay + menu semantics。 | 当前不接。 |
| `menubar` | `do-not-expose` | 属于应用壳导航/menu，不是内容表达组件。 | 若重评，需 overlay + navigation semantics。 | 当前不接。 |
| `navigation-menu` | `do-not-expose` | 属于应用导航壳层，偏离当前 artifact 内容边界。 | 若重评，需 navigation semantics。 | 当前不接。 |

## Recommended Adoption Order

按当前架构收益/成本比，下一批接入顺序建议为：

1. `progress`
2. `textarea`
3. `input`
4. `checkbox`
5. `radio-group`
6. `toggle-group`
7. `select`

这条顺序的意图是先验证：

- 单个只读显示型新增组件能否低成本接入。
- `field/control` archetype 能否覆盖文本、布尔值和单选字段。
- `option-set` archetype 能否覆盖少量选项切换和受控选择器。

在这两层稳定之前，不应扩张到 overlay、menu、navigation 或 app-shell 语义。
