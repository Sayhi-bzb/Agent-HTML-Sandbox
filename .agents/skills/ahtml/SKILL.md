---
name: ahtml
description: Write, validate, build, preview, inspect, install, and debug ahtml `.agent.html` artifact workflows. Use when producing agent-facing documents that need richer structure, clearer reading, interaction, or easier sharing than Markdown can provide; when installing or repairing the managed runtime; or when diagnosing runtime, build, preview, or validation failures.
---

# ahtml

Use this skill when the goal is to replace long Markdown agent output with a portable HTML artifact that is easier to read, inspect, share, and hand back into the agent loop.

## Core path

- Start with the schema: `ahtml schema --format prompt`.
- Write a `.agent.html` document with registered components and finite metadata.
- Keep agent-facing input free of Tailwind classes, `className`, `style`, scripts, event handlers, shadcn props, Radix props, arbitrary HTML attributes, and raw HTML passthrough.
- Validate before building: `ahtml validate --input artifact.agent.html`.
- Build or preview when the user needs a shareable artifact: `ahtml build --input ...` or `ahtml preview --input ...`.
- When finishing, tell the user what you wrote, what passed validation, and where the artifact lives.

## Minimal shape

```html
<meta-agent profile="report-default" />

<page title="Review">
  <card title="Summary">...</card>
</page>
```

## Route by task

- Runtime install, repair, or isolation -> `references/install.md`
- Writing `.agent.html`, building, previewing, or inspecting an artifact -> `references/usage.md`
- `status`, `doctor`, runtime setup, or config/build/preview failures -> `references/debug.md`
- Reproducible product bug after normal checks -> `references/bug-reporting.md`

Do not use removed project-local scaffold or init flows.
