# agent-html Architecture Design Constitution

本章程规定 agent-html 的架构设计方向。

## 1. Agent-friendly

系统应降低 agent 的无效认知负担，让 agent 专注于内容结构和信息关系。

应避免让 agent 反复处理低语义、易出错的样式和实现噪声。

## 2. Portable

artifact 应便于打开、分享和归档。

应避免让 artifact 过度依赖专用环境或难以迁移的上下文。

## 3. Atomic Composability

系统应支持由稳定、可组合的表达单元构建 artifact。

应在一致性和自由度之间保持平衡，避免每次从零开始，也避免把表达限制成僵硬表单。

## 4. Lightweight

系统应保持轻量，优先服务于生成、理解和协作。

应避免为 artifact 引入不必要的应用复杂度。

## 5. Human-readable First

artifact 的首要目标是帮助人理解、比较和判断。

视觉和交互应服务于信息清晰度，避免为了表现形式削弱可读性。

## 6. Round-trippable

artifact 应支持人的反馈、选择和修改重新进入 agent 工作流。

应避免把 artifact 设计成只能观看、无法形成协作闭环的静态终点。

## 7. Constrained Freedom

系统应为 agent 保留表达空间，同时限制低价值或高风险的自由度。

应避免在完全自由和完全僵化之间走向任一极端。

## 8. Stable Visual Semantics

相同语义应保持稳定、一致、可迁移的表达方式。

应避免让读者和 agent 在每个 artifact 中重新学习视觉语言。

## 9. Inspectable and Safe

artifact 应易于检查、理解和信任。

应避免隐藏行为、不透明依赖和难以审查的副作用。
