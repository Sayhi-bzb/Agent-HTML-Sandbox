# agent-html

agent-html helps agents replace long Markdown outputs with stable, shareable HTML artifacts.

Markdown is easy to write, but it breaks down when agent work becomes dense: implementation plans, PR explainers, research reports, decision records, design comparisons, and feedback loops need layout, visual hierarchy, tables, controlled interaction, and a result people will actually open. agent-html gives agents an AI-native authoring format for that job: write semantic `.agent.html`, validate it against a stable schema, and render a portable HTML artifact for humans to read, share, archive, and hand back into the agent loop.

The constraint is the point. Agents do not write arbitrary CSS, JavaScript, Tailwind classes, event handlers, or renderer props. They write content structure; `ahtml` turns that structure into a consistent HTML artifact.

Docs: [agent-html.pages.dev/docs](https://agent-html.pages.dev/docs)

## Quick Start

Install the published CLI globally:

```bash
npm install -g @agent-html/ahtml
ahtml setup
ahtml status
ahtml doctor
ahtml schema --format prompt
```

Use the same npmjs.com package with your package manager:

| Package manager | Install                             | Run `ahtml` |
| --------------- | ----------------------------------- | ----------- |
| npm             | `npm install -g @agent-html/ahtml`  | `ahtml`     |
| pnpm            | `pnpm add -g @agent-html/ahtml`     | `ahtml`     |
| yarn            | `yarn global add @agent-html/ahtml` | `ahtml`     |
| bun             | `bun add -g @agent-html/ahtml`      | `ahtml`     |

Install the agent skill:

```bash
npx skills add Sayhi-bzb/Agent-HTML --skill ahtml
```

Create `artifact.agent.html`:

```html
<meta-agent
  theme="neutral"
  density="comfortable"
  tone="report"
  width="article"
/>

<page title="Review">
  <card title="Summary">
    This review is a stable HTML artifact instead of a long Markdown note.
  </card>
</page>
```

Validate, build, preview, and inspect:

```bash
ahtml validate --input artifact.agent.html
ahtml build --input artifact.agent.html --out dist/html
ahtml preview --input artifact.agent.html --out dist/html --port 4173
ahtml inspect --input artifact.agent.html
```

Open the preview URL printed by `ahtml preview` to review the output.

## How It Works

```txt
agent work
  -> semantic .agent.html
  -> schema validation
  -> managed runtime render
  -> portable HTML artifact
```

The schema is the public contract for what agents can write. The runtime implementation can use React, Vite, Tailwind, and shadcn-backed components internally, but those details do not become the agent-facing language.

## CLI Commands

```bash
ahtml setup [--yes] [--force] [--ui shadcn] [--component-source shadcn-cli] [--preset <name|custom>] [--components <list|all>]
ahtml schema [--format prompt|json] [--out <path>]
ahtml validate --input <path>
ahtml build --input <path> [--out <dir>]
ahtml inspect --input <path>|--dir <dir> [--format summary|json]
ahtml preview --input <path> [--out <dir>] [--port <port>]
ahtml doctor
ahtml status
ahtml config get
```

Defaults:

- Runtime home: `~/.ahtml` or `%USERPROFILE%\.ahtml`
- Runtime renderer: internal shadcn-backed React/Vite renderer
- Runtime setup: guided setup reads shadcn component and preset metadata from the `shadcn` package APIs, then uses shadcn CLI inside the managed runtime; runtime-aware commands bootstrap or repair the managed shadcn runtime when setup has not run
- Runtime override: `AHTML_HOME`
- Document: `artifact.agent.html`
- Build output: `dist/html`

`ahtml status` and `ahtml doctor` can show a non-blocking package update hint. Set `AHTML_NO_UPDATE_CHECK=1` to disable that check.

## Rules

- Treat `ahtml schema --format prompt` as the source of truth.
- Use only registered agent-html components, props, children, and render config values.
- Do not write Tailwind classes, `className`, `style`, CSS, scripts, event handlers, shadcn props, Radix props, arbitrary HTML attributes, external resource passthrough, or raw HTML.
- `ahtml setup` guides managed runtime installation. `ahtml status`, `ahtml doctor`, `ahtml build`, and `ahtml preview` can bootstrap or repair the managed shadcn runtime when no guided setup has run.
- shadcn/ui is an internal renderer implementation detail; do not initialize shadcn in the current project for normal `ahtml` use.

## More

- [Quick Start](https://agent-html.pages.dev/docs)
- [Best Practice](https://agent-html.pages.dev/docs/best-practice)
- [Examples](https://agent-html.pages.dev/docs/example)
