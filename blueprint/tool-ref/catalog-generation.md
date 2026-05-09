# Catalog Generation Tool Reference

本文记录 agent-html 在 Catalog generation 层的采购判断。正式边界以 `architecture-design/architecture.md`、`architecture-design/invariants.md` 和 contracts 为准。

## Decision

采购 TSDoc + TypeDoc 作为 custom blocks 的 Catalog generation 主路径。

base blocks 和 render config schema 由标准化 shadcn base catalog 提供。

核心判断：

```txt
standardized shadcn base catalog supplies base blocks.
standardized render config schema supplies presentation profile options.
ComponentDeclaration supplies custom blocks.
TSDoc supplies the annotation convention.
TypeDoc supplies the v1 JSON extraction path.
ts-morph supplies precision fallback.
React docgen and Storybook stay auxiliary.
```

## Fit

推荐主路径：

```txt
standardized shadcn base catalog
        ↓
Agent Component Catalog base blocks + render config schema

ComponentDeclaration source
        ↓
TSDoc comments + custom tags
        ↓
TypeDoc JSON
        ↓
Catalog generation mapper
        ↓
Agent Component Catalog
```

采购分工：

- `TSDoc`: agent-facing annotation convention。
- `TypeDoc`: declaration extraction 和 JSON 中间产物。
- `ts-morph`: TypeScript AST / type checker precision fallback。
- `react-docgen*`: renderer props audit。
- `Storybook`: human component workshop。

## Not For

不从 renderer React props 直接生成 Agent Component Catalog。

不让完整 shadcn/ui props、Radix props、Tailwind 或 Storybook argTypes 成为 Catalog 权威。

不以组件源码作为 agent 学习常规用法的主路径。

不把 renderer theme object、Tailwind config 或 shadcn props 自动外泄为 render config schema。

## Specific Risks

- TypeDoc JSON 偏 API docs，必须经过 Catalog mapper 才能成为 agent-facing Catalog。
- base blocks 若照搬 shadcn props，会泄漏实现接口。
- render config schema 若照搬 renderer theme / Tailwind config，会泄漏实现接口。
- TSDoc custom tags 容易膨胀，应保持最小充分。
- react-docgen 容易诱导从 renderer props 反推 Catalog，只能用于辅助审计。
- Catalog generation 失败不能静默通过，否则 agent 会使用过期 Catalog。

## Follow-up

实现前只需补查和当前声明设计直接相关的细节：

- ComponentDeclaration 的最小声明形态。
- shadcn base catalog 的最小 block / prop 集合。
- render config schema 的最小 key / value 枚举。
- TSDoc custom tags 的最小集合。
- TypeDoc JSON 到 CatalogItem / CatalogProp 的映射边界。
