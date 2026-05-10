# CLI Closed Loop MVP Roadmap

本文记录 `ahtml` 从 artifact builder 走向本地闭环 CLI 的施工顺序。它服务于代码实现，不替代 `blueprint/` 中的架构边界。

Package And Publish MVP 已归档到 `spec/_archive/package-publish-mvp-roadmap.md`。重点验收节点见 `spec/mvp-checkpoints.md`。

## MVP Goal

MVP 证明安装后的 `ahtml` 不需要用户阅读项目源码，也能完成内容生产、校验、构建、本地验收和基础调试：

```txt
schema
  ↓
compose
  ↓
validate
  ↓
build
  ↓
preview
  ↓
inspect / doctor
```

本阶段目标不是远程部署，而是把本地 artifact 工作流闭合。远程部署应作为后续阶段显式设计。

## Scope

MVP includes:

- Keep repository shape single-package.
- Keep `ahtml` as the only public bin.
- Preserve existing `schema`, `compose`, `build`, and `config` behavior.
- Add `validate` as standalone document validation.
- Add `preview` as local artifact preview.
- Add `inspect` as document / artifact summary.
- Add `doctor` as environment and package runtime self-check.
- Extend package verification so installed CLI covers the closed-loop commands.

MVP excludes:

- Public `npm publish`.
- Remote deploy targets such as Vercel, S3, GitHub Pages, or custom servers.
- Monorepo migration.
- New renderer or alternate artifact pipeline.
- Changing ComponentSchema, RenderConfig, parser, sanitizer, renderer, or artifact safety rules unless needed to expose existing information through CLI.
- Exposing Tailwind class, `className`, style, script, event handlers, Radix props, full shadcn props, raw HTML attributes, or external resource passthrough.

## Command Contract

`ahtml validate --input <path>`:

- Reads a standard `.agent.html` document.
- Runs the same parse / validate / sanitize path used by `build`.
- Emits diagnostics without generating artifact output.
- Exits non-zero when diagnostics include errors.

`ahtml preview --input <path> [--out <dir>] [--port <port>]`:

- Builds or refreshes the artifact through the same path used by `build`.
- Serves the artifact directory over local HTTP.
- Uses generated static output as the preview source.
- Does not introduce a dev-only visual path.

`ahtml inspect --input <path>|--dir <dir> [--format summary|json]`:

- Reads a document or built artifact.
- Reports effective config and component usage.
- Does not read repository source files.
- Does not treat artifact HTML as an editable source format.

`ahtml doctor`:

- Checks the installed package runtime.
- Checks Node availability and package-local build dependencies.
- Checks config readability and finite config values.
- Checks default output directory writability.
- Separates environment, config, and artifact problems in the output.

Existing commands keep their current roles:

- `schema` outputs the agent-facing contract.
- `compose` writes a standard document.
- `build` validates, sanitizes, and renders static output.
- `config` manages finite presentation / output values.

## Phase 0: CLI Gap Audit

Build:

- Map current `schema`, `compose`, `build`, and `config` paths.
- Identify the shared validation path used by `compose` and `build`.
- Identify what metadata `inspect` can derive without reading source files.
- Identify how `preview` can serve built output without creating a second renderer.

Stop if any command requires bypassing sanitize or reading dev shell files after package install.

## Phase 1: Validate

Build:

- Add `validate` command.
- Reuse existing diagnostics formatting unless a structured output helper already exists.
- Keep validation side-effect free.
- Cover valid document, invalid document, blocked prop, and missing input.

## Phase 2: Inspect

Build:

- Add document inspection from `.agent.html`.
- Add artifact inspection from built output when metadata is available.
- Report effective render config.
- Report component usage by component name and count.
- Support human summary first; JSON output is allowed when simple and stable.

## Phase 3: Doctor

Build:

- Add runtime self-checks for package root, user root, Node, Vite availability, config, and output path.
- Keep checks local and deterministic.
- Use clear pass/fail diagnostics.
- Avoid network checks.

## Phase 4: Preview

Build:

- Add local preview command.
- Build through the same artifact path as `build`.
- Serve the output directory over HTTP.
- Support explicit port.
- Fail clearly when the port is unavailable.

## Phase 5: Package Verification

Build:

- Extend local tarball verification to run installed `validate`, `inspect`, and `doctor`.
- Smoke-test `preview` without leaving a long-running process.
- Keep `npm run agent --` as repository fallback only.
- Update README after command behavior is proven.

## Stop Conditions

Stop and revisit blueprint if implementation requires:

- Reading repository-local source files from an installed package.
- Shipping blueprint, spec, tests, fixtures, or dev-only exploration files as runtime surface.
- Bypassing parse / validate / sanitize in any command.
- Creating an independent renderer for preview.
- Treating `.agent.html` or artifact HTML as arbitrary HTML input.
- Exposing implementation props, CSS, script, event handlers, or external resource passthrough.
- Adding remote deploy before local closed loop is complete.

## Definition Of Done

CLI Closed Loop MVP is done when an installed package can run:

```bash
ahtml schema --format prompt
ahtml compose --input composition.json --out artifact.agent.html
ahtml validate --input artifact.agent.html
ahtml build --input artifact.agent.html --out dist/html
ahtml inspect --input artifact.agent.html
ahtml inspect --dir dist/html
ahtml doctor
```

And:

- `preview` serves the same output that `build` generates.
- Invalid documents fail through `validate` and `build`.
- Packaged CLI covers the new commands in `npm run verify:pack`.
- Existing tests and build still pass.
