# Component source to Catalog Contract

本文规定组件声明到 Agent Component Catalog 的边界。

## Provider

组件实现层提供 ComponentDeclaration。

## Consumer

Catalog 生成层消费 ComponentDeclaration，并产出 Agent Component Catalog。

## Rules

- ComponentDeclaration 是 Catalog 的上游声明表面。
- 组件源码、`.d.ts`、TSDoc / JSDoc 可作为 ComponentDeclaration 的来源。
- Catalog 只抽取 agent-facing 信息。
- 内部 props、Tailwind class 和 shadcn/ui props 不进入 Catalog 主接口。
- Catalog 生成失败不能静默通过。

## Forbidden

- Catalog 通过复制组件源码成为 agent-facing 文档。
- Catalog 暴露内部样式、布局实现或源码结构。
- 组件能力变化后 Catalog 继续保持旧描述。
