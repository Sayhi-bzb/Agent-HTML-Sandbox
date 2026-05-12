# Blueprint Rules

## 1. Constitution

`constitution.md` 用于记录长期方向和原则约束。

它不应承担具体技术设计、实现方案、任务拆解或组件规范的职责。

## 2. High-information Writing

blueprint 文档应优先使用能直接锁定方向的高信息量表达。

当少量关键词已经足够定位语义时，不应继续追加泛化、重复或低边际信息的词语。目标是降低读者和 agent 的注意力偏移，保持文档信噪比。

例子：

- 推荐：`爱因斯坦 + 相对论`
- 避免：`爱因斯坦 + 相对论 + 物理学`

前两者已经锁定语义方向，`物理学` 在该上下文中只提供低边际信息，容易变成噪声。

## 3. Index as Context Router

`index.md` 用于导航和上下文路由。

它应说明文档职责、读取条件和推荐读取顺序，帮助读者和 agent 只加载当前任务需要的上下文。

它不应复制正文、不承载临时进度，也不应替代具体的 design、spec 或 plan 文档。

## 4. Single Source of Truth

每个关键事实、原则或决策只能有一个权威出处。

其他文档应引用权威出处，不应重复解释、改写或维护平行版本。

## 5. Stable Vocabulary

同一概念应使用同一名称。

不应在不同文档中用多个近义词指代同一个核心概念，避免 agent 将同一概念误解为多个设计对象。

## 6. Blueprint Style

blueprint 写作应保持正交、克制、最小充分。

新增规则或概念前，应确认它不重复覆盖已有规则。能用现有概念表达清楚时，不引入额外概念。

## 7. Product Boundary First

当实现路线和产品定位冲突时，blueprint 先锁定产品边界，再允许实现迁移。

agent-html 的默认产品边界应服务 agent artifact runtime，而不是前端项目模板或用户项目接入器。

默认概念使用 `managed runtime`、`runtime root`、`core engine` 和 `portable artifact`。不得把 `user-local`、`project integration` 或 `local-project mode` 作为默认路径名称。
