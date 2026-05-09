# MVP Checkpoints

本文只记录重点 phase 的验收节点。详细施工顺序见 `spec/mvp-roadmap.md`。

## Phase 1: Component Schema Surface

- [ ] Public types use `ComponentSchema`, `ComponentPropSchema`, `StandardAgentNode`, and `SanitizedAgentHtml`.
- [ ] `SanitizedAgentHtml` models `meta + components`, not a cleaned HTML string.
- [ ] Standard component schema includes `page`, `card`, `badge`, `table`, `row`, `cell`, `list`, and `item`.
- [ ] Component schema exposes only semantic props and allowed children.
- [ ] Component schema blocks `class`, `className`, `style`, CSS, script, events, Radix props, `asChild`, full shadcn props, and external URLs.
- [ ] Prompt generation reads component schema and render config, not component source as agent-facing documentation.

## Phase 2: Parse / Validate / Sanitize

- [ ] Valid MVP agent-html produces `SanitizedAgentHtml { meta, components }`.
- [ ] `<meta-agent />` is parsed and validated through finite render config enums.
- [ ] Unknown components, unknown props, invalid enum values and invalid nesting are diagnosed.
- [ ] `script`, event handlers, style props, class props and CSS-like render config values are rejected or diagnosed.
- [ ] Parser does not pass cleaned HTML directly to renderer.

## Phase 3: Renderer

- [ ] Renderer accepts only `SanitizedAgentHtml`.
- [ ] Renderer maps standard components through `RendererComponent` registry.
- [ ] shadcn/ui components are used only as internal renderer materials.
- [ ] Render profiles map to internal presets, not arbitrary CSS or class values.
- [ ] Unknown components cannot render.
- [ ] Dev preview and build artifact share the same renderer path.

## Phase 4: Demo And Static Artifact

- [ ] Checked-in `.agent.html` example uses standard components and optional `<meta-agent />`.
- [ ] App renders the artifact by default, not source text or debug diagnostics.
- [ ] `npm run test:run` succeeds.
- [ ] `npm run build` succeeds.
- [ ] Build output is a directory static artifact with `index.html` and assets.
- [ ] Final artifact does not require Vite dev server, HMR or dev overlay.

## Stop Conditions

- [ ] No Tailwind class, CSS, `style`, `className`, event handler, Radix prop or full shadcn prop is exposed to agent-html.
- [ ] Generated shadcn introspection is not published as the agent-facing schema.
- [ ] No raw agent HTML is rendered.
- [ ] Portable output does not bypass parse / sanitize.
- [ ] MVP remains single-package, not monorepo.
