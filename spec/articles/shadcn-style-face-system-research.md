# 从 shadcn 到捏脸式 Style 系统的研究备忘录

## 摘要

本文保留当前这轮关于“从 shadcn 抽取可控视觉参数，并演化出捏脸式
style/ui 配置系统”的研究背景、证据与分析材料。当前重构指导与公开路线以
`spec/map.md` 为准；本文只作为研究参考附录。

本研究关注的问题不是“如何把 shadcn 的完整 props 暴露给 agent 或用户”，
而是“如何在不破坏 usage/configuration/implementation 三层隔离的前提下，
从 shadcn 文档、preset、CSS token 和组件 recipe 中抽取出稳定的视觉参数轴，
让用户能够像配置皮肤细节、像捏脸一样配置 UI 风格”。

本文是研究备忘录，不是 architecture authority，也不是新的 public contract。
架构权威仍以 `blueprint/` 为准。

## 研究背景

agent-html 的长期方向是让 agent 输出可读、可分享、可归档、可回到协作闭环的
HTML artifact，而不是继续把视觉和实现噪声堆回 agent 侧。

按 `blueprint/constitution.md`，系统应降低 agent 的无效认知负担，让 agent
专注于内容结构和信息关系，而不是反复处理低语义、易出错的样式和实现细节。

按 `blueprint/architecture-design/architecture.md`，应把“用什么积木表达内容”
和“这些积木最终呈现成什么视觉风格”视为两类问题：前者属于
agent-facing usage layer，后者属于独立 configuration layer。当前产品边界
坚持 configuration-isolated，而不是让 agent 直接操作完整视觉参数包。

当前 shipped implementation 已经完成 artifact-focused pass。公开 visual
config 当前仍只有 document-level `style-ref`。这意味着用户今天对外仍主要是
“选择整套 preset”，而不是直接编辑细粒度皮肤参数。

研究动机来自一个新的需求方向：希望用户未来能够以更细粒度的方式定制 style
和 UI 皮肤细节，但又不能简单退化成开放 `className`、Tailwind、
Radix props 或 shadcn 原始 props 的自由输入面。

## 当前架构边界

当前边界可以概括为三层隔离：

| Layer | Owns | Main responsibility |
| --- | --- | --- |
| `usage layer` | agent-facing schema / `.agent.html` | 表达组件名、语义 props、稳定结构和内容关系 |
| `configuration layer` | approved document style config reference | 选择文档级视觉入口，并触发受控视觉策略 |
| `implementation layer` | renderer / managed runtime / shadcn | 承担 exports、variant 映射、Tailwind、Radix/Base UI wiring 等实现细节 |

这里最关键的约束有三条：

1. `implementation layer` 是内部渲染实现层，不是公开使用层。
2. `configuration layer` 拥有视觉选择权，但必须先收束为已批准的
   document style config reference，再进入 renderer。
3. `usage layer` 不应直接承接 `variant`、`size`、`className`、Tailwind class、
   Radix props 或 shadcn props。

因此，这轮研究必须尊重一个前提：即便未来要做“捏脸式 style 系统”，它也应当
作为 configuration layer 的增强，而不是把 implementation layer 直接泄漏到
agent-facing protocol。

## 当前实现现状

### 当前公开可配置面

当前公开 render-config 只有一个 key：`style-ref`。

在实现上，它当前只有三种允许值：

- `report-default`
- `ops-compact`
- `review-dense`

它们在内部被解析成 `RenderConfig`：

- `theme`
- `density`
- `tone`
- `width`

当前代码中的映射如下：

| `style-ref` | `theme` | `density` | `tone` | `width` |
| --- | --- | --- | --- | --- |
| `report-default` | `neutral` | `comfortable` | `report` | `article` |
| `ops-compact` | `neutral` | `compact` | `dashboard` | `dashboard` |
| `review-dense` | `neutral` | `compact` | `decision` | `wide` |

换句话说，今天对外还只是 preset 选择器，不是细粒度皮肤系统。

### 当前 runtime 真正消费的配置

runtime template 当前直接把 document meta 写到 `<main>` 的 data attributes：

- `data-theme`
- `data-density`
- `data-tone`
- `data-width`

同时，shell class 只根据 `density`、`tone`、`width` 拼出有限的 layout /
spacing / posture 差异。

这说明一个现实约束：当前 `RenderConfig` 太薄，还不足以直接承接更丰富的
视觉配置能力。

## 为什么选择 shadcn 作为研究入口

选择 shadcn 不是因为它天然就是 public protocol，而是因为它同时提供了三类
非常有价值的实现材料：

1. `preset / project config`
2. `theme tokens / css variables`
3. `component recipe / slots / variants`

shadcn 对 agent-html 的价值不在于“把 shadcn 原样开放出去”，而在于：

- 它已经把大量 UI 组件组织成稳定的 recipe；
- 它大量使用 design token、semantic color 和 `cva` 变体；
- 它允许我们从实际组件代码中抽取变体、slot 和结构信息；
- 它的 preset / style / baseColor / radius / font 等配置，天然接近“皮肤 DNA”。

因此，shadcn 更适合被看作 implementation layer 的强数据源，而不是最终公开
协议本身。

## 从 shadcn 可以抽取什么

### 1. 项目 / preset 层

当前 `apps/agent-html-app/components.json` 与 `npx shadcn@latest info` 已经暴露了
一批项目级皮肤参数：

- `style`
- `baseColor`
- `theme`
- `font`
- `fontHeading`
- `radius`
- `menuColor`
- `menuAccent`
- `iconLibrary`

这些参数不属于单个组件，而更像一个设计系统 preset 的 DNA。它们适合用来定义
“大皮肤方向”，而不是逐组件交互行为。

### 2. CSS token 层

当前 `apps/agent-html-app/src/styles.css` 已经有一整套基于 CSS variables 的
token surface，例如：

- `--background`
- `--foreground`
- `--card`
- `--card-foreground`
- `--primary`
- `--primary-foreground`
- `--muted`
- `--muted-foreground`
- `--destructive`
- `--border`
- `--input`
- `--ring`
- `--chart-*`
- `--sidebar-*`
- `--radius`

`@theme inline` 又把这些变量映射进 Tailwind v4 语义 token 中，并从
`--radius` 派生出一整套 radius scale。

这层参数非常适合成为“捏脸系统”的主入口，因为：

- 它们是跨组件复用的；
- 它们稳定，不依赖某个具体 export 名称；
- 它们更接近设计系统参数，而不是组件实现噪声；
- 它们能影响整体视觉而不必直接暴露每个组件的细枝末节。

### 3. 组件 recipe 层

从实际 shadcn 组件源码和 introspection 可以继续抽出 recipe 信息。

当前仓库已经能抽取：

- `exports`
- `slots`
- `variantProps`
- `unionProps`
- `blockedProps`
- `dependencies`
- `registryDependencies`

例如：

- `button` 已有 `variant` 和 `size`
- `badge` 已有 `variant`
- `tabs` 已有 `variant`
- `select` 已有 `size`
- `switch` 已有 `size`

在实际组件代码里，`button.tsx`、`badge.tsx`、`tabs.tsx` 都通过 `cva(...)`
维护变体，并通过 `data-variant`、`data-size` 等 data attributes 标出 recipe
选择。也就是说，“原始实现参数”实际上已经能被稳定发现和读取。

## 当前系统已经做了一半

这轮研究最重要的发现之一是：当前系统并不是“还不会抽参数”，而是“已经能抽，
但当前产品边界故意不把它们对外暴露”。

已有证据包括：

1. `GeneratedShadcnIntrospection` 已存下了 `variantProps` / `unionProps` /
   `slots` 等实现信息。
2. `schema-overlays.ts` 又把大量实现参数藏回内部层，例如：
   `variant`、`size`、`defaultValue`、`open`、`placeholder`、`className`。
3. `component-capabilities.mjs` 已经在做“语义 prop -> 实现 prop”的映射，例如：
   - `alert.tone -> Alert.variant`
   - `badge.tone -> Badge.variant`

这说明方向已经很清楚：真正合理的路线不是“直接透传 shadcn props”，而是
“通过配置层和 renderer 维护一层稳定映射”。

## 技术可行性判断

### 高可行

以下方向技术上高可行：

- 全局皮肤系统
- 文档级 style profile
- 基于 token 的颜色 / radius / typography / density 配置
- 少量高价值组件的受控视觉 treatment 切换

原因是这些能力主要依赖：

- shadcn preset / config
- css variables
- 少量 renderer 层映射

它们对 usage layer 的破坏最小，也最符合当前 architecture 的方向。

### 中高可行

以下方向技术上中高可行：

- 受控的组件级“捏脸”
- 基于 archetype 或 component family 的 treatment 配置
- 把 button / badge / card / alert / tabs / table / input 等高频组件抽成
  统一视觉轴

难点不在实现本身，而在“视觉语义归一”：要先决定哪些 recipe 应被折叠进同一条
参数轴，哪些必须继续保留为内部实现差异。

### 中低可行

以下方向技术上中低可行：

- 直接把 shadcn 原始 `variant` / `size` 当作公开 config vocabulary
- 允许逐组件透传原始 props

原因是：

- 同名 `variant` 在不同组件里含义不一致；
- 很多组件的 `size` 并不是统一尺度；
- 很多 props 带着结构和行为含义，不只是视觉选择；
- 一旦对外公开，后续组件升级和迁移成本会大幅上升。

### 不建议

以下方向不建议：

- 自由 `className`
- 自由 Tailwind class
- 自由 CSS token passthrough
- Radix/Base UI props 直接暴露
- 每个组件都开放完整自定义面

这类做法会直接破坏三层隔离，把 implementation layer 重新变成 public surface。

## 关键判断：应抽取“规范化视觉轴”，而不是原始 props

这轮研究的核心结论是：

> 从 shadcn 中真正应该抽出来的，不是完整原始 props，而是经过语义归一后的、
> 可跨组件复用的“规范化视觉轴”。

原因很简单：

- 原始 `variant` 名称高度组件私有；
- 原始 `size` 名称常常不具备统一语义；
- `className`、Tailwind class、state wiring 明显属于实现层；
- 不同组件的 visual recipe 只能部分共享。

如果未来要做“捏脸式 style 系统”，最合理的形式不是：

```txt
user config -> raw shadcn props
```

而是：

```txt
user config -> normalized style axes -> component recipe mapping
```

## 建议的最小参数模型

以下是当前阶段最值得研究和优先落地的一组参数轴：

### 全局轴

- `palette`
  - 背景、前景、主色、弱色、危险色、边框、ring
- `radius`
  - 全局圆角尺度
- `density`
  - 控件高度、块间距、整体内容密度
- `width`
  - 文档内容宽度
- `typography`
  - body font、heading font、字号梯度、字重倾向
- `emphasis`
  - report / dashboard / decision 一类整体语气

### 表面与结构轴

- `surface`
  - flat / soft / outlined / elevated
- `borderStrength`
  - hairline / normal / strong
- `shadowDepth`
  - none / soft / medium / strong
- `contrastProfile`
  - muted / balanced / strong

### 组件 treatment 轴

- `buttonTreatment`
- `badgeTreatment`
- `alertTreatment`
- `cardTreatment`
- `tableTreatment`
- `inputTreatment`
- `tabsTreatment`

这些 treatment 不应直接等于某个组件的原始 `variant` 名称，而应由内部映射层
决定其如何落到 `variant`、data attr、CSS token 或组合 class 上。

## 不建议直接开放的参数

以下参数即使可以从 shadcn 或 runtime 中抽出来，也不建议进入公开“捏脸系统”：

- `className`
- Tailwind class
- inline `style`
- Radix props
- Base UI props
- `asChild`
- `open`
- `defaultValue`
- `value` 这类 runtime controlled API
- 逐组件自由 CSS passthrough
- 每个组件各自命名的原始 `variant`
- 每个组件各自命名的原始 `size`

不建议的原因不是“实现上做不到”，而是：

- 它们破坏分层隔离；
- 很难保证跨组件稳定语义；
- 会把 shadcn 升级成本和行为复杂度直接转嫁给 public contract。

## 研究路径观察

### 抽取层

目标：继续稳定提取 shadcn 中真正有价值的视觉结构数据。

重点对象：

- preset / style config
- css variables
- `cva` recipe
- `variantProps`
- `unionProps`
- `defaultVariants`
- slot graph
- data attributes

这一步的目标不是对外开放，而是把 implementation facts 抽完整、抽稳定。

### 归一层

目标：建立自己的 visual ontology，把 recipe 抽象成统一参数轴。

关键问题包括：

- 哪些组件共享同一条 treatment 轴
- 哪些原始 `variant` 只是局部实现名词
- 哪些 token 属于 palette / surface / emphasis / density / radius
- 哪些行为型 props 必须继续留在 implementation layer

这一步是整个研究路线中最重要、也最需要人工判断的一步。真正困难不在解析代码，
而在建立稳定 vocabulary。

### 映射层

目标：把规范化视觉轴映射回 document style config 与 renderer。

可能的映射路径包括：

- `DocumentStyleConfigReference -> DocumentStyleConfig`
- `DocumentStyleConfig -> resolved visual tokens`
- resolved tokens -> runtime shell / css variables
- resolved tokens -> component treatment mapping
- component treatment mapping -> recipe variant / slot treatment / class assembly

只有在这一步明确后，未来的“捏脸系统”才可能真正稳定落地。

## 适合优先覆盖的对象

若后续继续扩展研究或实验，较适合优先覆盖这些范围：

### 第一优先级

- 全局颜色 token
- radius
- typography
- density
- width

### 第二优先级

- `card`
- `alert`
- `badge`
- `table`
- `button`
- `input`
- `select`
- `tabs`

这些组件视觉收益高、语义相对稳定、实现上又已经能抽出较清晰 recipe。

## 暂不优先的对象

当前不建议优先作为“捏脸系统”第一批对象：

- `dialog`
- `popover`
- `tooltip`
- `hover-card`
- `combobox`
- overlay / contextual reveal 家族

原因不是它们永远不能做，而是它们的视觉、结构和行为耦合更重，往往依赖：

- trigger
- portal
- open state
- focus trap
- fallback policy

如果在 visual config 还没稳定前就把它们纳入“捏脸系统”，很容易把
configuration layer 重新拉回行为层。

## 仍待进一步研究的问题

以下问题本轮没有试图拍板，但它们会直接影响后续设计：

1. `componentTreatments` 应按 renderer archetype 归并，还是按组件族归并。
2. 是否允许极少量组件保留受控语义词，例如 `tone`。
3. 参数轴如何保持 stable vocabulary，避免 future migration 时产生平行概念。
4. config 变化应如何进入 schema / prompt，而不让 agent 重新背负实现噪声。
5. 未来的 style system 是只给内部 config author 使用，还是给终端用户直接编辑。

## 结论

从 shadcn 文档、preset、CSS token 和实际组件源码出发，构建一个“像皮肤细节、
像捏脸一样配置 UI 样式”的系统，技术上是可行的。

但正确路线不是“把 shadcn 原始 props 直接开放出来”，而是：

1. 从 shadcn 抽取 implementation facts；
2. 建立自己的规范化视觉参数轴；
3. 让 configuration layer 通过受控映射驱动 renderer 和 component recipe。

当前仓库已经具备了抽取 recipe 的一部分底层能力；真正还没有完成的，是更厚的
config model，以及一套足够稳定的 visual ontology。

因此，本研究的最终判断是：

> 这条路可行，但应当走“受控视觉轴”路线，而不是走“原始 props 外露”路线。

## 参考来源

权威架构边界：

- `blueprint/constitution.md`
- `blueprint/architecture-design/architecture.md`
- `blueprint/architecture-design/invariants.md`

当前 spec 与产品现状：

- `spec/map.md`
- `spec/components-adoption.md`

实现现状与研究证据：

- `packages/core/src/render-config.ts`
- `packages/core/src/generated/component-schema.generated.ts`
- `packages/core/src/schema-overlays.ts`
- `packages/ahtml/src/config/component-capabilities.mjs`
- `packages/ahtml/src/cli/runtime-template/src/app.tsx`
- `apps/agent-html-app/components.json`
- `apps/agent-html-app/src/styles.css`
