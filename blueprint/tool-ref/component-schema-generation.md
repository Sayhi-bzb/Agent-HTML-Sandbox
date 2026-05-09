# Component Schema Generation Tool Reference

本文记录 agent-html 在 component schema generation 层的采购判断。正式边界以 `architecture-design/architecture.md`、`architecture-design/invariants.md` 和 contracts 为准。

## Decision

采购 shadcn introspection + overlay 作为 ComponentSchema 生成主路径。

标准组件 schema 和 render config schema 由项目显式 overlay 收束。工具可以自动抽取草稿和执行 drift check，但不能替代白名单声明。

核心判断：

```txt
components.json supplies project shadcn config.
shadcn registry supplies item metadata, dependencies, files, docs links.
component AST supplies exports, data-slot, cva variants, literal union props.
generated shadcn introspection supplies the draft.
explicit schema overlay supplies the agent-facing whitelist.
standardized component schema supplies fixed components, props, and slots.
standardized render config schema supplies presentation profile options.
TSDoc supplies the annotation convention.
TypeDoc supplies the v1 JSON extraction path.
ts-morph supplies precision fallback.
React docgen and Storybook stay auxiliary.
```

## Fit

推荐主路径：

```txt
shadcn registry / components.json / component source
        ↓
generated shadcn introspection
        ↓
explicit schema overlay
        ↓
schema generation mapper
        ↓
ComponentSchema + ComponentPropSchema + ComponentToken
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

- `components.json`: style、base、aliases、iconLibrary、preset 和 registry 配置。
- `shadcn registry`: registry item metadata、dependencies、registryDependencies、files 和 docs links。
- `ts-morph`: TypeScript AST / type checker precision extraction。
- `class-variance-authority`: `cva` variants 和 defaultVariants 抽取目标。
- `TSDoc`: agent-facing annotation convention。
- `TypeDoc`: declaration extraction 和 JSON 中间产物。
- `react-docgen*`: renderer props audit。
- `Storybook`: human component workshop。

## Automation Boundary

可自动抽取：

- installed components。
- exported component names。
- `data-slot` values。
- `cva` variants 和 defaultVariants。
- literal union props。
- registry metadata、dependencies、registryDependencies、files、docs links。
- internal / blocked prop candidates，例如 `className`、`style`、DOM events、Radix props、`asChild`。

必须由 overlay 显式声明：

- 组件是否 expose 给 agent。
- 语义 prop 名称和允许 values。
- slot 合法结构。
- children 边界。
- 复杂数据 schema。
- shadcn internal mapping。
- agent-facing 描述和示例。

## Not For

不从 renderer React props 直接生成 ComponentSchema。

不让完整 shadcn/ui props、Radix props、Tailwind 或 Storybook argTypes 成为 schema 权威。

不以组件源码作为 agent 学习常规用法的主路径。

不把 renderer theme object、Tailwind config 或 shadcn props 自动外泄为 render config schema。

不把 generated shadcn introspection 直接发布为 agent-facing schema。

## Specific Risks

- TypeDoc JSON 偏 API docs，必须经过 schema mapper 才能成为 agent-facing schema。
- 标准组件若照搬 shadcn props，会泄漏实现接口。
- render config schema 若照搬 renderer theme / Tailwind config，会泄漏实现接口。
- `cva` variants 若全部开放，会把样式自由度重新泄漏给 agent。
- `data-slot` 只能证明源码 slot 存在，不能单独证明合法嵌套结构。
- TSDoc custom tags 容易膨胀，应保持最小充分。
- react-docgen 容易诱导从 renderer props 反推 schema，只能用于辅助审计。
- schema generation 失败不能静默通过，否则 agent 会使用过期 schema。
- drift check 失败不能静默通过，否则 overlay 会描述不存在或已变形的 shadcn 能力。

## Follow-up

实现前只需补查和当前声明设计直接相关的细节：

- generated shadcn introspection 的最小 JSON 形态。
- ComponentSchemaOverlay 的最小声明形态。
- standard component declaration 的最小声明形态。
- ComponentSchema / ComponentPropSchema 的最小字段集合。
- render config schema 的最小 key / value 枚举。
- TSDoc custom tags 的最小集合。
- TypeDoc JSON 到 ComponentSchema / ComponentPropSchema 的映射边界。
