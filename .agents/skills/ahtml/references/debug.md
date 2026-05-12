# ahtml Debug

Use this when setup, validation, build, preview, or managed runtime rendering fails.

## First Checks

Run:

```bash
ahtml status
ahtml doctor
```

`status` gives a single `Next:` command. Prefer following it before guessing.

`status` and `doctor` may also show a non-blocking package update hint. Set `AHTML_NO_UPDATE_CHECK=1` when update checks would be noisy, such as in CI or offline diagnostics.

`doctor` checks:

- Node and package runtime
- managed runtime root and manifest
- `agent-html.config.json`
- output directory writability

## Common Fixes

Runtime not initialized:

```bash
ahtml init
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
- Run `ahtml status` and follow the `Next:` command.
- Run `ahtml doctor` and inspect runtime or config failures.
- Set `AHTML_HOME` to an empty temporary directory to reproduce with a clean runtime.

Preview fails:

- Build explicitly with `ahtml build --input artifact.agent.html --out dist/html`.
- Try a different port with `ahtml preview --input artifact.agent.html --out dist/html --port 0`.
- If the port is unavailable, use the error as the diagnosis instead of changing artifact logic.

## Architecture Boundaries

Do not fix failures by restoring current-directory project integration, `agent-html.project.json`, `init --scaffold`, a package-local Vite app, or root shadcn UI files. The package should stay engine + config + CLI plus a user-level managed runtime under `~/.ahtml` or `%USERPROFILE%\.ahtml`.
