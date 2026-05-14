# agent-html

agent-html turns semantic `.agent.html` documents into stable, shareable HTML artifacts for dense agent work.

Docs: [agent-html.pages.dev/docs](https://agent-html.pages.dev/docs)

## Quick Start

### 1. Install the CLI

```bash
npm install -g @agent-html/ahtml
ahtml
```

Use the same npm package with other package managers:

| Package manager | Install                             | Run `ahtml` |
| --------------- | ----------------------------------- | ----------- |
| npm             | `npm install -g @agent-html/ahtml`  | `ahtml`     |
| pnpm            | `pnpm add -g @agent-html/ahtml`     | `ahtml`     |
| yarn            | `yarn global add @agent-html/ahtml` | `ahtml`     |
| bun             | `bun add -g @agent-html/ahtml`      | `ahtml`     |

### 2. Get the writing prompt and write a document

```bash
ahtml prompt
```

```html
<meta-agent profile="report-default" />

<page title="Review">
  <card title="Summary">
    This review is a stable HTML artifact instead of a long Markdown note.
  </card>
</page>
```

### 3. Render HTML

```bash
ahtml build artifact.agent.html
ahtml preview artifact.agent.html
```

Open the preview URL printed by `ahtml preview` to review the output.

## How It Works

```txt
agent work
  -> semantic .agent.html
  -> schema validation
  -> portable HTML artifact
```

The schema is the public contract. Agents write content structure, not raw HTML, CSS, JavaScript, Tailwind classes, or renderer props.

## More

- [Quick Start](https://agent-html.pages.dev/docs)
- [Best Practice](https://agent-html.pages.dev/docs/best-practice)
- [Dev Docs](https://agent-html.pages.dev/docs/dev-docs)
- [Examples](https://agent-html.pages.dev/docs/example)
