# MVP Roadmap

本文记录 agent-html MVP 的施工顺序。它服务于 coder 开工，不替代 `blueprint/` 中的架构边界。

重点验收节点见 `spec/mvp-checkpoints.md`。

## MVP Goal

MVP 证明一条最小闭环：

```txt
agent-html text with meta-agent header
        ↓
parse / validate / sanitize
        ↓
SanitizedAgentHtml { meta, blocks }
        ↓
React renderer
        ↓
shadcn/ui based static artifact
```

MVP 只使用 shadcn 已有组件和普通语义 HTML，不做 custom UI kit。

## Scope

MVP includes:

- Single Vite + React + TypeScript app.
- shadcn/ui installed with `npx shadcn@latest add`.
- Base blocks: `page`, `card`, `badge`, `table`, `row`, `list`, `item`.
- Render config header: `<meta-agent theme="" density="" tone="" width="" />`.
- Finite render config enum validation.
- Structured `SanitizedAgentHtml`.
- Renderer block registry for MVP base blocks.
- Vite static build.

MVP excludes:

- Monorepo.
- Custom block generation.
- TypeDoc / TSDoc pipeline.
- Mermaid, Shiki, Recharts, TanStack Table, dnd-kit.
- raw HTML escape hatch.
- Single-file export.
- Arbitrary CSS, Tailwind class, shadcn props, script, external resource passthrough.

## Recommended Root Layout

```txt
Agent-HTML-Sandbox/
  package.json
  vite.config.ts
  tsconfig.json
  components.json

  blueprint/
  demo/
  ref/
  spec/

  src/
    main.tsx
    App.tsx
    index.css

    agent-html/
      types.ts
      base-catalog.ts
      render-config.ts

      parse/
        parse-agent-html.ts
        validate-agent-html.ts
        sanitize-agent-html.ts

      renderer/
        AgentHtmlRenderer.tsx
        block-registry.tsx
        render-profile.ts

      examples/
        payment-review.agent.html

    components/
      ui/

    lib/
      utils.ts
```

## Phase 0: App Foundation

Build:

- Initialize Vite React TypeScript app in the repo root.
- Initialize shadcn/ui.
- Add MVP components:

```bash
npx shadcn@latest add card badge table button separator alert
```

## Phase 1: Public Types

Build:

- Define `CatalogItem`, `CatalogProp`, `RenderConfig`, `SanitizedAgentHtml`, and `SanitizedNode`.
- Keep types independent from React, shadcn props, Tailwind classes, and DOM nodes.

## Phase 2: Base Catalog And Render Config Schema

Build:

- Handwrite MVP base catalog.
- Define allowed block props and nesting constraints.
- Define render config schema:
  - `theme`: `neutral`
  - `density`: `compact`, `comfortable`
  - `tone`: `report`, `dashboard`, `decision`
  - `width`: `article`, `dashboard`, `wide`

## Phase 3: Parse / Validate / Sanitize

Build:

- Parse agent-html text into an inspectable structure.
- Extract and validate optional `<meta-agent />`.
- Validate allowed blocks, attrs, text children, and nesting.
- Emit `SanitizedAgentHtml { meta, blocks }`.

## Phase 4: Renderer Registry

Build:

- Implement `RendererBlock` registry.
- Map base blocks to renderer adapters:
  - `page`: layout wrapper.
  - `card`: shadcn Card.
  - `badge`: shadcn Badge.
  - `table` / `row`: shadcn Table or semantic table wrapper.
  - `list` / `item`: semantic list wrapper.
- Apply `RenderConfig` through approved renderer profiles.

## Phase 5: End-to-End Demo

Build:

- Add one representative `.agent.html` example.
- Render it in the app.
- Show parse diagnostics for invalid examples if practical.

## Phase 6: Static Artifact

Build:

- Verify Vite static build output.
- Keep default delivery as directory artifact.

## Stop Conditions

Stop and revisit blueprint if any implementation requires:

- Exposing Tailwind class, CSS, `style`, or `className` to agent-html.
- Passing shadcn props directly through Catalog.
- Rendering raw agent HTML.
- Letting portable output bypass parse / sanitize.
- Adding custom block generation to finish MVP.
- Splitting into monorepo before the MVP loop runs.

## Monorepo Trigger

Do not use a monorepo for MVP.

Consider splitting only when at least one is true:

- `@agent-html/core` needs to be consumed by multiple apps.
- React renderer needs to be published separately.
- Catalog generation becomes an independent package.
- A CLI or Vite plugin becomes a separate deliverable.
- Tests and build boundaries become clearer as package boundaries than as folders.

Likely future shape:

```txt
apps/demo/
packages/core/
packages/react-renderer/
packages/catalog/
packages/vite-output/
```

## Definition Of Done

MVP is done when:

- A checked-in agent-html example renders through the full pipeline.
- `SanitizedAgentHtml { meta, blocks }` is visible as the renderer input.
- shadcn components are used as internal renderer materials.
- agent-facing examples contain no implementation leakage.
- static build succeeds and produces a shareable directory artifact.
