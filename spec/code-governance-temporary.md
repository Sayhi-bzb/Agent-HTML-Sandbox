# Temporary Code Governance

本文记录当前过渡期代码治理规则。它服务于 `ahtml` config + engine + CLI + user-local Vite/shadcn integration，不替代 `blueprint/`，也不接管 coder 正在进行的 engine 化施工。

## Current Boundary

- `ahtml` package stays single-package and owns three internal modules: `src/config`, `src/engine`, and `src/cli`.
- `src/config` owns finite defaults, RenderConfig values, project config detection, and user-local shadcn/Vite setup metadata.
- `src/engine` owns pure parse / validate / sanitize, ComponentSchema, diagnostics, and shared agent-html types.
- `src/cli` owns command orchestration, local IO, process spawning, preview serving, and package verification entrypoints.
- Vite, React, shadcn/ui, Tailwind, generated renderer adapter, theme files, and UI components belong to the user project scaffold.
- The repository root must not behave as a product Vite app.

## Runtime Package Rules

- Coder owns the active package-boundary migration: root app removal, package-local renderer removal, package-local Vite builder removal, package `files` narrowing, and runtime dependency cleanup.
- Governance must not restore root `index.html`, `vite.config.ts`, `src/App.tsx`, `src/main.tsx`, `src/index.css`, `src/components/ui/`, or package-local renderer code.
- Governance must not add Vite, React, ReactDOM, shadcn, Tailwind, Radix, lucide, `class-variance-authority`, `clsx`, `tailwind-merge`, or `tw-animate-css` back to runtime dependencies.
- `ahtml build` must require user-local integration and must not fall back to package-local Vite; governance should only audit this after coder's migration settles.

## Guardrails

- `schema` and `validate` loaders must import core through `src/cli/module-loader.mjs`, not Vite SSR.
- Import direction is `cli -> config`, `cli -> engine`, and config/engine must not import CLI.
- Default `ahtml init` delegates Vite/shadcn project setup to the user-local shadcn CLI, then writes only ahtml integration files and finite project config.
- `ahtml init --scaffold` is an advanced fallback for writing a minimal local Vite/shadcn scaffold without using shadcn CLI.
- Generated shadcn introspection remains draft facts; the agent-facing schema remains the explicit overlay output.
- Agent-facing input must never expose Tailwind classes, `className`, `style`, scripts, event handlers, Radix props, full shadcn props, or raw HTML passthrough.

## Verification

- Unit tests must cover CLI core behavior and user-local build through a fake user Vite package.
- `npm run verify:pack` must fail if package tarball includes root app, package-local renderer, root shadcn UI, or root Vite build files, but this check belongs to the active engine migration until coder completes it.
- Governance tests should keep core loader boundaries and shadcn requirement drift synchronized without editing package boundary while coder is changing it.
