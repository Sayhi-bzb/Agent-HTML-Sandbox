# ahtml Debug

Use this when setup, validation, build, preview, or shadcn integration fails.

## First Checks

Run:

```bash
ahtml status
ahtml doctor
```

`status` gives a single `Next:` command. Prefer following it before guessing.

`doctor` checks:

- Node and package runtime
- `agent-html.config.json`
- `agent-html.project.json`
- user-local shadcn components
- output directory writability

## Common Fixes

Project not initialized:

```bash
ahtml init
```

Missing shadcn components:

```bash
ahtml init --apply
```

Need to inspect current setup without writing:

```bash
ahtml init --dry-run
```

Need to verify package boundary in this repository:

```bash
npm run verify:pack
npm pack --dry-run
```

Need to update or verify the public docs site:

- Edit docs content under `docs-web/content/docs`.
- Build the static export with `npm run docs:web:build`.
- Deploy or inspect the generated site from `docs-web/out`.

Need to check an artifact before building:

```bash
ahtml validate --input artifact.agent.html
ahtml inspect --input artifact.agent.html
```

Build fails before artifact output:

- Validate the input first.
- Confirm `agent-html.project.json` exists.
- Confirm `components.json` and Vite config exist in the user project.
- Run `ahtml doctor` and follow missing component guidance.

Preview fails:

- Build explicitly with `ahtml build --input artifact.agent.html --out dist/html`.
- Try a different port with `ahtml preview --input artifact.agent.html --out dist/html --port 0`.
- If the port is unavailable, use the error as the diagnosis instead of changing artifact logic.

## Architecture Boundaries

Do not fix failures by restoring a package-local Vite app, package-local renderer, or package-local shadcn UI kit. The package should stay engine + config + CLI; Vite + shadcn belong to the user project.
