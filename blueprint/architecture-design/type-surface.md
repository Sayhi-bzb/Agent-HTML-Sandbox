# agent-html Type Surface

本文记录 agent-html 的公共类型表面。它不定义完整 schema，只标记不能随手改的边界对象。

## Change Rules

- 公共类型表面变更必须同步 contracts、Catalog 和 tests。
- agent-facing 类型不得泄漏内部实现 props、Tailwind class 或源码结构。
- 公共类型名称应保持稳定，避免用近义词创建平行概念。

## 1. ComponentDeclaration

Ownership: UI implementation layer

Purpose: 表示 Catalog 可读取的组件声明表面。

Consumers: Catalog generation

Change rule: ComponentDeclaration 变化必须同步 CatalogItem 和 CatalogProp。

## 2. AgentHtmlDocument

Ownership: agent-html authoring boundary

Purpose: 表示 agent 输出的完整 agent-html 文档。

Consumers: parse / sanitize, renderer

Change rule: 文档级结构变更必须同步 `agent-html-to-renderer` contract。

## 3. AgentHtmlNode

Ownership: agent-html authoring boundary

Purpose: 表示 agent-html 中的语义节点。

Consumers: parse / sanitize, renderer

Change rule: 节点能力变更必须同步 Catalog 和 renderer 注册规则。

## 4. CatalogItem

Ownership: Agent Component Catalog

Purpose: 表示一个 agent-facing 语义积木。

Consumers: agent, agent-html authoring flow

Change rule: 新增、删除或重命名 CatalogItem 必须同步示例和 contract。

## 5. CatalogProp

Ownership: Agent Component Catalog

Purpose: 描述 agent 可填写的 props。

Consumers: agent, catalog validation

Change rule: CatalogProp 不得暴露内部 props、Tailwind class 或 shadcn/ui props。

## 6. RendererBlock

Ownership: renderer

Purpose: 表示 renderer 可渲染的已注册语义积木。

Consumers: renderer

Change rule: RendererBlock 必须对应 CatalogItem，除非是内部保留块。

## 7. SanitizedAgentHtml

Ownership: parse / sanitize

Purpose: 表示经过检查、可交给 renderer 的 agent-html 结构。

Consumers: renderer

Change rule: 任何进入 renderer 的 agent-html 必须先成为 SanitizedAgentHtml。

## 8. PortableArtifact

Ownership: portable output

Purpose: 表示可打开、可分享、可归档的静态交付物。

Consumers: user, sharing flow

Change rule: PortableArtifact 不得依赖未声明运行环境或绕过安全边界。
