---
name: ahtml
description: Use `ahtml` when a semantic `.agent.html` document should be rendered as an HTML artifact. It fits outputs that need more structure or reviewability than Markdown.
---

# ahtml

Use this skill when a semantic `.agent.html` document is a better fit than Markdown.

`ahtml` renders semantic `.agent.html` documents into HTML artifacts.

## When to use it

Use `ahtml` when the user needs:

- an implementation plan people will review
- a code-review explainer or PR summary
- a research or investigation artifact
- a decision record with evidence
- a comparison or options document
- a feedback-friendly artifact the user may return to the agent

Do not use `ahtml` for:

- a short answer that fits naturally in chat
- plain machine output such as JSON
- a tiny note that does not benefit from layout or structure

## Core path

For most tasks, use this path:

1. Run `ahtml`
2. Run `ahtml prompt`
3. Write `artifact.agent.html`
4. Run `ahtml build artifact.agent.html` or `ahtml preview artifact.agent.html`

## Minimal shape

```html
<meta-agent profile="report-default" />

<page title="Review">
  <card title="Summary">...</card>
</page>
```

## Writing boundary

Keep agent-facing input semantic.

Do not write Tailwind classes, `className`, `style`, scripts, event handlers, shadcn props, Radix props, arbitrary HTML attributes, or raw HTML passthrough.

The agent should describe information structure, not renderer implementation.

## Route by task

- First install, repair, isolated runtime, or repo-local setup -> `references/install.md`
- Writing `.agent.html`, building, previewing, or choosing whether `ahtml` fits -> `references/usage.md`
- Build, preview, runtime, or environment failures -> `references/debug.md`
- Reproducible product bug after normal checks -> `references/bug-reporting.md`

Do not use removed project-local scaffold or init flows.
