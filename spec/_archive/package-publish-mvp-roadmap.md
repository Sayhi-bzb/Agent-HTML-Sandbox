# Package And Publish MVP Roadmap

本文记录 agent-html 打包发布阶段的施工顺序。它服务于代码实现，不替代 `blueprint/` 中的架构边界。

CLI MVP 计划已归档到 `spec/_archive/cli-mvp-roadmap.md`。重点验收节点见 `spec/mvp-checkpoints.md`。

## MVP Goal

MVP 证明 `ahtml` 可以从当前单包工程收束为可打包、可安装、可验证的 CLI 包：

```txt
current single-package implementation
        ↓
package boundary
        ↓
package metadata / files allowlist
        ↓
npm pack dry run
        ↓
local tarball install
        ↓
installed ahtml CLI verification
```

本阶段目标不是公开发布到 npm registry，而是先证明本地 tarball 安装后的 `ahtml` 能独立完成 `schema`、`compose`、`build` 和 `config`。

## Scope

MVP includes:

- Keep repository shape single-package until package boundary is proven.
- Define publishable core surface and dev shell surface.
- Configure package metadata for local packing.
- Configure `files` allowlist so tarball contents are intentional.
- Verify `ahtml` through package bin after local tarball install.
- Verify installed CLI can produce a static artifact from a composed document.
- Keep `npm run agent --` as a repository development fallback.

MVP excludes:

- Public `npm publish`.
- Monorepo migration.
- Splitting source into multiple packages.
- New command vocabulary beyond `schema`, `compose`, `build`, and `config`.
- Changing ComponentSchema, RenderConfig, parse / sanitize, renderer, or artifact safety rules.
- Shipping blueprint, spec, tests, fixtures, or dev-only exploration files as runtime package surface.

## Package Boundary

Publishable core includes:

- `ahtml` package bin.
- CLI command engine.
- `schema`, `compose`, `build`, and `config`.
- Component schema and render config needed by CLI.
- parse / validate / sanitize path.
- renderer and static artifact path needed by `build`.
- runtime dependencies needed after package install.
- README and package metadata required by npm package consumers.

Dev shell includes:

- `blueprint/`.
- `spec/`.
- tests and test setup.
- checked-in examples or fixtures not required by runtime.
- Vite demo / dev preview scaffolding unless explicitly needed by packaged `build`.
- docs lint, local verification scripts, and repository maintenance files.

## Phase 0: Boundary Audit

Build:

- Inventory files used by installed `ahtml schema`, `compose`, `build`, and `config`.
- Mark each as publishable core or dev shell.
- Keep the package boundary single-source in package metadata, not scattered ignore rules.
- Stop if installed CLI depends on files that should remain dev shell.

## Phase 1: Package Metadata

Build:

- Define package name, version, description, bin, files, license policy, README policy, and package entry metadata.
- Keep `ahtml` as the only public bin.
- Keep package metadata compatible with local tarball install.
- Split runtime dependencies from dev-only dependencies based on installed CLI needs.
- Ensure package metadata does not imply public registry release before local install is proven.

## Phase 2: Pack Dry Run

Build:

- Run `npm pack --dry-run`.
- Inspect tarball file list.
- Confirm dev shell files are excluded.
- Confirm every required runtime file is included.
- Add or adjust package allowlist until dry-run output matches package boundary.

## Phase 3: Local Install Verification

Build:

- Create a clean temporary consumer directory.
- Install the local tarball into that directory.
- Run installed `ahtml` from the consumer project.
- Verify `schema`, `compose`, `build`, and `config` without relying on repository-local shims.
- Verify invalid input fails before artifact generation.

## Phase 4: Publish Readiness

Build:

- Document the package consumer workflow in README.
- Document what remains before public publish.
- Keep public publish as an explicit later action.
- Ensure CI-ready checks cover package dry-run and local tarball install.

## Stop Conditions

Stop and revisit blueprint if implementation requires:

- Shipping blueprint / spec / test files as runtime dependencies.
- Installing from tarball but still reading repository-local paths.
- Bypassing parse / validate / sanitize in packaged CLI.
- Introducing a second renderer only for package build.
- Exposing Tailwind class, `className`, style, script, Radix props, shadcn props, or external resource passthrough.
- Publishing to a public registry before local tarball install passes.

## Definition Of Done

Package And Publish MVP is done when:

- `npm pack --dry-run` shows only intended package files.
- A local tarball can be installed into a clean temporary project.
- Installed `ahtml schema` works.
- Installed `ahtml compose` works from file and stdin input.
- Installed `ahtml build` produces a static artifact.
- Installed `ahtml config get/set` works with finite values only.
- Invalid documents fail before artifact generation.
- Blocked implementation props remain blocked after install.
- `npm run test:run` succeeds.
- `npm run build` succeeds.
