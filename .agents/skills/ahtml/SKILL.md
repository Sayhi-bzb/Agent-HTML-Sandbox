---
name: ahtml
description: Install, initialize, use, and debug ahtml agent-html artifact workflows. Use when working with ahtml CLI commands such as init, status, doctor, schema, compose, validate, build, preview, inspect, or config; when using the managed ahtml runtime; or when explaining the ahtml engine/config/CLI architecture.
---

# ahtml

Use this skill for `ahtml`, a local CLI engine that turns constrained agent-facing documents into sanitized static artifacts.

Core model:

- `ahtml` package owns `config`, `engine`, and `cli`.
- `ahtml` renders through a shadcn-backed managed runtime under `~/.ahtml` or `%USERPROFILE%\.ahtml`; set `AHTML_HOME` only for isolation.
- The current repository should only contain the user's input files and chosen artifact output, not a generated frontend project.
- Agent-facing input must not expose Tailwind classes, `className`, `style`, scripts, event handlers, shadcn props, Radix props, arbitrary HTML attributes, or raw HTML passthrough.

Default workflow:

```bash
ahtml status
ahtml doctor
ahtml schema --format prompt
ahtml compose --input composition.json --out artifact.agent.html
ahtml validate --input artifact.agent.html
ahtml build --input artifact.agent.html --out dist/html
ahtml preview --input artifact.agent.html --out dist/html
ahtml inspect --input artifact.agent.html
ahtml inspect --dir dist/html
```

Load references only as needed:

- Read `references/install.md` when installing, checking, repairing, or isolating the managed runtime.
- Read `references/usage.md` when producing content, composing `.agent.html`, building, previewing, or explaining the normal user flow.
- Read `references/debug.md` when `status`, `doctor`, `build`, `preview`, runtime setup, components, or config fail.
- Read `references/bug-reporting.md` when a reproducible `ahtml` product bug remains after normal debug checks.

Prefer automatic runtime bootstrap through `ahtml status`, `ahtml doctor`, `ahtml build`, or `ahtml preview`. Do not use old project-local scaffold flags.
