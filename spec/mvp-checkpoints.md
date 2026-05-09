# CLI MVP Checkpoints

本文只记录 CLI MVP 的重点验收节点。详细施工顺序见 `spec/mvp-roadmap.md`。

## Phase 0: CLI Foundation

- [ ] `npm run agent -- <command>` routes to a local Node ESM CLI entrypoint.
- [ ] CLI supports `schema`, `compose`, `build`, and `config`.
- [ ] Unknown commands and invalid flags return non-zero exit codes.
- [ ] CLI diagnostics are readable and do not expose renderer internals.
- [ ] CLI modules stay outside React component code.

## Phase 1: Schema Command

- [ ] `schema --format prompt` prints agent-facing prompt text.
- [ ] `schema --format json` prints structured `CliSchemaOutput`.
- [ ] `schema --out <path>` writes the selected output.
- [ ] Schema output is derived from `ComponentSchema` and `RenderConfig`.
- [ ] Schema output excludes shadcn props, Radix props, Tailwind class, `className`, `style`, script, event handlers, source paths, and renderer implementation details.

## Phase 2: Compose Command

- [ ] `compose --input <path>` reads structured `CompositionInput`.
- [ ] `compose --stdin` reads the same input shape from standard input.
- [ ] `compose --out <path>` writes a standard `CompositionDocument`.
- [ ] Compose defaults to `artifact.agent.html` when no output path is provided.
- [ ] Generated documents pass parse / validate / sanitize.
- [ ] Unknown components, unknown props, invalid children, invalid config, and blocked implementation fields are diagnosed before output is written.

## Phase 3: Build Command

- [ ] `build --input <path>` reads a standard document.
- [ ] Build runs parse / validate / sanitize before rendering.
- [ ] Invalid documents fail before artifact generation.
- [ ] Build reuses the existing React renderer and Vite static build path.
- [ ] Build writes a directory artifact to `--out <dir>` or `dist/html`.
- [ ] Static artifact opens without Vite dev server, HMR, or dev overlay.

## Phase 4: Config Command

- [ ] `config get` prints the effective `ArtifactConfig`.
- [ ] `config set <key> <value>` writes only known keys and finite enum values.
- [ ] Invalid config values return diagnostics and leave `agent-html.config.json` unchanged.
- [ ] Config affects schema, compose, and build only through declared `ArtifactConfig`.
- [ ] Config cannot map to arbitrary CSS, Tailwind class, inline style, script, HTML attribute passthrough, URL, or external resource.

## Verification

- [ ] CLI tests cover success paths for `schema`, `compose`, `build`, and `config`.
- [ ] CLI tests cover invalid commands, invalid flags, invalid documents, and invalid config values.
- [ ] Existing parse / sanitize / renderer tests still pass.
- [ ] `npm run test:run` succeeds.
- [ ] `npm run build` succeeds.

## Stop Conditions

- [ ] CLI does not bypass parse / validate / sanitize.
- [ ] CLI does not directly render unchecked agent output.
- [ ] CLI does not introduce an independent renderer.
- [ ] CLI does not expose Tailwind class, CSS, `style`, `className`, event handler, Radix prop, full shadcn prop, script, or external resource passthrough.
- [ ] `.agent.html` remains an inspectable intermediate, not the only required authoring interface.
