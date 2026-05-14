# ahtml Debug

Use this when setup, build, preview, or managed runtime rendering fails.

Debug with the product shape in mind: agents write semantic `.agent.html`; `ahtml` renders a stable HTML artifact. Do not fix failures by turning agent input into raw HTML, CSS, or JavaScript.

## First check

Run:

```bash
ahtml doctor
```

`doctor` is the primary runtime and environment diagnostic entrypoint.

It may also show a non-blocking package update hint. Set `AHTML_NO_UPDATE_CHECK=1` when update checks would be noisy, such as in CI or offline diagnostics.

`doctor` checks:

- Node and package runtime
- managed runtime root and manifest
- runtime React renderer adapter, shadcn components, and Vite config
- output directory writability

## Common fixes

Force runtime repair:

```bash
ahtml setup --force
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

Need to check an artifact path:

```bash
ahtml build artifact.agent.html
ahtml inspect --input artifact.agent.html
```

Build fails before artifact output:

- Run `ahtml doctor`.
- Rebuild with `ahtml build artifact.agent.html`.
- Set `AHTML_HOME` to an empty temporary directory to reproduce with a clean runtime.

Preview fails:

- Build explicitly with `ahtml build artifact.agent.html`.
- Try a different port with `ahtml preview artifact.agent.html --port 0`.
- If the port is unavailable, use that as the diagnosis instead of changing artifact logic.

## Architecture boundaries

Do not fix failures by restoring current-directory project integration, `agent-html.project.json`, init/scaffold flows, a package-local Vite app, or root shadcn UI files.

The package should stay engine + config + CLI plus a shadcn-backed user-level managed runtime under `~/.ahtml` or `%USERPROFILE%\.ahtml`.
