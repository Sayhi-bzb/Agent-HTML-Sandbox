# CLI MVP Roadmap

本文记录 agent-html CLI MVP 的施工顺序。它服务于代码实现，不替代 `blueprint/` 中的架构边界。

旧版 renderer-first MVP 计划已归档到 `spec/_archive/`。重点验收节点见 `spec/mvp-checkpoints.md`。

## MVP Goal

MVP 证明一条以 CLI 为主入口的最小闭环：

```txt
ComponentSchema + RenderConfig
        ↓
agent-html schema
        ↓
agent-html compose
        ↓
CompositionDocument / .agent.html
        ↓
agent-html build
        ↓
parse / validate / sanitize
        ↓
SanitizedAgentHtml { meta, components }
        ↓
existing React renderer + Vite static build
        ↓
static artifact directory
```

CLI 只编排现有 engine。它不成为新的 schema、renderer、style system 或 artifact 生成旁路。

## Scope

MVP includes:

- Single-package Vite + React + TypeScript app in repo root.
- Node ESM CLI script exposed through `npm run agent --`.
- Commands: `schema`, `compose`, `build`, and `config`.
- `schema` output from `ComponentSchema` and `RenderConfig`.
- `compose` from structured `CompositionInput` to standard `CompositionDocument`.
- `.agent.html` as the inspectable document file shape.
- `build` through parse / validate / sanitize before rendering.
- Existing React renderer and Vite static build as the artifact path.
- Finite `ArtifactConfig` stored in `agent-html.config.json`.

MVP excludes:

- Published global npm package.
- Monorepo.
- Direct raw HTML rendering.
- Independent CLI renderer.
- Full shadcn props passthrough.
- Tailwind class, `className`, `style`, CSS, script, event handler, Radix prop, or external resource passthrough.
- General-purpose config mapped to arbitrary CSS, attributes, scripts, or URLs.

## Command Surface

Expose the local CLI through package scripts:

```txt
npm run agent -- schema [--format prompt|json] [--out <path>]
npm run agent -- compose --input <path>|--stdin [--out <path>]
npm run agent -- build --input <path> [--out <dir>]
npm run agent -- config get
npm run agent -- config set <key> <value>
```

Default paths:

- Config file: `agent-html.config.json`
- Composed document: `artifact.agent.html`
- Build output: `dist/html`

## Phase 0: CLI Foundation

Build:

- Add a local `agent` npm script that runs a Node ESM CLI entrypoint.
- Keep CLI modules outside React component code.
- Route commands explicitly and return non-zero exit codes for invalid input.
- Print diagnostics in a human-readable format.
- Keep all implementation props and renderer internals hidden from command output.

## Phase 1: Schema Command

Build:

- `schema --format prompt` prints agent-facing prompt text.
- `schema --format json` prints structured `CliSchemaOutput`.
- `schema --out <path>` writes the selected schema output.
- Output must come from `ComponentSchema` and `RenderConfig`.
- Output must not expose shadcn props, Radix props, Tailwind class, `className`, `style`, script, event handlers, source paths, or renderer implementation details.

## Phase 2: Compose Command

Build:

- Accept `CompositionInput` from `--input <path>` or `--stdin`.
- Emit a standard `CompositionDocument` to `--out <path>` or the default document path.
- Keep generated document compatible with existing parse / validate / sanitize.
- Support document-level render config through the existing finite config keys.
- Diagnose unknown components, unknown props, invalid children, and blocked implementation fields before writing output.

## Phase 3: Build Command

Build:

- Accept a `CompositionDocument` path through `--input`.
- Run parse / validate / sanitize before any rendering step.
- Stop on diagnostics and do not produce a successful artifact for invalid input.
- Reuse the existing React renderer and Vite build path.
- Produce a directory artifact at `--out <dir>` or `dist/html`.
- Keep the artifact openable as static output without the Vite dev server.

## Phase 4: Config Command

Build:

- `config get` prints the effective `ArtifactConfig`.
- `config set <key> <value>` writes only known config keys and finite enum values.
- Config participates in `schema`, `compose`, and `build` only through declared `ArtifactConfig`.
- Invalid config values produce diagnostics and leave the config file unchanged.

## Stop Conditions

Stop and revisit blueprint if implementation requires:

- CLI bypassing parse / validate / sanitize.
- CLI directly rendering unchecked agent output.
- CLI generating a separate renderer path.
- Exposing style, CSS, Tailwind, `className`, event handlers, Radix props or full shadcn props.
- Mapping config to arbitrary CSS, script, HTML attributes, URLs, or external resources.
- Making `.agent.html` the only required authoring interface instead of an inspectable intermediate.

## Definition Of Done

CLI MVP is done when:

- `schema`, `compose`, `build`, and `config` are available through `npm run agent --`.
- `schema` can output both prompt and JSON forms without implementation leakage.
- `compose` can create a valid standard document from structured input.
- `build` can produce a static artifact from the composed document.
- Invalid documents fail before rendering.
- `config` accepts only finite declared values.
- `npm run test:run` succeeds.
- `npm run build` succeeds.
