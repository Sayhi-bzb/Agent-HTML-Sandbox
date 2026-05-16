# Parse / Sanitize Tool Reference

本文记录 agent-html 在 parse / sanitize 层的采购判断。正式边界以 `architecture-design/architecture.md`、`architecture-design/invariants.md` 和 contracts 为准。

## Decision

采购 rehype 生态作为 `agent-html + render config header -> SanitizedAgentHtml` 的主路径。

核心判断：

```txt
rehype supplies the inspectable AST pipeline.
rehype-sanitize supplies the primary schema gate.
parse5 supplies parser-level HTML correctness.
DOMPurify supplies optional runtime defense.
RenderConfig header is validated as finite document style config selection;
compatibility `profile` entries are treated as aliases to that approved
configuration layer.
SanitizedAgentHtml remains the renderer input authority.
```

## Fit

推荐主路径：

```txt
agent-html text + render config header
        ↓
rehype-parse
        ↓
agent-html validation plugin
        ↓
rehype-sanitize strict schema
        ↓
HAST to SanitizedAgentHtml
```

采购分工：

- `rehype`: 可检查 AST pipeline。
- `rehype-sanitize`: allowlist schema gate。
- `parse5`: HTML parsing correctness 和 diagnostics foundation。
- `DOMPurify`: raw escape hatch、browser preview 或最终注入前的二次防线。
- `sanitize-html`: Node sanitizer 备选，不作为主结构化管线。

## Not For

不采购 DOMPurify 或 sanitize-html 作为 `SanitizedAgentHtml` 权威来源。

不采用 cleaned HTML string 直通 renderer 的路径。

不让 `parse5` 独自承担 sanitizer 职责。

不让 render config header 成为 CSS、style、class、Tailwind class、shadcn props、script 或外部 URL 入口。

## Specific Risks

- `rehype-sanitize` schema 配错会直接影响安全边界和合法积木能力。
- render config schema 配错会把 document style config 选择或 compatibility `profile` alias 选择变成样式逃逸口。
- DOMPurify server-side 依赖 DOM 实现；jsdom 版本和配置也进入信任边界。
- SVG、MathML、style、data URL 和外部资源必须单独声明策略。
- diagnostics 必须足够清楚，帮助 agent 修正被拒绝的标签、属性和结构。

## Follow-up

实现前只需补查和当前 schema 设计直接相关的细节：

- agent-html custom tags / attributes 在 `rehype-sanitize` schema 中的表达方式。
- render config header 的解析位置和 key / value 枚举校验方式。
- HAST 到 `SanitizedAgentHtml` 的最小转换形态。
- raw escape hatch 是否需要 DOMPurify 二次防线。
