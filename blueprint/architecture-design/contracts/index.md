# Contracts Index

本索引用于路由 agent-html architecture contracts。

## Main Chain

```txt
shadcn/ui implementation
        ↓
standardized component schema
        ↓
CLI schema / compose
        ↓
agent-html + optional render config header
        ↓
parse / sanitize
        ↓
SanitizedAgentHtml { meta, components }
        ↓
renderer
        ↓
React output + HTML output
        ↓
portable output
```

## Contracts

- `shadcn-to-component-schema.md`: shadcn/ui 实现到标准组件 schema。
- `component-schema-to-agent-html.md`: 标准组件 schema 到 agent-html 和 render config header。
- `cli-to-artifact.md`: CLI 到 agent-html、renderer 和 artifact。
- `agent-html-to-renderer.md`: agent-html 经 parse / sanitize 后到 renderer。
- `renderer-to-portable-output.md`: renderer 到 React / HTML / portable output。
