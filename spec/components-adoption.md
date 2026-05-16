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

Renderer archetypes:

- `primitive`: 单根导出、轻量 props。
- `compound`: 标题/内容容器。
- `field-control`: 单字段控件。
- `option-set`: 单选项集控件。
- `collection`: 原生集合结构。
- `table`: row/cell 分层结构。
- `tabs`: trigger/content 切换结构。
- `interactive-collection`: item/trigger/content 交互集合。

Status:

- `supported`
- `needs-archetype`
- `defer`
- `do-not-expose`

## Layer Separation Guidance

当前 shipped compatibility surface 仍通过命名 `profile` 暴露公共视觉入口：

- agent-facing render config 当前仍只有命名 `profile`。
- `profile` 应被视为 approved `DocumentStyleConfigReference` 的兼容别名，
  不是 theme token 集合，也不是 per-component variant 集合。
- `theme`、`density`、`tone`、`width` 继续是 resolved internal tokens，不是
  agent-facing config vocabulary。
- 本节定义的是长期分层原则与内部 visual mapping guardrails，
  不是当前 prompt / schema 已开放的自由参数面，也不意味着未来会开放组件级
  public style 参数。

推荐维持三层隔离：

| Layer | Owns | Can decide | Must not decide |
| --- | --- | --- | --- |
| `usage layer` | agent-facing schema / `.agent.html` | 组件名、语义 props、slot / child 结构、稳定值 | theme、radius、spacing、variant、Tailwind class、shadcn props |
| `configuration layer` | approved document style config reference | 文档级视觉入口，以及它触发的受控视觉策略集 | 组件语义、允许 children、trigger 结构、fallback 行为、per-component public knobs、任意 CSS 逃逸 |
| `implementation layer` | renderer / managed runtime / shadcn | 具体 exports、variant 映射、Tailwind、Radix/Base UI 组合细节 | agent-facing contract 或文档写作协议 |

参数归类规则：

- 属于内容意义、结构意义、稳定 identity 或稳定选择状态的参数，进入
  `usage layer`。
- 只影响最终视觉实现，但不改变语义树和交互边界的参数，不进入 public
  `usage layer`；当前应由 document-level config reference 经过内部 visual
  mapping 间接决定。
- 依赖 shadcn 组合方式、Radix / Base UI state wiring、`cva` variants、
  Tailwind class 或内部 exports 的参数，留在 `implementation layer`。

文档级配置层长期保持“外部引用”模型：

- 文档只引用一个 approved `DocumentStyleConfigReference`；当前 compatibility
  surface 可继续使用命名 `profile` 指向该引用。
- 真实的 per-component 视觉规则属于内部 visual mapping，不进入正文积木协议，
  也不形成单独的 public config key。
- 同一语义组件在不同 document style reference 下可以换视觉实现，但不得换
  语义、结构或 renderer kind。

## Supported Today

| Component | Archetype | Note |
| --- | --- | --- |
| `alert` | `compound` | 稳定 callout 语义。 |
| `badge` | `primitive` | 稳定短状态标签。 |
| `progress` | `primitive` | 只读数值进度展示。 |
| `input` | `field-control` | 共享文本字段 contract。 |
| `textarea` | `field-control` | 共享多行文本字段 contract。 |
| `checkbox` | `field-control` | 布尔确认字段。 |
| `switch` | `field-control` | 布尔偏好切换字段。 |
| `slider` | `field-control` | 数值偏好字段。 |
| `radio-group` | `field-control` | 通过 `option` 子节点表达单组选项。 |
| `toggle-group` | `option-set` | 内联单选项集。 |
| `select` | `option-set` | 受控单选选择器。 |
| `combobox` | `option-set` | searchable single-select。 |
| `card` | `compound` | 分组内容容器。 |
| `separator` | `primitive` | 语义分隔符。 |
| `table` | `table` | 结构化证据表格。 |
| `tabs` | `tabs` | 多视图切换结构。 |
| `accordion` | `interactive-collection` | 折叠分组结构。 |

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
| `checkbox` / `switch` | `label`、`checked`、`description` | control chrome、track/thumb/check treatment、field spacing | controlled state wiring、implementation props |
| `slider` | `label`、`value`、`description` | track / thumb treatment、field spacing、numeric emphasis | controlled state wiring、implementation props |
| `radio-group` | `label`、`value`、`description`、`option.value`、`option.label` | option spacing、selected/unselected treatment、group shell chrome | group wiring、shadcn item composition |
| `toggle-group` | `label`、`value`、`description`、`option.value`、`option.label` | option spacing、active/inactive treatment、group shell chrome | controlled selection wiring、group/item implementation |
| `select` / `combobox` | `label`、`value`、`description`、`option.value`、`option.label` | trigger visual、panel visual、item hover/selected treatment、empty-state treatment | `defaultValue`、`placeholder`、list / trigger / content implementation、overlay / collection state wiring |
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
| `button` | `defer` | `action` | 公共动作语义未定。 |
| `avatar` | `defer` | `identity/media` | 需要 image/fallback/resource policy。 |
| `breadcrumb` | `defer` | `navigation` | 更像导航壳层。 |
| `pagination` | `defer` | `navigation` | 应用分页胜过 artifact 内容表达。 |
| `skeleton` | `do-not-expose` | `loading-state` | 占位态，不是稳定内容。 |
| `scroll-area` | `do-not-expose` | `layout-mechanic` | 视口/滚动机制。 |
| `resizable` | `do-not-expose` | `layout-mechanic` | 尺寸调整机制。 |
| `toggle` | `do-not-expose` | `action` | 单个 toggle 语义不稳定。 |
| `dropdown-menu` | `do-not-expose` | `menu` | 应用操作入口。 |
| `menubar` | `do-not-expose` | `menu` | 应用壳菜单。 |
| `navigation-menu` | `do-not-expose` | `navigation` | 应用壳导航。 |

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

2. 用 archetype 吃掉组件差异，不用完整 props 直通。
   当前 `compound`、`field-control`、`option-set`、`table`、`tabs`、
   `interactive-collection` 已经在承担这件事。

3. 用语义 prop 映射少量视觉含义，而不是开放 shadcn `variant`。
   例如 `alert.tone -> Alert variant`、`badge.tone -> Badge variant`
   可以存在，但映射规则应由 renderer / config 层维护。

4. 把 document style reference、其 resolved tokens，以及 surface treatment
   留给配置层或内部映射层。当前 compatibility `profile` 只是 document style
   reference alias，不应被扩写成通用视觉参数面。

5. 把组合结构和 state wiring 锁在实现层。
   `tabs` 的 trigger/content、`select` 的 trigger/content/item、`accordion`
   的 item/trigger/content 组合必须由 adapter 固定生成，而不是让 agent 或样式配置改写。

## Current State

- `combobox`、`switch` 和 `slider` 这一批 grouped adoption 已关闭。
- 当前 artifact-focused support surface 已稳定。
- 当前 lane 不包含 overlay、menu、navigation 或 app-shell 语义。
- 当前公开 render-config 仍是 `profile` 唯一入口；它是 document-level style
  reference 的兼容入口，不是 theme / variant token surface。
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
