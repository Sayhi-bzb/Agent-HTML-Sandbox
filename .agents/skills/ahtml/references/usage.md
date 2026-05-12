# ahtml Usage

Use this when the user wants to produce, validate, build, preview, or inspect an artifact.

## User Flow

```txt
user asks
  -> ahtml setup prepares managed shadcn runtime when needed
  -> agent reads ahtml schema
  -> agent outputs .agent.html
  -> ahtml validates and sanitizes
  -> shadcn-backed managed runtime renders
  -> static artifact directory
```

## Commands

Inspect the agent-facing contract:

```bash
ahtml setup --yes
ahtml schema --format prompt
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

Read default finite render config:

```bash
ahtml config get
```

## Document Shape

Use finite metadata and standard agent-html components. Keep implementation details out of the document.

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
