# Shadcn Component Adoption Status

本文记录当前对 shadcn 官方常见组件家族的接入判断，服务于后续 spec 和实现决策。

它不是 agent-facing schema，也不是 runtime verification data 的替代品。权威边界仍以
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
- `field-control`: 受限字段结构，统一处理 `label` / `value` / `description` 与控件本体。
- `option-set`: 受限单选项集结构，统一处理 `label` / `value` / `description` 与 `option` 子节点。
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
| `progress` | `supported` | 只读进度展示已通过真实语义/runtime path 回归，并已进入 schema、renderer 和 prompt output。 | 现有 `primitive`，第一版公开 props 收敛为 0-100 的 `value`。 | 保持 props 面最小，不把 `max` 或 raw aria/runtime props 提升成 public contract。 |
| `input` | `supported` | 文本字段首轮已通过共享 `field-control` archetype 接入，当前 contract 收敛为 `label` / `value` / `description`。 | 现有 `field-control`，第一版映射到文本输入控件。 | 下一步只扩这一 archetype 到布尔/单选字段，不把 raw input props 暴露出去。 |
| `textarea` | `supported` | 与 `input` 同族，已通过同一 `field-control` 共享骨架接入 multiline 文本字段。 | 现有 `field-control`，第一版映射到 multiline 文本控件。 | 保持与 `input` 共用 field contract，不单独长新协议。 |
| `checkbox` | `supported` | 布尔字段已通过同一 `field-control` archetype 接入，当前 contract 收敛为 `label` / `checked` / `description`。 | 现有 `field-control`，第一版映射到单个布尔控件。 | 后续只在 shared field state 上扩 `required` / `disabled` / `invalid`，不回到 raw checkbox props。 |
| `switch` | `supported` | 共享 `field-control` archetype 已继续覆盖 immediate on/off 偏好切换；当前 contract 收敛为 `label` / `checked` / `description`，并与 checkbox 保持语义区分。 | 现有 `field-control`，第一版映射到单个布尔切换控件。 | 保持布尔偏好切换语义，不退化为任意视觉 toggle。 |
| `slider` | `supported` | 共享 `field-control` archetype 已继续覆盖数值偏好滑块；当前 contract 收敛为 `label` / `value` / `description`，并带 numeric fallback。 | 现有 `field-control`，第一版映射到单个数值控件。 | 保持数值字段语义，不暴露 raw slider range props。 |
| `radio-group` | `supported` | 单组选项字段已接入，使用 `option` 结构子节点和共享 `field-control` 组选项渲染骨架。 | 现有 `field-control`，第一版映射到 `value` + `option` 结构。 | 后续与 `option-set` 对齐，复用 `option` 结构，不单独发明第二套协议。 |
| `toggle-group` | `supported` | `option-set` archetype 的首轮接入已经落地，当前 contract 收敛为 `label` / `value` / `description` + `option` 子节点。 | 现有 `option-set`，第一版映射到单选 `ToggleGroup`。 | 保持单选项集语义，不暴露 `type`、`variant`、`size` 或 spacing 细节。 |
| `select` | `supported` | `option-set` archetype 已继续覆盖受控选择器；当前 contract 收敛为 `label` / `value` / `description` + `option` 子节点，并带 trigger/content 与 no-script fallback。 | 扩展后的 `option-set` archetype。 | 继续保持受控选择语义，不暴露 Radix `Select` 结构或 raw props。 |
| `combobox` | `supported` | 现有 `option-set` archetype 已继续覆盖 searchable single-select；当前 contract 继续收敛为 `label` / `value` / `description` + `option` 子节点，并带 input+datalist 结构与 no-script fallback。 | 扩展后的 `option-set` archetype。 | 继续保持 `option-set` 语义，不为 searchable 选择器重开另一套 authoring 协议。 |
| `card` | `supported` | 内容分组语义稳定，标题/内容边界清晰。 | 现有 `compound`。 | 继续限制为固定结构，不暴露完整卡片自由组合。 |
| `separator` | `supported` | 纯语义分隔符，结构稳定。 | 现有 `primitive`。 | 保持无子节点、无额外视觉 props。 |
| `table` | `supported` | 结构化证据展示语义稳定，row/cell 层次明确。 | 现有 `table`。 | 继续保持 header/body 由语义节点驱动。 |
| `tabs` | `supported` | 受限切换结构已被 archetype 吸收，并有 noscript fallback。 | 现有 `tabs`。 | 保持 `tab` 语义层，不把 shadcn `variant` 暴露给 agent。 |
| `accordion` | `supported` | 可折叠分组语义稳定，已被共享 trigger/content 结构覆盖。 | 现有 `interactive-collection`。 | 保持 item 级语义 props 和 readable fallback。 |

## Outside Current Contract

| Component | Status | Why | Required contract/archetype | Next step |
| --- | --- | --- | --- | --- |
| `dialog` | `needs-archetype` | 需要 trigger ownership、open state、focus trap 和 artifact fallback。 | `triggered-overlay` | 只有在 artifact 明确需要 modal 语义时再立项。 |
| `alert-dialog` | `needs-archetype` | 除 overlay 外，还带 destructive confirmation 语义。 | `triggered-overlay` | 先证明 public contract 需要确认流，而不是应用交互。 |
| `sheet` | `needs-archetype` | 本质是 dialog 变体，仍依赖 overlay 协议。 | `triggered-overlay` | 不单独接入；跟随 `dialog` 统一判断。 |
| `drawer` | `needs-archetype` | 依赖 overlay 和 mobile interaction 语义，对 artifact 价值弱。 | `triggered-overlay` | 默认不优先。 |
| `popover` | `needs-archetype` | 需要 trigger/content 配对和位置语义。 | `triggered-overlay` | 未明确需要前不进入 public contract。 |
| `hover-card` | `needs-archetype` | 依赖 hover 行为，static artifact 语义弱。 | `triggered-overlay` | 默认不优先。 |
| `tooltip` | `needs-archetype` | 依赖 hover/focus，信息密度和 artifact 价值都弱。 | `triggered-overlay` | 保持 planned only，不作为近期待接入项。 |
| `button` | `defer` | 公开语义不稳定，容易把 action、link、submit、CTA 混在一起。 | `primitive` or action contract | 在 artifact 是否允许业务动作定清前不接。 |
| `avatar` | `defer` | 需要 image source、fallback、alt/resource policy。 | media/resource contract | 先决定 artifact 是否允许受控图片资源。 |
| `breadcrumb` | `defer` | 更像页面导航壳层，不是内容组件。 | link/navigation contract | 只有 public contract 引入导航语义后再评估。 |
| `pagination` | `defer` | 应用分页导航价值高于 artifact 内容表达价值。 | link/navigation contract | 默认不进入当前内容型组件目录。 |
| `skeleton` | `do-not-expose` | 只是加载占位，不是 artifact 语义。 | none | 保持 runtime/internal only。 |
| `scroll-area` | `do-not-expose` | 属于布局/滚动机制，不是语义组件。 | none | 不进入 agent-facing contract。 |
| `resizable` | `do-not-expose` | 属于应用布局交互机制，不适合作为 artifact 语义。 | none | 不进入 agent-facing contract。 |
| `toggle` | `do-not-expose` | 单个 toggle 容易退化为视觉按钮变体，语义不稳定。 | action/value contract | 当前不接。 |
| `dropdown-menu` | `do-not-expose` | 以应用菜单交互为主，不适合当前 artifact public contract。 | overlay + menu semantics | 当前不接。 |
| `menubar` | `do-not-expose` | 属于应用壳导航/menu，不是内容表达组件。 | overlay + navigation semantics | 当前不接。 |
| `navigation-menu` | `do-not-expose` | 属于应用导航壳层，偏离当前 artifact 内容边界。 | navigation semantics | 当前不接。 |

## Current Pass

`combobox`、`switch` 和 `slider` 已落地。当前这一批 grouped adoption 已关闭。

这一轮已经证明：

- 单个只读显示型新增组件已经能低成本接入。
- `field/control` archetype 已能覆盖文本、布尔确认、布尔偏好切换、数值字段和单组选项字段。
- `option-set` archetype 已能覆盖少量选项切换、受控选择器和 searchable single-select。

在 future spec 明确新的产品语义前，不应扩张到 overlay、menu、navigation 或 app-shell 语义。

## Shadcn Debt Notes

- No active shadcn debt is currently tracked for the completed grouped
  adoption lane. Reopen fixture maintenance only if local copies start
  diverging during future shadcn upgrades.
