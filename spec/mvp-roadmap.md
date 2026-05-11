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

## Current Code Alignment

当前代码已从 package-local Vite app 收敛为 config + engine + CLI + user-local integration。代码现状是：

```txt
installed ahtml package
        ↓
src/cli schema / compose / validate / build / preview / inspect / doctor
        ↓
src/config finite defaults + user project config
        ↓
src/engine ComponentSchema + parser + sanitizer
        ↓
user-local Vite + shadcn renderer adapter
        ↓
static artifact directory
```

已完成：

- `ahtml` bin 入口和 installed package smoke verification。
- `schema`、`compose`、`validate`、`build`、`preview`、`inspect`、`status`、`doctor`、`config`。
- ComponentSchema + explicit overlay 取代旧 base catalog。
- parse / validate / sanitize 仍作为 renderer 前安全边界。
- package verification 覆盖 installed CLI closed loop。
- `ahtml init` 写入有限的 `agent-html.project.json`。
- 默认 `ahtml init` 通过用户本地 shadcn CLI 创建或连接 `vite-shadcn` 底座，并写入 ahtml 集成文件。
- `ahtml init --scaffold` 保留为高级 fallback，用于不调用 shadcn CLI 时写入最小本地骨架。
- 推荐首次使用路径收敛为 `ahtml init`，再运行 `ahtml status` / `ahtml doctor`。
- 用户可以选择 shadcn template / preset。
- `ahtml init --apply` 通过 shadcn CLI 执行 template / preset 初始化和组件安装命令。
- `doctor` / setup config 会报告缺失的 user-local shadcn components。
- core package 与 Vite、React、shadcn/ui、Tailwind 的依赖分离。
- 单包内代码边界拆成 `src/config`、`src/engine`、`src/cli`。
- renderer adapter 作为用户项目侧 template / generated code。

已清理的技术分叉：

- root Vite app 不再是仓库产品本体。
- package-local Vite builder 已从 `build` 主路径移除。
- package-local renderer 和 root `src/components/ui/` 不再进入 package runtime。
- Vite / shadcn / React / Tailwind 留在用户项目 scaffold 和 adapter 边界。

## Scope

MVP includes:

- Keep repository shape single-package.
- Keep internal package modules as `config`, `engine`, and `cli`.
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
- Checks Node availability and user-local integration readiness.
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

## Next Roadmap: User-local shadcn Integration

下一阶段已经把 CLI closed loop 从 package-local builder 演进为用户本地 shadcn 项目集成：

```txt
user installs ahtml
        ↓
ahtml init
        ↓
choose shadcn template / preset
        ↓
delegate shadcn setup and write user-local ahtml renderer adapter
        ↓
ahtml doctor verifies setup
        ↓
ahtml build / preview uses the user project integration
        ↓
static artifact
```

### Phase A: Init And Project Detection

Build:

- Add `ahtml init` as the setup command.
- Detect whether the current directory already has `components.json`, Vite config, package manager, Tailwind CSS file, and shadcn aliases.
- If no supported project exists, delegate default `vite-shadcn` project setup to shadcn CLI.
- Keep `ahtml init --scaffold` only as an advanced fallback for a minimal local scaffold.
- Store only finite ahtml project config; do not store Tailwind classes, arbitrary CSS, or shadcn props as agent-facing config.

### Phase B: shadcn Template / Preset Selection

Build:

- Let the user choose a supported shadcn template / preset during `ahtml init`.
- Apply the selected template / preset through shadcn CLI.
- Install required shadcn components for the current ComponentSchema.
- Add a check that reports missing user-local shadcn components without silently falling back to package-local UI.

### Phase C: Renderer Adapter Boundary

Build:

- Define the renderer adapter input as `SanitizedAgentHtml`.
- Generate or install a user-local React shadcn renderer adapter.
- Keep ComponentSchema and renderer registration synchronized.
- Keep package-local renderer out of the package runtime path.

### Phase D: Core Extraction

Build:

- Separate core parse / validate / sanitize, ComponentSchema, RenderConfig and diagnostics from Vite/React/shadcn/Tailwind dependencies.
- Keep CLI orchestration in its own layer.
- Move Vite/shadcn requirements to template / adapter packaging.
- Update package verification to prove core commands do not require package-local Vite when using a user-local adapter.

Stop if this requires exposing Tailwind class, `className`, full shadcn props, arbitrary CSS, script, event handlers, or raw HTML passthrough to agent-facing input.
