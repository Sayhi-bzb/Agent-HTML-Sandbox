# agent-html Type Surface

本文记录 agent-html 的公共类型表面。它不定义完整 schema，只标记当前不应随手改动的边界对象。

## Change Rules

- 公共类型表面变更必须同步 contracts、schema 和 tests。
- agent-facing 类型不得泄漏内部实现 props、Tailwind class 或源码结构。
- core 类型不得依赖 Vite、React、shadcn/ui、Tailwind、renderer adapter 或 managed runtime 构建配置。
- 公共类型名称应保持稳定，避免用近义词创建平行概念。

## 1. GeneratedShadcnIntrospection

Ownership: runtime verification

Purpose: 表示从 shadcn registry、组件源码和 `components.json` 抽取的内部 runtime verification facts。

Consumers: contract verification, renderer capability checks, drift check

Change rule: GeneratedShadcnIntrospection 不得直接成为 agent-facing 协议。

Note: 它服务于 contract verification、renderer capability checks 和 drift check，不直接成为 agent-facing 协议。

## 2. ComponentSchemaOverlay

Ownership: standardized component contract

Purpose: 表示项目显式声明的 agent-facing 语义白名单。

Consumers: contract mapper, parse / sanitize, renderer

Change rule: overlay 变化必须同步示例、contract 和 tests。

Note: overlay 决定 expose 范围、语义 prop 命名、slot 结构、children 边界和 style config 兼容性。

## 3. ComponentSchema

Ownership: standardized component contract

Purpose: 表示一个 agent-facing 标准组件。

Consumers: agent, parse / sanitize, renderer

Change rule: 新增、删除或重命名 ComponentSchema 必须同步示例、contract 和 renderer 注册。

Note: 它描述组件用途、固定结构、允许语义 props、允许 slots、style config 兼容性和使用禁忌；不等于 shadcn/ui props，也不暴露内部实现。

## 3.1. UiComponentSchema

Ownership: standardized component schema / renderer integration

Purpose: 表示通用 renderer 可解析的 UI 组件能力。

Consumers: contract mapper, parse / sanitize, generic renderer resolver, CLI status / doctor

Change rule: UiComponentSchema 变化必须同步 ComponentSchema、UiSlotSchema、renderer registry 和 tests。

Note: 它表达通用 renderer 需要的 component id、source registry item、safe prop mapping 和 diagnostics policy；不是完整 shadcn props，也不是手写 adapter。

## 3.2. UiSlotSchema

Ownership: standardized component schema / renderer integration

Purpose: 表示通用 renderer 可解析的 slot 能力。

Consumers: contract mapper, parse / sanitize, generic renderer resolver

Change rule: UiSlotSchema 变化必须同步 slot validation、prompt schema 和 renderer registry。

Note: 它描述 slot name、对应 export、允许 children 和 safe prop mapping。

## 4. ComponentPropSchema

Ownership: standardized component contract

Purpose: 描述 agent 可填写的语义 props。

Consumers: agent, parse / sanitize

Change rule: ComponentPropSchema 不得暴露内部 props、Tailwind class、`className`、Radix props 或完整 shadcn/ui props。

Note: 应优先表达语义字段，而不是视觉实现字段。

## 5. ComponentToken

Ownership: standardized component contract

Purpose: 表示 agent 可阅读的组件语义 token。

Consumers: agent

Change rule: ComponentToken 应表达组件语义、内容角色和组合边界，不应表达内部样式实现。

## 6. Legacy Profile Syntax (Removed)

Ownership: migration record

Purpose: 记录已移除的 `<meta-agent profile="...">` 兼容语法。

Consumers: none in the active public contract

Change rule: 不得在没有新的产品决策的情况下恢复该兼容语法。

Note: 公开文档级视觉入口现在只通过 `<meta-agent style-ref="...">` 暴露。

## 7. Legacy Profile Registry (Removed)

Ownership: migration record

Purpose: 记录已移除的 profile registry compatibility surface。

Consumers: none in the active public contract

Change rule: 不得在 active public schema 中恢复该 registry surface。

Note: 当前公开 visual config catalog 只由 DocumentStyleConfigReference 组成。

## 7.1. DocumentStyleConfigReference

Ownership: configuration contract / CLI

Purpose: 表示文档级 style config 的受控引用。

Consumers: agent, parse / sanitize, CLI schema output

Change rule: 引用 identity、允许值或解析规则变化必须同步 schema、sanitize schema、配置解析和 tests。

Note: 它通过 `style-ref` 被选择，只选择已批准配置。它是配置层入口，不等于 CSS、Tailwind class、shadcn props、全局主题 token 或组件样式细节。

## 7.2. DocumentStyleConfig

Ownership: configuration contract / renderer adapter

Purpose: 表示独立配置层中的受控样式配置对象，内部包含全局样式层与组件样式层。

Consumers: parse / sanitize, renderer adapter, CLI inspect/config view

Change rule: 配置结构变化必须同步配置解析、renderer 解析、schema 文案和 tests。

Note: 它描述受控视觉映射，不得改变 ComponentSchema 语义，也不得退化为任意 CSS、完整 shadcn props、外部资源 passthrough 或与 `tweakcn` 平行的全局主题体系。

## 8. AgentHtmlDocument

Ownership: agent-html authoring boundary

Purpose: 表示 agent 输出的完整标准 agent-html 文档。

Consumers: parse / sanitize

Note: renderer 不直接消费 AgentHtmlDocument。

Change rule: 文档级结构变更必须同步 `agent-html-to-renderer` contract。

## 9. StandardAgentNode

Ownership: agent-html authoring boundary

Purpose: 表示 agent-html 中的标准组件节点。

Consumers: parse / sanitize

Note: renderer 不直接消费 StandardAgentNode。

Change rule: 节点能力变更必须同步 ComponentSchema 和 renderer 注册规则。

## 10. RenderConfig

Ownership: presentation contract / renderer adapter

Purpose: 表示文档级受控视觉配置的检查后入口与解析结果。

Consumers: agent, parse / sanitize, renderer adapter

Change rule: RenderConfig key / value 变化必须同步 schema、sanitize schema、renderer adapter 配置解析和 tests。

Note: 它默认从 DocumentStyleConfigReference 解析得到，并承接配置层的全局样式层与组件样式层结果。它不是 CSS、style、className、Tailwind class、shadcn props、script 或外部资源入口。

## 11. AhtmlRuntimeConfig

Ownership: CLI / managed runtime

Purpose: 表示用户级 managed runtime 的 ahtml 配置。

Consumers: CLI, renderer adapter, managed runtime

Change rule: 配置变化必须同步 `cli-to-managed-runtime` contract、CLI checks 和 templates。

Note: 它记录 managed runtime 的必要配置，不保存 agent-facing CSS、Tailwind class 或完整 shadcn props。project-local config 不属于兼容表面。

## 11.1. ShadcnRuntimeSurface

Ownership: CLI / managed runtime checks

Purpose: 表示 managed runtime 的 shadcn-native UI surface 身份。

Consumers: CLI setup, status, doctor, renderer capability checks, tests

Change rule: ShadcnRuntimeSurface 变化必须同步 `cli-to-managed-runtime` contract、runtime bootstrap、doctor 和 build artifact tests。

Note: 它是 runtime 完整性的检查表，不是 agent-facing schema。

## 12. RendererAdapter

Ownership: renderer integration

Purpose: 表示把 `SanitizedAgentHtml` 渲染为页面产物的 adapter 表面。

Consumers: CLI, templates, managed runtime

Change rule: RendererAdapter 变化必须同步 `engine-to-renderer-adapter` contract、templates 和 runtime checks。

Note: 它可依赖 managed runtime 中的 React、shadcn/ui、Tailwind 或 Vite，但这些依赖不得反向进入 core。

## 13. UiRegistry

Ownership: renderer integration / managed runtime checks

Purpose: 表示通用 renderer 可解析的 shadcn/native/composite UI 注册表。

Consumers: generic renderer resolver, CLI status / doctor, tests

Change rule: UiRegistry 必须由 ComponentSchema、UiComponentSchema、UiSlotSchema 和 managed runtime installed components 校验生成。安装状态不能单独成为 registry truth。

Note: 它记录通用 renderer 需要的 component/slot/export/mapping 信息，不保存 agent-facing CSS、Tailwind class 或完整 shadcn props。

## 14. GenericRendererResolver

Ownership: renderer integration

Purpose: 表示通用递归渲染器：把 sanitized ui / slot nodes 解析为 shadcn/native/composite React output。

Consumers: RendererAdapter

Change rule: GenericRendererResolver 变化必须同步 `agent-html-to-renderer`、`engine-to-renderer-adapter`、runtime checks 和 build artifact tests。

Note: 组件差异应来自 UiRegistry、UiSlotSchema、safe prop mapping、DocumentStyleConfig 与 overlay，而不是逐组件主路径分支。

## 15. RendererCapability

Ownership: renderer adapter / managed runtime checks

Purpose: 表示一个 agent-facing 标准组件在 runtime 中可由通用 resolver 覆盖的渲染能力。

Consumers: renderer adapter, CLI status / doctor, tests

Change rule: ComponentSchema 新增、删除或修改时，必须同步 RendererCapability。没有 RendererCapability 的默认组件不得进入 agent-facing schema。

Note: 它表达 component name、render kind、required runtime surface、ui / slot coverage 和 diagnostics policy；不暴露内部实现给 agent。

## 16. SanitizedAgentHtml

Ownership: parse / sanitize

Purpose: 表示经过检查、可交给 renderer adapter 的 agent-html 结构和 RenderConfig。

Consumers: renderer adapter

Change rule: 任何进入 renderer adapter 的 agent-html 必须先成为 SanitizedAgentHtml。

Note: 它来自 parse / validate / sanitize 后的结构转换，不是 cleaned HTML string。

## 17. RenderedArtifact

Ownership: renderer adapter / portable output

Purpose: 表示 renderer adapter 产出的 React output 和 HTML output。

Consumers: portable output, user, sharing flow

Change rule: RenderedArtifact 不得依赖未声明运行环境或绕过安全边界。

Note: 目录式 static artifact 是默认交付形态。

## 18. CliSchemaOutput

Ownership: CLI / standardized component contract

Purpose: 表示 `schema` 命令输出的脱水 agent-facing contract。

Consumers: agent

Change rule: CliSchemaOutput 必须来自 ComponentSchema、DocumentStyleConfigReference 和 RenderConfig，不得暴露 renderer props、Tailwind class、shadcn props 或源码结构。

Note: 公开 visual config syntax 必须使用 `style-ref`。

## 19. CliConfigView

Ownership: CLI / presentation contract

Purpose: 表示 CLI 从 DocumentStyleConfigReference 和 RenderConfig 派生的只读配置视图。

Consumers: agent, developer

Change rule: CliConfigView 不得成为独立配置状态源，不得映射为任意 CSS、Tailwind class、inline style、script、HTML attribute passthrough 或外部资源。

Note: 它只表达 document-level style config model，不直接暴露全局主题 token 编辑面或组件样式实现细节。
