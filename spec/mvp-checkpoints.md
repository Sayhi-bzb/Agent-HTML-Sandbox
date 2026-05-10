# CLI Closed Loop MVP Checkpoints

本文只记录 CLI 闭环阶段的重点验收节点。详细施工顺序见 `spec/mvp-roadmap.md`。

## Phase 0: CLI Gap Audit

- [x] Current `schema`, `compose`, `build`, and `config` paths are mapped.
- [x] Shared parse / validate / sanitize path is identified.
- [x] `inspect` data sources are identified without relying on repository source files.
- [x] `preview` can reuse built artifact output without a second renderer.
- [x] Installed CLI command paths do not require dev shell files.

## Phase 1: Validate

- [x] `ahtml validate --input <path>` succeeds for valid `.agent.html`.
- [x] `ahtml validate --input <path>` fails for invalid documents.
- [x] `validate` reports blocked implementation props.
- [x] `validate` does not generate artifact output.
- [x] `validate` and `build` use the same validation behavior.

## Phase 2: Inspect

- [x] `ahtml inspect --input <path>` reports effective config.
- [x] `ahtml inspect --input <path>` reports component usage.
- [x] `ahtml inspect --dir <dir>` works against built artifact output.
- [x] `inspect` does not read repository source files.
- [x] `inspect --format json` exists or the spec explicitly keeps JSON for a later phase.

## Phase 3: Doctor

- [x] `ahtml doctor` checks package runtime paths.
- [x] `ahtml doctor` checks Node availability.
- [x] `ahtml doctor` checks package-local build dependencies.
- [x] `ahtml doctor` checks config readability and finite values.
- [x] `ahtml doctor` checks default output directory writability.
- [x] `doctor` separates environment, config, and artifact diagnostics.
- [x] `doctor` performs no network checks.

## Phase 4: Preview

- [x] `ahtml preview --input <path>` builds or refreshes artifact output.
- [x] `preview` serves generated static output over local HTTP.
- [x] `preview --port <port>` uses the requested port.
- [x] `preview` fails clearly when the port is unavailable.
- [x] `preview` does not introduce a dev-only render path.

## Phase 5: Package Verification

- [x] Local tarball install still succeeds in a clean temporary consumer directory.
- [x] Installed `ahtml validate` succeeds and fails in expected cases.
- [x] Installed `ahtml inspect --input` succeeds.
- [x] Installed `ahtml inspect --dir` succeeds.
- [x] Installed `ahtml doctor` succeeds in the clean consumer.
- [x] Installed `ahtml preview` has a smoke test that does not leave a running process.
- [x] README documents the closed-loop CLI workflow.

## Verification

- [x] Existing CLI tests still pass.
- [x] Existing parse / sanitize / renderer tests still pass.
- [x] Package verification tests cover the new commands.
- [x] `npm run test:run` succeeds.
- [x] `npm run build` succeeds.
- [x] `npm run lint` succeeds or reports only known warnings.
- [x] `npm run docs:lint` succeeds.
- [x] `npm run verify:pack` succeeds.

## Stop Conditions

- [x] CLI does not read repository-local source files after package install.
- [x] Package does not ship blueprint / spec / test files as runtime surface.
- [x] No command bypasses parse / validate / sanitize.
- [x] Preview does not create an independent renderer.
- [x] `.agent.html` and artifact HTML are not treated as arbitrary HTML escape hatches.
- [x] CLI does not expose Tailwind class, CSS, `style`, `className`, event handler, Radix prop, full shadcn prop, script, or external resource passthrough.
- [x] Remote deploy remains outside this MVP.
