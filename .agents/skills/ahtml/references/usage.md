# ahtml Usage

Use this when the output needs more structure than Markdown.

## Typical outputs

`ahtml` is strongest for:

- implementation plans
- code-review explainers
- research or investigation reports
- decision records
- side-by-side comparisons
- structured handoff or feedback artifacts

If the result is only a short answer, stay in chat.

## User flow

```txt
user asks
  -> agent decides Markdown is not enough
  -> agent reads the ahtml prompt
  -> agent writes semantic .agent.html
  -> ahtml validates and renders
  -> user gets a stable HTML artifact
```

## Main commands

Start with the writing prompt:

```bash
ahtml prompt
```

Write a document:

```txt
artifact.agent.html
```

Build the static artifact:

```bash
ahtml build artifact.agent.html
```

Preview locally:

```bash
ahtml preview artifact.agent.html
```

Use `inspect` only when you need deeper diagnostics:

```bash
ahtml inspect --input artifact.agent.html
ahtml inspect --dir dist/html
```

## Document shape

Use a named presentation profile and standard agent-html components. The agent writes information structure, not page implementation.

```html
<meta-agent profile="report-default" />

<page title="CLI Demo">
  <card title="Overview">Generated from agent-html.</card>
</page>
```

Never add Tailwind classes, `className`, `style`, event handlers, scripts, arbitrary HTML attributes, raw HTML, Radix props, or full shadcn props to agent-facing input.
