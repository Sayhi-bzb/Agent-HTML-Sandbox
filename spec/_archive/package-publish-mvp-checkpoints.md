# Package And Publish MVP Checkpoints

本文只记录打包发布阶段的重点验收节点。详细施工顺序见 `spec/mvp-roadmap.md`。

## Phase 0: Boundary Audit

- [ ] Publishable core files required by installed `ahtml` are identified.
- [ ] Dev shell files are identified separately from publishable core.
- [ ] Package boundary is represented by package metadata, not ad hoc copy steps.
- [ ] Installed CLI does not require repository-local paths or local shims.
- [ ] Any file required by installed CLI is either included intentionally or moved into publishable core.

## Phase 1: Package Metadata

- [ ] Package name, version, description, bin, files, license policy, and README policy are defined.
- [ ] `ahtml` is the only public bin.
- [ ] `npm run agent --` remains a repository fallback, not the public package interface.
- [ ] Runtime dependencies include everything needed after tarball install.
- [ ] Dev-only dependencies are not required for installed `ahtml` unless explicitly justified.
- [ ] Package metadata does not imply public registry publish before local install passes.

## Phase 2: Pack Dry Run

- [ ] `npm pack --dry-run` succeeds.
- [ ] Dry-run file list excludes `blueprint/`, `spec/`, tests, and dev-only fixtures.
- [ ] Dry-run file list includes package bin, CLI engine, schema, render config, parse / sanitize, renderer, artifact build path, README, and package metadata.
- [ ] No generated cache, build output, local config, or temporary artifact is included.
- [ ] Tarball contents match the package boundary.

## Phase 3: Local Install Verification

- [ ] Local tarball installs into a clean temporary consumer directory.
- [ ] Installed `ahtml schema --format prompt` succeeds.
- [ ] Installed `ahtml schema --format json` succeeds.
- [ ] Installed `ahtml compose --input <path>` succeeds.
- [ ] Installed `ahtml compose --stdin` succeeds.
- [ ] Installed `ahtml build --input <path>` produces a static artifact directory.
- [ ] Installed `ahtml config get` and `ahtml config set <key> <value>` work.
- [ ] Invalid documents fail before artifact generation.
- [ ] Blocked implementation props remain blocked after install.

## Phase 4: Publish Readiness

- [ ] README explains installed package usage.
- [ ] README distinguishes local tarball install from public registry publish.
- [ ] Publish blockers are documented.
- [ ] Public publish remains an explicit later action.
- [ ] CI-ready checks cover package dry-run and local tarball install verification.

## Verification

- [ ] Package verification tests cover installed `ahtml` success paths.
- [ ] Package verification tests cover invalid document and blocked prop failures.
- [ ] Existing CLI tests still pass.
- [ ] Existing parse / sanitize / renderer tests still pass.
- [ ] `npm run test:run` succeeds.
- [ ] `npm run build` succeeds.
- [ ] `npm run lint` succeeds or reports only known warnings.
- [ ] `npm run docs:lint` succeeds.

## Stop Conditions

- [ ] Package does not ship blueprint / spec / test files as runtime surface.
- [ ] Package does not depend on repository-local paths after install.
- [ ] Packaged CLI does not bypass parse / validate / sanitize.
- [ ] Packaged CLI does not introduce an independent renderer.
- [ ] Packaged CLI does not expose Tailwind class, CSS, `style`, `className`, event handler, Radix prop, full shadcn prop, script, or external resource passthrough.
- [ ] No public registry publish happens before local tarball install passes.
