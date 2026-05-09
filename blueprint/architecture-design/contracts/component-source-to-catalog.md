# Component source to Catalog Contract

本文规定 base / custom block 声明到 Agent Component Catalog 的边界。

## Provider

标准化 shadcn base catalog 提供 base blocks。

组件实现层提供 custom blocks 的 ComponentDeclaration。

## Consumer

Catalog 生成层消费 base block 声明和 ComponentDeclaration，并产出 Agent Component Catalog。

## Rules

- base blocks 来自标准化 shadcn base catalog。
- custom blocks 来自 ComponentDeclaration。
- 组件源码、`.d.ts`、TSDoc / JSDoc 可作为 ComponentDeclaration 的来源。
- Catalog 只抽取 agent-facing 信息。
- 内部 props、Tailwind class 和完整 shadcn/ui props 不进入 Catalog 主接口。
- Catalog 生成失败不能静默通过。

## Forbidden

- Catalog 通过复制组件源码成为 agent-facing 文档。
- Catalog 暴露内部样式、布局实现或源码结构。
- Catalog 直接暴露完整 shadcn props 作为 agent-facing 主接口。
- 组件能力变化后 Catalog 继续保持旧描述。
