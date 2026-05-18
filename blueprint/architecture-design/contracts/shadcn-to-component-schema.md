# shadcn/ui implementation to Component Schema Contract

本文规定 shadcn/ui 实现到标准组件 contract 的边界。

## Provider

UI implementation layer 基于 shadcn/ui 提供组件实现和 runtime surface。

## Consumer

contract maintenance / renderer integration layer 消费 shadcn registry、组件源码、`components.json`、runtime verification facts 和显式语义声明，并产出 standardized component schema、document style config compatibility 和通用 renderer registry 输入。

## Rules

- shadcn/ui 是 UI 实现底座。
- shadcn 官方 theming token convention 是全局样式层的规范来源。
- 标准组件必须固定结构、固定语义用途和固定组合边界。
- GeneratedShadcnIntrospection 只表示内部 runtime verification facts，不表示公开协议。
- runtime verification facts 可自动抽取 exports、`data-slot`、dependencies、registry metadata、required files、required exports、docs links、CSS/base surface identity 和 blocked/internal prop candidates。
- `cva` variants、literal union props 或其他视觉实现细节最多作为审查材料和 drift check 输入，不应默认进入 agent-facing contract。
- ComponentSchemaOverlay 必须显式声明 expose、语义 props、slot 合法结构、children 边界、隐藏 props、style config 兼容性和安全 prop 映射边界。
- ComponentSchema 必须由显式语义声明收束，并经过 runtime verification facts 校验。
- ComponentSchema 只描述 agent-facing 信息。
- ComponentSchema 必须包含允许 props、允许 slots / children 和使用禁忌。
- 内部 props、Tailwind class、`className`、Radix props 和完整 shadcn/ui props 不进入 ComponentSchema 主接口。
- contract maintenance 必须同时产出或校验 renderer requirements：每个 exposed 标准组件需要的 shadcn registry items、ui / slot coverage、safe prop mapping coverage、native/composite render kind 和 diagnostics policy。
- shadcn 组件安装状态不能单独证明 agent-facing 组件可渲染；通用 renderer registry / resolver capability 才是可渲染性的权威。
- runtime facts、overlay 校验、schema 生成或同步失败不能静默通过。
- drift check 失败不能静默通过。

## Forbidden

- 自建独立 UI 底座来替代 shadcn/ui。
- GeneratedShadcnIntrospection 直接成为 agent-facing 协议。
- 用“完整抽取 shadcn props”替代标准组件声明。
- ComponentSchema 通过复制组件源码成为 agent-facing 文档。
- ComponentSchema 暴露内部样式、布局实现或源码结构。
- ComponentSchema 直接暴露完整 shadcn/ui props 作为 agent-facing 主接口。
- ComponentSchema 暴露默认要求 agent 决定 `variant`、`size`、`surface`、`radius`、`spacing` 这类视觉实现参数，或把少量受控 `tone` 词重新膨胀成通用视觉调参面。
- 组件能力变化后 schema 继续保持旧描述。
- ComponentSchema 暴露没有 renderer capability 的默认可用组件。
- 有通用 ui / slot capability 可覆盖时，为单个 shadcn 组件新增手写 adapter。
