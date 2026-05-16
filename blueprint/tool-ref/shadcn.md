# shadcn/ui Tool Reference

本文记录 shadcn/ui 对 agent-html 的采购判断。正式边界以 `architecture-design/architecture.md`、`architecture-design/invariants.md` 和 contracts 为准。

## Decision

采购 shadcn/ui 作为 managed runtime 中的标准组件实现底座。

不采购完整 shadcn props / registry schema 作为 agent-facing authoring protocol。

核心判断：

```txt
shadcn template / init / registry supplies the complete runtime UI surface.
managed runtime hosts that shadcn-native surface.
standardized component schema exposes fixed components, semantic props, and slots.
document style config reference exposes approved visual choices through
style-ref as the public config model.
```

shadcn template / init / registry 是 source of truth。ahtml 不维护平行的 shadcn UI kit、global CSS、base layer、component copy 或 pseudo template。

## Fit

shadcn/ui 对 agent-html 的价值在四处：

- standard components: card、button、table、badge、tabs、alert 等可封装为固定结构语义组件。
- document style config: 文档级视觉配置入口可解析到受控 theme、density、card treatment、table treatment、badge treatment、emphasis 和 width 等 token，并通过 `style-ref` 选择已批准配置。
- open code: renderer adapter 可以通过受控 registry / resolver 封装 shadcn exports，但不接管 shadcn template surface。
- design system base: theme tokens、base layer、primitive、icons、utility、CSS entry 和默认视觉质量可作为实现底座。
- registry / CLI: 可分发 renderer component、theme、hook、lib 和 component 实现材料到 managed runtime。

推荐关系：

```txt
shadcn template / init / registry
        ↓
shadcn-native managed runtime surface
        ↓
ahtml-injected renderer adapter
        ↓
semantic component contract + document style config reference
        ↓
agent standard syntax
```

`registry:block` 可作为复杂 RendererComponent 的实现材料来源。`components.json`、custom registry、CLI、MCP 和 migrations 都属于 managed runtime 采购面。

`shadcn add` 只安装 registry item，不等于完整 initialization。`shadcn apply --only theme` 只更新有限 preset 部分，也不等于完整 CSS/base surface。managed runtime bootstrap 应使用 shadcn template / init / registry 建立完整 surface，再由 ahtml 注入 renderer app、verification data 和 artifact build wiring。

registry metadata 和组件源码可辅助 contract 维护，但不能成为 ComponentSchema 的权威来源。

RenderConfig 可选择 approved document style config reference，不直接暴露 shadcn props、Tailwind class 或 CSS token 任意值。

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

shadcn component source、global CSS、base layer、Tailwind entry 和 component copies 不属于 ahtml package 的主路径资产。若短期保留 migration fallback，必须默认关闭并记录移除条件。

## Specific Risks

- registry item 可写文件、安装依赖和注入 CSS；采购动作必须显式触发并审查 diff。
- custom / private registry 涉及远程供应链和凭据；凭据不得进入 portable artifact、schema 或 agent-facing 示例。
- shadcn 自身自由度很高，若直接暴露 props 会把维护成本推给 agent 和 renderer。
- 只运行 `add` 或 `apply --only theme` 会造成半初始化 runtime：组件 DOM 可能存在，但 global CSS/base layer 缺失，最终视觉偏离 shadcn。
- ahtml 手写或截断 shadcn CSS 会制造长期技术债；doctor / tests 必须检查完整 shadcn runtime surface，而不只是组件文件存在。
- 如果把 document style config 直接摊平成 theme / Tailwind config / variant 选项，会把实现接口泄漏给 agent。
- MCP、CLI 和 migrations 可辅助采购，但 artifact runtime 不应依赖这些能力。
- CLI 写入 managed runtime 时必须区分 runtime files、user files 和 package files。
- registry metadata 可辅助 contract 维护，但不能绕过标准组件声明。

## Follow-up

实现前只需补查和当前任务直接相关的采购细节：

- managed runtime 初始化需要的 shadcn template / init 命令、`components.json` 和 CSS/base surface 最小配置。
- managed runtime adapter 注入点：哪些文件由 shadcn 拥有，哪些文件由 ahtml 生成。
- 标准组件的最小 agent-facing props。
- 标准组件的固定 slot 结构。
- DocumentStyleConfigReference 与 `style-ref` public syntax 的最小字段集合。
- renderer component registry 是否需要自建 custom registry。
