# Repository Guide

## Purpose

`AGENTS.md` is the maintainer's relay to coding agents started by other developers and contributors. Treat it as the first-stop governance file for prompt guidance, contribution constraints, repo navigation, documentation ownership, verification expectations, issue handling, and GitNexus usage.

## Documentation Layers

Repository documentation is layered by audience and decision type.

- `blueprint/`: project direction, architecture, planning, design principles, roadmap, architecture boundaries, and stage decisions. Do not use it for daily development constraints.
- `AGENTS.md`: working rules for development agents, including principles, pacing, change boundaries, verification selection, and repo operating rhythm.
- `docs-web/content/`: concrete project and maintenance documentation.
- `README.md`: visitor-facing product introduction and basic usage path. Keep it short, clean, and human-readable.
- `.agents/skills/ahtml/`: usage guidance for user-side agents working with `ahtml`, not repository development rules.

## Project Context

`agent-html` produces safe, inspectable, portable static artifacts from a constrained agent-facing document format. Preserve that package boundary when making changes.

For architecture principles, design rationale, and stage decisions, start at [`blueprint/index.md`](blueprint/index.md).

## Repository Map

- `packages/core/src`: parsing, validation, sanitization, render config, and shared agent-html types.
- `packages/ahtml/src/config`: CLI defaults and runtime capability behavior.
- `packages/ahtml/src/cli`: command orchestration and managed runtime IO.
- `package.json`: private workspace root for package scripts, verification, and release orchestration.
- `README.md`: visitor-facing product overview and basic usage entry.
- `docs-web/content/`: project and maintenance docs. Start at [`docs/index.mdx`](docs-web/content/docs/index.mdx).
- `.agents/skills/ahtml/`: `ahtml` skill guidance. Start at [`SKILL.md`](.agents/skills/ahtml/SKILL.md).
- `spec/`: planning checkpoints. Start at [`spec/map.md`](spec/map.md); use [`spec/roadmap.md`](spec/roadmap.md) when phase direction matters.
- `blueprint/`: architecture decisions and boundaries. Start at [`blueprint/index.md`](blueprint/index.md).

## Agent Workflow

- Read relevant repo context before editing; do not guess boundaries that are documented in `blueprint/`, `spec/`, or this file.
- Confirm the target layer before changing code: core, ahtml config, ahtml CLI, docs, skill, spec, or blueprint.
- For architecture or boundary decisions, start at [`blueprint/index.md`](blueprint/index.md).
- For user-facing or maintenance docs work, start at [`docs-web/content/docs/index.mdx`](docs-web/content/docs/index.mdx).
- For `ahtml` usage, debugging, build, preview, or artifact-delivery tasks, start at [`.agents/skills/ahtml/SKILL.md`](.agents/skills/ahtml/SKILL.md).
- For checkpoints or staged delivery status, start at [`spec/map.md`](spec/map.md) and read [`spec/roadmap.md`](spec/roadmap.md) only when roadmap context is required.
- Keep changes narrow. Do not mix unrelated code, docs, spec, blueprint, release, or generated-output edits, and do not silently expand scope.
- Report adjacent problems, then fix them only when they are required for the requested task or explicitly approved.
- Work in explicit stages. Do not mix architecture planning, code implementation, test repair, and real end-to-end runtime probing in the same loop unless the task explicitly requires it.
- Before running a heavy command, state what requirement it verifies and what result will stop the loop. Do not repeat a slow command merely for reassurance after small unrelated edits.
- Use GitNexus for unfamiliar code paths, public API changes, shared runtime / CLI flows, impact analysis, refactors, and pre-commit scope checks.
- Before editing a public function, shared runtime / CLI flow, or unfamiliar symbol, run GitNexus impact analysis and review direct callers. For small copy edits, local test assertions, or clearly local helpers, read the surrounding code instead of forcing GitNexus.
- Before refactors or renames, use GitNexus context / rename flows instead of plain find-and-replace.
- Before committing, run GitNexus `detect_changes` and confirm affected symbols and flows are expected.
- Do not run bare `npx gitnexus analyze` in this repo; it rewrites `AGENTS.md` and `CLAUDE.md`.
- Update the GitNexus index with `npm run gitnexus:analyze` or `npm run gitnexus:analyze:force`, which pass `--skip-agents-md`.

## Verification Rhythm

- Match verification weight to change risk. Small docs or prompt copy changes should not trigger CLI runtime E2E tests.
- For pure governance docs or ordinary Markdown paragraph changes, read the final diff only. Do not run Prettier, lint, tests, build, or runtime commands.
- For docs changes that touch tables, code blocks, generated snippets, command output, MDX structure, routes, or examples, run only the targeted formatting, markdown, or docs check that covers the changed surface.
- For ordinary CLI/runtime code changes, run `npm run build` once, then the narrowest relevant test file or test name once. Re-run only after a code change that could affect the failing area.
- For lint and formatting on code changes, start with touched files: `npx eslint <files>` and `npx prettier --check <files>`. Use full `npm run lint` or broader checks as a final gate, not after every small edit.
- Treat `npm run test:run:cli-heavy` as a heavy CLI/runtime gate. Use it for changes to setup, status, doctor, build, preview, schema output, or runtime rendering, not for unrelated copy edits.
- Treat real shadcn init, registry access, build/preview servers, and browser visual checks as explicit E2E gates. Run them with an isolated `AHTML_HOME`, a clear timeout, and a concrete success criterion.
- If a command fails because of network restrictions, sandbox limits, Windows file locks, registry availability, or a long-running external tool, record the blocker and switch to the smallest useful local verification. Do not keep retrying the same heavy command without changing the conditions.
- Do not leave long-running dev servers, preview servers, or test sessions active when finishing a turn.

## Issue And Suggestion Protocol

- When you discover a bug, documentation mismatch, architecture-boundary conflict, or product improvement, capture it instead of burying it in unrelated edits.
- Gather concise evidence: reproduction steps, expected behavior, actual behavior, affected files or commands, impact, and a suggested fix direction.
- For `ahtml` product issues, follow `.agents/skills/ahtml/references/bug-reporting.md`.
- Default to preparing an issue draft in the response. Only submit an issue, open a browser, or use network tooling when the user explicitly asks.
- Redact secrets, tokens, private account names, private URLs, private local paths when not needed, and unrelated user content.

## Package Boundary

- Keep this repo as a private npm workspace rooted at `package.json`.
- Keep publishable package source focused on `packages/core` and `packages/ahtml`.
- Keep parser, validation, sanitization, render config, and shared contract code in `packages/core/src`.
- Keep CLI defaults, managed runtime orchestration, and local runtime IO in `packages/ahtml/src/config` and `packages/ahtml/src/cli`.
- Keep any product app or frontend shell outside this repo unless a spec explicitly changes that boundary.
- Keep managed runtime state under `~/.ahtml`, `%USERPROFILE%\.ahtml`, or `AHTML_HOME`; do not write frontend scaffold files into the current project.
- Do not restore `agent-html.project.json`, `init --scaffold`, `init --apply`, a root Vite app, current-directory Vite builder, package-local Vite builder, package-local renderer, package-local shadcn UI kit, or root `src/components/ui/`.
- Do not add more workspace packages, or move the app into this repo, unless a spec explicitly changes that direction.

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

- Edit `AGENTS.md` for repository working rules and agent-facing governance, not for detailed project facts or user workflows.
- Edit `README.md` for visitor-facing product introduction and basic usage only. Do not add repository development, release, deployment, package verification, or skill distribution instructions there.
- Edit `docs-web/content/` for concrete product and maintenance documentation. Do not put development-agent behavior rules there.
- Edit `.agents/skills/ahtml/` for user-side agent usage, debugging, and bug-reporting guidance around `ahtml`, not repository development governance.
- Edit `spec/` and `blueprint/` only when scope, checkpoints, architecture principles, or product boundaries change.
- Keep `README.md`, `docs-web/content/`, and `.agents/skills/ahtml/` aligned when user-facing commands or workflows change.

## Commit And PR Norms

- Keep commits scoped to one concern.
- Do not include generated output unless it is required for the change.
- Check `git status --short` before committing so unrelated worktree changes are not swept in.
- Treat `npm run check:commit` as a pre-commit gate, not the default verification after every ordinary edit.
- For package-boundary, runtime, CLI build, release, or dependency changes, run the narrow checks that prove the touched surface first; use broader package checks only as the final gate.
- For docs-web changes, run `npm run check:docs` only when the change touches MDX structure, examples, routes, build behavior, or generated output. For small copy changes, inspect the diff.
- Before release or after broad cross-layer changes, define the required gate explicitly and run only the checks needed for that release surface.
- For package-boundary changes, verify `package.json.files` and `scripts/verify-packed-ahtml.mjs` still agree.
- Before committing, run GitNexus `detect_changes` and confirm affected symbols and flows are expected.
