# agent-html Type Surface

本文记录 agent-html 的公共类型表面。它不定义完整 schema，只标记不能随手改的边界对象。

## Change Rules

- 公共类型表面变更必须同步 contracts、schema 和 tests。
- agent-facing 类型不得泄漏内部实现 props、Tailwind class 或源码结构。
- core 类型不得依赖 Vite、React、shadcn/ui、Tailwind、renderer adapter 或 managed runtime 构建配置。
- 公共类型名称应保持稳定，避免用近义词创建平行概念。

## 1. GeneratedShadcnIntrospection

Ownership: runtime verification

Purpose: 表示从 shadcn registry、组件源码和 `components.json` 自动抽取的内部 runtime verification facts。

Consumers: contract verification, renderer capability checks, drift check

Change rule: GeneratedShadcnIntrospection 不得直接成为 agent-facing 协议。

Note: 可包含 exports、`data-slot`、dependencies、registry metadata、required files、required exports、docs links、CSS/base surface identity 和 blocked/internal prop candidates。必要时也可带 `cva` variants、literal union props 或其他实现细节作为审查材料，但它们不决定最终开放面。

## 2. ComponentSchemaOverlay

Ownership: standardized component contract

Purpose: 表示项目显式声明的 agent-facing 语义白名单。

Consumers: contract mapper, parse / sanitize, renderer

Change rule: overlay 变化必须同步示例、contract 和 tests。

Note: overlay 决定组件是否 expose、语义 prop 命名、允许 values、slot 合法结构、children 边界、隐藏 props、profile 兼容性和 shadcn internal mapping。

## 3. ComponentSchema

Ownership: standardized component contract

Purpose: 表示一个 agent-facing 标准组件，可由通用 ui / slot capability 包装成便捷语法。

Consumers: agent, parse / sanitize, renderer

Change rule: 新增、删除或重命名 ComponentSchema 必须同步示例、contract 和 renderer 注册。

Note: ComponentSchema 由显式语义声明收束，并经过 GeneratedShadcnIntrospection 校验。它描述组件用途、固定结构、允许语义 props、允许 slots、profile 兼容性和使用禁忌。它不等于 shadcn/ui props，也不暴露 Tailwind class 或内部 React 实现。shadcn-backed ComponentSchema 应能归一到 UiComponentSchema / UiSlotSchema。

## 3.1. UiComponentSchema

Ownership: standardized component schema / renderer integration

Purpose: 表示通用 renderer 可解析的 UI 组件能力。

Consumers: contract mapper, parse / sanitize, generic renderer resolver, CLI status / doctor

Change rule: UiComponentSchema 变化必须同步 ComponentSchema、UiSlotSchema、renderer registry 和 tests。

Note: UiComponentSchema 应表达 stable component id、source registry item、root export、required dependencies、safe prop mapping、allowed slots 和 diagnostics policy。它不是完整 shadcn props，也不是手写 adapter。

## 3.2. UiSlotSchema

Ownership: standardized component schema / renderer integration

Purpose: 表示通用 renderer 可解析的 slot 能力。

Consumers: contract mapper, parse / sanitize, generic renderer resolver

Change rule: UiSlotSchema 变化必须同步 slot validation、prompt schema 和 renderer registry。

Note: UiSlotSchema 应来自 `data-slot`、exports 和 overlay 合成，描述 slot name、对应 export、允许 children、required parent / grouping 和 safe prop mapping。

## 4. ComponentPropSchema

Ownership: standardized component contract

Purpose: 描述 agent 可填写的语义 props。

Consumers: agent, parse / sanitize

Change rule: ComponentPropSchema 不得暴露内部 props、Tailwind class、`className`、Radix props 或完整 shadcn/ui props。

Note: 常见公开字段应是 `title`、`description`、`value`、`status`、`intent`、`priority`、`href`、`label`、`columns`、`rows`、`items`、`disabled` 这类语义字段，而不是默认暴露 `variant`、`size`、`surface`、`radius`、`spacing` 这类视觉实现字段。若少量组件保留 `tone` 之类受控语义强调词，也必须由显式声明收束，而不是回退成通用视觉参数包。

## 5. ComponentToken

Ownership: standardized component contract

Purpose: 表示 agent 可阅读的组件语义 token。

Consumers: agent

Change rule: ComponentToken 应表达组件语义、内容角色和组合边界，不应表达内部样式实现。

## 6. PresentationProfile

Ownership: presentation contract / renderer adapter

Purpose: 表示兼容期或简化入口下的命名视觉档位，例如 `ops-compact`。

Consumers: agent, parse / sanitize, renderer adapter, CLI

Change rule: 新增、删除或重命名 PresentationProfile 必须同步 schema、sanitize schema、renderer adapter profile 注册和 tests。

Note: 在目标架构里，PresentationProfile 可以保留为兼容 alias 或简化 preset，但不再是长期唯一文档级视觉入口。当前兼容期仍可继续用 `<meta-agent profile="...">` 序列化这一 alias，但这种 serialized spelling 不改变它的兼容层角色。它可以在内部绑定 theme、density、card treatment、table treatment、badge treatment、emphasis 和 width 等受控 token，但这些 token 默认不直接暴露为 agent-facing 自由 props。

## 7. PresentationProfileRegistry

Ownership: presentation contract / CLI

Purpose: 表示兼容期或简化入口下公开给 agent 或用户选择的有限 profile 集合。

Consumers: CLI schema output, parse / sanitize, renderer adapter

Change rule: registry 变化必须同步 `component-schema-to-agent-html` contract、CLI schema 输出和 tests。

Note: PresentationProfileRegistry 是兼容选择面，不是 renderer 内部 theme object、Tailwind config 或 shadcn variant 列表，也不应继续被视为长期唯一视觉配置 catalog。

## 7.1. DocumentStyleConfigReference

Ownership: configuration contract / CLI

Purpose: 表示文档级 style config 的受控引用。

Consumers: agent, parse / sanitize, CLI schema output

Change rule: 引用 identity、允许值或解析规则变化必须同步 schema、sanitize schema、配置解析和 tests。

Note: 在目标架构里，DocumentStyleConfigReference 是长期首选的文档级视觉配置入口。当前重构期可以先在 contract/type 层把它作为主语，而继续保留 `profile` 作为 serialized compatibility alias。它只选择已批准配置，不内联具体组件样式规则，不等于 CSS、Tailwind class 或 shadcn props。

## 7.2. DocumentStyleConfig

Ownership: configuration contract / renderer adapter

Purpose: 表示独立配置层中的受控组件样式映射。

Consumers: parse / sanitize, renderer adapter, CLI inspect/config view

Change rule: 配置结构变化必须同步配置解析、renderer 解析、schema 文案和 tests。

Note: DocumentStyleConfig 可以描述全局 theme/density/width 等视觉策略，也可以描述标准积木的组件级视觉映射；它不得改变 ComponentSchema 语义、allowed children、slot 结构、renderer kind 或 fallback 行为，也不得退化为任意 CSS、Tailwind class、完整 shadcn props 或外部资源 passthrough。

## 8. AgentHtmlDocument

Ownership: agent-html authoring boundary

Purpose: 表示 agent 输出的完整标准 agent-html 文档。

Consumers: parse / sanitize

Note: renderer 不直接消费 AgentHtmlDocument；renderer 只消费 sanitized structure。

Change rule: 文档级结构变更必须同步 `agent-html-to-renderer` contract。

## 9. StandardAgentNode

Ownership: agent-html authoring boundary

Purpose: 表示 agent-html 中的标准组件节点。

Consumers: parse / sanitize

Note: renderer 不直接消费 StandardAgentNode；节点通过 parse / sanitize 后进入 sanitized structure。

Change rule: 节点能力变更必须同步 ComponentSchema 和 renderer 注册规则。

## 10. RenderConfig

Ownership: presentation contract / renderer adapter

Purpose: 表示文档级受控视觉配置的检查后入口与解析结果。

Consumers: agent, parse / sanitize, renderer adapter

Change rule: RenderConfig key / value 变化必须同步 schema、sanitize schema、renderer adapter 配置解析和 tests。

Note: 在目标架构里，RenderConfig 默认应优先从 DocumentStyleConfigReference 解析得到；兼容期可以接受 `profile` alias 或极少量与 alias 绑定的受控 token。core 应负责把当前 serialized `profile` input 归一到同一 checked RenderConfig，再交给 renderer。它不是 CSS、style、className、Tailwind class、shadcn props、script 或外部资源入口。

## 11. AhtmlRuntimeConfig

Ownership: CLI / managed runtime

Purpose: 表示用户级 managed runtime 的 ahtml 配置。

Consumers: CLI, renderer adapter, managed runtime

Change rule: 配置变化必须同步 `cli-to-managed-runtime` contract、CLI checks 和 templates。

Note: `AhtmlRuntimeConfig` 可记录 renderer adapter、shadcn template identity、shadcn preset、style、base、iconLibrary、Tailwind version、CSS entry、ComponentSchema source 和 output target。它不得保存 agent-facing CSS、Tailwind class 或完整 shadcn props。project-local config 已删除，不属于兼容表面。

## 11.1. ShadcnRuntimeSurface

Ownership: CLI / managed runtime checks

Purpose: 表示 managed runtime 的 shadcn-native UI surface 身份。

Consumers: CLI setup, status, doctor, renderer capability checks, tests

Change rule: ShadcnRuntimeSurface 变化必须同步 `cli-to-managed-runtime` contract、runtime bootstrap、doctor 和 build artifact tests。

Note: ShadcnRuntimeSurface 应至少记录 shadcn template/init source、preset、style、base、iconLibrary、Tailwind version、CSS entry、base layer expectation、`components.json` path、aliases、required registry item ids、required files 和 required exports。它是 runtime 完整性的检查表，不是 agent-facing schema。ahtml 不得用 package-local component copies、截断 CSS 或 pseudo template 伪造这个 surface。

## 12. RendererAdapter

Ownership: renderer integration

Purpose: 表示把 `SanitizedAgentHtml` 渲染为页面产物的 adapter 表面。

Consumers: CLI, templates, managed runtime

Change rule: RendererAdapter 变化必须同步 `engine-to-renderer-adapter` contract、templates 和 runtime checks。

Note: RendererAdapter 可依赖 shadcn-native managed runtime 中的 React、shadcn/ui、Tailwind 或 Vite build target，但这些依赖不得反向进入 core。RendererAdapter 的主路径应调用 GenericRendererResolver，而不是内联逐组件特殊分支。RendererAdapter 可以被 ahtml 注入到 shadcn-template-derived runtime，但不得替换 shadcn UI surface。

## 13. UiRegistry

Ownership: renderer integration / managed runtime checks

Purpose: 表示通用 renderer 可解析的 shadcn/native/composite UI 注册表。

Consumers: generic renderer resolver, CLI status / doctor, tests

Change rule: UiRegistry 必须由 ComponentSchema、UiComponentSchema、UiSlotSchema 和 managed runtime installed components 校验生成。安装状态不能单独成为 registry truth。

Note: UiRegistry 应记录 component id、slot id、React export、source registry item、required files、required exports、required CSS/base surface、safe prop mapping、render kind 和 diagnostics policy。它不得保存 agent-facing CSS、Tailwind class 或完整 shadcn props。

## 14. GenericRendererResolver

Ownership: renderer integration

Purpose: 表示通用递归渲染器：把 sanitized ui / slot nodes 解析为 shadcn/native/composite React output。

Consumers: RendererAdapter

Change rule: GenericRendererResolver 变化必须同步 `agent-html-to-renderer`、`engine-to-renderer-adapter`、runtime checks 和 build artifact tests。

Note: GenericRendererResolver 不应包含 `if tabs then Tabs` 这类逐组件主路径。组件差异应来自 UiRegistry、UiSlotSchema、safe prop mapping、PresentationProfile 和 overlay。

## 15. RendererCapability

Ownership: renderer adapter / managed runtime checks

Purpose: 表示一个 agent-facing 标准组件在 runtime 中可由通用 resolver 覆盖的渲染能力。

Consumers: renderer adapter, CLI status / doctor, tests

Change rule: ComponentSchema 新增、删除或修改时，必须同步 RendererCapability。没有 RendererCapability 的默认组件不得进入 agent-facing schema。

Note: RendererCapability 应至少表达 component name、render kind（`shadcn`、`native`、`composite` 或 unsupported）、required shadcn registry items、required runtime surface、ui / slot coverage、safe prop mapping coverage、profile support 和 diagnostics policy。它不暴露 Tailwind class、完整 shadcn props 或 Radix props 给 agent，也不表示必须存在逐组件手写 adapter。

## 16. SanitizedAgentHtml

Ownership: parse / sanitize

Purpose: 表示经过检查、可交给 renderer adapter 的 agent-html 结构和 RenderConfig。

Consumers: renderer adapter

Change rule: 任何进入 renderer adapter 的 agent-html 必须先成为 SanitizedAgentHtml。

Note: SanitizedAgentHtml 来自 parse / validate / sanitize 后的结构转换，不是 cleaned HTML string。未知标签、危险属性、未注册组件、非法 props、非法 slot 结构和非法 RenderConfig 不得进入该表面。

## 17. RenderedArtifact

Ownership: renderer adapter / portable output

Purpose: 表示 renderer adapter 产出的 React output 和 HTML output。

Consumers: portable output, user, sharing flow

Change rule: RenderedArtifact 不得依赖未声明运行环境或绕过安全边界。

Note: RenderedArtifact 可继续进入目录式 static artifact 或显式单文件 export。目录式 artifact 是默认交付形态，单文件 export 不应成为隐式默认。

## 18. CliSchemaOutput

Ownership: CLI / standardized component contract

Purpose: 表示 `schema` 命令输出的脱水 agent-facing contract。

Consumers: agent

Change rule: CliSchemaOutput 必须来自 ComponentSchema 和 DocumentStyleConfigReference / PresentationProfileRegistry / RenderConfig，不得暴露 renderer props、Tailwind class、shadcn props 或源码结构。

Note: 在兼容期，如果具体示例语法仍使用 `<meta-agent profile="...">`，CliSchemaOutput 必须把它解释为 approved visual config alias，而不是独立长期 profile 系统。

## 19. CliConfigView

Ownership: CLI / presentation contract

Purpose: 表示 CLI 从 DocumentStyleConfigReference、兼容 PresentationProfileRegistry 和 RenderConfig 派生的只读配置视图。

Consumers: agent, developer

Change rule: CliConfigView 不得成为独立配置状态源，不得映射为任意 CSS、Tailwind class、inline style、script、HTML attribute passthrough 或外部资源。

Note: CliConfigView 应优先表达 document-level style config model；若展示 compatibility `profile`，应把它标记为 alias 或 compatibility wording，而不是主配置对象。
