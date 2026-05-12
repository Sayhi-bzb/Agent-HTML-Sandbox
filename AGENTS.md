# Repository Guide

## Purpose

`AGENTS.md` is the maintainer's relay to coding agents started by other developers and contributors. Treat it as the first-stop governance file for prompt guidance, contribution constraints, repo navigation, documentation ownership, verification expectations, issue handling, and GitNexus usage.

Keep end-user product instructions in `README.md` and `docs-web/content/`. Keep detailed recurring maintenance, release, and deployment procedures in `spec/maintenance-checklist.md`.

## Project Goal

`agent-html` produces safe, inspectable, portable static artifacts from a constrained agent-facing document format. The package should let agents express content structure without exposing low-value or high-risk implementation details.

Architecture principles live under `blueprint/`; start at `blueprint/index.md`. The core direction is:

- Agent-friendly authoring with less style and implementation noise.
- Portable artifacts that are easy to open, share, and archive.
- Lightweight generation focused on understanding and collaboration.
- Human-readable output first.
- Round-trippable artifacts that can feed human feedback back into agent workflows.
- Constrained freedom: semantic expression without arbitrary CSS, script, or component internals.
- Stable visual semantics across artifacts.
- Inspectable and safe outputs.

## Repository Map

- `src/engine`: parse, validate, sanitize, ComponentSchema, render config, diagnostics, and shared agent-html types.
- `src/config`: finite defaults and CLI config values.
- `src/cli`: command orchestration, local IO, init/build/preview/inspect/status/doctor/config.
- `docs-web/content/`: public documentation content.
- `.agents/skills/ahtml/`: agent-facing skill guidance for install, usage, debug, and bug-reporting behavior.
- `spec/maintenance-checklist.md`: recurring development, release, docs, and governance checks.
- `blueprint/`: architecture principles, design boundaries, and tool decisions.

## Agent Workflow

- Read relevant repo context before editing; do not guess boundaries that are documented in `blueprint/`, `spec/`, or this file.
- Confirm the target layer before changing code: engine, config, CLI, docs, skill, spec, or blueprint.
- Keep changes narrow and aligned with the package boundary.
- Do not mix unrelated code, docs, spec, blueprint, release, or generated-output edits.
- Do not silently expand scope when you find adjacent problems. Report the problem, then fix it only when it is required for the requested task or explicitly approved.
- Use GitNexus for unfamiliar code paths, impact analysis, refactors, and pre-commit scope checks.
- Before editing a function, class, or method, run GitNexus impact analysis on that symbol and review direct callers.
- Before refactors or renames, use GitNexus context/rename flows instead of plain find-and-replace.
- Before committing, run GitNexus `detect_changes` and confirm affected symbols and flows are expected.
- Do not run bare `npx gitnexus analyze` in this repo; it rewrites `AGENTS.md` and `CLAUDE.md`.
- Update the GitNexus index with `npm run gitnexus:analyze` or `npm run gitnexus:analyze:force`, which pass `--skip-agents-md`.

## Issue And Suggestion Protocol

- When you discover a bug, documentation mismatch, architecture-boundary conflict, or product improvement, capture it instead of burying it in unrelated edits.
- Gather concise evidence: reproduction steps, expected behavior, actual behavior, affected files or commands, impact, and a suggested fix direction.
- For `ahtml` product issues, follow `.agents/skills/ahtml/references/bug-reporting.md`.
- Default to preparing an issue draft in the response. Only submit an issue, open a browser, or use network tooling when the user explicitly asks.
- Redact secrets, tokens, private account names, private URLs, private local paths when not needed, and unrelated user content.

## Package Boundary

- Keep this repo as a single-package npm CLI package.
- Keep package source focused on `src/cli`, `src/config`, and `src/engine`.
- Keep managed runtime state under `~/.ahtml`, `%USERPROFILE%\.ahtml`, or `AHTML_HOME`; do not write frontend scaffold files into the current project.
- Do not restore `agent-html.project.json`, `init --scaffold`, `init --apply`, a root Vite app, current-directory Vite builder, package-local Vite builder, package-local renderer, package-local shadcn UI kit, or root `src/components/ui/`.
- Do not introduce a monorepo unless a spec explicitly changes that direction.

## Code Rules

- Keep parser, validator, sanitizer, ComponentSchema, diagnostics, and shared types free of React component code.
- Prefer small modules with clear ownership over broad utility files.
- Use blueprint vocabulary for domain names.
- Use `PascalCase` for exported types and React components.
- Use `camelCase` for functions and local values.
- Use lowercase or kebab-case ids for agent-html blocks and config values.
- Return structured results for expected validation errors.
- Use comments sparingly, only for non-obvious constraints.
- Keep example inputs under an examples folder, and do not ship examples as package runtime unless `package.json.files` explicitly allows them.

## Documentation Rules

- `README.md`: user operation manual only. Do not add repository development, release, deployment, package verification, or skill distribution instructions there.
- `docs-web/content/`: public docs content, including quick start, best practice, examples, and developer docs.
- `.agents/skills/ahtml/`: agent workflow guidance for installing, using, debugging, and reporting bugs around `ahtml`.
- `spec/` and `blueprint/`: not routine documentation surfaces. Update them only when scope, checkpoints, architecture principles, or product boundaries change.
- Keep `README.md`, `docs-web/content/`, and `.agents/skills/ahtml/` aligned when user-facing commands or workflows change.

## Commit And PR Norms

- Keep commits scoped to one concern.
- Do not include generated output unless it is required for the change.
- Check `git status --short` before committing so unrelated worktree changes are not swept in.
- For package implementation changes, run `npm run check:ready`.
- For docs changes, run `npm run check:docs`.
- For package-boundary changes, verify `package.json.files` and `scripts/verify-packed-ahtml.mjs` still agree.
- Before committing, run GitNexus `detect_changes` and confirm affected symbols and flows are expected.
