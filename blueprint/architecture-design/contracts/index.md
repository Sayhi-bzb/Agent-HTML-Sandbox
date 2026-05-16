# Contracts Index

本索引用于路由 agent-html architecture contracts。

## Main Chain

```txt
user installs ahtml
        ↓
agent writes standard document
        ↓
CLI schema / validate / build
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

## Public Contract Chain

```txt
semantic component declaration
        +
document style config reference
        ↓
ComponentSchema + approved visual config entry
        ↓
CLI schema output
        ↓
agent-facing authoring contract
```

## Runtime Verification Chain

```txt
managed runtime shadcn/ui implementation
        ↓
runtime verification facts
        ↓
drift checks + renderer registry inputs
        ↓
contract verification
```

## Contracts

- `cli-to-managed-runtime.md`: CLI 到 managed runtime、template 和 renderer adapter。
- `shadcn-to-component-schema.md`: shadcn/ui 实现到标准组件 contract 和 runtime verification checks。
- `component-schema-to-agent-html.md`: 标准组件 schema 到 agent-html 和文档级视觉配置入口。
- `cli-to-artifact.md`: CLI 到 agent-html、renderer adapter 和 artifact。
- `agent-html-to-renderer.md`: agent-html 经 core parse / sanitize 后到 renderer adapter。
- `engine-to-renderer-adapter.md`: core engine 到 renderer adapter。
- `renderer-to-portable-output.md`: renderer adapter 到 React / HTML / portable output。
