# agent-html Type Surface

本文记录 agent-html 的公共类型表面。它不定义完整 schema，只标记不能随手改的边界对象。

## Change Rules

- 公共类型表面变更必须同步 contracts、Catalog 和 tests。
- agent-facing 类型不得泄漏内部实现 props、Tailwind class 或源码结构。
- 公共类型名称应保持稳定，避免用近义词创建平行概念。

## 1. ComponentDeclaration

Ownership: UI implementation layer

Purpose: 表示 custom blocks 的声明表面。

Consumers: Catalog generation

Change rule: ComponentDeclaration 变化必须同步 CatalogItem 和 CatalogProp。

Note: ComponentDeclaration 是 custom blocks 的显式 agent-facing 声明。它可由文档注释和声明抽取工具生成中间材料，但语义权威仍是声明本身，不是 renderer 组件 props。

## 2. AgentHtmlDocument

Ownership: agent-html authoring boundary

Purpose: 表示 agent 输出的完整 agent-html 文档。

Consumers: parse / sanitize

Note: renderer 不直接消费 AgentHtmlDocument；renderer 只消费 SanitizedAgentHtml。

Change rule: 文档级结构变更必须同步 `agent-html-to-renderer` contract。

## 3. AgentHtmlNode

Ownership: agent-html authoring boundary

Purpose: 表示 agent-html 中的积木节点。

Consumers: parse / sanitize

Note: renderer 不直接消费 AgentHtmlNode；节点通过 parse / sanitize 后进入 SanitizedAgentHtml。

Change rule: 节点能力变更必须同步 Catalog 和 renderer 注册规则。

## 4. CatalogItem

Ownership: Agent Component Catalog

Purpose: 表示一个 agent-facing 积木。

Consumers: agent, agent-html authoring flow

Change rule: 新增、删除或重命名 CatalogItem 必须同步示例和 contract。

Note: CatalogItem 分为 base 和 custom。base 来自标准化 shadcn base catalog；custom 来自 ComponentDeclaration。

## 5. CatalogProp

Ownership: Agent Component Catalog

Purpose: 描述 agent 可填写的 props。

Consumers: agent, catalog validation

Change rule: CatalogProp 不得暴露内部 props、Tailwind class 或完整 shadcn/ui props。

## 6. RenderConfig

Ownership: Agent Component Catalog / renderer

Purpose: 表示 agent 可选择的受控 presentation profile。

Consumers: agent, parse / sanitize, renderer

Change rule: RenderConfig key / value 变化必须同步 Catalog schema、sanitize schema、renderer profile 和 tests。

Note: RenderConfig 只能包含有限枚举，例如 theme、density、tone、width。它不是 CSS、style、className、Tailwind class、shadcn props、script 或外部资源入口。

## 7. RendererBlock

Ownership: renderer

Purpose: 表示 renderer 可渲染的已注册积木。

Consumers: renderer

Change rule: RendererBlock 必须对应 CatalogItem，除非是内部保留块。

## 8. SanitizedAgentHtml

Ownership: parse / sanitize

Purpose: 表示经过检查、可交给 renderer 的 agent-html 结构和 RenderConfig。

Consumers: renderer

Change rule: 任何进入 renderer 的 agent-html 必须先成为 SanitizedAgentHtml。

Note: SanitizedAgentHtml 来自 parse / validate / sanitize 后的结构转换，不是 cleaned HTML string。未知标签、危险属性、未注册积木和非法 RenderConfig 不得进入该表面。

## 9. PortableArtifact

Ownership: portable output

Purpose: 表示可打开、可分享、可归档的静态交付物。

Consumers: user, sharing flow

Change rule: PortableArtifact 不得依赖未声明运行环境或绕过安全边界。

Note: PortableArtifact 可包含目录式 artifact 和显式单文件 export。目录式 artifact 是默认交付形态，单文件 export 不应成为隐式默认。
