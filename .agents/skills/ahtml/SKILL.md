---
name: ahtml
description: Install, initialize, use, and debug ahtml agent-html artifact workflows. Use when working with ahtml CLI commands such as init, status, doctor, schema, compose, validate, build, preview, inspect, or config; when connecting user-local Vite + shadcn projects; or when explaining the ahtml engine/config/CLI architecture.
---

# ahtml

Use this skill for `ahtml`, a local CLI engine that turns constrained agent-facing documents into sanitized static artifacts.

Core model:

- `ahtml` package owns `config`, `engine`, and `cli`.
- Vite, React, Tailwind, shadcn/ui, themes, and UI components live in the user's local project.
- Agent-facing input must not expose Tailwind classes, `className`, `style`, scripts, event handlers, shadcn props, Radix props, arbitrary HTML attributes, or raw HTML passthrough.

Default workflow:

```bash
ahtml init
ahtml status
ahtml doctor
ahtml schema --format prompt
ahtml compose --input composition.json --out artifact.agent.html
ahtml validate --input artifact.agent.html
ahtml build --input artifact.agent.html --out dist/html
ahtml inspect --input artifact.agent.html
ahtml inspect --dir dist/html
ahtml preview --input artifact.agent.html --out dist/html
```

Load references only as needed:

- Read `references/install.md` when installing, initializing, connecting shadcn/Vite, or choosing template/preset flags.
- Read `references/usage.md` when producing content, composing `.agent.html`, building, previewing, or explaining the normal user flow.
- Read `references/debug.md` when `status`, `doctor`, `build`, `preview`, shadcn setup, components, or project config fail.
- Read `references/bug-reporting.md` when a reproducible `ahtml` product bug remains after normal debug checks.

Prefer the default happy path (`ahtml init`) before advanced flags. Treat `ahtml init --scaffold` as a fallback, not the normal installation path.
