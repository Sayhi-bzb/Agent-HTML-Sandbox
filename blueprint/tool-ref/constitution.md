# Tool Reference Constitution

本文规定 `tool-ref/` 的长期写作原则。它补充 `blueprint_rule.md`，不承担具体模板、状态枚举或任务拆解职责。

## 1. Procurement-first

`tool-ref` 应服务于工具采购判断。

它应帮助读者和 agent 判断某个工具是否适合 agent-html、适合哪一层、会改变哪些边界。

## 2. Low-noise

`tool-ref` 应避免沉淀工具常识、手册内容和低边际信息。

当工具名、概念名或少量关键词已经足够定位语义时，不应继续展开。

## 3. Architecture-aligned

`tool-ref` 应服从 architecture、invariants、contracts 和 implementation rules。

它不应替代架构文档，也不应维护平行原则。

## 4. Decision-relevant

`tool-ref` 只应保留会影响选型、分层、安全、实现顺序或后续调研方向的信息。

不能改变工程判断的内容应删除、压缩或外部引用。

## 5. Tool-specific Risk

`tool-ref` 的风险判断应关注工具特有差异。

通用安全原则应留在架构层，不应在每个工具文档中重复。

## 6. Compress after Research

调研过程可以展开，调研结果应压缩。

长期保留的内容应是高信息量判断，而不是调研路径或资料摘录。
