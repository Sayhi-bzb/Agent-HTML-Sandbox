# agent-html Architecture Design Constitution

本章程规定 agent-html 的架构设计方向。

## Product North Star

agent-html 存在的原因是让 agent 用 HTML artifact 替代冗长 Markdown 输出。

agent 应写 AI-native 的语义结构，人应收到稳定、可读、可分享、可归档，并能回到 agent 工作流的 HTML artifact。

安全、schema、sanitize、managed runtime 和 renderer 约束都服务这个产品目标；它们不是产品本体。

## 1. Human-readable First

artifact 的首要目标是帮助人理解、比较和判断。

视觉和交互应服务于信息清晰度，避免为了表现形式削弱可读性。

## 2. Portable

artifact 应便于打开、分享和归档。

应避免让 artifact 过度依赖专用环境或难以迁移的上下文。

## 3. Stable Visual Semantics

相同语义应保持稳定、一致、可迁移的表达方式。

应避免让读者和 agent 在每个 artifact 中重新学习视觉语言。

## 4. Round-trippable

artifact 应支持人的反馈、选择和修改重新进入 agent 工作流。

应避免把 artifact 设计成只能观看、无法形成协作闭环的静态终点。

## 5. Agent-friendly

系统应降低 agent 的无效认知负担，让 agent 专注于内容结构和信息关系。

应避免让 agent 反复处理低语义、易出错的样式和实现噪声。

## 6. Atomic Composability

系统应支持由稳定、可组合的表达单元构建 artifact。

应在一致性和自由度之间保持平衡，避免每次从零开始，也避免把表达限制成僵硬表单。

## 7. Generic Adaptation First

系统应优先建设通用 schema 抽取、通用适配器和通用 renderer，而不是为每个组件手写一条特殊路径。

当 shadcn registry、组件源码、`data-slot`、exports、variants 或安全 props 能支撑通用方案时，禁止新增逐组件手搓 adapter。例外只能作为明确记录的临时兼容层存在，并必须说明为什么通用机制无法覆盖以及移除条件。

## 8. shadcn-native Runtime Base

managed runtime 的 UI surface 必须以 shadcn template / init / registry 为 source of truth。

ahtml 不维护一套平行的 shadcn UI kit、global CSS、base layer、component copy 或 pseudo template。artifact build 仍然存在，但 build project 必须来自 shadcn-native managed runtime；ahtml 只注入 renderer app、sanitized document、verification data 和构建胶水。

当 shadcn 官方 template / init / registry 能提供完整组件、CSS、theme、base layer、依赖和配置时，禁止用 ahtml 手搓 CSS、截断 CSS、复制组件文件或 `apply --only theme` + `add` 组合伪装成完整初始化。例外只能是显式、短期、可删除的兼容层，并必须在 spec 中记录风险和退出条件。

## 9. Lightweight

系统应保持轻量，优先服务于生成、理解和协作。

应避免为 artifact 引入不必要的应用复杂度。

## 10. Constrained Freedom

系统应为 agent 保留表达空间，同时限制低价值或高风险的自由度。

应避免在完全自由和完全僵化之间走向任一极端。

## 11. Inspectable and Safe

artifact 应易于检查、理解和信任。

应避免隐藏行为、不透明依赖和难以审查的副作用。
