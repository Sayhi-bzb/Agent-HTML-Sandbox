# MVP Roadmap

本文记录 agent-html MVP 的最终施工顺序。它服务于代码实现，不替代 `blueprint/` 中的架构边界。

重点验收节点见 `spec/mvp-checkpoints.md`。

## MVP Goal

MVP 证明一条最小闭环：

```txt
shadcn/ui implementation
        ↓
standardized component schema
        ↓
agent writes standard agent-html + optional render config header
        ↓
parse / validate / sanitize
        ↓
SanitizedAgentHtml { meta, components }
        ↓
React renderer
        ↓
Vite static build
        ↓
static artifact directory
```

MVP 直接使用 shadcn/ui 作为实现底座。agent-facing 层只暴露标准组件、语义 props、slot / children 结构和有限 render config。

## Scope

MVP includes:

- Single-package Vite + React + TypeScript app in repo root.
- shadcn/ui initialized through `components.json`.
- Standard components: `page`, `card`, `badge`, `table`, `row`, `cell`, `list`, `item`.
- Component schema as the agent-facing authority.
- Render config header: `<meta-agent theme="" density="" tone="" width="" />`.
- Finite render config enum validation.
- Structured `SanitizedAgentHtml { meta, components }`.
- Renderer component registry backed by shadcn/ui components.
- Checked-in `.agent.html` example rendered in the app.
- Directory static artifact from Vite build.

MVP excludes:

- Monorepo.
- Full shadcn props passthrough.
- Tailwind class, `className`, `style`, CSS, script, event handler, Radix prop, or external URL passthrough.
- Generated shadcn introspection implementation.
- ComponentSchemaOverlay tooling.
- Mermaid, Shiki, Recharts, TanStack Table, dnd-kit.
- raw HTML escape hatch.
- Single-file export.

## Recommended Root Layout

```txt
src/
  agent-html/
    types.ts
    component-schema.ts
    component-schema-prompt.txt
    render-config.ts

    parse/
      parse-agent-html.ts
      validate-agent-html.ts
      sanitize-agent-html.ts

    renderer/
      AgentHtmlRenderer.tsx
      component-registry.tsx
      render-profile.ts

    examples/
      payment-review.agent.html

  components/
    ui/

scripts/
  generate-component-schema-prompt.mjs
```

## Phase 0: Foundation

Build:

- Keep MVP as a single-package Vite app.
- Keep shadcn/ui generated files under `src/components/ui/`.
- Keep React, Tailwind, Radix, shadcn props and class composition internal.
- Add only shadcn components needed by the standard renderer.

## Phase 1: Component Schema Surface

Build:

- Define `ComponentSchema`, `ComponentPropSchema`, `ComponentSchemaOverlay`, `GeneratedShadcnIntrospection`, `RenderConfig`, `StandardAgentNode`, `SanitizedAgentHtml`, and `RenderedArtifact`-ready boundaries.
- Handwrite MVP `ComponentSchema` for standard components.
- Generate agent prompt text from component schema and render config.
- Block implementation props by default: `class`, `className`, `style`, CSS, script, events, Radix props, `asChild`, full shadcn props, and external URLs.

## Phase 2: Parse / Validate / Sanitize

Build:

- Parse agent-html text into inspectable nodes.
- Extract and validate optional `<meta-agent />`.
- Validate registered standard components, props, children and nesting.
- Emit `SanitizedAgentHtml { meta, components }`.
- Reject unknown components, unknown props, invalid enum values and style/script escape hatches.

## Phase 3: Renderer

Build:

- Renderer accepts only `SanitizedAgentHtml`.
- Map standard components to internal `RendererComponent` adapters.
- Use shadcn/ui as renderer implementation material.
- Apply `RenderConfig` through registered profiles only.
- Keep dev preview and build artifact on the same renderer path.

## Phase 4: Demo And Static Artifact

Build:

- Render a checked-in `.agent.html` example in the app.
- Show rendered artifact by default, not diagnostics or source text.
- Use Vite static build as the default delivery path.
- Treat final artifact as a directory:

```txt
artifact/
  index.html
  assets/*.js
  assets/*.css
  assets/*
```

## Stop Conditions

Stop and revisit blueprint if implementation requires:

- Exposing style, CSS, Tailwind, `className`, event handlers, Radix props or full shadcn props to agent-html.
- Publishing generated shadcn introspection directly as the agent-facing schema.
- Rendering raw agent HTML.
- Letting portable output bypass parse / sanitize.
- Making dev preview a separate rendering path.
- Adding monorepo boundaries before the MVP loop is stable.

## Definition Of Done

MVP is done when:

- A checked-in agent-html example renders through parse / sanitize / renderer.
- `SanitizedAgentHtml { meta, components }` is the renderer input.
- Standard components use shadcn/ui internally.
- agent-facing examples contain no implementation leakage.
- `npm run test:run` succeeds.
- `npm run build` succeeds and produces a directory static artifact.
