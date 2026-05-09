# MVP Checkpoints

本文用于 coder 完成 MVP 施工后逐项勾选。只记录关键验收节点，不重复 roadmap 的施工说明。

## Phase 0: App Foundation

- [ ] Vite + React + TypeScript app runs in repo root.
- [ ] shadcn/ui is initialized without introducing a monorepo.
- [ ] MVP shadcn components exist under `src/components/ui/`.
- [ ] `npm run build` succeeds.

## Phase 1: Public Types

- [ ] `CatalogItem`, `CatalogProp`, `RenderConfig`, `SanitizedAgentHtml`, and `SanitizedNode` exist.
- [ ] `RenderConfig` is finite enum based.
- [ ] `SanitizedAgentHtml` models `meta + blocks`, not a cleaned HTML string.
- [ ] Renderer types do not accept raw agent output as the main input.

## Phase 2: Base Catalog And Render Config

- [ ] MVP base catalog includes `page`, `card`, `badge`, `table`, `row`, `list`, and `item`.
- [ ] Catalog exposes only agent-facing props.
- [ ] Render config schema covers `theme`, `density`, `tone`, and `width`.
- [ ] Catalog does not expose full shadcn props, Tailwind classes, `className`, `style`, CSS, script, or external URL passthrough.

## Phase 3: Parse / Validate / Sanitize

- [ ] Valid MVP agent-html produces `SanitizedAgentHtml { meta, blocks }`.
- [ ] `<meta-agent />` is parsed and validated through the render config schema.
- [ ] Unknown blocks, unknown attrs, and invalid nesting are diagnosed.
- [ ] `script`, `onclick`, `style`, `class`, and CSS-like header values are rejected or diagnosed.
- [ ] Parser does not pass cleaned HTML directly to renderer.

## Phase 4: Renderer Registry

- [ ] Renderer accepts only `SanitizedAgentHtml`.
- [ ] Base blocks render through a registry, not hardcoded raw HTML passthrough.
- [ ] shadcn components are used as internal renderer materials.
- [ ] Render profiles map to internal presets, not arbitrary user-provided CSS or class values.
- [ ] Unknown blocks cannot render.

## Phase 5: End-to-End Demo

- [ ] A checked-in `.agent.html` example uses `<meta-agent />` and MVP base blocks.
- [ ] The example renders through parse / sanitize / renderer in the app.
- [ ] At least one invalid example demonstrates blocked script/style/class/shadcn-prop paths.
- [ ] `npm run build` succeeds after the demo is wired.

## Phase 6: Static Artifact

- [ ] Vite static build produces a directory artifact.
- [ ] Built artifact works through a static server.
- [ ] Final artifact does not require the dev server.
- [ ] No source map, CDN, remote font, or external runtime dependency is accidentally introduced.

## Stop Conditions

- [ ] No Tailwind class, CSS, `style`, or `className` is exposed to agent-html.
- [ ] No shadcn props are passed directly through Catalog.
- [ ] No raw agent HTML is rendered.
- [ ] Portable output does not bypass parse / sanitize.
- [ ] MVP does not require custom block generation.
- [ ] MVP remains single-package, not monorepo.
