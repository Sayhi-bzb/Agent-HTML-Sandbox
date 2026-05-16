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

## Current State

- `combobox`、`switch` 和 `slider` 这一批 grouped adoption 已关闭。
- 当前 artifact-focused support surface 已稳定。
- 当前 lane 不包含 overlay、menu、navigation 或 app-shell 语义。
- 当前无 active shadcn debt；只有在未来升级导致本地 fixture drift 时再重开。

## components list

| Components      | semantic_role | visibility_model |
|-----------------|---------------|------------------|
| Accordion       | structure     | expandable       |
| Alert           | feedback      | always-visible   |
| Alert Dialog    | overlay       | overlay-reveal   |
| Aspect Ratio    | layout        | always-visible   |
| Avatar          | display       | always-visible   |
| Badge           | display       | always-visible   |
| Breadcrumb      | navigation    | always-visible   |
| Button          | action        | always-visible   |
| Button Group    | action        | always-visible   |
| Calendar        | selection     | always-visible   |
| Card            | structure     | always-visible   |
| Carousel        | navigation    | toggle-reveal    |
| Chart           | display       | always-visible   |
| Checkbox        | input         | always-visible   |
| Collapsible     | structure     | expandable       |
| Combobox        | selection     | overlay-reveal   |
| Command         | action        | overlay-reveal   |
| Context Menu    | action        | contextual-reveal |
| Data Table      | display       | always-visible   |
| Date Picker     | selection     | overlay-reveal   |
| Dialog          | overlay       | overlay-reveal   |
| Direction       | utility       | always-visible   |
| Drawer          | overlay       | overlay-reveal   |
| Dropdown Menu   | action        | overlay-reveal   |
| Empty           | feedback      | always-visible   |
| Field           | structure     | always-visible   |
| Hover Card      | overlay       | contextual-reveal |
| Input           | input         | always-visible   |
| Input Group     | structure     | always-visible   |
| Input OTP       | input         | always-visible   |
| Item            | structure     | always-visible   |
| Kbd             | display       | always-visible   |
| Label           | utility       | always-visible   |
| Menubar         | action        | overlay-reveal   |
| Native Select   | selection     | overlay-reveal   |
| Navigation Menu | navigation    | overlay-reveal   |
| Pagination      | navigation    | always-visible   |
| Popover         | overlay       | overlay-reveal   |
| Progress        | feedback      | always-visible   |
| Radio Group     | selection     | always-visible   |
| Resizable       | layout        | always-visible   |
| Scroll Area     | layout        | always-visible   |
| Select          | selection     | overlay-reveal   |
| Separator       | structure     | always-visible   |
| Sheet           | overlay       | overlay-reveal   |
| Sidebar         | navigation    | always-visible   |
| Skeleton        | feedback      | always-visible   |
| Slider          | input         | always-visible   |
| Sonner          | feedback      | overlay-reveal   |
| Spinner         | feedback      | always-visible   |
| Switch          | input         | always-visible   |
| Table           | display       | always-visible   |
| Tabs            | structure     | toggle-reveal    |
| Textarea        | input         | always-visible   |
| Toast           | feedback      | overlay-reveal   |
| Toggle          | action        | always-visible   |
| Toggle Group    | selection     | always-visible   |
| Tooltip         | overlay       | contextual-reveal |
| Typography      | display       | always-visible   |
