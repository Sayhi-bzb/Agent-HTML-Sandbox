# Contracts Index

本索引用于路由 agent-html architecture contracts。

## Main Chain

```txt
user installs ahtml
        ↓
ahtml init
        ↓
user-local template / renderer adapter
        ↓
shadcn/ui implementation
        ↓
ComponentSchema
        ↓
CLI schema / compose / validate / build
        ↓
agent-html + optional render config header
        ↓
ahtml core parse / sanitize
        ↓
SanitizedAgentHtml { meta, components }
        ↓
renderer adapter
        ↓
React output + HTML output
        ↓
portable output
```

## Contracts

- `cli-to-user-project.md`: CLI 到用户项目、template 和 renderer adapter。
- `shadcn-to-component-schema.md`: shadcn/ui 实现到标准组件 schema。
- `component-schema-to-agent-html.md`: 标准组件 schema 到 agent-html 和 render config header。
- `cli-to-artifact.md`: CLI 到 agent-html、renderer adapter 和 artifact。
- `agent-html-to-renderer.md`: agent-html 经 core parse / sanitize 后到 renderer adapter。
- `engine-to-renderer-adapter.md`: core engine 到 renderer adapter。
- `renderer-to-portable-output.md`: renderer adapter 到 React / HTML / portable output。
