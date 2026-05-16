# ahtml Debug

Use this when setup, build, preview, or managed runtime rendering fails.

## First check

Run:

```bash
ahtml doctor
```

Primary repair path:

```bash
ahtml setup --force
```

Artifact inspection:

```bash
ahtml build artifact.agent.html
ahtml inspect --input artifact.agent.html
ahtml inspect --dir dist/html
```

## Common flows

Build fails before artifact output:

- Run `ahtml doctor`.
- Rebuild with `ahtml build artifact.agent.html`.
- Set `AHTML_HOME` to an empty temporary directory to reproduce with a clean runtime.

Runtime issue remains reproducible:

- Run `ahtml doctor`.
- Run `ahtml setup --force`.
- Rebuild or preview again on the same input.
- If the issue still reproduces, draft an issue with `references/bug-reporting.md`.

Preview fails:

- Build explicitly with `ahtml build artifact.agent.html`.
- Try a different port with `ahtml preview artifact.agent.html --port 0`.
- If the port is unavailable, use that as the diagnosis instead of changing artifact logic.

Need quieter offline diagnostics:

```bash
AHTML_NO_UPDATE_CHECK=1 ahtml doctor
```

If the problem is reproducible after `doctor`, `build`, or `preview`, draft an issue with `references/bug-reporting.md`.
