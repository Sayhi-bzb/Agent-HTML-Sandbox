# shadcn/ui implementation to Component Schema Contract

本文规定 shadcn/ui 实现到标准组件 schema 的边界。

## Provider

UI implementation layer 基于 shadcn/ui 提供组件实现。

## Consumer

schema generation / maintenance layer 消费 shadcn registry、组件源码、`components.json` 和 explicit schema overlay，并产出 standardized component schema 与通用 renderer registry 输入。

## Rules

- shadcn/ui 是 UI 实现底座。
- 标准组件必须固定结构、固定风格和固定组合边界。
- GeneratedShadcnIntrospection 可自动抽取 exports、`data-slot`、`cva` variants、literal union props、registry metadata、dependencies 和 docs links。
- GeneratedShadcnIntrospection 应优先形成通用 ui component / ui slot capability 草稿，而不是逐组件 adapter 草稿。
- ComponentSchemaOverlay 必须显式声明 expose、语义 props、slot 合法结构、children 边界、隐藏 props 和安全 prop 映射边界。
- ComponentSchema 必须由 GeneratedShadcnIntrospection 和 ComponentSchemaOverlay 合成。
- ComponentSchema 只描述 agent-facing 信息。
- ComponentSchema 必须包含允许 props、允许 slots / children 和使用禁忌。
- 组件实现可使用 Tailwind、Radix props 和 shadcn/ui props。
- 内部 props、Tailwind class、`className`、Radix props 和完整 shadcn/ui props 不进入 ComponentSchema 主接口。
- schema maintenance 必须同时产出或校验 renderer requirements：每个 exposed 标准组件需要的 shadcn registry items、ui / slot coverage、safe prop mapping coverage、native/composite render kind 和 diagnostics policy。
- shadcn 组件安装状态不能单独证明 agent-facing 组件可渲染；通用 renderer registry / resolver capability 才是可渲染性的权威。
- generated introspection、overlay 合成、schema 生成或同步失败不能静默通过。
- drift check 失败不能静默通过。

## Forbidden

- 自建独立 UI 底座来替代 shadcn/ui。
- GeneratedShadcnIntrospection 直接成为 agent-facing 协议。
- ComponentSchema 通过复制组件源码成为 agent-facing 文档。
- ComponentSchema 暴露内部样式、布局实现或源码结构。
- ComponentSchema 直接暴露完整 shadcn/ui props 作为 agent-facing 主接口。
- 组件能力变化后 schema 继续保持旧描述。
- ComponentSchema 暴露没有 renderer capability 的默认可用组件。
- 有通用 ui / slot capability 可覆盖时，为单个 shadcn 组件新增手写 adapter。
