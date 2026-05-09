# shadcn/ui Tool Reference

本文记录 shadcn/ui 对 agent-html 的采购判断。正式边界以 `architecture-design/architecture.md`、`architecture-design/invariants.md` 和 contracts 为准。

## Decision

采购 shadcn/ui 作为 base blocks 和 renderer implementation supply chain。

不采购完整 shadcn props / registry schema 作为 agent-facing authoring protocol。

核心判断：

```txt
shadcn/ui supplies base component capabilities and editable implementation materials.
RenderConfig may select approved shadcn-backed presentation profiles.
Agent Component Catalog exposes controlled base blocks, custom blocks, and render config schema.
```

## Fit

shadcn/ui 对 agent-html 的价值在三处：

- base blocks: card、button、table、badge、tabs、alert 等基础积木可标准化进入 Catalog。
- render profiles: theme、density、tone 和 layout preset 可标准化为受控 RenderConfig。
- open code: renderer 可以接管、改造和封装组件源码。
- design system base: theme tokens、primitive、icons、utility 和默认视觉质量可作为实现底座。
- registry / CLI: 可分发 renderer block、theme、hook、lib 和 component 实现材料。

推荐关系：

```txt
shadcn registry / component source
        ↓
standardized shadcn base catalog
        ↓
Agent Component Catalog base blocks
```

custom blocks 路径：

```txt
ComponentDeclaration
        ↓
Agent Component Catalog custom blocks
```

`registry:block` 可作为复杂 RendererBlock 的实现材料来源。`components.json`、custom registry、CLI、MCP 和 migrations 都属于开发期采购面。

`meta` 可辅助 base/custom 声明生成，但不能成为 Agent Component Catalog 的权威来源。

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

shadcn registry 解决代码分发，不直接解决 agent-facing block 建模。

## Specific Risks

- registry item 可写文件、安装依赖和注入 CSS；采购动作必须显式触发并审查 diff。
- custom / private registry 涉及远程供应链和凭据；凭据不得进入 portable artifact、Catalog 或 agent-facing 示例。
- shadcn registry 与 Agent Component Catalog 名称相近，容易被误用为 Catalog 权威。
- base blocks 若直接照搬 shadcn props，会把实现接口泄漏给 agent。
- render profiles 若直接照搬 shadcn theme / Tailwind config，会把实现接口泄漏给 agent。
- MCP、CLI 和 migrations 可辅助采购，但 artifact runtime 不应依赖这些能力。
- registry metadata 可辅助声明生成，但不能绕过 base/custom block 声明。

## Follow-up

实现前只需补查和当前任务直接相关的采购细节：

- sandbox 初始化需要的 `components.json` 最小配置。
- shadcn base blocks 的最小 agent-facing props。
- shadcn-backed render profile 的最小枚举集合。
- renderer block registry 是否需要自建 custom registry。
- shadcn registry metadata 到 base/custom block 声明的辅助映射边界。
