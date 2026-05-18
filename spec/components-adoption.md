# Shadcn Component Adoption Status

本文记录 shadcn 官方基础组件在 agent-html 中的接入判断，用作 spec 和实现决策索引。
它不是公开 schema，也不是 runtime verification data。

## Reading Rules

- 范围只覆盖 shadcn 官方基础组件家族；`blocks`、community registry、
  `chart`、`sidebar`、`sonner`、`data-table`、utility hooks 和 marketing
  样例不在本文主分析范围。
- “安装到 runtime” 不等于“进入当前 public contract”。
- 新组件只有在 schema、renderer、runtime verification、doctor 和 tests
  全部对齐后，才算 `supported`。

## Adoption Framework

Adoption rules:

- 组件需要表达稳定语义，而不是视觉技巧、应用壳层或自由交互。
- 组件需要能映射到现有 renderer archetype，或证明值得新增 archetype。
- 组件不能依赖复杂 trigger、portal、open state、focus trap 或重 fallback。
- 对外 props 需要收敛成少量语义字段。
- 组件行为需要在 artifact / preview / build 路径下保持可解释。

Current implementation renderer kinds:

- `primitive`: 单根导出、轻量 props。
- `compound`: 标题/内容容器。
- `text-field`: 文本输入字段。
- `toggle-field`: 布尔切换字段。
- `slider-field`: 单 thumb 数值范围字段。
- `choice-group`: 常显单选项组。
- `choice-inline`: 内联单选项集。
- `select-overlay`: trigger + panel 单选选择器。
- `combobox-input`: searchable input + listbox 单选选择器。
- `collection`: 原生集合结构。
- `table`: row/cell 分层结构。
- `tabs`: trigger/content 切换结构。
- `accordion`: accordion 专用 disclosure 集合。

Recommended honest families:

- `text-field`: 文本输入字段，如 `input`、`textarea`。
- `toggle-field`: 布尔切换字段，如 `checkbox`、`switch`。
- `range-field`: 数值范围字段，如 `slider`。
- `choice-group`: 常显单选项组，如 `radio-group`。
- `choice-inline`: 内联单选项集，如 `toggle-group`。
- `select-overlay`: 触发器 + 面板式单选选择器，如 `select`。
- `combobox-input`: searchable input + listbox 单选选择器，如 `combobox`。
- `compound`: 标题/内容容器。
- `primitive`: 单根导出、轻量 props。
- `table`: row/cell 分层结构。
- `tabs`: trigger/content 切换结构。
- `interactive-collection`: item/trigger/content 交互集合。

Honesty rule:

- 当前实现 archetype 记录的是代码事实，不等于诚实组件家族。
- 诚实组件家族优先按组合结构、交互语义、状态模型和可见性模型划分，
  不能仅因 `label`、`value`、`description` 这类表面 props 相似就压平。
- 后续实现可以在 renderer 层复用适配器，但 spec 不应为了迁就复用而抹掉
  `toggle-field`、`range-field`、`choice-group`、`select-overlay`、
  `combobox-input` 之间的差异。

Status:

- `supported`
- `needs-archetype`
- `defer`
- `do-not-expose`

## Layer Separation Guidance

当前配置层与公开视觉入口的主说明已收敛到 `spec/map.md`。本文件只保留与组件
接入判断直接相关的最小分层约束：

- agent-facing public surface 当前仍通过 `style-ref` 选择受控文档级视觉入口。
- 组件级 visual mapping 属于内部配置 / 渲染路径，不进入正文积木协议。
- 组件接入判断继续遵守语义使用层、配置层、实现层分离，不把 shadcn 原始 props
  或实现细节暴露回 agent-facing surface。

## Supported Today

下表同时记录两件事：

- `Current renderer kind`: 当前代码里的 renderer 收敛层。
- `Honest family`: 更贴近真实组合结构和交互语义的家族归类。

这两列不一致时，以 `Honest family` 作为后续设计校准方向，以
`Current renderer kind` 作为当前实现事实。

| Component | Current renderer kind | Honest family | Note |
| --- | --- | --- | --- |
| `alert` | `compound` | `compound` | 稳定 callout 语义。 |
| `badge` | `primitive` | `primitive` | 稳定短状态标签。 |
| `progress` | `primitive` | `primitive` | 只读数值进度展示。 |
| `input` | `text-field` | `text-field` | 单行文本字段。 |
| `textarea` | `text-field` | `text-field` | 多行文本字段。 |
| `checkbox` | `toggle-field` | `toggle-field` | 布尔确认字段。 |
| `switch` | `toggle-field` | `toggle-field` | 布尔偏好切换字段。 |
| `slider` | `slider-field` | `range-field` | 单 thumb 数值偏好字段。 |
| `radio-group` | `choice-group` | `choice-group` | 通过 `option` 子节点表达单组选项。 |
| `toggle-group` | `choice-inline` | `choice-inline` | 内联单选项集。 |
| `select` | `select-overlay` | `select-overlay` | trigger + panel 单选选择器。 |
| `combobox` | `combobox-input` | `combobox-input` | searchable single-select。 |
| `card` | `compound` | `compound` | 分组内容容器。 |
| `separator` | `primitive` | `primitive` | 语义分隔符。 |
| `table` | `table` | `table` | 结构化证据表格。 |
| `tabs` | `tabs` | `tabs` | 多视图切换结构。 |
| `accordion` | `accordion` | `interactive-collection` | 折叠分组结构。 |

## Supported Component Parameter Split

下表只覆盖当前 `supported` 组件。它回答三件事：

- agent 在语义使用时能写什么。
- document-level config 可通过哪些内部 visual mapping 间接影响最终外观。
- 哪些参数必须继续锁在 shadcn / renderer 实现层。

| Component(s) | Agent can use | Internal visual mapping examples | Keep internal |
| --- | --- | --- | --- |
| `alert` | `title`、`tone`、text children | `neutral/danger` 的视觉映射、container emphasis、icon / border / surface treatment | `variant`、class、destructive implementation |
| `badge` | `tone`、text children | tone 到 badge treatment 的映射、shape、weight、fill / outline strategy | `variant`、class |
| `progress` | `value` | track / fill style、height、radius、density spacing | 具体 class、animation / CSS wiring |
| `card` | `title`、allowed children | surface、border、radius、padding、header/content spacing、title emphasis | `size`、内部 shell composition |
| `separator` | none | divider thickness、tone、vertical rhythm policy | 具体 class、orientation wiring |
| `input` / `textarea` | `label`、`value`、`description` | field chrome、padding、label/help text treatment、invalid / disabled visuals | `defaultValue`、`required`、implementation props |
| `checkbox` / `switch` | `label`、`checked`、`description` | control chrome、track/thumb/check treatment、toggle row spacing、label/control grouping treatment | controlled state wiring、implementation props |
| `slider` | `label`、`value`、`description` | track / thumb treatment、range spacing、numeric emphasis | controlled state wiring、implementation props |
| `radio-group` | `label`、`value`、`description`、`option.value`、`option.label` | option spacing、selected/unselected treatment、group shell chrome、option-row composition | group wiring、shadcn item composition |
| `toggle-group` | `label`、`value`、`description`、`option.value`、`option.label` | inline option spacing、active/inactive treatment、group shell chrome | controlled selection wiring、group/item implementation |
| `select` | `label`、`value`、`description`、`option.value`、`option.label` | trigger visual、panel visual、item hover/selected treatment | `defaultValue`、trigger / content / item implementation、overlay state wiring |
| `combobox` | `label`、`value`、`description`、`option.value`、`option.label` | input chrome、list/panel visual、item hover/selected treatment、empty-state treatment | `defaultValue`、placeholder、items / collection / empty-state wiring、input/listbox implementation |
| `table` | `row.kind`、`cell` text content | header/body treatment、row dividers、striping、cell padding、numeric/text emphasis | table export choice、DOM structure details |
| `tabs` | `default`、`tab.value`、`tab.label`、tab children | tabs list treatment、active trigger treatment、content pane shell | `defaultValue`、`value`、trigger/content export wiring、fallback implementation |
| `accordion` | `accordion-item.value`、`accordion-item.title`、item children | item shell、trigger emphasis、content spacing、divider treatment | `type`、`collapsible`、open-close wiring、trigger/content export wiring |

补充约束：

- `tone` 这类参数只在少量组件中保留，作为“语义带视觉暗示”的词；
  它们不等于开放自由视觉调参。
- `value`、`label`、`description`、`title`、`kind` 这类参数属于语义或结构输入，
  即使它们会影响最终呈现，也不应下沉为纯样式配置。
- `checked`、`value`、`default` 这类状态样参数记录的是 document-stable
  snapshot，不是 runtime controlled API，也不意味着暴露 `defaultValue`、
  `open`、`onValueChange` 之类 shadcn props。
- broader public contract 中现存的 `list.variant` 只是语义 marker style 的历史
  例外，不构成开放 shadcn-style `variant` 的先例；若该 vocabulary 重开，优先
  迁移为 `kind`。
- `variant`、`size`、`surface`、`radius`、`spacing`、`className`、
  Tailwind class、Radix / Base UI props 不进入 agent-facing 使用层。

## Outside Current Contract

| Component | Status | Class | Note |
| --- | --- | --- | --- |
| `dialog` | `needs-archetype` | `overlay` | 依赖 trigger/open/focus/fallback。 |
| `alert-dialog` | `needs-archetype` | `overlay` | destructive confirmation flow。 |
| `sheet` | `needs-archetype` | `overlay` | dialog 侧面板变体。 |
| `drawer` | `needs-archetype` | `overlay` | mobile-first reveal surface。 |
| `popover` | `needs-archetype` | `overlay` | contextual reveal surface。 |
| `hover-card` | `needs-archetype` | `gesture-overlay` | 依赖 hover。 |
| `tooltip` | `needs-archetype` | `gesture-overlay` | 依赖 hover/focus。 |
| `calendar` | `needs-archetype` | `date-grid` | 日历栅格、locale 和 date state 不适合压进 `choice-group`。 |
| `date-picker` | `needs-archetype` | `date-overlay` | calendar + overlay + environment 语义。 |
| `input-otp` | `needs-archetype` | `segmented-field` | 分段输入模型不同于普通 `text-field`。 |
| `button` | `defer` | `action` | 公共动作语义未定。 |
| `avatar` | `defer` | `identity/media` | 需要 image/fallback/resource policy。 |
| `breadcrumb` | `defer` | `navigation` | 更像导航壳层。 |
| `pagination` | `defer` | `navigation` | 应用分页胜过 artifact 内容表达。 |
| `native-select` | `defer` | `choice-native` | 与 `select` 语义重叠，暂不单独开放。 |
| `collapsible` | `defer` | `disclosure` | 与 `accordion` 接近，但当前未单独开放单项 disclosure block。 |
| `typography` | `defer` | `text-block` | 与现有文本/标题语义重叠，暂不引入 shadcn preset。 |
| `empty` | `defer` | `feedback-block` | 可先由 `alert`、`card`、普通文本组合表达。 |
| `kbd` | `defer` | `token` | 语义价值有限，当前不是高优先级 artifact block。 |
| `skeleton` | `do-not-expose` | `loading-state` | 占位态，不是稳定内容。 |
| `spinner` | `do-not-expose` | `loading-state` | 运行中反馈，不是 document-stable 内容。 |
| `scroll-area` | `do-not-expose` | `layout-mechanic` | 视口/滚动机制。 |
| `resizable` | `do-not-expose` | `layout-mechanic` | 尺寸调整机制。 |
| `toggle` | `do-not-expose` | `action` | 单个 toggle 语义不稳定。 |
| `dropdown-menu` | `do-not-expose` | `menu` | 应用操作入口。 |
| `menubar` | `do-not-expose` | `menu` | 应用壳菜单。 |
| `context-menu` | `do-not-expose` | `menu` | 依赖右键和上下文动作入口。 |
| `navigation-menu` | `do-not-expose` | `navigation` | 应用壳导航。 |
| `command` | `do-not-expose` | `menu` | 命令面板属于应用命令入口。 |
| `toast` | `do-not-expose` | `contextual-feedback` | 瞬时反馈，不是 artifact 稳定内容。 |
| `carousel` | `do-not-expose` | `switcher` | 依赖 drag/selection/runtime behavior，不适合作为稳定文档块。 |

这些组件之所以仍在当前 contract 外，一部分深层原因正是隔离成本更高：

- overlay / contextual reveal 组件依赖 trigger、portal、focus trap、open state
  和 fallback 语义。
- 若没有新的 archetype，很难同时做到“标准化使用层”与“受控配置层”。
- 在隔离边界没证明之前，不应用“先安装到 runtime”替代“进入 public contract”。

## Why Shadcn Works For This Separation

基于 shadcn 的组件特点，实现“定制”和“使用”隔离的核心方式是：

1. 把 shadcn 当作实现底座，不当作公开协议。
   `Card`、`TabsList`、`TabsTrigger`、`SelectContent`、`AccordionTrigger`
   这类 exports 属于实现层，不直接进入 agent-facing vocabulary。

2. 用 archetype 吃掉实现细节，不用完整 props 直通。
   但 archetype 不能为了复用而压平真实家族差异。当前实现层现在已显式拆分
   `text-field`、`toggle-field`、`slider-field`、`choice-group`、
   `choice-inline`、`select-overlay`、`combobox-input`；spec 语义层继续以
   `text-field`、`toggle-field`、`range-field`、`choice-group`、
   `choice-inline`、`select-overlay`、`combobox-input` 做诚实归类。

3. 用语义 prop 映射少量视觉含义，而不是开放 shadcn `variant`。
   例如 `alert.tone -> Alert variant`、`badge.tone -> Badge variant`
   可以存在，但映射规则应由 renderer / config 层维护。

4. 把 document style reference、其 global style tokens 和 component
   treatment 留给配置层或内部映射层。公开 surface 只暴露当前 `style-ref`，
   不应被扩写成通用视觉参数面。

5. 把组合结构和 state wiring 锁在实现层。
   `tabs` 的 trigger/content、`select` 的 trigger/content/item、`accordion`
   的 item/trigger/content 组合必须由 adapter 固定生成，而不是让 agent 或样式配置改写。

6. spec 记录的家族必须诚实反映官方组合边界。
   例如 `checkbox` / `switch` 不应仅因与文本字段共享少量 props 就归入同一诚实家族；
   `radio-group` 不应与 `toggle-group`、`select`、`combobox` 混成单一
   “option set” 概念；`select` 与 `combobox` 也不应继续共用同一
   overlay family 名字来掩盖 input/listbox 结构差异。

## Current State

- `combobox`、`select`、`radio-group` 和 `slider` 这一批 renderer honest-family
  校准已关闭。
- 当前 artifact-focused support surface 已稳定。
- 当前 lane 不包含 overlay、menu、navigation 或 app-shell 语义。
- 当前公开 render-config 只通过 `style-ref` 暴露 document-level style
  reference。
- 本文出现的组件级 visual mapping 仅是内部设计指导，不是当前 schema 已开放
  能力，也不是 future public config 承诺。
- 当前无 active shadcn debt；只有在未来升级导致本地 fixture drift 时再重开。

## components list

| Components      | surface_level | semantic_role | component_form   | visibility_model  | trigger_modality | state_dependency | resource_dependency |
|-----------------|---------------|---------------|------------------|-------------------|------------------|------------------|---------------------|
| Calendar        | control       | selection     | choice-group     | always-visible    | click-tap        | selection-state  | environment         |
| Date Picker     | control       | selection     | choice-overlay   | overlay-reveal    | click-tap        | selection-state  | environment         |
| Checkbox        | control       | input         | field-toggle     | always-visible    | click-tap        | input-state      | none                |
| Switch          | control       | input         | field-toggle     | always-visible    | click-tap        | input-state      | none                |
| Slider          | control       | input         | field-range      | always-visible    | drag-resize      | input-state      | none                |
| Textarea        | control       | input         | field-multiline  | always-visible    | text-entry       | input-state      | none                |
| Input OTP       | control       | input         | field-segmented  | always-visible    | text-entry       | input-state      | none                |
| Input           | control       | input         | field-single     | always-visible    | text-entry       | input-state      | none                |
| Radio Group     | control       | selection     | choice-group     | always-visible    | click-tap        | selection-state  | none                |
| Toggle Group    | control       | selection     | choice-inline    | always-visible    | click-tap        | selection-state  | none                |
| Native Select   | control       | selection     | choice-native    | always-visible    | click-tap        | selection-state  | none                |
| Pagination      | control       | navigation    | structured-block | always-visible    | click-tap        | selection-state  | none                |
| Select          | control       | selection     | choice-overlay   | overlay-reveal    | click-tap        | selection-state  | none                |
| Button          | control       | action        | token            | always-visible    | click-tap        | stateless        | none                |
| Combobox        | control       | selection     | choice-overlay   | overlay-reveal    | click-tap        | selection-state  | runtime-behavior    |
| Button Group    | helper        | structure     | group-shell      | always-visible    | none             | stateless        | none                |
| Field           | helper        | structure     | group-shell      | always-visible    | none             | stateless        | none                |
| Input Group     | helper        | structure     | group-shell      | always-visible    | none             | stateless        | none                |
| Item            | helper        | structure     | item-node        | always-visible    | none             | stateless        | none                |
| Aspect Ratio    | helper        | layout        | layout-helper    | always-visible    | none             | stateless        | none                |
| Label           | helper        | utility       | utility-node     | always-visible    | none             | stateless        | none                |
| Accordion       | public-block  | structure     | disclosure       | expandable        | click-tap        | open-close-state | none                |
| Collapsible     | public-block  | structure     | disclosure       | expandable        | click-tap        | open-close-state | none                |
| Tabs            | public-block  | structure     | switcher         | toggle-reveal     | click-tap        | selection-state  | none                |
| Alert           | public-block  | feedback      | container        | always-visible    | none             | stateless        | none                |
| Card            | public-block  | structure     | container        | always-visible    | none             | stateless        | none                |
| Separator       | public-block  | structure     | divider          | always-visible    | none             | stateless        | none                |
| Table           | public-block  | display       | structured-block | always-visible    | none             | stateless        | none                |
| Typography      | public-block  | display       | text-block       | always-visible    | none             | stateless        | none                |
| Empty           | public-block  | feedback      | text-block       | always-visible    | none             | stateless        | none                |
| Badge           | public-block  | display       | token            | always-visible    | none             | stateless        | none                |
| Kbd             | public-block  | display       | token            | always-visible    | none             | stateless        | none                |
| Progress        | public-block  | feedback      | token            | always-visible    | none             | stateless        | none                |
| Direction       | runtime-only  | utility       | utility-node     | always-visible    | none             | stateless        | environment         |
| Avatar          | runtime-only  | display       | token            | always-visible    | none             | stateless        | media               |
| Toggle          | runtime-only  | action        | token            | always-visible    | click-tap        | input-state      | none                |
| Popover         | runtime-only  | overlay       | contextual-shell | overlay-reveal    | click-tap        | open-close-state | none                |
| Dropdown Menu   | runtime-only  | action        | menu-shell       | overlay-reveal    | click-tap        | open-close-state | none                |
| Menubar         | runtime-only  | action        | menu-shell       | overlay-reveal    | click-tap        | open-close-state | none                |
| Alert Dialog    | runtime-only  | overlay       | modal-shell      | overlay-reveal    | click-tap        | open-close-state | none                |
| Dialog          | runtime-only  | overlay       | modal-shell      | overlay-reveal    | click-tap        | open-close-state | none                |
| Drawer          | runtime-only  | overlay       | panel-shell      | overlay-reveal    | click-tap        | open-close-state | none                |
| Sheet           | runtime-only  | overlay       | panel-shell      | overlay-reveal    | click-tap        | open-close-state | none                |
| Hover Card      | runtime-only  | overlay       | contextual-shell | contextual-reveal | hover-focus      | open-close-state | none                |
| Tooltip         | runtime-only  | overlay       | contextual-shell | contextual-reveal | hover-focus      | open-close-state | none                |
| Sidebar         | runtime-only  | navigation    | panel-shell      | always-visible    | none             | open-close-state | none                |
| Context Menu    | runtime-only  | action        | menu-shell       | contextual-reveal | right-click      | open-close-state | none                |
| Navigation Menu | runtime-only  | navigation    | menu-shell       | overlay-reveal    | click-tap        | selection-state  | none                |
| Data Table      | runtime-only  | display       | structured-block | always-visible    | none             | stateless        | none                |
| Chart           | runtime-only  | display       | structured-block | always-visible    | none             | stateless        | none                |
| Breadcrumb      | runtime-only  | navigation    | structured-block | always-visible    | none             | stateless        | none                |
| Resizable       | runtime-only  | layout        | layout-helper    | always-visible    | drag-resize      | viewport-state   | none                |
| Scroll Area     | runtime-only  | layout        | layout-helper    | always-visible    | scroll           | viewport-state   | none                |
| Skeleton        | runtime-only  | feedback      | token            | always-visible    | none             | async-state      | runtime-behavior    |
| Spinner         | runtime-only  | feedback      | token            | always-visible    | none             | async-state      | runtime-behavior    |
| Command         | runtime-only  | action        | menu-shell       | overlay-reveal    | keyboard-command | open-close-state | runtime-behavior    |
| Sonner          | runtime-only  | feedback      | contextual-shell | overlay-reveal    | none             | open-close-state | runtime-behavior    |
| Toast           | runtime-only  | feedback      | contextual-shell | overlay-reveal    | none             | open-close-state | runtime-behavior    |
| Carousel        | runtime-only  | navigation    | switcher         | toggle-reveal     | drag-resize      | selection-state  | runtime-behavior    |
