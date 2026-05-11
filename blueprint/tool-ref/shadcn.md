# shadcn/ui Tool Reference

本文记录 shadcn/ui 对 agent-html 的采购判断。正式边界以 `architecture-design/architecture.md`、`architecture-design/invariants.md` 和 contracts 为准。

## Decision

采购 shadcn/ui 作为标准组件实现底座和 user-local renderer adapter 材料。

不采购完整 shadcn props / registry schema 作为 agent-facing authoring protocol。

核心判断：

```txt
shadcn/ui supplies implementation materials.
user project owns shadcn components and styles.
standardized component schema exposes fixed components, props, and slots.
RenderConfig may select approved shadcn-backed presentation profiles.
```

## Fit

shadcn/ui 对 agent-html 的价值在四处：

- standard components: card、button、table、badge、tabs、alert 等可封装为固定结构组件。
- render profiles: theme、density、tone 和 layout preset 可标准化为受控 RenderConfig。
- open code: renderer adapter 可以接管、改造和封装组件源码。
- design system base: theme tokens、primitive、icons、utility 和默认视觉质量可作为实现底座。
- registry / CLI: 可分发 renderer component、theme、hook、lib 和 component 实现材料到用户项目。

推荐关系：

```txt
shadcn registry / component source
        ↓
user-local renderer adapter
        ↓
standardized component schema
        ↓
agent standard syntax
```

`registry:block` 可作为复杂 RendererComponent 的实现材料来源。`components.json`、custom registry、CLI、MCP 和 migrations 都属于 project integration 采购面。

`meta` 可辅助 schema 维护，但不能成为 ComponentSchema 的权威来源。

RenderConfig 可选择 shadcn-backed profile，但不直接暴露 shadcn props、Tailwind class 或 CSS token 任意值。

## Not For

shadcn/ui 不原样定义 agent-html 协议。

以下内容不得进入 agent-facing 主接口：

- 完整 shadcn component props。
- Radix / Base UI props。
- Tailwind class 和 `className`。
- shadcn registry schema。
- shadcn theme object 或 CSS token 任意值。
- shadcn component source structure。

shadcn registry 解决代码分发，不直接解决 agent-facing component schema 建模。

shadcn/ui 不属于 core engine 依赖。

## Specific Risks

- registry item 可写文件、安装依赖和注入 CSS；采购动作必须显式触发并审查 diff。
- custom / private registry 涉及远程供应链和凭据；凭据不得进入 portable artifact、schema 或 agent-facing 示例。
- shadcn 自身自由度很高，若直接暴露 props 会把维护成本推给 agent 和 renderer。
- render profiles 若直接照搬 shadcn theme / Tailwind config，会把实现接口泄漏给 agent。
- MCP、CLI 和 migrations 可辅助采购，但 artifact runtime 不应依赖这些能力。
- CLI 写入用户项目时必须区分 generated files 和 user files。
- registry metadata 可辅助 schema 维护，但不能绕过标准组件声明。

## Follow-up

实现前只需补查和当前任务直接相关的采购细节：

- sandbox 初始化需要的 `components.json` 最小配置。
- user-local adapter 初始化需要的 `components.json` 最小配置。
- 标准组件的最小 agent-facing props。
- 标准组件的固定 slot 结构。
- shadcn-backed render profile 的最小枚举集合。
- renderer component registry 是否需要自建 custom registry。
