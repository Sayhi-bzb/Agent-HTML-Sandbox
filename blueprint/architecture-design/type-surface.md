# agent-html Type Surface

本文记录 agent-html 的公共类型表面。它不定义完整 schema，只标记不能随手改的边界对象。

## Change Rules

- 公共类型表面变更必须同步 contracts、schema 和 tests。
- agent-facing 类型不得泄漏内部实现 props、Tailwind class 或源码结构。
- core 类型不得依赖 Vite、React、shadcn/ui、Tailwind、renderer adapter 或用户项目构建配置。
- 公共类型名称应保持稳定，避免用近义词创建平行概念。

## 1. GeneratedShadcnIntrospection

Ownership: schema generation

Purpose: 表示从 shadcn registry、组件源码和 `components.json` 自动抽取的 schema 草稿材料。

Consumers: schema mapper, drift check

Change rule: GeneratedShadcnIntrospection 不得直接成为 agent-facing 协议。

Note: 可包含 exports、`data-slot`、`cva` variants、literal union props、registry metadata、dependencies、docs links 和 blocked/internal prop candidates。它用于降低维护成本，不决定最终开放面。

## 2. ComponentSchemaOverlay

Ownership: standardized component schema

Purpose: 表示项目显式声明的 agent-facing 白名单。

Consumers: schema mapper, parse / sanitize, renderer

Change rule: overlay 变化必须同步示例、contract 和 tests。

Note: overlay 决定组件是否 expose、语义 prop 命名、允许 values、slot 合法结构、children 边界、隐藏 props 和 shadcn internal mapping。

## 3. ComponentSchema

Ownership: standardized component schema

Purpose: 表示一个 agent-facing 标准组件。

Consumers: agent, parse / sanitize, renderer

Change rule: 新增、删除或重命名 ComponentSchema 必须同步示例、contract 和 renderer 注册。

Note: ComponentSchema 由 GeneratedShadcnIntrospection 和 ComponentSchemaOverlay 合成。它描述组件用途、固定结构、允许语义 props、允许 slots 和使用禁忌。它不等于 shadcn/ui props，也不暴露 Tailwind class 或内部 React 实现。

## 4. ComponentPropSchema

Ownership: standardized component schema

Purpose: 描述 agent 可填写的 props。

Consumers: agent, parse / sanitize

Change rule: ComponentPropSchema 不得暴露内部 props、Tailwind class、`className`、Radix props 或完整 shadcn/ui props。

## 5. ComponentToken

Ownership: standardized component schema

Purpose: 表示 agent 可阅读的组件语义 token。

Consumers: agent

Change rule: ComponentToken 应表达组件语义、内容角色和组合边界，不应表达内部样式实现。

## 6. AgentHtmlDocument

Ownership: agent-html authoring boundary

Purpose: 表示 agent 输出的完整标准 agent-html 文档。

Consumers: parse / sanitize

Note: renderer 不直接消费 AgentHtmlDocument；renderer 只消费 sanitized structure。

Change rule: 文档级结构变更必须同步 `agent-html-to-renderer` contract。

## 7. StandardAgentNode

Ownership: agent-html authoring boundary

Purpose: 表示 agent-html 中的标准组件节点。

Consumers: parse / sanitize

Note: renderer 不直接消费 StandardAgentNode；节点通过 parse / sanitize 后进入 sanitized structure。

Change rule: 节点能力变更必须同步 ComponentSchema 和 renderer 注册规则。

## 8. RenderConfig

Ownership: standardized component schema / renderer adapter

Purpose: 表示 agent 可选择的受控 presentation profile。

Consumers: agent, parse / sanitize, renderer adapter

Change rule: RenderConfig key / value 变化必须同步 schema、sanitize schema、renderer adapter profile 和 tests。

Note: RenderConfig 只能包含有限枚举，例如 theme、density、tone、width。它不是 CSS、style、className、Tailwind class、shadcn props、script 或外部资源入口。

## 9. AhtmlProjectConfig

Ownership: CLI / project integration

Purpose: 表示用户项目中的 ahtml 配置。

Consumers: CLI, renderer adapter, generated project

Change rule: 配置变化必须同步 `cli-to-user-project` contract、CLI checks 和 templates。

Note: `AhtmlProjectConfig` 可记录 renderer adapter、template target、ComponentSchema source 和 output target。它不得保存 agent-facing CSS、Tailwind class 或完整 shadcn props。

## 10. RendererAdapter

Ownership: renderer integration

Purpose: 表示把 `SanitizedAgentHtml` 渲染为页面产物的 adapter 表面。

Consumers: CLI, templates, user project

Change rule: RendererAdapter 变化必须同步 `engine-to-renderer-adapter` contract、templates 和 generated project checks。

Note: RendererAdapter 可依赖 React、shadcn/ui、Tailwind 或 Vite template，但这些依赖不得反向进入 core。

## 11. RendererComponent

Ownership: renderer adapter

Purpose: 表示 renderer adapter 可渲染的已注册标准组件。

Consumers: renderer adapter

Change rule: RendererComponent 必须对应 ComponentSchema，除非是内部保留组件。

## 12. SanitizedAgentHtml

Ownership: parse / sanitize

Purpose: 表示经过检查、可交给 renderer adapter 的 agent-html 结构和 RenderConfig。

Consumers: renderer adapter

Change rule: 任何进入 renderer adapter 的 agent-html 必须先成为 SanitizedAgentHtml。

Note: SanitizedAgentHtml 来自 parse / validate / sanitize 后的结构转换，不是 cleaned HTML string。未知标签、危险属性、未注册组件、非法 props、非法 slot 结构和非法 RenderConfig 不得进入该表面。

## 13. RenderedArtifact

Ownership: renderer adapter / portable output

Purpose: 表示 renderer adapter 产出的 React output 和 HTML output。

Consumers: portable output, user, sharing flow

Change rule: RenderedArtifact 不得依赖未声明运行环境或绕过安全边界。

Note: RenderedArtifact 可继续进入目录式 static artifact 或显式单文件 export。目录式 artifact 是默认交付形态，单文件 export 不应成为隐式默认。

## 14. CliSchemaOutput

Ownership: CLI / standardized component schema

Purpose: 表示 `schema` 命令输出的脱水 agent-facing contract。

Consumers: agent, compose

Change rule: CliSchemaOutput 必须来自 ComponentSchema 和 RenderConfig，不得暴露 renderer props、Tailwind class、shadcn props 或源码结构。

## 15. CompositionInput

Ownership: CLI compose

Purpose: 表示 `compose` 命令接收的内容输入。

Consumers: compose

Change rule: CompositionInput 不得绕过 ComponentSchema，也不得直接成为 renderer 输入。

## 16. CompositionDocument

Ownership: CLI compose / agent-html authoring boundary

Purpose: 表示 `compose` 产出的标准 agent-html document。

Consumers: parse / sanitize, build

Change rule: CompositionDocument 必须进入 parse / validate / sanitize。`.agent.html` 是它的可检查文件形态。

## 17. ArtifactConfig

Ownership: CLI config / portable output

Purpose: 表示 CLI 管理的有限 presentation / output 配置。

Consumers: schema, compose, build

Change rule: ArtifactConfig 不得映射为任意 CSS、Tailwind class、inline style、script、HTML attribute passthrough 或外部资源。
