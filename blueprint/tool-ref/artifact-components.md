# Artifact Components Tool Reference

本文记录 agent-html 在 artifact components 层的采购判断。正式边界以 `architecture-design/architecture.md`、`architecture-design/invariants.md` 和 contracts 为准。

## Decision

采购 artifact components 作为 RendererBlock 的内部表达材料。

核心判断：

```txt
Shiki supplies code and diff rendering.
Mermaid supplies controlled diagram rendering.
TanStack Table supplies structured table logic.
dnd-kit supplies round-trip interaction.
Recharts supplies common chart rendering.
Agent Component Catalog exposes controlled blocks, not tool APIs.
```

## Fit

按表达 block 需求采购：

- `Shiki`: code / diff。
- `Mermaid`: controlled diagram。
- `TanStack Table`: data table。
- `dnd-kit`: triage board / reorder interaction。
- `Recharts`: common chart。

推荐分组：

```txt
static expression:
  Shiki, Mermaid, Recharts

structured data:
  TanStack Table

round-trip interaction:
  dnd-kit
```

## Not For

不把这些工具的 API 暴露给 agent。

agent-facing 层应暴露受控 blocks，例如 code / diff、diagram、data table、chart、triage board。

不让 Mermaid raw DSL、TanStack column definitions、dnd-kit hooks、Recharts props 或 Shiki HTML 输出结构成为 Catalog 表面。

## Specific Risks

- Shiki 输出 HTML 必须由 renderer 生成，不能由 agent 直接提交。
- Mermaid DSL 会产出 SVG，需限制 init directive、HTML labels、click callbacks 和 style/config。
- TanStack Table 是 headless engine，视觉和交互必须由 renderer 封装。
- dnd-kit 引入 runtime state，只应进入显式 round-trip artifact。
- Recharts 必须通过受控 chart spec 使用，不能暴露任意 React props。

## Follow-up

实现前只需补查和首批表达 blocks 直接相关的细节：

- code / diff block 的 Shiki transformer 边界。
- diagram block 的 Mermaid 安全配置。
- chart block 的最小受控 chart spec。
