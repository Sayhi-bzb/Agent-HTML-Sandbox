# Contracts Index

本索引用于路由 agent-html architecture contracts。

## Main Chain

```txt
user installs ahtml
        ↓
agent writes standard document
        ↓
CLI schema / compose / validate / build
        ↓
ahtml core parse / sanitize
        ↓
SanitizedAgentHtml { meta, components }
        ↓
managed runtime under ~/.ahtml
        ↓
renderer adapter
        ↓
React output + HTML output
        ↓
portable output
```

## Schema Maintenance Chain

```txt
managed runtime shadcn/ui implementation
        ↓
generated shadcn introspection
        ↓
explicit schema overlay
        ↓
ComponentSchema
```

## Contracts

- `cli-to-managed-runtime.md`: CLI 到 managed runtime、template 和 renderer adapter。
- `shadcn-to-component-schema.md`: shadcn/ui 实现到标准组件 schema。
- `component-schema-to-agent-html.md`: 标准组件 schema 到 agent-html 和 render config header。
- `cli-to-artifact.md`: CLI 到 agent-html、renderer adapter 和 artifact。
- `agent-html-to-renderer.md`: agent-html 经 core parse / sanitize 后到 renderer adapter。
- `engine-to-renderer-adapter.md`: core engine 到 renderer adapter。
- `renderer-to-portable-output.md`: renderer adapter 到 React / HTML / portable output。
