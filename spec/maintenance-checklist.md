# Maintenance Checklist

本文记录 `agent-html` 日常维护清单。它面向开发、合并、文档部署、npm 发布和周期性治理，不替代 `blueprint/` 的架构原则或 `spec/mvp-roadmap.md` 的实现范围。

## Daily Development

Use the fastest local gate while editing source:

```bash
npm run check:quick
```

Use `npm run check:ready` before opening or merging a PR:

```bash
npm run check:ready
```

Use `npm run check:all` when you need the same package + docs coverage as CI:

```bash
npm run check:all
```

Do not use `npm run format:check` as the daily gate because it checks the whole repository and can include generated output or historical formatting debt.

When changing CLI, config, or engine code, preserve these boundaries:

- `src/engine` owns parse, validate, sanitize, schema, diagnostics, and shared agent-html types.
- `src/config` owns finite defaults and project config detection.
- `src/cli` owns command orchestration, local IO, spawning, preview, and package verification entrypoints.
- `src/engine` and `src/config` must not depend on CLI, Vite, React, shadcn/ui, or Tailwind.
- Do not restore a root Vite app, package-local renderer, package-local Vite builder, or root shadcn UI kit.

## Before Merge

Check that the worktree does not mix unrelated changes:

```bash
git status --short
git diff --check
```

For package-boundary changes, verify the installed package workflow:

```bash
npm run check:ready
npm pack --dry-run
```

The package tarball must not include blueprint, spec, tests, root app files, package-local renderer code, root shadcn UI files, build output, or generated docs output.

## GitNexus Indexing

Do not run bare `npx gitnexus analyze` in this repository because it rewrites `AGENTS.md` and `CLAUDE.md`.

Use the repository scripts instead:

```bash
npm run gitnexus:analyze
npm run gitnexus:analyze:force
```

Both scripts pass `--skip-agents-md`, so they update `.gitnexus/` without rewriting agent guidance files.

## Documentation

Docs source lives under `docs-web/content/docs/`. The public site is:

```txt
https://agent-html.pages.dev/docs
```

Keep the sidebar article order in `docs-web/content/docs/meta.json`.

Before deploying docs:

```bash
npm run check:docs
```

Deploy through Cloudflare Pages Direct Upload:

```bash
npm run docs:web:build
npx wrangler pages deploy docs-web/out --project-name agent-html --branch main
```

The GitHub Actions `Deploy Docs` workflow can run the same deployment manually. It requires:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

After deploy, verify:

- `/` redirects to `/docs`.
- `/docs`, `/docs/best-practice`, `/docs/dev-docs`, and `/docs/example` load.
- `docs-web/out/_headers` and `docs-web/out/_redirects` exist after build.

## npm Release

The package is published by GitHub Actions from matching `v*` tags.

Before tagging:

```bash
npm run check:ready
npm pack --dry-run
npm view @agent-html/ahtml dist-tags versions --json
```

Release flow:

```bash
npm version 0.1.0-alpha.1 --no-git-tag-version
git add package.json package-lock.json
git commit -m "chore: release 0.1.0-alpha.1"
git tag v0.1.0-alpha.1
git push origin main --tags
```

The tag version must match `package.json`. Prerelease versions publish to the `alpha` dist-tag. Stable versions publish to `latest`.

Use npm Trusted Publishing for the `publish-npm.yml` workflow. If Trusted Publishing is not configured in npm, do not push release tags until the workflow authentication model is updated intentionally.

## Weekly Or Major-Change Governance

Run dependency and dead-code checks:

```bash
npm run knip
npm audit
npm --prefix docs-web audit
```

After dependency upgrades:

```bash
npm install
npm --prefix docs-web install
npm run check:all
```

When package boundaries change, update these together:

- `package.json.files`
- `scripts/verify-packed-ahtml.mjs`
- README install, package, docs deployment, and release notes.
- `docs-web/content/docs/dev-docs.mdx`

## GitHub Actions

Current workflows:

- `CI`: PR and `main` push package/docs verification.
- `Deploy Docs`: manual Cloudflare Pages deployment.
- `Publish npm`: tag-based npm publishing with manual dry-run support.

Keep workflow maintenance conservative:

- Do not add automatic npm publishing from ordinary branch pushes.
- Keep docs deployment manual until release cadence is stable.
- Keep `verify:pack` in CI because it is the strongest package-boundary guard.
- Keep `check:quick`, `check:ready`, `check:docs`, and `check:all` aligned with GitHub Actions so developers do not need to memorize workflow internals.
