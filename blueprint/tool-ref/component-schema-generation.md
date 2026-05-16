# Component Schema Generation Tool Reference

本文记录 agent-html 在 component schema generation 层的采购判断。正式边界以 `architecture-design/architecture.md`、`architecture-design/invariants.md` 和 contracts 为准。

## Decision

采购显式语义 contract + document style config 声明作为 ComponentSchema 主路径。兼容期可保留 presentation profile 声明作为 alias 层。

采购 shadcn runtime facts 作为内部校验、renderer registry 输入和 drift check 支撑，而不是作为 agent-facing schema 主来源。

核心判断：

```txt
semantic component declaration supplies the public contract.
document style config declaration supplies the public visual choices.
managed runtime components.json supplies shadcn config.
shadcn registry supplies item metadata, dependencies, files, docs links.
component AST supplies exports, data-slot, blocked/internal prop candidates.
generated runtime verification facts supply verification and drift checks.
standardized component schema supplies fixed components, semantic props, and slots.
document style config catalog supplies approved visual config options.
TSDoc supplies optional annotation convention.
TypeDoc and ts-morph stay extraction helpers, not contract authority.
React docgen and Storybook stay auxiliary.
```

## Fit

推荐公开路径：

```txt
semantic component declaration
        +
document style config declaration
        ↓
contract mapper
        ↓
ComponentSchema + ComponentPropSchema + ComponentToken + DocumentStyleConfigReference
```

推荐内部校验路径：

```txt
shadcn registry / managed runtime components.json / component source
        ↓
generated runtime verification facts
        ↓
contract verification + renderer registry inputs + drift check
```

辅助声明路径：

```txt
standard component declaration
        ↓
TSDoc comments + custom tags
        ↓
TypeDoc JSON
        ↓
overlay / docs enrichment
```

采购分工：

- semantic declaration / overlay: 暴露哪些组件、语义 prop 如何命名、slot 结构、children 边界、profile / style config 兼容性和示例。
- document style config declaration: 暴露哪些文档级视觉配置入口可用，以及它们可解析到哪些受控视觉 token。兼容期命名 profile 只是 alias 层。
- managed runtime `components.json`: style、base、aliases、iconLibrary、preset 和 registry 配置。
- `shadcn registry`: registry item metadata、dependencies、registryDependencies、files 和 docs links。
- `ts-morph`: TypeScript AST / type checker precision extraction。
- `TSDoc`: agent-facing 注释约定。
- `TypeDoc`: declaration extraction 和 JSON 中间产物。
- `react-docgen*`: renderer props audit。
- `Storybook`: human component workshop。

## Automation Boundary

可自动抽取：

- installed components。
- exported component names。
- `data-slot` values。
- registry metadata、dependencies、registryDependencies、files、docs links。
- internal / blocked prop candidates，例如 `className`、`style`、DOM events、Radix props、`asChild`。
- required CSS/base surface identity、required exports 和 runtime drift facts。
- 可选的 `cva` variants、literal union props 或其他实现细节，作为 review inputs，而不是公开 contract。

必须由显式声明决定：

- 组件是否 expose 给 agent。
- 语义 prop 名称和允许 values。
- slot 合法结构。
- children 边界。
- 复杂数据 schema。
- profile id、profile 描述和 profile 兼容性。
- 哪些视觉实现差异要被折叠进 profile，而不是暴露成 agent-facing props。
- shadcn internal mapping。
- agent-facing 描述和示例。

## Not For

不从 renderer React props 直接生成 ComponentSchema。

不以“完整抽取 shadcn props / variants / unions”作为 schema 主路径。

不让完整 shadcn/ui props、Radix props、Tailwind 或 Storybook argTypes 成为 schema 权威。

不以组件源码作为 agent 学习常规用法的主路径。

不把 renderer theme object、Tailwind config 或 shadcn props 自动外泄为 document style config catalog、compatibility profile registry 或 RenderConfig。

不把 GeneratedShadcnIntrospection 直接发布为 agent-facing schema。

不让 schema generation 把 runtime Tailwind config、theme object 或 shadcn props 反向写入 core public surface。

## Specific Risks

- TypeDoc JSON 偏 API docs，必须经过 contract mapper 才能成为 agent-facing schema。
- 标准组件若照搬 shadcn props，会泄漏实现接口。
- document style config 或 compatibility profile alias 若照搬 renderer theme / Tailwind config，会泄漏实现接口。
- `cva` variants 若全部开放，会把样式自由度重新泄漏给 agent。
- `data-slot` 只能证明源码 slot 存在，不能单独证明合法嵌套结构。
- TSDoc custom tags 容易膨胀，应保持最小充分。
- react-docgen 容易诱导从 renderer props 反推 schema，只能用于辅助审计。
- schema generation 失败不能静默通过，否则 agent 会使用过期 contract。
- drift check 失败不能静默通过，否则声明会描述不存在或已变形的 runtime 能力。
- managed runtime 中的 shadcn 版本和组件来源可能漂移，drift check 应明确报告 contract requirement 与实际安装状态。

## Follow-up

实现前只需补查和当前声明设计直接相关的细节：

- GeneratedShadcnIntrospection 的最小 JSON 形态。
- ComponentSchemaOverlay 的最小声明形态。
- DocumentStyleConfigReference、DocumentStyleConfig 与 compatibility profile alias 的最小字段集合。
- standard component declaration 的最小声明形态。
- ComponentSchema / ComponentPropSchema 的最小字段集合。
- 哪些视觉 token 可以留在独立配置层内部，哪些必须完全隐藏。
- TSDoc custom tags 的最小集合。
- TypeDoc JSON 到 ComponentSchema / ComponentPropSchema 的映射边界。
- renderer adapter requirement 到 managed runtime shadcn install check 的映射边界。
