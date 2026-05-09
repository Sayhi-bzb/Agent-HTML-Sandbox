# MVP Checkpoints

本文用于 coder 完成 MVP 施工后逐项勾选。只记录关键验收节点，不重复 roadmap 的施工说明。

## Phase 0: App Foundation

- [x] Vite + React + TypeScript app runs in repo root.
- [x] shadcn/ui is initialized without introducing a monorepo.
- [x] MVP shadcn components exist under `src/components/ui/`.
- [x] `npm run build` succeeds.

## Phase 1: Public Types

- [x] `CatalogItem`, `CatalogProp`, `RenderConfig`, `SanitizedAgentHtml`, and `SanitizedNode` exist.
- [x] `RenderConfig` is finite enum based.
- [x] `SanitizedAgentHtml` models `meta + blocks`, not a cleaned HTML string.
- [x] Renderer types do not accept raw agent output as the main input.

Verification:

- [x] `npx tsc -b` succeeds.
- [x] `npm run lint` succeeds with existing shadcn fast-refresh warnings only.
- [x] `npx prettier --check src/agent-html/types.ts src/agent-html/types.test.ts` succeeds.
- [x] `npm run test:run` succeeds.
- [x] `npm run build` succeeds.

## Phase 2: Base Catalog And Render Config

- [x] MVP base catalog includes `page`, `card`, `badge`, `table`, `row`, `cell`, `list`, and `item`.
- [x] Catalog exposes only agent-facing props.
- [x] Render config schema covers `theme`, `density`, `tone`, and `width`.
- [x] Catalog does not expose full shadcn props, Tailwind classes, `className`, `style`, CSS, script, or external URL passthrough.

Verification:

- [x] `zod` is available as the runtime schema dependency.
- [x] `npx tsc -b` succeeds.
- [x] `npm run lint` succeeds with existing shadcn fast-refresh warnings only.
- [x] `npx prettier --check src/agent-html/base-catalog.ts src/agent-html/base-catalog.test.ts src/agent-html/render-config.ts src/agent-html/render-config.test.ts spec/mvp-checkpoints.md` succeeds.
- [x] `npm run test:run` succeeds.
- [x] `npm run build` succeeds.

Follow-up:

- [x] `CatalogPropSchema` should require `enumValues` when `valueKind` is `enum`.
- [x] `BaseCatalogSchema` should validate `allowedChildren` references against registered block names or `TEXT_CHILD`.

## Phase 3: Parse / Validate / Sanitize

- [x] Valid MVP agent-html produces `SanitizedAgentHtml { meta, blocks }`.
- [x] `<meta-agent />` is parsed and validated through the render config schema.
- [x] Unknown blocks, unknown attrs, and invalid nesting are diagnosed.
- [x] `script`, `onclick`, `style`, `class`, and CSS-like header values are rejected or diagnosed.
- [x] Parser does not pass cleaned HTML directly to renderer.

Verification:

- [x] `parse5` is available as the parser dependency.
- [x] `npx tsc -b` succeeds.
- [x] `npm run lint` succeeds with existing shadcn fast-refresh warnings only.
- [x] `npx prettier --check src/agent-html/parse/parse-agent-html.ts src/agent-html/parse/validate-agent-html.ts src/agent-html/parse/sanitize-agent-html.ts src/agent-html/parse/sanitize-agent-html.test.ts` succeeds.
- [x] `npm run test:run` succeeds.
- [x] `npm run build` succeeds.

## Phase 4: Renderer Registry

- [x] Renderer accepts only `SanitizedAgentHtml`.
- [x] Base blocks render through a registry, not hardcoded raw HTML passthrough.
- [x] shadcn components are used as internal renderer materials.
- [x] Render profiles map to internal presets, not arbitrary user-provided CSS or class values.
- [x] Unknown blocks cannot render.

Verification:

- [x] `npx tsc -b` succeeds.
- [x] `npm run lint` succeeds with existing shadcn fast-refresh warnings only.
- [x] `npx prettier --check src/agent-html/renderer/render-profile.ts src/agent-html/renderer/block-registry.tsx src/agent-html/renderer/AgentHtmlRenderer.tsx src/agent-html/renderer/AgentHtmlRenderer.test.tsx` succeeds.
- [ ] `npm run test:run -- src/agent-html/renderer/AgentHtmlRenderer.test.tsx` is blocked by local `esbuild spawn EPERM` before tests execute.
- [ ] `npm run build` is blocked by local `esbuild spawn EPERM` while loading Vite config.

## Phase 5: End-to-End Demo

- [x] A checked-in `.agent.html` example uses `<meta-agent />` and MVP base blocks.
- [x] The example renders through parse / sanitize / renderer in the app.
- [x] The app shows the rendered artifact by default, not source text or debug diagnostics.
- [ ] `npm run build` succeeds after the demo is wired.

Verification:

- [x] `npx tsc -b` succeeds.
- [x] `npm run lint` succeeds with existing shadcn fast-refresh warnings only.
- [x] `npx prettier --check --ignore-unknown src/App.tsx src/App.test.tsx src/agent-html/examples/payment-review.agent.html` succeeds.
- [ ] `npm run test:run -- src/App.test.tsx` is blocked by local `esbuild spawn EPERM` before tests execute.
- [ ] `npm run build` is blocked by local `esbuild spawn EPERM` while loading Vite config.

## Phase 6: Static Artifact

- [x] Vite static build produces a directory artifact.
- [x] Built artifact works through a static server.
- [x] Final artifact does not require the dev server.
- [x] No source map, CDN, remote font, or external runtime dependency is accidentally introduced.

## Stop Conditions

- [x] No Tailwind class, CSS, `style`, or `className` is exposed to agent-html.
- [x] No shadcn props are passed directly through Catalog.
- [x] No raw agent HTML is rendered.
- [ ] Portable output does not bypass parse / sanitize.
- [x] MVP does not require custom block generation.
- [x] MVP remains single-package, not monorepo.
