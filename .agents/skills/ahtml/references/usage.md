# ahtml Usage

Use this when the user wants to replace a long Markdown-style agent output with a richer HTML artifact, or when they need to validate, build, preview, or inspect one.

## User Flow

```txt
user asks
  -> agent decides the output needs more than Markdown
  -> agent reads ahtml schema
  -> agent writes semantic .agent.html
  -> ahtml validates and sanitizes
  -> managed runtime renders
  -> stable static HTML artifact
```

## Commands

Read the agent-facing contract first:

```bash
ahtml schema --format prompt
```

Write a document:

```bash
artifact.agent.html
```

Validate without building:

```bash
ahtml validate --input artifact.agent.html
```

Build the static artifact:

```bash
ahtml build --input artifact.agent.html --out dist/html
```

Preview locally:

```bash
ahtml preview --input artifact.agent.html --out dist/html --port 4173
```

Inspect the source document:

```bash
ahtml inspect --input artifact.agent.html
```

Inspect a built artifact:

```bash
ahtml inspect --dir dist/html
```

Read default finite render config values:

```bash
ahtml config get
```

## Document Shape

Use finite metadata and standard agent-html components. The agent writes information structure, not page implementation.

```html
<meta-agent
  theme="neutral"
  density="comfortable"
  tone="report"
  width="article"
/>

<page title="CLI Demo">
  <card title="Overview">Generated from agent-html.</card>
</page>
```

Never add Tailwind classes, `className`, `style`, event handlers, scripts, arbitrary HTML attributes, raw HTML, Radix props, or full shadcn props to agent-facing input.
