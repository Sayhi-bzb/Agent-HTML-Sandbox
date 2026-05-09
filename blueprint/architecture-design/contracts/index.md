# Contracts Index

本索引用于路由 agent-html architecture contracts。

## Main Chain

```txt
standardized shadcn base catalog ─┐
                                  ├─→ Agent Component Catalog
ComponentDeclaration ─────────────┘
                                  ↓
agent-html + render config header
        ↓
parse / sanitize
        ↓
SanitizedAgentHtml { meta, blocks }
        ↓
renderer
        ↓
portable output
```

## Contracts

- `component-source-to-catalog.md`: base / custom block 声明到 Agent Component Catalog。
- `catalog-to-agent-html.md`: Agent Component Catalog 到 agent-html 和 render config header。
- `agent-html-to-renderer.md`: agent-html 经 parse / sanitize 后到 renderer。
- `renderer-to-portable-output.md`: renderer 到 portable output。
